"use strict";

// Public globals

// The size of the cubies.
var cubies = [];
var cubiesColorTableKeys = ["hc-black", "hc-white", "std-black", "std-white"];
var cubiesColorBackground = "0x808080";
var cubiesColorOverrides = {};
var cubiesColorScheme = "std-black";
var cubiesCubeSize = 100;
var cubiesGapSize = cubiesCubeSize / 10;
var cubiesExtendedMiddle;
var cubiesGapScaled;
var cubiesHalfSide;
var cubiesInitFacelets = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
var cubiesOffset;
var cubiesOffsetScaled;
var cubiesOrder = 3;
var cubiesRadius;
var cubiesScale;
var cubiesSep;
var cubiesSizeScaled;

// Private globals

// Cubie side to material table.
var _cubiesColorMatts = {};

// Other than the first color the colors are ordered in the same was as it is
// for MeshFaceMaterial. I is interior (the color of the gaps). The remaining
// letters are named after the faces.

// High contrast black. Each color should be distinct on all monitors.
var _cubiesColorSetHcBlack = {
    I : 0x000000,
    R : 0xFF0000,
    L : 0xFF00FF,
    U : 0xFFFF00,
    D : 0xFFFFFF,
    F : 0x0000FF,
    B : 0x00FF00
};

// High contrast white. Each color should be distinct on all monitors.
var _cubiesColorSetHcWhite = utilsCopyMap(_cubiesColorSetHcBlack);
_cubiesColorSetHcWhite.I = _cubiesColorSetHcBlack.D;

// A black cube with standard colors.
var _cubiesColorSetStdBlack = {
    I : 0x000000,
    R : 0x9B1516,
    L : 0xFF6020,
    U : 0xDBE94E,
    D : 0xE4E9E5,
    F : 0x125AC8,
    B : 0x00B52C
};

// A white cube with standard colors.
var _cubiesColorSetStdWhite = utilsCopyMap(_cubiesColorSetStdBlack);
_cubiesColorSetStdWhite.I = _cubiesColorSetStdWhite.D;

var _cubiesColorTable = {
    "hc-black" : _cubiesColorSetHcBlack,
    "hc-white" : _cubiesColorSetHcWhite,
    "std-black" : _cubiesColorSetStdBlack,
    "std-white" : _cubiesColorSetStdWhite
};


// Points to one of the color tables after _cubiesInitMaterials is called.
var _cubiesColorValues;

var _cubiesCornerRange;
var _cubiesEdgesIndex;
var _cubiesIndexesShuffled;
var _cubiesMiddlesIndex;
var _cubiesMiddlesInfo;
var _cubiesSmallDist = 0.1;
var _cubiesSmallValue = 0.001;

// How axis relate to the offset in standard facelets order.
var _cubiesFaceletAxisMults = {
    U : [1, 0, 3],
    R : [0, -3, -1],
    F : [1, -3, 0],
    D : [1, 0, -3],
    L : [0, -3, 1],
    B : [-1, -3, 0]
}

// Used to index into cubiesInitFacelets
var _cubiesFaceletOrder = "URFDLB";

// Public functions

function cubiesCreate(oldCubies) {
    var cbsCorners = [];
    var cbsEdges = [];
    var cbsMiddles = [];
    var cbs = [];
    var cornerOffset = 0;
    var cubieGeometry = new THREE.BoxGeometry(cubiesSizeScaled,
            cubiesSizeScaled, cubiesSizeScaled);

    _cubiesMiddlesInfo = [];
    _cubiesInitMaterials();

    for (var zi = 0; zi < cubiesOrder; zi++) {
        for (var yi = 0; yi < cubiesOrder; yi++) {
            for (var xi = 0; xi < cubiesOrder; xi++) {
                // True if the cubie touches the surface of the cubie on the
                // axis specified.
                var surfs = 0;
                var surfInfo = null;
                var indexMax = cubiesOrder - 1;
                var xSurf = (xi === 0) || (xi === indexMax);
                if (xSurf) {
                    surfs++;
                    surfInfo = {axis: "x", move: (xi !== 0)};
                }
                var ySurf = (yi === 0) || (yi === indexMax);
                if (ySurf) {
                    surfs++;
                    if (!surfInfo) {
                        surfInfo = {axis: "y", move: (yi !== 0)};
                    }
                }
                var zSurf = (zi === 0) || (zi === indexMax);
                if (zSurf) {
                    surfs++;
                    if (!surfInfo) {
                        surfInfo = {axis: "z", move: (zi !== 0)};
                    }
                }
                if (!surfs) {
                    // If it's not touching any surface then it's inside the
                    // cube and we don't need to render it.
                    continue;
                }
                var vec = _cubiesIndexesToInitVector3(xi, yi, zi);
                if (!cornerOffset) {
                    // The offset of the first or reference corner, which should
                    // be the largest offset.
                    cornerOffset = Math.abs(vec.x);
                    _cubiesCornerRange = 2 * cornerOffset;
                }
                var sideMaterial = [];
                for ( var face in _cubiesColorValues) {
                    if (face === "I") {
                        continue;
                    }

                    var rotation = rotateFaceToRotation[face];
                    // The meaning of sign is the opposite here - it's positive if
                    // the face is on the positive side of the axis.
                    var sign = -rotation[0];
                    var axis = rotation[1];
                    sideMaterial.push(Math.abs(vec[axis] - sign * cornerOffset) < _cubiesSmallDist ?
                            _cubiesColorMatts[_cubiesFaceVectorToFacelet(face, vec)]: _cubiesColorMatts.I);
                }
                var cubieMesh = new THREE.Mesh(cubieGeometry,
                        new THREE.MeshFaceMaterial(sideMaterial));
                if (!oldCubies) {
                    cubieMesh.position.copy(vec);
                }
                switch (surfs) {
                case 1:
                    cbsMiddles.push(cubieMesh);
                    _cubiesMiddlesInfo.push(surfInfo);
                    break;
                case 2:
                    cbsEdges.push(cubieMesh);
                    break;
                case 3:
                    cbsCorners.push(cubieMesh);
                    break;
                }
            }
        }
    }

    // Order cubies by cubie type.  The resulting cubies array consists of
    // corners, then edges and finally middles.
    cubies = cbsCorners.concat(cbsEdges, cbsMiddles);
    _cubiesEdgesIndex = cbsCorners.length;
    _cubiesMiddlesIndex = _cubiesEdgesIndex + cbsEdges.length;

    // Now that the indexes of the various cube types are known create a
    // shuffled map that translates 1:1 from a cubie index to another cubie
    // index of the same type.  The first shuffle starts at one to avoid
    // mapping the reference cubie, which is special.
    if ((!_cubiesIndexesShuffled) ||
            (_cubiesIndexesShuffled.length !== cubies.length)) {
        _cubiesIndexesShuffled = utilsGetSeq(cubies.length);
        utilsShuffleArray(_cubiesIndexesShuffled, 1, _cubiesEdgesIndex);
        utilsShuffleArray(_cubiesIndexesShuffled, _cubiesEdgesIndex, _cubiesMiddlesIndex);
        utilsShuffleArray(_cubiesIndexesShuffled, _cubiesMiddlesIndex, cubies.length);
    }

    if (oldCubies) {
        // Set the position and angle based on the old cubies.
        for (var i = 0; i < cubies.length; i++) {
            var cubie = cubies[i];

            cubie.position.copy(oldCubies[i].position);
            cubie.rotation.copy(oldCubies[i].rotation);
        }
    }
}

// Figure out where on the surface of the cube the user clicked, or return null
// if not on the surface of the cube.
function cubiesEventToCubeCoord(x, y, onAxis) {
    // Convert from the screen coordinates to world coordinates. Note that
    // 0.5 is used because it's somewhere between the near and far clipping
    // planes.
    var worldCoord = new THREE.Vector3();
    worldCoord.set((x / animateCanvasWidth) * 2 - 1, -(y / animateCanvasHeight) * 2 + 1, 0.5);
    worldCoord.unproject(animateCamera);

    var bestMove = null;
    var bestMoveScore = eventRotationLockLimit;

    var axes = onAxis ? [onAxis] : ["x", "y", "z"];
    for (var i = 0; i < axes.length; i++) {
        var axis = axes[i];
        // Of the two sides for each axis we only need to consider the one
        // closest to the animateCamera.
        var side = (animateCamera.position[axis] >= 0) ? cubiesHalfSide
                : -cubiesHalfSide;

        // A unit normal vector that points from the animateCamera toward the point
        // on the cube that we're trying to find.
        var towardCube = worldCoord.clone().sub(animateCamera.position).normalize();

        if (!towardCube[axis]) {
            // Avoid division by zero.
            continue;
        }

        // The distance from the animateCamera to the side being considered.
        var toCube = -(animateCamera.position[axis] - side) / towardCube[axis];

        // The location clicked that may be in the cube.
        var clicked = animateCamera.position.clone().add(
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
        // cube _cubiesSmallValue is added to allow for rounding errors.
        if ((Math.abs(clicked.x) <= (cubiesHalfSide + _cubiesSmallValue))
                && (Math.abs(clicked.y) <= (cubiesHalfSide + _cubiesSmallValue))
                && (Math.abs(clicked.z) <= (cubiesHalfSide + _cubiesSmallValue))) {
            // The location found was on the cube, so no need to search
            // further.
            return move;
        } else if (eventRotationLock) {
            // For eventRotationLock find the best axis to use for the move begin
            // even if it's not on the cube.
            var moveScore = _cubiesGetMoveScore(move);
            if (moveScore < bestMoveScore) {
                bestMove = move;
                bestMoveScore = moveScore;
            }
        }
    }

    // Either location clicked was not on the cube, or eventRotationLock is on in
    // which case we return our best guess.
    return eventRotationLock ? bestMove : null;
}

// Scale a distance based on the order so that he overall size of the cube
// is the same for all orders.
function cubiesScaleDist(dist)
{
    return cubiesScale * dist;
}

// Return true if the cube is solved.
function cubiesSolved() {
    var ref = cubies[0]; // reference cubie.
    for (var i = 1; i < _cubiesMiddlesIndex; i++) {
        // The goal is to iterate through the cubies in a semi-random fashion
        // in order to increase the odds of detecting an unsolved cubie early.
        // If we went in order then just the back side being solved would delay
        // detection for too long.
        var num = _cubiesIndexesShuffled[i];

        // A corner or edge cubie. In this case the cubie is in the correct
        // location if and only if it has the same rotation as the reference
        // cubie.
        var cubie = cubies[num];
        if (_cubiesAngleIsLarge(cubie.rotation.x - ref.rotation.x)
                || _cubiesAngleIsLarge(cubie.rotation.y - ref.rotation.y)
                || _cubiesAngleIsLarge(cubie.rotation.z - ref.rotation.z)) {
            return false;
        }
    }

    // The goal of the following is to determine how the original axes can be
    // mapped to the rotated axes of the currently possibly solved cube.  We
    // do this by considering the three vectors that lead from the reference
    // cubie to each of the three closest cubies.  Each of the three vectors is
    // parallel to one of the three axes.  For the original solved cube the axes
    // found would be X, Y and Z, in that order.
    // TODO: It seems like using the rotation information would be faster and
    // more efficient, but it's not obvious to me how that works.
    var axisToAxis = {};
    var axes = ["x", "y", "z"];
    for (var i = 0; i < axes.length; i++) {
        var axis = axes[i];
        // Index to the corresponding corner that is closest to the zero
        // corner.  The Z corner is a special case because we want to skip over
        // the +X +Y -Z corner.
        var cornerIndex = (i === 2) ? 2 : 1;
        var refToCorner = ref.position.clone().sub(
                cubies[i + cornerIndex].position);
        var currentAxis = utilsLargestAbsoluteAxis(refToCorner);
        axisToAxis[axis] = currentAxis;
    }

    for (var i = _cubiesMiddlesIndex; i < cubies.length; i++) {
        // Pick a random middle cubie.
        var num = _cubiesIndexesShuffled[i];
        var cubie = cubies[num];
        var surfInfo = _cubiesMiddlesInfo[num - _cubiesMiddlesIndex];
        var axis = surfInfo.axis;
        var move = surfInfo.move;
        // The middle cubie must be at one extreme or the other along
        // currentAxis in order for it to be in the solved position.
        var currentAxis = axisToAxis[axis];
        var dist = Math.abs(cubie.position[currentAxis] -
                ref.position[currentAxis]);
        if (move) {
            if (Math.abs(dist - _cubiesCornerRange) > _cubiesSmallDist) {
                return false;
            }
        } else {
            if (dist > _cubiesSmallDist) {
                return false;
            }
        }
    }

    // All of the cubies are in the correct solved location.
    return true;
}

function cubiesToVector3(cubie) {
    animateScene.updateMatrixWorld(true);
    var position = new THREE.Vector3();
    position.setFromMatrixPosition(cubie.matrixWorld);
    return position;
}

// Private functions

// True if the angle is not close to some multiple of 2*PI.
function _cubiesAngleIsLarge(angle) {
    return ((Math.abs(angle) + _cubiesSmallDist) % (2 * Math.PI)) > 0.2;
}

// Given a face and a vector return the facelet (sticker).
function _cubiesFaceVectorToFacelet(face, vec) {
    var base = 9 * _cubiesFaceletOrder.indexOf(face);
    if (base < 0) {
        console.log("Unable to find face \"" + face + "\".");
    }

    // Scale the vector to [-1, -1, -1] - [1, 1, 1].
    var vecOne = vec.clone();
    vecOne.x = Math.round(vecOne.x / cubiesHalfSide);
    vecOne.y = Math.round(vecOne.y / cubiesHalfSide);
    vecOne.z = Math.round(vecOne.z / cubiesHalfSide);

    var mults = _cubiesFaceletAxisMults[face];
    // The center has offset 4 in each face section in the sequence of
    // facelets. Relative to that apply the multipliers to the vecOne to
    // find the offset.
    var offset = 4 + mults[0] * vecOne.x + mults[1] * vecOne.y + mults[2]
            * vecOne.z;

    return cubiesInitFacelets[base + offset];
}

// Determine which side a given click is closest to. Note that "move" is not the
// simple rotation letter type of move it is elsewhere.
function _cubiesGetMoveScore(move) {
    var score = 0;
    var axes = ["x", "y", "z"];
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

//Convert cubie indexes (zero based set of three integers) to a vector that
//describes the initial solved location of that cubie.
function _cubiesIndexesToInitVector3(xi, yi, zi) {
 var mid = (cubiesOrder - 1) / 2;
 var x = cubiesOffsetScaled * (xi - mid);
 var y = cubiesOffsetScaled * (yi - mid);
 var z = cubiesOffsetScaled * (zi - mid);

 return new THREE.Vector3(x, y, z);
}

// Initialize _cubiesColorMatts based on _cubiesColorValues.
function _cubiesInitMaterials() {
    _cubiesColorValues = _cubiesColorTable[cubiesColorScheme];
    for ( var side in _cubiesColorValues) {
        var color = _cubiesColorValues[side];
        var colorOverride = cubiesColorOverrides[side];
        if (colorOverride) {
            color = colorOverride;
        }
        color = utilsNormalizeColor(color);
        _cubiesColorMatts[side] = new THREE.MeshBasicMaterial({
            color : color,
        });
    }
}
