"use strict";

// Globals

var scrambleMoves = [];
var scrambleCount = 0; // 0 to let the scrambler decide.
var scrambleJSSMax = 21; // Observed maximum for JSS.
var scrambleType = "jsss";

var simpleCount = 0; // Simple scrambler.

// Discard moves that produce the same cube a second time, which seems to be
// rare.
var dupCubeCheck = false;

// TODO: Perhaps this "simple" scrambler should be removed as I'm not sure why
// anyone would want use it in place of the official WCA derived scramblers.
var cube = {
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
        cube.states = [ "yyyyyyyyoooooooobbbbbbbbwwwwwwwwrrrrrrrrgggggggg" ];
    },
    // Twist the cube according to a move in WCA notation
    twist : function(state, move) {
        var i, k, prevState, face = move.charAt(0), faceIndex = cube.faces
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
                state[cube.edges[face][k]] = prevState[cube.edges[face][(k + 9) % 12]];
            }
        }
        return state.join("");
    },
    // Scramble the cube
    scramble : function() {
        var count = 0, total = simpleCount, state, prevState = cube.states[cube.states.length - 1], move, moves = [], modifiers = [
                "", "'", "2" ];
        while (count < total) {
            // Generate a random move
            move = cube.faces[Math.floor(Math.random() * 6)]
                    + modifiers[Math.floor(Math.random() * 3)];
            // Don't move the same face twice in a row
            if (count > 0 && move.charAt(0) === moves[count - 1].charAt(0)) {
                continue;
            }
            // Avoid move sequences like "R L R", which is the same as "R2 L"
            if (count > 1
                    && move.charAt(0) === moves[count - 2].charAt(0)
                    && moves[count - 1].charAt(0) === cube.faces
                            .charAt((cube.faces.indexOf(move.charAt(0)) + 3) % 6)) {
                continue;
            }
            if (dupCubeCheck) {
                state = cube.twist(prevState, move);
                if (cube.states.indexOf(state) === -1) {
                    // If this state hasn't yet been encountered, save it and
                    // move
                    // on
                    moves[count] = move;
                    cube.states[count] = state;
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

// Public methods

function scramble() {
    cube.reset();
    if (scrambleType === "simple") {
        // 30 is the default for the simple scrambler.
        simpleCount = scrambleCount ? scrambleCount : 30;
        scrambleMoves = cube.scramble();
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
              return;
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
        return;
    }

    // Apply the scramble found.
    utilsEnqueueMoves(scrambleMoves);

    // Add a savepoint after the scramble so that Alt-G rewinds to it.
    utilsEnqueueMove("|");

    animateTimerState = "scramble";
    animateCondReq();

    console.log("Scramble length: " + scrambleMoves.length);
    console.log("Scramble: " + scrambleMoves.join(" "));
}
