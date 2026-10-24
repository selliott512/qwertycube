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
var settingsDefaultValueTexts = {};

// Each entry is name, persist, description
var settingsVarNameDescs = [
    ["activeName", true, "Optional name for this QWERTYcube instance. If set, it is appended to the browser title for bookmark/history identification."],
    ["animateAnimationInst", true, "If true then moves happen instantaneously. \"A\" toggles."],
    ["animateAnimationLimit", true, "Bypass animation when more than this number of moves are queued up."],
    ["animateButtonHeightScale", true, "Scale the platform-default height of the buttons.  0 for no buttons."],
    ["animateButtonStyle", true, "How the buttons are arranged at the bottom of the screen.  Choices are " +
             "\"portrait\" (3 rows), \"landscape\" (1 row) or \"auto\" (3 rows for mobile and 1 row for " +
              "non-mobile)."],
    ["animateCameraLocation", true, "Location of the camera."],
    ["animateCameraOrthographic", true, "If true use an orthographic camera projection instead of the default " +
            "perspective projection. Mouse/touch move detection is approximate in this mode."],
    ["animateCameraOrthographicScale", true, "Scale factor for orthographic projection.  Larger values make the " +
            "cube appear smaller."],
    ["animateMoveHistory", false, "All moves made since loading the page."],
    ["animateMoveHistoryNext", false, "Next move to be made if a redo (Shift-G) is done."],
    ["animateMoveHistoryNormalize", true, "If true then simplify move history as moves are appended, without " +
            "normalizing across savepoints."],
    ["animateMoveSec", true, "Number of moves per second when replaying."],
    ["animateStatusSecs", true, "How long status is displayed at the top of the browser."],
    ["animateTimer", true, "Display the timer.  May result in high CPU usage."],
    ["animateTimerInspectionSecs", true, "The amount of inspection time before solving."],
    ["animateWireframeColor", true, "Color used for wireframe cube and sphere guides."],
    ["animateWireframeCube", true, "If true then draw a wireframe cube grid just outside the cube, subdivided by cubiesOrder."],
    ["animateWireframeSphere", true, "If true then enclose the cube in a wireframe sphere with radius cubiesRadius " +
            "so that its extent can be seen.  This is mostly for developer use when arranging GUI elements."],
    ["arrowsCorrectiveOnly", true, "If true then training mode shows only corrective arrows, allowing algorithm recall without next-move hints."],
    ["cubiesColorBackground", true, "Background color to use.  Some color names work as well as 0xRRGGBB."],
    ["cubiesBackgroundImageUrl", true, "Optional equirectangular background image URL.  Leave empty to use " +
            "cubiesColorBackground."],
    ["cubiesColorArrow", true, "Color for normal training arrows."],
    ["cubiesColorArrowCorrective", true, "Color for corrective training arrows."],
    ["cubiesColorOverrides", true, "Color overrides.  Space-separated list of color override items " +
            "where each item has the form <side>=<color>. For example, to map the right side to grey, the " +
            "left side to magenta and the interior to 0x224466: R=grey L=magenta I=0x224466"],
    ["cubiesColorScheme", true, "Cube color scheme.  Valid values are \"hc-black\", \"hc-white\", " +
            "\"std-black\" and \"std-white\".  \"hc\" is high contrast."],
    ["cubiesColorMissingSticker", true, "Color for stickers hidden by trainer modes. A numeric value is a blend fraction from cubiesColorBackground to the interior color; for example 0.5 is halfway. Non-numeric values are interpreted as colors."],
    ["cubiesCreateInterior", true, "If true then create fully internal cubies. False improves performance for large cubes."],
    ["cubiesCubeSize", true, "The size of each cubie."],
    ["cubiesDisplayScale", true, "Scale multiplier for the displayed cube. 1.0 is the default size; smaller values make the cube smaller."],
    ["cubiesDoubleSided", true, "Material side mode for cubie faces, arrows and orientation labels. Valid values are \"auto\", \"true\" and \"false\". \"auto\" is double-sided when cubiesRenderInteriorFaces or cubiesRenderMissingStickers is false."],
    ["cubiesGapSize", true, "The size of the gaps between cubies."],
    ["cubiesInitFacelets", true, "Facelet pattern used for new cubes.  The pattern specified is " +
            "considered to be solved (the timer will stop when it's reached). Order is URFDLB."],
    ["cubiesLightAmbient", true, "Ambient light intensity used when cubiesLighting is true."],
    ["cubiesLightDirectional", true, "Directional light intensity used when cubiesLighting is true."],
    ["cubiesLighting", true, "If true then apply simple ambient plus directional lighting to stickers and missing stickers."],
    ["cubiesOrder", true, "The order of the cube.  The order of the usual 3x3x3 cube is 3."],
    ["cubiesRenderInteriorFaces", true, "If true then render non-sticker cubie faces using the interior color. If false then make those faces invisible."],
    ["cubiesRenderMissingStickers", true, "If true then render stickers hidden by trainer modes using cubiesColorMissingSticker. If false then make those stickers invisible."],
    ["cubiesTrainer", true, "Trainer sticker mode. Valid values are \"full\", \"middles\", \"not-middles\", \"edges\", \"corners\", \"cross\", \"f2l\", \"oll\" and \"pll\". The \"oll\" and \"pll\" modes hide stickers in ways that may make parity-impossible cases look possible."],
    ["eventHeise", true, "If true use Heise key mapping instead of the standard RLUDFB."],
    ["eventHeisePhysicalKeys", true, "If true then Heise uses physical QWERTY key positions via KeyboardEvent.code, independent of the OS keyboard layout."],
    ["eventIgnoreMouseSingleClickAfterKey", true, "If true then ignore mouse/touch single-click cube moves immediately after a keyboard move."],
    ["eventCopyFormat", true, "Format copied by Ctrl-C. Valid values are \"url\" and \"json\"."],
    ["eventCopyVars", true, "Whitespace-separated list of variables copied by Ctrl-C. Exact names, trailing * prefix wildcards and @nondefault are supported; for example cubies* matches all settings that start with cubies, and @nondefault copies persisted settings changed from their defaults."],
    ["eventCopyVarsExclude", true, "Whitespace-separated list of variables excluded from Ctrl-C output after eventCopyVars is expanded. Exact names and trailing * prefix wildcards are supported."],
    ["eventKeyMap", true, "Custom key map.  Space-separated list of key mapping items where each item has the form " +
            "[A][S]<keyChar|keyNum>=k<key>|m<move>|default|none.  A is alt, S is shift.  Case sensitive, order matters (A " +
            "before S).  For example, to map Alt-Shift-W to move R2, Q to default key J, Shift-X to move r and " +
            "Alt-R to move 1-2R (true two layer move, unlike r), Alt-Shift-J to browser default behavior and " +
            "Alt-Shift-X to no action: ASW=mR2 Q=kJ SX=mr AR=m1-2R ASJ=default ASX=none"],
    ["eventKeyPreventDefault", true, "If true prevent default behavior when a key is recognized by this " +
            "program.  This prevents the browser from reacting in addition to this program."],
    ["eventMoveThreshold", true, "Mouse movements must be at least this many pixels.  Less is interpreted " +
             "as a single click."],
    ["eventPasteAllVars", true, "If true then Ctrl-V JSON paste can apply any known settings variable. If false then paste is limited to eventCopyVars after eventCopyVarsExclude, and ignored known variables are logged."],
    ["eventRotationLock", true, "If true then the cube is not rotated by clicking and moving on the grey " +
            "background.  Instead, those clicks are interpreted as cube moves.  This both prevents accidental " +
            "rotations and it makes it possible to have less precise mouse/touch movements for cube moves. " +
            "Enabling it also saves the current camera location."],
    ["eventRotationLockLimit", true, "When eventRotationLock is true interpret clicks that are this close to " +
            "the cube as a move."],
    ["eventToolTipTimeout", true, "Milliseconds of hovering over a button before a tooltip is displayed.  " +
            "0 for no delay.  -1 to disable tooltips."],
    ["initFlashHelp", true, "If true then flash the Help button on load and inform the user to click it."],
    ["scrambleAnimate", true, "If true then animate scramble moves. If false then apply scrambles instantaneously."],
    ["scrambleCount", true, "Number of random moves used by the \"simple\" scrambler. Zero lets the scrambler decide."],
    ["scrambleExtraMoves", true, "Scrambler types that get animateAnimationLimit extra tail moves to reduce undo-based shortcutting. Space/comma separated. Default is \"jsss\"."],
    ["scrambleMoves", false, "Most recent scramble moves."],
    ["scrambleNewCube", true, "If true then reset to a new cube before scrambling. Default false avoids accidental data loss."],
    ["scrambleType", true, "Type of scrambler used.  \"simple\" or \"jsss\"."],
    ["scrambleUntilPhase", true, "If greater than zero, append solver moves after each generated scramble until the start of this one-based phase. For CFOP: 1 cross, 2 F2L, 3 OLL, 4 PLL. A numeric prefix before J overrides this once, e.g. 3J."],
    ["solveMoves", false, "Most recent solver moves used for training replay."],
    ["solveMovesInitialNext", false, "Move history index where solveMoves starts. Used to relate copied/pasted training solves to animateMoveHistory."],
    ["solveName", true, "Solver name. Available: cfop, cfop-badmephisto, cfop-badmephisto-mirrored, cfop-custom, cfop-frostburn, cfop-speedsolving, cross, jsss, lb-slot-safe, lb-slot-unsafe, ldb-corner. Default is \"cfop\", an alias for \"cfop-speedsolving\". The \"cfop-custom\" database needs user-provided algorithms. Use \"jsss\" to solve via JSS 3x3 facelets. The cross, slot, and corner solvers solve only their respective pieces."],
    ["solveOptions", true, "Whitespace-separated solver options, where each option is key=value with no spaces. CFOP OLL/PLL overrides use <name-or-signature>=<moves>[-m|-d], such as Jb=<moves> or BBR,FFB,RRF,LLL=<moves>."],
    ["solveLeftHanded", true, "If true then request left-handed (XZ mirrored) OLL/PLL algorithms from Cubearoni solveJSON()."],
    ["testsRunAll", true, "Run all unit tests when Ok is clicked after applying the settings."],
    ["textDispOrientationLabels", true, "Display labels so that each of the six sides are labeled. " +
            "\"O\" toggles."],
    ["utilsVerboseLogging", true, "If true then write verbose diagnostic logging to the JavaScript console."]];

// Private globals

var _settingsInitialText =
    "This settings dialog can be used to view and modify various " +
    "variables in QWERTYcube.  Edit variables below, if need be, and click " +
    "the Ok button (or Ctrl-Enter) to apply the changes, or click the Cancel " +
    "button (or Esc) to abandon the changes.  They're in alphabetical order. " +
    "You may have to scroll to see some. Variables marked with \"persist\" are " +
    "stored in local storage so that they'll have that value the next time " +
    "QWERTYcube is loaded. Preference and cube-order controls save their " +
    "changes immediately. Settings can also be passed as URL query " +
    "parameters, which override persisted values. Set activeName=<name> to " +
    "label the browser title for bookmarkable presets. Set a value to " +
    "@ or @default to restore its default value.";

// Public functions

// Capture default setting values before persisted/query values are applied.
function settingsCaptureDefaults() {
    settingsDefaultValueTexts = {};
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varName = settingsVarNameDescs[i][0];
        settingsDefaultValueTexts[varName] = settingsValueToText(window[varName]);
    }
}

// Return true if the current setting value differs from its startup default.
function settingsIsNonDefault(varName) {
    if (settingsDefaultValueTexts[varName] === undefined) {
        return false;
    }
    return settingsValueToText(window[varName]) !== settingsDefaultValueTexts[varName];
}

// Return the captured startup default value text for a setting.
function settingsGetDefaultValueText(varName) {
    return settingsDefaultValueTexts[varName] === undefined
            ? null : settingsDefaultValueTexts[varName];
}

// Convert a typed setting value to its settings-text representation.
function settingsValueToText(value) {
    if (value === null || value === undefined) {
        return "";
    }
    if (value.constructor === Array) {
        return value.join(" ");
    }
    if (value.constructor === Object) {
        return utilsMapToString(value);
    }
    return String(value);
}

// Apply settings changes to the rest of this program.  This happens when "Ok"
// is clicked.
function settingsApply(okClicked) {
    if (okClicked) {
        settingsApplyText(initElSettingsText.value, true, "Settings saved");
        _settingsHide();
        return;
    }

    // The camera move keys use this path to update the camera/cube view
    // without applying settings text.
    // This is done twice since creating a new cube depends on some of the
    // variables.
    animateSyncCameraLocation();
    initVars();

    // Reset the cube.
    if (!animateNewCube(false)) {
        return;
    }

    _settingsFinishApply();
}

// Apply settings-style text and refresh the cube as if Settings/Ok was clicked.
function settingsApplyText(settingsText, saveStorage, statusText) {
    var applyErrors = _settingsApplyVariables(settingsText);
    initVars();

    if (!animateNewCube(true)) {
        return false;
    }

    // Do this again to re-set variables set by creating a new cube.
    applyErrors = applyErrors.concat(_settingsApplyVariables(settingsText));

    if (saveStorage) {
        initSaveStorage();
    }
    applyErrors = _settingsUniqueApplyErrors(applyErrors);
    if (applyErrors.length) {
        _settingsReportApplyErrors(applyErrors);
        animateUpdateStatus("Settings error. See console.");
    } else if (statusText) {
        animateUpdateStatus(statusText);
    }

    _settingsFinishApply();
    return true;
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
    settingsResize();
    _settingsSetCursorAfterInit();
}

// Resize the settings dialog so that it takes up the whole screen other than
// the buttons at the bottom.
function settingsResize() {
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
    animateSyncCameraLocation();

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        var varDesc = varNameDesc[2];
        if (settingsIsNonDefault(varName)) {
            var defaultText = settingsDefaultValueTexts[varName];
            varDesc += " Changed from default: "
                    + (defaultText.length ? defaultText : "(empty)") + ".";
        }
        initElSettingsText.value += "\n" + utilsWrapWithComments(varDesc  +
                (varPersist ? " persist" : "")) + "\n";
        var varValue = window[varName];
        if ((varValue === undefined) || (varValue === null)) {
            console.log("settingsShow: variable \"" + varName
                + "\" is undefined/null; using empty default in dialog.");
        }
        var line = varName + "=" + settingsValueToText(varValue);
        initElSettingsText.value += line + "\n";
    }

    _settingsSetCursorAfterInit();
    settingsDisplayed = true;
}

// Private functions

// Parse the contents of the settings dialog and apply it to public global
// variables.
function _settingsApplyVariables(settingsText) {
    // Save variables where special action needs to be taken when they change.
    var scrambleCountOld = scrambleCount;
    var applyErrors = [];

    // Apply the variables in the text area.
    var lines = settingsText.split("\n");
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
        if ((varValueStr === "@") || (varValueStr === "@default")) {
            var defaultValueStr = settingsGetDefaultValueText(varName);
            if (defaultValueStr === null) {
                console.warn("No default value known for \"" + varName + "\".");
                continue;
            }
            varValueStr = defaultValueStr;
        }
        var applyResult = utilsSetGlobal(varName, varValueStr);
        if (applyResult && !applyResult.ok) {
            applyErrors.push(applyResult);
        }
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
    return applyErrors;
}

// Remove duplicate setting errors caused by settings being applied twice.
function _settingsUniqueApplyErrors(applyErrors) {
    var seen = {};
    var uniqueErrors = [];
    for (var i = 0; i < applyErrors.length; i++) {
        var applyError = applyErrors[i];
        var key = applyError.varName + "\n" + applyError.varValueStr
                + "\n" + applyError.error;
        if (seen[key]) {
            continue;
        }
        seen[key] = true;
        uniqueErrors.push(applyError);
    }
    return uniqueErrors;
}

// Log detailed information about settings that were rejected.
function _settingsReportApplyErrors(applyErrors) {
    var names = [];
    for (var i = 0; i < applyErrors.length; i++) {
        var applyError = applyErrors[i];
        names.push(applyError.varName);
        console.error("Setting value ignored for "
                + applyError.varName + "=\"" + applyError.varValueStr
                + "\": " + applyError.error + ".");
    }
    console.error("Settings error. Ignored invalid setting"
            + (applyErrors.length === 1 ? "" : "s") + ": "
            + names.join(", "));
}

// Finish applying settings by refreshing dependent display state and history.
function _settingsFinishApply() {
    initSetBackgroundColor();
    initSetTitle();
    initUpdateLights();
    animateSetCamera();
    animateDrawWireframeCube(animateWireframeCube);
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
    rotateUpdateArrowsMoveFromSolve();
    animateResize();
    animateCondReq(true);
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

// Place the cursor just after the initial text.
function _settingsSetCursorAfterInit() {
    initElSettingsText.spellcheck = false;
    initElSettingsText.focus();
    var initLen = _settingsInitialText.length;
    initElSettingsText.setSelectionRange(initLen, initLen);
    initElSettingsText.scrollTop = 0;
}
