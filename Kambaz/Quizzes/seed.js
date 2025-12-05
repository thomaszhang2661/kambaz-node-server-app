import "dotenv/config";
import mongoose from "mongoose";
import QuizModel from "./model.js";
import CourseModel from "../Courses/model.js";

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

async function seed() {
  try {
    await mongoose.connect(CONNECTION_STRING);
    console.log("Connected to MongoDB for seeding");

    const existing = await QuizModel.findOne({ title: "Sample Quiz (seed)" });
    if (existing) {
      console.log("Sample quiz already exists, skipping seed.");
      process.exit(0);
    }
    // try to reuse an existing course in the target DB; fallback to c1
    const courseDoc = await CourseModel.findOne();
    const courseId = courseDoc ? courseDoc._id : "c1";

    const sample = {
      _id: "seed-quiz-1",
      course: courseId,
      title: "Sample Quiz (seed)",
      description: "A sample quiz created by seed script",
      published: true,
      availableDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      untilDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      points: 3,
      settings: {
        quizType: "graded",
        shuffleAnswers: false,
        timeLimitMinutes: 20,
        multipleAttempts: false,
        maxAttempts: 1,
        showCorrectAnswers: true,
      },
      questions: [
        {
          _id: "q1",
          type: "mcq",
          title: "Capital of France",
          body: "Choose the capital of France",
          points: 1,
          choices: [
            { _id: "c1", text: "Paris", isCorrect: true },
            { _id: "c2", text: "London", isCorrect: false },
            { _id: "c3", text: "Berlin", isCorrect: false },
          ],
        },
        {
          _id: "q2",
          type: "tf",
          title: "The earth is flat",
          body: "True or False",
          points: 1,
          choices: [
            { _id: "true", text: "True", isCorrect: false },
            { _id: "false", text: "False", isCorrect: true },
          ],
        },
        {
          _id: "q3",
          type: "fill",
          title: "Color of the sky",
          body: "What is the color of a clear daytime sky?",
          points: 1,
          blanks: [{ _id: "b1", answers: ["blue"] }],
        },
      ],
      createdBy: "u4",
      createdAt: new Date().toISOString(),
    };

    await QuizModel.create(sample);
    console.log("Seeded sample quiz: seed-quiz-1");
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed quizzes:", err);
    process.exit(1);
  }
}

seed();
