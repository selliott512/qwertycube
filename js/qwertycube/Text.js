"use strict";

// Globals

var textColor = 0x000000;
var textVisible = false;
var textHeight = 20;
var faceInfos = [ [ "R", "x", 1 ], [ "L", "x", -1 ], [ "U", "y", 1 ],
        [ "D", "y", -1 ], [ "F", "z", 1 ], [ "B", "z", -1 ] ];
var textSize = 35;

// Public methods

// Return an array of text items.
function textCreate() {
    var text = [];
    for (var i = 0; i < faceInfos.length; i++) {
        var faceInfo = faceInfos[i];
        text.push(textAllocate(faceInfo[0], textSize, textHeight, "helvetiker",
                "normal", "normal", faceInfo[1], faceInfo[2] * 2 * cubiesSize));
    }
    return text;
}

// Set the visibility of the text items.
function textSetVisible(visible) {
    if (visible) {
        for (var i = 0; i < text.length; i++) {
            if (!textVisible) {
                scene.add(text[i]);
            }
            text[i].lookAt(camera.position);
        }
        textVisible = true;
    } else {
        if (textVisible) {
            for (var i = 0; i < text.length; i++) {
                scene.remove(text[i]);
            }
        }
        textVisible = false;
    }
}

// Private methods

// Allocate a single text item.
function textAllocate(text, s, h, f, w, st, axis, distance) {
    var textParams = {
        size : s,
        height : h,
        font : f,
        weight : w,
        style : st,
        bevelEnabled : false
    };

    var textGeo = new THREE.TextGeometry(text, textParams);
    var textMat = new THREE.MeshBasicMaterial({
        color : textColor
    });
    var txt = new THREE.Mesh(textGeo, textMat);

    // Position the newly created text.
    txt.position[axis] = distance;

    return txt;
}
