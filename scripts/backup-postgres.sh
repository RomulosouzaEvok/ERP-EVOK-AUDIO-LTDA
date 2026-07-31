#!/usr/bin/env bash
# scripts/backup-postgres.sh
# Backup automatizado do Postgres do container `evok-postgres` (Docker).
# Equivalente Linux/CI de scripts/backup-postgres.ps1 (mesma logica).
#
# Uso:
#   ./scripts/backup-postgres.sh
#   ./scripts/backup-postgres.sh --retention 10
#   CONTAINER=evok-postgres DB=erp_evok_audio DB_USER=evok_admin OUT_DIR=backups ./scripts/backup-postgres.sh
#
# Politica de retencao: mantem os N backups mais recentes (default 14) do
# padrao `${DB}_*.dump` dentro de OUT_DIR e apaga os mais antigos.
# O diretorio de saida fica FORA do volume Docker (backups/ na raiz do repo,
# listado no .gitignore).

set -euo pipefail

# Git Bash (MSYS) no Windows converte automaticamente argumentos com "/" em
# caminhos Windows antes de chamar docker.exe, quebrando o path de container
# `/tmp/...` usado abaixo. Desativar essa conversao e um no-op inofensivo no
# Linux/CI (a variavel simplesmente nao existe fora do MSYS).
export MSYS_NO_PATHCONV=1

CONTAINER="${CONTAINER:-evok-postgres}"
DB="${DB:-erp_evok_audio}"
DB_USER="${DB_USER:-evok_admin}"
OUT_DIR="${OUT_DIR:-backups}"
RETENTION="${RETENTION:-14}"
MAX_ATTEMPTS="${BACKUP_MAX_ATTEMPTS:-3}"
RETRY_WAIT_SECONDS="${BACKUP_RETRY_WAIT_SECONDS:-30}"

# Notifica o webhook de alerta ja usado por outras falhas criticas do
# sistema (AUDIT_ALERT_WEBHOOK_URL) quando o backup falha apos todas as
# tentativas -- sem isso, um backup agendado que falha silenciosamente
# (ex.: container ainda subindo apos reboot) so seria percebido no dia em
# que alguem precisasse restaurar e nao encontrasse o arquivo esperado.
notify_failure() {
  local message="$1"
  echo "ERRO: ${message}" >&2
  if [[ -n "${AUDIT_ALERT_WEBHOOK_URL:-}" ]]; then
    curl -fsS -X POST "${AUDIT_ALERT_WEBHOOK_URL}" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"[ERP EVOK AUDIO] Falha no backup do Postgres (${DB}): ${message}\"}" \
      >/dev/null 2>&1 || echo "Falha ao notificar webhook de alerta." >&2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retention) RETENTION="$2"; shift 2 ;;
    --container) CONTAINER="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --user) DB_USER="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    *) echo "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_PATH="${REPO_ROOT}/${OUT_DIR}"
mkdir -p "$OUT_PATH"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILE_NAME="${DB}_${TIMESTAMP}.dump"
# Caminho relativo (nao absoluto) usado no docker cp: em Git Bash no Windows,
# `docker cp` interpreta caminhos absolutos tipo /c/... incorretamente e
# falha com "invalid output path". Caminho relativo evita esse problema e
# funciona igualmente em Linux/CI.
HOST_FILE_REL_PATH="${OUT_DIR}/${FILE_NAME}"
HOST_FILE_PATH="${OUT_PATH}/${FILE_NAME}"
CONTAINER_TMP_PATH="/tmp/${FILE_NAME}"

echo "Iniciando dump de '${DB}' no container '${CONTAINER}'..."

# Retry com backoff: uma falha pontual (ex.: container ainda subindo logo
# apos um reboot, quando o backup roda via tarefa agendada) nao deve
# desistir na primeira tentativa e so voltar a rodar 24h depois.
attempt=1
dump_succeeded=0
while (( attempt <= MAX_ATTEMPTS )); do
  if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB" -Fc -Z 9 -f "$CONTAINER_TMP_PATH" \
    && ( cd "$REPO_ROOT" && docker cp "${CONTAINER}:${CONTAINER_TMP_PATH}" "./${HOST_FILE_REL_PATH}" ) \
    && docker exec "$CONTAINER" rm -f "$CONTAINER_TMP_PATH"; then
    dump_succeeded=1
    break
  fi
  echo "Tentativa ${attempt}/${MAX_ATTEMPTS} de backup falhou." >&2
  attempt=$(( attempt + 1 ))
  if (( attempt <= MAX_ATTEMPTS )); then
    sleep "$RETRY_WAIT_SECONDS"
  fi
done

if (( dump_succeeded == 0 )); then
  notify_failure "pg_dump/docker cp falharam apos ${MAX_ATTEMPTS} tentativas."
  exit 1
fi

SIZE_KB=$(( $(stat -c%s "$HOST_FILE_PATH" 2>/dev/null || stat -f%z "$HOST_FILE_PATH") / 1024 ))
echo "Backup criado: ${HOST_FILE_PATH} (${SIZE_KB} KB)"

# Retencao: mantem apenas os $RETENTION arquivos mais recentes deste banco.
mapfile -t ALL_BACKUPS < <(ls -1t "${OUT_PATH}/${DB}"_*.dump 2>/dev/null || true)
COUNT="${#ALL_BACKUPS[@]}"
if (( COUNT > RETENTION )); then
  for (( i=RETENTION; i<COUNT; i++ )); do
    echo "Removendo backup antigo (retencao=${RETENTION}): ${ALL_BACKUPS[$i]}"
    rm -f "${ALL_BACKUPS[$i]}"
  done
fi

echo "Backups atuais mantidos: $(( COUNT < RETENTION ? COUNT : RETENTION )) de ${COUNT} encontrados."
