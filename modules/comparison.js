import { playPositive, speak } from '../utils/voiceFeedback.js';

export class ComparisonGame {
    constructor(container, gestureInput) {
        this.container = container;
        this.gestureInput = gestureInput;
        this.active = false;
        this.leftCount = 0;
        this.rightCount = 0;
        this.processing = false;
    }

    start() {
        this.active = true;
        this.container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h2 style="font-size: 4rem; margin-bottom: 40px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Bigger or Smaller?</h2>
                
                <div style="display: flex; width: 90%; justify-content: center; align-items: center; gap: 40px;">
                    <div id="left-group" class="group-box">
                        <!-- Left Items -->
                    </div>
                    <div style="font-size: 5rem; font-weight: bold; color: #FFE66D; text-shadow: 2px 2px 0 #000;">VS</div>
                    <div id="right-group" class="group-box">
                        <!-- Right Items -->
                    </div>
                </div>
                
                <div style="margin-top: 50px; text-align: center;">
                    <div id="feedback-comp" style="font-size: 3rem; margin-bottom: 20px; color: white; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Which side has MORE?</div>
                    <div style="display: flex; gap: 100px; justify-content: center;">
                        <div style="text-align: center; color: white; font-size: 1.5rem;">
                            <span style="font-size: 4rem;">👍</span><br>
                            Left
                        </div>
                        <div style="text-align: center; color: white; font-size: 1.5rem;">
                            <span style="font-size: 4rem;">👎</span><br>
                            Right
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.nextRound();
        this.gestureInput.onGesture = (data) => this.handleInput(data);
    }

    stop() {
        this.active = false;
        this.gestureInput.onGesture = null;
        this.container.innerHTML = "";
    }

    nextRound() {
        this.leftCount = Math.floor(Math.random() * 9) + 1; // 1-10
        do {
            this.rightCount = Math.floor(Math.random() * 9) + 1;
        } while (this.rightCount === this.leftCount);

        const item = '🐘';

        const leftHTML = Array(this.leftCount).fill(item).join(' '); // Wrapping?
        const rightHTML = Array(this.rightCount).fill(item).join(' ');

        // Styling for groups
        const boxStyle = "display: flex; justify-content: center; align-items: center; flex-wrap: wrap; align-content: center; border: 5px solid white; border-radius: 30px; width: 350px; height: 350px; font-size: 4rem; background: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 30px rgba(0,0,0,0.3);";

        this.container.querySelector('#left-group').innerHTML = leftHTML;
        this.container.querySelector('#left-group').style.cssText = boxStyle;

        this.container.querySelector('#right-group').innerHTML = rightHTML;
        this.container.querySelector('#right-group').style.cssText = boxStyle;

        this.container.querySelector('#feedback-comp').innerText = "Which side has MORE?";
        speak("Which group is bigger? Show thumbs up for Left, thumbs down for Right.");
        this.processing = false;
    }

    handleInput(data) {
        if (!this.active || this.processing) return;

        const { gesture } = data;

        let choice = null;
        if (gesture === 'thumbs_up') choice = 'left';
        if (gesture === 'thumbs_down') choice = 'right';

        if (choice) {
            this.checkAnswer(choice);
        }
    }

    checkAnswer(choice) {
        this.processing = true;
        const correct = (this.leftCount > this.rightCount) ? 'left' : 'right';

        if (choice === correct) {
            this.container.querySelector('#feedback-comp').innerText = "Correct! You got it!";
            this.container.querySelector(`#${choice}-group`).style.borderColor = 'green';
            this.container.querySelector(`#${choice}-group`).style.backgroundColor = '#e6fffa';
            playPositive();
            setTimeout(() => {
                if (this.active) this.nextRound();
            }, 3000);
        } else {
            this.container.querySelector('#feedback-comp').innerText = "Hmm, count again!";
            speak("Look carefully, which one has more?");
            setTimeout(() => {
                if (this.active) {
                    this.processing = false;
                    this.container.querySelector('#feedback-comp').innerText = "Which side has MORE?";
                }
            }, 2000);
        }
    }
}
