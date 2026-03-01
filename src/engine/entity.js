export class Entity {
  constructor(config) {
    // Identity
    this.id = config.id ?? Math.random().toString(36).substr(2, 9);
    this.type = config.type ?? 'unknown';
    this.label = config.label ?? '';

    // Ownership
    this.owner = config.owner ?? null;

    // Position (in world pixels)
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;

    // Size
    this.width  = config.width  ?? 32;
    this.height = config.height ?? 32;

    // Health
    this.maxHealth     = config.maxHealth ?? 100;
    this.currentHealth = config.currentHealth ?? this.maxHealth;
    this.alive         = true;

    // State
    this.selected = false;
    this.visible  = true;

    // Movement
    this.speed = config.speed ?? 120;  // Pixels per second
    this.path  = [];                   // Array of {col, row} waypoints
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

  // Assign a path for this entity to follow
  setPath(path, tileSize) {
    // Skip the first node (it's the tile we're already on)
    this.path = path.slice(1).map(p => ({
      x: p.col * tileSize + tileSize / 2 - this.width  / 2,
      y: p.row * tileSize + tileSize / 2 - this.height / 2
    }));
    this.moving = this.path.length > 0;
  }

  update(delta, grid) {
    if (!this.moving || this.path.length === 0) return;

    const target = this.path[0];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = this.speed * (delta / 1000);

    if (distance <= moveAmount) {
      // Snap to waypoint and move to next
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      if (this.path.length === 0) this.moving = false;
    } else {
      // Move toward waypoint
      this.x += (dx / distance) * moveAmount;
      this.y += (dy / distance) * moveAmount;
    }
  }

  render(ctx, cameraX, cameraY) {
    if (!this.visible) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // Draw body
    ctx.fillStyle = this.owner === 1 ? '#4444ff' : '#ff4444';
    ctx.fillRect(screenX, screenY, this.width, this.height);

    // Selection ring
    if (this.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 2, screenY - 2, this.width + 4, this.height + 4);
    }

    // Health bar
    const healthPct = this.currentHealth / this.maxHealth;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(screenX, screenY - 8, this.width, 4);
    ctx.fillStyle = healthPct > 0.5 ? '#00cc00' : healthPct > 0.25 ? '#cccc00' : '#cc0000';
    ctx.fillRect(screenX, screenY - 8, this.width * healthPct, 4);

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, screenX + this.width / 2, screenY + this.height + 12);
    ctx.textAlign = 'left';
  }
}
