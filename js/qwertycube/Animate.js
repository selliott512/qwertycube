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
var animateCameraOrthographic = false;
var animateCameraOrthographicScale = 0.943;
var animateCameraRadius;
var animateCanvasHeight = 0;
var animateCanvasWidth = 0;
var animateElapsedMsecOld = 0;
var animateMoveCurrent = "";
var animateMoveHistory = [];
var animateMoveHistoryNext = 0;
var animateMoveHistoryNextLast = -1; // Not set
var animateMoveHistoryNormalize = true;
var animateMoveQueue = [];
var animateMoveQueueReplay = false;
var animateScrambleReplay = false;
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
var animateWireframeColor = "darkgreen";
var animateWireframeCube = false;
var animateWireframeSphere = false;

// Private globals

var _animateAnimationRequested = false;
var _animateAspectRatio = 0.0;
var _animateButtonDesktopScale = 1.25;
var _animateCanvasMin = 0;
var _animateCameraNear = 100;
var _animateFov = 0.0;
var _animateCameraOrthographicActive = null;
var _animateCameraMoveCurrent = null;
var _animateCameraMoveQueue = [];
var _animateMoveQueueLen = -1;
var _animateMoveStartMsec = 0;
var _animateNeeded = false;
var _animateRendered = false;
var _animateRotationCurrent = null;
var _animateStatusDisplayed = false;
var _animateStatusSecsPerChar = 0.05;
var _animateStatusTimeMSec = 0;
var _animateTimerAnimated = false;
var _animateTimerJumpMax = 10000;
var _animateTimerFrameNext = 0;
var _animateTimerDisplayCanvasHeight = -1;
var _animateTimerDisplayCanvasWidth = -1;
var _animateTimerDisplayState = null;
var _animateTimerDisplayText = null;
var _animateTimerDisplayVisible = null;
var _animateTimerSolved;
var _animateTimerStart = Date.now();
var _animateWireframeCubeMesh;
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
// an animation frame will definitely be requested.
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

// Check if the cube is busy doing something.  Return true if it's not
// busy/ready.
function animateCubeReadyCheck(desc) {
    if (animateMoveCurrent || animateMoveQueue.length) {
        // Don't attempt to do a scramble if there are outstanding
        // moves.  Should be infrequent for reasonably patient users.
        animateUpdateStatus((desc ? desc : "Command") +
                " failed - cube is busy");
        return false;
    } else {
        return true;
    }
}

// Draw a wireframe sphere tightly around the cube.  This is helpful to
// visualize the full possible extent of the cube as it's rotated.
function animateDrawWireframeSphere(show) {
    if (_animateWireframeSphereMesh) {
        animateScene.remove(_animateWireframeSphereMesh);
        _animateDisposeObject(_animateWireframeSphereMesh);
        _animateWireframeSphereMesh = null;
    }
    if (show && !_animateWireframeSphereMesh) {
        // Add a sphere around the origin that tightly contains the cube.
        var matt = new THREE.MeshBasicMaterial({
            color : utilsNormalizeColor(animateWireframeColor),
            wireframe : true
        });
        var geometry = new THREE.SphereGeometry(cubiesRadius, 64, 64);
        _animateWireframeSphereMesh = new THREE.Mesh(geometry, matt);
        animateScene.add(_animateWireframeSphereMesh);
    }
}

// Draw a wireframe cube subdivided to match the current cube order.
function animateDrawWireframeCube(show) {
    if (_animateWireframeCubeMesh) {
        animateScene.remove(_animateWireframeCubeMesh);
        _animateDisposeObject(_animateWireframeCubeMesh);
        _animateWireframeCubeMesh = null;
    }
    if (show) {
        var geometry = _animateCreateWireframeCubeGeometry();
        var matt = new THREE.LineBasicMaterial({
            color : utilsNormalizeColor(animateWireframeColor)
        });
        _animateWireframeCubeMesh = new THREE.LineSegments(geometry, matt);
        animateScene.add(_animateWireframeCubeMesh);
    }
}

// Reset things to prepare for a new solved cube.
function animateNewCube(clearHistory) {
    if (!animateCubeReadyCheck("New cube")) {
        // Don't attempt to do a create a new cube if there are outstanding
        // moves. This probably shouldn't happen.  It should probably be
        // prevented by animateCubeReadyCheck() before this point.
        return false;
    }
    animateMoveCurrent = null;
    utilsClearMoveQueue();
    if (clearHistory) {
        animateMoveHistory.length = 0;
        animateMoveHistoryNext = 0;
        scrambleMoves.length = 0;
        eventResetLastInputMove();
        solveClearMoves();
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
    for (var i = 0; i < cubiesList.length; i++) {
        animateScene.remove(cubiesList[i]);
    }

    // Create a new list of cubies.
    cubiesCreate(oldCubies);
    arrowsInit();
    for (var i = 0; i < cubiesList.length; i++) {
        animateScene.add(cubiesList[i]);
    }

    // Enclose the cube in optional wireframe guides.
    animateDrawWireframeCube(animateWireframeCube);
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
    var buttonPlatformScale = initMobile ? 1.0 : _animateButtonDesktopScale;
    animateButtonBarHeight = animateButtonHeightScale * buttonPlatformScale
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
    _animateUpdateCameraProjection();

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

// Update camera projection fields after resize or projection mode changes.
function _animateUpdateCameraProjection() {
    if (!animateCamera) {
        return;
    }

    animateCamera.near = _animateCameraNear;
    animateCamera.far = _animateGetCameraFar();

    if (animateCameraOrthographic) {
        // Starting point for orthographic sizing: fit the same enclosing sphere
        // used by the perspective FOV calculation.
        var halfWidth = cubiesRadius * animateCameraOrthographicScale;
        var halfHeight = cubiesRadius * animateCameraOrthographicScale;
        if (_animateAspectRatio >= 1.0) {
            halfWidth = cubiesRadius * animateCameraOrthographicScale * _animateAspectRatio;
        } else {
            halfHeight = cubiesRadius * animateCameraOrthographicScale / _animateAspectRatio;
        }
        animateCamera.left = -halfWidth;
        animateCamera.right = halfWidth;
        animateCamera.top = halfHeight;
        animateCamera.bottom = -halfHeight;
    } else {
        // Preserve the current perspective behavior.
        animateCamera.aspect = _animateAspectRatio;
        animateCamera._animateFov = _animateFov;
    }
    animateCamera.updateProjectionMatrix();
}

// Set the camera to the position specified by setting animateCameraLocation.
// It will be facing the origin regardless of it's location.
function animateSetCamera(suppressLog) {
    if (!animateCamera || _animateCameraOrthographicActive !== animateCameraOrthographic) {
        if (animateCameraOrthographic) {
            animateCamera = new THREE.OrthographicCamera(-1, 1, 1, -1,
                    _animateCameraNear, _animateGetCameraFar());
        } else {
            animateCamera = new THREE.PerspectiveCamera(_animateFov, _animateAspectRatio,
                    _animateCameraNear, _animateGetCameraFar());
        }
        _animateCameraOrthographicActive = animateCameraOrthographic;
        if (animateOrbitControls) {
            animateOrbitControls.object = animateCamera;
        }
        _animateUpdateCameraProjection();
    }
    animateCamera.position
            .set(animateCameraLocation[0], animateCameraLocation[1], animateCameraLocation[2]);
    animateCamera.up.set(0, 1, 0);
    animateCamera.lookAt(new THREE.Vector3(0, 0, 0));
    if (!suppressLog) {
        console.log("Camera at [" + animateCameraLocation[0] + ", " + animateCameraLocation[1]
                + ", " + animateCameraLocation[2] + "]"
                + " animateCameraOrthographic=" + animateCameraOrthographic
                + " _animateFov=" + Math.floor(10 * _animateFov) / 10.0
                + " _animateAspectRatio=" + Math.floor(100 * _animateAspectRatio) / 100.0);
    }
}

// Synchronize animateCameraLocation with the actual camera position.
function animateSyncCameraLocation() {
    // To a tenth of a pixel should be plenty accurate.
    animateCameraLocation[0] = Math.round(10 * animateCamera.position.x) / 10;
    animateCameraLocation[1] = Math.round(10 * animateCamera.position.y) / 10;
    animateCameraLocation[2] = Math.round(10 * animateCamera.position.z) / 10;
}

// Build the subdivided wireframe cube geometry.
function _animateCreateWireframeCubeGeometry() {
    var positions = [];
    var arrowOutsideFactor = (typeof _slightlyOutsideFactor === "number")
            ? _slightlyOutsideFactor : 1.01;
    var overlayOffset = 3.0 * (arrowOutsideFactor - 1.0) * cubiesHalfSide;
    var d = cubiesHalfSide + overlayOffset;
    var step = (2.0 * d) / cubiesOrder;
    var coords = [];
    for (var i = 0; i <= cubiesOrder; i++) {
        coords.push(-d + (i * step));
    }

    _animateAddWireframeCubeFace(positions, "x", "y", "z", d, coords);
    _animateAddWireframeCubeFace(positions, "x", "y", "z", -d, coords);
    _animateAddWireframeCubeFace(positions, "y", "x", "z", d, coords);
    _animateAddWireframeCubeFace(positions, "y", "x", "z", -d, coords);
    _animateAddWireframeCubeFace(positions, "z", "x", "y", d, coords);
    _animateAddWireframeCubeFace(positions, "z", "x", "y", -d, coords);

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(
            positions, 3));
    return geometry;
}

// Add grid lines for one face to the wireframe cube positions array.
function _animateAddWireframeCubeFace(positions, fixedAxis, axisA, axisB,
        fixedValue, coords) {
    var min = coords[0];
    var max = coords[coords.length - 1];
    for (var i = 0; i < coords.length; i++) {
        var coord = coords[i];
        _animateAddWireframeLine(positions, fixedAxis, fixedValue,
                axisA, coord, axisB, min, max);
        _animateAddWireframeLine(positions, fixedAxis, fixedValue,
                axisB, coord, axisA, min, max);
    }
}

// Add one line segment to the wireframe positions array.
function _animateAddWireframeLine(positions, fixedAxis, fixedValue, constAxis,
        constValue, varyingAxis, min, max) {
    var p1 = {x: 0, y: 0, z: 0};
    var p2 = {x: 0, y: 0, z: 0};
    p1[fixedAxis] = fixedValue;
    p2[fixedAxis] = fixedValue;
    p1[constAxis] = constValue;
    p2[constAxis] = constValue;
    p1[varyingAxis] = min;
    p2[varyingAxis] = max;
    positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
}

// Dispose of geometry and material for a removed Three.js object.
function _animateDisposeObject(obj) {
    if (obj.geometry && obj.geometry.dispose) {
        obj.geometry.dispose();
    }
    if (obj.material && obj.material.dispose) {
        obj.material.dispose();
    }
}

// Return a far clipping plane that includes the cube plus nearby overlays.
function _animateGetCameraFar() {
    const farPlane = Math.max(1000, animateCameraRadius + (1.2 * cubiesRadius));
    console.log("Camera far plane " + farPlane + " animateCameraRadius="
        + animateCameraRadius + " cubiesRadius=" + cubiesRadius);
    return farPlane;
}

// Queue a camera move command. Valid values: "left", "right", "up", "down".
function animateQueueCameraMove(move) {
    // If no camera move is active, start from the true current camera position.
    // This keeps arrow-key camera movement aligned with mouse/orbit changes.
    if (!_animateCameraMoveCurrent && !_animateCameraMoveQueue.length && animateCamera) {
        animateCameraLocation[0] = animateCamera.position.x;
        animateCameraLocation[1] = animateCamera.position.y;
        animateCameraLocation[2] = animateCamera.position.z;
    }
    _animateCameraMoveQueue.push(move);
    animateCondReq(true);
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

    if (animateMoveHistoryNextLast !== -1) {
        // Moves are being replayed.  Avoid consolidating in order to minimize
        // the risk of clicking "Ok" the settings dialog having some
        // undesirable side effect.
        return 0;
    }

    if (animateMoveQueueReplay) {
        // Replay must preserve the queued move sequence so solve tracking stays
        // aligned with arrows and savepoint boundaries.
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
            // Not every combination of layers has a single-move notation.
            utilsLogVerbose("Unable to consolidate move rotation " + rotation);
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

    // If true then this method has caused a need to animate again.
    var animateNeededFromAnimate = false;

    // If only the timer is displayed then much of the animation code can be
    // bypassed. Also, the frame rate can be reduced saving CPU.
    var timerOnly = animateTimer
            && !(_animateNeeded || animateMoveCurrent || animateMoveQueue.length
                    || _animateStatusDisplayed || animateCameraAdjusting
                    || _animateCameraMoveCurrent || _animateCameraMoveQueue.length);

    if (!timerOnly) {
        // Something other than the timer needs to be updated.
        animateOrbitControls.update();
        _animateUpdateCameraMove();
        if (_animateCameraMoveCurrent || _animateCameraMoveQueue.length) {
            animateNeededFromAnimate = true;
        }

        // Display or hide the orientation labels.
        textSetVisible(textDispOrientationLabels);

        // If animateMoveQueue is longer than a typical scramble (scrambleJSSMax) then
        // replay all of the moves prior to a typical scramble as quickly as
        // possible without updating the screen.
        var moveCount = 0;
        var renderedDuringLoop = false;
        do {
            moveCount++;
            var movesPendingAtLoopStart = animateMoveQueue.length
                    + (animateMoveCurrent ? 1 : 0);
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
                        // Start the timer if it was inspection and the user did
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
                    utilsLogVerbose("consolidate-before-rebegin: move="
                            + animateMoveCurrent + " animateMoveHistoryNext="
                            + animateMoveHistoryNext + " animateMoveHistory="
                            + animateMoveHistory.join(" "));
                    rotateReplaceLastHistoryMove(animateMoveCurrent);
                    // Rotate the current move back to where it started.
                    rotatePivot.rotation[_animateRotationCurrent[1]] = 0.0;
                    animateRenderer.render(animateScene, animateCamera);

                    // End the current rotation and then begin a new one with
                    // the new consolidated move.
                    rotateEnd();
                    rotateBegin(animateMoveCurrent, _animateRotationCurrent, true);
                    utilsLogVerbose("consolidate-after-rebegin: move="
                            + animateMoveCurrent + " animateMoveHistoryNext="
                            + animateMoveHistoryNext + " animateMoveHistory="
                            + animateMoveHistory.join(" "));
                }
                _animateMoveQueueLen = animateMoveQueue.length;

                // Apply the next animation step to the prepared cubies.
                // angleMax and angleGoal are always positive - the absolute
                // value of the actual angle.
                var angleMax = (_animateRotationCurrent[4] === 2) ? Math.PI
                        : Math.PI / 2.0;
                var fastForwardMoves = _animateFastForwardMoves(moveCount,
                        movesPendingAtLoopStart);
                if (!fastForwardMoves) {
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
                var fastForwardMoves = false;
            }

            if (!fastForwardMoves) {
                _animateRender();
                renderedDuringLoop = true;
            }

            // The loop also runs while non-move animation, such as a status
            // message, is active. Only finish a move when one was pending.
            if (endMove && movesPendingAtLoopStart) {
                rotateEnd();
                if (_animateRotationCurrent) {
                    _rotateMoveHistoryNormalize();
                    animateNeededFromAnimate = true;
                }
                if (!animateMoveQueue.length) {
                    if (animateTimerState === "scramble") {
                        // If the last move of the scramble was made then begin
                        // the inspection phase.
                        animateTimerState = "inspect";
                        _animateTimerStart = Date.now();
                        if (arrowsEnabled) {
                            solveFindMovesFromHistory();
                        }
                    } else if (animateTimerState === "solve" && animateMoveHistory.length
                            && !_animateIsFullCubeRotation(_animateRotationCurrent)) {
                        if (cubiesSolved()) {
                            animateTimerState = "solved";
                            _animateTimerSolved = Date.now();
                        }
                    }
                    // We're done replaying moves.
                    animateMoveHistoryNextLast = -1;
                    animateMoveQueueReplay = false;
                    animateScrambleReplay = false;
                }
                // Refresh once per completed move. This also handles a final
                // replay item that is a savepoint with no rotation.
                rotateUpdateArrowsMoveFromSolve();
                animateMoveCurrent = null;
                _animateRotationCurrent = null;
            }
        } while (fastForwardMoves && (animateMoveCurrent || animateMoveQueue.length));
        if (moveCount && !renderedDuringLoop) {
            _animateRender();
        }
        animateUpdateStatus(null);
        _animateUpdateTimer();
    } else {
        // Only the timer needs to be updated.
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

    animateCondReq(animateNeededFromAnimate);
}

// Return true if queued moves should finish without intermediate rendering.
function _animateFastForwardMoves(moveCount, movesPendingAtLoopStart) {
    if (animateAnimationInst) {
        return true;
    }
    if (animateScrambleReplay) {
        return true;
    }
    if (movesPendingAtLoopStart > (animateAnimationLimit + 1)) {
        return true;
    }
    return (animateMoveQueue.length > scrambleJSSMax)
            && ((animateMoveHistoryNextLast - animateMoveQueue.length) >= 2)
            && (moveCount <= 100);
}

// Render the current scene, suppressing the first-render warning if needed.
function _animateRender() {
    if (_animateRendered) {
        animateRenderer.render(animateScene, animateCamera);
    } else {
        // The first time animateRenderer.render() is called three.js logs a
        // warning that I don't understand.
        var consoleWarnBak = console.warn;
        console.warn = utilsSuppressedWarning;
        animateRenderer.render(animateScene, animateCamera);
        _animateRendered = true;
        console.warn = consoleWarnBak;
    }
}

// Apply one animation step for queued camera movement.
function _animateUpdateCameraMove() {
    if (!_animateCameraMoveCurrent && _animateCameraMoveQueue.length) {
        _animateCameraMoveCurrent = _animateBuildCameraMove(_animateCameraMoveQueue.shift());
    }
    if (!_animateCameraMoveCurrent) {
        return;
    }

    var current = _animateCameraMoveCurrent;
    var elapsedMsec = Date.now() - current.startMsec;
    var angleGoal = animateAnimationInst ? current.angleTotal : elapsedMsec * animateMoveRadMsec;
    if (angleGoal > current.angleTotal) {
        angleGoal = current.angleTotal;
    }
    var angleStep = current.angleSign * angleGoal;
    var pos = current.startVec.clone().applyAxisAngle(current.axisVec, angleStep);
    animateCameraLocation[0] = pos.x;
    animateCameraLocation[1] = pos.y;
    animateCameraLocation[2] = pos.z;
    animateSetCamera(true);

    if (angleGoal >= current.angleTotal) {
        animateCameraLocation[0] = current.targetVec.x;
        animateCameraLocation[1] = current.targetVec.y;
        animateCameraLocation[2] = current.targetVec.z;
        animateSetCamera(true);
        _animateCameraMoveCurrent = null;
    }
}

// Build target vectors and timing data for a camera move.
function _animateBuildCameraMove(move) {
    var startVec = new THREE.Vector3(animateCameraLocation[0], animateCameraLocation[1],
            animateCameraLocation[2]);
    var targetVec = startVec.clone();
    var axisVec = null;
    var angleSign = 1.0;
    var angleTotal = 0.0;

    if (move === "left") {
        targetVec.set(-startVec.z, startVec.y, startVec.x);
        axisVec = new THREE.Vector3(0, 1, 0);
        angleSign = -1.0;
        angleTotal = Math.PI / 2.0;
    } else if (move === "right") {
        targetVec.set(startVec.z, startVec.y, -startVec.x);
        axisVec = new THREE.Vector3(0, -1, 0);
        angleSign = -1.0;
        angleTotal = Math.PI / 2.0;
    } else if (move === "up") {
        if (startVec.y >= 0) {
            return null;
        }
        targetVec.set(startVec.x, -startVec.y, startVec.z);
        axisVec = new THREE.Vector3().crossVectors(startVec, targetVec);
        if (axisVec.lengthSq() < 0.000001) {
            axisVec.set(1, 0, 0);
        } else {
            axisVec.normalize();
        }
        angleTotal = startVec.angleTo(targetVec);
    } else if (move === "down") {
        if (startVec.y <= 0) {
            return null;
        }
        targetVec.set(startVec.x, -startVec.y, startVec.z);
        axisVec = new THREE.Vector3().crossVectors(startVec, targetVec);
        if (axisVec.lengthSq() < 0.000001) {
            axisVec.set(1, 0, 0);
        } else {
            axisVec.normalize();
        }
        angleTotal = startVec.angleTo(targetVec);
    } else {
        console.log("Ignoring unknown camera move \"" + move + "\".");
        return null;
    }

    return {
        axisVec : axisVec,
        angleSign : angleSign,
        angleTotal : angleTotal,
        startMsec : Date.now(),
        startVec : startVec,
        targetVec : targetVec
    };
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
        if (animateTimerState === "inspect") {
            _animateTimerAnimated = true;
            var backgroundColor = "#ff8080";
            var elapsedMsec = (1000 * animateTimerInspectionSecs)
                    - (Date.now() - _animateTimerStart);
            animateElapsedMsecOld = 0;
            if (elapsedMsec <= 0) {
                // If they ran out of inspection time switch to solve and get
                // the next animation.
                animateTimerState = "solve";
                _animateTimerStart = Date.now();
                return;
            }
        } else if (animateTimerState === "scramble") {
            _animateTimerAnimated = false;
            var backgroundColor = "#808080";
            var elapsedMsec = null;
            animateElapsedMsecOld = 0;
        } else if (animateTimerState === "solve") {
            _animateTimerAnimated = true;
            var backgroundColor = "#80ff80";
            var elapsedMsec = Date.now() - _animateTimerStart;
        } else if (animateTimerState === "solved") {
            _animateTimerAnimated = false;
            var backgroundColor = "#ffff80";
            var elapsedMsec = _animateTimerSolved - _animateTimerStart;
        } else {
            _animateTimerAnimated = false;
            var backgroundColor = "#ff80ff";
            // Unknown animateTimerState. This should not happen.
            utilsFatalError("Unknown animateTimerState \"" + animateTimerState + "\"");
            var elapsedMsec = -1;
        }
        var timerText = utilsElapsedMsecToStr(elapsedMsec);

        if ((elapsedMsec && animateElapsedMsecOld) &&
                ((elapsedMsec - animateElapsedMsecOld) > _animateTimerJumpMax)) {
            var jump = (elapsedMsec - animateElapsedMsecOld) / 1000.0;
            // This sometimes happens.  I think it's typically due to the
            // clock jumping forward due to the computer being suspended.
            console.log("Timer jumped forward " + jump + " seconds.");
        }
        animateElapsedMsecOld = elapsedMsec;

        if ((_animateTimerDisplayVisible === true)
                && (_animateTimerDisplayText === timerText)
                && (_animateTimerDisplayState === animateTimerState)
                && (_animateTimerDisplayCanvasWidth === animateCanvasWidth)
                && (_animateTimerDisplayCanvasHeight === animateCanvasHeight)) {
            return;
        }

        // Prevent wrapping prior to the message being displayed since it
        // messes up the centering.
        initElTimer.style.left = "0px";
        initElTimer.style.opacity = 1.0;
        initElTimer.style.backgroundColor = backgroundColor;
        initElTimer.innerHTML = timerText;

        // Position the timer dialog.
        var timerLeft = animateCanvasWidth - initElTimer.clientWidth - 1;
        if (timerLeft < 0) {
            timerLeft = 0;
        }
        initElTimer.style.left = timerLeft + "px";
        initElTimer.style.top = (animateCanvasHeight - initElTimer.offsetHeight) + "px";

        _animateTimerDisplayVisible = true;
        _animateTimerDisplayText = timerText;
        _animateTimerDisplayState = animateTimerState;
        _animateTimerDisplayCanvasWidth = animateCanvasWidth;
        _animateTimerDisplayCanvasHeight = animateCanvasHeight;
    } else {
        if (_animateTimerDisplayVisible !== false) {
            initElTimer.style.opacity = 0.0;
            _animateTimerDisplayVisible = false;
            _animateTimerDisplayText = null;
            _animateTimerDisplayState = null;
        }
    }
}
