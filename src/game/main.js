import { GameLoop }      from '../engine/gameLoop.js';
import { Grid }          from '../engine/grid.js';
import { Camera }        from '../engine/camera.js';
import { Entity }        from '../engine/entity.js';
import { Peasant }       from '../engine/peasant.js';
import { Pathfinder }    from '../engine/pathfinder.js';
import { SelectionBox }  from '../ui/selectionBox.js';
import { CollisionGrid } from '../engine/collision.js';
import { ResourceNode, PlayerResources, RESOURCE_TYPES } from '../engine/resource.js';
import { Building }      from '../engine/building.js';
import { HUD }           from '../ui/hud.js';
import { CombatSystem }  from '../engine/combat.js';

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
const p1Resources   = new PlayerResources();
const hud           = new HUD(p1Resources);

// Mark gold mine tiles as unwalkable so units path around it
// Gold mine is at x:320,y:64 = cols 10-11, rows 2-3
for (let col = 10; col <= 11; col++) {
  for (let row = 2; row <= 3; row++) {
    grid.setTile(col, row, { id: 99, label: 'GoldMine', color: '#FFD700', walkable: false });
  }
}

// Town Hall - 2x2 tiles (64x64px), acts as drop-off point
const townHall = new Building({
  label:     'Town Hall',
  owner:     1,
  x:         64,
  y:         64,
  width:     64,
  height:    64,
  color:     '#8888cc',
  isDropOff: true,
});

const buildings = [townHall];

// Gold mine - 2x2 tiles (64x64px)
const goldMine = new ResourceNode({
  type:   RESOURCE_TYPES.GOLD,
  x:      320,
  y:      64,
  width:  64,
  height: 64,
  amount: 1000,
});

// Lumber is gathered directly from forest tiles on the grid
// We create a ResourceNode that represents the forest patch
const forestResource = new ResourceNode({
  type:   RESOURCE_TYPES.LUMBER,
  x:      576,   // col 18 * 32
  y:      64,    // row 2  * 32
  width:  128,   // 4 tiles wide  (cols 18-21)
  height: 128,   // 4 tiles tall  (rows 2-5)
  amount: 500,
});

// Store forest bounds for pathfinding reference
forestResource.forestCols = { min: 18, max: 21 };
forestResource.forestRows = { min: 2,  max: 5  };

const resources = [goldMine, forestResource];

// Peasants start near Town Hall
const peasant1 = new Peasant({ owner: 1, x: 144, y:  64, playerResources: p1Resources, dropOffBuilding: townHall, grid });
const peasant2 = new Peasant({ owner: 1, x: 144, y:  96, playerResources: p1Resources, dropOffBuilding: townHall, grid });

const entities = [
  peasant1,
  peasant2,
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 160, y: 200, maxHealth: 100, attackDamage: 12, attackVariance: 4, attackRange: 48, attackSpeed: 1000, speed: 130 }),
  new Entity({ label: 'Footman', type: 'unit', owner: 1, x: 196, y: 200, maxHealth: 100, attackDamage: 12, attackVariance: 4, attackRange: 48, attackSpeed: 1000, speed: 130 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 600, y: 400, maxHealth: 150, attackDamage: 15, attackVariance: 6, attackRange: 48, attackSpeed: 1200, speed: 110 }),
  new Entity({ label: 'Grunt',   type: 'unit', owner: 2, x: 640, y: 400, maxHealth: 150, attackDamage: 15, attackVariance: 6, attackRange: 48, attackSpeed: 1200, speed: 110 }),
];

// Give every entity access to pathfinder and grid for dynamic replanning
entities.forEach(e => { e.pathfinder = pathfinder; e.grid = grid; });

function getSelected() {
  return entities.filter(e => e.selected && e.owner === 1);
}

function deselectAll() {
  entities.forEach(e => e.selected = false);
  buildings.forEach(b => b.selected = false);
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
  const rect   = canvas.getBoundingClientRect();
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top  + camera.y;
  const selected = getSelected();

  // Attack order if right-clicked on enemy
  const clickedEnemy = entities.find(e => e.owner !== 1 && e.alive && worldX >= e.x && worldX <= e.x + e.width && worldY >= e.y && worldY <= e.y + e.height);
  if (clickedEnemy) {
    selected.forEach(u => { u.targetId = clickedEnemy.id; u.combatState = "chasing"; u.path = []; u.moving = false; });
    return;
  }

  // Check if right-clicked on a resource node
  const clickedResource = resources.find(r =>
    r.alive &&
    worldX >= r.x && worldX <= r.x + r.width &&
    worldY >= r.y && worldY <= r.y + r.height
  );

  if (clickedResource) {
    selected.forEach(unit => {
      if (unit instanceof Peasant) {
        // If gold mine, temporarily make its tiles walkable so peasant can path inside
        if (clickedResource.type.id === 'gold') {
          const mineLeft   = Math.floor(clickedResource.x / grid.tileSize);
          const mineRight  = Math.floor((clickedResource.x + clickedResource.width  - 1) / grid.tileSize);
          const mineTop    = Math.floor(clickedResource.y / grid.tileSize);
          const mineBottom = Math.floor((clickedResource.y + clickedResource.height - 1) / grid.tileSize);
          for (let c = mineLeft; c <= mineRight; c++) {
            for (let r = mineTop; r <= mineBottom; r++) {
              grid.setTile(c, r, { id: 99, label: 'GoldMine', color: '#FFD700', walkable: true });
            }
          }
          unit.gatherFrom(clickedResource, pathfinder, grid);
          // Restore mine tiles as unwalkable after pathfinding
          for (let c = mineLeft; c <= mineRight; c++) {
            for (let r = mineTop; r <= mineBottom; r++) {
              grid.setTile(c, r, { id: 99, label: 'GoldMine', color: '#FFD700', walkable: false });
            }
          }
        } else {
          unit.gatherFrom(clickedResource, pathfinder, grid);
        }
      }
    });
    return;
  }

  // Normal move order
  const baseCol = Math.floor(worldX / grid.tileSize);
  const baseRow = Math.floor(worldY / grid.tileSize);
  const base = nearestWalkable(baseCol, baseRow);
  if (!base) return;

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
    if (unit instanceof Peasant) { unit.state = 'idle'; unit.targetResource = null; }
  });

  enemyTiles.forEach(({ col, row, tile }) => grid.setTile(col, row, tile));
});

window.debugEntities = entities;
function update(delta) {
  grid.update(delta);

  // Run combat system
  CombatSystem.update(delta, entities);

  // Tick hit effects
  entities.forEach(e => {
    if (e.hitEffect) {
      e.hitEffect.timer -= delta;
      if (e.hitEffect.timer <= 0) e.hitEffect = null;
    }
  });

  collisionGrid.clear();
  entities.forEach(e => { if (e.alive) collisionGrid.insert(e); });
  camera.update(delta);
  entities.forEach(e => {
    if (e instanceof Peasant) {
      e.update(delta, grid, entities, collisionGrid, pathfinder);
    } else {
      e.update(delta, grid, entities, collisionGrid);
    }
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.render(ctx, camera.x, camera.y, canvas.width, canvas.height);
  resources.forEach(r => r.render(ctx, camera.x, camera.y));
  buildings.forEach(b => b.render(ctx, camera.x, camera.y));
  entities.forEach(e => e.render(ctx, camera.x, camera.y));
  selBox.render(ctx);

  if (camera.scrolling.left)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, 20, canvas.height); }
  if (camera.scrolling.right) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(canvas.width-20, 0, 20, canvas.height); }
  if (camera.scrolling.up)    { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, canvas.width, 20); }
  if (camera.scrolling.down)  { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, canvas.height-20, canvas.width, 20); }

  hud.render(ctx, canvas.width);
}

const gameLoop = new GameLoop(update, render);
gameLoop.start();
