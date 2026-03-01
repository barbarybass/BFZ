import { GameLoop } from '../engine/gameLoop.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// --- Update Function (game logic goes here) ---
function update(delta) {
  // Nothing to update yet
}

// --- Render Function (drawing goes here) ---
function render() {
  // Clear the canvas each frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Temporary placeholder: draw a test rectangle
  ctx.fillStyle = '#4a7c59';
  ctx.fillRect(100, 100, 80, 80);

  // Label it
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.fillText('Game Loop Running', 100, 90);
}

// --- Start the Game ---
const gameLoop = new GameLoop(update, render);
gameLoop.start();