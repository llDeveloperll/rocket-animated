export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const randomBetween = (min, max) => Math.random() * (max - min) + min;
export const degToRad = (deg) => deg * (Math.PI / 180);
export const vectorFromAngle = (angleDeg, magnitude) => {
	const rad = (angleDeg - 90) * (Math.PI / 180);
	return {
		vx: Math.cos(rad) * magnitude,
		vy: Math.sin(rad) * magnitude
	};
};
