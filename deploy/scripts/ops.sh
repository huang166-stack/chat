#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
ENV_FILE=${ENV_FILE:-$ROOT_DIR/.env}
COMPOSE=(docker compose --env-file "$ENV_FILE")
STATE_DIR=${DEPLOY_STATE_DIR:-$HOME/.chat-deploy}
BACKUP_ROOT=${BACKUP_ROOT:-$HOME/chat-backups}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
MIN_UPLOAD_FREE_GB=${MIN_UPLOAD_FREE_GB:-5}
NGINX_CONF=$ROOT_DIR/deploy/nginx.conf
NGINX_MAX_MB=0

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"; }
run_compose() { "${COMPOSE[@]}" "$@"; }

load_env() {
  [[ -f $ENV_FILE ]] || die "Missing $ENV_FILE; copy deploy/.env.production.example"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  MIN_UPLOAD_FREE_GB=${MIN_UPLOAD_FREE_GB:-5}
}

contains_placeholder() {
  printf '%s' "$1" | grep -Eiq 'change-me|change-this|change_me|dev-|example'
}

parse_size_mb() {
  local value=$1
  local unit=${value: -1}
  local amount=$value
  case $unit in
    k|K) amount=${value%?}; printf '%s\n' $((amount / 1024)) ;;
    m|M) printf '%s\n' ${value%?} ;;
    g|G) amount=${value%?}; printf '%s\n' $((amount * 1024)) ;;
    *) printf '%s\n' "$value" ;;
  esac
}

static_preflight() {
  need grep
  need awk
  need sed
  [[ -f $NGINX_CONF ]] || die "Missing $NGINX_CONF"
  load_env

  local required=(
    MYSQL_ROOT_PASSWORD MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE
    JWT_ACCESS_SECRET JWT_REFRESH_SECRET APP_ENCRYPTION_KEY
    STORAGE_SIGNING_SECRET PUBLIC_ORIGIN STORAGE_PUBLIC_BASE_URL
  )
  local name
  for name in "${required[@]}"; do
    [[ -n ${!name:-} ]] || die "Missing $name in $ENV_FILE"
  done

  [[ ${#JWT_ACCESS_SECRET} -ge 32 ]] || die "JWT_ACCESS_SECRET must be at least 32 characters"
  [[ ${#JWT_REFRESH_SECRET} -ge 32 ]] || die "JWT_REFRESH_SECRET must be at least 32 characters"
  [[ $JWT_ACCESS_SECRET != "$JWT_REFRESH_SECRET" ]] || die "JWT secrets must differ"
  [[ ${#STORAGE_SIGNING_SECRET} -ge 32 ]] || die "STORAGE_SIGNING_SECRET must be at least 32 characters"
  [[ $APP_ENCRYPTION_KEY =~ ^[0-9a-fA-F]{64}$ ]] || die "APP_ENCRYPTION_KEY must be 64 hexadecimal characters"
  [[ $APP_ENCRYPTION_KEY != 0000000000000000000000000000000000000000000000000000000000000000 ]] || die "APP_ENCRYPTION_KEY still uses the example value"
  [[ $PUBLIC_ORIGIN == https://* ]] || die "PUBLIC_ORIGIN must use https"
  [[ $PUBLIC_ORIGIN != *example.com* ]] || die "PUBLIC_ORIGIN still uses the example domain"
  [[ $STORAGE_PUBLIC_BASE_URL == https://* ]] || die "STORAGE_PUBLIC_BASE_URL must use https"

  for name in MYSQL_ROOT_PASSWORD MYSQL_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET STORAGE_SIGNING_SECRET; do
    contains_placeholder "${!name}" && die "$name contains a placeholder or development marker"
  done

  local input_cost=${MODEL_COST_INPUT_PER_MILLION_TOKENS:-0}
  local output_cost=${MODEL_COST_OUTPUT_PER_MILLION_TOKENS:-0}
  [[ $input_cost =~ ^[0-9]+([.][0-9]+)?$ ]] || die "MODEL_COST_INPUT_PER_MILLION_TOKENS must be numeric"
  [[ $output_cost =~ ^[0-9]+([.][0-9]+)?$ ]] || die "MODEL_COST_OUTPUT_PER_MILLION_TOKENS must be numeric"

  local body_size
  body_size=$(grep -E '^[[:space:]]*client_max_body_size' "$NGINX_CONF" | tail -n 1 | sed -E 's/.*client_max_body_size[[:space:]]+([0-9]+[kKmMgG]?);.*/\1/')
  [[ -n $body_size ]] || die "client_max_body_size not found in $NGINX_CONF"
  NGINX_MAX_MB=$(parse_size_mb "$body_size")
  [[ $NGINX_MAX_MB -ge 100 ]] || die "Nginx upload limit is ${NGINX_MAX_MB}MB; use at least 100m"
  grep -q 'proxy_buffering off' "$NGINX_CONF" || die "Nginx must disable proxy buffering for SSE"
  grep -q 'proxy_read_timeout 3600s' "$NGINX_CONF" || die "Nginx SSE read timeout is not configured"

  log "Static preflight passed (nginx upload limit: ${NGINX_MAX_MB}MB)"
}

service_id() {
  run_compose ps -q "$1" 2>/dev/null | head -n 1
}

container_state() {
  local id=$1
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id"
}

wait_service() {
  local service=$1
  local expected=${2:-healthy}
  local attempts=${3:-90}
  local id status attempt
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    id=$(service_id "$service")
    if [[ -n $id ]]; then
      status=$(container_state "$id")
      [[ $status == "$expected" ]] && return 0
      [[ $status == exited || $status == dead ]] && { run_compose logs --tail=80 "$service"; die "$service is $status"; }
    fi
    sleep 2
  done
  run_compose logs --tail=80 "$service" || true
  die "Timed out waiting for $service to become $expected"
}

validate_release_tag() {
  [[ $1 =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]] || die "Invalid release tag: $1"
}

current_release() {
  cat "$STATE_DIR/current" 2>/dev/null || true
}

verify_backup() {
  need sha256sum
  local dir=${1:-$(cat "$BACKUP_ROOT/latest" 2>/dev/null || true)}
  [[ -n $dir && -d $dir ]] || die "No backup found under $BACKUP_ROOT"
  [[ -s $dir/database.sql.gz && -s $dir/uploads.tar.gz && -s $dir/SHA256SUMS ]] || die "Backup is incomplete: $dir"
  (cd "$dir" && sha256sum -c SHA256SUMS)
}

backup_database_and_uploads() {
  need docker
  need gzip
  need sha256sum
  [[ -n $(service_id backend) ]] || die "Backend is not running; cannot create a backup"

  local stamp dir
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  dir=$BACKUP_ROOT/$stamp
  mkdir -p "$dir"
  chmod 700 "$BACKUP_ROOT" "$dir"
  log "Creating backup: $dir"

  run_compose exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --quick --routines --events "$MYSQL_DATABASE"' | gzip -9 > "$dir/database.sql.gz"
  run_compose exec -T backend sh -c 'tar -C /app/uploads -czf - .' > "$dir/uploads.tar.gz"
  [[ -s $dir/database.sql.gz && -s $dir/uploads.tar.gz ]] || die "Backup output is empty"

  printf 'release=%s\ncreated_at=%s\n' "$(current_release)" "$stamp" > "$dir/metadata.txt"
  (cd "$dir" && sha256sum database.sql.gz uploads.tar.gz > SHA256SUMS)
  verify_backup "$dir"
  printf '%s\n' "$dir" > "$BACKUP_ROOT/latest"

  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
  log "Backup verified: $dir"
}

apply_release() {
  local tag=$1
  export RELEASE_TAG=$tag
  run_compose up -d --no-deps backend
  wait_service backend healthy 90
  run_compose up -d --no-deps worker
  wait_service worker running 30
  run_compose up -d --no-deps frontend
  wait_service frontend healthy 90
  run_compose up -d --no-deps nginx
  wait_service nginx healthy 30
}

deploy_release() {
  local tag=${1:-$(date -u +%Y%m%dT%H%M%SZ)}
  local previous
  need docker
  validate_release_tag "$tag"
  static_preflight
  previous=$(current_release)

  if [[ -n $(service_id backend) ]]; then
    backup_database_and_uploads
  else
    log "First deployment: no existing database to back up"
  fi

  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR"
  printf '%s\n' "${previous:-none}" > "$STATE_DIR/previous"

  log "Building release $tag"
  RELEASE_TAG=$tag "${COMPOSE[@]}" build backend frontend
  apply_release "$tag"
  runtime_preflight
  printf '%s\n' "$tag" > "$STATE_DIR/current"
  log "Release $tag is healthy"
}

rollback_release() {
  local tag=${1:-$(cat "$STATE_DIR/previous" 2>/dev/null || true)}
  local from
  [[ -n $tag && $tag != none ]] || die "No rollback target is recorded"
  need docker
  validate_release_tag "$tag"
  from=$(current_release)
  [[ $tag != "$from" ]] || die "Rollback target is already current"
  docker image inspect "chat-backend:$tag" "chat-frontend:$tag" >/dev/null
  verify_backup
  log "Rolling back from ${from:-unknown} to $tag"
  apply_release "$tag"
  runtime_preflight
  printf '%s\n' "$tag" > "$STATE_DIR/current"
  printf '%s\n' "${from:-none}" > "$STATE_DIR/previous"
  log "Rollback to $tag completed"
}

max_plan_size_mb() {
  run_compose exec -T backend node -e 'import(`@prisma/client`).then(async ({ PrismaClient }) => { const prisma = new PrismaClient(); const plan = await prisma.memberPlan.findFirst({ where: { enabled: 1 }, orderBy: { maxFileSizeMb: `desc` }, select: { maxFileSizeMb: true } }); console.log(plan?.maxFileSizeMb ?? 0); await prisma.$disconnect(); }).catch((error) => { console.error(error); process.exit(1); });'
}

assert_plan_upload_limit() {
  local max_plan
  max_plan=$(max_plan_size_mb)
  [[ $max_plan =~ ^[0-9]+$ ]] || die "Could not read enabled plan file limit"
  [[ $NGINX_MAX_MB -ge $max_plan ]] || die "Nginx limit ${NGINX_MAX_MB}MB is below plan limit ${max_plan}MB"
}

assert_uploads_space() {
  run_compose exec -T backend sh -c 'probe="/app/uploads/.preflight-$$"; : > "$probe"; rm -f "$probe"'
  local available_kb required_kb
  available_kb=$(run_compose exec -T backend df -Pk /app/uploads | awk 'NR==2 {print $4}')
  required_kb=$((MIN_UPLOAD_FREE_GB * 1024 * 1024))
  [[ $available_kb =~ ^[0-9]+$ ]] || die "Could not read uploads disk space"
  [[ $available_kb -ge $required_kb ]] || die "Uploads volume has less than ${MIN_UPLOAD_FREE_GB}GB free"
}

assert_restart_policies() {
  local service id policy
  for service in mysql redis backend worker frontend nginx; do
    id=$(service_id "$service")
    [[ -n $id ]] || die "$service container is missing"
    policy=$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$id")
    [[ $policy == unless-stopped || $policy == always ]] || die "$service restart policy is $policy"
  done
}

runtime_preflight() {
  need docker
  need curl
  if [[ -z $(service_id backend) ]]; then
    log "Runtime checks skipped: backend is not running yet"
    return 0
  fi
  runtime_preflight_base
  assert_plan_upload_limit
  assert_uploads_space
  assert_restart_policies
  log "Runtime preflight passed"
}

runtime_preflight_base() {
  need docker
  need curl
  [[ -f $ENV_FILE ]] || die "Missing $ENV_FILE"
  if [[ -z $(service_id backend) ]]; then
    log "Runtime checks skipped: backend is not running yet"
    return 0
  fi

  run_compose config --quiet
  wait_service mysql healthy 30
  wait_service redis healthy 30
  wait_service backend healthy 60
  wait_service frontend healthy 60
  wait_service nginx healthy 30
  wait_service worker running 30

  run_compose exec -T backend node -e 'fetch(`http://127.0.0.1:3001/api/health`).then(async (response) => { const body = await response.text(); if (!response.ok) { console.error(body); process.exit(1); } console.log(body); }).catch((error) => { console.error(error); process.exit(1); });'
  curl -fsS "$PUBLIC_ORIGIN/api/health" >/dev/null
  run_compose exec -T nginx nginx -t
  run_compose exec -T backend npx prisma migrate status
}

case ${1:-} in
  preflight)
    static_preflight
    runtime_preflight
    ;;
  backup)
    static_preflight
    backup_database_and_uploads
    ;;
  deploy)
    deploy_release "${2:-}"
    ;;
  rollback)
    static_preflight
    rollback_release "${2:-}"
    ;;
  verify-backup)
    verify_backup "${2:-}"
    ;;
  *)
    cat <<'USAGE'
Usage:
  ops.sh preflight            Validate env, Nginx, services, disk, migrations and health.
  ops.sh backup               Create and verify a MySQL + uploads backup.
  ops.sh deploy [tag]         Build and release backend -> worker -> frontend -> nginx.
  ops.sh rollback [tag]       Verify backup, then roll back images (default: previous).
  ops.sh verify-backup [dir]  Verify SHA256 checksums of a backup.
USAGE
    exit 1
    ;;
esac
