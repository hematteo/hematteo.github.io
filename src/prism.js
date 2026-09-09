const fmt = n => Math.abs(n) < .0005 ? '0.000' : n.toFixed(3).replace('-', '−')
const signed = n => n > 0 ? '+' + fmt(n) : fmt(n)
const byId = id => document.getElementById(id)

// Reuse DOM rows so transitions preserve feature identity and keyboard focus.
function makeRow(label, type, inspect) {
  const el = document.createElement(inspect ? 'button' : 'div')
  el.className = 'contribution-row ' + type
  if (inspect) {el.type = 'button'; el.addEventListener('click', inspect)}
  const name = document.createElement('span'); name.className = 'contribution-name'; name.textContent = label
  const track = document.createElement('span'); track.className = 'contribution-track'; track.setAttribute('aria-hidden','true')
  const positive = document.createElement('i'); positive.className = 'positive'; positive.style.left = '50%'
  const negative = document.createElement('i'); negative.className = 'negative'; negative.style.right = '50%'
  track.append(positive,negative)
  const number = document.createElement('span'); number.className = 'contribution-value'
  el.append(name,track,number)
  return {el,name,update(value,scale) {
    positive.style.width = Math.max(value,0)/scale*46 + '%'
    negative.style.width = Math.max(-value,0)/scale*46 + '%'
    number.textContent = signed(value)
    if (inspect) el.setAttribute('aria-label',label+', '+signed(value)+' logit units. Inspect feature.')
  }}
}

async function mount() {
  const response = await fetch('/research/prism.json')
  if (!response.ok) return
  const data = await response.json(), bug = data.bug
  const names = ['Mosquito / insect','Beetle / bug','Defect / flaw','Debugging']
  let context = '0', selectedFeature = null
  const scale = Math.max(...bug.flatMap(r=>r.features.map(f=>Math.abs(f.value))))*1.12
  const rows = bug[0].features.map((feature,i)=>{
    const row = makeRow(names[i]+' · '+feature.id,'feature',()=>{selectedFeature=i;inspect(i)})
    const tokens = document.createElement('small'); tokens.textContent = feature.tokens.slice(0,3).join(' · '); row.name.append(tokens)
    return row
  })
  byId('bug-bars').append(...rows.map(r=>r.el))
  function inspect(i) {
    const left=bug[0].features[i], right=bug[1].features[i]
    const panel=byId('bug-inspector'); panel.replaceChildren()
    const text=document.createElement('p')
    text.textContent=names[i]+' (feature '+left.id+'): '+signed(left.value)+' in the insect context; '+signed(right.value)+' in the software context. Change: '+signed(right.value-left.value)+' logit units.'
    const tokens=document.createElement('p');tokens.className='bug-token-list';tokens.textContent='Associated output tokens: '+left.tokens.join(' · ')
    panel.append(text,tokens)
  }
  function renderBug() {
    const delta=context==='delta'
    rows.forEach((row,i)=>row.update(delta ? bug[1].features[i].value-bug[0].features[i].value : bug[Number(context)].features[i].value,scale))
    byId('bug-view-description').textContent=delta
      ? 'Software minus insect: rightward bars contribute more in the software context; leftward bars contribute more in the insect context.'
      : bug[Number(context)].context+' context: contributions to the score for “bug”. Compare the same four features across contexts, or select “Show the change”.'
    byId('bug-positive').textContent=delta?'More in software':'Raises the score'
    byId('bug-negative').textContent=delta?'More in insect':'Lowers the score'
    document.querySelectorAll('[data-context]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.context===context)))
    document.querySelectorAll('.bug-prompts>div').forEach((el,i)=>el.classList.toggle('active',!delta && Number(context)===i))
    const parts=bug.map(r=>{const shown=r.features.reduce((sum,f)=>sum+f.value,0);return [shown,r.featureSum-shown,r.offset,r.residual,r.score]})
    const labels=['Shown features','+ Other features','+ Offset','+ Residual',delta?'= Score change':'= Token score']
    byId('bug-equation').replaceChildren(...labels.map((label,i)=>{
      const span=document.createElement('span');span.textContent=label
      const value=document.createElement('b');value.textContent=signed(delta?parts[1][i]-parts[0][i]:parts[Number(context)][i]);span.append(value);return span
    }))
    if(selectedFeature!==null) inspect(selectedFeature)
  }
  document.querySelectorAll('[data-context]').forEach(b=>b.addEventListener('click',()=>{context=b.dataset.context;renderBug()}))
  const shown=bug.map(r=>r.features.reduce((sum,f)=>sum+f.value,0))
  const terms=[['Four shown features',shown],['Other features',bug.map((r,i)=>r.featureSum-shown[i])],['Offset',bug.map(r=>r.offset)],['Reconstruction residual',bug.map(r=>r.residual)],['Full token score',bug.map(r=>r.score)]]
  terms.forEach(([name,values])=>{
    const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=name;tr.append(th)
    values.forEach(v=>{const td=document.createElement('td');td.textContent=signed(v);tr.append(td)})
    byId('bug-accounting').append(tr)
  })
  const lensRows=['Feature 23180','Other features','Offset','Residual'].map((label,i)=>makeRow(label,['feature','remainder','offset','residual'][i]))
  byId('lens-local-bars').append(...lensRows.map(r=>r.el))
  const lensScale=Math.max(...data.lenses.map(r=>Math.abs(r.features.find(f=>f.id===23180).value)))*1.08
  function setLens(index,announce=true) {
    const record=data.lenses[index],dominant=record.features.find(f=>f.id===23180).value
    const values=[dominant,record.featureSum-dominant,record.offset,record.residual]
    lensRows.forEach((r,i)=>r.update(values[i],lensScale))
    byId('lens-local-title').textContent=(index===0?'English':'Chinese')+' fitting corpus → “'+record.token+'”. Full score: '+fmt(record.score)+' logits.'
    document.querySelectorAll('[data-lens]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.lens)===index)))
    document.querySelectorAll('[data-lens-card]').forEach(card=>card.classList.toggle('selected',Number(card.dataset.lensCard)===index))
    if(announce) byId('lens-announcement').textContent='The chart here now shows the '+(index===0?'English':'Chinese')+' lens. The prompt and hidden state are unchanged.'
  }
  document.querySelectorAll('[data-lens]').forEach(b=>b.addEventListener('click',()=>setLens(Number(b.dataset.lens))))
  renderBug();setLens(0,false)
  byId('bug-interactive').hidden=false;byId('bug-static').hidden=true
  byId('lens-local').hidden=false;document.querySelector('.lens-switch').hidden=false
}
mount().catch(()=>{ /* The static bug comparison, both lens cards and paper figure remain readable. */ })
