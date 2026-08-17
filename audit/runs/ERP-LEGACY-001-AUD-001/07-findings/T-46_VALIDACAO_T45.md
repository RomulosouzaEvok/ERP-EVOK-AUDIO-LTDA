# T-46 — Validação adversarial de `T45-SST-F01` (Regra 22)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-46` (validação de `T-45` §3) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Finding sob validação | **`T45-SST-F01`** (`T-45_C137_SEMANTICA_COLUNA_LOTE6.md` §3), proposto HIGH / confiança ALTA-mecanismo, MÉDIA-frequência |
| Natureza | **Estática**. Banco `erp_evok_audio` **NÃO acessado** — `APR-2026-016` íntegra. Nenhuma conexão, nenhum `SELECT`. |
| Artefatos alterados | **Nenhum.** `T-45` não foi tocado (Regra 15). Nada gravado fora de `audit/`. |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |

> **Regra 2.** Nada foi corrigido, refatorado ou alterado no objeto auditado. **Regra 18.** As severidades aqui são **recomendação**; a alteração formal é ato do director. **Nenhum `FINDING CLOSED`, nenhum `RETEST_PASSED`, nenhum `REMEDIATION COMPLETE`.**

---

## 1. VEREDITO

### `T45-SST-F01` → **CONFIRMED**

**Severidade que a evidência sustenta: HIGH** (mantida — recomendação, não alteração).
**Confiança: CONFIRMED** quanto ao mecanismo (elevada de "ALTA" para `CONFIRMED`: as três camadas foram relidas por mim, arquivo por arquivo, e o defeito é demonstrável por inspeção, não inferido).
**Confiança quanto à frequência: permanece MÉDIA** — e a nuance que a reduz **não é** a que o autor escreveu (§2.6, §4.1).

**Seis tentativas de refutação foram executadas. Nenhuma derrubou o finding. Uma o corrigiu parcialmente na moldura (§4.1). Uma o agravou (§3.1).**

O mecanismo, reconstruído por leitura própria e independente das citações de `T-45`:

1. `AttachEpiDeliveryEvidenceUseCase.ts:30-32` valida **apenas** `tipo_evidencia` contra `EVIDENCIA_TIPOS`; `:40-43` grava `evidencia_arquivo_url: body.arquivo_url ?? null`. **Nenhuma validação do artefato, em nenhuma condição.**
2. `ConfirmEpiDeliveryUseCase.ts:62-64` testa `if (!entrega.evidencia_tipo)`. **A leitura integral do arquivo (98 linhas) não encontrou nenhuma outra referência a `evidencia_arquivo_url`.**
3. `sst_entregas_epi` tem **um** `CHECK` — `ck_sst_entregas_epi_quantidade_positiva` — confirmado por leitura direta do `CREATE TABLE` no baseline (`00_baseline_frozen.sql:13206-13223`) **e** da migration original (`20260806-000131-create-sst-entrega-epi.cjs:114-116`).
4. `sst_lock_entrega_epi` (`00_baseline_frozen.sql:2971-2988`) rejeita **todo** `UPDATE` quando `OLD.confirmada`, sem exceção de coluna.

Consequência sustentada: uma chamada a `PATCH /api/sst/epi-deliveries/:id/evidence` com `{"tipo_evidencia":"biometria"}` e **sem** `arquivo_url` grava `evidencia_tipo='biometria'`, `evidencia_arquivo_url=NULL`; `POST /api/sst/epi-deliveries/:id/confirm` **passa no portão de BR-SST-002**; e a linha torna-se permanentemente imutável.

**Segue para SanaCore.**

---

## 2. Hipóteses de refutação — todas as seis, incluindo as que falharam

### H1 — "O portão não é só o tipo: há validação em outra camada" → **REFUTAÇÃO FALHOU**

Percorri as **cinco** camadas do caminho de escrita, de fora para dentro:

| Camada | Arquivo + linha | Validação de `arquivo_url`? |
|---|---|---|
| Body parser global | `server/app.ts:129-136` (`express.json` com `limit` e `verify` p/ `rawBody` de webhook) | **Nenhuma.** Não há middleware global de schema/sanitização. `:148` só aplica `apiLimiter`. |
| Montagem do router | `server/app.ts:205` (`app.use('/api/sst', …)`) | **Nenhuma.** |
| Router do módulo | `sst.ts:35` (`router.use(authenticate)`), `:53` `router.patch('/epi-deliveries/:id/evidence', authorizeModule('sst', 'operate'), epiController.attachEvidence)`, `:54` `router.post('/epi-deliveries/:id/confirm', authorizeModule('sst', 'approve'), epiController.confirmDelivery)` | **Nenhuma.** Só `authenticate` + `authorizeModule`. **Não existe middleware Zod em nenhuma das 8 rotas de EPI, nem em nenhuma das 75 rotas do arquivo.** |
| Controller | `epiController.ts:139-144` — `execute({ id: req.params.id, body: req.body })` | **Nenhuma.** `req.body` repassado bruto, sem seleção de campos. |
| Use case | `AttachEpiDeliveryEvidenceUseCase.ts:30-43` | **Nenhuma** para `arquivo_url`. |
| Portão de confirmação | `ConfirmEpiDeliveryUseCase.ts:49-94`, **lido integralmente** | Só `entrega.confirmada` (`:54`), `tipo.ca_validade` (`:59`) e `entrega.evidencia_tipo` (`:62`). |

**Confirmação literal exigida (não por grep).** Os literais de rota de `sst.ts:53-54` foram lidos no arquivo, não em saída de `Grep` — a deformação de literais registrada em `T-43` §4.1 e `T-45` §4.2 é propriedade conhecida do instrumento. Os literais corretos são `'/epi-deliveries/:id/evidence'` e `'/epi-deliveries/:id/confirm'`. Idem para as três linhas de gate (`ConfirmEpiDeliveryUseCase.ts:62-64`) e para o par `evidencia_tipo`/`evidencia_arquivo_url` do `CREATE TABLE`.

**Resultado: não existe validação server-side de `arquivo_url` em nenhuma camada. O finding não cai e não muda de severidade por esta via.**

**Controle parcial encontrado, e registrado porque é real:** há **segregação de permissão** entre anexar (`operate`) e confirmar (`approve`) — `sst.ts:53-54`. Um usuário só-`operate` não completa o dano sozinho. **Isso não reduz a severidade**, por dois motivos verificados: (a) `role === 'admin'` satisfaz ambos os níveis, e (b) a UI dirige os dois atos da mesma tela (`EpiTab.tsx`), de modo que o fluxo esperado é o mesmo operador escalando ao aprovador na mesma sessão de trabalho. É mitigação de superfície, não de mecanismo.

---

### H2 — "`AttachEpiDeliveryEvidence` não é o único gravador; há caminho que já valida" → **REFUTAÇÃO FALHOU, e o resultado favorece parcialmente o objeto auditado**

Censo de escritores de `evidencia_tipo` / `evidencia_arquivo_url` em `server/src/`:

- **`AttachEpiDeliveryEvidenceUseCase.ts:40-43`** — único chamador de `updateEntregaRascunho` em código de produção (o outro resultado é o mock de teste `sst-epi.test.ts:60`).
- **`CreateEpiDeliveryUseCase.ts:59-68`** — lido integralmente. Monta o objeto de criação com **lista branca explícita de 8 campos**; `evidencia_tipo` e `evidencia_arquivo_url` **não estão nela**, embora o use case receba `body` livre. **Não há mass assignment aqui** — é um controle real, e o registro em favor do objeto auditado.
- **`ConfirmEpiDeliveryUseCase.ts:80-84`** — `confirmEntrega` grava só `confirmada`, `confirmada_em`, `inventory_movement_id`.
- **`SequelizeEpiRepository.ts:158-163`** — `updateEntregaRascunho` é um `entrega.update(data)` genérico, **sem checar `confirmada` no repositório**; a checagem existe só no use case (`AttachEpiDeliveryEvidenceUseCase.ts:36-38`) e, em última instância, no trigger. Não é exploração adicional hoje (chamador único), mas é fragilidade de camada.

**Um único caminho de escrita. Ele é o defeituoso. O finding não cai — e a ausência de mass assignment na criação torna a remediação mais barata, porque há um só ponto a corrigir.**

---

### H3 — "O `CHECK` não é único; há outra restrição no banco" → **REFUTAÇÃO FALHOU**

Verificado nas **duas** fontes, por leitura direta, como o autor afirma ter feito — e a afirmação dele **se confirma**:

- `00_baseline_frozen.sql:13206-13223` — o `CREATE TABLE` inteiro tem 15 colunas e **uma** cláusula `CONSTRAINT`: `ck_sst_entregas_epi_quantidade_positiva CHECK ((quantidade > (0)::numeric))` (`:13222`).
- `20260806-000131-create-sst-entrega-epi.cjs:114-116` — **um** `ALTER TABLE … ADD CONSTRAINT`, o mesmo. `:86-91` declara `evidencia_tipo` `allowNull: true` e `evidencia_arquivo_url` `STRING(255)` `allowNull: true`, sem validação.
- Os 4 `COMMENT` da tabela (`:13230, :13237, :13244, :13251`) foram lidos: **nenhum** liga tipo a artefato. O de `evidencia_tipo` (`:13237`) é processual.
- Enum `enum_sst_entregas_epi_evidencia_tipo` (`:2359-2363`): `'assinatura_digitalizada'`, `'aceite_eletronico'`, `'biometria'` — o enum **impõe o rótulo** e nada mais.

**Nada no banco liga `evidencia_tipo` a `evidencia_arquivo_url`. O finding não cai.**

---

### H4 — "A imutabilidade não é total; `evidencia_arquivo_url` é atualizável pós-confirmação, e o dano é reparável" → **REFUTAÇÃO FALHOU — e a leitura do trigger AGRAVOU o finding (§3.1)**

`sst_lock_entrega_epi` (`00_baseline_frozen.sql:2971-2988`), lido integralmente:

```
2982        IF OLD.confirmada THEN
2983          RAISE EXCEPTION 'sst_entregas_epi id=% ja confirmada e imutavel (RNF-SST-01/BR-SST-006). Use sst_estornos_entrega_epi para correcao.', OLD.id;
2984        END IF;
```

O ramo de `UPDATE` **não inspeciona uma única coluna de `NEW`**. É bloqueio incondicional. Idêntico na migration (`20260806-000131:178-180`), e o gatilho está atado como `BEFORE UPDATE OR DELETE … FOR EACH ROW` (`:186-190`).

**A imutabilidade é total. `evidencia_arquivo_url` NÃO é atualizável pós-confirmação. O dano é permanente e o finding não cai.**

---

### H5 — "A contraprova de TI não aguenta" → **REFUTAÇÃO FALHOU; a contraprova é sólida e eu a reforço**

`CreateResponsibilityTermUseCase.ts:33-37`, lido no arquivo:

```
34    if (!input.asset_id || !input.employee_id) throw new ValidationError('asset_id e employee_id são obrigatórios.');
35    if (input.acceptance_type === 'physical_signature' && !input.signed_document_path) {
36      throw new BusinessRuleError('O upload do termo assinado é obrigatório quando acceptance_type="physical_signature".');
37    }
```

O pareamento **rótulo → artefato** está imposto, em aplicação, **antes de qualquer I/O**, e o JSDoc `:29` o declara como fluxo de exceção nomeado (`E3/UC-50`). É exatamente a mesma forma que falta em `AttachEpiDeliveryEvidenceUseCase.ts:30-32`. **A contraprova do autor está correta e sustenta a conclusão** de que a técnica está dominada no projeto e não foi aplicada à categoria especial.

**Reforço que o autor não usou** (§3.1): a mesma dominância existe **no banco e dentro do próprio módulo SST**. `sst_lock_cat()` (`00_baseline_frozen.sql:2942-2964`) e `sst_lock_acidente()` (`:~2920-2935`) são triggers de imutabilidade **seletiva por coluna** — comparam campo a campo e liberam apenas o subconjunto permitido (`:2950-2960`; `:2930`: *"somente dias_perdidos/houve_cat sao atualizaveis"*). **A trava total de `sst_entregas_epi` é escolha de desenho, não limitação técnica** — o projeto sabe escrever a versão seletiva e a escreveu duas vezes na mesma tabela de funções. Isso remove qualquer defesa de "não dava para fazer diferente" e **abre uma terceira via de remediação** que o autor não listou (§5).

---

### H6 — "A UI protege de fato" → **REFUTAÇÃO FALHOU; a descrição do autor está correta e é pior do que ele escreveu**

`EpiTab.tsx:336-339`, lido no arquivo:

```
336  const evidenceSchema = z.object({
337    tipo_evidencia: z.enum(['assinatura_digitalizada', 'aceite_eletronico', 'biometria']),
338    arquivo_url: z.string().min(1, 'Informe a URL do arquivo/comprovante.'),
339  });
```

- É validação **de navegador** (`zodResolver` em `useForm`, `:351-354`) — não existe equivalente server-side (H1).
- **Sem `.url()`** — a string `"n/a"` passa. O autor está certo.
- **Sem `.trim()`** — pior que o descrito: `" "` (um espaço) também passa por `min(1)`. **O único campo de conteúdo do formulário aceita um espaço em branco como evidência probatória.**
- O `placeholder="https://…"` (`:391`) é a única indicação de formato, e placeholder não valida nada.
- **Não há upload**: a mutação envia a string digitada (`:357`). Confirma independentemente a §4.1 de `T-45` — o artefato biométrico está fora do perímetro do ERP e a coluna guarda um ponteiro não verificado.

**A UI não protege. O finding não cai.**

---

## 3. O que encontrei além do que o autor viu

### 3.1 — A trava total é escolha, não limitação, e há precedente seletivo na mesma tabela de funções (**agrava**)

Ver H5. `T-45` §4.6 elogia o desenho da trava e cita a declaração da migration (*"nenhuma exceção, nem para campos inofensivos"*) como justificativa suficiente. **A justificativa é mais fraca do que parece**, porque `sst_lock_cat()`/`sst_lock_acidente()` provam que o projeto sabe fazer trava seletiva e a aplicou a **dois** artefatos legais do mesmo módulo — inclusive à **CAT**, que é peça de valor probatório previdenciário no mínimo tão sensível quanto a Ficha de EPI. A escolha da trava total em `sst_entregas_epi`, **combinada com a inexistência do canal de estorno (`T45-SST-F02`)**, é o que converte um defeito de validação em dano permanente. **Isto reforça o HIGH e deve constar do escopo de remediação** (§5).

### 3.2 — O DDL declara um desenho que o código não implementa (observação; **não é finding novo** — não tenho autoridade para criar)

- Migration `20260806-000131:12-14`: *"A confirmação é a ÚNICA transição permitida por UPDATE (rascunho → confirmada, setando `confirmada`, `evidencia_*`, `data_prevista_troca`, `inventory_movement_id`)"*.
- `COMMENT ON COLUMN … evidencia_tipo` (`00_baseline_frozen.sql:13237`): *"Preenchido só na confirmação (BR-SST-002)"*.
- **O código não faz isso.** `evidencia_*` é preenchido por um `PATCH` separado (`AttachEpiDeliveryEvidenceUseCase.ts:40-43`) **antes** da confirmação; `ConfirmEpiDeliveryUseCase.ts:80-84` **não** toca em `evidencia_*`.

**Relevância direta para `T45-SST-F01`:** no desenho declarado — evidência gravada **na** confirmação — o portão e a gravação seriam o mesmo ponto, e o defeito seria estruturalmente mais difícil de existir. Foi a separação em dois atos que criou a janela entre "rotular" e "verificar", e ninguém fechou a janela. Encaminho ao director como observação de divergência artefato × código (mesma classe de `T-45` §6.5), **sem criar ID de finding**.

### 3.3 — A suíte de testes existente codifica o comportamento defeituoso (impacto na remediação)

`server/tests/unit/sst-epi.test.ts:124-130` exercita `AttachEpiDeliveryEvidenceUseCase` com `body: { tipo_evidencia: 'aceite_eletronico' }` — **sem `arquivo_url`** — e espera `BusinessRuleError` **apenas** por a entrega estar confirmada. `:116-122` idem, sem `arquivo_url`. Quando a validação exigida pelo critério de reteste for implementada, **esses dois testes passarão a falhar pelo motivo certo**. Isso não é objeção à remediação; é aviso à SanaCore de que ajustar `sst-epi.test.ts` faz parte do escopo, e que **nenhum teste existente prova hoje o pareamento** — logo a suíte verde não é evidência de ausência do defeito.

### 3.4 — `updateEntregaRascunho` não valida `confirmada` no repositório (fragilidade de camada, não explorável hoje)

`SequelizeEpiRepository.ts:158-163`. Chamador único e o trigger é o backstop. **Registro sem propor severidade**, porque não há consumidor que o explore — a régua do run reprovaria.

---

## 4. Onde a evidência NÃO sustenta o texto do autor

Registro para que a remediação não herde uma moldura imprecisa. **Nada aqui reduz a severidade.**

### 4.1 — A manchete sobrepesa `'biometria'`; o mecanismo é indiferente ao valor do enum

O defeito é `evidencia_tipo IS NOT NULL AND evidencia_arquivo_url IS NULL` — vale igualmente para os **três** valores. E o caso mais provável **não** é `'biometria'`: o formulário inicializa com `'aceite_eletronico'` em dois pontos (`EpiTab.tsx:353` `defaultValues` e `:369` no `reset`), de modo que `'biometria'` exige seleção deliberada. Portanto:

- O dano **de BR-SST-002 / NR-6** (Ficha de EPI sem lastro probatório) é o dano **principal e mais frequente**, e sozinho sustenta HIGH.
- O dano **de declaração falsa de tratamento de dado biométrico** (LGPD art. 5º II) é **real e correto**, porém **condicionado a uma escolha não-padrão** na UI. É agravante, não o eixo.

**Recomendação ao director:** manter a severidade e **reescrever o eixo do título na consolidação** para o pareamento rótulo × artefato, com biometria como agravante nominado. É correção de moldura, não de veredito. `T-45` **não é alterado** (Regra 15).

### 4.2 — "Confiança MÉDIA quanto à frequência" está correta, mas pelo motivo errado

O autor atribui a frequência incerta à UI mandar `arquivo_url` obrigatório. A UI **não** é o limitante — ela aceita `"n/a"` e `" "` (H6). O que de fato deixa a frequência indeterminada é que **nenhuma evidência dinâmica foi colhida** (`DYN-T45-01`/`DYN-T45-02`, não executados por `APR-2026-016`). Frequência **MÉDIA mantida**, com a justificativa substituída.

### 4.3 — Contra mim mesmo: limite da minha própria validação

Li os arquivos no estado de trabalho da árvore (`git status` limpo), **não em checkout de `c1311a6f`**. **Não reconfirmei `git diff c1311a6..HEAD`** para os 8 arquivos que li — o mesmo resíduo já aberto em `RES-T45-08`. Mitigante verificado: **todas** as linhas citadas por `T-45` bateram exatamente com o que li, o que é forte indício de ausência de drift nesses arquivos, mas **não é prova**. `RES-T46-01`.

---

## 5. O que muda na remediação (entrada para a SanaCore — não é ordem de execução)

O critério de reteste de `T-45` §3 é **necessário mas incompleto**. Ajustes que decorrem desta validação:

1. **Validação no gravador — condição correta.** Em `AttachEpiDeliveryEvidenceUseCase.ts:30-43`, exigir `arquivo_url` **não-vazio após `trim`** para **todos** os três valores do enum (não só os dois "sensíveis" que `T-45` sugere) — o valor probatório de BR-SST-002 não distingue modalidade; e impor **formato** (`http(s)` válido), que hoje não existe em camada nenhuma (H6).
2. **Portão em `ConfirmEpiDeliveryUseCase.ts:62-64`** exigindo `evidencia_arquivo_url` não-nulo e não-vazio, em defesa em profundidade. Mantido como em `T-45`.
3. **`CHECK` em migration versionada.** Recomendo a forma **ampla** — `CHECK ((evidencia_tipo IS NULL) OR (evidencia_arquivo_url IS NOT NULL))` — e **não** a estreita por lista de valores, pela razão de §4.1.
4. **Novo — decorre de §3.1.** A remediação **não pode parar na validação**: o dano das linhas já confirmadas é irreparável pelo par trava-total + estorno inexistente. Ou `T45-SST-F02` entra no **mesmo** lote de remediação, ou o director decide converter `sst_lock_entrega_epi` em trava **seletiva** nos moldes de `sst_lock_cat()` (`00_baseline_frozen.sql:2942-2964`), liberando exclusivamente `evidencia_arquivo_url` quando `OLD.evidencia_arquivo_url IS NULL`. **A segunda opção mexe em invariante estrutural declarado (RNF-SST-01/BR-SST-006) e é decisão humana, não da SanaCore nem minha** (Regras 6 e 18).
5. **Novo — decorre de §3.3.** `server/tests/unit/sst-epi.test.ts:116-130` precisa ser atualizado no mesmo commit, e o reteste deve incluir um caso que prove a **recusa** de `PATCH …/evidence` sem `arquivo_url` e a **recusa** de `POST …/confirm` sobre linha rotulada sem artefato.
6. **Fora de escopo desta remediação, e deve ser dito:** o item 1 **não** resolve o problema real diagnosticado em `T-45` §4.1 — o artefato de categoria especial continua fora do perímetro do ERP, apontado por texto livre de 255 caracteres sem allowlist. Validar formato de URL **reduz o lixo, não protege o artefato**. Que ninguém leia a correção do pareamento como "evidência de EPI resolvida".

---

## 6. Resíduos desta validação

| ID | Resíduo |
|---|---|
| `RES-T46-01` | Leitura feita na árvore de trabalho, não em checkout de `c1311a6f`; `git diff c1311a6..HEAD` **não reconfirmado** para os 8 arquivos lidos (§4.3). Mantém `RES-T45-08`. |
| `RES-T46-02` | **Não** validei os outros 7 findings de `T-45` (`F02`…`F08`) — fora do mandato desta trilha, que é a Regra 22 (CRITICAL/HIGH). Os 3 MEDIUM e 4 LOW **não têm veredito de validação** e não devem ser lidos como validados por omissão. |
| `RES-T46-03` | A remediação de `T45-SST-F01` está **acoplada** a `T45-SST-F02` (MEDIUM, não validado) por §5 item 4. Se o director despachar `F01` sozinho, o dano histórico permanece irreparável. Ponto do director. |
| `RES-T46-04` | Frequência real do defeito **indeterminada estaticamente**. `DYN-T45-01` e `DYN-T45-02` continuam sendo o que a mede; nenhum foi executado. |

---

## 7. Estado

- **`T45-SST-F01`: `CONFIRMED`. Severidade recomendada: HIGH (mantida). Confiança do mecanismo elevada para `CONFIRMED`. Liberado para remediação (Regra 22 cumprida).**
- **6 hipóteses de refutação executadas, 6 falharam** — H1 (validação em outra camada), H2 (outro gravador), H3 (outro `CHECK`), H4 (imutabilidade parcial), H5 (contraprova frágil), H6 (UI protege). Todas documentadas com arquivo+linha, inclusive as que falharam.
- **2 controles reais encontrados e registrados a favor do objeto auditado**, nenhum suficiente para refutar: lista branca de campos em `CreateEpiDeliveryUseCase.ts:59-68` (sem mass assignment) e segregação `operate`/`approve` em `sst.ts:53-54`.
- **1 agravante novo** (§3.1 — trava total é escolha, com precedente seletivo em `sst_lock_cat()`), **1 divergência artefato × código** (§3.2), **1 impacto de suíte de testes** (§3.3), **1 fragilidade de camada sem consumidor** (§3.4).
- **2 correções de moldura contra o texto do autor** (§4.1 eixo do finding; §4.2 justificativa da confiança MÉDIA) — **nenhuma reduz a severidade**, e `T-45` **não foi alterado** (Regra 15).
- **1 correção contra mim** (§4.3 — não reconfirmei o `AUDIT_COMMIT` por diff).
- Banco `erp_evok_audio` **não acessado**. `APR-2026-016` íntegra. Nada gravado fora de `audit/`.
- **Nenhum finding novo criado. Nenhum `FINDING CLOSED`. Nenhum `RETEST_PASSED`. Nenhuma severidade alterada** — apenas recomendada (Regra 18).
