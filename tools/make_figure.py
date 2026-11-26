"""Builds the standing human for "Look Beyond Your Skin" from blended body parts (signed distance
fields), then writes assets/figure.bin. Units are metres, 1.75 m tall, facing +z, y up.
Run: python3 tools/make_figure.py
Layout of figure.bin: uint32 vertex count, uint32 index count, then int16 xyz positions (scaled by
1/16000 m), int8 xyz normals, padding to 4 bytes, uint16 indices (uint32 past 65535 vertices)."""
from pathlib import Path
import numpy as np
from skimage.measure import marching_cubes
import trimesh, fast_simplification

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'figure.bin'


def ell(p, c, r):
    q = (p - c) / r
    k0 = np.linalg.norm(q, axis=-1)
    k1 = np.linalg.norm(q / r, axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def cone(p, a, b, ra, rb):
    """round cone between a and b (radii ra, rb)"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    h = np.clip(((p - a) @ ba) / (ba @ ba), 0, 1)
    d = np.linalg.norm(p - a - h[..., None] * ba, axis=-1)
    return d - (ra + (rb - ra) * h)


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def body(p):
    E = lambda c, r: ell(p, np.array(c), np.array(r))
    parts = []
    # head, jaw, neck
    parts += [(E([0, 1.625, 0.0], [0.074, 0.1, 0.092]), 0.02),
              (cone(p, [0, 1.6, 0.02], [0, 1.535, 0.05], 0.058, 0.028), 0.03),
              (E([0, 1.655, 0.07], [0.012, 0.025, 0.02]), 0.012),            # nose
              (cone(p, [0, 1.43, -0.005], [0, 1.57, -0.01], 0.056, 0.05), 0.03)]
    # torso
    parts += [(E([0, 1.285, -0.005], [0.155, 0.165, 0.105]), 0.05),
              (cone(p, [-0.15, 1.415, -0.02], [0.15, 1.415, -0.02], 0.042, 0.042), 0.06),
              (E([0.065, 1.31, 0.045], [0.08, 0.055, 0.04]), 0.04), (E([-0.065, 1.31, 0.045], [0.08, 0.055, 0.04]), 0.04),
              (E([0, 1.08, 0.0], [0.13, 0.15, 0.092]), 0.06),
              (E([0, 0.94, -0.005], [0.165, 0.1, 0.105]), 0.05),
              (E([0.075, 0.9, -0.055], [0.085, 0.09, 0.07]), 0.04), (E([-0.075, 0.9, -0.055], [0.085, 0.09, 0.07]), 0.04)]
    for s in (1, -1):
        # shoulder, arm hanging slightly out, elbow bent a little forward, palm facing the thigh
        sh, el, wr = [s * 0.185, 1.385, -0.01], [s * 0.245, 1.115, -0.025], [s * 0.275, 0.865, 0.02]
        parts += [(E(sh, [0.05, 0.056, 0.052]), 0.045),
                  (cone(p, sh, el, 0.047, 0.035), 0.03),
                  (E([s * 0.215, 1.25, -0.008], [0.04, 0.075, 0.042]), 0.025),   # biceps and triceps
                  (cone(p, el, wr, 0.037, 0.024), 0.02),
                  (E([s * 0.255, 1.03, -0.01], [0.04, 0.07, 0.04]), 0.02),      # forearm muscle
                  (E([s * 0.287, 0.8, 0.035], [0.02, 0.058, 0.04]), 0.018),     # hand
                  (cone(p, [s * 0.278, 0.835, 0.06], [s * 0.274, 0.795, 0.078], 0.015, 0.012), 0.015)]  # thumb
        # leg: hip, knee straight, ankle, foot flat on the floor
        hp, kn, an = [s * 0.092, 0.88, 0.0], [s * 0.098, 0.49, 0.008], [s * 0.1, 0.085, -0.02]
        parts += [(cone(p, hp, kn, 0.088, 0.05), 0.05),
                  (E([s * 0.1, 0.68, 0.012], [0.07, 0.15, 0.07]), 0.04),          # thigh muscle
                  (E([s * 0.098, 0.49, 0.03], [0.04, 0.04, 0.03]), 0.02),          # kneecap
                  (cone(p, kn, an, 0.047, 0.028), 0.03),
                  (E([s * 0.102, 0.35, -0.025], [0.045, 0.09, 0.05]), 0.03),        # calf
                  (cone(p, [s * 0.1, 0.04, -0.035], [s * 0.11, 0.025, 0.125], 0.035, 0.024), 0.03),
                  (E([s * 0.108, 0.03, 0.06], [0.04, 0.025, 0.07]), 0.02)]
    d = parts[0][0]
    for x, k in parts[1:]:
        d = smin(d, x, k)
    return d


def main():
    step = 0.0068
    xs = np.arange(-0.38, 0.38 + step, step)
    ys = np.arange(-0.01, 1.76 + step, step)
    zs = np.arange(-0.2, 0.22 + step, step)
    vol = np.empty((len(xs), len(ys), len(zs)), np.float32)
    Y, Z = np.meshgrid(ys, zs, indexing='ij')
    for i, x in enumerate(xs):
        P = np.stack([np.full_like(Y, x), Y, Z], -1)
        vol[i] = body(P)
    v, f, _, _ = marching_cubes(vol, 0.0, spacing=(step, step, step))
    v += np.array([xs[0], ys[0], zs[0]])
    m = trimesh.Trimesh(v, f, process=True)
    trimesh.smoothing.filter_taubin(m, iterations=20)
    v2, f2 = fast_simplification.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=0.62)
    m = trimesh.Trimesh(v2, f2, process=True)
    m.update_faces(m.nondegenerate_faces()); m.remove_unreferenced_vertices()
    trimesh.smoothing.filter_taubin(m, iterations=3)
    print('verts', len(m.vertices), 'faces', len(m.faces), 'bounds', m.bounds.round(3).tolist())
    pos = np.round(m.vertices * 16000).astype(np.int16)
    nrm = np.round(m.vertex_normals * 127).astype(np.int8)
    idx = m.faces.astype(np.uint16 if len(m.vertices) < 65536 else np.uint32).ravel()
    head = np.array([len(pos), len(idx)], np.uint32).tobytes()
    nb = nrm.tobytes(); pad = (-(8 + pos.nbytes + len(nb))) % 4
    OUT.write_bytes(head + pos.tobytes() + nb + b'\0' * pad + idx.tobytes())
    print('wrote', OUT, OUT.stat().st_size // 1024, 'KB')
    m.export('/tmp/figure.glb')


if __name__ == '__main__':
    main()
