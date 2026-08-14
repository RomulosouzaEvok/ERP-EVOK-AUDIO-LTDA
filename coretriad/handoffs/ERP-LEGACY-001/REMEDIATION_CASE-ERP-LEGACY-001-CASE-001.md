# REMEDIATION_CASE  (VeriCore → SanaCore, via CoreTriad)
CASE_ID: ERP-LEGACY-001-CASE-001
FINDING_ID: FIND-ERP-001
PROJECT_ID: ERP-LEGACY-001
AUDIT_ID: N/A — finding preliminar de discovery (promovido por APR-2026-017); encaminhado à SanaCore por APR-2026-020 (Decisão B, prioridade 1 — CRITICAL)
AUDIT_COMMIT: legacy-baseline-001 → c9359be399c45191fe90e8e9707803125a5ba91d (o finding foi lido nesse commit; a triagem DEVE reconfirmar no HEAD atual antes de desenhar correção — houve commits posteriores, nenhum tocando `server/src`)
SEVERITY: CRITICAL (restrita ao GRUPO B do finding — NÃO se aplica às 6 rotas do GRUPO A)
CONFIDENCE: CONFIRMED (validação adversarial independente concluída — vericore-finding-validator)

EXPECTED_BEHAVIOR: Escrita crítica segura sob reenvio/duplo clique/retry: reexecutar a mesma operação com os mesmos parâmetros não produz segundo efeito financeiro/de estoque.
ACTUAL_BEHAVIOR: (1) `POST /api/inventory/movements` sem NENHUMA proteção — duas chamadas idênticas geram dois movimentos e dobram o efeito de estoque; o índice em `(reference_type, reference_id)` NÃO é unique; agravante descoberto no passo 30: `reference_type`/`reference_id` do payload são descartados silenciosamente (`CreateInventoryMovementUseCase.ts:107-116`; `inventoryService.ts:356-368` hardcoda `'adjustment'`/null). (2) Pagamento parcial repetido em `PayPayableUseCase.ts:39-74`/`ReceivePaymentUseCase.ts:39-74` — guarda só rejeita `status==='paid'`; título `'partial'` aceita reaplicação da mesma parcela e acumula `amount_paid`; só o teto de saldo barra a 3ª tentativa.
EVIDENCE: `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md` (fonte canônica — ler por inteiro, inclusive o veredito por operação GRUPO A/B e a seção de validação). Evidência dinâmica adicional do passo 30: testes de caracterização VERDES congelando o defeito — `server/tests/characterization/qualidade-estoque--duplicacao-lancamento-estoque.test.ts` e `server/tests/characterization/comercial-financeiro--pagamento-parcial-repetido.test.ts`.
REPRODUCTION: Seções REPRODUCTION do finding + os dois testes de caracterização acima (executáveis via `npm run test:characterization` contra banco efêmero).
FILES: CreateInventoryMovementUseCase.ts, inventoryController.ts, InventoryMovement.ts (model/índice), inventoryService.ts, PayPayableUseCase.ts, ReceivePaymentUseCase.ts, SequelizeFinancialRepository.ts, migration nova para constraint UNIQUE (se o desenho a adotar)
LINES: ver ACTUAL_BEHAVIOR e o finding (âncoras completas lá)

BUSINESS_RULE: BR-QE (movimentação de estoque) e BR-FIN (baixa de título) — ver `BR_CATALOG.md`; sem BR de idempotência registrada (comportamento descoberto)
REQUIREMENT: nenhum RF de idempotência existe (REQUIREMENTS_BASELINE — lacuna registrada)
USE_CASE: movimentação manual de estoque; pagamento/recebimento parcial de título

TECHNICAL_IMPACT: ver finding — proteção existente nas outras 6 rotas é efeito colateral de locks, não desenho deliberado de idempotência.
BUSINESS_IMPACT: duplo lançamento de estoque distorce saldo/MRP/disponibilidade; pagamento em duplicidade ao fornecedor ou reconhecimento indevido de recebimento.
SECURITY_IMPACT: confiabilidade financeira sob condição adversa de rede; não é vetor de autenticação/autorização.

RECOMMENDATION: seções RECOMMENDATION 1-3 do finding (constraint UNIQUE de negócio e/ou idempotency-key; identificador de operação de pagamento; formalizar guarda CNAB hoje incidental). A escolha de desenho é da triagem/SanaCore com registro; nada no finding é vinculante.
DEPENDENCIES: (a) Os DOIS testes de caracterização citados em EVIDENCE congelam o comportamento DEFEITUOSO — a remediação DEVE atualizá-los na mesma entrega para congelar o comportamento corrigido, citando FIND-ERP-001 + APR-2026-020 como a decisão registrada que ampara a mudança (é exatamente o mecanismo desenhado no passo 30). (b) O agravante de `reference_type`/`reference_id` descartados precisa de posição da triagem: corrigir junto (necessário se o desenho usar constraint UNIQUE sobre esses campos) ou registrar fora de escopo. (c) Auditoria 360° (ERP-LEGACY-001-AUD-001) corre em paralelo sobre AUDIT_COMMIT próprio — trabalho da SanaCore em worktree `sana/ERP-LEGACY-001/FIND-ERP-001`, nunca direto na main.
RETEST_SPECIFICATION: seção RETEST_SPECIFICATION (a)-(c) do finding — o item (c) (concorrência real sob carga) é do vericore-audit-verification-runner no reteste, não da SanaCore.

## Restrições de execução (herdadas, invioláveis)
- Banco: qualquer execução dinâmica APENAS contra `erp_evok_audio_test` (convenção `server/.env.test` + runner). NUNCA o banco de desenvolvimento real (PRODUÇÃO REAL por APR-2026-016).
- SanaCore não fecha o próprio finding: `RETEST_PASSED`/`CLOSED` são autoridade exclusiva VeriCore (Regras 3-4 do CLAUDE.md).
- Correção em worktree/branch `sana/ERP-LEGACY-001/FIND-ERP-001`, com testes de regressão e atualização de documentação afetada.
