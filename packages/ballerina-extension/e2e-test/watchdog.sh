#!/bin/bash
# Watches for the intermittent _dyld_start hang on test-resources' VS Code
# CLI invocations (install-extension in particular) and kills any such
# process that sits at 0.0% CPU for two consecutive checks, letting
# Playwright's own retry mechanism recover the suite. Session-scoped, not a
# permanent fix — the underlying hang is an unresolved environment issue.
declare -A zero_streak
while true; do
  while IFS= read -r line; do
    pid=$(echo "$line" | awk '{print $1}')
    cpu=$(echo "$line" | awk '{print $2}')
    etime=$(echo "$line" | awk '{print $3}')
    [ -z "$pid" ] && continue
    cpu_int=${cpu%.*}
    if [ "$cpu_int" = "0" ]; then
      zero_streak[$pid]=$(( ${zero_streak[$pid]:-0} + 1 ))
    else
      zero_streak[$pid]=0
    fi
    if [ "${zero_streak[$pid]:-0}" -ge 2 ]; then
      echo "WATCHDOG: killing stuck test-resources process pid=$pid etime=$etime (0%% CPU for 2+ checks)"
      kill -9 "$pid" 2>/dev/null
      unset "zero_streak[$pid]"
    fi
  done < <(ps -axo pid,%cpu,etime,command | grep "test-resources/Visual Studio Code.app/Contents/MacOS/Electron" | grep -- "--install-extension" | grep -v grep | awk '{print $1, $2, $3}')
  sleep 20
done
