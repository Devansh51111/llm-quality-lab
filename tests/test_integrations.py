import importlib.util
from pathlib import Path
from unittest.mock import patch
import io
import json
from evalforge.providers import generate

ROOT=Path(__file__).resolve().parents[1]


def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'integrations'/f'{name}.py')
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod


def test_promptfoo_provider_and_assertion():
    p=load('fixture_provider');a=load('assertion')
    cases=json.loads((ROOT/'data/cases.json').read_text())
    for c in cases:
        output=p.call_api('',{'config':{'variant':'candidate'}},{'vars':{'case_id':c['id']}})['output']
        assert a.get_assert(output,{'config':{'case':c}})['pass']


def test_ollama_contract_mock_only():
    case={'id':'x','question':'q','context':'c'}
    with patch('urllib.request.urlopen',return_value=io.BytesIO(b'{"response":"answer"}')) as mock:
        result=generate([case],'local-test')
        assert result['x']['output']=='answer'
        request=mock.call_args[0][0]
        assert request.full_url=='http://127.0.0.1:11434/api/generate'
        assert json.loads(request.data)['stream'] is False


def test_ollama_error_is_preserved():
    with patch('urllib.request.urlopen',side_effect=OSError('offline')):
        assert 'offline' in generate([{'id':'x','question':'q'}],'test')['x']['error']
