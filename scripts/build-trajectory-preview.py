"""Rebuild the homepage PNG from the existing measured explorer sample.

Chart contract: line ensemble of decoder norm / own peak over training steps.
Question: how do output-weight features change during training?
Surface: static 840x520 homepage preview, displayed at roughly 300px wide.
Data: all 1,200 exported Pythia-1B sample curves, 31 positive checkpoints.
No further sampling/smoothing; step zero omitted on the logarithmic axis,
as in the full explorer. Shape is the comparison, so all lines share one
site-green color; color does not encode a second variable. Full data and
other models remain accessible in the linked explorer.
"""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import NullLocator

root=Path(__file__).resolve().parents[1]
m=next(m for m in json.loads((root/'public/research/trajectories.json').read_text())['models'] if m['name']=='Pythia-1B')
assert len(m['curves'])==1200
steps=m['steps'][1:]
assert all(x>0 for x in steps)
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.labelcolor':'#626963','text.color':'#252a28','xtick.color':'#626963','ytick.color':'#626963'})
fig,ax=plt.subplots(figsize=(4.2,2.6),dpi=200)
fig.subplots_adjust(left=.11,right=.97,bottom=.24,top=.73)
for c in m['curves']:
 assert len(c['v'])==len(m['steps']) and all(0<=v<=1 for v in c['v'])
 ax.plot(steps,c['v'][1:],color='#245d50',alpha=.065,lw=.65)
ax.set_xscale('log');ax.set_xlim(1,143000);ax.set_ylim(0,1.02)
ax.set_xticks([1,100,10000,143000],['1','100','10k','143k'])
ax.get_xticklabels()[0].set_horizontalalignment('left')
ax.get_xticklabels()[-1].set_horizontalalignment('right')
ax.xaxis.set_minor_locator(NullLocator())
ax.set_yticks([0,.5,1],['0','0.5','1'])
ax.set_axisbelow(True);ax.grid(axis='y',color='#e7e9e3',lw=.6)
ax.tick_params(length=0,pad=5,labelsize=10)
for side in ['top','right']:ax.spines[side].set_visible(False)
for side in ['bottom','left']:ax.spines[side].set_color('#ccd2c9');ax.spines[side].set_linewidth(.6)
ax.set_xlabel('Training step · log scale',labelpad=7,fontsize=10)
fig.text(.11,.92,'Pythia-1B',fontsize=12,weight='medium')
fig.text(.11,.81,'Decoder norm / own peak',fontsize=10,color='#626963')
fig.savefig(root/'public/research/trajectory-preview.png',facecolor='white')
plt.close(fig)
print('Rendered 1,200 measured curves across 31 positive checkpoints to trajectory-preview.png')
