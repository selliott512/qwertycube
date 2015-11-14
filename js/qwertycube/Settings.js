"use strict";

var settingsDisplayed = false;
var settingsExtraLen = " persist new-cube".length;
var settingsInitialText =
    "This settings dialog can be used to view and modify various " +
    "variables in QWERTYcube.  Edit variables below, if need be, and click " +
    "the Ok button (or Ctrl-Enter) to apply the changes, or click the Cancel " +
    "button (or Esc) to abandon the changes.  They're in alphabetical order. " +
    "You may have to scroll to see some. Variables marked with \"persist\" are " +
    "stored in local storage so that they'll have that value the next time " +
    "QWERTYcube is loaded. Variables marked with \"new-cube\" will not take " +
    "effect until a new cube (press New or N) is created.";

// Each entry is name, persist, new-cube, description
var settingsVarNameDescs = [
    ["animation", true, false, "If true then show animation as the cube moves. \"A\" toggles."],
    ["animationLimit", true, false, "Bypass animation when more than this number of moves are queued up."],
    ["cameraLocation", true, false, "Location of the camera."],
    ["cubiesColorBackground", true, false, "Background color to use.  Some color names work as well as 0xRRGGBB."],
    ["cubiesColorOverrides", true, true, "Color overrides.  Space separated list of color override items " +
            "where each item has the form <side>:<color>. For example, to map the right side to grey, the " +
            "left side to magenta and the interior to 0x224466: R:grey L:magenta I:0x224466"],
    ["cubiesColorScheme", true, true, "Cube color scheme.  Valid values are \"hc-black\", \"hc-white\", " +
            "\"std-black\" and \"std-white\".  \"hc\" is high contrast."],
    ["cubiesGap", true, true, "The size of the gaps between cubies."],
    ["cubiesInitFacelets", true, true, "Facelet pattern used for new cubes.  The pattern specified is " +
            "considered to be solved (the timer will stop when it's reached). Order is URFDLB."],
    ["cubiesSize", true, true, "The size of each cubie."],
    ["dispOrientationLabels", true, false, "Display labels that to show the orientation \"O\" toggles)."],
    ["flashHelp", true, false, "If true then flash the Help button on load and inform the user to click it."],
    ["keyMap", true, false, "Key map.  Space separated list of key mapping items where each item has the form " +
            "[A][S]<keyChar|keyNum>:k<key>|m<move>.  A is alt, S is shift.  Case sensitive, order matters (A " +
            "before S).  For example, to map Alt-Shift-W to move R2, Q to default key J and Shift-X to move r: " +
            "ASW:mR2 Q:kJ SX:mr"],
    ["moveHistory", false, false, "All moves made since loading the page."],
    ["moveHistoryNext", false, false, "Next move to be made if a redo (Shift-G) is done."],
    ["moveSec", true, false, "Number of moves per second when replaying."],
    ["rotationLock", true, false, "If true then the cube is not rotated by clicking and moving on the grey " +
            "background.  Instead, those clicks are interpreted as cube moves.  This both prevents accidental" +
            "rotations and it makes it possible to have less precise mouse/touch movements for cube moves."],
    ["scrambleCount", true, false, "Number of random moves used to scramble the cube for the \"simple\" scrambler."],
    ["scrambleMoves", false, false, "Moves used to scramble the cube."],
    ["scrambleType", true, false, "Type of scrambler used.  \"simple\" or \"jsss\"."],
    ["statusSecs", true, false, "How long status is displayed at the top of the browser."],
    ["timerInspectionSecs", true, false, "The amount of inspection time before solving."],
    ["wireframeSphere", true, false, "If true then enclose the cube in a wireframe sphere with radius cubiesRadius " +
            "so that it's extent can be seen.  This is mostly for developer use to arrange elements on the GUI."]];

// Buttons that appear at the bottom for the settings dialog. Row is zero based.
var settingsButtonList = [ {
    label : "Cancel",
    func : settingsCancel
}, {
    label : "Ok",
    func : settingsOk
} ];

// Public methods

function settingsCancel() {
    console.log("Cancel clicked")
    settingsHide();
}

function settingsHide() {
    orbitControls.enabled = !rotationLock;

    // Hidden is better than just opacity: 0. See
    // http://stackoverflow.com/questions/272360/does-opacity0-have-exactly-the-same-effect-as-visibilityhidden
    settingsTextEl.style.visibility = "hidden";

    initAddUpdateButtons(mainButtonList);

    settingsDisplayed = false;
}

function settingsOk() {
    console.log("Ok clicked");

    // Reset the cube.
    animateNewCube();

    // Now apply the variables.
    var lines = settingsTextEl.value.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        // Strip off comments.
        line = line.replace(/#.*$/g, "");
        var eqIndex = line.indexOf("=");
        if (eqIndex == -1) {
            continue;
        }
        var varName = line.substr(0, eqIndex).trim();
        var varValueStr = line.substr(eqIndex + 1).trim();
        setGlobal(varName, varValueStr);
    }

    // Miscellaneous checks for variables.
    if (moveHistoryNext > moveHistory.length) {
        moveHistoryNext = moveHistory.length;
    }
    // Standard upper case, no spaces, truncate if too long.
    cubiesInitFacelets = cubiesInitFacelets.replace(/ /g, "").toUpperCase().substring(0, 54);
    while (cubiesInitFacelets.length < 54) {
        // Just use internal if the string is too short for some reason.
        cubiesInitFacelets += "I";
    }

    // Now that the globals have been updated save to persistent storage.
    initSaveStorage();
    animateUpdateStatus("Settings saved");

    initVars();
    initSetBackgroundColor();
    animateSetCamera();
    animateWireframeSphere(wireframeSphere);

    // Apply the new move history to the cube.
    // TODO: If the cube is partially rewound then those moves after
    // moveHistoryNext are lost upon restore.
    moveQueue = moveHistory.slice();
    if (moveHistory.length) {
        moveHistory.length = 0; // The moveQueue will be appended.
        moveHistoryNextLast = moveHistoryNext;
        moveHistoryNext = 0;
    }
    settingsHide();
    animateCondReq(true);
}

function settingsOnKeyDown(event) {
    var settingsEvent = false;
    if (event.keyCode === 27) {
        // Escape
        settingsCancel();
        settingsEvent = true;
    } else if (event.ctrlKey && (event.keyCode === 13)) {
        // Ctrl-Enter
        settingsOk();
        settingsEvent = true;
    }
    if (settingsEvent) {
        event.preventDefault();
    }
}

function settingsOnLoad() {
    console.log("onLoad()");
    settingsResize();
    setCursorAfterInit();
}

function settingsResize() {
    console.log("settingsResize()");
    var settingsHeight = primaryHeight;

    settingsTextEl.style.left = "0px";
    settingsTextEl.style.top = "0px";
    settingsTextEl.style.width = (canvasWidth - 6) + "px";
    settingsTextEl.style.height = settingsHeight + "px";
}

function settingsShow() {
    // The orbit controls grab events that are needed.
    orbitControls.enabled = false;

    initAddUpdateButtons(settingsButtonList);

    settingsResize();
    settingsTextEl.style.visibility = "visible";

    settingsTextEl.value = wrapWithComments(settingsInitialText) + "\n";

    // Update variables that may need updating.
    cameraLocation[0] = Math.round(camera.position.x);
    cameraLocation[1] = Math.round(camera.position.y);
    cameraLocation[2] = Math.round(camera.position.z);

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        var varNewCube = varNameDesc[2];
        var varDesc = varNameDesc[3];
        settingsTextEl.value += "\n" + wrapWithComments(varDesc  +
                (varPersist ? " persist" : "") +
                (varNewCube ? " new-cube" : "")) + "\n";
        var varValue = window[varName];
        var line = varName + "=";
        if (varValue.constructor === Array) {
            line += varValue.join(" ");
        }
        else if (varValue.constructor === Object) {
            line += mapToString(varValue);
        }
        else {
            line += varValue;
        }
        settingsTextEl.value += line + "\n";
    }

    setCursorAfterInit();
    settingsDisplayed = true;
}

// Private methods

function setCursorAfterInit() {
    settingsTextEl.spellcheck = false;
    settingsTextEl.focus();
    var initLen = settingsInitialText.length;
    settingsTextEl.setSelectionRange(initLen, initLen);
    settingsTextEl.scrollTop = 0;
}
