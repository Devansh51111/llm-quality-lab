import argparse
import hashlib
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from .evaluator import evaluate, compare, validate_cases
from .providers import generate
from .store import save, list_runs


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='LLM QualityLab: inspectable local LLM QA')
    sub = parser.add_subparsers(dest='command', required=True)
    run = sub.add_parser('run', help='Evaluate fixtures, imported outputs or a local Ollama model')
    run.add_argument('--cases', default='data/cases.json')
    group = run.add_mutually_exclusive_group(required=True)
    group.add_argument('--responses')
    group.add_argument('--ollama', metavar='MODEL')
    run.add_argument('--mode', choices=['fixture', 'imported'], default='fixture')
    run.add_argument('--label', required=True)
    run.add_argument('--provenance', default='Hand-authored synthetic fixtures; not live model results')
    run.add_argument('--out', default='runs/latest.json')
    run.add_argument('--db', default='runs/evalforge.db')
    cmp = sub.add_parser('compare')
    cmp.add_argument('baseline')
    cmp.add_argument('candidate')
    cmp.add_argument('--out')
    serve = sub.add_parser('serve', help='Local read-only dashboard')
    serve.add_argument('--db', default='runs/evalforge.db')
    serve.add_argument('--port', type=int, default=8765)
    exp = sub.add_parser('export-promptfoo')
    exp.add_argument('--cases', default='data/cases.json')
    exp.add_argument('--out', default='promptfooconfig.json')
    args = parser.parse_args()
    try:
        if args.command == 'run':
            cases = validate_cases(load(args.cases))
            canonical = json.dumps(cases, sort_keys=True, separators=(',', ':')).encode()
            responses = generate(cases, args.ollama) if args.ollama else load(args.responses)
            mode = 'ollama' if args.ollama else args.mode
            provenance = f'Local Ollama model {args.ollama}; wall-clock latency includes load and request overhead' if args.ollama else args.provenance
            report = evaluate(cases, responses, label=args.label, mode=mode, provenance=provenance)
            report.update(id=uuid.uuid4().hex[:12], created_at=datetime.now(timezone.utc).isoformat(), dataset_sha256=hashlib.sha256(canonical).hexdigest())
            write(args.out, report)
            save(args.db, report)
            print(json.dumps(report['summary'], indent=2))
            print('Saved ' + args.out)
            return 0 if report['summary']['release_gate'] else 1
        if args.command == 'compare':
            result = compare(load(args.baseline), load(args.candidate))
            if args.out:
                write(args.out, result)
            print(json.dumps(result, indent=2))
            return 1 if result['regressions'] else 0
        if args.command == 'serve':
            from .web import serve
            serve(args.db, args.port)
        if args.command == 'export-promptfoo':
            cases = validate_cases(load(args.cases))
            # A mock provider proves the framework bridge; not a model-quality benchmark.
            config = {'description': 'LLM QualityLab synthetic-fixture bridge (no paid API)', 'prompts': ['{{question}}'], 'providers': [{'id': 'file://integrations/fixture_provider.py', 'config': {'variant': 'candidate'}}], 'tests': []}
            for c in cases:
                config['tests'].append({'description': c['id'], 'vars': {'case_id': c['id'], 'question': c['question']}, 'assert': [{'type': 'python', 'value': 'file://integrations/assertion.py', 'config': {'case': c}}]})
            write(args.out, config)
            print('Wrote ' + args.out)
        return 0
    except (ValueError, OSError, TypeError, KeyError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
