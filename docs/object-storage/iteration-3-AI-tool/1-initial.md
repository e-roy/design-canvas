# AI Chat Tool Implementation Plan

## Overview

Build a collaborative AI chat tool that allows users to create and manipulate canvas elements using natural language commands. Each user has their own chat history stored in Firebase, with real-time command execution.

## Architecture

- **Frontend**: Chat UI component in right sidebar, toggles with properties panel
- **Backend**: Next.js API route (Node.js runtime) using Vercel AI SDK with OpenAI GPT-4o-mini
- **Storage**:
  - Chat messages: `canvasChats/{userId}/messages`
  - Canvas shapes: `canvases/{canvasId}/nodes` (created server-side via Firebase Admin SDK)
- **Tool**: New "ai-chat" tool button in toolbar (after text button)
- **Execution**: Server-side tool execution - AI tools run in API route and create shapes directly in Firestore using Firebase Admin SDK

## Phase 1: UI Foundation & Tool Setup ✅ COMPLETE

**Goal**: Add AI chat tool to toolbar and create basic chat UI that toggles with properties panel.

### Changes:

1. **Update types** (`src/types/canvas.ts`): ✅

   - Add `"ai-chat"` to tool type unions in `CanvasState`, `ToolbarProps`, `CanvasProps`, `ViewportProps`

2. **Update toolbar** (`src/components/canvas/toolbar.tsx`): ✅

   - Import `MessageSquare` icon from lucide-react
   - Add AI Chat button after Text tool button
   - Update all tool type unions to include `"ai-chat"`

3. **Create chat component** (`src/components/canvas/ai-chat-panel.tsx`): ✅

   - Basic chat UI with message list and input
   - Empty state when no messages
   - Scroll area for messages
   - Input field with send button
   - Clear chat button in header
   - No functionality yet (Phase 2)

4. **Update canvas page** (`src/app/canvas/page.tsx`): ✅

   - Import `AiChatPanel` component
   - Add state for tracking if AI chat tool is active
   - Conditionally render `AiChatPanel` or `PropertiesPanel` in right sidebar based on `currentTool === "ai-chat"`
   - Update all tool type unions

5. **Update canvas store** (`src/store/canvas-store.ts`): ✅

   - Add `"ai-chat"` to tool type definition

6. **Update canvas index** (`src/components/canvas/index.ts`): ✅
   - Export `AiChatPanel` component

### Deliverable:

UI complete with AI chat button functional, chat panel visible when tool active, properties panel hidden. No AI functionality yet.

---

## Phase 2: AI SDK Integration & Backend ✅ COMPLETE

**Goal**: Set up Vercel AI SDK, create API route, and implement basic chat functionality (send/receive messages).

### Changes:

1. **Install dependencies**: ✅

   ```bash
   pnpm add ai @ai-sdk/openai @ai-sdk/react firebase-admin
   ```

2. **Environment setup** (`env.example`): ✅

   - Add `OPENAI_API_KEY=your_api_key_here`
   - Add `FIREBASE_SERVICE_ACCOUNT` for server-side operations
   - Add `FIRESTORE_EMULATOR_HOST=localhost:8080` for development

3. **Create API route** (`src/app/api/chat/route.ts`): ✅

   - POST endpoint using Vercel AI SDK v5
   - Node.js runtime (required for Firebase Admin SDK)
   - Use OpenAI GPT-4o-mini model (gpt-4o-mini-2024-07-18)
   - Comprehensive system prompt for canvas assistant
   - Stream responses with `streamText` and `toTextStreamResponse()`
   - Error handling with detailed logging

4. **Create Firebase Admin SDK setup** (`src/lib/firebase/admin.ts`): ✅

   - Initialize Firebase Admin for server-side Firestore access
   - Support for emulators in development
   - Service account authentication

5. **Update chat component** (`src/components/canvas/ai-chat-panel.tsx`): ✅

   - Integrate `useAiChat` custom hook
   - Connect send button to API
   - Display messages from AI
   - Show loading state during AI response
   - Handle errors gracefully
   - Auto-scroll to latest message

6. **Create custom hook** (`src/hooks/useAiChat.ts`): ✅

   - Uses `useChat` from `@ai-sdk/react`
   - Custom transport with context (userId, canvasId, pageId)
   - Integration with Firebase persistence

7. **Create types** (`src/types/chat.ts`): ✅
   - `ChatMessage` interface (id, role, content, timestamp, userId)

### Deliverable:

Working chat with AI responses streaming in real-time. Context passed to API route for tool execution.

---

## Phase 3: Firebase Persistence & History ✅ COMPLETE

**Goal**: Save chat messages to Firestore, load history on mount, implement clear chat functionality.

### Changes:

1. **Create Firestore service** (`src/services/chat.ts`): ✅

   - `saveMessage(userId, message)` - save to Firestore
   - `loadChatHistory(userId)` - fetch user's messages ordered by timestamp
   - `clearChatHistory(userId)` - delete all messages in batch

2. **Update Firestore rules** (`firestore.rules`): ✅

   - Allow users to read/write only their own chat messages
   - Collection path: `canvasChats/{userId}/messages/{messageId}`
   - Security: `isAuthenticated() && getUserId() == userId`

3. **Update chat panel** (`src/components/canvas/ai-chat-panel.tsx`): ✅

   - Uses `useAiChat` hook for all functionality
   - Loads chat history automatically on mount
   - Implement clear chat functionality
   - AlertDialog confirmation before clearing

4. **Update custom hook** (`src/hooks/useAiChat.ts`): ✅
   - Encapsulates chat logic with Firebase persistence
   - Loads history on mount with `loadChatHistory()`
   - Auto-saves messages to Firestore (debounced)
   - `clearChat()` function with Firestore deletion
   - Handle loading states with `isInitializing`
   - Convert between UIMessage and ChatMessage formats

### Deliverable:

Chat persists across page refreshes. Users can clear their chat history with confirmation. Messages load on mount.

---

## Phase 4: AI Agent - Creation Commands ✅ COMPLETE

**Goal**: Implement AI function calling for shape creation commands (rectangle, circle, text, line, triangle, frame).

**Implementation Note**: Changed to **server-side tool execution** instead of client-side. Tools execute in the API route using Firebase Admin SDK to create shapes directly in Firestore.

### Changes:

1. **Create tool definitions** (`src/lib/tools/canvas-tools.ts`): ✅ (6/6 complete)

   - ✅ `createRectangle(x, y, width, height, fill?, stroke?, strokeWidth?)`
   - ✅ `createCircle(x, y, radius, fill?, stroke?, strokeWidth?)`
   - ✅ `createText(x, y, text, fontSize?, fill?)`
   - ✅ `createLine(startX, startY, endX, endY, stroke?, strokeWidth?)`
   - ✅ `createTriangle(x, y, width, height, fill?, stroke?, strokeWidth?)`
   - ✅ `createFrame(x, y, width, height, name?)`
   - Uses `tool()` helper from AI SDK v5
   - Zod schemas for input validation (`inputSchema`)
   - Execute functions create shapes server-side via `createNodeInFirestore()`

2. **Create server-side shape creation** (`src/lib/tools/server-shapes.ts`): ✅

   - `setExecutionContext()` - Set userId, canvasId, pageId before tool execution
   - `createNodeInFirestore()` - Create shapes using Firebase Admin SDK
   - Proper NodeDoc structure (parentId: null for root-level shapes)
   - Timestamp generation with `FieldValue.serverTimestamp()`
   - Support for all 6 shape types (rectangle, circle, text, line, triangle, frame)

3. **Create tools index** (`src/lib/tools/index.ts`): ✅

   - Export `canvasTools` for use in API route

4. **Update API route** (`src/app/api/chat/route.ts`): ✅

   - Import and pass `canvasTools` to `streamText()`
   - Accept `context` (userId, canvasId, pageId) from client
   - Call `setExecutionContext()` before tool execution
   - Comprehensive system prompt with canvas coordinate system
   - `onStepFinish` callback for logging tool execution

5. **Update chat hook** (`src/hooks/useAiChat.ts`): ✅

   - Custom fetch function to send context to API
   - Sends userId, canvasId, currentPageId
   - No `onToolCall` needed (tools execute server-side)

6. **Update canvas page** (`src/app/canvas/page.tsx`): ✅

   - Create `commandContext` with canvasId, userId, currentPageId
   - Pass context to `AiChatPanel`
   - Validation to ensure documentId is not empty

7. **Setup documentation** (`docs/ai-tool-setup.md`): ✅
   - Environment variable setup (OPENAI_API_KEY, FIREBASE_SERVICE_ACCOUNT)
   - Emulator configuration (FIRESTORE_EMULATOR_HOST)
   - Troubleshooting guide

### Deliverable:

✅ AI can create all 6 basic shapes:

- "Create a red circle at 100, 200"
- "Add a blue rectangle at 300, 400"
- "Make a text that says Hello World at 500, 100"
- "Draw a line from 0, 0 to 200, 200"
- "Create a green triangle at 400, 300"
- "Add a frame at 600, 400 with size 300x300"

---

## Phase 5: AI Agent - Manipulation & Layout Commands ✅ COMPLETE

**Goal**: Add manipulation (move, resize, rotate, change colors) and layout (arrange, grid, spacing) commands.

### Changes:

1. **Add manipulation tools** (`src/lib/tools/canvas-tools.ts`): ✅

   - ✅ `moveShape(shapeId, x, y)` - Move shapes to new positions
   - ✅ `resizeShape(shapeId, width?, height?, radius?)` - Resize shapes
   - ✅ `rotateShape(shapeId, degrees)` - Rotate shapes
   - ✅ `changeColor(shapeId, fill?, stroke?)` - Change shape colors
   - ✅ `deleteShape(shapeId)` - Delete shapes from canvas

2. **Add layout tools** (`src/lib/tools/canvas-tools.ts`): ✅

   - ✅ `createGrid(rows, cols, shapeType, startX, startY, spacing?, shapeSize?, fill?)` - Create grids of shapes

3. **Add server-side handlers** (`src/lib/tools/server-shapes.ts`): ✅

   - ✅ `updateNodeInFirestore(nodeId, updates)` - Update existing nodes
   - ✅ `deleteNodeInFirestore(nodeId)` - Delete nodes
   - ✅ `getNodesFromFirestore()` - Fetch all nodes for context

4. **Update API route** (`src/app/api/chat/route.ts`): ✅

   - ✅ Accept `nodes` array in context
   - ✅ Include existing shapes in system prompt
   - ✅ Enhanced prompt with manipulation and layout capabilities

5. **Update chat hook** (`src/hooks/useAiChat.ts`): ✅

   - ✅ Accept `nodes` prop
   - ✅ Pass nodes in context payload to API

6. **Update canvas page** (`src/app/canvas/page.tsx`): ✅

   - ✅ Pass `nodes` array to `AiChatPanel`

7. **Update chat panel** (`src/components/canvas/ai-chat-panel.tsx`): ✅
   - ✅ Accept `nodes` prop
   - ✅ Pass nodes to `useAiChat` hook

### Deliverable:

✅ AI can manipulate existing shapes and create layouts:

- "Move the circle to 500, 500"
- "Resize the rectangle to 200x150"
- "Rotate the shape 45 degrees"
- "Change the circle color to red"
- "Delete that shape"
- "Create a 3x3 grid of circles at 100, 100"

---

## Phase 6: AI Agent - Complex Multi-step Commands ✅ COMPLETE

**Goal**: Handle complex commands that require multiple operations (login forms, navigation bars, card layouts).

### Changes:

1. **Create complex template tools** (`src/lib/tools/complex-tools.ts`): ✅

   - ✅ `createButton(x, y, text, width?, height?, fill?, textColor?)` - Button with background and text
   - ✅ `createCard(x, y, title, description, width?, height?)` - Card with frame, title, and description
   - ✅ `createLoginForm(x, y)` - Complete form with username/password fields and submit button
   - ✅ `createNavigationBar(x, y, menuItems[], width?)` - Nav bar with multiple menu items
   - ✅ `createDashboard(x, y, title, cardCount)` - Dashboard with header, sidebar, and cards
   - Uses server-side execution with Firebase Admin SDK
   - Proper element grouping with frames
   - Relative positioning for child elements
   - Sensible defaults for spacing and sizing

2. **Update tools organization** (`src/lib/tools/`): ✅

   - ✅ Refactored tools into separate category files:
     - `creation-tools.ts` - 6 basic shape creation tools
     - `manipulation-tools.ts` - 5 manipulation tools
     - `layout-tools.ts` - 1 grid layout tool
     - `complex-tools.ts` - 5 complex UI component tools
   - ✅ Updated `index.ts` to export all tool categories
   - ✅ Created comprehensive `README.md` with documentation
   - Better maintainability and scalability

3. **Update API route** (`src/app/api/chat/route.ts`): ✅

   - ✅ Enhanced system prompt with multi-step planning instructions
   - ✅ Added design patterns section (buttons, forms, navbars, cards, dashboards)
   - ✅ Improved context awareness for complex layouts
   - ✅ Better guidance for spacing and grouping

4. **Update chat panel** (`src/components/canvas/ai-chat-panel.tsx`): ✅

   - ✅ Added quick action buttons for complex commands
   - ✅ Separated "Basic Shapes" and "Complex Components" sections
   - ✅ Different styling for complex command buttons (purple theme)
   - Example commands for testing complex components

5. **Documentation** (`src/lib/tools/README.md`): ✅

   - ✅ Comprehensive tool documentation
   - ✅ Design patterns and best practices
   - ✅ Examples for all tool categories
   - ✅ Testing guidelines

6. **UX Enhancements**: ✅
   - ✅ All quick action buttons with text wrapping (no truncation)
   - ✅ Scrollable quick action container with 17 total commands
   - ✅ Added "Manipulation & Layout" section (green theme)
   - ✅ Enhanced AI confirmation messages with ✓ checkmarks
   - ✅ Detailed tool responses with element counts and positions

### Deliverable:

✅ AI can handle complex commands:

- "Create a login form at 100, 100"
- "Create a navigation bar at 100, 50 with Home, About, Services, Contact"
- "Create a card at 500, 100 titled Dashboard with description Welcome to your dashboard"
- "Create a button at 300, 300 that says Click Me"
- "Create a dashboard titled Sales Overview with 4 cards"

---

## Testing Checklist

### Phase 1: ✅

- [x] AI chat button appears in toolbar after text button
- [x] Clicking button shows chat panel in right sidebar
- [x] Properties panel hidden when chat active
- [x] Properties panel returns when switching tools

### Phase 2: ✅

- [x] Can send messages to AI
- [x] AI responds with streaming text
- [x] Loading indicator shows during response
- [x] Error handling works

### Phase 3: ✅

- [x] Messages persist after page refresh
- [x] Clear chat button works
- [x] Confirmation dialog appears before clear
- [x] Chat loads on mount from Firestore

### Phase 4: ✅

- [x] "Create a red circle" works
- [x] "Add a rectangle at 100, 200" works
- [x] "Make a text that says Hello" works
- [x] "Draw a line" works
- [x] "Create a triangle" works
- [x] "Add a frame" works
- [x] Shapes appear on canvas with correct properties
- [x] Shapes persist in Firestore (`canvases/{canvasId}/nodes`)
- [x] Works with Firebase Emulators in development

### Phase 5: ✅

- [x] "Move the circle to 500, 500" works
- [x] "Resize the rectangle to 200x150" works
- [x] "Rotate the shape 45 degrees" works
- [x] "Change the circle color to red" works
- [x] "Delete that shape" works
- [x] "Create a 3x3 grid of circles" works
- [x] Shapes are identified by ID for manipulation
- [x] AI can see existing shapes in context

### Phase 6: ✅

- [x] "Create a login form" produces multiple elements
- [x] "Build a navigation bar" creates nav layout
- [x] "Create a button" works with custom text and colors
- [x] "Create a card" with title and description works
- [x] "Create a dashboard" with multiple cards works
- [x] Elements properly grouped/framed
- [x] Complex layouts use sensible spacing and positioning
- [x] Quick action buttons available for testing complex commands

---

## File Structure

New files created:

```
src/
  app/
    api/
      chat/
        route.ts                 # Phase 2: AI chat API endpoint ✅
  components/
    canvas/
      ai-chat-panel.tsx         # Phase 1: Chat UI component ✅
  hooks/
    useAiChat.ts                # Phase 3: Chat hook with persistence ✅
  lib/
    firebase/
      admin.ts                  # Phase 2: Firebase Admin SDK setup ✅
    tools/
      index.ts                  # Phase 4: Tool exports ✅
      creation-tools.ts         # Phase 4: Shape creation tools ✅
      manipulation-tools.ts     # Phase 5: Shape manipulation tools ✅
      layout-tools.ts           # Phase 5: Layout tools ✅
      complex-tools.ts          # Phase 6: Complex UI component tools ✅
      server-shapes.ts          # Phase 4: Server-side Firestore operations ✅
      README.md                 # Phase 6: Tools documentation ✅
  services/
    chat.ts                     # Phase 3: Firestore chat operations ✅
  types/
    chat.ts                     # Phase 2: Chat type definitions ✅
docs/
  ai-tool-setup.md              # Phase 4: Setup documentation ✅
```

Modified files:

- `src/types/canvas.ts` - Add "ai-chat" tool type ✅
- `src/components/canvas/toolbar.tsx` - Add AI chat button ✅
- `src/components/canvas/index.ts` - Export AiChatPanel ✅
- `src/app/canvas/page.tsx` - Integrate chat panel ✅
- `src/store/canvas-store.ts` - Add ai-chat tool ✅
- `firestore.rules` - Add chat message rules (Phase 3)
- `env.example` - Add OpenAI API key (Phase 2)
- `package.json` - Add ai and openai packages (Phase 2)
