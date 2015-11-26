"use strict";

// Globals

// The global list of smaller cubes.
var cubies = [];

// The size of the cubies.
var cubiesSize = 100;
var cubiesGap = Math.round(cubiesSize / 10);
var cubiesHalfSide;
var cubiesOff;
var cubiesRadius;
var cubiesSep;
var cubiesSmallValue = 0.001;
var cubiesCenterNum = 13; // The one in the center.
var cubiesColorBackground = "0x808080";
var cubiesColorOverrides = {};
var cubiesColorScheme = "std-black";
var cubiesInitFacelets = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

// Other than the first color the colors are ordered in the same was as it is
// for MeshFaceMaterial. I is interior (the color of the gaps). The remaining
// letters are named after the faces.

// High contrast black. Each color should be distinct on all monitors.
var hcBlackColors = {
    I : 0x000000,
    R : 0xFF0000,
    L : 0xFF00FF,
    U : 0xFFFF00,
    D : 0xFFFFFF,
    F : 0x0000FF,
    B : 0x00FF00
};

// High contrast white. Each color should be distinct on all monitors.
var hcWhiteColors = copyMap(hcBlackColors);
hcWhiteColors.I = hcBlackColors.D;

// A black cube with standard colors.
var stdBlackColors = {
    I : 0x000000,
    R : 0x9B1516,
    L : 0xFF6020,
    U : 0xDBE94E,
    D : 0xE4E9E5,
    F : 0x125AC8,
    B : 0x00B52C
};

// A white cube with standard colors.
var stdWhiteColors = copyMap(stdBlackColors);
stdWhiteColors.I = stdWhiteColors.D;

var colorTable = {
    "hc-black" : hcBlackColors,
    "hc-white" : hcWhiteColors,
    "std-black" : stdBlackColors,
    "std-white" : stdWhiteColors
};

var colorTableKeys = ["hc-black", "hc-white", "std-black", "std-white"];

// The above, but in to material instead of number.
var colorMatts = {};

// Points to one of the color tables after initMaterials is called.
var colorValues;

// How axis relate to the offset in standard facelets order.
var faceletAxisMults = {
    U : [ 1, 0, 3 ],
    R : [ 0, -3, -1 ],
    F : [ 1, -3, 0 ],
    D : [ 1, 0, -3 ],
    L : [ 0, -3, 1 ],
    B : [ -1, -3, 0 ]
}

// Used to index into cubiesInitFacelets
var faceletOrder = "URFDLB";

// Public methods

function cubiesCreate() {
    initMaterials();

    var cubieGeometry = new THREE.BoxGeometry(cubiesSize, cubiesSize,
            cubiesSize);
    for (var num = 0; num < 27; num++) {
        var vec = cubiesNumberToInitVector3(num);
        var sideMaterial = [];
        for ( var face in colorValues) {
            if (face == "I") {
                continue;
            }

            var rotation = faceToRotation[face];
            // The meaning of sign is the opposite here - it's positive if
            // the face is on the positive side of the axis.
            var sign = -rotation[0];
            var axis = rotation[1];
            sideMaterial
                    .push(vec[axis] == sign * cubiesOff ? colorMatts[faceVectorToFacelet(
                            face, vec)]
                            : colorMatts.I);
        }
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

// Figure out where on the surface of the cube the user clicked, or return null
// if not on the surface of the cube.
function cubiesEventToCubeCoord(x, y, onAxis) {
    // Convert from the screen coordinates to world coordinates. Note that
    // 0.5 is used because it's somewhere between the near and far clipping
    // planes.
    var worldCoord = new THREE.Vector3();
    worldCoord.set((x / canvasWidth) * 2 - 1, -(y / canvasHeight) * 2 + 1, 0.5);
    worldCoord.unproject(camera);

    var bestMove = null;
    var bestMoveScore = 1000000;

    var axes = onAxis ? [ onAxis ] : [ "x", "y", "z" ];
    for (var i = 0; i <= axes.length; i++) {
        var axis = axes[i];
        // Of the two sides for each axis we only need to consider the one
        // closest to the camera.
        var side = (camera.position[axis] >= 0) ? cubiesHalfSide
                : -cubiesHalfSide;

        // A unit normal vector that points from the camera toward the point
        // on the cube that we're trying to find.
        var towardCube = worldCoord.clone().sub(camera.position).normalize();

        if (!towardCube[axis]) {
            // Avoid division by zero.
            continue;
        }

        // The distance from the camera to the side being considered.
        var toCube = -(camera.position[axis] - side) / towardCube[axis];

        // The location clicked that may be in the cube.
        var clicked = camera.position.clone().add(
                towardCube.multiplyScalar(toCube));

        // For the point clicked to be on the surface of the cube all three
        // coordinates have to be in range, otherwise try the next one.
        // If an axis was specified (onAxis) then accept the point even if it's
        // not in the cube as the user is allowed to drag the mouse out of
        // the cube.
        var move = {
            axis : axis,
            pos : clicked
        };

        if (onAxis) {
            // If this is the move end then we use the mouse up location to
            // indicate the direction of cube move regardless of where it is.
            return move;
        }

        // Since the calculation attempts to find a point on the surface of
        // cube cubiesSmallValue is added to allow for rounding errors.
        if ((Math.abs(clicked.x) <= (cubiesHalfSide + cubiesSmallValue))
                && (Math.abs(clicked.y) <= (cubiesHalfSide + cubiesSmallValue))
                && (Math.abs(clicked.z) <= (cubiesHalfSide + cubiesSmallValue))) {
            // The location found was on the cube, so no need to search
            // further.
            return move;
        } else if (rotationLock) {
            // For rotationLock find the best axis to use for the move begin
            // even if it's not on the cube.
            var moveScore = getMoveScore(move);
            if (moveScore < bestMoveScore) {
                bestMove = move;
                bestMoveScore = moveScore;
            }
        }
    }

    // Either location clicked was not on the cube, or rotationLock is on in
    // which case we return our best guess.
    return rotationLock ? bestMove : null;
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

// Given a face and a vector return the facelet (sticker).
function faceVectorToFacelet(face, vec) {
    var base = 9 * faceletOrder.indexOf(face);
    if (base < 0) {
        console.log("Unable to find face \"" + face + "\".");
    }

    // Scale the vector to [-1, -1, -1] - [1, 1, 1].
    var vecOne = vec.clone();
    vecOne.x = Math.round(vecOne.x / cubiesOff);
    vecOne.y = Math.round(vecOne.y / cubiesOff);
    vecOne.z = Math.round(vecOne.z / cubiesOff);

    var mults = faceletAxisMults[face];
    // The center has offset 4 in each face section in the sequence of
    // facelets. Relative to that apply the multipliers to the vecOne to
    // find the offset.
    var offset = 4 + mults[0] * vecOne.x + mults[1] * vecOne.y + mults[2]
            * vecOne.z;

    return cubiesInitFacelets[base + offset];
}

// Determine which side a give click is closest to. Note that "move" is not the
// simple rotation letter type of move it is elsewhere.
function getMoveScore(move) {
    var score = 0;
    var axes = [ "x", "y", "z" ];
    for (var i = 0; i <= axes.length; i++) {
        var axis = axes[i];
        if (axis !== move.axis) {
            // A simple score - for the two axes perpendicular to move.axis
            // add up the distance the clicked point is outside of the cube,
            // if it's outside of the cube.
            var axisScore = Math.abs(move.pos[axis]) - cubiesHalfSide;
            if (axisScore > 0) {
                score += axisScore;
            }
        }
    }
    return score;
}

// Initialize colorMatts based on colorValues.
function initMaterials() {
    colorValues = colorTable[cubiesColorScheme];
    for ( var side in colorValues) {
        var color = colorValues[side];
        var colorOverride = cubiesColorOverrides[side];
        if (colorOverride) {
            color = colorOverride;
        }
        color = normalizeColor(color);
        colorMatts[side] = new THREE.MeshBasicMaterial({
            color : color,
        });
    }
}

// Set the location of the cubies.
function positionCubies() {
    for (var num = 0; num < 27; num++) {
        cubies[num].position.copy(cubiesNumberToInitVector3(num));
    }
}
