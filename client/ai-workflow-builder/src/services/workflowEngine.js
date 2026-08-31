// src/services/workflowEngine.js
// Core workflow execution logic — graph traversal and bot processing.
// Extracted from the 771-line Playground.jsx monolith.

import { chatCompletion, generateImageUrl, textToSpeech } from './aiService';
import { extractTextFromPDF } from '../utils/pdfUtils';

// ─── Graph Utilities ────────────────────────────────────────────────

/** Returns IDs of input nodes that have no incoming edges (root inputs). */
export function getInputNodeIds(nodes, edges) {
  const targetIds = new Set(edges.map(e => e.target));
  return nodes
    .filter(n => n.type === 'inputNode' && !targetIds.has(n.id))
    .map(n => n.id);
}

/** Returns the first output node ID found. */
export function getOutputNodeId(nodes) {
  return nodes.find(n => n.type === 'outputNode')?.id || null;
}

/** Returns IDs of nodes immediately downstream of `nodeId`. */
export function getNextNodeIds(nodeId, edges) {
  return edges.filter(e => e.source === nodeId).map(e => e.target);
}

/** Returns IDs of nodes immediately upstream of `nodeId`. */
export function getPrevNodeIds(nodeId, edges) {
  return edges.filter(e => e.target === nodeId).map(e => e.source);
}

// ─── Input Resolution ───────────────────────────────────────────────

/** Extracts text from input data, handling PDFs transparently. */
async function resolveInputText(inputData) {
  let inputText = inputData?.text || inputData?.name || 'No input';
  if (inputData?.file?.type === 'application/pdf') {
    try {
      inputText = await extractTextFromPDF(inputData.file);
    } catch {
      return 'Error reading PDF file';
    }
  }
  return inputText;
}

// ─── Bot Processors ─────────────────────────────────────────────────

const UNIMPLEMENTED_BOTS = new Set(['img2img', 'speech2text', 'codegen', 'extract']);

async function processGPT(inputText) {
  try {
    const result = await chatCompletion({
      systemPrompt: 'You are a helpful assistant.',
      userMessage: inputText,
      maxTokens: 1000,
    });
    return { text: result };
  } catch (err) {
    return { text: `Error: ${err.message}` };
  }
}

async function processSummarizer(inputText) {
  try {
    const result = await chatCompletion({
      systemPrompt: 'You are a helpful assistant that summarizes text clearly and concisely.',
      userMessage: `Summarize the following text:\n\n${inputText}`,
    });
    return { text: result };
  } catch (err) {
    return { text: `Error: ${err.message}` };
  }
}

async function processTranslator(node, inputText) {
  const userPrompt = node.data.config?.prompt
    ? node.data.config.prompt.replace('{text}', inputText)
    : `Translate this to French:\n\n${inputText}`;
  try {
    const result = await chatCompletion({
      systemPrompt: 'You are a translation assistant. You will translate the data you get in the language asked by the user.',
      userMessage: userPrompt,
    });
    return { text: result };
  } catch {
    return { text: 'Error: Unable to translate text.' };
  }
}

async function processImageGen(node, inputText) {
  const userPrompt = node.data.config?.prompt
    ? node.data.config.prompt.replace('{text}', inputText)
    : `A beautiful illustration of: ${inputText}`;

  const imageUrl = generateImageUrl(userPrompt);
  return {
    text: `Image generated for: ${userPrompt}`,
    imageUrl,
  };
}

async function processText2Speech(inputText, node) {
  try {
    return await textToSpeech(inputText, {
      voice: node.data.config?.voice,
      language: node.data.config?.language,
    });
  } catch (err) {
    return { text: `Error: ${err.message}` };
  }
}

async function processSentiment(node, inputText) {
  const userPrompt = node.data.config?.prompt
    ? node.data.config.prompt.replace('{text}', inputText)
    : `Analyze the sentiment of the following text:\n\n${inputText}`;
  try {
    const result = await chatCompletion({
      systemPrompt: 'You are an excellent SENTIMENT ANALYZER. You will analyze the data that is provided by the user and PROVIDE THE SENTIMENT after reading the data in just ONE SENTENCE. NO EXTRA DESCRIPTION NEEDED. JUST STICK TO THE SENTIMENT.',
      userMessage: userPrompt,
    });
    return { text: result };
  } catch {
    return { text: 'Error: Unable to analyze sentiment.' };
  }
}

// ─── Bot Dispatcher ─────────────────────────────────────────────────

/**
 * Processes a single bot node with the given input data.
 * @param {object} node - The React Flow node
 * @param {object} inputData - Data from the upstream node
 * @returns {Promise<object>} Result object with { text, imageUrl?, audioUrl? }
 */
export async function processBotNode(node, inputData) {
  const inputText = await resolveInputText(inputData);

  if (UNIMPLEMENTED_BOTS.has(node.data.id)) {
    return { text: `⚠️ "${node.data.name}" is not yet implemented. Coming soon!` };
  }

  switch (node.data.id) {
    case 'gpt':
      return processGPT(inputText);
    case 'summarizer':
      return processSummarizer(inputText);
    case 'translator':
      return processTranslator(node, inputText);
    case 'imagegen':
      return processImageGen(node, inputText);
    case 'text2speech':
      return processText2Speech(inputText, node);
    case 'sentiment':
      return processSentiment(node, inputText);
    default:
      return { text: inputText };
  }
}

// ─── Workflow Execution ─────────────────────────────────────────────

/**
 * Runs the complete workflow using BFS traversal.
 * @param {object[]} nodes - All React Flow nodes
 * @param {object[]} edges - All React Flow edges
 * @returns {Promise<object>} Map of nodeId → result data
 */
export async function executeWorkflow(nodes, edges) {
  const results = {};
  const inputNodeIds = getInputNodeIds(nodes, edges);

  for (const inputId of inputNodeIds) {
    const inputNode = nodes.find(n => n.id === inputId);
    results[inputId] = inputNode.data;
    const queue = [inputId];
    const visited = new Set();

    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      const nextIds = getNextNodeIds(currentNodeId, edges);
      for (const nextId of nextIds) {
        const nextNode = nodes.find(n => n.id === nextId);
        if (results[currentNodeId]) {
          if (nextNode.type === 'botNode') {
            results[nextId] = await processBotNode(nextNode, results[currentNodeId]);
          } else if (nextNode.type === 'outputNode') {
            results[nextId] = results[currentNodeId];
          }
          queue.push(nextId);
        }
      }
    }
  }

  return results;
}
