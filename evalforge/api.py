"""Optional FastAPI transport. Starts on localhost, not a hosted service."""
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from .evaluator import evaluate
from .store import save,list_runs


class EvaluationRequest(BaseModel):
    cases: list[dict] = Field(min_length=1, max_length=200)
    responses: dict
    label: str = Field(min_length=1, max_length=120)
    provenance: str = Field(min_length=1, max_length=500)
    mode: str = 'imported'


def create_app(db='runs/evalforge.db'):
    app=FastAPI(title='LLM QualityLab',version='0.1.0',description='Local-first rule-contract evaluations, NOT semantic accuracy guarantees.')

    @app.get('/', response_class=HTMLResponse)
    def dashboard():
        return Path(__file__).with_name('dashboard.html').read_text()

    @app.get('/health')
    def health():
        return {'status':'ok','cloud_inference':False}

    @app.get('/api/runs')
    def runs():
        return list_runs(db)

    @app.post('/api/evaluate', status_code=201)
    def run(request:EvaluationRequest):
        if request.mode not in {'fixture','imported'}:
            raise HTTPException(422,'API accepts saved outputs only; local generation is explicit through CLI')
        if len(json.dumps(request.model_dump()))>2_000_000:
            raise HTTPException(413,'Payload too large; keep cases and outputs under 2 MB')
        try:
            report=evaluate(request.cases,request.responses,label=request.label,mode=request.mode,provenance=request.provenance)
        except (ValueError,TypeError,KeyError) as exc:
            raise HTTPException(422,str(exc)) from exc
        canonical=json.dumps(request.cases,sort_keys=True,separators=(',',':')).encode()
        report.update(id=uuid.uuid4().hex[:12],created_at=datetime.now(timezone.utc).isoformat(),dataset_sha256=hashlib.sha256(canonical).hexdigest())
        save(db,report)
        return report

    return app


app=create_app()
