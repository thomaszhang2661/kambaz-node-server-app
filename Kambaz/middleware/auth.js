export function requireLogin(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      message: "Please sign in to access this resource",
      hasSession: !!req.session,
      sessionId: req.sessionID
    });
  }
  next();
}

export function requireFaculty(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      message: "Please sign in to access this resource",
      hasSession: !!req.session,
      sessionId: req.sessionID
    });
  }
  if (user.role !== "FACULTY") {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only faculty members can perform this action",
      currentRole: user.role
    });
  }
  next();
}

export function requireStudent(req, res, next) {
  const user = req.session && req.session.currentUser;
  if (!user) {
    return res.status(401).json({ 
      error: "Not authenticated",
      message: "Please sign in to access this resource"
    });
  }
  if (user.role !== "STUDENT") {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Only students can perform this action",
      currentRole: user.role
    });
  }
  next();
}
