"use strict";

// Globals

// Buttons that appear at the bottom. Row is zero based.
var mainButtonList = [ [ {
    label : "New", // Start row 0
    key : "N"
}, {
    label : "Lock",
    key : "K"
}, {
    label : "Timer",
    key : "T"
}, {
    label : "Jumble",
    key : "J"
} ], [ {
    label : "Undo All", // Start row 1
    key : "AG"
}, {
    label : "Checkpoint",
    key : "C"
}, {
    label : "Help",
    key : "H"
}, {
    label : "Redo All",
    key : "ASG"
} ], [ {
    label : "Undo", // Start row 2
    key : "G"
}, {
    label : "Info",
    key : "I"
}, {
    label : "Reset",
    key : "P"
}, {
    label : "Redo",
    key : "SG"
} ] ];

var mobile = false;

// Elements that are never recreated, so they're stored globally.
var buttonBarEl;
var containerEl;
var helpEl;
var infoTextEl;
var infoCancelEl;
var infoOkEl;
var statusEl;
var timerEl;

// Prefix to apply to entries in localStorage.
var presistentPrefix = "QC";

// Public methods

function initLoad() {
    getElements();
    initLoadStorage();
    infoOnLoad();
    initVars();
    eventAdd();
    setup();
    fillScene();
    animateCondReq(true);
}

function initClearStorage() {
    for (var i = 0; i < infoVarNameDescs.length; i++) {
        var varNameDesc = infoVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (!varPersist) {
            continue;
        }
        localStorage.removeItem(presistentPrefix + varName);
    }
}

function initLoadStorage() {
    for (var i = 0; i < infoVarNameDescs.length; i++) {
        var varNameDesc = infoVarNameDescs[i];
        var varName = varNameDesc[0];
        var varPersist = varNameDesc[1];
        if (!varPersist) {
            continue;
        }
        var varValueStr = localStorage.getItem(presistentPrefix + varName);
        if (varValueStr !== null) {
            setGlobal(varName, varValueStr);
        }
    }
}

function initSaveStorage() {
    for (var i = 0; i < infoVarNameDescs.length; i++) {
        var varNameDesc = infoVarNameDescs[i];
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
        localStorage.setItem(presistentPrefix + varName, varValue);
    }
}

// Init miscellaneous variables.
function initVars() {
    // Calculate radians per msec given the moves (half turns) per second.
    moveRadMsec = (moveSec / 1000.0) * (Math.PI / 2.0);

    // Don't display the help dialog for mobile devices. Leave it be for
    // non-mobile.
    mobile = isMobile();
    console.log("Mobile: " + mobile);
    if (mobile) {
        dispHelp = false;
    }

    // Set the visibility of the help dialog.
    helpEl.style.visibility = dispHelp ? "visible" : "hidden";

    // Used to find the position of each cubie.
    cubiesOff = cubiesSize + cubiesGap;
    cubiesHalfSide = Math.round(cubiesSize / 2 + cubiesOff);
    cubiesSep = Math.round((cubiesSize + cubiesGap) / 2);

    // Radius of the smallest sphere that completely encloses the entire cube.
    cubiesRadius = Math.sqrt(3.0) * cubiesHalfSide;

    // Radius of the smallest sphere centered at the origin that encloses both
    // the cube and the camera (or, distance from the camera to the origin).
    cameraRadius = 0.0;
    for (var i = 0; i < cameraLocation.length; i++) {
        cameraRadius += cameraLocation[i] * cameraLocation[i];
    }
    cameraRadius = Math.sqrt(cameraRadius);

    // Save the size of the key map to speed things up.
    keyMapSize = 0;
    for ( var key in keyMap) {
        keyMapSize++;
    }

    // Don't allow any rotation if rotationLock.
    if (orbitControls) {
        orbitControls.enabled = !rotationLock;
    }
}

function initSetBackgroundColor() {
    renderer.setClearColor(normalizeColor(cubiesColorBackground));
}

// Private methods

function addUpdateButtons(buttonList) {
    // Delete any existing buttons.
    while (buttonBarEl.childNodes.length) {
        buttonBarEl.removeChild(buttonBarEl.lastChild);
    }

    // Assume the array is rectangular.
    var rows = buttonList.length;
    var cols = buttonList[0].length;

    // Calculate what the size of each mutton must be.
    var buttonWidth = Math.floor(canvasWidth / cols);
    var buttonHeight = Math.floor(buttonBarHeight / rows);

    // Zero based rows and columns.
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var button = buttonList[row][col];
            var buttonEl = document.createElement("button");

            // Give it a name and make it visible.
            buttonEl.id = "button-" + button.label.toLowerCase();

            // Set the size and location.
            buttonEl.style.left = (col * buttonWidth) + "px";
            buttonEl.style.top = (row * buttonHeight) + "px";
            buttonEl.style.width = buttonWidth + "px";
            buttonEl.style.height = buttonHeight + "px";

            // Add a literal.
            var literalEl = document.createTextNode(button.label);
            buttonEl.appendChild(literalEl);

            // Make the literal reasonably large.
            buttonEl.style.fontSize = Math.floor(buttonHeight
                    / (mobile ? 3 : 2))
                    + "px";

            // Make it handle the click event as if it was a key event.
            buttonEl.onclick = (function(key) {
                return function() {
                    onButtonBarButton(key)
                };
            })(button.key);

            // Don't respond to attempts to move the buttons.
            if (mobile) {
                buttonEl.addEventListener("touchmove", preventDefault);
            }

            // Make it visible.
            buttonEl.style.visibility = "visible";

            // Add it to the button bar.
            buttonBarEl.appendChild(buttonEl);
        }
    }
}

function fillScene() {
    scene = new THREE.Scene();
    cubies = new cubiesCreate();
    text = new textCreate();

    pivot = new THREE.Object3D();
    scene.add(pivot);

    // Add cubies (Child cubes) to scene
    for (var i = 0; i < cubies.length; i++) {
        scene.add(cubies[i]);
    }

    if (wireframeSphere) {
        // Enclose the cube in a wireframe sphere.
        animateWireframeSphere();
    }
}

function getElements() {
    buttonBarEl = document.getElementById("button-bar");
    containerEl = document.getElementById("container");
    helpEl = document.getElementById("help");
    infoTextEl = document.getElementById("info-text");
    infoCancelEl = document.getElementById("info-cancel");
    infoOkEl = document.getElementById("info-ok");
    statusEl = document.getElementById("status");
    timerEl = document.getElementById("timer");
}

// Scene initialisation code:
function setup() {
    // Renderer:
    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer({
            antialias : true
        });
    } else {
        alert("WebGL is not supported for your browser.  Using Canvas "
                + "Renderer, which may be slow.");
        renderer = new THREE.CanvasRenderer();
    }

    initSetBackgroundColor();

    // Center things, etc.
    animateResize();

    animateSetCamera();

    // orbitControls:
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement,
            renderer.domElement);

    // Limit manipulation that is not helpful.
    orbitControls.enabled = !rotationLock;
    orbitControls.noKeys = true;
    orbitControls.noPan = true;
    orbitControls.noZoom = true;
    orbitControls.useMinClient = true;

    // Add the renderer to the page.
    containerEl.appendChild(renderer.domElement);

    // Dynamically add buttons to the button bar.
    addUpdateButtons(mainButtonList);
}
