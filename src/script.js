const SELECTORS = {
    area: '.game-area',
    rocket: '[data-rocket]',
    startScreen: '[data-screen="start"]',
    startButton: '[data-action="start-game"]',
    hudHealth: '[data-ui="health"]',
    hudScore: '[data-ui="score"]',
    status: '[data-screen-status]'
};

const CONFIG = {
    player: {
        maxHealth: 250,
        fireRateMs: 160,
        laserSpeed: 900,
        damageMargin: 36
    },
    spawns: {
        meteor: 900,
        enemy: 2200
    },
    meteor: {
        minSpeed: 110,
        maxSpeed: 220,
        damage: 50,
        reward: 25
    },
    enemy: {
        minSpeed: 140,
        maxSpeed: 240,
        damage: 80,
        reward: 75
    }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createElement = (tag, className) => {
    const el = document.createElement(tag);
    if (className) {
        el.className = className;
    }
    return el;
};

const intersects = (a, b) => (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
);

class BackgroundField {
    constructor(root, quantity = 80) {
        this.root = root;
        this.quantity = quantity;
        this.stars = [];
    }

    render() {
        this.clear();
        const rect = this.root.getBoundingClientRect();
        const width = rect.width || this.root.clientWidth;
        const height = rect.height || this.root.clientHeight;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.quantity; i += 1) {
            const star = createElement('span', 'star');
            star.style.left = `${Math.random() * width}px`;
            star.style.top = `${Math.random() * height}px`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            star.style.opacity = `${randomBetween(0.2, 0.9)}`;
            fragment.appendChild(star);
            this.stars.push(star);
        }

        this.root.appendChild(fragment);
    }

    clear() {
        this.stars.forEach(star => star.remove());
        this.stars = [];
    }
}

class Player {
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
        this.setPosition(x, y);
    }

    reset(boundsWidth, boundsHeight) {
        this.health = this.maxHealth;
        const x = (boundsWidth || this.area.clientWidth) / 2;
        const y = (boundsHeight || this.area.clientHeight) * 0.8;
        this.setPosition(x, y);
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

class ProjectileManager {
    constructor(root) {
        this.root = root;
        this.items = [];
        this.idCounter = 0;
    }

    spawn(origin) {
        const laser = createElement('span', 'laser game-entity');
        this.root.appendChild(laser);
        const width = laser.offsetWidth || 6;
        const height = laser.offsetHeight || 18;
        const projectile = {
            id: `laser-${this.idCounter += 1}`,
            el: laser,
            x: origin.x - width / 2,
            y: origin.y - height,
            width,
            height,
            speed: CONFIG.player.laserSpeed
        };
        this.items.push(projectile);
        this.updateElement(projectile);
        return projectile;
    }

    update(deltaSeconds) {
        for (let i = this.items.length - 1; i >= 0; i -= 1) {
            const projectile = this.items[i];
            projectile.y -= projectile.speed * deltaSeconds;
            if (projectile.y + projectile.height < -10) {
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

class ThreatManager {
    constructor(root) {
        this.root = root;
        this.entities = [];
        this.idCounter = 0;
        this.timers = { meteor: 0, enemy: 0 };
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
            this.updateElement(threat);
            if (threat.y > boundsHeight + threat.height) {
                this.removeAt(i);
            }
        }
    }

    spawnMeteor(boundsWidth) {
        const meteor = createElement('div', 'meteor game-entity');
        this.root.appendChild(meteor);
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
            reward: CONFIG.meteor.reward
        };
        this.entities.push(entity);
        this.updateElement(entity);
    }

    spawnEnemy(boundsWidth) {
        const enemy = createElement('div', 'enemy game-entity');
        this.root.appendChild(enemy);
        const width = enemy.offsetWidth || 50;
        const height = enemy.offsetHeight || 50;
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
            reward: CONFIG.enemy.reward
        };
        this.entities.push(entity);
        this.updateElement(entity);
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

class Game {
    constructor(dom) {
        this.dom = dom;
        this.background = new BackgroundField(dom.area);
        this.player = new Player(dom.rocket, dom.area);
        this.projectiles = new ProjectileManager(dom.area);
        this.threats = new ThreatManager(dom.area);
        this.state = { score: 0 };
        this.input = { pointer: { x: 0, y: 0 }, isFiring: false };
        this.isRunning = false;
        this.lastFrame = 0;
        this.lastShotAt = 0;

        this.loop = this.loop.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerLeave = this.handlePointerLeave.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    init() {
        this.background.render();
        this.player.reset();
        this.bindEvents();
        this.updateHUD();
    }

    bindEvents() {
        this.dom.area.addEventListener('pointermove', this.handlePointerMove);
        this.dom.area.addEventListener('pointerdown', this.handlePointerDown);
        this.dom.area.addEventListener('pointerleave', this.handlePointerLeave);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('resize', this.handleResize);

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

    start() {
        if (this.isRunning) {
            return;
        }
        this.state.score = 0;
        this.player.reset();
        this.projectiles.clear();
        this.threats.clear();
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
        this.dom.startScreen?.classList.remove('is-hidden');
        if (this.dom.status) {
            this.dom.status.textContent = `${reason}. Pontuação: ${this.state.score}`;
        }
    }

    loop(timestamp) {
        if (!this.isRunning) {
            return;
        }
        const deltaMs = timestamp - this.lastFrame;
        this.lastFrame = timestamp;
        const deltaSeconds = deltaMs / 1000;

        this.projectiles.update(deltaSeconds);
        this.threats.update(deltaSeconds, deltaMs);
        this.handleFiring(timestamp);
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
        if (timestamp - this.lastShotAt < CONFIG.player.fireRateMs) {
            return;
        }
        const origin = this.player.getGunPosition();
        this.projectiles.spawn(origin);
        this.lastShotAt = timestamp;
    }

    applyDamage(amount) {
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
}

const bootstrap = () => {
    const dom = {
        area: document.querySelector(SELECTORS.area),
        rocket: document.querySelector(SELECTORS.rocket),
        startScreen: document.querySelector(SELECTORS.startScreen),
        startButton: document.querySelector(SELECTORS.startButton),
        hudHealth: document.querySelector(SELECTORS.hudHealth),
        hudScore: document.querySelector(SELECTORS.hudScore),
        status: document.querySelector(SELECTORS.status)
    };

    if (!dom.area || !dom.rocket) {
        console.error('Game root elements not found.');
        return;
    }

    const game = new Game(dom);
    game.init();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
