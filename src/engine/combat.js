export class CombatSystem {
  static AGGRO_RADIUS     = 3 * 32;  // 3 tiles
  static CHASE_GIVE_UP    = 8 * 32;  // give up chase after 8 tiles

  // Score an enemy for targeting: higher = more threatening
  // Prioritizes stronger enemies (higher maxHealth), then nearest
  static threatScore(attacker, enemy) {
    const dist = CombatSystem.distanceBetween(attacker, enemy);
    const strengthScore = enemy.maxHealth;          // stronger = higher priority
    const distancePenalty = dist / 32;              // farther = lower priority
    return strengthScore - distancePenalty * 5;
  }

  // Find the best target for a unit among all enemies
  static findBestTarget(unit, entities) {
    const enemies = entities.filter(e =>
      e.alive && e.owner !== unit.owner
    );
    if (enemies.length === 0) return null;

    // Sort by threat score descending
    enemies.sort((a, b) =>
      CombatSystem.threatScore(unit, b) - CombatSystem.threatScore(unit, a)
    );

    // Try the highest-threat enemy first
    // If it's reachable (within chase give-up range), use it
    for (const enemy of enemies) {
      const dist = CombatSystem.distanceBetween(unit, enemy);
      if (dist <= CombatSystem.CHASE_GIVE_UP) return enemy;
    }

    // Fallback: just pick nearest
    enemies.sort((a, b) =>
      CombatSystem.distanceBetween(unit, a) - CombatSystem.distanceBetween(unit, b)
    );
    return enemies[0] || null;
  }

  // Process all combat for entities each frame
  static update(delta, entities) {
    for (const entity of entities) {
      if (!entity.alive) continue;

      // Auto-aggro: idle units check for nearby enemies
      if (entity.combatState === 'idle') {
        CombatSystem.checkAggro(entity, entities);
      }

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

  // Check if any enemies are within aggro radius and engage the best one
  static checkAggro(unit, entities) {
    const enemies = entities.filter(e => e.alive && e.owner !== unit.owner);
    const nearby  = enemies.filter(e =>
      CombatSystem.distanceBetween(unit, e) <= CombatSystem.AGGRO_RADIUS
    );
    if (nearby.length === 0) return;

    const target = CombatSystem.findBestTarget(unit, nearby.length > 0 ? nearby : enemies);
    if (!target) return;

    unit.targetId    = target.id;
    unit.combatState = 'chasing';
  }

  static processAttack(delta, attacker, entities) {
    let target = entities.find(e => e.id === attacker.targetId);
    if (!target || !target.alive) {
      // Current target dead - find next best
      const next = CombatSystem.findBestTarget(attacker, entities);
      if (next) {
        attacker.targetId    = next.id;
        attacker.combatState = 'chasing';
      } else {
        attacker.combatState = 'idle';
        attacker.targetId    = null;
      }
      return;
    }

    const dist = CombatSystem.distanceBetween(attacker, target);

    // Re-evaluate: if a stronger enemy is nearby, switch to it
    attacker.retargetTimer = (attacker.retargetTimer || 0) + delta;
    if (attacker.retargetTimer > 2000) {
      attacker.retargetTimer = 0;
      const best = CombatSystem.findBestTarget(attacker, entities);
      if (best && best.id !== attacker.targetId) {
        const bestDist = CombatSystem.distanceBetween(attacker, best);
        const currentThreat = CombatSystem.threatScore(attacker, target);
        const bestThreat    = CombatSystem.threatScore(attacker, best);
        // Only switch if best is significantly more threatening and reachable
        if (bestThreat > currentThreat + 20 && bestDist <= CombatSystem.CHASE_GIVE_UP) {
          attacker.targetId    = best.id;
          attacker.combatState = 'chasing';
          return;
        }
      }
    }

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
      target.takeDamage(damage, attacker);

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
      // Target gone - find next best
      const next = CombatSystem.findBestTarget(attacker, entities);
      if (next) {
        attacker.targetId = next.id;
      } else {
        attacker.combatState = 'idle';
        attacker.targetId    = null;
        attacker.moving      = false;
      }
      return;
    }

    const dist = CombatSystem.distanceBetween(attacker, target);

    // Give up on preferred target if too far - fall back to nearest
    if (dist > CombatSystem.CHASE_GIVE_UP) {
      const nearest = entities
        .filter(e => e.alive && e.owner !== attacker.owner)
        .sort((a, b) =>
          CombatSystem.distanceBetween(attacker, a) -
          CombatSystem.distanceBetween(attacker, b)
        )[0];
      if (nearest && nearest.id !== attacker.targetId) {
        attacker.targetId = nearest.id;
      } else if (!nearest) {
        attacker.combatState = 'idle';
        attacker.targetId    = null;
        attacker.moving      = false;
      }
      return;
    }

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
