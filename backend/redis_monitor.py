# -*- coding: utf-8 -*-
"""
FocusMail Redis Live Monitor
----------------------------
Run this in a terminal while using the app to watch Redis in real-time.

Usage:
    cd backend
    python redis_monitor.py
"""
import os
import sys
import time
from datetime import datetime

# Force UTF-8 output so it works on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(".env")
except ImportError:
    pass

import redis as redis_lib

url = os.getenv("REDIS_URL", "redis://localhost:6379")
r = redis_lib.from_url(url, decode_responses=True, socket_connect_timeout=5)


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def human_ttl(seconds):
    if seconds < 0:
        return "no expiry"
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


print("Connecting to Redis... ", end="", flush=True)
try:
    r.ping()
    print("OK\n")
except Exception as e:
    print(f"FAILED: {e}")
    sys.exit(1)

prev_hits = 0
prev_misses = 0
prev_cmds = 0

try:
    while True:
        clear()

        now = datetime.now().strftime("%H:%M:%S")
        print("=" * 58)
        print(f"   FocusMail -- Redis Live Monitor          {now}")
        print("=" * 58)
        print()

        # Stats
        info = r.info("stats")
        hits    = info.get("keyspace_hits", 0)
        misses  = info.get("keyspace_misses", 0)
        cmds    = info.get("total_commands_processed", 0)
        total   = hits + misses
        hit_rate = round(hits / total * 100, 1) if total > 0 else 0.0

        delta_hits   = hits   - prev_hits
        delta_misses = misses - prev_misses
        delta_cmds   = cmds   - prev_cmds
        prev_hits, prev_misses, prev_cmds = hits, misses, cmds

        print("  STATS")
        print(f"  Cache Hits     : {hits:>6}   (+{delta_hits} since last tick)")
        print(f"  Cache Misses   : {misses:>6}   (+{delta_misses} since last tick)")
        print(f"  Hit Rate       : {hit_rate:>5}%")
        print(f"  Total Commands : {cmds:>6}   (+{delta_cmds} since last tick)")
        print()

        # Keys breakdown
        all_keys      = r.keys("focusmail:*")
        classify_keys  = [k for k in all_keys if ":classify:"  in k]
        pkce_keys      = [k for k in all_keys if ":pkce:"      in k]
        blocklist_keys = [k for k in all_keys if ":blocklist:" in k]
        stats_keys     = [k for k in all_keys if ":stats:"     in k]

        print(f"  KEYS  ({len(all_keys)} total in Redis)")
        print(f"  [LLM]       classify cache  : {len(classify_keys):>3} keys  -- category+priority per email (30d TTL)")
        print(f"  [AUTH]      PKCE state      : {len(pkce_keys):>3} keys  -- active login sessions (10min TTL)")
        print(f"  [AUTH]      JWT blocklist   : {len(blocklist_keys):>3} keys  -- revoked tokens (7d TTL)")
        print(f"  [STATS]     stats cache     : {len(stats_keys):>3} keys  -- full dashboard JSON (60s TTL)")
        print()

        # Stats cache detail
        if stats_keys:
            ttl = r.ttl(stats_keys[0])
            print(f"  Stats cache expires in : {human_ttl(ttl)}")
        else:
            print("  Stats cache : EMPTY  (open the dashboard to populate)")

        # PKCE keys - someone mid-login
        if pkce_keys:
            print()
            print(f"  Active login sessions ({len(pkce_keys)}):")
            for k in pkce_keys:
                ttl = r.ttl(k)
                print(f"    ...{k[-20:]}   expires in {human_ttl(ttl)}")

        # Blocklist
        if blocklist_keys:
            print()
            print(f"  Revoked tokens : {len(blocklist_keys)}")

        # Last 3 classify cache entries
        if classify_keys:
            print()
            print(f"  Cached email classifications (showing last 3 of {len(classify_keys)}):")
            print(f"  {'KEY (last 12 chars)':<16}  {'CACHED VALUE':<40}  TTL")
            print(f"  {'-'*16}  {'-'*40}  -------")
            for k in classify_keys[-3:]:
                val = r.get(k) or ""
                ttl = r.ttl(k)
                short_key = k[-16:]
                print(f"  ...{short_key:<16}  {val:<40}  {human_ttl(ttl)}")

        print()
        print("  Refreshing every 2s -- press Ctrl+C to stop")
        time.sleep(2)

except KeyboardInterrupt:
    print("\n\nMonitor stopped.")
