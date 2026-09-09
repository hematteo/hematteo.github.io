"""Build accessible feature cards from the paper's CSV and cached decoder norms.

Usage: python3 scripts/export-feature-examples.py LRO_DIRECTORY OUTPUT_FRAGMENT
"""
import csv
import html
import json
import sys
from pathlib import Path
import numpy as np

root = Path(sys.argv[1])
rows = {int(r['feature_id']): r for r in csv.DictReader((root / 'learning-to-read-out-code/paper/figure_data/feature_interpretation/feature_cards_representative.csv').open())}
norms = np.load(root / 'unembedding_development/figures/feature_lifecycle_trajectories/section52_lifecycle/cache/pythia1b_d24576_decoder_norms.npy', allow_pickle=False)
steps = json.loads((Path(__file__).resolve().parents[1] / 'public/research/trajectories.json').read_text())['models'][1]['steps']
cards = []
for feature, title in [(1227,'Quantity words'), (15921,'Chemistry fragments'), (2228,'Cell biology fragments')]:
    row = rows[feature]
    values = norms[:,feature] / norms[:,feature].max()
    peak = int(row['peak_step'])
    assert steps[int(values.argmax())] == peak
    assert abs(float(norms[:,feature].max())-float(row['norm_peak'])) < 1e-6
    x = lambda s: 46 + np.log10(max(s,1))/np.log10(143000)*608
    y = lambda v: 223 - float(v)*184
    points = ' '.join(f'{x(s):.2f},{y(v):.2f}' for s,v in zip(steps[1:],values[1:]))
    grid = ''.join(f'<line x1="46" y1="{y(v)}" x2="654" y2="{y(v)}" stroke="#e6ebe4"/><text x="35" y="{y(v)+4}" text-anchor="end">{v:g}</text>' for v in [0,.5,1])
    ticks = ''.join(f'<text x="{x(s)}" y="246" text-anchor="{anchor}">{label}</text>' for s,label,anchor in [(1,'1','start'),(100,'100','middle'),(1000,'1k','middle'),(14000,'14k','middle'),(143000,'143k','end')])
    cards.append(f'''<article class="feature-example" id="feature-{feature}" aria-labelledby="feature-title-{feature}">
      <div class="feature-example-heading"><h3 id="feature-title-{feature}">{title}</h3><p>Pythia-1B · Feature {feature:,} · Peak at step {peak:,}</p></div>
      <svg viewBox="0 0 680 280" role="img" aria-labelledby="feature-svg-{feature}"><title id="feature-svg-{feature}">{title}: measured decoder norm relative to its peak, across training. Peak at step {peak:,}.</title><g fill="#68746b" font-family="DM Sans, sans-serif" font-size="12"><text x="46" y="19">Decoder norm / own peak</text>{grid}{ticks}<text x="654" y="272" text-anchor="end">Training step · log scale</text></g><polyline points="{points}" fill="none" stroke="#28735a" stroke-width="2.5" stroke-linejoin="round"/><circle cx="{x(peak):.2f}" cy="39" r="4" fill="#28735a"/></svg>
      ''')
    cards.append(f'<p class="stage-readout" aria-live="polite">Peak · step {peak:,} · relative norm 1.000</p><div class="feature-tokens">')
    for key,label,step in [('early_tokens','Early',16),('peak_tokens','Peak',peak),('final_tokens','Final',143000)]:
        # Token display strings come from the paper CSV. Trim boundary whitespace
        # for readability; retain ordering and token fragments without expansion.
        tokens = [token.strip() for token in row[key].split(',')]
        tags = ''.join(f'<span>{html.escape(token)}</span>' for token in tokens)
        value = float(values[steps.index(step)])
        cards.append(f'<section class="token-stage"><h4>{label} <span>Step {step:,}</span></h4><button hidden type="button" class="stage-button" data-x="{x(step):.2f}" data-y="{y(value):.2f}" data-stage="{label}" data-step="{step}" data-value="{value:.3f}" aria-pressed="{str(label == "Peak").lower()}">{label}<span>Step {step:,}</span></button><div class="token-list">{tags}</div></section>')
    cards.append('</div></article>')
Path(sys.argv[2]).write_text('\n'.join(cards))
print('Exported three verified feature examples.')
