import React from 'react';

// Optionally, you can use some icon library for better visuals
const typeColors = {
  text: 'bg-blue-100 border-blue-400',
  image: 'bg-green-100 border-green-400',
  audio: 'bg-yellow-100 border-yellow-400',
  code: 'bg-purple-100 border-purple-400',
  default: 'bg-gray-100 border-gray-400',
};

// Add onConfigure and id props
export default function BotNode({ data, id, onConfigure }) {
  const { name, description, type, config } = data;
  const colorClass = typeColors[type] || typeColors.default;

  return (
    <div className={`rounded-md border-2 ${colorClass} p-3 min-w-[180px]`}>
      <div className="font-bold text-base mb-1">{name}</div>
      <div className="text-xs text-gray-600 mb-2">{description}</div>
      <button
        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        onClick={() => onConfigure && onConfigure(id)}
      >
        Configure
      </button>
      {config && (
        <div className="mt-2 text-xs text-green-700">
          Configured
        </div>
      )}
    </div>
  );
}
