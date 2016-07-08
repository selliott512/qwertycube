"use strict";

// Globals
var mobileUserAgentREs = [/Android/i, /BlackBerry/i, /iPad/i, /iPhone/i,
        /iPod/i, /webOS/i, /Windows, Phone/i];

// Public methods

function clearMoveQueue() {
    moveQueue.length = 0;
    rotationQueue.length = 0;
}

//Convert from a coordinate on the cube to an index into the layers. Note that
//this should be the inverse of indexToCoord.
function coordToIndex(coord) {
     return Math.floor((coord + (cubiesHalfSide + (cubiesGapScaled / 2))) /
             cubiesOffsetScaled);
}

// Copy a map. Note that this is not a deep/recursive copy.
function copyMap(oldMap) {
    var newMap = {};
    for ( var item in oldMap) {
        newMap[item] = oldMap[item];
    }
    return newMap;
}

// Convert an elapsed amount of time to mm:ss.x format.
function elapsedMsecToStr(elapsedMsec) {
    if (elapsedMsec === null) {
        return "";
    }
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

// Queues up a move along with it's corresponding rotation. Note that index to
// index moveQueue and rotationQueue must be kept in sync.
function enqueueMove(move) {
    moveQueue.push(move);
    rotationQueue.push(getRotationFromMove(move));
}

// Like enqueueMove except that the rotation may already be known (not null)
// in which case we don't want to calculate it again.
function enqueueMoveRotation(moveRot) {
    if (!moveRot[1]) {
        moveRot[1] = getRotationFromMove(moveRot[0]);
    }
    moveQueue.push(moveRot[0]);
    rotationQueue.push(moveRot[1]);
}

// Queues up multiple moves.  See enqueueMove().
function enqueueMoves(moves) {
    for ( var i = 0; i < moves.length; i++) {
        enqueueMove(moves[i]);
    }
}

// For a given move return the inverse move that will undo it.
function getInverseMove(move) {
    for (var i = 0; i < move.length; i++) {
        var c = move[i];
        if (!(((c >= "0") && (c <= "9")) || (c === "-"))) {
            // i now points to the first non-prefix character.
            break;
        }
    }

    // The move without the prefix.
    var moveSuffix = i ? move.substr(i) : move;

    if (moveSuffix.indexOf("2") !== -1) {
        // Doubles are their own inverse.
        return move;
    }

    if (moveSuffix.indexOf("'") !== -1) {
        // It was prime, return non-prime.
        return move.replace("'", "");
    } else {
        // It as non-prime, return prime.
        return move + "'";
    }
}

// Given a sign, limLoIdx and limHiIdx produce an array of layers.
function getLayersFromIndexes(sign, limLoIdx, limHiIdx) {
    var layers = [];
    for (var i = 0; i < cubiesOrder; i++) {
        layers[i] = ((i >= limLoIdx) && (i <= limHiIdx)) ? sign : 0;
    }
    return layers;
}

// Given the axis about which layers are rotated and how much each layer is
// rotated return a move if possible. Positive rotation is in the vector sense
// with 1 for each 90 degrees counterclockwise.
function getMoveRotationFromLayers(axis, layers) {
    if (layers.length !== cubiesOrder) {
        // This should not happen.
        console.log("Layers has length " + layers.length + " instead of " +
                cubiesOrder);
        return null;
    }

    // First attempt to find an entry in moveToRotation that matches layers.
    var lo = -1;
    var hi = -1;
    var amount = 0;
    var end = false;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer) {
            if (end) {
                // This should not happen.
                console.log("Layers has multiple ends");
                return null;
            }
            if (amount) {
                if (layer !== amount) {
                    console.log("Unable to convert layers with multiple amounts " +
                    "to a move");
                    return null;
                }
            } else {
                amount = layer;
            }
            if (lo === -1) {
                lo = i;
            }
            hi = i;
        } else if (amount) {
            end = true;
        }
    }

    if (!amount) {
        // This should not happen.
        console.log("No layers were rotated");
        return null;
    }

    var sign = getSign(amount);
    amount = Math.abs(amount);

    if ((lo === hi) && ((lo === 0) || (lo == (cubiesOrder - 1))) ||
            (lo <= 1) && (hi >= (cubiesOrder - 2))) {
        // There is no prefix.  It should be possible to match an existing
        // entry in rotationToMove.
        var prefix = false;

        if (lo === 0) {
            var limLo = -1;
        } else if (lo < cubiesOrder - 1) {
            var limLo = 0;
        } else {
            var limLo = 1;
        }

        if (hi === 0) {
            var limHi = -1;
        } else if (hi < cubiesOrder - 1) {
            var limHi = 0;
        } else {
            var limHi = 1;
        }
    } else {
        // There is a prefix. Find which side a bulk of the layers are closest
        // to and make that the basis of the move.
        var prefix = true;

        // Round up for the average in order to bias in favor of the positive
        // end of the cube.
        var avg = Math.ceil((lo + hi) / 2);
        var twoLayer = (hi - lo) === 1;
        if (avg < ((cubiesOrder - 1) / 2)) {
            if (twoLayer) {
                limLo = -1;
                limHi = 0;
            } else {
                limLo = limHi = -1;
            }
        } else {
            if (twoLayer) {
                limLo = 0;
                limHi = 1;
            } else {
                limLo = limHi = 1;
            }
        }
    }

    // We now have enough information to build a rotation.
    var rotation = [];
    rotation[0] = sign;
    rotation[1] = axis;
    rotation[2] = limLo;
    rotation[3] = limHi
    rotation[4] = amount;
    rotation[5] = -1;
    rotation[6] = -1;

    var move = getMoveFromRotation(rotation);

    // Now that the lookup has been done setting the following makes the
    // rotation fully valid and ready for use.
    rotation[5] = lo;
    rotation[6] = hi;

    if (prefix) {
        if (limLo === -1) {
            var loRange = lo + 1;
            var hiRange = hi + 1;
            if (twoLayer) {
                hiRange--;
            }
        } else if (limHi === 1) {
            var loRange = cubiesOrder - hi;
            var hiRange = cubiesOrder - lo;
            if (twoLayer) {
                hiRange--;
            }
        }
        else {
            // This should not happen.
            console.log("Unexpected ranges limLo=" + limLo + " limHi=" +
                    limHi);
        }
        if (loRange === hiRange) {
            // Prefixed with a single number.
            move = loRange + move;
        } else {
            // Prefixed with a range.
            move = loRange + "-" + hiRange + move;
        }
    }

    return [move, rotation];
}

// Converts a rotation to a move.
function getMoveFromRotation(rotation) {
    return rotationToMove[rotation];
}

// Converts a move to rotation. Returns undefined for savepoints.
function getRotationFromMove(move) {
    // There is no rotation for savepoints.
    if (move === "|") {
        return null;
    }

    // Iterate through and parse the possible lo[-hi] prefix.
    var buf = "";
    var dash = false;
    var lo = 1; // Layer 1 is implied if prefix is missing.
    var hi = 1;
    for (var i = 0; i < move.length; i++) {
        var c = move[i];
        if ((c >= "0") && (c <= "9")) {
            buf += c;
        } else if (c === "-") {
            if (!buf) {
                // This should not happen.
                console.log("Invalid prefix for move \"" + move + "\".");
                return null;
            }
            lo = parseInt(buf);
            if (!(lo > 0)) {
                // This should not happen.  "if" constructed to allow for NaN.
                console.log("Invalid prefix (lo) for move \"" + move + "\".");
                return null;
            }
            buf = "";
            dash = true;
        } else {
            // i points to the first non-prefix character.
            if (i) {
                if (!buf) {
                    // This should not happen.
                    console.log("Invalid prefix for move \"" + move + "\".");
                    return null;
                }
                if (dash) {
                    hi = parseInt(buf);
                } else {
                    lo = hi = parseInt(buf);
                }
                if (!(hi > 0)) {
                    // This should not happen.  "if" constructed to allow for NaN.
                    console.log("Invalid prefix (hi) for move \"" + move +
                            "\".");
                    return null;
                }
            }
            break;
        }
    }

    // "G" for undo is not part of the table.
    for (var j = move.length - 1; j >= 0; j--) {
        if (move[j] !== "G") {
            break;
        }
    }

    // The prefix is not part of the table.
    var rotation = moveToRotation[move.substr(i, j - i + 1)];
    if (!rotation) {
        // Probably a savepoint.
        return null;
    }

    // There was a range prefix.
    rotation = rotation.slice();
    var limLo = rotation[2];
    var limHi = rotation[3];
    var diff = limHi - limLo;
    if (diff === 1) {
        // Two layer.
        hi++;
    } else if (diff === 2) {
        // Full cube rotation.
        if (i) {
            console.log("Whole cube rotation should not have a prefix for " +
            		"move \"" + move);
            return null;
        }

        // No need for any further analysis for full cube rotations.
        rotation[5] = 0;
        rotation[6] = cubiesOrder - 1;
        return rotation;
    }
    var sum = limLo + limHi;
    if (sum < 0) {
        // Layers starts at one from the low side from the cube.
        var limLoIdx = lo - 1;
        var limHiIdx = hi - 1;
    } else if (sum > 0) {
        // Layers starts at one from the high side from the cube.  Notice that
        // lo and hi as swapped.
        var limLoIdx = cubiesOrder - hi;
        var limHiIdx = cubiesOrder - lo;
    } else {
        if (i) {
            // Prefix applied to a middle move.
            console.log("Middle moves can not have a prefix for move \"" + move +
            "\"");
            return null;
        }
        // For middle moves every layer other than the outer ones.
        var limLoIdx = 1;
        var limHiIdx = cubiesOrder - 2;
    }

    // Final sanity check.
    if ((limLoIdx < 0) || (limLoIdx > limHiIdx) || (limHiIdx > (cubiesOrder - 1))) {
        // This should not happen.
        console.log("Unexpected ranges limLoIdx=" + limLoIdx + " limHiIdx=" +
                limHiIdx + " for move \"" + move + "\"");
        return null;
    }
    rotation[5] = limLoIdx;
    rotation[6] = limHiIdx;

    return rotation;
}

// Like Math.sign(), which is not supported everywhere.
function getSign(num) {
    if (num < 0) {
        return - 1;
    } else if (num === 0) {
        return 0;
    } else {
        return 1;
    }
}


//Convert from a index into the layers to a coordinate on the cube.
function indexToCoord(limit) {
 return (cubiesSizeScaled + cubiesGapScaled) * limit -
     cubiesHalfSide - cubiesGapScaled / 2;
}

// Return the name of the coordinate that has the largest absolute value.
function largestAbsoluteAxis(vector) {
    var axes = ["x", "y", "z"];
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

// Convert a map to a space separated key:value list.
function mapToString(map) {
    var first = true;
    var str = "";
    for ( var item in map) {
        str += (first ? "" : " ") + item + ":" + map[item];
        first = false;
    }
    return str;
}

// Normalize the color.
function normalizeColor(color) {
    if (color.constructor === Number) {
        return color;
    } else {
        return color.toLowerCase().indexOf("0x") === -1 ? color
                : parseInt(color)
    }
}

// Return true if the device is mobile. Inspired by:
// http://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
function isMobile() {
    for (var i = 0; i < mobileUserAgentREs.length; i++) {
        var re = mobileUserAgentREs[i];
        if (navigator.userAgent.match(re)) {
            return true;
        }
    }
    return false;
}

// Set a global variable by name while preserving the type of the global.
function setGlobal(varName, varValueStr) {
    console.log("setting global " + varName + " to " + varValueStr);
    var varValue;
    var varType = window[varName].constructor;
    if (!varType) {
        console.log("Ignoring unknown variable \"" + varName + "\".");
        return;
    }
    if (varType === Array) {
        if (varValueStr !== "") {
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
        } else {
            // If it's empty we don't need to know the type of the elements.
            varValue = [];
        }
    } else if (varType === Boolean) {
        varValue = varValueStr.toLowerCase().substr(0, 1) === "t";
    } else if (varType === Number) {
        if (varValueStr.indexOf(".") !== -1) {
            varValue = parseFloat(varValueStr);
        } else {
            varValue = parseInt(varValueStr);
        }
    } else if (varType === Object) {
        varValue = varValueStr.split(" ");
        var varValueMap = {};
        for (var i = 0; i < varValue.length; i++) {
            var entry = varValue[i];
            if (!entry) {
                continue;
            }
            var keyValue = entry.split(":");
            var key = keyValue[0];
            var value = keyValue[1];
            if (!key || !value) {
                continue;
            }
            varValueMap[key] = value;
        }
        varValue = varValueMap;
    } else {
        varValue = varValueStr;
    }
    window[varName] = varValue;
}

// Wrap the next so that no line exceeds cols columns.
function wrapWithComments(text, cols) {
    if (!cols) {
        // Use a large value so it does not wrap.
        cols = 10000;
    }
    var result = "";
    for (var idx = 0; idx < text.length; idx = end + 1) {
        if ((idx + cols - 2) < text.length) {
            var sp = text.substring(idx, idx + cols - 2).lastIndexOf(" ");
            if (sp === -1) {
                console.log("Could not find a space in \"" + text + "\".");
                return result;
            }
            var end = idx + sp;
        } else {
            var end = text.length;
        }
        var line = "# " + text.substring(idx, end);
        result += (result ? "\n" : "") + line;
    }
    return result;
}
