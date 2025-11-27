import { CONFIG } from '../config/constants.js';
import { intersects } from '../utils/dom.js';
import { BackgroundField } from '../entities/background-field.js';
import { Player } from '../entities/player.js';
import { ProjectileManager } from '../entities/projectile-manager.js';
import { EnemyProjectileManager } from '../entities/enemy-projectile-manager.js';
import { ThreatManager } from '../entities/threat-manager.js';
import { PowerUpManager } from '../powerups/power-up-manager.js';
import { POWER_UP_IDS } from '../powerups/catalog.js';

export class Game {
    constructor(dom) {
        this.dom = dom;
        this.background = new BackgroundField(dom.area);
        this.player = new Player(dom.rocket, dom.area);
        this.projectiles = new ProjectileManager(dom.area);
        this.enemyProjectiles = new EnemyProjectileManager(dom.area);
        this.threats = new ThreatManager(dom.area, {
            onEnemyFire: (threat) => {
                this.enemyProjectiles.spawnBurst(threat);
            }
        });
        this.powerUps = new PowerUpManager(this, {
            onActivate: this.handlePowerUpActivated.bind(this),
            onExpire: this.handlePowerUpExpired.bind(this)
        });
        this.state = { score: 0, lives: 1 };
        this.input = { pointer: { x: 0, y: 0 }, isFiring: false };
        this.modifiers = this.createDefaultModifiers();
        this.debug = { hitboxes: CONFIG.debug.showHitboxes };
        this.isRunning = false;
        this.lastFrame = 0;
        this.lastShotAt = 0;
        this.currentTimestamp = 0;
        this.chargeState = { isCharging: false, startedAt: 0 };
        this.weapons = { laser: null };
        this.drones = [];
        this.droneState = { active: false, nextShotAt: 0 };
        this.debugHitTimeout = null;

        this.loop = this.loop.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    init() {
        this.background.render();
        this.player.reset();
        this.bindEvents();
        this.updateHUD();
        this.setHitboxDebug(this.debug.hitboxes);
    }

    bindEvents() {
        this.dom.area.addEventListener('pointermove', this.handlePointerMove);
        this.dom.area.addEventListener('pointerdown', this.handlePointerDown);
        this.dom.area.addEventListener('pointerleave', this.handlePointerLeave);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('keydown', this.handleKeyDown);

        if (this.dom.startButton) {
            this.dom.startButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.start();
            });
        }
    }

    handleResize() {
        this.background.render();
        this.player.moveTo(this.player.position.x, this.player.position.y);
    }

    handlePointerMove(event) {
        const rect = this.dom.area.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.player.moveTo(x, y);
        this.input.pointer = { x, y };
    }

    handlePointerDown(event) {
        if (event.button !== 0) {
            return;
        }
        this.input.isFiring = true;
        this.tryShoot(performance.now());
    }

    handlePointerUp(event) {
        if (event.button !== 0) {
            return;
        }
        this.input.isFiring = false;
    }

    handlePointerLeave() {
        this.input.isFiring = false;
    }

    handleKeyDown(event) {
        if (event.code !== 'KeyH') {
            return;
        }
        event.preventDefault();
        this.setHitboxDebug(!this.debug.hitboxes);
    }

    setHitboxDebug(enabled) {
        this.debug.hitboxes = Boolean(enabled);
        if (document.body) {
            document.body.classList.toggle('is-debug-hitbox', this.debug.hitboxes);
        }
        if (!this.debug.hitboxes && this.dom.rocket) {
            this.dom.rocket.classList.remove('is-hitbox-alert');
        }
        if (!this.debug.hitboxes && this.debugHitTimeout) {
            clearTimeout(this.debugHitTimeout);
            this.debugHitTimeout = null;
        }
    }

    flashPlayerHitbox() {
        if (!this.debug.hitboxes || !this.dom.rocket) {
            return;
        }
        this.dom.rocket.classList.add('is-hitbox-alert');
        if (this.debugHitTimeout) {
            clearTimeout(this.debugHitTimeout);
        }
        this.debugHitTimeout = window.setTimeout(() => {
            this.dom.rocket?.classList.remove('is-hitbox-alert');
            this.debugHitTimeout = null;
        }, 1000);
    }

    start() {
        if (this.isRunning) {
            return;
        }
        this.state.score = 0;
        this.state.lives = 1;
        this.player.reset();
        this.projectiles.clear();
        this.enemyProjectiles.clear();
        this.threats.clear();
        this.modifiers = this.createDefaultModifiers();
        this.powerUps.clear();
        this.stopLaserBeam();
        this.clearDrones();
        this.chargeState = { isCharging: false, startedAt: 0 };
        this.background.render();
        this.updateHUD();
        if (this.dom.status) {
            this.dom.status.textContent = '';
        }
        this.dom.startScreen?.classList.add('is-hidden');
        this.isRunning = true;
        this.lastFrame = performance.now();
        this.lastShotAt = 0;
        requestAnimationFrame(this.loop);
    }

    stop(reason = 'Trajetória comprometida') {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.input.isFiring = false;
        this.lastShotAt = 0;
        this.enemyProjectiles.clear();
        this.dom.startScreen?.classList.remove('is-hidden');
        if (this.dom.status) {
            this.dom.status.textContent = `${reason}. Pontuação: ${this.state.score}`;
        }
    }

    loop(timestamp) {
        if (!this.isRunning) {
            return;
        }
        this.currentTimestamp = timestamp;
        const deltaMs = timestamp - this.lastFrame;
        this.lastFrame = timestamp;
        const deltaSeconds = deltaMs / 1000;

        this.player.update(deltaSeconds, this.modifiers.speedMultiplier);
        this.projectiles.update(deltaSeconds, { threats: this.threats.entities });
        this.enemyProjectiles.update(deltaSeconds);
        this.threats.update(deltaSeconds, deltaMs);
        this.powerUps.update(deltaSeconds, timestamp);
        this.handleFiring(timestamp);
        this.updateDrones(deltaSeconds, timestamp);
        this.updateLaserBeam();
        this.checkCollisions();

        requestAnimationFrame(this.loop);
    }

    handleFiring(timestamp) {
        if (!this.input.isFiring) {
            return;
        }
        this.tryShoot(timestamp);
    }

    tryShoot(timestamp) {
        if (!this.isRunning) {
            return;
        }
        const effectiveFireRate = CONFIG.player.fireRateMs / this.modifiers.fireRateMultiplier;
        if (timestamp - this.lastShotAt < effectiveFireRate) {
            return;
        }
        const origin = this.player.getGunPosition();
        this.projectiles.spawn(origin);
        this.lastShotAt = timestamp;
    }

    applyDamage(amount) {
        this.flashPlayerHitbox();
        if (this.debug.hitboxes) {
            return this.player.health;
        }
        const remaining = this.player.applyDamage(amount);
        this.updateHUD();
        if (remaining <= 0) {
            this.stop('Trajetória perdida');
        }
    }

    addScore(value) {
        this.state.score += value;
        this.updateHUD();
    }

    checkCollisions() {
        for (let pIndex = this.projectiles.items.length - 1; pIndex >= 0; pIndex -= 1) {
            const projectile = this.projectiles.items[pIndex];
            for (let tIndex = this.threats.entities.length - 1; tIndex >= 0; tIndex -= 1) {
                const threat = this.threats.entities[tIndex];
                if (intersects(projectile, threat)) {
                    this.projectiles.removeAt(pIndex);
                    this.threats.removeAt(tIndex);
                    this.addScore(threat.reward);
                    break;
                }
            }
        }

        const playerBox = this.player.getHitbox();
        for (let i = this.enemyProjectiles.items.length - 1; i >= 0; i -= 1) {
            const projectile = this.enemyProjectiles.items[i];
            if (intersects(projectile, playerBox)) {
                this.enemyProjectiles.removeAt(i);
                this.applyDamage(CONFIG.enemy.damage / 2);
            }
        }
        for (let tIndex = this.threats.entities.length - 1; tIndex >= 0; tIndex -= 1) {
            const threat = this.threats.entities[tIndex];
            if (intersects(threat, playerBox)) {
                this.threats.removeAt(tIndex);
                this.applyDamage(threat.damage);
            }
        }
    }

    updateHUD() {
        if (this.dom.hudHealth) {
            this.dom.hudHealth.textContent = `${Math.round(this.player.health)}%`;
        }
        if (this.dom.hudScore) {
            this.dom.hudScore.textContent = `${this.state.score}`;
        }
    }

    createDefaultModifiers() {
        return {
            fireRateMultiplier: 1,
            damageMultiplier: 1,
            speedMultiplier: 1,
            shotPatterns: { triple: false, lateral: false },
            chargeShot: false,
            continuousLaser: false,
            guidedShots: false,
            shieldHits: 0
        };
    }
}
