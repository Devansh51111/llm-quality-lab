"""Deterministic contracts, NOT semantic hallucination/safety classifiers."""
import json
import math
import re

KINDS = {'contains_all', 'contains_any', 'excludes', 'json_schema', 'citations', 'max_latency', 'no_pii', 'numeric_claims'}


def validate_cases(cases):
    if not isinstance(cases, list) or not cases:
        raise ValueError('Dataset must be a nonempty JSON array')
    ids = set()
    for c in cases:
        if not isinstance(c, dict) or not isinstance(c.get('id'), str) or not c['id']:
            raise ValueError('Each case needs a nonempty string id')
        if c['id'] in ids:
            raise ValueError('Duplicate case id: ' + c['id'])
        ids.add(c['id'])
        for field in ('question', 'category', 'severity'):
            if not isinstance(c.get(field), str) or not c[field]:
                raise ValueError(f'{c["id"]}: missing {field}')
        if c['severity'] not in {'critical', 'major', 'minor'}:
            raise ValueError('Severity must be critical, major or minor')
        if not isinstance(c.get('checks'), list) or not c['checks']:
            raise ValueError('Each case needs checks')
        for check in c['checks']:
            if not isinstance(check, dict):
                raise ValueError('Each check must be an object')
            if check.get('type') not in KINDS:
                raise ValueError('Unknown check type: ' + str(check.get('type')))
            k = check['type']
            if k in {'contains_all', 'contains_any', 'excludes'}:
                if not isinstance(check.get('values'), list) or not check['values'] or any(not isinstance(v, str) or not v.strip() for v in check['values']):
                    raise ValueError(f'{k} needs nonempty string values')
            if k == 'max_latency' and (not isinstance(check.get('ms'), (int, float)) or isinstance(check['ms'], bool) or check['ms'] <= 0 or not math.isfinite(check['ms'])):
                raise ValueError('max_latency needs a positive finite ms budget')
            if k == 'citations' and (not isinstance(check.get('required'), list) or not check['required']):
                raise ValueError('citations needs required source ids')
            if k == 'json_schema' and (not isinstance(check.get('required'), dict) or any(v not in {'string','array','number','boolean','object'} for v in check.get('required', {}).values())):
                raise ValueError('json_schema needs a supported required field/type map')
            if k == 'numeric_claims' and (not isinstance(check.get('allowed'), list) or not check['allowed']):
                raise ValueError('numeric_claims needs allowed numeric strings')
    return cases


def grade(check, output, latency_ms=None):
    kind = check['type']
    folded = output.casefold()
    if kind in {'contains_all', 'contains_any', 'excludes'}:
        found = [v for v in check['values'] if v.casefold() in folded]
        if kind == 'contains_all':
            missing = [v for v in check['values'] if v not in found]
            return not missing, 'Missing expected text: ' + ', '.join(missing) if missing else 'All expected text found'
        if kind == 'contains_any':
            return bool(found), 'Expected phrase found' if found else 'None of the accepted phrases found'
        return not found, 'Prohibited text: ' + ', '.join(found) if found else 'No listed prohibited text found'
    if kind == 'json_schema':
        try:
            parsed = json.loads(output)
        except (ValueError, TypeError):
            return False, 'Output is not valid JSON'
        if not isinstance(parsed, dict):
            return False, 'Expected a JSON object'
        types = {'string': str, 'array': list, 'number': (int, float), 'boolean': bool, 'object': dict}
        for key, expected in check['required'].items():
            if expected not in types:
                return False, 'Unsupported schema type: ' + expected
            if key not in parsed or not isinstance(parsed[key], types[expected]) or (expected == 'number' and isinstance(parsed[key], bool)):
                return False, f'Field {key} missing or wrong type ({expected})'
        return True, 'Required fields and top-level types valid (schema subset)'
    if kind == 'citations':
        cited = set(re.findall(r'\[([A-Za-z0-9_-]+)\]', output))
        missing = set(check['required']) - cited
        unknown = cited - set(check.get('allowed', check['required']))
        return not missing and not unknown, f'Missing source ids: {sorted(missing)}; unknown source ids: {sorted(unknown)}'
    if kind == 'no_pii':
        email = re.search(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', output)
        phone = re.search(r'(?<!\w)\+?\d[\d ()-]{8,}\d(?!\w)', output)
        return not (email or phone), 'Email/phone-like pattern detected' if email or phone else 'No email/phone-like pattern detected'
    if kind == 'numeric_claims':
        found = set(re.findall(r'(?<![\w-])\d+(?:\.\d+)?(?![\w-])', re.sub(r'\[[A-Za-z0-9_-]+\]', '', output)))
        unexpected = found - set(map(str, check['allowed']))
        return not unexpected, 'Unexpected number(s): ' + ', '.join(sorted(unexpected)) if unexpected else 'Numbers are within this case allowlist'
    if kind == 'max_latency':
        if latency_ms is None:
            return False, 'Latency unavailable; cannot pass a performance check'
        ok = isinstance(latency_ms, (int, float)) and not isinstance(latency_ms, bool) and math.isfinite(latency_ms) and 0 <= latency_ms <= check['ms']
        return ok, f'Observed {latency_ms} ms; budget {check["ms"]} ms'
    raise ValueError('Unknown check: ' + kind)


def evaluate(cases, responses, *, label, mode, provenance):
    validate_cases(cases)
    if mode not in {'fixture', 'imported', 'ollama'}:
        raise ValueError('Unknown run mode')
    if not isinstance(responses, dict):
        raise ValueError('Responses must be an object keyed by case id')
    expected_ids = {c['id'] for c in cases}
    extra = set(responses) - expected_ids
    if extra:
        raise ValueError('Unknown response ids: ' + ', '.join(sorted(extra)))
    results = []
    for case in cases:
        item = responses.get(case['id'])
        error = None
        output = ''
        latency = None
        if item is None:
            error = 'Response missing'
        elif not isinstance(item, dict) or not isinstance(item.get('output'), str):
            error = 'Response must contain a string output'
        else:
            output, latency = item['output'], item.get('latency_ms')
            error = item.get('error')
            if not output.strip() and not error:
                error = 'Empty output'
        checks = []
        for check in case['checks']:
            passed, reason = (False, error) if error else grade(check, output, latency)
            checks.append({'type': check['type'], 'passed': bool(passed), 'reason': reason})
        results.append({**{k: case[k] for k in ('id', 'category', 'severity', 'question')}, 'context': case.get('context', ''), 'output': output, 'latency_ms': latency, 'error': error, 'checks': checks, 'passed': all(x['passed'] for x in checks)})
    passed = sum(r['passed'] for r in results)
    critical_failures = sum(not r['passed'] and r['severity'] == 'critical' for r in results)
    category = {}
    for name in sorted({r['category'] for r in results}):
        subset = [r for r in results if r['category'] == name]
        category[name] = {'passed': sum(r['passed'] for r in subset), 'total': len(subset)}
    rate = passed / len(results)
    # Hard critical gate prevents the average hiding a privacy/safety regression.
    gate = critical_failures == 0 and rate >= 0.90
    return {'label': label, 'mode': mode, 'provenance': provenance, 'summary': {'passed': passed, 'total': len(results), 'pass_rate': round(rate * 100, 2), 'critical_failures': critical_failures, 'release_gate': gate, 'policy': 'At least 90% cases pass AND zero critical failures'}, 'categories': category, 'results': results}


def compare(baseline, candidate):
    a, b = ({r['id']: r for r in run['results']} for run in (baseline, candidate))
    if a.keys() != b.keys():
        raise ValueError('Cannot compare different case-id sets')
    for cid in a:
        for field in ('question', 'context', 'category', 'severity'):
            if a[cid][field] != b[cid][field]:
                raise ValueError('Cannot compare changed dataset content')
    if baseline.get('dataset_sha256') != candidate.get('dataset_sha256'):
        raise ValueError('Dataset fingerprints differ')
    return {'baseline': baseline['label'], 'candidate': candidate['label'], 'improvements': [cid for cid in a if not a[cid]['passed'] and b[cid]['passed']], 'regressions': [cid for cid in a if a[cid]['passed'] and not b[cid]['passed']], 'unchanged': sum(a[cid]['passed'] == b[cid]['passed'] for cid in a)}
