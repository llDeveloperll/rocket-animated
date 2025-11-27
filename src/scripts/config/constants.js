export const SELECTORS = {
    area: '.game-area',
    rocket: '[data-rocket]',
    startScreen: '[data-screen="start"]',
    startButton: '[data-action="start-game"]',
    hudHealth: '[data-ui="health"]',
    hudScore: '[data-ui="score"]',
    status: '[data-screen-status]'
};

export const CONFIG = {
    player: {
        maxHealth: 250,
        baseDamage: 1,
        fireRateMs: 160,
        laserSpeed: 900,
        damageMargin: 36,
        moveSpeed: 1100,
        chargeShotHoldMs: 1000
    },
    spawns: {
        meteor: 900,
        enemy: 2200
    },
    meteor: {
        minSpeed: 450,
        maxSpeed: 500,
        damage: 3,
        reward: 25,
        integrity: 1
    },
    enemy: {
        minSpeed: 140,
        maxSpeed: 240,
        damage: 80,
        reward: 75,
        fireRateMs: 1600,
        laserSpeed: 420,
        projectileAngles: [65, 90, 92, 120],
        integrity: 3
    },
    powerUps: {
        minScore: 2000,
        scoreGapMin: 1200,
        scoreGapMax: 2200,
        pickupSpeed: 140,
        maxPickups: 2,
        shieldHits: 3,
        durations: {
            tripleShot: 16000,
            sideShot: 15000,
            chargeShot: 18000,
            laserBeam: 9000,
            speedBoost: 8000,
            fireRate: 11000,
            guided: 13000,
            damage: 12000,
            drones: 20000
        },
        drone: {
            count: 2,
            orbitRadius: 70,
            fireRateMs: 600
        }
    },
    debug: {
        showHitboxes: true
    }
};
