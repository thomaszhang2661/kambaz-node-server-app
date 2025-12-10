import QuizzesDao from "./dao.js";
import { requireLogin, requireFaculty } from "../middleware/auth.js";

export default function QuizzesRoutes(app, db) {
  const dao = QuizzesDao(db);

  // ==================== Handler Functions ====================

  /**
   * GET quizzes for a course
   * Filters to published & available for students; shows all for faculty
   */
  const getQuizzesForCourse = async (req, res) => {
    const { cid } = req.params;
    const quizzes = await dao.findQuizzesForCourse(cid);
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
  };

  /**
   * POST create quiz (faculty only)
   */
  const createQuiz = async (req, res) => {
    const { cid } = req.params;
    const body = req.body || {};
    const quiz = {
      ...body,
      course: cid,
      createdBy: req.session.currentUser?._id,
    };
    const created = await dao.createQuiz(quiz);
    res.json(created);
  };

  /**
   * GET quiz by id
   * Students cannot see unpublished quizzes
   */
  const getQuizById = async (req, res) => {
    const { qid } = req.params;
    const quiz = await dao.findQuizById(qid);
    if (!quiz) return res.sendStatus(404);

    const current = req.session.currentUser;

    // 测验未发布
    if (!quiz.published) {
      // 未登录
      if (!current) {
        return res.status(401).json({ error: "未登录" });
      }
      // 不是教师
      if (current.role !== "FACULTY") {
        return res.status(403).json({ error: "Quiz not published" });
      }
    }

    // 允许访问
    res.json(quiz);
  };

  /**
   * PUT update quiz (faculty only)
   */
  const updateQuiz = async (req, res) => {
    const { qid } = req.params;
    const updates = req.body || {};
    const status = await dao.updateQuiz(qid, updates);
    res.json(status);
  };

  /**
   * DELETE quiz (faculty only)
   */
  const deleteQuiz = async (req, res) => {
    const { qid } = req.params;
    const status = await dao.deleteQuiz(qid);
    res.json(status);
  };

  /**
   * POST publish quiz (faculty only)
   */
  const publishQuiz = async (req, res) => {
    const { qid } = req.params;
    const userId = req.session.currentUser?._id;
    const status = await dao.publishQuiz(qid, userId);
    res.json(status);
  };

  /**
   * POST unpublish quiz (faculty only)
   */
  const unpublishQuiz = async (req, res) => {
    const { qid } = req.params;
    const userId = req.session.currentUser?._id;
    const status = await dao.unpublishQuiz(qid, userId);
    res.json(status);
  };

  /**
   * POST submit quiz attempt (student/faculty)
   * Checks attempt limits, calculates score, persists attempt
   */
  const submitQuizAttempt = async (req, res) => {
    const { qid } = req.params;
    const current = req.session.currentUser;
    const payload = req.body || {};

    const quiz = await dao.findQuizById(qid);
    if (!quiz) return res.sendStatus(404);

    if (!quiz.published && current.role !== "FACULTY") {
      return res.status(403).json({ error: "Quiz not published" });
    }

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

    let score = 0;
    let total = 0;
    const answers = payload.answers || [];
    const questions = quiz.questions || [];

    for (const q of questions) {
      total += q.points || 0;
      const given = answers.find((a) => a.questionId === q._id);
      if (!given) continue;

      if (q.type === "mcq" || q.type === "tf") {
        // Both MCQ and TF use choice._id to identify the selected answer
        const correct = (q.choices || []).find((c) => c.isCorrect);
        if (correct && given.answer === correct._id) score += q.points || 0;
      } else if (q.type === "fill") {
        // Fill-in-blank: given.answer is an object { blankId: "userAnswer" }
        const blanks = q.blanks || [];
        if (blanks.length > 0) {
          let allBlanksCorrect = true;
          for (const b of blanks) {
            const userBlankAnswer = given.answer?.[b._id];
            const isBlankCorrect = (b.answers || []).some(
              (ans) =>
                ans.toLowerCase().trim() ===
                String(userBlankAnswer || "")
                  .toLowerCase()
                  .trim()
            );
            if (!isBlankCorrect) {
              allBlanksCorrect = false;
              break;
            }
          }
          if (allBlanksCorrect) {
            score += q.points || 0;
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
  };

  /**
   * GET attempts for a quiz
   * Faculty can see all; students see only their own
   */
  const getAttempts = async (req, res) => {
    const { qid } = req.params;
    const current = req.session.currentUser;
    const quiz = await dao.findQuizById(qid);
    if (!quiz) return res.sendStatus(404);
    const attempts = await dao.findAttemptsByQuiz(qid);
    if (current && current.role === "FACULTY") {
      res.json(attempts || []);
      return;
    }
    const filtered = (attempts || []).filter((a) => a.user === current._id);
    res.json(filtered);
  };

  /**
   * GET a single attempt by id
   * Faculty can view any; students can only view their own
   */
  const getAttemptById = async (req, res) => {
    const { qid, aid } = req.params;
    const current = req.session.currentUser;
    const attempts = await dao.findAttemptsByQuiz(qid);
    if (!attempts) return res.sendStatus(404);
    const attempt = (attempts || []).find((a) => a._id === aid);
    if (!attempt) return res.sendStatus(404);
    if (current && current.role === "FACULTY") {
      res.json(attempt);
      return;
    }
    if (attempt.user !== current._id) return res.sendStatus(403);
    res.json(attempt);
  };

  // ==================== Route Registration ====================
  // Each route is registered on BOTH the spec-compliant path AND legacy path for backwards compatibility

  // List quizzes for a course
  app.get("/api/courses/:cid/quizzes", requireLogin, getQuizzesForCourse);

  // Create quiz
  app.post("/api/courses/:cid/quizzes", requireFaculty, createQuiz);

  // Get quiz by id
  // Spec: /api/courses/:cid/quizzes/:qid
  // Legacy: /api/quizzes/:qid
  app.get("/api/courses/:cid/quizzes/:qid", requireLogin, (req, res) => {
    // Remap :qid to req.params.qid for consistency with legacy route
    req.params.qid = req.params.qid;
    return getQuizById(req, res);
  });
  app.get("/api/quizzes/:qid", requireLogin, getQuizById);

  // Update quiz
  // Spec: PUT /api/courses/:cid/quizzes/:qid
  // Legacy: PUT /api/quizzes/:qid
  app.put("/api/courses/:cid/quizzes/:qid", requireFaculty, (req, res) => {
    req.params.qid = req.params.qid;
    return updateQuiz(req, res);
  });
  app.put("/api/quizzes/:qid", requireFaculty, updateQuiz);

  // Delete quiz
  // Spec: DELETE /api/courses/:cid/quizzes/:qid
  // Legacy: DELETE /api/quizzes/:qid
  app.delete("/api/courses/:cid/quizzes/:qid", requireFaculty, (req, res) => {
    req.params.qid = req.params.qid;
    return deleteQuiz(req, res);
  });
  app.delete("/api/quizzes/:qid", requireFaculty, deleteQuiz);

  // Publish quiz
  // Spec: POST /api/courses/:cid/quizzes/:qid/publish
  // Legacy: POST /api/quizzes/:qid/publish
  app.post(
    "/api/courses/:cid/quizzes/:qid/publish",
    requireFaculty,
    (req, res) => {
      req.params.qid = req.params.qid;
      return publishQuiz(req, res);
    }
  );
  app.post("/api/quizzes/:qid/publish", requireFaculty, publishQuiz);

  // Unpublish quiz
  // Spec: POST /api/courses/:cid/quizzes/:qid/unpublish
  // Legacy: POST /api/quizzes/:qid/unpublish
  app.post(
    "/api/courses/:cid/quizzes/:qid/unpublish",
    requireFaculty,
    (req, res) => {
      req.params.qid = req.params.qid;
      return unpublishQuiz(req, res);
    }
  );
  app.post("/api/quizzes/:qid/unpublish", requireFaculty, unpublishQuiz);

  // Submit quiz attempt
  // Spec: POST /api/courses/:cid/quizzes/:qid/attempts
  // Legacy: POST /api/quizzes/:qid/attempts
  app.post(
    "/api/courses/:cid/quizzes/:qid/attempts",
    requireLogin,
    (req, res) => {
      req.params.qid = req.params.qid;
      return submitQuizAttempt(req, res);
    }
  );
  app.post("/api/quizzes/:qid/attempts", requireLogin, submitQuizAttempt);

  // Get attempts for a quiz
  // Spec: GET /api/courses/:cid/quizzes/:qid/attempts
  // Legacy: GET /api/quizzes/:qid/attempts
  app.get(
    "/api/courses/:cid/quizzes/:qid/attempts",
    requireLogin,
    (req, res) => {
      req.params.qid = req.params.qid;
      return getAttempts(req, res);
    }
  );
  app.get("/api/quizzes/:qid/attempts", requireLogin, getAttempts);

  // Get single attempt by id
  // Spec: GET /api/courses/:cid/quizzes/:qid/attempts/:aid
  // Legacy: GET /api/quizzes/:qid/attempts/:aid
  app.get(
    "/api/courses/:cid/quizzes/:qid/attempts/:aid",
    requireLogin,
    (req, res) => {
      req.params.qid = req.params.qid;
      req.params.aid = req.params.aid;
      return getAttemptById(req, res);
    }
  );
  app.get("/api/quizzes/:qid/attempts/:aid", requireLogin, getAttemptById);
}
