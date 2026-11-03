import assert from 'node:assert/strict';
import {reviewerCases} from '../src/data/reviewerCases';
import {scorePredictions,aggregateReview,exactMatchBaseline,parsePredictionImport,benchmarkSnapshot} from '../src/utils/reviewerBenchmark';
assert.equal(new Set(reviewerCases.map(c=>c.id)).size,24);
const p=reviewerCases.map(c=>({caseId:c.id,label:c.expected,claims:[]}));
const perfect=scorePredictions(reviewerCases,p);assert.equal(perfect.agreement,1);assert.equal(perfect.macroF1,1);
const partial=scorePredictions(reviewerCases,[{caseId:'S01',label:null,claims:[],error:'offline'},{caseId:'C01',label:'supported',claims:[]}]);assert.equal(partial.completed,1);assert.equal(partial.errors,1);assert.equal(partial.missing,22);assert.equal(partial.agreement,0);assert.equal(partial.successIncludingErrors,0);
assert.equal(scorePredictions(reviewerCases,[]).agreement,null);
assert.throws(()=>scorePredictions(reviewerCases,[p[0],p[0]]));assert.throws(()=>parsePredictionImport({version:'wrong',predictions:p}));assert.equal(parsePredictionImport({...benchmarkSnapshot(),predictions:p}).length,24);
assert.equal(aggregateReview([]),'uncertain');assert.equal(exactMatchBaseline(reviewerCases[1]),'uncertain');
console.log('PASS reviewer dataset provenance, confusion matrix, class F1, error denominator, partial coverage and snapshot validation');

const imported=parsePredictionImport({...benchmarkSnapshot(),predictions:[{...p[0],latencyMs:3041,actualModelVersion:'recorded-version'}]});
assert.equal(imported[0].latencyMs,3041);assert.equal(imported[0].actualModelVersion,'recorded-version');
for(const bad of [{claims:null},{latencyMs:-1},{latencyMs:NaN},{actualModelVersion:123},{claims:[{claim:'bad'}]}])assert.throws(()=>parsePredictionImport({...benchmarkSnapshot(),predictions:[{...p[0],...bad}]}));
console.log('PASS imported timing/model metadata preserved without authenticating provenance; malformed evidence rejected');
