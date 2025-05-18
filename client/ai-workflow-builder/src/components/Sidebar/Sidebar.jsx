import React from 'react';
import { aiBots } from '../../data/aiBots';

export default function Sidebar({ uploadedFiles, setUploadedFiles }) {
  // Handle file input change
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: `${file.name}_${Date.now()}`,
      name: file.name,
      type: file.type.startsWith('image') ? 'input-image'
           : file.type.startsWith('audio') ? 'input-audio'
           : 'input-file',
      file,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upload Data</h2>
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="mb-4 block"
      />
      <ul className="mb-6">
        {uploadedFiles.map(file => (
          <li
            key={file.id}
            className="mb-2 p-2 bg-yellow-100 rounded border cursor-pointer"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('application/reactflow', file.id);
              e.dataTransfer.setData('sidebar-uploaded-file', JSON.stringify(file));
              e.dataTransfer.effectAllowed = 'move';
            }}
          >
            <span role="img" aria-label="file">
              {file.type === 'input-image' ? '🖼️' : file.type === 'input-audio' ? '🎵' : '📄'}
            </span>
            {' '}
            {file.name}
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mb-4">AI Bots</h2>
      <ul>
        {aiBots.map(bot => (
          <li
            key={bot.id}
            className="mb-3 p-3 bg-white rounded shadow cursor-pointer border hover:bg-blue-50"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('application/reactflow', bot.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
          >
            <div className="font-semibold">{bot.name}</div>
            <div className="text-xs text-gray-500">{bot.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
