"""Builds assets/figure.bin for "Look Beyond Your Skin" from the Apex Surgery body map's bodies.bin
(MakeHuman base mesh, CC0; see that repo's site/assets/features/bodymap/SOURCE.md).
bodies.bin stores points and edges only, so the triangles are rebuilt from the edges, then the mesh
is subdivided once (Loop) to smooth it. Shape: halfway between the female and male bodies.
Run: python3 tools/body_from_apex.py <path to bodies.bin>
Layout of figure.bin: uint32 vertex count, uint32 index count, int16 xyz positions (metres x 16000),
int8 xyz normals, padding to 4 bytes, uint16 indices."""
import sys
from collections import defaultdict, Counter
from pathlib import Path
import numpy as np, trimesh

src = Path(sys.argv[1]); out = Path(__file__).resolve().parent.parent / 'assets' / 'figure.bin'
buf = src.read_bytes()
n, ne = np.frombuffer(buf, np.uint32, 2)
h = np.frombuffer(buf, np.float32, 18, 8)
pos = lambda off: np.frombuffer(buf, np.int16, n * 3, off).reshape(-1, 3).astype(np.float64) / 32767 * h[3] + h[:3]
V = (pos(80) + pos(80 + n * 6)) / 2
E = np.frombuffer(buf, np.uint16, ne * 2, 80 + n * 12).reshape(-1, 2)

adj = defaultdict(set)
for a, b in E: adj[a].add(b); adj[b].add(a)
T = sorted({tuple(sorted((a, b, c))) for a, b in E for c in adj[a] & adj[b]})
edges = lambda t: ((t[0], t[1]), (t[1], t[2]), (t[0], t[2]))
while True:  # drop triangles that only exist because three edges happen to close a loop
    cnt = Counter(e for t in T for e in edges(t))
    over = [t for t in T if sum(cnt[e] > 2 for e in edges(t)) >= 2]
    if not over: break
    T.remove(max(over, key=lambda t: sum(cnt[e] > 2 for e in edges(t))))

m = trimesh.Trimesh(V, np.array(T), process=True)
trimesh.repair.fix_winding(m); trimesh.repair.fix_normals(m)
v, f = trimesh.remesh.subdivide_loop(m.vertices, m.faces, iterations=1)
m = trimesh.Trimesh(v, f, process=True)
m.vertices *= 0.1                      # decimetres to metres
m.vertices[:, 1] -= m.vertices[:, 1].min()
m.vertices[:, 2] -= 0.023              # centre the torso front to back
p = np.round(m.vertices * 16000).astype(np.int16)
nb = np.round(m.vertex_normals * 127).astype(np.int8).tobytes()
pad = (-(8 + p.nbytes + len(nb))) % 4
out.write_bytes(np.array([len(p), m.faces.size], np.uint32).tobytes() + p.tobytes() + nb + b'\0' * pad + m.faces.astype(np.uint16).ravel().tobytes())
print(len(m.vertices), 'vertices', len(m.faces), 'faces', out.stat().st_size // 1024, 'KB')
