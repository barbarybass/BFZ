export const TILE_TYPES = {
  GRASS:         { id: 0, label: 'Grass',         color: '#4a7c59', walkable: true  },
  DIRT:          { id: 1, label: 'Dirt',           color: '#8B6914', walkable: true  },
  WATER:         { id: 2, label: 'Water',          color: '#1a3a5c', walkable: false },
  STONE:         { id: 3, label: 'Stone',          color: '#6b6b6b', walkable: false },
  FOREST:        { id: 4, label: 'Forest',         color: '#2d5a27', walkable: false },
  CHOPPED_FOREST:{ id: 5, label: 'Chopped Forest', color: '#6a9e5a', walkable: true  },
};

const FOREST_REGROWTH_TIME = 60000; // 60 seconds to regrow

export class Grid {
  constructor(cols, rows, tileSize) {
    this.cols     = cols;
    this.rows     = rows;
    this.tileSize = tileSize;
    this.tiles    = [];
    this.regrowthTimers = {}; // key: 'col,row' -> ms remaining

    this.initTiles();
  }

  initTiles() {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = TILE_TYPES.GRASS;
      }
    }

    // Water
    for (let row = 5; row < 10; row++) {
      for (let col = 12; col < 15; col++) {
        this.tiles[row][col] = TILE_TYPES.WATER;
      }
    }

    // Forest
    for (let row = 2; row < 6; row++) {
      for (let col = 18; col < 22; col++) {
        this.tiles[row][col] = TILE_TYPES.FOREST;
      }
    }

    // Stone path
    for (let col = 3; col < 10; col++) {
      this.tiles[8][col] = TILE_TYPES.STONE;
    }
  }

  getTile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }

  setTile(col, row, tileType) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.tiles[row][col] = tileType;
  }

  // Chop a forest tile - marks it as chopped and starts regrowth timer
  chopForest(col, row) {
    const tile = this.getTile(col, row);
    if (!tile || tile.id !== TILE_TYPES.FOREST.id) return;
    this.setTile(col, row, TILE_TYPES.CHOPPED_FOREST);
    this.regrowthTimers[col + ',' + row] = FOREST_REGROWTH_TIME;
  }

  // Update regrowth timers each frame
  update(delta) {
    for (const key in this.regrowthTimers) {
      this.regrowthTimers[key] -= delta;
      if (this.regrowthTimers[key] <= 0) {
        const [col, row] = key.split(',').map(Number);
        this.setTile(col, row, TILE_TYPES.FOREST);
        delete this.regrowthTimers[key];
      }
    }
  }

  worldToGrid(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize)
    };
  }

  gridToWorld(col, row) {
    return {
      x: col * this.tileSize,
      y: row * this.tileSize
    };
  }

  render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
    const startCol = Math.floor(cameraX / this.tileSize);
    const startRow = Math.floor(cameraY / this.tileSize);
    const endCol   = Math.min(startCol + Math.ceil(canvasWidth  / this.tileSize) + 1, this.cols);
    const endRow   = Math.min(startRow + Math.ceil(canvasHeight / this.tileSize) + 1, this.rows);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile    = this.tiles[row][col];
        const screenX = col * this.tileSize - cameraX;
        const screenY = row * this.tileSize - cameraY;

        ctx.fillStyle = tile.color;
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

        // Show regrowth progress on chopped tiles
        if (tile.id === TILE_TYPES.CHOPPED_FOREST.id) {
          const key = col + ',' + row;
          if (this.regrowthTimers[key] !== undefined) {
            const pct = 1 - (this.regrowthTimers[key] / FOREST_REGROWTH_TIME);
            ctx.fillStyle = 'rgba(45, 90, 39, ' + (pct * 0.6) + ')';
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          }
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
      }
    }
  }
}
