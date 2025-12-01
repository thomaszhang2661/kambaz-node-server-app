import AssignmentsDao from "./dao.js";

export default function AssignmentRoutes(app, db) {
  const dao = AssignmentsDao(db);

  const findAssignmentsForCourse = (req, res) => {
    const { courseId } = req.params;
    const assignments = dao.findAssignmentsForCourse(courseId);
    res.json(assignments);
  };

  const getAssignment = (req, res) => {
    const { assignmentId } = req.params;
    const a = dao.findAssignmentById(assignmentId);
    if (!a) {
      res.sendStatus(404);
      return;
    }
    res.json(a);
  };

  const createAssignment = (req, res) => {
    const { courseId } = req.params;
    const created = dao.createAssignment(courseId, req.body);
    res.json(created);
  };

  const updateAssignment = (req, res) => {
    const { assignmentId } = req.params;
    const updated = dao.updateAssignment(assignmentId, req.body);
    if (!updated) {
      res.sendStatus(404);
      return;
    }
    res.json(updated);
  };

  const deleteAssignment = (req, res) => {
    const { assignmentId } = req.params;
    const ok = dao.deleteAssignment(assignmentId);
    res.send(ok);
  };

  app.get("/api/courses/:courseId/assignments", findAssignmentsForCourse);
  app.get("/api/assignments/:assignmentId", getAssignment);
  app.post("/api/courses/:courseId/assignments", createAssignment);
  app.put("/api/assignments/:assignmentId", updateAssignment);
  app.delete("/api/assignments/:assignmentId", deleteAssignment);
}
