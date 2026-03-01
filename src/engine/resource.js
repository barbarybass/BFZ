export const RESOURCE_TYPES = {
  GOLD:   { id: 'gold',   label: 'Gold Mine', color: '#FFD700', amount: 1000 },
  LUMBER: { id: 'lumber', label: 'Forest',    color: '#2d5a27', amount: 500  },
};

export class ResourceNode {
  constructor(config) {
    this.type      = config.type;
    this.x         = config.x ?? 0;
    this.y         = config.y ?? 0;
    this.width     = config.width  ?? 32;
    this.height    = config.height ?? 32;
    this.amount    = config.amount ?? this.type.amount;
    this.maxAmount = this.amount;
    this.label     = this.type.label;
    this.alive     = true;
    this.workers   = 0;
  }

  gather(amount) {
    if (this.amount <= 0) { this.alive = false; return 0; }
    const gathered = Math.min(amount, this.amount);
    this.amount -= gathered;
    if (this.amount <= 0) { this.amount = 0; this.alive = false; }
    return gathered;
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
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.fillStyle = this.type.color;
    ctx.fillRect(screenX, screenY, this.width, this.height);

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, this.width, this.height);

    const pct = this.amount / this.maxAmount;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(screenX, screenY + this.height - 5, this.width, 5);
    ctx.fillStyle = this.type.color;
    ctx.fillRect(screenX, screenY + this.height - 5, this.width * pct, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, screenX + this.width / 2, screenY + this.height + 12);
    ctx.fillText(Math.floor(this.amount), screenX + this.width / 2, screenY + this.height + 24);
    ctx.textAlign = 'left';
  }
}

export class PlayerResources {
  constructor() {
    this.gold   = 200;
    this.lumber = 100;
  }
  addGold(amount)      { this.gold   += amount; }
  addLumber(amount)    { this.lumber += amount; }
  spendGold(amount)    { if (this.gold   < amount) return false; this.gold   -= amount; return true; }
  spendLumber(amount)  { if (this.lumber < amount) return false; this.lumber -= amount; return true; }
  canAfford(g, l)      { return this.gold >= g && this.lumber >= l; }
}
