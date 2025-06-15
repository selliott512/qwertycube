"use strict";

// Move highlighting system that shows triangle indicators on faces that will move.

// Public globals

var moveHighlightEnabled = false;
var moveHighlightLastMove = null;

// Private globals

var _moveHighlightTriangles = [];
var _moveHighlightMaterial = null;

// Public functions

// Initialize the move highlighting system
function moveHighlightInit() {
    // Create black material for triangles
    _moveHighlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
}

// Show move indicators for the last move made
function moveHighlightShowLastMove() {
    console.log("moveHighlightShowLastMove called, enabled:", moveHighlightEnabled, "lastMove:", moveHighlightLastMove);
    
    if (!moveHighlightLastMove) {
        console.log("No last move stored");
        return;
    }

    // Skip undo moves and savepoints
    if (moveHighlightLastMove.indexOf("G") === -1 && moveHighlightLastMove !== "|") {
        console.log("Showing indicators for move:", moveHighlightLastMove);
        _moveHighlightShowMoveIndicators(moveHighlightLastMove);
    } else {
        console.log("Skipping move (undo or savepoint):", moveHighlightLastMove);
    }
}

// Hide all move indicators
function moveHighlightHideAll() {
    for (var i = 0; i < _moveHighlightTriangles.length; i++) {
        animateScene.remove(_moveHighlightTriangles[i]);
    }
    _moveHighlightTriangles.length = 0;
}

// Update the last move when a new move is made
function moveHighlightSetLastMove(move) {
    console.log("moveHighlightSetLastMove called with move:", move, "enabled:", moveHighlightEnabled);
    moveHighlightLastMove = move;
    
    if (moveHighlightEnabled) {
        moveHighlightHideAll();
        moveHighlightShowLastMove();
    }
}

// Toggle move highlighting on/off
function moveHighlightToggle() {
    moveHighlightEnabled = !moveHighlightEnabled;
    
    if (moveHighlightEnabled) {
        moveHighlightShowLastMove();
    } else {
        moveHighlightHideAll();
    }
    
    return moveHighlightEnabled;
}

// Private functions

// Show triangle indicators for a specific move
function _moveHighlightShowMoveIndicators(move) {
    console.log("_moveHighlightShowMoveIndicators called with move:", move);
    
    // Create a simple test triangle to verify the system works
    var triangle = _moveHighlightCreateTestTriangle();
    if (triangle) {
        _moveHighlightTriangles.push(triangle);
        animateScene.add(triangle);
        console.log("Added test triangle for move:", move);
    } else {
        console.log("Failed to create test triangle");
    }
}

// Create a simple test triangle
function _moveHighlightCreateTestTriangle() {
    // Create triangle geometry
    var triangleSize = 40;
    var geometry = new THREE.Geometry();
    
    // Create triangle vertices
    geometry.vertices.push(
        new THREE.Vector3(0, triangleSize, 0),
        new THREE.Vector3(-triangleSize * 0.5, -triangleSize * 0.5, 0),
        new THREE.Vector3(triangleSize * 0.5, -triangleSize * 0.5, 0)
    );
    
    // Create triangle face (ensure correct winding order)
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.computeFaceNormals();
    
    // Create the triangle mesh with material
    if (!_moveHighlightMaterial) {
        console.log("Material not initialized, initializing now");
        moveHighlightInit();
    }
    
    var triangle = new THREE.Mesh(geometry, _moveHighlightMaterial);
    
    // Position triangle in front of the cube
    triangle.position.set(0, 0, 200);
    
    return triangle;
}

// Get all faces that will be affected by a move
function _moveHighlightGetAffectedFaces(rotation) {
    var affectedFaces = [];
    var axisSign = rotation[0];
    var axis = rotation[1];
    var limLoIdx = rotation[5];
    var limHiIdx = rotation[6];
    
    if (limLoIdx === -1 || limHiIdx === -1) {
        // Rotation indices not set properly
        return affectedFaces;
    }

    // Iterate through all cubies to find affected ones
    for (var i = 0; i < cubiesList.length; i++) {
        var cubie = cubiesList[i];
        var position = cubiesToVector3(cubie);
        
        // Check if this cubie is in the rotating layer
        var coord = position[axis];
        var coordIdx = utilsCoordToIndex(coord);
        
        if (coordIdx >= limLoIdx && coordIdx <= limHiIdx) {
            // This cubie is affected - add its visible faces
            var cubieAffectedFaces = _moveHighlightGetCubieAffectedFaces(cubie, position, rotation);
            affectedFaces = affectedFaces.concat(cubieAffectedFaces);
        }
    }
    
    return affectedFaces;
}

// Get the faces of a specific cubie that should show indicators
function _moveHighlightGetCubieAffectedFaces(cubie, position, rotation) {
    var faces = [];
    var axisSign = rotation[0];
    var axis = rotation[1];
    
    // For each face of the cube, check if it's visible and affected
    var faceNames = ["R", "L", "U", "D", "F", "B"];
    
    for (var i = 0; i < faceNames.length; i++) {
        var faceName = faceNames[i];
        var faceRotation = rotateFaceToRotation[faceName];
        var faceAxis = faceRotation[1];
        var faceSign = -faceRotation[0];  // Sign is opposite in face definition
        
        // Check if this face is visible (on the surface of the cube)
        var faceCoord = position[faceAxis];
        var isOnSurface = Math.abs(Math.abs(faceCoord) - cubiesHalfSide) < 0.1;
        
        if (isOnSurface) {
            // Calculate triangle direction based on rotation
            var direction = _moveHighlightCalculateDirection(faceName, rotation, position);
            
            if (direction) {
                faces.push({
                    cubie: cubie,
                    position: position,
                    faceName: faceName,
                    faceAxis: faceAxis,
                    faceSign: faceSign,
                    direction: direction
                });
            }
        }
    }
    
    return faces;
}

// Calculate the direction the triangle should point for a given face and rotation
function _moveHighlightCalculateDirection(faceName, rotation, position) {
    var axisSign = rotation[0];
    var axis = rotation[1];
    
    // Get the face information
    var faceRotation = rotateFaceToRotation[faceName];
    var faceAxis = faceRotation[1];
    var faceSign = -faceRotation[0];
    
    if (faceAxis !== axis) {
        // This face is perpendicular to the rotation axis
        // Calculate the direction based on how the face will move
        return _moveHighlightCalculatePerpendicularDirection(faceName, rotation, position);
    } else {
        // This face is parallel to the rotation axis (the rotating face itself)
        return _moveHighlightCalculateParallelDirection(faceName, rotation);
    }
}

// Calculate direction for faces perpendicular to rotation axis (edge pieces that move)
function _moveHighlightCalculatePerpendicularDirection(faceName, rotation, position) {
    var axisSign = rotation[0];
    var axis = rotation[1];
    
    // For faces perpendicular to the rotation axis, we need to calculate
    // the tangent direction of rotation at this position
    var rotationAxis = new THREE.Vector3();
    rotationAxis[axis] = 1;
    
    // Vector from rotation center to this position
    var centerToPos = position.clone();
    centerToPos[axis] = 0; // Project onto the plane perpendicular to rotation axis
    
    // Cross product gives us the direction of rotation
    var rotationDir = new THREE.Vector3();
    rotationDir.crossVectors(rotationAxis, centerToPos);
    rotationDir.multiplyScalar(axisSign);
    rotationDir.normalize();
    
    // Project this direction onto the face
    var faceRotation = rotateFaceToRotation[faceName];
    var faceAxis = faceRotation[1];
    var faceNormal = new THREE.Vector3();
    faceNormal[faceAxis] = -faceRotation[0];
    
    // Remove the component normal to the face
    var projectedDir = rotationDir.clone();
    var normalComponent = projectedDir.dot(faceNormal);
    projectedDir.addScaledVector(faceNormal, -normalComponent);
    projectedDir.normalize();
    
    return projectedDir;
}

// Calculate direction for faces parallel to rotation axis (the rotating face itself)
function _moveHighlightCalculateParallelDirection(faceName, rotation) {
    var axisSign = rotation[0];
    var axis = rotation[1];
    
    // For the rotating face itself, we need to show circular rotation
    // We'll use a direction that represents the circular motion
    
    // Get two perpendicular axes to the rotation axis
    var perpAxis1, perpAxis2;
    if (axis === "x") {
        perpAxis1 = "y";
        perpAxis2 = "z";
    } else if (axis === "y") {
        perpAxis1 = "z";
        perpAxis2 = "x";
    } else { // axis === "z"
        perpAxis1 = "x";
        perpAxis2 = "y";
    }
    
    // Create a direction vector indicating rotation
    var direction = new THREE.Vector3();
    direction[perpAxis1] = axisSign;
    direction[perpAxis2] = 0;
    
    return direction;
}

// Create a triangle indicator mesh
function _moveHighlightCreateTriangle(faceInfo) {
    // Create triangle geometry
    var triangleSize = cubiesSizeScaled * 0.3; // 30% of cubie size
    var geometry = new THREE.Geometry();
    
    // Create isosceles triangle vertices
    geometry.vertices.push(
        new THREE.Vector3(0, triangleSize * 0.6, 0),      // Top point
        new THREE.Vector3(-triangleSize * 0.4, -triangleSize * 0.3, 0), // Bottom left
        new THREE.Vector3(triangleSize * 0.4, -triangleSize * 0.3, 0)   // Bottom right
    );
    
    // Create triangle face
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.computeFaceNormals();
    
    // Create the triangle mesh
    var triangle = new THREE.Mesh(geometry, _moveHighlightMaterial);
    
    // Position the triangle on the cubie face
    var faceRotation = rotateFaceToRotation[faceInfo.faceName];
    var faceAxis = faceRotation[1];
    var faceSign = faceInfo.faceSign;
    
    // Position triangle at cubie position
    triangle.position.copy(faceInfo.position);
    
    // Move triangle slightly away from the face surface
    var offset = cubiesSizeScaled * 0.55;
    triangle.position[faceAxis] += faceSign * offset;
    
    // Orient the triangle to point in the movement direction
    var direction = faceInfo.direction;
    if (direction && direction.length() > 0.1) {
        // Calculate rotation to align triangle with movement direction
        var up = new THREE.Vector3(0, 1, 0);
        var faceNormal = new THREE.Vector3();
        faceNormal.setComponent(faceInfo.faceAxisIndex, faceSign);
        
        // If the face normal is aligned with up, use a different reference
        if (Math.abs(faceNormal.dot(up)) > 0.9) {
            up = new THREE.Vector3(1, 0, 0);
        }
        
        // Create rotation matrix to orient triangle
        var right = new THREE.Vector3();
        right.crossVectors(faceNormal, up).normalize();
        up.crossVectors(right, faceNormal).normalize();
        
        // Project direction onto the face plane
        var faceDirection = direction.clone();
        var normalComponent = faceDirection.dot(faceNormal);
        faceDirection.addScaledVector(faceNormal, -normalComponent);
        faceDirection.normalize();
        
        // Calculate angle to rotate triangle
        var angle = Math.atan2(faceDirection.dot(right), faceDirection.dot(up));
        
        // Apply rotation
        triangle.lookAt(triangle.position.clone().add(faceNormal));
        triangle.rotateOnAxis(faceNormal, angle);
    }
    
    return triangle;
}

// Initialize move highlighting
// Note: This should be called after Three.js is initialized
function moveHighlightInitOnLoad() {
    if (typeof THREE !== 'undefined') {
        moveHighlightInit();
    }
}