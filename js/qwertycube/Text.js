"use strict";

// Private globals

var _textColor = 0x000000;
var _textHeight = 20;
var _textFaceInfos = [ [ "R", "x", 1 ], [ "L", "x", -1 ], [ "U", "y", 1 ],
        [ "D", "y", -1 ], [ "F", "z", 1 ], [ "B", "z", -1 ] ];
var _textSize = 35;
var _textVisible = false;

// Public functions

// Return an array of animateText items.
function textCreate() {
    var animateText = [];
    for (var i = 0; i < _textFaceInfos.length; i++) {
        var faceInfo = _textFaceInfos[i];
        animateText.push(_textAllocate(faceInfo[0], _textSize, _textHeight, "helvetiker",
                "normal", "normal", faceInfo[1], faceInfo[2] * 2 * cubiesSize));
    }
    return animateText;
}

// Set the visibility of the animateText items.
function textSetVisible(visible) {
    if (visible) {
        for (var i = 0; i < animateText.length; i++) {
            if (!_textVisible) {
                animateScene.add(animateText[i]);
            }
            animateText[i].lookAt(animateCamera.position);
        }
        _textVisible = true;
    } else {
        if (_textVisible) {
            for (var i = 0; i < animateText.length; i++) {
                animateScene.remove(animateText[i]);
            }
        }
        _textVisible = false;
    }
}

// Private functions

// Allocate a single text item.
function _textAllocate(animateText, s, h, f, w, st, axis, distance) {
    var textParams = {
        size : s,
        height : h,
        font : f,
        weight : w,
        style : st,
        bevelEnabled : false
    };

    var textGeo = new THREE.TextGeometry(animateText, textParams);
    var textMat = new THREE.MeshBasicMaterial({
        color : _textColor
    });
    var txt = new THREE.Mesh(textGeo, textMat);

    // Position the newly created text.
    txt.position[axis] = distance;

    return txt;
}
