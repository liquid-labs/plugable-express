liq-server-reload() {
  set +e
  RESULT="$(curl -X PUT http:/127.0.0.1:32600/server/reload)"
  STATUS=$?
  set -e
  
  if (( $STATUS != 0 )); then
    echo "Curl exitted with errors." >&2
  else
    echo "${RESULT}"
  fi
}
