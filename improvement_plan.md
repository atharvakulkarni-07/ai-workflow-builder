# AI Workflow Builder — Full Codebase Audit & Modernization Plan

## Executive Summary

**AI Workflow Builder** is a React 19 + Vite frontend with a minimal Express 5 backend proxy, enabling users to visually compose AI-powered pipelines (summarize, translate, generate images/speech) using a drag-and-drop React Flow canvas. The project is a **functional prototype** with significant potential, but its current state carries **critical security vulnerabilities, major architectural debt, and several lurking bugs** that would prevent production readiness.

**State of Health: 🟠 Fragile Prototype.** The core concept works, but the codebase has committed API keys to Git, a 771-line god component with duplicated API logic, memory leaks from unreleased object URLs, no tests, no error boundaries, node_modules committed to version control, and several broken/unimplemented bot handlers. The good news: the React Flow integration is solid, the component decomposition is reasonable at the top level, and the fixes are entirely tractable.

---

## User Review Required

> [!CAUTION]
> ### API Keys Leaked to Git History
> Both `.env` files containing **real API keys** (OpenRouter `sk-or-v1-...`, PlayHT `ak-...`) are committed to the repository. The server `.env` is tracked by git despite being in `.gitignore` (it was committed before the ignore rule). The root of the repo has **NO `.gitignore` at all**, so `.DS_Store` is also tracked.
>
> **Immediate action required:**
> 1. Rotate ALL compromised API keys (OpenRouter, PlayHT) immediately
> 2. Run `git rm --cached` on the tracked `.env` files
> 3. Consider using `git filter-branch` or BFG to purge keys from history
> 4. Add a root-level `.gitignore`

> [!WARNING]
> ### `server/node_modules` is committed to Git
> The entire `server/node_modules/` directory (hundreds of files) is tracked. The `.gitignore` only applies to files not yet tracked. This bloats the repo by ~4MB+ and is a maintenance hazard.

---

## Open Questions

1. **Is the PlayHT TTS integration still needed?** The hardcoded `localhost:3005` proxy approach requires the backend running simultaneously. Should this be made configurable or replaced with a browser-native TTS fallback?
2. **Which bots should be implemented vs. removed?** `img2img`, `speech2text`, `codegen`, and `extract` are listed in `aiBots.js` but have **no implementation** in `processBotNode()`. Should we stub them with a "coming soon" UX, or remove them from the sidebar?
3. **Do you want TypeScript migration?** The project has `@types/react` and `@types/react-dom` in devDependencies but uses `.jsx` files. A TS migration would catch many of the bugs found here.
4. **Vercel deployment**: The README links to a Vercel URL. Is the backend (`server/`) deployed separately, or is TTS functionality currently broken in production?

---

## Proposed Changes

Changes are organized by priority (🔴 Critical → 🟡 Medium → 🟢 Low) and grouped by component.

---

### 🔴 P0 — Critical: Security & Git Hygiene

#### [NEW] [`.gitignore`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/.gitignore)
Add a root-level `.gitignore` covering `.env`, `node_modules`, `.DS_Store`, and build artifacts.

#### [MODIFY] Git tracked files cleanup
```bash
# Remove committed secrets and node_modules from tracking
git rm --cached server/.env
git rm --cached .DS_Store
git rm -r --cached server/node_modules/
git commit -m "chore: remove tracked secrets and node_modules"
```

#### [NEW] [`.env.example`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/.env.example)
```env
VITE_OPENROUTER_KEY=your_openrouter_api_key_here
VITE_PLAYHT_KEY=your_playht_api_key_here
VITE_PLAYHT_USERID=your_playht_user_id_here
```

#### [NEW] [`server/.env.example`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/server/.env.example)
```env
PLAYHT_KEY=your_playht_api_key_here
PLAYHT_USERID=your_playht_user_id_here
PORT=3005
```

---

### 🔴 P1 — Critical: Bugs & Broken Logic

#### [MODIFY] [`Playground.jsx`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/src/components/Playground/Playground.jsx)

**Bug 1: `nodeTypes` recreated on every render → infinite re-renders** (Line 114-120)
The `useMemo` depends on `setConfigModal` (a state setter which is stable), but creates **new arrow function components** each render because the closure over `setConfigModal` creates a new function reference per `botNode`. React Flow will unmount/remount nodes every time `nodeTypes` changes.

```diff
- const nodeTypes = useMemo(() => ({
-   botNode: (nodeProps) => (
-     <BotNode {...nodeProps} onConfigure={(nodeId) => setConfigModal({ isOpen: true, nodeId })} />
-   ),
-   inputNode: InputNode,
-   outputNode: OutputNode,
- }), [setConfigModal]);
+ // Move onConfigure into BotNode via context or make nodeTypes truly stable
+ const onConfigureBot = useCallback((nodeId) => {
+   setConfigModal({ isOpen: true, nodeId });
+ }, []);
+
+ const nodeTypes = useMemo(() => ({
+   botNode: BotNode,
+   inputNode: InputNode,
+   outputNode: OutputNode,
+ }), []);
```
Then pass `onConfigure` via node data or React context instead of wrapping in an inline component.

**Bug 2: Sentiment bot uses translator's default prompt** (Line 376-406)
```diff
- const userPrompt = node.data.config?.prompt
-   ? node.data.config.prompt.replace('{text}', inputText)
-   : `Translate this to French:\n\n${inputText}`;
+ const userPrompt = node.data.config?.prompt
+   ? node.data.config.prompt.replace('{text}', inputText)
+   : `Analyze the sentiment of the following text:\n\n${inputText}`;
```

**Bug 3: Sentiment bot error message says "Unable to translate text"** (Line 404)
```diff
- return { text: 'Error: Unable to translate text.' };
+ return { text: 'Error: Unable to analyze sentiment.' };
```

**Bug 4: `runWorkflow` BFS traversal can process nodes before their dependencies** (Line 415-462)
The current BFS doesn't enforce topological ordering — if a bot node has multiple predecessors converging (DAG), it may be processed before all inputs are ready. The `visited` set prevents reprocessing, meaning the second input path is silently dropped.

**Bug 5: JSON stripping regex in `generateWorkflowFromPrompt` is broken** (Line 608)
```diff
- jsonString = jsonString.replace(/``````/g, '').trim();
+ jsonString = jsonString.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
```
The current regex matches exactly 6 backticks literally, not markdown code fences.

**Bug 6: `processBotNode` is defined inside the component but not memoized** (Line 185)
It's referenced in `runWorkflow`'s `useCallback` dependency array but is re-created every render, making the memoization useless.

**Bug 7: `Playground` component signature doesn't accept props** (Line 89)
`App.jsx` passes `uploadedFiles` prop, but `Playground` doesn't destructure it. The prop is silently ignored.
```diff
- export default function Playground() {
+ export default function Playground({ uploadedFiles }) {
```

**Bug 8: `Sidebar` doesn't accept `uploadedFiles`/`setUploadedFiles` props** (Line 4 of Sidebar.jsx)
`App.jsx` passes these props, but `Sidebar` ignores them:
```diff
- export default function Sidebar() {
+ export default function Sidebar({ uploadedFiles, setUploadedFiles }) {
```

---

### 🔴 P2 — Memory Leaks & Performance

#### [MODIFY] [`InputNode.jsx`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/src/components/InputNode/InputNode.jsx)

**Memory leak: `URL.createObjectURL` is never revoked** (Lines 32, 40)
Every render creates a new object URL that leaks memory. Use `useMemo` + cleanup:
```diff
+ import { useMemo, useEffect } from 'react';
+
+ const previewUrl = useMemo(() => {
+   if (data.file) return URL.createObjectURL(data.file);
+   return null;
+ }, [data.file]);
+
+ useEffect(() => {
+   return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
+ }, [previewUrl]);
```

#### [MODIFY] [`BotNode.jsx`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/src/components/BotNode/BotNode.jsx)

**Invalid CSS value** (Line 29): `background: 'green-400'` is not valid CSS. Should be a hex/RGB value.
```diff
- background: 'green-400',
- borderColor: 'green-600',
+ background: '#4ade80',  // green-400
+ borderColor: '#16a34a', // green-600
```

---

### 🟡 P3 — Architecture: Extract God Component

#### [MODIFY] [`Playground.jsx`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/src/components/Playground/Playground.jsx) — Decompose 771-line monolith

Extract into focused modules:

| New File | Responsibility |
|---|---|
| `src/services/aiService.js` | All OpenRouter / Pollinations API calls (deduplicate 5 nearly-identical `fetch` blocks) |
| `src/services/workflowEngine.js` | `runWorkflow`, `processBotNode`, graph traversal logic |
| `src/hooks/useWorkflowPersistence.js` | Save/load/export/import/clear logic |
| `src/hooks/useSpeechInput.js` | Web Speech API voice input logic |
| `src/constants/validation.js` | `allowedBotTargets`, `isValidConnection` |

**Before (duplicated API pattern in Playground.jsx — appears 5 times):**
```javascript
const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'workflow.ai',
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [...],
    max_tokens: N,
  }),
});
```

**After (single utility):**
```javascript
// src/services/aiService.js
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export async function chatCompletion({ systemPrompt, userMessage, maxTokens = 512 }) {
  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'workflow.ai',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`API Error: ${resp.status} ${resp.statusText}`);
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices?.[0]?.message?.content || 'No result';
}
```

---

### 🟡 P4 — Server Hardening

#### [MODIFY] [`server/index.js`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/server/index.js)

| Issue | Fix |
|---|---|
| `cors()` allows all origins | Restrict to known frontend origins |
| No request body validation/size limit | Add `express.json({ limit: '10kb' })` |
| No rate limiting | Add `express-rate-limit` |
| PlayHT response not validated | Check `response.ok` before `.json()` |
| `console.log(err)` for errors | Use proper logging (at minimum, `console.error`) |
| Hardcoded `localhost:3005` in client | Use `VITE_API_URL` environment variable |
| `node-fetch` v2 in CJS mode | Express 5 supports native fetch; remove dependency |
| Missing semicolon on line 38 | Syntax issue (won't cause errors in JS, but inconsistent) |
| No helmet/security headers | Add `helmet` middleware |

---

### 🟡 P5 — UX & Error Handling

| Issue | Location | Fix |
|---|---|---|
| `alert()` used for all user feedback (9 occurrences) | Playground.jsx | Replace with `react-hot-toast` (already in dependencies but unused!) |
| No loading indicator during `runWorkflow` | Playground.jsx | Add `isRunning` state + spinner/progress UI |
| No error boundary | App.jsx | Wrap with `ErrorBoundary` component |
| Unimplemented bots silently pass through | Playground.jsx L409 | Show "Not yet implemented" toast for `codegen`, `extract`, `img2img`, `speech2text` |
| Modal doesn't close on Escape | ConfigModal.jsx | Add `onKeyDown` handler |
| Modal doesn't close on backdrop click | ConfigModal.jsx | Add `onClick` on overlay div |

---

### 🟢 P6 — Code Quality & Modernization

| Issue | Location | Fix |
|---|---|---|
| `+new Date()` for IDs | Playground.jsx L552,562,573 | Use `crypto.randomUUID()` — safer, avoids collisions on fast interactions |
| `react-hot-toast` imported in `package.json` but never used | package.json | Wire it up (or remove if not wanted) |
| Empty `hooks/` directory | src/hooks/ | Populate with extracted hooks or remove |
| Empty `index.css` | src/index.css | Remove or add global reset styles |
| Duplicate README.md | client/ai-workflow-builder/ | The client has a copy of the root README — remove duplicate |
| `autoprefixer` and `postcss` in regular dependencies | package.json | Move to devDependencies |
| `@tailwindcss/vite` plugin used but Tailwind imported via `@import "tailwindcss"` in App.css | App.css/index.css | This is Tailwind v4's correct approach — no issue, but `index.css` is empty and unused |
| No `<meta name="description">` | index.html | Add for SEO |
| `data.file` objects stored in React state | InputNode/Playground | File objects are not serializable — breaks localStorage save and JSON export |

---

### 🟢 P7 — PDF Worker & Build

#### [MODIFY] [`pdfUtils.js`](file:///Users/atharvakulkarni/myfiles/Projects/AI_Workflow_Builder/client/ai-workflow-builder/src/utils/pdfUtils.js)

The worker path is hardcoded to `/pdf.worker.min.mjs` which relies on a 1MB file manually placed in `public/`. This is fragile. Use Vite's asset handling:
```diff
- import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
- pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
+ import * as pdfjsLib from 'pdfjs-dist';
+ import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
+ pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```

---

## Verification Plan

### Automated Tests
```bash
# After implementing changes:
cd client/ai-workflow-builder && npm run lint
cd client/ai-workflow-builder && npm run build  # Verify no build errors
cd server && node index.js  # Verify server starts cleanly
```

### Manual Verification
1. **Security**: Run `git ls-files | grep -E '\.env|node_modules'` — should return nothing
2. **Drag & Drop**: Verify nodes can be dragged from sidebar and dropped on canvas
3. **Connection validation**: Verify invalid connections are rejected (e.g., output → input)
4. **Workflow execution**: Create Input → Summarizer → Output pipeline, upload a PDF, run
5. **Save/Load**: Save workflow, refresh page, verify it auto-restores
6. **Export/Import**: Export to JSON, clear, import same JSON
7. **Prompt generation**: Enter "Summarize a PDF" in prompt bar, verify workflow is generated
8. **Memory**: Open DevTools → Performance Monitor, repeatedly upload files, verify no memory growth from object URLs

---

## Summary of All Findings

| Priority | Category | Count |
|---|---|---|
| 🔴 Critical | Security (leaked keys, node_modules in git) | 3 |
| 🔴 Critical | Bugs (wrong defaults, broken regex, dropped props, infinite re-renders) | 8 |
| 🔴 Critical | Memory Leaks (object URLs never revoked) | 2 |
| 🟡 Medium | Architecture (771-line god component, 5x duplicated API code) | 5 |
| 🟡 Medium | Server hardening (open CORS, no validation, no rate limit) | 7 |
| 🟡 Medium | UX (9x alert() calls, no loading states, no error boundaries) | 6 |
| 🟢 Low | Code quality (empty dirs, duplicate README, wrong dep scope) | 9 |
| **Total** | | **40 issues** |
