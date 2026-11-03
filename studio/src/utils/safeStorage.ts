import {validateDataset} from './evaluator';
// Shape checks prevent corrupt browser saves from crashing the demo. They do not authenticate evidence.
const record=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown)=>typeof x==='string'&&x.length<=200000;
const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const time=(x:unknown)=>x===null||number(x);
const list=(x:unknown,n:number,check:(v:any)=>boolean)=>Array.isArray(x)&&x.length<=n&&x.every(check);
const verdicts=['unreviewed','supported','unsupported','uncertain'];
const labels=['supported','contradicted','not_in_reference','uncertain'];
const claim=(x:any)=>record(x)&&['claim','evidence','reason'].every(k=>text(x[k]))&&labels.includes(x.label)&&['exact_quote','no_quote','quote_not_found'].includes(x.evidenceStatus);
const cases=(x:any)=>Array.isArray(x)&&(x.length===0||validateDataset(x).isValid);
export function validStoredRun(x:any):boolean{
 if(!record(x)||!['runId','runName','timestamp','requestedModel','actualModelVersion','datasetFingerprint','releaseGateReason'].every(k=>text(x[k]))||!['live_gemini_api','synthetic_sample_replay'].includes(x.runOrigin)||!['PASSED','BLOCKED'].includes(x.releaseGateStatus)||!cases(x.datasetSnapshot))return false;
 if(!['totalCases','passedCases','failedCases','criticalFailures','executionErrorsCount','deterministicPassRate'].every(k=>number(x[k]))||!['averageLatencyMs','minLatencyMs','maxLatencyMs'].every(k=>time(x[k]))||x.deterministicPassRate>100||x.notes!==undefined&&!text(x.notes))return false;
 const ids=new Set<string>();return list(x.results,500,(r:any)=>{
  if(!record(r)||!['testCaseId','testCaseName','question','referenceContext','actualOutput','requestedModel','timestamp','category','severity'].every(k=>text(r[k]))||!['passed','isCriticalFailure','isExecutionError'].every(k=>typeof r[k]==='boolean')||!time(r.latencyMs)||!list(r.failureReasons,1000,text))return false;
  if(!['live_gemini_api','synthetic_sample_replay'].includes(r.runOrigin)||ids.has(r.testCaseId)||!x.datasetSnapshot.some((c:any)=>c.id===r.testCaseId))return false;ids.add(r.testCaseId);
  if(r.executionErrorMessage!==undefined&&!text(r.executionErrorMessage)||r.actualModelVersion!==undefined&&!text(r.actualModelVersion))return false;
  if(!list(r.checks,1000,(c:any)=>record(c)&&['ruleId','ruleName','category','expected','details'].every(k=>text(c[k]))&&typeof c.passed==='boolean'&&(c.actual===undefined||text(c.actual))))return false;
  const j=r.judgeEvaluation;return j===undefined||(record(j)&&['faithfulnessScore','groundednessScore','concisenessScore'].every(k=>number(j[k]))&&['faithfulnessNotes','groundednessNotes','overallVerdict','disclaimer','model','timestamp'].every(k=>text(j[k]))&&time(j.latencyMs));
 })&&x.totalCases===x.results.length&&x.datasetSnapshot.length===x.results.length;
}
const validators:Record<string,(x:any)=>boolean>={
 llm_qualitylab_cases_v1:cases,
 llm_qualitylab_runs_v1:x=>list(x,20,validStoredRun)&&new Set(x.map((r:any)=>r.runId)).size===x.length,
 ql_claim_output_v1:text,ql_claim_context_v1:text,ql_turn_context_v1:text,
 ql_claims_v1:x=>list(x,100,(c:any)=>record(c)&&['id','claim','evidence','note'].every(k=>text(c[k]))&&verdicts.includes(c.verdict))&&new Set(x.map((c:any)=>c.id)).size===x.length,
 ql_turns_v1:x=>list(x,16,(t:any)=>record(t)&&text(t.text)&&t.text.trim().length>0&&text(t.timestamp)&&(t.latencyMs===undefined||time(t.latencyMs))&&(t.origin===undefined||text(t.origin)))&&x.length%2===0&&x.every((t:any,i:number)=>t.role===(i%2?'model':'user')),
 ql_perf_v1:x=>list(x,5,(s:any)=>record(s)&&text(s.timestamp)&&time(s.latencyMs)&&(s.error===undefined||text(s.error))&&(s.output===undefined||text(s.output))),
 ql_perf_case_v1:x=>x===null||validateDataset([x]).isValid,
 ql_semantic_v1:x=>x===null||(record(x)&&['model','actualModelVersion','timestamp','disclaimer','referenceSnapshot','candidateSnapshot'].every(k=>text(x[k]))&&number(x.latencyMs)&&x.origin==='live_model_suggestion'&&list(x.claims,20,claim)),
 ql_semantic_human_v1:x=>record(x)&&Object.keys(x).length<=20&&Object.entries(x).every(([k,v])=>/^\d+$/.test(k)&&['unreviewed','agree','disagree','uncertain'].includes(v as string)),
};
const blocked=new Set<string>();
function notify(){if(typeof window!=='undefined')queueMicrotask(()=>window.dispatchEvent(new Event('qualitylab-storage-warning')));}
export function storageWarnings(){return [...blocked];}
export function flagStorage(key:string){if(!blocked.has(key)){blocked.add(key);notify();}}
export function safeRead<T>(key:string,fallback:T):T{
 try{const raw=localStorage.getItem(key);if(raw===null)return fallback;if(raw.length>5000000)throw Error('Oversized save');const value=JSON.parse(raw);if(validators[key]&&!validators[key](value)){flagStorage(key);if(key==='llm_qualitylab_runs_v1'&&Array.isArray(value)){const ids=new Set();return value.filter(r=>{if(!validStoredRun(r)||ids.has(r.runId))return false;ids.add(r.runId);return true}).slice(0,20) as T;}return fallback;}return value as T;}catch{flagStorage(key);return fallback;}
}
export function safeWrite(key:string,value:unknown):boolean{
 if(blocked.has(key)){notify();return false;}try{if(validators[key]&&!validators[key](value))throw Error('Invalid new value');localStorage.setItem(key,JSON.stringify(value));return true;}catch{flagStorage(key);return false;}
}
export function clearStorageWarnings(){blocked.clear();notify();}
export function resetBlockedStorage(){
 for(const key of blocked){if(key==='llm_qualitylab_runs_v1'){const valid=safeRead<any[]>(key,[]);localStorage.setItem(key,JSON.stringify(valid));}else localStorage.removeItem(key);}
 blocked.clear();notify();
}
export function rawBlockedStorage(){return Object.fromEntries([...blocked].map(k=>{try{return [k,localStorage.getItem(k)]}catch{return [k,'Browser denied access; original could not be read.']}}));}
