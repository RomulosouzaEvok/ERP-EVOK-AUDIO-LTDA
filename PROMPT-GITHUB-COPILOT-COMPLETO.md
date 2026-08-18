# PROMPT PARA GITHUB COPILOT — ERP EVOK ÁUDIO (ERP-LEGACY-001)

> **Instruções de uso:** cole este arquivo inteiro como prompt inicial para o
> GitHub Copilot (ou Copilot Workspace/Chat com acesso ao repositório). Ele
> NÃO contém o código nem a documentação em si — é um **mapa de navegação
> preciso** apontando para os arquivos reais do repositório, na ordem certa
> de leitura, com critério objetivo do que significa "pronto". O Copilot
> deve LER os arquivos citados abaixo antes de tocar em qualquer código.
> Nenhum caminho abaixo é inventado — todos foram verificados como
> existentes no repositório na data desta entrega (2026-08-18).

---

## 0. O que este ERP é, e o que você (Copilot) está assumindo

Este é o ERP interno da EVOK ÁUDIO LTDA (fabricante de auto-falantes),
monorepo com:

- **Backend**: `server/` — Node.js + TypeScript + Express + Sequelize +
  PostgreSQL, Clean Architecture (camadas `presentation/` →
  `application/use-cases/` → `domain/` → `infrastructure/`).
- **Frontend**: `client/` — React 19 + Vite + TypeScript.
- **Mobile**: `mobile/` — React Native (Expo).
- **48 módulos de negócio** em `server/src/modules/`, cobrindo: auth,
  usuários e perfis de acesso, produtos/itens/BOM, compras, requisição de
  compra, RFQ, vendas, financeiro, fiscal (NF-e), contabilidade, tesouraria,
  orçamento, produção (ordens, roteiros, MRP, plano mestre, centros de
  trabalho), qualidade, não-conformidades, manutenção, laboratório,
  rastreabilidade, estoque/inventário, ativos, RH, SST, TI, jurídico,
  facilities, marketing, diretoria/organograma, auditoria interna,
  dashboard, relatórios, webhooks, importação de planilha.

Este projeto **já passou por uma auditoria formal completa** (veredito
`AUDIT_PASSED`, ver §2) e está em processo ativo de remediação de findings.
Você está entrando **no meio de um processo em andamento**, não do zero.
**Antes de escrever qualquer linha de código, leia a Seção 1 e a Seção 2
inteiras.** Elas dizem onde está a verdade sobre o estado atual do sistema.

---

## 1. Ordem de leitura obrigatória (nesta ordem, antes de codar)

1. `CLAUDE.md` (raiz) — regras operacionais do modelo organizacional
   "CoreTriad" que rege este repositório (ver §7 deste prompt para o
   resumo prático). **`AGENTS.md` está APOSENTADO — não leia, é cópia
   congelada obsoleta de 2026-08-02.**
2. `README.md` (raiz) — visão geral do monorepo, como rodar localmente.
3. `docs/coretriad/CORETRIAD_MASTER_SPEC.md` — especificação completa do
   processo (leitura de referência, não precisa decorar).
4. `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` — estado vivo do
   projeto.
5. `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` — **crítico**:
   mapeia exatamente quais dados/tabelas são produção real vs. teste. Nunca
   toque em dado classificado como produção real sem aprovação humana
   explícita (ver §7).
6. `coretriad/states/ERP-LEGACY-001/QUEUE_STATUS.md` e
   `HANDOFF_PROXIMA_FASE.md` — o que estava em andamento no momento mais
   recente conhecido.
7. `audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md` — o
   veredito formal da auditoria (ver §2 abaixo para o resumo).
8. `audit/runs/ERP-LEGACY-001-AUD-001/40-report/RELATORIO_EXECUTIVO.md`,
   `RELATORIO_TECNICO.md`, `REMEDIATION_BACKLOG.md` — os três relatórios
   finais da auditoria.
9. `remediation/cases/PENDING_DECISIONS_2026-08-17.md` — perguntas de
   negócio consolidadas, **ainda sem resposta do dono** na data deste
   prompt. Se você (ou quem opera o Copilot) não tiver autoridade para
   responder essas perguntas, **pare e peça decisão humana** antes de
   remediar os casos afetados — não presuma a resposta.
10. `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` — lista de
    pendências residuais conhecidas (mais confiável que qualquer TODO.md,
    que não existe formalmente neste repo).

---

## 2. Estado real da auditoria (números oficiais, não estimativas)

Fonte: `audit/runs/ERP-LEGACY-001-AUD-001/50-verdict/AUDIT_VERDICT.md`.

```
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f  (commit auditado, imutável)
VEREDITO:      AUDIT_PASSED  (emitido 2026-08-17)
```

**O que `AUDIT_PASSED` significa:** o escopo planejado da auditoria foi
executado com método verificável, e os findings CRITICAL/HIGH passaram por
refutação adversarial independente antes de serem confirmados.

**O que `AUDIT_PASSED` NÃO significa** (isto está escrito explicitamente no
próprio veredito, cite-o se alguém perguntar):
- **NÃO significa que o sistema está correto.**
- **NÃO significa que o sistema está pronto para produção.**
- **Nenhum finding deste run foi corrigido/fechado pela auditoria em si** —
  fechar findings é trabalho de remediação (SanaCore) + reteste (VeriCore),
  que está em andamento separadamente (ver §3).
- O que não foi auditado não está "íntegro" — está apenas **nomeado como
  não coberto**.

### Placar de findings (fonte: `AUDIT_VERDICT.md` §4, conferido por soma)

| Severidade | Quantidade |
|---|---|
| CRITICAL | 9 |
| HIGH | 92 |
| MEDIUM | 248 |
| LOW | 124 |
| INFO | 11 |
| **TOTAL** | **484** |

Todos os 484 findings estão descritos individualmente em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/` (97 arquivos — cada
arquivo cobre um cluster de findings relacionados, não 1:1 com o total,
porque findings correlatos foram consolidados; a lista definitiva e
numerada está em `REMEDIATION_BACKLOG.md`).

**Nenhum dos 484 findings estava fechado na data deste prompt**, exceto os
já remediados e retestados listados em `remediation/cases/` com arquivo
`VERDICT_CASE-XXX.md` (ver tabela da §3).

---

## 3. Estado da remediação — o que já foi corrigido, o que falta

Diretório: `remediation/cases/ERP-LEGACY-001-CASE-XXX/`. Cada caso
corresponde a um finding (ou cluster) da auditoria. **Sempre confira o
estado real olhando quais arquivos existem dentro da pasta do caso — não
confie em memória de conversas anteriores, o estado muda.**

| Caso | O que ele cobre (ver `TRIAGE.md` do caso para causa-raiz completa) | Estado na data deste prompt |
|---|---|---|
| CASE-001 | FIND-ERP-001 (idempotência) | Triagem feita, remediação retroativa dispachada, **sem VERDICT** |
| CASE-002 | FIND-ERP-005 (alçada de contrato jurídico) | Triagem feita, múltiplas rodadas de correção, **sem VERDICT** |
| CASE-003 | (ver TRIAGE.md do caso) | Evidência + reteste feitos, **sem VERDICT explícito registrado** |
| CASE-004 | (ver TRIAGE_REPORT.md do caso) | Triagem feita, dispatch emitido, **pendente** |
| CASE-005 | AUD-AUTHN-01 (JWT_SECRET com default fraco) | `RETEST_PASSED` no escopo testado, mas **`FINDING NOT CLOSED`** — ver `audit/runs/ERP-LEGACY-001-AUD-001/30-retest/VERDICT_CASE-005.md`; tem itens F1-F4 abertos, inclusive rotação de segredo pendente de decisão humana (gate `F3`) |
| CASE-006 | Escrita fantasma de inventário (`estoque_atual`/`estoque_reservado` na criação de item) | Corrigido tecnicamente (`zeroInitialStock`), **verifique se está commitado em `main`** antes de assumir concluído |
| CASE-007 | AUD-AUTHN-03 (rate limit chaveado por `jwt.decode` não verificado) | **FECHADO** — `RETEST_PASSED` → `FINDING CLOSED`, ver `remediation/cases/ERP-LEGACY-001-CASE-007/VERDICT_CASE-007.md` |
| CASE-008 a CASE-016 | Ver `TRIAGE.md` de cada um | Triagem e/ou dispatch feitos, **sem VERDICT** — trabalho de remediação em andamento ou não iniciado |
| CASE-017 | AUD-T01-01 (`POST /items` aceitava `estoque_atual` sem gerar movimento em `inventory_movements`) | **Bloqueado por decisão do dono** — ver `PENDING_DECISION.md` do caso. Na data deste prompt, as 3 perguntas de negócio já foram respondidas pelo dono (Opção A: saldo sempre nasce zero na criação; carga inicial vira movimento explícito autorizado por supervisor/admin de estoque) — **confirme em `coretriad/governance/APPROVALS.md` se a aprovação (`APR-2026-0XX`) já está registrada** antes de considerar isso decidido |
| CASE-018 | AUD-AUTHN-02 (senha do admin de bootstrap com default versionado) | `RETEST_PASSED` no mecanismo de código, mas **`FINDING PARCIALMENTE FECHADO`** — ver `VERDICT_CASE-018.md`: o código está corrigido e travado contra reintrodução, mas o estado real da senha do admin em produção continua indeterminado, e a rotação de credencial está bloqueada por gate humano (`PENDING_DECISION.md` do caso) |

**Regra prática para você:** antes de assumir que qualquer finding está
fechado, procure um arquivo `VERDICT_CASE-XXX.md` dentro da pasta do caso
(ou em `audit/runs/ERP-LEGACY-001-AUD-001/30-retest/`). **Só um
`VERDICT_*.md` que diga `FINDING CLOSED` conta como fechado.** Um
`REMEDIATION_EVIDENCE_PACKAGE.md` sozinho significa "código corrigido, mas
ainda não retestado/aprovado" — não trate como resolvido.

---

## 4. Pendências que exigem decisão humana (NÃO decida sozinho)

Estas questões são **de negócio**, não técnicas — envolvem trade-offs que
só o dono do produto pode resolver. Se você (Copilot) chegar a um destes
pontos, **pare e pergunte**, não invente a resposta:

1. **`remediation/cases/PENDING_DECISIONS_2026-08-17.md`** — consolida
   perguntas pendentes de vários casos simultaneamente.
2. **`remediation/cases/ERP-LEGACY-001-CASE-018/PENDING_DECISION.md`** —
   se a senha do admin de produção real (`admin@evokaudio.com.br`) está
   comprometida (usa o valor placeholder versionado) e se deve ser
   rotacionada. **Nunca tente inspecionar ou alterar essa credencial em
   produção sem aprovação humana explícita e registrada.**
3. Qualquer finding que envolva **dados classificados como produção real**
   em `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` — leia
   esse arquivo antes de tocar em qualquer tabela do banco.
4. Qualquer mudança que **rotacione segredos** (`JWT_SECRET`,
   `ADMIN_SEED_PASSWORD`, credenciais de banco) em produção — todas
   invalidam sessões ativas / têm efeito operacional imediato e exigem
   janela de manutenção combinada com o dono.

---

## 5. Comandos de validação (o que "sem bug" significa objetivamente)

Use estes comandos como critério objetivo de "pronto" — não sua própria
noção subjetiva de qualidade:

### Backend (`server/`)

```bash
cd server
npm run typecheck          # tsc --noEmit — deve dar 0 erros
npm run test:unit          # Jest, testes unitários (mockados, sem banco)
npm run test:integration   # sobe API + Postgres real de TESTE — NUNCA rodar contra banco de produção
npm run test:edge          # casos de borda
npm run test:characterization  # testes de caracterização (comportamento legado documentado)
npm run build               # tsc -p tsconfig.build.json
npm run scan:secrets        # varredura de segredos vazados
npm run verify:git-refs     # verifica referências de arquivo:linha em docs contra o código real
npm run verify:governance   # verifica consistência de governança
```

### Frontend (`client/`)

```bash
cd client
npm run build   # tsc -b && vite build
npm run lint     # oxlint
npm run test     # vitest run
```

### Docker

```bash
docker compose config   # valida sintaxe/interpolação sem subir nada
```

**Regra permanente de segurança de dado real:** existe uma tabela `users`
com uma única linha classificada como **produção real** (a conta
`admin@evokaudio.com.br`) mesmo em ambiente de desenvolvimento/teste local,
conforme `PRODUCTION_STATUS_MAP.md`. **Nunca** rode comando, script ou
teste que se conecte ao banco de produção real (`erp_evok_audio`, não
`erp_evok_audio_test`) sem aprovação humana explícita e escopada.

---

## 6. Armadilhas de validação já conhecidas neste projeto (não repita)

Fonte: `docs/governance/` e memória operacional acumulada deste programa.
Ler antes de confiar cegamente em "testes verdes = está correto":

1. **Teste que trava o defeito.** Já aconteceu neste projeto um teste
   assertar o *comportamento errado* como esperado (ex.:
   `seeds-production-boot.test.ts` chegou a assertar que uma senha
   hardcoded era o valor correto). Sempre leia a asserção, não só o
   resultado PASS/FAIL. Se corrigir um defeito faz um teste existente
   falhar, o teste provavelmente precisa ser **reescrito**, não revertido.
2. **Gate condicionado a `NODE_ENV` que nunca é atingido.** Várias
   validações de produção deste sistema ficaram "mortas" porque
   dependiam de `NODE_ENV=production`, e o `docker-compose.yml` local
   sempre usava `development` como default. Uma correção de segurança só
   é real se funcionar **independente do ambiente**, não só quando
   `NODE_ENV=production` está setado.
3. **Fallback silencioso em vez de falha ruidosa.** O padrão correto já
   estabelecido neste projeto para segredos obrigatórios é
   `${VAR:?mensagem de erro}` (Docker Compose) ou `throw` explícito
   (código), nunca um valor default versionado tipo
   `${VAR:-valor_qualquer}`.
4. **Suíte de 1400+/1900+ testes passando não prova que uma regra de
   negócio específica está correta** — prova só que nada quebrou o que já
   era testado. Ao corrigir um finding, **escreva um teste novo que falha
   contra o código antigo e passa contra o novo** (prova vermelho→verde
   real, não apenas verde).
5. **Bugs de encoding (mojibake).** Já ocorreu neste projeto um agente
   reescrever um arquivo inteiro e corromper acentuação UTF-8 (`é` virando
   `Ã©` etc.) em comentários/strings que nem precisavam ser tocados.
   Sempre que reescrever um arquivo inteiro em vez de fazer um diff
   pontual, confira o encoding depois.

---

## 7. Regras de processo (resumo prático do CoreTriad, `CLAUDE.md`)

Você não precisa operar com múltiplos agentes separados como este
repositório usa nativamente (OpusCore/VeriCore/SanaCore), mas **precisa
respeitar as garantias que esse processo protege**:

1. **Nunca declare um finding "fechado" ou "corrigido" só porque o código
   mudou.** Corrigir código é uma coisa; confirmar com teste que a correção
   é real e que nada regrediu é outra. Trate as duas etapas como
   obrigatórias e distintas.
2. **Nunca invente regra de negócio.** Se uma correção depende de um
   número, política ou decisão que não está em nenhum documento
   versionado (ex.: "qual o limite de requisições por IP da fábrica?",
   "quem aprova uma exceção fiscal?"), **pare e pergunte** — não escolha um
   valor arbitrário e siga em frente.
3. **Documentos versionados no repositório são a única fonte oficial de
   verdade.** Se uma conversa anterior (sua ou de outro agente) disser algo
   que contradiz o que está escrito em `remediation/cases/`, `audit/`, ou
   `coretriad/governance/APPROVALS.md`, **confie no arquivo**, não na
   memória da conversa.
4. **Mudanças de segurança/autenticação/autorização/dinheiro/schema de
   banco** merecem revisão extra antes de qualquer commit — são as áreas
   onde este projeto já teve mais incidentes reais.
5. **Aprovações humanas ficam registradas em
   `coretriad/governance/APPROVALS.md`**, com um ID sequencial
   `APR-2026-XXX`. Se você precisar saber se algo já foi decidido, procure
   ali primeiro.
6. **Nunca faça commit de segredo real** (senha, token, chave privada) em
   nenhum arquivo, nem em exemplo, nem em teste, nem em log.

---

## 8. Tarefa que você deve executar

Com o mapa acima em mãos, seu trabalho é:

### Fase A — Bloqueadores conhecidos de produção (prioridade imediata)

1. Percorra `remediation/cases/` e, para cada `CASE-XXX` **sem**
   `VERDICT_CASE-XXX.md` que declare `FINDING CLOSED`, leia o `TRIAGE.md`
   correspondente e determine se a causa-raiz já foi corrigida no código
   atual (o código pode já estar mais avançado que o documento — sempre
   confira o código real antes de reimplementar algo).
2. Para cada caso ainda não corrigido e sem bloqueio de decisão humana
   pendente, implemente a correção seguindo exatamente o escopo descrito
   no `TRIAGE.md` (ou no `CODEX_REMEDIATION_DISPATCH.md`/
   `CODEX_CORRECTION_DISPATCH_XX.md` do caso, se existir) — **não estenda
   o escopo além do que está escrito**, e **não decida sozinho** nos casos
   marcados como bloqueados por `PENDING_DECISION.md`.
3. Para cada correção, escreva ou reescreva o teste que comprova o defeito
   (vermelho antes, verde depois) e rode a suíte relevante (§5).
4. Ao final de cada caso corrigido, documente a correção no mesmo formato
   dos `REMEDIATION_EVIDENCE_PACKAGE.md` já existentes (veja
   `remediation/cases/ERP-LEGACY-001-CASE-007/` como referência de
   formato) — isso preserva a rastreabilidade que este projeto já mantém.

### Fase B — Cobertura completa dos 484 findings

1. Vá a `audit/runs/ERP-LEGACY-001-AUD-001/40-report/REMEDIATION_BACKLOG.md`
   — essa é a lista definitiva e priorizada de todos os findings.
2. Para cada finding **sem** `CASE-XXX` correspondente ainda aberto em
   `remediation/cases/`, crie a triagem: reproduza o defeito estaticamente
   (leitura de código, arquivo:linha), confirme se ainda existe no HEAD
   atual (o código pode ter mudado desde o `AUDIT_COMMIT`), e só então
   implemente a correção.
3. Trabalhe por ordem de severidade: CRITICAL (9) → HIGH (92) → MEDIUM
   (248) → LOW (124) → INFO (11).
4. Se dois findings tiverem a mesma causa-raiz (comum neste projeto — ver
   `T-26_CONSOLIDACAO*.md` em `audit/runs/.../07-findings/` para clusters
   já identificados), corrija uma vez só e referencie ambos.

### Critério objetivo de conclusão ("100% online e sem bug" traduzido em
verificável)

O trabalho só está pronto quando **todos** os itens abaixo forem verdade
simultaneamente:

- [ ] `npm run typecheck` (server) = 0 erros
- [ ] `npm run test:unit` (server) = 100% PASS
- [ ] `npm run test:integration` (server, contra banco de TESTE) = 100% PASS
- [ ] `npm run test:edge` (server) = 100% PASS
- [ ] `npm run build` (server e client) = sem erros
- [ ] `client/npm run lint` = sem erros
- [ ] `docker compose config` = exit 0
- [ ] `npm run scan:secrets` = nenhum segredo encontrado
- [ ] Todos os 9 CRITICAL e 92 HIGH do placar da auditoria têm
      `VERDICT_CASE-XXX.md` com `FINDING CLOSED` (ou `RISK_ACCEPTED`
      formalmente registrado pelo dono em `APPROVALS.md`, nunca decidido
      por você)
- [ ] Nenhuma pendência em `remediation/cases/PENDING_DECISIONS_2026-08-17.md`
      permanece sem resposta registrada em `APPROVALS.md` **que bloqueie**
      um finding CRITICAL/HIGH
- [ ] Nenhum `console.warn`/fallback silencioso substitui uma validação que
      deveria falhar ruidosamente em produção (ver armadilha §6.3)
- [ ] Nenhum teste novo foi escrito apenas para "passar verde" sem provar a
      ausência do defeito original (ver armadilha §6.4)

Se qualquer item acima depender de uma decisão que não está em nenhum
documento versionado, **pare nesse ponto específico, relate exatamente o
que falta decidir e por quem, e continue trabalhando no restante** — não
trave o projeto inteiro esperando uma resposta que só afeta uma parte dele.
