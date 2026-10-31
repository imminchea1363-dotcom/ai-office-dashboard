import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest

p=Path(__file__).resolve().parents[1]/'hermes-bridge'/'export_status.py'
spec=importlib.util.spec_from_file_location('hermes_bridge',p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TestExporter(unittest.TestCase):
    def test_real_sqlite_read_only_and_business_exclusion(self):
        with tempfile.TemporaryDirectory() as td:
            db=Path(td)/'workqueue.db'
            with sqlite3.connect(db) as c:
                c.execute('CREATE TABLE work (staff_id TEXT,business_id TEXT,title TEXT,summary TEXT,status TEXT)')
                c.executemany('INSERT INTO work VALUES (?,?,?,?,?)',[
                    ('staff03','client-a','릴스','정상','pending'),
                    ('staff03','client-a','릴스','정상','approved'),
                    ('staff08','client-b','검수','정상','stale'),
                    ('staff01','smartstore','제외','-','approved'),
                    ('staff01','client-c','선주직판점 FAQ','-','pending')])
            s=mod.snapshot(db,1793460000)
            self.assertEqual(len(s['workers']),10)
            x={w['id']:w for w in s['workers']}
            self.assertEqual(x['staff03']['state'],'approval_pending')
            self.assertEqual(x['staff08']['state'],'needs_review')
            self.assertEqual(x['staff01']['state'],'no_active_queue')
            self.assertNotIn('선주직판점',str(s))
            with sqlite3.connect(db) as c:
                self.assertEqual(c.execute('SELECT COUNT(*) FROM work').fetchone()[0],5)

    def test_missing_db_does_not_create_data(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'missing.db'
            with self.assertRaises(FileNotFoundError):mod.snapshot(p)
            self.assertFalse(p.exists())

if __name__=='__main__':unittest.main()
