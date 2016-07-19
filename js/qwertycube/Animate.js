"use strict";

// Handle updating the screen with each animation frame.  This includes
// updating cubies, updating the timer, updating the status message and a few
// other things.  This file consumes the animateMoveQueue written to by
// Event.js.

// Public globals

var animateAnimationInst = false;
var animateAnimationLimit = 2;
var animateButtonBarHeight = 0;
var animateButtonHeightScale = 1.0;
var animateButtonStyle = "auto";
var animateCamera;
var animateCameraAdjusting = false;
var animateCameraLocation = [470, 470, 470];
var animateCameraRadius;
var animateCanvasHeight = 0;
var animateCanvasWidth = 0;
var animateDispOrientationLabels = false;
var animateMoveCurrent = "";
var animateMoveHistory = [];
var animateMoveHistoryNext = 0;
var animateMoveHistoryNextLast = -1; // Not set
var animateMoveQueue = [];
var animateMoveRadMsec = 0.0;
var animateMoveSec = 10.0;
var animateOrbitControls;
var animateRenderer;
var animateRotationQueue = [];
var animateScene;
var animateStatusSecs = 3.0;
var animateText = [];
var animateTimer = false;
var animateTimerInspectionSecs = 15;
var animateTimerState = "solve";
var animateWireframeSphere = false;

// Private globals

var _animateAnimationRequested = false;
var _animateAspectRatio = 0.0;
var _animateCanvasMin = 0;
var _animateFov = 0.0;
var _animateMoveQueueLen = -1;
var _animateMoveStartMsec = 0;
var _animateNeeded = false;
var _animateRendered = false;
var _animateRotationCurrent = null;
var _animateStatusDisplayed = false;
var _animateStatusSecsPerChar = 0.05;
var _animateStatusTimeMSec = 0;
var _animateTimerAnimated = false;
var _animateTimerFrameNext = 0;
var _animateTimerSolved;
var _animateTimerStart = Date.now();
var _animateWireframeSphereMesh;

// Public functions

// Clear the yellow status message at the top of the screen.
function animateClearStatus() {
    if (_animateStatusDisplayed) {
        initElStatus.innerHTML = "";
        initElStatus.style.opacity = 0.0;
        _animateStatusDisplayed = false;
    }
}

// Determined of an animation frame is needed.  If "needed" is passed then it
// an animation frame will definately be requested.
function animateCondReq(needed) {
    _animateNeeded = needed;

    // This method requests that _animateDoAnimate() be called next frame if need be.
    if ((!_animateAnimationRequested)
            && (_animateNeeded || animateMoveCurrent || animateMoveQueue.length
                    || _animateStatusDisplayed || animateCameraAdjusting || (animateTimer && _animateTimerAnimated))) {
        window.requestAnimationFrame(_animateDoAnimate);
        _animateAnimationRequested = true;
    }
}

// Draw a wireframe sphere tightly around the cube.  This is helpful to
// visualize the full possible extent of the cube as it's rotated.
function animateDrawWireframeSphere(show) {
    if (show && !_animateWireframeSphereMesh) {
        // Add a sphere around the origin that tightly contains the cube.
        var matt = new THREE.MeshBasicMaterial({
            color : "darkgreen",
            wireframe : true
        });
        var geometry = new THREE.SphereGeometry(cubiesRadius, 64, 64);
        _animateWireframeSphereMesh = new THREE.Mesh(geometry, matt);
        animateScene.add(_animateWireframeSphereMesh);
    } else if ((!show) && _animateWireframeSphereMesh) {
        animateScene.remove(_animateWireframeSphereMesh);
        _animateWireframeSphereMesh = null;
    }
}

// Reset things to prepare for a new solved cube.
function animateNewCube(clearHistory) {
    if (animateMoveCurrent || animateMoveQueue.length) {
        // Don't attempt to do a scramble if there are outstanding
        // moves.
        console.log("Can't new cube due to outstanding moves.");
        return false;
    }
    animateMoveCurrent = null;
    utilsClearMoveQueue();
    if (clearHistory) {
        animateMoveHistory.length = 0;
        animateMoveHistoryNext = 0;
    }
    rotateEnd();
    animateResetScene(null);
    if (!settingsDisplayed) {
        animateTimerState = "solve";
        _animateTimerStart = Date.now();
    }
    animateCondReq(true);
    return true;
}

// Remove the existing cubies from the scene, create a new set, and then add
// the new cubies to the scene.
function animateResetScene(oldCubies) {
    // Remove the existing cubies.
    for (var i = 0; i < cubies.length; i++) {
        animateScene.remove(cubies[i]);
    }

    // Create a new list of cubies.
    cubiesCreate(oldCubies);
    for (var i = 0; i < cubies.length; i++) {
        animateScene.add(cubies[i]);
    }

    // Enclose the cube in a wireframe sphere.
    animateDrawWireframeSphere(animateWireframeSphere);
}

// Code that is common it init and resize events.
function animateResize() {
    animateCanvasWidth = window.innerWidth;
    // The closest mobile phones get to being square in portrait mode is
    // 3:4. Allow the lower fourth of the screen for the button bar. Any more
    // would reduce the space available for the cube. It's assumed that people
    // won't use this on their phones in landscape mode much since there's no
    // reason to. For non-mobile mice the screen is bigger and mice are more
    // precise pointers, so less space.
    if (animateButtonStyle === "portrait") {
        var buttonBarHeightFraction = 0.2;
    } else if (animateButtonStyle === "landscape") {
        var buttonBarHeightFraction = 0.03333;
    } else if (animateButtonStyle === "auto") {
        var buttonBarHeightFraction = initMobile ? 0.2 : 0.03333;
    }
    animateButtonBarHeight = animateButtonHeightScale
            * Math.floor(buttonBarHeightFraction * window.innerHeight);
    if (animateButtonHeightScale) {
        animateButtonBarHeight = Math.max(animateButtonBarHeight, 15);
    }
    initElButtonBar.style.height = animateButtonBarHeight + "px";
    initElContainer.style.height = (window.innerHeight - animateButtonBarHeight) + "px";
    animateCanvasHeight = initElContainer.clientHeight;
    _animateCanvasMin = Math.min(animateCanvasWidth, animateCanvasHeight);
    animateRenderer.setSize(animateCanvasWidth, animateCanvasHeight);
    _animateAspectRatio = animateCanvasWidth / animateCanvasHeight;
    console.log("Resize to " + animateCanvasWidth + ", " + animateCanvasHeight
            + " aspect ratio " + Math.floor(1000 * _animateAspectRatio) / 1000);
    if (_animateAspectRatio >= 1.0) {
        // Simple case.
        var sin = cubiesRadius / animateCameraRadius;
        var angle = Math.asin(sin);
    } else {
        // In this case the aspect ratio scales the tangent.
        var tan = Math.sqrt((cubiesRadius * cubiesRadius)
                / (animateCameraRadius * animateCameraRadius - cubiesRadius * cubiesRadius));
        tan /= _animateAspectRatio;
        var angle = Math.atan(tan);
    }
    _animateFov = (180.0 / Math.PI) * (2.0 * angle);
    if (animateCamera) {
        animateCamera.aspect = _animateAspectRatio;
        animateCamera._animateFov = _animateFov;
        animateCamera.updateProjectionMatrix();
    }

    // Position the help dialog.
    var helpLeft = (animateCanvasWidth - initElHelp.clientWidth) / 2.0;
    if (helpLeft < 0.0) {
        helpLeft = 0.0;
    }
    initElHelp.style.left = helpLeft + "px";
    var helpTop = (animateCanvasHeight - initElHelp.clientHeight) / 2.0;
    if (helpTop < 0.0) {
        helpTop = 0.0;
    }
    initElHelp.style.top = helpTop + "px";

    initAddUpdateButtons(settingsDisplayed ? settingsButtonList
            : initMainButtonList);

    settingsResize();

    if (eventHelpDisplayed) {
        eventShowHelp(true);
    }

    eventToolTipButtonEl = null;
    initElTip.style.visibility = "hidden";
}

// Set the camera to the position specified by setting animateCameraLocation.
// It will be facing the origin regardless of it's location.
function animateSetCamera() {
    if (!animateCamera) {
        animateCamera = new THREE.PerspectiveCamera(_animateFov, _animateAspectRatio, 100, 1000);
    }
    animateCamera.position
            .set(animateCameraLocation[0], animateCameraLocation[1], animateCameraLocation[2]);
    console.log("Camera at [" + animateCameraLocation[0] + ", " + animateCameraLocation[1]
            + ", " + animateCameraLocation[2] + "] _animateFov=" + Math.floor(10 * _animateFov) / 10.0
            + " _animateAspectRatio=" + Math.floor(100 * _animateAspectRatio) / 100.0);
}

// Update the status bar at the top of the screen with the specified message.
function animateUpdateStatus(message) {
    if (message) {
        console.log(message);

        // Prevent wrapping prior to the message being displayed since it
        // messes up the centering.
        initElStatus.style.left = "0px";

        // A new message. Write it with full opacity.
        initElStatus.innerHTML = message;
        _animateStatusTimeMSec = Date.now();
        initElStatus.style.opacity = 1.0;

        // Position the status dialog.
        var statusLeft = (animateCanvasWidth - initElStatus.clientWidth) / 2.0;
        if (statusLeft < 0.0) {
            statusLeft = 0.0;
        }
        initElStatus.style.left = statusLeft + "px";
        initElStatus.style.top = "0px";

        _animateStatusDisplayed = true;
        animateCondReq(true);
    } else if (_animateStatusDisplayed) {
        // Fade the existing message.
        var opacity = 1.0
                - (Date.now() - _animateStatusTimeMSec)
                / (1000.0 * (animateStatusSecs + initElStatus.innerHTML.length
                        * _animateStatusSecsPerChar));
        if (opacity < 0.0) {
            animateClearStatus();
        } else {
            initElStatus.style.opacity = opacity;
        }
    }
}

// Private functions

// Determine if the current move and next few moves can be consolidated. For
// example, L and then M could instead be l. This may happen when both moves
// are about the same axis.
function _animateConsolidateMoves() {
    if (!animateRotationQueue.length) {
        // Common case as usually the animation if faster than the human, so
        // there's no backlog in the queue.
        return 0;
    }

    var undo = animateMoveCurrent.indexOf("G") !== -1;
    if (undo) {
        // Don't attempt to consolidate move undos.
        return 0;
    }

    // All moves need to be about the same axis.
    var axis = null;

    // The signed amount each layer is rotated.
    var layers = [];
    var bestI = 0;
    var bestMove = null;
    var bestRotation = null;
    outerLoop: for (var i = 1; i <= Math.min(3, animateRotationQueue.length + 1); i++) {
        var current = (i == 1);
        var rotation = current ? _animateRotationCurrent : animateRotationQueue[i - 2];
        if (current) {
            axis = rotation[1];
        } else {
            if ((!rotation) || (rotation[1] !== axis)) {
                break;
            }
        }
        var amountSigned = rotation[0] * rotation[4];
        for (var j = 0; j < cubiesOrder; j++) {
            var toAdd = (rotation[5] <= j) && (j <= rotation[6]) ? amountSigned
                    : 0;
            if (current) {
                layers.push(toAdd);
            } else if (toAdd) {
                layers[j] += toAdd;
            }
        }
        if (current) {
            continue;
        }

        var moveRotNew = utilsGetMoveRotationFromLayers(axis, layers);
        if (moveRotNew) {
            bestI = i;
            bestMove = moveRotNew[0];
            bestRotation = moveRotNew[1];
        } else {
            // The moves were not comptaible.
            console.log("Unable to find consolidated move for rotation "
                    + rotation);
        }
    }
    if (!bestMove) {
        // No good moves found.
        return 0;
    }

    var first = true;
    var movesBuf = "";
    for (var i = 0; i <= bestI - 2; i++) {
        movesBuf += (first ? "" : ", ") + animateMoveQueue[i];
        first = false;
    }

    console.log("Consolidated moves " + animateMoveCurrent + ", " + movesBuf
            + " to form " + bestMove);

    // Discard the moves that will be combined with the current move.
    animateMoveQueue.splice(0, bestI - 1);
    _animateMoveQueueLen = animateMoveQueue.length;
    animateRotationQueue.splice(0, bestI - 1);

    // Update globals with the new consolidated move.
    animateMoveCurrent = bestMove;
    _animateRotationCurrent = bestRotation;

    // Return the number of moves that were consolidated.
    return bestI;
}

// The main animation callback.  Update items on the screen that need to be
// updated.
function _animateDoAnimate() {
    // Animation not requested since starting this animation frame.
    _animateAnimationRequested = false;

    // If only the animateTimer is displayed then much of the animation code can be
    // bypassed. Also, the frame rate can be reduced saving CPU.
    var timerOnly = animateTimer
            && !(_animateNeeded || animateMoveCurrent || animateMoveQueue.length
                    || _animateStatusDisplayed || animateCameraAdjusting);

    if (!timerOnly) {
        // Something other than the animateTimer needs to be updated.
        animateOrbitControls.update();

        // Display or hide the orientation labels.
        textSetVisible(animateDispOrientationLabels);

        // If animateMoveQueue is longer than a typical scramble (scrambleJSSMax) then
        // replay all of the moves prior to a typical scramble as quickly as
        // possible without updating the screen.
        var moveCount = 0;
        do {
            moveCount++;
            var endMove = false;
            if (!animateMoveCurrent) {
                // Keeping animateMoveCurrent and _animateRotationCurrent in sync depends on a
                // false value never being enqueued.
                animateMoveCurrent = animateMoveQueue.shift();
                if (animateMoveCurrent) {
                    _animateRotationCurrent = animateRotationQueue.shift();
                    if (_animateRotationCurrent) {
                        // Consolidate moves before beginning a new move.
                        if (_animateConsolidateMoves()) {
                            _animateMoveQueueLen = animateMoveQueue.length;
                            // This is the unlikely case given how the event
                            // handling works.
                            console.log("Consolidated before rotateBegin for "
                                    + "move " + animateMoveCurrent);
                        }
                        _animateMoveQueueLen = animateMoveQueue.length;
                    }
                    // A new move. Prepare the cubies to be rotated.
                    rotateBegin(animateMoveCurrent, _animateRotationCurrent, false);
                    if (_animateRotationCurrent) {
                        if (!animateAnimationInst) {
                            _animateMoveStartMsec = Date.now();
                        }
                        // Start the animateTimer if it was inspection and the user did
                        // something other than rotate the entire cube.
                        if ((animateTimerState === "inspect")
                                && !_animateIsFullCubeRotation(_animateRotationCurrent)) {
                            animateTimerState = "solve";
                            _animateTimerStart = Date.now();
                        }
                    }
                }
            }

            if (_animateRotationCurrent) {
                // Consolidate now if a new move is waiting.
                if ((animateMoveQueue.length !== _animateMoveQueueLen) && _animateConsolidateMoves()) {
                    // Rotate the current move back to where it started.
                    rotatePivot.rotation[_animateRotationCurrent[1]] = 0.0;
                    animateRenderer.render(animateScene, animateCamera);

                    // End the current rotation and then begin a new one with
                    // the new consolidated move.
                    rotateEnd();
                    rotateBegin(animateMoveCurrent, _animateRotationCurrent, true);
                }
                _animateMoveQueueLen = animateMoveQueue.length;

                // Apply the next animation step to the prepared cubies.
                // angleMax and angleGoal are always positive - the absolute
                // value of the actual angle.
                var angleMax = (_animateRotationCurrent[4] === 2) ? Math.PI
                        : Math.PI / 2.0;
                if ((!animateAnimationInst) && (animateMoveQueue.length <= animateAnimationLimit)) {
                    var elapsedMsec = Date.now() - _animateMoveStartMsec;
                    var angleGoal = elapsedMsec * animateMoveRadMsec;
                    if (angleGoal >= angleMax) {
                        angleGoal = angleMax;
                        endMove = true;
                    }
                } else {
                    var angleGoal = angleMax;
                    endMove = true;
                }
                rotatePivot.rotation[_animateRotationCurrent[1]] = _animateRotationCurrent[0]
                        * angleGoal;
            } else {
                animateMoveCurrent = null;
                endMove = true;
            }

            animateRenderer.render(animateScene, animateCamera);
            _animateRendered = true; // True if _animateRendered at least once.

            if (endMove) {
                rotateEnd();
                if (!animateMoveQueue.length) {
                    if (animateTimerState === "scramble") {
                        // If the last move of the scramble was made then begin
                        // the inspection phase.
                        animateTimerState = "inspect";
                        _animateTimerStart = Date.now();
                    } else if (animateTimerState === "solve" && animateMoveHistory.length
                            && !_animateIsFullCubeRotation(_animateRotationCurrent)) {
                        if (cubiesSolved()) {
                            animateTimerState = "solved";
                            _animateTimerSolved = Date.now();
                        }
                    }
                    // We're done replaying moves.
                    animateMoveHistoryNextLast = -1;
                }
                animateMoveCurrent = null;
                _animateRotationCurrent = null;
            }
        } while ((animateMoveQueue.length > scrambleJSSMax)
                && ((animateMoveHistoryNextLast - animateMoveQueue.length) >= 2)
                && (moveCount <= 100));
        animateUpdateStatus(null);
        _animateUpdateTimer();
    } else {
        // Only the animateTimer needs to be updated.
        var now = Date.now();
        if (now >= _animateTimerFrameNext) {
            _animateUpdateTimer();
            // If way behind then skip ahead.
            if ((now - _animateTimerFrameNext) >= 500) {
                _animateTimerFrameNext = now;
            }
            while (now >= _animateTimerFrameNext) {
                _animateTimerFrameNext += 100;
            }
        }
    }

    animateCondReq(false);
}

// Returns true if "rotation" rotates the entire cube is being rotated about
// one of the axes.
function _animateIsFullCubeRotation(rotation) {
    if (!rotation) {
        return false;
    }
    return (rotation[2] === -1) && (rotation[3] === 1);
}

// Update the timer value and color as a function of the timer state.
function _animateUpdateTimer() {
    if (animateTimer) {
        // Prevent wrapping prior to the message being displayed since it
        // messes up the centering.
        initElTimer.style.left = "0px";
        initElTimer.style.opacity = 1.0;

        if (animateTimerState === "inspect") {
            _animateTimerAnimated = true;
            initElTimer.style.backgroundColor = "#ff8080";
            var elapsedMsec = (1000 * animateTimerInspectionSecs)
                    - (Date.now() - _animateTimerStart);
            if (elapsedMsec <= 0) {
                // If they ran out of inspection time switch to solve and get
                // the next animation.
                animateTimerState = "solve";
                _animateTimerStart = Date.now();
                return;
            }
        } else if (animateTimerState === "scramble") {
            _animateTimerAnimated = false;
            initElTimer.style.backgroundColor = "#808080";
            var elapsedMsec = null;
        } else if (animateTimerState === "solve") {
            _animateTimerAnimated = true;
            initElTimer.style.backgroundColor = "#80ff80";
            var elapsedMsec = Date.now() - _animateTimerStart;
        } else if (animateTimerState === "solved") {
            _animateTimerAnimated = false;
            initElTimer.style.backgroundColor = "#ffff80";
            var elapsedMsec = _animateTimerSolved - _animateTimerStart;
        } else {
            _animateTimerAnimated = false;
            initElTimer.style.backgroundColor = "#ff80ff";
            // Unknown animateTimerState. This should not happen.
            utilsFatalError("Unknown animateTimerState \"" + animateTimerState + "\"");
            var elapsedMsec = -1;
        }
        initElTimer.innerHTML = utilsElapsedMsecToStr(elapsedMsec)

        // Position the animateTimer dialog.
        var timerLeft = animateCanvasWidth - initElTimer.clientWidth - 1;
        if (timerLeft < 0) {
            timerLeft = 0;
        }
        initElTimer.style.left = timerLeft + "px";
        initElTimer.style.top = (animateCanvasHeight - initElTimer.offsetHeight) + "px";
    } else {
        initElTimer.style.opacity = 0.0;
    }
}
