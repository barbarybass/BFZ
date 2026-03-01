export class SelectionBox {
  constructor() {
    this.active    = false;
    this.startX    = 0;
    this.startY    = 0;
    this.currentX  = 0;
    this.currentY  = 0;
  }

  start(x, y) {
    this.active   = true;
    this.startX   = x;
    this.startY   = y;
    this.currentX = x;
    this.currentY = y;
  }

  update(x, y) {
    this.currentX = x;
    this.currentY = y;
  }

  end() {
    this.active = false;
  }

  // Get the normalized rectangle (always top-left to bottom-right)
  getRect() {
    return {
      x:      Math.min(this.startX, this.currentX),
      y:      Math.min(this.startY, this.currentY),
      width:  Math.abs(this.currentX - this.startX),
      height: Math.abs(this.currentY - this.startY),
    };
  }

  // Returns true if this box is large enough to be a drag selection
  // (vs just a click)
  isDrag() {
    return this.getRect().width > 5 || this.getRect().height > 5;
  }

  // Check if an entity falls inside the selection box
  // Coordinates should be in screen space
  containsEntity(entity, cameraX, cameraY) {
    const rect = this.getRect();
    const ex = entity.x - cameraX;
    const ey = entity.y - cameraY;
    return (
      ex + entity.width  > rect.x &&
      ex                 < rect.x + rect.width &&
      ey + entity.height > rect.y &&
      ey                 < rect.y + rect.height
    );
  }

  render(ctx) {
    if (!this.active || !this.isDrag()) return;
    const rect = this.getRect();

    // Filled semi-transparent box
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // Green border
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}
