"use strict";

// Logic to display the settings dialog, and to interpret the result when "Ok"
// is clicked.

// Public globals

// Buttons that appear at the bottom for the settings dialog. Row is zero based.
var settingsButtonList = [ {
    label : "Cancel",
    func : _settingsCancel,
    key : "Esc",
    tip : "Discard changes"
}, {
    label : "Ok",
    func : _settingsOk,
    key : "Ctrl-Enter",
    tip : "Save changes to persistent storage"
} ];

var settingsDisplayed = false;

// Each entry is name, persist, description
var settingsVarNameDescs = [
    ["animateAnimationInst", true, "If true then moves happen instantaneously. \"A\" toggles."],
    ["animateAnimationLimit", true, "Bypass animation when more than this number of moves are queued up."],
    ["animateButtonHeightScale", true, "Scale the height of the buttons.  0 for no buttons."],
    ["animateButtonStyle", true, "How the buttons are arranged at the button of the screen.  Choices are " +
             "\"portrait\" (3 rows), \"landscape\" (1 row) or \"auto\" (3 rows for mobile and 1 row for " +
              "non-mobile)."],
    ["animateCameraLocation", true, "Location of the camera."],
    ["animateDispOrientationLabels", true, "Display labels so that each of the six sides are labeled. " +
            "\"O\" toggles."],
    ["animateMoveHistory", false, "All moves made since loading the page."],
    ["animateMoveHistoryNext", false, "Next move to be made if a redo (Shift-G) is done."],
    ["animateMoveSec", true, "Number of moves per second when replaying."],
    ["animateStatusSecs", true, "How long status is displayed at the top of the browser."],
    ["animateTimer", true, "Display the timer.  May result in high CPU usage."],
    ["animateTimerInspectionSecs", true, "The amount of inspection time before solving."],
    ["animateWireframeSphere", true, "If true then enclose the cube in a wireframe sphere with radius cubiesRadius " +
            "so that it's extent can be seen.  This is mostly for developer use to arrange elements on the GUI."],
    ["cubiesColorBackground", true, "Background color to use.  Some color names work as well as 0xRRGGBB."],
    ["cubiesColorOverrides", true, "Color overrides.  Space separated list of color override items " +
            "where each item has the form <side>:<color>. For example, to map the right side to grey, the " +
            "left side to magenta and the interior to 0x224466: R:grey L:magenta I:0x224466"],
    ["cubiesColorScheme", true, "Cube color scheme.  Valid values are \"hc-black\", \"hc-white\", " +
            "\"std-black\" and \"std-white\".  \"hc\" is high contrast."],
    ["cubiesCubeSize", true, "The size of each cubie."],
    ["cubiesGapSize", true, "The size of the gaps between cubies."],
    ["cubiesInitFacelets", true, "Facelet pattern used for new cubes.  The pattern specified is " +
            "considered to be solved (the timer will stop when it's reached). Order is URFDLB."],
    ["cubiesOrder", true, "The order of the cube.  The order of the usual 3x3x3 cube is 3."],
    ["eventHeise", true, "If true use Heise key mapping instead of the standard RLUDFB."],
    ["eventKeyMap", true, "Key map.  Space separated list of key mapping items where each item has the form " +
            "[A][S]<keyChar|keyNum>:k<key>|m<move>.  A is alt, S is shift.  Case sensitive, order matters (A " +
            "before S).  For example, to map Alt-Shift-W to move R2, Q to default key J and Shift-X to move r: " +
            "ASW:mR2 Q:kJ SX:mr"],
    ["eventKeyPreventDefault", true, "If true prevent default behavior when a key is recognized by this " +
            "program.  This prevents the browser from reacting in addition to this program."],
    ["eventMoveThreshold", true, "Mouse movements must be at least this many pixels.  Less is interpreted " +
             "as a single click."],
    ["eventRotationLock", true, "If true then the cube is not rotated by clicking and moving on the grey " +
            "background.  Instead, those clicks are interpreted as cube moves.  This both prevents accidental " +
            "rotations and it makes it possible to have less precise mouse/touch movements for cube moves."],
    ["eventRotationLockLimit", true, "When eventRotationLock is true interpret clicks that are this close to " +
            "the cube as a move."],
    ["eventToolTipTimeout", true, "Milliseconds of hovering over a button before a tooltip is displayed.  " +
            "0 for no delay.  -1 to disable tooltips."],
    ["initFlashHelp", true, "If true then flash the Help button on load and inform the user to click it."],
    ["scrambleCount", true, "Number of random moves used to scramble the cube for the \"simple\" scrambler."],
    ["scrambleMoves", false, "Moves used to scramble the cube."],
    ["scrambleType", true, "Type of scrambler used.  \"simple\" or \"jsss\"."],
    ["testsRunAll", true, "Run all unit tests when Ok is clicked after applying the settings."]];

// Private globals

var _settingsInitialText =
    "This settings dialog can be used to view and modify various " +
    "variables in QWERTYcube.  Edit variables below, if need be, and click " +
    "the Ok button (or Ctrl-Enter) to apply the changes, or click the Cancel " +
    "button (or Esc) to abandon the changes.  They're in alphabetical order. " +
    "You may have to scroll to see some. Variables marked with \"persist\" are " +
    "stored in local storage so that they'll have that value the next time " +
    "QWERTYcube is loaded.";

// Public functions

// Apply settings changes to the rest of this program.  This happens when "Ok"
// is clicked.
function settingsApply(okClicked) {
    // This is done twice since creating a new cube depends on some of the
    // variables.
    if (okClicked) {
        _settingsApplyVariables();
    } else {
        _settingsReadCamera();
    }
    initVars();

    // Reset the cube.
    if (!animateNewCube(okClicked)) {
        return;
    }

    // Do this again to re-set variables set by creating a new cube.
    if (okClicked) {
        _settingsApplyVariables();
    }

    // Now that the globals have been updated save to persistent storage.
    if (okClicked) {
        initSaveStorage();
        animateUpdateStatus("Settings saved");
    }

    initSetBackgroundColor();
    animateSetCamera();
    animateDrawWireframeSphere(animateWireframeSphere);

    // Apply the new move history to the cube.
    // TODO: If the cube is partially rewound then those moves after
    // animateMoveHistoryNext are lost upon restore.
    utilsClearMoveQueue();
    utilsEnqueueMoves(animateMoveHistory);
    if (animateMoveHistory.length) {
        animateMoveHistory.length = 0; // The animateMoveQueue will be appended.
        animateMoveHistoryNextLast = animateMoveHistoryNext;
        animateMoveHistoryNext = 0;
    }
    if (okClicked) {
        _settingsHide();
    }
    animateResize();
    animateCondReq(true);
}

// Key event handler for the settings dialog.
function settingsOnKeyDown(event) {
    var settingsEvent = false;
    if (event.keyCode === 27) {
        // Escape
        _settingsCancel();
        settingsEvent = true;
    } else if (event.ctrlKey && (event.keyCode === 13)) {
        // Ctrl-Enter
        _settingsOk();
        settingsEvent = true;
    }
    if (settingsEvent) {
        event.preventDefault();
    }
}

// Prepare the settings dialog to be displayed.
function settingsOnLoad() {
    console.log("onLoad()");
    settingsResize();
    _settingsSetCursorAfterInit();
}

// Resize the settings dialog so that it takes up the whole screen other than
// the buttons at the bottom.
function settingsResize() {
    console.log("settingsResize()");
    var settingsHeight = initPrimaryHeight;

    initElSettingsText.style.left = "0px";
    initElSettingsText.style.top = "0px";
    initElSettingsText.style.width = animateCanvasWidth + "px";
    initElSettingsText.style.height = settingsHeight + "px";
}

// Display the settings dialog.
function settingsShow() {
    // Oddly this prevents a problem where the settings text does undesirable
    // horizontal scrolling when page-down is first pressed, at least on
    // Chrome.
    initElHelp.style.left = "0px";
    initElHelp.style.top = "0px";

    // The orbit controls grab events that are needed.
    animateOrbitControls.enabled = false;

    initAddUpdateButtons(settingsButtonList);

    settingsResize();
    initElSettingsText.style.visibility = "visible";

    initElSettingsText.value = utilsWrapWithComments(_settingsInitialText) + "\n";

    // Update variables that may need updating.
    _settingsReadCamera();

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        var varDesc = varNameDesc[2];
        initElSettingsText.value += "\n" + utilsWrapWithComments(varDesc  +
                (varPersist ? " persist" : "")) + "\n";
        var varValue = window[varName];
        var line = varName + "=";
        if (varValue.constructor === Array) {
            line += varValue.join(" ");
        }
        else if (varValue.constructor === Object) {
            line += utilsMapToString(varValue);
        }
        else {
            line += varValue;
        }
        initElSettingsText.value += line + "\n";
    }

    _settingsSetCursorAfterInit();
    settingsDisplayed = true;
}

// Private functions

// Parse the contents of the settings dialog and apply it to public global
// variables.
function _settingsApplyVariables() {
    // Save variables where special action needs to be taken when they change.
    var scrambleCountOld = scrambleCount;

    // Apply the variables in the text area.
    var lines = initElSettingsText.value.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        // Strip off comments.
        line = line.replace(/#.*$/g, "");
        var eqIndex = line.indexOf("=");
        if (eqIndex === -1) {
            continue;
        }
        var varName = line.substr(0, eqIndex).trim();
        var varValueStr = line.substr(eqIndex + 1).trim();
        utilsSetGlobal(varName, varValueStr);
    }

    // Miscellaneous checks for variables.
    if (animateMoveHistoryNext > animateMoveHistory.length) {
        animateMoveHistoryNext = animateMoveHistory.length;
    }
    // Standard upper case, no spaces, truncate if too long.
    cubiesInitFacelets = cubiesInitFacelets.replace(/ /g, "").toUpperCase().
        substring(0, 54);
    while (cubiesInitFacelets.length < 54) {
        // Just use internal if the string is too short for some reason.
        cubiesInitFacelets += "I";
    }

    // If the scrambleCount was changed then the cached scrambles may need
    // to be recreated.
    if (scrambleCount !== scrambleCountOld) {
        for (var name in scrambles) {
            if ((name.length > 3) || (name > "333")) {
                delete scrambles[name];
            }
        }
    }
}

// Handle the "Cancel" button being clicked.
function _settingsCancel() {
    console.log("Cancel clicked")
    _settingsHide();
}

// Hide the settings dialog when it's no longer needed due to "Ok" or
// "Cancel".
function _settingsHide() {
    animateOrbitControls.enabled = !eventRotationLock;

    // Hidden is better than just opacity: 0. See
    // http://stackoverflow.com/questions/272360/does-opacity0-have-exactly-the-same-effect-as-visibilityhidden
    initElSettingsText.style.visibility = "hidden";

    initAddUpdateButtons(initMainButtonList);

    settingsDisplayed = false;

    eventToolTipCancel();
}

// Handle the "Ok" button being clicked.  Also run the unit tests if
// testsRunAll was set.
function _settingsOk() {
    console.log("Ok clicked");
    settingsApply(true);
    if (testsRunAll) {
        try {
            testsRun();
            console.log("All unit tests passed.")
        } catch (e) {
            var msg = "One or more unit tests failed";
            console.log(msg + ": " + e);
            if (e.stack) {
                console.log("Call stack: " + e.stack);
            }
            alert(msg + ".  See console log for details.");
        }
    }
}

// Set the camera location variable based on the the actual camera location.
function _settingsReadCamera() {
    // To a tenth of a pixel should be plenty accurate.
    animateCameraLocation[0] = Math.round(10 * animateCamera.position.x) / 10;
    animateCameraLocation[1] = Math.round(10 * animateCamera.position.y) / 10;
    animateCameraLocation[2] = Math.round(10 * animateCamera.position.z) / 10;
}

// Place the cursor just after the initial text.
function _settingsSetCursorAfterInit() {
    initElSettingsText.spellcheck = false;
    initElSettingsText.focus();
    var initLen = _settingsInitialText.length;
    initElSettingsText.setSelectionRange(initLen, initLen);
    initElSettingsText.scrollTop = 0;
}
