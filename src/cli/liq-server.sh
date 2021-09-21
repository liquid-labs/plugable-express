#!/usr/bin/env bash

import strict
import echoerr
import echofmt

source ./globals.sh
source ./actions/inc.sh

usage() {
  echofmt "liq-server [start|stop|status]"
}

ACTION="${1:-}"

[[ -n "${ACTION}" ]] || ACTION=status

[[ -d "${LIQ_SERVER_DB}" ]] || mkdir -p "${LIQ_SERVER_DB}"

case "${ACTION}" in
  start|stop|status)
    liq-server-${ACTION};;
  *)
    usage
    echoerrandexit "Unknown action '${ACTION}'. See usage above";;
esac
