import { v4 as uuidv4 } from "uuid";
import model from "./model.js";

export default function CoursesDao(db) {
  function findAllCourses() {
    // only return name and description for dashboard
    return model.find({}, { name: 1, description: 1 });
  }

  async function findCoursesForEnrolledUser(userId) {
    // If a legacy in-memory enrollments exists use it, otherwise expect an
    // enrollments DAO to be used at the routes level.
    if (db && db.enrollments) {
      const courses = await model.find({}, { name: 1, description: 1 });
      const enrolledCourses = courses.filter((course) =>
        (db.enrollments || []).some(
          (enrollment) =>
            enrollment.user === userId && enrollment.course === course._id
        )
      );
      return enrolledCourses;
    }
    // Fallback: return all courses (caller may use enrollments DAO instead)
    return model.find({}, { name: 1, description: 1 });
  }

  function createCourse(course) {
    const newCourse = { ...course, _id: uuidv4() };
    return model.create(newCourse);
  }

  function deleteCourse(courseId) {
    return model.deleteOne({ _id: courseId });
  }

  function updateCourse(courseId, courseUpdates) {
    return model.updateOne({ _id: courseId }, { $set: courseUpdates });
  }

  return {
    findAllCourses,
    findCoursesForEnrolledUser,
    createCourse,
    deleteCourse,
    updateCourse,
  };
}
