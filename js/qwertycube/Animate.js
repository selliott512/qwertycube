"use strict";

// Globals

var animation = true;
var animationLimit = 2;
var animateNeeded = false;
var animationRequested = false;
var aspectRatio = 0.0;
var camera;
var cameraAdjusting = false;
var cameraLocation = [470, 470, 470];
var cameraControls;
var canvasHeight = 0;
var canvasWidth = 0;
var cubies = [];
var dispHelp = true;
var dispOrientationLabels = false;
var moveCurrent = "";
var moveHistory = [];
var moveHistoryNext = 0;
var moveHistoryNextLast = -1; // Not set
var moveQueue = [];
var moveRadMsec = 0.0;
var moveSec = 10.0;
var moveStartMsec = 0;
var rendered = false;
var renderer;
var scene;
var statusDisplayed = false;
var statusSecs = 5.0;
var statusTimeMSec = 0;
var text = [];
var timer = false;
var timerFrameNext = 0;
var timerInspectionSecs = 15;
var timerSolved;
var timerStart = Date.now();
var timerState = "solve";

// The following lookup tables should be kept in sync and in alphabetical order
// by key.
var eventToRotation = {
    B : [ "+", "z", -1, -1 ],
    D : [ "+", "y", -1, -1 ],
    E : [ "+", "y", 0, 0 ],
    F : [ "-", "z", 1, 1 ],
    L : [ "+", "x", -1, -1 ],
    M : [ "+", "x", 0, 0 ],
    R : [ "-", "x", 1, 1 ],
    S : [ "-", "z", 0, 0 ],
    U : [ "-", "y", 1, 1 ],
    X : [ "-", "x", -1, 1 ],
    Y : [ "-", "y", -1, 1 ],
    Z : [ "-", "z", -1, 1 ]
};

// Public methods

function animateCondReq(needed) {
    animateNeeded = needed;

    // This method requests that doAnimate() be called next frame if need be.
    if ((!animationRequested) && (animateNeeded || moveCurrent ||
            moveQueue.length || statusDisplayed || cameraAdjusting || timer)) {
        window.requestAnimationFrame(doAnimate);
        animationRequested = true;
    }
}

function animateResetScene() {
    // Remove the existing cubies.
    for (var i = 0; i < cubies.length; i++) {
        scene.remove(cubies[i]);
    }

    // Create a new list of cubies.
    cubies.length = 0;
    cubies = new cubiesCreate();
    for (var i = 0; i < cubies.length; i++) {
        scene.add(cubies[i]);
    }
}

// Code that is common it init and resize events.
function animateResize() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    renderer.setSize(canvasWidth, canvasHeight);
    aspectRatio = canvasWidth / canvasHeight;
    if (camera) {
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
    }

    // Position the help dialog.
    var helpLeft = (canvasWidth - helpEl.clientWidth) / 2.0;
    if (helpLeft < 0.0) {
        helpLeft = 0.0;
    }
    helpEl.style.left = helpLeft + "px";
    var helpTop = (canvasHeight - helpEl.clientHeight) / 2.0;
    if (helpTop < 0.0) {
        helpTop = 0.0;
    }
    helpEl.style.top = helpTop + "px";

    infoResize();
}

function animateNewCube() {
    moveCurrent = null;
    moveQueue.length = 0;
    moveHistory.length = 0;
    moveHistoryNext = 0;
    rotateEnd();
    animateResetScene();
    timerState = "solve";
    timerStart = Date.now();
    animateCondReq(true);
}

function animateSetCamera() {
    if (!camera) {
        camera = new THREE.PerspectiveCamera(45, aspectRatio, 100, 1000);
    }
    camera.position.set(cameraLocation[0], cameraLocation[1], cameraLocation[2]);
}

function animateUpdateStatus(message) {
    if (message) {
        console.log(message);

        // Prevent wrapping prior to the message being displayed since it
        // messes up the centering.
        statusEl.style.left = "0px";

        // A new message. Write it with full opacity.
        statusEl.innerHTML = message;
        statusTimeMSec = Date.now();
        statusEl.style.opacity = 1.0;

        // Position the status dialog.
        var statusLeft = (canvasWidth - statusEl.clientWidth) / 2.0;
        if (statusLeft < 0.0) {
            statusLeft = 0.0;
        }
        statusEl.style.left = statusLeft + "px";
        statusEl.style.top = "0px";

        statusDisplayed = true;
        animateCondReq(true);
    } else if (statusDisplayed) {
        // Fade the existing message.
        var opacity = 1.0 - (Date.now() - statusTimeMSec)
                / (400.0 * statusSecs);
        if (opacity < 0.0) {
            opacity = 0.0;
            statusDisplayed = false;
        }
        statusEl.style.opacity = opacity;
    }
}

function animateUpdateTimer() {
    if (timer) {
        // Prevent wrapping prior to the message being displayed since it
        // messes up the centering.
        timerEl.style.left = "0px";
        timerEl.style.opacity = 1.0;

        if (timerState == "inspect") {
            timerEl.style.backgroundColor = "#ff8080";
            var elapsedMsec = (1000 * timerInspectionSecs)
                    - (Date.now() - timerStart);
            if (elapsedMsec <= 0) {
                // If they ran out of inspection time switch to solve and get
                // the next animation.
                timerState = "solve";
                timerStart = Date.now();
                return;
            }
        } else if (timerState == "scramble") {
            timerEl.style.backgroundColor = "#808080";
            var elapsedMsec = null;
        } else if (timerState == "solve") {
            timerEl.style.backgroundColor = "#80ff80";
            var elapsedMsec = Date.now() - timerStart;
        } else if (timerState == "solved") {
            timerEl.style.backgroundColor = "#ffff80";
            var elapsedMsec = timerSolved - timerStart;
        } else {
            timerEl.style.backgroundColor = "#ff80ff";
            // Unknown timerState.  This should not happen.
            animateUpdateStatus("Unknown timerState \"" + timerState + "\"");
            var elapsedMsec = -1;
        }
        timerEl.innerHTML = elapsedMsecToStr(elapsedMsec)

        // Position the timer dialog.
        var timerLeft = (canvasWidth - timerEl.clientWidth) / 2.0;
        if (timerLeft < 0.0) {
            timerLeft = 0.0;
        }
        timerEl.style.left = timerLeft + "px";
        timerEl.style.top = (canvasHeight - timerEl.offsetHeight) + "px";
    } else {
        timerEl.style.opacity = 0.0;
    }
}

// Private methods

function doAnimate() {
    // Animation not requested since starting this animation frame.
    animationRequested = false;

    // If only the timer is displayed then much of the animation code can be
    // bypassed. Also, the frame rate can be reduced saving CPU.
    var timerOnly = timer
            && !(animateNeeded || moveCurrent || moveQueue.length
                    || statusDisplayed || cameraAdjusting);

    if (!timerOnly) {
        // Something other than the timer needs to be updated.
        cameraControls.update();
        var endMove = false;

        // Display or hide the orientation labels.
        textSetVisible(dispOrientationLabels);

        if (!moveCurrent) {
            moveCurrent = moveQueue.shift();
            if (moveCurrent) {
                // A new move. Prepare the cubies to be rotated.
                rotateBegin(moveCurrent);
                if (animation) {
                    moveStartMsec = Date.now();
                }
                // Start the timer if it was inspection.
                if ((timerState == "inspect") && !rotateFullCube) {
                    timerState = "solve";
                    timerStart = Date.now();
                }
            }
        }

        if (moveCurrent) {
            // Apply the next animation step to the prepared cubies.
            // angleMax and angleGoal are always positive - the absolute value
            // of the actual angle.
            var angleMax = rotateDouble ? Math.PI : Math.PI / 2.0;
            if (animation && (moveQueue.length <= animationLimit)) {
                var elapsedMsec = Date.now() - moveStartMsec;
                var angleGoal = elapsedMsec * moveRadMsec;
                if (angleGoal >= angleMax) {
                    angleGoal = angleMax;
                    endMove = true;
                }
            } else {
                var angleGoal = angleMax;
                endMove = true;
            }
            pivot.rotation[rotateAxis] = rotateSign * angleGoal;
        }

        renderer.render(scene, camera);
        rendered = true; // True if rendering has been done at least once.

        if (endMove) {
            moveCurrent = null;
            rotateEnd();
            if (!moveQueue.length) {
                if (timerState == "scramble") {
                    // If the last move of the scramble was made then begin the
                    // inspection phase.
                    timerState = "inspect";
                    timerStart = Date.now();
                } else if (timerState == "solve") {
                    if (cubiesSolved()) {
                        timerState = "solved";
                        timerSolved = Date.now();
                    }
                }
                // We're done replaying moves.
                moveHistoryNextLast = -1;
            }
        }
        animateUpdateStatus(null);
        animateUpdateTimer();
    } else {
        // Only the timer needs to be updated.
        var now = Date.now();
        if (now >= timerFrameNext) {
            animateUpdateTimer();
            // If way behind then skip ahead.
            if ((now - timerFrameNext) >= 500) {
                timerFrameNext = now;
            }
            while (now >= timerFrameNext) {
                timerFrameNext += 100;
            }
        }
    }

    animateCondReq(false);
}
