import { GameLoop }      from '../engine/gameLoop.js';
import { Grid }          from '../engine/grid.js';
import { Camera }        from '../engine/camera.js';
import { Entity }        from '../engine/entity.js';
import { Pathfinder }    from '../engine/pathfinder.js';
import { SelectionBox }  from '../ui/selectionBox.js';
import { CollisionGrid } from '../engine/collision.js';

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

canvas.width  = 800;
canvas.height = 600;

const grid          = new Grid(32, 24, 32);
const mapWidth      = grid.cols * grid.tileSize;
const mapHeight     = grid.rows * grid.tileSize;
const camera        = new Camera(canvas.width, canvas.height, mapWidth, mapHeight);
const pathfinder    = new Pathfinder(grid);
const selBox        = new SelectionBox();
const collisionGrid = new CollisionGrid(mapWidth, mapHeight, grid.tileSize);

const entities = [
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x:  64, y:  64, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 100, y:  64, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x:  64, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 100, y: 100, maxHealth: 100 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 600, y: 400, maxHealth: 120 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 640, y: 400, maxHealth: 120 }),
];

function getSelected() {
  return entities.filter(e => e.selected && e.owner === 1);
}

function deselectAll() {
  entities.forEach(e => e.selected = false);
}

function nearestWalkable(col, row) {
  if (grid.getTile(col, row)?.walkable) return { col, row };
  for (let radius = 1; radius <= 10; radius++) {
    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        if (Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) continue;
        const c = col + dCol;
        const r = row + dRow;
        const tile = grid.getTile(c, r);
        if (tile && tile.walkable) return { col: c, row: r };
      }
    }
  }
  return null;
}

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

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  selBox.start(e.clientX - rect.left, e.clientY - rect.top);
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  if (selBox.isDrag()) {
    deselectAll();
    entities.forEach(entity => {
      if (entity.owner === 1 && selBox.containsEntity(entity, camera.x, camera.y)) {
        entity.selected = true;
      }
    });
  } else {
    const worldX = sx + camera.x;
    const worldY = sy + camera.y;
    const clicked = entities.find(entity =>
      worldX >= entity.x && worldX <= entity.x + entity.width &&
      worldY >= entity.y && worldY <= entity.y + entity.height
    );
    deselectAll();
    if (clicked && clicked.owner === 1) clicked.selected = true;
  }
  selBox.end();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top  + camera.y;
  const baseCol = Math.floor(worldX / grid.tileSize);
  const baseRow = Math.floor(worldY / grid.tileSize);
  const base = nearestWalkable(baseCol, baseRow);
  if (!base) return;
  const selected = getSelected();
  // Temporarily mark enemy unit tiles as unwalkable so pathfinder routes around them
  const enemyTiles = [];
  entities.forEach(e => {
    if (e.owner !== 1 && e.alive) {
      const pos = e.getGridPosition(grid.tileSize);
      const tile = grid.getTile(pos.col, pos.row);
      if (tile && tile.walkable) {
        enemyTiles.push({ col: pos.col, row: pos.row, tile });
        grid.setTile(pos.col, pos.row, { ...tile, walkable: false });
      }
    }
  });

  selected.forEach((unit, index) => {
    let offsetCol = Math.max(0, Math.min(base.col + (index % 3) - 1, grid.cols - 1));
    let offsetRow = Math.max(0, Math.min(base.row + Math.floor(index / 3), grid.rows - 1));
    const dest = nearestWalkable(offsetCol, offsetRow);
    if (!dest) return;
    const unitPos = unit.getGridPosition(grid.tileSize);
    const path = pathfinder.findPath(unitPos.col, unitPos.row, dest.col, dest.row);
    if (path) unit.setPath(path, grid.tileSize);
  });

  // Restore enemy tiles
  enemyTiles.forEach(({ col, row, tile }) => grid.setTile(col, row, tile));
});

function update(delta) {
  collisionGrid.clear();
  entities.forEach(e => { if (e.alive) collisionGrid.insert(e); });
  camera.update(delta);
  entities.forEach(e => e.update(delta, grid, entities, collisionGrid));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.render(ctx, camera.x, camera.y, canvas.width, canvas.height);
  entities.forEach(e => e.render(ctx, camera.x, camera.y));
  selBox.render(ctx);
  if (camera.scrolling.left)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, 20, canvas.height); }
  if (camera.scrolling.right) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(canvas.width-20, 0, 20, canvas.height); }
  if (camera.scrolling.up)    { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, canvas.width, 20); }
  if (camera.scrolling.down)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, canvas.height-20, canvas.width, 20); }
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();
