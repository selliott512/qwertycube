"use strict";

// Pure unit tests can be added to this file.

// Set to true in settings to run the tests.
var testsRunAll = false;

var allTests = [
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

function testUtils() {
    // Test that shuffle has the expected effect.
    var nums = getSeq(30);
    shuffleArray(nums, 10, 20);
    for (var i = 0; i < 10; i++) {
        assert(nums[i] === i, "Shuffle: first part incorrect");
    }
    var shuffledNums = [];
    for (var i = 10; i < 20; i++) {
        var num = nums[i];
        assert(shuffledNums[num] === undefined, "Shuffle: number duplicated");
        assert((num >= 10) && (num < 20), "Shuffle: number out of range");
        shuffledNums.push(num);
    }
    for (var i = 20; i < 30; i++) {
        assert(nums[i] === i, "Shuffle: last part incorrect");
    }
}

// Private methods.

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
