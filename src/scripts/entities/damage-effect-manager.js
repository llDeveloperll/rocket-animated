import { createElement } from '../utils/dom.js';

const DAMAGE_FRAME_DURATION_MS = 15;
const DAMAGE_SPRITES = [
    './src/assets/sprites/damage/r1_c1.png',
    './src/assets/sprites/damage/r1_c2.png',
    './src/assets/sprites/damage/r1_c3.png',
    './src/assets/sprites/damage/r1_c4.png',
    './src/assets/sprites/damage/r2_c1.png',
    './src/assets/sprites/damage/r2_c2.png',
    './src/assets/sprites/damage/r2_c3.png',
    './src/assets/sprites/damage/r2_c4.png',
    './src/assets/sprites/damage/r3_c1.png',
    './src/assets/sprites/damage/r3_c2.png',
    './src/assets/sprites/damage/r3_c3.png',
    './src/assets/sprites/damage/r3_c4.png',
    './src/assets/sprites/damage/r4_c1.png',
    './src/assets/sprites/damage/r4_c2.png',
    './src/assets/sprites/damage/r4_c3.png',
    './src/assets/sprites/damage/r4_c4.png'
];

export class DamageEffectManager {
    constructor(root) {
        this.root = root;
        this.effects = [];
        this.frames = DAMAGE_SPRITES;
        this.preload();
    }

    preload() {
        this.frames.forEach((src) => {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
        });
    }

    spawn(entity) {
        if (!entity || !this.frames.length) {
            return;
        }
        const effectEl = createElement('img', 'damage-effect');
        effectEl.src = this.frames[0];
        effectEl.alt = '';
        this.root.appendChild(effectEl);
        const centerX = entity.x + (entity.width || 0) / 2;
        const centerY = entity.y + (entity.height || 0) / 2;
        effectEl.style.left = `${centerX}px`;
        effectEl.style.top = `${centerY}px`;
        this.effects.push({
            el: effectEl,
            frameIndex: 0,
            elapsed: 0
        });
    }

    update(deltaMs) {
        for (let i = this.effects.length - 1; i >= 0; i -= 1) {
            const effect = this.effects[i];
            effect.elapsed += deltaMs;
            if (effect.elapsed < DAMAGE_FRAME_DURATION_MS) {
                continue;
            }
            effect.elapsed -= DAMAGE_FRAME_DURATION_MS;
            effect.frameIndex += 1;
            if (effect.frameIndex >= this.frames.length) {
                this.removeAt(i);
                continue;
            }
            effect.el.src = this.frames[effect.frameIndex];
        }
    }

    removeAt(index) {
        const [effect] = this.effects.splice(index, 1);
        effect?.el?.remove();
    }

    clear() {
        this.effects.forEach(effect => effect.el.remove());
        this.effects = [];
    }
}
