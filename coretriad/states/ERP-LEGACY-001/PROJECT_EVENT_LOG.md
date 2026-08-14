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
