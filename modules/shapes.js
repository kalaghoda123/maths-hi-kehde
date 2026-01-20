import * as THREE from 'three';
import { ParticleSystem } from './Particles.js';
import { AudioController } from './Audio.js';
import { STROKES, getInterpolatedStroke } from './StrokeData.js';

const CONFIG = {
    colorParams: {
        r: 1.0, g: 0.2, b: 0.6
    },
    successColor: 0x00ff00,
    checkRadius: 1.5,
    guideRadius: 0.08,
    pipeRadius: 0.4
};

export class ShapeGame {
    constructor(container, gestureInput) {
        this.container = container;
        this.gestureInput = gestureInput;
        this.active = false;

        this.clock = new THREE.Clock();
        this.shapes = ["CIRCLE", "SQUARE", "TRIANGLE"];
        this.currentShapeIndex = 0;
        this.state = 'INIT_SHAPE';

        this.audio = new AudioController();

        // Scene, Camera, Renderer will be initialized in start
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;

        this.targetMesh = null;
        this.userMeshes = [];

        this.handPos = new THREE.Vector3(0, 0, 0);
        this.isHandDetected = false;

        this.targetPoints = [];
        this.nextPointIndex = 0;

        this.resizeHandler = this.onResize.bind(this);
        this.animate = this.animate.bind(this);
    }

    start() {
        this.active = true;
        this.container.innerHTML = `
             <div class="game-top-bar" style="position: absolute; top: 120px; left:0; width:100%; text-align:center; z-index:10; pointer-events:none;">
                <h2 style="color:white; font-family: 'Fredoka One', cursive; font-size: 3rem; margin: 0; text-shadow: 2px 2px 0px #FF6B6B, -1px -1px 0 #000;">Shape Magic</h2>
                <div id="instruction-display" style="font-size: 2.5rem; color: #FFE66D; font-family: 'Comic Neue', cursive; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin-top: 10px;"></div>
            </div>
            <div id="three-container" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
        `;

        this.initScene();
        this.particles = new ParticleSystem(this.scene, 0xff0088);

        // Hook up gesture input
        this.gestureInput.onGesture = (data) => this.handleHandInput(data);

        this.setupNextShape();

        window.addEventListener('resize', this.resizeHandler);

        // Start Loop
        this.animate();
    }

    stop() {
        this.active = false;
        window.removeEventListener('resize', this.resizeHandler);
        this.gestureInput.onGesture = null;

        // Cleanup Three.js
        if (this.renderer) {
            this.renderer.dispose();
            this.container.innerHTML = '';
        }
    }

    initScene() {
        const wrapper = this.container.querySelector('#three-container');

        this.scene = new THREE.Scene();
        // Transparent background to show video feed behind? 
        // User's code says "this.renderer.setClearColor(0x000000, 0);" which implies transparency.

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 10;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / - 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / - 2,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0); // Transparent

        wrapper.appendChild(this.renderer.domElement);
    }

    handleHandInput(data) {
        if (!this.active) return;

        const { landmarks } = data;

        if (landmarks && landmarks.length > 0) {
            this.isHandDetected = true;
            const indexTip = landmarks[8];

            // Map 0..1 to World Coordinates
            // Orthographic Height = 10 (frustumSize)
            // Width = 10 * Aspect
            const frustumHeight = 10;
            const frustumWidth = frustumHeight * (window.innerWidth / window.innerHeight);

            // Note: MediaPipe x is 0(left) to 1(right). y is 0(top) to 1(bottom).
            // Three.js: 0,0 is center. y is up.
            // x: (tip.x - 0.5) * Width
            // y: -(tip.y - 0.5) * Height

            // Check for Mirroring: Usually front cam is mirrored.
            // If mirrored, x should be inverted? 
            // In App.js, we saw scaleX(-1) on canvas. Here we deal with 3D space.
            // If we assume the video feed is mirrored visually, users move right, expecting cursor to go right.
            // Typically MediaPipe Output: Left in image is Right of user.
            // Calibration Fix: Mirror the X coordinate (1 - x) to match the CSS scaleX(-1) video
            const rawX = 1 - indexTip.x;
            const rawY = indexTip.y;

            const targetX = (rawX - 0.5) * frustumWidth;
            const targetY = -(rawY - 0.5) * frustumHeight;

            // Lerp for smoothness
            const targetPos = new THREE.Vector3(targetX, targetY, 0);
            this.handPos.lerp(targetPos, 0.4);

        } else {
            this.isHandDetected = false;
        }
    }

    setupNextShape() {
        this.state = 'TRACING';
        const shapeName = this.shapes[this.currentShapeIndex];

        this.cleanupStrokes();

        const instr = this.container.querySelector('#instruction-display');
        if (instr) instr.innerText = `Trace the ${shapeName}!`;

        this.audio.speak(`Let's draw a ${shapeName}!`);

        const shapeData = STROKES[shapeName];
        if (!shapeData) return;

        this.currentStrokeData = shapeData; // array of strokes
        this.currentStrokeIdx = 0;
        this.setupStroke(0);
    }

    cleanupStrokes() {
        if (this.guideContainer) {
            this.scene.remove(this.guideContainer);
            this.guideContainer.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
            });
            this.guideContainer = null;
        }
        if (this.targetMesh) {
            // Fallback for any loose mesh, though guideContainer should handle it
            this.scene.remove(this.targetMesh);
            if (this.targetMesh.geometry) this.targetMesh.geometry.dispose();
            this.targetMesh = null;
        }
        this.userMeshes.forEach(m => {
            this.scene.remove(m);
            m.geometry.dispose();
        });
        this.userMeshes = [];
    }

    setupStroke(index) {
        if (index >= this.currentStrokeData.length) {
            this.onShapeComplete();
            return;
        }

        if (this.targetMesh) {
            this.scene.remove(this.targetMesh);
            this.targetMesh.geometry.dispose();
            this.targetMesh = null;
        }

        const rawPoints = this.currentStrokeData[index];
        const scale = 3.5; // Scale up unit shapes
        const center = new THREE.Vector3(0, 0, 0);

        const worldPoints = rawPoints.map(p => p.clone().multiplyScalar(scale).add(center));

        // 1. Create Outline Guide
        const shapeName = this.shapes[this.currentShapeIndex];
        const isSharp = shapeName === 'SQUARE' || shapeName === 'TRIANGLE';

        // We'll use a container for the guide to handle both single meshes and groups
        this.guideContainer = new THREE.Group();
        this.scene.add(this.guideContainer);

        if (isSharp) {
            // -- LOGIC FOR SHARP SHAPES --

            // A. Generate Target Points (Linear Interpolation)
            this.targetPoints = [];
            const segments = worldPoints.length - 1;
            const pointsPerSegment = Math.floor(100 / segments);

            for (let i = 0; i < segments; i++) {
                const start = worldPoints[i];
                const end = worldPoints[i + 1];
                for (let j = 0; j < pointsPerSegment; j++) {
                    const alpha = j / pointsPerSegment;
                    this.targetPoints.push(start.clone().lerp(end, alpha));
                }
            }
            // Add final point
            this.targetPoints.push(worldPoints[worldPoints.length - 1]);

            // B. Build Visual Guide (Cylinders + Spheres)
            const material = new THREE.MeshBasicMaterial({
                color: 0x00E5FF,
                opacity: 0.3,
                transparent: true
            });

            for (let i = 0; i < segments; i++) {
                const start = worldPoints[i];
                const end = worldPoints[i + 1];

                // Cylinder Edge
                const dist = start.distanceTo(end);
                const mid = start.clone().add(end).multiplyScalar(0.5);
                const cylGeom = new THREE.CylinderGeometry(CONFIG.guideRadius, CONFIG.guideRadius, dist, 32);
                const cyl = new THREE.Mesh(cylGeom, material);
                cyl.position.copy(mid);
                cyl.lookAt(end);
                cyl.rotateX(Math.PI / 2);
                this.guideContainer.add(cyl);

                // Corner Sphere (at start of segment)
                const sphGeom = new THREE.SphereGeometry(CONFIG.guideRadius, 16, 16);
                const sph = new THREE.Mesh(sphGeom, material);
                sph.position.copy(start);
                this.guideContainer.add(sph);
            }
            // Final Corner
            // Reuse Sphere Geometry/Material? (For simplicity new instance)
            const sphGeom = new THREE.SphereGeometry(CONFIG.guideRadius, 16, 16);
            const sph = new THREE.Mesh(sphGeom, material);
            sph.position.copy(worldPoints[segments]); // last point
            this.guideContainer.add(sph);

        } else {
            // -- LOGIC FOR CURVED SHAPES (CIRCLE) --
            this.targetPoints = getInterpolatedStroke(worldPoints, 40);
            const curve = new THREE.CatmullRomCurve3(this.targetPoints, true);
            const tubeGeom = new THREE.TubeGeometry(curve, 64, CONFIG.guideRadius, 8, false);
            const tubeMat = new THREE.MeshBasicMaterial({
                color: 0x00E5FF,
                opacity: 0.3,
                transparent: true
            });
            this.targetMesh = new THREE.Mesh(tubeGeom, tubeMat);
            this.guideContainer.add(this.targetMesh);
        }

        this.nextPointIndex = 1;
        this.audio.playSparkle();

        // Start User Mesh
        this.addPipeSphere(this.targetPoints[0]);
    }

    addPipeSphere(pos) {
        const geom = new THREE.SphereGeometry(CONFIG.pipeRadius, 32, 16);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x00E5FF, // Electric Blue
            emissive: 0x0055AA,
            emissiveIntensity: 0.5,
            specular: 0xffffff,
            shininess: 50
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(pos);
        this.scene.add(mesh);
        this.userMeshes.push(mesh);
    }

    addPipeSegment(p1, p2) {
        const v1 = new THREE.Vector3(p1.x, p1.y, 0);
        const v2 = new THREE.Vector3(p2.x, p2.y, 0);
        const dist = v1.distanceTo(v2);

        // Halfway point
        const mid = v1.clone().add(v2).multiplyScalar(0.5);

        const geom = new THREE.CylinderGeometry(CONFIG.pipeRadius, CONFIG.pipeRadius, dist, 32);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x00E5FF, // Electric Blue
            emissive: 0x0055AA,
            emissiveIntensity: 0.5,
            specular: 0xffffff,
            shininess: 50
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(mid);
        mesh.lookAt(v2);
        mesh.rotateX(Math.PI / 2);

        this.scene.add(mesh);
        this.userMeshes.push(mesh);

        // Joint
        this.addPipeSphere(p2);
    }

    checkTracing() {
        if (!this.active || !this.isHandDetected || this.state !== 'TRACING') return;

        if (this.nextPointIndex < this.targetPoints.length) {
            const target = this.targetPoints[this.nextPointIndex];
            const prev = this.targetPoints[this.nextPointIndex - 1];

            // 2D Distance check (ignore Z)
            const dist = new THREE.Vector2(this.handPos.x, this.handPos.y)
                .distanceTo(new THREE.Vector2(target.x, target.y));

            // Emit particles at hand pos
            this.particles.emit(this.handPos, 2);

            if (dist < CONFIG.checkRadius) {
                // Success for this segment
                this.addPipeSegment(prev, target);
                this.nextPointIndex++;
            }
        } else {
            // Stroke Complete
            this.currentStrokeIdx++;
            this.setupStroke(this.currentStrokeIdx);
        }
    }

    onShapeComplete() {
        const shapeName = this.shapes[this.currentShapeIndex];
        this.state = 'SUCCESS';
        this.audio.playSuccess();
        this.audio.speak(`Amazing! You drew a ${shapeName}!`);

        const instr = this.container.querySelector('#instruction-display');
        if (instr) instr.innerText = `Amazing!`;

        // Celebration Particles
        for (let i = 0; i < 50; i++) {
            const rPos = new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 0);
            this.particles.emit(rPos, 5);
        }

        setTimeout(() => {
            this.currentShapeIndex = (this.currentShapeIndex + 1) % this.shapes.length;
            this.setupNextShape();
        }, 3000);
    }

    animate() {
        if (!this.active) return;
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();

        this.checkTracing();
        if (this.particles) this.particles.update(delta);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;

        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 10;

        this.camera.left = - frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = - frustumSize / 2;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
