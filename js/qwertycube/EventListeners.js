"use strict";

// Globals

var escLast = false;
var helpMsgDisplayed = false;
var moveStart = null;

// Public methods

function eventListenersAdd() {
    // Register event listeners that are needed by this program. Note that
    // document is used as mouse events need to be processed here before
    // OrbitControls does.
    document.addEventListener("keydown", onKeyDown, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);

    window.addEventListener("resize", onResize, false);
}

// Private methods

function onKeyDown(event) {
    var eventChar = String.fromCharCode(event.keyCode);
    var args = eventToRotation[eventChar];
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
    if (event.keyCode == 27) {
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
                    // A mark was reached with the alt key pressed, so stop
                    // without processing the mark.
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
        case "H": // (H)help toggle
            help = !help;
            console.log("Help is " + help);
            var visibility = help ? "visible" : "hidden";
            helpEl.style.visibility = visibility;
            if (!helpMsgDisplayed) {
                animateUpdateStatus("Press H to see the help again.");
                helpMsgDisplayed = true;
            }
            animateCondReq(true);
            break;
        case "I": // (I)nformation
            infoShow();
            event.preventDefault();
            break;
        case "J": // (J)umble (S was taken)
            var msg = "Jumbling (scrambling) the cube with " + scrambleCount
                    + " moves.  \"I\" to see the scramble.";
            animateUpdateStatus(msg);
            scramble();
            break;
        case "N": // (N)new cube
            if (alt && shift) {
                animateUpdateStatus("New cube");
                animateNewCube();
            } else {
                animateUpdateStatus("New cube?  Alt-Shift-N");
            }
            break;
        case "O": // (O)rientation display toggle.
            dispOrientationLabels = !dispOrientationLabels;
            animateUpdateStatus((dispOrientationLabels ? "Display"
                    : "Not displaying")
                    + " orientation labels.");
            animateCondReq(true);
            break;
        case "P": // (P)ersistence storage clear
            if (alt && shift) {
                // This message probably won't be seen.
                animateUpdateStatus("Persistence storage clear");
                initClearStorage();
                location.reload();
            } else {
                animateUpdateStatus("Persistence storage clear?  Alt-Shift-P");
            }
            break;
        case "T": // (T)imer
            timer = !timer;
            console.log("timer: " + timer);
            animateCondReq(true);
            break;
        default:
            // Miscellaneous key strokes that don't convert nicely to their
            // character equivalent.
            if ((event.keyCode == 220) && shift) {
                // Pipe (|) - mark
                if ((moveHistory[moveHistoryNext - 1] == "|")
                        || (moveHistory[moveHistoryNext] == "|")) {
                    animateUpdateStatus("Mark already set");
                } else {
                    animateUpdateStatus("Mark set");
                    moveHistory.splice(moveHistoryNext++, 0, "|");
                }
            }
            break;
        }
    }
}

function onMouseDown(event) {
    if (event.button === 0) {
        // Left mouse button was clicked.
        moveStart = cubiesEventToCubeCoord(event, null);

        // Don't rotate the cube if the user clicked on it.
        cameraControls.enabled = moveStart ? false : true;
    }

    // The user may be adjusting the camera if a mouse button is done. When
    // in doubt animate.
    if (!infoDisplayed) {
        cameraAdjusting = true;
        animateCondReq(true);
    }
}

function onMouseUp(event) {
    if (event.button !== 0) {
        // Only handle the left mouse button.
        return;
    }

    if ((event.button === 0) && moveStart) {
        var moveEnd = cubiesEventToCubeCoord(event, moveStart.axis);
        if (moveEnd) {
            // Assuming cube was touched at moveStart and moveStart to moveEnd
            // is the direction force was applied calculate the torque given the
            // center of the cube as a pivot.
            var force = moveEnd.pos.clone();
            force.sub(moveStart.pos);
            var torque = new THREE.Vector3();
            torque.crossVectors(moveStart.pos, force);

            // The axis that had the most torque is assumed the one that the
            // move is to be around.  The sign is in the vector rotation sense
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
            
            console.log("ls=" + layerStart + " le=" + layerEnd);

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
                if ((args[1] == axis)
                        && (args[2] == layerMin) && (args[3] == layerMax)) {
                    // Found a match.  Create the move.
                    if (doubleLayer) {
                        move = move.toLowerCase();
                    }
                    if (args[0] !== sign) {
                        // Either the direction of the unmodified move in the 
                        // table, or the direction the user specified about the
                        // axis, is negative.  Go the other way.
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

    cameraControls.enabled = true;

    if (!infoDisplayed) {
        cameraAdjusting = false;
    }
}

function onResize(event) {
    animateResize();
    animateCondReq(true);
}
