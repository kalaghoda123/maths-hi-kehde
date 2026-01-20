import { playPositive, playEncouragement, speak } from '../utils/voiceFeedback.js';

export class CountingGame {
    constructor(container, gestureInput) {
        this.container = container;
        this.gestureInput = gestureInput;
        this.targetNumber = 0;
        this.active = false;
        this.score = 0;
        this.items = ['🎈', '🍎', '🐶', '🍕', '⭐', '🚗'];
    }

    start() {
        this.active = true;
        this.score = 0;
        this.container.innerHTML = `
            <div class="game-top-bar" style="position: absolute; top: 20px; right: 20px; pointer-events: none;">
                <h2 style="margin: 0; display:none;">Finger Counting Game</h2>
                <div id="score-display" style="font-size: 2rem; color: #FF6B6B; font-family: 'Fredoka One', cursive; text-shadow: 2px 2px 0 #fff;">Score: 0</div>
            </div>
            
            <div id="question-area" style="
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%); 
                font-size: 8rem; 
                text-shadow: 0 4px 10px rgba(0,0,0,0.3);
                font-family: 'Comic Neue', cursive;
                width: 100%;
                text-align: center;
                pointer-events: none;
            ">
                <!-- Objects will appear here -->
            </div>
            
            <div class="game-bottom-bar" style="position: absolute; bottom: 40px; width: 100%; text-align: center; pointer-events: none;">
                <div id="feedback-area" style="font-size: 2.5rem; color: white; text-shadow: 2px 2px 4px #000; font-family: 'Fredoka One', cursive;">Show me the number!</div>
            </div>
        `;

        speak("Let's count! Show me with your fingers how many items you see.");
        this.nextRound();

        // Hook into gestures
        this.gestureInput.onGesture = (data) => this.handleInput(data);
    }

    stop() {
        this.active = false;
        this.gestureInput.onGesture = null;
        this.container.innerHTML = "";
    }

    nextRound() {
        if (!this.active) return;

        this.targetNumber = Math.floor(Math.random() * 5) + 1; // Start with 1-5
        const item = this.items[Math.floor(Math.random() * this.items.length)];

        const content = Array(this.targetNumber).fill(item).join(' ');

        const qArea = this.container.querySelector('#question-area');
        qArea.innerHTML = `<div class="fade-in">${content}</div>`;
        this.container.querySelector('#feedback-area').innerText = "Show me the number!";
    }

    handleInput(data) {
        if (!this.active) return;

        const count = data.count;

        // Stability Check
        if (count === this.targetNumber) {
            if (!this.holdStartTime) {
                this.holdStartTime = Date.now();
            } else {
                const elapsed = Date.now() - this.holdStartTime;
                if (elapsed > 1000) { // Hold for 1 second
                    this.handleSuccess();
                    this.holdStartTime = null; // Reset
                }
            }
        } else {
            this.holdStartTime = null;
        }
    }

    handleSuccess() {
        if (!this.active) return;

        // Debounce to prevent multiple triggers
        if (this.processingSuccess) return;
        this.processingSuccess = true;

        const qArea = this.container.querySelector('#question-area');
        qArea.innerHTML += ` <span style="color:green">✔</span>`; // Visual feedback
        this.container.querySelector('#feedback-area').innerText = `Yes! It is ${this.targetNumber}!`;

        playPositive(); // Voice feedback specific phrase

        // Confetti or visual flair could go here

        this.score++;
        this.container.querySelector('#score-display').innerText = `Score: ${this.score} `;

        setTimeout(() => {
            if (this.active) {
                this.processingSuccess = false;
                this.nextRound();
            }
        }, 3000);
    }
}
