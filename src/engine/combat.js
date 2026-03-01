export class CombatSystem {
  // Process all combat for entities each frame
  static update(delta, entities) {
    for (const entity of entities) {
      if (!entity.alive) continue;
      if (entity.combatState === 'attacking') {
        CombatSystem.processAttack(delta, entity, entities);
      } else if (entity.combatState === 'chasing') {
        CombatSystem.processChase(delta, entity, entities);
      }
    }
    // Remove dead entities
    for (let i = entities.length - 1; i >= 0; i--) {
      if (!entities[i].alive) entities.splice(i, 1);
    }
  }

  static processAttack(delta, attacker, entities) {
    const target = entities.find(e => e.id === attacker.targetId);
    if (!target || !target.alive) {
      attacker.combatState = 'idle';
      attacker.targetId    = null;
      return;
    }

    const dist = CombatSystem.distanceBetween(attacker, target);

    // If target moved out of range, chase it
    if (dist > attacker.attackRange) {
      attacker.combatState = 'chasing';
      return;
    }

    // Attack cooldown
    attacker.attackTimer = (attacker.attackTimer || 0) + delta;
    if (attacker.attackTimer >= attacker.attackSpeed) {
      attacker.attackTimer = 0;
      const damage = attacker.attackDamage +
        Math.floor(Math.random() * attacker.attackVariance);
      target.takeDamage(damage);

      // Spawn hit effect
      attacker.hitEffect = { x: target.x, y: target.y, timer: 200 };

      // If target dies, stop attacking
      if (!target.alive) {
        attacker.combatState = 'idle';
        attacker.targetId    = null;
      }
    }
  }

  static processChase(delta, attacker, entities) {
    const target = entities.find(e => e.id === attacker.targetId);
    if (!target || !target.alive) {
      attacker.combatState = 'idle';
      attacker.targetId    = null;
      attacker.moving      = false;
      return;
    }

    const dist = CombatSystem.distanceBetween(attacker, target);

    // Close enough to attack
    if (dist <= attacker.attackRange) {
      attacker.combatState = 'attacking';
      attacker.moving      = false;
      attacker.path        = [];
      return;
    }

    // Repath toward target periodically
    attacker.chaseTimer = (attacker.chaseTimer || 0) + delta;
    if (attacker.chaseTimer >= 500 || !attacker.moving) {
      attacker.chaseTimer = 0;
      if (attacker.pathfinder && attacker.grid) {
        const myPos  = attacker.getGridPosition(attacker.grid.tileSize);
        const tgtPos = target.getGridPosition(attacker.grid.tileSize);
        const path   = attacker.pathfinder.findPath(
          myPos.col, myPos.row, tgtPos.col, tgtPos.row
        );
        if (path && path.length > 1) {
          attacker.setPath(path, attacker.grid.tileSize);
        }
      }
    }
  }

  static distanceBetween(a, b) {
    const ax = a.x + a.width  / 2;
    const ay = a.y + a.height / 2;
    const bx = b.x + b.width  / 2;
    const by = b.y + b.height / 2;
    return Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2));
  }
}
