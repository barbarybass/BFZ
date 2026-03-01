import { GameLoop } from '../engine/gameLoop.js';
import { Grid } from '../engine/grid.js';
import { Camera } from '../engine/camera.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Create a 32x24 tile grid, each tile is 32x32 pixels
const grid = new Grid(32, 24, 32);

const mapWidth  = grid.cols * grid.tileSize;  // 1024px
const mapHeight = grid.rows * grid.tileSize;  // 768px

// Create camera
const camera = new Camera(canvas.width, canvas.height, mapWidth, mapHeight);

// --- Mouse event listeners for edge scrolling ---
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  camera.onMouseMove(mouseX, mouseY);
});

canvas.addEventListener('mouseleave', () => {
  camera.onMouseLeave();
});

// --- Update ---
function update(delta) {
  camera.update(delta);
}

// --- Render ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.render(ctx, camera.x, camera.y, canvas.width, canvas.height);

  // Draw edge scroll indicators so you can see the threshold zones
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 20;
  if (camera.scrolling.left)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, 20, canvas.height); }
  if (camera.scrolling.right) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(canvas.width-20, 0, 20, canvas.height); }
  if (camera.scrolling.up)    { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, canvas.width, 20); }
  if (camera.scrolling.down)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, canvas.height-20, canvas.width, 20); }
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();
