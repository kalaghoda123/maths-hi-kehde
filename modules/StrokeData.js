import * as THREE from 'three';

export function getInterpolatedStroke(points, density) {
    if (points.length < 2) return points;

    const curve = new THREE.CatmullRomCurve3(points);
    // Determine length
    const pointsV = curve.getPoints(density);
    return pointsV;
}

const SHAPES = {};

// Circle
const circlePoints = [];
for (let i = 0; i <= 360; i += 10) {
    const rad = (i * Math.PI) / 180;
    // Radius 1 normalized
    circlePoints.push(new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0));
}
SHAPES['CIRCLE'] = [circlePoints];

// Square
const squarePoints = [
    new THREE.Vector3(-1, 1, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(-1, -1, 0),
    new THREE.Vector3(-1, 1, 0)
];
SHAPES['SQUARE'] = [squarePoints];

// Triangle
const trianglePoints = [
    new THREE.Vector3(0, 1.2, 0),
    new THREE.Vector3(1, -0.8, 0),
    new THREE.Vector3(-1, -0.8, 0),
    new THREE.Vector3(0, 1.2, 0)
];
SHAPES['TRIANGLE'] = [trianglePoints];

export const STROKES = SHAPES;
