export class Building {
  constructor(config) {
    this.id        = config.id ?? Math.random().toString(36).substr(2, 9);
    this.label     = config.label ?? 'Building';
    this.owner     = config.owner ?? 1;
    this.x         = config.x ?? 0;
    this.y         = config.y ?? 0;
    this.width     = config.width  ?? 64;
    this.height    = config.height ?? 64;
    this.maxHealth = config.maxHealth ?? 500;
    this.currentHealth = this.maxHealth;
    this.alive     = true;
    this.selected  = false;
    this.color     = config.color ?? '#888888';
    this.isDropOff = config.isDropOff ?? false;
  }

  getCenter() {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
  }

  getGridPosition(tileSize) {
    return {
      col: Math.floor((this.x + this.width  / 2) / tileSize),
      row: Math.floor((this.y + this.height / 2) / tileSize)
    };
  }

  render(ctx, cameraX, cameraY) {
    if (!this.alive) return;
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;

    // Building body
    ctx.fillStyle = this.color;
    ctx.fillRect(sx, sy, this.width, this.height);

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, this.width, this.height);

    // Selection ring
    if (this.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth   = 2;
      ctx.strokeRect(sx - 2, sy - 2, this.width + 4, this.height + 4);
    }

    // Health bar
    const pct = this.currentHealth / this.maxHealth;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(sx, sy - 8, this.width, 4);
    ctx.fillStyle = pct > 0.5 ? '#00cc00' : pct > 0.25 ? '#cccc00' : '#cc0000';
    ctx.fillRect(sx, sy - 8, this.width * pct, 4);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, sx + this.width / 2, sy + this.height / 2 + 4);
    ctx.textAlign = 'left';
  }
}
