# T-45 — `C-137` Semântica de coluna, LOTE 6 (censo e fechamento da categoria DADO BIOMÉTRICO)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-45` (continuação de `T-13` → `T-31` → `T-35` → `T-41` → `T-42` → `T-43`, célula `C-137`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-database-auditor` |
| Natureza | Auditoria **estática** sobre artefatos versionados |
| Mandato | **`APR-2026-039`** §3 (expansão à categoria especial completa, art. 5º II) e sua condição vinculante |
| Banco acessado | **NENHUM** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`, nenhuma contagem de linha. |
| Artefatos anteriores | `T-13`, `T-31`, `T-35`, `T-41`, `T-42`, `T-43`, `AUD-DB-09_RETIFICACAO_01` — **não alterados** (Regra 15) |

> **Nota de persistência.** Agente titular sem `Write` (idem `T-31:12-13`, `T-35:13`, `T-41:14`, `T-42:14`, `T-43:14`). Persistido pelo orquestrador **sem alteração**.

---

## 1. CENSO da categoria BIOMETRIA — condição vinculante de `APR-2026-039` §3

`APR-2026-039` §3 fixa, com a mesma força da §4 de `APR-2026-037`: *"Entram na cobertura `sst_entregas_epi` e `sst_devolucoes_epi`, **e qualquer outra tabela que o censo de biometria revelar** — a decisão é sobre a categoria, não sobre o número."*

**Fiz o censo antes de auditar.** A lição de `T-43` §6.3 — triar por **nome de módulo** em vez de **critério de coluna** foi o que subestimou a categoria saúde em 3,7× — foi aplicada literalmente: varri o schema inteiro por léxico de coluna sobre `00_baseline_frozen.sql`, não por módulo.

**Resultado: 5 tabelas na categoria, não 2.** E, ao mesmo tempo, **uma das duas nomeadas pela decisão não tem coluna biométrica** — reporto as duas direções do erro (§6.1, §6.3).

### 1.1 Critério de inclusão, declarado antes de aplicado

Uma tabela entra na categoria **dado biométrico (LGPD art. 5º II)** se tiver ao menos uma coluna que **armazene, ou aponte para, característica física ou comportamental de pessoa natural usada para identificar ou autenticar** essa pessoa. Três fronteiras, declaradas porque são exatamente onde o critério pode ser esticado ou encolhido:

- **Núcleo.** Digital, face, íris, voz, grafometria — a característica em si, ou ponteiro para o artefato que a contém. Entra sem discussão.
- **Fronteira A — imagem de pessoa.** Foto de pessoa natural entra **se houver evidência de uso para identificar/conferir identidade**. Foto de **objeto** (ativo, produto, tipo de EPI) **não entra** — não há pessoa. Foto de pessoa sem uso identificatório demonstrável fica em **discutível**, nominada, não contada.
- **Fronteira B — assinatura.** Assinatura manuscrita digitalizada entra como **biometria comportamental em sentido amplo** e é marcada como **discutível**; a rigor técnico, grafometria (pressão/velocidade) é biométrica e imagem estática de assinatura é dado pessoal comum. Cubro, mas não conto como núcleo. **Metadado do ato de assinar não entra**: `signed_at`, `signatory_role`, `is_signed_version` são fatos jurídicos, não características da pessoa.

**Nota de consistência.** O próprio schema trata `biometria` e `assinatura_digitalizada` como valores **distintos** do mesmo enum (`:2359-2363`) — o desenhista os separou. Adoto a mesma separação: núcleo × fronteira B.

### 1.2 O conjunto nominal completo — **5 tabelas**

| # | Tabela | Coluna(s) que a qualificam | Evidência | Fronteira | Situação |
|---|---|---|---|---|---|
| 1 | `sst_entregas_epi` | `evidencia_tipo` admite **`'biometria'`**; `evidencia_arquivo_url` aponta o artefato | enum `:2359-2363`; DDL `:13214-13215`; `SstEntregaEpi.ts:46-47` | **Núcleo** | **LOTE 6 — coberta** |
| 2 | `sst_devolucoes_epi` | **nenhuma** — entra por mandato expresso (`APR-2026-039` §3) e por derivabilidade N:1 com a linha que carrega a evidência | DDL `:13165-13172` (6 colunas, todas não-biométricas); FK `:25528` | — | **LOTE 6 — coberta** |
| 3 | `sst_estornos_entrega_epi` | **nenhuma própria** — é o canal declarado de correção da linha imutável que carrega a biometria | DDL `:13285-13291`; migration `20260806-000131:20-23,145-164` | — | **LOTE 6 — auditada por DDL, NÃO contada** (§2.1) |
| 4 | `facility_visitors` | **`photo_path`** — imagem facial de visitante capturada no controle de acesso, junto de `document` e crachá | DDL `:5544`; `FacilityVisitor.ts:32`; `VisitUseCases.ts:53-73` (check-in por documento + foto + `badge_number` + `areas_authorized`) | **A — qualifica** | **LOTE 6 — coberta. SAI da exclusão `APR-2026-037` §5.2** |
| 5 | `it_responsibility_terms` | `acceptance_type='physical_signature'` + `signed_document_path` — termo assinado de próprio punho, digitalizado | DDL `:7348-7349`; enum `:1044-1047`; `ItResponsibilityTerm.ts:52-53` | **B — discutível** | **LOTE 6 — coberta** |

### 1.3 Casos discutíveis, nominados como o critério exige

- **`employees.photo_url` (`:4884`) — fronteira A, NÃO resolvida.** É foto de pessoa natural. **Não encontrei uso identificatório**: não há endpoint de upload para ela (o helper genérico `UploadEntityPhotoUseCase` opera sobre `photo_path`, e `employees` usa `photo_url`), não há `COMMENT`, e nenhum consumidor lido a usa para conferir identidade. Pelo critério, **fica fora**. Registro dois fatos que o dono precisa ter à vista para decidir: ela **não** consta de `SENSITIVE_EMPLOYEE_FIELDS` (`employeeSensitiveFields.ts:36-51`) e `GET /api/employees` é **acessível a qualquer autenticado** (`:5-11` do mesmo arquivo, por decisão declarada) — logo a foto de rosto de todo funcionário é legível por todo usuário logado. Se a foto for usada em crachá ou portaria, ela é fronteira A qualificada e `employees` entra como **6ª tabela**. **Não decido isto** (Regra 6) — `RES-T45-01`.
- **`hr_admission_processes.checklist_photo` (`:5704`) — NÃO entra.** É `boolean` de checklist ("foto 3×4 entregue" — `CreateAdmissionProcessUseCase.ts:15` mapeia `foto → checklist_photo`), não o artefato. Flag de conferência documental, não característica. A tabela já está coberta por `T-43` §2.
- **`sst_acoes_corretivas.evidencia_conclusao_url` (`:12885`) e `jur_legal_case_deadlines.evidence_file_path` (`:8584`) — NÃO entram.** Evidência de conclusão de ação corretiva e prova processual; o objeto é o fato, não a pessoa.
- **`sst_investigacoes_acidente.evidencias_urls` (`:13600`, *"fotos/depoimentos"*) — NÃO recontada.** Fotos de lesão são **saúde**, já contadas e classificadas em `T-43` §5. Recontá-las aqui inflaria a categoria por dupla contagem.

### 1.4 Censo negativo, declarado por faixa

- **Fotos de objeto — descartadas com motivo:** `assets.photo_path` (`:3527`), `products.photo_path` (`:11235`), `sst_tipos_epi.foto_url` (`:14376`). Não há pessoa; fronteira A não se aplica.
- **Metadado de assinatura — descartado com motivo:** `jur_contracts.signed_at` (`:8155`), `jur_contract_addendums.signed_at` (`:7951`), `jur_contract_documents.is_signed_version` (`:8038`), `jur_contract_signatories.signatory_role`/`signed_at` (`:8077,:8081`). As sete colunas de `jur_contract_signatories` (`:8074-8083`) são `contract_id`, `signatory_role`, `name`, `document`, `employee_id`, `signed_at`, `created_at` — **nenhum artefato de assinatura**, apenas o fato jurídico. Confirma a exclusão da tabela na §5.2 de `APR-2026-037` **pelo critério de biometria** (ela continua sendo dado pessoal).
- **Ponto/catraca/biometria de jornada — NÃO existe no schema.** Hipótese forte que abri e que morreu na leitura: `hr_time_import_batches`/`hr_time_import_items` recebem **AEJ** (Arquivo Eletrônico de Jornada, Portaria MTP 671/2021 Anexo IX), que é a **jornada já tratada**, não a marcação bruta do REP. `aejParser.ts:19-26,45-56` prova o layout: `CPF;MATRICULA;DATA;HORAS;HE_50;HE_100;NOTURNAS;FALTA;ABONO`. **Nenhum NSR, nenhum tipo de marcação, nenhum identificador biométrico.** Não há integração com catraca em lugar nenhum. **Fora da categoria** — e registro que essa era a candidata mais provável a priori, o que torna o resultado negativo informativo.
- **Autenticação — sem fator biométrico.** Nenhuma coluna de `users` armazena característica física; não há WebAuthn/passkey no schema.
- **21 tabelas sem model:** ver §6.2 — a afirmação de `T-43` de que elas "não são censáveis" **estava errada contra mim**, e a correção está registrada.

### 1.5 O que o censo prova sobre o número da decisão

`APR-2026-039` §3 falou em *"as duas tabelas de biometria"*. O censo devolve **5 na categoria** — e, dentro delas, **uma única** com coluna biométrica própria (`sst_entregas_epi`). **O excedente entra na cobertura**, conforme a condição vinculante. As duas direções do desvio estão em §6.1 e §6.3, sem arredondar nenhuma.

---

## 2. Tabelas cobertas nesta trilha — **4**

Regra de contagem mantida sem afrouxamento em seis lotes (`T-35`, `T-41` §6.1, `T-42` §3, `T-43` §2): **model lido coluna a coluna E pelo menos uma verificação externa**. Model sozinho não conta.

| # | Tabela | Model lido | Verificação externa que a qualificou |
|---|---|---|---|
| 1 | `sst_entregas_epi` | `SstEntregaEpi.ts:20-62` (14 atributos) | DDL `:13206-13258` (1 `CHECK`, 4 `COMMENT`), **migration `20260806-000131:63-121`**, trigger `sst_lock_entrega_epi` `:2971-2988` + `:22240`, 4 FKs `:25544,:25552,:25560,:25568`, 4 índices `:21253-21274`; consumidores `AttachEpiDeliveryEvidenceUseCase.ts:29-46`, `ConfirmEpiDeliveryUseCase.ts:49-94`, `ReturnEpiDeliveryUseCase.ts:33-52`, `EpiMapper.ts:92-114`, rotas `sst.ts:48-55`, cliente `EpiTab.tsx:337-392` |
| 2 | `sst_devolucoes_epi` | `SstDevolucaoEpi.ts:14-35` (5 atributos, `updatedAt: false`) | DDL `:13165-13179` (1 `COMMENT`), migration `:123-143`, FKs `:25528`(RESTRICT), `:25536`, índice `:21246`; consumidores `ReturnEpiDeliveryUseCase.ts:44-51`, `SequelizeEpiRepository.ts:137,147,174-176,182` |
| 3 | `facility_visitors` | `FacilityVisitor.ts:15-40` (6 atributos) | DDL `:5538-5547`, PK `:16867`, índice `:19230` (**não único**), FK entrante `:22768` (RESTRICT); consumidores `VisitorUseCases.ts:12-53`, `VisitUseCases.ts:47-74`, validador `visitValidators.ts:16`, rotas `facilities.ts:96-103` |
| 4 | `it_responsibility_terms` | `ItResponsibilityTerm.ts:16-60` (19 atributos) | DDL `:7339-7388` (4 `COMMENT`), UNIQUE `:17163`, **índice único parcial `:22023`**, 3 índices `:19727-19741`, 6 FKs `:24232-24272`; consumidores `CreateResponsibilityTermUseCase.ts:33-68`, `termValidators.ts:16-27`, `TermMapper.ts:20-27` |

### 2.1 A quinta tabela da categoria não é contada — e o motivo é a minha própria regra

**`sst_estornos_entrega_epi` foi auditada** (DDL `:13285-13291`, migration `:145-164`, PK `:18107`, 2 FKs `:25576,:25584`, índice `:21281`) **e NÃO é contada como cobertura**, porque **não tem model** e a regra exige model lido coluna a coluna. Se eu a contasse, o delta seria `+5` e a régua teria sido afrouxada no lote em que ela mais rende. **Delta é `+4`.** O que ela produziu — `T45-SST-F02` — é um finding, não cobertura.

### 2.2 Nota de método aplicada a mim mesmo (`RES-T42-04`)

As 4 tabelas contadas vêm das migrations `20260806-000131` (3 do cluster EPI), `20260807-000298` (`facility_visitors`) e `20260807-000152` (`it_responsibility_terms`) — **todas anteriores ao corte `20260810-000038`**. Verifiquei `CREATE TABLE` no baseline para cada uma. Portanto, **nesta trilha, "não achei o `CHECK` no baseline" É evidência de ausência** — e, para as duas do cluster EPI, ainda confirmei a ausência **na migration original**, que é a fonte primária. A armadilha de `T-42` §7.1 foi verificada e não se aplica; digo isso explicitamente para que a conclusão não seja lida com a ressalva errada.

---

## 3. Findings `PROPOSED`

Severidade e confiança **separadas**. Régua mantida: **HIGH exige que o defeito ocorra pelo caminho normal do sistema, com consumidor real** — 2 HIGH em `T-41`, 0 em `T-42`, 1 em `T-43`. Neste lote **um** passou; os demais reprovaram e cada reprovação está explicada.

---

### `T45-SST-F01` — O portão que exige evidência de recebimento de EPI verifica **o rótulo**, não o artefato: `evidencia_tipo='biometria'` com `evidencia_arquivo_url` NULL confirma a entrega, e a linha fica **imutável para sempre**

**Severidade proposta: HIGH · Confiança: ALTA quanto ao mecanismo (leitura direta de três artefatos); MÉDIA quanto à frequência**
→ **Regra 22: vai ao `vericore-finding-validator`.**

BR-SST-002 exige evidência de recebimento antes de confirmar a entrega de EPI — documento de valor probatório em ação trabalhista/previdenciária, como a própria migration declara (`20260806-000131:16-18`). O portão está em `ConfirmEpiDeliveryUseCase.ts:62-64`:

```
62      if (!entrega.evidencia_tipo) {
63        throw new BusinessRuleError('Evidência de recebimento ausente — confirmação bloqueada (BR-SST-002, E2).');
64      }
```

**Verifica `evidencia_tipo`. Não verifica `evidencia_arquivo_url`.** E o gravador não o exige tampouco — `AttachEpiDeliveryEvidenceUseCase.ts:30-42` valida **só** o tipo contra a lista, e grava o artefato como opcional:

```
30      if (!body.tipo_evidencia || !EVIDENCIA_TIPOS.includes(body.tipo_evidencia)) { … }
…
41        evidencia_tipo: body.tipo_evidencia,
42        evidencia_arquivo_url: body.arquivo_url ?? null
```

**O banco não supre.** `sst_entregas_epi` tem **um único `CHECK`** — `ck_sst_entregas_epi_quantidade_positiva` (`:13222`, migration `:114-116`). **Nada liga `evidencia_tipo` a `evidencia_arquivo_url`.** Confirmado nas duas fontes (baseline e migration original), não por grep.

**O que torna isto irreversível, e é a parte que eleva a severidade.** Confirmada a entrega, o trigger `sst_lock_entrega_epi` (`:2971-2988`, `:22240`) recusa **todo** `UPDATE` e **todo** `DELETE` — sem exceção, e a migration declara que é assim de propósito (`:16-18`: *"nenhuma exceção, nem para campos 'inofensivos'"*). Logo uma linha que diz **"a biometria do trabalhador foi coletada"** e não aponta artefato nenhum **não pode mais ser corrigida nem completada** — e o canal declarado de correção não existe (`T45-SST-F02`).

**Por que HIGH — o teste aplicado, e ele passou.** O defeito está no caminho normal e único de escrita (`PATCH /epi-deliveries/:id/evidence` → `POST /epi-deliveries/:id/confirm`, `sst.ts:53-54`, literais confirmados por leitura direta), com consumidor real, e **não depende de escrita direta ao banco nem de concorrência**: basta uma chamada de API omitindo `arquivo_url`. O dano é **duplo e legalmente material** — a Ficha de EPI perde valor probatório em NR-6 exatamente quando a empresa precisar dela, **e** o registro afirma coleta de dado biométrico sem que exista artefato, o que é declaração falsa de tratamento de categoria especial. **Confiança MÉDIA quanto à frequência** porque a UI atual manda `arquivo_url` obrigatório (`EpiTab.tsx:338`, `min(1)`) — mas isso é validação **de navegador**, não do sistema, e nem sequer valida formato: a string `"n/a"` passa por `min(1)` e vira evidência permanente de biometria.

**Contraprova que procurei antes de acusar — e ela é o argumento mais forte do lote.** Verifiquei se a empresa sabe impor esse pareamento. **Sabe, e impõe — no ativo de TI.** `CreateResponsibilityTermUseCase.ts:35-36`:

```
35      if (input.acceptance_type === 'physical_signature' && !input.signed_document_path) {
36        throw new BusinessRuleError('O upload do termo assinado é obrigatório quando acceptance_type="physical_signature".');
```

**O sistema exige o documento assinado para entregar um notebook, e não exige o artefato biométrico para entregar um EPI.** É a mesma classe de contraste que registrei em `T-43` §RH-F04 — o `CHECK` que impõe devolução de crachá e não impõe exame demissional. A técnica está dominada, aplicada ao patrimônio e ausente na categoria especial de dado pessoal. Isso torna a correção **barata** e remove a defesa de "limitação de arquitetura".

**Critério de reteste objetivo (estático):** portão em `ConfirmEpiDeliveryUseCase` exigindo `evidencia_arquivo_url` não-nulo e não-vazio; validação de `arquivo_url` em `AttachEpiDeliveryEvidenceUseCase` (obrigatório quando `tipo ∈ {biometria, assinatura_digitalizada}`, com formato imposto); **e** `CHECK ((evidencia_tipo IS NULL) OR (evidencia_arquivo_url IS NOT NULL))` — ou, mais estreito, `CHECK ((evidencia_tipo NOT IN ('biometria','assinatura_digitalizada')) OR (evidencia_arquivo_url IS NOT NULL))` — em migration versionada; teste de integração que prove que `POST /confirm` recusa a linha rotulada sem artefato.

---

### `T45-SST-F02` — O único canal declarado de correção de um registro biométrico imutável **não existe no código**: `sst_estornos_entrega_epi` tem tabela, FKs e índice, e nenhum model, repositório ou rota

**Severidade proposta: MEDIUM · Confiança: ALTA (verificável por ausência exaustiva)**

A migration que cria a imutabilidade declara o remédio no mesmo arquivo (`20260806-000131:20-23`):

> *"Correções pós-confirmação (ex.: erro de lançamento) NÃO reabrem a linha: usam `sst_estornos_entrega_epi` (insert-only, trilha de auditoria) — a aplicação exibe a entrega original + o estorno, nunca apaga/edita a original."*

E o trigger repete a instrução ao usuário, em tempo de execução (`:2977`, `:2983`): *"Use sst_estornos_entrega_epi para correcao."*

**A tabela existe. A aplicação, não.** Busquei por nome em todo o repositório: `sst_estornos_entrega_epi` ocorre em **5 arquivos** — o baseline, a migration, dois documentos e a trilha `T-13`. **Zero ocorrências em `server/src/` e em `client/src/`.** Não há `SstEstornoEntregaEpi.ts` (censo de `server/src/models/Sst*.ts`: 34 models, nenhum de estorno), não há método no `EpiRepository`, não há rota (`sst.ts:48-55` tem 8 endpoints de EPI e nenhum de estorno).

**Consequência, em três camadas:**

1. **O trigger fecha a porta e aponta para uma saída que não foi construída.** Uma entrega confirmada com dado errado — inclusive a do `T45-SST-F01`, rotulada `biometria` sem artefato — não tem, hoje, **nenhum** caminho de correção pela aplicação.
2. **LGPD art. 18 (retificação e eliminação) é inalcançável para esta categoria.** O projeto tem uma tabela inteira para requisições de titular (`jur_lgpd_data_subject_requests`, `:8889-8910`, com dois `CHECK` e verificação de identidade imposta pelo banco) — mas, chegando um pedido de retificação sobre uma entrega de EPI confirmada, **não existe operação que o atenda** sem `UPDATE` direto por `psql`, que é justamente o que o trigger foi feito para impedir.
3. **A tabela é uma das 21 sem model** — e agora está **nomeada**. Ver §6.2.

**Por que MEDIUM e não HIGH — o teste do consumidor, aplicado com honestidade.** Não há consumidor: nada quebra, nada se corrompe, nenhuma resposta HTTP mente (ao contrário de `T43-SST-F07`, onde a API respondia `200` afirmando um encerramento que não gravava). O dano se materializa **quando** houver erro de lançamento ou pedido de titular — é ausência de capacidade, não defeito em execução. É a mesma faixa em que classifiquei `T43-SST-F07`, e mantenho a coerência.

**Critério de reteste:** model `SstEstornoEntregaEpi` + método de repositório + endpoint `POST /epi-deliveries/:id/estorno` (nível `approve`, no mesmo padrão de `confirm`) que grave `motivo text NOT NULL` e apareça na Ficha de EPI ao lado da entrega original, como a migration promete; **ou** decisão humana registrada removendo a promessa da migration e do trigger e declarando outro caminho. As duas são aceitáveis; o que não é aceitável é a instrução do trigger apontar para o vazio.

---

### `T45-FAC-F03` — A imagem facial do visitante escapa da função que mascara documento e telefone **na mesma instrução**

**Severidade proposta: MEDIUM · Confiança: ALTA (leitura direta de 4 linhas contíguas)**

`ListVisitorsUseCase` existe para devolver *"dados mascarados"* — é o que o próprio docstring diz (`VisitorUseCases.ts:18`). E ele mascara, com cuidado (`:26-29`):

```
26      const masked = rows.map((v: any) => {
27        const json = v.toJSON ? v.toJSON() : v;
28        return { ...json, document: maskDocument(json.document), phone: json.phone ? `***${String(json.phone).slice(-4)}` : null };
29      });
```

O spread `...json` devolve **tudo**; duas chaves são sobrescritas por versões mascaradas. **`photo_path` não é uma delas.** O resultado é invertido em relação ao risco: o **CPF** vira `***.***.789-00`, o telefone vira `***4321`, e a **fotografia do rosto** — identificador mais forte que os dois, e não revogável — vai íntegra na listagem.

O paralelo com `T43-LGPD-F10` é exato e o cito de propósito: lá, o **CID** de um afastamento era protegido campo a campo enquanto o laudo clínico completo do ASO não era. Aqui, o documento é mascarado e a face não é. **É o segundo caso, em duas trilhas, de sanitizador que protege o identificador fraco e deixa passar o forte.**

Três agravantes de contexto, todos verificados:

- **A tabela não registra quem capturou a face.** `facility_visitors` (`:5538-5547`) tem `created_at`/`updated_at` e **nenhum** `created_by`/`updated_by` — ao contrário de todo o cluster SST, onde `entregue_por`, `registrado_por` e `estornado_por` são `NOT NULL` com FK a `users`. Não há responsável rastreável pela coleta de imagem facial de terceiro.
- **Não há prazo nem mecanismo de descarte.** Nenhuma coluna de retenção, nenhum job, nenhum `ON DELETE` que alcance a foto; a FK entrante de `facility_visits` é `RESTRICT` (`:22768`), de modo que o cadastro do visitante — e sua foto — **nunca** é removível enquanto houver visita registrada.
- **O ponteiro é texto livre do cliente**, como no cluster EPI: `visitValidators.ts:16` aceita `photo_path: z.string().trim().max(500).optional()`; não há upload, não há allowlist.

**Por que MEDIUM e não HIGH — controle compensatório procurado e encontrado.** Antes de acusar, procurei o controle, como meu mandato exige. Ele existe: **todas** as rotas de visitante e visita exigem `authorizeModule('facilities')` (`facilities.ts:96-103`). **Não há exposição a usuário sem o módulo.** Aplico exatamente a régua de `T43-LGPD-F10`: quando o `authorizeModule` está no caminho, o defeito é de **granularidade e classificação**, não de porta aberta — quem tem Facilities vê tudo, inclusive perfis que só precisam saber quem está no site. Registro o agravante — aqui o mascaramento **foi implementado e pulou a coluna mais sensível**, o que é pior que não existir — mas **não** o uso para subir a severidade, porque o controle decisivo está cumprido e a coerência com `T-43` vale mais que um HIGH a mais.

**Critério de reteste:** `photo_path` removido da listagem (ou substituído por endpoint dedicado com nível de permissão próprio); `created_by` em migration versionada; política de retenção registrada por decisão humana, com job de descarte; e `COMMENT ON COLUMN … IS 'Imagem facial — dado biométrico (LGPD art. 5º II)'`.

---

### `T45-LGPD-F04` — O registro de operações de tratamento (art. 37) não consegue apontar dado biométrico: `data_categories` é texto livre sem domínio e sem vínculo com as tabelas de origem

**Severidade proposta: MEDIUM · Confiança: ALTA**

`jur_lgpd_processing_activities` (`:9031-9047`) é o RoPA do projeto — o artefato que deveria responder *"onde a empresa trata dado sensível e com que base legal"*. Ele acerta o lado da base legal e erra o lado do dado:

| Coluna | Domínio | Situação |
|---|---|---|
| `legal_basis` | `enum` com `COMMENT` *"Rol taxativo do art. 7 da LGPD"* (`:9054`) | **imposto pelo banco** |
| `data_categories text NOT NULL` (`:9035`) | **nenhum** | **texto livre** |
| `data_subject_categories text NOT NULL` (`:9036`) | **nenhum** | **texto livre** |
| `source_system varchar(150)` (`:9037`) | `COMMENT` *"Tabela/sistema de origem no ERP"* (`:9061`) | **texto livre, sem FK** |

O rol do art. 7º — que é taxativo e **fechado** — está imposto por enum. O rol do art. 5º II — que também é fechado, e é o que define **dado sensível** — não está imposto em lugar nenhum. É a régua de `AUD-DB-T31-01` (*"domínio na prosa, não no mecanismo"*) aplicada ao campo que decide se há dado sensível na operação. E `source_system` como texto livre significa que **não é possível consultar quais tabelas do ERP tratam biometria** — a pergunta que este lote inteiro existe para responder não é respondível pelo próprio módulo de LGPD do sistema.

**O quadro completo da categoria, e é ele que fundamenta a severidade** (detalhe em §5): das **5 colunas** de categoria biométrica, **0 têm `COMMENT` de sensibilidade**, **0 passam por sanitizador**, e **0 aparecem em qualquer dos dois mecanismos executáveis de classificação do projeto** (`employeeSensitiveFields.ts`, `rhSensitiveFields.ts`). Não é que a proteção seja fraca: **a categoria inteira é invisível para todos os mecanismos de classificação do produto, incluindo o registro legal que existe justamente para enxergá-la.**

**Por que MEDIUM e não HIGH.** Nenhum dado é corrompido e nenhuma decisão automatizada erra por causa disto; os controles de acesso (`authorizeModule('sst')`, `('facilities')`) seguem no lugar. O dano é de **conformidade documental e de capacidade de resposta** — a empresa não consegue produzir, a partir do próprio sistema, o inventário que o art. 37 exige. Não é o caminho normal falhando.

**Critério de reteste:** `data_categories` com domínio versionado que separe **comum** de **sensível (art. 5º II, com os subtipos)**; `source_system` migrado para vínculo com uma tabela de referência de entidades do ERP; e uma linha de RoPA por cada tabela nomeada em §1.2 e em `T-43` §1.2.

---

### `T45-FAC-F05` — `facility_visitors.document` sustenta um *find-or-create* com índice **não único**: duas linhas para a mesma pessoa, cada uma com sua foto

**Severidade proposta: LOW · Confiança: ALTA**

`CreateVisitorUseCase.ts:41-52` e `CreateVisitUseCase.ts:53-62` implementam reaproveitamento por documento — buscam, e só criam se não achar. A intenção é declarada e é **boa**: minimização (o model diz *"Cadastro mínimo de visitante (LGPD Art. 6º — minimização de dado, RF-FAC-047)"*, `FacilityVisitor.ts:6-9`). O lastro não acompanha: `idx_facility_visitors_document` é `CREATE INDEX`, **não `CREATE UNIQUE INDEX`** (`:19230`), e o model confirma (`FacilityVisitor.ts:38` — `{ fields: ['document'], name: … }`, sem `unique: true`). Não há normalização do documento antes da busca (`"123.456.789-00"` e `"12345678900"` são pessoas diferentes para o `findByDocument`).

**Efeito:** duas recepções simultâneas, ou duas grafias do mesmo CPF, criam **dois cadastros da mesma pessoa natural**, cada um retendo uma imagem facial. Fragmenta o registro, duplica dado sensível e derrota a minimização que o próprio model invoca.

**Por que LOW.** Nenhuma decisão do sistema depende da unicidade do visitante; o dano é de qualidade de cadastro e de volume de dado retido. **Sobe** se `DYN-T45-06` mostrar duplicatas em produção.

**Critério de reteste:** `CREATE UNIQUE INDEX` sobre `document` normalizado (ou coluna gerada com só dígitos), em migration versionada; normalização na entrada.

---

### `T45-SST-F06` — `sst_devolucoes_epi`: condição do EPI é texto livre com o domínio no `COMMENT`, sem coerência de data, e o DTO escolhe "a última devolução" sem `ORDER BY`

**Severidade proposta: LOW · Confiança: ALTA**

Cinco colunas, **zero `CHECK`**, **zero `UNIQUE`** (`:13165-13172`).

1. **`condicao varchar(255) NOT NULL`** (`:13169`) — o domínio existe **só na prosa** do `COMMENT` (`:13179`: *"Estado do EPI devolvido (ex.: danificado, extraviado, reutilizável)"*), e `ReturnEpiDeliveryUseCase.ts:34-36` exige apenas que seja *truthy*. Sétima ocorrência do padrão `AUD-DB-T31-01` no run.
2. **`data_devolucao date NOT NULL`** (`:13168`) — sem `CHECK` de data futura e **sem relação imposta com `sst_entregas_epi.data_entrega`**: devolução datada antes da entrega é gravável.
3. **Nenhuma restrição de cardinalidade** — a mesma entrega aceita N devoluções, e `EpiMapper.ts:94-95` resolve o conflito escolhendo `devolucoes[devolucoes.length - 1]`. O `include` que carrega a coleção **não tem `ORDER BY`** (`SequelizeEpiRepository.ts:137,147,182`), e Postgres não garante ordem sem ele. **"A última devolução" exibida na Ficha de EPI é não determinística** quando há mais de uma.

**Por que LOW.** Nenhum consumidor **decide** com base em `condicao` — é registro documental; e a ausência de ordenação só se manifesta com múltiplas devoluções, cuja existência não é verificável estaticamente (`DYN-T45-07`). A tabela também não carrega dado biométrico próprio (§1.2), então o dano não incide sobre a categoria especial.

**Critério de reteste:** domínio versionado para `condicao`; `CHECK (data_devolucao >= (SELECT data_entrega …))` via coluna denormalizada ou validação em use case com teste; `order: [['data_devolucao','DESC'],['id','DESC']]` nos três `include`.

---

### `T45-META-F07` — `confirmada` × `confirmada_em` sem `CHECK` que os ligue, e desta vez o estado inconsistente é **permanente**

**Severidade proposta: LOW · Confiança: ALTA**

`sst_entregas_epi.confirmada boolean NOT NULL DEFAULT false` (`:13216`) e `confirmada_em timestamptz` **nullable** (`:13217`). Nenhum `CHECK` os liga — confirmado no baseline e na migration (`20260806-000131:92-93`). **Oitava ocorrência** do padrão de `T35-EST-F05` no run.

O que diferencia esta ocorrência das sete anteriores: aqui o trigger torna o estado **irreparável**. Uma linha com `confirmada = true` e `confirmada_em NULL` — gravável por carga legada ou escrita direta — não pode mais ser corrigida por `UPDATE` (`:2982-2984`), e o canal de correção não existe (`T45-SST-F02`). O caminho normal **não** produz o estado (`ConfirmEpiDeliveryUseCase.ts:81-83` grava os dois juntos), o que é exatamente o motivo de a severidade ser LOW e não mais — mesma faixa e mesmo raciocínio de `T43-SST-F03`.

**Critério de reteste:** `CHECK ((confirmada = false) OR (confirmada_em IS NOT NULL))` em migration versionada.

---

### `T45-TI-F08` — `it_responsibility_terms`: o pareamento assinatura × artefato é imposto **só na criação**, e o `COMMENT` declara que o banco não o impõe

**Severidade proposta: LOW · Confiança: ALTA quanto ao mecanismo; MÉDIA quanto à extensão (limitação declarada)**

Dezenove colunas, **zero `CHECK`**. É gravável `acceptance_type = 'physical_signature'` com `signed_document_path NULL`, e o DDL **admite por escrito** que isso é deliberado (`:7367`): *"Validade juridica do digital_ack sem upload e parametro de aplicacao (RF-TI-046 item 2), **nao trava de schema**"*.

**Por que LOW, e não MEDIUM — o controle decisivo existe e foi verificado.** A hipótese que abri era *"termo de responsabilidade com assinatura física declarada e sem documento"*. **A aplicação impede**, na criação: `CreateResponsibilityTermUseCase.ts:35-36` recusa a combinação, e o schema Zod é `.strict()` (`termValidators.ts:21-27`), fechando mass assignment. Aplico a régua de `T43-RH-F08`: quando o controle decisivo está cumprido, o que resta é falta de lastro sem consequência provada. **Registro explicitamente para que nenhuma remediação futura "adicione o `CHECK` e considere resolvido"** — o `CHECK` seria complemento, e a decisão de RF-TI-046 sobre validade jurídica do `digital_ack` é do dono, não minha.

**Limitação declarada, e ela é o motivo da confiança MÉDIA:** **não li o caminho de update/devolução** do termo. Se existir rota que altere `acceptance_type` sem revalidar o par, o controle é contornável e a severidade sobe. `RES-T45-03`.

**Critério de reteste:** `CHECK ((acceptance_type <> 'physical_signature') OR (signed_document_path IS NOT NULL))`; revalidação do par em qualquer caminho de update; e decisão registrada sobre `digital_ack` sem upload.

---

## 4. Conformidades verificadas — 6, incluindo **3 falsos positivos evitados**

**4.1 — Falso positivo evitado, e ele mudou a natureza do achado.** Levantei a hipótese de que o artefato biométrico fosse servido por `express.static('uploads')` protegido apenas por `authenticate` (`app.ts:225`) — isto é, sem `authorizeModule` —, o que deixaria qualquer usuário logado buscar o arquivo biométrico de um colega pela URL. **A hipótese é falsa para esta categoria, por um motivo mais interessante que o controle: não existe upload de evidência de EPI.** `PATCH /epi-deliveries/:id/evidence` (`sst.ts:53`) **não tem middleware multer**, e `AttachEpiDeliveryEvidenceUseCase.ts:42` grava `body.arquivo_url` verbatim; o cliente pede a URL digitada, com placeholder `https://…` (`EpiTab.tsx:391`). **O artefato biométrico não está neste sistema** — a coluna é ponteiro para um local de terceiros, sem allowlist, sem validação de formato, com 255 caracteres. Isso desloca o problema: não é *"arquivo estático sem authz"*, é *"o artefato de categoria especial está fora do perímetro de segurança do ERP e o ERP guarda um ponteiro não verificado para ele"* — diagnóstico e remediação diferentes. Registro ainda que a variante *sem autenticação* deste defeito **já foi encontrada e corrigida** por auditoria anterior, com o achado documentado no próprio código (`app.ts:220-224`, achado de 2026-08-12) — controle compensatório real, que reconheço.

**4.2 — Falso positivo evitado: o renderizador de `Grep` deformou literais de rota outra vez.** A saída exibiu `router.get('\epi-deliveries\ficha:employeeId', …)`, `router.post('\epi-deliveries:id/confirm', …)` e, em `termValidators.ts`, `\** POST \api\ti\responsibility-terms:id/return */`. Aceitos, produziriam um CRITICAL espetacular e falso: *"os endpoints de confirmação e devolução do cluster biométrico são inalcançáveis"*. **A leitura direta de `sst.ts:48-55` mostra os literais corretos** (`'/epi-deliveries/ficha/:employeeId'`, `'/epi-deliveries/:id/confirm'`). **Segunda ocorrência do mesmo artefato de instrumento em duas trilhas consecutivas** (`T-43` §4.1). Deixa de ser incidente e passa a ser propriedade conhecida da ferramenta; a regra que estabeleci vale sem exceção: *achado que dependa da forma exata de um literal é confirmado por leitura do arquivo, nunca por saída de grep.*

**4.3 — Falso positivo evitado contra a premissa da decisão que ampliou meu escopo.** Ver §6.1 — `sst_devolucoes_epi` **não** tem coluna biométrica.

**4.4 — Model × migration × baseline coerentes nas três tabelas do cluster EPI, verificados nessa ordem.** Este é o item que meu mandato pede explicitamente ("não assumir que constraint existe só porque o model a declara"). Confrontei `SstEntregaEpi.ts:38-62` e `SstDevolucaoEpi.ts:23-35` contra `20260806-000131:63-164` e contra o DDL congelado: os quatro índices declarados no model existem como `CREATE INDEX` (`:21253-21274`), o único `CHECK` declarado na migration existe no baseline (`:13222`), as quatro FKs existem com as ações declaradas, e `updatedAt: false` do model corresponde à **ausência** de `updated_at` no DDL (`:13165-13172`). **Nenhuma constraint declarada sem lastro; nenhuma constraint no banco sem declaração.** É a única das quatro tabelas do lote em que fiz a reconciliação nas três fontes, e ela passou.

**4.5 — A confirmação de entrega é transacional de verdade, e isso corrige uma impressão que `T-43` poderia deixar sobre o módulo.** `ConfirmEpiDeliveryUseCase.ts:50-92` abre `t`, lê a linha **com `lock: transaction.LOCK.UPDATE`** (`SequelizeEpiRepository.ts:148`), passa `t` à movimentação de estoque (`:75`), passa `t` ao `UPDATE` de confirmação (`:84`), comita **uma vez** (`:86`) e faz `rollback` no `catch` (`:91`). **É o oposto exato de `T43-SST-F01`**, onde o repositório de ASO havia perdido o parâmetro de transação. Registro com destaque: `T-43` acusou o módulo SST de descartar transação; **o cluster EPI do mesmo módulo faz certo, com lock pessimista**. A acusação de `T-43` era pontual e continua correta como tal — não é característica do módulo.

**4.6 — A imutabilidade de `sst_entregas_epi` é imposta pelo banco, e a exceção arquitetural está justificada por escrito.** `sst_lock_entrega_epi` (`:2971-2988`) + `TRIGGER … BEFORE DELETE OR UPDATE` (`:22240`), com a migration (`:33-44`) declarando que é o **primeiro trigger do projeto**, por que é exceção estreita (invariante estrutural de valor probatório, não regra de processo), qual precedente ela segue e que **não** deve virar precedente para mover regra de negócio ao banco. É lastro no mecanismo, com a decisão registrada no artefato versionado — exatamente o que esta célula defende. Que o mesmo trigger produza o efeito colateral de `T45-SST-F01`/`F02` não diminui a qualidade do desenho: diminui a qualidade do que **não** foi construído em volta dele.

---

## 5. Classificação de dado sensível — tranche `T-45` (categoria BIOMETRIA)

Entrega de maior valor do lote, por determinação do mandato. Equivalente exato de `T-43` §5, que mediu 18 colunas de saúde com 1 classificada e 0 protegidas.

| Coluna | Categoria LGPD | Sensibilidade | `COMMENT` de sensibilidade | Sanitizador | Situação |
|---|---|---|---|---|---|
| `sst_entregas_epi.evidencia_tipo` (`:13214`) | art. 5º II — **biometria** | **Alta** — revela **qual modalidade biométrica** foi coletada da pessoa | **NÃO** (o `COMMENT` `:13237` é processual: *"Preenchido só na confirmação"*) | **NÃO** | **NÃO classificada** |
| `sst_entregas_epi.evidencia_arquivo_url` (`:13215`) | art. 5º II — **biometria** | **Alta** — ponteiro para o artefato biométrico | **NENHUM `COMMENT`** | **NÃO** — exposta em `EpiMapper.ts:108` | **NÃO classificada**; ponteiro **fora do perímetro** (§4.1) |
| `facility_visitors.photo_path` (`:5544`) | art. 5º II — **biometria (fronteira A, qualificada)** | **Alta** — imagem facial de terceiro, não revogável | **NENHUM `COMMENT`** | **NÃO** — escapa de `maskDocument` (`VisitorUseCases.ts:26-29`) | **NÃO classificada** — `T45-FAC-F03` |
| `it_responsibility_terms.signed_document_path` (`:7349`) | art. 5º II — **fronteira B (discutível)** | **Média** — assinatura manuscrita digitalizada | `COMMENT` `:7367` existe, mas é sobre **validade jurídica**, não sensibilidade | **NÃO** — exposta em `TermMapper.ts:24` | **NÃO classificada** |
| `it_responsibility_terms.acceptance_type` (`:7348`) | art. 5º II — **fronteira B (discutível)** | **Baixa-média** — revela se há assinatura manuscrita | **NÃO** | **NÃO** | **NÃO classificada** |
| *(discutível, §1.3)* `employees.photo_url` (`:4884`) | art. 5º I, **ou** II se usada para identificar | **Média-alta** | **NÃO** | **NÃO** — ausente de `SENSITIVE_EMPLOYEE_FIELDS` (`:36-51`), rota aberta a todo autenticado | **NÃO classificada** — `RES-T45-01` |
| *(discutível, §1.3)* `hr_admission_processes.checklist_photo` (`:5704`) | art. 5º I | **Baixa** — flag de conferência | **NÃO** | **NÃO** | fora do núcleo por critério |

**Resultado do censo de classificação — categoria BIOMETRIA: 5 colunas no núcleo + fronteiras; 0 classificadas em `COMMENT` ou `comment:` de model; 0 protegidas por sanitizador; 0 presentes em qualquer dos 2 mecanismos executáveis de classificação do projeto.** Somando os discutíveis: 7 colunas, mesmo resultado.

**Comparação com `T-43`, que é o que dá sentido ao número:** dado de saúde tem **1 coluna classificada em 18** (`sst_asos.restricoes`) e **2 protegidas** no projeto inteiro (`hr_absences.cid`, `employees.pcd`). Dado biométrico tem **0 em 5** nas duas dimensões. **A categoria biométrica está pior que a de saúde não por grau, mas por espécie: nela não existe uma única marcação, em lugar nenhum do produto.** Consolidando a categoria especial completa do art. 5º II: **23 colunas identificadas, 1 classificada (4,3 %), 2 protegidas por sanitizador (8,7 %)** — e nenhuma das duas protegidas é biométrica.

---

## 6. Divergências registradas (Regra 20)

**6.1 — `APR-2026-039` §3 × censo, e desta vez o erro é da premissa da decisão, não meu.** A entrada fala em *"as duas tabelas de biometria (`sst_entregas_epi` e relacionadas)"*. **`sst_devolucoes_epi` não tem coluna biométrica alguma.** Suas seis colunas (`:13165-13172`) são `id`, `entrega_epi_id`, `data_devolucao`, `condicao`, `registrado_por`, `created_at`. Ela **entra e é coberta** — por mandato expresso e por derivabilidade N:1 com a linha que carrega a evidência —, mas o número honesto de tabelas **com dado biométrico próprio é 1**, não 2. Reporto contra a premissa da decisão que ampliou meu escopo com a mesma disciplina com que reportei contra mim em `T-43` §6.1 e a favor do objeto auditado em `T-42` §10.1. **Isto não reduz o escopo**: a decisão é sobre a categoria, e a categoria tem 5 tabelas.

**6.2 — `RES-T43-05` e `T35-META-F01` afirmaram mais do que os artefatos sustentam, e a correção é contra mim.** Escrevi em `T-43` §1.4 e §9 que as **21 tabelas sem model** são *"não censáveis"* e que por isso a categoria *"não está provada fechada entre as 207"*. **A primeira metade é falsa.** Elas não são censáveis por **censo de model** — que foi o método de `T-35` —, mas são perfeitamente **nomeáveis e auditáveis por DDL**: `00_baseline_frozen.sql` contém um `CREATE TABLE` para cada tabela do schema. **Provo nomeando uma delas neste lote, a partir do DDL: `sst_estornos_entrega_epi` (`:13285-13291`)** — que, não por acaso, está dentro deste cluster e virou `T45-SST-F02`. **Enunciado correto do resíduo, mais estreito que o meu e mais oneroso para a auditoria:** as 21 são nomeáveis e auditáveis por DDL; o que lhes falta é **model**, e portanto elas **não podem satisfazer a minha própria regra de contagem**, que exige model lido coluna a coluna. Não afirmo ter enumerado as 21 — a diferença de conjuntos (207 tabelas × 186 models) exige uma enumeração que **não** completei nesta trilha (`DYN-T45-10`). **`T-43` e `T-35` não são alterados** (Regra 15); a leitura corrigida é esta.

**6.3 — A subestimativa da categoria se repetiu, em escala menor, e a condição vinculante voltou a funcionar.** Censo: **5** tabelas contra **2** presumidas — **2,5×**. Menor que os 3,7× de `T-43` porque desta vez apliquei o critério de coluna desde o início, e não a triagem por módulo. **A parte que a triagem por módulo teria perdido é exatamente a que não é SST:** `facility_visitors` (Facilities) e `it_responsibility_terms` (TI) — as duas tabelas que só aparecem quando se procura por **coluna**. Se eu tivesse censado "biometria" olhando o módulo SST, teria entregado 3 tabelas e um relatório errado.

**6.4 — `APR-2026-037` §5.2 perde mais uma tabela: `facility_visitors`.** Ela consta da lista de 9 que *"permanecem excluídas"* após `APR-2026-039` §2. O censo a põe na categoria especial (§1.2, item 4). Pela mesma mecânica que retirou quatro tabelas em `APR-2026-039` §2, **ela sai da exclusão e entra na cobertura**, e a lista efetiva da §5.2 **cai de 9 para 8**. **Eu não altero `APR-2026-037` nem `APR-2026-039`** (Regra 15 / ownership de `coretriad/`) — é ato do director.

**6.5 — Migration `20260806-000131:20-23` × código.** O artefato afirma que correções pós-confirmação *"usam `sst_estornos_entrega_epi`"* e que *"a aplicação exibe a entrega original + o estorno"*. **Nenhuma das duas coisas existe.** Fonte autoritativa: ausência de model, de repositório e de rota, verificada por busca exaustiva de nome no repositório. **Não altero os arquivos** (Regra 2). Mesma classe de `T43-SST-F07`.

**6.6 — Contagem estrita alternativa, para que a minha não seja lida como inflada.** Das 4 tabelas contadas em §2, **1 carrega dado biométrico próprio** (`sst_entregas_epi`), **2 entram por fronteira declarada** (`facility_visitors`, `it_responsibility_terms`) e **1 por mandato expresso sem coluna própria** (`sst_devolucoes_epi`). Se o director preferir contar apenas o núcleo, a categoria tem **1 tabela** e o delta desta trilha seria **+1**, `A(76/207)`. **Uso 4** porque a cobertura dos 7 critérios de `C-137` foi efetivamente executada nas quatro, e porque a decisão do dono é sobre a **categoria**. As duas contagens estão aqui para que a escolha seja do director e não uma consequência da minha redação.

---

## 7. Pedidos de evidência dinâmica — registrados, **NÃO executados**

Nenhum executado. Nenhuma conexão a `erp_evok_audio` aberta. `APR-2026-016` íntegra.

| ID | Pergunta que só evidência dinâmica responde | Motivo |
|---|---|---|
| `DYN-T45-01` | Existe `sst_entregas_epi` com `confirmada = true`, `evidencia_tipo IS NOT NULL` e `evidencia_arquivo_url IS NULL`? Quantas por valor de `evidencia_tipo`? | **Materialização exata de `T45-SST-F01`.** Qualquer linha com `evidencia_tipo='biometria'` e URL nula confirma o HIGH e prova declaração de coleta biométrica sem artefato. |
| `DYN-T45-02` | Quais os valores distintos de `evidencia_arquivo_url`? Quantos não são URL `http(s)` válida? Quantos apontam para host fora do domínio da empresa? Quantos se repetem entre entregas de funcionários diferentes? | Mede o grau de degradação do ponteiro (§4.1). URL repetida entre pessoas distintas seria prova de evidência copiada — falsidade documental. |
| `DYN-T45-03` | Quantas linhas há em `sst_estornos_entrega_epi`? | Materializa `T45-SST-F02`. **Zero também é informação** — provaria que o canal declarado nunca foi usado, e a remediação passa a incluir a pergunta de por que ele foi criado. |
| `DYN-T45-04` | Existe `sst_entregas_epi` com `confirmada = true` e `confirmada_em IS NULL`? | Materializa `T45-META-F07`. Havendo linha, ela é **incorrigível** pelo trigger — a severidade sobe. |
| `DYN-T45-05` | Quantas linhas de `facility_visitors` têm `photo_path IS NOT NULL`? Quantas pertencem a visitantes cuja última visita é anterior a 12 meses? | Mede volume e **tempo de retenção** de imagem facial de terceiro sem política de descarte (`T45-FAC-F03`). |
| `DYN-T45-06` | Existe `document` duplicado em `facility_visitors` (bruto e normalizado só com dígitos)? | Materializa `T45-FAC-F05` e mede a duplicação de imagem facial da mesma pessoa. |
| `DYN-T45-07` | Existe `sst_devolucoes_epi` com `data_devolucao` anterior à `data_entrega` da entrega-pai? Existe entrega com mais de uma devolução? Quantos valores distintos tem `condicao`? | Mede `T45-SST-F06` nas três pontas; >1 devolução ativa o defeito de ordenação não determinística. |
| `DYN-T45-08` | Existe `it_responsibility_terms` com `acceptance_type='physical_signature'` e `signed_document_path IS NULL`? | Se houver, o controle de aplicação foi contornado ou a linha precede o controle — `T45-TI-F08` sobe de LOW. |
| `DYN-T45-09` | Alguma linha de `jur_lgpd_processing_activities` menciona biometria, foto, imagem facial ou assinatura em `data_categories`? Alguma cita `sst_entregas_epi` ou `facility_visitors` em `source_system`? | Materializa `T45-LGPD-F04`. **Zero seria a prova mais forte do lote:** o registro legal de tratamento não sabe que a categoria existe no próprio sistema. |
| `DYN-T45-10` | **Pergunta de método:** enumerar as 21 tabelas sem model por diferença entre o conjunto de `CREATE TABLE` do DDL e o conjunto de `tableName` dos models, e verificar em cada uma o léxico biométrico (`biometri`, `foto`, `photo`, `facial`, `digital`, `assinat`, `signat`, `evidenc`) **e** o clínico de `DYN-T43-10`. | **Única forma de fechar o buraco do censo nas duas categorias.** Com `sst_estornos_entrega_epi` já nomeada (§6.2), restam 20. Sem isto, a categoria especial está fechada *entre as tabelas com model*, não *entre todas*. |

---

## 8. Resíduos

| ID | Resíduo |
|---|---|
| `RES-T45-01` | **`employees.photo_url` — fronteira A não resolvida.** Se a foto do funcionário for usada para identificação (crachá/portaria), `employees` entra na categoria especial como 6ª tabela e a coluna deve entrar em `SENSITIVE_EMPLOYEE_FIELDS`. **Exige decisão humana** (Regra 6). Registro o agravante verificado: hoje ela é legível por **qualquer autenticado**. |
| `RES-T45-02` | **`sst_estornos_entrega_epi` auditada por DDL+migration e NÃO contada** como cobertura, por não ter model (§2.1). Regra de contagem preservada; a lacuna é real. |
| `RES-T45-03` | **Caminho de update/devolução de `it_responsibility_terms` não lido.** A severidade LOW de `T45-TI-F08` depende disso. |
| `RES-T45-04` | **Busca de consumidor não exaustiva** para `facility_visits` (li o DDL, não os consumidores de leitura) — se o DTO de visita também devolver `photo_path`, a superfície de `T45-FAC-F03` é maior que a medida. |
| `RES-T45-05` | **Nível de isolamento das transações continua não verificado** (mantém `RES-T43-02`/`RES-T42-03`). `ConfirmEpiDeliveryUseCase` usa `LOCK.UPDATE` (§4.5), o que reduz a exposição, mas não substitui a verificação. |
| `RES-T45-06` | **21 tabelas sem model — enunciado corrigido em §6.2.** São nomeáveis por DDL (1 já nomeada); **não** são contáveis pela regra de cobertura. `DYN-T45-10` é o que fecha. Mantém, retificado, `RES-T43-05`/`RES-T42-05`/`RES-T41-07`/`RES-T35-02`. |
| `RES-T45-07` | **`00_baseline_frozen.sql` ≥ 9 migrations atrasado** (mantém `RES-T43-06`). Não afetou este lote (§2.2), mas segue afetando a célula. |
| `RES-T45-08` | Denominador **207 herdado**, não reconstruído (mantém `RES-T43-07`); `git diff c1311a6..HEAD` **não reconfirmado**. |
| `RES-T45-09` | Reconciliação `COMMENT ON COLUMN` × `comment:` feita **apenas** nas 4 tabelas deste lote; não é censo (mantém `RES-T43-08`). |
| `RES-T45-10` | **A contradição G3 × EMENDA-01 permanece** (`APR-2026-038` D3, `APR-2026-039` §4, `RES-T43-09`). O fechamento da categoria especial completa **reduz** a tensão mais do que o fechamento parcial reduzia, mas não a elimina: o G3 fala em *"dado pessoal"*, e as **8** tabelas de dado pessoal não-sensível seguem excluídas (§6.4). Continua sendo condição de fechamento. **Ponto do director, não meu.** |

---

## 9. Estado

- **Célula `C-137`:** `A(75/207)` → **`A(79/207)`**, delta **`+4`**. **NÃO FECHADA.** Déficit **128/207**. Contagem estrita alternativa em §6.6: `A(76/207)`, delta `+1`.
- **CENSO da categoria DADO BIOMÉTRICO: 5 tabelas, não 2** — condição vinculante de `APR-2026-039` §3 cumprida; conjunto nominal em §1.2, critério declarado antes de aplicado em §1.1, discutíveis nominados em §1.3, faixas negativas em §1.4.
- **`APR-2026-037` §5.2 — mais uma tabela SAI da exclusão:** `facility_visitors`. A lista efetiva **cai de 9 para 8**. O director deve refletir isso no relatório final; **eu não altero as entradas de `coretriad/`** (Regra 15).
- **DECLARAÇÃO DE FECHAMENTO — categoria especial completa do art. 5º II (saúde + biometria):** **16 tabelas na categoria; 15 cobertas** — 11/11 de saúde (`T-13`, `T-41`, `T-43`) e **4/5 de biometria** (esta trilha), todas com model lido coluna a coluna **e** verificação externa. **Duas ressalvas, declaradas e não minimizadas:** (a) **`sst_estornos_entrega_epi` está na categoria, não tem model e por isso não é contável** pela minha regra — foi auditada por DDL e produziu `T45-SST-F02`; (b) as **21 tabelas sem model não foram enumeradas** (`RES-T45-06`), logo **a categoria está fechada entre as 186 tabelas com model e NÃO está provada fechada entre as 207**. `DYN-T45-10` é o que falta. **Há ainda uma decisão humana aberta que pode acrescentar uma 6ª tabela de biometria** — `employees`, `RES-T45-01`. Não arredondo para "categoria fechada".
- **Findings `PROPOSED`: 8** — **0 CRITICAL, 1 HIGH** (`T45-SST-F01`), **3 MEDIUM** (`F02`, `F03`, `F04`), **4 LOW** (`F05`, `F06`, `F07`, `F08`). **`T45-SST-F01` vai ao `vericore-finding-validator` por força da Regra 22.** O teste do consumidor real foi aplicado aos oito; **um** passou, com o parágrafo que o sustenta em `T45-SST-F01`; os sete restantes têm o motivo da reprovação escrito individualmente. Régua mantida: 2 HIGH em `T-41`, 0 em `T-42`, 1 em `T-43`, 1 aqui.
- **Conformidades verificadas: 6**, incluindo **3 falsos positivos evitados** (§4.1 o upload que não existe; §4.2 o renderizador de grep, **segunda ocorrência**; §4.3 contra a premissa da decisão) e **1 retificação de impressão que `T-43` poderia ter deixado** (§4.5 — o cluster EPI propaga transação e usa lock pessimista; a acusação de `T43-SST-F01` era pontual, não característica do módulo).
- **Classificação de dado sensível: 5 colunas de categoria biométrica identificadas (7 com discutíveis); 0 classificadas; 0 protegidas por sanitizador; 0 presentes em qualquer dos 2 mecanismos executáveis do projeto.** Consolidado art. 5º II: **23 colunas, 1 classificada (4,3 %), 2 protegidas (8,7 %)**, nenhuma delas biométrica (§5).
- **Divergências registradas: 6**, duas delas **contra mim** (§6.2 — afirmei em `T-43` que as 21 tabelas sem model não eram censáveis, e é falso para censo por DDL; §6.6 — publico a contagem estrita alternativa) e uma **contra a premissa da decisão que ampliou meu escopo** (§6.1 — `sst_devolucoes_epi` não tem coluna biométrica).
- **Resíduos: 10. Pedidos dinâmicos: 10, nenhum executado.**
- **Banco de produção: não acessado.** `APR-2026-016` íntegra. Nada gravado fora de `audit/`.
- `T-13`, `T-31`, `T-35`, `T-41`, `T-42`, `T-43` e `AUD-DB-09_RETIFICACAO_01` **não foram alterados** (Regra 15). Nenhuma severidade de finding anterior alterada.
- Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.

---

**O que exige decisão antes de qualquer próximo passo:**

1. **`T45-SST-F01` (HIGH)** — o portão de BR-SST-002 aceita o rótulo `biometria` sem artefato, e a linha fica permanentemente imutável. Vai ao validator. A remediação de aplicação é de duas condições; o `CHECK` é uma migration curta. O argumento decisivo está na contraprova: **a empresa já exige o documento assinado para entregar um notebook** (`CreateResponsibilityTermUseCase.ts:35-36`).
2. **`APR-2026-037` §5.2 precisa de nova retificação** — `facility_visitors` sai da exclusão pela mesma mecânica de `APR-2026-039` §2; a lista cai de 9 para 8. Ato do director.
3. **`RES-T45-01` (`employees.photo_url`)** é a única pergunta de escopo que sobra na categoria especial, e não é do auditor: se a foto do funcionário identifica, a categoria tem 6 tabelas de biometria, não 5.
4. **`DYN-T45-10` + `DYN-T43-10` são o mesmo trabalho** e fecham as duas categorias de uma vez — enumerar as 20 tabelas sem model restantes e passar os dois léxicos. É o que separa *"categoria fechada entre as 186"* de *"categoria fechada"*.
