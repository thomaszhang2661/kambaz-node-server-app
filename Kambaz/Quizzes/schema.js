import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
  {
    _id: String,
    text: String,
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    _id: String,
    type: { type: String, enum: ["mcq", "tf", "fill"], default: "mcq" },
    title: String,
    body: String,
    points: { type: Number, default: 1 },
    choices: [choiceSchema],
    blanks: [
      {
        _id: String,
        answers: [String],
      },
    ],
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    course: { type: String, ref: "CourseModel", required: true },
    title: { type: String, default: "New Quiz" },
    description: String,
    published: { type: Boolean, default: false },
    availableDate: String,
    untilDate: String,
    dueDate: String,
    points: { type: Number, default: 0 },
    settings: {
      quizType: { type: String, default: "graded" },
      shuffleAnswers: { type: Boolean, default: true },
      timeLimitMinutes: { type: Number, default: 20 },
      multipleAttempts: { type: Boolean, default: false },
      maxAttempts: { type: Number, default: 1 },
      showCorrectAnswers: { type: Boolean, default: false },
      accessCode: { type: String, default: "" },
      oneQuestionAtATime: { type: Boolean, default: true },
      webcamRequired: { type: Boolean, default: false },
      lockQuestionsAfterAnswering: { type: Boolean, default: false },
    },
    questions: [questionSchema],
    createdBy: { type: String, ref: "UserModel" },
    createdAt: String,
  },
  { collection: "quizzes" }
);

export default quizSchema;
