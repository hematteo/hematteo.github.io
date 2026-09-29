"""Export a deterministic sample of the paper's measured decoder norm curves.

Usage: python3 scripts/export-trajectories.py /path/to/section52_lifecycle/cache
Matches plot_normalized_trajectories.py: active peak > .01, each curve divided
by its own peak. Uniform ranks in peak-step order preserve population shares.
"""
import json
import sys
from pathlib import Path
import numpy as np

cache = Path(sys.argv[1])
steps = [0,1,2,4,8,16,32,64,128,256,512,1000,2000,3000,4000,5000,
         6000,7000,8000,9000,14000,21000,27000,34000,47000,61000,75000,
         89000,102000,116000,130000,143000]
olmo = [150,600,700,850,900,1000,2000,3000,4000,5000,6000,7000,8000,
        9000,14000,21000,27000,34000,47000,110000,173000,236000,299000,
        362000,425000,488000,614000,677000,740000,803000,866000,928000]
models = []
for key, name, checkpoints in [
    ('pythia160m_d24576', 'Pythia-160M', steps),
    ('pythia1b_d24576', 'Pythia-1B', steps),
    ('pythia69b_d32768', 'Pythia-6.9B', steps),
    ('olmo2_7b_d32768', 'OLMo-2-7B', olmo),
]:
    norms = np.load(cache / (key + '_decoder_norms.npy'), allow_pickle=False)
    assert norms.shape[0] == len(checkpoints) and np.isfinite(norms).all()
    peaks = norms.max(axis=0)
    active = np.flatnonzero(peaks > .01)
    ordered = active[np.argsort(norms[:, active].argmax(axis=0), kind='stable')]
    selected = ordered[np.linspace(0, len(ordered)-1, min(1200,len(ordered))).astype(int)]
    curves = []
    for feature in selected:
        values = norms[:, feature] / peaks[feature]
        assert np.all((values >= 0) & (values <= 1.00001))
        curves.append({'id':int(feature), 'peak':int(checkpoints[int(values.argmax())]),
                       'v':np.round(values.astype(float),4).tolist()})
    models.append({'name':name, 'steps':checkpoints, 'total':len(active), 'curves':curves})
out = Path(__file__).resolve().parents[1] / 'public/research/trajectories.json'
out.write_text(json.dumps({'models':models}, separators=(',',':')))
print(f'Exported {sum(len(m["curves"]) for m in models)} measured curves; {out.stat().st_size:,} bytes')
