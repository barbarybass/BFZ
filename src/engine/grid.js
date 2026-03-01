// Tile type definitions
export const TILE_TYPES = {
  GRASS:  { id: 0, label: 'Grass',  color: '#4a7c59', walkable: true  },
  DIRT:   { id: 1, label: 'Dirt',   color: '#8B6914', walkable: true  },
  WATER:  { id: 2, label: 'Water',  color: '#1a3a5c', walkable: false },
  STONE:  { id: 3, label: 'Stone',  color: '#6b6b6b', walkable: false },
  FOREST: { id: 4, label: 'Forest', color: '#2d5a27', walkable: false },
};

export class Grid {
  constructor(cols, rows, tileSize) {
    this.cols = cols;         // Number of tiles horizontally
    this.rows = rows;         // Number of tiles vertically
    this.tileSize = tileSize; // Pixel size of each tile
    this.tiles = [];          // 2D array of tile data

    this.initTiles();
  }

  // Build the initial map filled with grass
  initTiles() {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = TILE_TYPES.GRASS;
      }
    }

    // Add some water tiles to make it interesting
    for (let row = 5; row < 10; row++) {
      for (let col = 12; col < 15; col++) {
        this.tiles[row][col] = TILE_TYPES.WATER;
      }
    }

    // Add a forest patch
    for (let row = 2; row < 6; row++) {
      for (let col = 18; col < 22; col++) {
        this.tiles[row][col] = TILE_TYPES.FOREST;
      }
    }

    // Add a stone path
    for (let col = 3; col < 10; col++) {
      this.tiles[8][col] = TILE_TYPES.STONE;
    }
  }

  // Get tile at grid coordinates
  getTile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.tiles[row][col];
  }

  // Set a tile at grid coordinates
  setTile(col, row, tileType) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.tiles[row][col] = tileType;
  }

  // Convert world pixel position to grid coordinates
  worldToGrid(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize)
    };
  }

  // Convert grid coordinates to world pixel position (top-left of tile)
  gridToWorld(col, row) {
    return {
      x: col * this.tileSize,
      y: row * this.tileSize
    };
  }

  // Draw the entire grid to the canvas
  render(ctx, cameraX, cameraY, canvasWidth, canvasHeight) {
    // Only draw tiles that are visible on screen (performance optimization)
    const startCol = Math.floor(cameraX / this.tileSize);
    const startRow = Math.floor(cameraY / this.tileSize);
    const endCol = Math.min(startCol + Math.ceil(canvasWidth / this.tileSize) + 1, this.cols);
    const endRow = Math.min(startRow + Math.ceil(canvasHeight / this.tileSize) + 1, this.rows);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = this.tiles[row][col];
        const screenX = col * this.tileSize - cameraX;
        const screenY = row * this.tileSize - cameraY;

        // Draw tile background
        ctx.fillStyle = tile.color;
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

        // Draw tile border (subtle grid lines)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
      }
    }
  }
}