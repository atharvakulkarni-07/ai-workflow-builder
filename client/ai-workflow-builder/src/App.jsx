import './App.css'
import Sidebar from './components/Sidebar/Sidebar';
import Playground from './components/Playground/Playground';

export default function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-[30%] h-full bg-gray-100 border-r">
        <Sidebar />
      </aside>
      <main className="w-[70%] h-full">
        <Playground />
      </main>
    </div>
  );
}
