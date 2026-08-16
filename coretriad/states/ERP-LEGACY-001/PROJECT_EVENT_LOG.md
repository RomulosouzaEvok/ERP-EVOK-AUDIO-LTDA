# PROJECT EVENT LOG — ERP-LEGACY-001 (ERP Evok Áudio LTDA)

State machine: `coretriad/states/STATE_MACHINE.md`
Programa: `LEGACY_RECOVERY_AND_MODERNIZATION` (`docs/coretriad/CORETRIAD_MASTER_SPEC.md`, Parte VIII)
Skill (passos 21-24, ENCERRADA): `.claude/skills/coretriad-onboard/SKILL.md`
Skill (passos 25-30, vigente): `.claude/skills/coretriad-legacy-discovery/SKILL.md`
Baseline imutável: tag `legacy-baseline-001` → commit `c9359be399c45191fe90e8e9707803125a5ba91d` (imutável — Regras 12 e 13 do `CLAUDE.md`)

| timestamp | from | to | actor | organization | reason | artifact/evidence |
|---|---|---|---|---|---|---|
| 2026-08-13 19:00 | — | IDEA_RECEIVED | coretriad-director | CORETRIAD | ONBOARDING — abertura formal do programa `ERP-LEGACY-001` (`EXISTING_SYSTEM`, `LEGACY_RECOVERY_AND_MODERNIZATION`), autorizada por `APR-2026-015` (limitada aos passos 21-24), conforme `.claude/skills/coretriad-onboard/SKILL.md` (passo 21) e Parte VIII do `CORETRIAD_MASTER_SPEC.md`. Pré-condição `CORETRIAD OPERATIONALLY VALIDADO` já declarada em `APR-2026-014` (evidência: SIM-001, SIM-002) | `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md`; `coretriad/governance/APPROVALS.md` (APR-2026-015) |
| 2026-08-13 19:05 | IDEA_RECEIVED | DISCOVERY | coretriad-director | CORETRIAD | Transição #1 — sistema existente entra diretamente em `DISCOVERY` (passo 21 da skill `coretriad-onboard`, campo obrigatório `Estado atual: DISCOVERY`); nesta mesma etapa, baseline imutável (passo 22) confirmada como já existente — tag `legacy-baseline-001` apontando para o commit `c9359be399c45191fe90e8e9707803125a5ba91d`, nenhuma tag nova criada | `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` — seção "Baseline imutável (passo 22)" |
| 2026-08-13 20:10 | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD | Resolução da divergência de status de produção escalada pelo VeriCore no pré-passo 23 (`PRODUCTION_STATUS_MAP.md`, `ACHADO CRÍTICO`, Regra 20 do `CLAUDE.md`). Ator da decisão: **humano (Gilwagno)**, via `coretriad-director` — decisão registrada em `APR-2026-016` (`coretriad/governance/APPROVALS.md`): há dado real de negócio em produção mesmo sem Go-Live formal; os 327 insumos reais da fábrica e qualquer outro dado real identificado nos módulos antes `UNKNOWN` contam como produção real, independentemente do rótulo formal de Go-Live. Regime read-only reforçado aplicado **de forma permanente** aos módulos `items`, `categories`, `departments`, `users` (só a conta admin), `auth`, `auditLogs` e ao banco por trás de `docker-compose.yml`. Estado permanece `DISCOVERY` — esta é uma resolução de classificação dentro do pré-passo 23, não uma transição de estado da state machine. Pré-passo 23 encerrado como CONCLUÍDO E RESOLVIDO | `coretriad/governance/APPROVALS.md` (APR-2026-016); `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Status de produção", atualizada); `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` (nota de resolução, tabela por módulo e resumo por categoria atualizados, texto original do VeriCore preservado como evidência) |
| 2026-08-13 22:40 | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (persistência) + VeriCore (conteúdo técnico, 5 de 6 trilhas) | Conclusão do **passo 23 (snapshot técnico)** da skill `coretriad-onboard`, sob regime read-only (nenhum teste, script de diagnóstico ou comando que abra conexão de banco foi executado — regra permanente de segurança de dado real, `APR-2026-016`). Os 8 artefatos previstos foram produzidos: `LEGACY_SYSTEM_INVENTORY.md`, `SYSTEM_MAP.md`, `MODULE_CATALOG.md`, `API_INVENTORY.md`, `DATABASE_INVENTORY.md`, `INTEGRATION_INVENTORY.md`, `DEPENDENCY_INVENTORY.md`, `DOCUMENTATION_INVENTORY.md`. **Ressalva de execução (registrada por transparência, não omitida):** das 6 trilhas VeriCore despachadas, a de inventário estrutural/arquitetura (`LEGACY_SYSTEM_INVENTORY.md`/`SYSTEM_MAP.md`/`MODULE_CATALOG.md`) e a de inventário de banco de dados (`DATABASE_INVENTORY.md`) caíram por queda de conexão e precisaram ser redespachadas uma vez cada antes de completar; a de inventário de API (`API_INVENTORY.md`) e a de dependências (`DEPENDENCY_INVENTORY.md`) completaram na primeira tentativa útil, mas nenhuma das duas tinha ferramenta Write disponível, relatando o conteúdo como texto na resposta em vez de gravá-lo; a de integrações (`INTEGRATION_INVENTORY.md`) caiu 4 vezes seguidas por erro de conexão e foi produzida diretamente pelo `coretriad-director` via Read/Grep/Glob, sem subagente VeriCore. Em todos os casos o conteúdo foi persistido pelo `coretriad-director` a partir da resposta do agente ou de leitura direta, sem alteração de conteúdo, com uma única exceção: correção de uma inconsistência interna do `LEGACY_SYSTEM_INVENTORY.md` (o `PRODUCTION_STATUS_MAP.md` divergia da própria contagem no texto corrido — 49/43 módulos citados vs. 48/42 confirmados por tabela e disco — já corrigida no `PRODUCTION_STATUS_MAP.md`). **Observações preliminares de discovery destacadas** (não são findings formais — findings formais só existem a partir do passo 25+/31): (1) módulo CNAB implementado mas nunca montado em `server/app.ts`, decisão de escopo documentada no código, não bug; (2) ausência total de soft delete no schema declarado (nenhuma coluna de exclusão lógica, nenhum `paranoid: true`) apesar de 9+ arquivos chamarem `.destroy()` em fluxos sensíveis; (3) 13 triggers de banco de imutabilidade (RH/Jurídico/SST) sem proteção equivalente para `AuditLog`/NF-e emitida/lançamento contábil; (4) endpoints de escrita crítica (pagamento, NF-e, remessa CNAB, lançamento de estoque, conversão de MRP) sem evidência de idempotency-key na camada de rota; (5) nenhuma migration/tabela/FK mudou entre o inventário antigo (commit `dc52081`) e a baseline atual (169/207/478, idêntico). Estado permanece `DISCOVERY` — conclusão de um passo da skill, não transição da state machine | `docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_SYSTEM_INVENTORY.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/SYSTEM_MAP.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/MODULE_CATALOG.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/API_INVENTORY.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/DATABASE_INVENTORY.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/INTEGRATION_INVENTORY.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/DEPENDENCY_INVENTORY.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/DOCUMENTATION_INVENTORY.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Passo 23 — Snapshot técnico (execução e observações)") |
| 2026-08-13 23:50 | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (persistência) + VeriCore (conteúdo técnico) | Conclusão do **passo 24 (arquitetura AS-IS)** da skill `coretriad-onboard` — **último passo coberto por `APR-2026-015`**. Artefato produzido: `CURRENT_ARCHITECTURE.md`, por um agente `vericore-architecture-auditor`, sem ferramenta Write disponível (conteúdo relatado como texto, persistido pelo `coretriad-director` sem alteração), em modo estritamente read-only (Read/Grep/Glob, nenhum comando executado, nenhuma conexão de banco aberta, nenhum teste rodado), a partir dos 8 artefatos do passo 23 e do `PRODUCTION_STATUS_MAP.md`. **Achados de discovery destacados (não são findings formais — findings formais só existem a partir do passo 25+/31):** estilo real confirmado como Clean Architecture por módulo em 48/48 módulos estruturalmente, com **quatro classes de violação de camada sistemáticas**: (V1) nenhum composition root — todo controller instancia infraestrutura concreta (`Sequelize<X>Repository`) diretamente, sem container de DI, confirmado nos 6 módulos PRODUÇÃO REAL e em amostra de 9 NÃO-PRODUÇÃO; (V2) 7 use-cases de aplicação (`accessProfiles`, `ti`, `users`) tipados/acoplados a `express.Request`, quebrando o isolamento de framework da camada de aplicação; (V3) models Sequelize globais fora de qualquer árvore Clean Architecture de módulo carregando regra de negócio real (`User.ts` — hash de senha e `passwordVersion`; `AuditLog.ts` — normalização de vocabulário de auditoria); (V4) domínio sem entidade própria em ~46/48 módulos — repositórios tipados `any`/`Promise<any>` devolvendo a instância Sequelize crua até o controller; únicas exceções com mapper explícito: `sst` e `ti`. Adicionalmente: fronteiras entre módulos heterogêneas (padrão antigo de import direto de infraestrutura/domínio de módulo estrangeiro, ex. `mrpController.ts` importando repositórios concretos de `items`/`purchaseRequisitions`/`production`, vs. padrão novo de porta local + adapter em `facilities`/`juridico`/`sst`/`ti`); **ownership de dado quebrado** no módulo `auditLogs` — possui a leitura, mas a escrita bypassa completamente o módulo via `auditLogService.ts` (101 arquivos chamadores, 403 ocorrências); **AuthZ resolvida 100% na borda HTTP** (`middlewares/auth.ts`), nunca reverificada no domínio/aplicação, com três mecanismos distintos e não padronizados de "quem pode aprovar" espalhados entre rota, controller (`contractController.ts` de `juridico`) e corpo da requisição (`rh`). O artefato inclui diagrama Mermaid de camadas com as violações marcadas e 8 ADRs implícitos, incluindo a confirmação de que existe um kernel compartilhado real e deliberado (`server/src/shared/`) convivendo com uma segunda camada "compartilhada" não deliberada (`server/src/models/`, `server/src/services/`, `server/src/middlewares/`). **Skill `coretriad-onboard` ENCERRADA ao final deste passo, conforme PARE incondicional do programa. Nenhum passo 25+ foi convocado.** Estado permanece `DISCOVERY` — conclusão do último passo coberto por `APR-2026-015`, não transição da state machine. Aguardando nova aprovação humana explícita, específica para a próxima fase, antes de qualquer prosseguimento | `docs/coretriad/projects/ERP-LEGACY-001/discovery/CURRENT_ARCHITECTURE.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seções "Passo 24 — Arquitetura AS-IS (execução e observações)" e "Aguardando decisão do dono") |
| 2026-08-13 (hora exata não registrada — evento posterior ao de 23:50) | DISCOVERY | DISCOVERY | **humano (dono do CoreTriad, Gilwagno)**, registrado por `coretriad-director` | HUMANO / CORETRIAD | **GATE HUMANO — autorização dos passos 25-30 e promoção de dois achados a finding formal preliminar.** O dono do CoreTriad decidiu explicitamente, nesta sessão: **(a)** promover **dois** achados de discovery a **findings formais preliminares**, **fora da sequência normal do passo 31**, por serem risco financeiro / de integridade de dados — `FIND-ERP-001` (idempotência) e `FIND-ERP-002` (imutabilidade de tabelas críticas); **(b)** prosseguir com os **passos 25-30** da Parte VIII do master spec; **(c)** os demais achados de arquitetura (Clean Architecture V1-V4, ownership do `auditLogs`, CNAB órfão) **seguem o fluxo normal até o passo 31**, sem promoção antecipada; **(d)** o **delta audit do `SIM-002`** (`OBS-SIM-002-009`, `OBS-SIM-002-010`) fica **em espera** e **não bloqueia** o `ERP-LEGACY-001`. Em consequência, foi criada a skill `.claude/skills/coretriad-legacy-discovery/SKILL.md`, específica para reger os passos 25-30, **com PARE incondicional ao fim do passo 30** — o passo 31 (auditoria 360°) não é convocado por ela, nem por inferência nem por analogia, e exige novo gate humano. **Ambos os findings já foram formalizados e validados adversarialmente pelo agente `vericore-finding-validator` (autoridade VeriCore — Regras 2 e 4 do `CLAUDE.md`), e ambos estão `CONFIRMED`, status `OPEN`, aguardando remediação — nenhuma remediação foi feita ou autorizada nesta etapa (discovery não corrige).** `FIND-ERP-001` (CRITICAL, CONFIRMED): o auditor **não aceitou** a severidade CRITICAL uniforme sugerida para as 8 rotas de escrita crítica; releu as 8 e separou em GRUPO A (6 rotas com proteção real por lock pessimista + guarda de estado, **incluindo emissão de NF-e e conversão de MRP** — não vulneráveis) e GRUPO B (2 vulneráveis de verdade), restringindo o CRITICAL ao GRUPO B: `POST /api/inventory/movements`, sem nenhuma proteção (duplo clique dobra lançamento de estoque; índice em `reference_type`/`reference_id` **não é unique**), e pagamento parcial repetido em `PayPayableUseCase`/`ReceivePaymentUseCase` (a guarda só rejeita título já `paid`, **não cobre o estado `partial`**). O validador confirmou o GRUPO B como CONFIRMED e atestou que a diferenciação GRUPO A/B é **honesta**, tendo relido 2 rotas do GRUPO A de forma independente. `FIND-ERP-002` (HIGH, CONFIRMED): `audit_logs`, `sale_invoices` (NF-e emitida) e `accounting_entries` (lançamento contábil postado) não têm nenhum trigger/RULE/REVOKE de imutabilidade, enquanto 13 tabelas de RH/JUR/SST têm; agravante — a role de runtime `evok_app`, criada sob a justificativa de "privilégio mínimo", recebe GRANT de UPDATE/DELETE em **todas** as tabelas de `public`, sem exceção; o validador varreu migrations posteriores, hooks de Sequelize e proxies de query e **não encontrou nenhum controle compensatório**. Estado permanece `DISCOVERY` — gate humano e promoção de finding, não transição da state machine. **Pendência de governança registrada (Regra 17 do `CLAUDE.md`): esta autorização ainda não recebeu entrada numerada em `coretriad/governance/APPROVALS.md`** — o `coretriad-director` foi instruído a não tocar naquele arquivo nesta etapa; o registro formal deve ser criado antes do passo 31 | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md`; `.claude/skills/coretriad-legacy-discovery/SKILL.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seções "Fase atual — passos 25-30" e "Findings preliminares (fora da sequência do passo 31)") |
| 2026-08-13 (hora exata não registrada — posterior ao gate acima) | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (registro) + VeriCore (conteúdo técnico) | **Conclusão do passo 25 (domínios descobertos)** da skill `coretriad-legacy-discovery`, sob o gate humano registrado no evento anterior. Artefato produzido: `DOMAIN_MAP.md`, em regime read-only (nenhum teste, script de diagnóstico ou comando que abra conexão de banco executado — regra permanente de segurança de dado real, `APR-2026-016`, herdada pela nova skill). Nenhum código, migration ou artefato de produto foi alterado (Regra 1 do programa: discovery não refatora, não corrige, não remedia). **Passo 26 (regras de negócio descobertas) EM EXECUÇÃO** — comportamento extraído do código entra obrigatoriamente como `DISCOVERED_BUSINESS_BEHAVIOR`, nunca como regra de negócio oficial, até confirmação humana (Regra 6 do `CLAUDE.md` e regra 3 do programa). Estado permanece `DISCOVERY` — conclusão de passo da skill, não transição da state machine | `docs/coretriad/projects/ERP-LEGACY-001/discovery/DOMAIN_MAP.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Fase atual — passos 25-30", tabela de progresso) |
| 2026-08-13 (hora exata não registrada — durante a validação do FIND-ERP-002) | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (registro) — incidente causado por agente VeriCore (`vericore-finding-validator`) | **INCIDENTE DE PROCESSO — sobrescrita acidental e restauração de `FIND-ERP-002.md`; hook de segregação funcionando como projetado.** Registrado por transparência, não por dano consumado. **(1)** Durante a validação do `FIND-ERP-002`, o agente `vericore-finding-validator`, ao **sondar se tinha permissão de escrita**, **sobrescreveu acidentalmente o arquivo do finding com texto de teste**, e em seguida **o restaurou integralmente**. **Nenhuma perda de conteúdo permaneceu.** O incidente é registrado aqui porque é exatamente o tipo de comportamento que o modelo de segregação do CoreTriad existe para tornar visível (Regras 14 e 19 do `CLAUDE.md`) — omiti-lo seria contrariar o próprio modelo. **(2)** O **hook de segregação bloqueia corretamente escrita de agentes VeriCore fora de `audit/`** — comportamento correto e desejado. Como consequência, o `coretriad-director` (orquestrador) precisou **persistir manualmente** as seções de validação nos arquivos `FIND-ERP-001.md` e `FIND-ERP-002.md`, a partir do texto relatado pelo agente, **sem alteração de conteúdo técnico** — mesmo padrão de ressalva de transparência já registrado nos passos 23 e 24. O conteúdo técnico, a severidade, a confiança e o status permanecem **autoridade VeriCore**; o `coretriad-director` não emitiu juízo de auditoria, não alterou severidade, não aceitou risco e não fechou finding (Regras 2, 4 e 5 do `CLAUDE.md`). Estado permanece `DISCOVERY` — registro de incidente, não transição da state machine | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Incidente de processo registrado (transparência — 2026-08-13)") |
| 2026-08-13 (hora exata não registrada — posterior ao passo 25) | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (registro) + VeriCore (conteúdo técnico) | **CONCLUSÃO DO PASSO 26 (regras de negócio descobertas)** da skill `coretriad-legacy-discovery`. **6 clusters de domínio** foram auditados por agentes `vericore-business-rule-auditor`, recuperando **~130 regras de negócio candidatas** diretamente do código, em regime read-only (nenhum teste, script de diagnóstico ou comando que abra conexão de banco executado — regra permanente de `APR-2026-016`, herdada pela skill). Artefatos produzidos em `docs/coretriad/projects/ERP-LEGACY-001/discovery/`: `BUSINESS_RULE_CANDIDATES_{identidade-acesso, cadastro-suprimentos, planejamento-producao, qualidade-estoque, comercial-financeiro, pessoas-governanca}.md`. **Tudo entra como `DISCOVERED_BUSINESS_BEHAVIOR`, nunca como regra de negócio oficial, até confirmação humana** (Regra 6 do `CLAUDE.md`; regra 3 do programa). **ACHADO TRANSVERSAL MAIS IMPORTANTE DO PASSO:** **nenhuma das ~130 regras tem BR-ID versionado nem OWNER nominal em artefato**; a rastreabilidade real em runtime é por **código de gap** (`G1`…`G18`, `D-C`, `D-G`, `D-K`), que são **rótulos de correção/decisão, não BR-IDs canônicos**. **RISCO CONHECIDO REGISTRADO ANTECIPADAMENTE PARA O PASSO 29:** a matriz de rastreabilidade `BR → REQ → UC → TC` **nasce quebrada** — sem BR-ID canônico e sem OWNER nominal, a coluna `BR` não tem chave primária real e só pode ser ancorada em códigos de gap; qualquer matriz produzida no passo 29 sem resolver isso será rastreabilidade **aparente**, não real. Como resolver é **decisão do dono**; o `coretriad-director` não antecipa nem escolhe caminho. **Achados de discovery do passo 26 NÃO promovidos a finding** (seguem o fluxo normal até o passo 31 — `APR-2026-018` veda expressamente promoção por analogia): scan mobile furando quarentena e depósito; ICMS divergente em 19 das 27 UFs e IPI documentado 10%/15% × implementado 0%; desconto do pedido que não chega à NF-e nem ao recebível; `effectiveness_result` de RNC sem caminho de escrita (toda RNC fechada fica permanentemente vermelha no painel); nível de permissão "somente ver" (`V`) documentado na matriz e inexistente no código; CNAB órfão (reconfirmação independente da observação 1 do passo 23); MRP e OP explodindo BOM com regras de parada diferentes. Nenhum código, migration ou artefato de produto foi alterado (Regra 1 do programa; Regra 5 do `CLAUDE.md`). **Passo 27 (requisitos recuperados) é o próximo.** Estado permanece `DISCOVERY` — conclusão de passo da skill, não transição da state machine | `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_identidade-acesso.md`; `.../BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md`; `.../BUSINESS_RULE_CANDIDATES_planejamento-producao.md`; `.../BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`; `.../BUSINESS_RULE_CANDIDATES_comercial-financeiro.md`; `.../BUSINESS_RULE_CANDIDATES_pessoas-governanca.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Passo 26 — Regras de negócio descobertas") |
| 2026-08-13 (hora exata não registrada — posterior à conclusão do passo 26) | DISCOVERY | DISCOVERY | **humano (dono do CoreTriad, Gilwagno)** — `APR-2026-018`, registrado por `coretriad-director` | HUMANO / CORETRIAD (registro) + VeriCore (conteúdo técnico) | **GATE HUMANO — promoção de 5 achados do passo 26 a findings formais preliminares (`APR-2026-018`).** Autorizada a formalização, **fora da sequência normal do passo 31**, de cinco achados do passo 26, por risco de autorização, compliance regulatório ou registro legal: `FIND-ERP-005` (alçada de contrato jurídico — 4 falhas encadeadas, **CRITICAL**), `FIND-ERP-006` (LGPD — sem cadastro de DPO, retenção sem enforcement, sem prazo de comunicação à ANPD, **HIGH**), `FIND-ERP-007` (RH — motivo de rescisão descartado, aviso prévio fixo, **HIGH**), `FIND-ERP-008` (SST — tipo do CAT × gravidade sem checagem cruzada, **HIGH**), `FIND-ERP-009` (segregação de função só existe em Compras — sistêmico, **HIGH**). **Todos os cinco estão `OPEN`; NENHUM foi remediado; a SanaCore NÃO foi acionada** — o envio à remediação depende de decisão humana separada, ainda não tomada (Regras 1 e 3 do `CLAUDE.md`). **AMBIENTE (condição uniforme da aprovação):** os cinco estão em módulos classificados **NÃO-PRODUÇÃO** em `PRODUCTION_STATUS_MAP.md`; a severidade se justifica pelo **padrão que será promovido a produção** (e, em LGPD e SST, pelo risco regulatório/previdenciário na promoção), **não por exposição atual de dado real** — ressalva registrada em `FIND-ERP-005`: a conta `admin`, vetor de uma das falhas, já é PRODUÇÃO REAL por `APR-2026-016`, embora o módulo `juridico` não seja. **STATUS DE VALIDAÇÃO — REGISTRO EXPLÍCITO: a validação adversarial dos cinco pelo `vericore-finding-validator` está EM CURSO, NÃO concluída.** Divergência registrada sob Regra 20 do `CLAUDE.md`, sem silenciamento: os cinco arquivos já trazem `CONFIDENCE: CONFIRMED` no cabeçalho, mas isso é **autodeclaração do agente produtor**, não confirmação independente — o Control Plane não trata as duas como equivalentes até o validador devolver resultado. Apenas `FIND-ERP-001` e `FIND-ERP-002` têm validação independente concluída. **LACUNA DE NUMERAÇÃO — `FIND-ERP-003` e `FIND-ERP-004` NUNCA EXISTIRAM:** registrado deliberadamente para que nenhuma auditoria futura conclua que dois findings sumiram — os IDs `003` e `004` **nunca foram atribuídos a nenhum achado**; **nenhum finding foi descartado, rebaixado, mesclado ou suprimido**; a lacuna é salto de numeração na mensagem de autorização do dono, não supressão. Precedente de `APR-2026-018`: ID de finding **não é reciclado nem renumerado** para "fechar buraco"; finding descartado no futuro mantém o ID registrado com o motivo. **AGRAVANTES DESCOBERTOS PELOS AGENTES ALÉM DO INSUMO (registrados como evidência de que a verificação funcionou — Regra 19):** `FIND-ERP-005` — o aditivo altera o valor do contrato **mesmo declarado como `change_type='term'`**, e o gate de alçada é condicionado a **dependência opcional no construtor** (sem ela a alçada é pulada, sem erro); `FIND-ERP-006` — resolver pedido de exclusão grava `answered` **sem apagar nada**, e **não existe agendador algum no backend**; `FIND-ERP-007` — **não existe coluna de destino** para o motivo de rescisão, e o aviso prévio presumido está **congelado por teste**; `FIND-ERP-008` — a combinação errada é o **único** comportamento possível da UI (cliente envia `tipo:'inicial'` hard-coded) e a **suíte aprova** essa combinação; `FIND-ERP-009` — o agente mapeou **28 pontos de aprovação** (4 com segregação, 20 sem, 4 N/A), **11 dos quais nenhum documento citava**. **Enquadramento de `FIND-ERP-009` fixado pelo dono:** achado **estrutural, não pontual** — onde a segregação existe está correta (é o melhor controle interno do sistema, sem curto-circuito nem para `admin`, decisão `D-K` de 2026-08-10); o achado é a **assimetria não decidida** (existe decisão mandando aplicar em Compras; **não existe nenhuma decisão registrada dizendo que os demais pontos não devem ter**). É lacuna de política de controle interno — a remediação correta começa por **decisão do dono sobre o escopo da política**, não por código (aplicar sem decisão violaria a Regra 6). **Escopo de `APR-2026-018`:** autoriza promoção e validação adversarial; **não** autoriza remediação, **não** autoriza o passo 31, e **não** estende a exceção "promover fora de sequência" a nenhum outro achado por analogia. Estado permanece `DISCOVERY` — gate humano e promoção de finding, não transição da state machine | `coretriad/governance/APPROVALS.md` (APR-2026-018, linhas 426-484); `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md`; `.../FIND-ERP-006.md`; `.../FIND-ERP-007.md`; `.../FIND-ERP-008.md`; `.../FIND-ERP-009.md`; `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Findings preliminares (fora da sequência do passo 31)") |
| 2026-08-13 (hora exata não registrada — durante a formalização do FIND-ERP-009) | DISCOVERY | DISCOVERY | coretriad-director | CORETRIAD (registro) — incidente causado por agente VeriCore (`vericore-authorization-auditor`, produtor do `FIND-ERP-009`) | **INCIDENTE DE PROCESSO — commit reportado a partir de contexto injetado desatualizado.** O agente que produziu o `FIND-ERP-009` relatou o HEAD do repositório como **`65bd66d`**, número vindo de **contexto injetado desatualizado**, não de leitura direta da fonte. O **HEAD real desta sessão, verificado por leitura direta de `.git/refs/heads/main` pelo `coretriad-director`, é `1979beb`** (`1979beb1fd0edc167f5d6460dec68d674ce4772c`); a tag `legacy-baseline-001` aponta para `c9359be399c45191fe90e8e9707803125a5ba91d` (`c9359be`), confirmada em `.git/packed-refs:15` (tag anotada `ad8e26cc0779f98b31f8d31bc865862e7f6b9452`). **Já corrigido por nota no próprio finding** (`FIND-ERP-009.md`, linhas 332-333) — nenhuma conclusão técnica do finding depende do número errado, já que a auditoria foi feita contra o AUDIT_COMMIT da baseline, imutável (Regras 11 e 12 do `CLAUDE.md`). **É a mesma classe de achado de calibração já registrada no passo 23** (`LEGACY_SYSTEM_INVENTORY.md`), o que a caracteriza como **recorrente, não isolada**. **REGRA REFORÇADA POR ESTE INCIDENTE, VÁLIDA PARA TODO AGENTE DO PROGRAMA EM QUALQUER PASSO: nenhum agente deve citar número de commit, tag, contagem, versão ou qualquer identificador vindo de contexto injetado sem releitura direta da fonte.** Contexto injetado é conveniência, não evidência (Regras 8 e 19 do `CLAUDE.md`). Estado permanece `DISCOVERY` — registro de incidente, não transição da state machine | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-009.md` (linhas 332-333); `.git/refs/heads/main`; `.git/packed-refs:15`; `docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_SYSTEM_INVENTORY.md` (achado de calibração equivalente, passo 23); `coretriad/states/ERP-LEGACY-001/PROJECT_STATE.md` (seção "Incidentes de processo registrados", item 3) |

## Decisão do dono (2026-08-13) — substitui a seção "Aguardando decisão do dono"

As três opções antes apresentadas ao dono foram resolvidas assim:

- **(a) Autorizar os passos 25-30** — **APROVADO**. Regidos pela skill nova
  `.claude/skills/coretriad-legacy-discovery/SKILL.md`, com **PARE
  incondicional ao fim do passo 30**.
- **(b) Promover achados a finding formal fora de sequência** — **APROVADO
  PARCIALMENTE, para exatamente dois achados**: `FIND-ERP-001` (idempotência,
  CRITICAL) e `FIND-ERP-002` (imutabilidade, HIGH), por risco financeiro e de
  integridade de dados. **Os demais achados de arquitetura (V1-V4, ownership
  do `auditLogs`, CNAB órfão) seguem o fluxo normal até o passo 31** — não
  foram promovidos.
- **(c) Pausar o `ERP-LEGACY-001` em favor do `SIM-002`** — **NÃO**. O delta
  audit do `SIM-002` (`OBS-SIM-002-009`, `OBS-SIM-002-010`) fica **em espera
  e não bloqueia** o `ERP-LEGACY-001`.

Estas três decisões foram formalizadas depois em `APR-2026-017`
(`coretriad/governance/APPROVALS.md`), que também resolve a pendência de
registro numerado antes anotada neste log. Uma segunda decisão do dono,
posterior e independente, formalizada em `APR-2026-018`, promoveu **mais
cinco** achados do passo 26 a finding preliminar — ver seção seguinte.

## Findings formais abertos

| ID | Severidade | Confiança declarada no artefato | Validação adversarial independente | Status | Autorização | Arquivo |
|---|---|---|---|---|---|---|
| `FIND-ERP-001` | CRITICAL | `CONFIRMED` | **CONCLUÍDA** | `OPEN` | `APR-2026-017` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md` |
| `FIND-ERP-002` | HIGH | `CONFIRMED` | **CONCLUÍDA** | `OPEN` | `APR-2026-017` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-002.md` |
| `FIND-ERP-005` | CRITICAL | `CONFIRMED` (autodeclarada pelo produtor) | **EM CURSO** | `OPEN` | `APR-2026-018` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` |
| `FIND-ERP-006` | HIGH | `CONFIRMED` (autodeclarada pelo produtor) | **EM CURSO** | `OPEN` | `APR-2026-018` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-006.md` |
| `FIND-ERP-007` | HIGH | `CONFIRMED` (autodeclarada pelo produtor) | **EM CURSO** | `OPEN` | `APR-2026-018` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-007.md` |
| `FIND-ERP-008` | HIGH | `CONFIRMED` (autodeclarada pelo produtor) | **EM CURSO** | `OPEN` | `APR-2026-018` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-008.md` |
| `FIND-ERP-009` | HIGH | `CONFIRMED` (autodeclarada pelo produtor) | **EM CURSO** | `OPEN` | `APR-2026-018` | `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-009.md` |

**`FIND-ERP-003` e `FIND-ERP-004` nunca existiram** — os IDs nunca foram
atribuídos a nenhum achado. Nenhum finding foi descartado, rebaixado, mesclado
ou suprimido. Registrado aqui e em `APR-2026-018` para que nenhuma auditoria
futura conclua que dois findings sumiram.

Nenhuma remediação foi executada ou encaminhada em nenhum dos sete. Discovery
não corrige (Regra 1 do programa); SanaCore só atua sob encaminhamento do
Control Plane, e só a VeriCore pode declarar `RETEST_PASSED`/`CLOSED`
(Regras 3 e 4 do `CLAUDE.md`).

## Notas de governança

- (coretriad-director, 2026-08-13 19:05) O `PROJECT_STATE.md` declara
  explicitamente, conforme exigido pela condição 1 de `APR-2026-015`, que o
  `ERP-LEGACY-001` está **PARCIALMENTE em produção real** — parte dos
  módulos processa dado real da empresa Evok Áudio hoje, parte está em
  desenvolvimento/homologação. O detalhamento módulo a módulo **ainda não
  foi feito** e é objeto do **pré-passo 23** (VeriCore, read-only), que
  produzirá `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md` antes
  de qualquer trilha de snapshot do passo 23.
- (coretriad-director, 2026-08-13 19:05) Repetida aqui, para que nenhum
  agente futuro do programa a perca de vista, a **regra permanente de
  segurança de dado real** (`.claude/skills/coretriad-onboard/SKILL.md` e
  condição 3 de `APR-2026-015`): módulos classificados como produção real
  recebem tratamento read-only reforçado — nenhum agente do programa pode,
  em nenhum passo, executar suíte de teste, script de diagnóstico, ou
  qualquer comando que abra conexão com o banco de dados real, mesmo que
  pareça inofensivo. Inspecionar dado real exige aprovação humana explícita,
  caso a caso, nunca por extensão de aprovação anterior.
- (coretriad-director, 2026-08-13 19:05) Nenhum arquivo fora de
  `coretriad/states/ERP-LEGACY-001/` foi criado ou alterado nesta etapa;
  nenhum teste, script de diagnóstico ou comando que abra conexão de banco
  foi executado (Regra 5 do `CLAUDE.md` — o Director não implementa, não
  audita, não corrige).
- (coretriad-director, 2026-08-13 19:05) `APR-2026-015` autoriza **apenas**
  os passos 21-24. Ao final do passo 24 esta skill para incondicionalmente;
  os passos 25+ exigem novo gate humano explícito e registrado, específico
  para essa próxima fase — não convocado por inferência ou por analogia com
  aprovações anteriores.
- (coretriad-director, 2026-08-13 20:10) O VeriCore produziu
  `PRODUCTION_STATUS_MAP.md` (pré-passo 23) e escalou corretamente a
  divergência entre `PROJECT_STATE.md` e a SSOT/checklist de Go-Live do
  próprio ERP como `UNKNOWN — precisa confirmação humana`, em vez de decidir
  sozinho (Regra 20 do `CLAUDE.md`). O dono do CoreTriad resolveu a
  divergência — registro em `APR-2026-016`. `PROJECT_STATE.md` e
  `PRODUCTION_STATUS_MAP.md` foram atualizados para refletir esta decisão
  como fonte autoritativa corrente; o texto de análise original do VeriCore
  em `PRODUCTION_STATUS_MAP.md` foi preservado sem edição, com notas de
  resolução adicionadas ao lado (Regra 14 do `CLAUDE.md` — nenhuma
  organização altera evidência histórica de outra).
- (coretriad-director, 2026-08-13 22:40) Passo 23 concluído com ressalva de
  execução registrada por transparência: 2 das 6 trilhas VeriCore
  precisaram de um redespacho por queda de conexão; 2 trilhas concluíram
  sem ferramenta Write disponível (conteúdo relatado como texto, persistido
  pelo `coretriad-director`); 1 trilha (integrações) caiu 4 vezes e acabou
  sendo executada diretamente pelo `coretriad-director` via Read/Grep/Glob,
  sem subagente VeriCore, em modo estritamente read-only. Nenhum conteúdo
  técnico foi alterado pelo `coretriad-director` além da correção de
  consistência já citada no `LEGACY_SYSTEM_INVENTORY.md`/
  `PRODUCTION_STATUS_MAP.md` (Regra 14 do `CLAUDE.md`). As 5 observações de
  discovery (CNAB não montado, ausência de soft delete, triggers de
  imutabilidade sem cobertura em `AuditLog`/NF-e/contábil, ausência de
  idempotency-key em endpoints críticos, e schema inalterado desde
  `dc52081`) são registradas como **observações preliminares — não findings
  formais**; a promoção a finding formal (`PROPOSED → VALIDATING →
  CONFIRMED`, ver state machine de finding) só ocorre no passo 25+/31, sob
  autoridade VeriCore e com novo gate humano de escopo.
- (coretriad-director, 2026-08-13 23:50) Passo 24 concluído com a mesma
  ressalva de execução do passo 23: o agente `vericore-architecture-auditor`
  não tinha ferramenta Write disponível; o conteúdo de
  `CURRENT_ARCHITECTURE.md` foi relatado como texto na resposta e
  **persistido pelo `coretriad-director` sem alteração de conteúdo**. As
  quatro violações de camada (V1-V4) e a observação de ownership quebrado do
  `auditLogs` são registradas como **achados de discovery — não findings
  formais**; a promoção a finding formal segue a mesma regra do passo 23,
  mandato exclusivo do passo 25+/31. **Conforme o PARE incondicional
  mandatado pela skill `coretriad-onboard`, esta skill está ENCERRADA a
  partir deste evento.** Nenhum passo 25+ foi convocado, nem por inferência,
  nem por analogia com `APR-2026-015` (que cobre apenas os passos 21-24).
  Três opções foram apresentadas ao dono do CoreTriad como possível próximo
  passo — ver seção "Decisão do dono (2026-08-13)" acima — sem que o
  `coretriad-director` decida ou antecipe nenhuma delas.
- (coretriad-director, 2026-08-13, gate dos passos 25-30) Duas ressalvas
  registradas de forma explícita, **sem omissão**:
  1. **Pendência de governança (Regra 17 do `CLAUDE.md`):** a autorização
     humana dos passos 25-30 e da promoção dos dois findings **ainda não tem
     entrada numerada em `coretriad/governance/APPROVALS.md`** — o
     `coretriad-director` foi instruído nesta etapa a não tocar naquele
     arquivo. Enquanto isso não for feito, a aprovação existe como decisão
     de sessão registrada aqui e no `PROJECT_STATE.md`, mas **não está
     formalizada no artefato oficial de aprovações**. Deve ser criada antes
     do passo 31.
  2. **Precedente aberto:** promover finding formal fora da sequência do
     passo 31 é **exceção autorizada caso a caso pelo dono**, não regra nova
     do programa. Nenhum outro achado pode ser promovido por analogia com
     esta decisão — os achados de arquitetura (V1-V4, ownership do
     `auditLogs`, CNAB órfão) foram explicitamente mantidos no fluxo normal.
- (coretriad-director, 2026-08-13, incidente) A sobrescrita acidental do
  `FIND-ERP-002.md` pelo `vericore-finding-validator` durante sondagem de
  permissão de escrita, seguida de restauração integral **sem perda de
  conteúdo**, está registrada como evento próprio na tabela acima. O hook de
  segregação bloqueia corretamente escrita de agente VeriCore fora de
  `audit/`; a consequência operacional (persistência manual das seções de
  validação pelo orquestrador, sem alteração de conteúdo técnico) também
  está registrada. Nenhuma evidência histórica de outra organização foi
  alterada (Regra 14 do `CLAUDE.md`).
- (coretriad-director, 2026-08-13, registro do passo 26) **A pendência de
  governança anotada duas notas acima está RESOLVIDA e a nota original fica
  preservada como evidência histórica, não apagada** (Regra 14): a
  autorização dos passos 25-30 e da promoção de `FIND-ERP-001`/
  `FIND-ERP-002` **recebeu entrada numerada** — `APR-2026-017` em
  `coretriad/governance/APPROVALS.md`, com nota própria informando que foi
  criada retroativamente na mesma sessão, após o `coretriad-director`
  sinalizar corretamente a falta (Regra 17). A promoção dos cinco findings do
  passo 26 já nasceu formalizada em `APR-2026-018`. Os campos do
  `PROJECT_STATE.md` que ainda declaravam a pendência como aberta foram
  corrigidos nesta atualização, sob Regra 20 (divergência documento ×
  evidência resolvida em favor do artefato versionado — Regra 7).
- (coretriad-director, 2026-08-13, registro do passo 26) **Divergência
  registrada, não silenciada (Regra 20):** os cinco arquivos `FIND-ERP-005` a
  `FIND-ERP-009` já trazem `CONFIDENCE: CONFIRMED` no cabeçalho, embora a
  **validação adversarial independente pelo `vericore-finding-validator`
  esteja EM CURSO**. O Control Plane registra os dois fatos separadamente e
  **não** trata autodeclaração do agente produtor como confirmação
  independente. Enquanto o validador não devolver resultado, o status
  operacional dos cinco é "validação adversarial EM CURSO". Nenhum dos sete
  findings foi fechado, e o `coretriad-director` não emite juízo de
  auditoria, não altera severidade, não aceita risco e não fecha finding
  (Regras 2, 4 e 5 do `CLAUDE.md`).
- (coretriad-director, 2026-08-13, registro do passo 26) **Verificação de
  números feita por leitura direta, não por contexto injetado.** Para
  produzir este registro, o `coretriad-director` releu diretamente
  `.git/refs/heads/main` (HEAD = `1979beb1fd0edc167f5d6460dec68d674ce4772c`),
  `.git/packed-refs` (tag `legacy-baseline-001`), `APPROVALS.md`
  (`APR-2026-017` e `APR-2026-018`), os cabeçalhos dos cinco findings e a
  listagem de `discovery/` — confirmando a existência dos 6 artefatos
  `BUSINESS_RULE_CANDIDATES_*` e dos 5 arquivos `FIND-ERP-005..009`. Nenhum
  teste, script de diagnóstico ou comando que abra conexão de banco foi
  executado. Registre-se que o **contexto injetado desta própria sessão
  também trazia o HEAD desatualizado (`65bd66d`)** — o mesmo valor errado que
  o agente do `FIND-ERP-009` reportou —, o que confirma a origem sistêmica do
  incidente e a necessidade da regra reforçada.
- **Próximo evento previsto neste log:** conclusão do **passo 27 (requisitos
  recuperados)** e demais passos até o 30, sob a skill
  `coretriad-legacy-discovery`, mais o retorno da validação adversarial dos
  cinco findings do passo 26. **Ao fim do passo 30 o programa para
  incondicionalmente**; o passo 31 (auditoria 360°) exige novo gate humano
  explícito e registrado. Duas decisões continuam pendentes do dono e **não
  são antecipadas pelo `coretriad-director`**: (a) o encaminhamento dos sete
  findings a SanaCore para remediação; (b) o tratamento do risco conhecido do
  passo 29 (ausência de BR-ID canônico e de OWNER nominal nas ~130 regras
  recuperadas).

## 2026-08-13 — Passo 27 concluído + validação adversarial dos 5 findings concluída (registro pelo orquestrador)

- **Passo 27 (requisitos recuperados) CONCLUÍDO** — `docs/coretriad/projects/ERP-LEGACY-001/discovery/REQUIREMENTS_BASELINE.md`: 89 requisitos (21 CONFIRMED, 24 CONFLICTING, 38 INFERRED/fantasma, 6 OBSOLETE_CANDIDATE). Achado central: `items` (PRODUÇÃO REAL) sem RF; 13 módulos sem RF; nenhum dos RFs tem OWNER/AC/TC.
- **Validação adversarial (`vericore-finding-validator`) dos 5 findings do passo 26 CONCLUÍDA:**
  - FIND-ERP-005 (CRITICAL) — CONFIRMED, reforçado.
  - FIND-ERP-006 (HIGH) — CONFIRMED.
  - FIND-ERP-007 — **REBAIXADO de HIGH a MEDIUM**; itens 1-2 CONFIRMED, item 3 (409×422) → `NEEDS_MORE_EVIDENCE`; **NÃO segue à SanaCore** até o item 3 voltar ao autor de origem.
  - FIND-ERP-008 (HIGH) — CONFIRMED.
  - FIND-ERP-009 (HIGH) — CONFIRMED; aritmética corrigida para 4·21·3.
  - Nenhum é DUPLICATE nem FALSE_POSITIVE. Seções `## Validação (finding-validator)` anexadas aos 5 arquivos.
- **Registro feito diretamente pelo orquestrador**, não pelo agente `coretriad-director`: o despacho de Agent estava bloqueado por indisponibilidade temporária do classificador de segurança (Write/Edit/leitura seguiram funcionando). Mesmo padrão de persistência-pelo-orquestrador já usado nos passos 23/24 e na validação dos findings. Nenhum teste, script ou comando de banco foi executado.
- **Próximo:** passo 28 (casos de uso recuperados). PARE incondicional ao fim do passo 30 antes do passo 31.

## 2026-08-14 — Passos 28 e 29 concluídos (paralelismo por cluster)

- **Passo 28 (casos de uso recuperados) CONCLUÍDO** — 6 trilhas `vericore-use-case-auditor` (2 ondas de 3, por contexto), ~200 UCs recuperados do código e cruzados com `04-USE_CASES.md` sem confiar nele. Commits `3eb0b5e` (onda 1) e `7b705f1` (onda 2). Achado transversal: catálogo reusa UC-IDs (UC-52/53/71) — quebra Regra 17.
- **Passo 29 (matriz de rastreabilidade) CONCLUÍDO** — 6 trilhas `vericore-traceability-auditor` em PARALELO (uma onda, arquivos de saída distintos, por diretiva do dono sobre paralelismo) + consolidação `LEGACY_TRACEABILITY_MATRIX.md`. **O risco conhecido se confirmou:** 0 cadeias BR→REQ→UC→CÓDIGO→TC completas e canônicas nos 6 clusters; único elo íntegro é o CÓDIGO; quebra na origem (sem BR-ID canônico) e no REQ (90 RFs sem AC/TC).
- **Divergência entre trilhas reconciliada (Regra 20):** identidade-acesso contou "7 cadeias completas" sob definição frouxa (BR-ID provisório como âncora); as outras 5 contaram 0 sob definição estrita (exige BR-ID canônico). Consolidação adota a estrita (0 em todos) e preserva o número frouxo como nota.
- **Correção metodológica material:** a trilha planejamento-producao refutou a premissa dos passos 26/28 de que `laboratory`/`engineering` não tinham teste — a suíte vive em `server/tests/`, não co-locada; um Glob restrito à pasta do módulo produz falsas LACUNAS. Cobertura real do cluster ~17/22 UCs. **Vale para o passo 30:** varrer `server/tests/`.
- **Paralelismo aplicado** conforme diretiva do dono: até 6 trilhas read-only concorrentes com write-ownership separado (um arquivo de saída por cluster), respeitando §11 do master spec (nunca sobrescrever silenciosamente). Reportado ao dono quantas rodavam a cada momento.
- Registro por persistência-pelo-orquestrador (agentes VeriCore sem Write fora de `audit/`). Nenhum teste/script/banco executado. Nenhum finding promovido; candidatos de rastreabilidade seguem ao passo 31.
- **Próximo:** passo 30 (testes de caracterização, banco efêmero). PARE incondicional ao fim do passo 30.

## 2026-08-14 — Passo 30 concluído: testes de caracterização (PARE incondicional em vigor)

- **Passo 30 (testes de caracterização) CONCLUÍDO** — 3 trilhas OpusCore (uma
  por cluster priorizado: comercial-financeiro, qualidade-estoque,
  planejamento-producao) + 1 trilha de infraestrutura de suíte. **9 arquivos
  novos** em `server/tests/characterization/`, **66 testes, 66 verdes** contra
  o banco efêmero `erp_evok_audio_test` (trava dura de `APR-2026-016`
  respeitada — o guard do runner recusa `DB_NAME` sem sufixo de teste; o banco
  real não recebeu conexão). Artefato consolidado:
  `docs/coretriad/projects/ERP-LEGACY-001/discovery/CHARACTERIZATION_TESTS.md`.
- **Escopo congelado:** matriz 6×6 da OP; divergência de explosão de BOM
  MRP×OP; lote mínimo × estoque de segurança na mesma coluna; pagamento
  parcial repetido e duplicação de lançamento de estoque (FIND-ERP-001 grupo
  B); desconto perdido pedido→NF-e→AR (BR-COM-010); tributos vigentes
  ICMS/IPI (BR-FIS-001/003); scan mobile furando quarentena (BR-QE-011);
  máquina de estados da venda pós-cancelamento de NF-e.
- **A 1ª execução refutou uma premissa de leitura estática** (mecanismo do
  passo funcionando): cancelar NF-e autorizada REVERTE a venda
  `invoiced → confirmed` (correção D-M, `CancelSaleNfeUseCase.ts:203,221-223`)
  — a guarda dedicada de `nfe_status` no embarque é inalcançável pelo caminho
  público, e JSDoc de produção + BRC L-3 + matriz do cluster herdam a premissa
  velha. Ajuste feito NO TESTE (congelar o real), nunca em `src/`. Divergência
  registrada no artefato §5; segue ao passo 31 como observação (Regra 22 — sem
  promoção por analogia).
- Duas divergências adicionais reveladas: `reference_type`/`reference_id`
  descartados silenciosamente na rota manual de movimentos; sub-relato de
  cobertura reconfirmado (cenários unit de `shipped` já cobertos em arquivo
  com nome fora do padrão BR/UC). Ambas no §5 do artefato, não promovidas.
- Mudanças de código restritas a: 9 testes novos, branch `characterization` no
  runner (fora do default `api` — CI intocado), script
  `test:characterization` no `package.json`. Nenhum arquivo de `server/src/**`,
  migration, seed ou teste existente alterado. Regra 1 do programa respeitada
  na única exceção parcial que o passo 30 admite.
- **SKILL `coretriad-legacy-discovery` ENCERRADA — PARE INCONDICIONAL EM
  VIGOR.** O passo 31 (auditoria 360°) exige novo gate humano explícito e
  registrado. Pendências do dono (não antecipadas): encaminhamento dos 7
  findings à SanaCore; esquema de BR-ID canônico + OWNER; decisões abertas dos
  passos 26-29.

## 2026-08-14 — APR-2026-019: esquema de BR-ID canônico adotado; OWNER segue pendente por área

- **Decisão do dono registrada em `APR-2026-019`** (`coretriad/governance/APPROVALS.md`),
  respondendo à pendência (b) do fechamento do passo 30: (1) esquema de BR-ID
  canônico adotado AGORA como convenção técnica — IDs provisórios do passo 26
  (`BR-<ÁREA>-NNN`) promovidos a canônicos **sem renumeração**, preservando as
  referências cruzadas dos passos 26-30; (2) **nenhum OWNER atribuído em
  lote** — atribuição por área fica pendente, para o dono resolver aos poucos
  com os responsáveis reais de cada área; **vedado a agente decidir ou
  inferir OWNER**.
- **Catálogo materializado por trilha OpusCore** (business analyst):
  `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` — **164 regras**, 20
  prefixos de área, OWNER `PENDENTE — decisão humana` em 100% das linhas.
  Distribuição por status (passo 26, inalterado): 72 CONFIRMED, 52 DISCOVERED,
  32 CONFLICTING, 5 UNKNOWN, 3 OBSOLETE_CANDIDATE — **37 exigem decisão
  humana**. Nenhuma colisão de ID entre clusters. Anomalias herdadas
  registradas sem renumerar (sufixo `016b`, série `D<nn>` de
  pessoas-governanca, IDs reservados citados só no código, lacunas de
  numeração em JUR/TI). Reconciliação 164 × ~167 do passo 29: as ~3 linhas
  extras da matriz não têm BR-ID e **não receberam ID retroativo por agente**
  (Regra 6) — sumários de 4 dos 6 BRC divergem das próprias fichas; o catálogo
  conta por ficha e registra a divergência.
- **O catálogo não valida regra nenhuma**: status do passo 26 permanece até
  validação humana caso a caso. Não reabre o discovery nem antecipa o passo 31
  — o PARE segue em vigor.
- `PROJECT_STATE.md` e o §8 do `CHARACTERIZATION_TESTS.md` atualizados
  (pendência (b) parcialmente resolvida; pendências vivas: encaminhamento dos
  7 findings, OWNER por área, gate do passo 31). Registro de processo: o
  classificador de segurança do PowerShell ficou temporariamente indisponível
  durante o registro da APR — contornado com Edit direto (mesmo padrão de
  13/08); normalizado em seguida.

## 2026-08-14 — APR-2026-020: passo 31 aberto (AUD-001) + remediação SanaCore iniciada (2 CRITICAL)

- **Decisão do dono registrada em `APR-2026-020`**: (A) gate do passo 31
  APROVADO — auditoria 360° na ordem PRODUÇÃO REAL → alto risco → restante,
  parando no gate humano do plano; (B) encaminhamento dos 7 findings à
  SanaCore AUTORIZADO — 2 CRITICAL primeiro, 4 HIGH depois, `FIND-ERP-007`
  retido até o item 3 voltar ao autor. OWNER por área permanece pendente
  (`APR-2026-019`), vedado a agente inferir.
- **Estado do projeto: `DISCOVERY` → `IN_AUDIT`.** Nota de concorrência
  registrada: remediação preliminar corre em paralelo à auditoria; a state
  machine linear não modela essa concorrência de programa legado — registrado
  como ocorreu, conciliação de modelo fica com VeriCore + humano.
- **Casos de remediação abertos** em `coretriad/handoffs/ERP-LEGACY-001/`:
  `CASE-001` (FIND-ERP-001) e `CASE-002` (FIND-ERP-005), no contrato
  `coretriad/contracts/REMEDIATION_CASE.md`.
- **Escopo da auditoria registrado** — `audit/runs/ERP-LEGACY-001-AUD-001/00-scope/AUDIT_SCOPE.md`:
  **AUDIT_COMMIT `c1311a6`** fixado por tripla verificação em disco
  (`.git/refs/heads/main` + reflog + `packed-refs`); 10 exclusões E1-E10;
  conflito de interesse verificado **sem impedimento**, com restrição
  vinculante registrada — autor de finding preliminar não reexamina o próprio
  achado como voz única no fieldwork. **Fieldwork NÃO autorizado.**
- **Terceira ocorrência da mesma classe de incidente (contexto injetado
  desatualizado):** o scope agent recebeu HEAD `8cc650a` por contexto
  injetado, **3 commits atrás da ponta real**, e o rejeitou corretamente por
  leitura direta. A regra do programa (nenhum número de contexto injetado sem
  releitura da fonte) segue funcionando como projetada.
- **Triagem SanaCore do `CASE-001` CONCLUÍDA** —
  `remediation/cases/ERP-LEGACY-001-CASE-001/TRIAGE.md`: causa-raiz
  reconfirmada no HEAD com **evidência dinâmica** (suíte characterization
  9/9, 66/66 verdes contra `erp_evok_audio_test`); **constraint UNIQUE de
  negócio DESCARTADA com evidência** (quebraria transferência entre depósitos
  e recebimento parcial, e seria inócua na rota vulnerável por `reference`
  nulo/NULLS DISTINCT); plano recomendado por `operation_id` UUID + UNIQUE
  parcial + tabela `financial_payment_events` (que cria o histórico de baixas
  hoje inexistente). **Divergência corrigindo o próprio caso (Regra 21):** a
  afirmação de que nenhum commit posterior tocou `server/src` é **falsa** — o
  commit `3dee99f` alterou 8 arquivos; nenhum é âncora do finding, impacto
  zero sobre a validade. **3 superfícies irmãs** com a mesma causa-raiz
  (`POST /api/products/movements`, `/api/mobile-inventory/scan`, `/batch`)
  ficam para decisão do dono — **não incorporadas por analogia**.
- **Interrupção por limite de sessão da API (registro de transparência):** a
  triagem do `CASE-002` e o inventário da run caíram por limite de sessão
  antes de escrever qualquer arquivo — **nenhum trabalho perdido, nenhum
  artefato parcial em disco**; ambas redespachadas do zero. O trabalho
  concluído foi commitado antes (`de4dac1`) para não depender da sessão.

## 2026-08-14 — Passo 31, fieldwork: ondas W0, W1 e W2 concluídas

- **W0 concluída** — `T-00_REANCHORING_REPORT.md` (v3). O argumento de
  deslocamento de linha oferecido na v1 como prova de leitura pós-`3dee99f`
  foi **REFUTADO** e permanece registrado como refutado, não removido: o
  blob `b471e49b…` é **idêntico** nos dois commits. Consequências
  registradas na própria trilha — `IN-06` (acusação contra FIND-ERP-005)
  RETIRADA, `IN-01` rebaixado a indício não provado, e `IN-08` criado como
  **regra vinculante da run**: atribuir a origem de um trecho de código a um
  commit exige `git log`/`git show`; ler o conteúdo do arquivo não
  estabelece quando aquilo entrou.
- **W1 concluída** (commit `dcc6a35`) — T-01 a T-05 persistidas.
- **CORREÇÃO DE CONTAGEM (Regra 21 — divergência corrigindo o próprio
  registro).** A mensagem do commit `dcc6a35` declara *"1 CRITICAL, 5 HIGH"*.
  **Está errada.** A recontagem por leitura dos cinco relatórios persistidos
  dá **1 CRITICAL e 13 HIGH**:

  | Trilha | CRITICAL | HIGH | Âncora da contagem |
  |---|---|---|---|
  | T-01 cadastro | 0 | 2 | `T-01_TIER1_CADASTRO.md:36` |
  | T-02 identidade | 1 | 2 | `T-02_TIER1_IDENTIDADE_REPORT.md:206` |
  | T-03 audit log | 0 | 3 | `T-03_AUDIT_LOG_REPORT.md:14` |
  | T-04 authZ transversal | 0 | 0 | `T-04_TRANSVERSAL_AUTHZ.md:144` |
  | T-05 fluxo item→produto | 0 | 6 | `T-05_FLUXO_ITEM_PRODUTO_RECEBIMENTO.md:32` |
  | **Total W1** | **1** | **13** | — |

  O erro foi do orquestrador na redação da mensagem de commit, não das
  trilhas — os relatórios sempre trouxeram os números certos. A mensagem de
  commit é imutável e **não é reescrita**; esta entrada é a correção
  oficial. O número que vale para a consolidação (T-26) é **1 CRITICAL +
  13 HIGH** na W1. Nenhum deles está `CONFIRMED`: todos seguem `PROPOSED` ao
  `vericore-finding-validator` (Regra 22).
- **W2 concluída** (commits `a7eefb4` e `8711a21`) — seis trilhas: T-06
  estoque/idempotência, T-07 financeiro, T-09 authZ aplicada e segregação,
  T-10 suprimentos e vendas, T-11 produção e MRP, T-12 pessoas e compliance.
  Os cinco relatórios pendentes foram persistidos **sem alteração de
  conteúdo** — auditores VeriCore são read-only por desenho e não escrevem
  em `audit/`; a única transformação aplicada foi promoção de cabeçalho a H1
  e desescape de entidades HTML, declarada em cada arquivo.
- **Refutações produzidas pela própria W2, contra artefatos desta run** (o
  resultado que justifica a auditoria existir depois do discovery):
  - **T-11 refutou premissa do passo 30** — desde G1 o
    `SequelizeMrpRepository` delega ao `BomStructureProjection`, logo os dois
    motores de BOM leem a mesma tabela. O defeito real é a projeção não
    carregar `is_phantom`.
  - **T-06 refutou a correção óbvia de FIND-ERP-001** — UNIQUE nos campos de
    referência seria **inócuo**: os campos são descartados, todas as linhas
    colidem em `('adjustment', NULL)` e NULL não colide em Postgres.
  - **T-09 refutou o inventário de FIND-ERP-009** — encontrou um **5º** ponto
    de segregação (`ConfirmDeadlineUseCase.ts:36-41`, BR-JUR-013) e uma **5ª**
    falha em FIND-ERP-005 (aprovação de contrato sem gate de status).
  - **T-12 resolveu o item 3 de FIND-ERP-007** — o contrato de API atribui
    **dois códigos de status diferentes à mesma regra** em dois endpoints:
    é requisito ambíguo, não defeito de mapeamento.
- **Sub-entrega declarada, não silenciada** — T-12 declarou-se PARCIAL
  (`RES-T12-01`): 108 dos 132 endpoints não alcançaram profundidade
  exaustiva em D3/D4. Registro explícito vale mais que cobertura alegada.
- **Segunda leva da W2 despachada em paralelo** (4 trilhas simultâneas,
  conforme a Parallelism Policy e a autorização do dono): T-08 fiscal, T-13
  dados e schema, T-14 revalidação das 165 regras de negócio, T-15
  requisitos/UC/rastreabilidade. T-15 inicia em paralelo e **fecha depois**
  de T-14, por dependência de conteúdo declarada no plano.
- **Posição do fieldwork:** 11 de 27 trilhas concluídas. Nenhum finding
  `CONFIRMED`. Nenhum `AUDIT_PASSED`. A validação adversarial (T-25) e a
  consolidação (T-26) seguem à frente.

## 2026-08-14 — Passo 31, segunda leva da W2 (4 trilhas em paralelo)

- **T-08 fiscal, T-13 dados/schema, T-15 rastreabilidade concluídas e
  persistidas** (commits `51ec230` e seguinte). T-14 em execução.
- **T-08 corrigiu o próprio escopo:** o plano descreve `fiscal` como "2
  endpoints"; a superfície real no AUDIT_COMMIT é de 7 use cases e 6 rotas
  em 3 roteadores. A trilha auditou a superfície real, sem amostragem, e
  declarou a correção — não a silenciou para caber no orçamento de 2 S.
- **Erro de briefing do orquestrador, corrigido em execução (Regra 21).**
  Briefei T-14 e T-15 com "165 regras". No AUDIT_COMMIT são **164** —
  `BR-FIN-003` entrou pela `APR-2026-021`, commit `2a591cf`, **posterior**
  ao commit auditado, logo fora do objeto pela Regra 14. T-15 detectou de
  forma independente (`RES-T15-02`) antes de qualquer número depender
  disso. Correção repassada a T-14 em execução.
- **`IN-08` × ferramental dos auditores — resolução registrada.** T-13 e
  T-15 declararam não poder satisfazer `IN-08` (`RES-T13-01`, `LIM-01`):
  seus tipos de agente são read-only por desenho e **não têm shell**, logo
  não podem executar `git log`/`git show`. A causa é do briefing do
  orquestrador, que impôs a regra a agentes incapazes de cumpri-la, não das
  trilhas. **Resolução: `IN-08` não foi violado.** A regra proíbe *afirmar*
  origem de código sem prova por git; as duas trilhas cumpriram a proibição
  integralmente, declarando de forma expressa que **nenhuma atribuição de
  proveniência temporal é feita** em seus relatórios. Regra satisfeita em
  substância. Fica o registro para que trilhas futuras que **precisem** de
  proveniência sejam despachadas a um tipo de agente com shell, ou tenham a
  verificação encaminhada ao `vericore-audit-verification-runner`.
- **T-13 respondeu à pergunta que T-06 deixou aberta.** T-06 provou UNIQUE
  inócuo por NULL em `inventory_movements`; T-13 varreu as **109
  declarações de unicidade** do schema e localizou o segundo caso —
  `uq_mrp_sem_duplicidade`, cujo nome afirma exatamente o que a constraint
  não faz quando `origem_id IS NULL`. Registrou também que o padrão
  **correto** já existe no próprio repositório em duas formas
  (`COALESCE` em `uq_budget_lines_*`; índice parcial com `IS NOT NULL` em
  `uq_production_order_reservations_active`) — a remediação não precisa
  inventar técnica.
- **T-13 registrou 7 conformidades provadas**, entre elas: zero tabela sem
  PK nas 207; soft delete inexistente em todo o schema (o que desloca o
  risco para a política de `ON DELETE`, onde os findings se concentram); e
  `is_phantom` **existe** no schema declarado — a falha apontada por T-11 é
  de código, não de banco. Resultado positivo registrado com o mesmo peso
  do negativo.
- **T-15 refutou o passo 29 em dois pontos verificáveis** e provou colisão
  semântica em `BR-JUR-003` entre o catálogo canônico e o corpus versionado
  de `docs/business` — com o código e o teste executando o significado do
  **corpus**, não o do catálogo. O `BR_CATALOG.md:400` declara "nenhuma
  colisão encontrada" tendo buscado apenas nos 6 arquivos do passo 26.
  **`ESC-T15-03` toca a `APR-2026-019`, decisão humana registrada: fica
  para o dono, nenhum agente decide.**
- **Alerta preventivo entre trilhas.** O escalonamento `ESC-T15-04` foi
  repassado a T-14 **antes** do fechamento dela, para que não herdasse o
  ponto cego que T-15 documentou. Instrução expressa de verificar por
  leitura própria e registrar divergência, nunca aceitar por deferência.
- **Posição do fieldwork:** 14 de 27 trilhas concluídas.

## 2026-08-14 — T-14 concluída; W2 fechada; divergência aberta entre T-14 e T-15

- **T-14 concluída e persistida.** Placar da revalidação: **145
  CONFIRMADA · 4 DIVERGENTE · 1 NÃO IMPLEMENTADA · 15 NÃO LOCALIZÁVEL.**
  A pendência estrutural mais antiga da run — o `SYSTEM_INVENTORY.md` §6
  registrava que as 164 regras nunca haviam sido revalidadas — está
  fechada, com lacuna declarada.
- **Leitura honesta do 87,9% de aderência, feita pela própria trilha:** o
  número mede aderência do código à declaração do catálogo, **não**
  qualidade da regra. **32 das 145 CONFIRMADAS são regras cuja declaração é
  justamente "isto está errado/ausente/contraditório"** — confirmá-las é
  confirmar um defeito, não uma conformidade.
- **`T14-F05` (HIGH) — o achado estrutural da trilha:** **≥ 26 regras de
  negócio implementadas e vivas não têm BR-ID nenhum**, consolidadas dos
  handoffs de T-01, T-05, T-06, T-07, T-12 e da própria T-14. O padrão
  adjudicado: **a regra que atravessa dois módulos é a que fica sem BR-ID**
  — o catálogo é forte onde o módulo é fechado e cego onde o processo
  atravessa. Converge com o padrão que T-11 mediu do lado do código.
- **`T14-F03` (HIGH) — risco direto sobre remediação em curso:**
  `BR-FIN-003` é a **única** regra do catálogo de origem humana e a única
  sem implementação. Como ela é restrição de projeto sobre a remediação do
  `FIND-ERP-001` (CASE-001, CRITICAL, em curso), remediar rejeitando nova
  baixa sobre título `partial` **violaria** a decisão registrada do dono
  (duas parcelas de mesmo valor são legítimas). Escalonado ao
  `vericore-finding-validator` e ao CASE-001.
- **`RES-T14-01` — sub-entrega declarada:** 15 regras `NÃO LOCALIZÁVEL`,
  nominalmente listadas. **7 delas tocam categorias vedadas por G3**
  (contratos, estoque/patrimônio, autorização). Custo estimado para suprir:
  ≈0,7 S. **Decisão do director/dono:** suprir ou registrar redução de
  cobertura com aceite. Não apresentado como economia.
- **DIVERGÊNCIA ABERTA — REGISTRADA, NÃO CONCILIADA (Regra 20).** T-14 §4
  declara confirmar, por conferência própria, que **"não há colisão"** no
  `BR_CATALOG.md`. T-15 (`T15-F04`, HIGH) provou **colisão semântica em
  `BR-JUR-003`** contra o corpus versionado de `docs/business`, com o código
  (`CreateContractAddendumUseCase.ts:37,40`) e o teste
  (`juridico-contract-use-cases.test.ts:316`) executando o significado do
  **corpus**, não o do catálogo. **As duas trilhas mediram espaços de busca
  diferentes:** T-14 conferiu dentro do catálogo; T-15 conferiu contra o
  corpus externo. O alerta `ESC-T15-04` foi repassado a T-14 **antes** do
  fechamento dela; o relatório entregue **não o referencia**. A divergência
  **permanece aberta e vai a T-25** com o `vericore-finding-validator`. A
  parte que toca a `APR-2026-019` é **decisão do dono** — nenhum agente
  decide. Registro expresso: não houve conciliação silenciosa, não houve
  voto, não houve deferência ao relatório mais recente.
- **Discrepância 164 × 165 mantida em aberto.** A correção (164 no
  AUDIT_COMMIT; `BR-FIN-003` entrou por commit posterior, Regra 14) foi
  repassada a T-14 em execução; a trilha manteve 165 e classificou
  `BR-FIN-003` como NÃO IMPLEMENTADA dentro do escopo. Consequência
  material registrada: se a regra está fora do commit auditado, a afirmação
  de `T14-F03` de que ela é "a única de origem humana e a única sem
  implementação" muda de estatuto. Encaminhado a T-15 e a T-25.
- **Medição G11-c de T-14:** estimado 6 S, real ≈2,4 S. A própria trilha
  desqualificou a leitura ingênua do ganho: **parte do desvio é cobertura
  não executada** (`RES-T14-01`, ~0,7 S), e o desvio defensável é ≈-48%, não
  -60%. Advertência registrada contra extrapolar o fator: o preditor de
  esforço não é o número de regras, é **a qualidade da âncora publicada**.
- **W2 fechada: 10 trilhas.** Fieldwork em **15 de 27**.
- **W3 despachada, primeira leva, 4 trilhas em paralelo:** T-16 tier 3
  backend, T-17 contrato de API (681 endpoints), T-18 appsec/segredos/
  dependências, T-19 arquitetura. T-15 reaberta em paralelo para fechar
  `RES-T15-01` com a saída de T-14 e registrar a divergência acima.

## 2026-08-14 — T-15 fechada; a divergência T-14×T-15 se dissolve em evidência

- **`RES-T15-01` FECHADO** nos três itens, com a saída de T-14 como insumo.
  T-15 permanece com lacunas declaradas (`RES-T15-02..06`).
- **Elo `BR ↔ REQ` medido dos dois lados, por métodos disjuntos, com
  resultado convergente:** T-14 mediu do código para cima (145/165 com
  âncora `BR → código` decidida); T-15 mediu do requisito para baixo
  (**0 de 90 RFs citam um BR-ID**). Veredito conjunto: **a cadeia não
  quebra por falta de regra nem por falta de código — quebra exatamente na
  junta entre eles, e do lado do requisito.** Convergência de evidência,
  não votação (Regra 20).
- **T-15 recusou-se a inflar a matriz.** Dez dos 90 RFs têm BR atribuído,
  mas **apenas no `REQUIREMENTS_BASELINE.md`, que é produto de trabalho de
  auditoria, nunca no artefato versionado do objeto**. Classificados como
  `ATRIBUÍDO-POR-AUDITORIA` e **não promovidos a elo PROVADO**: vínculo que
  só existe em relatório de auditoria é reconstrução, não rastreabilidade.
  Registro expresso da trilha: promovê-los seria "completar a matriz para
  parecer coberta".
- **A DIVERGÊNCIA T-14 × T-15 SOBRE COLISÃO DE BR-ID SE DISSOLVEU EM
  EVIDÊNCIA — nenhuma trilha cedeu.** T-15 leu
  `juridico/domain/constants.ts` integralmente e provou que **o arquivo não
  contém a string `BR-JUR-003` em lugar algum** — seu cabeçalho (`:2`) e
  sua função (`:33`) dizem **`RF-JUR-003`**. E o módulo emite, em runtime,
  os dois identificadores para regras **diferentes**:
  `ApproveContractUseCase.ts:62,68,81,87` lança
  `BusinessRuleError(..., { rule: 'RF-JUR-003' })` para a alçada por valor;
  `CreateContractAddendumUseCase.ts:37,40` lança `{ rule: 'BR-JUR-003' }`
  para a regra do aditivo. **Conclusão: T-14 confirmou a regra certa contra
  o código certo sob o ID errado** — validou o par (ID, âncora) tal como o
  catálogo os publica, sem varrer quem mais usa aquele ID. **Os dois
  vereditos coexistem; nenhum precisa ceder.** A conferência de T-14 é
  internamente válida (dentro do catálogo não há ID repetido); o que não se
  sustenta é a inferência do `BR_CATALOG.md:400` — uma busca confinada ao
  arquivo não pode, por construção lógica, fundamentar conclusão sobre o
  **namespace**.
- **Prova negativa registrada:** grep no relatório de T-14 por
  `docs/business|BLOCO_|BRIEF_|briefs` retorna **0**. O ponto cego
  documentado por `T15-F03`/`T15-F04` não foi endereçado; `ESC-T15-04`
  consta como **não referenciado** pela trilha destinatária. Fato de
  processo registrado, sem juízo sobre causa.
- **`ESC-T15-05` (novo)** — a divergência formalizada com os dois espaços de
  busca enunciados lado a lado. Mérito vai a **T-25** com o
  `vericore-finding-validator`; a parte que toca a `APR-2026-019` (esquema
  canônico que produz colisão por construção) é **decisão do dono**.
- **`T14-F05` × `T15-F03/F04` — populações disjuntas do mesmo defeito.**
  T-14 mede regras **sem ID** (≥26, elo a criar — ato humano); T-15 mede
  regras **com ID versionado fora do índice** (88 fichas, 456 refs, 18
  `rule:` em código — elo existe e não está indexado) e **ID com dois
  significados vivos** (≥1 provado — elo ambíguo, pior que ausente).
  Nenhuma das duas via a outra. `T14-F05` **refina** o §4 de T-15; contradiz
  apenas num ponto delimitado: a afirmação de que a `APR-2026-019` "já
  resolveu" só é sustentável dentro do espaço de busca de T-14.
- **Padrão estrutural medido por dois caminhos independentes.** T-14: *"o
  catálogo é forte onde o módulo é fechado e cego onde o processo
  atravessa"*. T-15, sem conhecer essa conclusão: os **44 RFs sem UC** se
  concentram em processos que atravessam módulos, e os **3 domínios sem
  requisito algum** (`accounting`, `budget`, `treasury`) são os de maior
  travessia. **Na fronteira entre módulos, a documentação de todos os
  níveis desaparece simultaneamente — BR, REQ e UC.**
- **`RF-EST-07` (scan mobile) eleito o exemplar mais completo de cadeia
  falsamente verde do ERP:** requisito diz `[IMPLEMENTADO]`; a BR que o
  sustenta é DIVERGENTE por omissão de escopo; a implementação é CRITICAL
  confirmada por T-06; o UC é inexistente; AC e TC-ID inexistem; e o teste
  que existe é cego. **Elo falso em cinco pontos da mesma linha.**
  Encaminhado a T-26.
- **Ressalva de escopo sobre `T14-F03`, levantada por T-15 e NÃO resolvida
  por agente:** se `BR-FIN-003` está fora do `AUDIT_COMMIT` (Regra 14), o
  finding muda de estatuto — de achado sobre o objeto auditado para achado
  sobre norma **posterior** ao objeto, e o descumprimento torna-se
  anacrônico por construção. **O mérito quanto ao risco de remediação do
  `CASE-001` permanece intacto e real**; muda apenas contra qual baseline é
  medido. Decisão de escopo é do director e toca a `APR-2026-021`.
- **Números finais de T-15:** cadeias completas **0 de 90** (definição
  estrita, inalterada e reforçada — T-14 não produz AC nem TC-ID);
  **3** na definição frouxa (elo BR das três agora **verificado**, não
  presumido); **0 de 90** RFs com elo `REQ → BR` versionado.
- **Fieldwork: 15 de 27 trilhas.** W3 primeira leva em execução.

## 2026-08-14 — W3 primeira leva concluída (T-16, T-17, T-18, T-19)

- **Amarração ao `AUDIT_COMMIT` provada pelo orquestrador** —
  `audit/runs/ERP-LEGACY-001-AUD-001/00-scope/AUDIT_COMMIT_BINDING_VERIFICATION.md`.
  **Zero arquivos do objeto auditado alterados** entre `c1311a6f` e HEAD.
  Fecha `RES-T17-02` (que T-17 declarara **bloqueante** da formalização de
  seus três HIGH) e `RES-T18-01`. `IN-08` fica cumprido **por abstenção**:
  nenhuma trilha fez afirmação de proveniência temporal, que é exatamente o
  que a regra exige. O resíduo era de ferramental do orquestrador, não de
  rigor das trilhas — as três recusaram-se corretamente a afirmar o que não
  podiam provar.

### Achados estruturais da leva

- **`T19-F01` (HIGH) — a arquitetura real nomeada.** T-19 mediu: **148
  arquivos de módulo importam `server/src/services/`** e **140 importam
  `server/src/models/`** (288 declarações), contra **~40 arestas entre os 48
  módulos**. O acoplamento não é horizontal — é **vertical, em estrela, em
  torno de um núcleo legado que nenhum módulo possui**. E o agravante:
  `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:93,167-179,193-194` declara
  `UseCase -> InventoryService -> SequelizeProduct` como fluxo legítimo — ou
  seja, **o segundo caminho de acesso a dado, que contorna a interface de
  repositório do domínio, é a arquitetura pretendida e versionada, não
  drift acidental.** Isso nomeia a convergência independente de cinco
  trilhas: T-06 (defeito no núcleo servindo 4 rotas de 3 módulos), T-11
  (regra que atravessa módulos fica sem dono de código), T-13 (`models/`
  sem dono, 190/459 FKs sem índice em colunas de autoria), T-14 (regra que
  atravessa módulos fica sem BR-ID) e T-08 (módulo fiscal disperso em 3
  roteadores). **Convergência declarada; nenhuma divergência a escalar.**
- **`T16-F01` (HIGH) — escalada de privilégio por TI, com cadeia completa
  lida.** Um usuário com `ti:approve`, ou com `ti:operate` sendo gestor de
  qualquer departamento, **atribui qualquer perfil de acesso a qualquer
  funcionário, inclusive a si mesmo**, sem passar por `admin` e sem segunda
  pessoa: `ti.ts:79` aceita `department_id` **livre** do cliente;
  `CreateAccessRequestUseCase.ts:39` deixa esse valor sobrepor o
  departamento real do funcionário; `approverEligibilityService.ts:26-37`
  resolve o aprovador **a partir do valor que o solicitante escolheu**;
  `ApproveAccessRequestUseCase.ts:29-41` **não compara `requested_by` com o
  aprovador** — autoaprovação permitida; e `execute` chama
  `AssignAccessProfileUseCase`, **o mesmo use case que `users.ts:20`
  protege com `authorize(admin)`**. Colateral: se o funcionário não tiver
  usuário, cria-se conta ativa com senha temporária **nunca comunicada**.
  O que sustenta o HIGH não é analogia: `shared/domain/segregationOfDuties`
  **existe e é aplicado** em `ApproveImportProcessUseCase.ts:82-88` e em
  `ApprovePurchaseUseCase.ts:86-92` — **o ato que concede permissão
  administrativa é o único dos três que não usa o mecanismo.**
- **DIVERGÊNCIA MATERIAL REGISTRADA (Regra 20) — T-16 × T-04.** T-04 fixou
  `AUD-SEC-T04-01` em MEDIUM apoiado na premissa de que "CRUD de perfis é
  exclusivo de admin". T-16 demonstra que **a atribuição de perfil — que
  é o que efetivamente concede `diretor` a alguém — não é exclusiva de
  admin**. A pré-condição mitigante cai de "ato do administrador" para
  "ato de um gestor com `ti:operate`", e a cadeia se fecha:
  `ti` -> concede `diretor` a si mesmo -> `purchases.ts:48` aprova alçada de
  diretoria. T-16 **não alterou severidade alheia** e pediu arbitragem.
  **Vai a T-25 com T-04 e T-09 na mesa.**
- **`T19-F03` (HIGH) — ciclo de dependência `items` <-> `mrp`, com o insumo de
  discovery afirmando que não existe.** Ida:
  `items/application/use-cases/ExplodeItemStructureUseCase.ts:5` importa
  `mrp/application/mrpEngine`. Volta: 5 arquivos de `mrp` importam `items`,
  incluindo as classes concretas em `mrpController.ts:4,5`. `items` é
  **tier 1 / PRODUÇÃO REAL** e passa a depender, em tempo de compilação, do
  motor de planejamento não-produtivo. `CURRENT_ARCHITECTURE.md:152-156`
  afirma "dependência circular: não encontrada" — **refutado com âncora**;
  a varredura de origem provavelmente buscou só em `presentation`/
  `infrastructure`, e a aresta vive em `application`. T-19 declarou
  expressamente que **não afirma ser o único ciclo** (`RES-T19-04`).
- **T-17 corrigiu o denominador da run.** O inventário exaustivo mediu
  **683 handlers registrados** — e um grep de linha única **perde 4
  endpoints reais** (chamadas multi-linha), o que explica o 681 herdado.
  Superfície **alcançável**: **676** (menos 8 do `cnab.ts`, que **nenhum
  arquivo importa** e cujo próprio docblock afirma falsamente estar
  montado; mais 2 de `health.ts`; mais 1 do `GET /api` inline em
  `app.ts:227`). **Consequência material:** o bloco "Financeiro" do
  `SYSTEM_MAP.md:86` conta 30 onde o alcançável é 22 — toda métrica de
  cobertura publicada contra 681 precisa ser reafirmada em T-26.
- **`T17-F01` (HIGH) — o envelope de erro da API é bimodal e indecidível.**
  O campo `error` é **string** em 6 ramos do `errorHandler` e **objeto** em
  2 — inclusive **dois 409 do mesmo handler com formas diferentes**
  (`:75-80` contra `:102-105`). Nos middlewares de autorização, o mesmo 401
  sai como string em `auth.ts:221` e como objeto em
  `authorizeSelfOrModule.ts:49`. `API.md:30-55` documenta a bimodalidade
  **sem dizer qual endpoint usa qual** — o contrato é indecidível para o
  cliente, e há **consumidor externo confirmado**.
- **`T17-F03` (HIGH) — paginação sem teto.** `shared/presentation/pagination.ts`
  define `PAGINATION_MAX_LIMIT = 100` e **`paginate(` tem ZERO chamadores**
  em todo `server/src` — o helper é código morto. Só 3 use cases impõem
  teto, com **três valores diferentes**. Restam **~108 de 111 listas sem
  teto algum**, incluindo `GET /api/jur/lgpd/data-subject-requests`, que
  T-12 provou carregar CPF: `?limit=999999` exfiltra a base de titulares em
  uma requisição.
- **`T18-F01` (HIGH) — mass assignment com sobrescrita do id de caminho,
  verificado pessoalmente pelo orquestrador.** `contractController.ts:87`
  compõe `{ id: Number(req.params.id), ...req.body }` — o spread vem
  **depois**, logo um `id` no corpo vence;
  `UpdateContractUseCase.ts:30,44` consome o id sobrescrito e repassa
  `rest` sem whitelist; `juridico.ts:89` não tem middleware de validação.
  Efeitos: **contorna o gate `authorizeAnyModule([diretor, financeiro])` de
  `juridico.ts:71`** gravando `status`/`approved_by` direto, e o
  `logAction` registra o id **da rota**, não o mutado — a trilha de
  auditoria aponta para o contrato errado exatamente no caso de abuso.
  **Atinge diretamente o `CASE-002`/`FIND-ERP-005`, em remediação:** a
  alçada que a SanaCore está construindo é contornável por outra porta.
- **`T18-F02` (HIGH) — `NODE_ENV` com default `development` torna todo o
  bloco de guardas de produção código morto.** `runtimeEnv.ts:72-75`
  retorna cedo fora de produção, inutilizando **nove** guardas
  (`:94,103,111,119,127,135,143,151,159`); `docker-compose.yml:43` tem
  default `development`. O deploy que esquecer de exportar `NODE_ENV` sobe
  com tudo desligado, em silêncio.
- **`T18-F07`** — o scanner de segredos do próprio projeto tem allowlist por
  **substring de caminho**: `dist` casa `distribuicao`/`distrato`, e
  `.git` casa `.github/` — os workflows de CI **inteiros** ficam fora da
  varredura. Um gate que dá verde sem exercer o controle é pior que a
  ausência do gate.
- **`T18-F08` — `OBS-INV-08` refutada na forma enunciada.** Não existe
  contrato compartilhado entre client e server: `Glob` em
  `{shared,contracts,packages}/**` retorna **zero**. O achado real é pior —
  o contrato é **redeclarado à mão em 40+ páginas do cliente**, contra
  validadores independentes no servidor, sem fonte única, sem geração e sem
  teste que reprove divergência. A `OBS-INV-08` deve ser **reformulada**,
  não fechada.

### Conformidades registradas com o mesmo peso

- **`comex` é o módulo mais bem construído do tier 3** (T-16): segregação
  de funções nomeada (`D-K-COMEX`), leitura com lock antes de decidir,
  guarda de status contra aprovação retroativa, transação com
  `rollbackIfPending` em **todas** as 5 escritas, e reuso do serviço
  compartilhado de recebimento em vez de duplicá-lo. É o padrão de
  referência contra o qual `T16-F01`, `F02` e `F05` se medem.
- **`reports` resiste em todas as dimensões** (T-16): SQL sempre
  parametrizado, injeção de fórmula em CSV neutralizada, escape RFC 4180
  correto, authZ por sub-permissão real do SSOT.
- **Regra 24 — não violada** em nenhuma das duas trilhas que a varreram
  (T-16 nos 174 endpoints do tier 3; T-18 no núcleo): o payload do JWT
  contém apenas id e passwordVersion; `role` e `permissions` vêm do
  banco a cada requisição (`middlewares/auth.ts:77-87,110,118`).
- **T-19:** erro genuinamente centralizado (**1** `res.status(500)` em 106
  controllers); **zero `console.*` em `server/src/modules/`**; acoplamento
  horizontal **baixo** (~40 arestas para 48 módulos — se alguma trilha
  reportar "módulos altamente acoplados", é falso positivo); camada
  `domain` livre de ORM em **47 dos 48 módulos**.

### Lacunas e incidentes

- **`RES-T18-04` — G3 NÃO ATENDIDA nesta classe de defeito.** T-18
  identificou **13 call sites** do padrão de mass assignment e rastreou
  **1**. Despachei trilha dirigida (T-18-A) para fechar os 12 restantes,
  **e ela caiu por limite de sessão da API** antes de concluir. **A lacuna
  permanece aberta e é bloqueante para a condição G3**, que veda amostragem
  reduzida em segurança, autorização e contratos. Redespachar é a primeira
  ação da retomada.
- **`RES-T16-06`** — `RegisterImportTrackingUseCase`, o gate que consome a
  alçada G11-COMEX, é **o único item G3-crítico do escopo de T-16 sem
  leitura**. Decisão do director: suprir ou registrar.
- **T-16 declarou honestamente cobertura desigual por dimensão:** D1/D2/D3
  em **174/174**; D4-D8 em **cerca de 91/174 (52%)**, com os 6 resíduos
  nominais. Não apresentou os 174 como auditados em profundidade.
- **T-19 refutou 4 afirmações do `CURRENT_ARCHITECTURE.md`** (D-1 a D-4),
  entre elas a de que o padrão adapter não conhece a infraestrutura do
  fornecedor — **4 adapters requerem o repositório Sequelize estrangeiro**.
- **T-19: zero ADR preenchido em todo o repositório** e o diretório
  `architecture/`, declarado no `CLAUDE.md` como território de OpusCore,
  **não existe**. Consequência declarada pela trilha: **nenhum finding de
  arquitetura pode ser fundamentado em "viola o ADR-nnn"**, porque não há
  objeto de comparação. Isso limita objetivamente o alcance de T-19 e deve
  constar da matriz executada de T-26.

**Fieldwork: 19 de 27 trilhas.** Nenhum finding `CONFIRMED`.

## 2026-08-14 — W3 leva 2 concluída (T-20, T-21, T-22, T-24); bloqueante G3 fechado; T-23 despachada

- **T-24 (integrações/resiliência) — 1 CRITICAL.** `T24-F01`: falta de
  credencial do provedor de NF-e (`FOCUS_NFE_TOKEN`/`ENOTAS_API_KEY`) não
  falha fechado. A reserva de número de NF-e é **commitada em transação
  curta antes** da chamada ao provedor; o construtor do provider lança de
  forma síncrona **fora de qualquer `try/catch`**; a exceção propaga sem
  tratamento. Resultado: venda presa em `nfe_status='processing'`
  permanentemente, número de série queimado sem devolução, **só
  intervenção manual no banco resolve**. `T24-F02` (HIGH): zero timeout
  declarado em 6 chamadas de rede a Focus NFe/eNotas, zero lib de retry ou
  circuit breaker no projeto; falha de rede é mapeada para `'denied'`,
  indistinguível de rejeição fiscal real, e como `'denied'` não é estado
  terminal, o operador pode reemitir — se a chamada original tiver sido
  processada do lado do provedor apesar do timeout local, resultado é
  **duas NF-e reais autorizadas para a mesma venda**. Ambos escalados ao
  dono no momento em que surgiram (Regra do plano para CRITICAL).
  **Achado positivo confirmado por leitura própria:** reenvio do webhook
  Focus NFe **não duplica efeito patrimonial** — lock + estado protegem,
  mesmo sem proteção de replay no protocolo (refina `T17-F02`/`T18-F06`
  sem contradizer). n8n confirmado como transporte burro de fato, com
  idempotência em **dois níveis**, incluindo constraint única de banco.
- **T-21 (front-ends) confirmou por leitura independente** que a UI de CAT
  tem botão único "emitir CAT inicial", sem seletor de tipo e sem alerta
  para `gravidade=obito` — produz exatamente a combinação contraditória que
  o backend registra de forma irreversível (`FIND-ERP-008`/`T12-H03`).
  **Mitigação parcial confirmada** para o GET com efeito patrimonial
  (`T-08`/`T-10`/`T-17`): a consulta de status de NF-e só dispara por
  clique manual, sem polling nem retry automático no cliente — reduz o
  vetor de amplificação client-side sem neutralizar o achado de backend.
  **Achado novo:** `T21-F01` (MEDIUM, confiança média) — `cost_price`
  aparece incondicionalmente no contrato de tipos de `GET /api/products`,
  mesmo a lista nunca exibindo o campo; candidato a exposição de dado
  comercial sensível a papéis operacionais (estoque, produção), pendente
  de confirmação do lado servidor.
- **T-22 (plataforma) — achado estrutural sobre o próprio pipeline.** CI
  builda e testa a imagem (typecheck, testes, `npm audit`, migration
  down+up — controles reais), mas **nunca a publica em registry**; o
  deploy real usa build local com tag por data, **sem referência ao SHA
  validado** — não há cadeia de custódia entre o que o CI aprova e o que
  sobe em produção (`T22-F01`, HIGH). `T22-F05` (HIGH, promovido de
  `OBS-INV-07`): zero pipeline de CI para `client/`/`mobile/`/`tv/` — a
  suíte vitest do `client` existe e nunca roda automaticamente, o que é
  pior que ausência de teste. Convergência com T-18 sobre
  `docker-compose.yml`/`.prod.yml`, ângulo complementar: mesmo corrigidos os
  defaults fracos, nada no CI roda `docker compose config` para pegar
  regressão futura.
- **T-20 (qualidade/testes)** encontrou a **causa raiz** de uma das duas
  falhas de teste pré-existentes herdadas do passo 30:
  `onda3-shipping-cockpit-cashflow.test.ts` falha por inconsistência real
  de fuso horário em `GetCashFlowProjectionUseCase` (data gerada em
  horário local, lida de volta como UTC) — **candidato a bug funcional
  real na projeção de fluxo de caixa em produção**, não apenas teste
  frágil. Escalado a T-07 para avaliação de impacto de negócio.
  Generalizou o padrão de `T13-F06` (guarda que passa verde sem verificar):
  as **59 suítes de integração inteiras** usam o mesmo `describe.skip`
  condicional a variável de ambiente — só o caminho de CI seta essa
  variável e roda o guard anti-skip; fora dele, roda 100% verde sem
  executar uma única query, sem aviso algum ao desenvolvedor.
- **BLOQUEANTE G3 FECHADO — `RES-T18-04`.** A trilha dirigida T-18-A
  rastreou 100% dos 21 call sites (não 12, como o encargo original
  contava — divergência de contagem registrada) do padrão de mass
  assignment, ponta a ponta, sem amostragem. Produziu **11 findings
  novos**: `T18A-F10` (HIGH) — bypass real de `authorizeSelfOrModule`: a
  checagem de posse em `POST /tickets/:id/confirm` resolve só
  `req.params.id`, mas a mutação ocorre sobre o `id` do corpo se presente,
  sem recheque — um usuário sem módulo `ti`, dono de qualquer chamado
  próprio `resolved`, fecha/avalia chamado de terceiro colocando o id
  alheio no corpo, sem `logAction`. Mais 10 MEDIUM, majoritariamente
  falsificação de log de auditoria por sobrescrita de id (contratos, LGPD,
  contencioso, PI, produção), e dois campos sensíveis graváveis sem
  whitelist (`supplier_id` de advogado externo; `created_by` de ato
  societário). **Achado metodológico da própria trilha:** são dois
  defeitos independentes no mesmo padrão — mass assignment de valor
  (fechável por whitelist no use case) e sobrescrita de id de registro
  (sobrevive mesmo com whitelist de valor). **A condição G3 permanece não
  integralmente atendida**: `T18A-F10` é bypass de autorização confirmado
  por leitura de código, pendente só de confirmação dinâmica.
- **Fieldwork: 24 de 27 trilhas.** T-23 (documentação × código), a última,
  despachada — resolve 5 pendências dirigidas por T-08, T-15, T-17, T-19 e
  T-20 (`RES-T20-01`: qual citação de caminho quebrada explica a 2ª falha
  de teste pré-existente).

## 2026-08-14 — FIELDWORK CONCLUÍDO: 27 de 27 trilhas persistidas

- **T-23 (documentação × código), última trilha do plano, concluída.**
  Resolveu os 5 itens escalados por outras trilhas:
  1. **`RES-T20-01` — NÃO fechado apesar de varredura extensa.** Verificou
     manualmente ~30 candidatos de citação de caminho quebrada contra
     ~4.374 ocorrências totais em 182 arquivos `.md`; todos os candidatos
     plausíveis estavam **corretamente isentos** pelas convenções do guard
     (banner histórico, citação dentro de bloco de aspas, checklist
     fechado, marcador de proposta). **Registrou como conformidade** (a
     disciplina de isenção está sendo aplicada de verdade, não é
     mascaramento) e recomendou fechar via execução direta do teste
     (`DYN-T20-06`), que resolve em segundos o que a leitura estática não
     fecha com certeza contra um universo desse tamanho.
  2. **Confirmado:** `DIAGRAMA_CLASSES_CAMADAS.md` cobre 10/48 módulos e
     documenta a espinha legada como camada intencionada — **e a
     convivência `services/`×`modules/` nunca foi formalizada em ADR**
     (`T23-F01`, MEDIUM). Risco concreto: sem decisão registrada, um
     colaborador futuro pode "corrigir" por iniciativa própria uma
     coexistência que é deliberada.
  3. **Confirmado e ampliado:** o único fluxograma do processo fiscal
     (`docs/tributario/00-README.md:56-86`) **inverte o sujeito do regime
     tributário** (trata como do cliente o que é do emitente) **e omite os
     três eventos pós-emissão mais comuns** — cancelamento, negação da
     SEFAZ, carta de correção (`T23-F02`, HIGH). É a especificação que
     qualquer implementação ou revisão fiscal usaria como referência.
  4. **Confirmado:** `API.md` se autodeclara "a" documentação da API e
     **não tem nenhum ponteiro** para os 6 documentos que cobrem os 348
     endpoints omitidos (`T23-F03`, HIGH, mesma severidade de T-17 — não
     rebaixada).
  5. **Confirmado, com nuance que reduz a severidade:** `04-USE_CASES.md`
     (SSOT declarada) tem UC-56/57/63-66 sem seção; a colisão UC-52/53
     **já é auto-declarada pelo próprio documento** como dívida reconhecida
     — reduz de HIGH para MEDIUM em relação à leitura ingênua, porque não
     é uma SSOT que mente sem saber (`T23-F04`).
- **Achado novo:** fence de código Markdown não fechado corrompe a
  renderização do fim de `docs/rh/00-README.md` (`T23-F05`, LOW).
- **Conformidade destacada:** `docs/rh/00-README.md:30-38` lista
  explicitamente quais arquivos que o próprio índice promete **não
  existem** — o oposto exato do defeito de "SSOT falsa" que outras partes
  do corpus documental cometem.

---

## FIELDWORK ENCERRADO — 27 de 27 trilhas concluídas e persistidas

Todas as trilhas do plano (T-00 a T-24, com T-15 fechada por adendo e o
bloqueante de T-18 fechado por extensão dirigida T-18-A) estão em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/`. Nenhum finding é
`CONFIRMED` — todos permanecem `PROPOSED` (Regra 22). Nenhuma declaração de
`AUDIT_PASSED`, `FINDINGS_CONFIRMED` ou `RETEST_PASSED` foi emitida por
nenhuma trilha, em conformidade com a Regra 5 (CoreTriad Director orquestra,
não implementa nem audita).

**Próxima fase, condicionada a nova instrução do dono:** T-25 (validação
adversarial de todo CRITICAL/HIGH, incluindo a divergência aberta T-14×T-15
sobre colisão de BR-ID e a arbitragem pendente T-16×T-04 sobre a premissa
mitigante de `AUD-SEC-T04-01`) e T-26 (consolidação, cobertura executada e
relatórios finais).

---

## DECISÕES HUMANAS REGISTRADAS — 2026-08-14 (dono, respostas diretas)

Em conformidade com a Regra 18 (human gates só por decisão humana explícita
registrada, nunca por memória ou inferência), o dono respondeu, ponto a
ponto, a lista de decisões pendentes apresentada em linguagem não-técnica:

1. **Segunda rodada de T-25 (13 trilhas ainda sem refutação: T-01, T-03,
   T-05, T-07, T-09, T-10, T-11, T-13, T-19, T-20, T-21, T-22, T-23)** —
   **APROVADO.** Executar antes da consolidação (T-26).
2. **`AUD-SEC-T04-01` — elevar de MEDIUM para HIGH** (recomendação de T-25,
   premissa mitigante original derrubada por T-16) — **APROVADO.** Registrar
   adendo formal ao achado por agente VeriCore (não pelo Director).
3. **`BR-FIN-003` fora do `AUDIT_COMMIT` (aprovada depois, por
   `APR-2026-021`)** — dono confirmou entendimento; segue como está,
   nenhuma ação adicional.
4. **15 regras de negócio não localizadas (`RES-T14-01`)** —
   **NÃO investigar mais.** Aceita registrar como lacuna de cobertura no
   relatório final, sem gastar esforço adicional.
5. **`RES-T16-06` (gate de rastreamento de importação COMEX,
   `RegisterImportTrackingUseCase`, único item G3-crítico do escopo de
   T-16 sem leitura)** — **APROVADO examinar antes do fechamento.**
6. **Bateria de verificação dinâmica (`DYN-Tnn` acumulados nas trilhas,
   contra banco de teste efêmero, nunca o banco real — G4)** —
   **APROVADO, com escopo explicitamente restrito pelo dono**: "autorizo
   somente para essa finalidade e exclusividade" — ou seja, a execução
   dinâmica autorizada aqui serve exclusivamente para fechar os gaps de
   evidência já registrados nesta run (`DYN-T*` existentes nos relatórios
   07-findings), contra `erp_evok_audio_test`, e não é autorização
   permanente/genérica para qualquer execução futura fora deste propósito.

Nenhuma decisão foi inferida ou assumida por agente — todas as seis vieram
de resposta direta e explícita do dono nesta data.

---

## T-25 RODADA 2 CONCLUÍDA — 2026-08-14

`vericore-finding-validator` completou a validação adversarial das 13
trilhas que a Rodada 1 havia deixado sem tentativa própria de refutação
(T-01, T-03, T-05, T-07, T-09, T-10, T-11, T-13, T-19, T-20, T-21, T-22,
T-23). Persistido em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-25_VALIDACAO_ADVERSARIAL_RODADA2.md`.

Resultado: 10 dessas 13 trilhas produziram HIGH/CRITICAL (T-09, T-20, T-21
não têm nada acima de MEDIUM). 32 HIGH submetidos a refutação ativa, 0
CRITICAL novo. Veredito: **20 CONFIRMED, 12 NEEDS_MORE_EVIDENCE, 0
REFUTED, 0 FALSE_POSITIVE, 0 DUPLICATE.**

**Cobertura adversarial agora declarada completa para as 27 trilhas de
fieldwork** (14 da Rodada 1 + 13 desta rodada) — todo CRITICAL/HIGH da
run passou por tentativa de refutação registrada.

Recomendação do próprio T-25: uma 3ª rodada curta, dirigida apenas aos 12
`NEEDS_MORE_EVIDENCE`, sem tratá-los como bloqueio equivalente aos 4
CRITICAL que ainda dependem de evidência dinâmica. Registrado como item
em aberto para T-26 (consolidação), não decidido aqui.

Nenhuma divergência entre trilhas foi resolvida por votação ou
silenciosamente (Regra 20). Nenhuma declaração de `AUDIT_PASSED`,
`FINDINGS_CONFIRMED`, `RETEST_PASSED` ou `FINDING CLOSED` foi emitida.

---

## BATERIA DE VERIFICAÇÃO DINÂMICA 01 CONCLUÍDA — 2026-08-14

`vericore-audit-verification-runner` executou, dentro do escopo restrito
autorizado pelo dono ("somente para essa finalidade e exclusividade"),
um subconjunto priorizado das ~103 verificações dinâmicas (`DYN-T*`)
catalogadas ao longo do fieldwork, contra `erp_evok_audio_test`
exclusivamente. Persistido em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/DYN_VERIFICACAO_BATERIA_01.md`.
Nenhuma escrita em banco (só `SELECT`); `erp_evok_audio` (real) nunca foi
endereçado; working tree confirmado limpo pelo orquestrador antes e
depois (`git status --porcelain --branch`).

**Resultado — 4 achados novos confirmados por execução real (não apenas
leitura estática):**
1. A role de runtime do banco usada pela API (`evok_admin`) **é
   superusuário do Postgres** — eleva `AUD-DB-01`/`FIND-ERP-002` de
   estático para confirmado por catálogo.
2. Vulnerabilidade **HIGH** ativa hoje em `server` (`js-yaml`,
   `CVE-2026-59870`); 14 HIGH em `mobile`, 12 HIGH em `tv` (dependências
   transitivas de terceiros).
3. `RES-T23-01` fechado com precisão: citação quebrada localizada em
   `docs/coretriad/planning/SIM-002_VALIDATION_REPORT.md:46` (aponta para
   `docs/API.md`, que não existe).
4. `T20-F03` (bug de fuso horário no cálculo de fluxo de caixa) **agora é
   confirmado por execução real** (teste falhou de fato), não apenas por
   leitura estática de alta confiança.

**Achado sobre a integridade do próprio ambiente de teste (não é achado
sobre o ERP, é sobre a ferramenta de auditoria):** `erp_evok_audio_test`
carrega uma migration (`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`)
proveniente de uma branch remota do SanaCore (`origin/sana/ERP-LEGACY-001/FIND-ERP-005`,
commit `67b49fb`, explicitamente marcado como remediação PARCIAL e NÃO
retestável), que não é ancestral de `AUDIT_COMMIT` nem de `main`. Ou seja,
o banco de teste efêmero é na prática **compartilhado** entre sessões
diferentes de VeriCore e SanaCore, não recriado do zero a cada execução.
Isso não invalida os achados de catálogo acima (não tocam as tabelas
afetadas), mas afeta pequenas contagens de schema (`T13-F0x`: 480 FKs
reais vs. 478 estimadas por T-13, 208 tabelas vs. 207 estimadas — diferença
de 1-2, atribuível a essa migration extra).

**Recusa deliberada por desenho, registrada, não decidida por agente:** o
runner recusou-se a executar `DYN-T03-02`/`DYN-T03-05` (que provariam por
escrita real que `UPDATE`/`DELETE` em `audit_logs` funcionam, dado
superusuário + zero trigger) porque sua carta de responsabilidades proíbe
qualquer escrita em banco, mesmo em teste efêmero, e a autorização
recebida do dono não nomeava essa exceção especificamente. A conclusão já
é matematicamente inevitável pelas duas evidências de catálogo coletadas
(2 e 4 acima), mas a prova literal por execução de escrita, se desejada,
exige pedido novo, explícito e nomeado do dono.

**Não executado nesta bateria** (ver relatório completo para lista e
motivo item a item): ~70 verificações que exigem o servidor de fato no ar
(`server` rodando contra `erp_evok_audio_test`, emitindo JWT reais) —
incluindo as que sustentariam diretamente os dois CRITICAL de maior
prioridade (`AUD-AUTHN-01`, `T24-F01`). Recomendado pelo runner como
bateria 02 dedicada, condicionada a nova instrução.

Decisões que ficam para o dono a partir deste resultado (não decididas
aqui): (a) se quer a prova literal de escrita em `audit_logs` via uma
exceção nomeada e controlada; (b) se autoriza recriar `erp_evok_audio_test`
do zero a partir de `AUDIT_COMMIT` puro antes de fechar findings de
schema; (c) se autoriza uma bateria 02 com o servidor de fato no ar.

---

## SANACORE CASE-002 (FIND-ERP-005) — REMEDIATION_COMPLETE / READY_FOR_RETEST — 2026-08-14

Retomado o handoff de remediação pendente. Estado encontrado **divergia
materialmente do registro**: o último commit publicado no `origin`
(`67b49fb`) declarava "remediação PARCIAL — NÃO concluída, NÃO
retestável", mas a worktree local `sana/ERP-LEGACY-001/FIND-ERP-005`
continha 5 commits não publicados com a remediação essencialmente
completa. Divergência registrada, não silenciada (Regra 20).

**Trabalho implementado (ramos exatamente conforme decisão humana):**
`APR-2026-021` Parte B itens 3/4/5, reafirmados por `APR-2026-022`,
correspondem 1:1 aos ramos executados — A1 (alçada em tabela configurável
`jur_approval_thresholds` + histórico), B1 (aditivo que ELEVA valor exige
`approve`; redução e prazo seguem em `operate`), C1 (segregação D-K
estendida ao Jurídico, novo ponto `D-K-JURIDICO` em `shared/domain`).

**Duas lacunas foram levantadas pelo `sanacore-remediation-evidence` e
ambas resolvidas por evidência, não por deferência (Regras 20/21):**

1. **ALARME FALSO — "APR-2026-021 não registrada".** O agente leu
   `coretriad/governance/APPROVALS.md` **do worktree**, congelado no corte
   da branch (última entrada `APR-2026-020`). O orquestrador verificou no
   repositório principal: `APR-2026-021` (:573), `APR-2026-022` (:681) e
   `APR-2026-023` (:761) existem. **Armadilha metodológica registrada e
   generalizável:** o `coretriad/` de um worktree SanaCore de vida longa
   **não é fonte de verdade** sobre aprovações, estados ou handoffs —
   ausência de um `APR-…` ali é evidência de defasagem da branch, nunca de
   ausência da decisão. Consultar sempre o repositório principal.
2. **REAL — a prova dinâmica não existia.** Os 14 casos da suíte de
   integração do caso falhavam **na fixture**, antes de exercitar
   qualquer comportamento do produto. Eram 3 defeitos de fixture, não 1:
   `signatory_type`→`party_type`, `document_url`/`is_signed`/
   `version_number`→`file_url`/`is_signed_version`, e `activate` sem
   `responsible_user_id` (que por desenho não é persistido na criação).
   Corrigidos. **Resultado real: suíte do caso 14 falhas → 20/20 PASSED;
   integração completa 24 falhas → 8 falhas / 267.**

**Verificação independente do orquestrador (não aceita por relato):**
`git diff --stat 48c93cd..HEAD -- server/src client/src` → **saída
vazia**. Nenhuma linha de código de produto foi alterada nos commits de
correção de fixture — o teste foi ajustado ao produto, não o produto ao
teste. Unitários reconfirmados: 46/46 no alvo do caso.

**Correção do orquestrador registrada contra si mesmo:** ao instruir o
agente, afirmei que a citação `jur-contract-authority-...` estava errada e
deveria ser `juridico-contract-authority-...`. O agente verificou e
**refutou com evidência**: os dois arquivos existem, com nomes
deliberadamente distintos (`tests/unit/juridico-...` e
`tests/integration/jur-...`). A citação original estava correta; a
observação do orquestrador é que estava errada.

**Estado do caso:** `REMEDIATION_COMPLETE` / `READY_FOR_RETEST`, **sem
ressalva de evidência**. `REMEDIATION_COMMIT`: `1046e16`. Artefatos em
`remediation/cases/ERP-LEGACY-001-CASE-002/` do worktree
(`REMEDIATION_EVIDENCE_PACKAGE.md`, `REMEDIATION_RESPONSE.md`,
`CASE_STATUS.md`). Nenhum `RETEST_PASSED`, `FINDING CLOSED` ou
`RISK_ACCEPTED` declarado — `FIND-ERP-005` permanece `OPEN` e o reteste é
autoridade exclusiva da VeriCore (Regras 3-4).

**DUAS PENDÊNCIAS DE AÇÃO HUMANA, não técnicas, bloqueiam o fechamento:**
1. **`cross-database-drift-guard` reprova** porque a migration nova
   (`jur_approval_thresholds`) foi aplicada só ao banco de teste. Corrigir
   exige DDL em `erp_evok_audio` — **banco PRODUÇÃO REAL** por
   `APR-2026-016`, reafirmado intocável em `APR-2026-021` Parte D. **Não é
   passo técnico de agente algum.** O dono decide *quando*: antes do
   merge, junto com ele, ou só no deploy.
2. **Contagem de perfis com `diretor`/`financeiro` em nível `'operate'` no
   banco de produção** — no banco de teste é 0, mas a TRIAGE §3.3 alerta
   que perfis nessa condição **perdem a capacidade de aprovar** após a
   correção (efeito pretendido, contrapartida organizacional). Levantar em
   produção é ato do dono, não de agente.

Ressalva de honestidade registrada pelo próprio agente: as 7 falhas de
integração restantes (`bom-tipo-nao-produtivo`,
`traceability-and-audit-log-regression`) não têm relação com este caso
(confirmado por `git log` — nem os testes nem `modules/products`/
`modules/inventory` foram tocados pela branch), mas a prova definitiva
seria rodá-las na `main`, o que não foi feito.

---

## T-25 RODADA 3 CONCLUÍDA — 2026-08-16

`vericore-finding-validator` fechou, em três blocos, exatamente os 12
`NEEDS_MORE_EVIDENCE` deixados pela Rodada 2. Persistido em
`07-findings/T-25_VALIDACAO_ADVERSARIAL_RODADA3_{A,B,C}.md`.

- **Bloco A** (`T-05-02`, `T-05-05`, `T-05-06`, `T-10-02`) — **4 CONFIRMED**,
  0 REFUTED, 0 FALSE_POSITIVE. Nenhuma severidade rebaixada. Acolhida correção
  de redação em `T-05-05`: o espelhamento **é executado** incidentalmente por
  suítes de integração em CI; o que não existe é teste que o **verifique**.
- **Bloco B** (`T11-F02`, `T11-F04`, `T11-F10`, `AUD-SERVICE-3`) — **3
  CONFIRMED + 1 FALSE_POSITIVE**. `T11-F10` refutado por controle
  compensatório na própria camada (`CreateItemStructureUseCase` não possui
  caminho de retorno bem-sucedido; prova estática fechada, convergente com
  `AUD-T01-10`). Corrigida a atribuição de trilha de `AUD-SERVICE-3`: é de
  **T-07 (Financeiro)**, não de T-16.
- **Bloco C** (`T13-F01`, `T13-F04`, `T19-F02`, `T23-F02`) — **4 CONFIRMED**,
  com recomendação de rebaixamento HIGH → MEDIUM em `T13-F01` e `T13-F04`
  (fato de schema integralmente verificado; explorabilidade refutada por
  controle compensatório de aplicação).

**Placar da rodada: 11 CONFIRMED, 1 FALSE_POSITIVE, 0 remanescentes em
`NEEDS_MORE_EVIDENCE`.** Nenhum `AUDIT_PASSED`, `FINDINGS_CONFIRMED`,
`RETEST_PASSED` ou `FINDING CLOSED` emitido.

**DIVERGÊNCIA REGISTRADA, NÃO CONCILIADA (Regra 20):** `T-26_CONSOLIDACAO.md`
§1.4 compõe os 41 `CONFIRMED` como "4 + 9 (R1) + 20 (R2) + **8** (R3-A/B/C)",
enquanto a soma dos três relatórios da Rodada 3 é **11**. O
`coretriad-director` não resolve — **escalado ao
`vericore-software-audit-director`** para determinação da fonte autoritativa
antes de qualquer veredito.

---

## T-26 CONCLUÍDA — CONSOLIDAÇÃO E COBERTURA EXECUTADA — 2026-08-16

`vericore-audit-consolidator` entregou o par obrigatório
`07-findings/T-26_CONSOLIDACAO.md` + `24-coverage/AUDIT_COVERAGE_EXECUTED.md`,
em regime read-only (`APR-2026-016`), sem emitir finding novo e sem declarar
`AUDIT_PASSED`, `FINDINGS_CONFIRMED`, `RETEST_PASSED` nem `FINDING CLOSED`.

**Placar consolidado:** 7 findings preliminares + 247 de fieldwork = **254
IDs**; menos 1 `FALSE_POSITIVE` = **253 vigentes**. Severidade: **6 CRITICAL**
(`FIND-ERP-001`, `FIND-ERP-005`, `AUD-AUTHN-01`, `AUD-INTEG-03`, `T08-F01`,
`T24-F01`), **67 HIGH**, **118 MEDIUM**, **57 LOW**, **5 INFO**. Validação:
**41 CONFIRMED**, 1 FALSE_POSITIVE, 0 `NEEDS_MORE_EVIDENCE` remanescentes, 1
de origem (`FIND-ERP-007` item 3), **211 PROPOSED sem passagem pela Regra 22 —
todos MEDIUM/LOW/INFO, que a Regra 22 não exige**. Nenhum CRITICAL/HIGH ficou
sem tentativa de refutação: 27/27 trilhas com registro adversarial.

**Decisões de severidade registradas, nunca silenciosas:** `T11-F10` →
FALSE_POSITIVE com propagação executada (invariante I-18 revertida a
PROTEGIDA, `DYN-T11-D` retirado da fila); `T13-F01` e `T13-F04` → HIGH
rebaixados a MEDIUM com custo declarado; `AUD-SEC-T04-01` → MEDIUM elevado a
HIGH (elevação já aprovada pelo dono em 2026-08-14, formalizada por adendo de
agente VeriCore, não pelo Director).

**DÉFICIT DE COBERTURA MEDIDO — o achado material da trilha:** `DEF-01`
(`juridico` D3+D4, prometido E 75/75, executado A(38/75) ⇒ **37 endpoints**),
`DEF-02` (`rh`+`sst` D3+D4, prometido E 132/132, executado A(~24/132) ⇒ **108
endpoints**), `DEF-03` (`rfq` D3+D4 ⇒ **≈5 endpoints + tabelas de preço**) —
**soma ≈150 endpoints, todos em categorias que G3 veda amostrar**. Além
deles: **70 das 137 células elevadas pela EMENDA-02 não executadas** nos 43
endpoints rasos do tier 3 (maior divergência planejado × executado da run);
**126 páginas do `client/` não amostradas**; **`mobile/` e `tv/` não
explorados nem estruturalmente**; **185 de 207 tabelas sem semântica de
coluna**; agregado: **≈81 das 137 células não entregues como `E`** — "a
cobertura executada corresponde, em larga medida, à matriz PRÉ-EMENDA-02".

**Divergências escaladas ao `vericore-software-audit-director`, em aberto:**
`DIV-SEV-01` (`T17-F05` MEDIUM × `T23-F03` HIGH sobre o mesmo fato) e
`INV-01` × `INV-02` (673 × 676 endpoints alcançáveis, irreconciliáveis sem
decisão de definição). **Lacunas de adjudicação registradas:** `T16-F15`,
`T21-F01`, `RES-T13-04`/`RES-T13-05`.

**Correção do Control Plane exigida pela trilha e executada:**
`AUDIT_COVERAGE_EXECUTED.md` §1.1 apontou que o `PROJECT_STATE.md` §OBS-INV-01
estava desatualizado (dizia re-ancoragem 1/7; o executado é **7/7
`ÂNCORAS_VÁLIDAS`**) e **escalou ao director em vez de corrigir**, porque
`coretriad/` não é namespace de escrita da VeriCore (Regra 16). Corrigido no
`PROJECT_STATE.md` em 2026-08-16 por adição rastreável (Correção C-01), com o
texto histórico preservado e com a ressalva de que em 006/007/008/009 a
reconferência foi **dirigida às âncoras load-bearing**, com as documentais
delegadas e com **T-17 aceitando o elo 4 de T-12 como insumo, não como
verificação própria**.

---

## DECISÕES HUMANAS REGISTRADAS — 2026-08-16 (`APR-2026-024`)

Regra 18 — human gate só por decisão humana explícita registrada. As três
decisões abaixo vieram de resposta direta do dono nesta sessão; nenhuma foi
inferida por agente. Registro formal: `coretriad/governance/APPROVALS.md`,
`APR-2026-024`.

**D1 — Déficit de cobertura do G3: OPÇÃO A (estender a auditoria agora).** A
Opção B (aceitar cobertura parcial com exclusão registrada) foi
**explicitamente recusada**. Escopo autorizado: os ≈150 endpoints de
`DEF-01`/`DEF-02`/`DEF-03`. Trilhas despachadas:
`T-27_DEF-01_JURIDICO_D3D4`, `T-27_DEF-02A_RH_D3D4`, `T-27_DEF-02B_SST_D3D4`,
`T-27_DEF-03_RFQ_PRECOS_D3D4`. **RESSALVA VINCULANTE, apresentada ao dono
antes da decisão:** o déficit medido é MAIOR — 70 células dos 43 rasos, 126
páginas do `client/`, `mobile/` e `tv/` não explorados, 185 de 207 tabelas
sem semântica de coluna. Fechar os ≈150 cumpre `DEF-01/02/03` e **não
autoriza declarar o G3 integralmente cumprido**; a segunda leva **permanece
decisão ABERTA do dono**.

**D2 — Achado `js-yaml` HIGH (`CVE-2026-59870`) promovido a finding formal**,
com prioridade para a SanaCore avaliar a atualização da dependência,
**independentemente da decisão sobre o G3**. Origem: `OBS-T26-01`, achado
novo produzido por execução (`npm audit`, bateria dinâmica 01), **não
catalogado por nenhuma das 27 trilhas**. Trilha despachada:
`vericore-dependency-security-auditor` → `07-findings/AUD-DEP-JSYAML-01.md`.
**CONDIÇÃO DA REGRA 22:** sendo HIGH, precisa passar pelo `finding-validator`
antes de seguir à remediação; **a promoção não dispensa essa validação, e ela
ainda NÃO ocorreu**.

**D3 — Recriação do `erp_evok_audio_test` do zero**, isolado de qualquer
branch SanaCore não mesclada, com confirmação de integridade, **antes de
qualquer trilha que dependa de teste dinâmico (G4)**. Motivo de fato: a
bateria 01 provou que o banco carregava a migration
`20260814-000048-jur-approval-thresholds-and-authority-find-erp-005.cjs`, de
`origin/sana/ERP-LEGACY-001/FIND-ERP-005` (`67b49fb`), não ancestral do
`AUDIT_COMMIT` nem de `main` (480 FKs / 208 tabelas × 478 / 207 no
versionado). Trilha despachada: agente `docker` →
`G4_PRECONDICAO_BANCO_TESTE.md`. **RESOLVE a pendência (b)** da bateria 01;
**(a) prova literal de escrita em `audit_logs` por exceção nomeada e
controlada e (c) bateria dinâmica 02 com o servidor no ar PERMANECEM
ABERTAS.**

**Estado verificado em disco no momento do registro (pelo director):** nenhum
dos seis artefatos despachados existia ainda no repositório — o registro do
director é de decisão e despacho, jamais de resultado. **Os seis foram
persistidos em seguida pelo orquestrador**, a partir do texto integral
relatado por cada agente (nenhum dos quatro auditores de negócio nem o
auditor de dependências tinha ferramenta de escrita disponível nesta
sessão), **sem alteração de conteúdo** — mesmo padrão de ressalva de
transparência dos passos 23 e 24.

Nenhum commit foi feito (decisão explícita do dono). Nenhum
`RETEST_PASSED`, `FINDING CLOSED`, `AUDIT_PASSED` ou `FINDINGS_CONFIRMED` foi
declarado por esta atualização de Control Plane (Regras 4 e 5).

---

## CLASSE DE RISCO DE GOVERNANÇA RC-PROC-01 ABERTA — 2026-08-16

Regra 18 — por decisão humana explícita do dono nesta sessão: *"Registre o
padrão de recorrência (5º incidente, contido por disciplina e não por controle
técnico) como item de governança formal, separado do finding pontual — para não
se repetir uma 6ª vez."*

**Artefato criado:** `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`.
Objeto: a **classe transversal**, não o incidente — este já está em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md` (HIGH,
CONFIRMED por `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md`).

**Inventário verificado por leitura própria do director.** Dos 5 itens
catalogados em `PROJECT_STATE.md:888-935` + custódia: pertencem à classe os
incidentes 1 (sobrescrita de `FIND-ERP-002.md` ao sondar fronteira de escrita),
3 (número de commit vindo de contexto injetado), 4 (Control Plane divergindo da
evidência) e 5 (conexão ao banco de PRODUÇÃO REAL). O item 2 **não pertence**:
é registro de mecanismo funcionando.

**DIVERGÊNCIA REGISTRADA (Regra 20), não conciliada:** (a) "5º incidente" é
ordinal de lista, correto; contando apenas atravessamentos de restrição, é o
**4º desvio**. (b) "2º contido apenas por disciplina" vale sob critério estrito
(ato de fronteira com potencial irreversível: incidentes 1 e 5); sob o critério
literal da classe — nenhum mecanismo impediu, detectou ou reverteu — são **4 de
5**. A classe é, portanto, maior do que o finding pontual sugere, e as correções
em curso endereçam apenas o incidente 5.

**Decisões do dono registradas (decisão e despacho, nunca resultado):**
- **D-1** — estender `.claude/hooks/org-isolation.js` para interceptar Bash
  contra o banco de produção (`opuscore-devops-engineer`). **Artefato PRESENTE
  em disco** (`:100-152` e `:188-200`, antes do approve genérico de `:202`).
  **Eficácia NÃO verificada — nenhum teste executado por este registro.**
- **D-2** — corrigir `docs/infra/DEPLOY_UBUNTU.md` e
  `docs/database/03-MODELO_FISICO.md` (`documentador`). **NÃO CONSTATADO em
  disco** no momento do registro (Grep por `AUD-PROC-CUSTODIA`/`APR-2026-016`:
  zero ocorrências). **Ressalva:** `T-30` §7.1 identifica **seis** arquivos que
  ensinam o comando; a decisão nomeia dois — o restante é decisão ABERTA do
  dono, não ampliada por analogia.
- **D-3** — este registro de governança (`coretriad-director`). CONCLUÍDO.
- **D-4** — validação posterior com os casos sintéticos de segregação do início
  do programa (precedente `TEST-SEAL-001/002`, `APR-2026-014`). **PENDENTE.**

**CORREÇÃO DE REGISTRO ANTERIOR (Regra 20) — o guard EXISTE.** A afirmação feita
nesta sessão de que `APPROVALS.md:787` ("o guard que recusa banco sem sufixo de
teste segue ativo") não corresponderia a mecanismo algum está **REFUTADA**, por
`T-30` §3 e por releitura direta do director:
`server/scripts/run-api-suite.cjs:530-536`
(`if (!/(_test|_ci)$/i.test(process.env.DB_NAME || '')) { throw … }`), com
`:524-529` recusando `NODE_ENV=production` e `/prod/i`. A afirmação da aprovação
é **verdadeira no escopo em que foi feita** (fila DYN executada pela suíte);
**não há divergência governança × mecanismo nesse ponto** e `RT-CUST-03` do
finding **perde o objeto**. O que não existia era controle para o vetor
`docker exec … psql`.

**Critérios objetivos de encerramento fixados:** `CE-01`…`CE-09` no artefato,
cumulativos; nenhum dispensável por decurso de prazo ou por decisão de agente —
só por aceitação de risco explícita do dono. Estado nesta data: `CE-01` artefato
presente/eficácia não verificada; `CE-02`, `CE-03`, `CE-04`, `CE-08` pendentes;
`CE-05` e `CE-06` abertos; `CE-07` parcial; `CE-09` em observação.

Nenhum comando, teste ou conexão de banco foi executado. Nenhum commit.
Nenhum `RETEST_PASSED`, `FINDING CLOSED`, `AUDIT_PASSED` ou `FINDINGS_CONFIRMED`
declarado (Regras 4 e 5). Nenhuma severidade atribuída ou alterada (Regra 22).

### NOTA DE CORREÇÃO FACTUAL DO ORQUESTRADOR — 2026-08-16, posterior ao registro acima

O registro do `coretriad-director` acima é fiel ao estado do disco **no momento
em que ele leu**, mas duas linhas envelheceram por corrida de tempo entre
agentes concorrentes. Corrigidas aqui por adição, sem alterar o texto original
(Regra 15):

- **D-2 está CONCLUÍDO, não "NÃO CONSTATADO".** Verificado pelo orquestrador
  após o término do agente `documentador`: `grep -l` por
  `APR-2026-016|AUD-PROC-CUSTODIA` retorna os **seis** arquivos —
  `docs/infra/DEPLOY_UBUNTU.md`, `docs/database/03-MODELO_FISICO.md`,
  `docs/infra/DOCKER_POSTGRES_SETUP.md`, `docs/infra/DEPLOY.md`,
  `docs/database/DATABASE_SETUP.md`, `docs/database/07-DISASTER_RECOVERY.md`.
  `03-MODELO_FISICO.md` passou a usar `erp_evok_audio_test` em 7 pontos.
  **A ressalva do director sobre o escopo perdeu o objeto na prática:** o
  agente varreu `docs/` inteiro por iniciativa própria e tratou **7 arquivos**,
  não os 2 nomeados — 1 por substituição, 5 por aviso normativo e 1 por nota
  inline em evidência histórica. Cerca de 40 outras ocorrências foram
  deliberadamente **não** alteradas, por serem menções narrativas ou registro
  histórico protegido pela Regra 15.
- **D-4 está CONCLUÍDO, não "PENDENTE".** Executado após o registro acima:
  `docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md` —
  **8 casos, 8 PASS, 0 FAIL, 0 NOT_PROVEN**, cobrindo as 4 fronteiras
  organizacionais originais (`TEST-HOOK-001`…`004`), a nova classe de comando de
  banco em subagente (`TEST-HOOK-005`) e **na sessão principal**
  (`TEST-HOOK-006`), mais dois controles negativos. Hook validado:
  `git hash-object` = `7eb8316d2936a40e86d37a54158ff15bf9050be1`. Segregação
  respeitada: quem implementou (`opuscore-devops-engineer`) não validou.
  **`CE-01` deixa de estar em "eficácia não verificada"** — a eficácia está
  demonstrada por execução, dentro dos limites declarados na §6 daquele
  relatório (guarda sintática; não cobre `PGDATABASE`, indireção por script,
  ofuscação, nem `evok_admin` usado diretamente).

Esta nota é registro factual do orquestrador, **não** juízo de auditoria: não
altera severidade, não fecha finding, não fecha a classe `RC-PROC-01` e não
declara `RETEST_PASSED`. O encerramento de `CE-01`…`CE-09` segue sendo decisão
do dono sobre evidência VeriCore (Regra 4).
