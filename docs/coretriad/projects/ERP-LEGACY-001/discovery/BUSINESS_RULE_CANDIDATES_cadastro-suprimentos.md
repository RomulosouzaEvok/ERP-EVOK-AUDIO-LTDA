# BUSINESS_RULE_CANDIDATES_cadastro-suprimentos.md — ERP-LEGACY-001, Passo 26

```
PROJECT_ID: ERP-LEGACY-001
DOMÍNIOS: D2 Cadastro Central (items, categories, departments, suppliers, clients,
employees, products, bom) + D3 Cadeia de Suprimentos (purchases, purchaseRequisitions,
rfq, comex)
MÉTODO: Read/Grep/Glob apenas. Nenhum comando executado, nenhum banco tocado.
NÃO REPETE: FIND-ERP-001 (idempotência) — fora de escopo por regra 5 do programa.
NADA AQUI É BR OFICIAL: todo item é DISCOVERED_BUSINESS_BEHAVIOR até validação humana
(Regra 3). Nenhuma divergência foi "resolvida" — decidir é do responsável humano (20-21).
```

## 0. Placar

| Status | Qtd | Significado |
|---|---|---|
| `CONFIRMED` | 11 | documentada E implementada, valores batendo |
| `DISCOVERED` | 12 | só no código, sem documento de origem com BR-ID/owner |
| `CONFLICTING` | 5 | código diverge do documento |
| `UNKNOWN` | 3 | comportamento ambíguo, exige decisão humana |
| `OBSOLETE_CANDIDATE` | 1 | artefato existe, código não usa |
| **Total** | **32** | |

Regras críticas sem teste dedicado: 8. Regras sem OWNER nomeado: **32 de 32** — nenhum
artefato do repositório atribui dono a regra de negócio. Ver §4.

---

## 1. Cadeia de Suprimentos (D3)

### BR-SUP-001 — Alçada de compra nacional: teto de R$ 500.000
```
NAME: Pedido NACIONAL acima de R$ 500.000 exige aprovação do papel `diretor`
DESCRIPTION: Até R$ 500.000 (inclusive) segue direto. Acima, exige aprovação prévia em
             `purchase_order_approvals` com `approver_role='diretor'`. É "acima de", não
             "a partir de".
ORIGIN: PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md:130-133 (decisão D-C do dono, 2026-08-10).
        Sem BR-ID formal — identificada por "D-C"/"G11".
OWNER: ❌ AUSENTE  |  VALIDITY: desde 2026-08-10  |  PRIORITY: CRÍTICA
CONDITIONS: origin efetiva='national' AND (total_amount + freight_value) > 500000
IMPLEMENTATION: purchases/domain/constants.ts:74 (PURCHASE_APPROVAL_THRESHOLD_DIRECTOR),
                :162-176 (requiredApproverRoles); ChangePurchaseStatusUseCase.ts:172-217
RELATED_REQUIREMENTS: RF-COM-05 (DOCUMENTO_DE_REQUISITOS.md:73)
RELATED_TESTS: purchase-approval-authority.test.ts:84-88 (500000→[]; 500000.01→['diretor'])
STATUS: CONFIRMED
```
**Valor documentado em 6 artefatos independentes = implementado = testado.** O teste cobre
a borda discriminante (500000 vs 500000.01) — diferente do caso SIM-002, em que o teste era
cego à divergência.

### BR-SUP-002 — Importação exige a diretoria em qualquer valor
```
DESCRIPTION: Não há faixa de valor; `diretor` é sempre exigido, inclusive R$ 0,00.
ORIGIN: PLANO_ACAO...:133 (D-C)  |  OWNER: ❌  |  PRIORITY: CRÍTICA
IMPLEMENTATION: constants.ts:169 (`if (origin === 'import') return ['diretor'];`)
RELATED_TESTS: purchase-approval-authority.test.ts:90-94; purchase-origin-foreign-supplier.test.ts:206-221
STATUS: CONFIRMED
```

### BR-SUP-003 — Origem efetiva é escalation-only
```
NAME: origem efetiva = purchase_orders.origin=='import' OU suppliers.is_foreign==true
DESCRIPTION: A declaração feita no pedido (que o comprador controla) só torna a alçada MAIS
             restritiva. Marcar 'national' num pedido de fornecedor estrangeiro não escapa
             da diretoria.
ORIGIN: PLANO_ACAO...:147-155; 04-USE_CASES.md:396-401  |  OWNER: ❌  |  PRIORITY: CRÍTICA
CONDITIONS: avaliada em 3 pontos — criação, registro de alçada, mudança de status
EXCEPTIONS: `origin` nulo (pedido legado) → tratado como 'national'
IMPLEMENTATION: constants.ts:107-114; CreatePurchaseUseCase.ts:70-113;
                ApprovePurchaseUseCase.ts:102; ChangePurchaseStatusUseCase.ts:199;
                UpdatePurchaseUseCase.ts:70-75; UpdateSupplierUseCase.ts:48-64
RELATED_TESTS: purchase-approval-authority.test.ts:96-104; purchase-origin-foreign-supplier.test.ts
STATUS: CONFIRMED
```

### BR-SUP-004 — Base de cálculo do valor comparado com o teto
```
NAME: Valor da alçada = total_amount (mercadoria) + freight_value (frete), SEM impostos
DESCRIPTION: Soma frete para fechar o desvio de dividir R$ 520.000 em R$ 499.000 de
             mercadoria + R$ 21.000 de frete. Consequência aceita: o valor da alçada é MAIOR
             que o da AccountPayable gerada (que usa só total_amount).
ORIGIN: ⚠️ NENHUM documento de decisão. constants.ts:20-32 se autodeclara "decisão desta
        implementação". Os documentos apenas REPLICAM o texto do código (circular).
OWNER: ❌  |  PRIORITY: ALTA
EXCEPTIONS: campos nulos/não numéricos → 0 (purchaseApprovalValue, constants.ts:185-189)
IMPLEMENTATION: purchases/domain/constants.ts:185-189
RELATED_TESTS: ❌ AUSENTE — nenhum teste exercita a soma na fronteira (499.000+21.000=520.000
               deve exigir diretor). Os testes passam o valor já somado.
STATUS: DISCOVERED — regra de impacto financeiro direto criada pela implementação, não por
        decisão registrada. Lacuna de cobertura: regra crítica sem teste.
```

### BR-SUP-005 — Incoerência origem declarada × cadastro do fornecedor
```
NAME: origin='import' com fornecedor is_foreign=false → 422 G11-ORIGIN-SUPPLIER-MISMATCH
DESCRIPTION: Única combinação incoerente das 4. `national` + is_foreign=true NÃO é erro:
             a origem é reescrita para 'import' (o cadastro prevalece).
ORIGIN: auditoria interna 2026-08-11 (sem documento de decisão do dono)  |  OWNER: ❌
VALIDITY: código diz 2026-08-11 · RF-COM-05 diz "Desde 2026-08-12"  |  PRIORITY: ALTA
IMPLEMENTATION: constants.ts:88, :143-152; CreatePurchaseUseCase.ts:70-84;
                ChangePurchaseStatusUseCase.ts:184-197
RELATED_TESTS: purchase-approval-authority.test.ts:106-120; purchase-origin-foreign-supplier.test.ts
STATUS: CONFIRMED com divergência menor de vigência (data 08-11 × 08-12) — não afeta o valor
        da regra, afeta a rastreabilidade da vigência.
```

### BR-SUP-006 — Congelamento dos campos que determinam a alçada
```
NAME: Pedido `approved` não aceita alteração de supplier_id, freight_value, origin
DESCRIPTION: Sem isso daria para aprovar R$ 450.000 sem diretoria e depois acrescentar
             R$ 100.000 de frete, ou trocar por fornecedor estrangeiro.
ORIGIN: ⚠️ decisão de implementação (UpdatePurchaseUseCase.ts:13-20)  |  OWNER: ❌
PRIORITY: ALTA (anti-burla)
IMPLEMENTATION: UpdatePurchaseUseCase.ts:20, :79-87
STATUS: DISCOVERED — regra anti-burla real, sem documento de origem próprio.
```

### BR-SUP-007 — ⚠⚠ Segregação de função: aprovador ≠ solicitante (D-K)
```
NAME: Quem registrou o documento não pode aprová-lo, em 4 pontos
DESCRIPTION: Vale para requisição, pedido, alçada da diretoria e importação COMEX.
             `role='admin'` NÃO é exceção — é a única regra do ERP sem curto-circuito de admin.
ORIGIN: decisão D-K do dono, 2026-08-10  |  OWNER: ❌  |  PRIORITY: CRÍTICA
CONDITIONS: requesterUserId === approverUserId (ambos não nulos)
EXCEPTIONS: solicitante desconhecido (NULL) → não bloqueia (fail-open deliberado e justificado)
IMPLEMENTATION: shared/domain/segregationOfDuties.ts:75-149;
                ChangePurchaseStatusUseCase.ts:134-140; ApprovePurchaseUseCase.ts:86-92;
                ChangePurchaseRequisitionStatusUseCase.ts:104-110
RELATED_TESTS: purchase-segregation-of-duties.test.ts; purchase-origin-foreign-supplier.test.ts:215-221
STATUS: CONFLICTING
```
**Não no valor da regra, mas na EXISTÊNCIA dela segundo os documentos normativos:**

| Artefato | Afirmação |
|---|---|
| `segregationOfDuties.ts` + 3 use cases | implementada, sem exceção para admin |
| `docs/suprimentos/01-COMPRAS.md:48-66` | "agora é regra **no código**" ✅ bate |
| `DOCUMENTO_DE_REQUISITOS.md:70` (RF-COM-02) | `[IMPLEMENTADO]`, D-K ✅ bate |
| **`PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md:136-142`** | "o código entregue **não implementa segregação em nenhum ponto**; o critério da §5 continua **não atendido de propósito**" ❌ **contradiz** |
| **`docs/governance/TODO.md:5271-5274`** | "**[PENDENTE] Sem segregação de função** — decisão explícita do dono. Abaixo de R$ 500.000 no nacional, quem solicita pode aprovar" ❌ **contradiz** |

O plano de ação é o documento que carrega as decisões D-C/D-G/D-K do dono — a fonte mais
autoritativa do conjunto — e é justamente ele que continua dizendo que a regra não existe.
Duas versões da mesma regra convivem em artefatos versionados. **Decisão humana (20-21).**

### BR-SUP-008 — ⚠ Nível de permissão exigido para registrar a alçada
```
NAME: POST /api/purchases/:id/approve exige apenas PRESENÇA do módulo `diretor`, não nível `approve`
DESCRIPTION: A rota usa authorizeModule('diretor') (requiredLevel default='operate'), e o
             middleware só discrimina nível quando requiredLevel==='approve'. Qualquer nível
             gravado para o módulo `diretor` autoriza o ato de alçada.
ORIGIN: docs/business/BUSINESS_RULES.md §1 (matriz V/O/A) e §4  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: purchases/presentation/routes/purchases.ts:48;
                middlewares/auth.ts:213-215 (default 'operate'), :258-284 (só 'approve' discrimina);
                purchaseController.ts:51-55 (`return user?.permissions?.diretor ? ['diretor'] : []`
                — truthy, sem comparar nível)
RELATED_TESTS: ❌ AUSENTE
STATUS: CONFLICTING
```
**Três camadas discordam:** (1) a docstring do próprio middleware (`auth.ts:192-193`) diz
"permite se `permissions[module] IN ('operate','approve')`", mas a implementação permite
**qualquer** valor truthy; (2) `BUSINESS_RULES.md` §1:13-18 define três níveis (`V`/`O`/`A`);
(3) código e banco não modelam `view` — `AccessModuleLevel = 'operate' | 'approve'` e o ENUM
tem só `('operate','approve')`. **Consequência: toda linha da matriz marcada `V` é hoje
inexprimível.** (Convergente com BR-IAM-021 do domínio Identidade & Acesso.)

### BR-SUP-009 — ⚠ `admin` é tratado como se tivesse o papel `diretor`
```
DESCRIPTION: Curto-circuito duplo: (a) authorizeModule libera admin antes de qualquer
             checagem; (b) resolveAvailableApproverRoles devolve ['diretor'] para admin.
ORIGIN: comentário de código (purchaseController.ts:45-46) e BUSINESS_RULES.md §3
OWNER: ❌  |  PRIORITY: ALTA
EXCEPTIONS: a segregação D-K (BR-SUP-007) NÃO isenta admin — os dois controles divergem
            deliberadamente quanto ao admin
IMPLEMENTATION: purchaseController.ts:51-55; middlewares/auth.ts:226-229
RELATED_TESTS: ❌ AUSENTE. `server/tests/helpers/testApi.ts:45` documenta que o usuário de
               teste é `role:'admin'` "o que lhe da tambem a alcada de diretoria exigida" —
               ou seja, **a suíte de integração roda SEMPRE com o curto-circuito ligado**.
STATUS: DISCOVERED
```
**Observação de método grave:** como todos os testes de integração autenticam como `admin`,
**nenhum teste de integração exercita a alçada por permissão real** — só pelo curto-circuito.
`TODO.md:5273` reconhece o fato.

### BR-SUP-010 — Requisição de compra não tem alçada por valor
```
DESCRIPTION: pending→approved exige apenas nível `approve` no módulo `requisicoes` + D-K.
             Nenhuma faixa de valor, nenhum papel adicional, em qualquer montante.
ORIGIN: ❌ NENHUM documento afirma nem nega  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: ChangePurchaseRequisitionStatusUseCase.ts:62-117
RELATED_TESTS: cobertura da transição existe; ❌ nenhum teste afirma a AUSÊNCIA de alçada
STATUS: DISCOVERED
```
**Assimetria relevante:** uma requisição de R$ 5 milhões é aprovável por qualquer usuário com
`requisicoes: approve`, e a diretoria só é convocada no pedido. Pode ser intencional (a alçada
mora no compromisso, não no pedido interno) — **exige confirmação do dono**.

### BR-SUP-011 — ⚠ Mínimo de 3 cotações por material
```
DESCRIPTION documentada: "Solicitar mínimo 3 cotações para cada material"
ORIGIN: docs/suprimentos/01-COMPRAS.md:9 (tabela de funções) e :25 (fluxograma, "Cotação (mínimo 3)")
OWNER: departamento COMP — único caso do lote com algo próximo de um dono, ainda assim um
       departamento, não um papel responsável pela regra
PRIORITY: ALTA (compliance de processo / prevenção de favorecimento)
CONDIÇÕES implementadas: supplier_ids array `.min(1)` no convite; `awards` `.min(1)` na
                         adjudicação; NENHUMA verificação de quantidade de cotações recebidas
IMPLEMENTATION: rfq/presentation/validators/rfqValidators.ts:39 (`.min(1)`), :64;
                AwardRfqUseCase.ts:108-129 (valida status, duplicidade, existência de
                cotação para o par item/fornecedor — nunca a CONTAGEM)
RELATED_TESTS: ❌ AUSENTE
STATUS: CONFLICTING — documento diz 3, código aceita 1.
```
É o padrão exato do §19 do Master Spec (requisito diz X, código aplica Y). Além disso,
`ConvertRequisitionToPurchaseOrdersUseCase` gera pedido **sem RFQ nenhuma** — **zero** cotações.
Nenhum lado tem teste. → **CANDIDATO A FINDING FORMAL** (MEDIUM/CONFIRMED).

### BR-SUP-012 — Critério de escolha do vencedor da RFQ
```
DESCRIPTION: `awards[] = {rfq_item_id, supplier_id}` — quem adjudica escolhe livremente
             qualquer fornecedor que tenha cotado. O sistema não compara preços, não exige
             que o vencedor seja o menor preço, não exige justificativa quando não é, e não
             exige aprovação da adjudicação.
ORIGIN: 01-COMPRAS.md:28-31 documenta "Análise Técnica + Comercial" → "Escolha do Fornecedor"
        sem definir critério nem aprovador  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: rfq/application/use-cases/AwardRfqUseCase.ts:108-139
RELATED_TESTS: ❌ AUSENTE
STATUS: DISCOVERED (vazio de regra)
```
Combinado com BR-SUP-011, **a cadeia cotação→pedido não tem controle de competitividade em
nenhum ponto**.

### BR-SUP-013 — Pedido gerado por RFQ/conversão nasce `national`
```
DESCRIPTION: AwardRfqUseCase e ConvertRequisitionToPurchaseOrdersUseCase criam pedido sem
             informar `origin` → fica 'national' pelo DEFAULT. Seguro para fornecedor
             estrangeiro (is_foreign prevalece), mas IMPORTAÇÃO POR CONTA E ORDEM via trading
             nacional nasce nacional e precisa ser corrigida à mão.
ORIGIN: TODO.md:5282-5289 (PENDENTE em aberto)  |  OWNER: ❌  |  PRIORITY: MÉDIA
EXCEPTIONS: corrigível por PUT /api/purchases/:id enquanto `pending`
RELATED_TESTS: ❌ AUSENTE
STATUS: CONFIRMED como lacuna conhecida (documentada, não remediada)
```
Mesma classe de "regra com múltiplas implementações divergentes": `CreatePurchaseUseCase`
resolve origem efetiva, os outros dois criadores de pedido não.

### BR-SUP-014 — Gate COMEX: diretoria na transição `draft → shipped`
```
DESCRIPTION: Sem faixa de valor. Ponto de gate é o embarque, último instante em que se
             desiste sem custo afundado.
ORIGIN: decisão D-G do dono, 2026-08-10  |  OWNER: ❌  |  PRIORITY: CRÍTICA
        (existem importações de ~R$ 1 milhão — PLANO_ACAO...:135)
IMPLEMENTATION: comex/domain/constants.ts:44-96
STATUS: CONFIRMED
```

### BR-SUP-015 — Congelamento monetário no embarque (COMEX)
```
DESCRIPTION: exchange_rate, freight_value, insurance_value, other_expenses_value congelam em
             `shipped`. `arrived`/`customs_cleared` continuam aceitando (despesas aduaneiras
             reais só existem depois).
ORIGIN: decisão de implementação (comex/domain/constants.ts:59-76)  |  OWNER: ❌
IMPLEMENTATION: comex/domain/constants.ts:77-82
STATUS: DISCOVERED — pendência de validação com o dono registrada em comex/README.md:81-82
```

### BR-SUP-016 — ⚠ Fail-open da alçada em valor não numérico
```
DESCRIPTION: `requiredApproverRoles` avalia `if (Number.isNaN(numericValue) || numericValue
             <= THRESHOLD) return []` — NaN cai no MESMO ramo de "abaixo do teto".
ORIGIN: ❌ nenhum documento discute o caso degenerado  |  OWNER: ❌  |  PRIORITY: MÉDIA
        (mitigada na prática: colunas NUMERIC chegam como string numérica)
IMPLEMENTATION: constants.ts:171-175, :185-189
RELATED_TESTS: ❌ AUSENTE
STATUS: UNKNOWN — um controle de autorização diante de dado corrompido deveria ser
        fail-closed; hoje é fail-open silencioso. Exige decisão humana.
```

---

## 2. Cadastro Central (D2)

### BR-CAD-001 — CNPJ de fornecedor: validação, normalização e unicidade
```
DESCRIPTION: CNPJ obrigatório, DV validado (algoritmo completo, rejeita repetidos como
             111...), gravado só com dígitos, único. Violação → 409 'CNPJ já cadastrado'.
ORIGIN: suppliers/README.md:65-67, :105-109; API.md:2935  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: CreateSupplierUseCase.ts:31-36, :56-60; utils/validators.ts:76-96, :101-115;
                00_baseline_frozen.sql:18319-18323 (suppliers_cnpj_key UNIQUE); Supplier.ts:45
RELATED_TESTS: clients-suppliers-financial-bom-validation.test.ts:88-92
STATUS: CONFIRMED
```
**Duas observações sobre normalização** (resposta direta ao escopo): (1) a unicidade do banco
é sobre a **coluna crua**, sem índice funcional — a normalização acontece só na aplicação.
Há um único caminho de escrita (`SequelizeSuppliersRepository.ts:41`), sem `bulkCreate`/import
— hoje íntegro, mas linha carregada por seed/SQL com CNPJ formatado conviveria com a mesma
empresa em dígitos. (2) `cnpj` **não é alterável** por `PUT` (fora de ALLOWED_FIELDS) —
corrigir CNPJ errado exige ação direta no banco.

### BR-CAD-002 — ⚠ Fornecedor estrangeiro precisa de CNPJ brasileiro válido
```
DESCRIPTION: `is_foreign = true` NÃO dispensa CNPJ com DV brasileiro válido. Não há ramo para
             estrangeiro (nem VAT, nem EIN, nem campo de país — o cadastro tem apenas `state`/UF).
ORIGIN: ❌ NENHUM documento afirma isso. TODO.md:5261 registra o efeito: "Nenhum dado atual
        permite inferir isso (o `cnpj` é obrigatório para todos)".
OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: CreateSupplierUseCase.ts:31-34 (sem condicional sobre is_foreign);
                supplierValidators.ts:9
RELATED_TESTS: ❌ AUSENTE — o teste que cadastra estrangeiro usa CNPJ brasileiro válido.
STATUS: UNKNOWN
```
**Contradição interna do modelo:** a regra de alçada (BR-SUP-002) existe para importação, mas
o cadastro do fornecedor estrangeiro só é possível fabricando um CNPJ brasileiro válido. Ou
(a) todo "estrangeiro" da Evok é trading nacional (importação por conta e ordem) — regra certa
e mal documentada; ou (b) o cadastro impede representar o fornecedor estrangeiro real.
**Pergunta objetiva ao dono, não decidível por leitura de código.**

### BR-CAD-003 — `is_foreign` é declaração obrigatória na criação
```
DESCRIPTION: Criar fornecedor sem declarar is_foreign é 400. `z.boolean()` deliberadamente
             NÃO `z.coerce.boolean()` (a coerção transformaria "false" em true). Era opcional
             com DEFAULT false: estrangeiro nascia nacional em silêncio e a alçada de
             importação simplesmente não acontecia.
ORIGIN: auditoria 2026-08-11  |  OWNER: ❌  |  PRIORITY: CRÍTICA
IMPLEMENTATION: suppliers/presentation/validators/supplierValidators.ts:34-37
RELATED_TESTS: purchase-origin-foreign-supplier.test.ts:104-118
STATUS: CONFIRMED
```

### BR-CAD-004 — `is_foreign` é escalation-only na edição
```
DESCRIPTION: Marcar como estrangeiro é livre; DESMARCAR é recusado (422, G11). Reverter exige
             ação direta no banco. Desmarcar seria a forma mais silenciosa de tirar TODOS os
             pedidos daquele fornecedor da alçada obrigatória.
ORIGIN: API.md:2957  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: UpdateSupplierUseCase.ts:53-64
STATUS: CONFIRMED
```

### BR-CAD-005 — Fornecedores legados com `is_foreign = false` por omissão
```
NAME: Backfill de is_foreign nos fornecedores anteriores a 2026-08-11 — PENDENTE
DESCRIPTION: A obrigatoriedade vale só para criação NOVA. Não existe migration de backfill
             nem varredura; nenhum dado permite inferir estrangeiro (CNPJ obrigatório para
             todos — BR-CAD-002).
ORIGIN: PLANO_ACAO...:154-155; TODO.md:5260-5264 ("Responsável: Suprimentos")
OWNER: "Suprimentos" — departamento, sem pessoa; item marcado `[ ]` (aberto)
PRIORITY: ALTA — enquanto aberta, um pedido de importação a fornecedor legado só cai na
          alçada se quem cria marcar origin='import' À MÃO; a fonte "que o comprador não
          controla" (BR-SUP-003) está desarmada para a base legada
IMPLEMENTATION: ❌ NENHUMA. Grep de is_foreign em *.cjs/*.sql retorna apenas a definição de
                coluna — nenhum UPDATE de backfill.
STATUS: CONFIRMED como pendência aberta
```
**Confirmação solicitada no escopo:** a regra atual **está correta e fechada para cadastros
novos**; a exposição residual é **exclusivamente de DADO legado**, sem remediação implementada.
Volume de linhas afetadas **desconhecido** — verificar exigiria consulta ao banco, proibida
(PRODUÇÃO REAL, APR-2026-016).

### BR-CAD-006 — Campos não alteráveis do fornecedor via API
```
DESCRIPTION: PUT não altera `cnpj` nem `status`. `rating` nasce sempre 3 e `status` sempre
             'active'. `quality_score` NUNCA editável via API (recalculado por RNC).
ORIGIN: suppliers/README.md:114; API.md:2935, :2955  |  OWNER: ❌  |  PRIORITY: MÉDIA
IMPLEMENTATION: UpdateSupplierUseCase.ts:10-15; CreateSupplierUseCase.ts:50-51; Supplier.ts:60-66
STATUS: DISCOVERED
```

### BR-CAD-007 — CPF/CNPJ de cliente: documento polimórfico
```
DESCRIPTION: cpf_cnpj obrigatório, DV validado por tamanho (11=CPF, 14=CNPJ), dígitos apenas,
             único. Outro tamanho → erro "Documento com N dígitos. CPF=11, CNPJ=14".
ORIGIN: clients/README.md:80-83, :121-124  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: CreateClientUseCase.ts:34-44, :78; UpdateClientUseCase.ts:54;
                utils/validators.ts:101-115; 00_baseline_frozen.sql:16599-16603
RELATED_TESTS: clients-suppliers-financial-bom-validation.test.ts:79-83
STATUS: CONFIRMED — mesma ressalva de BR-CAD-001 (unicidade sobre coluna crua)
```

### BR-CAD-008 — Código de item único
```
DESCRIPTION: items.codigo único — 409. Verificação na aplicação + UNIQUE no banco
             (constraint E índice único redundantes).
ORIGIN: ❌ nenhum documento de regra  |  OWNER: ❌  |  PRIORITY: ALTA
        (o crosswalk products.code = items.codigo sustenta BOM, MRP, RFQ e COMEX)
CONDITIONS: comparação EXATA, sensível a caixa, sem normalização (apenas `.trim()`)
IMPLEMENTATION: CreateItemUseCase.ts:28-31; 00_baseline_frozen.sql:17279-17283, :19962-19965
STATUS: DISCOVERED, com ponto aberto UNKNOWN: `ABC-100` e `abc-100` são dois itens distintos
        e ambos aceitos; como o crosswalk é literal, divergência de caixa quebra a ligação
        item↔produto silenciosamente. Nenhum documento decide se é case-insensitive.
```

### BR-CAD-009 — Item cria produto-gêmeo na mesma transação
```
DESCRIPTION: Criar item garante o `products` gêmeo (crosswalk) atomicamente. Sem isso o item
             ficava invisível para RFQ→pedido, requisição→pedido e COMEX (422 no crosswalk).
             Vale para TODOS os tipos, inclusive USO_E_CONSUMO e ATIVO_IMOBILIZADO.
ORIGIN: "diagnóstico do catálogo duplo", 2026-08-12 — sem doc de decisão  |  OWNER: ❌
PRIORITY: ALTA (é a costura entre os DOIS catálogos que o ERP mantém)
IMPLEMENTATION: CreateItemUseCase.ts:33-58; services/itemProductMirrorService.ts
RELATED_TESTS: item-product-mirror.test.ts
STATUS: DISCOVERED
```

### BR-CAD-010 — BOM só existe para produto acabado
```
DESCRIPTION: BomService.createBOM recusa (400) produto com product_type !== 'finished'
ORIGIN: ❌ nenhum documento  |  OWNER: ❌  |  PRIORITY: MÉDIA
EXCEPTIONS: subconjunto com BOM própria também é 'finished' (caso REPARO — BR-CAD-017)
IMPLEMENTATION: services/bomService.ts:203-208
STATUS: DISCOVERED
```

### BR-CAD-011 — Ciclo em estrutura de produto: barrado na escrita
```
DESCRIPTION: Auto-referência (G1-BOM-AUTO-REF) e ciclo MULTINÍVEL (G1-BOM-CICLO) recusados ao
             gravar. Antes da aresta pai→componente, pergunta-se: já existe caminho
             componente→pai? A detecção roda no espaço de products.id de propósito — a
             projeção em UUID depende do crosswalk e produto sem item correspondente sumiria
             do grafo, deixando o ciclo passar onde o cadastro está mais incompleto.
ORIGIN: auditoria G1 2026-08-11 — sem doc de decisão do dono  |  OWNER: ❌  |  PRIORITY: CRÍTICA
EXCEPTIONS: ⚠️ não reavaliado em alteração posterior — UpdateBOMUseCase só toca
            revision/notes/status. Como BOM ativa é imutável (BR-CAD-013), toda mudança de
            estrutura passa por createBOM; a guarda cobre 100% do caminho HTTP atual.
IMPLEMENTATION: bomService.ts:220-234, :245-278; defesa em profundidade: :455, :477-482
RELATED_TESTS: bom-cycle-multilevel.test.ts; bom-create-revision-rules-g1.test.ts
STATUS: CONFIRMED
```
**Observação técnica não elevada a finding:** em `explodeBOM` o conjunto de ancestrais nasce
com `new Set([productId])`, onde `productId` chega como parâmetro de rota (string), enquanto
`item.component_product_id` é numérico — a comparação `ancestorPath.has(...)` no nível 1 pode
não casar por tipo (`bomService.ts:455` vs `:477`). É a **segunda** linha de defesa; a
primeira (`:226`) compara com `String()` dos dois lados e está correta.

### BR-CAD-012 — Revisão de BOM duplicada é recusada
```
DESCRIPTION: Já existir revisão com o mesmo rótulo para o produto (status ≠ inactive) → 409
             G1-BOM-REV-DUP. Duas com o mesmo rótulo tornam impossível dizer contra qual delas
             uma OP rodou.
ORIGIN: ISO 9001 §8.5.6 citada no código — norma externa, sem BR interna  |  OWNER: ❌
PRIORITY: ALTA (rastreabilidade OP↔estrutura)
IMPLEMENTATION: bomService.ts:281-298
RELATED_TESTS: bom-create-revision-rules-g1.test.ts
STATUS: DISCOVERED (origem é norma externa, não decisão registrada do dono)
```

### BR-CAD-013 — Uma única BOM ativa por produto; ativa e superseded imutáveis
```
DESCRIPTION: Criar revisão nova rebaixa a ativa anterior para `superseded` DENTRO da mesma
             transação. BOM `active` é imutável no conteúdo (G1-BOM-ATIVA-IMUTAVEL);
             `superseded` é intocável e não pode ser reativada; de `active` só se vai para
             `inactive` ou `superseded` — nunca de volta a `draft`.
ORIGIN: G1, 2026-08-10 — decisão de implementação  |  OWNER: ❌  |  PRIORITY: CRÍTICA
        (com duas ativas, findOne({status:'active'}) devolve revisão ARBITRÁRIA para
        explosão, reserva e custeio)
IMPLEMENTATION: bomService.ts:308-313; UpdateBOMUseCase.ts:114-157; ApproveBOMUseCase.ts:46-59;
                SequelizeBOMRepository.activateExclusively
RELATED_TESTS: bom-engineering-change-control-g1.test.ts; bom-single-source-g1.test.ts
STATUS: CONFIRMED
```

### BR-CAD-014 — ⚠⚠ Quem aprova a estrutura de produto: NINGUÉM
```
NAME: Não existe ato de aprovação de BOM — ela NASCE vigente
DESCRIPTION: POST /api/engineering/bom cria a BOM já com status:'active', rebaixando a
             anterior. `approved_by` e `approval_date` existem no modelo e no banco e NUNCA
             são preenchidos por nenhum caminho. Não há rota de aprovação.
ORIGIN: ❌ nenhuma regra documentada. bom/README.md:212-215 registra honestamente: "Não há
        workflow formal de aprovação" e "qualquer usuário autenticado pode
        criar/aprovar/inativar BOMs".
OWNER: ❌ (a matriz BUSINESS_RULES.md:45 prevê `bom = A` para Engenheiro, nível que não é
       exigido por nenhuma rota — ver BR-SUP-008)
PRIORITY: ALTA — a estrutura define consumo, custo e MRP; entra em vigor sem segundo par de
          olhos, em contraste direto com BR-SUP-007, que exige aprovador ≠ solicitante para
          COMPRAR o material
IMPLEMENTATION: bomService.ts:314-322 (status:'active' na criação, sem approved_by);
                models/BillOfMaterial.ts:49-50 (colunas nunca escritas);
                routes/bom.ts:19-34 (nenhuma rota /approve)
RELATED_TESTS: ❌ AUSENTE
STATUS: CONFLICTING
```
O repositório contém `ApproveBOMUseCase.ts` (70 linhas, **testado**) que **não está ligado a
nenhuma rota** — `bom/README.md:61,208-211` confirma. Regra implementada **duas vezes com
semânticas diferentes** (criação = ativação automática × use case de aprovação isolada), com
uma das implementações inalcançável por HTTP. `approved_by`/`approval_date` são **campos-
fantasma**: o esquema promete um aprovador que o sistema nunca registra.
`ApproveBOMUseCase` como artefato de rota: **OBSOLETE_CANDIDATE**.

### BR-CAD-015 — Profundidade máxima da estrutura = 10
```
DESCRIPTION: bom_level entre 1 e 10; explosão e árvore param em profundidade 10 com 422.
ORIGIN: ❌ nenhum documento justifica o número 10  |  OWNER: ❌  |  PRIORITY: BAIXA
CONDITIONS: dois valores 10 em arquivos DIFERENTES, não compartilhados: BOMEntity.ts:4
            (MAX_BOM_LEVEL) e bomService.ts:148 (MAX_BOM_DEPTH)
IMPLEMENTATION: BOMEntity.ts:4, :72-75; bomService.ts:148, :459-464, :757
STATUS: DISCOVERED — mesma constante de negócio duplicada em dois arquivos sem fonte única;
        mudar um e esquecer o outro produz divergência silenciosa.
```
Regras vizinhas na mesma entidade, também sem documento: componente duplicado no mesmo nível
é recusado (`BOMEntity.ts:77-81`) e `scrap_percentage` deve ficar entre 0 e 100 (`:67-70`).

### BR-CAD-016 — Tipos de item que nunca entram em estrutura de produto
```
DESCRIPTION: USO_E_CONSUMO (MRO) e ATIVO_IMOBILIZADO não podem ser pai nem componente de BOM
             (422 G1-BOM-TIPO-NAO-PRODUTIVO). Um item desses na BOM faria o MRP planejar
             compra de imobilizado por demanda de produção e a OP consumir/custear um bem que
             não é insumo.
ORIGIN: decisão de implementação — sem doc do dono  |  OWNER: ❌  |  PRIORITY: ALTA
IMPLEMENTATION: bomService.ts:51-92, :216, :243
RELATED_TESTS: bom-tipo-nao-produtivo.test.ts
STATUS: CONFIRMED (implementada, testada e descrita no código; falta o lado "documentado")
```

### BR-CAD-017 — Subconjunto estocável × fantasma (G18)
```
DESCRIPTION: is_phantom decide até onde a explosão desce — não "ter BOM própria".
             false (padrão) = subconjunto ESTOCÁVEL: a explosão para nele (caso REPARO da
             Evok, vendido no balcão e montado no alto-falante). true = agrupamento de
             engenharia: desce e o pai consome os filhos.
ORIGIN: G18, 2026-08-10 — decisão do dono citada como "G18"; sem BR-ID  |  OWNER: ❌
PRIORITY: CRÍTICA (a mesma explosão governa reserva na liberação da OP, baixa de lote e
          custeio na conclusão)
EXCEPTIONS: marcado fantasma SEM BOM ativa → vira folha (seguro) e o problema aparece em
            errors[] da resposta, sem interromper
IMPLEMENTATION: bomService.ts:121-129, :489-528
RELATED_TESTS: bom-two-level-reparo.test.ts
STATUS: CONFIRMED
```

---

## 3. Cobertura rasa registrada como tal

Módulos com cobertura deliberadamente rasa nesta rodada, por baixo risco financeiro/de
autorização relativo: `categories`, `departments`, `employees`, `products` (coberto
indiretamente via BOM e crosswalk). Único achado: `departments` tem CRUD com unicidade de
código convertida em `ConflictError`, e o organograma tem guarda de consistência seeds↔doc —
**não auditado em profundidade**. `employees` tem 0 registros em base real, o que torna
qualquer regra dele não observável por dado.

---

## 4. O que este passo NÃO conseguiu determinar (Regra 21 — escalar ao director)

1. **Nenhuma regra do escopo tem OWNER em artefato versionado.** 32/32. As decisões críticas
   são atribuídas a "o dono do produto" em prosa, sem papel, sem assinatura, sem registro de
   aprovação no formato exigido por CLAUDE.md 16-17. Não há catálogo de BR-IDs: os
   identificadores em uso (`G1`, `G11`, `G18`, `D-C`, `D-G`, `D-K`) são rótulos de
   *gap*/*decisão*, e **nenhum artefato os enumera de forma canônica**.
2. **Fonte autoritativa indeterminável para BR-SUP-007** (segregação): plano de ação e TODO
   dizem "não implementado / pendente"; código, requisitos e doc de suprimentos dizem
   "implementado".
3. **BR-CAD-002** (CNPJ brasileiro obrigatório para fornecedor estrangeiro): não é possível
   saber por código se é regra correta ou defeito de modelagem.
4. **BR-CAD-005**: volume de fornecedores legados afetados não medido — exigiria consulta ao
   banco, proibida.
5. **BR-SUP-011** (3 cotações) é a divergência valor-documentado × valor-implementado mais
   limpa do lote (3 × 1) e deveria virar finding formal com validação.

## 5. Regras críticas sem teste automatizado

| Regra | Por que importa | Teste |
|---|---|---|
| BR-SUP-004 | define o valor que dispara a alçada (mercadoria+frete) | ❌ |
| BR-SUP-008 | nível de permissão que autoriza a alçada | ❌ |
| BR-SUP-009 | admin satisfaz a alçada sozinho — e é o usuário de TODA a suíte de integração | ❌ |
| BR-SUP-011 | mínimo de cotações (documentado 3) | ❌ |
| BR-SUP-012 | critério de adjudicação | ❌ |
| BR-SUP-016 | fail-open da alçada em valor não numérico | ❌ |
| BR-CAD-002 | fornecedor estrangeiro sem CNPJ brasileiro | ❌ |
| BR-CAD-014 | quem ativa uma estrutura de produto | ❌ |

---

*Produzido pelo agente `vericore-business-rule-auditor` em modo read-only reforçado
(Read/Grep/Glob apenas; sem Bash, sem banco, sem Write nesta sessão). Nenhuma regra aqui é
oficial até validação humana. Conteúdo persistido pelo orquestrador, sem edição.*
