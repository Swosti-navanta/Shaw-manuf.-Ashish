#!/bin/sh
# App Service Startup Command: `sh startup.sh`, run from /home/site/wwwroot.
set -eu

# App Service Linux sets HOSTNAME to the container's id. Next's standalone
# server reads HOSTNAME as its bind address, so left alone it binds to a name
# that resolves nowhere and every request times out on a healthy container.
export HOSTNAME=0.0.0.0

# App Service routes inbound traffic to PORT; the fallback is only for running
# this script by hand against a local standalone build.
export PORT="${PORT:-8080}"

exec node server.js
