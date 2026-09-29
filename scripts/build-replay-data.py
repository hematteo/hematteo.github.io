"""Compact Pythia-1B trajectories for the homepage's animated Figure 1.

Reads public/research/trajectories.json (all 1,200 sampled curves, normalised
to each feature's own peak) and writes public/research/trajectory-replay.json
with values quantised to 0-255 and base64-encoded, curve-major.
"""

import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "public" / "research"
model = next(
    m
    for m in json.loads((root / "trajectories.json").read_text())["models"]
    if m["name"] == "Pythia-1B"
)
values = bytes(
    round(min(max(v, 0.0), 1.0) * 255) for curve in model["curves"] for v in curve["v"]
)
out = {
    "name": model["name"],
    "steps": model["steps"],
    "peaks": [curve["peak"] for curve in model["curves"]],
    "values": base64.b64encode(values).decode(),
}
(root / "trajectory-replay.json").write_text(
    json.dumps(out, separators=(",", ":")) + "\n"
)
print(
    f"{len(model['curves'])} curves x {len(model['steps'])} steps -> {len(values)} bytes"
)
