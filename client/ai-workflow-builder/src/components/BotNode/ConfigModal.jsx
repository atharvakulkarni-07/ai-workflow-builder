import React from 'react';

export default function ConfigModal({ isOpen, onClose, bot, config, onSave }) {
  const [form, setForm] = React.useState(config || {});

  React.useEffect(() => {
    setForm(config || {});
  }, [config, isOpen]);

  if (!isOpen || !bot) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 min-w-[320px] shadow-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >✕</button>
        <h2 className="text-lg font-bold mb-4">Configure: {bot.name}</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(form);
            onClose();
          }}
        >
          {/* TEXT BOTS */}
          {bot.type === 'text' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  <span className="font-semibold">System Prompt</span>
                  <span className="text-xs text-gray-500 ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={form.systemPrompt || ''}
                  onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                  placeholder="e.g. You are a helpful assistant."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  <span className="font-semibold">Prompt Template</span>
                  <span className="text-xs text-gray-500 ml-1">(use <code>{'{text}'}</code> for input/PDF content)</span>
                </label>
                <textarea
                  className="border rounded w-full p-2"
                  value={form.prompt || ''}
                  onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                  placeholder="e.g. Summarize this document in 3 bullet points: {text}"
                  rows={3}
                  required
                />
              </div>
            </>
          )}

          {/* IMAGE BOTS */}
          {bot.type === 'image' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Prompt</label>
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={form.prompt || ''}
                  onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Image Size</label>
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={form.size || ''}
                  onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                  placeholder="e.g. 512x512"
                />
              </div>
            </>
          )}

          {/* AUDIO BOTS (Text-to-Speech) */}
          {bot.type === 'audio' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  <span className="font-semibold">Text to Speak</span>
                  <span className="text-xs text-gray-500 ml-1">(use <code>{'{text}'}</code> for input)</span>
                </label>
                <textarea
                  className="border rounded w-full p-2"
                  value={form.prompt || ''}
                  onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                  placeholder="e.g. Read this out loud: {text}"
                  rows={3}
                  required
                />
              </div>
              {/* Optional: Voice selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Voice (optional)
                </label>
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={form.voice || ''}
                  onChange={e => setForm(f => ({ ...f, voice: e.target.value }))}
                  placeholder="e.g. en-US-1"
                />
              </div>
              {/* Optional: Language selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Language (optional)
                </label>
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={form.language || ''}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  placeholder="e.g. english"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
