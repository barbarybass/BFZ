import { GameLoop } from '../engine/gameLoop.js';
import { Grid } from '../engine/grid.js';
import { Camera } from '../engine/camera.js';
import { Entity } from '../engine/entity.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const grid = new Grid(32, 24, 32);
const mapWidth  = grid.cols * grid.tileSize;
const mapHeight = grid.rows * grid.tileSize;
const camera = new Camera(canvas.width, canvas.height, mapWidth, mapHeight);

// --- Create a few test entities ---
const entities = [
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 100, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 150, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 300, y: 200, maxHealth: 120, currentHealth: 80 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 350, y: 200, maxHealth: 120, currentHealth: 40 }),
];

// Select the first entity so we can see the selection ring
entities[0].selected = true;

// --- Mouse events ---
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  camera.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('mouseleave', () => camera.onMouseLeave());

// --- Update ---
function update(delta) {
  camera.update(delta);
  entities.forEach(e => e.update(delta, grid));
}

// --- Render ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.render(ctx, camera.x, camera.y, canvas.width, canvas.height);
  entities.forEach(e => e.render(ctx, camera.x, camera.y));

  // Edge scroll indicators
  if (camera.scrolling.left)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, 20, canvas.height); }
  if (camera.scrolling.right) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(canvas.width-20, 0, 20, canvas.height); }
  if (camera.scrolling.up)    { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, canvas.width, 20); }
  if (camera.scrolling.down)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, canvas.height-20, canvas.width, 20); }
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();
