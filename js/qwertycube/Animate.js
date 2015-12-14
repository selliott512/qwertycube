"use strict";

// Globals

var animationInst = false;
var animationLimit = 2;
var animateNeeded = false;
var animationRequested = false;
var aspectRatio = 0.0;
var buttonBarHeight = 0;
var buttonHeightScale = 1.0;
var buttonStyle = "auto";
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
var moveQueueLen = -1;
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

function animateResetScene(oldCubies) {
    // Remove the existing cubies.
    for (var i = 0; i < cubies.length; i++) {
        scene.remove(cubies[i]);
    }

    // Create a new list of cubies.
    cubiesCreate(oldCubies);
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
    if (buttonStyle === "portrait") {
        var buttonBarHeightFraction = 0.2;
    } else if (buttonStyle === "landscape") {
        var buttonBarHeightFraction = 0.03333;
    } else if (buttonStyle === "auto") {
        var buttonBarHeightFraction = mobile ? 0.2 : 0.03333;
    }
    buttonBarHeight = buttonHeightScale
            * Math.floor(buttonBarHeightFraction * window.innerHeight);
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
    if (moveCurrent || moveQueue.length) {
        // Don't attempt to do a scramble if there are outstanding
        // moves.
        console.log("Can't new cube due to outstanding moves.");
        return false;
    }
    moveCurrent = null;
    clearMoveQueue();
    moveHistory.length = 0;
    moveHistoryNext = 0;
    rotateEnd();
    animateResetScene(null);
    if (!settingsDisplayed) {
        timerState = "solve";
        timerStart = Date.now();
    }
    animateCondReq(true);
    return true;
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

        if (timerState === "inspect") {
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
        } else if (timerState === "scramble") {
            timerEl.style.backgroundColor = "#808080";
            var elapsedMsec = null;
        } else if (timerState === "solve") {
            timerEl.style.backgroundColor = "#80ff80";
            var elapsedMsec = Date.now() - timerStart;
        } else if (timerState === "solved") {
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

    var undo = moveCurrent.indexOf("G") !== -1;
    if (undo) {
        // Don't attempt to consolidate move undos.
        return 0;
    }

    // All moves need to be about he same axs.
    var axis = null;

    // The signed amount each layer is rotated.
    var layerAmounts = [];
    var bestI = 0;
    var bestMove = null;
    var bestRotation = null;
    outerLoop: for (var i = 1; i <= Math.min(3, rotationQueue.length + 1); i++) {
        var current = (i == 1);
        var rotation = current ? rotationCurrent : rotationQueue[i - 2];
        if (current) {
            axis = rotation[1];
        } else {
            if ((!rotation) || (rotation[1] !== axis)) {
                break;
            }
        }
        var amountSigned = rotation[0] * rotation[4];
        for (var j = 0; j < 3; j++) {
            var toAdd = (rotation[2] <= (j - 1)) && ((j - 1) <= rotation[3]) ? amountSigned
                    : 0;
            if (current) {
                layerAmounts.push(toAdd);
            } else if (toAdd) {
                layerAmounts[j] += toAdd;
            }
        }
        if (current) {
            continue;
        }

        // For layerAmounts to describe a valid move at minimal it must contain
        // a contiguous set of non-zero values that are all equal ([0, 0, N] or
        // [N, N, 0], for example).

        // Examine layerActive to see if contains a contiguous block of trues.
        var lo = null;
        var hi = null;
        var last = 0;
        // TODO: It might be helpful if lo and hi were zero based. It would make
        // it easier to generalize this for higher dimension cubes.
        amountSigned = 0;
        for (var j = 0; j < layerAmounts.length; j++) {
            var as = layerAmounts[j];
            var next = layerAmounts[j + 1];
            if (as) {
                if (amountSigned && (as !== amountSigned)) {
                    // More than one non-zero value.
                    continue outerLoop;
                }
                amountSigned = as;
                if (!last) {
                    if (lo !== null) {
                        // More than one start - can't consolidate.
                        continue outerLoop;
                    }
                    lo = j - 1;
                }
                if (!next) {
                    if (hi !== null) {
                        // More than one end - can't consolidate.
                        continue outerLoop;
                    }
                    hi = j - 1;
                }
            }
            last = as;
        }

        if ((lo !== null) && (hi !== null)) {
            // Layers moved contiguously. It's a candidate.
            var rotation = rotationCurrent.slice();
            rotation[0] = amountSigned < 0 ? -1 : 1;
            rotation[2] = lo;
            rotation[3] = hi;
            rotation[4] = Math.abs(amountSigned);

            // TODO: For higher dimension cubes come up with a way of
            // consolidating contiguous layers that don't have move names.
            var moveNew = getMoveFromRotation(rotation);
            if (moveNew) {
                bestI = i;
                bestMove = moveNew;
                bestRotation = rotation;
            } else {
                // This should not happen for 3x3 cubes.
                console.log("Unable to find consolidated move for rotation "
                        + rotation);
            }
        }
    }
    if (!bestMove) {
        // No good moves found.
        return 0;
    }

    var first = true;
    var movesBuf = "";
    for (var i = 0; i <= bestI - 2; i++) {
        movesBuf += (first ? "" : ", ") + moveQueue[i];
        first = false;
    }

    console.log("Consolidated moves " + moveCurrent + ", " + movesBuf
            + " to form " + moveNew);

    // Discard the moves that will be combined with the current move.
    moveQueue.splice(0, bestI - 1);
    moveQueueLen = moveQueue.length;
    rotationQueue.splice(0, bestI - 1);

    // Update globals with the new consolidated move.
    moveCurrent = bestMove;
    rotationCurrent = bestRotation;

    // +1 to include the total number of moves involved in the
    // consolidation.
    return bestI;
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

        // Display or hide the orientation labels.
        textSetVisible(dispOrientationLabels);

        // If moveQueue is longer than a typical scramble (scrambleJSSMax) then
        // replay all of the moves prior to a typical scramble as quickly as
        // possible without updating the screen.
        var moveCount = 0;
        do {
            moveCount++;
            var endMove = false;
            if (!moveCurrent) {
                // Keeping moveCurrent and rotationCurrent in sync depends on a
                // false value never being enqueued.
                moveCurrent = moveQueue.shift();
                if (moveCurrent) {
                    rotationCurrent = rotationQueue.shift();
                    if (rotationCurrent) {
                        // Consolidate moves before beginning a new move.
                        if (consolidateMoves()) {
                            moveQueueLen = moveQueue.length;
                            // This is the unlikely case given how the event
                            // handling works.
                            console.log("Consolidated before rotateBegin for "
                                    + "move " + moveCurrent);
                        }
                        moveQueueLen = moveQueue.length;
                    }
                    // A new move. Prepare the cubies to be rotated.
                    rotateBegin(moveCurrent, rotationCurrent, false);
                    if (rotationCurrent) {
                        if (!animationInst) {
                            moveStartMsec = Date.now();
                        }
                        // Start the timer if it was inspection and the user did
                        // something other than rotate the entire cube.
                        if ((timerState === "inspect")
                                && !isFullCubeRotation(rotationCurrent)) {
                            timerState = "solve";
                            timerStart = Date.now();
                        }
                    }
                }
            }

            if (rotationCurrent) {
                // Consolidate now if a new move is waiting.
                if ((moveQueue.length !== moveQueueLen) && consolidateMoves()) {
                    // Rotate the current move back to where it started.
                    pivot.rotation[rotationCurrent[1]] = 0.0;
                    renderer.render(scene, camera);

                    // End the current rotation and then begin a new one with
                    // the new consolidated move.
                    rotateEnd();
                    rotateBegin(moveCurrent, rotationCurrent, true);
                }
                moveQueueLen = moveQueue.length;

                // Apply the next animation step to the prepared cubies.
                // angleMax and angleGoal are always positive - the absolute
                // value of the actual angle.
                var angleMax = (rotationCurrent[4] === 2) ? Math.PI
                        : Math.PI / 2.0;
                if ((!animationInst) && (moveQueue.length <= animationLimit)) {
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
                pivot.rotation[rotationCurrent[1]] = rotationCurrent[0]
                        * angleGoal;
            } else {
                moveCurrent = null;
                endMove = true;
            }

            renderer.render(scene, camera);
            rendered = true; // True if rendered at least once.

            if (endMove) {
                rotateEnd();
                if (!moveQueue.length) {
                    if (timerState === "scramble") {
                        // If the last move of the scramble was made then begin
                        // the
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
        } while ((moveQueue.length > scrambleJSSMax)
                && ((moveHistoryNextLast - moveQueue.length) >= 2)
                && (moveCount <= 100));
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
