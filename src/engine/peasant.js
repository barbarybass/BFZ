import { Entity } from './entity.js';

export class Peasant extends Entity {
  constructor(config) {
    super({
      ...config,
      label:     'Peasant',
      type:      'unit',
      maxHealth: 60,
      speed:     100,
      width:     28,
      height:    28,
    });

    this.state           = 'idle';
    this.targetResource  = null;
    this.dropOffBuilding = config.dropOffBuilding ?? null;
    this.gatherTimer     = 0;
    this.gatherInterval  = 1500;
    this.gatherAmount    = 10;
    this.carrying        = 0;
    this.carryType       = null;
    this.carryCapacity   = 10;
    this.playerResources = config.playerResources ?? null;
    this.grid            = config.grid ?? null;
  }

  gatherFrom(resourceNode, pathfinder, grid) {
    if (!resourceNode || !resourceNode.alive) return;
    this.targetResource = resourceNode;
    this.state = 'moving_to_resource';
    this.grid  = grid;

    const unitPos = this.getGridPosition(grid.tileSize);

    // Find the nearest walkable tile adjacent to the resource node
    // by checking all tiles bordering the resource's bounding box
    const resLeft   = Math.floor(resourceNode.x / grid.tileSize);
    const resRight  = Math.floor((resourceNode.x + resourceNode.width  - 1) / grid.tileSize);
    const resTop    = Math.floor(resourceNode.y / grid.tileSize);
    const resBottom = Math.floor((resourceNode.y + resourceNode.height - 1) / grid.tileSize);

    let bestCol = null;
    let bestRow = null;
    let bestDist = Infinity;

    // Check all tiles on the border of the resource node
    for (let col = resLeft - 1; col <= resRight + 1; col++) {
      for (let row = resTop - 1; row <= resBottom + 1; row++) {
        // Only look at tiles just outside the resource boundary
        const isOutside = col < resLeft || col > resRight || row < resTop || row > resBottom;
        if (!isOutside) continue;
        const tile = grid.getTile(col, row);
        if (!tile || !tile.walkable) continue;
        const dist = Math.abs(col - unitPos.col) + Math.abs(row - unitPos.row);
        if (dist < bestDist) {
          bestDist = dist;
          bestCol  = col;
          bestRow  = row;
        }
      }
    }

    if (bestCol === null) {
      // No adjacent walkable tile found - try resource center as fallback
      const resPos = resourceNode.getGridPosition(grid.tileSize);
      bestCol = resPos.col;
      bestRow = resPos.row;
    }

    const path = pathfinder.findPath(unitPos.col, unitPos.row, bestCol, bestRow);

    if (path && path.length > 1) {
      this.setPath(path, grid.tileSize);
    } else {
      // Already adjacent - start gathering immediately
      this.state = 'gathering';
      this.gatherTimer = 0;
    }
  }

  returnToBase(pathfinder, grid) {
    if (!this.dropOffBuilding) return;
    this.state = 'returning';
    const unitPos  = this.getGridPosition(grid.tileSize);
    const basePos  = this.dropOffBuilding.getGridPosition(grid.tileSize);
    const path     = pathfinder.findPath(unitPos.col, unitPos.row, basePos.col, basePos.row);
    if (path && path.length > 1) this.setPath(path, grid.tileSize);
  }

  dropOff() {
    if (!this.playerResources || this.carrying <= 0) return;
    if (this.carryType === 'gold')   this.playerResources.addGold(this.carrying);
    if (this.carryType === 'lumber') this.playerResources.addLumber(this.carrying);
    this.carrying  = 0;
    this.carryType = null;
  }

  update(delta, grid, entities, collisionGrid, pathfinder) {
    super.update(delta, grid, entities, collisionGrid);

    if (this.state === 'moving_to_resource') {
      if (!this.moving && this.targetResource) {
        if (this.targetResource.alive) {
          this.state = 'gathering';
          this.gatherTimer = 0;
        } else {
          this.state = 'idle';
        }
      }
    }

    else if (this.state === 'gathering') {
      if (!this.targetResource || !this.targetResource.alive) {
        // Resource depleted - return what we have
        if (this.carrying > 0) this.returnToBase(pathfinder, grid);
        else this.state = 'idle';
        return;
      }

      this.gatherTimer += delta;
      if (this.gatherTimer >= this.gatherInterval) {
        this.gatherTimer = 0;
        const gathered = this.targetResource.gather(this.gatherAmount);
        if (gathered > 0) {
          this.carrying  += gathered;
          this.carryType  = this.targetResource.type.id;

          // Chop the forest tile nearest to this peasant
          if (this.carryType === 'lumber' && grid) {
            const peasantPos = this.getGridPosition(grid.tileSize);
            const resLeft    = Math.floor(this.targetResource.x / grid.tileSize);
            const resRight   = Math.floor((this.targetResource.x + this.targetResource.width  - 1) / grid.tileSize);
            const resTop     = Math.floor(this.targetResource.y / grid.tileSize);
            const resBottom  = Math.floor((this.targetResource.y + this.targetResource.height - 1) / grid.tileSize);

            let chopCol = resLeft, chopRow = resTop, bestDist = Infinity;
            for (let col = resLeft; col <= resRight; col++) {
              for (let row = resTop; row <= resBottom; row++) {
                const tile = grid.getTile(col, row);
                if (!tile || tile.id !== 4) continue; // only chop FOREST tiles
                const dist = Math.abs(col - peasantPos.col) + Math.abs(row - peasantPos.row);
                if (dist < bestDist) { bestDist = dist; chopCol = col; chopRow = row; }
              }
            }
            grid.chopForest(chopCol, chopRow);
          }
        }
        // Return to base when full
        if (this.carrying >= this.carryCapacity) {
          this.returnToBase(pathfinder, grid);
        }
      }
    }

    else if (this.state === 'returning') {
      if (!this.moving) {
        this.dropOff();
        // Go back to gather more if resource still alive
        if (this.targetResource && this.targetResource.alive) {
          this.gatherFrom(this.targetResource, pathfinder, grid);
        } else {
          this.state = 'idle';
        }
      }
    }
  }

  render(ctx, cameraX, cameraY) {
    if (!this.visible) return;
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.fillStyle = this.carrying > 0 ? '#cc9900' : '#ddaa00';
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

    // Show carry status
    if (this.carrying > 0) {
      ctx.fillStyle = this.carryType === 'gold' ? '#FFD700' : '#8B4513';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.carryType + ' ' + this.carrying, screenX + this.width / 2, screenY - 12);
    } else if (this.state === 'gathering') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const actionText = this.carryType === 'gold' || 
        (this.targetResource && this.targetResource.type.id === 'gold') ? 'Mining' : 'Chopping';
      ctx.fillText(actionText, screenX + this.width / 2, screenY - 12);
    }

    ctx.fillStyle  = '#ffffff';
    ctx.font       = '10px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(this.label, screenX + this.width / 2, screenY + this.height + 12);
    ctx.textAlign  = 'left';
  }
}
