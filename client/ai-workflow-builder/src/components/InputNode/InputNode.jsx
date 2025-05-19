import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function InputNode({ data }) {
  return (
    <div className="rounded-md border-2 bg-yellow-100 border-yellow-400 p-3 min-w-[180px] relative">
      <div className="font-bold text-base mb-1">Input: {data.name}</div>
      {data.type === 'input-image' && (
        <img 
          src={URL.createObjectURL(data.file)} 
          alt={data.name} 
          className="w-full h-20 object-cover rounded"
        />
      )}
      {data.type === 'input-audio' && (
        <audio controls className="w-full mt-2">
          <source src={URL.createObjectURL(data.file)} type={data.file.type} />
        </audio>
      )}
      {/* Output handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-yellow-500 rounded-full"
        style={{
            bottom: -20,
            width: 18,
            height: 18,
            background: '#facc15',
            borderColor: '#eab308',
            boxShadow: '0 0 0 2px white',
          }}
      />
    </div>
  );
}
