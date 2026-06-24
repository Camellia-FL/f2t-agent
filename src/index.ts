import express from "express";
import agentRouter from "./routes/agent";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Allow all origins (disable CORS)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api/agent", agentRouter);

app.listen(port, () => {
  console.log(`Server running on port:${port}`);
});

export default app;
