import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, color = 0xffffff) {
        this.scene = scene;
        this.particles = [];
        const geom = new THREE.BufferGeometry();
        const mat = new THREE.PointsMaterial({
            color: color,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geom, mat);
        // Pool size
        this.maxParticles = 500;

        // Arrays for attributes
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = [];
        this.life = [];

        for (let i = 0; i < this.maxParticles; i++) {
            this.velocities.push(new THREE.Vector3());
            this.life.push(0);
            this.positions[i * 3] = 9999; // Hide initially
            this.positions[i * 3 + 1] = 9999;
            this.positions[i * 3 + 2] = 9999;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.scene.add(this.particleSystem);
        this.geometry = geom;
    }

    emit(pos, count = 1) {
        for (let k = 0; k < count; k++) {
            // Find dead particle
            let idx = -1;
            for (let i = 0; i < this.maxParticles; i++) {
                if (this.life[i] <= 0) {
                    idx = i;
                    break;
                }
            }
            if (idx === -1) return; // Full

            this.life[idx] = 1.0;
            this.positions[idx * 3] = pos.x + (Math.random() - 0.5) * 0.2;
            this.positions[idx * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
            this.positions[idx * 3 + 2] = pos.z;

            this.velocities[idx].set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
        }
    }

    update(dt) {
        const positions = this.geometry.attributes.position.array;
        let active = false;

        for (let i = 0; i < this.maxParticles; i++) {
            if (this.life[i] > 0) {
                active = true;
                this.life[i] -= dt * 2.0; // Fade speed

                positions[i * 3] += this.velocities[i].x * dt;
                positions[i * 3 + 1] += this.velocities[i].y * dt;
                positions[i * 3 + 2] += this.velocities[i].z * dt;

                if (this.life[i] <= 0) {
                    positions[i * 3] = 9999; // Hide
                }
            }
        }

        if (active) {
            this.geometry.attributes.position.needsUpdate = true;
        }
    }
}
