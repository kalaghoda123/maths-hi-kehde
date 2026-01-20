import { playPositive, speak } from '../utils/voiceFeedback.js';

export class AudioController {
    constructor() {
        this.synth = window.speechSynthesis;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    }

    speak(text) {
        speak(text);
    }

    playSuccess() {
        playPositive();
        this.playTone(600, 0.1, 'sine');
        setTimeout(() => this.playTone(800, 0.2, 'sine'), 100);
    }

    playSparkle() {
        // Simple random high pitch tones
        const freq = 800 + Math.random() * 400;
        this.playTone(freq, 0.05, 'triangle');
    }

    playTone(freq, duration, type = 'sine') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.frequency.value = freq;
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.context.currentTime + duration);
        osc.stop(this.context.currentTime + duration);
    }
}
