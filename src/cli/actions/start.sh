liq-server-start() {
  set +e
  liq-server-status > /dev/null
  local STATUS=$?
  set -e
  if (( ${STATUS} == ${LIQ_SERVER_STATUS_RUNNING} )); then
    [[ -n "${QUIET}" ]] || echofmt "Server already running. Nothing to do."
    return ${LIQ_SERVER_STATUS_RUNNING}
  fi
  
  if (( ${STATUS} != ${LIQ_SERVER_STATUS_STOPPED} )); then
    echowarn "Server is not running cleanly, nor stopped. Bailing out."
    return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
  fi
  
  [[ -n "${QUIET}" ]] || echofmt "Starting..."
  
  local MY_DIR NODE_SCRIPT
  MY_DIR="$(dirname "${0}")"
  NODE_SCRIPT="${MY_DIR}/liq-server.js"
  
  node "${NODE_SCRIPT}" &
  local SERVER_PID=$!
  echo "${SERVER_PID}" > "${LIQ_SERVER_PID_FILE}"
  
  pgrep -q -F "${LIQ_SERVER_PID_FILE}" || {
    rm "${LIQ_SERVER_PID_FILE}"
    echoerr "Server failed to start. See above for any error messages."
    return ${LIQ_SERVER_STATUS_UNRECOVERABLE}
  }
  
  [[ -n "${QUIET}" ]] || echofmt "\nServer running (${SERVER_PID})."
  return ${LIQ_SERVER_STATUS_RUNNING}
}
