import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import QuizModel from "./model.js";
import AttemptModel from "./attemptModel.js";

export default function QuizzesDao(db) {
  // Fallback in-memory arrays when MongoDB is not connected
  db.quizzes = db.quizzes || [];
  db.quizAttempts = db.quizAttempts || [];

  const isConnected = () =>
    mongoose.connection && mongoose.connection.readyState === 1;

  async function findQuizzesForCourse(courseId) {
    if (isConnected()) return QuizModel.find({ course: courseId });
    return Promise.resolve(
      (db.quizzes || []).filter((q) => q.course === courseId)
    );
  }

  function createQuiz(quiz) {
    const _id = uuidv4();
    const newQuiz = { ...quiz, _id, createdAt: new Date().toISOString() };
    if (isConnected()) return QuizModel.create(newQuiz);
    db.quizzes.push(newQuiz);
    return Promise.resolve(newQuiz);
  }

  function findQuizById(id) {
    if (isConnected()) return QuizModel.findOne({ _id: id });
    return Promise.resolve(
      (db.quizzes || []).find((q) => q._id === id) || null
    );
  }

  function updateQuiz(id, updates) {
    if (isConnected())
      return QuizModel.updateOne({ _id: id }, { $set: updates });
    const idx = (db.quizzes || []).findIndex((q) => q._id === id);
    if (idx >= 0) {
      db.quizzes[idx] = { ...db.quizzes[idx], ...updates };
      return Promise.resolve({ acknowledged: true, modifiedCount: 1 });
    }
    return Promise.resolve({ acknowledged: true, modifiedCount: 0 });
  }

  function deleteQuiz(id) {
    if (isConnected()) return QuizModel.deleteOne({ _id: id });
    const before = db.quizzes.length;
    db.quizzes = (db.quizzes || []).filter((q) => q._id !== id);
    const after = db.quizzes.length;
    return Promise.resolve({ deletedCount: before - after });
  }

  async function publishQuiz(id) {
    return updateQuiz(id, { published: true });
  }

  async function unpublishQuiz(id) {
    return updateQuiz(id, { published: false });
  }

  async function createAttempt(attempt) {
    const _id = uuidv4();
    const doc = { ...attempt, _id, createdAt: new Date().toISOString() };
    if (isConnected()) return AttemptModel.create(doc);
    db.quizAttempts.push(doc);
    return Promise.resolve(doc);
  }

  function findAttemptsByQuiz(quizId) {
    if (isConnected()) return AttemptModel.find({ quiz: quizId });
    return Promise.resolve(
      (db.quizAttempts || []).filter((a) => a.quiz === quizId)
    );
  }

  function findAttemptsByUserAndQuiz(userId, quizId) {
    if (isConnected())
      return AttemptModel.find({ quiz: quizId, user: userId }).sort({
        createdAt: -1,
      });
    return Promise.resolve(
      (db.quizAttempts || [])
        .filter((a) => a.quiz === quizId && a.user === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    );
  }

  return {
    findQuizzesForCourse,
    createQuiz,
    findQuizById,
    updateQuiz,
    deleteQuiz,
    publishQuiz,
    unpublishQuiz,
    createAttempt,
    findAttemptsByQuiz,
    findAttemptsByUserAndQuiz,
  };
}
