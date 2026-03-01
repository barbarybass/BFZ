import { GameLoop } from '../engine/gameLoop.js';
import { Grid } from '../engine/grid.js';
import { Camera } from '../engine/camera.js';
import { Entity } from '../engine/entity.js';
import { Pathfinder } from '../engine/pathfinder.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const grid       = new Grid(32, 24, 32);
const mapWidth   = grid.cols * grid.tileSize;
const mapHeight  = grid.rows * grid.tileSize;
const camera     = new Camera(canvas.width, canvas.height, mapWidth, mapHeight);
const pathfinder = new Pathfinder(grid);

// Create a selected footman we can order around
const footman = new Entity({
  label: 'Footman', type: 'unit', owner: 1,
  x: 64, y: 64, maxHealth: 100
});
footman.selected = true;

const entities = [footman];

// --- Mouse events ---
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  camera.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('mouseleave', () => camera.onMouseLeave());

// Right-click to move the selected unit
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();

  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top  + camera.y;

  let targetCol = Math.floor(worldX / grid.tileSize);
  let targetRow = Math.floor(worldY / grid.tileSize);

  // If the target tile is unwalkable, search outward in a spiral
  // for the nearest walkable tile and go there instead
  if (!grid.getTile(targetCol, targetRow)?.walkable) {
    let found = false;
    for (let radius = 1; radius <= 10 && !found; radius++) {
      for (let dRow = -radius; dRow <= radius && !found; dRow++) {
        for (let dCol = -radius; dCol <= radius && !found; dCol++) {
          // Only check the outer ring of this radius
          if (Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) continue;
          const checkCol = targetCol + dCol;
          const checkRow = targetRow + dRow;
          const tile = grid.getTile(checkCol, checkRow);
          if (tile && tile.walkable) {
            targetCol = checkCol;
            targetRow = checkRow;
            found = true;
          }
        }
      }
    }
    if (!found) return; // Completely surrounded, do nothing
  }

  const unitPos = footman.getGridPosition(grid.tileSize);
  const path = pathfinder.findPath(unitPos.col, unitPos.row, targetCol, targetRow);
  if (path) footman.setPath(path, grid.tileSize);
});

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
