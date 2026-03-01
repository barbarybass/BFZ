export class Entity {
  constructor(config) {
    // Identity
    this.id = config.id ?? Math.random().toString(36).substr(2, 9);
    this.type = config.type ?? 'unknown';      // e.g. 'unit', 'building', 'resource'
    this.label = config.label ?? '';           // e.g. 'Footman', 'Barracks'

    // Ownership
    this.owner = config.owner ?? null;         // Which player owns this (null = neutral)

    // Position (in world pixels)
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;

    // Size (in world pixels)
    this.width  = config.width  ?? 32;
    this.height = config.height ?? 32;

    // Health
    this.maxHealth     = config.maxHealth ?? 100;
    this.currentHealth = config.currentHealth ?? this.maxHealth;
    this.alive         = true;

    // State
    this.selected = false;   // Is this entity currently selected by the player?
    this.visible  = true;    // Is this entity visible (fog of war later)
  }

  // Take damage and check for death
  takeDamage(amount) {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth === 0) {
      this.alive = false;
    }
  }

  // Heal up to max health
  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  // Get center position (useful for targeting and drawing)
  getCenter() {
    return {
      x: this.x + this.width  / 2,
      y: this.y + this.height / 2
    };
  }

  // Get which grid tile this entity occupies (top-left corner)
  getGridPosition(tileSize) {
    return {
      col: Math.floor(this.x / tileSize),
      row: Math.floor(this.y / tileSize)
    };
  }

  // Draw the entity as a colored rectangle (placeholder until we have sprites)
  render(ctx, cameraX, cameraY) {
    if (!this.visible) return;

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    // Draw body
    ctx.fillStyle = this.owner === 1 ? '#4444ff' : '#ff4444';
    ctx.fillRect(screenX, screenY, this.width, this.height);

    // Draw selection ring if selected
    if (this.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 2, screenY - 2, this.width + 4, this.height + 4);
    }

    // Draw health bar
    const barWidth  = this.width;
    const barHeight = 4;
    const barY      = screenY - 8;
    const healthPct = this.currentHealth / this.maxHealth;

    // Background (red)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(screenX, barY, barWidth, barHeight);

    // Foreground (green = healthy, yellow = hurt, red = critical)
    ctx.fillStyle = healthPct > 0.5 ? '#00cc00' : healthPct > 0.25 ? '#cccc00' : '#cc0000';
    ctx.fillRect(screenX, barY, barWidth * healthPct, barHeight);

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, screenX + this.width / 2, screenY + this.height + 12);
    ctx.textAlign = 'left'; // Reset alignment
  }

  // Basic update hook (will be overridden by subclasses)
  update(delta, grid) {
    // Base entities don't do anything on their own
  }
}
