import { clamp, randomBetween } from '../utils/math.js';

const deg = (value) => value;

const createSpreadPattern = (angles, overrides = {}) => () => ({
    type: 'spread',
    angles,
    ...overrides
});

const createRadialPattern = (count, overrides = {}) => () => ({
    type: 'radial',
    count,
    ...overrides
});

const createAimedPattern = (overrides = {}) => () => ({
    type: 'aimed',
    ...overrides
});

const createPhaseState = () => ({
    phase: Math.random() * Math.PI * 2
});

export const ENEMY_PHASES = [
    { id: 1, label: 'Aproximação', minScore: 0, spawnFactor: 1.05 },
    { id: 2, label: 'Pressão', minScore: 2600, spawnFactor: 0.95 },
    { id: 3, label: 'Caos Controlado', minScore: 6200, spawnFactor: 0.85 },
    { id: 4, label: 'Pré-Boss', minScore: 10500, spawnFactor: 0.72 }
];

const BASE_CLASSES = 'enemy game-entity';

export const ENEMY_ARCHETYPES = [
    {
        id: 'kamikaze',
        label: 'Kamikaze',
        phase: 1,
        weight: 2.6,
        className: `${BASE_CLASSES} enemy--kamikaze`,
        integrity: 1,
        reward: 55,
        damage: 110,
        speed: { min: 340, max: 460 },
        behavior: {
            update(entity, deltaSeconds, _deltaMs, helpers) {
                const target = helpers.playerPosition;
                if (!target) {
                    entity.vx = 0;
                    entity.vy = entity.speed;
                    return false;
                }
                const centerX = entity.x + entity.width / 2;
                const dx = target.x - centerX;
                const dy = target.y - entity.y;
                const length = Math.hypot(dx, dy) || 1;
                const normX = dx / length;
                const normY = dy / length;
                const chaseSpeed = entity.speed * 1.1;
                entity.vx = normX * chaseSpeed;
                entity.vy = normY * chaseSpeed;
                return false;
            }
        }
    },
    {
        id: 'shooter-basic',
        label: 'Shooter',
        phase: 1,
        weight: 3.1,
        className: `${BASE_CLASSES} enemy--basic`,
        integrity: 2,
        reward: 65,
        damage: 90,
        speed: { min: 130, max: 200 },
        fire: {
            cooldownMin: 1500,
            cooldownMax: 2300,
            createPattern: createSpreadPattern([deg(90)], {
                speed: 420,
                damage: 85
            })
        }
    },
    {
        id: 'zig-zag',
        label: 'Zig-Zag',
        phase: 1,
        weight: 2.4,
        className: `${BASE_CLASSES} enemy--zigzag`,
        integrity: 2,
        reward: 80,
        damage: 95,
        speed: { min: 180, max: 260 },
        createState: () => ({
            phase: Math.random() * Math.PI * 2,
            amplitude: randomBetween(60, 120),
            originX: null
        }),
        behavior: {
            update(entity, deltaSeconds) {
                entity.state.phase += deltaSeconds * 3.4;
                if (entity.state.originX === null) {
                    entity.state.originX = entity.x;
                }
                const offset = Math.sin(entity.state.phase) * entity.state.amplitude;
                entity.x = entity.state.originX + offset;
                entity.vx = 0;
                entity.vy = entity.speed * 0.9;
                entity.y += entity.vy * deltaSeconds;
                return true;
            }
        },
        fire: {
            cooldownMin: 2000,
            cooldownMax: 2800,
            createPattern: createSpreadPattern([deg(80), deg(100)], {
                speed: 420,
                damage: 70
            })
        }
    },
    {
        id: 'swarm',
        label: 'Swarmers',
        phase: 1,
        weight: 1.8,
        className: `${BASE_CLASSES} enemy--swarm`,
        integrity: 1,
        reward: 35,
        damage: 70,
        speed: { min: 260, max: 320 },
        spawnGroup(boundsWidth) {
            const count = 4 + Math.floor(Math.random() * 3);
            const clusterCenter = randomBetween(60, Math.max(120, boundsWidth - 60));
            return Array.from({ length: count }).map((_, index) => ({
                x: clamp(clusterCenter + (index - (count - 1) / 2) * 38, 10, Math.max(10, boundsWidth - 60)),
                y: -(40 + index * 12)
            }));
        },
        createState: () => ({ angle: Math.random() * Math.PI * 2 }),
        behavior: {
            update(entity, deltaSeconds) {
                entity.state.angle += deltaSeconds * 4;
                const drift = Math.cos(entity.state.angle) * 140;
                entity.vx = drift;
                entity.vy = entity.speed * 1.2;
                entity.x += entity.vx * deltaSeconds;
                entity.y += entity.vy * deltaSeconds;
                return true;
            }
        }
    },
    {
        id: 'tank',
        label: 'Tank',
        phase: 2,
        weight: 1.4,
        className: `${BASE_CLASSES} enemy--tank`,
        integrity: 7,
        reward: 140,
        damage: 140,
        speed: { min: 80, max: 120 },
        fire: {
            cooldownMin: 2600,
            cooldownMax: 3800,
            createPattern: createSpreadPattern([deg(70), deg(90), deg(110)], {
                speed: 360,
                damage: 130,
                className: 'enemy-laser enemy-laser--tank'
            })
        }
    },
    {
        id: 'sniper',
        label: 'Sniper',
        phase: 2,
        weight: 1.1,
        className: `${BASE_CLASSES} enemy--sniper`,
        integrity: 3,
        reward: 120,
        damage: 160,
        speed: { min: 140, max: 180 },
        createState: () => ({ cooldownMs: randomBetween(1200, 2200), aiming: false, telegraphMs: 600 }),
        behavior: {
            update(entity, deltaSeconds, deltaMs, helpers) {
                entity.vx = 0;
                entity.vy = entity.speed * 0.7;
                entity.y += entity.vy * deltaSeconds;
                entity.state.cooldownMs -= deltaMs;
                if (entity.state.aiming) {
                    entity.state.telegraphMs -= deltaMs;
                    if (entity.state.telegraphMs <= 0) {
                        helpers.fire({
                            type: 'aimed',
                            speed: 520,
                            damage: 180,
                            className: 'enemy-laser enemy-laser--sniper',
                            persistent: false
                        });
                        entity.el.classList.remove('is-aiming');
                        entity.state.aiming = false;
                        entity.state.cooldownMs = randomBetween(2000, 3200);
                        entity.state.telegraphMs = 600;
                    }
                } else if (entity.state.cooldownMs <= 0) {
                    entity.state.aiming = true;
                    entity.el.classList.add('is-aiming');
                    entity.state.telegraphMs = 600;
                }
                return true;
            }
        }
    },
    {
        id: 'flanker',
        label: 'Flanker',
        phase: 2,
        weight: 1.5,
        className: `${BASE_CLASSES} enemy--flanker`,
        integrity: 3,
        reward: 110,
        damage: 120,
        speed: { min: 140, max: 220 },
        createState: () => ({ fromLeft: Math.random() > 0.5 }),
        onSpawn(entity, context) {
            const fromLeft = entity.state.fromLeft;
            const bounds = context.boundsWidth;
            entity.x = fromLeft ? -entity.width : bounds + entity.width;
            entity.y = randomBetween(context.boundsHeight * 0.15, context.boundsHeight * 0.45);
            const horizontal = randomBetween(180, 260);
            entity.vx = fromLeft ? horizontal : -horizontal;
            entity.vy = randomBetween(40, 80);
        },
        behavior: {
            update(entity, deltaSeconds) {
                entity.y += entity.vy * deltaSeconds;
                entity.x += entity.vx * deltaSeconds;
                return true;
            }
        },
        fire: {
            cooldownMin: 1800,
            cooldownMax: 2800,
            createPattern: (entity) => {
                const base = entity.state.fromLeft ? deg(0) : deg(180);
                return {
                    type: 'spread',
                    angles: entity.state.fromLeft ? [base, base + 18, deg(60)] : [base, base - 18, deg(120)],
                    speed: 420,
                    damage: 75
                };
            }
        }
    },
    {
        id: 'bomber',
        label: 'Bomber',
        phase: 3,
        weight: 1.2,
        className: `${BASE_CLASSES} enemy--bomber`,
        integrity: 3,
        reward: 150,
        damage: 130,
        speed: { min: 150, max: 210 },
        onDestroyed(entity, helpers) {
            helpers.fire({
                type: 'radial',
                count: 6,
                speed: 360,
                damage: 85,
                className: 'enemy-laser enemy-laser--bomber'
            });
        }
    },
    {
        id: 'laser',
        label: 'Laser Cannon',
        phase: 3,
        weight: 1,
        className: `${BASE_CLASSES} enemy--laser`,
        integrity: 4,
        reward: 180,
        damage: 150,
        speed: { min: 100, max: 160 },
        createState: () => ({ cooldownMs: randomBetween(1800, 2600), charging: false, beamMs: 1000 }),
        behavior: {
            update(entity, deltaSeconds, deltaMs, helpers) {
                entity.vx = 0;
                entity.vy = entity.speed * 0.6;
                entity.y += entity.vy * deltaSeconds;
                entity.state.cooldownMs -= deltaMs;
                if (entity.state.charging) {
                    entity.state.beamMs -= deltaMs;
                    if (entity.state.beamMs <= 0) {
                        helpers.fire({
                            type: 'beam',
                            damagePerSecond: 280,
                            durationMs: 1100,
                            beamWidth: 14,
                            className: 'enemy-beam'
                        });
                        entity.el.classList.remove('is-charging');
                        entity.state.charging = false;
                        entity.state.cooldownMs = randomBetween(2600, 3600);
                        entity.state.beamMs = 900;
                    }
                } else if (entity.state.cooldownMs <= 0) {
                    entity.state.charging = true;
                    entity.el.classList.add('is-charging');
                    entity.state.beamMs = 900;
                }
                return true;
            }
        }
    },
    {
        id: 'spawner',
        label: 'Spawner',
        phase: 3,
        weight: 0.9,
        className: `${BASE_CLASSES} enemy--spawner`,
        integrity: 5,
        reward: 200,
        damage: 120,
        speed: { min: 90, max: 140 },
        createState: () => ({ spawnCooldown: randomBetween(2000, 3600) }),
        behavior: {
            update(entity, deltaSeconds, deltaMs, helpers) {
                entity.vx = 0;
                entity.vy = entity.speed * 0.5;
                entity.y += entity.vy * deltaSeconds;
                entity.state.spawnCooldown -= deltaMs;
                if (entity.state.spawnCooldown <= 0) {
                    const offset = randomBetween(-30, 30);
                    helpers.spawn('swarm', {
                        x: entity.x + entity.width / 2 + offset,
                        y: entity.y + entity.height
                    });
                    entity.state.spawnCooldown = randomBetween(2400, 3600);
                }
                return true;
            }
        }
    },
    {
        id: 'sine-shooter',
        label: 'Sine Shooter',
        phase: 3,
        weight: 1.3,
        className: `${BASE_CLASSES} enemy--sine`,
        integrity: 3,
        reward: 110,
        damage: 110,
        speed: { min: 180, max: 240 },
        createState: () => ({ phase: Math.random() * Math.PI * 2, amplitude: randomBetween(80, 140) }),
        behavior: {
            update(entity, deltaSeconds) {
                entity.state.phase += deltaSeconds * 2.4;
                entity.y += entity.speed * deltaSeconds;
                entity.x += Math.sin(entity.state.phase) * 90 * deltaSeconds;
                return true;
            }
        },
        fire: {
            cooldownMin: 1300,
            cooldownMax: 2100,
            createPattern: createSpreadPattern([deg(85), deg(95)], {
                speed: 460,
                damage: 65,
                className: 'enemy-laser enemy-laser--fast'
            })
        }
    },
    {
        id: 'boomerang',
        label: 'Boomerang',
        phase: 4,
        weight: 1,
        className: `${BASE_CLASSES} enemy--boomerang`,
        integrity: 3,
        reward: 160,
        damage: 140,
        speed: { min: 220, max: 320 },
        createState: () => ({ forwardMs: randomBetween(1200, 1600), returning: false }),
        behavior: {
            update(entity, deltaSeconds, deltaMs, helpers) {
                entity.state.forwardMs -= deltaMs;
                if (!entity.state.returning && entity.state.forwardMs <= 0) {
                    entity.state.returning = true;
                    entity.vy = -entity.speed * 0.8;
                    helpers.fire({
                        type: 'spread',
                        angles: [deg(60), deg(100), deg(120)],
                        speed: 420,
                        damage: 80,
                        className: 'enemy-laser enemy-laser--return'
                    });
                }
                if (!entity.state.returning) {
                    entity.vx = Math.sin(entity.state.forwardMs * 0.002) * entity.speed * 0.4;
                    entity.vy = entity.speed;
                }
                entity.x += entity.vx * deltaSeconds;
                entity.y += entity.vy * deltaSeconds;
                return true;
            }
        }
    },
    {
        id: 'orbiters',
        label: 'Orbiters',
        phase: 4,
        weight: 0.9,
        className: `${BASE_CLASSES} enemy--orbiter`,
        integrity: 2,
        reward: 140,
        damage: 110,
        speed: { min: 180, max: 240 },
        createState: () => ({ angle: Math.random() * Math.PI * 2, radius: randomBetween(40, 90) }),
        behavior: {
            update(entity, deltaSeconds) {
                entity.state.angle += deltaSeconds * 2.8;
                entity.vx = Math.cos(entity.state.angle) * entity.state.radius;
                entity.vy = entity.speed;
                entity.x += entity.vx * deltaSeconds;
                entity.y += entity.vy * deltaSeconds;
                return true;
            }
        },
        fire: {
            cooldownMin: 1900,
            cooldownMax: 2600,
            createPattern: createRadialPattern(4, {
                speed: 360,
                damage: 70,
                className: 'enemy-laser enemy-laser--orbiter'
            })
        }
    }
];
