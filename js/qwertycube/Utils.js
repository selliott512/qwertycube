"use strict";

// Public methods

// For a given move return the inverse move that will undo it.
function getInverseMove(move) {
    if (move.indexOf("2") !== -1) {
        // Doubles are their own inverse.
        return move;
    }

    if (move.indexOf("'") !== -1) {
        // It was prime, return non-prime.
        return move.replace("'", "");
    } else {
        // It as non-prime, return prime.
        return move + "'";
    }
}

// Convert an elapsed amount of time to mm:ss.x format.
function elapsedMsecToStr(elapsedMsec) {
    // Work with integers and then add the decimal later.
    var deciSecs = 0 | ((elapsedMsec + 0.5) / 100);
    var minutes = 0 | ((deciSecs + 0.5) / 600);
    if (minutes) {
        deciSecs = 0 | (deciSecs % 600 + 0.5);
        var dsStr = "" + deciSecs;
        while (dsStr.length < 3) {
            dsStr = "0" + dsStr;
        }
        var elapsedStr = "" + minutes + ":" + dsStr;
    } else {
        var elapsedStr = "" + deciSecs;
    }

    // Add the decimal point.
    elapsedStr = elapsedStr.substr(0, elapsedStr.length - 1) + "."
            + elapsedStr.substr(elapsedStr.length - 1, 1);

    return elapsedStr;
}

// Set a global variable by name while preserving the type of the global.
function setGlobal(varName, varValueStr) {
    var varValue;
    var varType = window[varName].constructor;
    if (!varType) {
        console.log("Ignoring unknown variable \"" + varName + "\".");
        return;
    }
    if (varType === Array) {
        varValue = varValueStr.split(" ");
    }
    else if (varType === Boolean) {
        varValue = varValueStr.toLowerCase().substr(0, 1) == "t";
    }
    else if (varType === Number) {
        varValue = parseInt(varValueStr);
    }
    else {
        varValue = varValueStr;
    }
    window[varName] = varValue;
}