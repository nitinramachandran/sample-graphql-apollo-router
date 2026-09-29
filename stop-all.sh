#!/usr/bin/env bash
# Stops everything started by start-all.sh, by killing the listeners on each port.
set -uo pipefail

for port in 8080 4001 4000 8088 5173; do
  pids=$(lsof -ti:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing listener(s) on :$port -> $pids"
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "Done."
