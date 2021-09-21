#!/usr/bin/env bash

import strict
import echoerr
import echofmt

source ./actions/inc.sh

usage() {
  echofmt "liq-server [start|stop|status]"
}

ACTION="${1:-}"

[[ -n "${ACTION}" ]] || ACTION=status

case "${ACTION}" in
  start|stop|status)
    liq-server-${ACTION};;
  *)
    usage
    echoerrandexit "Unknown action '${ACTION}'. See usage above";;
esac
