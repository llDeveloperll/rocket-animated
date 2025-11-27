import { SELECTORS } from './config/constants.js';
import { Game } from './systems/game.js';

const bootstrap = () => {
    const dom = {
        area: document.querySelector(SELECTORS.area),
        rocket: document.querySelector(SELECTORS.rocket),
        startScreen: document.querySelector(SELECTORS.startScreen),
        startButton: document.querySelector(SELECTORS.startButton),
        hudHealth: document.querySelector(SELECTORS.hudHealth),
        hudScore: document.querySelector(SELECTORS.hudScore),
        hudLives: document.querySelector(SELECTORS.hudLives),
        status: document.querySelector(SELECTORS.status)
    };

    if (dom.rocket) {
        dom.rocket.dataset.hitbox = 'player';
    }

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
