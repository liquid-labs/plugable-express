liq-server-stop() {
  set +e
  liq-server-status > /dev/null
  local STATUS=$?
  set -e
  
  if (( ${STATUS} == ${LIQ_SERVER_STATUS_STOPPED} )); then
    [[ -n "${QUIET}" ]] || echofmt "Server already stopped."
    return 0
  fi
  
  [[ -n "${QUIET}" ]] || echofmt "Stopping..."
  
  if (( ${STATUS} == ${LIQ_SERVER_STATUS_RECOVERABLE} )) || \
    (( ${STATUS} == ${LIQ_SERVER_STATUS_RUNNING} )); then
    local RESULT
    RESULT="$(curl -I -o /dev/null -s -w "%{http_code}" -X UNBIND http:/127.0.0.1:32600/)"
    sleep 1
    set +e
    liq-server-status > /dev/null
    STATUS=$?
    set -e
    if (( ${RESULT} == 200 )); then
      if (( ${STATUS} != ${LIQ_SERVER_STATUS_STOPPED} )); then
        echoerr "Server repsonded that it would stop, but it appears to still be running."
        return ${LIQ_SERVER_STATUS_WORKING}
      else
        rm "${LIQ_SERVER_PID_FILE}"
        [[ -n "${QUIET}" ]] || echofmt "Server stopped."
        return 0
      fi
    else
      echoerr "Server did not respond favorable to shutdown request. (${RESULT})"
      return liq-server-lib-try-kill
    fi
  elif (( ${STATUS} == ${LIQ_SERVER_STATUS_UNRECOVERABLE} )); then
    echowarn "Server is in an unrecoverable state."
    return liq-server-lib-try-kill
  fi
}

liq-server-lib-try-kill() {
  local PID_FILE PID_GREP
  PID_FILE=$(cat "${LIQ_SERVER_PID_FILE}")
  PID_GREP=$(pgrep ${LIQ_SERVER_PGREP_MATCH})
  
  if [[ -z "${PID_GREP}" ]]; then
    echoerrandexit "Cannot find processing to kill using 'pgrep ${LIQ_SERVER_PGREP_MATCH}'"
    return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
  elif [[ -n ${PID_FILE} ]] && (( ${PID_FILE} != ${PID_GREP} )); then
    echoerr "Pidfile and pgrep PIDs do not match. Bailing out."
    return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
  else # we will try and kill the found process, but may want to give a warning
    if [[ -z "${PID_FILE}" ]]; then
      echowarn "Found process ${PID_GREP}, but no pidfile; will attempt to kill running process."
    fi
  
    [[ -n "${QUIET}" ]] || echowarn "Attempting to kill server process ${PID_GREP}"
    kill ${PID_GREP} || {
      echowarn "Standard 'SIGTERM' kill did not work, attempting 'kill -9'"
      kill -9 "${PID_GREP}" || {
        echoerr "Could not kill process ${PID_GREP}"
        return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
      }
    }
  fi
}
