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
      {/* Show image if present */}
      {data.imageUrl ? (
        <>
          <img
            src={data.imageUrl}
            alt="AI generated"
            style={{
              maxWidth: '100%',
              maxHeight: 240,
              borderRadius: 8,
              marginTop: 8,
              marginBottom: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          />
          {data.text && (
            <div className="mt-2 p-2 bg-white rounded border text-green-700">
              <strong>Result:</strong> {data.text}
            </div>
          )}
        </>
      ) : (
        data.result && (
          <div className="mt-2 p-2 bg-white rounded border text-green-700">
            <strong>Result:</strong> {data.result}
          </div>
        )
      )}
    </div>
  );
}
