import { v4 as uuidv4 } from "uuid";

export default function AssignmentsDao(db) {
  function findAssignmentsForCourse(courseId) {
    return (db.assignments || []).filter((a) => a.course === courseId);
  }

  function findAssignmentById(assignmentId) {
    return (db.assignments || []).find((a) => a._id === assignmentId);
  }

  function createAssignment(courseId, assignment) {
    const newAssignment = { ...assignment, _id: uuidv4(), course: courseId };
    db.assignments = [...(db.assignments || []), newAssignment];
    return newAssignment;
  }

  function updateAssignment(assignmentId, updates) {
    const assignment = (db.assignments || []).find(
      (a) => a._id === assignmentId
    );
    if (!assignment) return null;
    Object.assign(assignment, updates);
    return assignment;
  }

  function deleteAssignment(assignmentId) {
    db.assignments = (db.assignments || []).filter(
      (a) => a._id !== assignmentId
    );
    return true;
  }

  return {
    findAssignmentsForCourse,
    findAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
