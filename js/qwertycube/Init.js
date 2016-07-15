"use strict";

// Public globals

// Buttons that appear at the bottom. Row is zero based.
var initMainButtonList = [{
    label : "Help",
    key : "H",
    tip : "Help with QWERTYcube"
}, {
    label : "Timer",
    key : "T",
    toggle : "timer",
    tip : "Time solves with an inspection period"

}, {
    label : "Heise",
    key : "V",
    toggle : "heise",
    tip : "Use Heise keymap"

}, {
    label : "N·N·N",
    key : "$",
    tip : "Increase the cube order by one"
}, {
    label : "Jumble",
    key : "J",
    tip : "Jumble/scramble the cube"

}, {
    label : "New",
    key : "N",
    tip : "Switch to a new solved cube"

}, {
    label : "Config",
    key : "I",
    tip : "Display the configuration/settings dialog"

}, {
    label : "Lock",
    key : "K",
    toggle : "rotationLock",
    tip : "Lock the cube so it does not rotate"
}, {
    label : "Inst",
    key : "A",
    toggle : "animationInst",
    tip : "Make moves instantly instead of animating"
}, {
    label : "3·3·3",
    key : "#",
    tip : "Set the cube order to 3"
}, {
    label : "Save",
    key : "C",
    tip : "Set a savepoint at the current state"
}, {
    label : "Reset",
    key : "P",
    tip : "Factory reset"

}, {
    label : "UndoA",
    key : "AG",
    tip : "Undo all move until savepoint or the beginning"
}, {
    label : "Undo",
    key : "G",
    tip : "Undo one move"
}, {
    label : "Color",
    key : "Q",
    tip : "Change the color"
}, {
    label : "n·n·n",
    key : "@",
    tip : "Decrease the cube order by one"
}, {
    label : "Redo",
    key : "SG",
    tip : "Redo one move"
}, {
    label : "RedoA",
    key : "ASG",
    tip : "Redo all move until savepoint or the end"
}];

var initButtonKeyToElMap = {};

var initFlashHelp = true;

var initMobile = false;

// Elements that are never recreated, so they're stored globally.
var initButtonBarEl;
var initContainerEl;
var initHelpEl;
var initSettingsTextEl;
var initStatusEl;
var initTimerEl;
var initTipEl;

// Height of the main object currently being displayed.
var initPrimaryHeight = 0;

// Private globals

var _initButtonRowsMax = 0;
var _initHelpFlashed = false;
//Strings that moves can be suffixed with.
var _initMoveSuffixes = ["", "'", "2"];

// Prefix to apply to entries in localStorage.
var _initPresistentPrefix = "QC";

// Public functions

function initAddUpdateButtons(buttonList) {
    // Delete any existing buttons.
    while (initButtonBarEl.childNodes.length) {
        initButtonBarEl.removeChild(initButtonBarEl.lastChild);
    }

    // Allow more rows on mobile by default.
    if (buttonStyle === "portrait") {
        _initButtonRowsMax = 3;
    } else if (buttonStyle === "landscape") {
        _initButtonRowsMax = 1;
    } else if (buttonStyle === "auto") {
        _initButtonRowsMax = initMobile ? 3 : 1;
    }

    var rows = Math
            .min(Math.floor(buttonList.length / 4 + 0.99), _initButtonRowsMax);
    var cols = Math.floor(buttonList.length / rows + 0.99);

    // Calculate what the size of each mutton must be.
    var buttonWidth = canvasWidth / cols;
    var buttonHeight = Math.floor(buttonBarHeight / _initButtonRowsMax);
    var buttonTopOffset = (_initButtonRowsMax - rows) * buttonHeight;
    initPrimaryHeight = canvasHeight + buttonTopOffset;

    if (!buttonHeight) {
        // No need to add buttons that have no height.
        return;
    }

    // Zero based rows and columns.
    var row = 0;
    var col = 0;
    for (var i = 0; i < buttonList.length; i++) {
        if (col >= cols) {
            col = 0;
            row++;
        }

        var button = buttonList[i];
        var buttonEl = document.createElement("button");

        var row = Math.floor(i / cols);

        // Give it a name and make it visible.
        buttonEl.id = "button-" + button.label.toLowerCase().replace(" ", "-");

        // Set the size and location.
        buttonEl.style.left = Math.round(col * buttonWidth) + "px";
        buttonEl.style.top = (row * buttonHeight + initPrimaryHeight) + "px";
        buttonEl.style.width = Math.round(buttonWidth) + "px";
        buttonEl.style.height = buttonHeight + "px";

        // Add a literal.
        var literalEl = document.createTextNode(button.label);
        buttonEl.appendChild(literalEl);

        // Make the literal reasonably large.
        buttonEl.style.fontSize = Math.floor(buttonHeight
                / (initMobile ? 2.4 : 1.6)) + "px";

        // Make it handle the click event as if it was a key event.
        buttonEl.onclick = (function(elem, butt) {
            return function(event) {
                onButtonClick(event, elem, butt)
            };
        })(buttonEl, button);

        // Tool tip help for non-mobile only.
        if (!initMobile) {
            buttonEl.onmouseover = (function(elem, butt) {
                return function(event) {
                    onButtonOver(event, elem, butt)
                };
            })(buttonEl, button);

            buttonEl.onmouseout = (function(elem, butt) {
                return function(event) {
                    onButtonOut(event, elem, butt)
                };
            })(buttonEl, button);
        }

        // Don't respond to attempts to move the buttons.
        if (initMobile) {
            buttonEl.addEventListener("touchmove", preventDefault);
        }

        if (!buttonColorOrig) {
            buttonColorOrig = window.getComputedStyle(buttonEl).backgroundColor;
        }

        initSetButtonColor(buttonEl, button, false);

        // Make it visible.
        buttonEl.style.visibility = "visible";

        // Add it to the button bar.
        initButtonBarEl.appendChild(buttonEl);

        // Keep a reference the button variables.
        initButtonKeyToElMap[button.key] = [buttonEl, button];

        col++;
    }
}

function initLoad() {
    _initGetElements();
    _initLoadStorage();
    settingsOnLoad();
    initVars();
    _initFillMoveToRotation();
    eventAdd();
    _initSetup();
    _initFillScene();
    animateCondReq(true);
}

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

function initSetButtonColor(buttonEl, button, flash) {
    var toggle = button.toggle;
    var fh = (button.label === "Help") && initFlashHelp && !_initHelpFlashed;
    if (toggle) {
        var val = window[toggle];
        buttonEl.style.backgroundColor = (val ? buttonColorHighlight
                : buttonColorOrig);
    } else if (flash || fh) {
        // The help button is a special case. Flash it when the page if first
        // loaded so the user knows to click it for instructions.
        var flashCount = flash ? 1 : 3;
        for (var i = 0; i < 2 * flashCount; i++) {
            // Double function wrapper used so that the index (i or j) is
            // evaluated now instead of later.
            setTimeout(function(elem, j) {
                return function() {
                    elem.style.backgroundColor = (j % 2) ? buttonColorOrig
                            : buttonColorHighlight;
                }
            }(buttonEl, i), i * buttonFlashDelay);
        }
    }
}

function initSaveStorage() {
    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (!varPersist) {
            continue;
        }
        if (window[varName].constructor === Array) {
            // Write arrays space separated.
            var varValue = "";
            for (var j = 0; j < window[varName].length; j++) {
                varValue += (j ? " " : "") + window[varName][j];
            }
        } else if (window[varName].constructor === Object) {
            // Write maps space separated key:value list.
            varValue = mapToString(window[varName]);
        } else {
            varValue = window[varName];
        }
        localStorage.setItem(_initPresistentPrefix + varName, varValue);
    }
}

// Init miscellaneous variables.
function initVars() {
    // Calculate radians per msec given the moves (half turns) per second.
    moveRadMsec = (moveSec / 1000.0) * (Math.PI / 2.0);

    // Don't display the help dialog for mobile devices. Leave it be for
    // non-mobile.
    initMobile = isMobile();
    console.log("Mobile: " + initMobile);

    // Scale the cubies based on the current order so that the overall cube has
    // the same size as a 3x3. A 3x3, which is the default, consists of 3
    // (order) cubies and 2 (order -1) gaps per dimension.
    if (cubiesOrder === 3) {
        cubiesScale = 1;
    }
    else {
        cubiesScale = (3 * cubiesSize + 2 * cubiesGap) / (
                cubiesOrder * cubiesSize + (cubiesOrder - 1) * cubiesGap);
    }

    cubiesSizeScaled = cubiesScaleDist(cubiesSize);
    cubiesGapScaled = cubiesScaleDist(cubiesGap);

    // Used to find the position of each cubie.
    cubiesOffset = cubiesSize + cubiesGap;
    cubiesOffsetScaled = cubiesScaleDist(cubiesOffset);
    cubiesHalfSide = Math.round(cubiesSize / 2 + cubiesOffset);
    cubiesSep = Math.round((cubiesSize + cubiesGap) / 2);
    cubiesExtendedMiddle = cubiesHalfSide - cubiesSizeScaled -
        (cubiesGapScaled / 2);

    // Radius of the smallest sphere that completely encloses the entire cube.
    cubiesRadius = Math.sqrt(3.0) * cubiesHalfSide;

    // Radius of the smallest sphere centered at the origin that encloses both
    // the cube and the camera (or, distance from the camera to the origin).
    cameraRadius = 0.0;
    for (var i = 0; i < cameraLocation.length; i++) {
        cameraRadius += cameraLocation[i] * cameraLocation[i];
    }
    cameraRadius = Math.sqrt(cameraRadius);

    // Don't allow any rotation if rotationLock.
    if (orbitControls) {
        orbitControls.enabled = !rotationLock;
    }

    // Update the key map.
    eventUpdateKeyMap();
}

function initSetBackgroundColor() {
    renderer.setClearColor(normalizeColor(cubiesColorBackground));
}

// Private functions

// Fill moveToRotation as well as it's conjugate rotationToMove.
function _initFillMoveToRotation() {
    var count = 0;
    for ( var face in faceToRotation) {
        var faceRot = faceToRotation[face];
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
                moveToRotation[move] = moveRot;
                rotationToMove[moveRot] = move;
            }
        }
    }
    console.log("_initFillMoveToRotation: Added " + count + " moves.");
}

function _initFillScene() {
    scene = new THREE.Scene();
    cubiesCreate(null);
    text = new textCreate();

    pivot = new THREE.Object3D();
    scene.add(pivot);

    // Add cubies (Child cubes) to scene
    for (var i = 0; i < cubies.length; i++) {
        scene.add(cubies[i]);
    }

    if (wireframeSphere) {
        // Enclose the cube in a wireframe sphere.
        animateWireframeSphere(true);
    }
}

function _initGetElements() {
    initButtonBarEl = document.getElementById("button-bar");
    initContainerEl = document.getElementById("container");
    initHelpEl = document.getElementById("help");
    initSettingsTextEl = document.getElementById("settings-text");
    initStatusEl = document.getElementById("status");
    initTimerEl = document.getElementById("timer");
    initTipEl = document.getElementById("tip");
}

function _initLoadStorage() {
    var queryParams = getQueryParameters();

    for (var i = 0; i < settingsVarNameDescs.length; i++) {
        var varNameDesc = settingsVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        // Persistent storage takes precedence over HTTP query parameters.
        var varValueStr = varPersist ?
                localStorage.getItem(_initPresistentPrefix + varName) : null;
        if (varValueStr === null) {
            var values = queryParams[varName];
            if (values) {
                varValueStr = values.join(" ");
            }
        }
        if (varValueStr !== null) {
            setGlobal(varName, varValueStr);
        }
    }
}

// Scene initialization code:
function _initSetup() {
    // Renderer:
    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer({
            antialias : true
        });
    } else {
        // TODO: Consider adding CanvasRenderer as a fallback, but maybe it's
        // better for people to upgrade their browsers.
        animateUpdateStatus("WebGL is not supported.");
        renderer = null;
        // So it's not overwritten by the help message.
        _initHelpFlashed = true;
    }

    initSetBackgroundColor();

    // Center things, etc.
    animateResize();

    animateSetCamera();

    // Orbit controls (rotating the camera around the cube).
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement,
            renderer.domElement);

    // Limit manipulation that is not helpful.
    orbitControls.enabled = !rotationLock;
    orbitControls.noKeys = true;
    orbitControls.noPan = true;
    orbitControls.noZoom = true;
    orbitControls.useMinClient = true;

    // Add the renderer to the page.
    initContainerEl.appendChild(renderer.domElement);

    // Dynamically add buttons to the button bar.
    initAddUpdateButtons(initMainButtonList);
    if (initFlashHelp) {
        animateUpdateStatus("To get started press the Help button.");
        _initHelpFlashed = true;
    }
}
