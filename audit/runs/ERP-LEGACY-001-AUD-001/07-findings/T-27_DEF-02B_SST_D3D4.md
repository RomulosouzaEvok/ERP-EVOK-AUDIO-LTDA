# T-27 — FECHAMENTO PARCIAL DE `DEF-02` (metade `sst`) · D3 + D4 EXAUSTIVOS

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f   (única referência de leitura)
TRILHA:        T-27 — DEF-02(b): módulo `sst`, endpoints NÃO cobertos por T-12
TITULAR:       vericore-business-rule-auditor
AUTORIDADE:    decisão do dono de fechar DEF-02 antes do veredito; EMENDA-02 C-05/C-06
REGIME:        read-only. Zero conexão de banco, zero execução, zero escrita em
               server/src, client/src, tests/, product/, requirements/, architecture/ (Regra 2).
ESCOPO:        59 dos 75 endpoints de `sst` (os 16 dos clusters-âncora de T-12 —
               acidente/CAT, PT, eSocial — NÃO foram reauditados; ver §1).
ESTADO:        D3 e D4 = E 59/59 por leitura de use case, repositório, mapper, model,
               schema declarado, contrato de API, requisitos e testes.
NÃO DECLARA:   AUDIT_PASSED, FINDINGS_CONFIRMED, RETEST_PASSED, FINDING CLOSED (Regras 3,4,18).
```

> **Nota de persistência.** O agente titular não dispunha de ferramenta `Write` (enforcement
> read-only da VeriCore). Conteúdo persistido pelo orquestrador **sem alteração** — mesmo padrão
> de ressalva de transparência já aplicado nos passos 23 e 24.

**Fato de base declarado pelo orquestrador (cadeia de custódia externa, não evidência do agente):**
`git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database` → saída
vazia.

## 1. Enumeração própria da superfície e recorte de escopo

Contagem por leitura própria de `server/src/modules/sst/presentation/routes/sst.ts`
(linhas 38–137):

| Cluster | Linhas | Endpoints |
|---|---|---|
| EPI (NR-6) | `:38-55` | 16 |
| ASO/PCMSO (NR-7) | `:58-67` | 9 |
| Acidente/CAT | `:70-79` | 10 |
| Fila eSocial | `:82-84` | 3 |
| CIPA (NR-5) | `:87-98` | 12 |
| PGR/GES (NR-1) | `:101-106` | 6 |
| Treinamentos | `:115-120` | 6 |
| Rotina preventiva | `:123-132` | 10 |
| Ações corretivas | `:135-137` | 3 |
| **Total** | | **75** |

**DIV-T27-00 — não há divergência de inventário.** Os 75 declarados pelo plano e por T-12 (§5)
conferem com a contagem própria. Registro porque a regra do plano exige registro nas duas
direções (T-04/T-08 acharam divergência em outros módulos).

**Recorte:** clusters-âncora de T-12 (`T-12` §5: "CAT/acidente, PT, eSocial") = 16 endpoints —
acidente/CAT (10, `:70-79`), eSocial (3, `:82-84`), PT (3, `:125,126,127`). **Escopo = 59.** Não
foram reauditados `FIND-ERP-008`, `T12-H02`, `T12-H03`, `T12-M07`.

**Nota de fronteira (Regra 16):** `server/src/modules/rh/domain/services/asoGate.ts` e
`.../rh/infrastructure/adapters/SstAsoServiceAdapter.ts` foram lidos exclusivamente como
consumidores do contrato publicado por `sst` (para `T27-F10`). Nenhum endpoint de `rh` é auditado
ou reportado aqui.

## 2. Fonte documental usada como lado "documentado"

| Artefato | O que fixa |
|---|---|
| `docs/business/BLOCO_1_SST_REQUISITOS.md` | 55 RFs (`:53-142`) + "36 regras BR-SST-001 a 036" (`:6`) + fluxos de exceção (`:191-529`) |
| `docs/business/BLOCO_1_SST_API.md` | contrato por endpoint, enums, efeitos, transação, tabela RF→endpoint (`:764-807`) |
| `server/database/postgresql/00_baseline_frozen.sql` | UNIQUEs, CHECKs, triggers, COMMENTs com BR-ID |
| `docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` | catálogo oficial da auditoria |

**`OBS-R3C-01` fechado para este escopo por varredura própria:** grep em
`server/migrations/2026081*` por
`sst_matriz_epi|sst_ges_funcionarios|sst_entregas_epi|sst_membros_cipa|addConstraint|addIndex` →
**zero ocorrências em qualquer tabela `sst_*`**. As afirmações de ausência de constraint valem
contra o schema versionado inteiro, não só o baseline.

## 3. Matriz endpoint × D3 × D4 — 59/59

Legenda D3: **OK** doc×código coincidem · **DIV** divergência de valor/limite/semântica ·
**SEM-BR** regra no código sem regra documentada · **N/A-R** leitura sem regra. D4: **ATÔM** ·
**TX-PARC** transação não cobre tudo · **SEM-TX** · **IDEM-** repetição duplica efeito · **IDEM+**
guarda existe · **RO** leitura.

### 3.1 EPI — NR-6 (16)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 1 | `GET /epi-types` | `:38` | N/A-R (`SequelizeEpiRepository.ts:16-22`) | RO |
| 2 | `GET /epi-types/:id` | `:39` | N/A-R | RO |
| 3 | `POST /epi-types` | `:40` | **OK** — BR-SST-001: exige `nome`+`ca_numero`+`ca_validade`, recusa CA duplicado ativo (`CreateEpiTypeUseCase.ts:33-45`) × RF-SST-001/003 (`REQUISITOS:53,55`) | ATÔM · **IDEM-** parcial: unicidade só em app, sem UNIQUE em `sst_tipos_epi.ca` |
| 4 | `PUT /epi-types/:id` | `:41` | **DIV** — `UpdateEpiTypeUseCase.ts:26-31` não revalida nada (`T27-F08`) | ATÔM |
| 5 | `GET /epi-matrix` | `:43` | N/A-R | RO |
| 6 | `POST /epi-matrix` | `:44` | **OK/parcial** — `position` ou `department_id` (`CreateEpiMatrixUseCase.ts:27-32`) espelhando `ck_sst_matriz_epi_alvo_definido` (`baseline:13716`) | **IDEM-** — sem unicidade em app nem banco (só PK `:18186-18187`; índices `:21372,21379,21383` não únicos) (`T27-F05`) |
| 7 | `PUT /epi-matrix/:id` | `:45` | **SEM-BR** — sem revalidação do alvo | ATÔM |
| 8 | `DELETE /epi-matrix/:id` | `:46` | **OK** — hard delete deliberado (`DeleteEpiMatrixUseCase.ts:1-4`) | ATÔM · sem trilha: `epiController.ts:91-96` não chama `logAction`, tabela sem trigger (`T27-F06`b) |
| 9 | `GET /epi-deliveries` | `:48` | N/A-R | RO |
| 10 | `GET /epi-deliveries/pending-report` | `:49` | **DIV** — RF-SST-008 (`REQUISITOS:60`) × `SequelizeEpiRepository.ts:100-104` aplica `department_id` **E** `position` conjuntamente, enquanto a criação permite qualquer um; duplicatas da matriz multiplicam pendências | RO |
| 11 | `GET .../ficha/:employeeId` | `:50` | **OK** — RF-SST-007, inclui desligados (`GetEpiDeliveryFichaUseCase.ts:24-31`) | RO |
| 12 | `GET /epi-deliveries/:id` | `:51` | N/A-R | RO |
| 13 | `POST /epi-deliveries` | `:52` | **DIV** — BR-SST-001 aplicada contra `body.data_entrega` (`CreateEpiDeliveryUseCase.ts:46-50`); `quantidade` sem `>0`; sem checagem de `tipo.ativo` nem de vínculo com a MatrizEPI (`T27-F13`, `T27-F14`) | ATÔM · IDEM- |
| 14 | `PATCH .../evidence` | `:53` | **OK** — BR-SST-002 + imutabilidade (`AttachEpiDeliveryEvidenceUseCase.ts:30-38`) × `API:181,205-213` | ATÔM · IDEM+ |
| 15 | `POST .../confirm` | `:54` | **DIV** — E1/E2 corretos (`ConfirmEpiDeliveryUseCase.ts:59-64`), mas `API:225-226` manda gravar `confirmado_por` e **não existe coluna** (`SstEntregaEpi.ts:20-36`); `reference_type='sst_epi_delivery'` (`:72`) × `'EntregaEPI'` (`API:222`), congelado por teste (`sst-epi.test.ts:163`) (`T27-F06`,`F07`) | **ATÔM — melhor ponto do módulo**: transação (`:50`), `FOR UPDATE` (`SequelizeEpiRepository.ts:148,167`), rollback (`:91`), estoque na mesma `t` (`:75`) · IDEM+ duplo: guarda em app (`:54-56`) e trigger `trg_sst_lock_entrega_epi` (`baseline:22240`, função `:2977-2983`) |
| 16 | `POST .../return` | `:55` | **DIV parcial** — exige confirmada (`ReturnEpiDeliveryUseCase.ts:40-42`) mas não verifica EPI reutilizável (`API:242-243`); `condicao` texto livre | ATÔM · **IDEM-** |

### 3.2 ASO/PCMSO — NR-7 (9)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 17 | `GET /exam-plans` | `:58` | N/A-R | RO |
| 18 | `POST /exam-plans` | `:59` | **OK** — `position`/`ges_id`, `periodicidade_meses>0` (`CreateExamPlanUseCase.ts:25-30`) × `API:295`; **sem teto**, e nenhuma fonte fixa o limite superior — SEM-BR | ATÔM · IDEM- |
| 19 | `PUT /exam-plans/:id` | `:60` | **DIV** — `UpdateExamPlanUseCase.ts:21-25` não revalida `>0` (`T27-F08`) | ATÔM |
| 20 | `GET /aso/status/:employeeId` | `:62` | **DIV — dupla implementação divergente** (`GetAsoStatusUseCase.ts:22-32`): ignora `data_vencimento` e `tipo`. `REQUISITOS:78` diz "apto/**vencido**/inapto"; `API:355` omite `vencido`; código nunca produz `vencido` (`T27-F10`, `DIV-T27-02`) | RO · `logAction` (`asoController.ts:73`) |
| 21 | `GET /aso/upcoming` | `:63` | **OK** — default 30 dias (`GetUpcomingAsoUseCase.ts:20`) × `API:306` | RO |
| 22 | `GET /aso` | `:64` | N/A-R | RO |
| 23 | `GET /aso/:id` | `:65` | N/A-R | RO · `logAction` (`:82`) |
| 24 | `POST /aso` | `:66` | **DIV** — `CreateAsoUseCase.ts:63` passa `null` como GES (ramo morto vs RF-SST-011/016); `SequelizeAsoRepository.ts:35-43` usa `findOne` sem `order` ⇒ periodicidade/vencimento **não determinísticos** (`T27-F11`); RF-SST-018 declarado não implementado (`:11-14`) × `API:327-331` | **TX-PARC — transação decorativa**: `:72` abre, `:74` grava o ASO **fora** dela (`SequelizeAsoRepository.ts:70-72`), `:92` grava o evento dentro (`T27-F04`) |
| 25 | `POST /aso/:id/complementary-exams` | `:67` | **OK** — RF-SST-013 (`CreateComplementaryExamUseCase.ts:29-33`) | ATÔM · IDEM- |

### 3.3 CIPA — NR-5 (12)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 26 | `GET /cipa/dimensioning` | `:87` | **SEM-BR declarado** — 7 faixas por headcount (`GetDimensioningUseCase.ts:20-28`), simplificação declarada (`:8-10,:48`); sem consumidor (`T27-F16`) | RO |
| 27-28 | `GET /cipa/mandates`, `/:id` | `:88-89` | N/A-R | RO |
| 29 | `POST /cipa/mandates` | `:90` | **DIV** — RF-SST-030 exige paridade; `CreateMandateUseCase.ts:27-33` aceita qualquer combinação | ATÔM · IDEM- |
| 30 | `POST /cipa/mandates/:id/members` | `:91` | **DIV/OK misto** — BR-SST-021 com valor correto (`AddMemberUseCase.ts:19,57`) × `REQUISITOS:97`; **`estabilidade_inicio` nunca gravado** (`CipaMapper.ts:72`) contra RF-SST-031 e `baseline:13834` (`T27-F15`) | ATÔM · **IDEM+** por `uq_sst_membros_cipa_par` (`baseline:22107`), não pela app |
| 31 | `POST /cipa/members/:id/take-office` | `:92` | **DIV — ver `T27-F01`**: `findValidCipaTraining` (`SequelizeCipaRepository.ts:69-71`) não filtra `validade` | ATÔM · **IDEM-** — posse repetida sobrescreve `posse_confirmada_em` |
| 32 | `POST /cipa/electoral-processes` | `:93` | **OK/raso** (`OpenElectoralProcessUseCase.ts:30-32`) | ATÔM · IDEM- |
| 33 | `.../candidates` | `:94` | **OK** — BR-SST-021 + processo encerrado (`AddCandidateUseCase.ts:47-54`) × `API:527`; exceção **declarada** no cabeçalho (`:5-12`) | ATÔM · **IDEM+** (`uq_sst_candidatos_cipa_par`, `:22079`) |
| 34 | `.../:id/close` | `:95` | **DIV** — resultados de não-candidatos descartados em silêncio (`CloseElectoralProcessUseCase.ts:47-48`); `total_votantes` cai para `candidatos.length` (`:53`); eleitos não viram membros | **SEM-TX** — N updates + 1, repositório aceita `transaction` (`SequelizeCipaRepository.ts:102,84`) e não recebe (`T27-F03`) · IDEM+ (`:39`) |
| 35 | `GET /cipa/meetings` | `:96` | N/A-R | RO |
| 36 | `POST /cipa/meetings` | `:97` | **OK** — BR-SST-023 (`CreateMeetingUseCase.ts:38-40`) × `REQUISITOS:99`, com teste real (`sst-cipa.test.ts:152`) | **SEM-TX** (`:45-59`) (`T27-F03`) |
| 37 | `GET /cipa/stability/:employeeId` | `:98` | **OK com ressalva** — `estavel = estabilidade_fim >= hoje` (`CipaMapper.ts:145`); início desconhecido (item 30) | RO · sem `logAction` |

### 3.4 PGR/GES — NR-1 (6)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 38 | `GET /risks` | `:101` | N/A-R | RO |
| 39 | `POST /risks` | `:102` | **OK — melhor coerência app×banco**: BR-SST-026 no use case (`CreateRiskUseCase.ts:37-43`) espelhando o CHECK (`baseline:14305`), com teste (`sst-pgr.test.ts:43`) | ATÔM · IDEM- |
| 40 | `PUT /risks/:id` | `:103` | **DIV** — `UpdateRiskUseCase.ts:27-31` não repete a coerência (`T27-F08`); RF-SST-038 sem implementação | ATÔM |
| 41 | `GET /ges` | `:104` | N/A-R | RO |
| 42 | `POST /ges` | `:105` | N/A-R (`CreateGesUseCase.ts:26`) | ATÔM · IDEM- |
| 43 | `POST /ges/:id/members` | `:106` | **OK de efeito, DIV de guarda** — S-2240 gerado (`AddGesMemberUseCase.ts:45-50`); nada impede repetição | **SEM-TX + IDEM- com efeito legal** (`:39-50`); `sst_ges_funcionarios` só PK (`baseline:18130-18131`), índices `:21323,21330` não únicos; `uq_sst_eventos_esocial_origem_ativo` (`:22093`) não protege pois `origem_id` muda (`T27-F05`) |

### 3.5 Treinamentos (6)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 44 | `GET /training-matrix` | `:115` | N/A-R | RO |
| 45 | `POST /training-matrix` | `:116` | **OK** — unicidade `(position,norma)` (`CreateTrainingMatrixUseCase.ts:30-31`) | ATÔM · **IDEM+** (`uq_sst_matriz_treinamento_par`, `baseline:22100`) |
| 46 | `PUT /training-matrix/:id` | `:117` | SEM-BR | ATÔM |
| 47 | `GET /trainings/blocklist` | `:118` | **DIV — ver `T27-F02`**: `SequelizeTrainingRepository.ts:78` — `validade = null` nunca vence | RO |
| 48 | `GET /trainings` | `:119` | N/A-R — filtro `vencido=true` herda o mesmo ponto cego (`:50`) | RO |
| 49 | `POST /trainings` | `:120` | **OK no valor auditável** — RF-SST-045 "bienal para NR-10" × 24 meses (`CreateTrainingUseCase.ts:57-59`) × teste (`sst-training.test.ts:57-61`) | ATÔM · IDEM- |

### 3.6 Rotina preventiva — inspeção, brigada, DDS (7; PT fora de escopo)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 50 | `GET /inspections` | `:123` | **DIV de paginação** — `tem_nc` filtra depois da página e falseia o `count` (`SequelizeSafetyRoutineRepository.ts:23-27`) (`T27-F18`) | RO |
| 51 | `POST /inspections` | `:124` | **OK de regra, SEM-BR de valor** — BR-SST-033 cumprida (`CreateInspectionUseCase.ts:58-69`) × `API:702,726-729` × `baseline:13526`; prazos `1`/`15` (`:16-17`) sem fonte; RF-SST-049 sem mecanismo (`T27-F17`) | **SEM-TX — pior caso**: 1+N+N escritas em 3 tabelas (`:48-78`), repositório aceita `transaction` (`SequelizeSafetyRoutineRepository.ts:36,41,46`) e nunca recebe ⇒ ação corretiva órfã (`T27-F03`) |
| 52 | `GET /brigade` | `:128` | **DIV** — efetivo contado sobre a página (`ListBrigadeUseCase.ts:32-35`, limit default `:29`); mínimo `4` placeholder (`:18`) (`T27-F09`) | RO |
| 53 | `POST /brigade` | `:129` | N/A-R (`CreateBrigadeMemberUseCase.ts:26-32`) | ATÔM · IDEM- |
| 54 | `PUT /brigade/:id` | `:130` | **OK** — campo a campo (`UpdateBrigadeMemberUseCase.ts:30-32`) | ATÔM |
| 55 | `GET /dds` | `:131` | N/A-R | RO |
| 56 | `POST /dds` | `:132` | N/A-R (`CreateDdsUseCase.ts:33-35`) | **SEM-TX** (`:36-43`) · IDEM+ parcial (`uq_sst_dds_presencas_par`, `:22086`) |

### 3.7 Ações corretivas (3)

| # | Endpoint | Rota | D3 | D4 |
|---|---|---|---|---|
| 57 | `GET /corrective-actions` | `:135` | N/A-R — `atrasada` derivado, conforme `API:756-758` | RO |
| 58 | `POST /corrective-actions` | `:136` | **OK** — origens em enum (`CreateCorrectiveActionUseCase.ts:14,35`) × `API:748` | ATÔM · IDEM- |
| 59 | `PUT /corrective-actions/:id` | `:137` | **DIV/SEM-BR** — conclusão sem evidência, sem máquina de estados, `concluida_em` reescrito (`UpdateCorrectiveActionUseCase.ts:34-46`) (`T27-F12`) | ATÔM · **IDEM-** |

## 4. Findings — todos `PROPOSED`

### HIGH

**`T27-F01` — BR-SST-024: o gate de posse na CIPA verifica existência, nunca validade; o método
se chama `findValidCipaTraining`.** Confiança: **CONFIRMED**.

- Documentado: RF-SST-033 P0 — "sem TreinamentoSST de CIPA registrado **e válido**"
  (`BLOCO_1_SST_REQUISITOS.md:100`); `BLOCO_1_SST_API.md:525,552`.
- Implementado: `TakeOfficeUseCase.ts:33-36` bloqueia se `findValidCipaTraining` = `null`;
  `SequelizeCipaRepository.ts:69-71` =
  `findOne({ where: { employee_id, norma: 'CIPA' }, order: [['data_realizacao','DESC']] })` —
  **nenhum predicado sobre `validade`**.
- Capacidade existe no mesmo módulo e não foi usada: `SequelizeTrainingRepository.ts:78` e `:50`
  comparam `validade` com hoje.
- **Padrão FIND-ERP-008 (defeito coberto por teste que o valida):** `sst-cipa.test.ts:36` mocka
  `findValidCipaTraining` → `{id:900}`; `:106-109` só troca o mock por `null`. Nenhum teste em
  `server/tests/` instancia `SequelizeCipaRepository`. A suíte declara cobrir BR-SST-024 e é
  estruturalmente incapaz de detectar o defeito.
- Severidade HIGH: requisito P0, gate que falha exatamente no caso para o qual existe, registro
  resultante é probatório perante fiscalização NR-5. **Calibração para o validator:** `T12-M07`
  (classe próxima) é MEDIUM; se preferir uniformidade, o rebaixamento é defensável mas deve ser
  decidido e registrado, não herdado por omissão.

**`T27-F02` — RF-SST-046: a lista de bloqueio operacional é cega para treinamento sem validade, e
o único teste é passthrough de mock.** Confiança: **CONFIRMED**.

- Documentado: RF-SST-046 P0 (`REQUISITOS:123`), consumo pelo Apontamento (RNF-SST-06,
  `GetTrainingBlocklistUseCase.ts:4-5`).
- Implementado: `SequelizeTrainingRepository.ts:78` —
  `vencido = !treinamento || (treinamento.validade && treinamento.validade < hoje)`; com
  `validade = null` nunca vence.
- Não é caso raro: `CreateTrainingUseCase.ts:50-59` só calcula validade se a matriz tem
  periodicidade ou a norma é NR-10, e `CreateTrainingMatrixUseCase.ts:28-31` **não exige**
  periodicidade.
- Teste: `sst-training.test.ts:79-88` mocka `findBlocklist` e assere o próprio mock; o use case é
  passthrough (`:21-23`). Zero linhas da regra exercitadas.
- **Limite declarado:** varredura de `server/src` por `blocklist|findBlocklist` — só rota,
  controller, interface e implementação; **nenhum consumidor do Apontamento localizado no
  `AUDIT_COMMIT`**. Hoje o efeito é relatório falso; quando o consumo existir, vira bloqueio que
  não bloqueia.

### MEDIUM

**`T27-F03` — escrita multi-tabela sem transação em 4 use cases cujos repositórios já aceitam
`transaction`.** CONFIRMED.

| Use case | Escritas | Repositório aceita | Recebe |
|---|---|---|---|
| `CreateInspectionUseCase.ts:48-78` | 3 tabelas (1+N+N) | `SequelizeSafetyRoutineRepository.ts:36,41,46` | não |
| `CreateMeetingUseCase.ts:45-59` | reunião + N ações | `SequelizeCipaRepository.ts:125,130` | não |
| `CreateDdsUseCase.ts:36-43` | registro + presenças | `SequelizeSafetyRoutineRepository.ts:126,131` | não |
| `CloseElectoralProcessUseCase.ts:49-56` | N candidatos + processo | `SequelizeCipaRepository.ts:102,84` | não |

`CreateWorkPermitUseCase.ts:45-53` tem o mesmo desenho (cluster PT de T-12 — corroboração, não
achado novo). **Determinação pedida (código, banco ou lugar nenhum): lugar nenhum.** Os únicos
mecanismos de banco em `sst` são 4 triggers (`baseline:22219,22226,22233,22240`) e nenhuma dessas
tabelas está entre eles. Contraste interno que prova viabilidade:
`ConfirmEpiDeliveryUseCase.ts:50,75,86,91`.

**`T27-F04` — `POST /aso`: a transação existe, é anunciada no contrato e não cobre a escrita
principal.** CONFIRMED. `CreateAsoUseCase.ts:72` abre; `:74` grava o ASO fora
(`SequelizeAsoRepository.ts:70-72` não tem parâmetro de transação); `:87-92` grava o S-2220
dentro; `:97` faz rollback do que já foi commitado. Cabeçalho do arquivo (`:4-8`) e `API:323-326`
prometem os efeitos como um só. Falha no enfileiramento ⇒ ASO sem evento eSocial
(RF-SST-041/BR-SST-029), no módulo em que `T12-H02` já mostrou que a fila nunca sai de
`pendente`.

**`T27-F05` — `POST /ges/:id/members` e `POST /epi-matrix` sem idempotência em app nem no banco;
no GES cada repetição gera novo evento eSocial.** CONFIRMED. `AddGesMemberUseCase.ts:39-50` sem
transação e sem checagem; `sst_ges_funcionarios` só PK (`baseline:18130-18131`);
`uq_sst_eventos_esocial_origem_ativo` (`:22093`) não dedupe porque `origem_id` é o vínculo novo.
`CreateEpiMatrixUseCase.ts:36` idem para `sst_matriz_epi` (`:18186-18187`), inflando o relatório
RF-SST-008.

**`T27-F06` — confirmação de entrega de EPI: ato `approve`, irreversível por trigger, sem autor
gravado e sem log.** CONFIRMED.

- `API:225-226` promete `confirmado_por = req.user.id`.
- `SstEntregaEpi.ts:20-36,38-62` **não tem a coluna**; `ConfirmEpiDeliveryUseCase.ts:80-84` grava
  só `confirmada`/`confirmada_em`/`inventory_movement_id`; `confirmedBy` vira `userId` do
  movimento (`:74`) e **apenas se** o TipoEPI tem `item_id` (`:67`).
- `grep logAction` em `server/src/modules/sst` → só `asoController.ts:73,82` e
  `accidentController.ts:39`. **`epiController.ts` não loga nenhuma das 8 rotas**, incluindo
  `confirm` (`:147-152`) e `DELETE /epi-matrix` (`:91-96`).
- A Ficha de EPI é peça probatória (RF-SST-055, `REQUISITOS:142`) e a linha vira imutável
  (`baseline:22240`). Registro imutável, de alçada `approve`, sem autor, não sustenta a prova
  para a qual existe.

**`T27-F07` — `reference_type` diverge do contrato e o teste congela o valor divergente.**
CONFIRMED. `API:222` = `'EntregaEPI'` × `ConfirmEpiDeliveryUseCase.ts:72` =
`'sst_epi_delivery'` × `sst-epi.test.ts:163` assere o valor divergente. Segunda ocorrência do
padrão de `FIND-ERP-008` nesta trilha. MEDIUM (não LOW) porque, dado `T27-F06`, essa é hoje a
**única** correlação persistida entre a confirmação e seu autor.

**`T27-F08` — mesma regra validada na criação e ausente na atualização (4 pares).** CONFIRMED.

| Regra | Implementada | Ausente |
|---|---|---|
| BR-SST-001 (CA obrigatório/único ativo) | `CreateEpiTypeUseCase.ts:33-45` | `UpdateEpiTypeUseCase.ts:26-31` |
| BR-SST-026 (coerência ausência de risco) | `CreateRiskUseCase.ts:37-43` | `UpdateRiskUseCase.ts:27-31` |
| `periodicidade_meses > 0` | `CreateExamPlanUseCase.ts:28-30` | `UpdateExamPlanUseCase.ts:21-25` |
| Alvo definido da matriz | `CreateEpiMatrixUseCase.ts:27-29` | `UpdateEpiMatrixUseCase.ts:25-28` |

Compensação assimétrica: BR-SST-026 e o alvo da matriz têm CHECK (`baseline:14305`, `:13716`) — o
dado não corrompe, mas o erro deixa de ser o 400 amigável prometido. **BR-SST-001 não tem
compensação**: sem UNIQUE em `sst_tipos_epi.ca`, o `PUT` cria o duplicado que o `POST` recusa.

**`T27-F09` — RF-SST-052: "efetivo ativo" contado sobre a página.** CONFIRMED.
`ListBrigadeUseCase.ts:32-35` filtra `rows` já paginadas (limit default `'20'`, `:29`, controlado
pelo cliente). Com `?limit=1` o efetivo é 1; com `?active=false`, 0. Mínimo = constante `4`
(`:18`), placeholder sem fonte normativa com valor.

**`T27-F10` — "funcionário tem ASO válido" tem duas implementações divergentes, e a
rastreabilidade do contrato aponta para a errada.** CONFIRMED.

- A (SST): `GetAsoStatusUseCase.ts:22-32` + `SequelizeAsoRepository.ts:65-67` — mais recente por
  `data_realizacao`, sem validade e sem tipo. Um demissional `apto` de 2019 devolve `apto` hoje.
- B (RH, lido só como contraparte): `asoGate.ts:20-27` → `findValidAso(employeeId, docType,
  today)` — tipo e validade sobre snapshot documental.
- **`DIV-T27-02`:** `REQUISITOS:78` inclui `vencido` no domínio de RF-SST-021; `API:355` não. Dois
  artefatos oficiais incompatíveis; o código segue o segundo.
- `API:777` atribui **RF-SST-014/015** (dois bloqueios P0) ao endpoint SST, que não avalia validade
  e que os gates de RH não consomem (uso apenas informativo:
  `RequestTerminationAsoUseCase.ts:38-40`, `RequestAdmissionAsoUseCase.ts:5`).
- A escolha de qual versão é a certa não é decidida aqui (Regras 20/21). Teste:
  `sst-aso.test.ts:97-121` não cobre vencimento no passado.

**`T27-F11` — BR-SST-011: plano de exames escolhido arbitrariamente; ramo GES morto.** CONFIRMED.
`CreateAsoUseCase.ts:63` passa `null` como GES; `SequelizeAsoRepository.ts:35-43` usa `findOne`
sem `order` ⇒ com dois planos aplicáveis, `periodicidade_meses` — e portanto o prazo do próximo
ASO — é não determinística. `sst-aso.test.ts:47` mocka plano único; a ambiguidade não é
exercitável.

**`T27-F12` — ação corretiva conclui sem evidência, sem máquina de estados, e a regra não existe
em artefato (RA-08).** CONFIRMED quanto ao código; **lacuna declarada** quanto à fonte.
`UpdateCorrectiveActionUseCase.ts:34-46`. Percorridos `API:733-758` e `REQUISITOS:130-131`: não há
regra documentada exigindo evidência. **A regra não é inventada (Regra 6)**; registra-se que a
ação corretiva é o desfecho obrigatório de toda NC (BR-SST-033) e de todo acidente grave
(BR-SST-018, `API:443-446`) e que seu encerramento não tem requisito de prova nem dono
documental. **Escala ao director (Regra 21).**

### LOW

| ID | Achado | Âncoras |
|---|---|---|
| `T27-F13` | BR-SST-001 aplicada contra `body.data_entrega`, não contra a data corrente: entrega retroativa aceita CA vencido; `quantidade` sem `>0`. Mitigado (não eliminado) pela revalidação E1 | `CreateEpiDeliveryUseCase.ts:46-50,52-57` × `ConfirmEpiDeliveryUseCase.ts:59-61` × `API:202-203` |
| `T27-F14` | Nenhuma checagem de vínculo entrega↔MatrizEPI nem de `tipo.ativo`. **Não há regra documentada exigindo o vínculo** — registra-se a ausência (RA-08), não a violação | `CreateEpiDeliveryUseCase.ts:43-50` × RF-SST-002 (`REQUISITOS:54`) |
| `T27-F15` | BR-SST-022: `estabilidade_inicio` nunca produzido pelo sistema; só entra pelo body | `AddMemberUseCase.ts:62-65`, `CipaMapper.ts:57,72`, `AddCandidateUseCase.ts:56-59` × `REQUISITOS:98` × `baseline:13834` |
| `T27-F16` | Paridade/dimensionamento da CIPA nunca confrontados com a composição real | `CreateMandateUseCase.ts:27-33`, `AddMemberUseCase.ts:46-67`, `GetDimensioningUseCase.ts:38-49` |
| `T27-F17` | Constantes sem BR-ID: `PRAZO_URGENTE_DIAS=1`/`PRAZO_PADRAO_DIAS=15` (não declaradas em lugar nenhum), `MINIMO_CONFIGURADO_PLACEHOLDER=4`, faixas da CIPA (essas duas **declaradas** como simplificação) | `CreateInspectionUseCase.ts:16-17`; `ListBrigadeUseCase.ts:18`; `GetDimensioningUseCase.ts:20-28,48` |
| `T27-F18` | `GET /inspections?tem_nc=true` filtra depois da página e falseia o `count` | `SequelizeSafetyRoutineRepository.ts:23-27` |

### INFO

**`T27-F19` — rastreabilidade: 0 dos 59 endpoints do escopo tem regra no catálogo oficial da
auditoria.** `BR_CATALOG.md:73` cataloga **3** regras SST; `:300-302` mostra que as três
(`BR-SST-D14/D15/D16`) são do cluster acidente/CAT, **fora deste escopo**.
`BLOCO_1_SST_REQUISITOS.md:6` declara 36 BR-SST, e o código deste escopo cita nominalmente
BR-SST-001, 002, 004, 006, 011, 021, 022, 023, 024, 026, 028, 029. Confirma e quantifica
`T12-M09`: **zero regras catalogadas para 59 endpoints**.

**`T27-F20` — cobertura de teste por regra crítica, medida.** Todas as suítes lidas mockam
repositório.

| Regra crítica | Teste? | Qualidade |
|---|---|---|
| BR-SST-001 (CA vencido) | sim | real (`sst-epi.test.ts:90`) |
| BR-SST-002 (evidência) | sim | real (`:188`) |
| Idempotência negativa do confirm | sim | real (`:168`) |
| BR-SST-011 (plano aplicável) | sim | parcial — plano único no mock (`T27-F11`) |
| BR-SST-021 (2 mandatos) | sim | aparente — `countConsecutiveElectedTerms` é mock |
| BR-SST-023 (ata) | sim | real (`sst-cipa.test.ts:152`) |
| **BR-SST-024 (treinamento válido)** | nominalmente | **falso** (`T27-F01`) |
| **RF-SST-046 (blocklist)** | nominalmente | **falso** (`T27-F02`) |
| BR-SST-026 | sim | real (`sst-pgr.test.ts:43`) |
| NR-10 bienal (24 meses) | sim | real (`sst-training.test.ts:57`) |
| RF-SST-052 (efetivo brigada) | **não** | — |
| RF-SST-008 (pendência EPI) | **não** | — |
| Conclusão de ação corretiva | não medido (suíte existe, não lida — §6) | — |
| Atomicidade de escrita multi-tabela | **não** | nenhum teste de transação em `sst` |

**Fato estrutural: nenhum teste do módulo `sst` instancia uma implementação Sequelize.** As duas
regras que vivem dentro do repositório (`findValidCipaTraining`, `findBlocklist`) são invisíveis à
suíte por construção.

## 5. Conformidades registradas (registro simétrico)

- `ConfirmEpiDeliveryUseCase` é o padrão correto do repositório inteiro (transação, `FOR UPDATE`,
  rollback, serviço externo na mesma `t`, guarda em app **e** trigger) — referência interna para
  tudo o que `T27-F03` aponta.
- BR-SST-026 é o melhor caso de coerência app×banco: use case + CHECK + teste.
- NR-10/24 meses: documentado × implementado × testado — **único caso do escopo com o tripé
  completo**.
- Simplificações **declaradas** (dimensionamento CIPA, mínimo de brigada) trazem
  `[VERIFICAR COM TÉCNICO SST DA EMPRESA]` no código e na resposta.
- `AddCandidateUseCase.ts:5-12` declara no artefato versionado a regra extra que criou — oposto do
  anti-padrão "regra que só existe na conversa".
- UNIQUEs de par existem onde alguém pensou neles (`baseline:22079,22086,22100,22107,22114`); a
  ausência em `sst_matriz_epi` e `sst_ges_funcionarios` é lacuna, não escolha — o contraste
  interno prova.

## 6. Cobertura alcançada — sem arredondar para cima

| Dimensão | Prometido (C-05/C-06, parte não coberta por T-12) | Executado |
|---|---|---|
| **D3** | E sobre 59 | **E 59/59** com âncora dos dois lados quando o lado documental existe |
| **D4** | E sobre 59 | **E 59/59** determinado em três camadas (use case, repositório, schema versionado) |

Base de leitura: router integral; 9/9 controllers; 56 use cases; 6 repositórios Sequelize
integrais; 4 mappers; `SstEntregaEpi.ts`; seções pertinentes de `BLOCO_1_SST_API.md` e
`BLOCO_1_SST_REQUISITOS.md`; baseline nas faixas citadas; `BR_CATALOG.md`; 5 suítes; varredura
própria das 9 migrations pós-freeze.

**O que NÃO foi feito, nominalmente:**

1. 16 endpoints dos clusters-âncora não reauditados — por desenho do mandato; seguem sob as
   condições declaradas por T-12.
2. `sst-corrective-action.test.ts` (deste escopo) **não lido** — lacuna do agente, marcada como não
   medida em `T27-F20`, não como ausente. `sst-esocial`, `sst-accident`, `sst-rbac` são dos
   clusters-âncora.
3. D1, D2, D5–D10 não são mandato desta trilha. Fatos de D6 (ausência de `logAction` em
   `epiController`) entraram como evidência de `T27-F06`, não como cobertura de dimensão.
4. Zero evidência dinâmica. Provas de ausência de código são melhor demonstradas assim, mas o
   efeito observado não está provado.
5. **`client/` não foi lido.** Não se sabe se a UI torna algum caminho defeituoso o único
   possível, como em `FIND-ERP-008`. **Recomendada essa verificação para `T27-F01` e `T27-F10`.**

**Estado: `EXECUTADA — D3/D4 = E 59/59 no escopo declarado`.** Somada a T-12, a metade `sst` de
`DEF-02` passa de `A(~10/75)` para **75/75 com veredito individual** (16 sob condições de T-12, 59
sob as desta trilha). **A metade `rh` (57 endpoints) é objeto de trilha própria.**

## 7. Divergências registradas (Regra 20)

| ID | Divergência | Partes | Encaminhamento |
|---|---|---|---|
| `DIV-T27-00` | nenhuma no inventário: 75 = 75 | plano × contagem própria | registro de conferência |
| `DIV-T27-02` | `vencido` no domínio de RF-SST-021: `REQUISITOS:78` sim, `API:355` não | dois artefatos oficiais | **escala ao director** |
| `DIV-T27-03` | `reference_type` `'EntregaEPI'` × `'sst_epi_delivery'`, congelado por teste | contrato × código × teste | `T27-F07` → finding-validator |
| `DIV-T27-04` | `API:225-226` promete `confirmado_por`; modelo não tem coluna | contrato × modelo | `T27-F06` |
| `DIV-T27-05` | `API:777` atribui RF-SST-014/015 a endpoint que não implementa validade | contrato × código | `T27-F10` → traceability |
| `DIV-T27-06` | 36 BR-SST no bloco de negócio × 3 no `BR_CATALOG.md` | dois catálogos | `T27-F19` → T-14 |

## 8. Encaminhamentos

- **`T27-F01` e `T27-F02` (HIGH) → `vericore-finding-validator`** antes de qualquer remediação
  (Regra 22).
- **Ao `vericore-traceability-auditor`:** `DIV-T27-05`, `T27-F19`, RF-SST-018 e RF-SST-038 sem
  implementação, RF-SST-009 sem endpoint (o próprio contrato admite, `API:772`).
- **Ao `vericore-business-process-auditor`:** a apuração eleitoral da CIPA não produz membros
  (item 34) — vão de processo entre `close` e `members`.
- **Ao `vericore-software-audit-director` (Regra 21):** `DIV-T27-02` e `T27-F12` — nenhuma se
  resolve por auditoria.
- **Pedidos DYN** (banco sintético, G4 pendente): `DYN-T27-01` posse com treinamento CIPA vencido
  (200 ⇒ F01 confirmado); `-02` NR-11 com `validade NULL` ausente da blocklist (⇒ F02); `-03`
  `POST /ges/:id/members` duplicado gerando 2 eventos (⇒ F05); `-04` falha no 2º item do checklist
  deixando ação órfã (⇒ F03); `-05` ASO vencido devolvendo `apto` (⇒ F10); `-06` entrega
  retroativa com CA vencido (⇒ F13); `-07` conclusão sem evidência e volta a `aberta` (⇒ F12);
  `-08` `PUT /epi-types/:id` com CA duplicado (⇒ F08).

**Persistência:** nenhum arquivo do objeto auditado foi tocado (Regra 2); nenhuma regra ou
requisito inventado (Regra 6); nenhum finding confirmado ou fechado (Regras 3, 4, 22).
