import type {RunResult,TestCaseResult} from '../types/qa';
import {validateDataset,computeDatasetFingerprint,buildRunResult,evaluateTestCase} from './evaluator';
/** Imported data is never authenticated by its claimed origin or model field. Recompute rules. */
export function importRun(payload:unknown):RunResult{
 const p=payload as any;const snapshot=p?.datasetSnapshot;const results=p?.results;
 if(!validateDataset(snapshot).isValid||!Array.isArray(results)||results.length!==snapshot.length)throw Error('Expected exact case snapshot and one result per case. Export full run JSON from a compatible version.');
 const ids=new Set(results.map((r:any)=>r?.testCaseId));if(ids.size!==results.length||snapshot.some((c:any)=>!ids.has(c.id)))throw Error('Missing or duplicate case results.');
 const reportedOrigin=p.runOrigin||p.provenance?.runOrigin;
 if(!['live_gemini_api','synthetic_sample_replay'].includes(reportedOrigin))throw Error('Unknown reported run origin.');
 const model=p.requestedModel||p.provenance?.requestedModel||'not reported';
 const reevaluated:TestCaseResult[]=snapshot.map((c:any)=>{const r=results.find((r:any)=>r.testCaseId===c.id);if(typeof r.actualOutput!=='string'||r.actualOutput.length>200000)throw Error('Invalid output.');return evaluateTestCase(c,r.actualOutput,typeof r.latencyMs==='number'&&r.latencyMs>=0?r.latencyMs:null,reportedOrigin,model,'not independently verified',r.isExecutionError?String(r.executionErrorMessage||'Imported execution error'):undefined)});
 const run=buildRunResult(reevaluated,snapshot,reportedOrigin,model,computeDatasetFingerprint(snapshot),'not independently verified','Imported report: recomputed local rules');
 run.notes='IMPORTED_UNVERIFIED: Origin/model/latency are claims from imported JSON, not authenticated provider evidence. Deterministic checks recomputed locally. Original reported run ID: '+String(p.runId||p.provenance?.runId||'not supplied');
 return run;
}
