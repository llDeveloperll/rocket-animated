import { CONFIG } from '../config/constants.js';
import { clamp } from '../utils/math.js';

export class Player {
    constructor(element, area) {
        this.element = element;
        this.area = area;
        this.maxHealth = CONFIG.player.maxHealth;
        this.health = this.maxHealth;
        this.size = {
            width: element.offsetWidth || 48,
            height: element.offsetHeight || 78
        };
        this.position = { x: area.clientWidth / 2, y: area.clientHeight * 0.8 };
        this.target = { ...this.position };
        this.baseSpeed = CONFIG.player.moveSpeed || 1100;
        this.margin = CONFIG.player.damageMargin;
        this.setPosition(this.position.x, this.position.y);
    }

    setPosition(x, y) {
        const width = this.area.clientWidth || window.innerWidth;
        const height = this.area.clientHeight || window.innerHeight;
        const clampedX = clamp(x, this.size.width / 2, width - this.size.width / 2);
        const clampedY = clamp(y, this.size.height / 2, height - this.size.height / 2);
        this.position = { x: clampedX, y: clampedY };
        this.element.style.left = `${clampedX - this.size.width / 2}px`;
        this.element.style.top = `${clampedY - this.size.height / 2}px`;
    }

    moveTo(x, y) {
        this.target = { x, y };
    }

    reset(boundsWidth, boundsHeight) {
        this.health = this.maxHealth;
        const x = (boundsWidth || this.area.clientWidth) / 2;
        const y = (boundsHeight || this.area.clientHeight) * 0.8;
        this.setPosition(x, y);
        this.target = { x, y };
    }

    update(deltaSeconds, speedMultiplier = 1) {
        if (!this.target) {
            return;
        }
        const dx = this.target.x - this.position.x;
        const dy = this.target.y - this.position.y;
        const distance = Math.hypot(dx, dy);
        if (distance === 0) {
            return;
        }
        const maxStep = this.baseSpeed * speedMultiplier * deltaSeconds;
        if (distance <= maxStep) {
            this.setPosition(this.target.x, this.target.y);
            return;
        }
        const ratio = maxStep / distance;
        this.setPosition(
            this.position.x + dx * ratio,
            this.position.y + dy * ratio
        );
    }

    applyDamage(value) {
        this.health = Math.max(0, this.health - value);
        return this.health;
    }

    getHitbox() {
        return {
            x: this.position.x - this.size.width / 2,
            y: this.position.y - this.size.height / 2,
            width: this.size.width,
            height: this.size.height
        };
    }

    getGunPosition() {
        return {
            x: this.position.x,
            y: this.position.y - this.size.height / 2
        };
    }
}
