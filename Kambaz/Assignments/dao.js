import model from "./model.js";
import { v4 as uuidv4 } from "uuid";

// Find all assignments for a specific course
export const findAssignmentsForCourse = (courseId) =>
  model.find({ course: courseId });

// Find assignment by ID
export const findAssignmentById = (assignmentId) =>
  model.findById(assignmentId);

// Create a new assignment
export const createAssignment = (assignment) => {
  const newAssignment = { ...assignment, _id: uuidv4() };
  return model.create(newAssignment);
};

// Update an assignment
export const updateAssignment = (assignmentId, assignment) =>
  model.updateOne({ _id: assignmentId }, { $set: assignment });

// Delete an assignment
export const deleteAssignment = (assignmentId) =>
  model.deleteOne({ _id: assignmentId });
