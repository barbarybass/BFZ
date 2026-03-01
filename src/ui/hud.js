export class HUD {
  constructor(playerResources) {
    this.resources = playerResources;
  }

  render(ctx, canvasWidth) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvasWidth, 30);

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(10, 8, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Gold: ' + Math.floor(this.resources.gold), 30, 22);

    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(160, 8, 14, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Lumber: ' + Math.floor(this.resources.lumber), 180, 22);
  }
}
