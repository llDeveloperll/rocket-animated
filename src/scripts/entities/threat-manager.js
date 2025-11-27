import { CONFIG } from '../config/constants.js';
import { createElement } from '../utils/dom.js';
import { randomBetween } from '../utils/math.js';

export class ThreatManager {
    constructor(root, options = {}) {
        this.root = root;
        this.entities = [];
        this.idCounter = 0;
        this.timers = { meteor: 0, enemy: 0 };
        this.onEnemyFire = typeof options.onEnemyFire === 'function'
            ? options.onEnemyFire
            : null;
    }

    update(deltaSeconds, deltaMs) {
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const boundsHeight = this.root.clientHeight || window.innerHeight;

        this.timers.meteor += deltaMs;
        this.timers.enemy += deltaMs;

        if (this.timers.meteor >= CONFIG.spawns.meteor) {
            this.spawnMeteor(boundsWidth);
            this.timers.meteor = 0;
        }

        if (this.timers.enemy >= CONFIG.spawns.enemy) {
            this.spawnEnemy(boundsWidth);
            this.timers.enemy = 0;
        }

        for (let i = this.entities.length - 1; i >= 0; i -= 1) {
            const threat = this.entities[i];
            threat.y += threat.speed * deltaSeconds;
            if (threat.type === 'enemy') {
                threat.timeSinceLastShot += deltaMs;
                if (this.onEnemyFire && threat.timeSinceLastShot >= threat.fireRate) {
                    this.onEnemyFire(threat);
                    threat.timeSinceLastShot = 0;
                }
            }
            this.updateElement(threat);
            if (threat.y > boundsHeight + threat.height) {
                this.removeAt(i);
            }
        }
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

    spawnEnemy(boundsWidth) {
        const enemy = createElement('div', 'enemy game-entity');
        this.root.appendChild(enemy);
        enemy.style.setProperty('--enemy-color', this.getRandomEnemyColor());
        enemy.dataset.hitbox = 'enemy';
        const width = enemy.offsetWidth || 48;
        const height = enemy.offsetHeight || 78;
        const x = randomBetween(0, Math.max(0, boundsWidth - width));
        const entity = {
            id: `enemy-${this.idCounter += 1}`,
            type: 'enemy',
            el: enemy,
            x,
            y: -height * 1.5,
            width,
            height,
            speed: randomBetween(CONFIG.enemy.minSpeed, CONFIG.enemy.maxSpeed),
            damage: CONFIG.enemy.damage,
            reward: CONFIG.enemy.reward,
            fireRate: CONFIG.enemy.fireRateMs,
            timeSinceLastShot: randomBetween(0, CONFIG.enemy.fireRateMs),
            integrity: CONFIG.enemy.integrity || 2
        };
        this.entities.push(entity);
        this.updateElement(entity);
    }

    getRandomEnemyColor() {
        const hue = Math.floor(Math.random() * 360);
        const saturation = 55 + Math.random() * 35;
        const lightness = 60 + Math.random() * 20;
        return `hsl(${hue} ${saturation}% ${lightness}%)`;
    }

    updateElement(entity) {
        entity.el.style.left = `${entity.x}px`;
        entity.el.style.top = `${entity.y}px`;
    }

    removeAt(index) {
        const [entity] = this.entities.splice(index, 1);
        if (entity && entity.el) {
            entity.el.remove();
        }
    }

    clear() {
        this.entities.forEach(entity => entity.el.remove());
        this.entities = [];
        this.timers = { meteor: 0, enemy: 0 };
    }
}
