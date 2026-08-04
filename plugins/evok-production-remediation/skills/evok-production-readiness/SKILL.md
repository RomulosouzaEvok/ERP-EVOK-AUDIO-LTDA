---
name: evok-production-readiness
description: Executa a remediacao de producao do ERP EVOK AUDIO seguindo o cronograma versionado, com foco em AppSec, PostgreSQL, integridade transacional, testes e baixo custo operacional.
---

# Skill: EVOK Production Readiness

## Missao

Corrigir o ERP EVOK AUDIO para producao seguindo rigorosamente os documentos
atuais de auditoria e cronograma do repositorio. Nao entregue somente
recomendacoes. Inspecione, implemente, valide e documente as correcoes no
repositorio.

## Regras de seguranca

- Execute `git status --short` antes de editar.
- Preserve alteracoes existentes de outros usuarios.
- Nunca use `git reset --hard` ou `git checkout --`.
- Use `apply_patch` para alteracoes manuais.
- Nao altere a auditoria original sem necessidade.
- Nao use `sequelize.sync({ force: true })` ou `alter: true` em producao.
- Nao faca deploy real ou operacao destrutiva em banco real.
- Nunca grave secrets em codigo, logs, Git ou imagens.
- Nao marque teste pulado como aprovado.
- Nao invente resultados de comandos.

## Estrategia de baixo custo

- Reutilize Node, TypeScript, Express, PostgreSQL, Sequelize, Jest e Docker.
- Use PostgreSQL local via Docker para testes.
- Evite dependencias novas e servicos pagos.
- So use Redis se a topologia tiver multiplas instancias.
- Paralelize apenas tarefas independentes e sem conflito de arquivos.
- Evite refatoracoes fora do escopo dos gates de producao.

## Ordem obrigatoria

### G0 - Baseline

Registrar status do Git, commit, versoes, typecheck, build, testes e suites
puladas. Confirmar o estado do repositorio antes de qualquer alteracao.

### G1 - Runtime seguro

Consolidar `app.ts` e `index.ts`, executar o artefato compilado, mover
dependencias de runtime como `zod`, validar ambiente no boot, bloquear
`force/alter`, exigir TLS PostgreSQL e remover defaults inseguros.

### G2 - Banco e recuperacao

Criar migrations versionadas, eliminar DDL automatico no boot, validar banco
novo e existente, configurar backup, executar restore e documentar RPO, RTO e
rollback.

### G3 - Acesso controlado

Criar matriz de roles e proteger toda escrita critica de produtos, estoque,
vendas, compras, financeiro, producao, BOM, MRP, inventario e auditoria.
Implementar troca de senha, invalidacao de sessoes, JWT com politica explicita
e validacao de secrets no boot.

### G4 - Integridade

Corrigir locks e idempotencia de vendas, estoque, compras, pagamentos e
producao. Garantir transacoes, constraints, indices e testes concorrentes
reais.

### G5 - Operacao

Criar Dockerfile multi-stage, imagem nao-root, CI, scans, testes obrigatorios,
healthchecks, readiness com banco, shutdown gracioso, logs estruturados,
correlation ID, deploy e rollback.

### G6 - Release

Executar testes completos sem skips, UAT, backup pre-deploy, canario, smoke
tests, rollback em homologacao, aprovacao formal e reauditoria.

## Criterio de progresso

Para cada tarefa do cronograma, registrar:

- ID da tarefa.
- Status: `[ ]`, `[~]`, `[x]` ou `[!]`.
- Responsavel.
- Arquivos alterados.
- Testes executados.
- Evidencia.
- Risco residual.
- Dependencias desbloqueadas.

Nao avance de gate se existir falha critica no gate anterior. Se algo estiver
bloqueado por infraestrutura externa, continue tarefas independentes, marque
`[!]` e informe a causa exata.

## Validacao minima

Executar a partir da raiz do projeto, quando aplicavel:

```text
npm ci
npm run typecheck
npm run build
npm run test:unit -- --ci
npm run test:integration -- --ci
npm run test:edge -- --ci
npm audit --omit=dev
```

O CI deve falhar com erro de tipo, build, teste, suite obrigatoria pulada,
migration, secret, dependencia de runtime ausente ou healthcheck indisponivel.

## Relatorio por gate

Ao concluir cada gate, informar:

1. Tarefas concluidas.
2. Tarefas pendentes.
3. Tarefas bloqueadas.
4. Arquivos alterados.
5. Comandos executados.
6. Resultados.
7. Riscos residuais.
8. Gate liberado ou bloqueado.

O resultado final so pode ser `APROVAR`, `BLOQUEAR` ou `APROVAR COM RISCO FORMAL`.
