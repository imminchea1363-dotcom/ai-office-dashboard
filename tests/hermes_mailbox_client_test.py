import importlib.util
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "server" / "hermes_mailbox_client.py"
spec = importlib.util.spec_from_file_location("dongbaek_mailbox_client", MODULE)
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class MailboxClientTest(unittest.TestCase):
    def test_claim_show_submit_without_running_hermes(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / ".hermes" / "claim.json"
            task = {
                "id": "01234567-89ab-4cde-8f01-1234567890ab",
                "staffId": 3, "title": "홍보 초안", "brief": "소개글 작성",
                "output": "검수용 문구", "mode": "draft_only",
                "claimToken": "12345678-9abc-4def-8123-1234567890ab",
                "policy": "승인 전 게시 금지"
            }
            sent = []

            def fake_api(path, payload=None):
                sent.append((path, payload))
                return {"task": task} if payload is None else {"id": task["id"], "status": "completed"}

            with patch.object(client, "STATE", state), patch.object(client, "api", fake_api):
                out = io.StringIO()
                with redirect_stdout(out):
                    client.claim()
                    client.show()
                self.assertEqual(len(sent), 1)
                self.assertTrue(state.exists())
                self.assertEqual(os.stat(state).st_mode & 0o777, 0o600)
                self.assertNotIn(task["claimToken"], out.getvalue())
                self.assertIn(task["title"], out.getvalue())
                with self.assertRaisesRegex(RuntimeError, "still saved"):
                    client.claim()
                result = Path(directory) / "result.txt"
                result.write_text("검수용 본문", encoding="utf-8")
                with redirect_stdout(io.StringIO()):
                    client.submit(str(result), "completed")
                self.assertEqual(sent[1][0], "/api/hermes/agent/result")
                self.assertEqual(sent[1][1]["result"], "검수용 본문")
                self.assertEqual(sent[1][1]["claimToken"], task["claimToken"])
                self.assertFalse(state.exists())

    def test_failed_submission_keeps_claim_for_manual_recovery(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "claim.json"
            state.write_text(json.dumps({"id": "test", "claimToken": "secret"}), encoding="utf-8")
            result = Path(directory) / "response.txt"
            result.write_text("작성 실패", encoding="utf-8")
            with patch.object(client, "STATE", state), patch.object(client, "api", side_effect=RuntimeError("network unknown")):
                with self.assertRaisesRegex(RuntimeError, "network unknown"):
                    client.submit(str(result), "failed")
                self.assertTrue(state.exists())
                self.assertEqual(client.read_claim()["claimToken"], "secret")


if __name__ == "__main__":
    unittest.main()
