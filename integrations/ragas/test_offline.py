import importlib.util
import pathlib
import socket
import pytest
path=pathlib.Path(__file__).with_name('run_offline.py')
spec=importlib.util.spec_from_file_location('ragas_adapter',path);adapter=importlib.util.module_from_spec(spec);spec.loader.exec_module(adapter)

def test_actual_library_scores_without_network(monkeypatch):
    def fail(*a,**k):raise AssertionError('Offline metrics must not open network connections')
    monkeypatch.setattr(socket.socket,'connect',fail)
    exact=adapter.measure('The motor warranty lasts two years.','The motor warranty lasts two years.')
    wrong=adapter.measure('The motor warranty lasts two years.','The motor warranty lasts five years.')
    assert exact=={'exact_match':1.0,'levenshtein_similarity':1.0,'rougeL_f1':1.0}
    assert wrong['exact_match']==0
    assert wrong['rougeL_f1']>.8 # Demonstrates overlap is not factual support.
    assert wrong['levenshtein_similarity']>.8
    with pytest.raises(ValueError):adapter.measure(None,'x')

def test_full_fixture_report(monkeypatch):
    def fail(*a,**k):raise AssertionError('Offline metrics must not open network connections')
    monkeypatch.setattr(socket.socket,'connect',fail)
    result=adapter.run();assert len(result['results'])==24;assert result['library']=='ragas';assert result['modelCalls']==0
    assert set(result['byAuthoredLabel'])=={'supported','contradicted','not_in_reference','uncertain'}
