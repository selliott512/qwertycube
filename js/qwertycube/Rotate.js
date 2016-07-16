"use strict";

// Public globals

// The following lookup table should be kept in sync and in alphabetical order
// by key.  The five values for each face have the following meanings:
//   0 axisSign   - Which direction, in the vector sense, the face rotates
//                about the axis.
//   1 axisOfRot  - The axis about which the face rotates.
//   2 limLo      - An inclusive lower bound indicating which of the three
//                layers perpendicular to the axis will rotate.  This can
//                be -1, 0 or 1.  For higher order cubes -1 is the lowest
//                layer, 0 is all internal layers and 1 is the higher layer.
//   3 limHi      - Same as limLo, but for the upper bound.
//   4 amount     - The amount or rotation to do measured in 90 degree turns.
//   5 limLoIdx   - Like limLo, but a zero based index into the layers of the
//                cube along the axis.  Range is [0, cubiesOrder - 1].  This
//                is set dynamically as the move is analyzed
//   6 limHiIdx   - Like limLoIdx, but for the upper bound.
var rotateFaceToRotation = {
    B : [1, "z", -1, -1, 1, -1, -1],
    D : [1, "y", -1, -1, 1, -1, -1],
    E : [1, "y", 0, 0, 1, -1, -1],
    F : [-1, "z", 1, 1, 1, -1, -1],
    L : [1, "x", -1, -1, 1, -1, -1],
    M : [1, "x", 0, 0, 1, -1, -1],
    R : [-1, "x", 1, 1, 1, -1, -1],
    S : [-1, "z", 0, 0, 1, -1, -1],
    U : [-1, "y", 1, 1, 1, -1, -1],
    X : [-1, "x", -1, 1, 1, -1, -1],
    Y : [-1, "y", -1, 1, 1, -1, -1],
    Z : [-1, "z", -1, 1, 1, -1, -1]
};

// Like the above, but for all moves. This is populated dynamically on
// startup. The columns have the same meaning as the above.
var rotateMoveToRotation = {};

var rotatePivot = new THREE.Object3D(); // The origin by default.

// Inverse of the above.
var rotateRotationToMove = {};

// Private globals

var _rotateActive = [];
var _rotateMoveSign = 0;
var _rotateTwoLayer = false;

// Public functions

function rotateBegin(move, rotation, discardPrevious) {
    // Discard the last move in the move history since it was consolidated.
    if (discardPrevious) {
        if (animateMoveHistory.length < 1) {
            // This should not happen.
            console.log("WARNING: animateMoveHistory length is " + animateMoveHistory.length
                    + " so the previous move can't be discarded.");
        }

        // Remove them.
        animateMoveHistory.splice(animateMoveHistory.length - 1, 1);

        // Adjust pointers into animateMoveHistory, if need be.
        if (animateMoveHistoryNext >= animateMoveHistory.length) {
            animateMoveHistoryNext--;
        }
        if (animateMoveHistoryNextLast >= animateMoveHistoryNextLast.length) {
            animateMoveHistoryNextLast--;
        }
    }

    // If true then moves are being replayed (ok button clicked) and the we've
    // reached the point where the user is.
    var endOfReplay = (animateMoveHistoryNextLast !== -1)
            && (animateMoveHistoryNext >= animateMoveHistoryNextLast);

    if ((!rotation) || endOfReplay) {
        // Avoid actually doing the move in the following cases 1) It's a mark,
        // in which case there is no actual moving to do. 2) The user has
        // clicked ok in the settings dialog in which case we don't want to
        // replay moves after and including animateMoveHistoryNext.
        animateMoveHistory.push(move);
        if (!endOfReplay) {
            // End reached.
            animateMoveHistoryNext++;
        }
        return;
    }

    // Copy rotation so we can safely modify it.
    rotation = rotation.slice();

    // Convert the -1, 0, 1 placement along the axes to limits
    // given the cubieOff between them. The limits are inclusive.
    if ((rotation[5] !== -1) &&  (rotation[6] !== -1)) {
        rotation[2] = utilsIndexToCoord(rotation[5]);
        rotation[3] = utilsIndexToCoord(rotation[6] + 1); // +1 so inclusive
    } else {
        console.log("Rotation indexes not set for move \"" + move + "\"");
        return;
    }
    _rotateInRangeRotate.apply(this, rotation);

    // True if this move is an undo - don't add it to the move history.
    var undo = move.indexOf("G") !== -1;
    if (!undo) {
        if (animateMoveHistoryNext < animateMoveHistory.length) {
            // Some moves have been undone. Discard the part of the move history
            // that is after this move - begin a new timeline.
            console.log("Discarding future move history.");
            animateMoveHistory = animateMoveHistory.slice(0, animateMoveHistoryNext);
        }
        animateMoveHistory.push(move);
        animateMoveHistoryNext++;
    }
}

function rotateEnd() {
    for (var i = 0; i < _rotateActive.length; i++) {
        THREE.SceneUtils.detach(_rotateActive[i], rotatePivot, animateScene);
    }

    _rotateActive.length = 0;

    rotatePivot.rotation.x = 0;
    rotatePivot.rotation.y = 0;
    rotatePivot.rotation.z = 0;
}

// Private methods

function _rotateInRangeRotate(axisSign, axisOfRot, limLo, limHi, amount) {
    for (var i = 0; i < cubies.length; i++) {
        var position = cubiesToVector3(cubies[i]);
        // The position coordinate being considered.
        var posCoord = position[axisOfRot];
        if (posCoord >= limLo && posCoord <= limHi) {
            _rotateActive.push(cubies[i]);
        }
    }

    for (var i = 0; i < _rotateActive.length; i++) {
        THREE.SceneUtils.attach(_rotateActive[i], animateScene, rotatePivot);
    }
    animateCondReq(true);
}
