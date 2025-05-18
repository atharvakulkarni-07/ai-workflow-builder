import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Playground from './components/Playground/Playground';

export default function App() {
  // Move uploadedFiles state here
  const [uploadedFiles, setUploadedFiles] = useState([]);

  return (
    <div className="flex h-screen">
      <aside className="w-[30%] h-full bg-gray-100 border-r">
        <Sidebar uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
      </aside>
      <main className="w-[70%] h-full">
        <Playground uploadedFiles={uploadedFiles} />
      </main>
    </div>
  );
}
