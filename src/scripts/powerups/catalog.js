export const POWER_UP_IDS = {
    TRIPLE_SHOT: 'triple-shot',
    SIDE_SHOT: 'side-shot',
    CHARGE_SHOT: 'charge-shot',
    LASER_BEAM: 'laser-beam',
    SHIELD: 'shield',
    SPEED: 'speed',
    FIRE_RATE: 'fire-rate',
    EXTRA_LIFE: 'extra-life',
    SMART_BOMB: 'smart-bomb',
    GUIDED_SHOT: 'guided-shot',
    DAMAGE_BOOST: 'damage-boost',
    DRONES: 'support-drones'
};

export const POWER_UP_CATALOG = [
    {
        id: POWER_UP_IDS.TRIPLE_SHOT,
        label: 'Tiro Triplo',
        description: 'Dispara três projéteis em cone.',
        icon: 'tri',
        durationKey: 'tripleShot'
    },
    {
        id: POWER_UP_IDS.SIDE_SHOT,
        label: 'Tiro Lateral',
        description: 'Dois disparos adicionais para as laterais.',
        icon: 'lat',
        durationKey: 'sideShot'
    },
    {
        id: POWER_UP_IDS.CHARGE_SHOT,
        label: 'Tiro Carregado',
        description: 'Segure para liberar projétil penetrante.',
        icon: 'chg',
        durationKey: 'chargeShot'
    },
    {
        id: POWER_UP_IDS.LASER_BEAM,
        label: 'Laser Contínuo',
        description: 'Laser constante por tempo limitado.',
        icon: 'las',
        durationKey: 'laserBeam'
    },
    {
        id: POWER_UP_IDS.SHIELD,
        label: 'Escudo',
        description: 'Absorve até 3 impactos.',
        icon: 'shd',
        immediate: true
    },
    {
        id: POWER_UP_IDS.SPEED,
        label: 'Velocidade',
        description: 'Aumenta a velocidade da nave.',
        icon: 'spd',
        durationKey: 'speedBoost'
    },
    {
        id: POWER_UP_IDS.FIRE_RATE,
        label: 'Cadência',
        description: 'Dispara mais rápido.',
        icon: 'rof',
        durationKey: 'fireRate'
    },
    {
        id: POWER_UP_IDS.EXTRA_LIFE,
        label: 'Vida Extra',
        description: '+1 vida ao jogador.',
        icon: '1up',
        immediate: true
    },
    {
        id: POWER_UP_IDS.SMART_BOMB,
        label: 'Bomba de Tela',
        description: 'Remove inimigos e projéteis.',
        icon: 'bmb',
        immediate: true
    },
    {
        id: POWER_UP_IDS.GUIDED_SHOT,
        label: 'Tiro Teleguiado',
        description: 'Projéteis que seguem inimigos.',
        icon: 'hom',
        durationKey: 'guided'
    },
    {
        id: POWER_UP_IDS.DAMAGE_BOOST,
        label: 'Aumento de Dano',
        description: 'Dano dobrado temporariamente.',
        icon: 'dmg',
        durationKey: 'damage'
    },
    {
        id: POWER_UP_IDS.DRONES,
        label: 'Drones de Suporte',
        description: 'Drones orbitam e atacam.',
        icon: 'drn',
        durationKey: 'drones'
    }
];
