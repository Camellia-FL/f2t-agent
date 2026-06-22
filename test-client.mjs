async function main() {
  const res = await fetch("http://localhost:3000/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Where is truck #42?" }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: tool_call")) {
        // next data line has tool call info
      } else if (line.startsWith("event: tool_result")) {
        // next data line has tool result
      } else if (line.startsWith("event: done")) {
        // next data line has done payload
      } else if (line.startsWith("event: error")) {
        // next data line has error
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.token) {
          process.stdout.write(data.token);
        } else if (data.tool) {
          console.log(`\n[TOOL] ${data.tool}: ${data.error || JSON.stringify(data.result)}`);
        } else if (data.error) {
          console.log(`\n[ERROR] ${data.error}`);
        }
      }
    }
  }
  console.log("\n--- done ---");
}

main().catch(console.error);