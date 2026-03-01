import { GameLoop } from '../engine/gameLoop.js';
import { Grid } from '../engine/grid.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Create a 32x24 tile grid, each tile is 32x32 pixels
// (making a total map of 1024x768 pixels — larger than the screen)
const grid = new Grid(32, 24, 32);

// Camera position (top-left corner of what's visible)
let cameraX = 0;
let cameraY = 0;

function update(delta) {
  // Nothing extra to update yet
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the tile grid
  grid.render(ctx, cameraX, cameraY, canvas.width, canvas.height);
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();