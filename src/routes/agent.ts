import { Router, Request, Response } from "express";
import { chat, clearSession } from "../agent";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const ac = new AbortController();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.on("close", () => {
    ac.abort();
  });

  try {
    for await (const event of chat(message, sessionId, ac.signal)) {
      switch (event.type) {
        case "session":
          res.write(`event: session\ndata: ${JSON.stringify({ sessionId: event.sessionId })}\n\n`);
          break;
        case "token":
          res.write(`data: ${JSON.stringify({ token: event.content, reasoning: event.reasoning })}\n\n`);
          break;
        case "tool_call":
          res.write(`event: tool_call\ndata: ${JSON.stringify({ tool: event.tool, arguments: event.arguments })}\n\n`);
          break;
        case "tool_result":
          res.write(`event: tool_result\ndata: ${JSON.stringify({ tool: event.tool, result: event.result, error: event.error })}\n\n`);
          break;
        case "done":
          res.write(`event: done\ndata: ${JSON.stringify({ sessionId: event.sessionId, thinking: event.thinking, message: event.message })}\n\n`);
          break;
        case "error":
          res.write(`event: error\ndata: ${JSON.stringify({ error: event.error })}\n\n`);
          break;
      }
    }
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "internal server error" })}\n\n`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

router.post("/session/clear", (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }
  clearSession(sessionId);
  res.json({ ok: true });
});

export default router;
