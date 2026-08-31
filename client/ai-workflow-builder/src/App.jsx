import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Playground from './components/Playground/Playground';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen">
        <aside className="w-[30%] h-full bg-gray-100 border-r">
          <Sidebar uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} />
        </aside>
        <main className="w-[70%] h-full">
          <Playground uploadedFiles={uploadedFiles} />
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </ErrorBoundary>
  );
}
