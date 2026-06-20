#!/bin/sh
# GRACEFUL DEPLOYMENT ENFORCER: Node.js/Next.js

echo '{"status": "initializing", "phase": "pre-flight", "message": "Container process engine active. Running pre-start validation gates..."}'

# ==========================================
# PHASE 1: PRE-START DEPENDENCY GATE
# ==========================================
if [ "$APP_ENV" = "production" ] || [ "$NODE_ENV" = "production" ]; then
    if [ ! -d ".next" ]; then
        echo "❌ [INFRASTRUCTURE FAULT]: Static compilation payload missing."
        echo "Diagnostic: The .next build directory was not found. Build phase failed or was skipped. Halting rollout."
        exit 1
    fi
fi

if [ -z "$PORT" ]; then
    export PORT=3000
fi

# ==========================================
# PHASE 2: LIVENESS & TRAFFIC ROUTE OPENING
# ==========================================
echo '{"status": "healthy", "phase": "liveness", "message": "Pre-flight checks passed. Booting Node instance..."}'

"$@" &
APP_PID=$!

# ==========================================
# PRE-STOP LIFECYCLE HOOK (DRAINING)
# ==========================================
graceful_shutdown() {
    echo '{"status": "terminating", "phase": "draining", "message": "SIGTERM received. Draining load balancer traffic for 10 seconds..."}'
    sleep 10
    echo '{"status": "terminating", "phase": "shutdown", "message": "Traffic drained. Terminating application gracefully..."}'
    kill -SIGTERM "$APP_PID"
    wait "$APP_PID"
    exit 0
}

trap graceful_shutdown SIGTERM SIGINT

wait "$APP_PID"