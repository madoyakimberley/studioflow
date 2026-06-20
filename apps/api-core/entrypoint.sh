#!/bin/sh
# GRACEFUL DEPLOYMENT ENFORCER: Python/FastAPI

echo '{"status": "initializing", "phase": "pre-flight", "message": "Container process engine active. Running pre-start validation gates..."}'

# ==========================================
# PHASE 1: PRE-START DEPENDENCY GATE
# ==========================================
if [ -z "$DATABASE_URL" ]; then
    echo "❌ [INFRASTRUCTURE FAULT]: Missing secret environment variable bounds."
    echo "Diagnostic: DATABASE_URL is null or undefined. The deployment image has been blocked from entering the production pool."
    exit 1
fi

if [ -z "$PORT" ]; then
    echo "⚠️ [WARNING]: PORT is undefined. Defaulting to 8000 to prevent interface binding collisions."
    export PORT=8000
fi

# ==========================================
# PHASE 2: LIVENESS & TRAFFIC ROUTE OPENING
# ==========================================
echo '{"status": "healthy", "phase": "liveness", "message": "Pre-flight checks passed. Booting application framework..."}'

# Execute the target command in the background to allow the shell to trap signals
"$@" &
APP_PID=$!

# ==========================================
# PRE-STOP LIFECYCLE HOOK (DRAINING)
# ==========================================
# Traps SIGTERM (from Kubernetes/Docker/Railway) and forces a sleep window.
# This prevents the container from dying instantly, giving load balancers time to drop this pod from the routing table.
graceful_shutdown() {
    echo '{"status": "terminating", "phase": "draining", "message": "SIGTERM received. Draining load balancer traffic for 10 seconds..."}'
    sleep 10
    echo '{"status": "terminating", "phase": "shutdown", "message": "Traffic drained. Terminating application gracefully..."}'
    kill -SIGTERM "$APP_PID"
    wait "$APP_PID"
    exit 0
}

trap graceful_shutdown SIGTERM SIGINT

# Wait indefinitely on the application process
wait "$APP_PID"