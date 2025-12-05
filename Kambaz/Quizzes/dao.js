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
    // Ensure each question and choice has an _id so answers can reliably reference them
    const questions = (quiz.questions || []).map((q) => {
      const qId = q._id || uuidv4();
      const choices = (q.choices || []).map((c) => ({
        _id: c._id || uuidv4(),
        text: c.text,
        isCorrect: !!c.isCorrect,
      }));
      return { ...q, _id: qId, choices };
    });
    const newQuiz = {
      ...quiz,
      _id,
      questions,
      createdAt: new Date().toISOString(),
    };
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
    // When updating, if questions are provided ensure they have ids
    if (updates && updates.questions) {
      updates.questions = (updates.questions || []).map((q) => {
        const qId = q._id || uuidv4();
        const choices = (q.choices || []).map((c) => ({
          _id: c._id || uuidv4(),
          text: c.text,
          isCorrect: !!c.isCorrect,
        }));
        return { ...q, _id: qId, choices };
      });
    }
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

  async function publishQuiz(id, userId) {
    const payload = {
      published: true,
      publishedBy: userId || null,
      publishedAt: new Date().toISOString(),
      unpublishedBy: null,
      unpublishedAt: null,
    };
    if (isConnected()) {
      // return the updated document
      return QuizModel.findOneAndUpdate(
        { _id: id },
        { $set: payload },
        { returnDocument: "after" }
      );
    }
    // in-memory fallback
    const idx = (db.quizzes || []).findIndex((q) => q._id === id);
    if (idx >= 0) {
      db.quizzes[idx] = { ...db.quizzes[idx], ...payload };
      return Promise.resolve(db.quizzes[idx]);
    }
    return Promise.resolve(null);
  }

  async function unpublishQuiz(id, userId) {
    const payload = {
      published: false,
      unpublishedBy: userId || null,
      unpublishedAt: new Date().toISOString(),
    };
    if (isConnected()) {
      return QuizModel.findOneAndUpdate(
        { _id: id },
        { $set: payload },
        { returnDocument: "after" }
      );
    }
    const idx = (db.quizzes || []).findIndex((q) => q._id === id);
    if (idx >= 0) {
      db.quizzes[idx] = { ...db.quizzes[idx], ...payload };
      return Promise.resolve(db.quizzes[idx]);
    }
    return Promise.resolve(null);
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
