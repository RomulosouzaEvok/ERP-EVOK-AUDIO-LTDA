# T-40 — Validação adversarial de `AUD-RH-COMISSAO-01`

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-40` (validação de `AUD-RH-COMISSAO-01` — último HIGH do run sem veredito, 98/98) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Natureza | Auditoria **estática** — refutação ativa (Regra 22, §22 Master Spec) |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`. |
| Artefatos não alterados | `AUD-RH-COMISSAO-01.md`, `AUD-RH-VTHORISTA-01.md`, `T-36_VALIDACAO_T35.md` (Regra 15) |
| Severidade | **HIGH fixada pelo dono (D-11, `APR-2026-031`) — não é objeto desta trilha.** Esta validação decide o **fato técnico**, não a severidade. |

> **Mandato:** tentar **derrubar** o finding. Cinco hipóteses refutadoras foram formuladas antes
> de buscar evidência; o resultado de cada uma está registrado, **inclusive as que falharam**.
> Nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED`, nenhuma severidade alterada, nenhum finding novo.

---

## 1. Veredito

### `AUD-RH-COMISSAO-01` — **CONFIRMED**, com **uma refutação parcial** que refina (não invalida) a dependência de ordem declarada na §3 do finding

- **A lacuna central é fato:** não existe, em nenhuma tabela, coluna, ENUM com valor associado,
  campo JSONB ou estrutura do lado comercial, lugar onde o **percentual de comissão por acordo
  individual** possa ser gravado. Varredura própria, mais ampla que a do autor (§2.1 abaixo).
- **Não é DUPLICATE** de `AUD-RH-VTHORISTA-01`: objetos distintos verificados — aquele é consumo
  aritmético errado em `benefitRules.ts:22-23`; este é ausência de estrutura no modelo de dados.
  Corrigir um não produz o artefato que o reteste do outro exige.
- **Refutação parcial (H4):** a frase da §3 — *"a fórmula correta não tem insumo"* — é
  **absoluta demais**. Existe caminho alternativo que quebra a dependência **para o caso VT**
  (não para o finding): declaração semântica ratificada pelo dono de que `employees.salary`
  guarda **somente a parte fixa** do comissionado (§2.4). Isso muda o **desenho da remediação**
  (permite estagiamento), não o veredito.

**Placar das hipóteses: 4 falharam (sustentam o finding), 1 procedeu parcialmente (refina a
remediação sem reduzir o finding).**

---

## 2. Hipóteses refutadoras e resultados

### 2.1 **H1** — "o percentual TEM onde morar; o autor não varreu o suficiente"

**RESULTADO: REFUTAÇÃO FALHOU.** Varredura independente e mais ampla que a do finding:

| Candidato a moradia | Evidência | Serve? |
|---|---|---|
| `hr_employee_contracts` | `HrEmployeeContract.ts:15-36` — tipo de vínculo, datas, status. **Nenhum campo de remuneração de qualquer natureza.** | **não** |
| `hr_employee_benefits` | `HrEmployeeBenefit.ts:24-26` — `discount_value`/`company_cost_value` (12,2) são valores de adesão a benefício; `dependents JSONB` é lista de dependentes de saúde/odonto (`benefitRules.ts:11,38-44`), não saco genérico de atributos | **não** |
| `hr_employee_job_history` | `HrEmployeeJobHistory.ts:21` — **uma** coluna `salary DECIMAL(12,2)`, sem percentual | **não** |
| `hr_job_positions` | `HrJobPosition.ts:21-22` — `salary_range_min/max` é faixa **do cargo**; o percentual do finding é **por acordo individual** (por funcionário), granularidade incompatível mesmo se houvesse coluna — e não há | **não** |
| `hr_benefit_types.funding_rule` | `HrBenefitType.ts:21` — `ENUM('percentual','fixo')`. **Candidato mais próximo do repositório, testado e rejeitado:** é regra de custeio do catálogo de benefícios (`vt`,`vr`,`va`,`saude`,`odonto`,`vida`,`outros` — `:18`), por **tipo de benefício** e não por funcionário; **não existe sequer coluna de VALOR de percentual ao lado do ENUM**; consumidores são CRUD puro (`CreateBenefitTypeUseCase.ts:27-33`, `benefitValidators.ts:15,23`) | **não** |
| Lado comercial (vendas) | grep `comiss\|commission` case-insensitive em **todo** `server/`: únicas ocorrências reais são o ENUM `'comissionado'` (`Employee.ts:27,66`; `00_baseline_frozen.sql:402`) e falsos positivos lexicais `decommissioned` (patrimônio) + `package-lock.json`. **Não existe tabela `sale_commissions`, coluna de comissão em `sales`/`sale_items`, nem serviço de comissão.** Os únicos percentuais de `sale_items` são alíquotas fiscais (`00_baseline_frozen.sql:12301-12371`) | **não** |
| Campos JSON/JSONB genéricos | Inventário completo de `DataTypes.JSON(B)` em `server/src/models`: `AcousticTestResult`, `AuditLog`, `AccessProfile.allowed_warehouses`, `HrTimeImportBatch` (linhas rejeitadas), `HrEmployeeBenefit.dependents`, `ItAccessRequest`, `ItemEspecificacaoTecnica`, `JurContract.clause_checklist`, `MeetingMinute`, `SaleInvoice.items`, `WebhookEvent.payload`. **Nenhum é bolsa de atributos extensível de funcionário.** | **não** |
| Coluna oculta no banco que o model não declara | `00_baseline_frozen.sql:4854-4889` — DDL de `employees` conferido **coluna a coluna** contra `Employee.ts:52-89`: **idênticos**. Não há coluna extra no banco | **não** |
| Percentuais em geral (models + baseline) | grep `percent\|percentual\|_pct\|rate\|taxa\|aliquota`: todas as ocorrências são sucata de BOM (`scrap_percentage`, `perda_percentual`), alíquotas de importação (`ImportProcessItem.ts:45-49`), overhead de produção (`baseline:10561`), câmbio, alíquotas fiscais de venda. **Zero relacionadas a remuneração de pessoa** | **não** |
| `employees.notes` | `Employee.ts:81` — `TEXT` livre | **é exatamente o cenário que o finding denuncia** ("vive fora do sistema... planilha, contrato em papel"), não uma refutação: texto livre não é estrutura interpretável por consumidor |

**Conclusão H1: o percentual de comissão não tem onde morar em nenhuma estrutura do
`AUDIT_COMMIT`.** A afirmação central do finding (§2) sobrevive a varredura mais ampla que a
original — inclusive nas direções que o autor não varreu (vendas, JSONB, contratos, DDL × model).

### 2.2 **H2** — "`salary_type = 'comissionado'` tem consumidor que o finding ignorou"

**RESULTADO: REFUTAÇÃO FALHOU.** Varredura própria, independente de `T-36` §3.3:

- `salary_type` em `server/src`: **8 ocorrências**, todas declaração/CRUD/lista de sensível —
  `models.d.ts:278`, `Employee.ts:27,66`, `employeeSensitiveFields.ts:42`,
  `CreateEmployeeUseCase.ts:23,65,97`, `UpdateEmployeeUseCase.ts:22`. **Zero `if`/`switch`/`case`.**
- Literal `'comissionado'` em `server/src`: **apenas** `Employee.ts:27,66` (declaração de tipo/ENUM).
- Confirma por caminho próprio a asserção do finding (§2) e de `T-36` §3.3: o discriminador é
  gravado e **nunca consultado**. Um campo novo de percentual, hoje, também não teria consumidor —
  mas isso é o estado do defeito, não controle compensatório.

### 2.3 **H3** — "a UI não permite de fato cadastrar comissionado (opção morta ou submit bloqueado)"

**RESULTADO: REFUTAÇÃO FALHOU.** Caminho fim-a-fim verificado:

1. `EmployeesTab.tsx:277` — schema zod aceita `z.enum(['mensal','horista','comissionado'])`.
2. `EmployeesTab.tsx:467-471` — dropdown "Tipo de salário" oferece a opção
   (`<option value="comissionado">` na linha **:470**; o finding cita `:469-470`, que abrange
   `'horista'` e `'comissionado'` — imprecisão de uma linha, imaterial).
3. `EmployeesTab.tsx:459-463` — **um único** input de remuneração: "Salário (R$)" (`:462`).
   Nenhum campo de percentual no formulário, em create nem em edit (`:381-398`).
4. `EmployeesTab.tsx:335-361` — o submit envia `salary` e `salary_type` literalmente no payload.
5. `CreateEmployeeUseCase.ts:79-84` — servidor valida apenas nome/CPF; `salary_type` entra
   passa-adiante (`:97`). **Nenhuma rejeição, nenhum campo condicional, nenhum aviso.**

Cadastrar um comissionado com um único número em `salary` é o **caminho feliz** do sistema. O
gatilho de reavaliação do finding ("se algum comissionado for cadastrado, passa a existir dado
real sem lugar correto") é alcançável por qualquer admin sem nenhum obstáculo.

### 2.4 **H4** — "a dependência de ordem é absoluta? Não há caminho que destrave o VT de comissionado sem a migration?"

**RESULTADO: REFUTAÇÃO PROCEDEU PARCIALMENTE.** Existe caminho alternativo, com ressalvas:

**O caminho:** o dono já decidiu que VT de comissionado incide sobre a **parte fixa** (finding §4)
e que a remuneração é **fixo + percentual** (gate de `AUD-RH-VTHORISTA-01` §5). Se o dono
ratificar a convenção **"`employees.salary` guarda SOMENTE a parte fixa mensal do comissionado"**
(comment na coluna + migration + doc), então `benefitRules.ts` pode tratar `'comissionado'` como
`'mensal'` — **a fórmula de VT passa a ter insumo sem esperar a migration do percentual**.

**Por que é parcial e não derruba o finding:**

1. A convenção **é ela mesma o item 1 da §5 do finding** ("valor fixo, separado e identificável
   como fixo") na sua forma mínima — é executar parte da remediação, não dispensá-la.
2. **Não faz nada pelo percentual**, que continua sem moradia — o objeto do finding permanece
   intacto. Cálculo de comissão/folha segue fisicamente bloqueado pela lacuna de schema.
3. É decisão humana (Regra 18): a resposta registrada do dono diz que **existe** fixo +
   percentual; **não diz** que a coluna `salary` contém só o fixo. Nenhum artefato diz. A
   SanaCore não pode arbitrar (Regra 6).
4. Dados já gravados sob outra interpretação não são verificáveis estaticamente
   (`APR-2026-016` — sem acesso a banco); o item 4 da §5 do finding já cobre essa checagem.

**Efeito:** a frase da §3 — *"enquanto ela não existir separada, a fórmula correta não tem
insumo"* — deve ser lida como *"não tem insumo **declarado**"*. A dependência é **decisional**
(uma ratificação do dono), não física (uma migration), **para o caso VT**. Isso permite
**estagiar** a remediação (§4 abaixo). Para comissão/folha, a dependência física permanece.

### 2.5 **H5** — "os 4 riscos de desenho da §6 não se sustentam"

**RESULTADO: REFUTAÇÃO FALHOU nos quatro.**

| Risco (§6) | Verificação | Resultado |
|---|---|---|
| Unidade não declarada (fração × percentual) | As duas convenções **coexistem no repositório**, verificado direto: `benefitRules.ts:8` usa **fração** (`VT_DISCOUNT_LIMIT_PERCENT = 0.06`); `ImportProcessItem.ts:45` usa **percentual** (comment `'60.0000 = 60%'`); `00_baseline_frozen.sql:10582` (`'25.5 = 25,5%'`); `BillOfMaterialItem.ts:62` (`max: 100`) | **sustentado**, independentemente do texto de `T35-PRD-F07` |
| Coluna única sem vigência | Sustentado — e com **insumo de remediação que o finding não citou**: o padrão de vigência **já existe no projeto** — `hr_employee_job_history` guarda salário com `effective_from`/`effective_to` e imutabilidade por trigger (`HrEmployeeJobHistory.ts:5-8,22-23`). Precedente natural para percentual-com-vigência como tabela filha | **sustentado + insumo novo** |
| `salary` polissêmico persiste | Trivialmente verdadeiro: `benefitRules.ts:22-23` segue sem ler `salary_type` (verificado direto) — `AUD-RH-VTHORISTA-01` continua vivo para `'mensal'`/`'horista'` independente deste finding | **sustentado** |
| Campo novo nasce fora da classificação de sensibilidade | `employeeSensitiveFields.ts:36-51` lista `'salary'` (`:41`) e `'salary_type'` (`:42`). **O mecanismo é deny-list**: `sanitizeEmployee` (`:92-94`) remove **apenas** os campos listados, e `GET /api/employees` é aberto a **qualquer autenticado** (header do módulo, `:5-11`). Campo novo não listado **vaza por construção** para todo usuário autenticado — o risco não é hipotético, é o comportamento default do mecanismo. O próprio arquivo documenta o precedente: `pcd` só entrou na lista após achado de auditoria (`:28-34`) | **sustentado — e estrutural** |

---

## 3. Verificações acessórias do texto do finding

| Asserção do finding | Verificação | Resultado |
|---|---|---|
| `Employee.ts:65` — `salary DECIMAL(10,2)`, `comment: 'Salário'` | lido direto | **confere** |
| `Employee.ts:66` — `salary_type` ENUM sem `comment` | lido direto | **confere** |
| DDL sem comentário em `salary_type` | `00_baseline_frozen.sql:4868` — coluna sem `COMMENT ON` correspondente | **confere** |
| "4 fixtures usam apenas `'mensal'`" | grep em `server/tests`: exatamente 4 arquivos (`employees-use-cases.test.ts:81`, `directorate-governance-cycle.test.ts:77`, `rh-block6-extension.test.ts:65`, `rh-time-import-attendance.test.ts:58`), todos `'mensal'` | **confere** |
| Citação `EmployeesTab.tsx:469-470` | opção `comissionado` está em `:470` | confere com imprecisão de 1 linha, imaterial |

---

## 4. O que muda na instrução de remediação (SanaCore)

1. **Estagiamento possível (novo — decorre de H4):** o caso VT-comissionado de
   `AUD-RH-VTHORISTA-01` pode ser destravado **antes** da migration do percentual, mediante
   ratificação do dono (Regra 18) da convenção "`employees.salary` = parte fixa mensal para
   `'comissionado'`", materializada em `comment` (model **e** migration, cf. `AUD-DB-T31-03`).
   Essa ratificação **é o item 1 da §5 deste finding**, não um atalho que o dispense. O
   percentual (+ unidade + vigência) continua obrigatório e é o corpo deste finding.
2. **Padrão de vigência com precedente interno:** avaliar tabela filha no molde de
   `hr_employee_job_history` (`effective_from`/`effective_to` + trigger de imutabilidade) em vez
   de inventar desenho novo — responde de uma vez os itens 2 e 3 da §5.
3. **Critério de reteste §7.2 é estrutural, não cosmético:** como o mecanismo de sensibilidade é
   deny-list com endpoint aberto a autenticados, a ausência do campo novo em
   `SENSITIVE_EMPLOYEE_FIELDS` significa **vazamento imediato** de acordo individual de
   remuneração. Deve ser tratado como parte do mesmo commit da migration, nunca follow-up.
4. **Critérios §7.1-7.5 do finding:** verificados como objetivos e executáveis estaticamente.
   Nenhuma alteração necessária além da leitura refinada da dependência (item 1 acima).

## 5. Observação anexada ao auditor de origem (não é finding novo — este agente não cria findings)

- **OBS-T40-01:** `hr_benefit_types.funding_rule = 'percentual'` (`HrBenefitType.ts:21`) não tem
  coluna de **valor** do percentual em lugar nenhum — nem no catálogo, nem na adesão
  (`HrEmployeeBenefit.ts`). Sintoma vizinho da mesma classe ("o sistema declara a existência de
  um percentual que não tem onde ser armazenado"), em benefícios, fora do escopo de
  `AUD-RH-COMISSAO-01`. Encaminhado ao auditor de origem de RH para triagem.

---

## 6. Estado

- **Veredito:** `AUD-RH-COMISSAO-01` = **CONFIRMED** (fato técnico). Severidade HIGH permanece a
  fixada pelo dono (D-11, `APR-2026-031`) — não alterada, não recomendada, não é objeto desta trilha.
- **Hipóteses testadas: 5** — **4 falharam** (sustentam), **1 procedeu parcialmente** (H4 —
  refina o desenho da remediação; registrada em §2.4 e §4.1).
- **`FALSE_POSITIVE`:** não. **`NEEDS_MORE_EVIDENCE`:** não. **`DUPLICATE`:** não (verificado, §1).
- Com este veredito, **98/98 findings HIGH/CRITICAL do run têm validação registrada** (Regra 22).
- **Segue para SanaCore com status `CONFIRMED`**, via `vericore-audit-consolidator`, com as
  instruções da §4.
- **Banco:** não acessado (`APR-2026-016` íntegra). Evidência 100 % estática sobre o
  `AUDIT_COMMIT` `c1311a6f76b512fef893f7e60d934179cae3409f`.
- **Escrita:** somente este arquivo. Nenhum artefato existente alterado (Regra 15). Nenhuma
  escrita fora de `audit/`.
- Nenhuma declaração de `RETEST_PASSED`, `FINDING CLOSED` ou `REMEDIATION COMPLETE`.
