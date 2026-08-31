import React from 'react';
import { Handle, Position } from '@xyflow/react';

const typeColors = {
  text: 'bg-blue-100 border-blue-400',
  image: 'bg-green-100 border-green-400',
  audio: 'bg-yellow-100 border-yellow-400',
  code: 'bg-purple-100 border-purple-400',
  default: 'bg-gray-100 border-gray-400',
};

// BotNode now reads onConfigure from data._onConfigure (injected by Playground)
// instead of receiving it as a direct prop via a closure wrapper.
export default function BotNode({ data, id }) {
  const { name, description, type, config, _onConfigure } = data;
  const colorClass = typeColors[type] || typeColors.default;

  return (
    <div className={`rounded-md border-2 ${colorClass} p-3 min-w-[180px] relative`}>
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 rounded-full"
        style={{
            bottom: 20,
            width: 18,
            height: 18,
            background: '#4ade80',   // green-400
            borderColor: '#16a34a',  // green-600
            boxShadow: '0 0 0 2px white',
          }}
      />
      <div className="font-bold text-base mb-1">{name}</div>
      <div className="text-xs text-gray-600 mb-2">{description}</div>
      <button
        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
        onClick={() => _onConfigure && _onConfigure(id)}
      >
        Configure
      </button>
      {config && (
        <div className="mt-2 text-xs text-green-700">
          ✓ Configured
        </div>
      )}
      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-yellow-300 rounded-full"
        style={{
            bottom: -20,
            width: 18,
            height: 18,
            background: '#facc15', // yellow-400
            borderColor: '#eab308', // yellow-600
            boxShadow: '0 0 0 2px white',
          }}
      />
    </div>
  );
}
