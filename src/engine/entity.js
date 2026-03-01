export class Entity {
  constructor(config) {
    this.id    = config.id ?? Math.random().toString(36).substr(2, 9);
    this.type  = config.type  ?? 'unknown';
    this.label = config.label ?? '';
    this.owner = config.owner ?? null;
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.width  = config.width  ?? 32;
    this.height = config.height ?? 32;
    this.maxHealth     = config.maxHealth     ?? 100;
    this.currentHealth = config.currentHealth ?? this.maxHealth;
    this.alive    = true;
    this.selected = false;
    this.visible  = true;
    this.speed  = config.speed ?? 120;
    this.path   = [];
    this.moving = false;
  }
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth === 0) this.alive = false;
  }
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
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
  setPath(path, tileSize) {
    this.path = path.slice(1).map(p => ({
      x: p.col * tileSize + tileSize / 2 - this.width  / 2,
      y: p.row * tileSize + tileSize / 2 - this.height / 2
    }));
    this.moving = this.path.length > 0;
  }
  applySeparation(entities, grid) {
    if (!entities) return;
    const separationRadius = this.width * 1.1;
    const separationForce  = 1.5;
    for (const other of entities) {
      if (other === this || !other.alive) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < separationRadius && distance > 0) {
        const force = (separationRadius - distance) / separationRadius * separationForce;
        let newX = this.x + (dx / distance) * force;
        let newY = this.y + (dy / distance) * force;
        if (grid) {
          const newCol = Math.floor((newX + this.width  / 2) / grid.tileSize);
          const newRow = Math.floor((newY + this.height / 2) / grid.tileSize);
          const tile = grid.getTile(newCol, newRow);
          if (!tile || !tile.walkable) {
            const xCol = Math.floor((newX + this.width  / 2) / grid.tileSize);
            const xRow = Math.floor((this.y + this.height / 2) / grid.tileSize);
            const xTile = grid.getTile(xCol, xRow);
            if (xTile && xTile.walkable) {
              newY = this.y;
            } else {
              const yCol = Math.floor((this.x + this.width  / 2) / grid.tileSize);
              const yRow = Math.floor((newY + this.height / 2) / grid.tileSize);
              const yTile = grid.getTile(yCol, yRow);
              if (yTile && yTile.walkable) {
                newX = this.x;
              } else {
                continue;
              }
            }
          }
        }
        this.x = newX;
        this.y = newY;
      }
    }
  }
  update(delta, grid, entities) {
    this.applySeparation(entities, grid);
    if (!this.path || this.path.length === 0) { this.moving = false; return; }
    const target = this.path[0];
    if (!target) { this.moving = false; this.path = []; return; }
    const dx         = target.x - this.x;
    const dy         = target.y - this.y;
    const distance   = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = this.speed * (delta / 1000);
    if (distance <= moveAmount) {
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      if (this.path.length === 0) this.moving = false;
    } else {
      this.x += (dx / distance) * moveAmount;
      this.y += (dy / distance) * moveAmount;
    }
    if (grid) {
      const mapW = grid.cols * grid.tileSize;
      const mapH = grid.rows * grid.tileSize;
      this.x = Math.max(0, Math.min(this.x, mapW - this.width));
      this.y = Math.max(0, Math.min(this.y, mapH - this.height));
    }
  }
  render(ctx, cameraX, cameraY) {
    if (!this.visible) return;
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;
    ctx.fillStyle = this.owner === 1 ? '#4444ff' : '#ff4444';
    ctx.fillRect(screenX, screenY, this.width, this.height);
    if (this.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth   = 2;
      ctx.strokeRect(screenX - 2, screenY - 2, this.width + 4, this.height + 4);
    }
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(screenX, screenY - 8, this.width, 4);
    const healthPct = this.currentHealth / this.maxHealth;
    ctx.fillStyle = healthPct > 0.5 ? '#00cc00' : healthPct > 0.25 ? '#cccc00' : '#cc0000';
    ctx.fillRect(screenX, screenY - 8, this.width * healthPct, 4);
    ctx.fillStyle  = '#ffffff';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(this.label, screenX + this.width / 2, screenY + this.height + 12);
    ctx.textAlign  = 'left';
  }
}
