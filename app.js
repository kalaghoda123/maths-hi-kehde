import { GestureInput } from './utils/gestureUtils.js';
import { CountingGame } from './modules/counting.js';
import { AdditionGame } from './modules/addition.js';
import { ShapeGame } from './modules/shapes.js';
import { ComparisonGame } from './modules/comparison.js';

class App {
    constructor() {
        this.video = document.getElementById('input_video');
        this.canvas = document.getElementById('output_canvas');

        this.gestureInput = new GestureInput(this.video, this.canvas);

        this.currentGame = null;

        this.initUI();
        this.startCamera();
    }

    startCamera() {
        // Handle camera permission and starting
        this.gestureInput.start();

        // Update status for debugging or loading
        const statusEl = document.getElementById('camera-status');
        // We assume MediaPipe loads nicely. 
        // Monitor video playing event
        this.video.addEventListener('playing', () => {
            statusEl.innerText = "📷 Camera: OK";
            statusEl.style.color = "green";
        });
    }

    initUI() {
        // Menu Clicks
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const moduleName = card.dataset.module;
                this.launchGame(moduleName);
            });
        });

        // Back Button
        document.getElementById('back-home-btn').addEventListener('click', () => {
            this.goHome();
        });
    }

    launchGame(moduleName) {
        // Hide Menu
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('active-screen');

        // Show Back Button
        document.getElementById('back-home-btn').classList.remove('hidden');

        // Initialize Module
        const container = document.getElementById(`${moduleName}-game`);
        container.classList.remove('hidden');
        container.classList.add('active-screen');

        this.stopCurrentGame();

        switch (moduleName) {
            case 'counting':
                this.currentGame = new CountingGame(container, this.gestureInput);
                break;
            case 'addition':
                this.currentGame = new AdditionGame(container, this.gestureInput);
                break;
            case 'shapes':
                this.currentGame = new ShapeGame(container, this.gestureInput);
                break;
            case 'comparison':
                this.currentGame = new ComparisonGame(container, this.gestureInput);
                break;
        }

        if (this.currentGame) {
            this.currentGame.start();
        }
    }

    goHome() {
        this.stopCurrentGame();

        // Hide all games
        document.querySelectorAll('.game-screen').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active-screen');
        });

        document.getElementById('back-home-btn').classList.add('hidden');

        // Show Menu
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('menu-screen').classList.add('active-screen');
    }

    stopCurrentGame() {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
    }
}

// Start App when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    // Expose for debugging
    window.app = app;
});
