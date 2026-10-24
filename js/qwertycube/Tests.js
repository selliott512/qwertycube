"use strict";

// Unit test functions that are optionally pressed when "Ok" is clicked on the
// settings dialog.

// Public globals

// Set to true in settings to run the tests.
var testsRunAll = false;

// Private globals

var _testsAllTests = [
    _testsTestMoves,
    _testsTestScramble,
    _testsTestSolve,
    _testsTestUtils
];

// Public functions

// Run all tests listed in _testsAllTests.
function testsRun() {
    for (var i = 0; i < _testsAllTests.length; i++) {
        var test = _testsAllTests[i];
        test();
    }
}

// Private functions

// Fail if "condition" is not true.
function _testsAssert(condition, message) {
    if (!condition) {
        utilsFatalError(message);
    }
}

// Fail if the "expected" and "actual" values are not equal.
function _testsAssertEquals(expected, actual, message) {
    if (expected !== actual) {
        utilsFatalError(message + " expected=" + expected +
                " actual=" + actual);
    }
}

// Test functions having to do with moves.
function _testsTestMoves() {
    var layers = [];
    for (var i = 0; i < cubiesOrder; i++) {
        layers.push(0);
    }
    layers[0] = 1;
    var moveRot = utilsGetMoveRotationFromLayers("x", layers);
    var move = moveRot[0];
    _testsAssertEquals("L", move, "utilsGetMoveRotationFromLayers: Move returned was " +
            "not expected");

    layers[1] = 1;
    var moveRot = utilsGetMoveRotationFromLayers("x", layers);
    var move = moveRot[0];
    // In this case the expected move depends on the order.
    if (cubiesOrder === 2) {
        var expected = "X'";
    } else if (cubiesOrder === 3) {
        var expected = "l";
    } else {
        var expected = "1-2L";
    }
    _testsAssertEquals(expected, move, "utilsGetMoveRotationFromLayers: Move returned was " +
            "not expected");

    for (var i = 0; i < cubiesOrder; i++) {
        layers[i] = -1;
    }
    var moveRot = utilsGetMoveRotationFromLayers("z", layers);
    var move = moveRot[0];
    _testsAssertEquals("Z", move, "utilsGetMoveRotationFromLayers: Move returned was " +
            "not expected");

    // Only makes sense for 2x2
    layers[1] = 0;
    var moveRot = utilsGetMoveRotationFromLayers("y", layers);
    if (cubiesOrder === 2) {
        // 2x2
        var move = moveRot[0];
        _testsAssertEquals("D'", move, "utilsGetMoveRotationFromLayers: Move returned " +
                "was not expected");

        for (var i = 0; i < cubiesOrder; i++) {
            layers[i] = -layers[i];
        }
        var moveRot = utilsGetMoveRotationFromLayers("y", layers);
        var move = moveRot[0];
        _testsAssertEquals("D", move, "utilsGetMoveRotationFromLayers: Move returned " +
                "was not expected");
    } else {
        // Should not have been possible to find a move.
        _testsAssertEquals(null, moveRot, "utilsGetMoveRotationFromLayers: Unexpected " +
                "move returned.")
    }

    var inv = utilsGetInverseMove("R");
    _testsAssertEquals("R'", inv, "utilsGetInverseMove: Bad inverse");

    var inv = utilsGetInverseMove("3-7R'");
    _testsAssertEquals("3-7R", inv, "utilsGetInverseMove: Bad inverse");

    var inv = utilsGetInverseMove("2l2");
    _testsAssertEquals("2l2", inv, "utilsGetInverseMove: Bad inverse");

    var invMoves = utilsGetInverseMoves(["R", "U", "F"]);
    _testsAssertEquals("F'", invMoves[0], "utilsGetInverseMoves: First move incorrect");
    _testsAssertEquals("U'", invMoves[1], "utilsGetInverseMoves: Second move incorrect");
    _testsAssertEquals("R'", invMoves[2], "utilsGetInverseMoves: Third move incorrect");

    var mirrorMoves = utilsGetMirrorMovesXZ(["R", "U", "L"]);
    _testsAssertEquals("L'", mirrorMoves[0], "utilsGetMirrorMovesXZ: First move incorrect");
    _testsAssertEquals("U'", mirrorMoves[1], "utilsGetMirrorMovesXZ: Second move incorrect");
    _testsAssertEquals("R'", mirrorMoves[2], "utilsGetMirrorMovesXZ: Third move incorrect");

    var mirrorMove = utilsGetMirrorMoveXZ("1-2R");
    _testsAssertEquals("1-2L'", mirrorMove, "utilsGetMirrorMoveXZ: Prefixed move incorrect");

    _testsAssertEquals("U'", utilsGetMirrorMoveXZ("U"),
            "utilsGetMirrorMoveXZ: U mirror incorrect");
    _testsAssertEquals("U", utilsGetMirrorMoveXZ("U'"),
            "utilsGetMirrorMoveXZ: U' mirror incorrect");
    _testsAssertEquals("U2'", utilsGetMirrorMoveXZ("U2"),
            "utilsGetMirrorMoveXZ: U2 mirror incorrect");
    _testsAssertEquals("U2", utilsGetMirrorMoveXZ("U2'"),
            "utilsGetMirrorMoveXZ: U2' mirror incorrect");
    _testsAssertEquals("F'", utilsGetMirrorMoveXZ("F"),
            "utilsGetMirrorMoveXZ: F mirror incorrect");
    _testsAssertEquals("D'", utilsGetMirrorMoveXZ("D"),
            "utilsGetMirrorMoveXZ: D mirror incorrect");
    _testsAssertEquals("B'", utilsGetMirrorMoveXZ("B"),
            "utilsGetMirrorMoveXZ: B mirror incorrect");
    _testsAssertEquals("Y'", utilsGetMirrorMoveXZ("Y"),
            "utilsGetMirrorMoveXZ: Y mirror incorrect");
    _testsAssertEquals("Z'", utilsGetMirrorMoveXZ("Z"),
            "utilsGetMirrorMoveXZ: Z mirror incorrect");
    _testsAssertEquals("M", utilsGetMirrorMoveXZ("M"),
            "utilsGetMirrorMoveXZ: M mirror incorrect");
    _testsAssertEquals("S'", utilsGetMirrorMoveXZ("S"),
            "utilsGetMirrorMoveXZ: S mirror incorrect");
    _testsAssertEquals("E'", utilsGetMirrorMoveXZ("E"),
            "utilsGetMirrorMoveXZ: E mirror incorrect");
    _testsAssertEquals("f'", utilsGetMirrorMoveXZ("f"),
            "utilsGetMirrorMoveXZ: f mirror incorrect");
    _testsAssertEquals("l'", utilsGetMirrorMoveXZ("r"),
            "utilsGetMirrorMoveXZ: r mirror incorrect");
    _testsAssertEquals("r", utilsGetMirrorMoveXZ("l'"),
            "utilsGetMirrorMoveXZ: l' mirror incorrect");
    var mirrorMiddleMoves = utilsGetMirrorMovesXZ(["M", "S", "E"]);
    _testsAssertEquals("M", mirrorMiddleMoves[0],
            "utilsGetMirrorMovesXZ: M mirror incorrect");
    _testsAssertEquals("S'", mirrorMiddleMoves[1],
            "utilsGetMirrorMovesXZ: S mirror incorrect");
    _testsAssertEquals("E'", mirrorMiddleMoves[2],
            "utilsGetMirrorMovesXZ: E mirror incorrect");

    var cubiesOrderOld = cubiesOrder;
    cubiesOrder = 5;
    var rot = _utilsGetRotationFromMove("-3R");
    _testsAssertEquals(2, rot[5], "_utilsGetRotationFromMove: -3R lo index incorrect");
    _testsAssertEquals(4, rot[6], "_utilsGetRotationFromMove: -3R hi index incorrect");
    rot = _utilsGetRotationFromMove("2-R");
    _testsAssertEquals(0, rot[5], "_utilsGetRotationFromMove: 2-R lo index incorrect");
    _testsAssertEquals(3, rot[6], "_utilsGetRotationFromMove: 2-R hi index incorrect");
    rot = _utilsGetRotationFromMove("-R");
    _testsAssertEquals(0, rot[5], "_utilsGetRotationFromMove: -R lo index incorrect");
    _testsAssertEquals(4, rot[6], "_utilsGetRotationFromMove: -R hi index incorrect");
    cubiesOrder = cubiesOrderOld;
}

// Test scramble helper functions.
function _testsTestScramble() {
    var phaseMoves = _scrambleGetSolveMovesUntilPhase(
            ["|", "A", "A", "|", "B", "B", "|", "C", "C", "|", "D", "D"], 1);
    _testsAssertEquals("", phaseMoves.moves.join(""),
            "_scrambleGetSolveMovesUntilPhase: Phase 1 should append nothing");
    phaseMoves = _scrambleGetSolveMovesUntilPhase(
            ["|", "A", "A", "|", "B", "B", "|", "C", "C", "|", "D", "D"], 2);
    _testsAssertEquals("|AA", phaseMoves.moves.join(""),
            "_scrambleGetSolveMovesUntilPhase: Phase 2 incorrect");
    phaseMoves = _scrambleGetSolveMovesUntilPhase(
            ["|", "A", "A", "|", "B", "B", "|", "C", "C", "|", "D", "D"], 3);
    _testsAssertEquals("|AA|BB", phaseMoves.moves.join(""),
            "_scrambleGetSolveMovesUntilPhase: Phase 3 incorrect");
    phaseMoves = _scrambleGetSolveMovesUntilPhase(
            ["A", "A", "|", "B", "B"], 1);
    _testsAssertEquals("AA", phaseMoves.moves.join(""),
            "_scrambleGetSolveMovesUntilPhase: Pre-leading-marker moves incorrect");
}

// Test solver functions.
function _testsTestSolve() {
    var moveHistoryOld = animateMoveHistory;
    var moveHistoryNextOld = animateMoveHistoryNext;
    animateMoveHistory = ["R", "|", "3-7R", "U"];
    animateMoveHistoryNext = animateMoveHistory.length;
    _testsAssertEquals("3-7R", solveFindFirstNumberedPrefixedMoveFromHistory(),
            "solveFindFirstNumberedPrefixedMoveFromHistory: Prefixed move not found");
    animateMoveHistory = ["R", "|", "U"];
    animateMoveHistoryNext = animateMoveHistory.length;
    _testsAssertEquals(null, solveFindFirstNumberedPrefixedMoveFromHistory(),
            "solveFindFirstNumberedPrefixedMoveFromHistory: Unexpected prefixed move found");
    animateMoveHistory = moveHistoryOld;
    animateMoveHistoryNext = moveHistoryNextOld;
}

// Test utility functions.
function _testsTestUtils() {
    // Test that shuffle has the expected effect.
    var nums = utilsGetSeq(30);
    utilsShuffleArray(nums, 10, 20);
    for (var i = 0; i < 10; i++) {
        _testsAssertEquals(i, nums[i], "utilsShuffleArray: first part incorrect");
    }
    var shuffledNums = [];
    for (var i = 10; i < 20; i++) {
        var num = nums[i];
        _testsAssertEquals(undefined, shuffledNums[num], "utilsShuffleArray: number duplicated");
        _testsAssert((num >= 10) && (num < 20), "utilsShuffleArray: number out of range");
        shuffledNums.push(num);
    }
    for (var i = 20; i < 30; i++) {
        _testsAssertEquals(i, nums[i], "utilsShuffleArray: last part incorrect");
    }

    // Test that setting a global works as expected.
    var cubiesOrderOld = cubiesOrder;
    utilsSetGlobal("cubiesOrder", "1234");
    // Value must be integer to pass.
    _testsAssertEquals(1234, cubiesOrder, "utilsSetGlobal: Global not set correctly");
    var setResult = utilsSetGlobal("cubiesOrder", "x");
    _testsAssert(!setResult.ok, "utilsSetGlobal: Bad number was accepted");
    _testsAssertEquals(1234, cubiesOrder,
            "utilsSetGlobal: Bad number should not replace existing value");
    cubiesOrder = cubiesOrderOld;

    var eventKeyMapOld = eventKeyMap;
    utilsSetGlobal("eventKeyMap", "ASW=mR2 Q=kJ ASJ=default");
    _testsAssertEquals("mR2", eventKeyMap.ASW,
            "utilsSetGlobal: Object setting not parsed");
    _testsAssertEquals("Q=kJ ASJ=default ASW=mR2",
            utilsMapToString({Q : "kJ", ASJ : "default", ASW : "mR2"}),
            "utilsMapToString: Object setting not serialized");
    eventKeyMap = eventKeyMapOld;

    var normalized = utilsNormalizeMoveText("   [f (R U R⁸ U⁸) f⁸] [F (R U R⁸ U⁸) F⁸]   ");
    _testsAssertEquals("f R U R' U' f' F R U R' U' F'", normalized,
            "utilsNormalizeMoveText: Move text not normalized correctly");

    var xyzNormalized = utilsNormalizeMoveText("x y z");
    _testsAssertEquals("X Y Z", xyzNormalized,
            "utilsNormalizeMoveText: Full cube rotations not uppercased");

    var groupedPrefixNormalized = utilsNormalizeMoveText("[1-2R](3-4U)");
    _testsAssertEquals("1-2R 3-4U", groupedPrefixNormalized,
            "utilsNormalizeMoveText: Grouped prefixed moves not delimited correctly");

    var wideNormalized = utilsNormalizeMoveText("Rw Uw2 Fw' Bw2'");
    _testsAssertEquals("r u2 f' b2'", wideNormalized,
            "utilsNormalizeMoveText: Wide w notation not normalized correctly");

    var cubiesOrderOld = cubiesOrder;
    cubiesOrder = 5;
    _testsAssertEquals("2-3R", utilsNormalizeMovePrefix("23R"),
            "utilsNormalizeMovePrefix: Small cube range not expanded");
    _testsAssertEquals("2-3R'", utilsNormalizeMovePrefix("23R'"),
            "utilsNormalizeMovePrefix: Small cube prime range not expanded");
    var parsedTwoDigitPrefix = utilsParseMoves("23R");
    _testsAssertEquals("2-3R", parsedTwoDigitPrefix[0],
            "utilsParseMoves: Two digit prefix not normalized");
    cubiesOrder = 50;
    _testsAssertEquals("23R", utilsNormalizeMovePrefix("23R"),
            "utilsNormalizeMovePrefix: Large cube prefix changed unexpectedly");
    cubiesOrder = cubiesOrderOld;

    var animateMoveHistoryOld = animateMoveHistory.slice();
    var animateMoveHistoryNextOld = animateMoveHistoryNext;
    animateMoveHistory = ["R", "U", "|", "F", "B"];
    animateMoveHistoryNext = 4;
    var expandedHistory = utilsExpandMoveTextVariables("@");
    _testsAssertEquals("R U | F", expandedHistory,
            "utilsExpandMoveTextVariables: History not expanded correctly");
    var expandedSurroundedHistory = utilsExpandMoveTextVariables("X @ Y");
    _testsAssertEquals("X R U | F Y", expandedSurroundedHistory,
            "utilsExpandMoveTextVariables: Surrounded history not expanded correctly");
    var expandedInlineHistory = utilsExpandMoveTextVariables("X@Y");
    _testsAssertEquals("X R U | F Y", expandedInlineHistory,
            "utilsExpandMoveTextVariables: Inline history not expanded correctly");
    var expandedDoubleHistory = utilsExpandMoveTextVariables("@@");
    _testsAssertEquals("R U | F R U | F", expandedDoubleHistory,
            "utilsExpandMoveTextVariables: Double history not expanded correctly");
    var expandedGroupedHistory = utilsExpandMoveTextVariables(
            utilsNormalizeMoveText("(X)@(Y)"));
    _testsAssertEquals("X R U | F Y", expandedGroupedHistory,
            "utilsExpandMoveTextVariables: Group-delimited @ not expanded correctly");
    animateMoveHistory = animateMoveHistoryOld;
    animateMoveHistoryNext = animateMoveHistoryNextOld;

    var parsedFlags = utilsParseMoveTextFlags("abc:R U F");
    _testsAssertEquals("abc", parsedFlags.flagsText,
            "utilsParseMoveTextFlags: Flags not parsed correctly");
    _testsAssert(parsedFlags.flags.a && parsedFlags.flags.b && parsedFlags.flags.c,
            "utilsParseMoveTextFlags: Flags map not set correctly");
    _testsAssertEquals("R U F", parsedFlags.movesText,
            "utilsParseMoveTextFlags: Move text not parsed correctly");

    var dedupedFlags = utilsParseMoveTextFlags("aab:R");
    _testsAssertEquals("ab", dedupedFlags.flagsText,
            "utilsParseMoveTextFlags: Flags not deduplicated correctly");

    var noFlags = utilsParseMoveTextFlags("R U F");
    _testsAssertEquals("", noFlags.flagsText,
            "utilsParseMoveTextFlags: Unexpected flags parsed");
    _testsAssertEquals("R U F", noFlags.movesText,
            "utilsParseMoveTextFlags: Move text changed unexpectedly");

    var spacedFlags = utilsParseMoveTextFlags(" abc : [R U] ");
    _testsAssertEquals("abc", spacedFlags.flagsText,
            "utilsParseMoveTextFlags: Spaced flags not parsed correctly");
    _testsAssertEquals(" [R U] ", spacedFlags.movesText,
            "utilsParseMoveTextFlags: Spaced move text not preserved correctly");

    var colonlessFlags = utilsParseMoveTextFlags("imR U F");
    _testsAssertEquals("im", colonlessFlags.flagsText,
            "utilsParseMoveTextFlags: Colonless flags not parsed correctly");
    _testsAssertEquals("R U F", colonlessFlags.movesText,
            "utilsParseMoveTextFlags: Colonless move text not parsed correctly");

    var lowerWideMove = utilsParseMoveTextFlags("f R U");
    _testsAssertEquals("", lowerWideMove.flagsText,
            "utilsParseMoveTextFlags: Lowercase wide move parsed as flag");
    _testsAssertEquals("f R U", lowerWideMove.movesText,
            "utilsParseMoveTextFlags: Lowercase wide move text changed unexpectedly");

    var parsedMoves = utilsParseMoves("R U2'|1-2R");
    _testsAssertEquals("R", parsedMoves[0], "utilsParseMoves: First move incorrect");
    _testsAssertEquals("U2'", parsedMoves[1], "utilsParseMoves: Second move incorrect");
    _testsAssertEquals("|", parsedMoves[2], "utilsParseMoves: Savepoint incorrect");
    _testsAssertEquals("1-2R", parsedMoves[3], "utilsParseMoves: Prefixed move incorrect");

    var parsedPrefixedMoves = utilsParseMoves("1-2R3-4U");
    _testsAssertEquals("1-2R", parsedPrefixedMoves[0],
            "utilsParseMoves: First adjacent prefixed move incorrect");
    _testsAssertEquals("3-4U", parsedPrefixedMoves[1],
            "utilsParseMoves: Second adjacent prefixed move incorrect");

    var parsedGroupedMoves = utilsParseMoves(utilsNormalizeMoveText("(R2)U R 2U"));
    _testsAssertEquals("R2", parsedGroupedMoves[0],
            "utilsParseMoves: Grouped R2 not parsed correctly");
    _testsAssertEquals("U", parsedGroupedMoves[1],
            "utilsParseMoves: Move after grouped R2 not parsed correctly");
    _testsAssertEquals("R", parsedGroupedMoves[2],
            "utilsParseMoves: Delimited R not parsed correctly");
    _testsAssertEquals("2U", parsedGroupedMoves[3],
            "utilsParseMoves: Numeric-prefixed 2U not parsed correctly");
}
