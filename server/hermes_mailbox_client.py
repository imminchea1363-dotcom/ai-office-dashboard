#!/usr/bin/env python3
"""Manual Hermes mailbox pilot for Termux. Does not run Hermes or execute user requests."""
import argparse
import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

SERVER = "https://dongbaek-api.imminchea1363.workers.dev"
STATE = Path.home() / ".hermes" / "dongbaek-mailbox-claim.json"
MAX_RESPONSE = 65536


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Unexpected redirect: request was not forwarded")


def token():
    value = os.environ.get("HERMES_AGENT_TOKEN", "")
    if not 32 <= len(value) <= 256 or any(ord(ch) < 33 or ord(ch) > 126 for ch in value):
        raise RuntimeError("HERMES_AGENT_TOKEN must be a distinct 32+ character secret in the environment")
    return value


def api(path, payload=None):
    if not path.startswith("/api/hermes/agent/"):
        raise ValueError("Disallowed API path")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    headers = {"Authorization": "Bearer " + token(), "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(SERVER + path, data=body, headers=headers,
                                 method="POST" if body is not None else "GET")
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(req, timeout=25) as response:
            raw = response.read(MAX_RESPONSE + 1)
            if len(raw) > MAX_RESPONSE:
                raise RuntimeError("Oversized server response")
            if response.status not in (200, 201):
                raise RuntimeError("Server rejected the request")
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as error:
        # Never log Authorization credentials or detailed server internals.
        raise RuntimeError("Server returned HTTP " + str(error.code)) from None
    except urllib.error.URLError:
        raise RuntimeError("Network problem. Do not assume the request failed or retry automatic execution.") from None


def store(task):
    STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".dongbaek-claim-", dir=STATE.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            os.fchmod(handle.fileno(), 0o600)
            json.dump(task, handle, ensure_ascii=False, indent=2)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, STATE)
        os.chmod(STATE, 0o600)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def read_claim():
    if not STATE.exists():
        raise RuntimeError("No saved claim. Run claim first.")
    with STATE.open("r", encoding="utf-8") as handle:
        result = json.load(handle)
    if not isinstance(result, dict) or not result.get("claimToken"):
        raise RuntimeError("Saved claim is damaged. Never re-execute automatically.")
    return result


def claim():
    if STATE.exists():
        raise RuntimeError("An earlier claim is still saved; complete or investigate it before claiming another task.")
    response = api("/api/hermes/agent/next")
    task = response.get("task")
    if task is None:
        print("No waiting Hermes task.")
        return
    if not isinstance(task, dict) or task.get("mode") != "draft_only" or not task.get("claimToken"):
        raise RuntimeError("Unexpected task response. Do not execute it.")
    store(task)
    print("Claim saved locally. Task ID:", task.get("id", "unknown"))
    print("Use 'show' to read the drafting instructions. This command did not run Hermes.")


def show():
    task = read_claim()
    for label, key in (("Assigned staff", "staffId"), ("Title", "title"), ("Brief", "brief"),
                       ("Requested output", "output"), ("Restrictions", "policy")):
        print(label + ":", task.get(key, ""))
    print("\nWrite the reviewed draft to a UTF-8 file; then submit it with the client.")
    print("No external publishing, payment, file changes or other side effects are allowed.")


def submit(filepath, status):
    task = read_claim()
    result = Path(filepath).read_text(encoding="utf-8").strip()
    if not result or len(result) > 12000:
        raise RuntimeError("Result must contain 1-12000 characters")
    reply = api("/api/hermes/agent/result",
                {"id": task["id"], "claimToken": task["claimToken"],
                 "status": status, "result": result})
    if reply.get("id") != task["id"] or reply.get("status") != status:
        raise RuntimeError("Unexpected server acknowledgement; keep local claim for investigation")
    STATE.unlink()
    print("Result saved on server. Status:", status)
    print("The draft still requires review and was not published.")


def main():
    parser = argparse.ArgumentParser(description="Dongbaek Hermes mailbox: manual approval pilot")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("claim", help="Claim exactly one queued task, without executing it")
    sub.add_parser("show", help="Show the saved task; do not reveal the claim token")
    submit_parser = sub.add_parser("submit", help="Return a manually reviewed result")
    submit_parser.add_argument("--file", required=True, help="UTF-8 text file with result")
    submit_parser.add_argument("--status", choices=["completed", "failed"], default="completed")
    args = parser.parse_args()
    try:
        if args.command == "claim":
            claim()
        elif args.command == "show":
            show()
        else:
            submit(args.file, args.status)
    except (RuntimeError, ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        print("Hermes mailbox error:", str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
