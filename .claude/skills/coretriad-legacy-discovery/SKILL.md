---
name: coretriad-legacy-discovery
description: Executa os passos 25-30 do programa de recuperação do legado (Parte VIII do master spec) após o passo 24 (coretriad-onboard) concluído — domínios, regras de negócio descobertas, requisitos recuperados, casos de uso recuperados, matriz de rastreabilidade do legado e testes de caracterização. Uso inicial e principal: ERP-LEGACY-001. Sempre para no fim do passo 30 para novo aval humano antes do passo 31 (auditoria 360°).
---

# CORETRIAD LEGACY DISCOVERY — passos 25-30

Referência normativa: `docs/coretriad/CORETRIAD_MASTER_SPEC.md`, Parte VIII.

## PRÉ-CONDIÇÃO

Passos 21-24 concluídos via skill `coretriad-onboard` (ver
`coretriad/states/<PROJECT_ID>/PROJECT_STATE.md` — deve declarar "passo 24
CONCLUÍDO"). Aprovação humana explícita e registrada autorizando
especificamente os passos 25-30 (não basta a aprovação genérica de
abertura do programa). Sem os dois → ABORTAR e informar pendência.

## REGRAS DO PROGRAMA (herdadas de `coretriad-onboard`, continuam valendo)

1. **Não refatorar, não corrigir, não excluir código, não alterar banco em
   produção real durante o discovery.** Testes de caracterização (passo
   30) são a única exceção parcial — ver seção do passo 30.
2. **Não presumir que a documentação existente está correta** — inclusive
   documentos como `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` ou
   `docs/projeto/04-USE_CASES.md`, que já existem no repositório. Eles são
   **insumo a validar contra código**, não fonte de verdade a copiar.
3. **Nada vira regra oficial sem validação humana** — comportamento
   descoberto no código entra como `DISCOVERED_BUSINESS_BEHAVIOR`
   (status `CONFIRMED`/`DISCOVERED`/`CONFLICTING`/`UNKNOWN`/
   `OBSOLETE_CANDIDATE`), nunca como BR definitiva, até o dono confirmar.
4. **Regra permanente de segurança de dado real** (herdada do onboarding):
   módulos classificados PRODUÇÃO REAL em
   `coretriad/states/<PROJECT_ID>/PRODUCTION_STATUS_MAP.md` continuam sob
   regime read-only reforçado — nenhuma execução de teste/script/comando
   que toque o banco real, mesmo nos passos 25-30. Testes de caracterização
   do passo 30 devem rodar contra banco de teste efêmero (mesma convenção
   de CI), nunca contra o banco de produção real.
5. **Achados fora de sequência já promovidos a finding formal** (ex.:
   `FIND-ERP-001`, `FIND-ERP-002`) não são reabertos nem reinvestigados
   aqui — já saíram do fluxo de discovery, seguem o ciclo normal de
   finding (validação → remediação → reteste), fora desta skill.

## PASSO 25 — Domínios

Descobrir contextos reais (bounded contexts) a partir do código, não do
organograma. Produzir
`docs/coretriad/projects/<PROJECT_ID>/discovery/DOMAIN_MAP.md`: agrupar os
48 módulos de `MODULE_CATALOG.md` em domínios/subdomínios coerentes
(ex.: "Cadeia de Suprimentos" agrega `suppliers`+`purchases`+
`purchaseRequisitions`+`rfq`+`comex`), justificando o agrupamento por
acoplamento de dados/fluxo real (não por pasta de UI). Marcar fronteiras
onde a seção 2 de `CURRENT_ARCHITECTURE.md` já identificou cruzamento sem
porta local (ex.: `mrp`) como candidatas a revisão na arquitetura-alvo
(passo 34, não aqui).

## PASSO 26 — Regras de negócio descobertas

O código legado contém conhecimento não documentado. Usar
`audit/templates/BUSINESS_RULE_TEMPLATE.md` por regra encontrada. Produzir
`docs/coretriad/projects/<PROJECT_ID>/discovery/BUSINESS_RULE_CANDIDATES.md`.

Dado o volume (48 módulos), organizar o trabalho por domínio (saída do
passo 25), não módulo a módulo isoladamente — um agente VeriCore por
domínio/cluster, priorizando regras com impacto financeiro, de
autorização, ou de estado (máquinas de estado de entidade crítica:
pedido, ordem de produção, NF-e, pagamento). Cada regra candidata recebe
status `CONFIRMED` (documentada E implementada, batendo), `DISCOVERED`
(só no código, sem documento de origem), `CONFLICTING` (código diverge do
documento), `UNKNOWN` (comportamento ambíguo, exige decisão humana), ou
`OBSOLETE_CANDIDATE` (documento existe mas código não implementa mais —
verificar se foi removido deliberadamente).

Não é preciso cobrir 100% dos 48 módulos com a mesma profundidade — os 6
módulos PRODUÇÃO REAL e os módulos de maior risco financeiro/autorização
(identificados no `CURRENT_ARCHITECTURE.md`/`API_INVENTORY.md`) têm
prioridade; módulos periféricos podem receber cobertura mais rasa,
registrada como tal.

## PASSO 27 — Requisitos recuperados

Produzir
`docs/coretriad/projects/<PROJECT_ID>/discovery/REQUIREMENTS_BASELINE.md`
usando `audit/templates/REQUIREMENT_AND_NFR_TEMPLATE.md`. **Não partir do
zero**: `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` já existe e alega
derivar de leitura real de rotas — tratá-lo como candidato de alta
confiança a validar, não como fonte de verdade. Para cada requisito
listado lá, confirmar contra o código atual (pode ter mudado desde a
última revisão do documento) e contra as regras descobertas no passo 26;
marcar status `CONFIRMED` / `INFERRED — NEEDS HUMAN VALIDATION` /
`CONFLICTING`. Requisitos não funcionais (NFR) também entram aqui —
cruzar com `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`, se existir.

## PASSO 28 — Casos de uso recuperados

Para funcionalidades importantes (priorizadas pelo passo 25/26, não
todas), mapear ATOR → UC → REGRA → REQUISITO → IMPLEMENTAÇÃO usando
`audit/templates/USE_CASE_TEMPLATE.md`. **Não partir do zero**:
`docs/projeto/04-USE_CASES.md` já existe (UC-01 a UC-73) e se autodeclara
SSOT de casos de uso — validar contra o código real (rotas/controllers do
`API_INVENTORY.md`), não copiar. Produzir
`docs/coretriad/projects/<PROJECT_ID>/discovery/USE_CASES_RECOVERED.md`
com o resultado da validação (UC confirmado / UC desatualizado / UC
faltante — funcionalidade real sem UC documentado).

## PASSO 29 — Matriz de rastreabilidade do legado

Produzir
`docs/coretriad/projects/<PROJECT_ID>/discovery/LEGACY_TRACEABILITY_MATRIX.md`
usando `audit/templates/TRACEABILITY_MATRIX_TEMPLATE.md`, sintetizando os
passos 25-28: Processo → Regra (BR) → Requisito (REQ) → Caso de Uso (UC) →
Aceite (AC) → Código → Teste (TC) → Permissão → Evidência. Expor
explicitamente todo elo quebrado (célula `❌ AUSENTE`) — isso é o produto
central deste passo, não um efeito colateral. Priorizar processos
críticos (financeiro, fiscal, estoque, autorização) sobre cobertura
exaustiva de 100% dos processos.

## PASSO 30 — Testes de caracterização

Objetivo: congelar o comportamento **atual** do sistema antes de qualquer
correção futura ("hoje o ERP realmente se comporta assim?") — não é teste
de que o comportamento está certo, é teste de que o comportamento está
**registrado**, para que uma remediação futura (passo 36+) não mude
silenciosamente um comportamento que ninguém decidiu mudar.

**Restrição de execução**: testes de caracterização SÃO código que roda —
isto não é mais discovery read-only puro. Rodar apenas contra banco de
teste efêmero (mesma convenção do `test:integration`/CI existente, banco
descartável), **nunca contra o banco de desenvolvimento real**
(`docker-compose.yml`, classificado PRODUÇÃO REAL por `APR-2026-016`).
Isso é uma linha vermelha, não uma preferência — qualquer script deste
passo que precise de conexão de banco deve usar a configuração de teste
(`server/tests/`, mesma que a suíte de integração já usa), nunca a
`DATABASE_URL` de desenvolvimento.

Priorizar caracterização das máquinas de estado mais críticas identificadas
nos passos 25-29 (ex.: ciclo de vida de pedido, ordem de produção, NF-e,
pagamento) — não é viável nem desejável caracterizar os 681 endpoints.

## PARE

**Ao final do passo 30, esta skill PARA incondicionalmente.** Não convoca
o passo 31 (auditoria 360°) nem qualquer passo posterior sem nova
aprovação humana explícita e registrada, específica para essa próxima
fase. Apresentar ao usuário: os 6 artefatos produzidos
(`DOMAIN_MAP.md`, `BUSINESS_RULE_CANDIDATES.md`, `REQUIREMENTS_BASELINE.md`,
`USE_CASES_RECOVERED.md`, `LEGACY_TRACEABILITY_MATRIX.md`, testes de
caracterização), quantos elos de rastreabilidade ficaram `❌ AUSENTE`,
quantas regras ficaram `CONFLICTING`/`UNKNOWN` exigindo decisão humana, e
o que exigiria aprovação para prosseguir ao passo 31.
