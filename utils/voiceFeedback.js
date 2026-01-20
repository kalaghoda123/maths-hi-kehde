const synth = window.speechSynthesis;
const voices = [];

// Try to load voices
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        // Populate voices if needed
    };
}

const positivePhrases = [
    "Great job!", 
    "You did it!", 
    "Amazing!", 
    "Super cool!", 
    "That is correct!",
    "Wow, you are smart!"
];

const tryAgainPhrases = [
    "Nice try, let's try again!",
    "Almost there!",
    "Give it another go!"
];

export function speak(text) {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to pick a friendly voice (usually typically high pitch female or child if available)
    // For now, default is fine, we adjust pitch/rate.
    utterance.pitch = 1.2; // Slightly higher pitch
    utterance.rate = 0.9; // Slightly slower
    synth.speak(utterance);
}

export function playPositive() {
    const text = positivePhrases[Math.floor(Math.random() * positivePhrases.length)];
    speak(text);
}

export function playEncouragement() {
    const text = tryAgainPhrases[Math.floor(Math.random() * tryAgainPhrases.length)];
    speak(text);
}
