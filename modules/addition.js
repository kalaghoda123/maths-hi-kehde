import { playPositive, playEncouragement, speak } from '../utils/voiceFeedback.js';

export class AdditionGame {
    constructor(container, gestureInput) {
        this.container = container;
        this.gestureInput = gestureInput;
        this.num1 = 0;
        this.num2 = 0;
        this.correctAnswer = 0;
        this.active = false;
        this.cursorEl = null;

        // Level State
        this.level = 1;
        this.maxLevel = 5;
        this.score = 0;
        this.streak = 0; // Correct answers in a row
        this.requiredStreak = 5; // Needed to level up

        // Options State
        this.options = []; // { value, x, y, el, hoverFrames }
        this.WRAPPER_WIDTH = 0;
        this.WRAPPER_HEIGHT = 0;
        this.visualWrapper = null;
        this.boundResize = this.updateDimensions.bind(this);

        this.isProcessing = false;
    }

    updateDimensions() {
        if (this.visualWrapper) {
            const rect = this.visualWrapper.getBoundingClientRect();
            this.WRAPPER_WIDTH = rect.width;
            this.WRAPPER_HEIGHT = rect.height;
        }
    }

    start() {
        this.active = true;
        this.visualWrapper = document.getElementById('visual-wrapper');
        this.updateDimensions();
        window.addEventListener('resize', this.boundResize);

        this.container.innerHTML = `
            <!-- Left Panel: Stats -->
            <div class="hud-panel-left">
                <div class="hud-label">SCORE</div>
                <div id="score-display" class="hud-value" style="color: #95E1D3;">0</div>
                
                <div style="flex:1"></div>
                
                <div class="hud-label">Level</div>
                <div id="level-display" class="hud-value" style="color: #FFE66D;">1</div>
                
                <div style="flex:1"></div>
                
                <div class="hud-label">Streak</div>
                <div id="streak-bar" style="width: 100%; height: 10px; background: #555; border-radius: 5px; overflow: hidden; margin-top: 10px;">
                    <div id="streak-fill" style="width: 0%; height: 100%; background: #00E5FF; transition: width 0.3s;"></div>
                </div>
            </div>

            <!-- Top Area: Instructions -->
            <div class="hud-top">
                <div class="hud-instruction" id="equation-display">
                    <!-- Equation goes here -->
                </div>
            </div>

            <!-- Center: Game Area (Floating Bubbles) -->
            <div class="hud-center">
                <!-- Bubbles live here -->
            </div>

            <!-- Bottom: Feedback -->
            <div class="hud-bottom">
                <div id="answer-display">Touch the bubble!</div>
            </div>
            
            <!-- Right Panel: Controls -->
            <div class="hud-panel-right">
                <div class="hud-button" id="btn-camera" title="Toggle Camera">📷</div>
            </div>
        `;

        // Create Cursor Element
        this.cursorEl = document.createElement('div');
        this.cursorEl.className = 'virtual-cursor';
        this.cursorEl.style.display = 'none';
        this.visualWrapper.appendChild(this.cursorEl);

        speak("Use your finger to pop the correct bubble!");
        this.nextProblem();

        this.gestureInput.onGesture = (data) => this.handleInput(data);
    }

    stop() {
        this.active = false;
        this.gestureInput.onGesture = null;
        window.removeEventListener('resize', this.boundResize);
        this.clearOptions();
        if (this.cursorEl) {
            this.cursorEl.remove();
            this.cursorEl = null;
        }
        this.container.innerHTML = "";
    }

    clearOptions() {
        this.options.forEach(opt => opt.el.remove());
        this.options = [];
    }

    nextProblem() {
        this.clearOptions();

        // Difficulty Logic
        let min = 1;
        let max = 5;

        switch (this.level) {
            case 1: // Sum <= 10
                max = 5;
                break;
            case 2: // Sum <= 20
                min = 2; max = 10;
                break;
            case 3: // Sum <= 40
                min = 5; max = 20;
                break;
            case 4: // Sum <= 100
                min = 10; max = 50;
                break;
            case 5: // Sum <= 200
                min = 20; max = 100;
                break;
        }

        this.num1 = Math.floor(Math.random() * (max - min + 1)) + min;
        this.num2 = Math.floor(Math.random() * (max - min + 1)) + min;
        this.correctAnswer = this.num1 + this.num2;

        // Visual Representation
        // For Level 1 & 2, show icons. For higher levels, just numbers.
        let equationHTML = '';

        if (this.level <= 1) {
            const img = '🐟';
            const group1 = Array(this.num1).fill(img).join('');
            const group2 = Array(this.num2).fill(img).join('');
            equationHTML = `
                <div style="display: flex; gap: 10px; align-items: center; font-size: 1.5rem;">
                    <span>${this.num1}<br>${group1}</span>
                    <span>+</span>
                    <span>${this.num2}<br>${group2}</span>
                    <span>=</span>
                    <span id="user-guess" style="width: 50px; display: inline-block;">?</span>
                </div>
            `;
        } else {
            equationHTML = `
                <div style="display: flex; gap: 20px; align-items: center; font-size: 3rem;">
                    <span>${this.num1}</span>
                    <span>+</span>
                    <span>${this.num2}</span>
                    <span>=</span>
                    <span id="user-guess" style="width: 80px; display: inline-block;">?</span>
                </div>
            `;
        }

        this.container.querySelector('#equation-display').innerHTML = equationHTML;

        this.isProcessing = false;
        this.updateFeedback("Touch the answer!");
        this.createFloatingOptions();
        this.updateUI();
    }

    createFloatingOptions() {
        // Generate 3 answers based on difficulty
        const answers = [this.correctAnswer];

        // Distractor spread based on magnitude
        let spread = 5;
        if (this.level >= 3) spread = 10;
        if (this.level >= 4) spread = 20;

        while (answers.length < 3) {
            // Generate number close to correct answer
            const offset = Math.floor(Math.random() * (spread * 2)) - spread; // -spread to +spread
            const candidate = this.correctAnswer + offset;

            if (candidate > 0 && !answers.includes(candidate)) {
                answers.push(candidate);
            }
        }

        answers.sort(() => Math.random() - 0.5);

        // Position Logic (same as before)
        const positions = [0.2, 0.5, 0.8];

        answers.forEach((val, i) => {
            const el = document.createElement('div');
            el.className = 'floating-option';
            el.innerText = val;

            const baseX = positions[i];
            const jitterX = (Math.random() * 0.1) - 0.05;
            const finalX = (baseX + jitterX) * 100;
            const randomY = Math.floor(Math.random() * 40) + 30;

            el.style.left = `${finalX}%`;
            el.style.top = `${randomY}%`;
            el.style.animationDelay = `${Math.random()}s`;

            this.visualWrapper.appendChild(el);

            this.options.push({
                value: val,
                el: el,
                hoverFrames: 0
            });
        });
    }

    handleInput(data) {
        if (!this.active || this.isProcessing) return;

        const { landmarks } = data;

        if (landmarks && landmarks.length > 0) {
            const indexTip = landmarks[8];
            const xPct = 1 - indexTip.x;
            const yPct = indexTip.y;

            if (this.cursorEl) {
                this.cursorEl.style.display = 'block';
                this.cursorEl.style.left = `${xPct * 100}%`;
                this.cursorEl.style.top = `${yPct * 100}%`;
            }

            this.checkCollisions(xPct, yPct);
        } else {
            if (this.cursorEl) this.cursorEl.style.display = 'none';
        }
    }

    checkCollisions(cursorX, cursorY) {
        const cX = cursorX * this.WRAPPER_WIDTH;
        const cY = cursorY * this.WRAPPER_HEIGHT;

        this.options.forEach(opt => {
            const rect = opt.el.getBoundingClientRect();
            const wrapperRect = this.visualWrapper.getBoundingClientRect();

            const optX = (rect.left - wrapperRect.left) + rect.width / 2;
            const optY = (rect.top - wrapperRect.top) + rect.height / 2;

            const dist = Math.hypot(cX - optX, cY - optY);

            if (dist < 60) {
                opt.hoverFrames++;
                opt.el.classList.add('hovered');

                if (opt.hoverFrames > 15) { // Increased hold time slightly for stability
                    this.selectOption(opt);
                }
            } else {
                opt.hoverFrames = 0;
                opt.el.classList.remove('hovered');
            }
        });
    }

    selectOption(opt) {
        this.isProcessing = true;

        if (opt.value === this.correctAnswer) {
            // Correct
            opt.el.classList.add('correct');
            this.container.querySelector('#user-guess').innerText = opt.value;
            this.container.querySelector('#user-guess').style.color = 'green';

            this.score += 10 * this.level;
            this.streak++;

            let feedback = "Correct! 🎉";

            // Level Up Check
            if (this.streak >= this.requiredStreak) {
                if (this.level < this.maxLevel) {
                    this.level++;
                    this.streak = 0;
                    feedback = "LEVEL UP! 🌟";
                    playPositive(); // Play double sound or specialized one if available
                    setTimeout(() => playPositive(), 200);
                }
            } else {
                playPositive();
            }

            this.updateFeedback(feedback);
            this.updateUI();

            setTimeout(() => {
                if (this.active) this.nextProblem();
            }, 2000);

        } else {
            // Wrong
            speak("Try again!");
            this.updateFeedback("Oops! Try again.");
            opt.el.style.background = '#FF6B6B'; // Red
            opt.hoverFrames = 0;
            this.streak = 0; // Reset streak on error
            this.updateUI();

            setTimeout(() => {
                opt.el.style.background = 'white';
                this.isProcessing = false;
            }, 1000);
        }
    }

    updateUI() {
        const scoreEl = this.container.querySelector('#score-display');
        const levelEl = this.container.querySelector('#level-display');
        const streakFill = this.container.querySelector('#streak-fill');

        if (scoreEl) scoreEl.innerText = this.score;
        if (levelEl) levelEl.innerText = this.level;

        if (streakFill) {
            const pct = (this.streak / this.requiredStreak) * 100;
            streakFill.style.width = `${pct}%`;
        }
    }

    updateFeedback(msg) {
        const el = this.container.querySelector('#answer-display');
        if (el) el.innerText = msg;
    }
}
