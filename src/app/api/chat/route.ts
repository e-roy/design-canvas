import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { canvasTools } from "@/lib/tools";
import type { NodeDoc } from "@/types/page";

// Use Node.js runtime for Firebase Admin SDK
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    // Convert UIMessages to ModelMessages
    const modelMessages = convertToModelMessages(messages);

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

Your capabilities:
- **Create** shapes (rectangles, circles, text, lines, triangles, frames)
- **Move** existing shapes to new positions
- **Resize** shapes (change width, height, or radius)
- **Rotate** shapes by degrees
- **Change colors** (fill and stroke)
- **Delete** shapes
- **Create layouts** like grids
- **Create complex UI components** like buttons, cards, login forms, navigation bars, and dashboards
- Position and size elements precisely

Canvas coordinate system:
- Origin (0, 0) is at the top-left
- Typical canvas area is 5000x5000 pixels
- Default viewport center is around (2500, 2500)

When users ask you to create elements:
1. Use the appropriate function to create the shape or component
2. For complex UI elements (forms, navbars, cards), use the specialized template functions
3. If coordinates aren't specified, place elements in a visible area (around viewport center: 2000-3000 range)
4. Use reasonable default sizes (rectangles: 100-200px, circles: 50-100px radius, text: 16-24px)
5. Choose colors based on context or use blue (#3b82f6) as default

When users ask to manipulate elements:
1. Use shape IDs to identify which shape to modify
2. For commands like "move the circle", look at the existing shapes and find the matching one
3. If there are multiple matches, ask for clarification
4. Confirm what action you took

When creating complex layouts:
1. Break down the request into logical components
2. Use appropriate spacing between elements (20-40px typically works well)
3. For multi-step operations, call functions sequentially
4. Consider grouping related elements using frames
5. Provide clear confirmation of what was created${nodesContext}

Design patterns you can create:
- **Buttons**: Use createButton for interactive UI elements
- **Forms**: Use createLoginForm for authentication UIs
- **Navigation**: Use createNavigationBar for site navigation
- **Cards**: Use createCard for content containers
- **Dashboards**: Use createDashboard for admin/analytics layouts
- **Grids**: Use createGrid for repeated elements in rows/columns

Be conversational and ALWAYS confirm actions after executing tools:
- When you create shapes, respond with "✓ Created [shape details]"
- When you modify shapes, respond with "✓ Updated [what changed]"
- When you create complex components, respond with "✓ Created [component name] with [number] elements"
- Be specific about what was created, positioned, or modified
- Use a friendly, helpful tone

When creating multiple elements, execute them in a logical order and summarize what you created.`;

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
