"""Expose the same inspectable contracts through a real Promptfoo assertion."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from evalforge.evaluator import grade


def get_assert(output, context):
    case = context['config']['case']
    checks = [grade(c, output) for c in case['checks']]
    return {'pass': all(p for p, _ in checks), 'score': sum(p for p, _ in checks) / len(checks), 'reason': '; '.join(reason for passed, reason in checks if not passed) or 'All declared contracts passed'}
