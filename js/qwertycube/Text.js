"use strict";

// Globals

var textColor = 0x000000;
var textVisible = false;
var textHeight = 20;
var faceInfos = [ [ "R", "x", 1 ], [ "L", "x", -1 ], [ "U", "y", 1 ],
        [ "D", "y", -1 ], [ "F", "z", 1 ], [ "B", "z", -1 ] ];
var textSize = 35;

// Public methods

// Return an array of animateText items.
function textCreate() {
    var animateText = [];
    for (var i = 0; i < faceInfos.length; i++) {
        var faceInfo = faceInfos[i];
        animateText.push(textAllocate(faceInfo[0], textSize, textHeight, "helvetiker",
                "normal", "normal", faceInfo[1], faceInfo[2] * 2 * cubiesSize));
    }
    return animateText;
}

// Set the visibility of the animateText items.
function textSetVisible(visible) {
    if (visible) {
        for (var i = 0; i < animateText.length; i++) {
            if (!textVisible) {
                animateScene.add(animateText[i]);
            }
            animateText[i].lookAt(animateCamera.position);
        }
        textVisible = true;
    } else {
        if (textVisible) {
            for (var i = 0; i < animateText.length; i++) {
                animateScene.remove(animateText[i]);
            }
        }
        textVisible = false;
    }
}

// Private methods

// Allocate a single text item.
function textAllocate(animateText, s, h, f, w, st, axis, distance) {
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
        color : textColor
    });
    var txt = new THREE.Mesh(textGeo, textMat);

    // Position the newly created text.
    txt.position[axis] = distance;

    return txt;
}
