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

  // torso: lathe profile from waist to neck, flattened front to back
  const prof = [
    [0.0, -1.75], [0.6, -1.75], [0.63, -1.35], [0.66, -0.85], [0.68, -0.35], [0.73, 0.1], [0.78, 0.5],
    [0.9, 0.78], [0.99, 0.95], [0.95, 1.08], [0.72, 1.18], [0.36, 1.26], [0.23, 1.36], [0.21, 1.58], [0.0, 1.62],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torsoGeo = new THREE.LatheGeometry(prof, 72);
  const torso = new THREE.Mesh(torsoGeo, glass());
  torso.scale.set(1, 1, 0.6); fig.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32), glass());
  head.scale.set(0.86, 1.12, 0.98); head.position.y = 1.98; fig.add(head);

  // skin: dots across the surface
  const pts = [];
  const tmp = new THREE.Vector3();
  const pos = torsoGeo.attributes.position;
  for (let i = 0; i < pos.count; i += 2) { tmp.fromBufferAttribute(pos, i); if (Math.abs(tmp.x) + Math.abs(tmp.z) > 0.05) pts.push(tmp.x * 1.01, tmp.y, tmp.z * 0.6 * 1.01); }
  const skinGeo = new THREE.BufferGeometry(); skinGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const skinMat = new THREE.PointsMaterial({ color: 0xff8f86, size: 0.022, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
  fig.add(new THREE.Points(skinGeo, skinMat));

  const organMat = (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, roughness: 0.35, transparent: true, opacity: 0.9 });

  // joints
  const joints = new THREE.Group(); fig.add(joints);
  const jm = organMat(0xff6a62);
  [[-0.86, 0.9], [0.86, 0.9], [-0.42, -1.62], [0.42, -1.62]].forEach(([x, y]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), jm); s.position.set(x, y, 0); joints.add(s);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 48), jm); ring.position.set(x, y, 0); ring.rotation.y = Math.PI / 2; joints.add(ring);
  });

  // heart
  const heart = new THREE.Group(); fig.add(heart);
  const hm = organMat(0xe2342c);
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), hm); h1.position.set(-0.07, 0.06, 0);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 24), hm); h2.position.set(0.07, 0.06, 0);
  const h3 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 32), hm); h3.position.set(0, -0.12, 0); h3.rotation.z = Math.PI;
  heart.add(h1, h2, h3); heart.position.set(0.14, 0.38, 0.12); heart.rotation.z = 0.35;

  // liver
  const lm = organMat(0x9e2a24);
  const liver = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 24), lm);
  liver.scale.set(1.3, 0.72, 0.8); liver.rotation.z = -0.22; liver.position.set(-0.24, -0.18, 0.06); fig.add(liver);

  // metabolism: particles orbiting the belly
  const metab = new THREE.Group(); metab.position.set(0, -0.85, 0.02); fig.add(metab);
  const mp = []; for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 0.25; mp.push(Math.cos(a) * r, (Math.random() - 0.5) * 0.3, Math.sin(a) * r * 0.6); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3));
  const mMat = new THREE.PointsMaterial({ color: 0xffb3a8, size: 0.04, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  metab.add(new THREE.Points(mg, mMat));
  const core = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 64), organMat(0xff8a6b)); core.rotation.x = Math.PI / 2; metab.add(core);

  // mind
  const bg = new THREE.IcosahedronGeometry(0.27, 5);
  const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) { tmp.fromBufferAttribute(bp, i); const n = 1 + 0.06 * Math.sin(tmp.x * 38) * Math.sin(tmp.y * 31) * Math.sin(tmp.z * 35); tmp.multiplyScalar(n); bp.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  bg.computeVertexNormals();
  const brain = new THREE.Mesh(bg, organMat(0xff9d94)); brain.scale.set(1, 0.85, 1.1); brain.position.set(0, 2.05, 0); fig.add(brain);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const l1 = new THREE.PointLight(0xffd0c8, 30, 20); l1.position.set(2, 3, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xff5a50, 18, 20); l2.position.set(-3, -1, 2); scene.add(l2);

  const organs = [
    { obj: null, at: new THREE.Vector3(0.62, -0.2, 0.25), mats: [], cam: [0.4, 0.3, 7.6], look: [0, 0.2, 0] },
    { obj: joints, at: new THREE.Vector3(0.86, 0.9, 0), mats: [jm], cam: [2.6, 1.4, 4.6], look: [0.4, 0.6, 0] },
    { obj: heart, at: new THREE.Vector3(0.14, 0.38, 0.12), mats: [hm], cam: [1.0, 0.7, 3.6], look: [0.1, 0.35, 0] },
    { obj: liver, at: new THREE.Vector3(-0.24, -0.18, 0.06), mats: [lm], cam: [-1.3, 0.2, 3.8], look: [-0.2, -0.15, 0] },
    { obj: metab, at: new THREE.Vector3(0, -0.85, 0.2), mats: [core.material], cam: [0.7, -0.3, 4.0], look: [0, -0.7, 0] },
    { obj: brain, at: new THREE.Vector3(0, 2.05, 0.1), mats: [brain.material], cam: [1.0, 2.3, 3.4], look: [0, 1.9, 0] },
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
  const camPos = new THREE.Vector3(0.4, 0.3, 7.6), camLook = new THREE.Vector3(0, 0.2, 0);
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
    offX = w > 820 ? w * 0.1 : -w * 0.2;
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
    torso.material.uniforms.uAlpha.value += ((step === 0 ? 1 : 0.7) - torso.material.uniforms.uAlpha.value) * k;
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
      marks[i].style.visibility = hide ? 'hidden' : 'visible';
    });
  }
  requestAnimationFrame(frame);
  return { setStep };
}
