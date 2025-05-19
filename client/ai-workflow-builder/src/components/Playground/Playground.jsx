import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { ReactFlow, ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background } from '@xyflow/react'; 
import '@xyflow/react/dist/style.css';
import BotNode from '../BotNode/BotNode';
import InputNode from '../InputNode/InputNode';
import OutputNode from '../OutputNode/OutputNode';
import { aiBots } from '../../data/aiBots';
import ConfigModal from '../BotNode/ConfigModal';

const initialNodes = [];
const initialEdges = [];
const WORKFLOW_KEY = 'savedWorkflow';

// Helper functions
const getInputNodeIds = (nodes, edges) => {
  const targetIds = edges.map(e => e.target);
  return nodes.filter(n => n.type === 'inputNode' && !targetIds.includes(n.id)).map(n => n.id);
};
const getOutputNodeId = (nodes) => nodes.find(n => n.type === 'outputNode')?.id || null;
const getNextNodeIds = (nodeId, edges) => edges.filter(e => e.source === nodeId).map(e => e.target);
const getPrevNodeIds = (nodeId, edges) => edges.filter(e => e.target === nodeId).map(e => e.source);

export default function Playground() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [configModal, setConfigModal] = useState({ isOpen: false, nodeId: null });
  const [connectionLineStyle, setConnectionLineStyle] = useState({});

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





   // Validation Checks

   const allowedBotTargets = {
    'input-image': ['imagegen', 'img2img'],
    'input-audio': ['speech2text', 'text2speech'],
    'input-file': ['summarizer', 'translator', 'gpt', 'sentiment', 'codegen', 'extract'],
  };
  
  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
  
    if (!sourceNode || !targetNode) return false;
  
    // No self-connection
    if (sourceNode.id === targetNode.id) return false;
  
    // Input nodes cannot receive inputs
    if (targetNode.type === 'inputNode') return false;
  
    // Output node cannot send outputs
    if (sourceNode.type === 'outputNode') return false;
  
    // All nodes except input nodes can only have ONE input
    const existingInputs = edges.filter(e => e.target === targetNode.id).length;
    if (existingInputs >= 1) return false;
  
    // Input node to bot node (type compatibility)
    if (sourceNode.type === 'inputNode') {
      const allowed = allowedBotTargets[sourceNode.data.type] || [];
      return allowed.includes(targetNode.data.id);
    }
  
    // Allow any text-output bot to connect to image generator
    if (
      sourceNode.type === 'botNode' &&
      targetNode.type === 'botNode' &&
      targetNode.data.id === 'imagegen' &&
      sourceNode.data.outputType === 'text'
    ) {
      return true;
    }
  
    // Bot to output node is allowed
    if (sourceNode.type === 'botNode' && targetNode.type === 'outputNode') return true;
  
    // Allow chaining of text-output bots
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
      setConnectionLineStyle({}); // Reset line style
    } else {
      // Visual feedback for invalid connection
      setConnectionLineStyle({
        stroke: '#ff0000',
        strokeWidth: 2,
      });
      setTimeout(() => setConnectionLineStyle({}), 1000); // Reset after 1s
    }
  }, [setEdges, isValidConnection]);

  const processBotNode = useCallback((node, inputData) => {
    // Get input text from previous node (could be text or file name)
    const inputText = inputData?.text || inputData?.name || 'No input';
  
    switch(node.data.id) {
      case 'gpt':
        return { 
          text: `Generated text: "${inputText}". Lorem ipsum dolor sit amet, consectetur adipiscing elit.`
        };
  
      case 'summarizer':
        return { 
          text: `Summary: ${inputText.split(' ').slice(0, 10).join(' ')}...` 
        };
  
      case 'translator':
        return { 
          text: `Translated (French): ${inputText} → ${inputText} en français` 
        };
  
      case 'imagegen':
        return {
          text: `Generated image for: "${inputText}" (512x512 PNG)`,
          // For real implementation, you might return a URL or base64 image
        };
  
      case 'img2img':
        return {
          text: `Transformed image based on: "${inputText}" (1024x1024 PNG)`
        };
  
      case 'speech2text':
        return {
          text: `Transcribed audio: "${inputData?.name || 'audiofile.wav'}" → "${inputText}"`
        };
  
      case 'text2speech':
        return {
          text: `Generated audio: ${inputText}.wav`
        };
  
      case 'sentiment':
        const sentiments = ['😊 Positive', '😐 Neutral', '😠 Negative'];
        return {
          text: `Sentiment: ${sentiments[Math.floor(Math.random() * 3)]}`
        };
  
      case 'codegen':
        return {
          text: `// Generated code:\nfunction ${inputText.split(' ')[0]}() {\n  return "${inputText}"\n}`
        };
  
      case 'extract':
        return {
          text: `Entities: ${['Person', 'Location', 'Organization']
            .map(e => `${e}: ${inputText.split(' ')[0]}_${e}`)
            .join(', ')}`
        };
  
      default:
        return { 
          text: `Processed: ${inputText}` 
        };
    }
  }, []);  

  const traverseFromNode = useCallback((nodeId, results) => {
    const nextIds = getNextNodeIds(nodeId, edges);
    nextIds.forEach(nextId => {
      const nextNode = nodes.find(n => n.id === nextId);
      if (nextNode.type === 'botNode') {
        results[nextId] = processBotNode(nextNode, results[nodeId]);
        traverseFromNode(nextId, results);
      } else if (nextNode.type === 'outputNode') {
        results[nextId] = results[nodeId];
      }
    });
  }, [edges, nodes, processBotNode]);




  const runWorkflow = useCallback(() => {
    const results = {};
    const inputNodeIds = getInputNodeIds(nodes, edges);
  
    // Process all input nodes and their branches
    inputNodeIds.forEach(inputId => {
      const inputNode = nodes.find(n => n.id === inputId);
      results[inputId] = inputNode.data;
      
      // Create a queue for BFS traversal
      const queue = [inputId];
      const visited = new Set();
  
      while (queue.length > 0) {
        const currentNodeId = queue.shift();
        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);
  
        const nextIds = getNextNodeIds(currentNodeId, edges);
        
        nextIds.forEach(nextId => {
          const nextNode = nodes.find(n => n.id === nextId);
          
          // Only process if previous node has a result
          if (results[currentNodeId]) {
            if (nextNode.type === 'botNode') {
              results[nextId] = processBotNode(nextNode, results[currentNodeId]);
            } else if (nextNode.type === 'outputNode') {
              results[nextId] = results[currentNodeId];
            }
            
            queue.push(nextId);
          }
        });
      }
    });
  
    // Update ALL output nodes with their respective inputs
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
              result: lastInput?.text || lastInput?.name || 'No result'
            }
          };
        }
        return node;
      })
    );
  }, [nodes, edges, processBotNode, setNodes]);
  

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const fileData = event.dataTransfer.getData('sidebar-uploaded-file');
    if (fileData) {
      const file = JSON.parse(fileData);
      const reactFlowBounds = event.target.getBoundingClientRect();
      const node = {
        id: file.id,
        type: 'inputNode',
        position: { x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top },
        data: { ...file },
      };
      setNodes((nds) => nds.concat(node));
      return;
    }

    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (nodeType === 'output-node') {
      const reactFlowBounds = event.target.getBoundingClientRect();
      const node = {
        id: `output-node_${+new Date()}`,
        type: 'outputNode',
        position: { x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top },
        data: {},
      };
      setNodes((nds) => nds.concat(node));
      return;
    }

    const bot = aiBots.find(b => b.id === nodeType);
    if (bot) {
      const reactFlowBounds = event.target.getBoundingClientRect();
      const node = {
        id: `${nodeType}_${+new Date()}`,
        type: 'botNode',
        position: { x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top },
        data: { ...bot },
      };
      setNodes((nds) => nds.concat(node));
    }
  }, [setNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const currentNode = nodes.find(n => n.id === configModal.nodeId);
  const currentConfig = currentNode?.data?.config || {};

  const saveWorkflow = useCallback(() => {
    const workflow = {
      nodes: nodes.map(node => ({
        ...node,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        ...edge,
      })),
    };
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify(workflow));
    alert('Workflow saved successfully!');
  }, [nodes, edges]);

  const loadWorkflow = useCallback(() => {
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
        alert('Failed to load workflow: Invalid data.');
      }
    } else {
      alert('No saved workflow found.');
    }
  }, [setNodes, setEdges]);



  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(WORKFLOW_KEY);
    alert('Workflow cleared!');
  }, [setNodes, setEdges]);


  const exportWorkflow = useCallback(() => {
    const workflow = {
      nodes: nodes.map(node => ({
        ...node,
        data: node.data,
      })),
      edges: edges.map(edge => ({
        ...edge,
      })),
    };
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
  
    // Create a temporary link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges]);


  const importWorkflow = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const workflow = JSON.parse(e.target.result);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          alert('Workflow imported successfully!');
        } else {
          alert('Invalid workflow file.');
        }
      } catch (err) {
        alert('Failed to import workflow: Invalid JSON.');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);


 
  
  
  
  
  

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <header className="bg-white shadow-sm py-4 px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Workflow Canvas</h1>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-md hover:bg-gray-200 transition-all"
              onClick={saveWorkflow}
            >
              💾 Save
            </button>

            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-md hover:bg-gray-200 transition-all"
              onClick={loadWorkflow}
            >
              📂 Load
            </button>

            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-md hover:bg-gray-200 transition-all"
              onClick={clearWorkflow}
            >
              🗑️ Clear
            </button>



            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-md hover:bg-gray-200 transition-all"
              onClick={exportWorkflow}
            >
              ⬇️ Export
            </button>
            <label
              htmlFor="import-workflow-input"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow-md hover:bg-gray-200 transition-all cursor-pointer"
            >
              ⬆️ Import
            </label>
            <input
              type="file"
              accept="application/json"
              id="import-workflow-input"
              style={{ display: 'none' }}
              onChange={importWorkflow}
            />





            <button
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg 
                        shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              onClick={runWorkflow}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Run Workflow
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas Area with drag-and-drop handlers */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100">
        <ReactFlowProvider>
          <div
            className="w-full h-full"
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
