"use strict";

// Rotation logic that includes tables that map moves to rotations, and then
// acting on those rotations to move cubies.

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
var _rotateLastMoveFollowedBlackArrow = false;
var _rotateBlackArrowAfterSavepoint = false;

// Public functions

// Update arrow hints based on solver moves and the current history pointer.
function rotateUpdateArrowsMoveFromSolve() {
    eventUpdateButtonStates();
    var solveProgress = _rotateGetSolveProgress();
    _rotateBlackArrowAfterSavepoint = false;
    if (!solveProgress) {
        // No solve loaded or before the start of the solve
        //  - no hints to show.
        arrowsClear();
        return;
    }

    // This determines the arrow, and its color. By default there is no arrow,
    // and it is not corrective.
    var nextMove = null;
    var corrective = false;

    utilsLogVerbose("rotateUpdateArrowsMoveFromSolve solveProgress= "
            + JSON.stringify(solveProgress));

    var solveMoves = solveProgress.solveMoves;
    var historyMoves = solveProgress.historyMoves;
    var firstDiffIdx = solveProgress.firstDiffIdx;

    if (firstDiffIdx === null) {
        // The user is following the solve, has solved it exactly, or has
        // exceeded it.
        if (historyMoves.length < solveMoves.length) {
            // User is on track and needs the next move.
            var nextSolveIdx = historyMoves.length;
            nextMove = solveMoves[nextSolveIdx];
            _rotateBlackArrowAfterSavepoint =
                solveProgress.solveAfterSavepointIdxs.indexOf(nextSolveIdx) !== -1;
        } else if (historyMoves.length > solveMoves.length) {
            // User moved beyond the solve. Show a corrective arrow to undo
            // the latest history move.
            nextMove = utilsGetInverseMove(historyMoves[historyMoves.length - 1]);
            utilsLogVerbose("rotateUpdateArrowsMoveFromSolve corrective beyond solve");
            corrective = true;
        }
    } else {
        // If the deviation is with the last move in historyMoves (the last move
        // the user made) and that move is a subset of the move indicated by the
        // solve (that is the history has R but the solve has R2, etc.) then allow the
        // user to make the same move again to complete the next solve move.
        if (firstDiffIdx === historyMoves.length - 1)
        {
            // Is the second character of solveMove a "2"?
            const solveMove = solveMoves[firstDiffIdx];
            if (solveMove.length > 1 && solveMove[1] === "2") {
                const histMove = historyMoves[firstDiffIdx];
                if ((solveMove.length == (histMove.length + 1)) &&
                    (solveMove[0] === histMove[0]) &&
                    ((solveMove[solveMove.length - 1] === "'") ===
                       (histMove[histMove.length - 1] === "'"))) {
                    nextMove = histMove;
                }
            }
        }

        if (!nextMove) {
            // The user has deviated from the solve in a way that is not just a
            // subset of the next solve move. Show a corrective arrow that
            // undoes the user's last move since they need to start with that.
            nextMove = utilsGetInverseMove(historyMoves[
                historyMoves.length - 1]);
            utilsLogVerbose("rotateUpdateArrowsMoveFromSolve corrective after deviation");
            corrective = true;
        }
    }

    if (arrowsCorrectiveOnly && !corrective) {
        arrowsClear();
    } else {
        arrowsSetMove(nextMove, corrective);
    }
}

// Reset solve-arrow tracking state.
function rotateResetSolveTracking() {
    _rotateLastMoveFollowedBlackArrow = false;
    _rotateBlackArrowAfterSavepoint = false;
}

// Return solve moves that remain from the current history pointer.
function rotateGetSolveMovesRemaining(stopAtSavepoint) {
    var solveProgress = _rotateGetSolveProgress();
    if (!solveProgress) {
        return [];
    }

    var filteredSolveMoves = solveProgress.solveMoves;
    var historyMoves = solveProgress.historyMoves;
    var firstDiffIdx = solveProgress.firstDiffIdx;

    if (firstDiffIdx === null) {
        if (historyMoves.length < filteredSolveMoves.length) {
            if (stopAtSavepoint) {
                var remaining = [];
                var rawStart = _rotateGetSolveRawIndexFromFilteredIndex(historyMoves.length);
                // If starting at savepoint(s), skip them.
                while ((rawStart < solveMoves.length)
                        && (solveMoves[rawStart] === "|")) {
                    rawStart++;
                }
                for (var i = rawStart; i < solveMoves.length; i++) {
                    var move = solveMoves[i];
                    if (move === "|") {
                        remaining.push("|");
                        break;
                    }
                    remaining.push(move);
                }
                return remaining;
            }
            return filteredSolveMoves.slice(historyMoves.length);
        }
        return [];
    }

    // Allow continuing a partially completed double move.
    if (firstDiffIdx === historyMoves.length - 1) {
        var solveMove = filteredSolveMoves[firstDiffIdx];
        if (solveMove.length > 1 && solveMove[1] === "2") {
            var histMove = historyMoves[firstDiffIdx];
            if ((solveMove.length == (histMove.length + 1)) &&
                (solveMove[0] === histMove[0]) &&
                ((solveMove[solveMove.length - 1] === "'") ===
                    (histMove[histMove.length - 1] === "'"))) {
                if (stopAtSavepoint) {
                    var remaining = [histMove];
                    var rawStart = _rotateGetSolveRawIndexFromFilteredIndex(firstDiffIdx + 1);
                    for (var i = rawStart; i < solveMoves.length; i++) {
                        var move = solveMoves[i];
                        if (move === "|") {
                            remaining.push("|");
                            break;
                        }
                        remaining.push(move);
                    }
                    return remaining;
                }
                return [histMove].concat(filteredSolveMoves.slice(firstDiffIdx + 1));
            }
        }
    }
    return [];
}

// Return the latest applied non-savepoint move before the history pointer.
function rotateGetLastAppliedMove() {
    return _rotateGetLastNonSavepointHistoryMove();
}

// Prepare for a rotation by determining what needs to be rotated and updating
// the move history.
function rotateBegin(move, rotation, discardPrevious) {
    // Reset on each rotate begin. If a move append follows a black arrow this
    // is set again in _rotateMoveHistoryAppend().
    _rotateLastMoveFollowedBlackArrow = false;

    utilsLogVerbose("rotateBegin enter move=" + move + " discardPrevious="
            + discardPrevious + " animateMoveHistoryNext="
            + animateMoveHistoryNext + " animateMoveHistory="
            + animateMoveHistory.join(" "));

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
        utilsLogVerbose("rotateBegin early return move=" + move
                + " endOfReplay=" + endOfReplay + " animateMoveHistoryNext="
                + animateMoveHistoryNext + " animateMoveHistory="
                + animateMoveHistory.join(" "));
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
        if ((!discardPrevious) && (animateMoveHistoryNext < animateMoveHistory.length)) {
            // Some moves have been undone. Discard the part of the move history
            // that is after this move - begin a new timeline.
            utilsLogVerbose("Discarding future move history before slice: "
                    + "animateMoveHistoryNext=" + animateMoveHistoryNext
                    + " animateMoveHistory=" + animateMoveHistory.join(" "));
            animateMoveHistory = animateMoveHistory.slice(0, animateMoveHistoryNext);
            utilsLogVerbose("after future slice animateMoveHistoryNext="
                    + animateMoveHistoryNext + " animateMoveHistory="
                    + animateMoveHistory.join(" "));
        }

        if (!discardPrevious) {
            _rotateMoveHistoryAppend(move);
        }
    }

    utilsLogVerbose("rotateBegin exit move=" + move + " animateMoveHistoryNext="
            + animateMoveHistoryNext + " animateMoveHistory="
            + animateMoveHistory.join(" "));
}

// End a rotation by detaching the pivot and setting the rotation of the pivot
// back to 0.
function rotateEnd() {
    for (var i = 0; i < _rotateActive.length; i++) {
        animateScene.attach(_rotateActive[i]);
    }

    _rotateActive.length = 0;

    rotatePivot.rotation.x = 0;
    rotatePivot.rotation.y = 0;
    rotatePivot.rotation.z = 0;
}

// Private functions

// Append a move to history and record whether it followed a solve arrow.
function _rotateMoveHistoryAppend(move) {
    animateMoveHistory.push(move);
    animateMoveHistoryNext++;

    // If the user followed a non-corrective (black) arrow, keep this appended
    // move as-is so solve-progress indexing remains stable, but only for the
    // first move after a solve savepoint.
    _rotateLastMoveFollowedBlackArrow =
        !!arrowsMove && !arrowsMoveCorrective && (move === arrowsMove)
        && _rotateBlackArrowAfterSavepoint;

    console.log("Appended move to history: " + move
        + " animateMoveHistory=" + animateMoveHistory
        + " animateMoveHistoryNext=" + animateMoveHistoryNext
        + " followedBlackArrowAfterSavepoint="
        + _rotateLastMoveFollowedBlackArrow);
}

// Normalize the tail of move history without crossing solve or savepoint boundaries.
function _rotateMoveHistoryNormalize() {
    utilsLogVerbose("Normalizing move history. animateMoveHistoryNext="
        + animateMoveHistoryNext + " animateMoveHistory=" + animateMoveHistory);
    if (!animateMoveHistoryNormalize) {
        return;
    }

    if (_rotateLastMoveFollowedBlackArrow) {
        console.log("Skipping move history normalization for move that followed "
            + "a black arrow.");
        return;
    }

    while (animateMoveHistoryNext >= 2) {
        if (solveMovesInitialNext &&
          ((animateMoveHistoryNext - 2) < solveMovesInitialNext)) {
          // If there is a solve then don't attempt to consolidate moves that
          // are before the solve.
          console.log("Normalize move history skipped for moves before solve. "
              + "animateMoveHistoryNext=" + animateMoveHistoryNext
              + " solveMovesInitialNext=" + solveMovesInitialNext
              + " animateMoveHistory=" + animateMoveHistory);
          return;
        }

        var normalized = false;
        var almostLastMove = animateMoveHistory[animateMoveHistoryNext - 2];
        var lastMove = animateMoveHistory[animateMoveHistoryNext - 1];

        // Don't mess with savepoints, or anything before them.
        if (almostLastMove !== "|" && lastMove !== "|") {
            var moveCombined = _rotateCombineMoves(almostLastMove, lastMove);
            if (moveCombined === "") {
                animateMoveHistoryNext -= 2;
                animateMoveHistory.splice(animateMoveHistoryNext);
                normalized = true;
                console.log("Normalized move history by canceling " + almostLastMove
                        + " + " + lastMove + " animateMoveHistory="
                        + animateMoveHistory + " animateMoveHistoryNext="
                        + animateMoveHistoryNext);
            } else if (moveCombined !== null) {
                animateMoveHistory.splice(animateMoveHistoryNext - 2, 2, moveCombined);
                animateMoveHistoryNext--;
                normalized = true;
                console.log("Normalized move history by combining " + almostLastMove
                        + " + " + lastMove + " -> " + moveCombined
                        + " animateMoveHistory=" + animateMoveHistory
                        + " animateMoveHistoryNext=" + animateMoveHistoryNext);
            }
        }

        if (!normalized) {
            break;
        }
    }
}

// Combine two same-root moves into a shorter equivalent move.
function _rotateCombineMoves(move1, move2) {
    var parsed1 = _rotateParseMoveForNormalize(move1);
    var parsed2 = _rotateParseMoveForNormalize(move2);
    if (!parsed1 || !parsed2 || (parsed1.root !== parsed2.root)) {
        return null;
    }

    // Sum quarter-turns and reduce modulo 4.
    var sum = parsed1.quarters + parsed2.quarters;
    var mod = ((sum % 4) + 4) % 4;
    if (mod === 0) {
        return "";
    } else if (mod === 1) {
        return parsed1.root;
    } else if (mod === 3) {
        return parsed1.root + "'";
    } else if (mod === 2) {
        // Preserve prior convention: prime+prime => 2'.
        return sum < 0 ? (parsed1.root + "2'") : (parsed1.root + "2");
    } else {
        // Should not happen.
        return null;
    }
}

// Parse a move into root and quarter-turn count for history normalization.
function _rotateParseMoveForNormalize(move) {
    for (var i = 0; i < move.length; i++) {
        var c = move[i];
        if (!(((c >= "0") && (c <= "9")) || (c === "-"))) {
            break;
        }
    }
    if (i >= move.length) {
        return null;
    }

    var root = move.substr(0, i + 1);
    var suffix = move.substr(i + 1);
    var quarters;
    if (suffix === "") {
        quarters = 1;
    } else if (suffix === "'") {
        quarters = -1;
    } else if ((suffix === "2") || (suffix === "2'")) {
        // 2 and 2' are physically equivalent, but we keep sign behavior so
        // prime+prime style can normalize to 2'.
        quarters = (suffix === "2'") ? -2 : 2;
    } else {
        return null;
    }
    return {
        root : root,
        quarters : quarters
    };
}

// Replace the latest history move when active-move consolidation changes it.
function rotateReplaceLastHistoryMove(move) {
    if (!animateMoveHistory.length) {
        utilsLogVerbose("rotateReplaceLastHistoryMove skipped empty history for move="
                + move);
        return false;
    }
    var idx = animateMoveHistory.length - 1;
    if (animateMoveHistory[idx] === "|") {
        utilsLogVerbose("rotateReplaceLastHistoryMove skipped due to trailing savepoint"
                + " animateMoveHistory=" + animateMoveHistory.join(" "));
        return false;
    }
    var oldMove = animateMoveHistory[idx];
    animateMoveHistory[idx] = move;
    utilsLogVerbose("rotateReplaceLastHistoryMove replaced " + oldMove
            + " with " + move + " animateMoveHistory="
            + animateMoveHistory.join(" "));
    return true;
}

// Return the latest non-savepoint move at or before the history pointer.
function _rotateGetLastNonSavepointHistoryMove() {
    for (var i = animateMoveHistoryNext - 1; i >= 0; i--) {
        if (animateMoveHistory[i] !== "|") {
            return animateMoveHistory[i];
        }
    }
    return null;
}

// Compare solve moves against history and return current solve progress.
function _rotateGetSolveProgress() {
    if ((solveMoves.length == 0) ||
        (animateMoveHistoryNext < solveMovesInitialNext)) {
        return null;
    }

    // filteredSolveMoves is solveMoves with savepoints removed.
    // solveAfterSavepointIdxs records indexes in filteredSolveMoves that are
    // the first move after a "|" in solveMoves.
    var filteredSolveMoves = [];
    var solveAfterSavepointIdxs = [];
    var afterSavepoint = false;
    for (var i = 0; i < solveMoves.length; i++) {
        var solveMove = solveMoves[i];
        if (solveMove === "|") {
            afterSavepoint = true;
            continue;
        }
        if (afterSavepoint) {
            solveAfterSavepointIdxs.push(filteredSolveMoves.length);
            afterSavepoint = false;
        }
        filteredSolveMoves.push(solveMove);
    }

    // historyMoves is the solve-relevant portion of history with savepoints removed.
    var historyMoves = animateMoveHistory.slice(
        solveMovesInitialNext, animateMoveHistoryNext).filter(function(move) {
        return move !== "|";
    });

    // Determine the first index where filteredSolveMoves and historyMoves differ.
    var firstDiffIdx = null; // null if no difference found.
    for (var i = 0; i < Math.min(filteredSolveMoves.length, historyMoves.length); i++) {
        if (filteredSolveMoves[i] !== historyMoves[i]) {
            firstDiffIdx = i;
            break;
        }
    }
    return {
        solveMoves : filteredSolveMoves,
        historyMoves : historyMoves,
        firstDiffIdx : firstDiffIdx,
        solveAfterSavepointIdxs : solveAfterSavepointIdxs
    };
}

// Convert an index into solve moves with savepoints removed to an index into
// the original solveMoves array.
function _rotateGetSolveRawIndexFromFilteredIndex(filteredIdx) {
    if (filteredIdx <= 0) {
        return 0;
    }
    var seen = 0;
    for (var i = 0; i < solveMoves.length; i++) {
        if (solveMoves[i] === "|") {
            continue;
        }
        if (seen === filteredIdx) {
            return i;
        }
        seen++;
    }
    return solveMoves.length;
}

// Prepare the specified subset of cubies for rotation by attaching them to a
// pivot.
function _rotateInRangeRotate(axisSign, axisOfRot, limLo, limHi, amount) {
    for (var i = 0; i < cubiesList.length; i++) {
        var position = cubiesToVector3(cubiesList[i]);
        // The position coordinate being considered.
        var posCoord = position[axisOfRot];
        if (posCoord >= limLo && posCoord <= limHi) {
            _rotateActive.push(cubiesList[i]);
        }
    }

    for (var i = 0; i < _rotateActive.length; i++) {
        rotatePivot.attach(_rotateActive[i]);
    }
    animateCondReq(true);
}
