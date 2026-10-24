"use strict";

// Wrapper for cube scramblers.

// Public globals

var scrambleMoves = [];
var scrambleAnimate = true;
var scrambleCount = 0; // 0 to let the scrambler decide.
var scrambleExtraMoves = "jsss"; // Scrambler types that get anti-undo tail moves.
var scrambleJSSMax = 21; // Observed maximum for JSS.
var scrambleNewCube = false;
var scrambleType = "jsss";
var scrambleUntilPhase = 0;

// Private globals

// Discard moves that produce the same cube a second time, which seems to be
// rare.
var _scrambleDupCubeCheck = false;

// TODO: Perhaps this "simple" scrambler should be removed as I'm not sure why
// anyone would want use it in place of the official WCA derived scramblers.
var _scrambleSimpleCube = {
    // Define the six faces of the cube
    faces : "DLBURF",
    // This will contain a history of all the states to make sure we don't
    // repeat a state
    states : [],
    // Which stickers are part of the same layer and should move along with the
    // face
    edges : {
        D : [ 46, 45, 44, 38, 37, 36, 22, 21, 20, 14, 13, 12 ],
        L : [ 24, 31, 30, 40, 47, 46, 0, 7, 6, 20, 19, 18 ],
        B : [ 26, 25, 24, 8, 15, 14, 6, 5, 4, 36, 35, 34 ],
        U : [ 18, 17, 16, 34, 33, 32, 42, 41, 40, 10, 9, 8 ],
        R : [ 28, 27, 26, 16, 23, 22, 4, 3, 2, 44, 43, 42 ],
        F : [ 30, 29, 28, 32, 39, 38, 2, 1, 0, 12, 11, 10 ]
    },
    // Sets the cube to the solved state
    reset : function() {
        _scrambleSimpleCube.states = [ "yyyyyyyyoooooooobbbbbbbbwwwwwwwwrrrrrrrrgggggggg" ];
    },
    // Twist the cube according to a move in WCA notation
    twist : function(state, move) {
        var i, k, prevState, face = move.charAt(0), faceIndex = _scrambleSimpleCube.faces
                .indexOf(move.charAt(0)), turns = move.length > 1 ? (move
                .charAt(1) === "2" ? 2 : 3) : 1;
        state = state.split("");
        for (i = 0; i < turns; i++) {
            prevState = state.slice(0);
            // Rotate the stickers on the face itself
            for (k = 0; k < 8; k++) {
                state[(faceIndex * 8) + k] = prevState[(faceIndex * 8)
                        + ((k + 6) % 8)];
            }
            // Rotate the adjacent stickers that are part of the same layer
            for (k = 0; k < 12; k++) {
                state[_scrambleSimpleCube.edges[face][k]] = prevState[_scrambleSimpleCube.edges[face][(k + 9) % 12]];
            }
        }
        return state.join("");
    },
    // Scramble the cube
    scramble : function() {
        var count = 0, total = _scrambleSimpleCount, state, prevState = _scrambleSimpleCube.states[_scrambleSimpleCube.states.length - 1], move, moves = [], modifiers = [
                "", "'", "2" ];
        while (count < total) {
            // Generate a random move
            move = _scrambleSimpleCube.faces[Math.floor(Math.random() * 6)]
                    + modifiers[Math.floor(Math.random() * 3)];
            // Don't move the same face twice in a row
            if (count > 0 && move.charAt(0) === moves[count - 1].charAt(0)) {
                continue;
            }
            // Avoid move sequences like "R L R", which is the same as "R2 L"
            if (count > 1
                    && move.charAt(0) === moves[count - 2].charAt(0)
                    && moves[count - 1].charAt(0) === _scrambleSimpleCube.faces
                            .charAt((_scrambleSimpleCube.faces.indexOf(move.charAt(0)) + 3) % 6)) {
                continue;
            }
            if (_scrambleDupCubeCheck) {
                state = _scrambleSimpleCube.twist(prevState, move);
                if (_scrambleSimpleCube.states.indexOf(state) === -1) {
                    // If this state hasn't yet been encountered, save it and
                    // move
                    // on
                    moves[count] = move;
                    _scrambleSimpleCube.states[count] = state;
                    count++;
                    prevState = state;
                }
            } else {
                moves[count] = move;
                count++;
            }
        }
        return moves;
    }
};

var _scrambleSimpleCount = 0; // Simple scrambler.

// Public functions

// Determine the appropriate scrambler, call it, and enqueue the resulting
// scramble moves.
async function scrambleCube(manualScramble, untilPhaseOverride) {
    var status = null;
    solveClearMoves();
    _scrambleSimpleCube.reset();
    if (manualScramble) {
        // User-entered scrambles are applied exactly as entered.
        scrambleMoves = manualScramble.moves.slice();
    } else if (scrambleType === "simple") {
        // 35 is the default for the simple scrambler.
        _scrambleSimpleCount = scrambleCount ? scrambleCount : 35;
        scrambleMoves = _scrambleSimpleCube.scramble();
    } else if (scrambleType === "jsss") {
        var name = String(cubiesOrder) + String(cubiesOrder) + String(cubiesOrder);
        var scrambler = scramblers[name];
        if (!scrambler) {
            // This should only happen for cubes with order higher than 3.
            console.log("Getting new scrambler for order " + cubiesOrder +
                    " with a count of " + scrambleCount);
            scrambler = getNNNScrambler(cubiesOrder, scrambleCount);
            if (!scrambler) {
              console.log("Unable to get scrambler named \"" + name +
                  "\" for order " + cubiesOrder);
              return "Scramble failed - see console";
            }
        }
        var scrambleMovesNulls = scrambler.getRandomScramble().scramble_string.split(" ");
        scrambleMoves.length = 0;
        for (var i = 0; i < scrambleMovesNulls.length; i++) {
            if (scrambleMovesNulls[i] !== "") {
                scrambleMoves.push(scrambleMovesNulls[i]);
            }
        }
    } else {
        // TODO: Probably prevent this in Settings.js.
        console.log("Unknown scrambler type \"" + scrambleType + "\".");
        return "Scramble failed - see console";
    }

    // Optionally add extra tail moves so undoing the few animated moves does
    // not expose a shorter-than-random-state scramble.
    if ((!manualScramble) && scrambleAnimate
            && _scrambleExtraMovesEnabledForType(scrambleType)) {
        var extraCount = Math.max(0, Math.floor(animateAnimationLimit));
        if (extraCount) {
            var extraMovesPlusOne = _scrambleGenerateSimpleMoves(extraCount + 1);
            if (scrambleMoves.length
                    && (utilsGetMoveFace(scrambleMoves[scrambleMoves.length - 1])
                        === utilsGetMoveFace(extraMovesPlusOne[0]))) {
                // By construction of simple scrambler, if extraMovesPlusOne[0]
                // matches then extraMovesPlusOne[1] will not.
                var extraMoves = extraMovesPlusOne.slice(1, extraCount + 1);
            } else {
                var extraMoves = extraMovesPlusOne.slice(0, extraCount);
            }
            for (var i = 0; i < extraMoves.length; i++) {
                scrambleMoves.push(extraMoves[i]);
            }
            console.log("Added " + extraMoves.length
                + " anti-undo extra moves for scramble type \"" + scrambleType + "\".");
        }
    }

    if (!manualScramble) {
        status = await _scrambleAppendUntilPhase(untilPhaseOverride);
    }

    // Apply the scramble found.
    animateScrambleReplay = !scrambleAnimate;
    utilsEnqueueMoves(scrambleMoves);

    // Add a savepoint after the scramble so that Alt-G rewinds to it.
    utilsEnqueueMove("|");

    animateTimerState = "scramble";
    animateCondReq();

    console.log("Scramble length: " + scrambleMoves.length);
    console.log("Scramble: " + scrambleMoves.join(" "));
    return status ? status : ("Scrambled " + _scrambleCountMoves(scrambleMoves)
            + " moves");
}

// Prompt for a user-entered scramble and return parsed moves plus flags.
async function scramblePromptManualScramble() {
    var manualMoves = await _scramblePromptManualMoves(
        "Enter scramble ([flags[:]]moves)\n"
            + "Example: im:R U F\n"
            + "a: algorithm by name\n"
            + "i: invert\n"
            + "k: keep cube\n"
            + "m: mirror\n"
            + "n: new cube",
        "Scramble",
        false);
    if (!manualMoves) {
        return null;
    }

    return _scrambleApplyManualScrambleFlags({
        flagsText : manualMoves.flagsText,
        flags : manualMoves.flags,
        moves : manualMoves.moves,
        newCube : scrambleNewCube
    });
}

// Prompt for user-entered training moves and return parsed moves plus flags.
async function scramblePromptManualTraining() {
    var manualMoves = await _scramblePromptManualMoves(
        "Enter training ([flags[:]]moves)\n"
            + "Example: im:R U F\n"
            + "a: algorithm by name\n"
            + "i: invert\n"
            + "m: mirror",
        "Training input",
        true);
    if (!manualMoves) {
        return null;
    }

    return _scrambleApplyManualTrainingFlags(manualMoves);
}

// Private functions

// Count actual moves, excluding savepoint markers.
function _scrambleCountMoves(moves) {
    var count = 0;
    for (var i = 0; i < moves.length; i++) {
        if (moves[i] !== "|") {
            count++;
        }
    }
    return count;
}

// Append solve moves until the configured phase starts.
async function _scrambleAppendUntilPhase(untilPhaseOverride) {
    var untilPhaseValue = (untilPhaseOverride !== undefined)
            ? untilPhaseOverride : scrambleUntilPhase;
    var untilPhase = Math.floor(Number(untilPhaseValue));
    if (!(untilPhase > 0)) {
        return null;
    }

    var solveMovesFound = await solveFindMovesFromMoves(scrambleMoves);
    if (!solveMovesFound) {
        console.log("Unable to solve scramble for scrambleUntilPhase="
                + untilPhase + ". Scramble: " + scrambleMoves.join(" "));
        return "Phase scramble solve failed - see console";
    }

    var phaseMoves = _scrambleGetSolveMovesUntilPhase(solveMovesFound,
            untilPhase);
    if (phaseMoves.warn) {
        console.warn("Solver returned fewer phase markers than requested for "
                + "scrambleUntilPhase=" + untilPhase + ". Solve: "
                + solveMovesFound.join(" "));
    }
    for (var i = 0; i < phaseMoves.moves.length; i++) {
        scrambleMoves.push(phaseMoves.moves[i]);
    }
    console.log("Appended " + phaseMoves.moves.length
            + " phase-practice moves for scrambleUntilPhase=" + untilPhase
            + ": " + phaseMoves.moves.join(" "));
    return phaseMoves.warn ? "Phase scramble partial solve - see console" : null;
}

// Return solve moves that happen before the requested one-based phase starts.
function _scrambleGetSolveMovesUntilPhase(solveMovesFound, untilPhase) {
    var moves = [];
    var phase = 0;
    for (var i = 0; i < solveMovesFound.length; i++) {
        var move = solveMovesFound[i];
        if (move === "|") {
            if ((phase + 1) >= untilPhase) {
                return {
                    moves : moves,
                    warn : false
                };
            }
            phase++;
            moves.push(move);
        } else {
            moves.push(move);
        }
    }
    return {
        moves : moves,
        warn : true
    };
}

// Prompt for manual move text, parse flags, and return move data.
async function _scramblePromptManualMoves(promptText, statusName, keepSavepoints) {
    var text = prompt(promptText);
    if (text === null) {
        animateUpdateStatus(statusName + " canceled");
        return null;
    }

    var input = utilsParseMoveTextFlags(text);
    var moves = null;
    if (input.flags.a) {
        var name = input.movesText.trim();
        if (!name.length) {
            animateUpdateStatus(statusName + " canceled");
            return null;
        }
        moves = await solveFindCFOPMovesForName(name);
        if (!moves) {
            animateUpdateStatus(statusName + " algorithm lookup failed");
            return null;
        }
    } else {
        var movesText = utilsExpandMoveTextVariables(
                utilsNormalizeMoveText(input.movesText));
        if (!movesText.length) {
            animateUpdateStatus(statusName + " canceled");
            return null;
        }
        moves = utilsParseMoves(movesText);
    }
    if (!moves.length) {
        animateUpdateStatus(statusName + " canceled");
        return null;
    }

    if (!keepSavepoints) {
        // Savepoints are not part of a scramble.
        moves = moves.filter(function(move) {
            return move !== "|";
        });
    }
    if (!moves.length) {
        animateUpdateStatus(statusName + " canceled");
        return null;
    }

    return {
        flagsText : input.flagsText,
        flags : input.flags,
        moves : moves
    };
}

// Apply manual scramble flags to moves and per-scramble options.
function _scrambleApplyManualScrambleFlags(manualScramble) {
    for (var i = 0; i < manualScramble.flagsText.length; i++) {
        var flag = manualScramble.flagsText[i];
        if (flag === "i") {
            manualScramble.moves = utilsGetInverseMoves(manualScramble.moves);
        } else if (flag === "k") {
            manualScramble.newCube = false;
        } else if (flag === "m") {
            manualScramble.moves = utilsGetMirrorMovesXZ(manualScramble.moves);
        } else if (flag === "n") {
            manualScramble.newCube = true;
        }
    }
    return manualScramble;
}

// Apply manual training flags to moves.
function _scrambleApplyManualTrainingFlags(manualTraining) {
    for (var i = 0; i < manualTraining.flagsText.length; i++) {
        var flag = manualTraining.flagsText[i];
        if (flag === "i") {
            manualTraining.moves = utilsGetInverseMoves(manualTraining.moves);
        } else if (flag === "m") {
            manualTraining.moves = utilsGetMirrorMovesXZ(manualTraining.moves);
        }
    }
    return manualTraining;
}

// Return true if a scrambler type should get anti-undo tail moves.
function _scrambleExtraMovesEnabledForType(type) {
    if (!scrambleExtraMoves) {
        return false;
    }
    var cfg = scrambleExtraMoves.toLowerCase().replace(/,/g, " ").trim();
    if (!cfg.length) {
        return false;
    }
    var types = cfg.split(/\s+/);
    return types.indexOf(type.toLowerCase()) !== -1;
}

// Generate a simple random-move scramble of the requested length.
function _scrambleGenerateSimpleMoves(count) {
    _scrambleSimpleCube.reset();
    _scrambleSimpleCount = count;
    return _scrambleSimpleCube.scramble();
}
