    "use strict";

// Arrows system that shows arrow indicators on faces that will move.

// Public globals

// Whether arrows are enabled.
var arrowsEnabled = false;
var arrowsCorrectiveOnly = false;
var cubiesColorArrow = "black";
var cubiesColorArrowCorrective = "magenta";

// The move for which to show arrows.
var arrowsMove = null;
var arrowsMoveCorrective = false;
var arrowsMoveDouble = false;

// Private globals

// The list of created arrows in the scene.
var _arrowsArrows = [];

// A reusable arrow geometry.
var _arrowsArrowGeometry = null;
var _arrowsDoubleArrowGeometry = null;

// Face definitions: [normal direction, name]
var _arrowsFaces = {
    R: { normal: [ 1,  0,  0], position:  1 },  // Right face
    L: { normal: [-1,  0,  0], position: -1 },  // Left face
    U: { normal: [ 0,  1,  0], position:  1 },  // Up face
    D: { normal: [ 0, -1,  0], position: -1 },  // Down face
    F: { normal: [ 0,  0,  1], position:  1 },  // Front face
    B: { normal: [ 0,  0, -1], position: -1 }   // Back face
};

// A reusable temporary vector for lookAt calculations.
var _arrowsLookAt = null;

// Materials for normal and corrective arrows.
var _arrowsMaterial = null;
var _arrowsMaterialCorrective = null;

// Move definitions.
//   name:      The name of the move after normalizing to upper case and
//              stripping any "'" suffix.
//   min        The minimum layer along the move axis.
//   max:       The maximum layer along the move axis.
//   axis:      The axis vector for the move. The sign is based on vector math,
//              not on cube convention.
//   faces:     The two faces that the move axis passes through. The min face is
//              first, and then the max face.
// Note that not all moves are represented here.  G and | moves are excluded,
// as are inner slice moves for Z axis (S) since they do not have arrows.
// Order by axis name, then by min and finally max.
var _arrowsMoves = {
    // X axis
    L: { min: -1, max: -1, axis: [ 1, 0, 0], faces: ["L", "R"]},
    X: { min: -1, max:  1, axis: [-1, 0, 0], faces: ["R", "L"]},
    M: { min:  0, max:  0, axis: [ 1, 0, 0], faces: ["L", "R"]},
    R: { min: -1, max: -1, axis: [-1, 0, 0], faces: ["R", "L"]},

    // Y axis
    D: { min: -1, max: -1, axis: [0,  1, 0], faces: ["D", "U"]},
    Y: { min: -1, max:  1, axis: [0, -1, 0], faces: ["U", "D"]},
    E: { min:  0, max:  0, axis: [0,  1, 0], faces: ["D", "U"]},
    U: { min: -1, max: -1, axis: [0, -1, 0], faces: ["U", "D"]},

    // Z axis
    B: { min: -1, max: -1, axis: [0, 0,  1], faces: ["B", "F"]},
    Z: { min: -1, max:  1, axis: [0, 0, -1], faces: ["F", "B"]},
    S: { min:  0, max:  0, axis: [0, 0, -1], faces: ["F", "B"]},
    F: { min: -1, max: -1, axis: [0, 0, -1], faces: ["F", "B"]}
};

// Whether to use performance.now() for timing.
var _arrowsUsePerformance = false;

// How far outside the cube the arrows are placed.
var _slightlyOutsideFactor = 1.01;

// Public functions

// Create the arrows.
function arrowsCreate() {
    if (!arrowsMove) {
        console.log("Arrows can not be created since arrowsMove is null");
        return;
    }

    var startTime = _arrowsUsePerformance ? performance.now() : Date.now();

    // The number of arrows created.
    var createCount = 0;

    var moveInfo = _arrowsGetMoveInfo(arrowsMove);
    if (!moveInfo) {
        return;
    }

    // Get the entry in _arrowsMoves for this move.
    var moveEntry = _arrowsMoves[moveInfo.moveNorm] || null;

    if (!moveEntry) {
        // This includes returning for "G" and "|"" moves.
        console.log("Can't create arrows since no move entry found for move", arrowsMove);
        return;
    }

    var moveEffectiveAxis = [0, 0, 0];
    moveEffectiveAxis["xyz".indexOf(moveInfo.rotation[1])] = moveInfo.rotation[0];

    // How far you have to move from the center to be just outside the cube.
    var slightlyOutside = _slightlyOutsideFactor * cubiesHalfSide;

    var moveAxisName = moveInfo.rotation[1];
    var moveAxisIndex = "xyz".indexOf(moveAxisName);

    // Create arrows on all faces that the move axis does not pass through.
    for (var faceName in _arrowsFaces) {
        // If the face name matches one of the move faces then that means that
        // the move vector passes through this face, which means that it does
        // not have arrows.
        if (faceName === moveEntry.faces[0] ||
            faceName === moveEntry.faces[1]) {
            continue;
        }

        // The entry for the current face.
        var faceEntry = _arrowsFaces[faceName];

        // faceVector is faceEnty.normal scaled to be just outside the cube.
        var faceVector = utilsScaleVector3(faceEntry.normal, slightlyOutside);

        // This indicates the direction the arrows point along the face.
        var arrowBaseVector = utilsCrossProduct(moveEffectiveAxis, faceEntry.normal);
        var arrowAxisIndex = _arrowsGetNonZeroVectorIndex(arrowBaseVector);
        if (arrowAxisIndex === -1) {
            console.log("Can't create arrows since no arrow axis was found for move", arrowsMove);
            continue;
        }

        // We consider the affected layers along the move axis first.
        for (var moveIdx = moveInfo.rotation[5]; moveIdx <= moveInfo.rotation[6]; moveIdx++) {
            var moveCoord = _arrowsLayerIndexToCoord(moveIdx);

            // This loop moves along a path of arrows across the visible face.
            for (var arrowIdx = 0; arrowIdx < cubiesOrder; arrowIdx++) {
                var arrowCoord = _arrowsLayerIndexToCoord(arrowIdx);
                var arrowPosition = faceVector.slice();
                arrowPosition[moveAxisIndex] = moveCoord;
                arrowPosition[arrowAxisIndex] = arrowCoord;

                // Create the arrow and add it to the scene.
                var arrow = _arrowsCreateArrow(arrowPosition, faceEntry.normal, arrowBaseVector);
                if (arrow) {
                    _arrowsArrows.push(arrow);
                    animateScene.add(arrow);
                    createCount++;
                }
            }
        }
    }

    var endTime = _arrowsUsePerformance ? performance.now() : Date.now();
    console.log("Created", createCount,
        (arrowsMoveCorrective ? "corrective" : "normal"),
        "arrows for move", arrowsMove, "in",
        (endTime - startTime).toFixed(3), "millis");
}

// Hide all move indicators
function arrowsDestroy() {
    for (var i = 0; i < _arrowsArrows.length; i++) {
        animateScene.remove(_arrowsArrows[i]);
    }
    _arrowsArrows.length = 0;
}

// Initialize the arrows system
function arrowsInit() {
    var recreateArrows = arrowsEnabled && arrowsMove;
    arrowsDestroy();
    _arrowsDisposeGeometry(_arrowsArrowGeometry);
    _arrowsDisposeGeometry(_arrowsDoubleArrowGeometry);
    _arrowsDisposeMaterial(_arrowsMaterial);
    _arrowsDisposeMaterial(_arrowsMaterialCorrective);

    // Materials for normal and corrective arrows.
    _arrowsMaterial = new THREE.MeshBasicMaterial({
        color: utilsNormalizeColor(cubiesColorArrow),
        transparent: false,
        side: utilsGetMaterialSide()
    });
    _arrowsMaterialCorrective = new THREE.MeshBasicMaterial({
        color: utilsNormalizeColor(cubiesColorArrowCorrective),
        transparent: false,
        side: utilsGetMaterialSide()
    });

    // Calculate reusable arrow geometries.
    var arrowSize = 0.7 * cubiesSizeScaled;
    var geometry = new THREE.BufferGeometry();
    var geometryDouble = new THREE.BufferGeometry();

    // Always create "up" arrows - direction will be handled by lookAt
    var vertices = _arrowsCreateUpArrowVertices(arrowSize);
    var positions = [];
    for (var i = 0; i < vertices.length; i++) {
        positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    var verticesDouble = _arrowsCreateUpDoubleArrowVertices(arrowSize);
    var positionsDouble = [];
    for (var i = 0; i < verticesDouble.length; i++) {
        positionsDouble.push(verticesDouble[i].x, verticesDouble[i].y, verticesDouble[i].z);
    }
    geometryDouble.setAttribute("position", new THREE.Float32BufferAttribute(positionsDouble, 3));

    // Create arrow faces.
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    // Create the two faces for the double-arrow geometry.
    geometryDouble.setIndex([0, 1, 2, 3, 4, 5]);
    geometryDouble.computeVertexNormals();

    _arrowsArrowGeometry = geometry;
    _arrowsDoubleArrowGeometry = geometryDouble;

    // A reusable temporary vector for lookAt calculations.
    _arrowsLookAt = new THREE.Vector3();

    // Can we use "performance" for timing?
    _arrowsUsePerformance = (typeof performance !== "undefined" &&
        performance.now);
    if (_arrowsUsePerformance) {
        console.log("Arrows using performance.now for timing.");
    } else {
        console.log("Arrows Date.now for timing.");
    }

    if (recreateArrows) {
        arrowsCreate();
    }
}

// Update the last move when a new move is made
function arrowsSetMove(move, corrective) {
    corrective = !!corrective;
    if ((move === arrowsMove) && (corrective === arrowsMoveCorrective)) {
        return;
    }

    arrowsMove = move;
    arrowsMoveCorrective = corrective;
    arrowsMoveDouble = !!(move && (move.indexOf("2") !== -1));

    if (arrowsEnabled) {
        arrowsDestroy();
        arrowsCreate();
    }
}

// Clear arrow state and hide any displayed arrow.
function arrowsClear() {
    arrowsMove = null;
    arrowsMoveCorrective = false;
    arrowsMoveDouble = false;
    arrowsDestroy();
}

// Clear arrow state and disable arrow display.
function arrowsReset() {
    arrowsClear();
    arrowsEnabled = false;
}

// Toggle arrows on/off
function arrowsToggle() {
    arrowsEnabled = !arrowsEnabled;

    if (arrowsEnabled) {
        arrowsCreate();
    } else {
        arrowsDestroy();
    }

    return arrowsEnabled;
}

// Private functions

// Return parsed move information needed to position arrows.
function _arrowsGetMoveInfo(move) {
    if ((move[0] >= "0") && (move[0] <= "9")) {
        console.log("Can't create arrows for numbered-prefixed move", move);
        return null;
    }

    var moveNorm = move[0].toUpperCase();
    var rotation = _utilsGetRotationFromMove(move);
    if (!rotation) {
        console.log("Can't create arrows since no rotation found for move", move);
        return null;
    }

    return {
        moveNorm : moveNorm,
        rotation : rotation
    };
}

// Convert a zero-based layer index to that layer's center coordinate.
function _arrowsLayerIndexToCoord(index) {
    return cubiesOffsetScaled * (index - ((cubiesOrder - 1) / 2));
}

// Return the index of the non-zero vector component, or -1 if none exists.
function _arrowsGetNonZeroVectorIndex(vector) {
    for (var i = 0; i < vector.length; i++) {
        if (vector[i]) {
            return i;
        }
    }
    return -1;
}

// Dispose of old arrow geometry when arrow size changes.
function _arrowsDisposeGeometry(geometry) {
    if (geometry) {
        geometry.dispose();
    }
}

// Dispose of old arrow material when the arrow system is reinitialized.
function _arrowsDisposeMaterial(material) {
    if (material) {
        material.dispose();
    }
}

// Create a arrow at a specific position with axis-based orientation
function _arrowsCreateArrow(arrowPosition, arrowNormal, arrowVector) {
    // Create a new arrow mesh.
    var matt = arrowsMoveCorrective ? _arrowsMaterialCorrective : _arrowsMaterial;
    var geometry = arrowsMoveDouble ? _arrowsDoubleArrowGeometry : _arrowsArrowGeometry;
    var arrow = new THREE.Mesh(geometry, matt);

    // Position arrow on the face
    arrow.position.set(arrowPosition[0], arrowPosition[1], arrowPosition[2]);

    // Up should point in the arrow direction.
    arrow.up.set(arrowVector[0], arrowVector[1], arrowVector[2]);

    // The normal of the arrow should point away from the face of the cube.
    var arrowAt = utilsAdd2Vectors(
        arrowPosition,
        arrowNormal);
    _arrowsLookAt.set(arrowAt[0], arrowAt[1], arrowAt[2]
    );
    arrow.lookAt(_arrowsLookAt)

    return arrow;
}

// Get vertices for an "up" pointing arrow with height "size".
function _arrowsCreateUpArrowVertices(size) {
    // Adjust to taste if the arrow feels visually off-center on the facelet.
    const yOffset = 0;
    return [
        new THREE.Vector3(0, size * 0.6 + yOffset, 0),            // Top point
        new THREE.Vector3(-size * 0.4, -size * 0.4 + yOffset, 0), // Bottom left
        new THREE.Vector3(size * 0.4, -size * 0.4 + yOffset, 0)   // Bottom right
    ];
}

// Get vertices for an "up" pointing double-arrow with height "size".
// The two arrows share the same bounding box as the single-arrow geometry.
function _arrowsCreateUpDoubleArrowVertices(size) {
    // Adjust to taste if the double-arrow feels visually off-center on the facelet.
    const yOffset = -0.05 * size;
    return [
        // Lower arrow (tip touches the base of the upper arrow)
        new THREE.Vector3(0, size * 0.1 + yOffset, 0),             // Tip
        new THREE.Vector3(-size * 0.4, size * -0.5 + yOffset, 0),  // Bottom left
        new THREE.Vector3(size * 0.4, size * -0.5 + yOffset, 0),   // Bottom right
        // Upper arrow
        new THREE.Vector3(0, size * 0.7 + yOffset, 0),             // Tip
        new THREE.Vector3(-size * 0.4, size * 0.1 + yOffset, 0),   // Bottom left
        new THREE.Vector3(size * 0.4, size * 0.1 + yOffset, 0)     // Bottom right
    ];
}
