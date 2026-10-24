"use strict";

// Various event callbacks.  This is where keyboard and mouse events are
// turned interpreted as moves and queued up in animateMoveQueue.

// Public globals

var eventButtonColorHighlight = "rgb(255, 255, 128)";
var eventButtonColorOrig;
var eventButtonFlashDelay = 300;
var eventHelpDisplayed = false;
var eventHeise = false;
var eventHeisePhysicalKeys = true;
var eventIgnoreMouseSingleClickAfterKey = false;
var eventKeyMap = {};
var eventKeyPreventDefault = true;
var eventCopyFormat = "url";
var eventCopyVars = "@nondefault cubiesOrder";
var eventCopyVarsExclude = "";
var eventMoveThreshold = 30;
var eventPasteAllVars = true;
var eventRotationLock = false;
var eventRotationLockLimit = 100;
var eventToolTipButtonEl;
var eventToolTipTimeout = 700;

// Private globals

var _eventEscLast = false;
var _eventLastMoveInputSource = null;

// A Heise map. This is the original Heise map with some adjustments and
// additions.  The duplicate entry for B and T for X-axis rotations has
// been mapped to f and f' making all commonly used wide moves available. The
// "c" prefix is for camera moves which is typically the full cube rotation key
// binding with the alt key modifier. The "c" prefixed moves should be kept
// in sync with their corresponding "m" moves.
var _eventHeiseMap = {
    A    : "mY'",
    AA   : "cY'",
    B    : "mf",
    C    : "mu'",
    D    : "mL",
    E    : "mL'",
    F    : "mU'",
    G    : "mF'",
    H    : "mF",
    I    : "mR",
    J    : "mU",
    K    : "mR'",
    L    : "mD'",
    M    : "mr'",
    N    : "mX'",
    AN   : "cX'",
    O    : "mB'",
    P    : "mZ",
    AP   : "cZ",
    Q    : "mZ'",
    AQ   : "cZ'",
    R    : "ml'",
    S    : "mD",
    T    : "mf'",
    U    : "mr",
    V    : "ml",
    W    : "mB",
    X    : "mM",
    Y    : "mX",
    AY   : "cX",
    Z    : "md",
    ";"  : "mY",
    "A;" : "cY",
    ","  : "mu",
    "."  : "mM'",
    "/"  : "md'",
};

// Buttons that appear at the bottom for the settings dialog. Row is zero based.
var _eventHelpButtonList = [{
    label : "Close",
    func : _eventHelpClose,
    key : "Esc",
    tip : "Close this help dialog"
}];

var _eventInButton = false;
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
    "6" : "Q",
    "7" : "T",
    "8" : "V"
};
var _eventKeyAllowedModifiersMap = {
    G : ["A", "S", "AS"],
    J : ["A", "S", "AS"],
    N : ["AS"],
    P : ["AS"],
    T : ["A", "S"],
};
var _eventKeyCubeReadyCheck = {
    "@" : true,
    "#" : true,
    "$" : true,
    "I" : true,
    "J" : true,
    "N" : true,
    "Q" : true
};
var _eventKeyMapSize = 0;
var _eventKeyMapTotal = {};
// Incomplete.  Added to as needed.
var _eventKeyPunctuationMap = {
     50 : "@",
     51 : "#",
     52 : "$",
     53 : "%",
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
var _eventCodeToQwertyChar = {
    Backquote : "`",
    Minus : "-",
    Equal : "=",
    BracketLeft : "[",
    BracketRight : "]",
    Backslash : "\\",
    Semicolon : ";",
    Quote : "'",
    Comma : ",",
    Period : ".",
    Slash : "/"
};
var _eventLastInputMove = null;
var _eventMoveBegins = [];
var _eventNumericPrefix = "";
var _eventScramblerInitialized = false;
var _eventSnapLimit = 0.3;

// Public functions

// Register event listeners that are needed by this program. Note that
// bubbling ("true" argument) is used so that these events are processed
// here before OrbitControls.
function eventAdd() {
    console.log("Adding event listeners.");
    document.addEventListener("keydown", _eventOnKeyDown, true);
    document.addEventListener("copy", _eventOnCopy, true);
    document.addEventListener("paste", _eventOnPaste, true);
    initElContainer.addEventListener(initMobile ? "touchstart" : "mousedown",
            _eventOnMouseDown, true);
    initElContainer.addEventListener(initMobile ? "touchend" : "mouseup", _eventOnMouseUp,
            true);
    if (initMobile) {
        initElContainer.addEventListener("touchmove", _eventOnTouchMove);
    }

    window.addEventListener("resize", _eventOnResize, true);
    window.addEventListener("blur", _eventOnBlur, true);

    // Make sure the button bar does not do anything with events other than
    // click buttons.
    if (initMobile) {
        initElContainer.addEventListener("touchmove", eventPreventDefault);
    }

    // Get rid of the status message if the user clicks on it.
    initElStatus.addEventListener(initMobile ? "touchstart" : "mousedown",
            animateClearStatus);
}

// Clear partially entered keyboard modifiers when the browser loses focus.
function _eventOnBlur() {
    if (_eventNumericPrefix) {
        console.log("Clearing move prefix \"" + _eventNumericPrefix
                + "\" because the window lost focus.");
    }
    _eventNumericPrefix = "";
    _eventEscLast = false;
}

// Callback for when buttons are clicked.
function eventOnButtonClick(event, buttonEl, button) {
    var func = button.func;
    var key = button.key;
    var label = button.label;

    var unavailableReason = eventGetButtonUnavailableReason(button);
    if (unavailableReason) {
        animateUpdateStatus(unavailableReason);
        initFlashButtonUnavailable(buttonEl, button);
        return;
    }

    // Don't confuse OrbitControls by allowing it to see this click.
    animateOrbitControls.enabled = false;

    // Function takes precedence so that they key may be used for the tool
    // tip in some cases.
    if (func) {
        // Just call the function for the button.
        func();
    } else if (key) {
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
    } else {
        // This should not happen.
        utilsFatalError("Button must have either key or func.")
    }

    initSetButtonColor(buttonEl, button, true);

    eventToolTipCancel();
}

// Refresh buttons whose availability depends on move-history state.
function eventUpdateButtonStates() {
    for (var key in initButtonKeyToElMap) {
        var buttonElAndButton = initButtonKeyToElMap[key];
        var buttonEl = buttonElAndButton[0];
        var button = buttonElAndButton[1];
        if (!button.availability) {
            continue;
        }
        var unavailable = !!eventGetButtonUnavailableReason(button);
        buttonEl.setAttribute("aria-disabled", unavailable ? "true" : "false");
        buttonEl.style.opacity = unavailable ? "0.55" : "1";
    }
}

// Return why a state-dependent button is unavailable, or null if it can be used.
function eventGetButtonUnavailableReason(button) {
    if (!button || !button.availability) {
        return null;
    }
    switch (button.availability) {
    case "undo":
        return _eventCanUndo() ? null : "Nothing to undo";
    case "redo":
        return _eventCanRedo() ? null : "Nothing to redo";
    case "save":
        return _eventCanSetSavepoint() ? null : "Savepoint already set";
    case "order-decrease":
        return (cubiesOrder > 2) ? null : "Minimum cube order reached";
    case "order-three":
        return (cubiesOrder !== 3) ? null : "Cube order is already 3";
    default:
        return null;
    }
}

// Callback for when the mouse exits a button.  This is for tool tips.
function eventOnButtonOut(event, buttonEl, button) {
    _eventInButton = false;
    eventToolTipCancel();
}

// Callback for when the mouse enters a button.  This is for tool tips.
function eventOnButtonOver(event, buttonEl, button) {
    if (_eventInButton) {
        // No need to enter the same button multiple times.
        return;
    }
    _eventInButton = true;
    if (eventToolTipTimeout === -1) {
        // Tool tips have been disabled.
        return;
    }

    if (!button.tip) {
        // The should not happen.
        console.log("Button " + button.label + " is missing a tool tip");
        return;
    }
    var unavailableReason = eventGetButtonUnavailableReason(button);
    initElTip.innerHTML = button.tip
        + (unavailableReason ? " - " + unavailableReason : "") +
        (button.key ? (" (" + button.key + " key)") : "");

    // Now that the width is known the left side can be adjusted so that it's
    // centered over the button, but also entirely on the screen.
    var left = parseInt(buttonEl.style.left) +
        (buttonEl.offsetWidth - initElTip.clientWidth) / 2;
    left = Math.max(0, left);
    left = Math.min(left, animateCanvasWidth - initElTip.clientWidth);

    // A bit above the button.
    var top = parseInt(buttonEl.style.top) -
        1.4 * parseInt(initElTip.clientHeight);

    initElTip.style.left = left + "px";
    initElTip.style.top = top + "px";

    eventToolTipButtonEl = buttonEl;
    setTimeout(function(elem) {
        return function() {
            if (elem === eventToolTipButtonEl) {
                initElTip.style.visibility = "visible";
            }
        };
    }(buttonEl), eventToolTipTimeout);
}

// Suppress the default event handling.
function eventPreventDefault(event) {
    event.preventDefault();
}

// Show or hide the help dialog.
function eventShowHelp(show) {
    initAddUpdateButtons(show ? _eventHelpButtonList : initMainButtonList);

    if (show) {
        initElHelp.style.left = "0px";
        initElHelp.style.top = "0px";
        initElHelp.style.width = animateCanvasWidth + "px";
        initElHelp.style.height = initPrimaryHeight + "px";

        // It seems both the tabIndex and the delay is needed for the help to
        // gain focus.
        initElHelp.tabIndex = "1";
        initElHelp.scrollTop = 0;
        setTimeout(function() {
            initElHelp.focus();
        }, 10);
    }
    initElHelp.style.visibility = show ? "visible" : "hidden";
    initElTimer.style.visibility = show ? "hidden" : "visible";

    eventHelpDisplayed = show;

    eventToolTipCancel();
}

// Forget the move used by the repeat-move key.
function eventResetLastInputMove() {
    _eventLastInputMove = null;
    _eventLastMoveInputSource = null;
}

// Stop displaying the tool tip.
function eventToolTipCancel() {
    eventToolTipButtonEl = null;
    initElTip.style.visibility = "hidden";
}

// Update the key map used ot interpret key strokes.
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

// Queue a user-entered move and remember it for the repeat-move key.
function _eventEnqueueInputMove(move) {
    move = utilsNormalizeMovePrefix(move);
    _eventLastInputMove = move;
    _eventLastMoveInputSource = "key";
    utilsEnqueueMove(move);
}

// Queue a user-entered move/rotation pair and remember it for repeat.
function _eventEnqueueInputMoveRotation(moveRot) {
    _eventLastInputMove = moveRot[0];
    _eventLastMoveInputSource = "mouse";
    utilsEnqueueMoveRotation(moveRot);
}

// For a given mouse event return the client/screen coordinates.
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

// Copy selected cube state/configuration values.
function _eventOnCopy(event) {
    if (settingsDisplayed || eventHelpDisplayed) {
        return;
    }
    var copyVars = _eventGetCopyVars();
    var copyObj = {};
    for (var i = 0; i < copyVars.length; i++) {
        var varName = copyVars[i];
        if (window[varName] === undefined) {
            console.warn("Unable to copy unknown variable \"" + varName + "\".");
            continue;
        }
        copyObj[varName] = window[varName];
    }
    event.clipboardData.setData("text/plain", _eventFormatCopyObject(copyObj));
    event.preventDefault();
    animateUpdateStatus("Copied cube state");
}

// Format copied state according to eventCopyFormat.
function _eventFormatCopyObject(copyObj) {
    var format = String(eventCopyFormat || "").toLowerCase();
    if (format === "json") {
        return _eventStringifyCopyObject(copyObj);
    }
    if (format !== "url") {
        console.warn("Unknown eventCopyFormat \"" + eventCopyFormat
            + "\"; using url.");
    }
    return _eventCopyObjectToUrl(copyObj);
}

// Format a copied state object as a bookmarkable URL.
function _eventCopyObjectToUrl(copyObj) {
    var url = window.location.href.replace(/[?#].*$/, "");
    var sep = "?";
    for (var key in copyObj) {
        url += sep + encodeURIComponent(key) + "="
            + encodeURIComponent(settingsValueToText(copyObj[key]));
        sep = "&";
    }
    return url;
}

// Format a copied state object with one top-level key/value pair per line.
function _eventStringifyCopyObject(copyObj) {
    var lines = ["{"];
    var first = true;
    for (var key in copyObj) {
        if (!first) {
            lines[lines.length - 1] += ",";
        }
        lines.push("  " + JSON.stringify(key) + ": "
            + JSON.stringify(copyObj[key]));
        first = false;
    }
    lines.push("}");
    return lines.join("\n");
}

// Paste selected cube state/configuration values from copied JSON or URL text.
function _eventOnPaste(event) {
    if (settingsDisplayed || eventHelpDisplayed) {
        return;
    }
    var text = event.clipboardData.getData("text/plain");
    if (!text) {
        return;
    }
    var pasteObj = _eventParsePasteText(text);
    if (!pasteObj) {
        return;
    }
    if (!pasteObj || (pasteObj.constructor !== Object)) {
        return;
    }

    var settingsText = _eventSettingsTextFromPasteObject(pasteObj);
    if (!settingsText) {
        console.warn("Pasted text did not contain any recognized QWERTYcube variables.");
        return;
    }
    event.preventDefault();
    settingsApplyText(settingsText, true, "Pasted cube state");
}

// Parse pasted text as either a JSON object or URL/query parameters.
function _eventParsePasteText(text) {
    text = String(text).trim();
    if (!text) {
        return null;
    }
    if (/^\s*{/.test(text)) {
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn("Unable to parse pasted JSON: " + e);
            return null;
        }
    }
    return _eventParsePasteUrl(text);
}

// Parse a pasted full URL or bare query string into a settings object.
function _eventParsePasteUrl(text) {
    var url = null;
    try {
        url = new URL(text, window.location.href);
    } catch (e) {
        console.warn("Unable to parse pasted URL: " + e);
        return null;
    }
    var result = {};
    url.searchParams.forEach(function(value, key) {
        var oldValue = result[key];
        if (oldValue === undefined) {
            result[key] = value;
        } else if (oldValue.constructor === Array) {
            oldValue.push(value);
        } else {
            result[key] = [oldValue, value];
        }
    });
    return result;
}

// Convert copied/pasted values into settings text for the shared apply path.
function _eventSettingsTextFromPasteObject(pasteObj) {
    var lines = [];
    var pasteVars = eventPasteAllVars ? _eventGetAllSettingsVars()
        : _eventGetCopyVars();
    var pastedVars = {};
    for (var i = 0; i < pasteVars.length; i++) {
        var varName = pasteVars[i];
        if (pasteObj[varName] === undefined) {
            continue;
        }
        if (window[varName] === undefined) {
            console.warn("Ignoring pasted unknown variable \"" + varName + "\".");
            continue;
        }
        pastedVars[varName] = true;
        lines.push(varName + "=" + settingsValueToText(pasteObj[varName]));
    }
    _eventLogIgnoredPasteVars(pasteObj, pastedVars, pasteVars);
    return lines.join("\n");
}

// Log paste keys that are known but not currently allowed by paste settings.
function _eventLogIgnoredPasteVars(pasteObj, pastedVars, pasteVars) {
    for (var key in pasteObj) {
        if (pastedVars[key]) {
            continue;
        }
        if (_eventIsSettingsVar(key)) {
            console.log("Ignoring pasted variable \"" + key + "\" because "
                + (eventPasteAllVars ? "it was not selected for paste."
                    : "eventPasteAllVars=false and it is not included by eventCopyVars."));
        } else {
            console.warn("Ignoring pasted unknown variable \"" + key + "\".");
        }
    }
}

// Return all user-facing settings variable names.
function _eventGetAllSettingsVars() {
    var result = [];
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        result.push(settingsVarNameDescs[i][0]);
    }
    return result;
}

// Return the configured list of variables eligible for copy/paste.
function _eventGetCopyVars() {
    var included = {};
    var excluded = {};
    var result = [];

    _eventApplyCopyVarPatterns(included, eventCopyVars);
    _eventApplyCopyVarPatterns(excluded, eventCopyVarsExclude);

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varName = settingsVarNameDescs[i][0];
        if (included[varName] && !excluded[varName]) {
            result.push(varName);
        }
    }
    return result;
}

// Expand exact names and trailing-* prefix patterns into a map.
function _eventApplyCopyVarPatterns(out, patternsText) {
    var patterns = String(patternsText || "").trim().split(/\s+/);
    for (var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        if (!pattern) {
            continue;
        }
        if (pattern === "@nondefault") {
            _eventAddNonDefaultCopyVars(out);
        } else if (pattern === "*") {
            _eventAddMatchingCopyVars(out, "");
        } else if (pattern[pattern.length - 1] === "*") {
            _eventAddMatchingCopyVars(out, pattern.substr(0, pattern.length - 1));
        } else if (_eventIsSettingsVar(pattern)) {
            out[pattern] = true;
        } else {
            console.warn("Ignoring unknown eventCopyVars entry \"" + pattern + "\".");
        }
    }
}

// Add persisted settings variables whose current value differs from default.
function _eventAddNonDefaultCopyVars(out) {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (varPersist && settingsIsNonDefault(varName)) {
            out[varName] = true;
        }
    }
}

// Add settings variables that start with the given prefix to out.
function _eventAddMatchingCopyVars(out, prefix) {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varName = settingsVarNameDescs[i][0];
        if (varName.indexOf(prefix) === 0) {
            out[varName] = true;
        }
    }
}

// Return true if varName is user-facing settings variable.
function _eventIsSettingsVar(varName) {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        if (settingsVarNameDescs[i][0] === varName) {
            return true;
        }
    }
    return false;
}

// Close the help dialog due to "Close" or escape being clicked.
function _eventHelpClose() {
    eventShowHelp(false);
}

// Convert KeyboardEvent.code to its physical QWERTY character.
function _eventCodeToQwertyCharGet(code) {
    if (/^Key[A-Z]$/.test(code)) {
        return code.substr(3);
    }
    if (/^Digit[0-9]$/.test(code)) {
        return code.substr(5);
    }
    return _eventCodeToQwertyChar[code] || null;
}

// Convert a keystroke to a move or command.
async function _eventOnKeyDown(event) {
    var keyCode = event.keyCode;

    // Arrow keys move the camera without making cube moves.
    if (!event.buttonBar && !settingsDisplayed && !eventHelpDisplayed
            && !event.ctrlKey
            && ((keyCode === 37) || (keyCode === 38) || (keyCode === 39) || (keyCode === 40))) {
        switch (keyCode) {
        case 37: // Left: +90 around Y axis.
            animateQueueCameraMove("left");
            break;
        case 38: // Up: move to +Y hemisphere.
            animateQueueCameraMove("up");
            break;
        case 39: // Right: -90 around Y axis.
            animateQueueCameraMove("right");
            break;
        case 40: // Down: move to -Y hemisphere.
            animateQueueCameraMove("down");
            break;
        }
        if (eventKeyPreventDefault && event.preventDefault) {
            event.preventDefault();
        }
        return;
    }

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
    _eventEscLast = false;
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
    if ((keyCode === 27) && !eventHelpDisplayed && _eventNumericPrefix) {
        console.log("Clearing move prefix \"" + _eventNumericPrefix + "\".");
        _eventNumericPrefix = "";
        _eventEscLast = false;
        animateUpdateStatus("Move prefix cleared");
        if (eventKeyPreventDefault) {
            event.preventDefault();
        }
        return;
    }

    if (eventHeise && eventHeisePhysicalKeys && !buttonBar && event.code) {
        var eventCodeChar = _eventCodeToQwertyCharGet(event.code);
        if (eventCodeChar) {
            eventChar = eventCodeChar;
            punctuation = !(/[A-Z0-9-]/.test(eventChar));
        }
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
            if (keyMapValue === "default") {
                // Let the browser handle this key as if QWERTYcube had not
                // recognized it.
                return;
            } else if (keyMapValue === "none") {
                _eventNumericPrefix = "";
                _eventEscLast = false;
                animateClearStatus();
                if (eventKeyPreventDefault) {
                    event.preventDefault();
                }
                return;
            } else if (keyMapValue[0] === "k") {
                // Map the keystroke to a different keystroke.
                eventChar = keyMapValue.slice(-1);
                alt = keyMapValue.indexOf("A") !== -1;
                shift = keyMapValue.indexOf("S") !== -1;
            } else if (keyMapValue[0] === "m" || keyMapValue[0] === "c") {
                // Map directly to a move and return.
                var move = keyMapValue.substring(1);
                if (keyMapValue[0] === "m") {
                    // It's a cube move.
                    _eventEnqueueInputMove(_eventNumericPrefix + move);
                } else if (keyMapValue[0] === "c") {
                    // It's a camera move.
                    _eventQueueCameraMoveForCubeRotation(move);
                }
                _eventNumericPrefix = "";
                animateCondReq(true);
                _eventEscLast = false;
                if (eventKeyPreventDefault) {
                    event.preventDefault();
                }

                // If the user made a move they probably don't care about
                // the message.
                animateClearStatus();
                return;
            } else {
                console.log("Unknown _eventKeyMapTotal value \"" + keyMapValue
                        + "\".");
            }
        }
    }

    var eventCharBeforeAdditionalMap = eventChar;
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

        var cameraMove = false;
        if (alt) {
            if (_eventQueueCameraMoveForCubeRotation(move)) {
                // The move turned out ot be alt combined with a full cube
                // rotation character, so there is no need to queue up the move.
                cameraMove = true;
            } else {
                // A wide non-camera move.
                move = move.toLowerCase();
            }
        }
        if (!cameraMove) {
            _eventEnqueueInputMove(_eventNumericPrefix + move);
        }

        // Start common code.
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

        // Check if the command is one that can not be safely done while the
        // cube is busy, and then return if it is busy.
        if (_eventKeyCubeReadyCheck[eventChar] && !animateCubeReadyCheck()) {
            return;
        }

        var buttonKey = (alt ? "A" : "") + (shift ? "S" : "") + eventChar;
        var buttonElAndButton = initButtonKeyToElMap[buttonKey];
        if (!buttonElAndButton) {
            buttonElAndButton = initButtonKeyToElMap[eventChar];
        }
        var unavailableReason = buttonElAndButton
                ? eventGetButtonUnavailableReason(buttonElAndButton[1]) : null;
        if (unavailableReason) {
            animateUpdateStatus(unavailableReason);
            initFlashButtonUnavailable(buttonElAndButton[0],
                    buttonElAndButton[1]);
            if (eventKeyPreventDefault && event.preventDefault) {
                event.preventDefault();
            }
            return;
        }

        var persistCameraLocation = false;
        var persistVarName = null;
        var validEventChar = true;
        switch (eventChar) {
        // Punctuation is used for changing the cube order since those buttons
        // don't have a key binding.
        case "=": // Repeat the last applied move.
            var move = _eventLastInputMove || rotateGetLastAppliedMove();
            _eventNumericPrefix = "";
            if (move) {
                _eventEnqueueInputMove(move);
                animateCondReq(true);
                animateClearStatus();
            } else {
                animateUpdateStatus("No move to repeat");
            }
            break;
        case "@": // Decrease the order.
            if (cubiesOrder > 2) {
                cubiesOrder--;
                animateUpdateStatus("Decreased order to " + cubiesOrder);
                settingsApply(false);
                persistVarName = "cubiesOrder";
            } else {
                animateUpdateStatus("Minmimum order is 2");
            }
            break;
        case "#": // Go back to 3x3x3.
            cubiesOrder = 3;
            animateUpdateStatus("Reset order to " + cubiesOrder);
            settingsApply(false);
            persistVarName = "cubiesOrder";
            break;
        case "$": // Increase the order
            cubiesOrder++;
            animateUpdateStatus("Increased order to " + cubiesOrder);
            settingsApply(false);
            persistVarName = "cubiesOrder";
            break;
        case "%": // Snap to the closest corner, edge or side
            // When looking at a corner, as this program does by default, the
            // camera coordinates have the form +-N, +-N, +-N where N is 470
            // initially.  For edges one of the three coordinates is 0 and for
            // sides two of the there coordinates are 0.  Discard coordinates
            // that have a low absolute value and assume the remaining
            // coordinates should have the same magnitude and sign.
            // TODO: It would be cool if the camera moved from locOld to
            // locNew at a constant rate via animation.
            var locOld = animateCamera.position.toArray();
            var locNew = [];
            // A lower _eventSnapLimit favors corners.
            var limit = _eventSnapLimit * animateCameraRadius;
            for (var i = 0; i <= 2; i++) {
                if (Math.abs(locOld[i]) >= limit) {
                    // At least one coordinate will be non-zero so song as
                    // _eventSnapLimit < animateCameraRadius / sqrt(3).
                    locNew[i] = utilsGetSign(locOld[i]);
                } else {
                    locNew[i] = 0;
                }
            }
            var locNewVec = new THREE.Vector3();
            locNewVec.fromArray(locNew);
            locNewVec.setLength(animateCameraRadius);
            locNewVec.toArray(animateCameraLocation);
            animateSetCamera();
            animateCondReq(true);
            break;

        // A lot of good letters were already taken.
        case "A": // (A)nimation toggle
            animateAnimationInst = !animateAnimationInst;
            var msg = "Animation "
                    + (animateAnimationInst ? "is instantaneous"
                            : ("at " + animateMoveSec + " TPS"));
            animateUpdateStatus(msg);
            persistVarName = "animateAnimationInst";
            break;
        case "C": // (C)heckpoint
            if ((animateMoveHistory[animateMoveHistoryNext - 1] === "|")
                    || (animateMoveHistory[animateMoveHistoryNext] === "|")) {
                animateUpdateStatus("Savepoint already set");
            } else {
                animateUpdateStatus("Savepoint set");
                animateMoveHistory.splice(animateMoveHistoryNext++, 0, "|");
                eventUpdateButtonStates();
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
                    } else {
                        // No redo move left in history. Fall back to remaining
                        // solve moves, if any.
                        var solveRemaining = rotateGetSolveMovesRemaining(alt);
                        if (solveRemaining.length) {
                            animateMoveQueueReplay = true;
                            if (alt) {
                                console.log("Redoing solve moves " + solveRemaining.join(" "));
                                utilsEnqueueMoves(solveRemaining);
                            } else {
                                console.log("Redoing solve move " + solveRemaining[0]);
                                utilsEnqueueMove(solveRemaining[0]);
                            }
                            animateCondReq(true);
                        }
                        break;
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
                    animateMoveQueueReplay = true;
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
            if (!shift && !alt && !buttonBar) {
                _eventNumericPrefix = "";
                animateUpdateStatus("Scramble?  Shift-" + eventCharBeforeAdditionalMap);
                break;
            }
            if (buttonBar && !alt && !confirm("Scramble cube?")) {
                break;
            }
            var manualScramble = null;
            var scrambleUntilPhaseOverride = _eventNumericPrefix
                    ? parseInt(_eventNumericPrefix) : undefined;
            _eventNumericPrefix = "";
            var scrambleNewCubeThisTime = scrambleNewCube;
            if (alt) {
                // preventDefault() must happen before awaiting dialog parsing.
                if (!buttonBar && eventKeyPreventDefault) {
                    event.preventDefault();
                }
                manualScramble = await scramblePromptManualScramble();
                if (!manualScramble) {
                    break;
                }
                scrambleNewCubeThisTime = manualScramble.newCube;
            } else {
                // Scrambling is structured this way, with two messages, because
                // scrambling may be slow the first time. The first message is
                // not displayed until this function returns, so the setTimeout
                // was needed. 10 msec is used so that the first status has
                // a chance to be displayed before the blocking scrambler.
                if (!_eventScramblerInitialized) {
                    animateUpdateStatus("Initializing scrambler");
                    _eventScramblerInitialized = true;
                }
            }
            setTimeout(async function() {
                if (scrambleNewCubeThisTime && !animateNewCube(true)) {
                    return;
                }
                var scrambleStatus = await scrambleCube(manualScramble,
                        scrambleUntilPhaseOverride);
                animateUpdateStatus(scrambleStatus);
            }, 10);
            break;
        case "K": // Toggle rotation lock.
            eventRotationLock = !eventRotationLock;
            animateUpdateStatus("Rotation lock "
                    + (eventRotationLock ? "enabled" : "disabled"))
            animateCondReq(true);
            persistCameraLocation = eventRotationLock;
            persistVarName = "eventRotationLock";
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
            textDispOrientationLabels = !textDispOrientationLabels;
            animateUpdateStatus("Orientation labels "
                    + (textDispOrientationLabels ? "enabled" : "disabled"))
            animateCondReq(true);
            persistVarName = "textDispOrientationLabels";
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
                persistVarName = "cubiesColorScheme";
            } else {
                // This should not happen
                console.log("Unknown color scheme \"" + cubiesColorScheme
                        + "\".");
            }
            animateResetScene(cubiesList);
            break;
        case "T": // T(raining) or (T)imer
            if (alt) {
                // preventDefault() must happen before awaiting dialog parsing.
                if (!buttonBar && eventKeyPreventDefault) {
                    event.preventDefault();
                }
                var manualTraining = await scramblePromptManualTraining();
                if (!manualTraining) {
                    break;
                }
                if (!arrowsEnabled) {
                    arrowsToggle();
                }
                solveSetMoves(manualTraining.moves, false);
                break;
            } else if (shift) {
                var enabled = arrowsToggle();
                animateUpdateStatus("Training " + (enabled ? "enabled" : "disabled"));
                if (enabled) {
                    // preventDefault() must happen before awaiting the solver.
                    if (!buttonBar && eventKeyPreventDefault) {
                        event.preventDefault();
                    }
                    await solveFindMovesFromHistory();
                }
            } else {
                animateTimer = !animateTimer;
                animateElapsedMsecOld = 0;
                console.log("animateTimer: " + animateTimer);
                animateCondReq(true);
                persistVarName = "animateTimer";
            }
            break;
        case "V": // Heise
            eventHeise = !eventHeise;
            eventUpdateKeyMap();
            animateUpdateStatus((eventHeise ? "Heise" : "RLUDFB") + " key mapping");
            persistVarName = "eventHeise";
            break;
        default:
            // "{" happens when the console is opened - irrelevant.
            if (eventChar !== "{") {
                console.log("Ignoring unknown key \"" + eventChar + "\".");
            }
            validEventChar = false;
            break;
        }
        if (persistVarName) {
            initSaveStorageVariable(persistVarName);
        }
        if (persistCameraLocation) {
            animateSyncCameraLocation();
            initSaveStorageVariable("animateCameraLocation");
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
            eventToolTipCancel();
        }
        _eventEscLast = false;
    }
}

// Return true if undo can reach a move after skipping adjacent savepoints.
function _eventCanUndo() {
    for (var i = animateMoveHistoryNext - 1; i >= 0; i--) {
        if (animateMoveHistory[i] !== "|") {
            return true;
        }
    }
    return false;
}

// Return true if redo can reach history or continue the loaded solve.
function _eventCanRedo() {
    for (var i = animateMoveHistoryNext; i < animateMoveHistory.length; i++) {
        if (animateMoveHistory[i] !== "|") {
            return true;
        }
    }
    return rotateGetSolveMovesRemaining(false).length > 0;
}

// Return true if the current history position is not already a savepoint.
function _eventCanSetSavepoint() {
    return (animateMoveHistory[animateMoveHistoryNext - 1] !== "|")
            && (animateMoveHistory[animateMoveHistoryNext] !== "|");
}

// A mouse button was pressed down.  Record the location and suppress orbit
// controls if need be.
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

// The mouse button was released.  Calculate the move and allow orbit controls
// to continue.
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
                if (eventIgnoreMouseSingleClickAfterKey
                        && (_eventLastMoveInputSource === "key")) {
                    console.log("Ignoring mouse single-click move after key move.");
                    _eventLastMoveInputSource = null;
                    continue;
                }
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
                if (event.shiftKey) {
                    // Pull instead of push.
                    sign = -sign;
                }

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

                if (event.altKey) {
                    if (cubiesOrder === 2) {
                        // Alt on any sticker is a whole cube rotation for 2x2.
                        limLoIdx = 0;
                        limHiIdx = 1;
                    } else {
                        if (limLoIdx === 0) {
                            // l, l' etc.
                            limHiIdx = Math.max(limHiIdx, cubiesOrder - 2);
                        } else if (limHiIdx === (cubiesOrder - 1)) {
                            // r, r' etc.
                            limLoIdx = Math.min(limLoIdx, 1);
                        } else {
                            // Not at either extreme.
                            if (cubiesOrder === 3) {
                                // A special case - it's a bit tricky to do full
                                // cube rotations on a 3x3, so let's interpret
                                // Alt-Edge click as a full cube rotation.
                                limLoIdx = 0;
                                limHiIdx = 2;
                            } else {
                                // A fat middle move.
                                limLoIdx = 1;
                                limHiIdx = cubiesOrder - 2;
                            }
                        }
                    }
                }

                var layers = utilsGetLayersFromIndexes(sign, limLoIdx, limHiIdx);
                var moveRot = utilsGetMoveRotationFromLayers(axis, layers);
                if (moveRot) {
                    // Queue the move and rotation up.
                    _eventEnqueueInputMoveRotation(moveRot);

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

// Resize event handler.
function _eventOnResize(event) {
    animateResize();
    animateCondReq(true);
}

// Touch move event generated on mobile devices.  Only the mouse down and
// mouse up locations are considered, not the movement between those events.
function _eventOnTouchMove(event) {
    // Prevent the browser from scrolling or otherwise attempting to respond
    // to the event.
    event.preventDefault();
}

// When alt is combined with a full move rotation a visually similar camera
// move is done instead. This function returns true if the move was done.
function _eventQueueCameraMoveForCubeRotation(move) {
    var cameraDirection = null;
    switch (move) {
        case "X":
            cameraDirection = "down";
            break;
        case "X'":
            cameraDirection = "up";
            break;
        case "Y":
            cameraDirection = "right";
            break;
        case "Y'":
            cameraDirection = "left";
            break;
        case "Z":
            cameraDirection = "up";
            break;
        case "Z'":
            cameraDirection = "down";
            break;
    }

    if (cameraDirection) {
        animateQueueCameraMove(cameraDirection);
        return true;
    } else {
        return false;
    }
}
