import json
import sqlite3
from pathlib import Path


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.execute('CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, label TEXT NOT NULL, mode TEXT NOT NULL, dataset_sha256 TEXT NOT NULL, report TEXT NOT NULL)')
    return db


def save(path, report):
    with connect(path) as db:
        db.execute('INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?)', (report['id'], report['created_at'], report['label'], report['mode'], report['dataset_sha256'], json.dumps(report)))


def list_runs(path):
    with connect(path) as db:
        return [json.loads(r[0]) for r in db.execute('SELECT report FROM runs ORDER BY created_at DESC, id DESC')]
