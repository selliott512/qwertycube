"use strict";

// Globals

// The global list of smaller cubes.
var cubies = [];

// The size of the cubies.
var cubiesSize = 100;
var cubiesGap = cubiesSize / 10;
var cubiesOff = cubiesSize + cubiesGap;
var cubiesCenterNum = 13; // The one in the center.
var cubiesColorScheme = "standard";

// Other than black the colors are ordered in the same was as it is for
// MeshFaceMaterial.

// High contrast. Each color should be distinct on all monitors.
var highContrastColors = {
    black : 0x000000,
    red : 0xFF0000, // R
    orange : 0xFF00FF, // L
    yellow : 0xFFFF00, // U
    white : 0xFFFFFF, // D
    blue : 0x0000FF, // F
    green : 0x00FF00
// B
};

// Typical Rubik's cube colors.
var standardColors = {
    black : 0x000000,
    red : 0x71000C, // R
    orange : 0xF54300, // L
    yellow : 0xDDB600, // U
    white : 0xDCDCDC, // D
    blue : 0x003270, // F
    green : 0x005D26
// B
};

var colorTable = {
    "high-contrast" : highContrastColors,
    "standard" : standardColors
};

// The above, but in to material instead of number.
var colorMatts = {};

// Public methods

function cubiesCreate() {
    initMaterials();

    var cubieGeometry = new THREE.BoxGeometry(cubiesSize, cubiesSize,
            cubiesSize);
    for (var num = 0; num < 27; num++) {
        var vec = cubiesNumberToInitVector3(num);
        var sideMaterial = [
                vec.x == cubiesOff ? colorMatts["red"] : colorMatts["black"],
                vec.x == -cubiesOff ? colorMatts["orange"]
                        : colorMatts["black"],
                vec.y == cubiesOff ? colorMatts["yellow"] : colorMatts["black"],
                vec.y == -cubiesOff ? colorMatts["white"] : colorMatts["black"],
                vec.z == cubiesOff ? colorMatts["blue"] : colorMatts["black"],
                vec.z == -cubiesOff ? colorMatts["green"] : colorMatts["black"] ];

        var cubieMesh = new THREE.Mesh(cubieGeometry,
                new THREE.MeshFaceMaterial(sideMaterial));
        cubies.push(cubieMesh);
    }
    positionCubies();

    return cubies;
}

// Convert cubie number to a vector that describes the initial solved location
// of that cubie. X is least significant, low value first.
function cubiesNumberToInitVector3(num) {
    var x = cubiesOff * (num % 3 - 1);
    num = 0 | (num / 3);
    var y = cubiesOff * (num % 3 - 1);
    num = 0 | (num / 3);
    var z = cubiesOff * (num % 3 - 1);

    return new THREE.Vector3(x, y, z);
}

// Return true if the cube is solved.
function cubiesSolved() {
    var center = cubies[cubiesCenterNum];
    for (var i = 0; i < 27; i++) {
        // The goal is to iterate through the cubies in a semi-random fashion
        // in order to increase the odds of detecting an unsolved cubie early.
        // If we went in order then just the back side being solved would delay
        // detection for 9 cubies.
        var num = (11 * i + 7) % 27;

        // We only want to check corner and edge cubies relative to the
        // center cubie. As can be seen by disassembling an actual Rubik's
        // cube the six center edge pieces are effectively attached to and
        // determined by the center cubie, so there's no need to check them.
        var vec = cubiesNumberToInitVector3(num);
        var zeros = 0;
        if (vec.x == 0) {
            zeros++;
        }
        if (vec.y == 0) {
            zeros++;
        }
        if (vec.z == 0) {
            zeros++;
        }
        if (zeros > 1) {
            // Skip the six side center cubies as well as the cubie in the
            // center.
            continue;
        }

        // A real cubie that needs to checked completely.
        var cubie = cubies[num];
        if (angleIsLarge(cubie.rotation.x - center.rotation.x)
                || angleIsLarge(cubie.rotation.y - center.rotation.y)
                || angleIsLarge(cubie.rotation.z - center.rotation.z)) {
            return false;
        }
    }

    // None of the cubies were rotated.
    return true;
}

function cubiesToVector3(cubie) {
    scene.updateMatrixWorld(true);
    var position = new THREE.Vector3();
    position.setFromMatrixPosition(cubie.matrixWorld);
    return position;
}

// Private methods

// True if the angle is not close to some multiple of 2*PI.
function angleIsLarge(angle) {
    return ((Math.abs(angle) + 0.1) % (2 * Math.PI)) > 0.2;
}

// Initialize colorMatts based on colorValues.
function initMaterials() {
    var colorValues = colorTable[cubiesColorScheme];
    for ( var color in colorValues) {
        colorMatts[color] = new THREE.MeshBasicMaterial({
            color : colorValues[color],
        });
    }
}

// Set the location of the cubies.
function positionCubies() {
    for (var num = 0; num < 27; num++) {
        cubies[num].position.copy(cubiesNumberToInitVector3(num));
    }
}
