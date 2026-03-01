export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;   // Logic update function
    this.renderFn = renderFn;   // Draw function
    this.lastTimestamp = 0;
    this.running = false;
    this.fps = 60;
    this.msPerFrame = 1000 / this.fps;
  }

  start() {
    this.running = true;
    requestAnimationFrame((ts) => this.loop(ts));
  }

  stop() {
    this.running = false;
  }

  loop(timestamp) {
    if (!this.running) return;

    const delta = timestamp - this.lastTimestamp;

    if (delta >= this.msPerFrame) {
      this.lastTimestamp = timestamp;
      this.updateFn(delta);   // Update game state
      this.renderFn();        // Draw the frame
    }

    requestAnimationFrame((ts) => this.loop(ts));
  }
}