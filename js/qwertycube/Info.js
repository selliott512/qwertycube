"use strict";

var infoDisplayed = false;
var infoInitialText = 
    "# This information dialog can be used to view and modify various variables in\n" +
    "# QWERTYcube.  Edit variables below, if need be, and click the ok button (or \n" +
    "# Ctrl-Enter) to apply the changes, or click the cancel button (or Esc) to\n" +
    "# abandon the changes.\n\n";
var varNameDescs = [["animation", "If true then show animation as the cube moves (A key toggle)."],
                    ["animationLimit", "Bypass animation when more than this number of moves are queued up."],
                    ["cubiesColorBackground", "Backgroud color to use.  Some color names work. Effective next page load."],
                    ["cubiesColorScheme", "Color scheme to use.  \"high-contrast\", \"standard\" and \"white-cube\". Effective next page load."],
                    ["dispOrientationLabels", "Display labels that to show the orientation (O key toggle)."],
                    ["moveHistory", "All moves made since loading the page."],
                    ["moveHistoryNext", "Next move to be made if a redo (Shift-G) is done."],
                    ["moveSec", "Number of moves per second when replaying."],
                    ["scrambleCount", "Number of random moves used to scramble the cube."],
                    ["scrambleMoves", "Moves used to scramble the cube."],
                    ["scrambleType", "Type of scrambler used.  \"simple\" or \"jsss\"."],
                    ["statusSecs", "How long status is displayed at the top of the browser."],
                    ["timerInspectionSecs", "The amount of inspection time before solving."]];

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
        var varValue;
        var varType = window[varName].constructor;
        if (!varType) {
            console.log("Ignoring unknown variable \"" + varName + "\".");
            continue;
        }
        if (varType === Array) {
            varValue = varValueStr.split(" ");
        }
        else if (varType === Boolean) {
            varValue = varValueStr.toLowerCase().substr(0, 1) == "t";
        }
        else if (varType === Number) {
            varValue = parseInt(varValueStr);
        }
        else {
            varValue = varValueStr;
        }
        window[varName] = varValue;
    }
    
    // Miscellaneous checks for variables.
    if (moveHistoryNext > moveHistory.length) {
        moveHistoryNext = moveHistory.length;
    }
    initVars();
    
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
    
    for (var i = 0; i < varNameDescs.length; i++) {
        var varNameDesc = varNameDescs[i];
        var varName = varNameDesc[0];
        var varDesc = varNameDesc[1];
        infoTextEl.value += "\n# " + varDesc + "\n";
        var varValue = window[varName];
        var line = varName + "=";
        if (varValue.constructor === Array) {
            line += varValue.join(" ");
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
