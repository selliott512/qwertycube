"use strict";

// Globals

var escLast = false;
var helpDisplayed = false;
var keyMap = {};
var keyMapSize = 0;
var lastTouchX;
var lastTouchY;
var moveStart = null;
var rotationLock = false;
var buttonColorOrig;
var buttonColorHighlight = "rgb(255, 255, 128)";
var buttonFlashDelay = 300;

// Buttons that appear at the bottom for the info dialog. Row is zero based.
var helpButtonList = [ {
    label : "Close",
    func : helpClose
} ];

// Public methods

function eventAdd() {
    // Register event listeners that are needed by this program. Note that
    // bubbling ("true" argument) is used so that these events are processed
    // here before OrbitControls.
    console.log("Adding event listeners.");
    document.addEventListener("keydown", onKeyDown, true);
    containerEl.addEventListener(mobile ? "touchstart" : "mousedown",
            onMouseDown, true);
    containerEl.addEventListener(mobile ? "touchend" : "mouseup", onMouseUp,
            true);
    if (mobile) {
        containerEl.addEventListener("touchmove", onTouchMove);
    }

    window.addEventListener("resize", onResize, true);

    // Make sure the button bar does not do anything with events other than
    // click buttons.
    if (mobile) {
        containerEl.addEventListener("touchmove", preventDefault);
    }
}

// Private methods

function helpClose() {
    showHelp(false);
}

function onButtonBarButton(event, buttonEl, button) {
    var func = button.func;
    var key = button.key;
    var label = button.label;

    // Don't confuse OrbitControls by allowing it to see this click.
    orbitControls.enabled = false;

    if (key) {
        // Create a pseudo event and pretend it was a key press.
        var event = {
            buttonBar : true
        };
        while (key.length > 1) {
            var modifier = key[0];
            key = key.substr(1);
            switch (modifier) {
            case "A":
                event.altKey = true;
                break;
            case "S":
                event.shiftKey = true;
                break;
            default:
                // This should not happen.
                console.log("Unknown modifier " + modifier);
            }
        }
        event.buttonBarChar = key;
        onKeyDown(event);
    } else if (func) {
        // Just call the function for the button.
        func();
    } else {
        // This should not happen.
        console.log("Button must have either key or func.")
    }

    initSetButtonColor(buttonEl, button, true);
}

function onKeyDown(event) {
    if ((event.keyCode == 16) || (event.keyCode == 18)) {
        // Ignore shift and alt being pressed by themselves.
        return;
    }
    var buttonBar = event.buttonBar;
    var eventChar = event.buttonBarChar ? event.buttonBarChar : String
            .fromCharCode(event.keyCode);
    var alt = escLast || event.altKey;
    var shift = event.shiftKey;
    if (infoDisplayed) {
        // The info dialog has it's own event handler.
        infoOnKeyDown(event);
        return;
    }
    if (event.ctrlKey) {
        // Avoid interfering with normal browser behavior.
        console.log("Ignoring key event due to the control key.");
        return;
    }

    // Apply a keymap, if any. If it came from the button bar interpret as is
    // without mapping.
    if (keyMapSize && !buttonBar) {
        // Look for the keystroke in the keymap.
        // Order matters here.
        var prefix = (alt ? "A" : "") + (shift ? "S" : "");
        var keyMapValue = keyMap[prefix + eventChar];
        if (!keyMapValue) {
            // If the character could not be found try the key code.
            keyMapValue = keyMap[prefix + event.keyCode];
        }
        if (keyMapValue) {
            if (keyMapValue[0] == "k") {
                // Map the keystroke to a different keystroke.
                eventChar = keyMapValue.slice(-1);
                alt = keyMapValue.indexOf("A") !== -1;
                shift = keyMapValue.indexOf("S") !== -1;
            } else if (keyMapValue[0] == "m") {
                // Map directly to a move and return.
                var move = keyMapValue.substring(1);
                moveQueue.push(move);
                animateCondReq(true);
                escLast = false;
                return;
            } else {
                console.log("Unknown keyMap value \"" + keyMapValue + "\".");
            }
        }
    }

    var args = eventToRotation[eventChar];
    if (event.keyCode == 27) {
        if (helpDisplayed) {
            showHelp(false);
            return;
        }
        escLast = true;
    } else if (args) {
        // Regular movement
        var move = eventChar;
        if (shift) {
            move += "'";
        }
        if (alt) {
            move = move.toLowerCase();
        }
        moveQueue.push(move);
        animateCondReq(true);
        escLast = false;
    } else {
        // Special keys
        switch (eventChar) {
        // A lot of good letters were already taken.
        case "A": // (A)nimation toggle
            animation = !animation;
            var msg = "Animation is "
                    + (animation ? ("on at " + moveSec + " TPS") : "off");
            animateUpdateStatus(msg);
            break;
        case "C": // (C)heckpoint
            if ((moveHistory[moveHistoryNext - 1] == "|")
                    || (moveHistory[moveHistoryNext] == "|")) {
                animateUpdateStatus("Savepoint already set");
            } else {
                animateUpdateStatus("Savepoint set");
                moveHistory.splice(moveHistoryNext++, 0, "|");
            }
            break
        case "G": // Undo (like Ctrl-G in Emacs). Shift to redo.
            if (moveCurrent || moveQueue.length) {
                console.log("Ignoring undo/redo due to pending moves.");
                return;
            }
            while (true) {
                var move = null;
                var moveG = null;
                var moveHistoryNextOld = moveHistoryNext;
                if (shift) {
                    // redo
                    if (moveHistoryNext < moveHistory.length) {
                        move = moveHistory[moveHistoryNext++];
                        moveG = move;
                    }
                } else {
                    // undo
                    if (moveHistoryNext > 0) {
                        move = moveHistory[--moveHistoryNext];
                        moveG = getInverseMove(move);
                    }
                }
                if (alt && (move == "|")) {
                    // A savepoint was reached with the alt key pressed, so
                    // stop without processing the savepoint.
                    moveHistoryNext = moveHistoryNextOld;
                    break;
                }
                console.log((shift ? "Redoing" : "Undoing")
                        + " move "
                        + (move ? move : "- nothing to "
                                + (shift ? "redo" : "undo")));
                if (moveG) {
                    // "G" indicates it's an undo.
                    moveQueue.push(moveG + "G");
                    animateCondReq(true);
                }
                if (!moveG || !alt) {
                    // Break if a move could not be found due to reaching
                    // the end, or because alt was not pressed, so only one
                    // undo/redo should be done.
                    break;
                }
            }
            break;
        case "H": // (H)help
            showHelp(!helpDisplayed);
            break;
        case "I": // (I)nformation
            infoShow();
            if (!buttonBar) {
                event.preventDefault();
            }
            break;
        case "J": // (J)umble (S was taken)
            var msg = "Scrambling the cube with "
                    + (scrambleType == "jsss" ? "jsss"
                            : (scrambleCount + " moves"))
                    + ". \"I\" to see the scramble.";
            animateUpdateStatus(msg);
            scramble();
            break;
        case "K": // Toggle rotation lock.
            rotationLock = !rotationLock;
            animateUpdateStatus("Rotation lock "
                    + (rotationLock ? "enabled" : "disabled") + ".")
            animateCondReq(true);
            break;
        case "N": // (N)new cube
            if ((buttonBar && confirm("New cube?")) || (alt && shift)) {
                animateUpdateStatus("New cube");
                animateNewCube();
            } else {
                if (!buttonBar) {
                    animateUpdateStatus("New cube?  Alt-Shift-N");
                }
            }
            break;
        case "O": // (O)rientation display toggle.
            dispOrientationLabels = !dispOrientationLabels;
            animateUpdateStatus((dispOrientationLabels ? "Displaying"
                    : "Not displaying")
                    + " orientation labels.");
            animateCondReq(true);
            break;
        case "P": // (P)ersistence storage clear
            if ((buttonBar && confirm("Persistence storage clear?"))
                    || (alt && shift)) {
                // This message probably won't be seen.
                animateUpdateStatus("Persistence storage clear");
                initClearStorage();
                location.reload();
            } else {
                if (!buttonBar) {
                    animateUpdateStatus("Persistence storage clear?  Alt-Shift-P");
                }
            }
            break;
        case "T": // (T)imer
            timer = !timer;
            console.log("timer: " + timer);
            animateCondReq(true);
            break;
        default:
            console.log("Ignoring unknown key \"" + eventChar + "\".");
            break;
        }
    }
}

function onMouseDown(event) {
    if (infoDisplayed) {
        return;
    }

    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    // Primary button - true for the left mouse button or any touch event.
    var primaryButton = mobile || (event.button === 0);
    if (primaryButton && ((!mobile) || event.touches.length)) {
        if (mobile) {
            var x = event.touches[0].pageX;
            var y = event.touches[0].pageY;
        } else {
            var x = event.clientX;
            var y = event.clientY;
        }
        // Left mouse button was clicked.
        moveStart = cubiesEventToCubeCoord(x, y, null);

        // Don't rotate the cube if the user clicked on it.
        orbitControls.enabled = moveStart ? false : !rotationLock;
    }

    // The user may be adjusting the camera if a mouse button is done. When
    // in doubt animate.
    cameraAdjusting = true;
    animateCondReq(true);
}

function onMouseUp(event) {
    if (infoDisplayed) {
        return;
    }

    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    // Primary button - true for the left mouse button or any touch event.
    var primaryButton = mobile || (event.button === 0);
    if (!primaryButton) {
        // Only handle the left mouse button and touch events.
        return;
    }

    if (primaryButton && moveStart) {
        if (mobile) {
            var x = lastTouchX;
            var y = lastTouchY;
        } else {
            var x = event.clientX;
            var y = event.clientY;
        }
        var moveEnd = cubiesEventToCubeCoord(x, y, moveStart.axis);
        if (moveEnd) {
            // Assuming cube was touched at moveStart and moveStart to moveEnd
            // is the direction force was applied calculate the torque given the
            // center of the cube as a pivot.
            var force = moveEnd.pos.clone();
            force.sub(moveStart.pos);
            var torque = new THREE.Vector3();
            torque.crossVectors(moveStart.pos, force);

            // The axis that had the most torque is assumed the one that the
            // move is to be around. The sign is in the vector rotation sense
            // (counter clockwise positive) and not the cube sense (clockwise
            // positive).
            var axis = largestAbsoluteAxis(torque);
            var sign = torque[axis] >= 0 ? "+" : "-";

            // Convert from the coordinate along the rotating axis to one of
            // three layers -1, 0 and 1. cubiesSep is right in the middle of the
            // gap between layers.
            var layerStart = (moveStart.pos[axis] < -cubiesSep) ? -1
                    : ((moveStart.pos[axis] > cubiesSep) ? 1 : 0);
            var layerEnd = (moveEnd.pos[axis] < -cubiesSep) ? -1
                    : ((moveEnd.pos[axis] > cubiesSep) ? 1 : 0);

            if (Math.abs(layerStart - layerEnd) == 1) {
                // Since double layer moves are not in the eventToRotation
                // table convert to single layer, but make a note that it's
                // really a double layer.
                var doubleLayer = true;
                if (!layerStart) {
                    layerStart = layerEnd;
                } else {
                    layerEnd = layerStart;
                }
            } else {
                var doubleLayer = false;
            }

            if (layerStart < layerEnd) {
                var layerMin = layerStart;
                var layerMax = layerEnd;
            } else {
                var layerMin = layerEnd;
                var layerMax = layerStart;
            }

            // Look for the move in eventToRotation.
            for ( var move in eventToRotation) {
                var args = eventToRotation[move];
                if ((args[1] == axis) && (args[2] == layerMin)
                        && (args[3] == layerMax)) {
                    // Found a match. Create the move.
                    if (doubleLayer) {
                        move = move.toLowerCase();
                    }
                    if (args[0] !== sign) {
                        // Either the direction of the unmodified move in the
                        // table, or the direction the user specified about the
                        // axis, is negative. Go the other way.
                        move += "'";
                    }

                    // Queue the move up.
                    moveQueue.push(move);

                    break;
                }
            }
        }
        moveStart = null;
        animateCondReq(true);
    }

    orbitControls.enabled = !rotationLock;
    cameraAdjusting = false;
}

function onResize(event) {
    animateResize();
    animateCondReq(true);
}

function onTouchMove(event) {
    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    if (event.touches.length) {
        // Support multiple touches. Average?
        lastTouchX = event.touches[0].pageX;
        lastTouchY = event.touches[0].pageY;
    } else {
        lastTouchX = null;
        lastTouchY = null;
    }
}

function preventDefault(event) {
    event.preventDefault();
}

function showHelp(show) {
    initAddUpdateButtons(show ? helpButtonList : mainButtonList);

    if (show) {
        helpEl.style.left = "0px";
        helpEl.style.top = "0px";
        helpEl.style.width = (canvasWidth - 6) + "px";
        helpEl.style.height = primaryHeight + "px";
    }
    helpEl.style.visibility = show ? "visible" : "hidden";

    helpDisplayed = show;
}
