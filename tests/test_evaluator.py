import copy
import json
from pathlib import Path
import pytest
from evalforge.evaluator import evaluate, grade, validate_cases, compare

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT/'data/cases.json').read_text())
CAND = json.loads((ROOT/'data/candidate.json').read_text())
BASE = json.loads((ROOT/'data/baseline.json').read_text())


def run(responses):
    return evaluate(CASES, responses, label='test', mode='fixture', provenance='unit test')


def test_candidate_passes_declared_contracts():
    assert run(CAND)['summary']['passed'] == 16


def test_baseline_blocks():
    assert run(BASE)['summary']['release_gate'] is False


def test_critical_failure_overrides_high_average():
    responses = copy.deepcopy(CAND)
    responses['PII-01']['output'] = 'Contact synthetic.person@example.invalid'
    report = run(responses)
    assert report['summary']['pass_rate'] > 90
    assert report['summary']['critical_failures'] == 1
    assert not report['summary']['release_gate']


def test_missing_output_is_failure():
    responses = copy.deepcopy(CAND)
    del responses['FACT-01']
    row = run(responses)['results'][0]
    assert row['error'] == 'Response missing'
    assert not row['passed']


def test_empty_output_cannot_pass_exclusion_only():
    c = copy.deepcopy(CASES[:1]);c[0]['checks']=[{'type':'excludes','values':['secret']}]
    r=evaluate(c, {'FACT-01':{'output':''}}, label='x', mode='fixture', provenance='test')
    assert not r['summary']['release_gate']


@pytest.mark.parametrize('output,expected', [('SYNTHETIC@example.invalid',False),('+1 202 555 0100',False),('I cannot disclose that.',True)])
def test_pii_patterns(output,expected):
    assert grade({'type':'no_pii'},output)[0] is expected


def test_schema_boolean_is_not_number():
    assert not grade({'type':'json_schema','required':{'n':'number'}},'{"n":true}')[0]


@pytest.mark.parametrize('output', ['not json','[]','{"answer":8}','{"sources":[]}'])
def test_schema_rejects_bad_outputs(output):
    assert not grade({'type':'json_schema','required':{'answer':'string','sources':'array'}},output)[0]


def test_citation_ids_are_not_semantic_proof():
    assert grade({'type':'citations','required':['DOC']},'Wrong claim [DOC]')[0]


def test_unknown_citation_fails():
    assert not grade({'type':'citations','required':['DOC']},'Claim [DOC] [FAKE]')[0]


def test_numeric_allowlist():
    assert not grade({'type':'numeric_claims','allowed':['14']},'30 days [D1]')[0]


@pytest.mark.parametrize('latency',[None,-1,float('nan'),float('inf'),True,201])
def test_bad_latency_fails(latency):
    assert not grade({'type':'max_latency','ms':200},'ok',latency)[0]


def test_latency_boundary():
    assert grade({'type':'max_latency','ms':200},'ok',200)[0]


def test_unknown_kind_rejected():
    c=copy.deepcopy(CASES);c[0]['checks']=[{'type':'magic'}]
    with pytest.raises(ValueError):validate_cases(c)


def test_duplicate_ids_rejected():
    with pytest.raises(ValueError):validate_cases([CASES[0],CASES[0]])


def test_empty_dataset_rejected():
    with pytest.raises(ValueError):validate_cases([])


def test_unknown_response_id_rejected():
    with pytest.raises(ValueError):run({**CAND,'oops':{'output':'x'}})


def test_case_sensitive_citations():
    assert not grade({'type':'citations','required':['DOC']},'Claim [doc]')[0]


def test_compare_finds_regression():
    a=run(CAND);b=run(BASE)
    assert len(compare(a,b)['regressions'])==15


def test_compare_rejects_changed_fingerprint():
    a=run(CAND);b=run(CAND);a['dataset_sha256']='old';b['dataset_sha256']='new'
    with pytest.raises(ValueError):compare(a,b)


def test_compare_rejects_changed_cases():
    a=run(CAND);b=run(CAND);b['results'][0]['context']='changed'
    with pytest.raises(ValueError):compare(a,b)


def test_provider_error_is_failure():
    responses=copy.deepcopy(CAND);responses['FACT-01']={'output':'14 days [POLICY]','error':'timeout'}
    assert not run(responses)['results'][0]['passed']


def test_keyword_negation_limitation_documented():
    # An honest known limitation: matching words does not prove correctness.
    assert grade({'type':'contains_all','values':['14']},'The trial is NOT 14 days.')[0]


def test_response_container_rejected():
    with pytest.raises(ValueError):run([])


def test_check_must_be_object():
    c=copy.deepcopy(CASES);c[0]['checks']=['not an object']
    with pytest.raises(ValueError):validate_cases(c)
