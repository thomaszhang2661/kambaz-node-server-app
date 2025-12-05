import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    quiz: { type: String, ref: "QuizModel", required: true },
    user: { type: String, ref: "UserModel", required: true },
    answers: [
      {
        questionId: String,
        answer: mongoose.Mixed,
        raw: mongoose.Mixed,
      },
    ],
    score: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
    createdAt: String,
  },
  { collection: "quizAttempts" }
);

export default attemptSchema;
