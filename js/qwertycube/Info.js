"use strict";

var infoDisplayed = false;
var infoExtraLen = " persist new-cube".length;
var infoInitialText =
    "This information dialog can be used to view and modify various " +
    "variables in QWERTYcube.  Edit variables below, if need be, and click " +
    "the ok button (or Ctrl-Enter) to apply the changes, or click the cancel " +
    "button (or Esc) to abandon the changes.  They're in alphabetical order. " +
    "You may have to scroll to see some. Variables marked with \"persist\" are " +
    "stored in local storage so that they'll have that value the next time " +
    "QWERTYcube is loaded. Variables marked with \"new-cube\" will not take " +
    "effect until a new cube (Alt-Shift-N) is created.";

// Each entry is name, persist, new-cube, description
var infoVarNameDescs = [
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
    ["dispHelp", true, false, "If true then the help dialog is displayed. \"H\" toggles."],
    ["keyMap", true, false, "Key map.  Space separated list of key mapping items where each item has the form " +
    		"[A][S]<keyChar|keyNum>:k<key>|m<move>.  A is alt, S is shift.  Case sensitive, order matters (A " +
    		"before S).  For example, to map Alt-Shift-W to move R2, Q to default key J and Shift-X to move r: " +
    		"ASW:mR2 Q:kJ SX:mr"],
    ["moveHistory", false, false, "All moves made since loading the page."],
    ["moveHistoryNext", false, false, "Next move to be made if a redo (Shift-G) is done."],
    ["moveSec", true, false, "Number of moves per second when replaying."],
    ["scrambleCount", true, false, "Number of random moves used to scramble the cube for the \"simple\" scrambler."],
    ["scrambleMoves", false, false, "Moves used to scramble the cube."],
    ["scrambleType", true, false, "Type of scrambler used.  \"simple\" or \"jsss\"."],
    ["statusSecs", true, false, "How long status is displayed at the top of the browser."],
    ["timerInspectionSecs", true, false, "The amount of inspection time before solving."],
    ["wireframeSphere", true, true, "If true then enclose the cube in a wireframe sphere with radius cubiesRadius " +
    		"so that it's extent can be seen.  This is mostly for developer use to arrange elements on the GUI."]];

// Public methods

function infoCancel() {
    console.log("Cancel clicked")
    infoHide();
}

function infoHide() {
    orbitControls.enabled = true;

    // Hidden is better than just opacity: 0. See
    // http://stackoverflow.com/questions/272360/does-opacity0-have-exactly-the-same-effect-as-visibilityhidden
    infoTextEl.style.visibility = "hidden";
    infoCancelEl.style.visibility = "hidden";
    infoOkEl.style.visibility = "hidden";
    infoDisplayed = false;
}

function infoOk() {
    console.log("Ok clicked");
    infoHide();

    // Reset the cube.
    animateNewCube();

    // Now apply the variables.
    var lines = infoTextEl.value.split("\n");
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
    animateUpdateStatus("Variables saved to persistent state.  " +
    		"Alt-Shift-P to clear.");

    initVars();
    initSetBackgroundColor();
    animateSetCamera();

    // Apply the new move history to the cube.
    // TODO: If the cube is partially rewound then those moves after
    // moveHistoryNext are lost upon restore.
    moveQueue = moveHistory.slice();
    if (moveHistory.length) {
        moveHistory.length = 0; // The moveQueue will be appended.
        moveHistoryNextLast = moveHistoryNext;
        moveHistoryNext = 0;
    }
    animateCondReq(true);
}

function infoOnKeyDown(event) {
    var infoEvent = false;
    if (event.keyCode === 27) {
        // Escape
        infoCancel();
        infoEvent = true;
    } else if (event.ctrlKey && (event.keyCode === 13)) {
        // Ctrl-Enter
        infoOk();
        infoEvent = true;
    }
    if (infoEvent) {
        event.preventDefault();
    }
}

function infoOnLoad() {
    console.log("onLoad()");
    infoResize();
    goToAfterInit();
}

function infoResize() {
    console.log("infoResize()");

    var textLeft = (window.innerWidth - infoTextEl.offsetWidth)/2;
    var textTop = (window.innerHeight - (infoTextEl.offsetHeight +
            infoCancelEl.offsetHeight + 10))/2;

    infoTextEl.style.left = textLeft + "px"
    infoTextEl.style.top = textTop + "px";
    infoTextEl.style.height = (window.innerHeight - 55) + "px";

    infoCancelEl.style.left = textLeft + "px";
    infoCancelEl.style.top = (textTop + infoTextEl.offsetHeight + 10) + "px";
    infoCancelEl.style.width = (infoTextEl.offsetWidth / 3) + "px";

    infoOkEl.style.left = (textLeft + 2 * infoTextEl.offsetWidth / 3) + "px";
    infoOkEl.style.top = (textTop + infoTextEl.offsetHeight + 10) + "px";
    infoOkEl.style.width = (infoTextEl.offsetWidth / 3) + "px";
}

function infoShow() {
    // The orbit controls grab events that are needed.
    orbitControls.enabled = false;

    infoTextEl.style.visibility = "visible";
    infoCancelEl.style.visibility = "visible";
    infoOkEl.style.visibility = "visible";
    infoResize();

    infoTextEl.value = wrapWithComments(infoInitialText,
            infoTextEl.cols - 1) + "\n";

    // Update variables that may need updating.
    cameraLocation[0] = Math.round(camera.position.x);
    cameraLocation[1] = Math.round(camera.position.y);
    cameraLocation[2] = Math.round(camera.position.z);

    for (var i = 0; i < infoVarNameDescs.length; i++) {
        var varNameDesc = infoVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        var varNewCube = varNameDesc[2];
        var varDesc = varNameDesc[3];
        infoTextEl.value += "\n" + wrapWithComments(varDesc  +
                (varPersist ? " persist" : "") +
                (varNewCube ? " new-cube" : ""), infoTextEl.cols - 1) + "\n";
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
        infoTextEl.value += line + "\n";
    }

    goToAfterInit();
    infoDisplayed = true;
}

// Private methods

function goToAfterInit() {
    infoTextEl.spellcheck = false;
    infoTextEl.focus();
    var initLen = infoInitialText.length;
    infoTextEl.setSelectionRange(initLen, initLen);
    infoTextEl.scrollTop = 0;
}
