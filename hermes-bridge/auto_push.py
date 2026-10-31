#!/usr/bin/env python3
"""Explicit, foreground-only limited Hermes status heartbeat.

Never starts automatically, persists tokens, or touches the approval queue.
It exits after max-runs or the first failure; Ctrl+C stops immediately.
"""
import argparse
import os
import sys
import time
from export_status import snapshot, push

def run(url, interval, runs, db=None):
    token=os.environ.get("DONGBAEG_HERMES_PUSH_TOKEN", "")
    if len(token)<32 or any(c.isspace() for c in token):
        raise ValueError("전송 토큰이 설정되지 않았습니다. 32자 이상 별도 토큰이 필요합니다.")
    for i in range(runs):
        item=snapshot(db) if db else snapshot()
        code=push(item,url,token)
        if code!=200:
            raise RuntimeError(f"상태 전송 실패: HTTP {code}")
        print(f"상태 전송 {i+1}/{runs}: HTTP {code} (고객 파일·토큰 출력 없음)",flush=True)
        if i+1<runs:
            time.sleep(interval)
    return 0

def main():
    p=argparse.ArgumentParser(description="Hermes 승인 상태 임시 자동 전송 (최대 10회, 외부 게시 없음)")
    p.add_argument("--push-url", required=True)
    p.add_argument("--interval",type=int,default=60)
    p.add_argument("--max-runs",type=int,default=3)
    args=p.parse_args()
    if not 30<=args.interval<=600 or not 1<=args.max_runs<=10:
        p.error("interval=30~600초, max-runs=1~10회만 허용합니다.")
    try:
        return run(args.push_url,args.interval,args.max_runs)
    except KeyboardInterrupt:
        print("사용자 요청으로 전송 중지");return 130
    except (ValueError,RuntimeError,OSError) as ex:
        print("전송 중단:",str(ex),file=sys.stderr);return 1
if __name__=="__main__":
    raise SystemExit(main())
