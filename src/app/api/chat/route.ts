import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { canvasTools } from "@/lib/tools";
import type { NodeDoc } from "@/types/page";

// Use Node.js runtime for Firebase Admin SDK
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    // Limit conversation history to last 10 messages to prevent confusion
    // This keeps recent context while avoiding the AI re-processing old requests
    const recentMessages = messages.slice(-10);

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(recentMessages);

    // Set execution context for server-side tool execution
    if (context) {
      const { setExecutionContext } = await import("@/lib/tools/server-shapes");
      setExecutionContext({
        userId: context.userId,
        currentPageId: context.currentPageId,
        canvasId: context.canvasId,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Build context about existing shapes
    const nodesContext =
      context?.nodes && context.nodes.length > 0
        ? `\n\nExisting shapes on canvas (use their IDs for manipulation):\n${context.nodes
            .map(
              (node: NodeDoc) =>
                `- ${node.id}: ${node.type} ${
                  node.name ? `"${node.name}"` : ""
                } at (${node.x}, ${node.y})${
                  node.fill ? ` fill: ${node.fill}` : ""
                }`
            )
            .join("\n")}`
        : "";

    // System prompt for the canvas assistant
    const systemPrompt = `You are a helpful AI assistant for a collaborative design canvas application. You help users create and manipulate visual elements on their canvas.

**CRITICAL INSTRUCTION**: You see the full conversation history for context, but you should ONLY execute tools and take action based on the MOST RECENT user message. Previous messages have already been processed. DO NOT re-execute tools for old messages.

Your capabilities:
- **Create** shapes (rectangles, circles, text, lines, triangles, frames)
- **Move** existing shapes to new positions
- **Resize** shapes (change width, height, or radius)
- **Rotate** shapes by degrees
- **Change colors** (fill and stroke)
- **Delete** shapes
- **Create layouts** like grids
- **Create complex UI components** like buttons, cards, login forms, navigation bars, and dashboards

Canvas coordinate system:
- Origin (0, 0) is at the top-left
- Typical canvas area is 5000x5000 pixels
- Default viewport center is around (2500, 2500)${nodesContext}

Guidelines:
1. For creation requests: Use appropriate tool functions, place in visible area (2000-3000 range), use reasonable sizes
2. For manipulation: Use shape IDs from the existing shapes list
3. For complex layouts: Break into components, use appropriate spacing (20-40px)

Design patterns available:
- **createButton**: Interactive buttons
- **createLoginForm**: Auth forms
- **createNavigationBar**: Site navigation
- **createCard**: Content containers
- **createDashboard**: Admin layouts
- **createGrid**: Repeated elements

**CRITICAL: ALWAYS RESPOND WITH TEXT**
After executing any tools, you MUST generate a text response. Never end your response without text.

**REQUIRED RESPONSE FORMAT**:
1. Execute the appropriate tool(s) for the LATEST user request ONLY
2. IMMEDIATELY after tool execution, provide a short confirmation message
3. Format: "✓ Created [what]" or "✓ Updated [what]" or "✓ Done"
4. Example: User says "create a red circle" → Execute createCircle tool → Respond with "✓ Created a red circle"
5. NEVER leave a response empty - always include confirmation text
6. NEVER mention or repeat previous actions from chat history

Your response MUST contain text, not just tool calls.`;

    // Create chat completion with streaming and tools
    const result = streamText({
      model: openai("gpt-4o-mini-2024-07-18"),
      system: systemPrompt,
      messages: modelMessages,
      tools: canvasTools,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
