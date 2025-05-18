import React, { useCallback, useState, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, addEdge, useNodesState, useEdgesState, Controls, Background } from '@xyflow/react'; 
import '@xyflow/react/dist/style.css';
import BotNode from '../BotNode/BotNode';
import InputNode from '../InputNode/InputNode'; // NEW: Import InputNode component
import { aiBots } from '../../data/aiBots';
import ConfigModal from '../BotNode/ConfigModal';

const initialNodes = [];
const initialEdges = [];

export default function Playground() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [configModal, setConfigModal] = useState({ isOpen: false, nodeId: null });

  // UPDATED: Include inputNode in nodeTypes
  const nodeTypes = useMemo(
    () => ({
      botNode: (nodeProps) => (
        <BotNode
          {...nodeProps}
          onConfigure={(nodeId) => setConfigModal({ isOpen: true, nodeId })}
        />
      ),
      inputNode: InputNode // NEW: Add inputNode type
    }),
    [setConfigModal]
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // UPDATED: Handle both uploaded files and AI bots
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      // NEW: Handle uploaded files first
      const fileData = event.dataTransfer.getData('sidebar-uploaded-file');
      if (fileData) {
        const file = JSON.parse(fileData);
        const reactFlowBounds = event.target.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };
        const node = {
          id: file.id,
          type: 'inputNode',
          position,
          data: { ...file },
        };
        setNodes((nds) => nds.concat(node));
        return; // Exit early to skip AI bot handling
      }

      // Existing AI bot handling
      const botId = event.dataTransfer.getData('application/reactflow');
      if (!botId) return;
      const bot = aiBots.find(b => b.id === botId);
      if (!bot) return;
      const reactFlowBounds = event.target.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      const node = {
        id: `${botId}_${+new Date()}`,
        type: 'botNode',
        position,
        data: { ...bot },
      };
      setNodes((nds) => nds.concat(node));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Helper to get node and config by nodeId
  const currentNode = nodes.find(n => n.id === configModal.nodeId);
  const currentConfig = currentNode?.data?.config || {};

  // Handler to update node config
  const handleSaveConfig = (newConfig) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === configModal.nodeId
          ? { ...node, data: { ...node.data, config: newConfig } }
          : node
      )
    );
  };

  // Inside Playground.jsx
console.log('Edges:', edges);


  return (
    <>
      <ReactFlowProvider>
        <div className="w-full h-full" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            fitView
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
      <ConfigModal
        isOpen={configModal.isOpen}
        onClose={() => setConfigModal({ isOpen: false, nodeId: null })}
        bot={currentNode?.data}
        config={currentConfig}
        onSave={handleSaveConfig}
      />
    </>
  );
}
