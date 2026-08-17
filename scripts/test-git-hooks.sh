#!/bin/sh
# Bateria de verificação da guarda CoreTriad.
#
# Recusa educada não é prova (skill `coretriad-test-segregation`): cada caso
# EXECUTA um `git commit` real e confere o HEAD depois. Um caso que "deveria
# bloquear" só passa se o commit foi tentado, recusado, e o histórico ficou
# intacto.
#
# Uso:  sh scripts/test-git-hooks.sh <caminho-de-uma-worktree-sana>
set -eu

WT_SANA="${1:-}"
if [ -z "$WT_SANA" ] || [ ! -d "$WT_SANA" ]; then
    echo "uso: sh scripts/test-git-hooks.sh <caminho-de-uma-worktree-sana>" >&2
    exit 2
fi

falhas=0
resultado() {
    if [ "$1" = "$2" ]; then printf '  [PASS] %s\n' "$3"
    else printf '  [FAIL] %s (esperado=%s obtido=%s)\n' "$3" "$1" "$2"; falhas=$((falhas+1)); fi
}

limpar() {
    rm -f audit/.probe.tmp coretriad/governance/.probe.tmp \
          coretriad/states/.probe.tmp .claude/.probe.tmp \
          remediation/.probe.tmp 2>/dev/null || true
    git restore --staged audit/.probe.tmp coretriad/governance/.probe.tmp \
        coretriad/states/.probe.tmp .claude/.probe.tmp remediation/.probe.tmp 2>/dev/null || true
}

echo "== hooksPath: $(git config --get core.hooksPath) =="
case "$(git config --get core.hooksPath)" in
    /*|[A-Za-z]:/*) echo "  [PASS] hooksPath e absoluto" ;;
    *) echo "  [FAIL] hooksPath RELATIVO — falha aberta em worktree sem .githooks"; falhas=$((falhas+1)) ;;
esac

echo
echo "== A. faixa Director/VeriCore (branch atual) deve PERMITIR audit/ =="
cd "$(git rev-parse --show-toplevel)"
branch=$(git rev-parse --abbrev-ref HEAD)
case "$branch" in
    main|audit/*)
        antes=$(git rev-parse HEAD)
        mkdir -p audit; echo probe > audit/.probe.tmp; git add -f audit/.probe.tmp
        git commit -q -m "guard-test: permitir" >/dev/null 2>&1 || true
        depois=$(git rev-parse HEAD)
        if [ "$antes" != "$depois" ]; then resultado sim sim "commit em audit/ permitido"; git reset -q --hard "$antes"
        else resultado sim nao "commit em audit/ permitido"; fi
        limpar ;;
    *) echo "  [SKIP] branch atual ($branch) nao e main/audit/*" ;;
esac

echo
echo "== B. faixa SanaCore deve BLOQUEAR os 4 caminhos protegidos =="
cd "$WT_SANA"
echo "  worktree: $(git rev-parse --abbrev-ref HEAD)"
for alvo in audit coretriad/governance coretriad/states .claude; do
    mkdir -p "$alvo"; echo probe > "$alvo/.probe.tmp"
    git add -f "$alvo/.probe.tmp" >/dev/null 2>&1
    antes=$(git rev-parse HEAD)
    git commit -q -m "guard-test: bloquear $alvo" >/dev/null 2>&1 || true
    depois=$(git rev-parse HEAD)
    if [ "$antes" = "$depois" ]; then resultado bloq bloq "$alvo bloqueado, HEAD intacto"
    else resultado bloq passou "$alvo bloqueado"; git reset -q --hard "$antes"; fi
    git restore --staged "$alvo/.probe.tmp" >/dev/null 2>&1 || true
    rm -f "$alvo/.probe.tmp"
done

echo
echo "== C. faixa SanaCore deve PERMITIR o produto legitimo de remediacao =="
mkdir -p remediation
echo probe > remediation/.probe.tmp
git add -f remediation/.probe.tmp >/dev/null 2>&1
antes=$(git rev-parse HEAD)
git commit -q -m "guard-test: remediacao permitida" >/dev/null 2>&1 || true
depois=$(git rev-parse HEAD)
if [ "$antes" != "$depois" ]; then resultado sim sim "remediation/ permitido"; git reset -q --hard "$antes"
else resultado sim nao "remediation/ permitido (guarda travaria a propria SanaCore)"; fi
git restore --staged remediation/.probe.tmp >/dev/null 2>&1 || true
rm -f remediation/.probe.tmp

echo
if [ "$falhas" -eq 0 ]; then echo "TODOS OS CASOS PASSARAM"; exit 0
else echo "$falhas CASO(S) FALHARAM"; exit 1; fi
