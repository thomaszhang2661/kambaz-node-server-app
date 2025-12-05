#!/usr/bin/env bash
# Smoke test script for Kambaz Quizzes feature
# Usage: ./smoke-test-quizzes.sh [SERVER_URL] [COURSE_ID]
# If COURSE_ID is omitted the script will pick the first course from /api/courses.

set -euo pipefail
SERVER=${1:-"https://kambaz-node-server-app-js8h.onrender.com"}
COURSE_ID_ARG=${2:-}

echo "Using SERVER=$SERVER"

command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 1; }
command -v jq >/dev/null 2>&1 || echo "warning: jq not found, output will not be pretty-printed"

TMPDIR=/tmp/kambaz-smoke-$$
mkdir -p "$TMPDIR"
FAC_COOKIE="$TMPDIR/faculty_cookie.txt"
STU_COOKIE="$TMPDIR/student_cookie.txt"
QUIZ_JSON="$TMPDIR/quiz.json"
FAC_USER_JSON="$TMPDIR/fac_user.json"

# 1) Verify root and courses
echo "\n== STEP 1: Check root and courses =="
curl -sSI "$SERVER/" | sed -n '1,6p'

echo "\nFetching courses..."
curl -sS "$SERVER/api/courses" -o "$TMPDIR/courses.json"
if [ -s "$TMPDIR/courses.json" ]; then
  echo "Courses (first 3 items):"
  if command -v jq >/dev/null 2>&1; then jq -c '.[0:3]' "$TMPDIR/courses.json" || cat "$TMPDIR/courses.json" ; else head -c 400 "$TMPDIR/courses.json"; fi
else
  echo "Failed to fetch courses or empty result"; exit 1
fi

# choose course id
if [ -n "$COURSE_ID_ARG" ]; then
  COURSE_ID="$COURSE_ID_ARG"
else
  COURSE_ID=$(jq -r '.[0]._id' "$TMPDIR/courses.json" 2>/dev/null || true)
fi
if [ -z "$COURSE_ID" ] || [ "$COURSE_ID" = "null" ]; then
  echo "No COURSE_ID available. Please supply COURSE_ID as the second argument."; exit 1
fi

echo "Selected COURSE_ID=$COURSE_ID"

# 2) Signup or signin faculty (prof1)
echo "\n== STEP 2: Ensure faculty account (prof1) =="
set +e
signup_out=$(curl -sS -c "$FAC_COOKIE" -H "Content-Type: application/json" -d '{"username":"prof1","password":"pass123","role":"FACULTY","name":"Prof One"}' "$SERVER/api/users/signup" 2>/dev/null)
signup_rc=$?
set -e
if [ $signup_rc -ne 0 ]; then
  echo "Signup request failed (non-zero exit). Trying signin..."
  signin_out=$(curl -sS -c "$FAC_COOKIE" -b "$FAC_COOKIE" -H "Content-Type: application/json" -d '{"username":"prof1","password":"pass123"}' "$SERVER/api/users/signin")
  echo "Signin output:"; echo "$signin_out" | jq . 2>/dev/null || echo "$signin_out"
else
  echo "Signup output:"; echo "$signup_out" | jq . 2>/dev/null || echo "$signup_out"
  # If signup returned message username taken, signin instead
  if echo "$signup_out" | grep -q 'Username already taken' 2>/dev/null; then
    echo "Username already taken. Signing in instead..."
    signin_out=$(curl -sS -c "$FAC_COOKIE" -b "$FAC_COOKIE" -H "Content-Type: application/json" -d '{"username":"prof1","password":"pass123"}' "$SERVER/api/users/signin")
    echo "Signin output:"; echo "$signin_out" | jq . 2>/dev/null || echo "$signin_out"
  fi
fi

# 3) Create a quiz
echo "\n== STEP 3: Create a quiz under course $COURSE_ID =="
create_payload='{
  "title":"Sample Quiz",
  "description":"A small MCQ quiz created by smoke-test",
  "questions":[
    {
      "text":"Which language runs in the browser?",
      "type":"mcq",
      "points":1,
      "choices":[
        {"text":"JavaScript","isCorrect":true},
        {"text":"Python","isCorrect":false}
      ]
    }
  ],
  "settings":{"multipleAttempts":false}
}'

curl -sS -b "$FAC_COOKIE" -H "Content-Type: application/json" -d "$create_payload" "$SERVER/api/courses/$COURSE_ID/quizzes" -o "$QUIZ_JSON"
if [ ! -s "$QUIZ_JSON" ]; then
  echo "Quiz create returned empty or failed"; cat "$QUIZ_JSON" || true; exit 1
fi

echo "Created quiz summary:";
if command -v jq >/dev/null 2>&1; then jq -c '{_id:._id, title:.title, questions_count:(.questions|length)}' "$QUIZ_JSON" || cat "$QUIZ_JSON"; else head -c 400 "$QUIZ_JSON"; fi

QID=$(jq -r '._id' "$QUIZ_JSON")
QUESTION_ID=$(jq -r '.questions[0]._id' "$QUIZ_JSON")
CORRECT_CHOICE_ID=$(jq -r '.questions[0].choices[] | select(.isCorrect==true)._id' "$QUIZ_JSON")

echo "Extracted IDs: QID=$QID, QUESTION_ID=$QUESTION_ID, CORRECT_CHOICE_ID=$CORRECT_CHOICE_ID"

# 4) Ensure student exists and sign in
echo "\n== STEP 4: Ensure student account (stud1) =="
set +e
signup_student_out=$(curl -sS -c "$STU_COOKIE" -H "Content-Type: application/json" -d '{"username":"stud1","password":"pass123","role":"STUDENT","name":"Student One"}' "$SERVER/api/users/signup" 2>/dev/null)
signup_student_rc=$?
set -e
if [ $signup_student_rc -ne 0 ]; then
  echo "Student signup failed; attempt signin..."
  signin_student_out=$(curl -sS -c "$STU_COOKIE" -b "$STU_COOKIE" -H "Content-Type: application/json" -d '{"username":"stud1","password":"pass123"}' "$SERVER/api/users/signin")
  echo "$signin_student_out" | jq . 2>/dev/null || echo "$signin_student_out"
else
  echo "Student signup output:"; echo "$signup_student_out" | jq . 2>/dev/null || echo "$signup_student_out"
  if echo "$signup_student_out" | grep -q 'Username already taken' 2>/dev/null; then
    echo "Username already taken. Signing in instead..."
    signin_student_out=$(curl -sS -c "$STU_COOKIE" -b "$STU_COOKIE" -H "Content-Type: application/json" -d '{"username":"stud1","password":"pass123"}' "$SERVER/api/users/signin")
    echo "$signin_student_out" | jq . 2>/dev/null || echo "$signin_student_out"
  fi
fi

# 5) Student submits attempt
echo "\n== STEP 5: Student submits an attempt (answering correct choice) =="
if [ -z "$QID" ] || [ "$QID" = "null" ]; then
  echo "No QID available, aborting"; exit 1
fi
ATTEMPT_PAYLOAD=$(jq -n --arg qid "$QUESTION_ID" --arg ans "$CORRECT_CHOICE_ID" '{answers:[{questionId:$qid,answer:$ans}]}')

curl -sS -b "$STU_COOKIE" -H "Content-Type: application/json" -X POST -d "$ATTEMPT_PAYLOAD" "$SERVER/api/quizzes/$QID/attempts" -o "$TMPDIR/attempt.json" || true

if [ -s "$TMPDIR/attempt.json" ]; then
  echo "Attempt response:"; cat "$TMPDIR/attempt.json" | jq . 2>/dev/null || cat "$TMPDIR/attempt.json"
else
  echo "Attempt submission failed; saved output:"; ls -l "$TMPDIR"; exit 1
fi

# 6) Summary and cleanup hint
echo "\n== Finished smoke test =="
echo "Files saved in $TMPDIR"
echo "You can inspect:"
ls -l "$TMPDIR"

echo "\nIf you want to remove saved cookies and data: rm -rf $TMPDIR"

exit 0
