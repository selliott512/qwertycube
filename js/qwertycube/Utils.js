"use strict";

// Public methods

// Copy a map.  Note that this is not a deep/recursive copy.
function copyMap(oldMap) {
    var newMap = {};
    for (var item in oldMap) {
        newMap[item] = oldMap[item];
    }
    return newMap;
}

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

// Return the name of the coordinate that has the largest absolute value.
function largestAbsoluteAxis(vector) {
    var axes = [ "x", "y", "z" ];
    var axisMax = -1;
    var axisName;
    for (var i = 0; i <= axes.length; i++) {
        var axis = axes[i];
        var axisAbs = Math.abs(vector[axis]);
        if (axisAbs > axisMax) {
            axisMax = axisAbs;
            axisName = axis;
        }
    }
    return axisName;
}

// Set a global variable by name while preserving the type of the global.
function setGlobal(varName, varValueStr) {
    console.log("setting global " + varName);
    var varValue;
    var varType = window[varName].constructor;
    if (!varType) {
        console.log("Ignoring unknown variable \"" + varName + "\".");
        return;
    }
    if (varType === Array) {
        varValue = varValueStr.split(" ");
        if ((window[varName].length > 0)
                && (window[varName][0].constructor === Number)) {
            // If the array contained integers then convert to that.
            var varValueNum = [];
            for (var i = 0; i < varValue.length; i++) {
                varValueNum.push(parseInt(varValue[i]));
            }
            varValue = varValueNum;
        }
    } else if (varType === Boolean) {
        varValue = varValueStr.toLowerCase().substr(0, 1) == "t";
    } else if (varType === Number) {
        varValue = parseInt(varValueStr);
    } else {
        varValue = varValueStr;
    }
    window[varName] = varValue;
}
