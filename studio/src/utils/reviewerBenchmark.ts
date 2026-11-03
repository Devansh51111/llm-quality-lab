import {reviewerCases,reviewerDatasetVersion,type ReviewerCase} from '../data/reviewerCases';
import {semanticLabels,type SemanticLabel,type SemanticClaim} from './semanticReview';
export interface ReviewerPrediction {caseId:string;label:SemanticLabel|null;claims:SemanticClaim[];error?:string;latencyMs?:number;actualModelVersion?:string}
// Deliberately narrow baseline. Exact answer presence is not a semantic entailment test.
export function exactMatchBaseline(c:ReviewerCase):SemanticLabel{return c.reference.toLowerCase().includes(c.answer.toLowerCase())?'supported':'uncertain';}
export function aggregateReview(claims:SemanticClaim[]):SemanticLabel {
 if(!claims.length)return 'uncertain';
 if(claims.some(c=>c.label==='contradicted'))return 'contradicted';
 if(claims.some(c=>c.label==='not_in_reference'))return 'not_in_reference';
 if(claims.some(c=>c.label==='uncertain'))return 'uncertain';
 return 'supported';
}
export function scorePredictions(cases:ReviewerCase[],predictions:ReviewerPrediction[]){
 const ids=new Set(cases.map(c=>c.id));const byId=new Map<string,ReviewerPrediction>();
 for(const p of predictions){if(!p||typeof p.caseId!=='string')throw Error('Invalid prediction record.');if(!ids.has(p.caseId)||byId.has(p.caseId))throw Error('Unknown or duplicate prediction case.');if(p.label!==null&&!semanticLabels.includes(p.label))throw Error('Unknown predicted label.');byId.set(p.caseId,p);}
 const matrix=Object.fromEntries(semanticLabels.map(x=>[x,Object.fromEntries(semanticLabels.map(y=>[y,0]))])) as Record<SemanticLabel,Record<SemanticLabel,number>>;
 let completed=0,correct=0,errors=0;const failures:{id:string;expected:SemanticLabel;predicted:SemanticLabel|null;error?:string}[]=[];
 for(const c of cases){const p=byId.get(c.id);if(!p)continue;if(p.error||p.label===null){errors++;failures.push({id:c.id,expected:c.expected,predicted:null,error:p.error||'No label'});continue;}completed++;matrix[c.expected][p.label]++;if(c.expected===p.label)correct++;else failures.push({id:c.id,expected:c.expected,predicted:p.label});}
 const classes=semanticLabels.map(label=>{const tp=matrix[label][label];const support=semanticLabels.reduce((n,x)=>n+matrix[label][x],0);const predicted=semanticLabels.reduce((n,x)=>n+matrix[x][label],0);const precision=predicted?tp/predicted:null;const recall=support?tp/support:null;const f1=support?((precision??0)+(recall??0)>0?2*(precision??0)*(recall??0)/((precision??0)+(recall??0)):0):null;return {label,support,predicted,precision,recall,f1};});
 return {total:cases.length,attempted:byId.size,completed,errors,missing:cases.length-byId.size,correct,agreement:completed?correct/completed:null,successIncludingErrors:byId.size?correct/byId.size:null,matrix,classes,macroF1:classes.some(c=>c.f1!==null)?classes.reduce((n,c)=>n+(c.f1??0),0)/classes.filter(c=>c.f1!==null).length:null,failures};
}
export function benchmarkSnapshot(){return {version:reviewerDatasetVersion,cases:reviewerCases};}
export function parsePredictionImport(raw:unknown):ReviewerPrediction[]{
 const x=raw as {version?:string;cases?:unknown;predictions?:ReviewerPrediction[]};if(!x||x.version!==reviewerDatasetVersion||JSON.stringify(x.cases)!==JSON.stringify(reviewerCases)||!Array.isArray(x.predictions))throw Error('Import must use the exact published case snapshot and version.');
 // Treat all provenance, model and timing fields as unverified import claims.
 const result=x.predictions.map(p=>{if(!p||typeof p.caseId!=='string')throw Error('Invalid prediction record.');return ({caseId:p.caseId,label:p.label,claims:Array.isArray(p.claims)?p.claims:[],error:typeof p.error==='string'?p.error:undefined})});scorePredictions(reviewerCases,result);return result;
}
