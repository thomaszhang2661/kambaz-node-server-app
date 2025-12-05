import EnrollmentsDao from "./dao.js";

export default function EnrollmentsRoutes(app, db) {
  const dao = EnrollmentsDao(db);

  const enrollCurrentUser = async (req, res) => {
    const currentUser = req.session ? req.session["currentUser"] : null;
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ message: "Missing courseId" });
      return;
    }
    await dao.enrollUserInCourse(currentUser._id, courseId);
    res.sendStatus(200);
  };

  const unenrollCurrentUser = async (req, res) => {
    const currentUser = req.session ? req.session["currentUser"] : null;
    if (!currentUser) {
      res.sendStatus(401);
      return;
    }
    const { courseId } = req.params;
    if (!courseId) {
      res.status(400).json({ message: "Missing courseId" });
      return;
    }
    await dao.unenrollUserFromCourse(currentUser._id, courseId);
    res.sendStatus(200);
  };

  app.post("/api/users/current/enrollments", enrollCurrentUser);
  app.delete("/api/users/current/enrollments/:courseId", unenrollCurrentUser);

  // Admin-style endpoints to enroll/unenroll any user by id for a given course
  const enrollUserById = async (req, res) => {
    const { courseId, userId } = req.params;
    if (!courseId || !userId) {
      res.status(400).json({ message: "Missing courseId or userId" });
      return;
    }
    await dao.enrollUserInCourse(userId, courseId);
    res.sendStatus(200);
  };

  const unenrollUserById = async (req, res) => {
    const { courseId, userId } = req.params;
    if (!courseId || !userId) {
      res.status(400).json({ message: "Missing courseId or userId" });
      return;
    }
    await dao.unenrollUserFromCourse(userId, courseId);
    res.sendStatus(200);
  };

  app.post("/api/courses/:courseId/enroll/:userId", enrollUserById);
  app.delete("/api/courses/:courseId/enroll/:userId", unenrollUserById);
}
