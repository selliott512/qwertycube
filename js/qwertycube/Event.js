"use strict";

// Globals

var escLast = false;
var helpDisplayed = false;
var heise = false;
var heiseMap = {
    A : "mY'",
    B : "mX'",
    C : "mu'",
    D : "mL",
    E : "mL'",
    F : "mU'",
    G : "mF'",
    H : "mF",
    I : "mR",
    J : "mU",
    K : "mR'",
    L : "mD'",
    M : "mr'",
    N : "mX'",
    O : "mB'",
    P : "mZ",
    Q : "mZ'",
    R : "ml'",
    S : "mD",
    T : "mX",
    U : "mr",
    V : "ml",
    W : "mB",
    X : "mM",
    Y : "mX",
    Z : "md",
    ";" : "mY",
    "," : "mu",
    "." : "mM'",
    "/" : "md'",
};
var keyAllowedModifiersMap = {
    G : ["A", "S", "AS"],
    J : ["AS"],
    N : ["AS"],
    P : ["AS"],
};
var keyMap = {};
var keyMapSize = 0;
var keyMapTotal = {};
var keyAdditionalMap = {
    "0" : "A",
    "1" : "C",
    "'" : "G",
    "2" : "H",
    "3" : "I",
    "[" : "J",
    "4" : "K",
    "]" : "N",
    "5" : "O",
    "=" : "P",
    "6" : "Q",
    "7" : "T",
    "8" : "V"
};
var keyPreventDefault = true;
// Incomplete.  Added to as needed.
var keyPunctuationMap = {
     50 : "@",
     51 : "#",
     52 : "$",
    173 : "-",
    186 : ";",
    187 : "=",
    188 : ",",
    189 : "-",
    190 : ".",
    191 : "/",
    219 : "[",
    221 : "]",
    222 : "'"
};
var moveBegins = [];
var moveThreshold = 30;
var numericPrefix = "";
var rotationLock = false;
var rotationLockLimit = 100;
var buttonColorOrig;
var buttonColorHighlight = "rgb(255, 255, 128)";
var buttonFlashDelay = 300;
var scramblerInitialized = false;
var toolTipButtonEl;
var toolTipTimeout = 700;

// Buttons that appear at the bottom for the settings dialog. Row is zero based.
var helpButtonList = [{
    label : "Close",
    func : helpClose,
    tip : "Close this help dialog"
}];

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

    // Get rid of the status message if the user clicks on it.
    statusEl.addEventListener(mobile ? "touchstart" : "mousedown",
            animateClearStatus);
}

function eventUpdateKeyMap() {
    // Save the size of the key map to speed things up.
    keyMapSize = 0;
    for ( var key in keyMap) {
        keyMapSize++;
    }

    // If there is both Heise and keyMap keyMap should take precedence.
    keyMapTotal = copyMap(heise ? heiseMap : keyMap);
    if (heise) {
        for ( var item in keyMap) {
            keyMapTotal[item] = keyMap[item];
        }
    }
}

// Private methods

function getCoords(event) {
    var coords = [];
    if (mobile) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            coords.push([event.changedTouches[0].pageX,
                    event.changedTouches[0].pageY]);
        }
    } else {
        coords.push([event.clientX, event.clientY]);
    }
    return coords;
}

function helpClose() {
    showHelp(false);
}

function onButtonClick(event, buttonEl, button) {
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

    toolTipButtonEl = null;
    tipEl.style.visibility = "hidden";
}

function onButtonOver(event, buttonEl, button) {
    if (toolTipTimeout === -1) {
        // Tool tips have been disabled.
        return;
    }

    // The location will be relative to the button.
    var left = parseInt(buttonEl.style.left);
    var top = parseInt(buttonEl.style.top);

    if (!button.tip) {
        // The should not happen.
        console.log("Button " + button.label + " is missing a tool tip");
        return;
    }
    tipEl.innerHTML = button.tip;

    // Now that the width is known the left side can be adjusted so that it's
    // centered over the button, but also entirely on the screen.
    left += (buttonEl.clientWidth - tipEl.clientWidth) / 2;
    left = Math.max(0, left);
    left = Math.min(left, canvasWidth - tipEl.clientWidth);

    // A bit above the button.
    top -= 1.4 * parseInt(tipEl.clientHeight);

    tipEl.style.left = left + "px";
    tipEl.style.top = top + "px";

    toolTipButtonEl = buttonEl;
    setTimeout(function(elem) {
        return function() {
            if (elem === toolTipButtonEl) {
                tipEl.style.visibility = "visible";
            }
        };
    }(buttonEl), toolTipTimeout);
}

function onButtonOut(event, buttonEl, button) {
    toolTipButtonEl = null;
    tipEl.style.visibility = "hidden";
}

function onKeyDown(event) {
    var keyCode = event.keyCode;
    var punctuation = false;
    if ((keyCode === 16) || (keyCode === 18)) {
        // Ignore shift and alt being pressed by themselves.
        return;
    } else if ((!helpDisplayed) && (!settingsDisplayed) && (keyCode >= 0x80)) {
        // A special punctuation character.  This just used by Heise and
        // custom maps.
        var eventChar = keyPunctuationMap[keyCode];
        if (eventChar) {
            punctuation = true;
        } else {
            // Place holder for unknown characters for now.
            eventChar = "?";
            console.log("Mapping unknown punctuation keyCode " + keyCode
                    + " to \"" + eventChar + "\".");
        }
    } else {
        // Ordinary ASCII character.
        var eventChar = event.buttonBarChar ? event.buttonBarChar : String
                .fromCharCode(keyCode);
    }
    var buttonBar = event.buttonBar;
    var alt = escLast || event.altKey;
    var shift = event.shiftKey;
    if (settingsDisplayed) {
        // The settings dialog has it's own event handler.
        settingsOnKeyDown(event);
        return;
    }
    if (event.ctrlKey) {
        // Avoid interfering with normal browser behavior.
        console.log("Ignoring key event due to the control key.");
        return;
    }

    // Apply a keymap, if any. If it came from the button bar interpret as is
    // without mapping.
    if ((heise || keyMapSize) && !buttonBar) {
        // Look for the keystroke in the keymap.
        // Order matters here.
        var prefix = (alt ? "A" : "") + (shift ? "S" : "");
        var keyMapValue = keyMapTotal[prefix + eventChar];
        if (!keyMapValue) {
            // If the character could not be found try the key code.
            keyMapValue = keyMapTotal[prefix + event.keyCode];
        }
        if (keyMapValue) {
            if (keyMapValue[0] === "k") {
                // Map the keystroke to a different keystroke.
                eventChar = keyMapValue.slice(-1);
                alt = keyMapValue.indexOf("A") !== -1;
                shift = keyMapValue.indexOf("S") !== -1;
            } else if (keyMapValue[0] === "m") {
                // Map directly to a move and return.
                var move = keyMapValue.substring(1);
                enqueueMove(numericPrefix + move);
                numericPrefix = "";
                animateCondReq(true);
                escLast = false;

                // If the user made a move they probably don't care about the
                // message.
                animateClearStatus();
                return;
            } else {
                console.log("Unknown keyMapTotal value \"" + keyMapValue
                        + "\".");
            }
        }
    }

    var numeric = (eventChar >= "0") && (eventChar <= "9");
    if ((alt && shift && numeric) || (punctuation && (eventChar !== "-"))) {
        // Convert the alternate numeric or punctuation key to a command key.
        var eventCharOld = eventChar;
        eventChar = keyAdditionalMap[eventChar];
        if (!eventChar) {
            // Should not happen.
            console.log("Could not find additional key \"" + eventChar + "\".");
            eventChar = eventCharOld;
        }
    } else if (numeric || (eventChar === "-")) {
        if (shift) {
            var eventCharOld = eventChar;
            eventChar = keyPunctuationMap[keyCode];
            if (!eventChar) {
                eventChar = eventCharOld;
            }
        } else {
            // The key typed is probably meant to be a numeric prefix for a higher
            // order cube.
            numericPrefix += eventChar;
            animateCondReq(true);
            escLast = false;
            animateClearStatus();
            return;
        }
    }

    // Dismiss any existing status message upon a key event as it probably
    // means the user is no longer reading the message.
    animateClearStatus();

    // For Heise all possible moves should have been specified by the map(s),
    // so no need to look for the rotation here.
    var rotation = heise ? null : faceToRotation[eventChar];
    if (event.keyCode === 27) {
        if (helpDisplayed) {
            showHelp(false);
            escLast = false;
            return;
        }
        escLast = true;
    } else if (rotation) {
        // Regular movement
        var move = eventChar;
        if (shift) {
            move += "'";
        }
        if (alt) {
            move = move.toLowerCase();
        }
        enqueueMove(numericPrefix + move);
        numericPrefix = "";
        animateCondReq(true);
        escLast = false;
        if (keyPreventDefault) {
            event.preventDefault();
        }
    } else if (!helpDisplayed) {
        // Special keys

        // Make sure we don't process key combinations this program does not
        // understand - only the browser should.  Note that this check is not
        // done if just shift is pressed as shift by itself is unlikely to have
        // special meaning to the browser.  This also means that for some
        // mappings, such as Heise, there is an alternative way of invoking
        // commands (Shift-J to scramble, etc.).
        if (alt) {
            var valid = false;
            if (numeric) {
                var alloweds = ["AS"];
            } else {
                var alloweds = keyAllowedModifiersMap[eventChar];
            }
            if (alloweds) {
                for (i = 0; i < alloweds.length; i++) {
                    var allowed = alloweds[i];
                    if (((allowed === "A") && alt && !shift)
                            || ((allowed === "S") && !alt && shift)
                            || ((allowed === "AS") && alt && shift)) {
                        valid = true;
                    }
                }
            }
            if (!valid) {
                console.log("Ignoring  key " + eventChar + " with "
                        + "invalid alt or shift modifiers.  Allowed: "
                        + (alloweds ? alloweds : "none"));
                return;
            }
        }

        var validEventChar = true;
        switch (eventChar) {
        // Punctuation is used for changing the cube order since those buttons
        // don't have a key binding.
        case "@": // Decrease the order.
            if (cubiesOrder > 2) {
                cubiesOrder--;
                animateUpdateStatus("Decreased order to " + cubiesOrder);
                settingsApply(false);
            } else {
                animateUpdateStatus("Minmimum order is 2");
            }
            break;
        case "#": // Go back to 3x3x3.
            cubiesOrder = 3;
            animateUpdateStatus("Reset order to " + cubiesOrder);
            settingsApply(false);
            break;
        case "$": // Increase the order
            cubiesOrder++;
            animateUpdateStatus("Increased order to " + cubiesOrder);
            settingsApply(false);
            break;

        // A lot of good letters were already taken.
        case "A": // (A)nimation toggle
            animationInst = !animationInst;
            var msg = "Animation "
                    + (animationInst ? "is instantaneous"
                            : ("at " + moveSec + " TPS"));
            animateUpdateStatus(msg);
            break;
        case "C": // (C)heckpoint
            if ((moveHistory[moveHistoryNext - 1] === "|")
                    || (moveHistory[moveHistoryNext] === "|")) {
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
            var firstMove = true;
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
                // If at a savepoint to start step past it.
                if (firstMove && (move === "|")) {
                    firstMove = false;
                    continue;
                }
                if (alt && (move === "|")) {
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
                    enqueueMove(moveG + "G");
                    animateCondReq(true);
                }
                if (!moveG || !alt) {
                    // Break if a move could not be found due to reaching
                    // the end, or because alt was not pressed, so only one
                    // undo/redo should be done.
                    break;
                }
                firstMove = false;
            }
            if ((moveHistory[moveHistoryNext - 1] === "|")
                    || (moveHistory[moveHistoryNext] === "|")) {
                animateUpdateStatus("Savepoint reached");
            }
            break;
        case "H": // (H)help
            showHelp(!helpDisplayed);
            break;
        case "I": // (I)nformation
            settingsShow();
            break;
        case "J": // (J)umble (S was taken)
            // If alt and shift then reset the cube to it's standard new
            // orientation and clear the move list before doing the scramble.
            // This is good if the user wants the resulting cube to match the
            // scramble, but it destroys information. If alt and shift are
            // not pressed the scramble sequence is simply applied to the
            // existing cube.
            var newCube = alt && shift;
            if (newCube) {
                if (!animateNewCube(true)) {
                    return;
                }
            }

            // Scrambling is structured this way, with two messages, because
            // scrambling may be slow the first time. The first message is
            // not displayed until this function returns, so the setTimeout
            // was needed. 10 msec is used so that the first status has
            // a chance to be displayed before the blocking scrambler.
            if (!scramblerInitialized) {
                animateUpdateStatus("Initializing scrambler");
                scramblerInitialized = true;
            }
            setTimeout(function() {
                scramble();
                animateUpdateStatus("Scrambled " + (newCube ? "new " : " ")
                        + "cube");
            }, 10);
            break;
        case "K": // Toggle rotation lock.
            rotationLock = !rotationLock;
            animateUpdateStatus("Rotation lock "
                    + (rotationLock ? "enabled" : "disabled"))
            animateCondReq(true);
            break;
        case "N": // (N)new cube
            if ((buttonBar && confirm("New cube?")) || (alt && shift)) {
                animateUpdateStatus("New cube");
                if (!animateNewCube(true)) {
                    return;
                }
            } else {
                if (!buttonBar) {
                    animateUpdateStatus("New cube?  Alt-Shift-N");
                }
            }
            break;
        case "O": // (O)rientation display toggle.
            dispOrientationLabels = !dispOrientationLabels;
            animateUpdateStatus("Orientation labels "
                    + (dispOrientationLabels ? "enabled" : "disabled"))
            animateCondReq(true);
            break;
        case "P": // (P)ersistent storage clear
            if ((buttonBar && confirm("Reset all settings?")) || (alt && shift)) {
                // This message probably won't be seen.
                animateUpdateStatus("Reset all settings");
                initClearStorage();
                location.reload();
            } else {
                if (!buttonBar) {
                    animateUpdateStatus("Reset all settings?  Alt-Shift-P");
                }
            }
            break;
        case "Q": // Color (Q)uality cycle.
            // Find the current color scheme.
            var i = colorTableKeys.indexOf(cubiesColorScheme);
            if (i !== -1) {
                i = (++i) % colorTableKeys.length;
                cubiesColorScheme = colorTableKeys[i];
                animateUpdateStatus("Color scheme " + cubiesColorScheme);
            } else {
                // This should not happen
                console.log("Unknown color scheme \"" + cubiesColorScheme
                        + "\".");
            }
            animateResetScene(cubies);
            break;
        case "T": // (T)imer
            timer = !timer;
            console.log("timer: " + timer);
            animateCondReq(true);
            break;
        case "V": // Heise
            heise = !heise;
            eventUpdateKeyMap();
            animateUpdateStatus((heise ? "Heise" : "RLUDFB") + " key mapping");
            break;
        default:
            console.log("Ignoring unknown key \"" + eventChar + "\".");
            validEventChar = false;
            break;
        }
        if (validEventChar && !buttonBar) {
            // Flash the button if activated by a key.
            var prefix = (alt ? "A" : "") + (shift ? "S" : "");
            var buttons = buttonKeyToElMap[prefix + eventChar];
            if (!buttons) {
                buttons = buttonKeyToElMap[eventChar];
            }
            if (buttons) {
                initSetButtonColor(buttons[0], buttons[1], true);
            }
            if (keyPreventDefault) {
                event.preventDefault();
            }
        }
        escLast = false;
    }
}

function onMouseDown(event) {
    if (settingsDisplayed) {
        return;
    }

    // Assume that the user no longer wants to see the status message.
    animateClearStatus();

    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    // Primary button - true for the left mouse button or any touch event.
    var primaryButton = mobile || (event.button === 0);
    if (primaryButton && ((!mobile) || event.changedTouches.length)) {
        var beginCoords = getCoords(event);
        for (var i = 0; i < beginCoords.length; i++) {
            var beginCoord = beginCoords[i];
            // Left mouse button was clicked.
            var moveBegin = cubiesEventToCubeCoord(beginCoord[0],
                    beginCoord[1], null);
            if (moveBegin) {
                moveBegins.push([beginCoord, moveBegin]);
            }
        }
        // Don't rotate the cube if the user clicked on it.
        orbitControls.enabled = moveBegins.length ? false : !rotationLock;
    }

    // The user may be adjusting the camera if a mouse button is done. When
    // in doubt animate.
    if (orbitControls.enabled) {
        cameraAdjusting = true;
        animateCondReq(true);
    }
}

function onMouseUp(event) {
    if (settingsDisplayed) {
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

    if (primaryButton && moveBegins.length) {
        var endCoords = getCoords(event);
        for (var i = 0; i < endCoords.length; i++) {
            var endCoord = endCoords[i];
            // For the current endCoord find the closest matching begin
            // coordinate.
            var bestDist = 1000000;
            for (var j = 0; j < moveBegins.length; j++) {
                var entry = moveBegins[j];
                var beginCoord = entry[0];
                var moveBegin = entry[1];
                var dist = Math.abs(beginCoord[0] - endCoord[0])
                        + Math.abs(beginCoord[1] - endCoord[1]);
                if (dist < bestDist) {
                    bestDist = dist;
                    var bestMoveBegin = moveBegin;
                }
            }
            dist = bestDist;
            moveBegin = bestMoveBegin;

            var mouseMoved = dist >= moveThreshold;
            if (mouseMoved) {
                // The mouse was moved significantly since mouseDown.
                var moveEnd = cubiesEventToCubeCoord(endCoord[0], endCoord[1],
                        moveBegin.axis);
            } else {
                // A single click without movement.
                var moveEnd = {};
                moveEnd.axis = moveBegin.axis;
                moveEnd.pos = moveBegin.pos.clone();

                // The moveFaceDirection is from the center of the face clicked
                // to moveBegin. The rotation torque will be calculated as if
                // the mouse movement was this direction.
                var moveFaceDirection = moveEnd.pos.clone();
                moveFaceDirection[moveEnd.axis] = 0;
                moveEnd.pos.add(moveFaceDirection);
            }
            if (moveEnd) {
                // Assuming cube was touched at moveBegin and moveBegin to
                // moveEnd is the direction force was applied calculate the
                // torque given the center of the cube as a pivot.
                var force = moveEnd.pos.clone();
                force.sub(moveBegin.pos);
                var torque = new THREE.Vector3();
                torque.crossVectors(moveBegin.pos, force);

                // The axis that had the most torque is assumed the one that the
                // move is to be around. The sign is in the vector rotation
                // sense (counter clockwise positive) and not the cube sense
                // (clockwise positive).
                var axis = largestAbsoluteAxis(torque);
                var sign = torque[axis] >= 0 ? 1 : -1;

                // Get the indexes into the layers along axis.
                var limLoIdx = coordToIndex(moveBegin.pos[axis]);
                if (mouseMoved) {
                    var limHiIdx = coordToIndex(moveEnd.pos[axis]);
                    if (limLoIdx > limHiIdx) {
                        var buf = limLoIdx;
                        limLoIdx = limHiIdx;
                        limHiIdx = buf;
                    }
                } else {
                    if ((Math.abs(moveFaceDirection.x) < cubiesExtendedMiddle)
                            && (Math.abs(moveFaceDirection.y) <
                                    cubiesExtendedMiddle)
                            && (Math.abs(moveFaceDirection.z) <
                                    cubiesExtendedMiddle)) {
                        // A middle was clicked - whole cube rotation.
                        limLoIdx = 0;
                        var limHiIdx = cubiesOrder - 1;
                    } else {
                        var limHiIdx = limLoIdx;
                    }
                }

                var layers = getLayersFromIndexes(sign, limLoIdx, limHiIdx);
                var moveRot = getMoveRotationFromLayers(axis, layers);
                if (moveRot) {
                    // Queue the move and rotation up.
                    enqueueMoveRotation(moveRot);

                    // If the user made a move they probably don't care
                    // about the message.
                    animateClearStatus();
                }
            }
        }
        if (!mobile || (mobile && !event.touches.length)) {
            // If this was the last touch then the above must have processed
            // all of the moveBegins.
            moveBegins.length = 0;
        }
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
}

function preventDefault(event) {
    event.preventDefault();
}

function showHelp(show) {
    initAddUpdateButtons(show ? helpButtonList : mainButtonList);

    if (show) {
        helpEl.style.left = "0px";
        helpEl.style.top = "0px";
        helpEl.style.width = canvasWidth + "px";
        helpEl.style.height = primaryHeight + "px";

        // It seems both the tabIndex and the delay is needed for the help to
        // gain focus.
        helpEl.tabIndex = "1";
        helpEl.scrollTop = 0;
        setTimeout(function() {
            helpEl.focus();
        }, 10);
    }
    helpEl.style.visibility = show ? "visible" : "hidden";
    timerEl.style.visibility = show ? "hidden" : "visible";

    helpDisplayed = show;
}
