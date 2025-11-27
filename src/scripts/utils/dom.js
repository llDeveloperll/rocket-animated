export const createElement = (tag, className) => {
    const el = document.createElement(tag);
    if (className) {
        el.className = className;
    }
    return el;
};

export const intersects = (a, b) => (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
);
