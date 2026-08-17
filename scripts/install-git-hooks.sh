#!/bin/sh
# Instala a guarda CoreTriad como hooks do git.
#
# `core.hooksPath` recebe caminho ABSOLUTO, de propósito.
#
# Um caminho relativo (`.githooks`) é resolvido contra a worktree ATUAL. Numa
# worktree `sana/` cuja branch é anterior à criação de `.githooks/`, o diretório
# simplesmente não existe — o git não encontra hook nenhum e o commit passa.
# Medido em 2026-08-17: a guarda relativa falhou ABERTO no primeiro teste real
# contra `sana/ERP-LEGACY-001/CASE-003`. Caminho absoluto aponta sempre para a
# worktree principal, valendo para todas as demais.
#
# `core.hooksPath` é config LOCAL: não viaja no clone. Rode isto uma vez por
# máquina/clone. O config vive no diretório .git comum, então uma execução
# cobre todas as worktrees do mesmo repositório.
set -eu

raiz=$(git rev-parse --show-toplevel)
cd "$raiz"

if [ ! -f "$raiz/.githooks/coretriad-guard.sh" ]; then
    echo "ERRO: rode este script a partir da worktree PRINCIPAL (a que contém .githooks/)." >&2
    exit 1
fi

git config core.hooksPath "$raiz/.githooks"
chmod +x "$raiz/.githooks/pre-commit" "$raiz/.githooks/pre-push" "$raiz/.githooks/coretriad-guard.sh" 2>/dev/null || true

echo "core.hooksPath = $(git config --get core.hooksPath)"
echo "Guarda CoreTriad instalada: pre-commit + pre-push."
echo "Protegidos fora de main/audit/*: audit/, coretriad/governance/, coretriad/states/, .claude/"
echo
echo "Verifique com: sh scripts/test-git-hooks.sh"
