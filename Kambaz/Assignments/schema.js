import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    _id: { type: String },
    course: { type: String, ref: "CourseModel", required: true },
    title: { type: String, required: true },
    description: String,
    points: { type: Number, default: 100 },
    dueDate: String,
    availableDate: String,
    availableUntilDate: String,
  },
  { collection: "assignments" }
);

export default assignmentSchema;
