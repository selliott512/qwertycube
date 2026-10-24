"use strict";

import * as THREE from "../third-party/three.module.min.js";
import { OrbitControls } from "../third-party/examples/jsm/controls/OrbitControls.js";
import { TextGeometry } from "../third-party/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "../third-party/examples/jsm/loaders/FontLoader.js";

// Load one legacy script and wait for it to execute.
function _bootstrapLoadScript(src) {
    return new Promise(function(resolve, reject) {
        var script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.onload = function() {
            resolve();
        };
        script.onerror = function() {
            reject(new Error("Failed to load script " + src));
        };
        document.head.appendChild(script);
    });
}

async function _bootstrapLoadLegacyScripts() {
    var scripts = [
        "js/third-party/cubearoni.js",
        "js/third-party/scramble_222.js",
        "js/third-party/scramble_333.js",
        "js/third-party/scramble_NNN.js",
        "js/qwertycube/Utils.js",
        "js/qwertycube/Text.js",
        "js/qwertycube/Cubies.js",
        "js/qwertycube/Event.js",
        "js/qwertycube/Settings.js",
        "js/qwertycube/Init.js",
        "js/qwertycube/Animate.js",
        "js/qwertycube/Rotate.js",
        "js/qwertycube/Scramble.js",
        "js/qwertycube/Solve.js",
        "js/qwertycube/Tests.js",
        "js/qwertycube/Arrows.js"
    ];
    for (var i = 0; i < scripts.length; i++) {
        await _bootstrapLoadScript(scripts[i]);
    }
}

async function _bootstrapMain() {
    window.THREE = THREE;
    window.OrbitControls = OrbitControls;
    window.TextGeometry = TextGeometry;

    var fontLoader = new FontLoader();
    try {
        window.textFont = await fontLoader.loadAsync("js/third-party/fonts/droid_sans_mono_regular.typeface.json");
    } catch (e) {
        console.error("Unable to load droid_sans_mono_regular font:", e);
        window.textFont = null;
    }

    await _bootstrapLoadLegacyScripts();
    await window._initLoad();
}

_bootstrapMain().catch(function(err) {
    console.error("QWERTYcube bootstrap failed:", err);
});
