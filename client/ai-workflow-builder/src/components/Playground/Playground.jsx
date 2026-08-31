import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background } from '@xyflow/react'; 
import '@xyflow/react/dist/style.css';
import toast from 'react-hot-toast';

import BotNode from '../BotNode/BotNode';
import InputNode from '../InputNode/InputNode';
import OutputNode from '../OutputNode/OutputNode';
import ConfigModal from '../BotNode/ConfigModal';
import { aiBots } from '../../data/aiBots';

// Extracted modules
import { chatCompletion } from '../../services/aiService';
import { executeWorkflow, getPrevNodeIds } from '../../services/workflowEngine';
import { isValidConnection as validateConnection } from '../../constants/validation';
import useWorkflowPersistence from '../../hooks/useWorkflowPersistence';
import useSpeechInput from '../../hooks/useSpeechInput';

// ─── Workflow Generation Prompt ─────────────────────────────────────

function workflowGenerationPrompt(userPrompt) {
  return `
You are a workflow generator for an AI automation tool. Convert the user request below into a valid React Flow JSON workflow.

**STRICT RULES:**
- Only use these node types: "inputNode", "botNode", "outputNode".
- For all bot nodes (summarizer, translator, etc), always set "type": "botNode".
- For all bot nodes, the "data" object MUST include ALL of these fields (with correct values):
    - For Summarizer:
      { "id": "summarizer", "name": "Summarizer", "description": "Summarize text", "type": "text", "outputType": "text" }
    - For Translator:
      { "id": "translator", "name": "Translator", "description": "Translate text", "type": "text", "outputType": "text" }
    - (Add other bots as needed)
- For input nodes, "data" must include both "name" and "type" fields.
- For output nodes, "data" is an empty object: {}
- Edge IDs must be of the form: "xy-edge__<source>-<target>"
- Never use node types like "summarizer", "translator", etc. Only use "botNode" for all bots.
- Only output valid JSON, no markdown or extra text.

**EXAMPLE:**
{
  "nodes": [
    {
      "id": "input-123",
      "type": "inputNode",
      "position": { "x": 100, "y": 100 },
      "data": { "name": "", "type": "input-file" }
    },
    {
      "id": "summarizer-123",
      "type": "botNode",
      "position": { "x": 300, "y": 100 },
      "data": { "id": "summarizer", "name": "Summarizer", "description": "Summarize text", "type": "text", "outputType": "text" }
    },
    {
      "id": "translator-123",
      "type": "botNode",
      "position": { "x": 500, "y": 100 },
      "data": { "id": "translator", "name": "Translator", "description": "Translate text", "type": "text", "outputType": "text" }
    },
    {
      "id": "output-123",
      "type": "outputNode",
      "position": { "x": 700, "y": 100 },
      "data": {}
    }
  ],
  "edges": [
    { "id": "xy-edge__input-123-summarizer-123", "source": "input-123", "target": "summarizer-123" },
    { "id": "xy-edge__summarizer-123-translator-123", "source": "summarizer-123", "target": "translator-123" },
    { "id": "xy-edge__translator-123-output-123", "source": "translator-123", "target": "output-123" }
  ]
}

USER REQUEST: "${userPrompt}"

Respond ONLY with valid JSON as shown above. Do NOT use markdown or add any explanation.
  `;
}

// ─── Main Playground Component ──────────────────────────────────────

export default function Playground({ uploadedFiles: _uploadedFiles }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [configModal, setConfigModal] = useState({ isOpen: false, nodeId: null });
  const [connectionLineStyle, setConnectionLineStyle] = useState({});
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const reactFlowWrapper = useRef(null);

  // ─── Extracted Hooks ────────────────────────────────────────────

  const {
    saveWorkflow,
    loadWorkflow,
    clearWorkflow,
    exportWorkflow,
    importWorkflow,
    restoreWorkflow,
  } = useWorkflowPersistence({ nodes, edges, setNodes, setEdges });

  const { listening, startListening } = useSpeechInput(
    useCallback((transcript) => setPromptInput(transcript), [])
  );

  // Restore workflow from localStorage on mount
  useEffect(() => {
    restoreWorkflow();
  }, [restoreWorkflow]);

  // ─── Node Types (stable reference — no inline wrappers) ─────────

  const onConfigureBot = useCallback((nodeId) => {
    setConfigModal({ isOpen: true, nodeId });
  }, []);

  // nodeTypes must be stable to avoid React Flow re-mounting all nodes.
  // We pass onConfigure via node data instead of wrapping BotNode in a closure.
  const nodeTypes = useMemo(() => ({
    botNode: BotNode,
    inputNode: InputNode,
    outputNode: OutputNode,
  }), []);

  // Inject the onConfigure callback into every bot node's data
  useEffect(() => {
    setNodes(nds =>
      nds.map(node => {
        if (node.type === 'botNode' && node.data._onConfigure !== onConfigureBot) {
          return { ...node, data: { ...node.data, _onConfigure: onConfigureBot } };
        }
        return node;
      })
    );
  }, [onConfigureBot, setNodes]);

  // ─── Connection Validation ──────────────────────────────────────

  const isValidConnectionCb = useCallback((connection) => {
    return validateConnection(connection, nodes, edges);
  }, [nodes, edges]);

  const onConnect = useCallback((params) => {
    if (validateConnection(params, nodes, edges)) {
      setEdges((eds) => addEdge(params, eds));
      setConnectionLineStyle({});
    } else {
      setConnectionLineStyle({
        stroke: '#ff0000',
        strokeWidth: 2,
      });
      setTimeout(() => setConnectionLineStyle({}), 1000);
    }
  }, [setEdges, nodes, edges]);

  // ─── Workflow Execution ─────────────────────────────────────────

  const runWorkflow = useCallback(async () => {
    setIsRunning(true);
    const toastId = toast.loading('Running workflow...');
    try {
      const results = await executeWorkflow(nodes, edges);

      const outputNodeIds = nodes.filter(n => n.type === 'outputNode').map(n => n.id);
      setNodes(nds =>
        nds.map(node => {
          if (outputNodeIds.includes(node.id)) {
            const prevIds = getPrevNodeIds(node.id, edges);
            const lastInput = prevIds.length ? results[prevIds[0]] : null;
            return {
              ...node,
              data: {
                ...node.data,
                ...lastInput,
                result: lastInput?.text || lastInput?.name || 'No result',
              },
            };
          }
          return node;
        })
      );
      toast.success('Workflow complete!', { id: toastId });
    } catch (err) {
      toast.error(`Workflow failed: ${err.message}`, { id: toastId });
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges, setNodes]);

  // ─── Workflow Generation from Prompt ────────────────────────────

  const generateWorkflowFromPrompt = useCallback(async (userPrompt) => {
    setIsGenerating(true);
    const toastId = toast.loading('Generating workflow...');
    try {
      const jsonString = await chatCompletion({
        systemPrompt: workflowGenerationPrompt(userPrompt),
        userMessage: userPrompt,
        maxTokens: 1500,
      });

      // Strip markdown code fences if present
      const cleanJson = jsonString.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
      const generatedWorkflow = JSON.parse(cleanJson);

      if (generatedWorkflow.nodes && generatedWorkflow.edges) {
        setNodes(generatedWorkflow.nodes);
        setEdges(generatedWorkflow.edges);
        setPromptInput('');
        toast.success('Workflow generated!', { id: toastId });
      } else {
        toast.error('Failed to generate workflow: Invalid JSON structure.', { id: toastId });
      }
    } catch (err) {
      toast.error(`Workflow generation failed: ${err.message}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, [setNodes, setEdges]);

  // ─── Drag & Drop Handler ───────────────────────────────────────

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    if (type === 'input-node') {
      setNodes((nds) => nds.concat({
        id: `input-${crypto.randomUUID()}`,
        type: 'inputNode',
        position,
        data: { name: '', type: 'input-file' },
      }));
      return;
    }

    if (type === 'output-node') {
      setNodes((nds) => nds.concat({
        id: `output-${crypto.randomUUID()}`,
        type: 'outputNode',
        position,
        data: {},
      }));
      return;
    }

    const bot = aiBots.find(b => b.id === type);
    if (bot) {
      setNodes((nds) => nds.concat({
        id: `${type}-${crypto.randomUUID()}`,
        type: 'botNode',
        position,
        data: { ...bot, _onConfigure: onConfigureBot },
      }));
    }
  }, [setNodes, onConfigureBot]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ─── Config Modal State ─────────────────────────────────────────

  const currentNode = nodes.find(n => n.id === configModal.nodeId);
  const currentConfig = currentNode?.data?.config || {};

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <div className="font-bold text-xl tracking-tight text-blue-700">AI Workflow Playground</div>
        <div className="flex gap-2">
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded shadow transition-colors"
          >
            {isRunning ? '⏳ Running...' : '▶ Run'}
          </button>
          <button onClick={saveWorkflow} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow transition-colors">
            💾 Save
          </button>
          <button onClick={loadWorkflow} className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded shadow transition-colors">
            📂 Load
          </button>
          <button onClick={exportWorkflow} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow transition-colors">
            ⬇ Export
          </button>
          <label className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded shadow cursor-pointer transition-colors">
            ⬆ Import
            <input type="file" accept="application/json" onChange={importWorkflow} className="hidden" />
          </label>
          <button onClick={clearWorkflow} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition-colors">
            ✖ Clear
          </button>
        </div>
      </div>

      {/* Prompt-to-Workflow Section */}
      <div className="flex items-center gap-2 p-4 bg-purple-50 border-b border-purple-200">
        <input
          type="text"
          value={promptInput}
          onChange={e => setPromptInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && promptInput.trim() && !isGenerating) {
              generateWorkflowFromPrompt(promptInput);
            }
          }}
          placeholder="Describe your workflow (e.g., 'Summarize a PDF and translate to French')"
          className="flex-1 border border-purple-300 rounded px-3 py-2"
          disabled={isGenerating || listening}
        />
        <button
          onClick={startListening}
          className={`px-3 py-2 rounded shadow transition-colors ${listening ? 'bg-red-500' : 'bg-blue-500'} text-white`}
          title={listening ? 'Listening...' : 'Speak your prompt'}
          disabled={isGenerating || listening}
        >
          {listening ? '⏹️ Stop' : '🎤 Speak'}
        </button>
        <button
          onClick={() => generateWorkflowFromPrompt(promptInput)}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded shadow transition-colors"
          disabled={isGenerating || !promptInput.trim()}
        >
          {isGenerating ? 'Generating...' : '🪄 Generate Workflow'}
        </button>
      </div>

      {/* Playground Canvas */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100">
        <ReactFlowProvider>
          <div
            className="w-full h-full"
            ref={reactFlowWrapper}
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{ minHeight: '100%' }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              isValidConnection={isValidConnectionCb}
              connectionLineStyle={connectionLineStyle}
              fitView
              className="shadow-inner"
            >
              <Background 
                variant="dots" 
                gap={32} 
                size={1} 
                color="#e5e7eb" 
                className="opacity-50"
              />
              <Controls 
                className="bg-white p-1 rounded-lg shadow-md border border-gray-200"
                position="bottom-right"
              />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>

      {/* Configuration Modal */}
      <ConfigModal
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal({ isOpen: false, nodeId: null })}
        bot={currentNode?.data}
        config={currentConfig}
        onSave={(newConfig) => {
          setNodes(nds =>
            nds.map(node =>
              node.id === configModal.nodeId
                ? { ...node, data: { ...node.data, config: newConfig } }
                : node
            )
          );
        }}
      />
    </div>
  );
}
