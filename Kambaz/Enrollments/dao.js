import { v4 as uuidv4 } from "uuid";

export default function EnrollmentsDao(db) {
  function enrollUserInCourse(userId, courseId) {
    db.enrollments = db.enrollments || [];
    const already = db.enrollments.some(
      (e) => e.user === userId && e.course === courseId
    );
    if (!already) {
      db.enrollments.push({ _id: uuidv4(), user: userId, course: courseId });
    }
  }
  function unenrollUserFromCourse(userId, courseId) {
    db.enrollments = (db.enrollments || []).filter(
      (e) => !(e.user === userId && e.course === courseId)
    );
  }

  function findEnrollmentsForUser(userId) {
    return (db.enrollments || []).filter((e) => e.user === userId);
  }
  return { enrollUserInCourse, unenrollUserFromCourse, findEnrollmentsForUser };
}
