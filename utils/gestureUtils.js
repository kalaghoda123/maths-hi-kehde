export class GestureInput {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        this.hands.onResults(this.onResults.bind(this));

        this.onGesture = null; // Callback
        this.currentLandmarks = null;
        this.lastGesture = "none";
        this.lastGestureTime = 0;
        this.frameCount = 0;
    }

    start() {
        // Use CameraUtils to set up the camera loop
        const camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 1280,
            height: 720
        });
        camera.start();
    }

    onResults(results) {
        // Ensure canvas resolution matches video source resolution for correct alignment
        if (this.canvas.width !== results.image.width || this.canvas.height !== results.image.height) {
            this.canvas.width = results.image.width;
            this.canvas.height = results.image.height;
        }

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Optimized: Don't redraw video on canvas. Video element is visible behind it.
        // this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.currentLandmarks = landmarks;

            // Cursor removed as requested

            // Clean Skeleton Drawing
            if (window.drawConnectors && window.drawLandmarks) {
                // Connectors (Bones)
                this.ctx.globalAlpha = 1.0;
                drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
                    color: '#00FFEA', // Bright Teal/Cyan
                    lineWidth: 1
                });

                // Landmarks (Joints)
                drawLandmarks(this.ctx, landmarks, {
                    color: '#00FFEA', // Teal/Cyan border
                    fillColor: '#FFFFFF', // White center
                    lineWidth: 1,
                    radius: 3
                });
                this.ctx.globalAlpha = 1.0;
            }

            // Analyze Gesture
            this.analyzeGesture(landmarks, results.multiHandedness[0].label);
        }
        this.ctx.restore();
    }

    analyzeGesture(landmarks, handLabel) {
        // Simple logic: count extended fingers
        const fingers = this.countFingers(landmarks, handLabel);

        let gesture = "unknown";

        if (fingers === 0) gesture = "fist";
        else if (fingers === 5) gesture = "open";
        else if (fingers === 1 && this.isFingerUp(landmarks, 8)) gesture = "pointing";
        else gesture = `count_${fingers}`;

        // Specialized Checks
        if (this.isThumbsUp(landmarks, handLabel)) gesture = "thumbs_up";
        if (this.isThumbsDown(landmarks, handLabel)) gesture = "thumbs_down";

        // Debounce / Stability check could be added here
        if (this.onGesture) {
            this.onGesture({
                gesture: gesture,
                count: fingers,
                landmarks: landmarks
            });
        }
    }

    countFingers(landmarks, handLabel) {
        let count = 0;
        // Tips IDs: 4, 8, 12, 16, 20
        // PIP IDs: 3, 6, 10, 14, 18 (Knuckles/PIP) - actually use MCP for thumb, PIP for others usually?

        // Thumb: 4 vs 3 or 2. Depending on hand.
        // If Right hand, Thumb is left of index. If tip.x < ip.x (closer to left edge) -> Extended? 
        // Let's use specific logic for thumb.
        if (this.isThumbUp(landmarks, handLabel)) {
            // count++; // Thumb is usually counted in "5", but for "numbers" we often count 1 as index.
            // Let's count it for now.
            count++;
        }

        // Fingers (8, 12, 16, 20)
        // Check if tip.y < pip.y (remember Y is inverted, 0 is top)
        if (landmarks[8].y < landmarks[6].y) count++;
        if (landmarks[12].y < landmarks[10].y) count++;
        if (landmarks[16].y < landmarks[14].y) count++;
        if (landmarks[20].y < landmarks[18].y) count++;

        return count;
    }

    isFingerUp(landmarks, tipIdx) {
        // Simple check: Tip above PIP
        // Only works for upright hand.
        return landmarks[tipIdx].y < landmarks[tipIdx - 2].y;
    }

    isThumbUp(landmarks, handLabel) {
        // Thumb tip 4, IP 3, MCP 2.
        // Check horizontal distance for simple extensions? 
        // Or check angle?
        // Simple check: if tip x is further away from pinky x than mcp x is.
        // Actually, simple "thumbs up" gesture (vertical thumb) check later.
        // For Counting (splayed hand), checking if thumb tip is "out" is hard. 
        // Let's use a simpler heuristic for generic "openness": distance from center of palm.
        // Landmarks 0, 5, 17 form palm base.

        // Let's stick to X-coordinate check relative to Handedness
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];

        if (handLabel === 'Right') {
            // Right hand, palm facing camera: Thumb is on Left side (X is smaller)
            return thumbTip.x < thumbIP.x;
        } else {
            // Left hand, palm facing camera: Thumb is on Right side (X is bigger)
            return thumbTip.x > thumbIP.x;
        }
    }

    isThumbsUp(landmarks, handLabel) {
        // Thumb pointing UP (y small), others curled.
        const thumbUp = landmarks[4].y < landmarks[3].y;
        const indexCurled = landmarks[8].y > landmarks[6].y;
        const middleCurled = landmarks[12].y > landmarks[10].y;
        // ...
        return thumbUp && indexCurled && middleCurled;
    }

    isThumbsDown(landmarks, handLabel) {
        // Thumb pointing DOWN (tip y > ip y)
        const thumbDown = landmarks[4].y > landmarks[3].y;
        const indexCurled = landmarks[8].y > landmarks[6].y;
        return thumbDown && indexCurled;
    }
}
