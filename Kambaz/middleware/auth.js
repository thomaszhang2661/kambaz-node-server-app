export function requireLogin(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) return res.sendStatus(401);
  next();
}

export function requireFaculty(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) return res.sendStatus(401);
  if (user.role !== "FACULTY") return res.sendStatus(403);
  next();
}

export function requireStudent(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) return res.sendStatus(401);
  if (user.role !== "STUDENT") return res.sendStatus(403);
  next();
}
