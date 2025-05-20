import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

export default function InputNode({ data, id }) {
  const { setNodes } = useReactFlow();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNodes(nds =>
        nds.map(node =>
          node.id === id
            ? { ...node, data: { ...node.data, file, name: file.name, type: 'input-file' } }
            : node
        )
      );
    }
  };

  return (
    <div className="rounded-md border-2 bg-yellow-100 border-yellow-400 p-3 min-w-[180px] relative">
      <div className="font-bold text-base mb-1">Input: {data.name || 'No file uploaded'}</div>
      <input
        type="file"
        accept=".pdf,.csv,.jpg,.jpeg,.png,.mp3,.wav"
        onChange={handleFileChange}
        className="mb-2"
      />
      {/* Show preview for image */}
      {data.type === 'input-image' && data.file && (
        <img
          src={URL.createObjectURL(data.file)}
          alt={data.name}
          className="w-full h-20 object-cover rounded"
        />
      )}
      {/* Show audio controls */}
      {data.type === 'input-audio' && data.file && (
        <audio controls className="w-full mt-2">
          <source src={URL.createObjectURL(data.file)} type={data.file.type} />
        </audio>
      )}
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
