# T-43 — `C-137` Semântica de coluna, LOTE 5 (censo e fechamento da categoria DADO DE SAÚDE)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-43` (continuação de `T-13` → `T-31` → `T-35` → `T-41` → `T-42`, célula `C-137`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Mandato | **`APR-2026-037`** (EMENDA-01 a `APR-2026-024`), §4 e condição vinculante |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linha. |
| Artefatos anteriores | `T-13`, `T-31`, `T-35`, `T-41`, `T-42`, `AUD-DB-09_RETIFICACAO_01` — **não alterados** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`, `T-35:13`, `T-41:14`, `T-42:14`). Persistido pelo orquestrador **sem alteração**.

---

## 1. CENSO da categoria — condição vinculante de `APR-2026-037` §4

`APR-2026-037` §4 fixou: *"se a auditoria verificar que o conjunto de tabelas com dado de saúde é maior que três, o excedente entra na cobertura […] o número três veio de uma marcação do auditor, não de um censo"*.

**Fiz o censo. O conjunto é de 11 tabelas, não 3.** A marcação de `T-42` §2.4 subestimou a categoria em **3,7×**. Registro isto antes de qualquer finding, porque é o produto que a decisão do dono exigiu.

### 1.1 Critério de inclusão, declarado antes de aplicado

Uma tabela entra na categoria **dado de saúde de trabalhador** se tiver **ao menos uma coluna que revele, ou torne derivável, informação sobre saúde, integridade física ou aptidão laboral de pessoa natural identificada**. Vínculo 1:1 com linha que carrega essa informação **conta** (derivabilidade). Presença de pessoa em evento **não** conta, se nada sobre a saúde dela é registrado.

### 1.2 O conjunto nominal completo — **11 tabelas**

| # | Tabela | Coluna(s) que a qualificam | Evidência | Situação |
|---|---|---|---|---|
| 1 | `sst_asos` | `resultado`, `restricoes`, `medico_examinador` | `SstAso.ts:8-9,45` — *"Dado clínico sensível (LGPD)"* no próprio artefato | **coberta** `T-41` §6.1 |
| 2 | `sst_exames_complementares` | `tipo_exame`, `alterado`, `resultado_laudo_url` | `:13402` (*"audiometria, espirometria, hemograma"*), `:13409` (*"true = resultado fora da normalidade"*) | **LOTE 5** |
| 3 | `sst_acidentes` | `descricao`, `parte_corpo_atingida`, `gravidade`, `dias_perdidos`, `tipo='doenca_ocupacional'` | `:12809-12813`; `SstAcidente.ts:27-30,44` | **LOTE 5** |
| 4 | `sst_acidente_complementos` | `valor_novo`/`valor_anterior` de `dias_perdidos` (extensão do afastamento), `motivo` (texto livre) | `:12724-12727` | **LOTE 5** |
| 5 | `sst_investigacoes_acidente` | `causas_identificadas`, `evidencias_urls` (*"fotos/depoimentos"*), 1:1 com o acidente | `:13598-13600`, `:13633`; UNIQUE `acidente_id` `:18163` | **LOTE 5 — SAI da exclusão `APR-2026-037` §5.2** |
| 6 | `sst_cats` | comunicação legal da lesão, `acidente_id` | `:25496` | **coberta** `T-41` §6.1 |
| 7 | `hr_absences` | **`cid`** | `HrAbsence.ts:5-7` — *"`cid` é dado de saúde (LGPD art. 5º II)"*, literal | **coberta** `T-13:54` (amostra semântica) |
| 8 | `hr_employee_documents` | `aptitude_result` | `T-41` §5 (`T41-RH-F02`), `:5932` | **coberta** `T-41` §6.1 |
| 9 | `hr_admission_processes` | **`aso_result`**, `aso_confirmed_at`, `aso_valid_until` | `:5709-5710`; enum `:669-673` | **LOTE 5 — SAI da exclusão §5.2** |
| 10 | `hr_termination_processes` | **`aso_result`**, `aso_confirmed_at` | `:6307-6308`; enum `:839-843` | **LOTE 5 — SAI da exclusão §5.2** |
| 11 | `sst_ges_funcionarios` | exposição **nominal** a agente de risco (`ges_id` × `employee_id` × período) — base do S-2240/PPP | `:13449-13453`; critério já fixado por mim em `T-41` §2.1 regra 3 | **LOTE 5 — SAI da exclusão de 2ª ordem** |

### 1.3 As duas ressalvas de `APR-2026-037` §5.2 — resolvidas nominalmente

- **`sst_investigacoes_acidente`: CARREGA dado de saúde.** É 1:1 com `sst_acidentes` (UNIQUE `:18163`), e `evidencias_urls` é declarado no DDL como *"fotos/depoimentos"* de um acidente com lesão (`:13633`). **Entra na cobertura**, conforme a ressalva.
- **`sst_acidente_testemunhas`: NÃO carrega dado de saúde.** As três colunas são `acidente_id`, `employee_id`, `created_at` (`:12764-12768`). Nada sobre a saúde da testemunha é registrado; o dado clínico está na tabela-pai, sobre outra pessoa. **Pelo critério, permaneceria excluída — mas eu a cobri assim mesmo** (§2), porque custa 3 colunas, encerra a ressalva sem deixar dúvida interpretativa e ela é o par N:N do cluster.

### 1.4 Censo sobre as demais faixas — resultado negativo, declarado

- **42 de 1ª ordem (`T-42` §2.4):** varridas as 17 da banda dado pessoal. Além das 5 acima, **nenhuma outra** carrega dado de saúde. Verificadas nominalmente e **descartadas com motivo**: `hr_employee_contracts`, `hr_vacation_accrual_periods` (`unexcused_absences` é falta **injustificada** — atestado a exclui, `HrVacationAccrualPeriod.ts:21`), `marketing_leads`, `marketing_lead_saneamento_log`, `sst_entregas_epi` / `sst_devolucoes_epi` (ver §1.5), `jur_contract_signatories`, `jur_external_lawyers`, `facility_drivers` (CNH e validade, sem exame — `FacilityDriver.ts:33-36`), `facility_visitors`.
- **Banda dinheiro (25):** `hr_employee_benefits` examinada por ser a candidata plausível (adesão a plano de saúde). `HrEmployeeBenefit.ts:17-27` **não** tem coluna clínica; `dependents JSONB` é dado pessoal de terceiros (§8), **não** de saúde. **Fora da categoria.**
- **23 de 2ª ordem:** apenas `sst_ges_funcionarios` qualifica. `sst_treinamentos`, `sst_brigadistas`, `sst_membros_cipa`, `sst_candidatos_cipa`, `sst_reuniao_cipa_presentes`, `sst_dds_presencas`, `sst_permissoes_trabalho`, `sst_pt_executantes` registram **presença/designação**, não saúde.
- **53 excluídas da triagem (`T-41` §3.2):** `sst_planos_exames`, `sst_risco_exames`, `sst_riscos_ocupacionais`, `sst_ges` reexaminadas — descrevem **cargo/GES/catálogo**, não pessoa. Confirmam a regra 3 de `T-41` §2.1. **Nenhuma entra.**
- **21 sem model:** **não censáveis.** Não posso afirmar que não contêm dado de saúde. É a única lacuna do censo e continua aberta (`RES-T43-05`).

### 1.5 Ressalva que devolvo ao dono, sem decidir por conta própria (Regra 6)

`APR-2026-037` §4 diz *"dado de saúde de trabalhador (LGPD art. 5º II)"*. O **art. 5º II** cobre também **dado biométrico**, que é categoria especial distinta de saúde. E ela existe no schema:

- `sst_entregas_epi.evidencia_tipo` admite **`'biometria'`** (`SstEntregaEpi.ts:46`) com `evidencia_arquivo_url` (`:47`) apontando o artefato.

**Não expandi o escopo por conta própria** — o substantivo da decisão é *saúde*. Registro como item que exige decisão humana: se o dono quis a categoria especial inteira do art. 5º II, `sst_entregas_epi` e `sst_devolucoes_epi` entram; se quis saúde, ficam na exclusão da §5.2. `RES-T43-01`.

---

## 2. Tabelas cobertas nesta trilha — **8**

Regra de contagem mantida sem afrouxamento (`T-35`, `T-41` §6.1, `T-42` §3): **model lido coluna a coluna E pelo menos uma verificação externa**. Model sozinho não conta.

| # | Tabela | Verificação externa que a qualificou |
|---|---|---|
| 1 | `sst_acidentes` | DDL `:12803-12850` (1 `CHECK`, 4 `COMMENT`), **trigger `sst_lock_acidente` `:2900-2935`**, FKs `:25424,:25432`, índices `:21134-21148`; consumidores `CreateAccidentUseCase.ts:48-56`, `EmitCatUseCase.ts:80-90`, `CreateAccidentComplementUseCase.ts:54-63` |
| 2 | `sst_acidente_complementos` | DDL `:12721-12737`, FKs `:25392,:25400`, índice `:21120`; consumidores `CreateAccidentComplementUseCase.ts:54-61`, `EmitCatUseCase.ts:81-88` |
| 3 | `sst_acidente_testemunhas` | DDL `:12764-12776`, FKs `:25408,:25416`, UNIQUE `:22072`, índice `:21127`; consumidor `SequelizeAccidentRepository.ts:53-59` |
| 4 | `sst_investigacoes_acidente` | DDL `:13595-13633`, UNIQUE `:18163`, FKs `:25648,:25656`; consumidor `CloseAccidentUseCase.ts:44-53` |
| 5 | `sst_exames_complementares` | DDL `:13379-13409`, FK `:25592` (**CASCADE**), índice `:21316`; consumidor `CreateComplementaryExamUseCase.ts:28-43`, rota `sst.ts:67` |
| 6 | `hr_admission_processes` | DDL `:5690-5726`, FKs `:23680-23696`, índices `:19286-19300`; consumidores `ConcludeAdmissionProcessUseCase.ts:114-125`, `ConfirmAdmissionAsoResultUseCase.ts:50-63` |
| 7 | `hr_termination_processes` | DDL `:6296-6326` (**1 `CHECK`**, coluna gerada), índices `:19496-19510`; consumidores `ConcludeTerminationProcessUseCase.ts:63-96`, `ConfirmTerminationAsoResultUseCase.ts:26-35`, `asoGate.ts:20-28` |
| 8 | `sst_ges_funcionarios` | DDL `:13449-13453`, FKs `:25600,:25608`, índices `:21323,:21330` |

**Nota de método aplicada a mim mesmo (`RES-T42-04`).** As 8 tabelas são de migrations `20260806-*` e `20260808-*`, **anteriores** ao corte `20260810-000038`. O baseline **alcança** todas as 8 — confirmado por `CREATE TABLE` presente para cada uma. Portanto, nesta trilha, *"não achei o `CHECK` no baseline"* **é** evidência de ausência. A armadilha de `T-42` §7.1 foi verificada e não se aplica aqui; digo isso explicitamente para que a conclusão não seja lida com a ressalva errada.

---

## 3. Findings `PROPOSED`

Severidade e confiança **separadas**. Régua mantida: **HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real** — o teste que produziu 2 HIGH em `T-41` e 0 em `T-42`. Neste lote **um** achado passou, e explico por quê; os demais reprovaram, e explico por quê em cada um.

---

### `T43-SST-F01` — O ASO é gravado **fora** da transação que enfileira a obrigação eSocial; a interface do repositório declara o parâmetro de transação e a implementação o descarta

**Severidade proposta: HIGH · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto à frequência**
→ **Regra 22: vai ao `vericore-finding-validator`.**

`CreateAsoUseCase.ts:4` promete, no cabeçalho: *"Efeitos colaterais (**mesma transação**): […] Enfileira `EventoESocialSST` tipo `S-2220`"*. O código faz o oposto no registro principal:

```
72   const t = await sequelize.transaction();
74   const aso = await this.asoRepository.createAso({ ... });      // ← SEM t
87   await this.esocialEventRepository.create({ ... }, t);          // ← COM t
94   await t.commit();
98   } catch { await t.rollback(); }
```

E a queda do parâmetro é rastreável em três camadas:

| Camada | Assinatura | Arquivo:linha |
|---|---|---|
| Contrato de domínio | `createAso(data, transaction?)` — **prevê** transação | `AsoRepository.ts:30` |
| Implementação Sequelize | `createAso(data)` — **perdeu** o parâmetro | `SequelizeAsoRepository.ts:70-72` |
| Chamador | abre `t`, **não** o passa | `CreateAsoUseCase.ts:74` |

TypeScript aceita a implementação com menos parâmetros que a base, então **a divergência não gera erro de compilação** — é silenciosa por construção.

**Consequência com consumidor real.** `POST /api/sst/aso` (`sst.ts:66`) é o **único** caminho de escrita de `sst_asos`. Se o `INSERT` do evento S-2220 falhar, o `rollback` desfaz **apenas o evento**: o ASO — dado clínico de trabalhador — **permanece comitado**, e a obrigação acessória do eSocial **desaparece sem rastro**. O operador recebe erro e a resposta natural é **repetir** a operação — e `sst_asos` **não tem UNIQUE nenhuma** (nem `(employee_id, tipo, data_realizacao)`), de modo que o retry cria um **segundo ASO clínico duplicado**, este sim com evento. O banco fica com dois laudos e uma obrigação.

**Por que HIGH — o teste aplicado, e ele passou.** O defeito está no caminho normal (não há outro), com consumidor real, e a materialização não depende de escrita externa nem de concorrência exótica: basta que a segunda gravação falhe uma vez. O dano é **duplo** — perda de obrigação legal (S-2220/NR-7) **e** duplicação de registro clínico —, sobre categoria especial de dado pessoal. É a mesma classe de `AUD-RH-VTHORISTA-01`: promessa de atomicidade que o artefato declara e o código não entrega, em caminho único. **Confiança MÉDIA quanto à frequência** porque a taxa de falha do segundo `INSERT` não é mensurável estaticamente (`DYN-T43-01`).

**Contraprova que procurei antes de acusar.** Verifiquei se o cluster irmão faz certo: **faz**. `CreateAccidentUseCase.ts:46-58` abre `t`, passa `t` ao acidente **e** às testemunhas, e só então comita; `EmitCatUseCase.ts:49-92` propaga `t` às três escritas. O padrão correto está no mesmo módulo, escrito pelo mesmo time — o que torna o desvio em `CreateAsoUseCase` um lapso pontual, não uma limitação de arquitetura, e portanto **barato de corrigir**.

**Critério de reteste objetivo (estático):** `SequelizeAsoRepository.createAso(data, transaction?)` restaurado com repasse a `SstAso.create(data, { transaction })`; `CreateAsoUseCase.ts:74` passando `t`; teste de integração que force falha no `INSERT` do evento S-2220 e **prove que nenhuma linha permanece em `sst_asos`**; e `UNIQUE (employee_id, tipo, data_realizacao)` em migration versionada, para que o retry não duplique laudo.

---

### `T43-SST-F02` — `sst_acidentes`: a justificativa de **não** emitir CAT é exigida por regra escrita no `COMMENT`, não é imposta pelo banco, e é **inalcançável** pelo caminho normal

**Severidade proposta: MEDIUM · Confiança: ALTA**

O DDL grava a regra na prosa (`:12843`):

> `COMMENT ON COLUMN public.sst_acidentes.justificativa_sem_cat IS 'RF-SST-025/BR-SST-016: obrigatória quando gravidade=sem_afastamento e o Técnico SST decide não emitir CAT'`

Há **um único `CHECK`** em toda a tabela (`:12821`): `ck_sst_acidentes_dias_perdidos_nao_negativo`. Nada liga `houve_cat`, `gravidade` e `justificativa_sem_cat`.

**E há um agravante que não é de constraint, é de sequência temporal.** O acidente nasce **já confirmado** — `CreateAccidentUseCase.ts:50` grava `confirmado: true` no `INSERT`, com o próprio docstring dizendo *"imutável a partir daqui"* (`:6-8`) — e o trigger congela `justificativa_sem_cat` (`:2921`). O único canal de alteração pós-confirmação são `dias_perdidos`/`houve_cat` (`CAMPOS`, `CreateAccidentComplementUseCase.ts:17`). **Logo a justificativa só pode ser gravada no instante do registro, antes da decisão que ela justifica.** A decisão de não emitir CAT é, por natureza, posterior. **BR-SST-016 é, no schema atual, não apenas não imposta: é irregistrável pelo caminho normal.**

Somam-se dois pares de estado sem lastro: `confirmado` × `confirmado_em` (`:12816-12817`, ambos sem `CHECK` que os ligue — **sétima** ocorrência do padrão de `T35-EST-F05`), e `gravidade='com_afastamento'` sem exigir `dias_perdidos > 0`, de modo que um acidente com afastamento e zero dias perdidos é gravável e alimenta indicador de SST (taxa de gravidade) errado.

**Por que MEDIUM e não HIGH — teste aplicado, reprovou.** `fromAccidentInput` (`AccidentMapper.ts:46`) aceita `justificativa_sem_cat` na criação, então o caminho normal **permite** gravá-la quando a decisão já está tomada no ato do registro; e `EmitCatUseCase.ts:56-58` impede CAT inicial duplicada. Não há consumidor que **leia** `justificativa_sem_cat` e tome decisão sobre ela — é campo de prova documental. O dano é de **conformidade documental e de indicador**, não de decisão automatizada errada.

**Critério de reteste:** `CHECK ((houve_cat = true) OR (justificativa_sem_cat IS NOT NULL))`; `CHECK ((confirmado = false) OR (confirmado_em IS NOT NULL))`; `CHECK ((gravidade <> 'com_afastamento') OR (dias_perdidos > 0))` — **condicionado** a confirmar com o técnico SST se dias perdidos podem ser 0 no dia do registro (Regra 6, não suprido aqui); **e** um canal versionado que permita registrar a justificativa após a confirmação, via `sst_acidente_complementos` (isto é, `campo` admitindo `justificativa_sem_cat`).

---

### `T43-SST-F03` — O trigger de imutabilidade compara uma coluna **nullable** com `=` e, nesse caso, trava o acidente por completo — inclusive o campo que a CAT precisa alterar

**Severidade proposta: MEDIUM · Confiança: ALTA quanto ao mecanismo**

`sst_lock_acidente` (`:2900-2935`) sabe tratar coluna nullable: usa `IS NOT DISTINCT FROM` em **três** delas — `parte_corpo_atingida` (`:2918`), `agente_causador` (`:2919`), `justificativa_sem_cat` (`:2921`). Em uma quarta, igualmente nullable, usa igualdade simples:

```
2923             AND NEW.confirmado_em = OLD.confirmado_em
```

`confirmado_em` é `timestamp with time zone` **sem `NOT NULL`** (`:12817`). Se a linha estiver `confirmado = true` com `confirmado_em NULL`, a comparação devolve `NULL`, a cadeia `AND` inteira vira `NULL`, o `IF` não é satisfeito e o fluxo cai em `RAISE EXCEPTION` (`:2930`). **Efeito: a linha fica totalmente imutável — nem `dias_perdidos` nem `houve_cat` podem ser atualizados**, que é exatamente o contrário do que BR-SST-017 determina e do que o `COMMENT` `:12829,:12836` promete (*"atualizável mesmo após confirmado"*).

**O bloqueio atinge a emissão da CAT.** `EmitCatUseCase.ts:89` faz `updateAccidentConsolidated(..., { houve_cat: true })` **dentro da transação** que cria a CAT e o evento S-2210. Numa linha nesse estado, o `UPDATE` levanta exceção, a transação inteira reverte e **a CAT não é emitida** — sobre um acidente de trabalho, com prazo legal correndo.

**Por que MEDIUM e não HIGH — o teste do consumidor, aplicado com honestidade.** O caminho normal **não** produz o estado tóxico: `CreateAccidentUseCase.ts:51` grava `confirmado_em: new Date()` junto com `confirmado: true`, sempre. A linha com `confirmado = true` e `confirmado_em NULL` só surge por carga legada, seed, migração de dados ou escrita direta. É defeito **latente com gatilho externo**, e é assim que deve entrar na fila — mesma faixa de `T41-TI-F04`. **Sobe a HIGH imediatamente se `DYN-T43-02` retornar ≥ 1 linha.**

**Critério de reteste:** `NEW.confirmado_em IS NOT DISTINCT FROM OLD.confirmado_em` no corpo do trigger, em migration versionada, **e** `CHECK ((confirmado = false) OR (confirmado_em IS NOT NULL))` para eliminar o estado na origem; teste de regressão que insira a linha tóxica por SQL direto e prove que `houve_cat` continua atualizável.

---

### `T43-RH-F04` — `hr_termination_processes.aso_result` é coluna de **dado de saúde write-only**: o gate de conclusão lê outra tabela, e o docstring afirma o contrário

**Severidade proposta: MEDIUM · Confiança: ALTA**

Há dois registros paralelos do ASO demissional e eles não se conversam:

| Registro | Quem escreve | Quem lê no portão |
|---|---|---|
| `hr_termination_processes.aso_result` (`:6308`) | `ConfirmTerminationAsoResultUseCase.ts:35` (`PATCH /:id/aso-confirmation`) | **ninguém** |
| `hr_employee_documents` tipo `aso_demissional` | módulo de documentos | `ConcludeTerminationProcessUseCase.ts:71` → `hasValidAso` → `asoGate.ts:26` |

E o artefato afirma o vínculo que não existe. `ConfirmTerminationAsoResultUseCase.ts:6-8`:

> *"endpoint ADICIONADO nesta implementação […] pois **sem ele o gate de `ConcludeTerminationProcessUseCase` nunca poderia ser satisfeito**."*

**É falso.** O gate consulta `EmployeeDocumentRepository.findValidAso` e nunca toca a coluna que esse endpoint grava. O endpoint foi criado para satisfazer um portão que ele não alimenta.

**Três consequências, na ordem de gravidade:**

1. **LGPD art. 6º III (necessidade).** Dado de saúde é coletado, gravado e retido **sem finalidade exercida**. Coluna sensível write-only é minimização violada, não apenas código morto.
2. **Divergência silenciosa.** `aso_result = 'inapto'` registrado no processo **não impede** a conclusão, se existir documento `aso_demissional` válido. O operador que registrou a inaptidão vê a demissão concluir.
3. **Assimetria entre os dois processos.** A admissão faz o oposto e lê a própria coluna: `ConcludeAdmissionProcessUseCase.ts:119` — `if (process.aso_result !== 'apto' && process.aso_result !== 'apto_com_restricao')`. Dois processos irmãos, duas fontes de verdade diferentes para o mesmo fato clínico. **Um dos dois está errado, e o schema não diz qual.**

**E o contraste dentro da própria tabela é o achado mais eloquente do lote.** `hr_termination_processes` **tem** um `CHECK` (`:6318`):

```
ck_hr_termination_processes_concluido_requires_checklist
CHECK ((status <> 'concluido') OR (checklist_assets_returned = true))
```

**O banco impõe a devolução do crachá para concluir a demissão. Não impõe o exame demissional.** A técnica está dominada e aplicada ao ativo patrimonial, não ao exame de saúde que a NR-7 exige.

**Por que MEDIUM e não HIGH — controle compensatório procurado e encontrado.** Antes de acusar, procurei o controle, como meu mandato exige. Ele existe e é decisivo: `ConcludeTerminationProcessUseCase.ts:71-74` **bloqueia** a conclusão sem ASO demissional válido, e `asoGate.ts:18` documenta que `findValidAso` filtra por aptidão (`apto`/`apto_com_restricao`) **e** validade. A obrigação legal **é** verificada — por outra tabela. O que resta é dado sensível sem finalidade, docstring falso e risco de divergência entre dois registros, que exige erro humano para materializar. Não é o caminho normal falhando.

**Critério de reteste:** decisão de engenharia registrada sobre **qual** é a fonte única (a coluna do processo ou `hr_employee_documents`); eliminada a redundante, ou ligadas por FK; correção do docstring `:6-8`; e `CHECK ((status <> 'concluido') OR (aso_result IN ('apto','apto_com_restricao')))` **se** a coluna for mantida como fonte — com a mesma forma do `CHECK` de ativos que já existe três linhas acima.

---

### `T43-SST-F05` — `sst_exames_complementares`: a conclusão clínica é um `boolean` sem domínio, o tipo de exame é texto livre com o domínio no comentário, e o `CASCADE` apaga a evidência de PCMSO

**Severidade proposta: MEDIUM · Confiança: ALTA**

Cinco colunas, zero `CHECK`, zero `UNIQUE` (`:13379-13388`).

1. **`alterado boolean`** (`:13385`) — o `COMMENT` (`:13409`) diz *"true = resultado fora da normalidade"*. É a **conclusão clínica do exame reduzida a um flag**, com `DEFAULT false`, gravável por `body.alterado ?? false` (`CreateComplementaryExamUseCase.ts:40`) sem qualquer validação. Omitir o campo grava "normal" por omissão — o valor mais favorável ao empregador é o default silencioso num exame ocupacional.
2. **`tipo_exame varchar(80)`** (`:13382`) — o domínio existe **só na prosa** do `COMMENT` `:13402` (*"Ex.: audiometria, espirometria, hemograma, acuidade visual"*), e `:29-30` do use case exige apenas que `tipo` seja truthy. Texto livre. É a régua de `AUD-DB-T31-01` — *"domínio na prosa, não no mecanismo"* — aplicada à identificação do exame que prova o cumprimento do PCMSO. Sem domínio, não há como consultar de forma confiável "quem fez audiometria", que é a pergunta central da NR-7.
3. **`data_realizacao date`** (`:13383`) — sem `CHECK` de data futura e **sem relação imposta com `sst_asos.data_realizacao`**: exame complementar datado **antes** do ASO pai, ou anos depois, é gravável.
4. **`FOREIGN KEY (aso_id) … ON DELETE CASCADE`** (`:25592`) — o próprio DDL admite ser a exceção do módulo (`:13395`: *"diferente das demais FKs do módulo, que são `RESTRICT` por serem registros históricos independentes"*). `sst_asos` **não tem trigger de imutabilidade** — decisão declarada em `SstAso.ts:9-11`. Portanto apagar um ASO apaga silenciosamente todos os exames complementares dele, e a evidência de PCMSO tem retenção legal de 20 anos.

**Por que MEDIUM e não HIGH.** Não há endpoint `DELETE` de ASO nas rotas (`sst.ts:57-67`), então o `CASCADE` só dispara por escrita direta ao banco; e nenhum consumidor lido **decide** com base em `alterado` — a coluna é registro documental. O dano é de **qualidade e preservação de evidência clínica**, não de decisão automatizada errada. **Limitação declarada:** não busquei exaustivamente consumidores de leitura de `alterado` fora do módulo SST (`RES-T43-03`).

**Critério de reteste:** `tipo_exame` com domínio versionado (enum ou tabela de referência ligada a `sst_planos_exames`); `CHECK (data_realizacao <= CURRENT_DATE)` e coerência com a data do ASO pai; `ON DELETE RESTRICT` em `aso_id`, alinhando ao padrão declarado do próprio módulo; e decisão registrada sobre `alterado` — `boolean` com `DEFAULT false` é adequado, ou o resultado precisa de domínio de três estados (`normal`/`alterado`/`inconclusivo`)?

---

### `T43-SST-F06` — O portão de encerramento de acidente **grave** é satisfeito por uma investigação vazia

**Severidade proposta: MEDIUM · Confiança: ALTA**

`CloseAccidentUseCase.ts:43-53` exige, para gravidade em `{com_afastamento, incapacidade_permanente, obito}`, que exista investigação **e** ao menos uma ação corretiva. A verificação da investigação é a existência da linha (`findInvestigationByAccidentId` → `findOne`, `SequelizeAccidentRepository.ts:86`). E a linha pode ser **inteiramente vazia**: no DDL (`:13595-13605`), **todas** as colunas de conteúdo são nullable — `causas_identificadas`, `participantes`, `evidencias_urls`, `concluida_em`. Só `acidente_id` e `created_by` são `NOT NULL`.

**Portanto:** uma investigação sem causa identificada, sem participantes, sem evidência e **sem estar concluída** satisfaz o portão de encerramento de um acidente com óbito. Não há `CHECK` ligando `concluida_em` ao preenchimento mínimo, nem `NOT NULL` em `causas_identificadas`.

Adicionalmente, `participantes text` e `evidencias_urls text` são **listas serializadas em texto livre**, com a decisão declarada no próprio schema (`:13626`): *"vínculo formal por employee fica fora do MVP […] sem necessidade de FK N:N no bloco P0"*. Isso põe **nome de pessoa e ponteiro para foto de lesão** em campo livre, fora de qualquer classificação — mesma patologia de `RES-T41-05` e de `payload_referencia` (`T-42` §6), agora na **sexta** ocorrência do padrão `AUD-DB-T31-08`.

**Por que MEDIUM e não HIGH.** O portão que a investigação vazia burla **não persiste nada** — ver `T43-SST-F07`. Uma checagem cujo resultado positivo não altera o banco não pode causar dano de dado; o dano é de **conformidade** (BR-SST-018 declarada e não sustentada) e de rastreabilidade de investigação de acidente grave.

**Critério de reteste:** `NOT NULL` em `causas_identificadas`, ou `CHECK ((concluida_em IS NULL) OR (causas_identificadas IS NOT NULL AND length(btrim(causas_identificadas)) > 0))`; portão de `CloseAccidentUseCase` exigindo `concluida_em IS NOT NULL`; e tabela-ponte `sst_investigacao_participantes` com FK a `employees`, substituindo o texto livre.

---

### `T43-SST-F07` — `POST /accidents/:id/close` responde **200 com o acidente encerrado** e não grava nada; o estado de encerramento não tem coluna

**Severidade proposta: MEDIUM · Confiança: ALTA (verificável por leitura direta)**

```
75   public async closeAccident(id, transaction?) {
76     const acidente = await SstAcidente.findByPk(id, ...);
77     if (!acidente) return null;
78-80  // 'encerrado' não é uma coluna do schema atual …
81     return acidente;                                   // ← nenhuma escrita
82   }
```
`SequelizeAccidentRepository.ts:75-82`. E `CloseAccidentUseCase.ts:56-57` devolve `toAccidentDTO(closed ?? acidente)`, de modo que o controller responde **sucesso** com o DTO íntegro. A rota existe, é privilegiada (`authorizeModule('sst', 'approve')`, `sst.ts:74`) e é a implementação de RF-SST-026/BR-SST-018.

`sst_acidentes` não tem coluna de encerramento (`:12803-12821`): apenas `confirmado`, que já nasce `true` (`CreateAccidentUseCase.ts:50`). **Não existe, no banco, o estado que o requisito determina** — e a ausência foi reconhecida por escrito pelo autor (`CloseAccidentUseCase.ts:8-15`), com o motivo declarado (*"migrations já estão travadas aguardando aprovação do dono"*).

**Por que é defeito, e não apenas pendência declarada.** A transparência do docstring reduz a severidade, não a elimina: o **contrato de API** não a reproduz. O cliente recebe `200` e conclui que encerrou. Quem auditar o cumprimento de BR-SST-018 pelo banco encontrará **zero** evidência de encerramento, para acidentes que a interface diz encerrados — e é a mesma classe de `T42-META-F06`/`T41-META-F03` (artefato afirmando um estado que não é o real), agravada por aqui o artefato ser a **resposta HTTP**, não um comentário.

**Por que MEDIUM e não HIGH.** Nenhum dado é corrompido — nada é escrito. O dano é de rastreabilidade legal e de expectativa de usuário sobre acidente grave.

**Critério de reteste:** coluna `encerrado_em`/`encerrado_por` (ou `status` dedicado) em migration versionada, com `CHECK` ligando ao portão de investigação; **ou**, enquanto a decisão do dono não sair, resposta HTTP que **não** afirme encerramento (`202`/`200` com `persisted: false` explícito). A segunda opção é remediação de contrato e não exige migration.

---

### `T43-RH-F08` — `hr_admission_processes`: zero `CHECK` numa tabela que decide contratação com base em aptidão médica

**Severidade proposta: LOW · Confiança: ALTA**

Trinta e duas colunas (`:5690-5719`), **nenhum `CHECK`**. É gravável: `status = 'concluida'` com `aso_result NULL`, com `aso_result = 'inapto'`, com `employee_id NULL` (isto é, admissão concluída sem funcionário criado) e com `aso_confirmed_at NULL` embora `aso_result` preenchido. Os seis `checklist_*` booleanos (`:5699-5704`) não são exigidos por `status`. `candidate_cpf varchar(14)` (`:5695`) não tem `UNIQUE` nem formato imposto — dois processos de admissão para o mesmo CPF convivem.

**Por que LOW, e não MEDIUM — o controle decisivo existe e foi verificado.** A hipótese forte que abri era *"admitir candidato clinicamente inapto"*. **A aplicação impede, e com mais rigor que um `CHECK` faria:** `ConcludeAdmissionProcessUseCase.ts:119-124` recusa a conclusão se `aso_result` não for `apto`/`apto_com_restricao`, e `:125` ainda compara `aso_valid_until` com `hire_date`, isto é, **valida a vigência do ASO contra a data de contratação** — verificação que um `CHECK` de coluna não expressaria sem coluna gerada. Aplico aqui a mesma régua de `T42-QUA-F05`: quando o controle decisivo está cumprido, o que resta são falhas de lastro sem consequência provada. **Registro isto explicitamente para que nenhuma remediação futura "adicione o `CHECK` e considere resolvido"** achando que substituiu o controle — o `CHECK` seria complemento.

**Critério de reteste:** `CHECK ((status <> 'concluida') OR (aso_result IN ('apto','apto_com_restricao') AND employee_id IS NOT NULL))`; `CHECK ((aso_result IS NULL) = (aso_confirmed_at IS NULL))`; índice único parcial em `candidate_cpf` para processos não cancelados.

---

### `T43-SST-F09` — `sst_ges_funcionarios`: a exposição a risco ocupacional aceita duplicata e período invertido, e é a base do PPP

**Severidade proposta: LOW · Confiança: ALTA**

Cinco colunas (`:13449-13453`). Existem PK, duas FKs `RESTRICT` (`:25600`, `:25608`) e dois índices (`:21323`, `:21330`). **Não existe `UNIQUE`** em `(ges_id, employee_id)` nem restrição de sobreposição de período, e **não existe `CHECK (fim_exposicao IS NULL OR fim_exposicao >= inicio_exposicao)`**. O model confirma a ausência (`SstGesFuncionario.ts:30-38`: só dois índices simples, nenhum único).

É gravável: o mesmo funcionário vinculado duas vezes ao mesmo GES no mesmo período, e período com fim anterior ao início. O `SstGesFuncionario.ts:6-8` declara que *"cada INSERT relevante é a origem do evento eSocial S-2240"* — logo a duplicata gera **evento eSocial duplicado**, e o período invertido produz tempo de exposição negativo em qualquer cálculo de PPP/aposentadoria especial.

**Por que LOW.** Nenhum consumidor de cálculo foi localizado nesta trilha (a geração do S-2240 é declarada como responsabilidade do use case, e não a li — `RES-T43-03`); a tabela é de 2ª ordem e entrou no escopo pelo censo, não por materialidade provada. **Sobe se houver consumidor que some períodos.**

**Critério de reteste:** `UNIQUE (ges_id, employee_id, inicio_exposicao)` ou constraint de exclusão por intervalo (`EXCLUDE USING gist`); `CHECK (fim_exposicao IS NULL OR fim_exposicao >= inicio_exposicao)`.

---

### `T43-LGPD-F10` — Três clusters de dado clínico trafegam íntegros no DTO; o projeto tem **dois** mecanismos executáveis de classificação e **nenhum** cobre o SST

**Severidade proposta: MEDIUM · Confiança: ALTA**

`toAccidentDTO` (`AccidentMapper.ts:12-31`) devolve `descricao`, `parte_corpo`, `gravidade`, `dias_perdidos`, `justificativa_sem_cat`, a investigação inteira (`:28`) e os complementos (`:29`) — **sem nenhuma função de sanitização**. O mesmo vale para o ASO e para os exames complementares (`CreateComplementaryExamUseCase.ts:43` devolve `resultado_url` e `alterado`).

O projeto **sabe** fazer diferente, em dois lugares:

| Mecanismo | Cobre | Rigor |
|---|---|---|
| `employeeSensitiveFields.ts` | `employees` (incl. `pcd` como dado de saúde) | omissão de campo |
| `rhSensitiveFields.ts` | `hr_absences.cid` via `sanitizeAbsence`, exigindo **interseção `rh` + `sst`** | omissão de campo, ligada em 5 rotas (`T-12`, `T-14` BR-RH-D06) |
| — | **`sst_asos`, `sst_exames_complementares`, `sst_acidentes`, `sst_investigacoes_acidente`** | **nenhum** |

O resultado é invertido em relação ao risco: o **CID** de um afastamento é protegido campo a campo, e o **laudo clínico completo do ASO**, a **parte do corpo atingida** e a **descrição da lesão** não são.

**Por que MEDIUM e não HIGH — controle compensatório encontrado, e é real.** Todas as rotas do cluster exigem `authorizeModule('sst')` para leitura e `('sst','operate'/'approve')` para escrita (`sst.ts:62-79`), e o acesso de RH ao status de ASO passa por `requireSstOrRh` (`:62`). **Não há exposição a usuário sem o módulo.** O defeito é de **granularidade e de classificação declarada**, não de porta aberta: quem tem o módulo SST vê tudo, incluindo perfis que precisam apenas de indicador agregado. Por isso MEDIUM, e por isso **não** é finding de authZ (essa trilha é a de segurança).

**Critério de reteste:** serviço `sstSensitiveFields.ts` no mesmo padrão de `rhSensitiveFields.ts`, aplicado a `toAccidentDTO`/`toAsoDetailDTO`/exames, com a interseção de permissão definida por decisão humana registrada; **e** `COMMENT ON COLUMN` de sensibilidade nas colunas de §5, que hoje só existe em `sst_asos.restricoes` (`SstAso.ts:45`).

---

### `T43-META-F11` — A divergência de domínio de `T41-RH-F02` é **três vezes maior** do que registrado: são 3 enums de RH contra 1 de SST

**Severidade proposta: LOW · Confiança: ALTA (leitura direta dos quatro `CREATE TYPE`)**

| Enum | Valor de restrição | Linha |
|---|---|---|
| `enum_hr_admission_processes_aso_result` | `apto_com_restricao` | `:669-673` |
| `enum_hr_employee_documents_aptitude_result` | `apto_com_restricao` | `:765-769` |
| `enum_hr_termination_processes_aso_result` | `apto_com_restricao` | `:839-843` |
| `enum_sst_asos_resultado` | **`apto_com_restricoes`** | `:2300-2304` |

`T41-RH-F02` registrou o par `hr_employee_documents` × `sst_asos`. O censo mostra que a divergência de singular/plural é **sistêmica no módulo RH inteiro**: três tabelas do lado RH, uma do lado SST, no valor **mais crítico dos três** — o que impõe restrição ao trabalhador. Qualquer conciliação ou relatório unificado falha em silêncio em três junções, não uma.

**Isto é amplificação de evidência de `T41-RH-F02`, não finding novo de mecanismo, e eu não altero a severidade daquele finding** (Regra 15). Proponho LOW próprio pela parte inédita — as duas tabelas adicionais — e recomendo que o director trate as três sob o mesmo caso de remediação.

**Critério de reteste:** domínio único para resultado de aptidão nas quatro tabelas, em migration versionada, com teste que reprove divergência de valor entre `sst_asos.resultado` e as três cópias de RH.

---

## 4. Conformidades verificadas — 8, incluindo **3 falsos positivos evitados**

**4.1 — Falso positivo evitado, e teria sido o achado mais espetacular do lote.** A saída de `Grep` exibiu `router.post('\aso:id/complementary-exams', …)` e `router.get('\accidents:id', …)`, o que sugeria barra invertida no path — e, em JavaScript, `'\a' === 'a'`, de modo que as rotas de criação de exame complementar e de leitura de acidente **nunca casariam**, deixando a tabela de dado clínico sem caminho de escrita. **A hipótese é falsa.** Li o arquivo diretamente: `sst.ts:67` é `'/aso/:id/complementary-exams'` e `sst.ts:71` é `'/accidents/:id'`, corretos. O artefato do defeito era o **renderizador da ferramenta de busca**, não o código-fonte. **Registro com destaque** porque é uma variante nova da armadilha de `T-42` §7.1: ali o instrumento estava desatualizado, aqui o instrumento **transformou o dado**. Regra que passo adiante: *achado que dependa da forma exata de um literal deve ser confirmado por leitura do arquivo, nunca por saída de grep.*

**4.2 — O trigger `sst_lock_acidente` é imutabilidade real, imposta pelo banco.** `:2900-2935` + `TRIGGER … BEFORE DELETE OR UPDATE` (`:22226`). Bloqueia `DELETE` de acidente confirmado (`:2906`) e restringe `UPDATE` a `dias_perdidos`/`houve_cat` comparando **doze** colunas uma a uma. É lastro no mecanismo, não na prosa, para RNF-SST-01/BR-SST-017 — e o desenho que usa `IS NOT DISTINCT FROM` nas nullables prova que o autor conhecia a armadilha, o que torna `T43-SST-F03` um lapso pontual e não um mal-entendido.

**4.3 — A trilha de auditoria da alteração pós-confirmação é insert-only e transacional.** `sst_acidente_complementos` não tem `updatedAt` (`SstAcidenteComplemento.ts:41`) nem coluna `updated_at` no DDL (`:12721-12729`) — insert-only por construção. E `CreateAccidentComplementUseCase.ts:46-65` grava o complemento **e** atualiza a coluna consolidada **na mesma transação**, com `lock: transaction.LOCK.UPDATE` na leitura prévia (`SequelizeAccidentRepository.ts:68`). `motivo text NOT NULL` (`:12727`) — não se altera um acidente confirmado sem dizer por quê. **É o oposto exato de `T43-SST-F01`, no mesmo módulo.**

**4.4 — O `CHECK` de não-negatividade de `dias_perdidos` é o backstop que a aplicação não tem.** `CreateAccidentComplementUseCase.ts:39-44` valida o **nome** do campo, mas não o tipo nem o sinal do `valor`. Um complemento com `valor: -5` chega ao banco — e `ck_sst_acidentes_dias_perdidos_nao_negativo` (`:12821`) o rejeita. **É exatamente o caso de uso de constraint de banco que esta célula defende**, e aqui ele está presente e funcionando.

**4.5 — O par N:N de testemunhas está corretamente restringido.** `uq_sst_acidente_testemunhas_par (acidente_id, employee_id)` (`:22072`) impede testemunha duplicada; `employee_id → employees ON DELETE RESTRICT` (`:25416`) preserva o vínculo; `acidente_id → sst_acidentes ON DELETE CASCADE` (`:25408`) é a exceção **justificada por escrito** no `COMMENT` `:12776`, e é coerente: o acidente confirmado não pode ser apagado pelo trigger, então o `CASCADE` é inalcançável na prática. Cobertura completa dos critérios de `C-137` **sem nenhum finding** — a única das 8 nessa situação.

**4.6 — `hr_termination_processes` tem a única coluna gerada pelo banco encontrada nesta célula.** `payment_deadline date GENERATED ALWAYS AS ((termination_date + 10)) STORED` (`:6317`), com `COMMENT` citando o CLT art. 477 §6º (`:6326`) e **índice** sobre ela (`:19503`). É a resposta correta a um prazo legal derivado — e é precisamente o que `T42-PCP-F02` pediu como remediação alternativa para identidades aritméticas. **O projeto já domina a técnica**; ela só não está aplicada onde `T-42` apontou.

**4.7 — O portão de ASO é uma função de domínio única, compartilhada, com data injetável.** `asoGate.ts:20-28` é reutilizado por admissão, demissão e retorno de afastamento, recebe `today` como parâmetro para teste determinístico (`:17`) e declara sua própria fronteira (`:6-7`: *"nunca chama o módulo SST em tempo real"*). Desenho correto e testável. O defeito de `T43-RH-F04` é **o que não está ligado a ele**, não ele.

**4.8 — `EmitCatUseCase` propaga a transação às três escritas e não descarta a obrigação vencida.** `:49-92` — CAT, evento S-2210 e complemento de auditoria na mesma `t`; e `:12-14` declara que prazo já vencido **não** bloqueia a emissão, *"o evento nasce como pendência crítica visível na fila, nunca descartado"*. É a decisão correta para obrigação acessória, e o `prazo_limite` **é** calculado e gravado (`:61,:76`) — ao contrário do S-2220 (§6, divergência 2).

---

## 5. Classificação de dado sensível — tranche `T-43`

Esta é, por determinação do mandato, a entrega de maior valor do lote. **Nenhuma** das colunas abaixo tem `COMMENT` de sensibilidade no DDL, e **nenhuma** passa por sanitizador — exceto onde indicado.

| Coluna | Categoria LGPD | Sensibilidade | Situação |
|---|---|---|---|
| `sst_acidentes.descricao` (`:12809`) | art. 5º II — saúde | **Alta** — narrativa da lesão | **NÃO classificada** |
| `sst_acidentes.parte_corpo_atingida` (`:12810`) | art. 5º II — saúde | **Alta** — lesão corporal identificada | **NÃO classificada** |
| `sst_acidentes.gravidade` (`:12812`) | art. 5º II — saúde | **Alta** — inclui `incapacidade_permanente` e `obito` | **NÃO classificada** |
| `sst_acidentes.dias_perdidos` (`:12813`) | art. 5º II — saúde | **Média** — duração da incapacidade | **NÃO classificada** |
| `sst_acidentes.tipo` (`:12807`) | art. 5º II — saúde | **Alta** quando `doenca_ocupacional` | **NÃO classificada** |
| `sst_exames_complementares.tipo_exame` (`:13382`) | art. 5º II — saúde | **Alta** — revela qual órgão/função foi investigado | **NÃO classificada** |
| `sst_exames_complementares.alterado` (`:13385`) | art. 5º II — saúde | **Alta** — é a conclusão clínica | **NÃO classificada**; `DEFAULT false` |
| `sst_exames_complementares.resultado_laudo_url` (`:13384`) | art. 5º II — saúde | **Alta** — ponteiro para laudo | **NÃO classificada** |
| `sst_investigacoes_acidente.evidencias_urls` (`:13600`) | art. 5º II — saúde | **Alta** — *"fotos/depoimentos"* (`:13633`), texto livre | **NÃO classificada** — 6ª ocorrência de `AUD-DB-T31-08` |
| `sst_investigacoes_acidente.causas_identificadas` (`:13598`) | art. 5º II — saúde | **Média-alta** | **NÃO classificada** |
| `sst_investigacoes_acidente.participantes` (`:13599`) | art. 5º I — dado pessoal de terceiros | **Média** — nomes em texto livre, FK dispensada por decisão declarada (`:13626`) | **NÃO classificada** |
| `sst_acidente_complementos.valor_novo`/`motivo` (`:12726-12727`) | art. 5º II — saúde | **Média** — extensão do afastamento e sua razão | **NÃO classificada** |
| `hr_admission_processes.aso_result` (`:5709`) | art. 5º II — saúde | **Alta** — aptidão laboral | **NÃO classificada**; **usada** no portão (`ConcludeAdmissionProcessUseCase.ts:119`) |
| `hr_admission_processes.aso_valid_until` (`:5710`) | art. 5º II — saúde | **Média** | **NÃO classificada** |
| `hr_admission_processes.candidate_cpf` (`:5695`) | art. 5º I | **Média** — CPF de candidato **não contratado** | **NÃO classificada**; sem prazo de descarte |
| `hr_termination_processes.aso_result` (`:6308`) | art. 5º II — saúde | **Alta** | **NÃO classificada** e **write-only** — `T43-RH-F04`; **art. 6º III violado** |
| `sst_ges_funcionarios.*` (`:13449-13453`) | art. 5º II — saúde ocupacional (derivada) | **Média** — vincula pessoa a agente de risco | **NÃO classificada** |
| `sst_asos.restricoes` (`SstAso.ts:45`) | art. 5º II — saúde | **Alta** | **CLASSIFICADA** — `comment: 'Dado clínico sensível (LGPD)'`. **Única de todo o cluster.** |
| `hr_absences.cid` | art. 5º II — saúde | **Alta** | **CLASSIFICADA E PROTEGIDA** — `sanitizeAbsence`, interseção `rh`+`sst` |

**Resultado do censo de classificação: 18 colunas de dado de saúde identificadas nesta tranche; 1 classificada em `comment` de model; 0 protegidas por sanitizador. Somando `hr_absences.cid` (protegida) e `employees.pcd` (protegida), o projeto protege 2 colunas de saúde e deixa 18 sem qualquer marcação.**

---

## 6. Divergências registradas (Regra 20)

1. **`T-42` §6 × realidade — erro meu, e desta vez ele foi contra o objeto auditado.** `T-42` §6 afirmou: *"existe **um** mecanismo executável de classificação no projeto — `employeeSensitiveFields.ts` — cobrindo **uma** tabela"*. **É falso: existem dois.** `rhSensitiveFields.ts` cobre `hr_absences.cid` com exigência de interseção `rh`+`sst`, está ligado em 5 rotas e foi verificado por `T-12` e `T-14` (BR-RH-D06 `CONFIRMADA`). Eu **subestimei os controles do produto**. Reporto com o mesmo destaque com que reportei o erro a meu favor em `T-42` §10.1 — a disciplina de contagem honesta não vale só numa direção. `T-42` **não é alterado** (Regra 15); a leitura corrigida é esta.
2. **`T42-FIS-F03` ponto 2 × `CreateAsoUseCase.ts:87-92` — materialização estática que eu havia declarado apenas latente.** `T42-FIS-F03` registrou `prazo_legal` nullable como defeito latente e pediu evidência dinâmica (`DYN-T42-05`). **Não era preciso:** o caminho normal de criação de ASO enfileira o S-2220 **sem `prazo_legal`** — o objeto passado tem só `tipo`, `origem_tipo`, `origem_id`, `status`. Logo **todo** evento S-2220 nasce com prazo legal nulo. O contraste é interno ao módulo: `EmitCatUseCase.ts:76` **passa** `prazo_legal: prazoLimite` para o S-2210. **Não altero a severidade de `T42-FIS-F03`** (Regra 15) — registro a evidência nova e a submeto ao director, com a observação de que ela converte "latente" em "sistemático para um dos três tipos de evento".
3. **`APR-2026-037` §4 × censo — a categoria é 3,7× maior que a marcação.** 11 tabelas, não 3. A condição vinculante prevê exatamente isto e foi cumprida: o excedente entrou na cobertura. Registro que a marcação subestimada era **minha**, em `T-42` §2.4, e que ela decorreu de destacar as tabelas com nome obviamente clínico — `sst_*` — e não aplicar o critério de coluna às tabelas de RH, que foi o mesmo viés módulo × banda que eu próprio denunciei em `T-41` §4.
4. **`ConfirmTerminationAsoResultUseCase.ts:6-8` × `ConcludeTerminationProcessUseCase.ts:71`** — o artefato afirma que o endpoint é necessário para satisfazer um portão que não lê a coluna que ele grava. Fonte autoritativa: o código do portão. **Não altero os arquivos** (Regra 2).
5. **`APR-2026-037` §4 ("dado de saúde") × art. 5º II (categoria especial inteira)** — a citação legal é mais ampla que o substantivo. Não resolvi por conta própria; devolvido como `RES-T43-01` (§1.5).
6. **`sst_acidente_testemunhas`: cobri uma tabela que meu próprio critério excluiria.** Declaro para que a contagem não seja lida como inflada: das 8 tabelas de §2, **7** carregam dado de saúde e **1** não. Se o director preferir a contagem estrita, é **7**, e `A(74/207)`. Uso 8 porque a cobertura foi efetivamente executada nos 7 critérios.

---

## 7. Pedidos de evidência dinâmica — registrados, **NÃO executados**

Nenhum executado. Nenhuma conexão a `erp_evok_audio` aberta. `APR-2026-016` íntegra.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T43-01` | Existe `sst_asos` **sem** `sst_eventos_esocial` `S-2220` correspondente (`origem_tipo='aso'`)? Existem dois ASOs do mesmo `employee_id`+`tipo`+`data_realizacao`? | Materializa `T43-SST-F01` nas duas pontas — obrigação perdida e laudo duplicado. Qualquer linha confirma o HIGH. |
| `DYN-T43-02` | Existe `sst_acidentes` com `confirmado = true` e `confirmado_em IS NULL`? | Materializa `T43-SST-F03`. **≥ 1 linha ⇒ severidade sobe a HIGH** — há acidente que não aceita CAT. |
| `DYN-T43-03` | Existe `sst_acidentes` com `houve_cat = false` e `justificativa_sem_cat IS NULL`? E com `gravidade='com_afastamento'` e `dias_perdidos = 0`? | Mede `T43-SST-F02` e o indicador de gravidade. |
| `DYN-T43-04` | Existe `hr_termination_processes` com `aso_result = 'inapto'` e `status = 'concluido'`? | Materialização exata de `T43-RH-F04`: demissão concluída com inaptidão registrada. Havendo linha, sobe a HIGH. |
| `DYN-T43-05` | Quantas linhas de `hr_termination_processes` têm `aso_result` preenchido? | Mede o volume de dado de saúde retido sem finalidade (art. 6º III). **Zero também é informação** — indicaria coluna nunca usada, e a remediação passa a ser remoção. |
| `DYN-T43-06` | Existe `sst_investigacoes_acidente` com `causas_identificadas IS NULL` ou `concluida_em IS NULL` vinculada a acidente de gravidade grave? | Materializa `T43-SST-F06` — portão satisfeito por investigação vazia. |
| `DYN-T43-07` | Existe `sst_ges_funcionarios` duplicado em `(ges_id, employee_id)` com períodos sobrepostos, ou com `fim_exposicao < inicio_exposicao`? | Materializa `T43-SST-F09` e mede o impacto no S-2240/PPP. |
| `DYN-T43-08` | Existe `sst_exames_complementares` com `data_realizacao` anterior à `data_realizacao` do ASO pai, ou no futuro? Quantos valores distintos tem `tipo_exame`? | Mede `T43-SST-F05`; a cardinalidade de `tipo_exame` diz se o texto livre já degradou o domínio. |
| `DYN-T43-09` | Existe divergência entre `sst_asos.resultado` e `hr_admission_processes.aso_result` / `hr_termination_processes.aso_result` para o mesmo funcionário e período? | Mede `T43-META-F11` e amplia `DYN-T41-03` às duas tabelas novas. |
| `DYN-T43-10` | **Pergunta de método:** as 21 tabelas sem model contêm coluna cujo nome case com o léxico clínico (`cid`, `exame`, `laudo`, `atestado`, `aptid`, `lesao`, `medic`)? | **Única forma de fechar o buraco do censo** (`RES-T43-05`). Sem isto, a categoria está fechada *entre as tabelas nomeáveis*, não *entre todas as tabelas*. |

---

## 8. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T43-01` | **Biometria (`sst_entregas_epi.evidencia_tipo='biometria'`) é art. 5º II mas não é saúde.** Exige decisão humana sobre se o mandato de `APR-2026-037` §4 cobre a categoria especial inteira. Não decidido por mim (Regra 6). |
| `RES-T43-02` | **Nível de isolamento das transações continua não verificado** (mantém `RES-T42-03`). `T43-SST-F01` não depende disso, mas a análise de concorrência de `sst_asos` sim. |
| `RES-T43-03` | **Busca de consumidor não exaustiva** para `sst_ges_funcionarios` (nenhum consumidor lido — cobertura por DDL), para `alterado` de `sst_exames_complementares`, e para o gerador do evento S-2240. As severidades LOW de `T43-SST-F09` e MEDIUM de `T43-SST-F05` dependem disso. |
| `RES-T43-04` | **`sst_asos` foi relida nesta trilha** (necessária para auditar `sst_exames_complementares`, que é sua composição) e produziu `T43-SST-F01`. **Não é contada como cobertura nova** — já constava de `T-41` §6.1. Mesma disciplina de `T-35:83`. |
| `RES-T43-05` | **21 tabelas sem model continuam não censáveis.** Não posso afirmar que não contêm dado de saúde. **É a única condição que impede dizer que a categoria está fechada em termos absolutos** (§9). Mantém `RES-T42-05`/`RES-T41-07`/`RES-T35-02`. |
| `RES-T43-06` | **`00_baseline_frozen.sql` ≥ 9 migrations atrasado** (mantém `RES-T42-04`). Não afetou este lote (§2), mas segue afetando a célula. |
| `RES-T43-07` | Denominador **207 herdado**, não reconstruído (mantém `RES-T31-01`/`RES-T35-01`/`RES-T41-06`/`RES-T42-06`); `git diff c1311a6..HEAD` **não reconfirmado**. |
| `RES-T43-08` | Reconciliação `COMMENT ON COLUMN` × `comment:` feita **apenas** nas 8 tabelas deste lote; não é censo (mantém `RES-T42-07`). |
| `RES-T43-09` | **`APR-2026-037` §7 deixou aberta a relação entre esta emenda e o gate G3** (`APPROVED_WITH_CONDITIONS`), que veda amostragem em dado pessoal. Observo que o fechamento da categoria dado de saúde **reduz** a tensão com o G3, mas não a elimina: as 14 tabelas de dado pessoal não-saúde da §5.2 seguem excluídas e o G3 fala em "dado pessoal", não em "dado de saúde". **Ponto do director, não meu.** |

---

## 9. Estado

- **Célula `C-137`:** `A(67/207)` → **`A(75/207)`**, delta **`+8`**. **NÃO FECHADA.** Déficit **132/207** (131 pela aritmética de `T41-META-F09`). Contagem estrita alternativa em §6.6: `A(74/207)`, delta `+7`.
- **CENSO da categoria dado de saúde: 11 tabelas, não 3** — condição vinculante de `APR-2026-037` §4 cumprida; conjunto nominal em §1.2, critério por tabela em §1.1, faixas negativas em §1.4.
- **`APR-2026-037` §5.2 — três tabelas SAEM da exclusão declarada e entraram na cobertura:** `sst_investigacoes_acidente`, `hr_admission_processes`, `hr_termination_processes`. Mais `sst_ges_funcionarios`, que sai da exclusão de 2ª ordem. **A lista de exclusão da §5.2 passa de 14 para 11 tabelas, e a de 2ª ordem de 23 para 22.** O director deve refletir isso no relatório final; **eu não altero `APR-2026-037`** (Regra 15 / ownership de `coretriad/`).
- **DECLARAÇÃO DE FECHAMENTO — categoria DADO DE SAÚDE DE TRABALHADOR: 11/11 cobertas.** 4 em trilhas anteriores (`sst_asos`, `sst_cats`, `hr_employee_documents` em `T-41`; `hr_absences` em `T-13`) e **7 nesta**, todas com model lido coluna a coluna **e** verificação externa. **Nada da categoria ficou de fora — com uma única ressalva, declarada e não minimizada:** o censo alcança apenas as tabelas **nomeáveis**; as **21 sem model** (`RES-T43-05`) não puderam ser censadas, e `DYN-T43-10` é o que falta para tornar o fechamento absoluto. **A categoria está fechada entre as 186 tabelas com model. Não está provada fechada entre as 207.**
- **Findings `PROPOSED`: 11** — **0 CRITICAL, 1 HIGH** (`T43-SST-F01`), **7 MEDIUM** (`F02`, `F03`, `F04`, `F05`, `F06`, `F07`, `F10`), **3 LOW** (`F08`, `F09`, `F11`). **`T43-SST-F01` vai ao `vericore-finding-validator` por força da Regra 22.** O teste do consumidor real foi aplicado aos onze; **um** passou, e o parágrafo que o sustenta está em `T43-SST-F01`; os dez restantes têm o motivo da reprovação escrito individualmente.
- **Conformidades verificadas: 8**, incluindo **1 falso positivo evitado de alto impacto** (§4.1 — o defeito estava na saída do grep, não no código) e duas contraprovas que reduziram severidade (§4.7 `asoGate`, §4.4 `CHECK` de `dias_perdidos`).
- **Classificação de dado sensível: 18 colunas de dado de saúde identificadas**, 1 classificada, 0 protegidas por sanitizador; 2 mecanismos executáveis existem no projeto e nenhum cobre SST (§5, `T43-LGPD-F10`).
- **Divergências registradas: 6**, uma delas **erro de contagem meu contra o objeto auditado** (§6.1 — subestimei os controles existentes) e outra **subestimação minha do tamanho da categoria** (§6.3).
- **Resíduos: 9. Pedidos dinâmicos: 10, nenhum executado.**
- **Banco de produção: não acessado.** `APR-2026-016` íntegra. Nada gravado fora de `audit/`.
- `T-13`, `T-31`, `T-35`, `T-41`, `T-42` e `AUD-DB-09_RETIFICACAO_01` **não foram alterados** (Regra 15). Nenhuma severidade de finding anterior alterada.
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.

---

**O que exige decisão antes de qualquer próximo passo:**

1. **`T43-SST-F01` é o primeiro HIGH da célula `C-137` desde `T-41`** e é de atomicidade sobre dado clínico + obrigação eSocial. Vai ao validator; a remediação é de três linhas e não exige migration.
2. **`APR-2026-037` §5 precisa ser retificada pelo director** — quatro tabelas saíram da exclusão por força da própria condição vinculante da decisão. A lista nominal do relatório final deve ser a de §9, não a de `APR-2026-037` §5.2.
3. **`RES-T43-01` (biometria) e `RES-T43-09` (relação com o G3)** são as duas perguntas que sobram sobre categoria especial de dado pessoal, e nenhuma delas é do auditor.
