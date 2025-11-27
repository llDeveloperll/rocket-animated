import { createElement } from '../utils/dom.js';
import { randomBetween } from '../utils/math.js';

export class BackgroundField {
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
