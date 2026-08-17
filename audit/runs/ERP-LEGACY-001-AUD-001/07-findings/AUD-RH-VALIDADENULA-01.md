# `AUD-RH-VALIDADENULA-01` — Validade nula de ASO é tratada como validade infinita, nos dois consumidores que decidem

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         candidato T49-RH-C01 (T-49 §5), proposto pelo autor de T-41
                a partir de OBS-T48-04 (T-48) e de descoberta própria do T-49
AUTORIZAÇÃO:    APR-2026-044 D1 — abertura determinada pelo dono
SEVERIDADE:     HIGH — fixada pelo dono em 2026-08-17 (APR-2026-045 D1)
ESTADO:         CONFIRMED — segue ao vericore-finding-validator (Regra 22)
AMBIENTE:       ver §7 — depende do módulo, e a Admissão difere da Demissão
```

> **Nota de convenção.** O dono determinou abrir o candidato `T49-RH-C01` como finding próprio. O ID formal segue a convenção de promoção deste run (`AUD-<MÓDULO>-<NOME>-01`), como em `AUD-RH-VTHORISTA-01` e `AUD-COM-DESCONTO-01`. **`T49-RH-C01` é o ID de candidato e permanece citável** — os dois designam o mesmo finding.

## 1. O defeito

Um Atestado de Saúde Ocupacional gravado **sem data de validade** é tratado como **válido para sempre** pelos dois consumidores que decidem sobre ele.

**Leitura — `SequelizeEmployeeDocumentRepository.ts:50`:**

```js
[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]
```

`NULL` entra na disjunção como se fosse "vigente". Não é ausência de informação tratada como ausência — é ausência tratada como **afirmação positiva de validade**.

**Escrita — `CreateEmployeeDocumentUseCase.ts:61`:**

```js
valid_until: input.valid_until ?? null
```

A coluna **nunca é obrigatória**, inclusive para `doc_type` do grupo `aso_*`. O DDL confirma: `valid_until date` nullable (`00_baseline_frozen.sql:5919`), sem `CHECK`, sem `DEFAULT`.

**Consequência com consumidor real.** `ReturnFromAbsenceUseCase.ts:95-96` chama `hasValidAso(..., 'aso_retorno', ...)` para autorizar o retorno de afastamento acima de 30 dias (RF-RH-048). Um `aso_retorno` com `valid_until NULL` **satisfaz todo retorno futuro, indefinidamente** — e o gate **não amarra o documento ao afastamento** que o motivou. Um único ASO sem validade autoriza retornos de afastamentos que ainda nem ocorreram.

## 2. O segundo consumidor — descoberto no `T-49`, não coberto por `OBS-T48-04`

`ConcludeAdmissionProcessUseCase.ts:125`:

```js
if (process.aso_valid_until && ...)
```

A guarda de vigência do ASO admissional **só roda quando a data existe**. Com `aso_valid_until NULL`, a comparação contra `hire_date` é **pulada inteira** — e a admissão conclui sem que a validade do exame tenha sido verificada.

**É a mesma classe de defeito, em outra tabela e outro caminho**, e por determinação do dono (`APR-2026-044` D1) entra **neste mesmo finding**:

> *"incluindo o vetor equivalente na Admissão (`ConcludeAdmissionProcessUseCase.ts:125`) no mesmo finding, já que é a mesma classe de defeito."*

**Causa raiz comum, e é ela que define o finding:** `NULL` tratado como afirmação positiva. Nos dois casos a ausência de dado produz o resultado **mais permissivo**, em decisão de saúde ocupacional.

## 3. Por que é finding próprio, e não item de `T41-RH-F02`

O argumento é o do `T-49` §5, e o ônus da prova foi assumido lá:

**Independência nos dois sentidos — o teste decisivo.**

- Executar **todo** o critério de `T41-RH-F02` (`CR-T49-RH-01` a `-08`) deixa este vetor **inteiramente aberto**: um `aso_retorno` com `valid_until NULL`, emitido pela própria SST, com domínio unificado e FK correta, **perfeitamente concordante**, continua valendo para sempre.
- Inversamente, corrigir a validade **não reconcilia nada** entre SST e RH.

**Coluna e norma diferentes.** `T41-RH-F02` é sobre `aptitude_result` — resultado duplicado, sem vínculo, com domínio divergente (RF-RH-028). Este é sobre `valid_until` — vigência (RF-RH-048).

**Consequência de rastro.** Amarrado ao outro finding, o reteste ficaria refém de defeito alheio: ou não fecharia por motivo estranho, ou fecharia levando o vetor junto, invisível.

**O que impede isto de inflar o placar:** o vetor **compartilha o lote de remediação**. O que se separa é a **contabilidade**, não o trabalho — e foi assim que o dono decidiu.

## 4. Evidência

| # | Artefato | Literal |
|---|---|---|
| 1 | `SequelizeEmployeeDocumentRepository.ts:50` | `[Op.or]: [{ valid_until: null }, { valid_until: { [Op.gte]: today } }]` |
| 2 | `CreateEmployeeDocumentUseCase.ts:61` | `valid_until: input.valid_until ?? null` — nunca obrigatória |
| 3 | `ConcludeAdmissionProcessUseCase.ts:125` | `if (process.aso_valid_until && ...)` — guarda pulada se nula |
| 4 | `ReturnFromAbsenceUseCase.ts:95-96` | `hasValidAso(..., 'aso_retorno', ...)` — consumidor do vetor 1 |
| 5 | `asoGate.ts:26` | `hasValidAso` chama **exclusivamente** `findValidAso` |
| 6 | `00_baseline_frozen.sql:5919` | `valid_until date` — nullable, sem `CHECK`, sem `DEFAULT` |
| 7 | `HrEmployeeDocument.ts:27` | `valid_until: DataTypes.DATEONLY` — sem `allowNull: false`, sem `validate` |

## 5. Severidade recomendada — HIGH, e o fundamento

Aplico o teste decisivo deste run: **o defeito ocorre pelo caminho normal do sistema, com consumidor real?**

**Sim, nos dois vetores.** Não exige escrita fora da aplicação, nem concorrência, nem ator mal-intencionado. Basta **omitir um campo opcional** num formulário — o caminho mais provável de todos.

O que a decisão errada libera: **retorno ao trabalho após afastamento** e **conclusão de admissão**, os dois sobre exame de aptidão cuja vigência não foi verificada. É a mesma família de `T41-RH-F02` (HIGH) e `T43-SST-F01` (HIGH) — decisão de saúde ocupacional tomada sobre dado que o sistema não garante.

**A severidade não é minha para fixar** (Regra 18). Registro a recomendação e o fundamento; a decisão é do dono.

### 5.1 Severidade FIXADA — HIGH (`APR-2026-045` D1, 2026-08-17)

**Texto verbatim do dono:**

> *"HIGH. A recomendação está bem fundamentada: o defeito ocorre pelo caminho
> mais comum possível (omitir um campo opcional num formulário), sem precisar de
> nada especial, e libera decisão real sobre aptidão de retorno ao trabalho e
> admissão. Manter MEDIUM contrariaria a régua que vocês já aplicaram a
> `T41-RH-F02` e `T43-SST-F01`, que são HIGH pela mesma família."*

**Fundamento de coerência de régua, registrado:** a decisão não é só sobre este
finding — é sobre **manter a régua estável**. Os três defeitos pertencem à mesma
família (decisão de saúde ocupacional tomada sobre dado que o sistema não
garante) e os outros dois já são HIGH. Classificar este abaixo teria criado
inconsistência de escala dentro do próprio corpus.

**Segue ao `vericore-finding-validator`** (Regra 22) antes de remediação.

## 6. Critério de reteste (objetivo, estático + teste)

1. **Leitura:** `SequelizeEmployeeDocumentRepository.ts:50` deixa de tratar `NULL` como vigente para `doc_type` do grupo `aso_*`.
2. **Escrita:** `valid_until` passa a ser **obrigatória** para `aso_*` em `CreateEmployeeDocumentUseCase` — corrigir só a leitura apenas move o buraco.
3. **Admissão:** `ConcludeAdmissionProcessUseCase.ts:125` recusa a conclusão quando `aso_valid_until` for nula, em vez de pular a guarda.
4. **Teste que reprove o estado anterior**, nos **dois** caminhos: retorno de afastamento com `aso_retorno` sem validade → recusa; admissão com `aso_valid_until` nula → recusa.
5. **Decisão registrada** sobre o passivo: documentos `aso_*` já gravados com `valid_until NULL` — backfill, expiração retroativa, ou aceitação declarada. A correção protege o futuro; o passado é fato de dado.

**Reprova se:** corrigir apenas um dos dois consumidores; corrigir a leitura sem tornar a coluna obrigatória na escrita; ou fechar sem decisão sobre o passivo.

## 7. Ambiente

**Admissão e Demissão/Retorno diferem, e o finding não deve ser lido como homogêneo.** A classificação de ambiente por módulo está em `T-38` e foi refinada por `APR-2026-031` D13 item 4 — *"`employees` em uso real **somente** no fluxo de desligamento"*. O restante do módulo de RH segue DEV/HOMOLOGAÇÃO.

**Cláusula de reavaliação automática:** reavaliar para bloqueante quando o módulo de RH entrar em produção — e antes disso, se qualquer fluxo de afastamento/retorno passar a operar com funcionário real.

## 8. Rastreabilidade

- **Origem:** `OBS-T48-04` (`T-48`) + descoberta própria do `T-49` §5 quanto à Admissão.
- **Compartilha lote de remediação** com `T41-RH-F02`, sem se confundir com ele.
- **Fallback desativado:** com este finding aberto, `CR-T49-RH-09` deixa de ser item condicional de `T41-RH-F02` (`T-49` §4.5).
- **Pedidos dinâmicos correlatos, não executados:** `DYN-T49-05` (quantas linhas `aso_*` têm `valid_until NULL`) e `DYN-T49-06` (quantos `hr_admission_processes` concluídos têm `aso_valid_until NULL`) — dimensionam o passivo do item 5 do critério.

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4). Severidade **não fixada** — aguarda o dono.
