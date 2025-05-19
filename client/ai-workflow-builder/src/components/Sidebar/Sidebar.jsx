import React from 'react';
import { aiBots } from '../../data/aiBots';

// Optional: You can replace these emojis with SVG icons or icon libraries like react-icons for better visuals
const fileTypeIcons = {
  'input-image': '🖼️',
  'input-audio': '🎵',
  'input-file': '📄',
};

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
    <div className="p-5 bg-gray-50 h-full overflow-y-auto flex flex-col">
      
      {/* Upload Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-3 border-b border-gray-300 pb-1">Upload Data</h2>
        <label 
          htmlFor="file-upload"
          className="cursor-pointer inline-block w-full text-center py-2 px-4 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('file-upload').click(); }}
          aria-label="Upload files"
        >
          Choose Files
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        {uploadedFiles.length > 0 && (
          <ul className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded bg-yellow-50">
            {uploadedFiles.map(file => (
              <li
                key={file.id}
                className="flex items-center gap-2 p-2 cursor-move hover:bg-yellow-200 focus:bg-yellow-300 outline-none"
                draggable
                tabIndex={0}
                onDragStart={e => {
                  e.dataTransfer.setData('application/reactflow', file.id);
                  e.dataTransfer.setData('sidebar-uploaded-file', JSON.stringify(file));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Optional: handle keyboard drag start or selection
                  }
                }}
                aria-label={`Drag to playground: ${file.name}`}
              >
                <span className="text-xl select-none" aria-hidden="true">
                  {fileTypeIcons[file.type] || '📄'}
                </span>
                <span className="truncate">{file.name}</span>
              </li>
            ))}
          </ul>
        )}
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
            onKeyDown={(e) => { if (e.key === 'Enter') {/* Optional keyboard drag */} }}
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
              onKeyDown={(e) => { if (e.key === 'Enter') {/* Optional keyboard drag */} }}
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
