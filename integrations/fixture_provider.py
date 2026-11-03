"""Promptfoo mock provider. Never calls a model or paid API."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def call_api(prompt, options, context):
    variant = options.get('config', {}).get('variant', 'candidate')
    if variant not in {'baseline', 'candidate'}:
        return {'error': 'Unknown fixture variant'}
    records = json.loads((ROOT / 'data' / (variant + '.json')).read_text())
    cid = context.get('vars', {}).get('case_id')
    if cid not in records:
        return {'error': 'Unknown case id'}
    return {'output': records[cid]['output']}
