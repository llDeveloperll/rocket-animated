import { CONFIG } from '../config/constants.js';
import { ENEMY_ARCHETYPES, ENEMY_PHASES } from '../config/enemy-types.js';
import { createElement } from '../utils/dom.js';
import { clamp, randomBetween } from '../utils/math.js';

export class ThreatManager {
    constructor(root, options = {}) {
        this.root = root;
        this.entities = [];
        this.idCounter = 0;
        this.timers = { meteor: 0, enemy: 0 };
        this.enemyDefinitions = ENEMY_ARCHETYPES;
        this.phaseConfig = ENEMY_PHASES;
        this.onEnemyFire = typeof options.onEnemyFire === 'function'
            ? options.onEnemyFire
            : null;
        this.lastContext = {
            score: 0,
            boundsWidth: 0,
            boundsHeight: 0,
            playerPosition: null,
            phase: this.phaseConfig[0]?.id ?? 1
        };
    }

    update(deltaSeconds, deltaMs, context = {}) {
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const boundsHeight = this.root.clientHeight || window.innerHeight;

        const score = context.score ?? this.lastContext.score;
        const playerPosition = context.playerPosition || this.lastContext.playerPosition;
        const phase = this.resolvePhase(score);
        this.lastContext = {
            score,
            playerPosition,
            boundsWidth,
            boundsHeight,
            phase
        };

        this.timers.meteor += deltaMs;
        this.timers.enemy += deltaMs;

        if (this.timers.meteor >= CONFIG.spawns.meteor) {
            this.spawnMeteor(boundsWidth);
            this.timers.meteor = 0;
        }

        if (this.timers.enemy >= this.getEnemySpawnInterval()) {
            this.spawnEnemy(boundsWidth);
            this.timers.enemy = 0;
        }

        for (let i = this.entities.length - 1; i >= 0; i -= 1) {
            const threat = this.entities[i];
            if (threat.type === 'enemy') {
                this.updateEnemy(threat, deltaSeconds, deltaMs);
            } else {
                threat.y += threat.speed * deltaSeconds;
            }
            this.updateElement(threat);
            if (threat.y > boundsHeight + threat.height || threat.x + threat.width < -40 || threat.x > boundsWidth + 40) {
                this.removeAt(i);
            }
        }
    }

    getEnemySpawnInterval() {
        const sorted = this.phaseConfig.slice().sort((a, b) => a.minScore - b.minScore);
        const activePhase = sorted.reduce((acc, entry) => (this.lastContext.score >= entry.minScore ? entry : acc), sorted[0]);
        const factor = activePhase?.spawnFactor ?? 1;
        return CONFIG.spawns.enemy * factor;
    }

    resolvePhase(score = 0) {
        let phase = this.phaseConfig[0]?.id ?? 1;
        this.phaseConfig.forEach((entry) => {
            if (score >= entry.minScore) {
                phase = entry.id;
            }
        });
        return phase;
    }

    spawnMeteor(boundsWidth) {
        const meteor = createElement('div', 'meteor game-entity');
        this.root.appendChild(meteor);
        meteor.dataset.hitbox = 'meteor';
        const width = meteor.offsetWidth || 32;
        const height = meteor.offsetHeight || 72;
        const x = randomBetween(0, Math.max(0, boundsWidth - width));
        const entity = {
            id: `meteor-${this.idCounter += 1}`,
            type: 'meteor',
            el: meteor,
            x,
            y: -height,
            width,
            height,
            speed: randomBetween(CONFIG.meteor.minSpeed, CONFIG.meteor.maxSpeed),
            damage: CONFIG.meteor.damage,
            reward: CONFIG.meteor.reward,
            integrity: CONFIG.meteor.integrity || 1
        };
        this.entities.push(entity);
        this.updateElement(entity);
    }

    spawnEnemy(boundsWidth, options = {}) {
        const def = options.definition
            || (options.defId
                ? this.enemyDefinitions.find(item => item.id === options.defId)
                : this.pickEnemyDefinition(this.lastContext.score));
        if (!def) {
            return;
        }
        if (!options.ignoreGroup && typeof def.spawnGroup === 'function') {
            const overrides = def.spawnGroup(boundsWidth, this.lastContext.boundsHeight) || [];
            overrides.forEach((override) => {
                this.spawnEnemy(boundsWidth, {
                    definition: def,
                    overrides: override,
                    ignoreGroup: true
                });
            });
            return;
        }
        const entity = this.buildEnemy(def, boundsWidth, options.overrides);
        this.entities.push(entity);
        this.updateElement(entity);
    }

    buildEnemy(def, boundsWidth, overrides = {}) {
        const enemy = createElement('div', def.className || 'enemy game-entity');
        this.root.appendChild(enemy);
        enemy.dataset.hitbox = 'enemy';
        if (!enemy.style.getPropertyValue('--enemy-color')) {
            enemy.style.setProperty('--enemy-color', this.getRandomEnemyColor());
        }
        const width = enemy.offsetWidth || overrides.width || 48;
        const height = enemy.offsetHeight || overrides.height || 78;
        const x = clamp(
            overrides.x ?? randomBetween(0, Math.max(0, boundsWidth - width)),
            -width * 1.6,
            boundsWidth + width * 1.6
        );
        const y = overrides.y ?? -height * 1.4;
        const speed = randomBetween(def.speed?.min ?? CONFIG.enemy.minSpeed, def.speed?.max ?? CONFIG.enemy.maxSpeed);
        const state = typeof def.createState === 'function' ? def.createState() : {};
        const entity = {
            id: `enemy-${this.idCounter += 1}`,
            type: 'enemy',
            def,
            el: enemy,
            x,
            y,
            width,
            height,
            speed,
            vx: overrides.vx ?? 0,
            vy: overrides.vy ?? speed,
            damage: def.damage ?? CONFIG.enemy.damage,
            reward: def.reward ?? CONFIG.enemy.reward,
            integrity: def.integrity ?? (CONFIG.enemy.integrity || 2),
            state,
            fireTimer: def.fire ? randomBetween(def.fire.cooldownMin, def.fire.cooldownMax) : null
        };
        def.onSpawn?.(entity, {
            boundsWidth: this.lastContext.boundsWidth || boundsWidth,
            boundsHeight: this.lastContext.boundsHeight || (this.root.clientHeight || window.innerHeight),
            playerPosition: this.lastContext.playerPosition,
            phase: this.lastContext.phase
        });
        return entity;
    }

    getRandomEnemyColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 55 + Math.random() * 35;
        const lightness = 60 + Math.random() * 20;
        return `hsl(${hue} ${saturation}% ${lightness}%)`;
    }

    pickEnemyDefinition(score) {
        const phase = this.resolvePhase(score);
        const pool = this.enemyDefinitions.filter(def => (def.phase || 1) <= phase);
        if (!pool.length) {
            return null;
        }
        const total = pool.reduce((sum, item) => sum + (item.weight ?? 1), 0);
        let cursor = Math.random() * total;
        for (let i = 0; i < pool.length; i += 1) {
            const weight = pool[i].weight ?? 1;
            cursor -= weight;
            if (cursor <= 0) {
                return pool[i];
            }
        }
        return pool[pool.length - 1];
    }

    updateEnemy(threat, deltaSeconds, deltaMs) {
        const helpers = this.createBehaviorHelpers(threat);
        let handledMovement = false;
        if (threat.def?.behavior?.update) {
            handledMovement = Boolean(threat.def.behavior.update(threat, deltaSeconds, deltaMs, helpers));
        }
        if (!handledMovement) {
            threat.x += (threat.vx ?? 0) * deltaSeconds;
            threat.y += (threat.vy ?? threat.speed) * deltaSeconds;
        }
        this.handleAutoFire(threat, deltaMs, helpers);
    }

    handleAutoFire(threat, deltaMs, helpers) {
        if (!threat.def?.fire || threat.state?.suppressAutoFire) {
            return;
        }
        threat.fireTimer -= deltaMs;
        if (threat.fireTimer > 0) {
            return;
        }
        const pattern = this.resolveFirePattern(threat, helpers);
        if (pattern) {
            this.emitFire(threat, pattern);
        }
        threat.fireTimer = randomBetween(threat.def.fire.cooldownMin, threat.def.fire.cooldownMax);
    }

    resolveFirePattern(threat, helpers) {
        const fireConfig = threat.def?.fire;
        if (!fireConfig) {
            return null;
        }
        let pattern = null;
        if (typeof fireConfig.createPattern === 'function') {
            pattern = fireConfig.createPattern(threat, helpers) || null;
        } else if (fireConfig.pattern) {
            pattern = fireConfig.pattern;
        }
        if (!pattern) {
            return null;
        }
        if (Array.isArray(pattern.angles)) {
            return { ...pattern, angles: [...pattern.angles] };
        }
        return { ...pattern };
    }

    emitFire(threat, pattern) {
        if (!this.onEnemyFire) {
            return;
        }
        this.onEnemyFire(threat, pattern, {
            playerPosition: this.lastContext.playerPosition
        });
    }

    createBehaviorHelpers(threat) {
        return {
            playerPosition: this.lastContext.playerPosition,
            score: this.lastContext.score,
            phase: this.lastContext.phase,
            boundsWidth: this.lastContext.boundsWidth,
            boundsHeight: this.lastContext.boundsHeight,
            randomBetween,
            fire: (pattern) => {
                if (pattern) {
                    this.emitFire(threat, pattern);
                }
            },
            spawn: (defId, overrides = {}) => {
                const width = this.lastContext.boundsWidth || this.root.clientWidth || window.innerWidth;
                this.spawnEnemy(width, {
                    defId,
                    overrides,
                    ignoreGroup: true
                });
            }
        };
    }

    updateElement(entity) {
        entity.el.style.left = `${entity.x}px`;
        entity.el.style.top = `${entity.y}px`;
        if (typeof entity.rotation === 'number') {
            entity.el.style.setProperty('--enemy-rotation', `${entity.rotation}deg`);
        } else if (entity.el.style.getPropertyValue('--enemy-rotation')) {
            entity.el.style.removeProperty('--enemy-rotation');
        }
    }

    removeAt(index) {
        const [entity] = this.entities.splice(index, 1);
        if (entity?.def?.onDestroyed) {
            entity.def.onDestroyed(entity, this.createBehaviorHelpers(entity));
        }
        if (entity && entity.el) {
            entity.el.remove();
        }
    }

    clear() {
        this.entities.forEach(entity => entity.el.remove());
        this.entities = [];
        this.timers = { meteor: 0, enemy: 0 };
        this.lastContext = {
            score: 0,
            boundsWidth: 0,
            boundsHeight: 0,
            playerPosition: null,
            phase: this.phaseConfig[0]?.id ?? 1
        };
    }
}
