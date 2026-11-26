// "Look Beyond Your Skin": a glass figure with the organs psoriasis reaches.
import * as THREE from 'three';

const VERT = `
varying vec3 vN; varying vec3 vV;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
uniform vec3 uRim; uniform vec3 uFill; uniform float uAlpha; uniform float uPow;
varying vec3 vN; varying vec3 vV;
void main(){
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
  vec3 c = mix(uFill, uRim, f);
  gl_FragColor = vec4(c, (0.05 + f * 0.95) * uAlpha);
}`;

function glass(rim = '#ff7a70', fill = '#3a1512', alpha = 1, pow = 2.3) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uRim: { value: new THREE.Color(rim) }, uFill: { value: new THREE.Color(fill) }, uAlpha: { value: alpha }, uPow: { value: pow } },
  });
}

export function initBody(canvas, marksEl, onPick) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const fig = new THREE.Group(); scene.add(fig);

  // standing human from the MakeHuman base mesh (CC0, same source as the Apex Surgery body map), built by
  // tools/body_from_apex.py: metres, feet at 0, facing +z, scaled to scene units
  const S = 2.5, Y0 = -2.0;
  const H = (x, y, z) => new THREE.Vector3(x * S, y * S + Y0, z * S);
  const bodyMat = glass();
  const skinMat = new THREE.PointsMaterial({ color: 0xff8f86, size: 0.02, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
  const tmp = new THREE.Vector3();
  fetch(new URL('../assets/figure.bin', import.meta.url)).then((r) => r.arrayBuffer()).then((buf) => {
    const [nv, ni] = new Uint32Array(buf, 0, 2);
    const pos = new Int16Array(buf, 8, nv * 3), nrm = new Int8Array(buf, 8 + nv * 6, nv * 3);
    const off = Math.ceil((8 + nv * 9) / 4) * 4;
    const idx = nv < 65536 ? new Uint16Array(buf, off, ni) : new Uint32Array(buf, off, ni);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos, (v) => v / 16000), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(nrm, (v) => v / 127), 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const body = new THREE.Mesh(g, bodyMat);
    body.scale.setScalar(S); body.position.y = Y0; fig.add(body);
    // skin: dots across the surface
    const pts = [];
    for (let i = 0; i < nv; i += 3) pts.push(pos[i * 3] / 16000 + nrm[i * 3] / 127 * 0.004, pos[i * 3 + 1] / 16000 + nrm[i * 3 + 1] / 127 * 0.004, pos[i * 3 + 2] / 16000 + nrm[i * 3 + 2] / 127 * 0.004);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const dots = new THREE.Points(sg, skinMat); dots.scale.setScalar(S); dots.position.y = Y0; fig.add(dots);
  });

  const organMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, roughness: 0.35, transparent: true, opacity: 0.9 });

  // joints: shoulders, wrists and knees
  const joints = new THREE.Group(); fig.add(joints);
  const jm = organMat(0xff6a62);
  [[-0.19, 1.33, 0.0], [0.19, 1.33, 0.0], [-0.415, 1.03, 0.1], [0.415, 1.03, 0.1], [-0.13, 0.457, 0.01], [0.13, 0.457, 0.01]].forEach(([x, y, z]) => {
    const c = H(x, y, z);
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), jm); s1.position.copy(c); joints.add(s1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 48), jm); ring.position.copy(c); ring.rotation.x = Math.PI / 2; joints.add(ring);
  });

  // heart
  const heart = new THREE.Group(); fig.add(heart);
  const hm = organMat(0xe2342c);
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), hm); h1.position.set(-0.042, 0.035, 0);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), hm); h2.position.set(0.042, 0.035, 0);
  const h3 = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.18, 32), hm); h3.position.set(0, -0.07, 0); h3.rotation.z = Math.PI;
  heart.add(h1, h2, h3); heart.position.copy(H(0.03, 1.2, 0.03)); heart.rotation.z = 0.35;

  // liver
  const lm = organMat(0x9e2a24);
  const liver = new THREE.Mesh(new THREE.SphereGeometry(0.15, 40, 24), lm);
  liver.scale.set(1.4, 0.72, 0.85); liver.rotation.z = -0.22; liver.position.copy(H(-0.06, 1.075, 0.03)); fig.add(liver);

  // metabolism: particles orbiting the belly
  const metab = new THREE.Group(); metab.position.copy(H(0, 0.98, 0.03)); fig.add(metab);
  const mp = []; for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = 0.12 + Math.random() * 0.16; mp.push(Math.cos(a) * r, (Math.random() - 0.5) * 0.18, Math.sin(a) * r * 0.6); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
  const mMat = new THREE.PointsMaterial({ color: 0xffb3a8, size: 0.028, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  metab.add(new THREE.Points(mg, mMat));
  const core = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 12, 64), organMat(0xff8a6b)); core.rotation.x = Math.PI / 2; metab.add(core);

  // mind
  const bg = new THREE.IcosahedronGeometry(0.15, 5);
  const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) { tmp.fromBufferAttribute(bp, i); const n = 1 + 0.06 * Math.sin(tmp.x * 68) * Math.sin(tmp.y * 56) * Math.sin(tmp.z * 63); tmp.multiplyScalar(n); bp.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  bg.computeVertexNormals();
  const brain = new THREE.Mesh(bg, organMat(0xd9483f)); brain.scale.set(0.92, 0.78, 1.05); brain.position.copy(H(0, 1.555, 0.035)); fig.add(brain);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const l1 = new THREE.PointLight(0xffd0c8, 30, 20); l1.position.set(2, 3, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xff5a50, 18, 20); l2.position.set(-3, -1, 2); scene.add(l2);

  const organs = [
    { at: H(-0.33, 1.13, 0.06), mats: [], cam: [0.5, 0.15, 7.1], look: [0, 0.05, 0] },
    { at: H(0.13, 0.457, 0.06), mats: [jm], cam: [2.4, 0.3, 5.8], look: [0.35, -0.1, 0] },
    { at: H(0.03, 1.2, 0.08), mats: [hm], cam: [0.8, 1.2, 2.8], look: [0.07, 0.98, 0] },
    { at: H(-0.06, 1.075, 0.07), mats: [lm], cam: [-1.0, 0.9, 2.9], look: [-0.12, 0.68, 0] },
    { at: H(0, 0.98, 0.11), mats: [core.material], cam: [0.6, 0.7, 3.2], look: [0, 0.45, 0] },
    { at: H(0, 1.56, 0.1), mats: [brain.material], cam: [0.8, 2.15, 3.0], look: [0, 1.75, 0] },
  ];
  const labels = ['Skin', 'Joints', 'Heart', 'Liver', 'Metabolism', 'Mind'];
  const marks = labels.map((t, i) => {
    const b = document.createElement('button');
    b.className = 'mark'; b.type = 'button'; b.innerHTML = `<i></i><span>${t}</span>`;
    b.setAttribute('aria-label', `Show ${t}`);
    b.addEventListener('click', () => onPick && onPick(i));
    marksEl.appendChild(b); return b;
  });

  let step = 0, offX = 0;
  const camPos = new THREE.Vector3(0.5, 0.15, 7.1), camLook = new THREE.Vector3(0, 0.05, 0);
  const wantPos = camPos.clone(), wantLook = camLook.clone();

  function setStep(i) {
    step = i;
    wantPos.set(...organs[i].cam); wantLook.set(...organs[i].look);
    marks.forEach((m, k) => m.classList.toggle('on', k === i));
  }
  setStep(0);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    offX = w > 820 ? w * 0.14 : -w * 0.2;
    if (offX) camera.setViewOffset(w, h, offX, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let rot = 0, rotT = 0, drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, r: rotT }; });
  addEventListener('pointermove', (e) => { if (drag) rotT = drag.r + (e.clientX - drag.x) * 0.006; });
  addEventListener('pointerup', () => { drag = null; });

  let visible = false, last = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = performance.now(); }).observe(canvas);
  const v = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    const k = Math.min(1, dt * 2.4);
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);
    if (!drag && !reduce) rotT += dt * (step === 0 ? 0.12 : 0);
    if (step !== 0 && !drag) rotT += (0 - rotT) * Math.min(1, dt * 1.5);
    rot += (rotT - rot) * Math.min(1, dt * 5);
    fig.rotation.y = rot;

    // highlight the active organ
    organs.forEach((o, i) => o.mats.forEach((m) => {
      const on = i === step;
      m.emissiveIntensity += ((on ? 1.6 + Math.sin(t * 4) * 0.4 : 0.25) - m.emissiveIntensity) * k;
      m.opacity += ((on ? 1 : 0.35) - m.opacity) * k;
    }));
    skinMat.opacity += ((step === 0 ? 0.95 : 0.18) - skinMat.opacity) * k;
    bodyMat.uniforms.uAlpha.value += ((step === 0 ? 1 : 0.7) - bodyMat.uniforms.uAlpha.value) * k;
    const beat = 1 + Math.max(0, Math.sin(t * 7.5)) * 0.07 * (step === 2 ? 1.5 : 0.6);
    heart.scale.setScalar(beat);
    if (!reduce) metab.rotation.y += dt * (step === 4 ? 1.4 : 0.4);

    renderer.render(scene, camera);

    // place the HTML markers
    const w = canvas.clientWidth, h = canvas.clientHeight;
    organs.forEach((o, i) => {
      v.copy(o.at).applyMatrix4(fig.matrixWorld).project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const hide = v.z > 1 || x < 0 || x > w || y < 0 || y > h;
      marks[i].style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      marks[i].style.visibility = hide || (step !== 0 && i !== step) ? 'hidden' : 'visible';
    });
  }
  requestAnimationFrame(frame);
  return { setStep };
}
