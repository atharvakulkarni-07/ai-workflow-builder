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

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const processBotNode = useCallback((node, inputData) => {
    if (node.data.id === 'summarizer') {
      return { text: `Mock summary: ${inputData?.text || inputData?.name || 'No input'}` };
    }
    if (node.data.id === 'translator') {
      return { text: `Mock translation: ${inputData?.text || inputData?.name || 'No input'}` };
    }
    // ...other cases (YET TO BE DONE)
    return { text: `Processed: ${inputData?.name || 'No input'}` };
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

    inputNodeIds.forEach(inputId => {
      const inputNode = nodes.find(n => n.id === inputId);
      results[inputId] = inputNode.data;
      traverseFromNode(inputId, results);
    });

    const outputNodeId = getOutputNodeId(nodes);
    if (outputNodeId) {
      const prevIds = getPrevNodeIds(outputNodeId, edges);
      const lastInput = prevIds.length ? results[prevIds[0]] : null;
      setNodes(nds =>
        nds.map(node =>
          node.id === outputNodeId
            ? { ...node, data: { ...node.data, result: lastInput?.text || lastInput?.name || 'No result' } }
            : node
        )
      );
    }
  }, [nodes, edges, traverseFromNode, setNodes]);

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
