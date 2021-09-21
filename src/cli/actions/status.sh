liq-server-lib-is-up() {
  local STATUS
  STATUS="$(curl -I -o /dev/null -s -w "%{http_code}" http:/127.0.0.1:32600/)"
  
  (( ${STATUS} == 200 ))
}

liq-server-status() {
  if [[ -f "${LIQ_SERVER_PID_FILE}" ]]; then
    if pgrep -q -F "${LIQ_SERVER_PID_FILE}"; then
      liq-server-lib-is-up \
        && { echo running; exit 0; } \
        || { echo starting; exit 102; }
    else # PID file, but not running
      rm "${LIQ_SERVER_PID_FILE}"
      echo stopped
      exit 101
    fi
  elif pgrep -q -f liq-server.js; then
    if liq-server-lib-is-up; then
      echowarn "It looks like the server may be running (process $(pgrep -f liq-server.js)), but no pidfile was found. However, the server is responsive and appears to be running properly."
      exit 103
    else
      echoerr "It looks like the server may be running (process $(pgrep -f liq-server.js)), but no pidfile was found. The server was also unresponsive and should be stopped."
      exit 104
    fi
  else
    echo stopped
    exit 101
  fi
}
