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
        style={{ top: -8 }}
      />
      <div className="font-bold text-base mb-1">Output Node</div>
      <div className="text-xs text-gray-600 mb-2">
        This node collects and displays the final result of your workflow.
      </div>
      {/* You can add a result display area here in the future */}
    </div>
  );
}
