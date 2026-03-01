export class CollisionGrid {
  constructor(mapWidth, mapHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(mapWidth  / cellSize);
    this.rows = Math.ceil(mapHeight / cellSize);
    this.cells = {};
  }
  clear() {
    this.cells = {};
  }
  getKey(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return col + ',' + row;
  }
  insert(entity) {
    const x1 = entity.x;
    const y1 = entity.y;
    const x2 = entity.x + entity.width;
    const y2 = entity.y + entity.height;
    const colStart = Math.floor(x1 / this.cellSize);
    const colEnd   = Math.floor(x2 / this.cellSize);
    const rowStart = Math.floor(y1 / this.cellSize);
    const rowEnd   = Math.floor(y2 / this.cellSize);
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const key = c + ',' + r;
        if (!this.cells[key]) this.cells[key] = [];
        this.cells[key].push(entity);
      }
    }
  }
  getNearby(x, y, width, height) {
    const found = new Set();
    const colStart = Math.floor(x / this.cellSize);
    const colEnd   = Math.floor((x + width)  / this.cellSize);
    const rowStart = Math.floor(y / this.cellSize);
    const rowEnd   = Math.floor((y + height) / this.cellSize);
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const key = c + ',' + r;
        if (this.cells[key]) {
          this.cells[key].forEach(e => found.add(e));
        }
      }
    }
    return Array.from(found);
  }
  isOccupied(x, y, width, height, self) {
    const nearby = this.getNearby(x, y, width, height);
    for (const other of nearby) {
      if (other === self) continue;
      if (!other.alive) continue;
      if (x < other.x + other.width  &&
          x + width  > other.x        &&
          y < other.y + other.height  &&
          y + height > other.y) {
        return true;
      }
    }
    return false;
  }
}
