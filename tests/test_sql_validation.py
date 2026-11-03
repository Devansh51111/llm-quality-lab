"""Actual SQL assertions on the optional local backend, not Studio localStorage."""
import json
import sqlite3
import pytest
from evalforge.store import save, list_runs, connect

def report(id, date='2026-11-03', label='Synthetic fixture'):
    return dict(id=id, created_at=date, label=label, mode='fixture', dataset_sha256='abc', results=[{'passed':True}])

def test_order_and_count(tmp_path):
    path=tmp_path/'qa.db'
    for r in [report('b'),report('a'),report('z','2026-11-04')]:save(path,r)
    assert [r['id'] for r in list_runs(path)]==['z','b','a']
    with connect(path) as db:
        assert db.execute('SELECT COUNT(*),COUNT(DISTINCT id) FROM runs').fetchone()==(3,3)
        assert db.execute('SELECT mode, COUNT(*) FROM runs GROUP BY mode').fetchall()==[('fixture',3)]
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)

def test_injection_is_data(tmp_path):
    path=tmp_path/'qa.db';r=report("x'); DROP TABLE runs; --",label="quote ' and \" and unicode हिंदी")
    save(path,r)
    with connect(path) as db:
        stored=db.execute('SELECT report FROM runs WHERE id=?',(r['id'],)).fetchone()
        assert json.loads(stored[0])==r
        assert db.execute('SELECT COUNT(*) FROM runs').fetchone()[0]==1

def test_duplicate_rolls_back_without_destroying_existing_report(tmp_path):
    path=tmp_path/'qa.db';original=report('first');save(path,original)
    with pytest.raises(sqlite3.IntegrityError):save(path,report('first',label='altered'))
    assert list_runs(path)==[original]
