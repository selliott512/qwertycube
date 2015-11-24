"use strict";

// Globals

var animation = true;
var animationLimit = 2;
var animateNeeded = false;
var animationRequested = false;
var aspectRatio = 0.0;
var buttonBarHeight = 0;
var camera;
var cameraAdjusting = false;
var cameraLocation = [470, 470, 470];
var cameraRadius;
var canvasHeight = 0;
var canvasMin = 0;
var canvasWidth = 0;
var cubies = [];
var dispHelp = false;
var dispOrientationLabels = false;
var fov = 0.0;
var moveCurrent = "";
var moveHistory = [];
var moveHistoryNext = 0;
var moveHistoryNextLast = -1; // Not set
var moveQueue = [];
var moveRadMsec = 0.0;
var moveSec = 10.0;
var moveStartMsec = 0;
var orbitControls;
var rendered = false;
var renderer;
var rotationCurrent = null;
var rotationQueue = [];
var scene;
var statusDisplayed = false;
var statusSecs = 3.0;
var statusSecsPerChar = 0.05;
var statusTimeMSec = 0;
var text = [];
var timer = false;
var timerFrameNext = 0;
var timerInspectionSecs = 15;
var timerSolved;
var timerStart = Date.now();
var timerState = "solve";
var wireframeSphere = false;
var wireframeSphereMesh;

// Public methods

function animateClearStatus() {
    if (statusDisplayed) {
        statusEl.innerHTML = "";
        statusEl.style.opacity = 0.0;
        statusDisplayed = false;
    }
}

function animateCondReq(needed) {
    animateNeeded = needed;

    // This method requests that doAnimate() be called next frame if need be.
    if ((!animationRequested)
            && (animateNeeded || moveCurrent || moveQueue.length
                    || statusDisplayed || cameraAdjusting || timer)) {
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

    // Enclose the cube in a wireframe sphere.
    animateWireframeSphere(wireframeSphere);
}

// Code that is common it init and resize events.
function animateResize() {
    canvasWidth = window.innerWidth;
    // The closest mobile phones get to being square in portrait mode is
    // 3:4. Allow the lower fourth of the screen for the button bar. Any more
    // would reduce the space available for the cube. It's assumed that people
    // won't use this on their phones in landscape mode much since there's no
    // reason to. For non-mobile mice the screen is bigger and mice are more
    // precise pointers, so less space.
    buttonBarHeight = Math.floor((mobile ? 0.2 : 0.03333) * window.innerHeight);
    buttonBarEl.style.height = buttonBarHeight + "px";
    containerEl.style.height = (window.innerHeight - buttonBarHeight) + "px";
    canvasHeight = containerEl.clientHeight;
    canvasMin = Math.min(canvasWidth, canvasHeight);
    renderer.setSize(canvasWidth, canvasHeight);
    aspectRatio = canvasWidth / canvasHeight;
    console.log("Resize to " + canvasWidth + ", " + canvasHeight
            + " aspect ratio " + Math.floor(1000 * aspectRatio) / 1000);
    if (aspectRatio >= 1.0) {
        // Simple case.
        var sin = cubiesRadius / cameraRadius;
        var angle = Math.asin(sin);
    } else {
        // In this case the aspect ratio scales the tangent.
        var tan = Math.sqrt((cubiesRadius * cubiesRadius)
                / (cameraRadius * cameraRadius - cubiesRadius * cubiesRadius));
        tan /= aspectRatio;
        var angle = Math.atan(tan);
    }
    fov = (180.0 / Math.PI) * (2.0 * angle);
    if (camera) {
        camera.aspect = aspectRatio;
        camera.fov = fov;
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

    initAddUpdateButtons(settingsDisplayed ? settingsButtonList
            : mainButtonList);

    settingsResize();

    if (helpDisplayed) {
        showHelp(true);
    }
}

function animateNewCube() {
    moveCurrent = null;
    clearMoveQueue();
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
        camera = new THREE.PerspectiveCamera(fov, aspectRatio, 100, 1000);
    }
    camera.position
            .set(cameraLocation[0], cameraLocation[1], cameraLocation[2]);
    console.log("Camera at [" + cameraLocation[0] + ", " + cameraLocation[1]
            + ", " + cameraLocation[2] + "] fov=" + Math.floor(10 * fov) / 10.0
            + " aspectRatio=" + Math.floor(100 * aspectRatio) / 100.0);
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
        var opacity = 1.0
                - (Date.now() - statusTimeMSec)
                / (1000.0 * (statusSecs + statusEl.innerHTML.length
                        * statusSecsPerChar));
        if (opacity < 0.0) {
            animateClearStatus();
        } else {
            statusEl.style.opacity = opacity;
        }
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
            // Unknown timerState. This should not happen.
            animateUpdateStatus("Unknown timerState \"" + timerState + "\"");
            var elapsedMsec = -1;
        }
        timerEl.innerHTML = elapsedMsecToStr(elapsedMsec)

        // Position the timer dialog.
        var timerLeft = canvasWidth - timerEl.clientWidth;
        if (timerLeft < 0) {
            timerLeft = 0;
        }
        timerEl.style.left = timerLeft + "px";
        timerEl.style.top = (canvasHeight - timerEl.offsetHeight) + "px";
    } else {
        timerEl.style.opacity = 0.0;
    }
}

function animateWireframeSphere(show) {
    if (show && !wireframeSphereMesh) {
        // Add a sphere around the origin.
        var matt = new THREE.MeshBasicMaterial({
            color : "darkgreen",
            wireframe : true
        });
        var geometry = new THREE.SphereGeometry(cubiesRadius, 64, 64);
        wireframeSphereMesh = new THREE.Mesh(geometry, matt);
        scene.add(wireframeSphereMesh);
    } else if ((!show) && wireframeSphereMesh) {
        scene.remove(wireframeSphereMesh);
        wireframeSphereMesh = null;
    }
}

// Private methods

// Determine if the current move and next move can be consolidated. For
// example, L and then M could instead be l. This may happen when both moves
// are about the same axis.
function consolidateMoves() {
    if (!rotationQueue.length) {
        // Common case as usually the animation if faster than the human, so
        // there's no backlog in the queue.
        return 0;
    }

    // True for each layer that is rotating.
    var layerActive = [false, false, false];
    for (var i = rotationCurrent[2]; i <= rotationCurrent[3]; i++) {
        layerActive[i + 1] = true;
    }

    // Moves found that are compatible with the current move.
    var compatible = 0;

    // For the moves to be compatible the axisSign, axisOfRot and amount must be
    // the same.
    outerLoop: for (var i = 0; i < rotationQueue.length; i++) {
        var rotationOther = rotationQueue[i];
        if ((!rotationOther) || (rotationCurrent[0] !== rotationOther[0])
                || (rotationCurrent[1] !== rotationOther[1])
                || (rotationCurrent[4] !== rotationOther[4])) {
            break;
        }

        // First check that layers in question are clear and if so set them.
        for (var j = rotationOther[2]; j <= rotationOther[3]; j++) {
            if (layerActive[j + 1]) {
                break outerLoop;
            }
        }
        for (var j = rotationOther[2]; j <= rotationOther[3]; j++) {
            layerActive[j + 1] = true;
        }

        // This other move will possibly be consolidated.
        compatible++;
    }

    if (!compatible) {
        // No compatible moves were found.
        return 0;
    }

    // Examine layerActive to see if contains a contiguous block of trues.
    var lo = null;
    var hi = null;
    var last = false;
    // TODO: It might be helpful if lo and hi were zero based. It would make it
    // easier to generalize this for higher dimension cubes.
    for (var i = -1; i <= 1; i++) {
        var layer = layerActive[i + 1];
        if (layer && !last) {
            if (lo !== null) {
                // More than one start of a block of trues - can't consolidate.
                return 0;
            }
            lo = i;
        } else if ((!layer) && last) {
            if (hi !== null) {
                // More than one end of a block of trues - can't consolidate.
                return 0;
            }
            hi = i - 1;
        }
        last = layer;
    }
    if ((lo !== null) && (hi === null)) {
        // The block of trues went ot the end.
        hi = 1;
    }

    if ((lo !== null) && (hi !== null)) {
        // Layers moved contiguously. It's a candidate.
        var rotation = rotationCurrent.slice();
        rotation[2] = lo;
        rotation[3] = hi;

        // TODO: For higher dimension cubes come up with a way of consolidating
        // contiguous layers that don't have move names.
        var moveNew = getMoveFromRotation(rotation);
        if (!moveNew) {
            // This should not happen for 3x3 cubes.
            console.log("Unable to find consolidated move for rotation "
                    + rotation);
            return 0;
        }

        var first = true;
        var movesBuf = "";
        for (var i = 0; i < compatible; i++) {
            movesBuf += (first ? "" : ", ") + moveQueue[i];
            first = false;
        }

        console.log("Consolidated moves " + moveCurrent + ", " + movesBuf
                + " to form " + moveNew);

        // Discard the moves that will be combined with the current move.
        moveQueue.splice(0, compatible);
        rotationQueue.splice(0, compatible);

        // Update globals with the new consolidated move.
        moveCurrent = moveNew;
        rotationCurrent = rotation;

        // +1 to include the total number of moves involved in the
        // consolidation.
        return compatible + 1;
    } else {
        return 0;
    }
}

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
        orbitControls.update();
        var endMove = false;

        // Display or hide the orientation labels.
        textSetVisible(dispOrientationLabels);

        if (!moveCurrent) {
            // Keeping moveCurrent and rotationCurrent in sync depends on a
            // false value never being enqueued.
            moveCurrent = moveQueue.shift();
            if (moveCurrent) {
                rotationCurrent = rotationQueue.shift();
                if (rotationCurrent) {
                    // Consolidate moves before beginning a new move.
                    if (consolidateMoves()) {
                        // This is the unlikely case given how the event
                        // handling works.
                        console.log("Consolidated before rotateBegin for "
                                + "move " + moveCurrent);
                    }
                }
                // A new move. Prepare the cubies to be rotated.
                rotateBegin(moveCurrent, rotationCurrent, false);
                if (rotationCurrent) {
                    if (animation) {
                        moveStartMsec = Date.now();
                    }
                    // Start the timer if it was inspection and the user did
                    // something other than rotate the entire cube.
                    if ((timerState == "inspect")
                            && !isFullCubeRotation(rotationCurrent)) {
                        timerState = "solve";
                        timerStart = Date.now();
                    }
                }
            }
        }

        if (rotationCurrent) {
            // Consolidate now just in case a new move is waiting.
            var consolidateCount = consolidateMoves();
            if (consolidateCount) {
                // Rotate the current move back to where it started.
                pivot.rotation[rotationCurrent[1]] = 0.0;
                renderer.render(scene, camera);

                // End the current rotation and then begin a new one with the
                // new consolidated move.
                rotateEnd();
                rotateBegin(moveCurrent, rotationCurrent, true);
            }

            // Apply the next animation step to the prepared cubies.
            // angleMax and angleGoal are always positive - the absolute value
            // of the actual angle.
            var angleMax = (rotationCurrent[4] === 2) ? Math.PI : Math.PI / 2.0;
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
            pivot.rotation[rotationCurrent[1]] = rotationCurrent[0] * angleGoal;
        } else {
            moveCurrent = null;
            endMove = true;
        }

        renderer.render(scene, camera);
        rendered = true; // True if rendering has been done at least once.

        if (endMove) {
            rotateEnd();
            if (!moveQueue.length) {
                if (timerState === "scramble") {
                    // If the last move of the scramble was made then begin the
                    // inspection phase.
                    timerState = "inspect";
                    timerStart = Date.now();
                } else if (timerState === "solve" && moveHistory.length
                        && !isFullCubeRotation(rotationCurrent)) {
                    if (cubiesSolved()) {
                        timerState = "solved";
                        timerSolved = Date.now();
                    }
                }
                // We're done replaying moves.
                moveHistoryNextLast = -1;
            }
            moveCurrent = null;
            rotationCurrent = null;
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

function isFullCubeRotation(rotation) {
    if (!rotation) {
        return false;
    }
    return (rotation[2] === -1) && (rotation[3] === 1);
}