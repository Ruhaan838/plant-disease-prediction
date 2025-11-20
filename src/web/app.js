const fileInput = document.getElementById('file')
const sendBtn = document.getElementById('send')
const preview = document.getElementById('preview')
const status = document.getElementById('status')
const predsDiv = document.getElementById('preds')

let LABELS = null

async function loadLabels(){
  try{
    const r = await fetch('/labels')
    if (!r.ok) return
    const j = await r.json()
    // support both legacy string list and new object list
    if (Array.isArray(j.classes) && j.classes.length > 0) {
      if (typeof j.classes[0] === 'string') {
        // legacy: array of raw strings
        LABELS = j.classes.map((s, i) => ({id: i, raw: s, label: s}))
      } else {
        // new format: array of {id, raw, label}
        LABELS = j.classes
      }
      console.log('Loaded labels', LABELS.length)
    }
  }catch(e){
    console.log('Could not load labels:', e)
  }
}

sendBtn.onclick = async () => {
  const file = fileInput.files[0]
  if (!file) return alert('Choose an image')
  const form = new FormData()
  form.append('file', file)
  preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:300px" />`
  status.textContent = 'Uploading...'
  predsDiv.innerHTML = ''
  try {
    const resp = await fetch('/predict', { method: 'POST', body: form })
    if (!resp.ok){
      const txt = await resp.text()
      status.textContent = 'Error: ' + txt
      return
    }
    const json = await resp.json()
    status.textContent = ''
    // prefer structured topk if provided by server
    let top = null
    if (json.topk && Array.isArray(json.topk)) {
      top = json.topk.slice(0,3)
    } else {
      // fallback: compute top3 from probs
      const probs = json.probs || []
      const items = probs.map((p, i) => ({id: i, prob: p}))
      items.sort((a,b)=> b.prob - a.prob)
      top = items.slice(0,3).map(it => ({id: it.id, raw: null, label: null, prob: it.prob}))
    }
    const table = document.createElement('table')
    const header = document.createElement('tr')
    header.innerHTML = '<th>Rank</th><th>Label</th><th>Probability</th>'
    table.appendChild(header)
    top.forEach((it, idx) => {
      const tr = document.createElement('tr')
      let label = String(it.id)
      // prefer label from the topk entry
      if (it.label !== undefined && it.label !== null) {
        if (typeof it.label === 'string') label = it.label
        else if (typeof it.label === 'object') label = it.label.label || it.label.raw || JSON.stringify(it.label)
        else label = String(it.label)
      } else if (LABELS && LABELS[it.id]) {
        const l = LABELS[it.id]
        if (typeof l === 'string') label = l
        else if (typeof l === 'object') label = l.label || l.raw || JSON.stringify(l)
        else label = String(l)
      }
      const prob = (it.prob !== undefined) ? it.prob : (it.p !== undefined ? it.p : 0)
      tr.innerHTML = `<td>${idx+1}</td><td>${label}</td><td>${(prob*100).toFixed(2)}%</td>`
      table.appendChild(tr)
    })
    predsDiv.appendChild(table)
  } catch (err) {
    status.textContent = 'Error: ' + err
  }
}

loadLabels()
