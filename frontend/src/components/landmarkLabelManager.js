// landmarkLabelManager.js
//
// Fix: when the user clicks a page option and the car drives to that landmark:
//   - the CLICKED landmark's label stays exactly as it is (full size, full opacity)
//   - all OTHER landmark labels shrink/fade so they read as "far away" (depth cue)
//   - once the destination page has fully opened, ALL labels disappear —
//     the 3D city + labels are a separate layer from the page content, so
//     nothing from the scene should show through while a page is open.
//
// Works with THREE.Sprite or CSS2DObject labels — see the two apply* methods.

import * as THREE from 'three';

export class LandmarkLabelManager {
  constructor(labels = [], opts = {}) {
    this.labels = Array.isArray(labels) ? labels : [];
    this.baseScale = new Map(this.labels.map(l => [l.name, l.object && l.object.scale ? l.object.scale.clone() : new THREE.Vector3(1, 1, 1)]));

    this.inactiveScale = opts.inactiveScale ?? 0.45;
    this.inactiveOpacity = opts.inactiveOpacity ?? 0.35;
    this.transitionSpeed = opts.transitionSpeed ?? 6;

    this.activeName = null;
    this.pageOpen = false;

    this._current = new Map(this.labels.map(l => [l.name, { scale: 1, opacity: 1 }]));
  }

  setActiveLandmark(name) {
    this.activeName = name;
    this.pageOpen = false;
  }

  enterPage() {
    this.pageOpen = true;
  }

  exitPage() {
    this.pageOpen = false;
    this.activeName = null;
  }

  update(dt) {
    const lerpAmt = Math.min(1, this.transitionSpeed * dt);

    for (const { name, object } of this.labels) {
      const state = this._current.get(name);
      const base = this.baseScale.get(name);

      let targetScale, targetOpacity;

      if (this.pageOpen) {
        targetScale = 0;
        targetOpacity = 0;
      } else if (this.activeName === null) {
        targetScale = 1;
        targetOpacity = 1;
      } else if (name === this.activeName) {
        targetScale = 1;
        targetOpacity = 1;
      } else {
        targetScale = this.inactiveScale;
        targetOpacity = this.inactiveOpacity;
      }

      state.scale = THREE.MathUtils.lerp(state.scale, targetScale, lerpAmt);
      state.opacity = THREE.MathUtils.lerp(state.opacity, targetOpacity, lerpAmt);

      this._applyToObject(object, base, state);
    }
  }

  _applyToObject(object, base, state) {
    object.scale.set(base.x * state.scale, base.y * state.scale, base.z * state.scale);

    if (object.material && 'opacity' in object.material) {
      object.material.transparent = true;
      object.material.opacity = state.opacity;
    }
    if (object.element) {
      object.element.style.opacity = state.opacity.toFixed(3);
      object.element.style.pointerEvents = state.opacity < 0.05 ? 'none' : 'auto';
    }

    object.visible = state.opacity > 0.01;
  }
}
