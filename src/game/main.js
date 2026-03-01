import { GameLoop }     from '../engine/gameLoop.js';
import { Grid }         from '../engine/grid.js';
import { Camera }       from '../engine/camera.js';
import { Entity }       from '../engine/entity.js';
import { Pathfinder }   from '../engine/pathfinder.js';
import { SelectionBox } from '../ui/selectionBox.js';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 600;

const grid       = new Grid(32, 24, 32);
const mapWidth   = grid.cols * grid.tileSize;
const mapHeight  = grid.rows * grid.tileSize;
const camera     = new Camera(canvas.width, canvas.height, mapWidth, mapHeight);
const pathfinder = new Pathfinder(grid);
const selBox     = new SelectionBox();

// --- Create a small army to select and order around ---
const entities = [
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x:  64, y:  64, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 100, y:  64, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x:  64, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 100, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 400, y: 300, maxHealth: 120 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 440, y: 300, maxHealth: 120 }),
];

// Helper: get all selected units belonging to player 1
function getSelected() {
  return entities.filter(e => e.selected && e.owner === 1);
}

// Helper: deselect everything
function deselectAll() {
  entities.forEach(e => e.selected = false);
}

// --- Mouse state ---
let mouseScreenX = 0;
let mouseScreenY = 0;

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseScreenX = e.clientX - rect.left;
  mouseScreenY = e.clientY - rect.top;
  camera.onMouseMove(mouseScreenX, mouseScreenY);
  if (selBox.active) selBox.update(mouseScreenX, mouseScreenY);
});

canvas.addEventListener('mouseleave', () => camera.onMouseLeave());

// --- Left mouse down: start selection box ---
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // Left click only
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  selBox.start(sx, sy);
});

// --- Left mouse up: finish selection ---
canvas.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (selBox.isDrag()) {
    // Drag selection: select all player 1 units inside the box
    deselectAll();
    entities.forEach(entity => {
      if (entity.owner === 1 && selBox.containsEntity(entity, camera.x, camera.y)) {
        entity.selected = true;
      }
    });
  } else {
    // Single click: check if we clicked directly on a unit
    const worldX = sx + camera.x;
    const worldY = sy + camera.y;
    const clicked = entities.find(entity =>
      worldX >= entity.x && worldX <= entity.x + entity.width &&
      worldY >= entity.y && worldY <= entity.y + entity.height
    );

    deselectAll();
    if (clicked && clicked.owner === 1) {
      clicked.selected = true;
    }
  }

  selBox.end();
});

// --- Right-click: move selected units ---
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top  + camera.y;

  let targetCol = Math.floor(worldX / grid.tileSize);
  let targetRow = Math.floor(worldY / grid.tileSize);

  // Find nearest walkable tile if target is unwalkable
  if (!grid.getTile(targetCol, targetRow)?.walkable) {
    let found = false;
    for (let radius = 1; radius <= 10 && !found; radius++) {
      for (let dRow = -radius; dRow <= radius && !found; dRow++) {
        for (let dCol = -radius; dCol <= radius && !found; dCol++) {
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
    if (!found) return;
  }

  // Send each selected unit to a slightly offset position
  // so they don't all pile onto the exact same tile
  const selected = getSelected();
  selected.forEach((unit, index) => {
    const offsetCol = targetCol + (index % 3) - 1;
    const offsetRow = targetRow + Math.floor(index / 3);
    const clampedCol = Math.max(0, Math.min(offsetCol, grid.cols - 1));
    const clampedRow = Math.max(0, Math.min(offsetRow, grid.rows - 1));

    const unitPos = unit.getGridPosition(grid.tileSize);
    const path = pathfinder.findPath(unitPos.col, unitPos.row, clampedCol, clampedRow);
    if (path) unit.setPath(path, grid.tileSize);
  });
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
  selBox.render(ctx);

  // Edge scroll indicators
  if (camera.scrolling.left)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, 20, canvas.height); }
  if (camera.scrolling.right) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(canvas.width-20, 0, 20, canvas.height); }
  if (camera.scrolling.up)    { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, canvas.width, 20); }
  if (camera.scrolling.down)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, canvas.height-20, canvas.width, 20); }
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();
