# 🛠️ AI Workflow Builder
[workflow.ai](https://ai-workflow-builder-4vvb-h74mspm4e.vercel.app/) is a modern, low-code platform for visually creating, configuring, and running complex AI-powered workflows. It empowers users to automate tasks like file processing, summarization, translation, text and image generation, and more—without writing a single line of code.

---

# 🚀 Features
- Visual Workflow Playground: Drag-and-drop interface to build AI pipelines.
- Multi-Modal Input: Supports PDF, images, and audio files as workflow inputs.
- AI Bot Nodes: Summarizer, Translator, GPT, and Image Generation bots—each configurable.
- Chained Processing: Seamlessly pass outputs from one bot as inputs to another.
- Prompt-to-Workflow Generation: Describe your workflow in plain English and let the AI build it for you.
- Import/Export/Save/Load: Manage workflows as JSON files or save them locally.
- Live Output Visualization: Output nodes display both text and images.
- User-Friendly Configuration: Easily customize bot prompts and parameters.

# Structure
```
src/
├── components/
│   ├── Playground.jsx         # Main workflow canvas and logic
│   ├── InputNode.jsx          # File upload/input node
│   ├── BotNode.jsx            # AI bot nodes (summarizer, translator, etc.)
│   ├── OutputNode.jsx         # Output/result display node
│   ├── ConfigModal.jsx        # Modal for bot configuration
│   └── Sidebar.jsx            # (Optional) Node palette for drag-and-drop
├── data/
│   └── aiBots.js              # List of available AI bots and their configs
├── utils/
│   └── pdfutils.js            # PDF text extraction logic
├── App.jsx
└── index.js
```

# ⚡ Quick Start
## 1. Clone the Repo
```
git clone https://github.com/yourusername/ai-workflow-builder.git
cd ai-workflow-builder
```
## 2. Install Dependencies
```
npm install
```
## 3. Set Up Environment Variables
Create a .env file in the root directory:


```
VITE_OPENROUTER_KEY=your_openrouter_api_key_here
```
- Get a free OpenRouter API key for AI bots.
- For image generation, no API key needed (uses Pollinations AI).

## 4. Start the App

```
npm run dev
```
- Open http://localhost:{$PORT} in your browser.

# 🧩 How to Use
- Build a Workflow Manually
  - Drag nodes (Input, AI Bots, Output) onto the canvas.
  - Connect them to define the data flow.
  - Configure each AI bot (e.g., set translation language or custom prompt).
  - Upload files (PDF, image, audio) in input nodes.
  - Click “Run” to process your workflow and see results in the Output Node.
  
- Generate a Workflow from a Prompt
  - Enter a natural language description (e.g., “Summarize a PDF and translate to German”) in the purple bar.
  - Click 🪄 Generate Workflow.
  - The system will auto-build the workflow for you!

- Save/Load/Import/Export
  - Use the buttons in the top bar to save, load, export, or import workflows as JSON files.

# 🛡️ License
This project is open source under the MIT License.

# 💡 Scope for Improvements
- More AI Bots: Add OCR, audio transcription, sentiment analysis, code generation, etc.
- Advanced Bot Configuration: Richer UI for bot options (e.g., dropdowns for language selection).
- Workflow Templates: Pre-built templates for common use cases.
- User Accounts & Cloud Sync: Save workflows to the cloud and access from anywhere.
- Real-time Collaboration: Multi-user editing and sharing.
- Custom Node Creation: Allow users to define custom nodes and logic.
- Performance Optimization: Handle large files and complex workflows more efficiently.
- Deployment: Deploy as a web app or offer workflow APIs for integration.

# 🙏 Acknowledgments
- OpenRouter.ai for multi-model AI APIs
- Pollinations AI for free text-to-image generation
- React Flow for the visual workflow engine
- PDF.js for PDF extraction

# 📬 Contact
- Questions, suggestions, or want to contribute?
- Open an issue or reach out via [email](atharvakulkarni.official@gmail.com).
