"""Real Ragas non-LLM metrics. Overlap diagnostics, NOT semantic truth scores."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from importlib.metadata import version
os.environ['RAGAS_DO_NOT_TRACK']='true'
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_DATASETS_OFFLINE']='1'
from ragas.metrics.collections import ExactMatch, NonLLMStringSimilarity, RougeScore
ROOT=Path(__file__).resolve().parents[2]
DEFAULT=ROOT/'studio/evidence/reviewer-development-2026-11-03.json'

def measure(reference,response):
    if not isinstance(reference,str) or not isinstance(response,str):raise ValueError('Reference and response must be strings.')
    return {
        'exact_match':ExactMatch().score(reference=reference,response=response).value,
        'levenshtein_similarity':NonLLMStringSimilarity().score(reference=reference,response=response).value,
        'rougeL_f1':RougeScore(rouge_type='rougeL',mode='fmeasure').score(reference=reference,response=response).value,
    }

def run(path=DEFAULT):
    data=json.loads(Path(path).read_text());rows=[]
    for case in data['cases']:
        rows.append({'id':case['id'],'category':case['category'],'authoredExpectedLabel':case['expected'],'reference':case['reference'],'response':case['answer'],**measure(case['reference'],case['answer'])})
    # Diagnostic comparison, no thresholds chosen on these development examples.
    by_label={label:{'count':len(group),'meanRougeL':sum(r['rougeL_f1'] for r in group)/len(group),'meanLevenshtein':sum(r['levenshtein_similarity'] for r in group)/len(group)} for label in sorted({r['authoredExpectedLabel'] for r in rows}) if (group:=[r for r in rows if r['authoredExpectedLabel']==label])}
    return {'schemaVersion':1,'library':'ragas','libraryVersion':version('ragas'),'metrics':['ExactMatch','NonLLMStringSimilarity (Levenshtein)','RougeScore (rougeL fmeasure)'],'modelCalls':0,'sourceDatasetVersion':data['version'],'sourceSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'provenance':'Ragas non-LLM metrics executed on AI-authored fictional development cases. Labels are not independently human reviewed.','interpretation':'Response versus reference text overlap only, not faithfulness, entailment, factual accuracy or hallucination scoring. High overlap can hide contradictions; low overlap can penalize correct paraphrases. No release gate uses these scores.','byAuthoredLabel':by_label,'results':rows}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--input',type=Path,default=DEFAULT);parser.add_argument('--out',type=Path,default=ROOT/'studio/evidence/ragas-offline-2026-11-03.json');args=parser.parse_args();result=run(args.input);args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'library':result['library'],'version':result['libraryVersion'],'cases':len(result['results']),'modelCalls':0,'output':str(args.out),'warning':result['interpretation']},indent=2))
