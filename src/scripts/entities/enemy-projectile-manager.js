import { CONFIG } from '../config/constants.js';
import { createElement } from '../utils/dom.js';
import { degToRad } from '../utils/math.js';

export class EnemyProjectileManager {
    constructor(root) {
        this.root = root;
        this.items = [];
        this.idCounter = 0;
    }

    firePattern(threat, pattern = {}, meta = {}) {
        if (!threat || !pattern) {
            return;
        }
        const origin = this.resolveOrigin(threat, pattern);
        const type = pattern.type || 'spread';
        switch (type) {
        case 'aimed':
            this.spawnAimed(origin, pattern, meta);
            break;
        case 'radial':
            this.spawnRadial(origin, pattern);
            break;
        case 'beam':
            this.spawnBeam(origin, pattern);
            break;
        case 'spread':
        default:
            this.spawnSpread(origin, pattern);
        }
    }

    update(deltaSeconds) {
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const boundsHeight = this.root.clientHeight || window.innerHeight;
        for (let i = this.items.length - 1; i >= 0; i -= 1) {
            const projectile = this.items[i];
            if (projectile.behavior) {
                projectile.behavior(projectile, deltaSeconds);
            }
            projectile.x += projectile.vx * deltaSeconds;
            projectile.y += projectile.vy * deltaSeconds;
            if (typeof projectile.ttl === 'number') {
                projectile.ttl -= deltaSeconds;
                if (projectile.ttl <= 0) {
                    this.removeAt(i);
                    continue;
                }
            }
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

    resolveOrigin(threat, pattern) {
        if (pattern.origin) {
            return { ...pattern.origin };
        }
        const base = {
            x: threat.x + threat.width / 2,
            y: threat.y + (pattern.offsetY ?? threat.height - 6)
        };
        if (pattern.originOffset) {
            base.x += pattern.originOffset.x || 0;
            base.y += pattern.originOffset.y || 0;
        }
        return base;
    }

    spawnSpread(origin, pattern) {
        const angles = this.resolveAngles(pattern);
        angles.forEach((angle) => {
            this.spawnProjectile(origin, {
                angle,
                speed: pattern.speed ?? CONFIG.enemy.laserSpeed,
                damage: pattern.damage ?? CONFIG.enemy.projectileDamage,
                className: pattern.className
            });
        });
    }

    spawnAimed(origin, pattern, meta) {
        const target = pattern.target || meta.playerPosition;
        if (!target) {
            return;
        }
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const count = pattern.count || 1;
        const spread = pattern.spread ?? 0;
        const start = baseAngle - (spread * (count - 1)) / 2;
        for (let i = 0; i < count; i += 1) {
            const angle = start + spread * i;
            this.spawnProjectile(origin, {
                angle,
                speed: pattern.speed ?? (CONFIG.enemy.laserSpeed + 60),
                damage: pattern.damage ?? (CONFIG.enemy.projectileDamage + 20),
                className: pattern.className,
                persistent: pattern.persistent,
                ttl: pattern.durationMs ? pattern.durationMs / 1000 : undefined
            });
        }
    }

    spawnRadial(origin, pattern) {
        const count = pattern.count || 6;
        const step = 360 / count;
        for (let i = 0; i < count; i += 1) {
            const angle = (pattern.startAngle || 0) + step * i;
            this.spawnProjectile(origin, {
                angle,
                speed: pattern.speed ?? CONFIG.enemy.laserSpeed,
                damage: pattern.damage ?? CONFIG.enemy.projectileDamage,
                className: pattern.className
            });
        }
    }

    spawnBeam(origin, pattern) {
        const beam = createElement('div', pattern.className || 'enemy-beam game-entity');
        beam.dataset.hitbox = 'enemy-projectile';
        this.root.appendChild(beam);
        const width = pattern.beamWidth || 12;
        const height = pattern.length || Math.max(0, (this.root.clientHeight || window.innerHeight) - origin.y);
        beam.style.left = `${origin.x - width / 2}px`;
        beam.style.top = `${origin.y}px`;
        beam.style.width = `${width}px`;
        beam.style.height = `${height}px`;
        const projectile = {
            id: `enemy-beam-${this.idCounter += 1}`,
            el: beam,
            x: origin.x - width / 2,
            y: origin.y,
            width,
            height,
            vx: 0,
            vy: 0,
            damagePerSecond: pattern.damagePerSecond ?? 200,
            persistent: true,
            ttl: (pattern.durationMs || 1200) / 1000
        };
        this.items.push(projectile);
    }

    resolveAngles(pattern) {
        if (Array.isArray(pattern.angles) && pattern.angles.length) {
            return pattern.angles;
        }
        const count = pattern.count || 1;
        const spread = pattern.spread || 0;
        const base = pattern.angle ?? 90;
        if (count === 1) {
            return [base];
        }
        const start = base - spread / 2;
        const step = spread / (count - 1);
        return Array.from({ length: count }, (_, index) => start + step * index);
    }

    spawnProjectile(origin, options = {}) {
        const angle = options.angle ?? 90;
        const speed = options.speed ?? CONFIG.enemy.laserSpeed;
        const rad = degToRad(angle);
        const laser = createElement('span', options.className || 'enemy-laser game-entity');
        this.root.appendChild(laser);
        laser.style.transform = `rotate(${angle - 90}deg)`;
        laser.dataset.hitbox = 'enemy-projectile';
        const width = options.width || laser.offsetWidth || 4;
        const height = options.height || laser.offsetHeight || 12;
        const projectile = {
            id: `enemy-laser-${this.idCounter += 1}`,
            el: laser,
            x: origin.x - width / 2,
            y: origin.y - height,
            width,
            height,
            vx: Math.cos(rad) * speed,
            vy: Math.sin(rad) * speed,
            damage: options.damage ?? CONFIG.enemy.projectileDamage,
            persistent: Boolean(options.persistent),
            ttl: typeof options.ttl === 'number' ? options.ttl : undefined
        };
        this.items.push(projectile);
        this.updateElement(projectile);
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
