#!/usr/bin/env bash

import strict
import echoerr
import echofmt
# import options
import real_path

source ./globals.sh
source ./actions/inc.sh

usage() {
  echofmt "liq-server [start|stop|restart|status]"
}

# eval "$(setSimpleOptions --script QUIET -- "$@")"

ACTION="${1:-}"

[[ -n "${ACTION}" ]] || ACTION=status

[[ -d "${LIQ_SERVER_DB}" ]] || mkdir -p "${LIQ_SERVER_DB}"

if [[ $(type -t "liq-server-${ACTION}") == 'function' ]]; then
  liq-server-${ACTION}
else
  usage
  echoerrandexit "Unknown action '${ACTION}'. See usage above"
fi
