"use strict";

var infoDisplayed = false;
var infoInitialText = 
    "# This information dialog can be used to view and modify various variables in QWERTYcube.  Edit\n" +
    "# variables below, if need be, and click the ok button (or Ctrl-Enter) to apply the changes, or\n" +
    "# click the cancel button (or Esc) to abandon the changes.  Variables marked with \"persist\" are\n" +
    "# stored in local storage so that they'll have that value the next time QWERTYcube is loaded.\n" +
    "# Variables marked with \"new-cube\" will not take effect until a new cube (Alt-Shift-N) is created.\n\n";
   
// Each entry is name, persist, new-cube, description
var infoVarNameDescs = [
    ["animation", true, false, "If true then show animation as the cube moves (A key toggle)."],
    ["animationLimit", true, false, "Bypass animation when more than this number of moves are queued up."],
    ["cameraLocation", true, false, "Location of the camera."],
    ["cubiesColorBackground", true, true, "Background color to use.  Some color names work."],
    ["cubiesColorOverrides", true, true, "Override the color scheme per side.  Space separated. Ex I:grey U:yellow"],
    ["cubiesColorScheme", true, true, "Cube color scheme.  \"hc-black\", \"hc-white\", \"std-black\" and \"std-white\"."],
    ["cubiesGap", true, true, "The size of the gaps between cubies."],
    ["cubiesSize", true, true, "The size of each cubie."],
    ["dispOrientationLabels", true, false, "Display labels that to show the orientation (O key toggle)."],
    ["help", true, false, "If true then the help dialog is displayed."],
    ["moveHistory", false, false, "All moves made since loading the page."],
    ["moveHistoryNext", false, false, "Next move to be made if a redo (Shift-G) is done."],
    ["moveSec", true, false, false, "Number of moves per second when replaying."],
    ["scrambleCount", true, false, "Number of random moves used to scramble the cube."],
    ["scrambleMoves", false, false, "Moves used to scramble the cube."],
    ["scrambleType", true, false, "Type of scrambler used.  \"simple\" or \"jsss\"."],
    ["statusSecs", true, false, "How long status is displayed at the top of the browser."],
    ["timerInspectionSecs", true, false, "The amount of inspection time before solving."]];

// Public methods

function infoCancel() {
    console.log("Cancel clicked")
    infoHide();
}

function infoHide() {
    cameraControls.enabled = true;

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

    // Now that the globals have been updated save to persistent storage.
    initSaveStorage();
    animateUpdateStatus("Variables saved to persistent state.  " +
    		"Alt-Shift-P to clear.");

    initVars();
    initSetBackgroundColor();
    animateSetCamera();

    // Apply the new move history to the cube.
    moveQueue = moveHistory.slice(0, moveHistoryNext);
    moveHistory.length = 0; // The moveQueue will be appended.
    moveHistoryNext = 0;
    animateCondReq();
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
    cameraControls.enabled = false;

    infoTextEl.style.visibility = "visible";
    infoCancelEl.style.visibility = "visible";
    infoOkEl.style.visibility = "visible";
    infoResize();
    
    infoTextEl.value = infoInitialText;
    
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
        infoTextEl.value += "\n# " + varDesc + (varPersist ? " persist" : "") + 
            (varNewCube ? " new-cube" : "") + "\n";
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
