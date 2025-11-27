import { CONFIG } from '../config/constants.js';
import { createElement } from '../utils/dom.js';
import { vectorFromAngle } from '../utils/math.js';

export class ProjectileManager {
    constructor(root) {
        this.root = root;
        this.items = [];
        this.idCounter = 0;
    }

    spawn(origin, options = {}) {
        const {
            angle = 0,
            speed = CONFIG.player.laserSpeed,
            damage = CONFIG.player.baseDamage,
            lifetimeMs = 4000,
            piercing = false,
            guided = false,
            guidedTurnRate = 2.5,
            className = 'laser game-entity',
            widthOverride,
            heightOverride,
            behavior
        } = options;

        const laser = createElement('span', className);
        laser.dataset.hitbox = options.hitbox || 'player-projectile';
        this.root.appendChild(laser);
        const width = widthOverride || laser.offsetWidth || 6;
        const height = heightOverride || laser.offsetHeight || 18;
        const { vx, vy } = vectorFromAngle(angle, speed);
        const projectile = {
            id: `laser-${this.idCounter += 1}`,
            el: laser,
            x: origin.x - width / 2,
            y: origin.y - height,
            width,
            height,
            vx,
            vy,
            damage,
            piercing,
            lifetime: lifetimeMs,
            behavior: behavior || (guided ? this.createHomingBehavior(guidedTurnRate) : null)
        };
        this.items.push(projectile);
        this.updateElement(projectile);
        return projectile;
    }

    createHomingBehavior(turnRateDegPerSec) {
        const turnRate = (turnRateDegPerSec * Math.PI) / 180;
        return (projectile, deltaSeconds, context) => {
            const targets = context?.threats || [];
            if (!targets.length) {
                return;
            }
            let closest = null;
            let minDist = Infinity;
            targets.forEach((target) => {
                const cx = target.x + target.width / 2;
                const cy = target.y + target.height / 2;
                const dx = cx - (projectile.x + projectile.width / 2);
                const dy = cy - (projectile.y + projectile.height / 2);
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    closest = { cx, cy };
                }
            });
            if (!closest) {
                return;
            }
            const desiredAngle = Math.atan2(closest.cy - projectile.y, closest.cx - projectile.x);
            const currentAngle = Math.atan2(projectile.vy, projectile.vx);
            let angleDiff = desiredAngle - currentAngle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            const maxTurn = turnRate * deltaSeconds;
            const clampedDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
            const newAngle = currentAngle + clampedDiff;
            const speed = Math.hypot(projectile.vx, projectile.vy);
            projectile.vx = Math.cos(newAngle) * speed;
            projectile.vy = Math.sin(newAngle) * speed;
        };
    }

    update(deltaSeconds, context = {}) {
        const boundsWidth = this.root.clientWidth || window.innerWidth;
        const boundsHeight = this.root.clientHeight || window.innerHeight;
        for (let i = this.items.length - 1; i >= 0; i -= 1) {
            const projectile = this.items[i];
            projectile.lifetime -= deltaSeconds * 1000;
            projectile.behavior?.(projectile, deltaSeconds, context);
            projectile.x += projectile.vx * deltaSeconds;
            projectile.y += projectile.vy * deltaSeconds;
            if (
                projectile.lifetime <= 0 ||
                projectile.x + projectile.width < -20 ||
                projectile.x > boundsWidth + 20 ||
                projectile.y + projectile.height < -40
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
