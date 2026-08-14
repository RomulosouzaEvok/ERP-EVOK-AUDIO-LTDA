# BR_CATALOG.md — Catálogo canônico de BR-ID do ERP-LEGACY-001

```
PROJECT_ID:  ERP-LEGACY-001
AUTORIDADE:  APR-2026-019 (coretriad/governance/APPROVALS.md, aprovada por Gilwagno em 14/08/2026)
DATA:        2026-08-14
NATUREZA:    Registro/índice. A fonte descritiva (SSOT do texto de cada regra) permanece
             nos 6 arquivos BUSINESS_RULE_CANDIDATES_*.md do passo 26 — este catálogo
             NÃO duplica o texto das regras, apenas fixa o ID, o status registrado, a
             fonte e a âncora principal.
```

**Distinção normativa (obrigatória de ler):** o BR-ID canônico fixa a **âncora de
rastreabilidade**, não a **aprovação** da regra. Todo status do passo 26
(`CONFIRMED`/`DISCOVERED`/`CONFLICTING`/`UNKNOWN`/`OBSOLETE_CANDIDATE`) permanece
inalterado até validação humana caso a caso (Regra 6 do `CLAUDE.md`; regra 3 do
programa). Este catálogo não valida, não julga mérito e não resolve divergência.

**OWNER:** é **vedado a qualquer agente decidir ou inferir OWNER** (APR-2026-019,
parte 2). A coluna OWNER nasce `PENDENTE — decisão humana` em 100% das linhas; a
atribuição será feita aos poucos pelo dono, com os responsáveis reais de cada área
(§6).

**Por que este catálogo existe:** a consolidação do passo 29
(`docs/coretriad/projects/ERP-LEGACY-001/discovery/LEGACY_TRACEABILITY_MATRIX.md` §1)
registrou o elo BR-ID canônico **quebrado em ~167/167 linhas** — causa-raiz nº 1 da
matriz de rastreabilidade nascer com 0 cadeias completas. A APR-2026-019 promove os
IDs provisórios do passo 26 a canônicos **sem renumeração**, preservando todas as
referências cruzadas já gravadas nos artefatos dos passos 26-30.

---

## 2. Especificação do esquema de BR-ID

**Formato canônico:** `BR-<ÁREA>-<NNN>` — prefixo de área + número sequencial.
Variantes herdadas do passo 26 (série `D<nn>` de pessoas-governanca, sufixo `016b`)
são canônicas **como estão** (ver §5) — nada é renumerado.

### 2.1 Prefixos de área em uso

| Prefixo | Significado | Cluster de origem (passo 26) | Regras |
|---|---|---|---|
| IAM | Identidade & Acesso (auth, users, accessProfiles, auditLogs) | identidade-acesso | 39 |
| CAD | Cadastro Central (suppliers, clients, items, products, BOM) | cadastro-suprimentos | 17 |
| SUP | Cadeia de Suprimentos (purchases, requisições, RFQ, COMEX) | cadastro-suprimentos | 16 |
| PP | Planejamento & Produção (mrp, production, MPS, roteiros, laboratory, engineering) | planejamento-producao | 26 |
| QE | Qualidade & Estoque (quality, RNC, inventory, mobile, assets, maintenance) | qualidade-estoque | 13 |
| COM | Comercial (sales, serviceOrders) | comercial-financeiro | 13 |
| FIS | Fiscal (tributos, NF-e) | comercial-financeiro | 10 |
| CTB | Contabilidade (accounting) | comercial-financeiro | 2 |
| CTR | Controladoria (budget) | comercial-financeiro | 1 |
| TES | Tesouraria (treasury) | comercial-financeiro | 1 |
| FIN | Financeiro (contas a pagar/receber, conciliação) | comercial-financeiro | 2 |
| RH | Recursos Humanos | pessoas-governanca | 6 |
| JUR | Jurídico & LGPD | pessoas-governanca | 8 |
| SST | Saúde e Segurança do Trabalho | pessoas-governanca | 3 |
| TI | Tecnologia da Informação | pessoas-governanca | 2 |
| DIR | Diretoria (riscos) | pessoas-governanca | 1 |
| MKT | Marketing | pessoas-governanca | 1 |
| FAC | Facilities | pessoas-governanca | 1 |
| IMP | Importação de planilha | pessoas-governanca | 1 |
| WHK | Webhooks | pessoas-governanca | 1 |
| **Total** | 20 prefixos | 6 clusters | **164** |

### 2.2 Regras de unicidade e numeração

1. **BR-ID nunca é reciclado nem renumerado** — precedente da APR-2026-018
   (findings), estendido a regras pela APR-2026-019. Se uma regra for descartada
   no futuro, o ID permanece na sequência com o motivo do descarte.
2. **Novos IDs usam o próximo número livre do prefixo**, considerando como
   reservados também os números citados em código sem ficha própria (§5.3).
3. **Colisão herdada resolve-se por desambiguação ADITIVA registrada** neste
   catálogo (ex.: sufixo, qualificador de cluster) — **nunca** por renumeração
   silenciosa.
4. **Lacunas de numeração são registradas, não fechadas** (§5.4).

---

## 3. Registro canônico

Colunas: `Def.` = linha onde a regra é **definida** no arquivo BRC do cluster
(entrada/ficha própria; citação de ID de outro cluster é referência cruzada, não
definição). Âncora de código na forma curta `Arquivo.ts:linha`, como nas matrizes
do passo 29. Status = o declarado na ficha do passo 26 (status principal; estados
compostos anotados entre parênteses). Título curto = síntese de indexação, não
substitui a descrição da fonte.

### 3.1 Cluster identidade-acesso — 39 regras

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_identidade-acesso.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-IAM-001 | Hash bcrypt de senha no hook do model | CONFIRMED | :34 | `User.ts:123` | PENDENTE — decisão humana |
| BR-IAM-002 | Senha mínima de 6 caracteres, 3 implementações | CONFLICTING | :57 | `AuthCredentialsEntity.ts:89` | PENDENTE — decisão humana |
| BR-IAM-003 | Troca de senha invalida sessões (passwordVersion) | CONFIRMED | :81 | `User.ts:127` | PENDENTE — decisão humana |
| BR-IAM-004 | Nova senha diferente da atual (só change-password) | DISCOVERED | :100 | `ChangePasswordUseCase.ts:55` | PENDENTE — decisão humana |
| BR-IAM-005 | JWT expira em 7 dias (JWT_EXPIRE) | CONFIRMED | :135 | `runtimeEnv.ts:50` | PENDENTE — decisão humana |
| BR-IAM-006 | Refresh exige token válido; sem refresh-token separado | CONFIRMED | :149 | `authController.ts:67` | PENDENTE — decisão humana |
| BR-IAM-007 | Rate-limits de autenticação em 5 endpoints | CONFIRMED | :160 | `app.ts:54` | PENDENTE — decisão humana |
| BR-IAM-008 | Token de recuperação: SHA-256, TTL 1h, uso único | CONFIRMED | :178 | `ForgotPasswordUseCase.ts:17` | PENDENTE — decisão humana |
| BR-IAM-009 | Status HTTP de token inválido: 401 × 422 | CONFLICTING | :185 | `ResetPasswordUseCase.ts:51` | PENDENTE — decisão humana |
| BR-IAM-010 | Login não revela e-mail; inativo não autentica | CONFIRMED | :198 | `LoginUseCase.ts:47` | PENDENTE — decisão humana |
| BR-IAM-011 | Toda tentativa de login é auditada | CONFIRMED | :206 | `LoginUseCase.ts:48` | PENDENTE — decisão humana |
| BR-IAM-012 | Revogação emergencial de sessões por admin | DISCOVERED | :210 | `RevokeUserSessionsUseCase.ts:28` | PENDENTE — decisão humana |
| BR-IAM-013 | Usuários, perfis e logs: rotas admin-only | CONFIRMED | :222 | `users.ts:14` | PENDENTE — decisão humana |
| BR-IAM-014 | Auto-inativação proibida, contornável via PUT | CONFLICTING | :234 | `DeactivateUserUseCase.ts:32` | PENDENTE — decisão humana |
| BR-IAM-015 | Papéis válidos com validação assimétrica | CONFLICTING | :255 | `CreateUserUseCase.ts:43` | PENDENTE — decisão humana |
| BR-IAM-016 | PUT de usuário nunca troca senha | CONFIRMED | :272 | `UpdateUserEntity.ts:49` | PENDENTE — decisão humana |
| BR-IAM-017 | E-mail único e com formato válido | CONFIRMED | :276 | `User.ts:62` | PENDENTE — decisão humana |
| BR-IAM-018 | Perfil único por usuário; atribuir substitui | CONFIRMED | :290 | `AssignAccessProfileUseCase.ts:69` | PENDENTE — decisão humana |
| BR-IAM-019 | Admin global curto-circuita perfil de área | CONFIRMED | :296 | `auth.ts:226` (middlewares) | PENDENTE — decisão humana |
| BR-IAM-020 | Sem perfil ativo = bloqueio total | CONFIRMED | :304 | `auth.ts:246` (middlewares) | PENDENTE — decisão humana |
| BR-IAM-021 | Níveis de permissão: 3 documentados × 2 implementados | CONFLICTING | :312 | `accessModules.ts:248` | PENDENTE — decisão humana |
| BR-IAM-022 | Segunda trava gestor colapsada; log falso UC-36 | CONFLICTING | :339 | `auth.ts:213` (middlewares) | PENDENTE — decisão humana |
| BR-IAM-023 | Perfil em uso não desativa; inativo não atribui | CONFIRMED | :362 | `DeactivateAccessProfileUseCase.ts:51` | PENDENTE — decisão humana |
| BR-IAM-024 | Perfil exige nome único e módulo válido | CONFIRMED | :368 | `CreateAccessProfileUseCase.ts:48` | PENDENTE — decisão humana |
| BR-IAM-025 | Auditoria de perfil completa; guarda mede lugar errado | CONFLICTING | :380 | `UpdateAccessProfileUseCase.ts:83` | PENDENTE — decisão humana |
| BR-IAM-026 | Register cria usuário sem auditoria | DISCOVERED | :406 | `authController.ts:87` | PENDENTE — decisão humana |
| BR-IAM-027 | Negativa 403 de módulo é auditada | CONFIRMED | :423 | `auth.ts:231` (middlewares) | PENDENTE — decisão humana |
| BR-IAM-028 | Audit log imutável só na camada de API | CONFIRMED (ressalva FIND-ERP-002) | :429 | `auditLogs.ts:12` | PENDENTE — decisão humana |
| BR-IAM-029 | Vocabulário fechado de action, com downgrade | DISCOVERED | :439 | `auditLogService.ts:135` | PENDENTE — decisão humana |
| BR-IAM-030 | Auditoria nunca bloqueia a operação | DISCOVERED | :446 | `auditLogService.ts:92` | PENDENTE — decisão humana |
| BR-IAM-031 | Módulo items sem rastro de auditoria | CONFLICTING | :456 | `itemController.ts:65` | PENDENTE — decisão humana |
| BR-IAM-032 | Serialização de User nunca expõe segredo | CONFIRMED | :482 | `User.ts:153` | PENDENTE — decisão humana |
| BR-IAM-033 | Admin de bootstrap semeado por variável de ambiente | DISCOVERED | :489 | `seeds.ts:128` | PENDENTE — decisão humana |
| BR-IAM-034 | Retenção/expurgo de logs e usuários: inexistente | UNKNOWN | :498 | — (regra ausente) | PENDENTE — decisão humana |
| BR-IAM-035 | me/permissions reusa permissões do middleware | CONFIRMED | :502 | `GetMyPermissionsUseCase.ts:36` | PENDENTE — decisão humana |
| BR-IAM-036 | Filtros do audit log sem user_id/success | DISCOVERED | :508 | `ListAuditLogsUseCase.ts:42` | PENDENTE — decisão humana |
| BR-IAM-037 | Auditoria chamada após commit, fora de transação | DISCOVERED | :515 | `auditLogService.ts:113` | PENDENTE — decisão humana |
| BR-IAM-038 | Rotação/expiração de senha e lockout ausentes | UNKNOWN | :114 | — (regra ausente) | PENDENTE — decisão humana |
| BR-IAM-039 | Comentário normativo obsoleto de segunda trava | OBSOLETE_CANDIDATE | :520 | `AccessProfilePermission.ts:17` | PENDENTE — decisão humana |

### 3.2 Cluster cadastro-suprimentos — 33 regras (16 SUP + 17 CAD)

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-SUP-001 | Compra nacional acima de R$ 500 mil exige diretor | CONFIRMED | :32 | `constants.ts:74` (purchases) | PENDENTE — decisão humana |
| BR-SUP-002 | Importação exige diretoria em qualquer valor | CONFIRMED | :52 | `constants.ts:169` (purchases) | PENDENTE — decisão humana |
| BR-SUP-003 | Origem efetiva é escalation-only | CONFIRMED | :61 | `constants.ts:107` (purchases) | PENDENTE — decisão humana |
| BR-SUP-004 | Base da alçada = mercadoria + frete, sem impostos | DISCOVERED | :77 | `constants.ts:185` (purchases) | PENDENTE — decisão humana |
| BR-SUP-005 | Origem import com fornecedor nacional é 422 | CONFIRMED (nota de vigência) | :94 | `CreatePurchaseUseCase.ts:70` | PENDENTE — decisão humana |
| BR-SUP-006 | Pedido aprovado congela campos da alçada | DISCOVERED | :108 | `UpdatePurchaseUseCase.ts:79` | PENDENTE — decisão humana |
| BR-SUP-007 | Segregação D-K: aprovador ≠ solicitante | CONFLICTING | :119 | `segregationOfDuties.ts:75` | PENDENTE — decisão humana |
| BR-SUP-008 | Alçada aceita qualquer nível do módulo diretor | CONFLICTING | :147 | `purchases.ts:48` | PENDENTE — decisão humana |
| BR-SUP-009 | Admin tratado como papel diretor | DISCOVERED | :168 | `purchaseController.ts:51` | PENDENTE — decisão humana |
| BR-SUP-010 | Requisição de compra sem alçada por valor | DISCOVERED | :186 | `ChangePurchaseRequisitionStatusUseCase.ts:62` | PENDENTE — decisão humana |
| BR-SUP-011 | Mínimo de 3 cotações: doc diz 3, código aceita 1 | CONFLICTING | :199 | `rfqValidators.ts:39` | PENDENTE — decisão humana |
| BR-SUP-012 | Adjudicação de RFQ sem critério nem aprovação | DISCOVERED | :219 | `AwardRfqUseCase.ts:108` | PENDENTE — decisão humana |
| BR-SUP-013 | Pedido gerado por RFQ/conversão nasce national | CONFIRMED (lacuna conhecida) | :233 | `AwardRfqUseCase.ts` (default, sem linha na fonte) | PENDENTE — decisão humana |
| BR-SUP-014 | COMEX: diretoria no embarque (draft→shipped) | CONFIRMED | :247 | `constants.ts:44` (comex) | PENDENTE — decisão humana |
| BR-SUP-015 | Congelamento monetário no embarque COMEX | DISCOVERED | :257 | `constants.ts:77` (comex) | PENDENTE — decisão humana |
| BR-SUP-016 | Alçada fail-open para valor não numérico | UNKNOWN | :267 | `constants.ts:171` (purchases) | PENDENTE — decisão humana |
| BR-CAD-001 | CNPJ de fornecedor validado, normalizado, único | CONFIRMED | :283 | `CreateSupplierUseCase.ts:31` | PENDENTE — decisão humana |
| BR-CAD-002 | Estrangeiro exige CNPJ brasileiro válido | UNKNOWN | :300 | `CreateSupplierUseCase.ts:31` | PENDENTE — decisão humana |
| BR-CAD-003 | is_foreign é declaração obrigatória na criação | CONFIRMED | :318 | `supplierValidators.ts:34` | PENDENTE — decisão humana |
| BR-CAD-004 | is_foreign só escala; desmarcar é recusado | CONFIRMED | :330 | `UpdateSupplierUseCase.ts:53` | PENDENTE — decisão humana |
| BR-CAD-005 | Backfill de is_foreign legado pendente | CONFIRMED (pendência aberta) | :340 | — (implementação ausente) | PENDENTE — decisão humana |
| BR-CAD-006 | Campos de fornecedor não alteráveis via API | DISCOVERED | :360 | `UpdateSupplierUseCase.ts:10` | PENDENTE — decisão humana |
| BR-CAD-007 | CPF/CNPJ de cliente polimórfico e único | CONFIRMED | :369 | `CreateClientUseCase.ts:34` | PENDENTE — decisão humana |
| BR-CAD-008 | Código de item único, sensível a caixa | DISCOVERED (ponto aberto UNKNOWN) | :381 | `CreateItemUseCase.ts:28` | PENDENTE — decisão humana |
| BR-CAD-009 | Item cria produto-gêmeo na mesma transação | DISCOVERED | :393 | `CreateItemUseCase.ts:33` | PENDENTE — decisão humana |
| BR-CAD-010 | BOM só existe para produto acabado | DISCOVERED | :405 | `bomService.ts:203` | PENDENTE — decisão humana |
| BR-CAD-011 | Ciclo em estrutura de produto barrado na escrita | CONFIRMED | :414 | `bomService.ts:220` | PENDENTE — decisão humana |
| BR-CAD-012 | Revisão de BOM duplicada é recusada | DISCOVERED | :435 | `bomService.ts:281` | PENDENTE — decisão humana |
| BR-CAD-013 | Uma BOM ativa; ativa/superseded imutáveis | CONFIRMED | :447 | `bomService.ts:308` | PENDENTE — decisão humana |
| BR-CAD-014 | BOM nasce vigente sem ato de aprovação | CONFLICTING | :462 | `bomService.ts:314` | PENDENTE — decisão humana |
| BR-CAD-015 | Profundidade máxima de estrutura = 10 | DISCOVERED | :489 | `BOMEntity.ts:4` | PENDENTE — decisão humana |
| BR-CAD-016 | MRO e imobilizado nunca entram em BOM | CONFIRMED | :502 | `bomService.ts:51` | PENDENTE — decisão humana |
| BR-CAD-017 | Subconjunto estocável × fantasma (G18) | CONFIRMED | :514 | `bomService.ts:121` | PENDENTE — decisão humana |

### 3.3 Cluster planejamento-producao — 26 regras

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_planejamento-producao.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-PP-001 | Máquina de estados da Ordem de Produção | CONFIRMED | :24 | `ProductionOrderEntity.ts:60` | PENDENTE — decisão humana |
| BR-PP-002 | Gate G6 de partida: três condições | CONFIRMED (ressalva doc) | :43 | `productionTrackingRules.ts:394` | PENDENTE — decisão humana |
| BR-PP-003 | Responsável da OP atribuído, não exigido | DISCOVERED | :76 | `ChangeProductionOrderStatusUseCase.ts:101` | PENDENTE — decisão humana |
| BR-PP-004 | Reserva de material na liberação (G3) | CONFIRMED | :92 | `ChangeProductionOrderStatusUseCase.ts:687` | PENDENTE — decisão humana |
| BR-PP-005 | Conclusão exige apontamento: seis regras (G4) | CONFIRMED | :112 | `productionTrackingRules.ts:80` | PENDENTE — decisão humana |
| BR-PP-006 | Conclusão exige BOM ativa; quantidade zero proibida | DISCOVERED | :132 | `ChangeProductionOrderStatusUseCase.ts:389` | PENDENTE — decisão humana |
| BR-PP-007 | Sobreprodução exige confirmação explícita, sem teto | DISCOVERED | :147 | `ProductionOrderEntity.ts:187` | PENDENTE — decisão humana |
| BR-PP-008 | Lote obrigatório no consumo; FEFO como fallback | DISCOVERED | :166 | `ChangeProductionOrderStatusUseCase.ts:774` | PENDENTE — decisão humana |
| BR-PP-009 | Custo real: material + MO + overhead | DISCOVERED | :183 | `ChangeProductionOrderStatusUseCase.ts:565` | PENDENTE — decisão humana |
| BR-PP-010 | Netting conjunto do MRP por bucket de data | CONFIRMED | :201 | `mrpEngine.ts:221` | PENDENTE — decisão humana |
| BR-PP-011 | Rateio do plano por origem proporcional | DISCOVERED | :219 | `allocatePlanByOrigin.ts:139` | PENDENTE — decisão humana |
| BR-PP-012 | MRP desconta material retido pela Qualidade (G7) | CONFIRMED | :237 | `SequelizeItemRepository.ts:79` | PENDENTE — decisão humana |
| BR-PP-013 | Lote mínimo e estoque de segurança no mesmo campo | CONFLICTING | :250 | `SequelizeItemRepository.ts:109` | PENDENTE — decisão humana |
| BR-PP-014 | Idempotência da conversão plano→requisição | CONFIRMED | :276 | `createRequisitionFromPlannedOrders.ts:32` | PENDENTE — decisão humana |
| BR-PP-015 | Três caminhos de criação de OP, rigor diferente | CONFLICTING | :294 | `CreateProductionOrderUseCase.ts:39` | PENDENTE — decisão humana |
| BR-PP-016 | Explosão: fantasma × estocável (G18) | CONFIRMED | :323 | `bomService.ts:489` | PENDENTE — decisão humana |
| BR-PP-016b | MRP ignora is_phantom na explosão | CONFLICTING | :344 | `mrpEngine.ts:164` | PENDENTE — decisão humana |
| BR-PP-017 | Barragem de ciclo na BOM em três camadas (G1) | CONFIRMED (valor 10 UNKNOWN) | :356 | `bomService.ts:226` | PENDENTE — decisão humana |
| BR-PP-018 | Plano Mestre: estados; firmar exige decisão | CONFIRMED | :377 | `constants.ts:206` (masterProduction) | PENDENTE — decisão humana |
| BR-PP-019 | Liberar MPS exige firm; tudo-ou-nada | CONFIRMED (exceção auto-declarada) | :391 | `ReleaseMasterProductionPlanUseCase.ts:86` | PENDENTE — decisão humana |
| BR-PP-020 | A conta do Plano Mestre | CONFIRMED | :411 | `constants.ts:141` (masterProduction) | PENDENTE — decisão humana |
| BR-PP-021 | Roteiro de produção ativo é imutável (G5) | CONFIRMED | :431 | `productionRouteRules.ts:30` | PENDENTE — decisão humana |
| BR-PP-022 | RBAC das transições de OP e MPS | CONFIRMED (lacuna de granularidade) | :453 | `productionOrders.ts:23` | PENDENTE — decisão humana |
| BR-PP-023 | Laboratório: passed calculado; reprovação abre RNC | DISCOVERED | :479 | `CreateAcousticTestUseCase.ts:84` | PENDENTE — decisão humana |
| BR-PP-024 | Liberação de desenho técnico exige draft | DISCOVERED | :500 | `ReleaseDrawingUseCase.ts:33` | PENDENTE — decisão humana |
| BR-PP-025 | CRP documentada e inexistente | OBSOLETE_CANDIDATE | :513 | `CreateProductionOrderUseCase.ts:36` (ausência verificada) | PENDENTE — decisão humana |

### 3.4 Cluster qualidade-estoque — 13 regras

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-QE-001 | Gate G7 de liberação de lote: condição exata | CONFIRMED (desvio de doc) | :21 | `constants.ts:127` (quality) | PENDENTE — decisão humana |
| BR-QE-002 | Evidência mínima da inspeção | CONFIRMED (limiar 3 DISCOVERED) | :61 | `CreateQualityInspectionUseCase.ts:51` | PENDENTE — decisão humana |
| BR-QE-003 | Reprovação abre RNC major e bloqueia lote | DISCOVERED | :80 | `CreateQualityInspectionUseCase.ts:164` | PENDENTE — decisão humana |
| BR-QE-004 | Statuses bloqueáveis: duas listas divergentes | CONFLICTING | :96 | `BlockLotUseCase.ts:26` | PENDENTE — decisão humana |
| BR-QE-005 | Quarentena de recebimento e saldo retido (G17) | CONFIRMED (exceção mobile) | :114 | `quarantineBalanceService.ts:73` | PENDENTE — decisão humana |
| BR-QE-006 | Re-recebimento rebaixa status sem máquina de estados | DISCOVERED | :135 | `materialReceiptService.ts:165` | PENDENTE — decisão humana |
| BR-QE-007 | FEFO: duas definições de vencido | CONFLICTING | :155 | `saleLotService.ts:153` | PENDENTE — decisão humana |
| BR-QE-008 | Máquina de estados da contagem cíclica | DISCOVERED | :179 | `ApproveInventoryCountUseCase.ts:50` | PENDENTE — decisão humana |
| BR-QE-009 | Classificação e efeito da RNC | DISCOVERED (subitens CONFLICTING) | :220 | `CreateNonConformityUseCase.ts:113` | PENDENTE — decisão humana |
| BR-QE-010 | Devolução ao fornecedor | DISCOVERED | :256 | `SupplierReturnHandler.ts:27` | PENDENTE — decisão humana |
| BR-QE-011 | Scan mobile fora de lote, depósito e quarentena | CONFLICTING | :281 | `ScanItemUseCase.ts:45` | PENDENTE — decisão humana |
| BR-QE-012 | Rastreabilidade é leitura pura, sem Qualidade | DISCOVERED | :304 | `GetLotTraceabilityUseCase.ts:28` | PENDENTE — decisão humana |
| BR-QE-013 | Ativos: baixa e ciclo com manutenção | DISCOVERED | :318 | `DeactivateAssetUseCase.ts:36` | PENDENTE — decisão humana |

### 3.5 Cluster comercial-financeiro — 29 regras

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_comercial-financeiro.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-COM-001 | Máquina de estados da venda | CONFIRMED | :52 | `ChangeSaleStatusUseCase.ts:12` | PENDENTE — decisão humana |
| BR-COM-002 | invoiced/partially_invoiced só via NF-e | CONFIRMED | :67 | `ChangeSaleStatusUseCase.ts:125` | PENDENTE — decisão humana |
| BR-COM-003 | Embarque exige NF-e autorizada no instante | CONFIRMED | :77 | `ChangeSaleStatusUseCase.ts:159` | PENDENTE — decisão humana |
| BR-COM-004 | shipped é terminal e não cancelável | CONFIRMED | :91 | `ChangeSaleStatusUseCase.ts:28` | PENDENTE — decisão humana |
| BR-COM-005 | Dupla trava de NF-e documentada não existe | CONFLICTING | :98 | `auth.ts:213` (middlewares) | PENDENTE — decisão humana |
| BR-COM-006 | Confirmação reserva estoque; recebível só na NF-e | CONFIRMED | :118 | `ChangeSaleStatusUseCase.ts:223` | PENDENTE — decisão humana |
| BR-COM-007 | Itens só alteráveis em quote/confirmed | CONFIRMED | :140 | `EditSaleItemsUseCase.ts:73` | PENDENTE — decisão humana |
| BR-COM-008 | Tabela de preço por cliente é sugestão | DISCOVERED | :149 | `CreateCustomerPriceUseCase.ts:4` | PENDENTE — decisão humana |
| BR-COM-009 | Não existe limite de desconto | DISCOVERED | :170 | `CreateSaleUseCase.ts:143` | PENDENTE — decisão humana |
| BR-COM-010 | Desconto não chega à NF-e nem ao recebível | DISCOVERED | :185 | `IssueSaleNfeUseCase.ts:202` | PENDENTE — decisão humana |
| BR-COM-011 | Vigência de preço não pode sobrepor | CONFIRMED | :208 | `CreateCustomerPriceUseCase.ts:56` | PENDENTE — decisão humana |
| BR-COM-012 | Ordem de Serviço sem máquina de estados | DISCOVERED | :220 | `UpdateServiceOrderUseCase.ts:11` | PENDENTE — decisão humana |
| BR-COM-013 | Numeração da OS por timestamp em milissegundos | DISCOVERED | :245 | `CreateServiceOrderUseCase.ts:45` | PENDENTE — decisão humana |
| BR-FIS-001 | Alíquota interna de ICMS: 19 de 27 UFs divergem | CONFLICTING | :256 | `TaxCalculationService.ts:55` | PENDENTE — decisão humana |
| BR-FIS-002 | Alíquota interestadual: documento contradiz a si mesmo | CONFLICTING | :299 | `TaxCalculationService.ts:63` | PENDENTE — decisão humana |
| BR-FIS-003 | IPI documentado 10/15%, implementado 0% | CONFLICTING | :315 | `TaxCalculationService.ts:119` | PENDENTE — decisão humana |
| BR-FIS-004 | DIFAL documentado, não implementado | CONFLICTING | :332 | `TaxCalculationService.ts:154` (ausência) | PENDENTE — decisão humana |
| BR-FIS-005 | ICMS-ST documentado, não implementado | CONFLICTING | :343 | `TaxCalculationService.ts` (ausência, sem linha na fonte) | PENDENTE — decisão humana |
| BR-FIS-006 | CFOP de saída divergente entre doc e código | CONFLICTING | :352 | `TaxCalculationService.ts:88` | PENDENTE — decisão humana |
| BR-FIS-007 | PIS/COFINS por regime tributário (CRT) | CONFIRMED | :366 | `TaxCalculationService.ts:128` | PENDENTE — decisão humana |
| BR-FIS-008 | Pré-condição de faturamento divergente do UC-41 | CONFLICTING | :376 | `IssueSaleNfeUseCase.ts:113` | PENDENTE — decisão humana |
| BR-FIS-009 | Provedor NF-e: fallback silencioso para mock | DISCOVERED | :389 | `NfeProviderFactory.ts:16` | PENDENTE — decisão humana |
| BR-FIS-010 | Justificativa de cancelamento com 15 caracteres mínimos | CONFIRMED | :408 | `CancelSaleNfeUseCase.ts:88` | PENDENTE — decisão humana |
| BR-CTB-001 | Estorno contábil sem condições de negócio | DISCOVERED | :416 | `ReverseEntryUseCase.ts:42` | PENDENTE — decisão humana |
| BR-CTB-002 | Partida dobrada exigida ao postar | CONFIRMED | :450 | `PostEntryUseCase.ts:53` | PENDENTE — decisão humana |
| BR-CTR-001 | Orçamento sem limite, aprovador ou trava | DISCOVERED | :460 | `DeleteBudgetLineUseCase.ts:27` | PENDENTE — decisão humana |
| BR-TES-001 | settle/cancel de operação financeira | CONFIRMED (3 lacunas) | :491 | `SettleOperationUseCase.ts:30` | PENDENTE — decisão humana |
| BR-FIN-001 | Baixa parcial de título; sem juros/multa | DISCOVERED | :512 | `ReceivePaymentUseCase.ts:39` | PENDENTE — decisão humana |
| BR-FIN-002 | Conciliação: 1 centavo, mais ou menos 7 dias | CONFIRMED | :527 | `reconciliationRules.ts:16` | PENDENTE — decisão humana |

### 3.6 Cluster pessoas-governanca — 24 regras

Fonte descritiva: `docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_pessoas-governanca.md`

| BR-ID | Título curto | Status (passo 26) | Def. | Âncora de código principal | OWNER |
|---|---|---|---|---|---|
| BR-RH-D01 | Rescisão exige rh:approve decidido pelo body | CONFIRMED | :27 | `rh.ts:60` | PENDENTE — decisão humana |
| BR-RH-D02 | termination_reason validado e silenciosamente descartado | CONFLICTING | :64 | `DecideEmployeeContractUseCase.ts:100` | PENDENTE — decisão humana |
| BR-RH-D03 | Rescisão abre processo com parâmetros fixos | CONFLICTING (+ DISCOVERED) | :81 | `CreateTerminationProcessUseCase.ts:51` | PENDENTE — decisão humana |
| BR-RH-D04 | Teto de 90 dias do contrato de experiência | CONFIRMED | :99 | `experienceContractRules.ts:12` | PENDENTE — decisão humana |
| BR-RH-D05 | Segunda prorrogação rejeitada, não convertida | CONFIRMED | :112 | `experienceContractRules.ts:36` | PENDENTE — decisão humana |
| BR-RH-D06 | Dado sensível de RH por interseção de módulos | CONFIRMED (folha OBSOLETE_CANDIDATE) | :127 | `rhSensitiveFields.ts:61` | PENDENTE — decisão humana |
| BR-JUR-003 | Alçada de contrato hard-coded × tabela prometida | CONFLICTING | :152 | `constants.ts:38` (juridico) | PENDENTE — decisão humana |
| BR-JUR-D07 | diretor:operate registra aprovação de alçada | DISCOVERED (+ CONFLICTING nível) | :194 | `contractController.ts:42` | PENDENTE — decisão humana |
| BR-JUR-D08 | approverHasApprove calculado e ignorado | OBSOLETE_CANDIDATE | :235 | `ActivateContractUseCase.ts:53` | PENDENTE — decisão humana |
| BR-JUR-D09 | Aditivo altera valor sem reabrir alçada | CONFLICTING | :252 | `CreateContractAddendumUseCase.ts:59` | PENDENTE — decisão humana |
| BR-JUR-D10 | Pré-condições não financeiras de ativação | CONFIRMED (truthiness DISCOVERED) | :268 | `ActivateContractUseCase.ts:75` | PENDENTE — decisão humana |
| BR-JUR-D11 | Prazo de 15 dias corridos ao titular LGPD | DISCOVERED | :291 | `CreateDataSubjectRequestUseCase.ts:39` | PENDENTE — decisão humana |
| BR-JUR-D12 | Retenção LGPD em texto livre, zero enforcement | UNKNOWN | :309 | `JurLgpdProcessingActivity.ts:27` | PENDENTE — decisão humana |
| BR-JUR-D13 | LGPD: atender é operate, negar é approve | DISCOVERED (composto; DPO UNKNOWN) | :329 | `juridico.ts:151` | PENDENTE — decisão humana |
| BR-SST-D14 | Prazo legal da CAT (Lei 8.213/91) | CONFIRMED (simplificação declarada) | :362 | `legalDeadlineService.ts:30` | PENDENTE — decisão humana |
| BR-SST-D15 | Emissão da CAT; tipo × gravidade sem checagem | DISCOVERED (+ CONFLICTING interno) | :383 | `EmitCatUseCase.ts:48` | PENDENTE — decisão humana |
| BR-SST-D16 | Acidente grave exige investigação e ação corretiva | CONFIRMED | :407 | `CloseAccidentUseCase.ts` (sem linha na fonte) | PENDENTE — decisão humana |
| BR-TI-D17 | Elegibilidade para aprovar solicitação de acesso | CONFIRMED | :422 | `approverEligibilityService.ts:26` | PENDENTE — decisão humana |
| BR-TI-014 | Revelação de chave de licença: duas alçadas | CONFLICTING | :452 | `RevealLicenseKeyUseCase.ts:32` | PENDENTE — decisão humana |
| BR-DIR-D18 | risk_score calculado, nunca aceito do payload | DISCOVERED | :482 | `riskScore.ts:18` | PENDENTE — decisão humana |
| BR-MKT-D19 | Janela 90 dias; SLA dias corridos × úteis | CONFLICTING | :483 | `constants.ts:15` (marketing) | PENDENTE — decisão humana |
| BR-FAC-D20 | Divergência de KM exige justificativa e approve | DISCOVERED | :484 | `TripUseCases.ts:87` | PENDENTE — decisão humana |
| BR-IMP-D21 | Importação exige produtos:operate E bom:operate | DISCOVERED | :485 | `catalogImport.ts:27` | PENDENTE — decisão humana |
| BR-WHK-D22 | Webhooks: HMAC no n8n, comparação simples no focus-nfe | DISCOVERED (+ CONFLICTING interno) | :486 | `webhooks.ts:6` | PENDENTE — decisão humana |

---

## 4. Contagens

**Critério de contagem:** 1 linha = 1 regra com ficha/entrada própria e BR-ID no
arquivo BRC do cluster. Status contado pelo **status principal declarado na ficha**;
estados compostos ficam anotados na linha, sem dupla contagem.

### 4.1 Total geral e por cluster

| Cluster | Regras | CONFIRMED | DISCOVERED | CONFLICTING | UNKNOWN | OBSOLETE_CANDIDATE |
|---|---|---|---|---|---|---|
| identidade-acesso | 39 | 20 | 8 | 8 | 2 | 1 |
| cadastro-suprimentos | 33 | 15 | 12 | 4 | 2 | 0 |
| planejamento-producao | 26 | 14 | 8 | 3 | 0 | 1 |
| qualidade-estoque | 13 | 3 | 7 | 3 | 0 | 0 |
| comercial-financeiro | 29 | 12 | 9 | 8 | 0 | 0 |
| pessoas-governanca | 24 | 8 | 8 | 6 | 1 | 1 |
| **Total** | **164** | **72** | **52** | **32** | **5** | **3** |

### 4.2 Destaques

- **Exigem decisão humana (CONFLICTING + UNKNOWN): 37 regras** (32 + 5) — nenhuma
  é resolvida por este catálogo (Regras 6, 20 e 21 do `CLAUDE.md`).
- **Reconciliação com o passo 29 (~167 linhas):** o passo 29 contou também linhas
  de matriz **sem BR-ID** — 4 módulos rasos de cadastro-suprimentos (categories,
  departments, employees, products), a observação CNAB de comercial-financeiro e a
  linha "não amostrados" de pessoas-governanca — além de contar pessoas-governanca
  como 22 (o placar do próprio BRC) em vez das 24 fichas com ID. Este catálogo
  registra **exclusivamente as 164 regras com ID e ficha própria**; linhas sem ID
  não recebem ID retroativo por agente (Regra 6) e aguardam o fluxo normal.

---

## 5. Colisões e anomalias de numeração

### 5.1 Colisões de BR-ID

**Nenhuma colisão encontrada:** nenhum BR-ID é definido em mais de um arquivo BRC
com conteúdos distintos. Os prefixos de área são disjuntos entre clusters
(convergências temáticas, como BR-IAM-021 × BR-SUP-008 ou BR-CAD-017 × BR-PP-016,
usam IDs distintos e referência cruzada — não são colisão).

### 5.2 IDs fora do padrão `BR-<ÁREA>-<NNN>` (canônicos como estão — sem renumerar)

| ID | Forma | Nota |
|---|---|---|
| BR-PP-016b | sufixo `b` | Desdobramento aditivo de BR-PP-016 feito no passo 26. Precedente aceito de desambiguação aditiva (§2.2 item 3). |
| BR-RH-D01…BR-WHK-D22 | série `D<nn>` | Convenção do BRC pessoas-governanca (`D` = descoberta). A numeração `D01–D22` é **sequencial por cluster, atravessando prefixos** (RH termina em D06, JUR começa em D07, SST em D14 etc.) — não é sequência por prefixo. |
| BR-JUR-003, BR-TI-014 | numéricos isolados | IDs que **já existiam citados no código** e foram adotados pelo passo 26 (convenção §0 do BRC pessoas-governanca). |

**Consequência para numeração futura (regra §2.2 item 2):** nos prefixos com série
`D`, o próximo número livre considera reservados tanto os numéricos quanto os
`D<nn>` já usados no cluster.

### 5.3 IDs citados em código sem ficha própria — números RESERVADOS

O BRC pessoas-governanca menciona, dentro de fichas de outras regras, IDs que o
código do ERP já cita: **BR-JUR-001, BR-JUR-004, BR-JUR-041, BR-JUR-042**
(dentro de BR-JUR-D10 e BR-JUR-D13) e **BR-TI-011** (dentro de BR-TI-D17). Não têm
entrada própria no passo 26, logo **não recebem linha canônica neste catálogo** —
mas seus números ficam **reservados** no respectivo prefixo (nunca reciclados,
§2.2 item 1) até que ganhem ficha própria em passo futuro.

### 5.4 Lacunas de numeração (registradas, não fechadas)

- **JUR:** localizados 003 (ficha), 001/004/041/042 (código, reservados) e D07–D13.
  Os numéricos 002, 005–040 e demais não foram localizados neste passo — lacuna
  registrada; nenhum ID novo pode assumi-los sem verificação prévia contra o código.
- **TI:** localizados 014 (ficha), 011 (código, reservado) e D17. Numéricos 001–010,
  012–013 não localizados — mesma regra.
- Demais prefixos (IAM 001–039, SUP 001–016, CAD 001–017, PP 001–025+016b,
  QE 001–013, COM 001–013, FIS 001–010, CTB 001–002, CTR 001, TES 001,
  FIN 001–002): sequências contíguas, sem lacuna.

### 5.5 Divergências internas dos sumários dos próprios BRC (registradas como estão)

Os placares/sumários de 4 dos 6 BRC **não fecham com as próprias fichas**. Este
catálogo conta por ficha (§4) e registra a divergência sem editar os arquivos-fonte
(Regra 15 — evidência histórica intocada):

| Arquivo BRC | Sumário declara | Fichas existentes |
|---|---|---|
| identidade-acesso | CONFIRMED 18 e CONFLICTING 7 (mas as próprias listas de IDs do sumário têm 20 e 8) | 39 fichas: 20 CONFIRMED, 8 CONFLICTING |
| cadastro-suprimentos | Total 32 | 33 fichas (16 SUP + 17 CAD; o passo 29 também contou 33) |
| comercial-financeiro | "24 regras candidatas" no título do sumário | 29 fichas (a própria tabela do sumário lista 29) |
| pessoas-governanca | Placar §8: 22 regras (8+8+6+3+2 = 27, com dupla contagem de estados compostos) | 24 fichas com ID |

---

## 6. Atribuição de OWNER por área — 100% pendente

Preencher esta tabela é **ato humano registrado** (Regra 18 do `CLAUDE.md`): o dono
atribui os responsáveis reais um a um ou por área, registrando a data. Nenhum agente
preenche, sugere ou infere valor para a coluna OWNER — a coluna sai deste catálogo
inteira como `PENDENTE — decisão humana`, por mandato expresso da APR-2026-019.

| Área | Prefixo | Qtde de regras | OWNER | Data de atribuição |
|---|---|---|---|---|
| Identidade & Acesso | IAM | 39 | PENDENTE — decisão humana | — |
| Cadastro Central | CAD | 17 | PENDENTE — decisão humana | — |
| Cadeia de Suprimentos | SUP | 16 | PENDENTE — decisão humana | — |
| Planejamento & Produção | PP | 26 | PENDENTE — decisão humana | — |
| Qualidade & Estoque | QE | 13 | PENDENTE — decisão humana | — |
| Comercial | COM | 13 | PENDENTE — decisão humana | — |
| Fiscal | FIS | 10 | PENDENTE — decisão humana | — |
| Contabilidade | CTB | 2 | PENDENTE — decisão humana | — |
| Controladoria | CTR | 1 | PENDENTE — decisão humana | — |
| Tesouraria | TES | 1 | PENDENTE — decisão humana | — |
| Financeiro | FIN | 2 | PENDENTE — decisão humana | — |
| Recursos Humanos | RH | 6 | PENDENTE — decisão humana | — |
| Jurídico & LGPD | JUR | 8 | PENDENTE — decisão humana | — |
| Saúde e Segurança do Trabalho | SST | 3 | PENDENTE — decisão humana | — |
| Tecnologia da Informação | TI | 2 | PENDENTE — decisão humana | — |
| Diretoria | DIR | 1 | PENDENTE — decisão humana | — |
| Marketing | MKT | 1 | PENDENTE — decisão humana | — |
| Facilities | FAC | 1 | PENDENTE — decisão humana | — |
| Importação de planilha | IMP | 1 | PENDENTE — decisão humana | — |
| Webhooks | WHK | 1 | PENDENTE — decisão humana | — |

---

*Catálogo produzido pelo `opuscore-business-analyst` sob mandato da APR-2026-019.
Registra o que o passo 26 produziu — não valida regra, não altera status, não
resolve divergência e não atribui OWNER. Os 6 BUSINESS_RULE_CANDIDATES_*.md
permanecem intocados como fonte descritiva.*
