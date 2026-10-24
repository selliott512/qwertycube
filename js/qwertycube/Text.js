"use strict";

// Displays the orientation labels that can be seen by pressing "O".

// Public globals

var textDispOrientationLabels = true;

// Private globals

var _textHeight = 0;
var _textFaceInfos = [ [ "R", "x", 1 ], [ "L", "x", -1 ], [ "U", "y", 1 ],
        [ "D", "y", -1 ], [ "F", "z", 1 ], [ "B", "z", -1 ] ];
// Place labels at twice the arrow surface offset so labels sit above arrows.
var _textLabelSurfaceOffsetToArrowOffsetScale = 2.0;
var _textSize = 70;
var _textVisible = false;

// Public functions

// Return an array of animateText items.
function textCreate() {
    var animateText = [];
    if (!window.textFont) {
        console.log("textFont not loaded; orientation labels disabled.");
        return animateText;
    }
    var arrowOutsideFactor = (typeof _slightlyOutsideFactor === "number")
        ? _slightlyOutsideFactor : 1.02;
    var arrowSurfaceOffset = (arrowOutsideFactor - 1.0) * cubiesHalfSide;
    var textSurfaceOffset = _textLabelSurfaceOffsetToArrowOffsetScale
        * arrowSurfaceOffset;
    var textDistanceFromCenter = cubiesHalfSide + textSurfaceOffset;
    for (var i = 0; i < _textFaceInfos.length; i++) {
        var faceInfo = _textFaceInfos[i];
        animateText.push(_textAllocate(faceInfo[0], _textSize, _textHeight, window.textFont,
                "normal", "normal", faceInfo[1], faceInfo[2] * textDistanceFromCenter));
    }
    return animateText;
}

// Set the visibility of the animateText items.
function textSetVisible(visible, force) {
    if (!force && (visible === _textVisible)) {
        return;
    }
    if (visible) {
        for (var i = 0; i < animateText.length; i++) {
            if (animateText[i].parent !== animateScene) {
                animateScene.add(animateText[i]);
            }
        }
        _textVisible = true;
    } else {
        for (var i = 0; i < animateText.length; i++) {
            if (animateText[i].parent === animateScene) {
                animateScene.remove(animateText[i]);
            }
        }
        _textVisible = false;
    }
}

// Update the orientation label color from cubiesColorBackground.
function textUpdateColor() {
    var textColor = utilsNormalizeColor(cubiesColorBackground);
    for (var i = 0; i < animateText.length; i++) {
        var txt = animateText[i];
        if (!txt || !txt.material || !txt.material.color) {
            continue;
        }
        txt.material.color.set(textColor);
    }
}

// Private functions

// Allocate a single text item.
function _textAllocate(animateText, s, h, f, w, st, axis, distance) {
    var textParams = {
        size : s,
        depth : h,
        font : f,
        weight : w,
        style : st,
        bevelEnabled : false
    };

    var textGeo = new TextGeometry(animateText, textParams);
    // Center each glyph so txt.position is the visual center of the letter.
    textGeo.center();
    var textColor = utilsNormalizeColor(cubiesColorBackground);
    var textMat = new THREE.MeshBasicMaterial({
        color : textColor,
        side : utilsGetMaterialSide()
    });
    var txt = new THREE.Mesh(textGeo, textMat);

    // Position the newly created text.
    txt.position[axis] = distance;

    // Align +Z (text front) with the requested face normal.
    var faceNormal = new THREE.Vector3();
    faceNormal[axis] = utilsGetSign(distance);
    txt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), faceNormal);

    return txt;
}
