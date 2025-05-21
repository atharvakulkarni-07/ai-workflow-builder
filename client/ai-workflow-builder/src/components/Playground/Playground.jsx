import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background } from '@xyflow/react'; 
import '@xyflow/react/dist/style.css';
import BotNode from '../BotNode/BotNode';
import InputNode from '../InputNode/InputNode';
import OutputNode from '../OutputNode/OutputNode';
import { aiBots } from '../../data/aiBots';
import ConfigModal from '../BotNode/ConfigModal';
import { extractTextFromPDF } from '../../utils/pdfutils';

const initialNodes = [];
const initialEdges = [];
const WORKFLOW_KEY = 'savedWorkflow';

const getInputNodeIds = (nodes, edges) => {
  const targetIds = edges.map(e => e.target);
  return nodes.filter(n => n.type === 'inputNode' && !targetIds.includes(n.id)).map(n => n.id);
};
const getOutputNodeId = (nodes) => nodes.find(n => n.type === 'outputNode')?.id || null;
const getNextNodeIds = (nodeId, edges) => edges.filter(e => e.source === nodeId).map(e => e.target);
const getPrevNodeIds = (nodeId, edges) => edges.filter(e => e.target === nodeId).map(e => e.source);

function workflowGenerationPrompt(userPrompt) {
  return `
You are a workflow generator for an AI automation tool. Convert this user request into a valid React Flow JSON workflow:

USER REQUEST: "${userPrompt}"

Respond ONLY with valid JSON in this structure:
{
  "nodes": [
    {
      "id": "input-1",
      "type": "inputNode",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Input PDF" }
    }
    // ...more nodes
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "input-1",
      "target": "summarizer-1"
    }
  ]
}

Important rules:
- Use these node types: inputNode, outputNode, summarizer, translator, gpt
- Always start with an inputNode and end with an outputNode
- Never add markdown/extra text - only JSON
`;
}

export default function Playground() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [configModal, setConfigModal] = useState({ isOpen: false, nodeId: null });
  const [connectionLineStyle, setConnectionLineStyle] = useState({});
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const reactFlowWrapper = useRef(null);

  // Restore workflow from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(WORKFLOW_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
        }
      } catch (e) {
        console.error('Failed to load workflow from localStorage:', e);
      }
    }
  }, [setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({
    botNode: (nodeProps) => (
      <BotNode {...nodeProps} onConfigure={(nodeId) => setConfigModal({ isOpen: true, nodeId })} />
    ),
    inputNode: InputNode,
    outputNode: OutputNode,
  }), [setConfigModal]);

  // --- Validation Logic (unchanged) ---
  const allowedBotTargets = {
    'input-image': ['imagegen', 'img2img'],
    'input-audio': ['speech2text', 'text2speech'],
    'input-file': ['summarizer', 'translator', 'gpt', 'sentiment', 'codegen', 'extract', 'imagegen'],
  };
  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    if (sourceNode.id === targetNode.id) return false;
    if (targetNode.type === 'inputNode') return false;
    if (sourceNode.type === 'outputNode') return false;
    const existingInputs = edges.filter(e => e.target === targetNode.id).length;
    if (existingInputs >= 1) return false;
    if (sourceNode.type === 'inputNode') {
      const allowed = allowedBotTargets[sourceNode.data.type] || [];
      return allowed.includes(targetNode.data.id);
    }
    if (
      sourceNode.type === 'botNode' &&
      targetNode.type === 'botNode' &&
      targetNode.data.id === 'imagegen' &&
      sourceNode.data.outputType === 'text'
    ) {
      return true;
    }
    if (sourceNode.type === 'botNode' && targetNode.type === 'outputNode') return true;
    if (
      sourceNode.type === 'botNode' &&
      targetNode.type === 'botNode' &&
      sourceNode.data.outputType === 'text' &&
      targetNode.data.outputType === 'text'
    ) {
      return true;
    }
    return false;
  }, [nodes, edges]);

  const onConnect = useCallback((params) => {
    if (isValidConnection(params)) {
      setEdges((eds) => addEdge(params, eds));
      setConnectionLineStyle({});
    } else {
      setConnectionLineStyle({
        stroke: '#ff0000',
        strokeWidth: 2,
      });
      setTimeout(() => setConnectionLineStyle({}), 1000);
    }
  }, [setEdges, isValidConnection]);

  // --- AI Bot Logic (summarizer, gpt, translator, etc.) ---

  async function processBotNode(node, inputData) {
    // Universal input handling for all bots
    let inputText = inputData?.text || inputData?.name || 'No input';
    if (inputData?.file?.type === 'application/pdf') {
      try {
        inputText = await extractTextFromPDF(inputData.file);
      } catch (err) {
        return { text: 'Error reading PDF file' };
      }
    }
    switch (node.data.id) {
      case 'gpt': {
        try {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'workflow.ai',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-8b-instruct:free',
              messages: [
                { role: 'system', content: 'You are a helpful assistant...' },
                { role: 'user', content: inputText }
              ],
              max_tokens: 1000,
            }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            return { text: `API Error: ${resp.status} ${resp.statusText}` };
          }
          if (data.error) {
            return { text: `API Error: ${data.error.message || JSON.stringify(data.error)}` };
          }
          if (!data.choices || !Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
            return { text: 'API returned no choices/content.' };
          }
          return { text: data.choices[0].message.content };
        } catch (err) {
          return { text: 'Error: Unable to generate text.' };
        }
      }
      case 'summarizer': {
        try {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'workflow.ai',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-8b-instruct:free',
              messages: [
                { role: 'system', content: 'You are a helpful assistant that summarizes text clearly and concisely.' },
                { role: 'user', content: `Summarize the following text:\n\n${inputText}` }
              ],
              max_tokens: 512,
            }),
          });
          const data = await resp.json();
          if (data.error) {
            return { text: `API Error: ${data.error.message}` };
          }
          return { text: data.choices?.[0]?.message?.content || 'No result' };
        } catch (err) {
          return { text: 'Error: Unable to summarize text.' };
        }
      }
      case 'translator': {
        const userPrompt = node.data.config?.prompt
          ? node.data.config.prompt.replace('{text}', inputText)
          : `Translate this to French:\n\n${inputText}`;
        try {
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'workflow.ai',
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.3-8b-instruct:free',
              messages: [
                { role: 'system', content: 'You are a translation assistant. You will translate the data you get in the language asked by the user.' },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 512,
            }),
          });
          const data = await resp.json();
          if (data.error) {
            return { text: `API Error: ${data.error.message}` };
          }
          return { text: data.choices?.[0]?.message?.content || 'No result' };
        } catch (err) {
          return { text: 'Error: Unable to translate text.' };
        }
      }

      case 'imagegen': {
        // Prefer previous bot's text, else file name, else fallback
        let inputText = inputData?.text || inputData?.name || 'No input';
      
        // If input is a PDF file, extract its text (optional, skip for images)
        if (inputData?.file?.type === 'application/pdf') {
          try {
            inputText = await extractTextFromPDF(inputData.file);
          } catch (err) {
            return { text: 'Error reading PDF file' };
          }
        }
      
        // Use user-configured prompt, replacing {text} with inputText, or fallback
        // {text} is always the response from previous node.
        const userPrompt = node.data.config?.prompt
          ? node.data.config.prompt.replace('{text}', inputText)
          : `A beautiful illustration of: ${inputText}`;
      
        // Pollinations API: returns image directly from prompt
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(userPrompt)}`;
      
        // You can optionally verify the image loads by fetching HEAD or GET, but usually you can just return the URL
        return {
          text: `Image generated for: ${userPrompt}`,
          imageUrl
        };
      }

      // other bots
      default:
        return { text: inputText };
    }
  }

  // --- Workflow runner ---
  const runWorkflow = useCallback(async () => {
    const results = {};
    const inputNodeIds = getInputNodeIds(nodes, edges);
    
    for (const inputId of inputNodeIds) {
      const inputNode = nodes.find(n => n.id === inputId);
      results[inputId] = inputNode.data;
      const queue = [inputId];
      const visited = new Set();
      
      while (queue.length > 0) {
        const currentNodeId = queue.shift();
        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);
        
        const nextIds = getNextNodeIds(currentNodeId, edges);
        for (const nextId of nextIds) {
          const nextNode = nodes.find(n => n.id === nextId);
          if (results[currentNodeId]) {
            if (nextNode.type === 'botNode') {
              results[nextId] = await processBotNode(nextNode, results[currentNodeId]);
            } else if (nextNode.type === 'outputNode') {
              results[nextId] = results[currentNodeId];
            }
            queue.push(nextId);
          }
        }
      }
    }
  
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
              ...lastInput, // This is the critical line
              result: lastInput?.text || lastInput?.name || 'No result'
            }
          };
        }
        return node;
      })
    );
  }, [nodes, edges, processBotNode, setNodes]);
  

  // --- Save, Load, Export, Import, Clear ---
  const saveWorkflow = () => {
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify({ nodes, edges }));
    alert('Workflow saved!');
  };

  const loadWorkflow = () => {
    const saved = localStorage.getItem(WORKFLOW_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          alert('Workflow loaded!');
        }
      } catch (e) {
        alert('Failed to load workflow.');
      }
    } else {
      alert('No saved workflow found.');
    }
  };

  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(WORKFLOW_KEY);
    alert('Workflow cleared!');
  };

  const exportWorkflow = () => {
    const dataStr = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkflow = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target.result);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          alert('Workflow imported!');
        } else {
          alert('Invalid workflow file.');
        }
      } catch (err) {
        alert('Failed to import workflow.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- Drag and Drop ---
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
      const node = {
        id: `input-${+new Date()}`,
        type: 'inputNode',
        position,
        data: { name: '', type: 'input-file' },
      };
      setNodes((nds) => nds.concat(node));
      return;
    }
    if (type === 'output-node') {
      const node = {
        id: `output-${+new Date()}`,
        type: 'outputNode',
        position,
        data: {},
      };
      setNodes((nds) => nds.concat(node));
      return;
    }
    const bot = aiBots.find(b => b.id === type);
    if (bot) {
      const node = {
        id: `${type}-${+new Date()}`,
        type: 'botNode',
        position,
        data: { ...bot },
      };
      setNodes((nds) => nds.concat(node));
      return;
    }
  }, [setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // --- Generate Workflow from Prompt ---
  async function generateWorkflowFromPrompt(userPrompt) {
    setIsGenerating(true);
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-8b-instruct:free',
          messages: [
            { role: 'system', content: workflowGenerationPrompt(userPrompt) }
          ]
        }),
      });
      const data = await resp.json();
      // Extract JSON from response (strip any code blocks)
      let jsonString = data.choices?.[0]?.message?.content || '';
      jsonString = jsonString.replace(/``````/g, '').trim();
      const generatedWorkflow = JSON.parse(jsonString);
      if (generatedWorkflow.nodes && generatedWorkflow.edges) {
        setNodes(generatedWorkflow.nodes);
        setEdges(generatedWorkflow.edges);
        setPromptInput('');
        alert('Workflow generated!');
      } else {
        alert('Failed to generate workflow: Invalid JSON structure.');
      }
    } catch (err) {
      alert('Workflow generation failed: ' + err.message);
    }
    setIsGenerating(false);
  }

  const currentNode = nodes.find(n => n.id === configModal.nodeId);
  const currentConfig = currentNode?.data?.config || {};

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <div className="font-bold text-xl tracking-tight text-blue-700">AI Workflow Playground</div>
        <div className="flex gap-2">
          <button onClick={runWorkflow} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow">
            ▶ Run
          </button>
          <button onClick={saveWorkflow} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow">
            💾 Save
          </button>
          <button onClick={loadWorkflow} className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded shadow">
            📂 Load
          </button>
          <button onClick={exportWorkflow} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow">
            ⬇ Export
          </button>
          <label className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded shadow cursor-pointer">
            ⬆ Import
            <input type="file" accept="application/json" onChange={importWorkflow} className="hidden" />
          </label>
          <button onClick={clearWorkflow} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow">
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
          placeholder="Describe your workflow (e.g., 'Summarize a PDF and translate to French')"
          className="flex-1 border border-purple-300 rounded px-3 py-2"
          disabled={isGenerating}
        />
        <button
          onClick={() => generateWorkflowFromPrompt(promptInput)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow"
          disabled={isGenerating || !promptInput.trim()}
        >
          {isGenerating ? 'Generating...' : '🪄 Generate Workflow'}
        </button>
      </div>
      {/* Playground */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100">
        <ReactFlowProvider>
          <div
            className="w-full h-full"
            ref={reactFlowWrapper}
            onDrop={onDrop}
            onDragOver={onDragOver}
            style={{ minHeight: "100%" }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
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
