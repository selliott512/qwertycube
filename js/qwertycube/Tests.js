"use strict";

// Pure unit tests can be added to this file.

// Set to true in settings to run the tests.
var testsRunAll = false;

var allTests = [
    testMoves,
    testUtils
];

// Public methods

function testsRun() {
    for (var i = 0; i < allTests.length; i++) {
        var test = allTests[i];
        test();
    }
}

// Test methods

function testMoves() {
    var layers = [];
    for (var i = 0; i < cubiesOrder; i++) {
        layers.push(0);
    }
    layers[0] = 1;
    var moveRot = getMoveRotationFromLayers("x", layers);
    var move = moveRot[0];
    assertEquals("L", move, "getMoveRotationFromLayers: Move returned was " +
            "not expected");

    for (var i = 0; i < cubiesOrder; i++) {
        layers[i] = -1;
    }
    var moveRot = getMoveRotationFromLayers("z", layers);
    var move = moveRot[0];
    assertEquals("Z", move, "getMoveRotationFromLayers: Move returned was " +
            "not expected");

    // Only makes sense for 2x2
    layers[1] = 0;
    var moveRot = getMoveRotationFromLayers("y", layers);
    if (cubiesOrder === 2) {
        // 2x2
        var move = moveRot[0];
        assertEquals("D'", move, "getMoveRotationFromLayers: Move returned " +
                "was not expected");

        for (var i = 0; i < cubiesOrder; i++) {
            layers[i] = -layers[i];
        }
        var moveRot = getMoveRotationFromLayers("y", layers);
        var move = moveRot[0];
        assertEquals("D", move, "getMoveRotationFromLayers: Move returned " +
                "was not expected");
    } else {
        // Should not have been possible to find a move.
        assertEquals(null, moveRot, "getMoveRotationFromLayers: Unexpected " +
                "move returned.")
    }

    var inv = getInverseMove("R");
    assertEquals("R'", inv, "getInverseMove: Bad inverse");

    var inv = getInverseMove("3-7R'");
    assertEquals("3-7R", inv, "getInverseMove: Bad inverse");

    var inv = getInverseMove("2l2");
    assertEquals("2l2", inv, "getInverseMove: Bad inverse");
}

function testUtils() {
    // Test that shuffle has the expected effect.
    var nums = getSeq(30);
    shuffleArray(nums, 10, 20);
    for (var i = 0; i < 10; i++) {
        assertEquals(i, nums[i], "shuffleArray: first part incorrect");
    }
    var shuffledNums = [];
    for (var i = 10; i < 20; i++) {
        var num = nums[i];
        assertEquals(undefined, shuffledNums[num], "shuffleArray: number duplicated");
        assert((num >= 10) && (num < 20), "shuffleArray: number out of range");
        shuffledNums.push(num);
    }
    for (var i = 20; i < 30; i++) {
        assertEquals(i, nums[i], "shuffleArray: last part incorrect");
    }

    // Test that setting a global works as expected.
    var cubiesOrderOld = cubiesOrder;
    setGlobal("cubiesOrder", "1234");
    // Value must be integer to pass.
    assertEquals(1234, cubiesOrder, "setGlobal: Global not set correctly");
    cubiesOrder = cubiesOrderOld;
}

// Private methods.

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEquals(expected, actual, message) {
    if (expected !== actual) {
        throw new Error(message + " expected=" + expected +
                " actual=" + actual);
    }
}
