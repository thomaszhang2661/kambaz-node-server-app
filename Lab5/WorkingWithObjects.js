const assignment = {
  id: 1,
  title: "NodeJS Assignment",
  description: "Create a NodeJS server with ExpressJS",
  due: "2021-10-10",
  completed: false,
  score: 0,
};

const moduleObj = {
  id: "m1",
  name: "Introduction to Node",
  description: "Basics of Node and Express",
  course: "CS5610",
};

export default function WorkingWithObjects(app) {
  const getAssignment = (req, res) => {
    res.json(assignment);
  };
  const getAssignmentTitle = (req, res) => {
    res.json(assignment.title);
  };
  const setAssignmentTitle = (req, res) => {
    const { newTitle } = req.params;
    assignment.title = newTitle;
    res.json(assignment);
  };
  const setAssignmentScore = (req, res) => {
    const { id, score } = req.params;
    if (parseInt(id) !== assignment.id) {
      res.status(404).json({ message: `Unable to update score for ID ${id}` });
      return;
    }
    assignment.score = parseInt(score);
    res.json(assignment);
  };
  const setAssignmentCompleted = (req, res) => {
    const { id, completed } = req.params;
    if (parseInt(id) !== assignment.id) {
      res
        .status(404)
        .json({ message: `Unable to update completed for ID ${id}` });
      return;
    }
    assignment.completed = completed === "true";
    res.json(assignment);
  };

  // module routes
  const getModule = (req, res) => {
    res.json(moduleObj);
  };
  const getModuleName = (req, res) => {
    res.json(moduleObj.name);
  };
  const setModuleName = (req, res) => {
    const { newName } = req.params;
    moduleObj.name = newName;
    res.json(moduleObj);
  };
  const setModuleDescription = (req, res) => {
    const { newDescription } = req.params;
    moduleObj.description = newDescription;
    res.json(moduleObj);
  };

  app.get("/lab5/assignment", getAssignment);
  app.get("/lab5/assignment/title", getAssignmentTitle);
  app.get("/lab5/assignment/title/:newTitle", setAssignmentTitle);
  app.get("/lab5/assignment/score/:id/:score", setAssignmentScore);
  app.get("/lab5/assignment/completed/:id/:completed", setAssignmentCompleted);

  app.get("/lab5/module", getModule);
  app.get("/lab5/module/name", getModuleName);
  app.get("/lab5/module/name/:newName", setModuleName);
  app.get("/lab5/module/description/:newDescription", setModuleDescription);
}
