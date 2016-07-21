"use strict";

// Unit test functions that are optionally pressed when "Ok" is clicked on the
// settings dialog.

// Public globals

// Set to true in settings to run the tests.
var testsRunAll = false;

// Private globals

var _testsAllTests = [
    _testsTestMoves,
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
    cubiesOrder = cubiesOrderOld;
}
