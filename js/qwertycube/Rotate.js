"use strict";

// Globals

var active = [];
var pivot = new THREE.Object3D(); // The origin by default.
var rotateMoveSign = 0;
var rotateTwoLayer = false;

// The following lookup table should be kept in sync and in alphabetical order
// by key.  The five values for each face have the following meanings:
//   axisSign   - Which direction, in the vector sense, the face rotates
//                about the axis.
//   axisOfRot  - The axis about which the face rotates.
//   limLo      - An inclusive lower bound indicating which of the three
//                layers perpendicular to the axis will rotate.  This can
//                be -1, 0 or 1.
//   limHi      - Same as limLo, but for the upper bound.
//   amount     - The amount or rotation to do measured in 90 degree turns.
var faceToRotation = {
    B : [1, "z", -1, -1, 1],
    D : [1, "y", -1, -1, 1],
    E : [1, "y", 0, 0, 1],
    F : [-1, "z", 1, 1, 1],
    L : [1, "x", -1, -1, 1],
    M : [1, "x", 0, 0, 1],
    R : [-1, "x", 1, 1, 1],
    S : [-1, "z", 0, 0, 1],
    U : [-1, "y", 1, 1, 1],
    X : [-1, "x", -1, 1, 1],
    Y : [-1, "y", -1, 1, 1],
    Z : [-1, "z", -1, 1, 1]
};

// Like the above, but for all moves. This is populated dynamically on
// startup. The columns have the same meaning as the above.
var moveToRotation = {};

// Inverse of the above.
var rotationToMove = {};

// Public methods

function rotateBegin(move, rotation, consolidated) {
    // Just remove the consolidated moves from the start of the move history.
    if (consolidated) {
        if (moveHistory.length < consolidated) {
            // This should not happen.
            console.log("WARNING: moveHistory length is " + moveHistory.length
                    + " which is less than consolidated at " + consolidated);
        }

        // Remove them.
        moveHistory.splice(moveHistory.length - consolidated, consolidated);

        // Adjust pointers into moveHistory.
        moveHistoryNext -= consolidated;
        if (moveHistoryNext < 0) {
            moveHistoryNext = 0;
        }
        if (moveHistoryNextLast != -1) {
            moveHistoryNextLast -= consolidated;
            if (moveHistoryNextLast < 0) {
                moveHistoryNextLast = 0;
            }
        }
    }
    // If true then moves are being replayed (ok button clicked) and the we've
    // reached the point where the user is.
    var endOfReplay = (moveHistoryNextLast != -1)
            && (moveHistoryNext >= moveHistoryNextLast);

    if ((!rotation) || endOfReplay) {
        // Avoid actually doing the move in the following cases 1) It's a mark,
        // in which case there is no actual moving to do. 2) The user has
        // clicked ok in the settings dialog in which case we don't want to
        // replay moves after and including moveHistoryNext.
        moveHistory.push(move);
        if (!endOfReplay) {
            // End reached.
            moveHistoryNext++;
        }
        return;
    }

    // Copy rotation so we can safely modify it.
    rotation = rotation.slice();

    // Convert the -1, 0, 1 placement along the axes to limits
    // given the cubieOff between them. The limits are inclusive.
    rotation[2] = cubiesOff * rotation[2] - 1; // Lower limit, so 1 before.
    rotation[3] = cubiesOff * rotation[3] + 1; // Upper limit, so 1 after.
    inRangeRotate.apply(this, rotation);

    // True if this move is an undo - don't add it to the move history.
    var undo = move.indexOf("G") !== -1;
    if (!undo) {
        if (moveHistoryNext < moveHistory.length) {
            // Some moves have been undone. Discard the part of the move history
            // that is after this move - begin a new timeline.
            console.log("Discarding future move history.");
            moveHistory = moveHistory.slice(0, moveHistoryNext);
        }
        moveHistory.push(move);
        moveHistoryNext++;
    }
}

function rotateEnd() {
    for (var i = 0; i < active.length; i++) {
        THREE.SceneUtils.detach(active[i], pivot, scene);
    }

    active.length = 0;

    pivot.rotation.x = 0;
    pivot.rotation.y = 0;
    pivot.rotation.z = 0;
}

// Private methods

function inRangeRotate(axisSign, axisOfRot, limLo, limHi, amount) {
    for (var i = 0; i < cubies.length; i++) {
        var position = cubiesToVector3(cubies[i]);
        // The position coordinate being considered.
        var posCoord = position[axisOfRot];
        if (posCoord >= limLo && posCoord <= limHi) {
            active.push(cubies[i]);
        }
    }

    for (var i = 0; i < active.length; i++) {
        THREE.SceneUtils.attach(active[i], scene, pivot);
    }
    animateCondReq(true);
}
