import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";

import db from "./Kambaz/Database/index.js";
import UserRoutes from "./Kambaz/Users/routes.js";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import ModulesRoutes from "./Kambaz/Modules/routes.js";
import EnrollmentsRoutes from "./Kambaz/Enrollments/routes.js";
import AssignmentRoutes from "./Kambaz/Assignments/routes.js";

const app = express();

// Allow multiple origins for CORS
const allowedOrigins = [
  "http://localhost:3000",
  "https://kambaz-next-js-cs5610-fa25-05.vercel.app",
  "https://kambaz-next-js-cs5610-fa25-05-git-a5-thomas-projects-866f7e96.vercel.app",
];

// Add CLIENT_URL from environment if provided
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list or matches Vercel preview URL pattern
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.includes("kambaz-next-js-cs5610-fa25-05") ||
        origin.includes("vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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
    domain: process.env.SERVER_URL,
  };
}

app.use(session(sessionOptions));
app.use(express.json());

// NOTE: debug route removed - use /api/users/profile for session checks

// register routes (after cors, session, json)
UserRoutes(app, db);
CourseRoutes(app, db);
ModulesRoutes(app, db);
EnrollmentsRoutes(app, db);
AssignmentRoutes(app, db);

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

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`kambaz-node-server-app listening on port ${PORT}`);
});
