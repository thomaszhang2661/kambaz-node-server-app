import UsersDao from "./dao.js";

export default function UserRoutes(app, db) {
  const dao = UsersDao(db);

  const createUser = (req, res) => {
    const newUser = dao.createUser(req.body);
    res.json(newUser);
  };

  const deleteUser = (req, res) => {
    const { userId } = req.params;
    dao.deleteUser(userId);
    res.sendStatus(200);
  };

  const findAllUsers = (req, res) => {
    res.json(dao.findAllUsers());
  };

  const findUserById = (req, res) => {
    const { userId } = req.params;
    res.json(dao.findUserById(userId));
  };

  const updateUser = (req, res) => {
    const userId = req.params.userId;
    const userUpdates = req.body;
    dao.updateUser(userId, userUpdates);
    const currentUser = dao.findUserById(userId);
    // keep session in sync if present
    if (req.session) {
      req.session["currentUser"] = currentUser;
      req.session.save((err) => {
        if (err) console.error("session save error:", err);
        res.json(currentUser);
      });
      return;
    }
    res.json(currentUser);
  };

  const signup = (req, res) => {
    const user = dao.findUserByUsername(req.body.username);
    if (user) {
      res.status(400).json({ message: "Username already taken" });
      return;
    }
    const currentUser = dao.createUser(req.body);
    if (req.session) {
      req.session["currentUser"] = currentUser;
      req.session.save((err) => {
        if (err) console.error("session save error:", err);
        res.json(currentUser);
      });
      return;
    }
    res.json(currentUser);
  };

  const signin = (req, res) => {
    const { username, password } = req.body;
    const currentUser = dao.findUserByCredentials(username, password);
    if (currentUser) {
      if (req.session) {
        req.session["currentUser"] = currentUser;
        req.session.save((err) => {
          if (err) console.error("session save error:", err);
          res.json(currentUser);
        });
        return;
      }
      res.json(currentUser);
    } else {
      res.status(401).json({ message: "Unable to login. Try again later." });
    }
  };

  const signout = (req, res) => {
    if (req.session) req.session.destroy();
    res.sendStatus(200);
  };

  const profile = (req, res) => {
    const currentUser = req.session ? req.session["currentUser"] : null;
    // Always respond with JSON body. If unauthenticated, send 401 with a JSON message.
    if (!currentUser) {
      const payload = { message: "Not authenticated" };
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return;
    }
    const payload = currentUser;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  };

  app.post("/api/users", createUser);
  app.get("/api/users", findAllUsers);
  app.get("/api/users/:userId", findUserById);
  app.put("/api/users/:userId", updateUser);
  app.delete("/api/users/:userId", deleteUser);
  app.post("/api/users/signup", signup);
  app.post("/api/users/signin", signin);
  app.post("/api/users/signout", signout);
  app.post("/api/users/profile", profile);
  app.get("/api/users/profile", profile);
}
