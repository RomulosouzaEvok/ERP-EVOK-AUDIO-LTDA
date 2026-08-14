---
name: coretriad-onboard
description: Abre um EXISTING_SYSTEM no programa LEGACY_RECOVERY_AND_MODERNIZATION do CoreTriad (Parte VIII do master spec, passos 21-24). Uso inicial e principal: ERP-LEGACY-001. Registra o projeto, fixa a baseline imutável, classifica produção real vs. não-produção, e produz o snapshot técnico e a arquitetura AS-IS — sempre parando no fim do passo 24 para novo aval humano.
---

# CORETRIAD ONBOARD — programa de recuperação do legado (passos 21-24)

Referência normativa: `docs/coretriad/CORETRIAD_MASTER_SPEC.md`, Parte VIII.

## PRÉ-CONDIÇÃO

`CORETRIAD OPERATIONALLY VALIDATED` declarado (`coretriad/governance/APPROVALS.md`).
A validação operacional do CoreTriad, por si só, **não autoriza** abrir um
programa de recuperação — é preciso aprovação humana explícita e registrada
para o `PROJECT_ID` específico, além desta skill existir. Sem os dois →
ABORTAR e informar pendência.

## REGRAS DO PROGRAMA (valem do passo 21 ao 40, sem exceção)

1. **Não refatorar, não corrigir, não excluir código, não alterar banco nem
   arquitetura durante o discovery** (passos 21-30). Isto é levantamento,
   não remediação.
2. **Não presumir que a documentação existente está correta** — incluindo
   qualquer SSOT do próprio sistema. Ela é objeto de auditoria, não fonte de
   verdade, até validada contra código e evidência.
3. **Nada vira regra oficial sem validação humana** — comportamento
   descoberto no código entra como `DISCOVERED_BUSINESS_BEHAVIOR`, nunca
   como BR, até o dono confirmar.
4. **Regra 24 do `CLAUDE.md`** (papel/permissão declarado sem verificação
   server-side = CRITICAL bloqueante) vale integralmente aqui — nunca
   `RISK_ACCEPTED` em produção.

## REGRA PERMANENTE — sistemas com módulos em produção real (obrigatória, sem excecão)

Quando o `PROJECT_STATE.md` registra o sistema como **parcialmente ou
totalmente em produção real** (processando dado real da empresa hoje), os
módulos/diretórios classificados como produção recebem tratamento
**read-only reforçado**:

- Permitido: ler código-fonte, ler schema/migrations declarados, ler
  arquivos de configuração (sem extrair segredo/credencial em texto claro).
- **Proibido, sem excecão, para qualquer agente, em qualquer passo do
  programa**: executar suíte de teste, rodar script de diagnóstico, ou
  qualquer comando que abra conexão com o banco de dados real — nem para
  "só contar linhas" ou "só confirmar comportamento". Isso vale mesmo que o
  comando pareça inofensivo ou somente leitura no SQL.
- **Inspecionar dado real (uma linha, uma query, um dump) exige aprovação
  humana explícita, caso a caso** — nunca por extensão de uma aprovação
  anterior, nunca por inferência de que "já foi autorizado algo parecido".
- Módulos classificados como não-produção (dev/homologação/sem dado real)
  não têm essa restrição adicional — seguem as regras normais de discovery
  (regra 1 acima: ainda assim, sem alterar nada).

Esta classificação (produção real × não-produção) é obrigatória **antes** do
passo 23 e deve ser explícita, por módulo/diretório, no mesmo documento do
onboarding — nunca implícita ou deixada para o auditor descobrir sozinho no
meio do snapshot.

## PASSO 21 — Onboarding formal

`coretriad-director` registra o projeto no Control Plane:
- `coretriad/states/<PROJECT_ID>/PROJECT_STATE.md`
- `coretriad/states/<PROJECT_ID>/PROJECT_EVENT_LOG.md`

Campos obrigatórios no `PROJECT_STATE.md`, além do template padrão (ver
`coretriad/states/SIM-002/PROJECT_STATE.md` para o formato):
- `Tipo: EXISTING_SYSTEM`
- `Programa: LEGACY_RECOVERY_AND_MODERNIZATION`
- `Estado atual: DISCOVERY`
- **`Status de produção`**: declarar explicitamente se o sistema é
  totalmente em produção, parcialmente em produção, ou sem produção real —
  com a lista (ainda que preliminar nesta etapa; refinada no pré-passo 23)
  de quais partes processam dado real hoje.
- Referência à aprovação humana que autorizou a abertura (ID da entrada em
  `APPROVALS.md`).

## PASSO 22 — Baseline imutável

Commit + tag (ex.: `legacy-baseline-001`) marcando "era assim antes da
recuperação" — referência permanente contra a qual todo achado futuro é
medido. Se a tag já existir apontando para um commit anterior a qualquer
trabalho de recuperação (e posterior à última mudança real no sistema
auditado), **reutilizar essa tag em vez de criar uma nova** — não duplicar
baseline. Registrar no `PROJECT_STATE.md` qual commit é a baseline.

## PRÉ-PASSO 23 — Classificação produção × não-produção (obrigatório, antes do snapshot)

Antes de convocar as trilhas de snapshot, um agente VeriCore (read-only)
percorre o repositório e produz `PRODUCTION_STATUS_MAP.md` no diretório do
projeto, listando **separadamente**:
- Módulos/diretórios que processam dado real da empresa hoje (produção).
- Módulos/diretórios em desenvolvimento/homologação, sem dado real.
- Módulos/diretórios cuja classificação é incerta a partir do código
  (registrar como `UNKNOWN — precisa confirmação humana`, nunca assumir).

Este mapa é insumo obrigatório para o passo 23: cada trilha de snapshot deve
citá-lo e respeitar a regra permanente acima ao tocar qualquer módulo
marcado como produção.

## PASSO 23 — Snapshot técnico (VeriCore, read-only)

Inventário do que **existe**, não do que deveria existir: módulos, rotas,
camadas, banco (schema declarado, não dado real), migrations, APIs, jobs,
integrações, permissões, auth, frontend, testes (existência e nomes, não
execução), dependências, CI/CD, infraestrutura declarada e documentação.

Produz, no diretório do projeto:
- `LEGACY_SYSTEM_INVENTORY.md`
- `SYSTEM_MAP.md`
- `MODULE_CATALOG.md`
- Inventários de API / banco / integrações / dependências / documentação.

Nenhuma trilha deste passo executa teste, script ou comando que abra conexão
de banco — ver regra permanente. Leitura de arquivo, grep e análise estática
apenas.

## PASSO 24 — Arquitetura real (AS-IS)

`CURRENT_ARCHITECTURE.md` — como o sistema **está** estruturado de fato,
provado por código (arquivo:linha), não como deveria estar. Não é
arquitetura-alvo (isso é o passo 34, fora do escopo desta skill).

## PARE

**Ao final do passo 24, esta skill PARA incondicionalmente.** Não convoca os
passos 25-40 (domínios, regras descobertas, requisitos recuperados, casos de
uso, matriz de rastreabilidade do legado, testes de caracterização,
auditoria 360°, etc.) sem uma nova aprovação humana explícita e registrada,
específica para essa próxima fase. Apresentar ao usuário: o que foi
produzido, o `PRODUCTION_STATUS_MAP.md`, achados de discovery que já saltam
aos olhos (sem virar finding formal ainda — isso é dos passos 25+/31), e o
que exigiria aprovação para continuar.
