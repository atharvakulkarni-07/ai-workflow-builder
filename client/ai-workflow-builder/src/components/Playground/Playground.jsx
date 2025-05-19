import React, { useCallback, useState, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background } from '@xyflow/react'; 
import '@xyflow/react/dist/style.css';
import BotNode from '../BotNode/BotNode';
import InputNode from '../InputNode/InputNode';
import OutputNode from '../OutputNode/OutputNode';
import { aiBots } from '../../data/aiBots';
import ConfigModal from '../BotNode/ConfigModal';

const initialNodes = [];
const initialEdges = [];

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

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <header className="bg-white shadow-sm py-4 px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Workflow Canvas</h1>
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
