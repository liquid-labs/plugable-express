liq-server-start() {
  [[ -n "${QUIET}" ]] || echofmt "Starting..."
  
  local MY_DIR NODE_SCRIPT
  MY_DIR="$(dirname "${0}")"
  NODE_SCRIPT="${MY_DIR}/liq-server.js"
  
  node "${NODE_SCRIPT}" &
  local SERVER_PID=$!
  echo "${SERVER_PID}" > "${LIQ_SERVER_PID_FILE}"
  
  pgrep -q -F "${LIQ_SERVER_PID_FILE}" || {
    rm "${LIQ_SERVER_PID_FILE}"
    echoerrandexit "Server failed to start. See above for any error messages."
  }
  
  [[ -n "${QUIET}" ]] || echofmt "\nServer running (${SERVER_PID})."
}
