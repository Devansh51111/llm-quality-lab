from evalforge.store import save,list_runs
import pytest
import sqlite3


def test_sqlite_roundtrip(tmp_path):
    p=tmp_path/'runs.db'
    report={'id':'abc','created_at':'2026-01-01','label':"O'Reilly <script>",'mode':'fixture','dataset_sha256':'hash','results':[]}
    save(p,report)
    assert list_runs(p)==[report]
    with pytest.raises(sqlite3.IntegrityError):save(p,report)
