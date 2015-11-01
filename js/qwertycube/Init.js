"use strict";

// Globals
var mobile = false;

// Elements that are never recreated, so they're stored globally.
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
}

function initSetBackgroundColor() {
    renderer.setClearColor(normalizeColor(cubiesColorBackground));
}

// Private methods

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
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);

    // Limit manipulation that is not helpful.
    orbitControls.noKeys = true;
    orbitControls.noPan = true;
    orbitControls.noZoom = true;
    orbitControls.useMinClient = true;

    // Add the renderer to the page.
    containerEl.appendChild(renderer.domElement);
}
