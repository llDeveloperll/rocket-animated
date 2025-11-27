import { CONFIG } from '../config/constants.js';
import { createElement } from '../utils/dom.js';
import { degToRad } from '../utils/math.js';

export class EnemyProjectileManager {
    constructor(root) {
        this.root = root;
        this.items = [];
        this.idCounter = 0;
    }

    spawnBurst(threat) {
        const origin = {
            x: threat.x + threat.width / 2,
            y: threat.y + threat.height - 6
        };
        CONFIG.enemy.projectileAngles.forEach((angle) => {
            const laser = createElement('span', 'enemy-laser game-entity');
            this.root.appendChild(laser);
            laser.style.transform = `rotate(${angle - 90}deg)`;
            laser.dataset.hitbox = 'enemy-projectile';
            const width = laser.offsetWidth || 4;
            const height = laser.offsetHeight || 12;
            const rad = degToRad(angle);
            const projectile = {
                id: `enemy-laser-${this.idCounter += 1}`,
                el: laser,
                x: origin.x - width / 2,
                y: origin.y - height,
                width,
                height,
                vx: Math.cos(rad) * CONFIG.enemy.laserSpeed,
                vy: Math.sin(rad) * CONFIG.enemy.laserSpeed
            };
            this.items.push(projectile);
            this.updateElement(projectile);
        });
    }

    update(deltaSeconds) {
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const boundsHeight = this.root.clientHeight || window.innerHeight;
        for (let i = this.items.length - 1; i >= 0; i -= 1) {
            const projectile = this.items[i];
            projectile.x += projectile.vx * deltaSeconds;
            projectile.y += projectile.vy * deltaSeconds;
            if (
                projectile.x + projectile.width < -20 ||
                projectile.x > boundsWidth + 20 ||
                projectile.y < -40 ||
                projectile.y > boundsHeight + 20
            ) {
                this.removeAt(i);
                continue;
            }
            this.updateElement(projectile);
        }
    }

    updateElement(projectile) {
        projectile.el.style.left = `${projectile.x}px`;
        projectile.el.style.top = `${projectile.y}px`;
    }

    removeAt(index) {
        const [projectile] = this.items.splice(index, 1);
        if (projectile && projectile.el) {
            projectile.el.remove();
        }
    }

    clear() {
        this.items.forEach(projectile => projectile.el.remove());
        this.items = [];
    }
}
