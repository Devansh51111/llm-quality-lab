import json
from pathlib import Path
from fastapi.testclient import TestClient
from evalforge.api import create_app
ROOT=Path(__file__).resolve().parents[1]


def test_api_roundtrip(tmp_path):
    client=TestClient(create_app(str(tmp_path/'runs.db')))
    assert client.get('/health').json()['cloud_inference'] is False
    assert client.get('/api/runs').json()==[]
    payload={'cases':json.loads((ROOT/'data/cases.json').read_text()),'responses':json.loads((ROOT/'data/candidate.json').read_text()),'label':'API test','provenance':'Synthetic integration fixture','mode':'fixture'}
    response=client.post('/api/evaluate',json=payload)
    assert response.status_code==201
    assert response.json()['summary']['passed']==16
    assert len(client.get('/api/runs').json())==1
    assert client.get('/docs').status_code==200


def test_api_rejects_bad_cases(tmp_path):
    client=TestClient(create_app(str(tmp_path/'runs.db')))
    p={'cases':[{'id':'x'}],'responses':{},'label':'bad','provenance':'test'}
    assert client.post('/api/evaluate',json=p).status_code==422
