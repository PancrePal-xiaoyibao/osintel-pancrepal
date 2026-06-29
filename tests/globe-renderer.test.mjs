import assert from 'node:assert/strict';
import * as THREE from 'three';
import { disposeThreeScene, latLonToVector3 } from '../src/lib/globe/scene.ts';

const point = latLonToVector3(0, 0, 2);
assert.ok(point instanceof THREE.Vector3);
assert.equal(Math.round(point.length()), 2);

const scene = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
scene.add(mesh);

disposeThreeScene(scene);
assert.equal(scene.children.length, 1);

