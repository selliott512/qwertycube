The three.js files are from
c9b67ef4670bd042188a3b3036669def57f39580da2478a2b180d01f8ab29de9  three.js-r183.zip

The three example files have a small modification:

diff js/third-party/examples/jsm/controls/OrbitControls.js{.old,}
  12c12
  < } from 'three';
  ---
  > } from '../../../three.module.min.js';

---

JSSS

- Small mod to expose the solver:

---
  var solveFacelets = function(facelets) {
    ini();
    return $solution(search, facelets);
  };
---

Invoked with:
---
scramblers["333"].solveFacelets("...54-char URFDLB facelets...")
---
