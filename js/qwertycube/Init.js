"use strict";

// Initialization code including the main entry point _initLoad().

// Public globals

var activeName = "";
var initButtonKeyToElMap = {};

// Elements that are never recreated, so they're stored globally.
var initElButtonBar;
var initElContainer;
var initElHelp;
var initElSettingsText;
var initElStatus;
var initElTimer;
var initElTip;

var initFlashHelp = true;

// Buttons that appear at the bottom. Row is zero based.
var initMainButtonList = [{
    label : "?",
    id : "help",
    key : "H",
    tip : "Help with QWERTYcube"
}, {
    label : "⚙️",
    id : "config",
    key : "I",
    tip : "Open Settings"
}, {
    label : "⚡",
    id : "inst",
    key : "A",
    toggle : "animateAnimationInst",
    tip : "Make moves instantly instead of animating"
}, {
    label : "🔒",
    id : "lock",
    key : "K",
    toggle : "eventRotationLock",
    tip : "Lock the cube so it does not rotate"
}, {
    label : "🎨",
    id : "color",
    key : "Q",
    tip : "Change the color"
}, {
    label : "🔑",
    id : "heise",
    key : "V",
    toggle : "eventHeise",
    tip : "Use Heise keymap"
}, {
    label : "⏱️",
    id : "timer",
    key : "T",
    toggle : "animateTimer",
    tip : "Time solves with an inspection period"
}, {
    label : "Scramble",
    id : "scramble",
    icon : "images/cube-scrambled.svg",
    iconScale : 0.68,
    key : "SJ",
    tip : "Scramble the cube"
}, {
    label : "S Input",
    id : "scramble-input",
    icon : "images/cube-scrambled.svg",
    iconScale : 0.68,
    iconSuffix : "✏️",
    contentScale : 0.85,
    key : "AJ",
    tip : "Enter scramble moves"
}, {
    label : "−",
    id : "order-decrease",
    key : "@",
    availability : "order-decrease",
    tip : "Decrease the cube order by one"
}, {
    label : "3",
    id : "order-three",
    key : "#",
    availability : "order-three",
    tip : "Set the cube order to 3"
}, {
    label : "+",
    id : "order-increase",
    key : "$",
    tip : "Increase the cube order by one"
}, {
    label : "🚂✏️",
    id : "training-input",
    contentScale : 0.85,
    key : "AT",
    tip : "Enter training moves"
}, {
    label : "🚂",
    id : "train",
    key : "ST",
    toggle : "arrowsEnabled",
    tip : "Toggle move training indicators"
}, {
    label : "New",
    id : "new",
    icon : "images/cube-solved.svg",
    iconScale : 0.68,
    key : "N",
    tip : "Switch to a new solved cube"
}, {
    label : "<<",
    id : "undos",
    key : "AG",
    availability : "undo",
    tip : "Undo all moves until savepoint or the beginning"
}, {
    label : "<",
    id : "undo",
    key : "G",
    availability : "undo",
    tip : "Undo one move"
}, {
    label : "|",
    id : "save",
    key : "C",
    availability : "save",
    tip : "Set a savepoint at the current state"
}, {
    label : ">",
    id : "redo",
    key : "SG",
    availability : "redo",
    tip : "Redo one move"
}, {
    label : ">>",
    id : "redos",
    key : "ASG",
    availability : "redo",
    tip : "Redo all moves until savepoint or the end"
}, {
    label : "⟳",
    id : "reset",
    key : "P",
    tip : "Factory reset"
}];

var initMobile = false;

// Height of the main object currently being displayed.
var initPrimaryHeight = 0;

// Private globals

var _initButtonRowsMax = 0;
var _initHelpFlashed = false;
var _initBackgroundLoadToken = 0;
var _initLightAmbient = null;
var _initLightDirectional = null;
var _initLightDirectionalTarget = null;

// Strings that moves can be suffixed with.
var _initMoveSuffixes = ["", "'", "2"];

// Prefix to apply to entries in localStorage.
var _initPresistentPrefix = "QC";

// Public functions

// Add the buttons listed in buttonList to the button of the screen.
function initAddUpdateButtons(buttonList) {
    // Delete any existing buttons.
    while (initElButtonBar.childNodes.length) {
        initElButtonBar.removeChild(initElButtonBar.lastChild);
    }

    // Allow more rows on mobile by default.
    if (animateButtonStyle === "portrait") {
        _initButtonRowsMax = 3;
    } else if (animateButtonStyle === "landscape") {
        _initButtonRowsMax = 1;
    } else if (animateButtonStyle === "auto") {
        _initButtonRowsMax = initMobile ? 3 : 1;
    }

    // The indexes only apply to landscape/non-mobile mode.  That is, the
    // button arrays are ordered so they are correct on mobile and then
    // further ordered by the indexes, if need be, so they are correct on
    // non-mobile.
    if (_initButtonRowsMax === 1) {
        var bList = [];
        for (var i = 0; i < buttonList.length; i++) {
            var index = buttonList[i].index;
            if (index !== undefined) {
                if ((index < 0) || (index >= buttonList.length)) {
                    // This should not happen.
                    utilsFatalError("Target index " + index +
                        " is out of range.");
                }
                var target = index;
            } else {
                // Default to the same place it would go anyway.
                var target = i;
            }
            if (bList[target]) {
                // This should not happen.
                utilsFatalError("Target index " + target +
                    " already has a button.");
            }
            bList[target] = buttonList[i];
        }
    } else {
        var bList = buttonList;
    }

    var rows = Math
            .min(Math.floor(bList.length / 4 + 0.99), _initButtonRowsMax);
    var cols = Math.floor(bList.length / rows + 0.99);

    // Calculate what the size of each mutton must be.
    var buttonWidth = animateCanvasWidth / cols;
    var buttonHeight = Math.floor(animateButtonBarHeight / _initButtonRowsMax);
    var buttonTopOffset = (_initButtonRowsMax - rows) * buttonHeight;
    initPrimaryHeight = animateCanvasHeight + buttonTopOffset;

    if (!buttonHeight) {
        // No need to add buttons that have no height.
        return;
    }

    // Zero based rows and columns.
    var row = 0;
    var col = 0;
    for (var i = 0; i < bList.length; i++) {
        if (col >= cols) {
            col = 0;
            row++;
        }

        var button = bList[i];
        var buttonEl = document.createElement("button");
        var contentScale = button.contentScale || 1.0;

        var row = Math.floor(i / cols);

        // Give it a name and make it visible.
        buttonEl.id = "button-" + (button.id
                ? button.id : button.label.toLowerCase().replace(" ", "-"));
        if (button.tip) {
            buttonEl.setAttribute("aria-label", button.tip);
        }

        // Set the size and location.
        buttonEl.style.left = Math.round(col * buttonWidth) + "px";
        buttonEl.style.top = (row * buttonHeight + initPrimaryHeight) + "px";
        buttonEl.style.width = Math.round(buttonWidth) + "px";
        buttonEl.style.height = buttonHeight + "px";

        // Add either an icon or the button label.
        var iconEl = null;
        if (button.icon) {
            iconEl = document.createElement("img");
            iconEl.alt = "";
            iconEl.draggable = false;
            iconEl.src = button.icon;
            iconEl.style.verticalAlign = "middle";
            buttonEl.appendChild(iconEl);
            if (button.iconSuffix) {
                buttonEl.appendChild(document.createTextNode(button.iconSuffix));
            }
        } else {
            buttonEl.appendChild(document.createTextNode(button.label));
        }
        if (button.iconSuffix || button.contentScale) {
            buttonEl.style.whiteSpace = "nowrap";
        }

        // Make the literal reasonably large.
        buttonEl.style.fontSize = Math.floor(contentScale * buttonHeight
                / (initMobile ? 2.4 : 1.6)) + "px";

        // Make it handle the click event as if it was a key event.
        buttonEl.onclick = (function(elem, butt) {
            return function(event) {
                eventOnButtonClick(event, elem, butt)
            };
        })(buttonEl, button);

        // Tool tip help for non-mobile only.
        if (!initMobile) {
            buttonEl.onmouseover = (function(elem, butt) {
                return function(event) {
                    eventOnButtonOver(event, elem, butt)
                };
            })(buttonEl, button);

            buttonEl.onmouseout = (function(elem, butt) {
                return function(event) {
                    eventOnButtonOut(event, elem, butt)
                };
            })(buttonEl, button);
        }

        // Don't respond to attempts to move the buttons.
        if (initMobile) {
            buttonEl.addEventListener("touchmove", eventPreventDefault);
        }

        if (!eventButtonColorOrig) {
            eventButtonColorOrig = window.getComputedStyle(buttonEl).backgroundColor;
        }

        initSetButtonColor(buttonEl, button, false);

        // Make it visible.
        buttonEl.style.visibility = "visible";

        // Add it to the button bar.
        initElButtonBar.appendChild(buttonEl);
        if (iconEl) {
            var iconScale = contentScale * (button.iconScale || 0.9);
            iconEl.style.height = Math.floor(buttonEl.clientHeight * iconScale) + "px";
        }

        // Keep a reference the button variables.
        initButtonKeyToElMap[button.key] = [buttonEl, button];

        col++;
    }
    eventUpdateButtonStates();
}

// Clear the persistent storage (Reset/Alt-Shift-P).
function initClearStorage() {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (!varPersist) {
            continue;
        }
        localStorage.removeItem(_initPresistentPrefix + varName);
    }
}

// Set the button color, highlighted or not, as a function of the boolean that
// the button may be linked to.  Help is a special case because it's flashed
// at startup.
function initSetButtonColor(buttonEl, button, flash) {
    var toggle = button.toggle;
    var fh = (button.id === "help") && initFlashHelp && !_initHelpFlashed;
    if (toggle) {
        var val = window[toggle];
        buttonEl.style.backgroundColor = (val ? eventButtonColorHighlight
                : eventButtonColorOrig);
    } else if (flash || fh) {
        // The help button is a special case. Flash it when the page if first
        // loaded so the user knows to click it for instructions.
        var flashCount = flash ? 1 : 3;
        for (var i = 0; i < 2 * flashCount; i++) {
            // Double function wrapper used so that the index (i or j) is
            // evaluated now instead of later.
            setTimeout(function(elem, j) {
                return function() {
                    elem.style.backgroundColor = (j % 2) ? eventButtonColorOrig
                            : eventButtonColorHighlight;
                }
            }(buttonEl, i), i * eventButtonFlashDelay);
        }
    }
}

// Briefly mark an unavailable button, then restore its current state.
function initFlashButtonUnavailable(buttonEl, button) {
    buttonEl.style.backgroundColor = "rgb(255, 160, 160)";
    setTimeout(function() {
        buttonEl.style.backgroundColor = eventButtonColorOrig;
        eventUpdateButtonStates();
    }, eventButtonFlashDelay);
}

// Save all public globals listed in settingsVarNameDescs to persistent
// storage.
function initSaveStorage() {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (!varPersist) {
            continue;
        }
        initSaveStorageVariable(varName);
    }
}

// Save one persistent settings variable to local storage.
function initSaveStorageVariable(varName) {
    var varPersist = false;
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        if (settingsVarNameDescs[i][0] === varName) {
            varPersist = settingsVarNameDescs[i][1];
            break;
        }
    }
    if (!varPersist) {
        console.log("initSaveStorageVariable: skipping non-persistent variable \""
                + varName + "\".");
        return false;
    }

    var varGlobal = window[varName];
    if ((varGlobal === undefined) || (varGlobal === null)) {
        console.log("initSaveStorageVariable: skipping undefined/null variable \""
                + varName + "\".");
        return false;
    }
    if (varGlobal.constructor === Array) {
        // Write arrays space separated.
        var varValue = "";
        for (var j = 0; j < varGlobal.length; j++) {
            varValue += (j ? " " : "") + varGlobal[j];
        }
    } else if (varGlobal.constructor === Object) {
        // Write maps as a space-separated key=value list.
        varValue = utilsMapToString(varGlobal);
    } else {
        varValue = varGlobal;
    }
    localStorage.setItem(_initPresistentPrefix + varName, varValue);
    return true;
}

// Initialize miscellaneous global variables that calculated from other global
// variables.
function initVars() {
    // Calculate radians per msec given the moves (half turns) per second.
    animateMoveRadMsec = (animateMoveSec / 1000.0) * (Math.PI / 2.0);

    // Don't display the help dialog for mobile devices. Leave it be for
    // non-mobile.
    initMobile = utilsIsMobile();
    console.log("Mobile: " + initMobile);

    // Scale the cubies based on the current order so that the overall cube has
    // the same size as a 3x3. A 3x3, which is the default, consists of 3
    // (order) cubies and 2 (order -1) gaps per dimension.
    if (cubiesOrder === 3) {
        var cubiesOrderScale = 1;
    }
    else {
        var cubiesOrderScale = (3 * cubiesCubeSize + 2 * cubiesGapSize) / (
                cubiesOrder * cubiesCubeSize + (cubiesOrder - 1) * cubiesGapSize);
    }
    if (!(cubiesDisplayScale > 0)) {
        console.warn("Invalid cubiesDisplayScale " + cubiesDisplayScale
                + "; using 1.0.");
        cubiesDisplayScale = 1.0;
    }
    cubiesScale = cubiesOrderScale * cubiesDisplayScale;

    cubiesSizeScaled = cubiesScaleDist(cubiesCubeSize);
    cubiesGapScaled = cubiesScaleDist(cubiesGapSize);

    // Used to find the position of each cubie.
    cubiesOffset = cubiesCubeSize + cubiesGapSize;
    cubiesOffsetScaled = cubiesScaleDist(cubiesOffset);
    cubiesHalfSide = Math.round(((cubiesOrder - 1) / 2) * cubiesOffsetScaled
            + (cubiesSizeScaled / 2));
    cubiesSep = Math.round(cubiesOffsetScaled / 2);
    cubiesExtendedMiddle = cubiesHalfSide - cubiesSizeScaled -
        (cubiesGapScaled / 2);

    // Radius of the smallest sphere that completely encloses the entire cube.
    cubiesRadius = Math.sqrt(3.0) * cubiesHalfSide;

    // Radius of the smallest sphere centered at the origin that encloses both
    // the cube and the animateCamera (or, distance from the animateCamera to the origin).
    animateCameraRadius = 0.0;
    for (var i = 0; i < animateCameraLocation.length; i++) {
        animateCameraRadius += animateCameraLocation[i] * animateCameraLocation[i];
    }
    animateCameraRadius = Math.sqrt(animateCameraRadius);

    // Don't allow any rotation if eventRotationLock.
    if (animateOrbitControls) {
        animateOrbitControls.enabled = !eventRotationLock;
    }

    // Update the key map.
    eventUpdateKeyMap();
}

// Register the callback Cubearoni uses to load database files on demand.
function initCubearoni() {
    if (window.location && window.location.protocol === "file:") {
        console.warn("Cubearoni DB loading may fail from file:// URLs. " +
            "Serve QWERTYcube over HTTP(S) so fetch(\"db/...\") is allowed.");
    }

    if (!window.setDBFileLoader) {
        console.error("Cubearoni API is unavailable");
        return;
    }

    window.setDBFileLoader(async function(fileName) {
        var beforeMillis = performance.now();
        var response = await fetch("db/" + encodeURIComponent(fileName), {
            cache : "no-cache"
        });
        if (!response.ok) {
            throw new Error("Failed to fetch " + fileName + ": "
                + response.status);
        }
        var bytes = new Uint8Array(await response.arrayBuffer());
        var elapsedMillis = performance.now() - beforeMillis;
        animateUpdateStatus("Loaded " + fileName + " in "
            + elapsedMillis.toFixed(3) + " millis");
        return bytes;
    });
    console.log("Cubearoni DB file loader registered.");
}

// Set the background from cubiesColorBackground/cubiesBackgroundImageUrl.
function initSetBackgroundColor() {
    if (!animateRenderer) {
        return;
    }

    var color = utilsNormalizeColor(cubiesColorBackground);
    animateRenderer.setClearColor(color);
    if (typeof textUpdateColor === "function") {
        textUpdateColor();
    }

    if (!animateScene) {
        // The scene is created later in _initFillScene().
        return;
    }

    function disposeSceneBackground() {
        if (animateScene.background && animateScene.background.dispose) {
            animateScene.background.dispose();
        }
    }

    var backgroundImageUrl = (cubiesBackgroundImageUrl || "").trim();
    var loadToken = ++_initBackgroundLoadToken;
    if (!backgroundImageUrl.length) {
        disposeSceneBackground();
        animateScene.background = null;
        animateCondReq(true);
        return;
    }

    var loader = new THREE.TextureLoader();
    loader.load(backgroundImageUrl, function(texture) {
        if (loadToken !== _initBackgroundLoadToken) {
            // A newer background load has superseded this one.
            texture.dispose();
            return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        disposeSceneBackground();
        animateScene.background = texture;
        animateCondReq(true);
    }, undefined, function(err) {
        if (loadToken !== _initBackgroundLoadToken) {
            return;
        }
        console.warn("Unable to load cubiesBackgroundImageUrl \"" +
            backgroundImageUrl + "\". Falling back to cubiesColorBackground.", err);
        disposeSceneBackground();
        animateScene.background = null;
        animateCondReq(true);
    });
}

// Add or remove cubie lights based on cubiesLighting settings.
function initUpdateLights() {
    if (!animateScene) {
        return;
    }
    if (_initLightAmbient) {
        animateScene.remove(_initLightAmbient);
        _initLightAmbient = null;
    }
    if (_initLightDirectional) {
        animateScene.remove(_initLightDirectional);
        _initLightDirectional = null;
    }
    if (_initLightDirectionalTarget) {
        animateScene.remove(_initLightDirectionalTarget);
        _initLightDirectionalTarget = null;
    }
    if (!cubiesLighting) {
        return;
    }

    _initLightAmbient = new THREE.AmbientLight(0xffffff, cubiesLightAmbient);
    animateScene.add(_initLightAmbient);

    _initLightDirectional = new THREE.DirectionalLight(0xffffff,
            cubiesLightDirectional);
    _initLightDirectional.position.set(0, 2.4, 1);
    _initLightDirectionalTarget = new THREE.Object3D();
    _initLightDirectionalTarget.position.set(0, 0, 0);
    animateScene.add(_initLightDirectionalTarget);
    _initLightDirectional.target = _initLightDirectionalTarget;
    animateScene.add(_initLightDirectional);
}

// Private functions

// Fill rotateMoveToRotation as well as it's conjugate rotateRotationToMove.
function _initFillMoveToRotation() {
    var count = 0;
    for ( var face in rotateFaceToRotation) {
        var faceRot = rotateFaceToRotation[face];
        for ( var s = 0; s < _initMoveSuffixes.length; s++) {
            var suffix = _initMoveSuffixes[s];
            var move = face + suffix;
            var moveRot = faceRot.slice();
            if (suffix === "'") {
                moveRot[0] = -moveRot[0];
            } else if (suffix === "2") {
                moveRot[4] = 2;
            }
            for (var t = 1; t <= 2; t++) {
                var twoLayer = t === 2;
                if (twoLayer) {
                    if ("XYZMSE".indexOf(face) !== -1) {
                        // Two layer of these moves does not make sense.
                        continue;
                    }
                    move = move.toLowerCase();
                    moveRot = moveRot.slice();
                    if (moveRot[2] !== moveRot[3]) {
                        // This should not happen.
                        console.log("Unexpected multilayer range ["
                                + moveRot[2] + ", " + moveRot[3] + "]  for "
                                + face);
                    }
                    if (moveRot[2] === -1) {
                        moveRot[3] = 0;
                    } else if (moveRot[3] === 1) {
                        moveRot[2] = 0;
                    } else {
                        // This should not happen.
                        console.log("Unexpected range [" + moveRot[2] + ", "
                                + moveRot[3] + "] for " + face);
                    }
                }
                count++;
                rotateMoveToRotation[move] = moveRot;
                rotateRotationToMove[moveRot] = move;
            }
        }
    }
    console.log("_initFillMoveToRotation: Added " + count + " moves.");
}

// Create the list of cubies and add them to the three.js scene.
function _initFillScene() {
    animateScene = new THREE.Scene();
    initSetBackgroundColor();
    initUpdateLights();
    cubiesCreate(null);
    animateText = new textCreate();
    textSetVisible(textDispOrientationLabels, true);

    rotatePivot = new THREE.Object3D();
    animateScene.add(rotatePivot);

    // Add cubies (Child cubes) to animateScene
    for (var i = 0; i < cubiesList.length; i++) {
        animateScene.add(cubiesList[i]);
    }

    animateDrawWireframeCube(animateWireframeCube);
    animateDrawWireframeSphere(animateWireframeSphere);

    // Initialize arrows system
    arrowsInit();
}

// Get a handle to each interesting HTML element.
function _initGetElements() {
    initElButtonBar = document.getElementById("button-bar");
    initElContainer = document.getElementById("container");
    initElHelp = document.getElementById("help");
    initElSettingsText = document.getElementById("settings-text");
    initElStatus = document.getElementById("status");
    initElTimer = document.getElementById("timer");
    initElTip = document.getElementById("tip");

    if (!(initElButtonBar && initElContainer && initElHelp &&
          initElSettingsText && initElStatus && initElTimer && initElTip)) {
        // This should not happen, but it might if someone edits index.html.
        utilsFatalError("One or more elements could not be found in index.html");
    }
}

// Load globals from persistent storage.
function _initLoadStorage() {
    var queryParams = utilsGetQueryParameters();

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        var values = queryParams[varName];
        var varValueStr = null;

        // Query parameters take precedence over persistent storage, making
        // bookmarkable presets straightforward.
        if (values) {
            varValueStr = values.join(" ");
        } else if (varPersist) {
            varValueStr = localStorage.getItem(_initPresistentPrefix + varName);
        }
        if (varValueStr !== null) {
            utilsSetGlobal(varName, varValueStr);
        }
    }
    initSetTitle();
}

// Set the browser title from activeName.
function initSetTitle() {
    document.title = activeName ? ("QWERTYcube - " + activeName) : "QWERTYcube";
}

// Main entry point. Referenced by index.html, but not by any other JS code.
async function _initLoad() {
    console.log("Welcome to QWERTYcube.");
    _initGetElements();
    settingsCaptureDefaults();
    _initLoadStorage();
    settingsOnLoad();
    initVars();
    _initFillMoveToRotation();
    eventAdd();
    await _initSetup();
    _initFillScene();
    _initReplayLoadedMoveHistory();
    animateCondReq(true);
}

// Replay move history loaded from the URL so the displayed cube matches it.
function _initReplayLoadedMoveHistory() {
    if (!animateMoveHistory.length) {
        rotateUpdateArrowsMoveFromSolve();
        return;
    }
    if (animateMoveHistoryNext > animateMoveHistory.length) {
        animateMoveHistoryNext = animateMoveHistory.length;
    }
    utilsClearMoveQueue();
    utilsEnqueueMoves(animateMoveHistory);
    animateMoveHistory.length = 0; // The replay will rebuild history.
    animateMoveHistoryNextLast = animateMoveHistoryNext;
    animateMoveHistoryNext = 0;
    rotateUpdateArrowsMoveFromSolve();
}

// Scene initialization code.
async function _initSetup() {
    // Renderer:
    try {
        animateRenderer = new THREE.WebGLRenderer({
            antialias : true
        });
    } catch (e) {
        // TODO: Consider adding CanvasRenderer as a fallback, but maybe it's
        // better for people to upgrade their browsers.
        animateUpdateStatus("WebGL is not supported");
        animateRenderer = null;
        // So it's not overwritten by the help message.
        _initHelpFlashed = true;
    }

    initSetBackgroundColor();

    if (!animateRenderer) {
        return;
    }

    // Center things, etc.
    animateResize();

    animateSetCamera();

    // Orbit controls (rotating the animateCamera around the cube).
    animateOrbitControls = new OrbitControls(animateCamera, animateRenderer.domElement);

    // Limit manipulation that is not helpful.
    animateOrbitControls.enabled = !eventRotationLock;
    animateOrbitControls.enableKeys = false;
    animateOrbitControls.enablePan = false;
    animateOrbitControls.enableZoom = false;

    // Add the animateRenderer to the page.
    initElContainer.appendChild(animateRenderer.domElement);

    // Dynamically add buttons to the button bar.
    initAddUpdateButtons(initMainButtonList);
    try {
        initCubearoni();
    } catch (e) {
        console.error("Unable to initialize Cubearoni:", e);
    }
    if (initFlashHelp) {
        animateUpdateStatus("To get started press the Help button");
        _initHelpFlashed = true;
    }
}
