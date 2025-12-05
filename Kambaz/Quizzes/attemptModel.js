import mongoose from "mongoose";
import attemptSchema from "./attemptSchema.js";

const model = mongoose.model("QuizAttemptModel", attemptSchema);

export default model;
