import { aiBots } from '../../data/aiBots';
  
  export default function Sidebar() {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">AI Bots</h2>
        <ul>
          {aiBots.map(bot => (
            <li key={bot.id} className="mb-3 p-3 bg-white rounded shadow cursor-pointer border hover:bg-blue-50"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/reactflow', bot.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}>
              <div className="font-semibold">{bot.name}</div>
              <div className="text-xs text-gray-500">{bot.description}</div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  