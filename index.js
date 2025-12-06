import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import mongoose from "mongoose";

import db from "./Kambaz/Database/index.js";
import UserRoutes from "./Kambaz/Users/routes.js";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import ModulesRoutes from "./Kambaz/Modules/routes.js";
import EnrollmentsRoutes from "./Kambaz/Enrollments/routes.js";
import AssignmentRoutes from "./Kambaz/Assignments/routes.js";

const app = express();

// Support multiple CLIENT_URLs separated by comma
const getAllowedOrigins = () => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  // Split by comma and trim whitespace
  return clientUrl.split(",").map((url) => url.trim());
};

app.use(
  cors({
    credentials: true,
    origin: getAllowedOrigins(),
  })
);

const sessionOptions = {
  secret: process.env.SESSION_SECRET || "kambaz",
  resave: false,
  saveUninitialized: false,
};
// In development, allow saveUninitialized to ensure cookie is set for CLI testing
if (
  process.env.SERVER_ENV === "development" ||
  process.env.NODE_ENV !== "production"
) {
  sessionOptions.saveUninitialized = true;
} else {
  sessionOptions.proxy = true;
  sessionOptions.cookie = {
    sameSite: "none",
    secure: true,
    // Do NOT set domain - let browser handle it automatically for cross-origin cookies
  };
}

app.use(session(sessionOptions));
app.use(express.json());

// NOTE: debug route removed - use /api/users/profile for session checks

// register routes (after cors, session, json)
UserRoutes(app);
CourseRoutes(app);
ModulesRoutes(app);
EnrollmentsRoutes(app);
AssignmentRoutes(app);

// Dynamic import to avoid potential ESM resolution issues on some filesystems
try {
  const lab5Path = new URL("./Lab5/index.js", import.meta.url).href;
  const Lab5Module = await import(lab5Path);
  if (Lab5Module && typeof Lab5Module.default === "function") {
    Lab5Module.default(app);
  } else {
    console.error("Lab5 module did not export a default function");
  }
} catch (err) {
  console.error("Failed to import Lab5 module:", err);
}

const CONNECTION_STRING =
  process.env.DATABASE_CONNECTION_STRING || "mongodb://127.0.0.1:27017/kambaz";

// Connect to MongoDB first, then start the server
try {
  await mongoose.connect(CONNECTION_STRING, {
    // useNewUrlParser and useUnifiedTopology are defaults in mongoose v6+
  });
  console.log("Connected to MongoDB");
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
  // continue starting the server even if DB connection fails locally;
  // many routes still may work against the in-memory/file DB fallback.
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`kambaz-node-server-app listening on port ${PORT}`);
});
