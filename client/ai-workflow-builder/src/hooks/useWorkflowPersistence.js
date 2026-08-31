// src/hooks/useWorkflowPersistence.js
// Encapsulates save/load/export/import/clear logic for workflows.
// Replaces raw localStorage calls scattered through Playground.jsx.

import { useCallback } from 'react';
import toast from 'react-hot-toast';

const WORKFLOW_KEY = 'savedWorkflow';

/**
 * Custom hook for workflow persistence (localStorage, file export/import).
 * @param {object} params
 * @param {object[]} params.nodes - Current nodes
 * @param {object[]} params.edges - Current edges
 * @param {Function} params.setNodes - State setter for nodes
 * @param {Function} params.setEdges - State setter for edges
 */
export default function useWorkflowPersistence({ nodes, edges, setNodes, setEdges }) {

  const saveWorkflow = useCallback(() => {
    // Strip non-serializable data (File objects) before saving
    const cleanNodes = nodes.map(n => ({
      ...n,
      data: { ...n.data, file: undefined },
    }));
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify({ nodes: cleanNodes, edges }));
    toast.success('Workflow saved!');
  }, [nodes, edges]);

  const loadWorkflow = useCallback(() => {
    const saved = localStorage.getItem(WORKFLOW_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          toast.success('Workflow loaded!');
        }
      } catch {
        toast.error('Failed to load workflow.');
      }
    } else {
      toast('No saved workflow found.', { icon: 'ℹ️' });
    }
  }, [setNodes, setEdges]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(WORKFLOW_KEY);
    toast.success('Workflow cleared!');
  }, [setNodes, setEdges]);

  const exportWorkflow = useCallback(() => {
    // Strip non-serializable data (File objects) before exporting
    const cleanNodes = nodes.map(n => ({
      ...n,
      data: { ...n.data, file: undefined },
    }));
    const dataStr = JSON.stringify({ nodes: cleanNodes, edges }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported!');
  }, [nodes, edges]);

  const importWorkflow = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target.result);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
          toast.success('Workflow imported!');
        } else {
          toast.error('Invalid workflow file.');
        }
      } catch {
        toast.error('Failed to import workflow.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setNodes, setEdges]);

  const restoreWorkflow = useCallback(() => {
    const saved = localStorage.getItem(WORKFLOW_KEY);
    if (saved) {
      try {
        const workflow = JSON.parse(saved);
        if (workflow.nodes && workflow.edges) {
          setNodes(workflow.nodes);
          setEdges(workflow.edges);
        }
      } catch (e) {
        console.error('Failed to restore workflow from localStorage:', e);
      }
    }
  }, [setNodes, setEdges]);

  return {
    saveWorkflow,
    loadWorkflow,
    clearWorkflow,
    exportWorkflow,
    importWorkflow,
    restoreWorkflow,
    WORKFLOW_KEY,
  };
}
