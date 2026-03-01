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
    this.blockedTimer = 0;
    // Stuck detection
    this.lastX        = this.x;
    this.lastY        = this.y;
    this.stuckTimer   = 0;
    this.stuckTimeout = 800;  // ms before declaring stuck
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
    this.blockedTimer    = 0;
    this.stuckTimer      = 0;
    this.replanAttempts  = 0;
    this.lastX = this.x;
    this.lastY = this.y;
    // Store final destination from last waypoint in original path
    if (path.length > 0) {
      const last = path[path.length - 1];
      this.finalDestCol = last.col;
      this.finalDestRow = last.row;
    }
  }

  // Try to replan around a blocked position
  tryReplan(blockerEntities) {
    if (!this.pathfinder || !this.grid) return false;
    if (this.replanAttempts >= this.maxReplanAttempts) return false;
    if (this.finalDestCol === null) return false;

    this.replanAttempts++;

    // Temporarily mark all nearby living units (except self) as unwalkable
    const blocked = [];
    if (blockerEntities) {
      for (const other of blockerEntities) {
        if (other === this || !other.alive) continue;
        const pos = other.getGridPosition(this.grid.tileSize);
        const tile = this.grid.getTile(pos.col, pos.row);
        if (tile && tile.walkable) {
          blocked.push({ col: pos.col, row: pos.row, tile });
          this.grid.setTile(pos.col, pos.row, { ...tile, walkable: false });
        }
      }
    }

    const myPos = this.getGridPosition(this.grid.tileSize);
    const path  = this.pathfinder.findPath(
      myPos.col, myPos.row,
      this.finalDestCol, this.finalDestRow
    );

    // Restore tiles
    for (const b of blocked) this.grid.setTile(b.col, b.row, b.tile);

    if (path && path.length > 1) {
      this.setPath(path, this.grid.tileSize);
      this.replanAttempts = Math.min(this.replanAttempts, this.maxReplanAttempts);
      return true;
    }
    return false;
  }
  applySeparation(entities, grid) {
    if (!entities) return;
    // Only stationary friendly units step aside for moving friendlies
    if (this.moving) return;

    for (const other of entities) {
      if (other === this || !other.alive) continue;
      // Skip enemy units - they are handled as solid obstacles
      if (other.owner !== this.owner) continue;
      if (!other.moving) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const stepAsideRadius = this.width * 2.5;

      if (distance < stepAsideRadius && distance > 0) {
        // Get the moving unit's direction of travel
        const pathTarget = other.path && other.path.length > 0 ? other.path[0] : null;
        if (!pathTarget) continue;

        const travelDx = pathTarget.x - other.x;
        const travelDy = pathTarget.y - other.y;
        const travelDist = Math.sqrt(travelDx * travelDx + travelDy * travelDy);
        if (travelDist === 0) continue;

        // Perpendicular directions to travel vector
        const perpX =  travelDy / travelDist;
        const perpY = -travelDx / travelDist;

        // Pick the perpendicular direction that moves away from the moving unit
        const dot = dx * perpX + dy * perpY;
        const sideX = dot >= 0 ? perpX : -perpX;
        const sideY = dot >= 0 ? perpY : -perpY;

        const force = (stepAsideRadius - distance) / stepAsideRadius * 2.5;
        const newX = this.x + sideX * force;
        const newY = this.y + sideY * force;

        // Only move if new position is walkable
        if (grid) {
          const newCol = Math.floor((newX + this.width  / 2) / grid.tileSize);
          const newRow = Math.floor((newY + this.height / 2) / grid.tileSize);
          const tile = grid.getTile(newCol, newRow);
          if (!tile || !tile.walkable) continue;
        }

        this.x = newX;
        this.y = newY;
      }
    }
  }

  update(delta, grid, entities, collisionGrid) {
    this.applySeparation(entities, grid);

    // Stuck detection: if moving but not progressing, replan around obstacle
    if (this.moving) {
      const movedDist = Math.sqrt(
        Math.pow(this.x - this.lastX, 2) +
        Math.pow(this.y - this.lastY, 2)
      );
      if (movedDist < 0.5) {
        this.stuckTimer += delta;
        if (this.stuckTimer > this.stuckTimeout) {
          this.stuckTimer = 0;
          // Attempt to replan around whatever is blocking us
          const replanned = this.tryReplan(entities);
          if (!replanned) {
            // Replanning failed or exhausted - nudge diagonally to break deadlock
            let escapeX = 0, escapeY = 0;
            if (entities) {
              for (const other of entities) {
                if (other === this || !other.alive) continue;
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < this.width * 2 && dist > 0) {
                  escapeX += dx / dist;
                  escapeY += dy / dist;
                }
              }
            }
            if (escapeX === 0 && escapeY === 0) {
              const dir = this.getTravelDirection();
              if (dir) { escapeX = dir.x + dir.y; escapeY = dir.y - dir.x; }
              else      { escapeX = 1; escapeY = 1; }
            }
            const escapeDist = Math.sqrt(escapeX * escapeX + escapeY * escapeY);
            if (escapeDist > 0) {
              const nudge = this.width;
              const newX = this.x + (escapeX / escapeDist) * nudge;
              const newY = this.y + (escapeY / escapeDist) * nudge;
              if (grid) {
                const tile = grid.getTile(
                  Math.floor((newX + this.width  / 2) / grid.tileSize),
                  Math.floor((newY + this.height / 2) / grid.tileSize)
                );
                if (tile && tile.walkable) { this.x = newX; this.y = newY; }
              } else { this.x = newX; this.y = newY; }
            }
          }
        }
      } else {
        this.stuckTimer = 0;
      }
      this.lastX = this.x;
      this.lastY = this.y;
    }

    if (!this.path || this.path.length === 0) { this.moving = false; return; }
    const target = this.path[0];
    if (!target) { this.moving = false; this.path = []; return; }
    const dx         = target.x - this.x;
    const dy         = target.y - this.y;
    const distance   = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = this.speed * (delta / 1000);
    if (distance <= moveAmount) {
      if (collisionGrid && collisionGrid.isOccupied(target.x, target.y, this.width, this.height, this)) {
        this.blockedTimer += delta;
        if (this.blockedTimer > 300) {
          this.path.shift();
          this.blockedTimer = 0;
        }
        return;
      }
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      this.blockedTimer = 0;
      if (this.path.length === 0) this.moving = false;
    } else {
      const newX = this.x + (dx / distance) * moveAmount;
      const newY = this.y + (dy / distance) * moveAmount;
      if (grid) {
        const newCol = Math.floor((newX + this.width  / 2) / grid.tileSize);
        const newRow = Math.floor((newY + this.height / 2) / grid.tileSize);
        const tile = grid.getTile(newCol, newRow);
        if (!tile || !tile.walkable) return;
      }
      if (collisionGrid) {
        // Use a smaller hitbox for friendly unit collision so they can squeeze past
        const hitW = this.width  * 0.6;
        const hitH = this.height * 0.6;
        const hitOffX = (this.width  - hitW) / 2;
        const hitOffY = (this.height - hitH) / 2;

        const blockedFull = collisionGrid.isOccupied(newX + hitOffX, newY + hitOffY, hitW, hitH, this);
        if (!blockedFull) {
          this.x = newX;
          this.y = newY;
          this.blockedTimer = 0;
        } else {
          const blockedX = collisionGrid.isOccupied(newX + hitOffX, this.y + hitOffY, hitW, hitH, this);
          const blockedY = collisionGrid.isOccupied(this.x + hitOffX, newY + hitOffY, hitW, hitH, this);
          if (!blockedX) {
            this.x = newX;
            this.blockedTimer = 0;
          } else if (!blockedY) {
            this.y = newY;
            this.blockedTimer = 0;
          } else {
            this.blockedTimer += delta;
            if (this.blockedTimer > 400) {
              this.path.shift();
              this.blockedTimer = 0;
            }
          }
        }
      } else {
        this.x = newX;
        this.y = newY;
      }
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
