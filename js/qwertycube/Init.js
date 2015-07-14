"use strict";

// Globals

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
    setup();
    fillScene();
    initVars();
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
        localStorage.setItem(presistentPrefix + varName, window[varName]);
    }
}

// Init miscellaneous variables.
function initVars() {
    // Calculate radians per msec given the moves (half turns) per second.
    moveRadMsec = (moveSec / 1000.0) * (Math.PI / 2.0);
}

function initSetBackgroundColor() {
    renderer
            .setClearColor(cubiesColorBackground.toLowerCase().indexOf("0x") === -1 ? cubiesColorBackground
                    : parseInt(cubiesColorBackground));
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
        if (i >= text.length)
            continue;

        scene.add(text[i]);
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

    // CameraControls:
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);

    // Register event listeners (keys, etc.).
    eventListenersAdd();

    // Add the renderer to the page.
    containerEl.appendChild(renderer.domElement);
}
