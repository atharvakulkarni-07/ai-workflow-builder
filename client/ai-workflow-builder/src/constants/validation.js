// src/constants/validation.js
// Connection validation rules for the workflow canvas.
// Extracted from Playground.jsx for reusability and testability.

/**
 * Maps input node types to allowed bot target IDs.
 */
export const ALLOWED_BOT_TARGETS = {
  'input-image': ['imagegen', 'img2img'],
  'input-audio': ['speech2text', 'text2speech'],
  'input-file': ['summarizer', 'translator', 'gpt', 'sentiment', 'codegen', 'extract', 'imagegen', 'text2speech'],
};

/**
 * Validates whether a connection between two nodes is allowed.
 * @param {object} connection - { source, target } IDs
 * @param {object[]} nodes - All React Flow nodes
 * @param {object[]} edges - All React Flow edges
 * @returns {boolean}
 */
export function isValidConnection(connection, nodes, edges) {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  if (!sourceNode || !targetNode) return false;
  if (sourceNode.id === targetNode.id) return false;
  if (targetNode.type === 'inputNode') return false;
  if (sourceNode.type === 'outputNode') return false;

  // Only allow one incoming connection per node
  const existingInputs = edges.filter(e => e.target === targetNode.id).length;
  if (existingInputs >= 1) return false;

  // Input → Bot: check allowed targets
  if (sourceNode.type === 'inputNode') {
    const allowed = ALLOWED_BOT_TARGETS[sourceNode.data.type] || [];
    return allowed.includes(targetNode.data.id);
  }

  // Bot → Output: always allowed
  if (sourceNode.type === 'botNode' && targetNode.type === 'outputNode') return true;

  // Bot → Bot: text→imagegen is allowed
  if (
    sourceNode.type === 'botNode' &&
    targetNode.type === 'botNode' &&
    targetNode.data.id === 'imagegen' &&
    sourceNode.data.outputType === 'text'
  ) {
    return true;
  }

  // Bot → Bot: text→text is allowed
  if (
    sourceNode.type === 'botNode' &&
    targetNode.type === 'botNode' &&
    sourceNode.data.outputType === 'text' &&
    targetNode.data.outputType === 'text'
  ) {
    return true;
  }

  // Bot → Bot: text→audio is allowed
  if (
    sourceNode.type === 'botNode' &&
    targetNode.type === 'botNode' &&
    sourceNode.data.outputType === 'text' &&
    targetNode.data.outputType === 'audio'
  ) {
    return true;
  }

  return false;
}
