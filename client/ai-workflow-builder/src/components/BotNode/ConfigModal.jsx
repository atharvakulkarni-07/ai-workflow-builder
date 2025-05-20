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
          {/* Add more fields per bot type as needed */}
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
