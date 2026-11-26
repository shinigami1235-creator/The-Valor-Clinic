// Hero: a 3D block of skin. Cells are born in the bottom layer, rise, flatten and shed at the surface.
// Normal skin turns over in about 28 days. Psoriasis skin does it in 4 (Valor Clinic, "What causes psoriasis?").
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/addons/RoundedBoxGeometry.js';

const C = (h) => new THREE.Color(h);
const PAL = {
  normal: { base: C('#e9a39b'), mid: C('#f3cdbf'), top: C('#f8ece4'), flake: C('#efe4dc') },
  psor: { base: C('#d9473f'), mid: C('#ec8c80'), top: C('#f1f1ef'), flake: C('#fbfbfa') },
};

export function initSkin(canvas, onTick) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer:coarse)').matches ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xf0c9bf, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(5, 9, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd7cf, 1.2); rim.position.set(-6, 3, -5); scene.add(rim);

  const root = new THREE.Group(); scene.add(root);
  const slab = new THREE.Group(); root.add(slab);

  // sizes
  const NX = 15, NZ = 9, N = 9, S = 0.4, W = NX * S, D = NZ * S, CYCLE = 1.3;

  // soft floor shadow
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const g = sc.getContext('2d'); const rg = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  rg.addColorStop(0, 'rgba(122,23,19,.30)'); rg.addColorStop(1, 'rgba(122,23,19,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, D * 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.32; slab.add(shadow);

  // dermis (translucent so the blood vessels show through)
  const dermis = new THREE.Mesh(
    new RoundedBoxGeometry(W + 0.12, 1.2, D + 0.12, 4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xf0bdb2, roughness: 0.6, transparent: true, opacity: 0.78, depthWrite: false })
  );
  dermis.position.y = -0.62; slab.add(dermis);
  const fat = new THREE.Mesh(
    new RoundedBoxGeometry(W + 0.12, 0.34, D + 0.12, 4, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xf6dfa9, roughness: 0.7 })
  );
  fat.position.y = -1.18; slab.add(fat);

  // capillary loops reaching up into the dermal papillae
  const capMat = new THREE.MeshStandardMaterial({ color: 0xc72d27, emissive: 0x5a0805, roughness: 0.4 });
  const caps = new THREE.Group(); slab.add(caps);
  const capList = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
    const x = -W / 2 + 0.55 + i * ((W - 1.1) / 6) + (j % 2) * 0.25;
    const z = -D / 2 + 0.55 + j * ((D - 1.1) / 2);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.09, -1.0, 0), new THREE.Vector3(-0.08, -0.4, 0), new THREE.Vector3(-0.05, -0.05, 0),
      new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0.05, -0.05, 0), new THREE.Vector3(0.08, -0.4, 0), new THREE.Vector3(0.09, -1.0, 0),
    ]);
    const tg = new THREE.TubeGeometry(curve, 24, 0.022, 6); tg.translate(0, 1.0, 0);
    const m = new THREE.Mesh(tg, capMat);
    m.position.set(x, -1.06, z); caps.add(m); capList.push(m);
  }

  // keratinocytes
  const geo = new RoundedBoxGeometry(1, 1, 1, 2, 0.22);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.48, metalness: 0.0 });
  const COUNT = NX * NZ * N;
  const cells = new THREE.InstancedMesh(geo, mat, COUNT);
  cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  slab.add(cells);
  const cols = [];
  for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) {
    cols.push({
      x: -W / 2 + S / 2 + ix * S + (Math.random() - 0.5) * 0.03,
      z: -D / 2 + S / 2 + iz * S + (Math.random() - 0.5) * 0.03,
      j: Math.random() * 0.06, r: Math.random() * Math.PI * 2, ix, iz,
    });
  }
  const trackCol = cols.findIndex((c) => c.ix === 7 && c.iz === NZ - 1);

  // outline that follows one cell so the day counter has something to point at
  const tracker = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xd13a35, transparent: true, depthTest: false })
  );
  tracker.renderOrder = 10; slab.add(tracker);
  const glow = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.22), new THREE.MeshBasicMaterial({ color: 0xd13a35, transparent: true, opacity: 0.9 }));
  slab.add(glow);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), SC = new THREE.Vector3();
  const col = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();

  let phase = 0.15, mix = 0, target = 0, last = performance.now();
  let rotY = -0.55, rotTarget = -0.55, drag = null, tilt = 0, px = 0, py = 0;

  function grad(pal, u, out) {
    if (u < 0.55) return out.copy(pal.base).lerp(pal.mid, u / 0.55);
    return out.copy(pal.mid).lerp(pal.top, Math.min(1, (u - 0.55) / 0.45));
  }

  function update(dt) {
    mix += (target - mix) * Math.min(1, dt * 1.6);
    const cycleSec = THREE.MathUtils.lerp(reduce ? 40 : 15, reduce ? 12 : 15 / 7, mix);
    phase += dt / cycleSec;
    const H = THREE.MathUtils.lerp(1.05, 2.35, mix);
    const p = THREE.MathUtils.lerp(1.85, 1.25, mix);
    const du = CYCLE / N;
    let tracked = null;

    let i = 0;
    for (let c = 0; c < cols.length; c++) {
      const cl = cols[c];
      for (let k = 0; k < N; k++, i++) {
        let u = (phase + k * du + cl.j) % CYCLE;
        if (u < 0) u += CYCLE;
        let sx, sy, y, x = cl.x, z = cl.z, rx = 0, rz = 0;
        if (u < 1) {
          const f = 1 - Math.pow(1 - u, p);
          const fp = p * Math.pow(Math.max(1 - u, 1e-4), p - 1);
          sy = Math.max(0.045, Math.min(S * 0.95, H * fp * du * 0.98));
          sx = S * THREE.MathUtils.lerp(0.86, 1.02, u);
          y = H * f + sy / 2;
          const grow = Math.min(1, u / 0.05);
          sx *= grow; sy *= grow;
          grad(PAL.normal, u, cA); grad(PAL.psor, u, cB);
        } else {
          // shedding
          const v = (u - 1) / (CYCLE - 1);
          const keep = THREE.MathUtils.lerp(Math.pow(1 - v, 2.5), 1 - Math.pow(v, 3), mix);
          sx = S * THREE.MathUtils.lerp(0.95, 1.12, mix) * keep;
          sy = THREE.MathUtils.lerp(0.035, 0.06, mix) * Math.max(keep, 0.2);
          y = H + 0.05 + v * THREE.MathUtils.lerp(0.9, 0.55, mix);
          x += Math.sin(cl.r + v * 3) * v * 0.35;
          z += Math.cos(cl.r * 1.3 + v * 2) * v * 0.25;
          rx = Math.sin(cl.r) * v * 0.9; rz = Math.cos(cl.r) * v * 0.9;
          cA.copy(PAL.normal.flake); cB.copy(PAL.psor.flake);
        }
        col.copy(cA).lerp(cB, mix);
        P.set(x, y, z); E.set(rx, 0, rz); Q.setFromEuler(E); SC.set(sx, sy, sx);
        M.compose(P, Q, SC);
        cells.setMatrixAt(i, M); cells.setColorAt(i, col);
        if (c === trackCol && k === 0) tracked = { u, M: M.clone() };
      }
    }
    cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;

    // tracker
    if (tracked) {
      tracker.matrix.copy(tracked.M); tracker.matrixAutoUpdate = false;
      glow.matrix.copy(tracked.M).scale(new THREE.Vector3(1.02, 1.02, 1.02)); glow.matrixAutoUpdate = false;
      const alive = tracked.u < 1;
      tracker.material.opacity = alive ? 1 : 0;
      glow.material.opacity = alive ? 0.92 : Math.max(0, 0.9 - (tracked.u - 1) * 6);
      const days = target ? 4 : 28;
      onTick && onTick({ day: alive ? Math.min(days, Math.floor(tracked.u * days) + 1) : days, days, progress: Math.min(1, tracked.u), shed: !alive });
    }

    // vessels: dilate and stretch with psoriasis
    capList.forEach((m) => { m.scale.set(1 + mix * 0.7, 1 + mix * 0.55, 1 + mix * 0.7); });
    capMat.emissive.setRGB(0.35 * (0.3 + mix * 0.7), 0.03, 0.02);
  }

  // layout
  let mobile = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    mobile = w < 820;
    const wide = camera.aspect > 1.25;
    camera.fov = mobile ? 34 : 30;
    camera.position.set(0, mobile ? 5.2 : 4.4, mobile ? 12.4 : 11.2);
    camera.lookAt(0, mobile ? -0.15 : 0.55, 0);
    root.position.set(wide ? 1.75 : 0, wide ? 0.1 : 0, 0);
    root.scale.setScalar(mobile ? 0.86 : wide ? 0.88 : 1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // drag to turn the block
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, r: rotTarget }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
    if (drag) rotTarget = drag.r + (e.clientX - drag.x) * 0.008;
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  let visible = true, running = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !running) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag && !reduce) rotTarget += dt * 0.05 * Math.sin(now / 5200);
    rotY += (rotTarget - rotY) * Math.min(1, dt * 4);
    tilt += ((py * 0.12) - tilt) * Math.min(1, dt * 3);
    slab.rotation.y = rotY + px * 0.18;
    slab.rotation.x = tilt;
    update(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setMode(m) { target = m === 'psoriasis' ? 1 : 0; },
  };
}
