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
  local STARTED=1
  local ATTEMPTS=0
  local MAX_ATTEMPTS=10
  while (( ${STARTED} != 0 )) && (( ${ATTEMPTS} < ${MAX_ATTEMPTS})); do
    sleep 1
    curl http://127.0.0.1:32600/ >/dev/null 2>&1
    STARTED=$?
    ATTEMPTS=$(( ${ATTEMPTS} + 1 ))
  done
  if (( ${STARTED} != 0 )); then
    echo "Server faild to start after ${MAX_ATTEMPTS} attempts. Check status manually or kill and restart." >&2
  fi
  echo "Registering server api..."
  curl -X OPTIONS http://127.0.0.1:32600/* | jq > "${HOME}/.liq/core-api.json"
  return ${LIQ_SERVER_STATUS_RUNNING}
}
