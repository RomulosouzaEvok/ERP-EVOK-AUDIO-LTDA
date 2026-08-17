#!/bin/sh
# CORETRIAD — guarda de caminhos protegidos, agnóstica de ferramenta.
#
# Vale para QUALQUER motor que commite neste repositório: Claude Code, Codex,
# IDE, git na mão. É `core.hooksPath` do próprio git — não depende de
# `.claude/settings.json`, que só o Claude Code lê (APR-2026-047 D2).
#
# REGRA DE FAIXA (por que não é bloqueio cego):
#   Os quatro caminhos protegidos são o produto de trabalho legítimo da VeriCore
#   e do Director, que operam em `main` e `audit/*`. Bloquear em toda branch
#   inviabilizaria o próprio run de auditoria — o repositório não teria como
#   registrar finding, aprovação ou estado.
#   A ameaça real é o motor de REMEDIAÇÃO, que trabalha em `sana/*`. Por isso:
#
#     main, audit/*  -> faixa do Director/VeriCore : PERMITE
#     qualquer outra -> faixa desconhecida          : BLOQUEIA (fail-closed)
#
#   `sana/*` cai no bloqueio pela regra geral, que é o objetivo.
#
# LIMITES DECLARADOS, não escondidos:
#   1. `git commit --no-verify` ignora qualquer pre-commit hook. Isto é guarda
#      contra ENGANO, não barreira contra intenção. O `pre-push` existe como
#      segunda camada pelo mesmo motivo.
#   2. `core.hooksPath` é config local. Clone novo ou máquina nova precisa rodar
#      `scripts/install-git-hooks.sh` — por isso o instalador é versionado.

set -eu

CAMINHOS_PROTEGIDOS="audit/ coretriad/governance/ coretriad/states/ .claude/"

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# HEAD destacado ou branch indeterminada: faixa desconhecida, bloqueia.
if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then
    branch="(detached)"
fi

case "$branch" in
    main|audit/*)
        exit 0
        ;;
esac

# `$1` = lista de arquivos candidatos, uma por linha (vinda do pre-commit ou
# do pre-push). Sem argumento não há o que avaliar.
arquivos="${1:-}"
[ -z "$arquivos" ] && exit 0

violacoes=""
for caminho in $CAMINHOS_PROTEGIDOS; do
    encontrados=$(printf '%s\n' "$arquivos" | grep "^$caminho" || true)
    [ -n "$encontrados" ] && violacoes="${violacoes}${encontrados}
"
done

[ -z "$(printf '%s' "$violacoes" | tr -d '[:space:]')" ] && exit 0

cat >&2 <<EOF

╔════════════════════════════════════════════════════════════════════╗
║  CORETRIAD — COMMIT BLOQUEADO (caminho protegido fora da faixa)     ║
╚════════════════════════════════════════════════════════════════════╝

Branch: $branch

Arquivos recusados:
$(printf '%s' "$violacoes" | sed 's/^/  - /')

POR QUE
  audit/                -> evidência da VeriCore   (Regra 2: SanaCore nunca
                           corrige o objeto auditado; Regra 15: ninguém altera
                           evidência histórica de outra organização)
  coretriad/governance/ -> decisões e gates humanos (Regra 18)
  coretriad/states/     -> control plane do Director (Regra 5)
  .claude/              -> configuração de agentes e do próprio enforcement

  Só \`main\` e \`audit/*\` escrevem nesses caminhos. Esta branch não.

O QUE FAZER
  1. Remova esses arquivos do stage:
         git restore --staged <arquivo>
  2. Commite só o produto da remediação (server/, client/, tests/,
     remediation/cases/<CASE-ID>/).
  3. Precisa registrar finding, aprovação ou estado? Isso é ato de OUTRA
     organização — devolva ao Director em vez de commitar aqui.

  \`--no-verify\` existe e o git sempre o aceita. Usá-lo aqui é decisão
  registrada do dono, não atalho de agente.

EOF

exit 1
