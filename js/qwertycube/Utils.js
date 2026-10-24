"use strict";

// Miscellaneous utility functions.

// Public globals

var utilsVerboseLogging = false;

// Private globals

var _utilsMobileUserAgentREs = [/Android/i, /BlackBerry/i, /iPad/i, /iPhone/i,
        /iPod/i, /webOS/i, /Windows, Phone/i];

// Public functions

// Add two 3-element arrays.
function utilsAdd2Vectors(a, b, out) {
    var result = out || [0, 0, 0];
    result[0] = a[0] + b[0];
    result[1] = a[1] + b[1];
    result[2] = a[2] + b[2];
    return result;
}

// Add three 3-element arrays.
function utilsAdd3Vectors(a, b, c, out) {
    var result = out || [0, 0, 0];
    result[0] = a[0] + b[0] + c[0];
    result[1] = a[1] + b[1] + c[1];
    result[2] = a[2] + b[2] + c[2];
    return result;
}

// Clear queued moves and replay state.
function utilsClearMoveQueue() {
    animateMoveQueue.length = 0;
    animateRotationQueue.length = 0;
    animateMoveQueueReplay = false;
}

// Log a message only when verbose logging is enabled.
function utilsLogVerbose(message) {
    if (utilsVerboseLogging) {
        console.log(message);
    }
}

// Return the material side setting shared by cubies, arrows and labels.
function utilsGetMaterialSide() {
    var doubleSided = cubiesDoubleSided;
    if (doubleSided === "auto") {
        doubleSided = !cubiesRenderInteriorFaces || !cubiesRenderMissingStickers;
    } else if (typeof doubleSided === "string") {
        doubleSided = doubleSided.toLowerCase().substr(0, 1) === "t";
    }
    return doubleSided ? THREE.DoubleSide : THREE.FrontSide;
}

// Normalize pasted move text by turning grouping characters into delimiters and
// converting notation variants to QWERTYcube move text.
function utilsNormalizeMoveText(text) {
    return String(text)
            .replace(/⁸/g, "'")
            .replace(/[()[\]{}]+/g, " ")
            .replace(/([UDRLFBudrlfb])w/g, function(match, face) {
                return face.toLowerCase();
            })
            .replace(/[ \t\r\n]+/g, " ")
            .trim()
            .replace(/[xyz]/g, function(ch) {
                return ch.toUpperCase();
            });
}

// Expand move-text variables such as "@" for the current applied history.
function utilsExpandMoveTextVariables(moveText) {
    var historyEnd = Math.max(0, Math.min(animateMoveHistoryNext,
            animateMoveHistory.length));
    var historyText = animateMoveHistory.slice(0, historyEnd).join(" ");
    return String(moveText).replace(/@/g, " " + historyText + " ")
            .replace(/[ \t\r\n]+/g, " ").trim();
}

// Parse optional leading scramble flags. Format is "abc:R U F" or "abcR U F".
function utilsParseMoveTextFlags(text) {
    var rawText = String(text);
    var match = rawText.match(/^\s*([a-z]+)\s*:(.*)$/s);
    var flagsText = "";
    var flags = {};
    var movesText = rawText;
    if (!match) {
        match = rawText.match(/^\s*([aikmn]+)([^aikmn].*)$/s);
    }
    if (!match) {
        return {
            flagsText : flagsText,
            flags : flags,
            movesText : movesText
        };
    }
    movesText = match[2];
    for (var i = 0; i < match[1].length; i++) {
        var flag = match[1][i];
        if (!flags[flag]) {
            flags[flag] = true;
            flagsText += flag;
        }
    }
    return {
        flagsText : flagsText,
        flags : flags,
        movesText : movesText
    };
}

// Parse move text into an array of move strings.
function utilsParseMoves(moveText) {
    var moves = [];
    var move = "";
    for (var i = 0; i < moveText.length; i++) {
        var ch = moveText[i];
        if (ch === "|") {
            if (move.length) {
                moves.push(utilsNormalizeMovePrefix(move));
                move = "";
            }
            moves.push("|");
            continue;
        }
        var letter = /[A-Za-z]/.test(ch);
        if (letter) {
            if (move.length && /[A-Za-z]/.test(move)) {
                moves.push(utilsNormalizeMovePrefix(move));
                move = "";
            }
            move += ch;
        } else if ((ch === "'") || (ch === "2")) {
            if (!move.length) {
                if (ch === "2") {
                    move += ch;
                } else {
                    console.log("Ignoring suffix without move: \"" + ch + "\"");
                }
                continue;
            }
            move += ch;
        } else if (/\s/.test(ch)) {
            // Whitespace delimits moves. This matters for numeric prefixes.
            if (move.length) {
                moves.push(utilsNormalizeMovePrefix(move));
                move = "";
            }
        } else {
            // Keep non-whitespace modifiers such as numeric prefixes/ranges.
            if (move.length && /[A-Za-z]/.test(move)) {
                moves.push(utilsNormalizeMovePrefix(move));
                move = "";
            }
            move += ch;
        }
    }
    if (move.length) {
        moves.push(utilsNormalizeMovePrefix(move));
    }
    return moves;
}

// Normalize shorthand move prefixes, such as "23R" to "2-3R" on small cubes.
function utilsNormalizeMovePrefix(move) {
    var match = String(move).match(/^([1-9])([1-9])([A-Za-z].*)$/);
    if (!match) {
        return move;
    }
    if (parseInt(match[1] + match[2]) <= cubiesOrder) {
        return move;
    }
    return match[1] + "-" + match[2] + match[3];
}

// Convert from a coordinate on the cube to an index into the layers. Note that
// this should be the inverse of utilsIndexToCoord.
function utilsCoordToIndex(coord) {
     return Math.floor((coord + (cubiesHalfSide + (cubiesGapScaled / 2))) /
             cubiesOffsetScaled);
}

// Copy a map. Note that this is not a deep/recursive copy.
function utilsCopyMap(oldMap) {
    var newMap = {};
    for ( var item in oldMap) {
        newMap[item] = oldMap[item];
    }
    return newMap;
}

// Cross product for 3-element arrays: a × b.
function utilsCrossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],  // i component
        a[2] * b[0] - a[0] * b[2],  // j component
        a[0] * b[1] - a[1] * b[0]   // k component
    ];
}

// Dot product for 3-element arrays.
function utilsDotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Scale a 3-element array by a scalar.
function utilsScaleVector3(vector, scalar, out) {
    var result = out || [0, 0, 0];
    result[0] = vector[0] * scalar;
    result[1] = vector[1] * scalar;
    result[2] = vector[2] * scalar;
    return result;
}

// Convert an elapsed amount of time to mm:ss.x format.
function utilsElapsedMsecToStr(elapsedMsec) {
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
// index animateMoveQueue and animateRotationQueue must be kept in sync.
function utilsEnqueueMove(move) {
    var rotation = _utilsGetRotationFromMove(move);
    if (!rotation && (move !== "|")) {
        console.warn("Unknown move \"" + move + "\".");
    }
    animateMoveQueue.push(move);
    animateRotationQueue.push(rotation);
}

// Like utilsEnqueueMove except that the rotation may already be known (not null)
// in which case we don't want to calculate it again.
function utilsEnqueueMoveRotation(moveRot) {
    if (!moveRot[1]) {
        moveRot[1] = _utilsGetRotationFromMove(moveRot[0]);
        if (!moveRot[1] && (moveRot[0] !== "|")) {
            console.warn("Unknown move \"" + moveRot[0] + "\".");
        }
    }
    animateMoveQueue.push(moveRot[0]);
    animateRotationQueue.push(moveRot[1]);
}

// Queues up multiple moves.  See utilsEnqueueMove().
function utilsEnqueueMoves(moves) {
    for ( var i = 0; i < moves.length; i++) {
        utilsEnqueueMove(moves[i]);
    }
}

// Wrapper for throwing an exception.  Maybe this should display a dialog
// as well.
function utilsFatalError(message) {
    throw new Error(message);
}

// For a given move return the inverse move that will undo it.
function utilsGetInverseMove(move) {
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

// Reverse a move list and invert each move.
function utilsGetInverseMoves(moves) {
    var inv = [];
    for (var i = moves.length - 1; i >= 0; i--) {
        var move = moves[i];
        if (move === "|") {
            inv.push("|");
        } else {
            inv.push(utilsGetInverseMove(move));
        }
    }
    return inv;
}

// Mirror a move list about the XZ plane.
function utilsGetMirrorMovesXZ(moves) {
    var mirrored = [];
    for (var i = 0; i < moves.length; i++) {
        mirrored.push(utilsGetMirrorMoveXZ(moves[i]));
    }
    return mirrored;
}

// Mirror one move about the XZ plane.
function utilsGetMirrorMoveXZ(move) {
    if (move === "|") {
        return move;
    }
    for (var i = 0; i < move.length; i++) {
        var c = move[i];
        if (!(((c >= "0") && (c <= "9")) || (c === "-"))) {
            // i now points to the first non-prefix character.
            break;
        }
    }
    if (i >= move.length) {
        return move;
    }

    var prefix = i ? move.substr(0, i) : "";
    var root = move[i];
    var suffix = move.substr(i + 1);
    var mirroredRoot = _utilsGetMirrorMoveRootXZ(root);
    var mirroredMove = prefix + mirroredRoot + suffix;
    if (_utilsMirrorMoveRootNeedsInverseXZ(mirroredRoot)) {
        return _utilsGetMoveDirectionReversed(mirroredMove);
    }
    return mirroredMove;
}

// For a given move return the face/root letter, ignoring any numeric prefix.
function utilsGetMoveFace(move) {
    for (var i = 0; i < move.length; i++) {
        var c = move[i];
        if (!(((c >= "0") && (c <= "9")) || (c === "-"))) {
            return move[i].toUpperCase();
        }
    }
    return move;
}

// Given a sign, limLoIdx and limHiIdx produce an array of layers.
function utilsGetLayersFromIndexes(sign, limLoIdx, limHiIdx) {
    var layers = [];
    for (var i = 0; i < cubiesOrder; i++) {
        layers[i] = ((i >= limLoIdx) && (i <= limHiIdx)) ? sign : 0;
    }
    return layers;
}

// Given the axis about which layers are rotated and how much each layer is
// rotated return a move if possible. Positive rotation is in the vector sense
// with 1 for each 90 degrees counterclockwise.
function utilsGetMoveRotationFromLayers(axis, layers) {
    if (layers.length !== cubiesOrder) {
        // This should not happen.
        utilsFatalError("Layers has length " + layers.length + " instead of " +
                cubiesOrder);
        return null;
    }

    // First attempt to find an entry in rotateMoveToRotation that matches layers.
    var lo = -1;
    var hi = -1;
    var amount = 0;
    var end = false;
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        if (layer) {
            if (end) {
                // Disjoint layer ranges cannot be represented by one move.
                utilsLogVerbose("Unable to convert disjoint layers to a move");
                return null;
            }
            if (amount) {
                if (layer !== amount) {
                    utilsLogVerbose("Unable to convert layers with multiple "
                            + "amounts to a move");
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
        utilsLogVerbose("Unable to convert unchanged layers to a move");
        return null;
    }

    var sign = utilsGetSign(amount);
    amount = Math.abs(amount);

    if ((lo === hi) && ((lo === 0) || (lo == (cubiesOrder - 1))) ||
            (lo <= 1) && (hi >= (cubiesOrder - 2))) {
        // There is no prefix.  It should be possible to match an existing
        // entry in rotateRotationToMove.
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
        if (avg < ((cubiesOrder - 1) / 2)) {
            limLo = limHi = -1;
        } else {
            limLo = limHi = 1;
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

    var move = _utilsGetMoveFromRotation(rotation);

    // Now that the lookup has been done setting the following makes the
    // rotation fully valid and ready for use.
    rotation[5] = lo;
    rotation[6] = hi;

    if (prefix) {
        if (limLo === -1) {
            var loRange = lo + 1;
            var hiRange = hi + 1;
        } else if (limHi === 1) {
            var loRange = cubiesOrder - hi;
            var hiRange = cubiesOrder - lo;
        } else {
            // This should not happen.
            console.log("Unexpected ranges limLo=" + limLo + " limHi=" +
                    limHi);
        }
        if ((loRange === 1) && (hiRange === 1)) {
            // Move is ok without a prefix.  This shouldn't happen.
            utilsFatalError("Prefix of 1 for move \"" + move + "\"");
        } else if (loRange === hiRange) {
            // Prefixed with a single number.
            move = loRange + move;
        } else {
            // Prefixed with a range.
            move = loRange + "-" + hiRange + move;
        }
    }

    return [move, rotation];
}

// Simple function to parse the HTTP query parameters that should be good
// enough.  The values are arrays to allow for duplicate keys.
function utilsGetQueryParameters() {
    var href = window.location.href;
    var qParams = {};
    var begin = href.indexOf("?");
    if (begin !== -1) {
        begin++;
    }
    while (begin !== -1) {
        var end = href.indexOf("&", begin);
        if (end === -1) {
            // End of the query string reached.
            var keyValue = href.substr(begin);
            begin = -1;
        } else {
            // More items to follow.
            var keyValue = href.substr(begin, end - begin);
            begin = end + 1;
        }
        var eqIndex = keyValue.indexOf("=");
        if (eqIndex === -1) {
            console.log("Ignoring query parameter without '=': " + keyValue);
            continue;
        }
        var key = keyValue.substr(0, eqIndex);
        var value = decodeURIComponent(keyValue.substr(eqIndex + 1));
        var oldValue = qParams[key];
        if (oldValue) {
            oldValue.push(value);
        } else {
            qParams[key] = [value];
        }
    }
    return qParams;
}

// Like the "seq" CLI except it starts at 0.  Returns an array of size num.
function utilsGetSeq(num) {
    var nums = [];
    for (var i = 0; i < num; i++) {
        nums.push(i);
    }
    return nums;
}

// Like Math.sign(), which is not supported everywhere.
function utilsGetSign(num) {
 if (num < 0) {
     return - 1;
 } else if (num === 0) {
     return 0;
 } else {
     return 1;
 }
}

// Convert from a index into the layers to a coordinate on the cube.
function utilsIndexToCoord(limit) {
 return (cubiesSizeScaled + cubiesGapScaled) * limit -
     cubiesHalfSide - cubiesGapScaled / 2;
}

// Return true if the device is mobile. Inspired by:
// http://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
function utilsIsMobile() {
 for (var i = 0; i < _utilsMobileUserAgentREs.length; i++) {
     var re = _utilsMobileUserAgentREs[i];
     if (navigator.userAgent.match(re)) {
         return true;
     }
 }
 return false;
}

// Return the name of the coordinate that has the largest absolute value.
function utilsLargestAbsoluteAxis(vector) {
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

// Convert a map to a space-separated key=value list.
function utilsMapToString(map) {
    var first = true;
    var str = "";
    for ( var item in map) {
        str += (first ? "" : " ") + item + "=" + map[item];
        first = false;
    }
    return str;
}

// Normalize the color.
function utilsNormalizeColor(color) {
    if (color.constructor === Number) {
        return color;
    } else {
        return color.toLowerCase().indexOf("0x") === -1 ? color
                : parseInt(color)
    }
}

// Shuffle a subset of an array beginning and index begin (inclusive) and
// ending at index end (exclusive).  The shuffled portion of the array will be
// end - begin entries long.
function utilsShuffleArray(nums, begin, end) {
    for (var i = begin; i < end; i++) {
        var j = Math.floor(Math.random() * (end - i)) + i;
        var buff  = nums[i];
        nums[i] = nums[j];
        nums[j] = buff;
    }
}

// Set a global variable by name while preserving the type of the global.
function utilsSetGlobal(varName, varValueStr) {
    console.log("setting global " + varName + " to " + varValueStr);
    var varValue;
    if ((window[varName] === undefined) || (window[varName] === null)) {
        return _utilsSetGlobalError(varName, varValueStr,
                "unknown variable");
    }
    var varType = window[varName].constructor;
    if (!varType) {
        return _utilsSetGlobalError(varName, varValueStr,
                "unknown variable type");
    }
    if (varName === "cubiesColorMissingSticker") {
        varValue = _utilsNormalizeColorOrBlendSetting(varValueStr, "0.5");
    } else if (varType === Array) {
        if (varValueStr !== "") {
            varValue = varValueStr.split(" ");
            if ((window[varName].length > 0)
                    && (window[varName][0].constructor === Number)) {
                // If the array contained numbers then convert to that.
                var varValueNum = [];
                for (var i = 0; i < varValue.length; i++) {
                    var parsed = _utilsParseStrictNumber(varValue[i]);
                    if (parsed === null) {
                        return _utilsSetGlobalError(varName, varValueStr,
                                "expected numeric array");
                    }
                    varValueNum.push(parsed);
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
        varValue = _utilsParseStrictNumber(varValueStr);
        if (varValue === null) {
            return _utilsSetGlobalError(varName, varValueStr,
                    "expected number");
        }
    } else if (varType === Object) {
        varValue = varValueStr.split(" ");
        var varValueMap = {};
        for (var i = 0; i < varValue.length; i++) {
            var entry = varValue[i];
            if (!entry) {
                continue;
            }
            var eqIndex = entry.indexOf("=");
            if (eqIndex === -1) {
                continue;
            }
            var key = entry.substr(0, eqIndex);
            var value = entry.substr(eqIndex + 1);
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
    return {
        ok : true
    };
}

// Return a structured error for a setting that could not be applied.
function _utilsSetGlobalError(varName, varValueStr, error) {
    console.warn("Ignoring invalid setting " + varName + "=\""
            + varValueStr + "\": " + error + ".");
    return {
        ok : false,
        varName : varName,
        varValueStr : varValueStr,
        error : error
    };
}

// Parse a number while rejecting partial parses like "1x" and NaN.
function _utilsParseStrictNumber(value) {
    var valueStr = String(value).trim();
    if (valueStr === "") {
        return null;
    }
    var parsed = Number(valueStr);
    return isFinite(parsed) ? parsed : null;
}

// Normalize settings that accept either an explicit color or numeric blend.
function _utilsNormalizeColorOrBlendSetting(value, defaultValue) {
    var valueStr = String(value).trim();
    if (!valueStr || (valueStr === "true") || (valueStr === "false")) {
        return defaultValue;
    }
    return valueStr;
}

// Like Math.sign, but values near zero are treated as zero.
function utilsSignWithTolerance(value, tolerance) {
    var eps = (typeof tolerance === "number") ? tolerance : 0.001;
    return Math.abs(value) < eps ? 0 : Math.sign(value);
}

// Log a warning without it actually being a warning (console.warn).
function utilsSuppressedWarning(msg) {
    console.log("Suppressed warning: " + msg);
}

// Wrap the next so that no line exceeds cols columns.
function utilsWrapWithComments(animateText, cols) {
    if (!cols) {
        // Use a large value so it does not wrap.
        cols = 10000;
    }
    var result = "";
    for (var idx = 0; idx < animateText.length; idx = end + 1) {
        if ((idx + cols - 2) < animateText.length) {
            var sp = animateText.substring(idx, idx + cols - 2).lastIndexOf(" ");
            if (sp === -1) {
                console.log("Could not find a space in \"" + animateText + "\".");
                return result;
            }
            var end = idx + sp;
        } else {
            var end = animateText.length;
        }
        var line = "# " + animateText.substring(idx, end);
        result += (result ? "\n" : "") + line;
    }
    return result;
}

// Private functions

// Converts a rotation to a move.
function _utilsGetMoveFromRotation(rotation) {
    return rotateRotationToMove[rotation];
}

// Swap move roots that change names under XZ mirroring.
function _utilsGetMirrorMoveRootXZ(root) {
    var mirrorRoots = {
        R : "L",
        L : "R",
        r : "l",
        l : "r"
    };
    return mirrorRoots[root] || root;
}

// Return true if XZ mirroring reverses the move direction for a root.
function _utilsMirrorMoveRootNeedsInverseXZ(root) {
    return "UFDBYZESufdbyzRLrl".indexOf(root) !== -1;
}

// Reverse move direction, including double-prime notation. This is different
// from undo/inverse because doubles are not directionless for animation.
function _utilsGetMoveDirectionReversed(move) {
    if (move.indexOf("'") !== -1) {
        return move.replace("'", "");
    }
    return move + "'";
}

// Converts a move to a rotation. Returns undefined for savepoints.
function _utilsGetRotationFromMove(move) {
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
                // Open-ended low side, as in "-3R" or "-R".
                lo = 1;
            } else {
                lo = parseInt(buf);
                if (!(lo > 0)) {
                    // This should not happen. "if" constructed to allow for NaN.
                    console.log("Invalid prefix (lo) for move \"" + move + "\".");
                    return null;
                }
            }
            if (dash) {
                console.log("Invalid prefix with multiple dashes for move \""
                        + move + "\".");
                return null;
            }
            buf = "";
            dash = true;
        } else {
            // i points to the first non-prefix character.
            if (i) {
                if (dash) {
                    if (buf) {
                        hi = parseInt(buf);
                    } else {
                        hi = cubiesOrder;
                    }
                } else {
                    if (!buf) {
                        // This should not happen.
                        console.log("Invalid prefix for move \"" + move + "\".");
                        return null;
                    }
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

    if (i >= move.length) {
        console.log("Move missing face after prefix \"" + move + "\".");
        return null;
    }

    if (lo > hi) {
        // This should only happen if an invalid prefix was explicitly entered.
        console.log("Prefix with incorrect order for move \"" + move + "\"");
        return null;
    }

    // Limit lo and hi to valid ranges, but only if the the range overlaps
    // with some portion of the cube.  The goal is gracefully apply moves
    // that were valid for a higher order cube to the current cube.
    if ((lo < 1) && (hi >= 1)) {
        lo = 1;
    }
    if ((lo <= cubiesOrder) && (hi > cubiesOrder)) {
        hi = cubiesOrder;
    }

    if ((lo < 1) || (hi > cubiesOrder)) {
        // Nothing to do for this move for the current order.
        console.log("Prefix entirely out of range for move \"" + move + "\"");
        return null;
    }

    // "G" for undo is not part of the table.
    for (var j = move.length - 1; j >= 0; j--) {
        if (move[j] !== "G") {
            break;
        }
    }

    // The prefix is not part of the table.
    var moveNoPrefix = move.substr(i, j - i + 1);
    var moveDoublePrime = (moveNoPrefix.indexOf("2") !== -1)
            && (moveNoPrefix.indexOf("'") !== -1);
    // Accept double-prime forms like U2' as equivalent to U2 for lookup.
    if (moveDoublePrime) {
        moveNoPrefix = moveNoPrefix.replace("'", "");
    }
    var rotation = rotateMoveToRotation[moveNoPrefix];
    if (!rotation) {
        // Probably a savepoint.
        return null;
    }

    // There was a range prefix.
    rotation = rotation.slice();
    if (moveDoublePrime) {
        // Preserve animation direction for double-prime moves.
        rotation[0] = -rotation[0];
    }
    var limLo = rotation[2];
    var limHi = rotation[3];
    var diff = limHi - limLo;
    if (diff === 1) {
        // Two layer.
        hi = cubiesOrder - 1;
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
