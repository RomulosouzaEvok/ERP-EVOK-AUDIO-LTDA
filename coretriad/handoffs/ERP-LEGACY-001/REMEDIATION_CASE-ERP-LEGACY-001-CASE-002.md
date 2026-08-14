# REMEDIATION_CASE  (VeriCore → SanaCore, via CoreTriad)
CASE_ID: ERP-LEGACY-001-CASE-002
FINDING_ID: FIND-ERP-005
PROJECT_ID: ERP-LEGACY-001
AUDIT_ID: N/A — finding preliminar do passo 26 (promovido por APR-2026-018); encaminhado à SanaCore por APR-2026-020 (Decisão B, prioridade 1 — CRITICAL)
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d (a triagem DEVE reconfirmar as 4 falhas no HEAD atual antes de desenhar correção)
SEVERITY: CRITICAL (mantida pelo finding-validator; justificada pelo padrão que será promovido a produção — módulo `juridico` é NÃO-PRODUÇÃO, mas a conta `admin`, vetor da Falha 4, é PRODUÇÃO REAL por APR-2026-016)
CONFIDENCE: CONFIRMED (validação adversarial independente concluída, com busca por controle compensatório: nenhum encontrado)

EXPECTED_BEHAVIOR: A alçada de aprovação de contrato (RF-JUR-003: >R$ 50k exige `diretor`; >R$ 300k exige `diretor` E `financeiro`) é imposta no servidor, por NÍVEL de permissão, com segregação de identidade e sem caminho alternativo que altere valor sem reabrir alçada.
ACTUAL_BEHAVIOR: 4 falhas encadeadas, cada uma suficiente para contornar o único controle financeiro do módulo Jurídico: (1) thresholds hard-coded em `constants.ts:23,26` contrariando o contrato de API (tabela `jur_approval_thresholds` prometida e inexistente — zero ocorrências em `server/src`); (2) aprovação concedida por PRESENÇA do módulo, não por nível — `juridico.ts:71` sem `requiredLevel` (default `'operate'`) + truthiness em `contractController.ts:52-53`: `diretor:operate` destrava a faixa R$ 50-300k inteira; (3) aditivo altera o valor do contrato mesmo com `change_type='term'` sem reabrir alçada — aprovação dada para R$ 60k continua valendo após aditivo para R$ 5M; (4) `admin` autoaprova dos dois lados (sem segregação D-K); agravante: o gate de alçada é condicionado a dependência OPCIONAL no construtor — sem injeção, a alçada é pulada sem erro nem log.
EVIDENCE: `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-005.md` (fonte canônica — ler por inteiro, inclusive a seção de validação e o REPRODUCTION estático por falha).
REPRODUCTION: seção REPRODUCTION do finding (estática). Reprodução dinâmica na triagem: apenas contra banco efêmero `erp_evok_audio_test`.
FILES: juridico/domain/constants.ts, juridico/presentation (rotas juridico.ts), contractController.ts, ActivateContractUseCase.ts, use case de aditivo, authorizeAnyModule.ts (leitura — mudança aqui tem blast radius fora do módulo)
LINES: constants.ts:23,26,38-47; juridico.ts:71; contractController.ts:52-53; ActivateContractUseCase.ts:61-73; demais no finding

BUSINESS_RULE: BR-JUR-003 (alçada), BR-JUR-D07/D08/D09 — ver `BR_CATALOG.md` (cluster pessoas-governanca)
REQUIREMENT: RF-JUR-003
USE_CASE: aprovação e ativação de contrato jurídico; aditivo contratual

TECHNICAL_IMPACT: autorização decidida na apresentação sem reverificação de domínio (padrão estrutural, `CURRENT_ARCHITECTURE.md` §4); gate condicionado a dependência opcional (fail-open); contrato de API divergente do código; cobertura verde que não exercita nenhuma das 4 falhas.
BUSINESS_IMPACT: a empresa pode ser vinculada contratualmente por valor arbitrário sem decisão real de diretor/financeiro, por três caminhos distintos; sem registro de qual alçada vigia em qual data.
SECURITY_IMPACT: OWASP A01 Broken Access Control + A04 Insecure Design; ASVS V4.1.3/V4.1.5/V4.2.1/V4.3.3. Não é IDOR nem cross-tenant.

RECOMMENDATION: **A triagem deve respeitar a partição registrada no finding:** Falhas 2 e 4 NÃO dependem de decisão nova (a 2 contraria o próprio rótulo do módulo `diretor` no catálogo e o padrão `approve` das demais ações sensíveis; a 4 contraria a decisão D-K já registrada e implementada em Compras) — podem seguir a desenho de correção direto. Falhas 1 e 3 DEPENDEM de decisão humana prévia registrada: (a) qual fonte prevalece — tabela configurável com `contract_type` (contrato de API) ou constantes (código)?; (b) aditivo que eleva valor exige `approve` ou `operate`?; (c) a segregação D-K vale para aprovação de contrato? A triagem FORMULA essas 3 perguntas para o dono — NÃO as decide (Regra 6). Atenção à Regra 24 do CLAUDE.md (papel sem verificação server-side = CRITICAL bloqueante, nunca RISK_ACCEPTED em projeto real).
DEPENDENCIES: (a) 3 decisões do dono (acima) bloqueiam apenas as Falhas 1 e 3 — não segurar as Falhas 2 e 4 por causa delas. (b) Correção da Falha 2 pode tocar `authorizeAnyModule` (middleware compartilhado) — blast radius fora do módulo `juridico` deve ser mapeado na triagem. (c) O gate-condicionado-a-dependência-opcional (fail-open) deve ser tratado como parte da Falha 2/desenho, não deixado como está. (d) Auditoria 360° corre em paralelo — trabalho em worktree `sana/ERP-LEGACY-001/FIND-ERP-005`, nunca direto na main.
RETEST_SPECIFICATION: seção RETEST_SPECIFICATION do finding (R1-R4, blocos independentes; todos exigem execução dinâmica real — HTTP autenticado contra banco de teste; Falhas 2 e 4 são invisíveis a teste que instancie o use case diretamente).

## Restrições de execução (herdadas, invioláveis)
- Banco: qualquer execução dinâmica APENAS contra `erp_evok_audio_test` (convenção `server/.env.test` + runner). NUNCA o banco real (APR-2026-016).
- SanaCore não fecha o próprio finding: `RETEST_PASSED`/`CLOSED` são autoridade exclusiva VeriCore (Regras 3-4 do CLAUDE.md).
- Correção em worktree/branch `sana/ERP-LEGACY-001/FIND-ERP-005`, com testes de regressão (cobrindo as 4 falhas) e atualização da documentação afetada (`BLOCO_3_JUR_API.md` §2.7 conforme a decisão (a) do dono).
