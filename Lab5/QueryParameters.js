export default function QueryParameters(app) {
  const calculator = (req, res) => {
    const { a, b, operation } = req.query;
    if (!a || !b || !operation) {
      res.status(400).json({ message: "Missing parameters" });
      return;
    }
    const ai = parseInt(a);
    const bi = parseInt(b);
    let result;
    switch (operation) {
      case "add":
        result = ai + bi;
        break;
      case "subtract":
        result = ai - bi;
        break;
      case "multiply":
        result = ai * bi;
        break;
      case "divide":
        if (bi === 0) {
          res.status(400).json({ message: "Division by zero" });
          return;
        }
        result = ai / bi;
        break;
      default:
        res.status(400).json({ message: "Invalid operation" });
        return;
    }
    res.send(result.toString());
  };

  app.get("/lab5/calculator", calculator);
}
