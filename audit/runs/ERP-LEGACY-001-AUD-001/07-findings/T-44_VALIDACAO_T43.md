# T-44 — Validação adversarial de `T43-SST-F01` (Regra 22)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | `T-44` (validação de `T-43` §3, finding `T43-SST-F01`) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Organização | VeriCore — `vericore-finding-validator` |
| Natureza | Estática. **Nenhuma conexão com `erp_evok_audio`** — `APR-2026-016` íntegra. |
| Artefato de origem | `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-43_C137_SEMANTICA_COLUNA_LOTE5.md` §3 — **não alterado** (Regra 15) |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |

---

## 1. Veredito

**`T43-SST-F01` → `CONFIRMED`.**

| Dimensão | Proposto por `T-43` | Sustentado pela evidência | Recomendação (Regra 18 — recomendo, não altero) |
|---|---|---|---|
| Severidade | HIGH | **HIGH** | **Manter HIGH.** Não subir a CRITICAL: nenhum modo de falha determinístico da 2ª escrita foi provado (§4.3). Não descer: mecanismo provado em caminho único, sem controle compensatório. |
| Confiança — mecanismo | ALTA | **CONFIRMED** | **Subir para CONFIRMED.** Os três elos foram lidos literalmente e a hipótese refutadora mais forte (CLS) foi testada e caiu. |
| Confiança — frequência | MÉDIA | **MÉDIA** | **Manter MÉDIA.** `DYN-T43-01` continua necessário e continua bloqueado por `APR-2026-016`. |

Cinco tentativas de refutação foram executadas. **Nenhuma derrubou o finding.** Duas o **ampliaram** (§5).

---

## 2. Os três elos — verificados um a um por leitura direta

| Elo | Afirmado por `T-43` | Verificado | Texto literal no `AUDIT_COMMIT` |
|---|---|---|---|
| 1 | `AsoRepository.ts:30` declara `createAso(data, transaction?)` | **VERDADEIRO** | `public async createAso(data: Record<string, unknown>, transaction?: unknown): Promise<any>` |
| 2 | `SequelizeAsoRepository.ts:70-72` descartou o parâmetro | **VERDADEIRO** | `:70 public async createAso(data: Record<string, unknown>): Promise<any> {` / `:71 return SstAso.create(data);` — a chamada ao Sequelize **não tem segundo argumento** |
| 3 | `CreateAsoUseCase.ts:72-98` grava ASO fora de `t` e evento dentro de `t` | **VERDADEIRO** | `:72 const t = await sequelize.transaction();` · `:74-85 createAso({...})` **sem `t`** · `:87-92 esocialEventRepository.create({...}, t)` **com `t`** · `:94 await t.commit();` · `:97 await t.rollback();` |

Sobre a não-detecção pelo compilador: a implementação com menos parâmetros é atribuível à base em TypeScript (bivariância de parâmetros de método), e `AsoRepository.ts:30` ainda carrega `// eslint-disable-line @typescript-eslint/no-unused-vars` — **o único lint que poderia reclamar do parâmetro está desligado na própria linha do contrato**. A divergência é silenciosa em compilação **e** em lint. Elo 3 do autor está correto e é mais forte do que ele escreveu.

**Prova adicional que o autor não usou, e que fecha o argumento:** o repositório irmão, no mesmo módulo, mostra a forma correta a 35 linhas de distância — `SequelizeEsocialEventRepository.ts:34-35`: `create(data, transaction?)` → `SstEventoEsocial.create(data, transaction ? { transaction } : undefined)`. O `create` do evento **recebe e repassa**; o `create` do ASO **não recebe**. A assimetria não é inferida: é literal, e é a mesma chamada de biblioteca.

---

## 3. Tentativa de refutação `H1` — transação implícita por CLS/`AsyncLocalStorage` — **FALHOU**

Esta era a hipótese que derrubaria o finding inteiro, e por isso foi executada primeiro.

| Verificação | Resultado |
|---|---|
| `server/src/config/database.ts:1-67` — inicialização completa lida | `new Sequelize(getConfig())` (`:53`). `getConfig` devolve `host/port/database/username/password/dialect/logging/pool/define`(+`dialectOptions` se SSL). **Nenhum `Sequelize.useCLS(...)`, nenhum `transactionType`, nenhum `isolationLevel`, nenhum namespace.** |
| Grep por `cls-hooked\|useCLS\|AsyncLocalStorage\|createNamespace\|continuation-local` em `server/` (exceto `node_modules`) | **Zero ocorrências em código de aplicação.** Os únicos hits de `namespace` são `pg_namespace` em SQL e `namespace Express` em `types/express.d.ts:4`. |
| `server/package.json` — dependências | `sequelize ^6.37.8`, `sequelize-cli ^6.6.5`. **`cls-hooked` não é dependência do projeto.** |

**Conclusão:** não há transação gerenciada implicitamente. `SstAso.create(data)` adquire uma conexão do pool distinta daquela que `t` mantém aberta e emite o `INSERT` em **autocommit**. A linha do ASO está durável **antes** de `:94 t.commit()`. **Refutação falhou; o mecanismo do finding está provado.**

---

## 4. Demais tentativas de refutação

### 4.1 `H2` — `POST /api/sst/aso` não seria o único caminho de escrita — **FALHOU**

- Grep global (repo inteiro, exceto `node_modules`) por `SstAso.create` / `SstAso.bulkCreate` / `createAso(`: em `server/`, **as duas únicas ocorrências de escrita** são `SequelizeAsoRepository.ts:70-71` e o chamador `CreateAsoUseCase.ts:74`. Os demais hits são `client/src/api/sst.ts:260` e `client/src/pages/sst/AsoTab.tsx:188` (front, que chama o mesmo endpoint) e o próprio `T-43`.
- **Nenhum seeder**: não existe diretório `server/src/seeders`; nenhum arquivo de seed referencia `SstAso`/`sst_asos`.
- **RH não escreve**: `SstAsoServiceAdapter.ts:2-4` declara e o código confirma — o adapter chama `GetAsoStatusUseCase`, *"não lê o model `SstAso` diretamente aqui, nem `cid`/laudo clínico"*. É leitura.
- Rotas (`modules/sst/presentation/routes/sst.ts:66`): `router.post('/aso', authorizeModule('sst','operate'), asoController.create)` — **um** verbo de escrita para `sst_asos` em toda a superfície HTTP. Não há `PUT`, `PATCH` nem `DELETE` de ASO.

**Caminho único confirmado.** Isto é o que mantém a régua HIGH do próprio autor satisfeita: não existe rota alternativa que faça certo.

### 4.2 `H4` — `sst_asos` teria `UNIQUE` ou índice único parcial — **FALHOU**

Baseline congelado `server/database/postgresql/00_baseline_frozen.sql`:

- `:18042-18043` — `sst_asos_pkey PRIMARY KEY (id)`. **É a única constraint de unicidade.**
- Índices: `:21176` `data_vencimento`, `:21183` `employee_id`, `:21190` `status_esocial_s2220`, `:21197` `tipo` — **todos `CREATE INDEX`, nenhum `CREATE UNIQUE INDEX`, nenhum `WHERE` parcial.**
- FKs `:25455-25456` (`employee_id`) e `:25463-25464` (`registrado_por`) — não impõem unicidade.
- Migration de origem `20260806-000134-create-sst-aso.cjs:71-74` — quatro `addIndex` sem `unique: true`. Confirma a origem versionada.

**E a aplicação também não impede.** `CreateAsoUseCase.execute` (`:50-100`) valida obrigatórios (`:52-54`), enums (`:55-56`), existência do funcionário (`:58`) e plano de exames (`:63`). **Não chama `findLatestAsoByEmployee` nem qualquer consulta de duplicidade antes de gravar.** Não há controle compensatório de nível de aplicação. A cadeia do retry duplicando laudo clínico está confirmada nas duas camadas.

### 4.3 `H3` — a 2ª escrita não teria modo de falha plausível — **PARCIALMENTE PROCEDENTE; não derruba, mas sustenta a confiança MÉDIA de frequência**

Esta foi a única refutação que produziu resultado favorável ao código, e registro-a com honestidade porque é ela que impede a subida a CRITICAL.

DDL de `sst_eventos_esocial` (`:13318-13331`): `id` (default sequence), `tipo NOT NULL`, `origem_tipo NOT NULL`, `origem_id NOT NULL`, `payload_referencia` nullable, `prazo_legal` nullable, `status NOT NULL DEFAULT 'pendente'`, `recibo`/`motivo_rejeicao`/`data_envio` nullable, `created_at`/`updated_at` com default.

O payload de `CreateAsoUseCase.ts:87-92` fornece `tipo:'S-2220'`, `origem_tipo:'aso'`, `origem_id: aso.id`, `status:'pendente'`.

| Modo de falha investigado | Resultado |
|---|---|
| `NOT NULL` sem valor | **Ausente.** Todas as `NOT NULL` são supridas ou têm default. |
| Enum inválido | **Ausente.** `'S-2220'`, `'aso'` e `'pendente'` são valores válidos dos três enums (`SstEventoEsocial.ts:38-43`; DDL `:13320-13325`). |
| FK violada | **Ausente por construção.** A origem é polimórfica **sem FK** (`SstEventoEsocial.ts:6-7`). Ironia registrada: é justamente a ausência de FK que impede o banco de detectar o ASO órfão. |
| `CHECK` | Nenhum na tabela. |
| **Índice único parcial** `uq_sst_eventos_esocial_origem_ativo` (`:22093`): `UNIQUE (origem_tipo, origem_id) WHERE status <> 'rejeitado'` | **PRESENTE e é um modo de falha real** — dispara `UniqueConstraintError` se já existir evento ativo com `origem_tipo='aso'` e o mesmo `origem_id`. No caminho normal `aso.id` é novo, então a colisão exige `sst_asos_id_seq` dessincronizada em relação a `origem_id` já gravados (restore sem `setval`, carga com id explícito). É o cenário de "bomba de sequence" já conhecido do histórico do projeto. **Plausível, não demonstrável estaticamente.** |
| Falha de infraestrutura | Timeout de statement, queda de conexão, restart do Postgres, `serialization_failure`, e — ver §5.3 — esgotamento de pool. |

**Efeito no veredito:** o dano alegado por `T-43` continua inteiro (basta uma falha); o que **não** se sustenta é qualquer afirmação de frequência. A frase do autor *"basta que a segunda gravação falhe uma vez"* está correta; *"MÉDIA quanto à frequência"* está correta e **deve ser mantida**. Quem tentar subir isto a CRITICAL alegando falha determinística estará errado — **não há**.

### 4.4 `H5` — a contraprova do autor (`CreateAccidentUseCase`/`EmitCatUseCase`) não se sustentaria — **FALHOU; a contraprova é mais forte do que o autor mediu**

- `CreateAccidentUseCase.ts:46-58`: abre `t` (`:46`), `createAccident({...}, t)` (`:48-53`), `createWitnesses(acidente.id, testemunhas, t)` (`:56`), `t.commit()` (`:58`). **Confirmado.**
- `EmitCatUseCase.ts:49-92`: abre `t` (`:49`), lê o acidente **dentro** de `t` (`:51`), `createCat({...}, t)` (`:63-70`), `esocialEventRepository.create({...}, t)` (`:72-78`), `createComplement({...}, t)` (`:81-88`), `updateAccidentConsolidated(..., t)` (`:89`), `commit` (`:92`). São **quatro** escritas propagadas, não três. **Confirmado e subestimado pelo autor.**

**Medi o módulo inteiro, e não apenas o cluster irmão.** Varredura de `transaction` em `server/src/modules/sst/infrastructure/sequelize/`:

| Repositório | Propaga transação? |
|---|---|
| `SequelizeAccidentRepository` | Sim — 8 métodos, incl. `lock: transaction.LOCK.UPDATE` (`:43,:68,:76`) |
| `SequelizeEsocialEventRepository` | Sim (`:26,:34`) |
| `SequelizeCipaRepository` | Sim (7 métodos) |
| `SequelizeTrainingRepository` | Sim |
| `SequelizeEpiRepository` | Sim (`:145,:166`) |
| `SequelizeCorrectiveActionRepository` | Sim |
| `SequelizePgrRepository` | Sim |
| `SequelizeSafetyRoutineRepository` | Sim |
| **`SequelizeAsoRepository`** | **Não — zero ocorrências da palavra `transaction` no arquivo inteiro (86 linhas)** |

**A leitura de "lapso pontual" está confirmada com margem: `SequelizeAsoRepository` é o único repositório do módulo SST sem qualquer propagação transacional.** Não é arquitetura sem transação — é um arquivo fora do padrão de outros oito. **A remediação continua barata**, como o autor previu, e a hipótese pior ("arquitetura sem transação", que exigiria refatoração de módulo) **fica descartada com evidência**.

---

## 5. O que a validação encontrou e o autor não viu — amplificações do mesmo `FINDING_ID`

Registro como **amplificação de evidência de `T43-SST-F01`**, não como finding novo (o validador não cria findings). Encaminho ao `vericore-software-audit-director` para decidir se muda a redação do finding de origem.

### 5.1 O ASO órfão não fica "sem rastro" — fica com **rastro falso positivo**

`sst_asos.status_esocial_s2220` (`:12942`) é `NOT NULL DEFAULT 'pendente'`. Grep em `server/src/` mostra que a coluna é **escrita por ninguém** — só existe em `SstAso.ts:32,50,61` (definição e índice) e em `AsoMapper.ts:46`, que a **devolve no DTO**.

Consequência: quando o `INSERT` do evento falha, o ASO permanece comitado exibindo `status_esocial_s2220 = 'pendente'` na interface — isto é, **a aplicação afirma ao usuário que a obrigação S-2220 está enfileirada, quando não existe linha alguma em `sst_eventos_esocial`**. O autor escreveu *"a obrigação desaparece sem rastro"*; é pior: desaparece deixando um indicador que declara o contrário. Não há reconciliação entre `sst_asos.status_esocial_s2220` e a fila.

**E não há recuperação pela aplicação.** A única rota de escrita da fila é `POST /esocial-events/:id/resend` (`sst.ts:84`), e `ResendEsocialEventUseCase.ts:29-30` exige um evento **existente** e `rejeitado` (`:25-27`). Não existe endpoint que **crie** evento avulso. Somado ao trigger `trg_sst_block_delete_evento_esocial` (`:22219`), a fila não perde eventos — mas também **não permite reparar um que nunca nasceu**, sem escrita direta ao banco.

### 5.2 O laudo duplicado não é inerte: alimenta o portão de aptidão do RH por `ORDER BY` sem desempate

`SequelizeAsoRepository.ts:65-67` — `findLatestAsoByEmployee` faz `findOne({ where: { employee_id }, order: [['data_realizacao','DESC']] })`. **`data_realizacao` é `date`, e não há critério secundário de desempate.** Esse método é a fonte de `GetAsoStatusUseCase.ts:22`, que é o status de aptidão consumido pelo RH no gate de admissão/retorno (`:2-5`, RF-SST-021, via `SstAsoServiceAdapter`).

Portanto, dois ASOs do mesmo funcionário na mesma data — exatamente o produto do retry descrito no finding — fazem o Postgres escolher **qualquer um dos dois**, sem ordem definida. Se o operador reexecutou **corrigindo** o `resultado` (cenário natural: errou o campo, recebeu erro, refez), o sistema passa a responder aptidão de forma **não determinística entre `apto` e `inapto`**. O dano do retry, que o autor descreveu como duplicação documental, tem portanto um **braço decisório**.

Isto reforça a severidade HIGH por outra via, e **acrescenta um item obrigatório de remediação** (§6, item 5).

### 5.3 Risco secundário de disponibilidade: auto-esgotamento do pool

`t` é aberta em `:72` e o `INSERT` do ASO (`:74`) precisa de uma **segunda** conexão enquanto a primeira está retida. Pool: `max: isProd ? 20 : 10`, `acquire: 30000` (`database.ts:29-34`). Com `max` requisições concorrentes de `POST /api/sst/aso`, todas as conexões ficam retidas por transações abertas e todos os `INSERT` de ASO ficam aguardando conexão até `ConnectionAcquireTimeoutError`. **Registro como risco teórico**: exige concorrência ≥ `max` no mesmo endpoint, o que é implausível no perfil de uso deste ERP. **Não fundamenta severidade** — anoto porque desaparece de graça com a mesma correção.

### 5.4 Observação de escopo — não é finding, é sanidade da remediação

Verifiquei se `createComplementaryExam` (`SequelizeAsoRepository.ts:75-77`, também sem `transaction`) padece do mesmo defeito: **não**. `CreateComplementaryExamUseCase.ts:28-44` não abre transação alguma e faz uma única escrita. Não há promessa de atomicidade quebrada ali. Digo isto explicitamente para que a remediação **não** amplie o escopo indevidamente, e para que a auditoria não seja acusada de ter deixado passar o vizinho.

---

## 6. O que muda na remediação

O critério de reteste de `T-43:123` está **correto mas incompleto**. Recomendo ao `vericore-audit-consolidator` que o caso encaminhado à SanaCore contenha:

1. `SequelizeAsoRepository.createAso(data, transaction?)` repassando `SstAso.create(data, transaction ? { transaction } : undefined)` — **na forma já usada por outros 8 repositórios do módulo**, notadamente `SequelizeEsocialEventRepository.ts:35`. (do autor)
2. `CreateAsoUseCase.ts:74` passando `t`. (do autor)
3. Teste de integração que force a falha do `INSERT` do S-2220 e prove **zero linha** em `sst_asos`. (do autor)
4. `UNIQUE (employee_id, tipo, data_realizacao)` versionada — **com ressalva nova**: como a auditoria é estática e `APR-2026-016` proíbe consultar `erp_evok_audio`, **não é possível afirmar que não existem duplicatas preexistentes**. Uma migration de `UNIQUE` simples pode **falhar no deploy**. A remediação deve incluir passo de detecção/tratamento de duplicatas anterior à criação da constraint. **Isto é precondição, não detalhe.**
5. **NOVO — §5.2:** desempate determinístico em `findLatestAsoByEmployee` (`order: [['data_realizacao','DESC'], ['id','DESC']]`), sob pena de o portão de aptidão do RH permanecer não determinístico **mesmo depois** de a transação ser corrigida.
6. **NOVO — §5.1:** reconciliação `sst_asos` × `sst_eventos_esocial`. A correção transacional protege o **futuro**; ela **não** recupera ASO já órfão, e o `status_esocial_s2220` continuará mentindo sobre ele. Exige varredura de ASOs sem evento ativo e backfill — e, como não há endpoint de criação de evento, exige decisão de engenharia sobre o canal do backfill. **Decisão humana requerida (Regra 6/18): não a supri.**
7. **NOVO — §5.1:** definir se `sst_asos.status_esocial_s2220` é fonte de verdade derivada ou coluna morta. Hoje é escrita por ninguém e exibida ao usuário — a redundância é o que torna o órfão invisível.

**Nota à SanaCore:** os itens 1-3 são o defeito; 4-7 são o que impede a correção de ser cosmética. Fechar apenas 1-3 e declarar remediação completa deixaria o ASO órfão existente sem tratamento e o gate de RH não determinístico.

---

## 7. Encaminhamento

- `T43-SST-F01` — **CONFIRMED**, severidade recomendada **HIGH**, confiança de mecanismo recomendada **CONFIRMED**, confiança de frequência **MÉDIA**. **Segue para remediação** (Regra 22 satisfeita).
- `DYN-T43-01` permanece **aberto e bloqueado** por `APR-2026-016`. Ele não é condição para confirmar o finding — é condição para medir frequência. Registro para que sua ausência não seja usada como argumento de rebaixamento.
- Amplificações §5.1 e §5.2: encaminhadas ao `vericore-software-audit-director`. **Não criei finding novo** e **não alterei `T-43`** (Regras 15 e do papel).
- **Nenhum `FINDING CLOSED` é declarado aqui** — não é autoridade deste agente.
- Findings `T43-SST-F02` … `T43-LGPD-F11` (MEDIUM/LOW) **não** foram objeto desta validação: fora do gatilho da Regra 22 e fora do mandato recebido.
