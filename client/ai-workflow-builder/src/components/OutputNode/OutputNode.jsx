import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function OutputNode({ data }) {
  return (
    <div className="rounded-md border-2 bg-lime-100 border-lime-400 p-3 min-w-[180px] relative">
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-lime-500 rounded-full"
        style={{
            bottom: 20,
            width: 18,
            height: 18,
            background: '#facc15',
            borderColor: '#eab308',
            boxShadow: '0 0 0 2px white',
          }}
      />
      <div className="font-bold text-base mb-1">Output Node</div>
      <div className="text-xs text-gray-600 mb-2">
        This node collects and displays the final result of your workflow.
      </div>
      {/* Result display area */}
      {data.result && (
        <div className="mt-2 p-2 bg-white rounded border text-green-700">
          <strong>Result:</strong> {data.result}
        </div>
      )}
    </div>
  );
}
