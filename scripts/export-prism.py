"""Export recorded SRP examples; never treat undisplayed features as residual.
Usage: python3 scripts/export-prism.py /path/to/SRP/readout_prism_workspace
"""
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / 'public/research/prism.json'
lenses = []
for language, token in [('en', ' London'), ('zh', '伦敦')]:
    run = json.loads((source / f'results/jlens/cross_lens_v2_{language}.json').read_text())
    record = next(r for r in run['records'] if r['id'] == 'fac_03')
    cell = record['layers']['26']['-1']
    score = cell['targets'][token]
    assert abs(score['base'] + score['feature_sum'] + score['residual'] - score['original_logit']) < 1e-5
    assert cell['top5'][0][0] == token
    lenses.append({'language':language,'token':token.strip(),'score':score['original_logit'],
        'offset':score['base'],'featureSum':score['feature_sum'],'residual':score['residual'],
        'features':[{'id':f['id'],'value':f['contribution'],'tokens':[]} for f in score['top_features']]})
root = source / 'interactive/token_decomposition/public/data/qwen2b_k256'
example = next(e for e in json.loads((root/'examples.json').read_text())['examples'] if e['example_id']=='qwen_password_red_blue')
raw = json.loads((root/'contrasts/qwen_password_red_blue/19/2438_6105.json').read_text())
offset = raw['base_term'] + raw['decoder_bias_term']
assert abs(offset+raw['sparse_sum']+raw['residual']-raw['exact']) < 1e-5
password = {'token':'red − blue','prompt':example['prompt'],'score':raw['exact'],
    'offset':offset,'featureSum':raw['sparse_sum'],'residual':raw['residual'],
    'features':[{'id':f['feature_id'],'value':f['contribution'],'tokens':f['top_tokens']} for f in raw['features'][:10]]}
# Four illustrative semantic directions with recorded values in both contexts.
# Never infer zero from omission in a truncated feature export.
bug = []
feature_ids = [36,18302,21804,5680]
examples = json.loads((root/'examples.json').read_text())['examples']
for name, position, label in [('bug_insect_error',5,'Insect'),('bug_software_insect',7,'Software')]:
    raw = json.loads((root/f'decompositions/{name}/{position}/9584.json').read_text())
    features = {f['feature_id']: f for f in raw['features']}
    assert raw['token_id'] == 9584
    assert abs(raw['base_term']+raw['decoder_bias_term']+raw['sparse_sum']+raw['residual']-raw['exact']) < 1e-5
    bug.append({'context':label,'prompt':next(e['prompt'] for e in examples if e['example_id']==name),
        'tokenId':9584,'token':' bug','score':raw['exact'],'offset':raw['base_term']+raw['decoder_bias_term'],
        'featureSum':raw['sparse_sum'],'residual':raw['residual'],
        'features':[{'id':i,'value':features[i]['contribution'],'tokens':features[i]['top_tokens']} for i in feature_ids]})
data = {'lenses':lenses,'password':password,'bug':bug}
for score in [*lenses,password,*bug]:
    for count in range(11):
        shown=sum(f['value'] for f in score['features'][:count])
        remaining=score['featureSum']-shown
        assert abs(shown+remaining+score['offset']+score['residual']-score['score']) < 1e-5
output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('Verified every reveal step: features + remaining features + offset + residual = score.')
