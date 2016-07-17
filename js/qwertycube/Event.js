"use strict";

// Public globals

var eventButtonColorHighlight = "rgb(255, 255, 128)";
var eventButtonColorOrig;
var eventButtonFlashDelay = 300;
var eventHelpDisplayed = false;
var eventHeise = false;
var eventKeyMap = {};
var eventKeyPreventDefault = true;
var eventMoveThreshold = 30;
var eventRotationLock = false;
var eventRotationLockLimit = 100;
var eventToolTipButtonEl;
var eventToolTipTimeout = 700;

// Private globals

var _eventEscLast = false;
var _eventHeiseMap = {
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
var _eventKeyAllowedModifiersMap = {
    G : ["A", "S", "AS"],
    J : ["AS"],
    N : ["AS"],
    P : ["AS"],
};
var _eventKeyMapSize = 0;
var _eventKeyMapTotal = {};
var _eventKeyAdditionalMap = {
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
// Incomplete.  Added to as needed.
var _eventKeyPunctuationMap = {
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
var _eventMoveBegins = [];
var _eventNumericPrefix = "";
var _eventScramblerInitialized = false;

// Buttons that appear at the bottom for the settings dialog. Row is zero based.
var _eventHelpButtonList = [{
    label : "Close",
    func : _eventHelpClose,
    tip : "Close this help dialog"
}];

// Public functions

function eventAdd() {
    // Register event listeners that are needed by this program. Note that
    // bubbling ("true" argument) is used so that these events are processed
    // here before OrbitControls.
    console.log("Adding event listeners.");
    document.addEventListener("keydown", _eventOnKeyDown, true);
    initContainerEl.addEventListener(initMobile ? "touchstart" : "mousedown",
            _eventOnMouseDown, true);
    initContainerEl.addEventListener(initMobile ? "touchend" : "mouseup", _eventOnMouseUp,
            true);
    if (initMobile) {
        initContainerEl.addEventListener("touchmove", _eventOnTouchMove);
    }

    window.addEventListener("resize", _eventOnResize, true);

    // Make sure the button bar does not do anything with events other than
    // click buttons.
    if (initMobile) {
        initContainerEl.addEventListener("touchmove", eventPreventDefault);
    }

    // Get rid of the status message if the user clicks on it.
    initStatusEl.addEventListener(initMobile ? "touchstart" : "mousedown",
            animateClearStatus);
}

function eventOnButtonClick(event, buttonEl, button) {
    var func = button.func;
    var key = button.key;
    var label = button.label;

    // Don't confuse OrbitControls by allowing it to see this click.
    animateOrbitControls.enabled = false;

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
        _eventOnKeyDown(event);
    } else if (func) {
        // Just call the function for the button.
        func();
    } else {
        // This should not happen.
        console.log("Button must have either key or func.")
    }

    initSetButtonColor(buttonEl, button, true);

    eventToolTipButtonEl = null;
    initTipEl.style.visibility = "hidden";
}

function eventOnButtonOut(event, buttonEl, button) {
    eventToolTipButtonEl = null;
    initTipEl.style.visibility = "hidden";
}

function eventOnButtonOver(event, buttonEl, button) {
    if (eventToolTipTimeout === -1) {
        // Tool tips have been disabled.
        return;
    }

    if (!button.tip) {
        // The should not happen.
        console.log("Button " + button.label + " is missing a tool tip");
        return;
    }
    initTipEl.innerHTML = button.tip;

    // Now that the width is known the left side can be adjusted so that it's
    // centered over the button, but also entirely on the screen.
    var left = parseInt(buttonEl.style.left) +
        (buttonEl.offsetWidth - initTipEl.clientWidth) / 2;
    left = Math.max(0, left);
    left = Math.min(left, animateCanvasWidth - initTipEl.clientWidth);

    // A bit above the button.
    var top = parseInt(buttonEl.style.top) -
        1.4 * parseInt(initTipEl.clientHeight);

    initTipEl.style.left = left + "px";
    initTipEl.style.top = top + "px";

    eventToolTipButtonEl = buttonEl;
    setTimeout(function(elem) {
        return function() {
            if (elem === eventToolTipButtonEl) {
                initTipEl.style.visibility = "visible";
            }
        };
    }(buttonEl), eventToolTipTimeout);
}

function eventPreventDefault(event) {
    event.preventDefault();
}

function eventShowHelp(show) {
    initAddUpdateButtons(show ? _eventHelpButtonList : initMainButtonList);

    if (show) {
        initHelpEl.style.left = "0px";
        initHelpEl.style.top = "0px";
        initHelpEl.style.width = animateCanvasWidth + "px";
        initHelpEl.style.height = initPrimaryHeight + "px";

        // It seems both the tabIndex and the delay is needed for the help to
        // gain focus.
        initHelpEl.tabIndex = "1";
        initHelpEl.scrollTop = 0;
        setTimeout(function() {
            initHelpEl.focus();
        }, 10);
    }
    initHelpEl.style.visibility = show ? "visible" : "hidden";
    initTimerEl.style.visibility = show ? "hidden" : "visible";

    eventHelpDisplayed = show;
}

function eventUpdateKeyMap() {
    // Save the size of the key map to speed things up.
    _eventKeyMapSize = 0;
    for ( var key in eventKeyMap) {
        _eventKeyMapSize++;
    }

    // If there is both Heise and eventKeyMap eventKeyMap should take precedence.
    _eventKeyMapTotal = utilsCopyMap(eventHeise ? _eventHeiseMap : eventKeyMap);
    if (eventHeise) {
        for ( var item in eventKeyMap) {
            _eventKeyMapTotal[item] = eventKeyMap[item];
        }
    }
}

// Private functions

function _eventGetCoords(event) {
    var coords = [];
    if (initMobile) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            coords.push([event.changedTouches[0].pageX,
                    event.changedTouches[0].pageY]);
        }
    } else {
        coords.push([event.clientX, event.clientY]);
    }
    return coords;
}

function _eventHelpClose() {
    eventShowHelp(false);
}

function _eventOnKeyDown(event) {
    var keyCode = event.keyCode;
    var punctuation = false;
    if ((keyCode === 16) || (keyCode === 18)) {
        // Ignore shift and alt being pressed by themselves.
        return;
    } else if ((!eventHelpDisplayed) && (!settingsDisplayed) && (keyCode >= 0x80)) {
        // A special punctuation character.  This just used by Heise and
        // custom maps.
        var eventChar = _eventKeyPunctuationMap[keyCode];
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
    var alt = _eventEscLast || event.altKey;
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
    if ((eventHeise || _eventKeyMapSize) && !buttonBar) {
        // Look for the keystroke in the keymap.
        // Order matters here.
        var prefix = (alt ? "A" : "") + (shift ? "S" : "");
        var keyMapValue = _eventKeyMapTotal[prefix + eventChar];
        if (!keyMapValue) {
            // If the character could not be found try the key code.
            keyMapValue = _eventKeyMapTotal[prefix + event.keyCode];
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
                utilsEnqueueMove(_eventNumericPrefix + move);
                _eventNumericPrefix = "";
                animateCondReq(true);
                _eventEscLast = false;

                // If the user made a move they probably don't care about the
                // message.
                animateClearStatus();
                return;
            } else {
                console.log("Unknown _eventKeyMapTotal value \"" + keyMapValue
                        + "\".");
            }
        }
    }

    var numeric = (eventChar >= "0") && (eventChar <= "9");
    if ((alt && shift && numeric) || (punctuation && (eventChar !== "-"))) {
        // Convert the alternate numeric or punctuation key to a command key.
        var eventCharOld = eventChar;
        eventChar = _eventKeyAdditionalMap[eventChar];
        if (!eventChar) {
            // Should not happen.
            console.log("Could not find additional key \"" + eventChar + "\".");
            eventChar = eventCharOld;
        }
    } else if (numeric || (eventChar === "-")) {
        if (shift) {
            var eventCharOld = eventChar;
            eventChar = _eventKeyPunctuationMap[keyCode];
            if (!eventChar) {
                eventChar = eventCharOld;
            }
        } else {
            // The key typed is probably meant to be a numeric prefix for a higher
            // order cube.
            _eventNumericPrefix += eventChar;
            animateCondReq(true);
            _eventEscLast = false;
            animateClearStatus();
            return;
        }
    }

    // Dismiss any existing status message upon a key event as it probably
    // means the user is no longer reading the message.
    animateClearStatus();

    // For Heise all possible moves should have been specified by the map(s),
    // so no need to look for the rotation here.
    var rotation = eventHeise ? null : rotateFaceToRotation[eventChar];
    if (event.keyCode === 27) {
        if (eventHelpDisplayed) {
            eventShowHelp(false);
            _eventEscLast = false;
            return;
        }
        _eventEscLast = true;
    } else if (rotation) {
        // Regular movement
        var move = eventChar;
        if (shift) {
            move += "'";
        }
        if (alt) {
            move = move.toLowerCase();
        }
        utilsEnqueueMove(_eventNumericPrefix + move);
        _eventNumericPrefix = "";
        animateCondReq(true);
        _eventEscLast = false;
        if (eventKeyPreventDefault) {
            event.preventDefault();
        }
    } else if (!eventHelpDisplayed) {
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
                var alloweds = _eventKeyAllowedModifiersMap[eventChar];
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
            animateAnimationInst = !animateAnimationInst;
            var msg = "Animation "
                    + (animateAnimationInst ? "is instantaneous"
                            : ("at " + animateMoveSec + " TPS"));
            animateUpdateStatus(msg);
            break;
        case "C": // (C)heckpoint
            if ((animateMoveHistory[animateMoveHistoryNext - 1] === "|")
                    || (animateMoveHistory[animateMoveHistoryNext] === "|")) {
                animateUpdateStatus("Savepoint already set");
            } else {
                animateUpdateStatus("Savepoint set");
                animateMoveHistory.splice(animateMoveHistoryNext++, 0, "|");
            }
            break
        case "G": // Undo (like Ctrl-G in Emacs). Shift to redo.
            if (animateMoveCurrent || animateMoveQueue.length) {
                console.log("Ignoring undo/redo due to pending moves.");
                return;
            }
            var firstMove = true;
            while (true) {
                var move = null;
                var moveG = null;
                var moveHistoryNextOld = animateMoveHistoryNext;
                if (shift) {
                    // redo
                    if (animateMoveHistoryNext < animateMoveHistory.length) {
                        move = animateMoveHistory[animateMoveHistoryNext++];
                        moveG = move;
                    }
                } else {
                    // undo
                    if (animateMoveHistoryNext > 0) {
                        move = animateMoveHistory[--animateMoveHistoryNext];
                        moveG = utilsGetInverseMove(move);
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
                    animateMoveHistoryNext = moveHistoryNextOld;
                    break;
                }
                console.log((shift ? "Redoing" : "Undoing")
                        + " move "
                        + (move ? move : "- nothing to "
                                + (shift ? "redo" : "undo")));
                if (moveG) {
                    // "G" indicates it's an undo.
                    utilsEnqueueMove(moveG + "G");
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
            if ((animateMoveHistory[animateMoveHistoryNext - 1] === "|")
                    || (animateMoveHistory[animateMoveHistoryNext] === "|")) {
                animateUpdateStatus("Savepoint reached");
            }
            break;
        case "H": // (H)help
            eventShowHelp(!eventHelpDisplayed);
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
            if (!_eventScramblerInitialized) {
                animateUpdateStatus("Initializing scrambler");
                _eventScramblerInitialized = true;
            }
            setTimeout(function() {
                scramble();
                animateUpdateStatus("Scrambled " + (newCube ? "new " : " ")
                        + "cube");
            }, 10);
            break;
        case "K": // Toggle rotation lock.
            eventRotationLock = !eventRotationLock;
            animateUpdateStatus("Rotation lock "
                    + (eventRotationLock ? "enabled" : "disabled"))
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
            animateDispOrientationLabels = !animateDispOrientationLabels;
            animateUpdateStatus("Orientation labels "
                    + (animateDispOrientationLabels ? "enabled" : "disabled"))
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
            var i = cubiesColorTableKeys.indexOf(cubiesColorScheme);
            if (i !== -1) {
                i = (++i) % cubiesColorTableKeys.length;
                cubiesColorScheme = cubiesColorTableKeys[i];
                animateUpdateStatus("Color scheme " + cubiesColorScheme);
            } else {
                // This should not happen
                console.log("Unknown color scheme \"" + cubiesColorScheme
                        + "\".");
            }
            animateResetScene(cubies);
            break;
        case "T": // (T)imer
            animateTimer = !animateTimer;
            console.log("animateTimer: " + animateTimer);
            animateCondReq(true);
            break;
        case "V": // Heise
            eventHeise = !eventHeise;
            eventUpdateKeyMap();
            animateUpdateStatus((eventHeise ? "Heise" : "RLUDFB") + " key mapping");
            break;
        default:
            console.log("Ignoring unknown key \"" + eventChar + "\".");
            validEventChar = false;
            break;
        }
        if (validEventChar && !buttonBar) {
            // Flash the button if activated by a key.
            var prefix = (alt ? "A" : "") + (shift ? "S" : "");
            var buttons = initButtonKeyToElMap[prefix + eventChar];
            if (!buttons) {
                buttons = initButtonKeyToElMap[eventChar];
            }
            if (buttons) {
                initSetButtonColor(buttons[0], buttons[1], true);
            }
            if (eventKeyPreventDefault) {
                event.preventDefault();
            }
        }
        _eventEscLast = false;
    }
}

function _eventOnMouseDown(event) {
    if (settingsDisplayed) {
        return;
    }

    // Assume that the user no longer wants to see the status message.
    animateClearStatus();

    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    // Primary button - true for the left mouse button or any touch event.
    var primaryButton = initMobile || (event.button === 0);
    if (primaryButton && ((!initMobile) || event.changedTouches.length)) {
        var beginCoords = _eventGetCoords(event);
        for (var i = 0; i < beginCoords.length; i++) {
            var beginCoord = beginCoords[i];
            // Left mouse button was clicked.
            var moveBegin = cubiesEventToCubeCoord(beginCoord[0],
                    beginCoord[1], null);
            if (moveBegin) {
                _eventMoveBegins.push([beginCoord, moveBegin]);
            }
        }
        // Don't rotate the cube if the user clicked on it.
        animateOrbitControls.enabled = _eventMoveBegins.length ? false : !eventRotationLock;
    }

    // The user may be adjusting the animateCamera if a mouse button is done. When
    // in doubt animate.
    if (animateOrbitControls.enabled) {
        animateCameraAdjusting = true;
        animateCondReq(true);
    }
}

function _eventOnMouseUp(event) {
    if (settingsDisplayed) {
        return;
    }

    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();

    // Primary button - true for the left mouse button or any touch event.
    var primaryButton = initMobile || (event.button === 0);
    if (!primaryButton) {
        // Only handle the left mouse button and touch events.
        return;
    }

    if (primaryButton && _eventMoveBegins.length) {
        var endCoords = _eventGetCoords(event);
        for (var i = 0; i < endCoords.length; i++) {
            var endCoord = endCoords[i];
            // For the current endCoord find the closest matching begin
            // coordinate.
            var bestDist = 1000000;
            for (var j = 0; j < _eventMoveBegins.length; j++) {
                var entry = _eventMoveBegins[j];
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

            var mouseMoved = dist >= eventMoveThreshold;
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
                // torque given the center of the cube as a rotatePivot.
                var force = moveEnd.pos.clone();
                force.sub(moveBegin.pos);
                var torque = new THREE.Vector3();
                torque.crossVectors(moveBegin.pos, force);

                // The axis that had the most torque is assumed the one that the
                // move is to be around. The sign is in the vector rotation
                // sense (counter clockwise positive) and not the cube sense
                // (clockwise positive).
                var axis = utilsLargestAbsoluteAxis(torque);
                var sign = torque[axis] >= 0 ? 1 : -1;

                // Get the indexes into the layers along axis.
                var limLoIdx = utilsCoordToIndex(moveBegin.pos[axis]);
                if (mouseMoved) {
                    var limHiIdx = utilsCoordToIndex(moveEnd.pos[axis]);
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

                var layers = utilsGetLayersFromIndexes(sign, limLoIdx, limHiIdx);
                var moveRot = utilsGetMoveRotationFromLayers(axis, layers);
                if (moveRot) {
                    // Queue the move and rotation up.
                    utilsEnqueueMoveRotation(moveRot);

                    // If the user made a move they probably don't care
                    // about the message.
                    animateClearStatus();
                }
            }
        }
        if (!initMobile || (initMobile && !event.touches.length)) {
            // If this was the last touch then the above must have processed
            // all of the _eventMoveBegins.
            _eventMoveBegins.length = 0;
        }
        animateCondReq(true);
    }

    animateOrbitControls.enabled = !eventRotationLock;
    animateCameraAdjusting = false;
}

function _eventOnResize(event) {
    animateResize();
    animateCondReq(true);
}

function _eventOnTouchMove(event) {
    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();
}
