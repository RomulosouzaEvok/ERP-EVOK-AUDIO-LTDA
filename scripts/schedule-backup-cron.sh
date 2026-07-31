#!/usr/bin/env bash
# scripts/schedule-backup-cron.sh
# Registra o backup automatico diario do Postgres (scripts/backup-postgres.sh)
# no crontab do usuario atual. Uso pontual por ambiente (homologacao ou
# producao Linux) — nao precisa rodar de novo a cada deploy.
#
# Uso:
#   ./scripts/schedule-backup-cron.sh
#   ./scripts/schedule-backup-cron.sh --time "0 3 * * *" --retention 14
#
# Idempotente: remove qualquer entrada anterior com o mesmo marcador antes de
# adicionar a nova, para nao duplicar a linha a cada execucao.

set -euo pipefail

CRON_TIME="0 3 * * *"
RETENTION=14
MARKER="# evok-audio-postgres-backup"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --time) CRON_TIME="$2"; shift 2 ;;
    --retention) RETENTION="$2"; shift 2 ;;
    *) echo "Argumento desconhecido: $1"; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="${REPO_ROOT}/scripts/backup-postgres.sh"
LOG_PATH="${REPO_ROOT}/backups/backup-cron.log"

if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Script de backup nao encontrado em $SCRIPT_PATH"
  exit 1
fi

CRON_LINE="${CRON_TIME} ${SCRIPT_PATH} --retention ${RETENTION} >> ${LOG_PATH} 2>&1 ${MARKER}"

( crontab -l 2>/dev/null | grep -vF "$MARKER" ; echo "$CRON_LINE" ) | crontab -

echo "Backup agendado no crontab: ${CRON_TIME} (retencao=${RETENTION})"
echo "Log de execucao em: ${LOG_PATH}"
echo "Para conferir: crontab -l"
echo "Para remover:  crontab -l | grep -vF '${MARKER}' | crontab -"
