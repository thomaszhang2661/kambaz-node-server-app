import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import QuizModel from "./model.js";

// Migration script to add _id to questions and choices where missing.
// Usage: DATABASE_CONNECTION_STRING="mongodb://..." node Kambaz/Quizzes/migrate-add-ids.js

const uri =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://localhost:27017/kambaz";

async function run() {
  console.log("Connecting to", uri.replace(/:(.*)@/, ":REDACTED@"));
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const quizzes = await QuizModel.find({}).lean();
  console.log(`Found ${quizzes.length} quizzes`);

  let modified = 0;

  for (const q of quizzes) {
    let changed = false;
    const questions = (q.questions || []).map((quest) => {
      const qId = quest._id || uuidv4();
      if (!quest._id) changed = true;
      const choices = (quest.choices || []).map((ch) => {
        const cId = ch._id || uuidv4();
        if (!ch._id) changed = true;
        return { ...ch, _id: cId };
      });
      return { ...quest, _id: qId, choices };
    });

    if (changed) {
      await QuizModel.updateOne({ _id: q._id }, { $set: { questions } });
      modified += 1;
      console.log(`Patched quiz ${q._id}`);
    }
  }

  console.log(`Migration complete. Modified ${modified} quizzes.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
