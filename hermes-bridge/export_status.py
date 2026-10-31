#!/usr/bin/env python3
"""Hermes approval read-only status exporter. Standard-library only."""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import sys
import time
from urllib import request, error, parse

ORG = {
    "staff01": "임채리 대리", "staff02": "조사·기획팀 직원",
    "staff03": "임민채 대리", "staff04": "영상·디자인팀 직원 1",
    "staff05": "영상·디자인팀 직원 2", "staff06": "SNS 운영팀장",
    "staff07": "SNS 운영팀 직원", "staff08": "김검수",
    "staff09": "검수·성과팀 직원", "staff10": "동백매니저"
}
VALID_STATUS = ("pending", "approved", "rejected", "stale", "blocked")
DB_PATH = Path.home() / ".hermes/dongbaek-approval/workflow/workqueue.db"

def snapshot(db_path=DB_PATH, now=None):
    path = Path(db_path)
    if not path.is_file():
        raise FileNotFoundError("Hermes 승인 데이터베이스를 찾지 못했습니다.")
    with sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True, timeout=5) as db:
        rows = db.execute("""
          SELECT staff_id, status, COUNT(*) FROM work
          WHERE business_id != 'smartstore'
            AND title NOT LIKE '%선주직판점%' AND summary NOT LIKE '%선주직판점%'
            AND staff_id IN (?,?,?,?,?,?,?,?,?,?)
            AND status IN ('pending','approved','rejected','stale','blocked')
          GROUP BY staff_id,status
        """, tuple(ORG)).fetchall()
    counts = {sid: {s: 0 for s in VALID_STATUS} for sid in ORG}
    for sid, status, count in rows:
        if sid in counts and status in VALID_STATUS:
            counts[sid][status] = min(5000, max(0, int(count)))
    workers = []
    for sid, c in counts.items():
        state = ("approval_pending" if c["pending"] else
                 "needs_review" if c["stale"] or c["blocked"] else
                 "approved_history" if c["approved"] else "no_active_queue")
        workers.append({"id": sid, "state": state,
                        **{key: c[key] for key in VALID_STATUS}})
    return {"schema": 1, "captured_at": int(time.time()) if now is None else int(now),
            "workers": workers}

def push(payload, url, token):
    parsed = parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment or parsed.query or parsed.path != "/api/hermes/push":
        raise ValueError("인증된 HTTPS /api/hermes/push 주소만 허용합니다.")
    if len(token) < 32 or any(ch.isspace() for ch in token):
        raise ValueError("별도의 32자 이상 전송 토큰이 필요합니다.")
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    req = request.Request(url, data=data, method="POST", headers={
        "Content-Type": "application/json", "Authorization": "Bearer " + token})
    class NoRedirect(request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    try:
        with request.build_opener(NoRedirect()).open(req, timeout=10) as resp:
            if resp.status != 200:
                raise RuntimeError(f"전송 실패 HTTP {resp.status}")
            return resp.status
    except error.HTTPError as ex:
        raise RuntimeError(f"전송 실패 HTTP {ex.code}") from None

def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--output", default="")
    parser.add_argument("--push-url", default="")
    args = parser.parse_args(argv)
    try:
        data = snapshot(args.db)
        if args.output:
            target = Path(args.output).expanduser()
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = target.with_name(target.name + ".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            try:
                os.chmod(tmp, 0o600)
            except (PermissionError, OSError):
                # Android shared /sdcard can reject chmod; exported data contains counts only.
                pass
            os.replace(tmp, target)
            print("직원 상태 저장:", target)
        if args.push_url:
            print("전송 HTTP:", push(data, args.push_url, os.environ.get("DONGBAEG_HERMES_PUSH_TOKEN", "")))
        if not args.output and not args.push_url:
            print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, FileNotFoundError, OSError, sqlite3.Error, RuntimeError) as ex:
        print("오류:", ex, file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
