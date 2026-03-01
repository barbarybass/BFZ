class Node {
  constructor(col, row) {
    this.col = col;
    this.row = row;
    this.g = 0;  // Cost from start to this node
    this.h = 0;  // Estimated cost from this node to end (heuristic)
    this.f = 0;  // Total cost (g + h)
    this.parent = null;
  }
}

export class Pathfinder {
  constructor(grid) {
    this.grid = grid;
  }

  // Main pathfinding function
  // Returns an array of {col, row} steps from start to end, or null if no path exists
  findPath(startCol, startRow, endCol, endRow) {
    // Can't path to an unwalkable tile
    const endTile = this.grid.getTile(endCol, endRow);
    if (!endTile || !endTile.walkable) return null;

    const openList   = [];   // Nodes to be evaluated
    const closedList = new Set(); // Already evaluated nodes

    const startNode = new Node(startCol, startRow);
    const endNode   = new Node(endCol, endRow);

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost in open list
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }
      const current = openList.splice(currentIndex, 1)[0];

      // Add to closed list
      closedList.add(`${current.col},${current.row}`);

      // We reached the destination
      if (current.col === endCol && current.row === endRow) {
        return this.reconstructPath(current);
      }

      // Check all 8 neighbors (including diagonals)
      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const key = `${neighbor.col},${neighbor.row}`;
        if (closedList.has(key)) continue;

        const tile = this.grid.getTile(neighbor.col, neighbor.row);
        if (!tile || !tile.walkable) continue;

        // Calculate costs
        const isDiagonal = neighbor.col !== current.col && neighbor.row !== current.row;
        const moveCost = isDiagonal ? 14 : 10; // Diagonal costs ~1.4x more
        const gCost = current.g + moveCost;

        const existingNode = openList.find(n => n.col === neighbor.col && n.row === neighbor.row);

        if (!existingNode) {
          neighbor.g = gCost;
          neighbor.h = this.heuristic(neighbor, endNode);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openList.push(neighbor);
        } else if (gCost < existingNode.g) {
          // Found a cheaper path to this node
          existingNode.g = gCost;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    return null; // No path found
  }

  // Heuristic: estimated distance to goal (diagonal distance)
  heuristic(nodeA, nodeB) {
    const dx = Math.abs(nodeA.col - nodeB.col);
    const dy = Math.abs(nodeA.row - nodeB.row);
    return 10 * (dx + dy) - 6 * Math.min(dx, dy);
  }

  // Get all valid neighboring nodes (8 directions)
  getNeighbors(node) {
    const neighbors = [];
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        neighbors.push(new Node(node.col + dCol, node.row + dRow));
      }
    }
    return neighbors;
  }

  // Walk back through parents to build the final path
  reconstructPath(node) {
    const path = [];
    let current = node;
    while (current !== null) {
      path.unshift({ col: current.col, row: current.row });
      current = current.parent;
    }
    return path;
  }
}
