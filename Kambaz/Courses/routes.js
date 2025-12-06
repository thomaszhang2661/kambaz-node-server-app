import CoursesDao from "./dao.js";
import EnrollmentsDao from "../Enrollments/dao.js";

export default function CourseRoutes(app, db) {
  const dao = CoursesDao(db);
  const enrollmentsDao = EnrollmentsDao(db);

  const findAllCourses = async (req, res) => {
    const courses = await dao.findAllCourses();
    res.json(courses);
  };

  const findCoursesForEnrolledUser = async (req, res) => {
    let { userId } = req.params;
    if (userId === "current") {
      const currentUser = req.session["currentUser"];
      if (!currentUser) {
        res.sendStatus(401);
        return;
      }
      userId = currentUser._id;
    }
    // prefer enrollments DAO to retrieve courses (populates course documents)
    if (enrollmentsDao && enrollmentsDao.findCoursesForUser) {
      const courses = await enrollmentsDao.findCoursesForUser(userId);
      res.json(courses);
      return;
    }
    const courses = await dao.findCoursesForEnrolledUser(userId);
    res.json(courses);
  };

  const createCourse = async (req, res) => {
    const currentUser = req.session["currentUser"];
    const newCourse = await dao.createCourse(req.body);
    if (currentUser) {
      await enrollmentsDao.enrollUserInCourse(currentUser._id, newCourse._id);
    }
    res.json(newCourse);
  };

  const deleteCourse = async (req, res) => {
    const { courseId } = req.params;
    // remove enrollments first
    if (enrollmentsDao && enrollmentsDao.unenrollAllUsersFromCourse) {
      await enrollmentsDao.unenrollAllUsersFromCourse(courseId);
    }
    const status = await dao.deleteCourse(courseId);
    res.send(status);
  };

  const updateCourse = async (req, res) => {
    const { courseId } = req.params;
    const courseUpdates = req.body;
    const updatedCourse = await dao.updateCourse(courseId, courseUpdates);
    res.json(updatedCourse);
  };

  const findPeopleForCourse = async (req, res) => {
    const { courseId } = req.params;
    console.log("findPeopleForCourse called with courseId:", courseId);
    if (enrollmentsDao && enrollmentsDao.findUsersForCourse) {
      const users = await enrollmentsDao.findUsersForCourse(courseId);
      console.log("Found", users.length, "users for course", courseId);
      res.json(users);
      return;
    }
    const { enrollments, users } = db;
    const enrolled = (enrollments || []).filter((e) => e.course === courseId);
    const people = enrolled
      .map((e) => (users || []).find((u) => u._id === e.user))
      .filter(Boolean);
    res.json(people);
  };

  app.get("/api/courses", findAllCourses);
  app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);
  app.post("/api/users/current/courses", createCourse);
  app.delete("/api/courses/:courseId", deleteCourse);
  app.put("/api/courses/:courseId", updateCourse);
  app.get("/api/courses/:courseId/people", findPeopleForCourse);
}
