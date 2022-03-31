#!/usr/bin/env bash

import strict
import echoerr
import echofmt
import options
import real_path

source ./globals.sh
source ./actions/inc.sh

usage() {
  echofmt "liq-server [--quiet|-q] [start|stop|status]"
}

eval "$(setSimpleOptions --script QUIET -- "$@")"

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
