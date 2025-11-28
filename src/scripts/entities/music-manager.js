const BASE_RATE = 1.2;
const RATE_STEP = 0.1;
const MAX_RATE = 1.6;
const SCORE_STEP = 500;

export class MusicManager {
    constructor(src) {
        this.trackSrc = src;
        this.audio = null;
        this.isReady = false;
        this.currentRate = BASE_RATE;
    }

    ensureAudio() {
        if (this.audio) {
            return this.audio;
        }
        const audio = new Audio(this.trackSrc);
        audio.loop = true;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audio.volume = 0.8;
        this.audio = audio;
        return audio;
    }

    start() {
        const audio = this.ensureAudio();
        this.applyRate(BASE_RATE);
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    }

    stop() {
        if (!this.audio) {
            return;
        }
        this.audio.pause();
        this.audio.currentTime = 0;
        this.applyRate(BASE_RATE);
    }

    applyRate(value) {
        const audio = this.ensureAudio();
        this.currentRate = value;
        audio.playbackRate = value;
    }

    updateScore(score) {
        if (!this.audio) {
            return;
        }
        const steps = Math.floor(score / SCORE_STEP);
        const nextRate = Math.min(BASE_RATE + steps * RATE_STEP, MAX_RATE);
        if (Math.abs(nextRate - this.currentRate) > 0.001) {
            this.applyRate(nextRate);
        }
    }
}
