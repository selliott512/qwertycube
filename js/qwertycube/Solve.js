"use strict";

// Wrapper for cube solvers.

// Public globals

var solveName = "cfop";
var solveOptions = "";
var solveLeftHanded = false;
var solveMoves = [];
var solveMovesInitialNext = 0;

// Private globals

// Public functions

// Find solve moves for the current move history and store them for training.
async function solveFindMovesFromHistory() {
    var numberedPrefixedMove = solveFindFirstNumberedPrefixedMoveFromHistory();
    if (numberedPrefixedMove) {
        animateUpdateStatus("Training unsupported due to " + numberedPrefixedMove);
        return;
    }
    var movesText = _solveHistoryToMovesString();
    var moves = await solveFindMovesFromMovesText(movesText);
    if (!moves) {
        animateUpdateStatus("Training solve failed - see console");
        console.log("Solve input moves: " + movesText);
        return;
    }

    solveSetMoves(moves, cubiesOrder === 2);
    console.log("Solve result:", moves.join(" "));
}

// Find the first number prefixed move (e.g. "2-3R") from the current move history.
function solveFindFirstNumberedPrefixedMoveFromHistory() {
    return solveFindFirstNumberedPrefixedMove(
        animateMoveHistory, animateMoveHistoryNext);
}

// Find solve moves for the passed moves array.
async function solveFindMovesFromMoves(moves) {
    var numberedPrefixedMove = solveFindFirstNumberedPrefixedMove(
        moves, moves.length);
    if (numberedPrefixedMove) {
        console.warn("Solver unsupported due to numbered-prefixed move:",
            numberedPrefixedMove);
        return null;
    }
    return await solveFindMovesFromMovesText(_solveMovesToMovesString(moves));
}

// Find solve moves for the passed compact moves text.
async function solveFindMovesFromMovesText(movesText) {
    var solverName = (solveName || "").trim();
    var solveResultText = null;
    var beforeMillis = performance.now();
    if (solverName.toLowerCase() === "jsss") {
        solveResultText = _solveFindMovesJSSS(movesText);
    } else {
        solveResultText = await _solveFindMovesCubearoni(movesText, solverName);
    }
    var elapsedMillis = performance.now() - beforeMillis;
    if (!solveResultText) {
        console.log("Solver \"" + solverName + "\" failed after "
            + elapsedMillis.toFixed(3) + " millis");
        return null;
    }

    var moves = utilsParseMoves(solveResultText);
    if (solverName.toLowerCase() === "jsss") {
        moves = utilsGetInverseMoves(moves);
    }
    console.log("Solver \"" + solverName + "\" returned " + moves.length
        + " moves in " + elapsedMillis.toFixed(3) + " millis");
    return moves;
}

// Look up a named CFOP OLL/PLL algorithm and return its moves.
async function solveFindCFOPMovesForName(name) {
    if (!window.getCFOPMovesForNameJSON) {
        console.warn("Cubearoni getCFOPMovesForNameJSON is unavailable.");
        return null;
    }
    var solverName = (solveName || "cfop").trim();
    try {
        var result = await window.getCFOPMovesForNameJSON(solverName, name,
                solveLeftHanded);
    } catch (e) {
        console.error("Cubearoni CFOP algorithm lookup failed:", e);
        return null;
    }
    if (!result.ok) {
        console.error("Cubearoni CFOP algorithm lookup failed:", result.error,
            result.stack ? ("\n" + result.stack) : "");
        return null;
    }
    return utilsParseMoves(utilsNormalizeMoveText(result.result));
}

// Find the first numbered-prefixed move in the passed move list.
function solveFindFirstNumberedPrefixedMove(moves, len) {
    for (var i = 0; i < len; i++) {
        var move = moves[i];
        if (/^\d+(-\d+)?[A-Za-z]/.test(move)) {
            return move;
        }
    }
    return null;
}

// Store solve moves and update training arrows/status.
function solveSetMoves(moves, suboptimal) {
    if (!moves || !moves.length) {
        console.log("No solver moves were returned.");
        return;
    }
    solveMoves = moves.slice();
    solveMovesInitialNext = animateMoveHistoryNext;
    console.log("Set " + moves.length + " solve moves at history index "
        + solveMovesInitialNext + ": " + solveMoves.join(" "));
    rotateUpdateArrowsMoveFromSolve();
    animateUpdateStatus("Training enabled " + moves.length
            + (suboptimal ? " suboptimal" : "") + " moves");
}

// Clear the current training solve while preserving whether arrows are enabled.
function solveClearMoves() {
    solveMoves.length = 0;
    solveMovesInitialNext = 0;
    rotateResetSolveTracking();
    rotateUpdateArrowsMoveFromSolve();
}

// Private functions

// Find solve moves with the JSSS facelet solver.
function _solveFindMovesJSSS(movesText) {
    if (!window.movesToFaceletsJSON) {
        console.warn("Cubearoni movesToFaceletsJSON is unavailable.");
        return null;
    }
    if (!window.scramblers || !window.scramblers["333"]
            || !window.scramblers["333"].solveFacelets) {
        console.warn("JSS 3x3 solveFacelets is unavailable.");
        return null;
    }
    var faceletsResult = window.movesToFaceletsJSON(movesText, "URFDLB");
    if (!faceletsResult.ok) {
        console.error("Cubearoni movesToFaceletsJSON failed:",
            faceletsResult.error,
            faceletsResult.stack ? ("\n" + faceletsResult.stack) : "");
        return null;
    }
    console.log("Facelets input for JSSS:", faceletsResult.result);
    var solveResultText = window.scramblers["333"].solveFacelets(
        faceletsResult.result);
    if (!solveResultText || (solveResultText.indexOf("Error") === 0)) {
        console.error("JSS solveFacelets failed:",
            solveResultText ? solveResultText : "(empty result)");
        return null;
    }
    return solveResultText;
}

// Find solve moves with Cubearoni solveJSON().
async function _solveFindMovesCubearoni(movesText, solverName) {
    if (!window.solveJSON) {
        console.warn("Cubearoni solveJSON is unavailable.");
        return null;
    }
    var solverOptions = _solveOptionsToArray();
    try {
        var solveResult = await window.solveJSON(null, solverName, "", "", 0,
            window.getExtMovesModeApplied(), true, movesText,
            solveLeftHanded, solverOptions);
    } catch (e) {
        console.error("Cubearoni solve failed:", e);
        return null;
    }
    if (!solveResult.ok) {
        console.error("Cubearoni solve failed:", solveResult.error,
            solveResult.stack ? ("\n" + solveResult.stack) : "");
        return null;
    }
    return solveResult.result;
}

// Convert current move history into solver input text.
function _solveHistoryToMovesString() {
    return _solveMovesToMovesString(animateMoveHistory, animateMoveHistoryNext);
}

// Convert a move list into solver input text.
function _solveMovesToMovesString(movesIn, len) {
    if (len === undefined) {
        len = movesIn.length;
    }
    var moves = "";
    for (var i = 0; i < len; i++) {
        var move = movesIn[i];
        if (move === "|") {
            continue;
        }
        moves += move;
    }
    return moves;
}

// Convert solveOptions text into solveJSON option strings.
function _solveOptionsToArray() {
    var optionsText = (solveOptions || "").trim();
    return optionsText.length ? optionsText.split(/\s+/) : [];
}
