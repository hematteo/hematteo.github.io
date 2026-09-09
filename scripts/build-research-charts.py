"""Build native SVG/HTML research figures from paper data, without executing source scripts.
Usage: python3 scripts/build-research-charts.py LRO_DIRECTORY OUTPUT_DIRECTORY
"""
import ast
import csv
import html
import math
import sys
from pathlib import Path

root, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
green, slate, purple, amber = '#28735a', '#5b7082', '#8170a5', '#b17b37'
esc = html.escape

def literal_assignments(path):
    values = {}
    for node in ast.parse(path.read_text()).body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
            try: values[node.targets[0].id] = ast.literal_eval(node.value)
            except (ValueError, TypeError): pass
    return values

def text(x,y,value,anchor='start',extra=''):
    return f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}" {extra}>{esc(str(value))}</text>'

def line(x1,y1,x2,y2,color='#e4eae3',extra=''):
    return f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" {extra}/>'

def dot(x,y,color,title,kind=0):
    title=f'<title>{esc(title)}</title>'
    if kind==1: return f'<rect x="{x-4:.2f}" y="{y-4:.2f}" width="8" height="8" fill="{color}">{title}</rect>'
    if kind==2: return f'<path d="M {x:.2f} {y-5:.2f} l 5 10 h -10 Z" fill="{color}">{title}</path>'
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4" fill="{color}">{title}</circle>'

def svg(body,title,w=340,h=370):
    return f'<svg class="native-svg" viewBox="0 0 {w} {h}" role="img" aria-label="{esc(title)}"><title>{esc(title)}</title>{body}</svg>'

def legend(items):
    return '<ul class="native-legend">'+''.join(f'<li><span style="--series:{color}">{["●","■","▲"][i%3]}</span>{esc(label)}</li>' for i,(label,color) in enumerate(items))+'</ul>'

def table(headers,rows):
    return '<details class="chart-values"><summary>Exact values</summary><div class="table-scroll"><table><thead><tr>'+''.join('<th scope="col">'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(str(v))+'</td>' for v in row)+'</tr>' for row in rows)+'</tbody></table></div></details>'

source=root/'unembedding_development/reports/contrastive_readout_swap_pythia1b_2026-05-05/figures/main_claim_k8_feature_interventions.csv'
values={(r['family'],r['condition']):float(r['accuracy']) for r in csv.DictReader(source.open())}
source_script=root/'unembedding_development/scripts/figures/paper/main/plot_contrastive_task_localization.py'
tree=ast.parse(source_script.read_text())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='hidden_projection_df')
hidden=ast.literal_eval(next(n.value for n in function.body if isinstance(n,ast.Assign) and n.targets[0].id=='rows'))
projection={r[0]:r[1:3] for r in hidden}
families=[('sva','Subject–verb agreement'),('numeric gt','Numeric comparison'),('relational facts','Relational facts*'),('ioi','Indirect object identification')]
cards=[]
for mode,title,labels,colors in [
 ('ablation','Remove selected directions',['Eight selected directions','Norm and rate control','Sign control'],[green,slate,purple]),
 ('preserve','Keep only selected directions',['Eight selected directions','Reconstructed baseline','Sign control'],[green,slate,purple]),
 ('projection','Remove directions from hidden states',['Native baseline','After projection'],[slate,amber]),
]:
    lo,hi=(-50,10) if mode=='ablation' else (0,100)
    x=lambda v:24+(v-lo)/(hi-lo)*290
    body=''; rows=[]
    for tick in ([-40,-20,0] if mode=='ablation' else [0,25,50,75,100]):
        body+=line(x(tick),10,x(tick),298)+text(x(tick),323,f'{tick:g}', 'middle')
    for j,(key,name) in enumerate(families):
        y=28+j*70
        body+=text(24,y,name,extra='class="task-label"')
        if mode=='ablation':
            data=[(values[key,c]-values[key,'recon'])*100 for c in ['ablate top-8','ablate norm/rate ctrl','ablate sign ctrl']]
        elif mode=='preserve': data=[values[key,c]*100 for c in ['preserve top-8','recon','preserve sign ctrl']]
        else: data=[v*100 for v in projection[key]]
        for i,(value,color,label) in enumerate(zip(data,colors,labels)):
            body+=dot(x(value),y+16+i*13,color,f'{name}, {label}: {value:.1f}'+(' percentage points' if mode=='ablation' else '%'),i)
            rows.append([name,label,f'{value:.1f}'])
    unit='Change in accuracy · percentage points' if mode=='ablation' else 'Accuracy · %'
    body+=text(24,352,unit,extra='class="axis-title"')
    cards.append(f'<section class="native-card"><h3>{title}</h3>{legend(list(zip(labels,colors)))}{svg(body,title)}{table(["Task","Condition",unit],rows)}</section>')
(out/'interventions.html').write_text('<div class="native-grid three">'+''.join(cards)+'</div>')

# Retain the source figure's recovered display-space x coordinates and ticks.
# Do not infer a checkpoint schedule from those positions.
d=literal_assignments(root/'Learning_to_Read_Out/figures/readout_coordination/make_sva_availability_expression_69b.py')
x=lambda value:48+value/d['X'][-1]*410
y=lambda value:245-(value-.4)/.65*208
body=''
for tick in [.5,.75,1]: body+=line(48,y(tick),458,y(tick))+text(38,y(tick)+4,f'{tick*100:g}','end')
body+=line(48,y(.5),458,y(.5),slate,'stroke-dasharray="3 4"')
for tx,label in zip(d['TICKS'],d['TICK_LABELS']):
    body+=text(x(tx),270,label,'start' if label=='0' else 'end' if label=='143k' else 'middle', 'class="minor-tick"' if label in ['1','10'] else '')
for i,(key,label,color) in enumerate([('SVA_PROBE','Hidden state probe',green),('SVA_SAME','Native readout',slate),('SVA_BEST','Best swept readout',amber)]):
    assert len(d[key])==len(d['X'])==32 and all(0<=v<=1 for v in d[key])
    pts=' '.join(f'{x(a):.2f},{y(b):.2f}' for a,b in zip(d['X'],d[key]))
    body+=f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" '+('stroke-dasharray="5 4"' if i==2 else '')+'/>'
    for a,b in zip(d['X'],d[key]): body+=dot(x(a),y(b),color,f'{label}: {b*100:.2f}%',i)
body+=text(48,18,'Accuracy · %')+text(458,298,'Training step','end')
timeline=svg(body,'Agreement information is detectable before the native readout expresses it.',480,312)
left='<section class="native-card"><h3>During training</h3>'+legend([('Hidden state probe',green),('Native readout',slate),('Best swept readout',amber)])+timeline+'<p class="chart-note">Dashed horizontal line: 50% chance accuracy. The swept readout is the best alternative checkpoint readout in the sweep.</p></section>'
body=''; rows=[]
names=['Simple agreement','Across a prepositional phrase','Across an object relative clause','Across a subject relative clause']
x=lambda v:30+(v-.4)/.6*410
for tick in [.5,.75,1]: body+=line(x(tick),30,x(tick),268)+text(x(tick),294,f'{tick*100:g}','middle')
for i,((_,probe,readout),name) in enumerate(zip(d['LADDER'],names)):
    y0=32+i*62
    body+=text(30,y0,name)+line(x(readout),y0+24,x(probe),y0+24,'#c2ccc2','stroke-width="4"')
    body+=dot(x(probe),y0+24,green,f'Probe: {probe*100:.2f}%')+dot(x(readout),y0+24,slate,f'Native readout: {readout*100:.2f}%',1)
    rows.append([name,f'{probe*100:.2f}',f'{readout*100:.2f}',f'{(probe-readout)*100:.2f}'])
body+=text(440,318,'Accuracy at convergence · %','end')
right='<section class="native-card"><h3>At the end of training</h3>'+legend([('Hidden state probe',green),('Native readout',slate)])+svg(body,'The probe/readout gap persists on harder grammatical dependencies.',480,334)+table(['Task','Probe %','Readout %','Gap in points'],rows)+'</section>'
(out/'availability.html').write_text('<div class="native-grid two">'+left+right+'</div>')

# Exact labelled values transcribed from timing_dose_response.pdf and checked
# against main.tex: 0.25x / 1x / 4x; shortened warmup coincides with 1x.
body='';xs=[65,245,425]
y=lambda v:260-(math.log2(v)-5)/6*218
for tick in [32,64,128,256,512,1024,2048]:body+=line(65,y(tick),425,y(tick))+text(54,y(tick)+4,str(tick),'end')
for vals,label,color,kind in [([2048,1024,512],'Reorganization',green,0),([128,64,32],'Median feature peak',slate,1)]:
    points=' '.join(f'{xx},{y(v):.2f}' for xx,v in zip(xs,vals))
    body+=f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="2.5"/>'
    for xx,v in zip(xs,vals): body+=dot(xx,y(v),color,f'{label}: step {v:,}',kind)
    body+=f'<circle cx="245" cy="{y(vals[1]):.2f}" r="10" fill="none" stroke="{purple}" stroke-width="2"><title>Shortened warmup matches baseline: step {vals[1]}</title></circle>'
for xx,label in zip(xs,['0.25×','1×','4×']):body+=text(xx,289,label,'middle')
body+=text(65,20,'Training step · log scale')+text(425,316,'Readout learning rate multiplier','end')
chart='<section class="native-card"><h3>Learning rate sets the timing</h3>'+legend([('Reorganization',green),('Median feature peak',slate),('Shortened warmup (outline)',purple)])+svg(body,'Each fourfold learning rate increase halves the reorganization step.',480,334)+table(['Multiplier','Reorganization step','Median peak step'],[['0.25×',2048,128],['1×',1024,64],['4×',512,32],['1×, short warmup',1024,64]])+'</section>'
(out/'timing.html').write_text(chart)
print('Built three intervention panels, two availability panels, and the timing plot from documented figure sources.')
