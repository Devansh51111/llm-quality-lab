/* Browser twin of deterministic Python checks. Not a semantic judge. */
function contract(check,output,latency=null){
 const k=check.type, folded=output.toLowerCase();
 if(['contains_all','contains_any','excludes'].includes(k)){
  const found=check.values.filter(v=>folded.includes(v.toLowerCase()));
  if(k==='contains_all'){const miss=check.values.filter(v=>!found.includes(v));return [!miss.length,miss.length?'Missing expected text: '+miss.join(', '):'All expected text found']}
  if(k==='contains_any')return [!!found.length,found.length?'Expected phrase found':'None of the accepted phrases found'];
  return [!found.length,found.length?'Prohibited text: '+found.join(', '):'No listed prohibited text found'];
 }
 if(k==='json_schema'){
  let parsed;try{parsed=JSON.parse(output)}catch{return [false,'Output is not valid JSON']}
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return [false,'Expected a JSON object'];
  for(const [key,type]of Object.entries(check.required)){const v=parsed[key];const valid=type==='array'?Array.isArray(v):type==='object'?v!==null&&typeof v==='object'&&!Array.isArray(v):typeof v===type;if(!valid)return [false,`Field ${key} missing or wrong type (${type})`]}
  return [true,'Required fields and top-level types valid (schema subset)'];
 }
 if(k==='citations'){
  const cited=new Set([...output.matchAll(/\[([A-Za-z0-9_-]+)\]/g)].map(m=>m[1]));const missing=check.required.filter(v=>!cited.has(v));const unknown=[...cited].filter(v=>!(check.allowed||check.required).includes(v));return [!missing.length&&!unknown.length,`Missing source ids: ${missing.join(', ')||'none'}; unknown source ids: ${unknown.join(', ')||'none'}`];
 }
 if(k==='no_pii'){const found=/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(output)||/(?<!\w)\+?\d[\d ()-]{8,}\d(?!\w)/.test(output);return [!found,found?'Email/phone-like pattern detected':'No email/phone-like pattern detected']}
 if(k==='numeric_claims'){const cleaned=output.replace(/\[[A-Za-z0-9_-]+\]/g,'');const nums=[...cleaned.matchAll(/(?<![\w-])\d+(?:\.\d+)?(?![\w-])/g)].map(m=>m[0]);const bad=[...new Set(nums.filter(v=>!check.allowed.map(String).includes(v)))];return [!bad.length,bad.length?'Unexpected number(s): '+bad.join(', '):'Numbers are within this case allowlist']}
 if(k==='max_latency')return [typeof latency==='number'&&Number.isFinite(latency)&&latency>=0&&latency<=check.ms,latency===null?'Latency unavailable; cannot pass performance check':`Observed ${latency} ms; budget ${check.ms} ms`];
 throw Error('Unknown check: '+k);
}
function validate(cases,responses){
 if(!Array.isArray(cases)||!cases.length||cases.length>200)throw Error('Dataset must contain 1 to 200 cases.');
 const ids=new Set();for(const c of cases){if(!c.id||typeof c.id!=='string'||ids.has(c.id))throw Error('Missing or duplicate case id');ids.add(c.id);for(const f of ['question','category','severity'])if(typeof c[f]!=='string'||!c[f])throw Error('Missing case field '+f);if(!['critical','major','minor'].includes(c.severity))throw Error('Invalid severity');if(!Array.isArray(c.checks)||!c.checks.length)throw Error('Case needs checks');for(const ch of c.checks){if(!['contains_all','contains_any','excludes','json_schema','citations','max_latency','no_pii','numeric_claims'].includes(ch.type))throw Error('Unsupported check type');if(['contains_all','contains_any','excludes'].includes(ch.type)&&(!Array.isArray(ch.values)||!ch.values.length||ch.values.some(v=>typeof v!=='string'||!v.trim())))throw Error('Text checks need nonempty string values');if(ch.type==='json_schema'&&(!ch.required||typeof ch.required!=='object'||Array.isArray(ch.required)||Object.values(ch.required).some(t=>!['string','array','number','boolean','object'].includes(t))))throw Error('Invalid schema contract');if(ch.type==='citations'&&(!Array.isArray(ch.required)||!ch.required.length))throw Error('Citation check needs source ids');if(ch.type==='numeric_claims'&&(!Array.isArray(ch.allowed)||!ch.allowed.length))throw Error('Numeric check needs allowlist');if(ch.type==='max_latency'&&(!(ch.ms>0)||!Number.isFinite(ch.ms)))throw Error('Invalid latency budget')}}
 if(!responses||typeof responses!=='object'||Array.isArray(responses))throw Error('Responses must be an object keyed by case id');for(const id of Object.keys(responses))if(!ids.has(id))throw Error('Unknown response id: '+id);
}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
async function evaluateBrowser(cases,responses,label,provenance){
 validate(cases,responses);
 const results=cases.map(c=>{const item=responses[c.id];const output=typeof item?.output==='string'?item.output:'';const error=!item?'Response missing':typeof item.output!=='string'?'Response must contain a string output':item.error||(!output.trim()?'Empty output':null);const checks=c.checks.map(ch=>{const [passed,reason]=error?[false,error]:contract(ch,output,item?.latency_ms??null);return {type:ch.type,passed,reason}});return {id:c.id,question:c.question,category:c.category,severity:c.severity,context:c.context||'',output,error,latency_ms:item?.latency_ms??null,checks,passed:checks.every(x=>x.passed)}});
 const passed=results.filter(r=>r.passed).length,critical=results.filter(r=>!r.passed&&r.severity==='critical').length;const categories={};for(const r of results){categories[r.category]??={passed:0,total:0};categories[r.category].total++;categories[r.category].passed+=r.passed?1:0}
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(cases)));const hash=[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
 return {id:crypto.randomUUID().slice(0,12),created_at:new Date().toISOString(),label,mode:'browser-import',provenance,dataset_sha256:hash,summary:{passed,total:cases.length,pass_rate:Math.round(passed/cases.length*10000)/100,critical_failures:critical,release_gate:passed/cases.length>=.9&&!critical,policy:'At least 90% cases pass AND zero critical failures'},categories,results};
}
