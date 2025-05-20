import React from 'react';
import { aiBots } from '../../data/aiBots';

export default function Sidebar() {
  return (
    <div className="p-5 bg-gray-50 h-full overflow-y-auto flex flex-col">

      {/* Input Node Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 border-b border-gray-300 pb-1">Input Nodes</h2>
        <ul>
          <li
            className="mb-3 p-3 bg-yellow-100 rounded shadow cursor-move border border-yellow-400 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            draggable
            tabIndex={0}
            onDragStart={e => {
              e.dataTransfer.setData('application/reactflow', 'input-node');
              e.dataTransfer.effectAllowed = 'move';
            }}
            aria-label="Drag to playground: Input Node"
          >
            <span className="font-semibold text-yellow-800">Input Node</span>
            <div className="text-xs text-yellow-700">Upload files, images, or audio here (after adding to canvas)</div>
          </li>
        </ul>
      </section>

      {/* Output Node Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 border-b border-gray-300 pb-1">Output</h2>
        <ul>
          <li
            className="mb-3 p-3 bg-lime-100 rounded shadow cursor-move border border-lime-300 hover:bg-lime-200 focus:outline-none focus:ring-2 focus:ring-lime-400"
            draggable
            tabIndex={0}
            onDragStart={e => {
              e.dataTransfer.setData('application/reactflow', 'output-node');
              e.dataTransfer.effectAllowed = 'move';
            }}
            aria-label="Drag to playground: Output Node"
          >
            <div className="font-semibold text-lime-800">Output Node</div>
            <div className="text-xs text-lime-700">Collect & display workflow results here</div>
          </li>
        </ul>
      </section>

      {/* AI Bots Section */}
      <section className="flex-grow overflow-y-auto">
        <h2 className="text-2xl font-bold mb-3 border-b border-gray-300 pb-1">AI Bots</h2>
        <ul>
          {aiBots.map(bot => (
            <li
              key={bot.id}
              className="mb-3 p-3 bg-white rounded shadow cursor-move border border-gray-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              draggable
              tabIndex={0}
              onDragStart={e => {
                e.dataTransfer.setData('application/reactflow', bot.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              aria-label={`Drag to playground: ${bot.name}`}
            >
              <div className="font-semibold">{bot.name}</div>
              <div className="text-xs text-gray-500">{bot.description}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
