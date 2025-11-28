#!/usr/bin/env bash
# Simple smoke test for kambaz-node-server-app
set -euo pipefail
SERVER=http://localhost:4000
TMP_COOKIE=/tmp/kambaz_smoke_cookie.txt
rm -f $TMP_COOKIE

echo "1) GET /lab5/welcome"
curl -sS $SERVER/lab5/welcome | sed -n '1p'

echo "\n2) GET /api/courses"
curl -sS $SERVER/api/courses | jq '.'

echo "\n3) POST /api/users/signup"
curl -sS -c $TMP_COOKIE -H 'Content-Type: application/json' -d '{"username":"smoketest","password":"smoke","firstName":"Smoke","lastName":"Test"}' $SERVER/api/users/signup | jq '.'

echo "\n4) POST /api/users/signin"
curl -sS -b $TMP_COOKIE -c $TMP_COOKIE -H 'Content-Type: application/json' -d '{"username":"smoketest","password":"smoke"}' $SERVER/api/users/signin | jq '.'

echo "\n5) GET /api/users/profile"
curl -sS -b $TMP_COOKIE $SERVER/api/users/profile | jq '.' || true

echo "\n6) POST create course"
COURSE_ID=$(curl -sS -b $TMP_COOKIE -H 'Content-Type: application/json' -d '{"name":"Smoke Course","description":"smoke"}' $SERVER/api/users/current/courses | jq -r '._id')
 echo "created course $COURSE_ID"

echo "\n7) POST create assignment"
ASSIGN_ID=$(curl -sS -b $TMP_COOKIE -H 'Content-Type: application/json' -d '{"title":"Smoke Assign","description":"smoke","points":10,"dueDate":"2025-12-31","availableDate":"2025-11-01"}' $SERVER/api/courses/$COURSE_ID/assignments | jq -r '._id')
 echo "created assignment $ASSIGN_ID"

echo "\n8) GET assignments for course"
curl -sS $SERVER/api/courses/$COURSE_ID/assignments | jq '.'

echo "\n9) enroll current user in course"
curl -sS -b $TMP_COOKIE -X POST -H 'Content-Type: application/json' -d '{"courseId":"'$COURSE_ID'"}' $SERVER/api/users/current/enrollments | sed -n '1p'

echo "\n10) GET people for course"
curl -sS $SERVER/api/courses/$COURSE_ID/people | jq '.'

echo "\nSmoke test finished"
