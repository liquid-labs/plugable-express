liq-server-lib-is-up() {
  local STATUS
  STATUS="$(curl -I -o /dev/null -s -w "%{http_code}" http:/127.0.0.1:32600/)"
  
  (( ${STATUS} == 200 ))
}

liq-server-status() {
  if [[ -f "${LIQ_SERVER_PID_FILE}" ]]; then
    if pgrep -q -F "${LIQ_SERVER_PID_FILE}"; then
      liq-server-lib-is-up \
        && { [[ -n "${QUIET}" ]] || echo running; return ${LIQ_SERVER_STATUS_RUNNING}; } \
        || { [[ -n "${QUIET}" ]] || echo starting; return ${LIQ_SERVER_STATUS_STARTING}; }
    else # PID file, but not running
      rm "${LIQ_SERVER_PID_FILE}"
      [[ -n "${QUIET}" ]] || echo stopped
      return ${LIQ_SERVER_STATUS_STOPPED}
    fi
  elif pgrep -q -f liq-server.js; then
    if liq-server-lib-is-up; then
      echowarn "It looks like the server may be running (process $(pgrep -f liq-server.js)), but no pidfile was found. However, the server is responsive and appears to be running properly."
      [[ -n "${QUIET}" ]] || echo recoverable
      return ${LIQ_SERVER_STATUS_RECOVERABLE}
    else
      echoerr "It looks like the server may be running (process $(pgrep -f liq-server.js)), but no pidfile was found. The server was also unresponsive and should be stopped."
      [[ -n "${QUIET}" ]] || echo unrecoverable
      return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
    fi
  else
    [[ -n "${QUIET}" ]] || echo stopped
    return ${LIQ_SERVER_STATUS_STOPPED}
  fi
}
