import { CONFIG } from '../config/constants.js';
import { POWER_UP_CATALOG } from './catalog.js';
import { createElement, intersects } from '../utils/dom.js';
import { randomBetween } from '../utils/math.js';

export class PowerUpManager {
    constructor(game, options = {}) {
        this.game = game;
        this.root = game.dom.area;
        this.pickups = [];
        this.activeEffects = new Map();
        this.nextSpawnScore = CONFIG.powerUps.minScore;
        this.callbacks = {
            onActivate: options.onActivate || (() => {}),
            onExpire: options.onExpire || (() => {})
        };
    }

    update(deltaSeconds, timestamp) {
        const boundsHeight = this.root.clientHeight || window.innerHeight;
        const speed = CONFIG.powerUps.pickupSpeed;
        for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = this.pickups[i];
            pickup.y += speed * deltaSeconds;
            this.updateElement(pickup);
            if (pickup.y > boundsHeight + pickup.height) {
                this.removeAt(i);
            }
        }
        this.updateEffects(timestamp);
    }

    handleScore(score) {
        while (score >= this.nextSpawnScore) {
            this.spawnRandomPickup();
            const gap = randomBetween(CONFIG.powerUps.scoreGapMin, CONFIG.powerUps.scoreGapMax);
            this.nextSpawnScore += Math.round(gap);
        }
    }

    spawnRandomPickup() {
        if (this.pickups.length >= CONFIG.powerUps.maxPickups) {
            return;
        }
        const def = POWER_UP_CATALOG[Math.floor(Math.random() * POWER_UP_CATALOG.length)];
        this.spawnPickup(def);
    }

    spawnPickup(def) {
        const pickup = createElement('div', 'power-up game-entity');
        pickup.dataset.hitbox = 'power-up';
        pickup.dataset.powerUp = def.id;
        pickup.textContent = def.icon;
        pickup.title = def.label;
        this.root.appendChild(pickup);
        const width = pickup.offsetWidth || 28;
        const height = pickup.offsetHeight || 28;
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const x = randomBetween(0, Math.max(0, boundsWidth - width));
        const stamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const item = {
            id: `${def.id}-${stamp}`,
            definition: def,
            el: pickup,
            x,
            y: -height,
            width,
            height
        };
        this.pickups.push(item);
        this.updateElement(item);
    }

    collect(playerBox, timestamp) {
        const collected = [];
        for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = this.pickups[i];
            if (intersects(pickup, playerBox)) {
                collected.push(pickup.definition);
                this.removeAt(i);
            }
        }
        collected.forEach(def => this.activate(def, timestamp));
        return collected;
    }

    activate(def, timestamp) {
        const duration = this.resolveDuration(def);
        const expiresAt = duration ? timestamp + duration : null;
        const applied = this.callbacks.onActivate(def, { duration, expiresAt });
        if (!applied) {
            return;
        }
        if (duration) {
            this.activeEffects.set(def.id, { def, expiresAt });
        }
    }

    resolveDuration(def) {
        if (def.immediate) {
            return 0;
        }
        if (!def.durationKey) {
            return 0;
        }
        return CONFIG.powerUps.durations[def.durationKey] || 0;
    }

    updateEffects(timestamp) {
        const expired = [];
        this.activeEffects.forEach((effect, id) => {
            if (timestamp >= effect.expiresAt) {
                expired.push(id);
            }
        });
        expired.forEach((id) => {
            const effect = this.activeEffects.get(id);
            if (!effect) {
                return;
            }
            this.callbacks.onExpire(effect.def);
            this.activeEffects.delete(id);
        });
    }

    removeAt(index) {
        const [pickup] = this.pickups.splice(index, 1);
        pickup?.el?.remove?.();
    }

    updateElement(pickup) {
        pickup.el.style.left = `${pickup.x}px`;
        pickup.el.style.top = `${pickup.y}px`;
    }

    clear() {
        this.pickups.forEach(pickup => pickup.el.remove());
        this.pickups = [];
        this.activeEffects.forEach(effect => this.callbacks.onExpire(effect.def));
        this.activeEffects.clear();
        this.nextSpawnScore = CONFIG.powerUps.minScore;
    }
}
