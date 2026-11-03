import assert from 'node:assert/strict';
import {evaluateTestCase,buildRunResult,computeDatasetFingerprint,evaluateDurationDays,validateDataset,runsComparable} from '../src/utils/evaluator.ts';
const tc:any={id:'A',name:'A',category:'Factual Adherence',severity:'high',question:'Trial?',referenceContext:'Trial lasts14days',expectedRequiredPhrases:['14'],prohibitedPhrases:[],expectedCitations:[],requireJson:false,privacyPatternsCheck:false,syntheticSampleOutput:'14',lastUpdated:''};
const ev=(s:string,t:any=tc,err?:string)=>evaluateTestCase(t,s,null,'live_gemini_api','test',undefined,err);
const run=(rs:any[])=>buildRunResult(rs,[tc],'live_gemini_api','test','fp');
const cases:[string,()=>any][]=[
 ['pass',()=>assert.equal(ev('14').passed,true)],
 ['missing',()=>assert.equal(ev('5').passed,false)],
 ['empty',()=>assert.equal(ev('').passed,false)],
 ['zero checks',()=>assert.equal(ev('hello',{...tc,expectedRequiredPhrases:[]}).passed,false)],
 ['empty run',()=>assert.equal(run([]).releaseGateStatus,'BLOCKED')],
 ['below90',()=>assert.equal(run([ev('14'),ev('x')]).releaseGateStatus,'BLOCKED')],
 ['critical overrides',()=>assert.equal(run([...Array.from({length:19},()=>ev('14')),ev('x',{...tc,severity:'critical'})]).releaseGateStatus,'BLOCKED')],
 ['transport',()=>assert.equal(run([ev('14',tc,'unavailable')]).releaseGateStatus,'BLOCKED')],
 ['strict JSON',()=>assert.equal(ev('```json\n{}\n```',{...tc,expectedRequiredPhrases:[],requireJson:true}).passed,false)],
 ['sample time',()=>assert.equal(buildRunResult([evaluateTestCase(tc,'14',null,'synthetic_sample_replay','synthetic')],[tc],'synthetic_sample_replay','synthetic','fp').averageLatencyMs,null)],
];
for(const [name,f] of cases){f();console.log('PASS',name)}
const h1=await computeDatasetFingerprint([tc]);const h2=await computeDatasetFingerprint([{...tc,question:'changed'}]);assert.notEqual(h1,h2);console.log('PASS fingerprint content');
assert.notEqual(await computeDatasetFingerprint([tc]),await computeDatasetFingerprint([tc,{...tc,id:'B'}]));console.log('PASS fingerprint selection');
for(const text of ['14 days','a 14-day trial','14 day trial','14–day trial']){assert.equal(evaluateDurationDays(text,14),true,text);console.log('PASS duration accepted:',text)}
for(const text of ['14 months','140 days','not 14 days','30 days','14 days or 30 days','14 years','14 weeks','No duration given','no longer 14 days']){assert.equal(evaluateDurationDays(text,14),false,text);console.log('PASS duration rejected:',text)}
assert.equal(ev('14 months',{...tc,expectedDurationDays:14}).passed,false);
assert.equal(ev('14 days',{...tc,expectedDurationDays:14}).passed,true);
assert.notEqual(computeDatasetFingerprint([tc]),computeDatasetFingerprint([{...tc,expectedDurationDays:14}]));
console.log('PASS duration participates in case result and fingerprint');
for(const bad of [[null],[{}],[{...tc,question:10}],[{...tc,expectedRequiredPhrases:[3]}],[{...tc,severity:'catastrophic'}],[{...tc,expectedDurationDays:1.5}],[tc,tc]]) assert.equal(validateDataset(bad as any).isValid,false);
console.log('PASS malformed dataset contracts rejected (7 variants)');
const a=buildRunResult([ev('14')],[tc],'live_gemini_api','test',computeDatasetFingerprint([tc]));
const b={...a,runId:'second'};
assert.equal(runsComparable(a,b),true);
assert.equal(runsComparable(a,a),false);
assert.equal(runsComparable(a,{...b,datasetSnapshot:[{...tc,question:'Different?'}]}),false);
assert.equal(runsComparable(a,{...b,results:[]}),false);
console.log('PASS regression distinct-run, exact snapshot and complete result checks');
assert.equal(run([...Array.from({length:1799},()=>ev('14')),...Array.from({length:201},()=>ev('x'))]).releaseGateStatus,'BLOCKED');
console.log('PASS 89.95% cannot round into a passed release');
const map=new Map<string,string>();
(globalThis as any).localStorage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)};
const storage=await import('../src/utils/storage.ts');
storage.saveStoredCases([]);assert.deepEqual(storage.getStoredCases(),[]);
console.log('PASS empty dataset survives reload');

const {SEED_TEST_CASES}=await import('../src/data/seedData.ts');
const trial=SEED_TEST_CASES.find(c=>c.expectedDurationDays===14)!;
const legacy={...trial,expectedDurationDays:undefined,expectedRequiredPhrases:['14-day','no credit card','23:59 UTC']};
storage.saveStoredCases([legacy]);assert.equal(storage.getStoredCases()[0].expectedDurationDays,14);
assert.equal(storage.getStoredCases()[0].expectedRequiredPhrases.includes('14-day'),false);
storage.saveStoredCases([{...legacy,question:'Custom question'}]);assert.equal(storage.getStoredCases()[0].expectedDurationDays,undefined);
console.log('PASS untouched legacy trial migrates, custom question stays unchanged');

storage.saveStoredRun(a);assert.equal(storage.getStoredRuns()[0].runId,a.runId);console.log('PASS stored run roundtrip distinct from dataset validation');
