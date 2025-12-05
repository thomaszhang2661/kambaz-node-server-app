import QuizzesDao from "./dao.js";
import { requireLogin, requireFaculty } from "../middleware/auth.js";

export default function QuizzesRoutes(app, db) {
  const dao = QuizzesDao(db);

  // GET quizzes for a course
  app.get("/api/courses/:cid/quizzes", requireLogin, async (req, res) => {
    const { cid } = req.params;
    const quizzes = await dao.findQuizzesForCourse(cid);
    // If student, filter to published and available only
    const current = req.session.currentUser;
    if (current && current.role !== "FACULTY") {
      const now = new Date();
      const filtered = (quizzes || []).filter((q) => {
        if (!q.published) return false;
        if (q.availableDate && new Date(q.availableDate) > now) return false;
        if (q.untilDate && new Date(q.untilDate) < now) return false;
        return true;
      });
      res.json(filtered);
      return;
    }
    res.json(quizzes || []);
  });

  // Create quiz (faculty)
  app.post("/api/courses/:cid/quizzes", requireFaculty, async (req, res) => {
    const { cid } = req.params;
    const body = req.body || {};
    const quiz = {
      ...body,
      course: cid,
      createdBy: req.session.currentUser?._id,
    };
    const created = await dao.createQuiz(quiz);
    res.json(created);
  });

  // Get quiz by id
  app.get("/api/quizzes/:qid", requireLogin, async (req, res) => {
    const { qid } = req.params;
    const quiz = await dao.findQuizById(qid);
    if (!quiz) return res.sendStatus(404);
    res.json(quiz);
  });

  // Update quiz (faculty)
  app.put("/api/quizzes/:qid", requireFaculty, async (req, res) => {
    const { qid } = req.params;
    const updates = req.body || {};
    const status = await dao.updateQuiz(qid, updates);
    res.json(status);
  });

  // Delete quiz (faculty)
  app.delete("/api/quizzes/:qid", requireFaculty, async (req, res) => {
    const { qid } = req.params;
    const status = await dao.deleteQuiz(qid);
    res.json(status);
  });

  // Publish / Unpublish
  app.post("/api/quizzes/:qid/publish", requireFaculty, async (req, res) => {
    const { qid } = req.params;
    const status = await dao.publishQuiz(qid);
    res.json(status);
  });

  app.post("/api/quizzes/:qid/unpublish", requireFaculty, async (req, res) => {
    const { qid } = req.params;
    const status = await dao.unpublishQuiz(qid);
    res.json(status);
  });

  // Student submits attempt
  app.post("/api/quizzes/:qid/attempts", requireLogin, async (req, res) => {
    const { qid } = req.params;
    const current = req.session.currentUser;
    const payload = req.body || {};
    // Basic validation: quiz exists
    const quiz = await dao.findQuizById(qid);
    if (!quiz) return res.sendStatus(404);

    // If quiz not published, students cannot submit
    if (!quiz.published && current.role !== "FACULTY") {
      return res.status(403).json({ error: "Quiz not published" });
    }

    // Check attempts limit
    const prevAttempts = await dao.findAttemptsByUserAndQuiz(current._id, qid);
    const attemptNumber =
      prevAttempts && prevAttempts.length ? prevAttempts.length + 1 : 1;
    if (!quiz.settings.multipleAttempts && attemptNumber > 1) {
      return res.status(422).json({ error: "No multiple attempts allowed" });
    }
    if (
      quiz.settings.multipleAttempts &&
      quiz.settings.maxAttempts &&
      attemptNumber > quiz.settings.maxAttempts
    ) {
      return res.status(422).json({ error: "Exceeded max attempts" });
    }

    // Simple scoring (support mcq and tf and fill basic matching)
    let score = 0;
    let total = 0;
    const answers = payload.answers || [];
    const questions = quiz.questions || [];
    for (const q of questions) {
      total += q.points || 0;
      const given = answers.find((a) => a.questionId === q._id);
      if (!given) continue;
      if (q.type === "mcq") {
        const correct = (q.choices || []).find((c) => c.isCorrect);
        if (correct && given.answer === correct._id) score += q.points || 0;
      } else if (q.type === "tf") {
        const correct = (q.choices || []).find((c) => c.isCorrect);
        if (correct) {
          const correctBool =
            String(correct._id) === "true" || correct._id === true;
          if ((given.answer === true || given.answer === "true") && correctBool)
            score += q.points || 0;
        }
      } else if (q.type === "fill") {
        const blanks = q.blanks || [];
        // naive: if any blank answer matches one of accepted answers, count full points
        for (const b of blanks) {
          const ok = (b.answers || []).some(
            (ans) =>
              ans.toLowerCase().trim() ===
              String(given.answer || "")
                .toLowerCase()
                .trim()
          );
          if (ok) {
            score += q.points || 0;
            break;
          }
        }
      }
    }

    const attemptDoc = {
      quiz: qid,
      user: current._id,
      answers,
      score,
      totalPoints: total,
      attemptNumber,
    };

    const createdAttempt = await dao.createAttempt(attemptDoc);
    res.json({ attempt: createdAttempt, score, total });
  });
}
