export class Camera {
  constructor(canvasWidth, canvasHeight, mapWidth, mapHeight) {
    this.x = 0;  // Current camera position (top-left corner)
    this.y = 0;
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.mapWidth = mapWidth;   // Total map size in pixels
    this.mapHeight = mapHeight;
    this.scrollSpeed = 300;     // Pixels per second
    this.edgeThreshold = 20;    // Pixels from edge that triggers scrolling

    // Track which directions we're scrolling
    this.scrolling = {
      left: false,
      right: false,
      up: false,
      down: false
    };
  }

  // Call this when the mouse moves over the canvas
  onMouseMove(mouseX, mouseY) {
    this.scrolling.left  = mouseX < this.edgeThreshold;
    this.scrolling.right = mouseX > this.width - this.edgeThreshold;
    this.scrolling.up    = mouseY < this.edgeThreshold;
    this.scrolling.down  = mouseY > this.height - this.edgeThreshold;
  }

  // Call this when the mouse leaves the canvas
  onMouseLeave() {
    this.scrolling.left  = false;
    this.scrolling.right = false;
    this.scrolling.up    = false;
    this.scrolling.down  = false;
  }

  // Update camera position based on scroll state
  update(delta) {
    const distance = this.scrollSpeed * (delta / 1000);

    if (this.scrolling.left)  this.x -= distance;
    if (this.scrolling.right) this.x += distance;
    if (this.scrolling.up)    this.y -= distance;
    if (this.scrolling.down)  this.y += distance;

    // Clamp camera so it never scrolls outside the map
    this.x = Math.max(0, Math.min(this.x, this.mapWidth  - this.width));
    this.y = Math.max(0, Math.min(this.y, this.mapHeight - this.height));
  }
}
