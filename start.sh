#!/usr/bin/env bash
# Bootstrap dependencies (if needed), start backend, wait until healthy, then start frontend.
# Usage (from repo root): ./start.sh
# Stop both with Ctrl+C.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"
HEALTH_URL="http://${BACKEND_HOST}:${BACKEND_PORT}/health/ready"
APP_URL="http://127.0.0.1:${FRONTEND_PORT}"
API_DOCS_URL="http://${BACKEND_HOST}:${BACKEND_PORT}/docs"
BACKEND_PID=""
FRONTEND_PID=""

log() {
  printf '[start] %s\n' "$*"
}

die() {
  printf '[start] ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  trap - EXIT INT TERM
  log "Stopping services…"
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    pkill -P "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
  log "Stopped."
}

trap cleanup EXIT INT TERM

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "${port}" >/dev/null 2>&1
    return $?
  fi
  return 1
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-90}"
  local sleep_s="${4:-0.5}"
  local attempt

  log "Waiting for ${label} at ${url}…"
  for attempt in $(seq 1 "${attempts}"); do
    if curl -sf "${url}" >/dev/null 2>&1; then
      log "${label} is ready."
      return 0
    fi
    sleep "${sleep_s}"
  done
  die "${label} did not become ready in time (${url})."
}

setup_backend() {
  cd "${BACKEND_DIR}"

  if [[ ! -x .venv/bin/python ]]; then
    log "Creating Python virtualenv…"
    python3 -m venv .venv
  fi

  # shellcheck disable=SC1091
  source .venv/bin/activate

  log "Installing backend dependencies…"
  python -m pip install --upgrade pip >/dev/null
  pip install -e ".[dev]"

  log "Running database migrations…"
  alembic upgrade head

  log "Seeding forecast data (idempotent)…"
  python -m app.seed
}

setup_frontend() {
  cd "${FRONTEND_DIR}"
  if [[ ! -d node_modules ]]; then
    log "Installing frontend dependencies (npm install)…"
    npm install
  else
    log "Frontend node_modules present — skipping npm install."
  fi
}

print_links() {
  cat <<EOF

[start] ========================================
[start]  App (frontend):  ${APP_URL}
[start]  API docs:        ${API_DOCS_URL}
[start]  Backend health:  ${HEALTH_URL}
[start] ========================================
[start] Press Ctrl+C to stop both services.

EOF
}

require_cmd curl
require_cmd python3
require_cmd npm
require_cmd node

[[ -d "${BACKEND_DIR}" ]] || die "Backend directory not found: ${BACKEND_DIR}"
[[ -d "${FRONTEND_DIR}" ]] || die "Frontend directory not found: ${FRONTEND_DIR}"

if curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
  die "Backend already running on port ${BACKEND_PORT}. Stop it, then re-run ./start.sh"
fi
if port_in_use "${BACKEND_PORT}"; then
  die "Port ${BACKEND_PORT} is already in use. Free it, then re-run ./start.sh"
fi
if port_in_use "${FRONTEND_PORT}"; then
  die "Port ${FRONTEND_PORT} is already in use. Free it, then re-run ./start.sh"
fi

log "Bootstrapping project…"
setup_backend
setup_frontend

log "Starting backend on ${API_DOCS_URL%/docs}…"
(
  cd "${BACKEND_DIR}"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec uvicorn app.main:app --reload --host "${BACKEND_HOST}" --port "${BACKEND_PORT}"
) &
BACKEND_PID=$!

wait_for_url "${HEALTH_URL}" "Backend" 60 0.5
if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
  die "Backend process exited after startup."
fi

log "Starting frontend on ${APP_URL}…"
(
  cd "${FRONTEND_DIR}"
  exec npm start -- --host 127.0.0.1 --port "${FRONTEND_PORT}"
) &
FRONTEND_PID=$!

# Angular may take a bit to compile; poll the app URL, but don't hard-fail if slow.
for attempt in $(seq 1 120); do
  if curl -sf "${APP_URL}" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    die "Frontend process exited before becoming ready."
  fi
  sleep 0.5
done

print_links
wait "${FRONTEND_PID}"
