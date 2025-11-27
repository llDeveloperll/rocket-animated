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
        this.state = { score: 0, lives: CONFIG.player.startLives };
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
        this.statusTimeout = null;

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
        if (this.modifiers.chargeShot) {
            this.input.isFiring = true;
            this.chargeState = { isCharging: true, startedAt: performance.now() };
            return;
        }
        this.input.isFiring = true;
        this.tryShoot(performance.now());
    }

    handlePointerUp(event) {
        if (event.button !== 0) {
            return;
        }
        if (this.modifiers.chargeShot && this.chargeState.isCharging) {
            const now = performance.now();
            const held = now - this.chargeState.startedAt;
            if (held >= CONFIG.player.chargeShotHoldMs) {
                this.fireChargeShot();
            } else {
                this.tryShoot(now, { force: true });
            }
            this.chargeState = { isCharging: false, startedAt: 0 };
        }
        this.input.isFiring = false;
    }

    handlePointerLeave() {
        this.input.isFiring = false;
        if (this.modifiers.chargeShot) {
            this.chargeState = { isCharging: false, startedAt: 0 };
        }
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
        this.state.lives = CONFIG.player.startLives;
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
        this.powerUps.clear();
        this.stopLaserBeam();
        this.clearDrones();
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
        this.updateLaserBeam(deltaSeconds);
        this.checkCollisions();

        requestAnimationFrame(this.loop);
    }

    handleFiring(timestamp) {
        if (!this.input.isFiring) {
            return;
        }
        if (this.modifiers.chargeShot) {
            return;
        }
        this.tryShoot(timestamp);
    }

    tryShoot(timestamp, options = {}) {
        if (!this.isRunning) {
            return;
        }
        const effectiveFireRate = CONFIG.player.fireRateMs / this.modifiers.fireRateMultiplier;
        if (!options.force && timestamp - this.lastShotAt < effectiveFireRate) {
            return;
        }
        this.firePrimaryShot();
        this.lastShotAt = timestamp;
    }

    firePrimaryShot(origin = this.player.getGunPosition(), overrides = {}) {
        const triple = overrides.triple ?? this.modifiers.shotPatterns.triple;
        const lateral = overrides.lateral ?? this.modifiers.shotPatterns.lateral;
        const guided = overrides.guided ?? this.modifiers.guidedShots;
        const speed = overrides.speed ?? CONFIG.player.laserSpeed;
        const className = overrides.className ?? 'laser game-entity';
        const baseDamage = this.getProjectileDamage(overrides.damageScale ?? 1);
        const baseOptions = {
            damage: baseDamage,
            guided,
            speed,
            className,
            lifetimeMs: overrides.lifetimeMs
        };
        this.spawnShot(origin, 0, baseOptions);
        if (triple) {
            this.spawnShot(origin, -8, baseOptions);
            this.spawnShot(origin, 8, baseOptions);
        }
        if (lateral) {
            this.spawnShot(origin, -80, { ...baseOptions, speed: speed * 0.9 });
            this.spawnShot(origin, 80, { ...baseOptions, speed: speed * 0.9 });
        }
    }

    spawnShot(origin, angle, options = {}) {
        this.projectiles.spawn(origin, {
            angle,
            speed: options.speed ?? CONFIG.player.laserSpeed,
            damage: options.damage ?? this.getProjectileDamage(),
            guided: options.guided ?? false,
            lifetimeMs: options.lifetimeMs ?? 4000,
            className: options.className ?? 'laser game-entity',
            piercing: options.piercing ?? false
        });
    }

    getProjectileDamage(multiplier = 1) {
        return CONFIG.player.baseDamage * this.modifiers.damageMultiplier * multiplier;
    }

    fireChargeShot() {
        if (!this.isRunning) {
            return;
        }
        const origin = this.player.getGunPosition();
        this.projectiles.spawn(origin, {
            angle: 0,
            speed: CONFIG.player.laserSpeed * 0.85,
            damage: this.getProjectileDamage(6),
            piercing: true,
            className: 'laser charge-shot game-entity',
            widthOverride: 14,
            heightOverride: 30,
            lifetimeMs: 6000
        });
        this.lastShotAt = performance.now();
    }

    applyDamage(amount) {
        this.flashPlayerHitbox();
        if (this.debug.hitboxes) {
            return this.player.health;
        }
        if (this.modifiers.shieldHits > 0) {
            this.modifiers.shieldHits -= 1;
            return this.player.health;
        }
        const remaining = this.player.applyDamage(amount);
        this.updateHUD();
        if (remaining <= 0) {
            if (this.state.lives > 1) {
                this.state.lives -= 1;
                this.player.reset();
                this.player.health = this.player.maxHealth;
                this.updateHUD();
                return remaining;
            }
            this.stop('Trajetória perdida');
        }
        return remaining;
    }

    addScore(value) {
        this.state.score += value;
        this.updateHUD();
        this.powerUps.handleScore(this.state.score);
    }

    checkCollisions() {
        for (let pIndex = this.projectiles.items.length - 1; pIndex >= 0; pIndex -= 1) {
            const projectile = this.projectiles.items[pIndex];
            for (let tIndex = this.threats.entities.length - 1; tIndex >= 0; tIndex -= 1) {
                const threat = this.threats.entities[tIndex];
                if (intersects(projectile, threat)) {
                    const appliedDamage = projectile.damage ?? this.getProjectileDamage();
                    this.applyThreatDamage(tIndex, appliedDamage);
                    if (!projectile.piercing) {
                        this.projectiles.removeAt(pIndex);
                        break;
                    }
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

        this.powerUps.collect(playerBox, this.currentTimestamp);
    }

    applyThreatDamage(index, amount) {
        const threat = this.threats.entities[index];
        if (!threat) {
            return false;
        }
        threat.integrity = (threat.integrity || 1) - amount;
        if (threat.integrity <= 0) {
            this.threats.removeAt(index);
            this.addScore(threat.reward);
            return true;
        }
        return false;
    }

    startLaserBeam() {
        this.stopLaserBeam();
        const beam = document.createElement('div');
        beam.className = 'laser-beam';
        beam.dataset.hitbox = 'player-laser';
        this.dom.area.appendChild(beam);
        this.weapons.laser = {
            el: beam,
            width: 14,
            damagePerSecond: this.getProjectileDamage(8)
        };
    }

    stopLaserBeam() {
        if (this.weapons.laser?.el) {
            this.weapons.laser.el.remove();
        }
        this.weapons.laser = null;
    }

    updateLaserBeam(deltaSeconds) {
        const beam = this.weapons.laser;
        if (!beam) {
            return;
        }
        const origin = this.player.getGunPosition();
        const width = beam.width;
        const height = Math.max(0, origin.y);
        beam.el.style.left = `${origin.x - width / 2}px`;
        beam.el.style.top = '0px';
        beam.el.style.width = `${width}px`;
        beam.el.style.height = `${height}px`;
        const rect = {
            x: origin.x - width / 2,
            y: 0,
            width,
            height
        };
        const damage = beam.damagePerSecond * deltaSeconds;
        for (let i = this.threats.entities.length - 1; i >= 0; i -= 1) {
            const threat = this.threats.entities[i];
            if (intersects(rect, threat)) {
                this.applyThreatDamage(i, damage);
            }
        }
    }

    triggerSmartBomb() {
        for (let i = this.threats.entities.length - 1; i >= 0; i -= 1) {
            this.applyThreatDamage(i, Number.MAX_SAFE_INTEGER);
        }
        for (let i = this.enemyProjectiles.items.length - 1; i >= 0; i -= 1) {
            this.enemyProjectiles.removeAt(i);
        }
    }

    activateDrones() {
        const count = CONFIG.powerUps.drone.count;
        if (!count) {
            return;
        }
        this.clearDrones();
        for (let i = 0; i < count; i += 1) {
            const droneEl = document.createElement('div');
            droneEl.className = 'drone';
            droneEl.dataset.hitbox = 'drone';
            this.dom.area.appendChild(droneEl);
            this.drones.push({
                el: droneEl,
                angle: (Math.PI * 2 * i) / count,
                position: { x: this.player.position.x, y: this.player.position.y }
            });
        }
        this.droneState = {
            active: true,
            nextShotAt: this.currentTimestamp,
            fireRate: CONFIG.powerUps.drone.fireRateMs
        };
        this.updateDrones(0, this.currentTimestamp);
    }

    clearDrones() {
        this.drones.forEach(drone => drone.el.remove());
        this.drones = [];
        this.droneState = { active: false, nextShotAt: 0 };
    }

    updateDrones(deltaSeconds, timestamp) {
        if (!this.droneState.active || !this.drones.length) {
            return;
        }
        const radius = CONFIG.powerUps.drone.orbitRadius;
        const orbitSpeed = 1.5;
        this.drones.forEach((drone) => {
            drone.angle += orbitSpeed * deltaSeconds;
            const x = this.player.position.x + Math.cos(drone.angle) * radius;
            const y = this.player.position.y + Math.sin(drone.angle) * radius;
            drone.position = { x, y };
            drone.el.style.left = `${x - 12}px`;
            drone.el.style.top = `${y - 12}px`;
        });
        if (timestamp >= this.droneState.nextShotAt) {
            this.fireDrones();
            this.droneState.nextShotAt = timestamp + this.droneState.fireRate;
        }
    }

    fireDrones() {
        if (!this.drones.length) {
            return;
        }
        this.drones.forEach((drone) => {
            const origin = { x: drone.position.x, y: drone.position.y - 10 };
            this.firePrimaryShot(origin, {
                triple: false,
                lateral: false,
                guided: this.modifiers.guidedShots,
                damageScale: 0.7,
                className: 'laser drone-laser game-entity'
            });
        });
    }

    updateHUD() {
        if (this.dom.hudHealth) {
            this.dom.hudHealth.textContent = `${Math.round(this.player.health)}%`;
        }
        if (this.dom.hudScore) {
            this.dom.hudScore.textContent = `${this.state.score}`;
        }
        if (this.dom.hudLives) {
            this.dom.hudLives.textContent = `${this.state.lives}`;
        }
    }

    showStatus(message, ttl = 2200) {
        if (!this.dom.status) {
            return;
        }
        this.dom.status.textContent = message;
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        this.statusTimeout = window.setTimeout(() => {
            if (this.dom.status?.textContent === message) {
                this.dom.status.textContent = '';
            }
            this.statusTimeout = null;
        }, ttl);
    }

    handlePowerUpActivated(def, meta) {
        this.showStatus(`${def.label} ativado`);
        switch (def.id) {
            case POWER_UP_IDS.TRIPLE_SHOT:
                this.modifiers.shotPatterns.triple = true;
                return true;
            case POWER_UP_IDS.SIDE_SHOT:
                this.modifiers.shotPatterns.lateral = true;
                return true;
            case POWER_UP_IDS.CHARGE_SHOT:
                this.modifiers.chargeShot = true;
                this.input.isFiring = false;
                return true;
            case POWER_UP_IDS.LASER_BEAM:
                this.startLaserBeam(meta.duration);
                return true;
            case POWER_UP_IDS.SHIELD:
                this.modifiers.shieldHits = CONFIG.powerUps.shieldHits;
                return false;
            case POWER_UP_IDS.SPEED:
                this.modifiers.speedMultiplier = 1.5;
                return true;
            case POWER_UP_IDS.FIRE_RATE:
                this.modifiers.fireRateMultiplier = 1.6;
                return true;
            case POWER_UP_IDS.EXTRA_LIFE:
                this.state.lives += 1;
                this.updateHUD();
                return false;
            case POWER_UP_IDS.SMART_BOMB:
                this.triggerSmartBomb();
                return false;
            case POWER_UP_IDS.GUIDED_SHOT:
                this.modifiers.guidedShots = true;
                return true;
            case POWER_UP_IDS.DAMAGE_BOOST:
                this.modifiers.damageMultiplier = 2;
                return true;
            case POWER_UP_IDS.DRONES:
                this.activateDrones(meta.duration);
                return true;
            default:
                return false;
        }
    }

    handlePowerUpExpired(def) {
        switch (def.id) {
            case POWER_UP_IDS.TRIPLE_SHOT:
                this.modifiers.shotPatterns.triple = false;
                break;
            case POWER_UP_IDS.SIDE_SHOT:
                this.modifiers.shotPatterns.lateral = false;
                break;
            case POWER_UP_IDS.CHARGE_SHOT:
                this.modifiers.chargeShot = false;
                this.chargeState = { isCharging: false, startedAt: 0 };
                break;
            case POWER_UP_IDS.LASER_BEAM:
                this.stopLaserBeam();
                break;
            case POWER_UP_IDS.SPEED:
                this.modifiers.speedMultiplier = 1;
                break;
            case POWER_UP_IDS.FIRE_RATE:
                this.modifiers.fireRateMultiplier = 1;
                break;
            case POWER_UP_IDS.GUIDED_SHOT:
                this.modifiers.guidedShots = false;
                break;
            case POWER_UP_IDS.DAMAGE_BOOST:
                this.modifiers.damageMultiplier = 1;
                break;
            case POWER_UP_IDS.DRONES:
                this.clearDrones();
                break;
            default:
                break;
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
