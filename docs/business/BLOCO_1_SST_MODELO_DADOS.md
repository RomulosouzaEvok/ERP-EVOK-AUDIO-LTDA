# BLOCO 1 — Módulo SST (Segurança e Saúde do Trabalho) — Modelo de Dados

**Departamento:** 15 — Segurança do Trabalho (SST).
**Insumos:** `docs/business/briefs/BRIEF_SST_2026-08-06.md` (domínio, 23
entidades, 36 BR-SST) e `docs/business/BLOCO_1_SST_REQUISITOS.md` (55
RF-SST, UC-44 a UC-48, §5 "Decisões e pendências para arquitetos").
**Autor:** `AdmDBA`.
**Data:** 2026-08-06.
**Status:** 🟢 `[IMPLEMENTADO]` — **migrations APLICADAS e no baseline
congelado** (`server/database/postgresql/00_baseline_frozen.sql`). Medido em
2026-08-12: **35 tabelas `sst_*`** no banco `erp_evok_audio` (e idênticas em
`erp_evok_audio_test`, guarda `cross-database-drift-guard`). Os models
Sequelize (`server/src/models/Sst*.ts`) e o módulo
`server/src/modules/sst/` existem desde 2026-08-07.

> **Status original deste documento (2026-08-06), mantido como histórico:**
> "🟡 Migrations criadas, **não aplicadas** (aguardando aprovação do dono do
> produto após revisão do `AuditorIntegrador`, convenção do projeto)". Essa
> nota ficou obsoleta e induzia a erro — corrigida pela auditoria documental
> de 2026-08-11/12. O restante do documento (modelagem, decisões, matriz
> RF→tabela) continua válido.

Trabalho coordenado com `ArquitetoSoftwareAPI`, que desenha o contrato REST
em paralelo (`docs/business/BLOCO_1_SST_API.md`). Ver §6 "Pendências para
o ArquitetoSoftwareAPI" ao final deste documento.

---

## 0. Nota de nomenclatura (decisão deliberada, delegada pelo brief)

O brief declara explicitamente: *"Nomes em português para o domínio;
nomenclatura técnica fica a cargo de AdmDBA"* (BRIEF_SST §b). A maioria das
tabelas mais recentes do projeto usa nomes de coluna em inglês (ex.:
`non_conformities.severity`, `rfqs.status`); este bloco usa
**tabelas e colunas em português** (prefixo `sst_`) por dois motivos:

1. As 36 regras BR-SST e os 5 casos de uso citam os termos de negócio em
   português diretamente ligados ao texto legal das NRs/CLT/eSocial (ASO,
   CAT, CIPA, GES, PGR) — manter o nome da coluna igual ao nome da entidade
   do brief reduz o risco de tradução equivocada em auditoria trabalhista.
2. É uma decisão pontual e documentada, não um novo padrão geral do
   projeto (mesmo espírito de "exceção documentada" usado para outras
   decisões de schema, CLAUDE.md §7).

**Atenção `ArquitetoSoftwareAPI`/`programador`:** os nomes de coluna do
banco (`ca`, `ativo`, `tamanhos_variacoes` como string) podem não bater
1:1 com os nomes de campo já esboçados em `docs/business/BLOCO_1_SST_API.md`
(`ca_numero`, `active`, `tamanhos` como array) — a camada de
repositório/DTO deve fazer a tradução. **Correção de expectativa feita na
auditoria cruzada (`AuditorIntegrador`, 2026-08-06):** isso NÃO é "como em
qualquer módulo Clean Architecture do projeto" — verificado em
`server/src/modules/nonConformities/infrastructure/sequelize/SequelizeNonConformitiesRepository.ts`
e no model `NonConformity.ts` (módulo maduro de referência citado pelo
próprio `ArquitetoSoftwareAPI`): os repositórios existentes retornam a
instância Sequelize **sem nenhum mapeamento de nome de campo** — coluna do
banco e campo do JSON de resposta são literalmente a mesma string
(`severity`, `status`, ambos em inglês, sem tradução). SST é o **primeiro
módulo do projeto que exige um mapper DTO explícito** entre nomes de banco
(PT-BR) e nomes de API (inglês) — isso é esforço de engenharia novo, não
reuso de um padrão existente, e deve ser dimensionado como tal no handoff
ao `programador` (recomenda-se um `EpiTypeMapper`/`AsoMapper`/etc. dedicado
por recurso, não uma função genérica "camelCase↔snake_case", já que também
há tradução de idioma, não só de convenção de caixa). Ver §6.

---

## 1. Cluster EPI (NR-6) — UC-44

### 1.1 `sst_tipos_epi` — migration `20260806-000130`

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | INTEGER PK | autoincrement | |
| nome | VARCHAR(150) | NOT NULL | Nome comercial do EPI |
| descricao | TEXT | NULL | |
| ca | VARCHAR(20) | NOT NULL, CHECK `btrim(ca) <> ''` | Certificado de Aprovação (CAEPI/MTE) — BR-SST-001 |
| ca_validade | DATE | NOT NULL | Validade do CA (MTE) — distinta da vida útil |
| fabricante | VARCHAR(150) | NULL | |
| vida_util_dias | INTEGER | NOT NULL, default 0 | Periodicidade de troca — BR-SST-004 |
| tamanhos_variacoes | VARCHAR(255) | NULL | Lista livre (P/M/G) — sem tabela normalizada, baixo volume |
| foto_url | VARCHAR(255) | NULL | |
| ativo | BOOLEAN | NOT NULL, default true | |
| item_id | UUID | NULL, **UNIQUE**, FK → `items.id` ON DELETE RESTRICT | Vínculo opcional 1:1 com o almoxarifado |
| created_by | INTEGER | NOT NULL, FK → `users.id` ON DELETE RESTRICT | |
| created_at/updated_at | TIMESTAMP | NOT NULL | |

**FK `item_id` → RESTRICT:** não é possível excluir um `Item` de estoque
enquanto um TipoEPI ativo apontar para ele (evitaria órfão de custo/entrega
histórica). `UNIQUE` garante o 1:1 (um Item nunca é 2 TipoEPI diferentes).

### 1.2 `sst_matriz_epi` — migration `20260806-000130`

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | INTEGER PK | | |
| department_id | INTEGER | NULL, FK → `departments.id` **ON DELETE CASCADE** | Setor alvo |
| position | VARCHAR(100) | NULL | Função (`employees.position`, texto livre) |
| tipo_epi_id | INTEGER | NOT NULL, FK → `sst_tipos_epi.id` ON DELETE RESTRICT | |
| quantidade_padrao | DECIMAL(18,6) | NOT NULL, default 1 | |
| observacao | TEXT | NULL | |
| ativo | BOOLEAN | NOT NULL, default true | |
| CHECK | — | `department_id IS NOT NULL OR position IS NOT NULL` | Um dos dois alvos é obrigatório |

**Por que `department_id` é CASCADE (única exceção do bloco ao padrão
RESTRICT):** a matriz é uma regra de PLANEJAMENTO ("este setor exige este
EPI"), não um registro histórico/probatório — se o setor deixa de existir
no organograma, a exigência associada perde sentido por si só. Contraste
com `sst_riscos_ocupacionais.department_id`, que é RESTRICT (é avaliação
histórica do PGR, não pode desaparecer com uma reorganização).

### 1.3 `sst_entregas_epi` + `sst_devolucoes_epi` + `sst_estornos_entrega_epi` — migration `20260806-000131`

| Tabela | Colunas-chave | FK | Observação |
|---|---|---|---|
| `sst_entregas_epi` | employee_id, tipo_epi_id, quantidade (CHECK > 0), data_entrega, motivo (ENUM), data_prevista_troca, evidencia_tipo/arquivo_url, **confirmada** (bool), confirmada_em, inventory_movement_id, entregue_por | `employee_id`→employees RESTRICT · `tipo_epi_id`→sst_tipos_epi RESTRICT · `inventory_movement_id`→inventory_movements RESTRICT (nullable) · `entregue_por`→users RESTRICT | Ver §4 (imutabilidade) |
| `sst_devolucoes_epi` | entrega_epi_id, data_devolucao, condicao, registrado_por | `entrega_epi_id`→sst_entregas_epi RESTRICT · `registrado_por`→users RESTRICT | Insert-only |
| `sst_estornos_entrega_epi` | entrega_epi_id, motivo, estornado_por | `entrega_epi_id`→sst_entregas_epi RESTRICT · `estornado_por`→users RESTRICT | Insert-only, correção de entrega confirmada |

**Integração com estoque:** o ENUM `enum_inventory_movements_reference_type`
ganhou o valor `'sst_epi_delivery'` (mesma migration) para que a
movimentação de saída gerada na confirmação referencie a origem SST sem
sobrecarregar o valor genérico `'adjustment'`. Nenhuma tabela paralela de
saldo de EPI foi criada — reaproveita 100% `inventory_movements`/`items`
(decisão §5.2 do documento de requisitos).

---

## 2. `sst_acoes_corretivas` (genérica, reusada por 4 origens) — migration `20260806-000132`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | INTEGER PK | |
| origem_tipo | ENUM(`investigacao_acidente`,`reuniao_cipa`,`inspecao_seguranca`,`pgr`) | NOT NULL |
| origem_id | INTEGER | NOT NULL, **sem FK de banco** (ver nota de exceção) |
| descricao | TEXT | NOT NULL |
| responsavel_id | INTEGER | NOT NULL, FK → `employees.id` RESTRICT |
| prazo | DATE | NOT NULL |
| status | ENUM(`aberta`,`em_andamento`,`concluida`,`atrasada`) | NOT NULL, default `aberta` |
| evidencia_conclusao_url | VARCHAR(255) | NULL |
| created_by | INTEGER | NOT NULL, FK → `users.id` RESTRICT |

**Exceção de FK polimórfica (documentada, não omissão):** `origem_id` não
tem FK real porque aponta para 4 tabelas heterogêneas
(`sst_investigacoes_acidente`, `sst_reunioes_cipa`,
`sst_inspecoes_seguranca`, e o "PGR" ainda sem tabela de plano de ação
dedicada neste bloco — usa `sst_riscos_ocupacionais.id`). A alternativa (4
colunas de FK nullable, sempre 3 vazias por linha) foi descartada por
poluir o schema sem ganho real de integridade (o Postgres não valida FK
condicional por `origem_tipo` sem `CHECK` + trigger adicionais, que o
projeto evita por princípio — `06-ESTRUTURAS_PROGRAMAVEIS.md`). A
integridade de `origem_id` é responsabilidade do use-case que cria a
AcaoCorretiva (sempre a partir de uma transação que já tem a origem
carregada em memória).

---

## 3. Cluster ASO/PCMSO (NR-7) — UC-45

### 3.1 `sst_planos_exames` — migration `20260806-000133` (FK `ges_id` fechada em `000139`)

| Coluna | Tipo | Constraints |
|---|---|---|
| position | VARCHAR(100) | NULL |
| ges_id | INTEGER | NULL, FK → `sst_ges.id` ON DELETE SET NULL |
| tipo_exame | VARCHAR(80) | NOT NULL |
| periodicidade_meses | INTEGER | NOT NULL, CHECK > 0 |
| risco_exigente | VARCHAR(150) | NULL, informativo |
| CHECK | — | `position IS NOT NULL OR ges_id IS NOT NULL` |

### 3.2 `sst_asos` + `sst_exames_complementares` — migration `20260806-000134`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_asos` | employee_id, tipo (ENUM 5 valores), data_realizacao, resultado (ENUM 3 valores), restricoes (TEXT, **sensível**), medico_examinador, medico_coordenador_pcmso, data_vencimento, arquivo_url, status_esocial_s2220, recibo_esocial, registrado_por | `employee_id`→employees RESTRICT · `registrado_por`→users RESTRICT |
| `sst_exames_complementares` | aso_id, tipo_exame, data_realizacao, resultado_laudo_url, alterado | `aso_id`→sst_asos **ON DELETE CASCADE** |

**Por que `aso_id` é CASCADE (2ª exceção do bloco ao RESTRICT):**
ExameComplementar não tem existência própria fora do ASO pai — é uma
entidade de composição (parte-todo), não um registro histórico
independente. Diferente de `sst_devolucoes_epi`/`sst_estornos_entrega_epi`
(RESTRICT), que documentam eventos distintos ligados a uma entrega.

**Fronteira SST × RH (decisão §5.1 do documento de requisitos, não
reaberta):** nenhuma coluna de ASO existe em `employees`/
`employee_documents`. O RH consome apenas um status derivado via endpoint
de leitura (`GET /api/sst/aso/status/:employeeId`, responsabilidade do
`ArquitetoSoftwareAPI`) calculado a partir de `sst_asos` — nunca lê estas
tabelas diretamente nem replica dados clínicos.

---

## 4. Cluster Acidente/CAT (Lei 8.213/91, eSocial) — UC-46

### 4.1 `sst_acidentes` + `sst_acidente_testemunhas` + `sst_investigacoes_acidente` — migration `20260806-000135`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_acidentes` | employee_id, data_hora, tipo (ENUM), setor_local, descricao, parte_corpo_atingida, agente_causador, gravidade (ENUM 4 valores), dias_perdidos (CHECK ≥0), houve_cat, justificativa_sem_cat, **confirmado**, confirmado_em, registrado_por | `employee_id`→employees RESTRICT · `registrado_por`→users RESTRICT |
| `sst_acidente_testemunhas` | acidente_id, employee_id (UNIQUE par) | `acidente_id`→sst_acidentes **CASCADE** · `employee_id`→employees RESTRICT |
| `sst_investigacoes_acidente` | acidente_id (**UNIQUE**), causas_identificadas, participantes, evidencias_urls, concluida_em, created_by | `acidente_id`→sst_acidentes RESTRICT · `created_by`→users RESTRICT |
| `sst_acidente_complementos` (adicionada na auditoria cruzada) | acidente_id, campo (ENUM `dias_perdidos`\|`houve_cat`), valor_anterior, valor_novo, motivo, registrado_por | `acidente_id`→sst_acidentes RESTRICT · `registrado_por`→users RESTRICT |

`sst_acidente_testemunhas.acidente_id` é CASCADE por ser um join puro sem
valor probatório isolado (a lista de testemunhas só existe se o acidente
existir); o acidente em si nunca é excluído fisicamente na prática (ver
§5 retenção), então o CASCADE é uma garantia teórica, não um caminho
esperado de uso.

**Correção aplicada na auditoria cruzada (`AuditorIntegrador`, 2026-08-06):**
a versão original desta migration só permitia `UPDATE` direto de
`dias_perdidos`/`houve_cat` (via trigger, sem histórico de quem/quando
alterou), com uma nota do próprio `AdmDBA` prevendo promover para tabela
insert-only "se essa trilha vier a ser exigida". O contrato de
`POST /:id/complements` já publicado em `BLOCO_1_SST_API.md` §3 e a base
legal de BR-SST-017 (Lei 8.213/91, "complementos são lançamentos adicionais
com trilha de auditoria") exigem esse histórico agora, não como melhoria
futura — foi adicionada `sst_acidente_complementos` (insert-only,
`acidente_id`/`campo`/`valor_anterior`/`valor_novo`/`motivo`/`registrado_por`).
O use-case de `POST /:id/complements` deve inserir a linha de auditoria E
atualizar a coluna consolidada em `sst_acidentes` (via o único caminho que
o trigger `sst_lock_acidente` permite) na mesma transação.

### 4.2 `sst_cats` — migration `20260806-000136`

| Coluna | Tipo | Constraints |
|---|---|---|
| acidente_id | INTEGER | NOT NULL, FK → `sst_acidentes.id` RESTRICT |
| numero_cat | VARCHAR(60) | NULL (preenchido quando aceito) |
| tipo | ENUM(`inicial`,`reabertura`,`obito`) | NOT NULL |
| data_emissao | DATE | NOT NULL |
| prazo_limite | DATE | NOT NULL — calculado em app (RNF-SST-04) |
| emitente_id | INTEGER | NOT NULL, FK → `users.id` RESTRICT |
| status_esocial_s2210 | ENUM(`pendente`,`enviado`,`aceito`,`rejeitado`) | NOT NULL, default `pendente` |
| recibo_esocial | VARCHAR(80) | NULL |
| data_envio_esocial | TIMESTAMP | NULL |

Reabertura de CAT = nova linha `tipo='reabertura'` com o mesmo
`acidente_id` — nunca uma alteração da CAT original (resolve a
imutabilidade "por desenho", sem depender só da trigger).

---

## 5. `sst_eventos_esocial` (fila S-2210/S-2220/S-2240) — migration `20260806-000137`

| Coluna | Tipo | Constraints |
|---|---|---|
| tipo | ENUM(`S-2210`,`S-2220`,`S-2240`) | NOT NULL |
| origem_tipo | ENUM(`cat`,`aso`,`ges_funcionario`) | NOT NULL |
| origem_id | INTEGER | NOT NULL, sem FK (polimórfico, mesma exceção de `sst_acoes_corretivas`) |
| payload_referencia | TEXT | NULL (snapshot serializado) |
| prazo_legal | DATE | NULL — calculado em app |
| status | ENUM(`pendente`,`enviado`,`aceito`,`rejeitado`) | NOT NULL, default `pendente` |
| recibo | VARCHAR(80) | NULL |
| motivo_rejeicao | TEXT | NULL |
| data_envio | TIMESTAMP | NULL |

**Índice único parcial** `uq_sst_eventos_esocial_origem_ativo` em
`(origem_tipo, origem_id) WHERE status <> 'rejeitado'` — no máximo 1 evento
"ativo" por origem, garantindo idempotência mesmo sob reprocessamento
concorrente da fila (RNF-SST-03); reenvio após rejeição é sempre uma NOVA
linha, preservando o histórico rejeitado (RF-SST-043 A1).

---

## 6. Cluster CIPA (NR-5, CF/88) — UC-48 — migration `20260806-000138`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_mandatos_cipa` | data_inicio/fim (CHECK fim>início), titulares/suplentes_empregador/empregados, status (ENUM 3 valores) | — |
| `sst_membros_cipa` | mandato_id, employee_id (UNIQUE par), origem (eleito/designado), papel (5 valores), votos_recebidos, estabilidade_inicio/fim, treinamento_cipa_id, posse_confirmada_em | `mandato_id`→sst_mandatos_cipa RESTRICT · `employee_id`→employees RESTRICT · `treinamento_cipa_id`→sst_treinamentos SET NULL (fechada em `000140`) |
| `sst_processos_eleitorais_cipa` | mandato_id (**UNIQUE**), datas do calendário, total_votantes, atas_urls | `mandato_id`→sst_mandatos_cipa RESTRICT |
| `sst_candidatos_cipa` | processo_eleitoral_id, employee_id (UNIQUE par), votos, eleito | `processo_eleitoral_id`→sst_processos_eleitorais_cipa **CASCADE** · `employee_id`→employees RESTRICT |
| `sst_reunioes_cipa` | mandato_id, data, tipo (ordinária/extraordinária), pauta, ata_texto/arquivo_url, created_by | `mandato_id`→sst_mandatos_cipa RESTRICT · `created_by`→users RESTRICT |
| `sst_reuniao_cipa_presentes` | reuniao_id, membro_cipa_id (UNIQUE par) | `reuniao_id`→sst_reunioes_cipa **CASCADE** · `membro_cipa_id`→sst_membros_cipa RESTRICT |

`sst_candidatos_cipa.processo_eleitoral_id` é CASCADE: lista de candidatos
é preparatória (pré-mandato), não um registro histórico com valor
probatório isolado — se o processo eleitoral for removido (cenário raro,
ex. erro de cadastro antes da eleição ocorrer), a lista de candidatos cai
junto. Uma vez que o mandato/membro é efetivado, ele vive em
`sst_membros_cipa` (RESTRICT), que é o registro que importa para
estabilidade.

**Estabilidade (RF-SST-031/BR-SST-022):** `estabilidade_fim` é uma trava de
**aviso**, não de bloqueio de banco. Não existe FK/trigger que impeça
`employees.dismissal_date` de ser preenchido durante a estabilidade — isso
quebraria o fluxo real de desligamento do RH sem decisão jurídica humana,
exatamente como o brief pede ("o módulo SST apenas trava com aviso forte;
o bloqueio definitivo é decisão jurídica/RH"). A checagem é 100%
responsabilidade da aplicação (use-case de desligamento do RH lê
`sst_membros_cipa` antes de confirmar).

---

## 7. Cluster PGR/GRO + GES (NR-1) — migration `20260806-000139`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_ges` | nome, descricao | — |
| `sst_ges_funcionarios` | ges_id, employee_id, inicio_exposicao, fim_exposicao | `ges_id`→sst_ges RESTRICT · `employee_id`→employees RESTRICT |
| `sst_riscos_ocupacionais` | department_id, ges_id, categoria_agente (ENUM 5 valores), agente, fonte_geradora, intensidade_concentracao, data_medicao, medido_por, severidade, probabilidade, classificacao_resultante, medidas_controle, ausencia_risco_identificado, data_revisao, proxima_revisao_prevista, created_by | `department_id`→departments **RESTRICT** · `ges_id`→sst_ges SET NULL · `created_by`→users RESTRICT |
| `sst_risco_epis` | risco_id, tipo_epi_id (UNIQUE par) | `risco_id`→sst_riscos_ocupacionais **CASCADE** · `tipo_epi_id`→sst_tipos_epi RESTRICT |
| `sst_risco_exames` | risco_id, tipo_exame (texto livre) | `risco_id`→sst_riscos_ocupacionais **CASCADE** |

`sst_riscos_ocupacionais.department_id` é **RESTRICT** (diferente de
`sst_matriz_epi.department_id`, que é CASCADE): o risco avaliado é um
registro histórico do inventário do PGR — não pode desaparecer numa
reorganização de departamentos, mesmo que o setor mude de nome/estrutura.

**Correção aplicada na auditoria cruzada (`AuditorIntegrador`, 2026-08-06):**
`categoria_agente` e `agente` nasceram `NOT NULL` na migration original, o
que tornava impossível representar RF-SST-036/BR-SST-026 ("todo setor
produtivo deve ter ao menos um risco avaliado, **ou** registro explícito de
'ausência de risco identificado'") — não há agente/categoria de agente a
preencher quando o registro é exatamente a declaração de que não há risco.
Ambas as colunas passaram a `NULL`-áveis, com
`CHECK ck_sst_riscos_ocupacionais_ausencia_coerente` garantindo a
coerência: `ausencia_risco_identificado = true` exige os dois campos
`NULL`; `= false` (o caso normal, um risco real) exige os dois
preenchidos. Ver `server/migrations/20260806-000139-create-sst-pgr-ges.cjs`.

`sst_ges_funcionarios` é a origem do evento **S-2240** (RF-SST-040): cada
INSERT/alteração relevante de exposição deve gerar uma pendência em
`sst_eventos_esocial` — responsabilidade do use-case, sem trigger (mesma
decisão arquitetural geral do projeto).

---

## 8. Cluster Treinamentos (NR-1 e específicas) — migration `20260806-000140`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_matriz_treinamento` | position, norma (ENUM, UNIQUE par com position), periodicidade_reciclagem_meses, ativo | — |
| `sst_treinamentos` | employee_id, norma (ENUM), curso_descricao, data_realizacao, carga_horaria, instrutor_entidade, certificado_url, validade, identificacao_operador, created_by | `employee_id`→employees RESTRICT · `created_by`→users RESTRICT |

`periodicidade_reciclagem_meses` é NULLABLE e sem valor hard-coded — NR-10
= 24 meses (bienal, confirmado no brief) é um DADO cadastrado pela
aplicação/seed, não uma constante de schema, exatamente porque as demais
normas dependem de confirmação com o técnico SST (RF-SST-045, item 8 do
§5.4 do documento de requisitos).

---

## 9. Cluster Rotina Preventiva (DDS, Inspeções, PT, Brigada) — migration `20260806-000141`

| Tabela | Colunas-chave | FK |
|---|---|---|
| `sst_inspecoes_seguranca` | department_id, data, checklist_modelo, inspetor_id | `department_id`→departments RESTRICT · `inspetor_id`→users RESTRICT |
| `sst_inspecao_itens` | inspecao_id, item_verificado, conforme, observacao, acao_corretiva_id | `inspecao_id`→sst_inspecoes_seguranca **CASCADE** · `acao_corretiva_id`→sst_acoes_corretivas SET NULL |
| `sst_permissoes_trabalho` | atividade, tipo_risco, department_id, requisitos_verificados, autorizante_id, inicio/fim_validade (CHECK fim>início), status (ENUM 3 valores) | `department_id`→departments RESTRICT · `autorizante_id`→users RESTRICT |
| `sst_pt_executantes` | permissao_trabalho_id, employee_id (UNIQUE par) | `permissao_trabalho_id`→sst_permissoes_trabalho **CASCADE** · `employee_id`→employees RESTRICT |
| `sst_brigadistas` | employee_id (**UNIQUE**), data_formacao, validade_reciclagem, ativo | `employee_id`→employees RESTRICT |
| `sst_registros_dds` | data, department_id, turno (ENUM igual a `employees.shift`), tema, condutor_id | `department_id`→departments RESTRICT · `condutor_id`→employees RESTRICT |
| `sst_dds_presencas` | registro_dds_id, employee_id (UNIQUE par) | `registro_dds_id`→sst_registros_dds **CASCADE** · `employee_id`→employees RESTRICT |

Este cluster cobre RF-SST-048 a 053 (P1/P2), sem UC formal detalhado neste
bloco (BLOCO_1_SST_REQUISITOS.md §7) — modelagem "enxuta" (CRUD +
vencimento/validade), como orientado.

---

## 10. Imutabilidade (RNF-SST-01, BR-SST-006/017)

**Decisão:** trigger de banco (PL/pgSQL), como exceção arquitetural
deliberada e estreita — o projeto documenta em
`docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md` que **nenhuma lógica de
processo** vive no banco; esta é a primeira exceção do projeto e foi
justificada assim: a trava aqui **não decide fluxo nem calcula nada** — é
um invariante estrutural de valor probatório legal (documento usado em
ação trabalhista/previdenciária) que precisa sobreviver a um bypass da API
(ex.: `UPDATE` manual via `psql`), o mesmo racional já aceito no projeto
para o índice único parcial `uq_production_downtimes_open_per_work_center`.
Foi atualizada `06-ESTRUTURAS_PROGRAMAVEIS.md` com esta exceção (ver §11).
Enforcement de aplicação (repositório nunca expõe `update`/`delete` para
linha confirmada) continua sendo a primeira linha de defesa — a trigger é
defesa em profundidade, não o único controle.

| Tabela | Mecanismo | O que pode mudar após "confirmado"/"emitido" |
|---|---|---|
| `sst_entregas_epi` | `confirmada` bool + trigger `sst_lock_entrega_epi` | **Nada.** DELETE sempre bloqueado se confirmada; UPDATE sempre bloqueado se `OLD.confirmada = true`. Correção → `sst_estornos_entrega_epi` (insert-only). Devolução → `sst_devolucoes_epi` (insert-only, não muta a entrega original). |
| `sst_acidentes` | `confirmado` bool + trigger `sst_lock_acidente` | Apenas `dias_perdidos` e `houve_cat` (mais `updated_at`), enquanto o resto do conteúdo permanece byte-a-byte igual. Qualquer outra coluna alterada com `OLD.confirmado = true` é rejeitada. DELETE sempre bloqueado se confirmado. |
| `sst_cats` | trigger `sst_lock_cat` (sem coluna de confirmação — imutável desde o INSERT) | Apenas `status_esocial_s2210`, `recibo_esocial`, `data_envio_esocial` (+ `updated_at`). DELETE sempre bloqueado. Reabertura = nova linha, nunca edição. |
| `sst_eventos_esocial` | trigger `sst_block_delete_evento_esocial` | Todas as colunas de status podem evoluir (fila é operacional); só **DELETE é bloqueado** (RNF-SST-03: nenhum evento perdido/descartado silenciosamente). |

`sst_asos` **não** tem trigger de imutabilidade: o brief não define ASO
como documento travado após emitido (pode haver correção de laudo/data por
decisão médica); a trilha é a auditoria de escrita já existente no
projeto (AuditLog), não uma trava estrutural adicional.

---

## 11. Retenção legal de 20 anos (RNF-SST-02)

Não há rotina de expurgo/limpeza automática em nenhuma tabela deste bloco
— nenhuma migration cria job, `pg_cron` ou trigger de exclusão por idade.
A retenção é garantida por **ausência de mecanismo de exclusão**, não por
um contador de expiração:

- `sst_entregas_epi`/`sst_acidentes`/`sst_cats` têm DELETE bloqueado por
  trigger sempre que o registro está confirmado/emitido (ver §10) — na
  prática, **nunca** são fisicamente excluídos pelo fluxo normal da API.
- Nenhum `ON DELETE CASCADE` do bloco propaga a partir de
  `employees`/`departments`/`users` para as tabelas de valor probatório:
  todas as FKs para essas 3 tabelas nas entidades de Ficha de
  EPI/Acidente/CAT são `RESTRICT` (não é possível excluir um funcionário
  com histórico SST — mesmo desligado, o funcionário permanece na tabela
  `employees` com `status='fired'`, nunca é fisicamente removido, seguindo
  o padrão "sem soft delete padrão" do CLAUDE.md §7 já aplicado hoje a
  `employees`).
- Ficha de EPI e histórico de acidente de funcionários desligados
  permanecem consultáveis/imprimíveis indefinidamente (RF-SST-007, UC-44
  A3) — nenhuma query do módulo filtra por `employees.status = 'active'`
  como pré-condição de leitura histórica (responsabilidade de
  implementação a reforçar no handoff ao `programador`).
- Quando/se o prazo legal exato de guarda for confirmado
  (`[PRÁTICA DE MERCADO — prazo legal exato a confirmar]`, RNF-SST-02), a
  única mudança de schema esperada é uma eventual rotina de arquivamento
  frio (não exclusão) após o prazo — fora de escopo deste bloco.

---

## 12. Rastreabilidade RF-SST → Tabela(s)

| RF-SST | Tabela(s) |
|---|---|
| 001, 003 | `sst_tipos_epi` |
| 002 | `sst_matriz_epi` |
| 004, 005, 006, 007 | `sst_entregas_epi` |
| 008 | `sst_entregas_epi` (relatório de pendência, join com `sst_matriz_epi` + `employees`) |
| 009 | `sst_devolucoes_epi` |
| 010 | `sst_tipos_epi.item_id` (integração Compras, sem tabela dedicada neste bloco) |
| 011 | `sst_planos_exames` |
| 012, 018, 021 | `sst_asos` |
| 013 | `sst_exames_complementares` |
| 014 | `sst_asos` (tipo=admissional, consumido por RH via status derivado) |
| 015 | `sst_asos` (tipo=retorno_trabalho) |
| 016 | `sst_planos_exames` + `sst_asos` (tipo=mudanca_riscos) |
| 017 | `sst_planos_exames` + `sst_ges` (audiometria, GES ruído) |
| 019 | parametrização de aplicação (RF-SST-019), sem tabela dedicada — campo de configuração global fora deste bloco |
| 020 | leitura consolidada de `sst_asos`/`sst_exames_complementares`, sem tabela dedicada |
| 022, 023 | `sst_acidentes`, `sst_acidente_testemunhas` |
| 024 | `sst_cats` |
| 025 | `sst_acidentes.justificativa_sem_cat` |
| 026 | `sst_investigacoes_acidente` + `sst_acoes_corretivas` |
| 027 | `sst_acidentes.dias_perdidos` (conciliação de leitura com RH, sem duplicar dado) |
| 028 | `sst_mandatos_cipa` |
| 029 | `sst_processos_eleitorais_cipa` + `sst_candidatos_cipa` |
| 030 | `sst_mandatos_cipa` + `sst_membros_cipa` |
| 031 | `sst_membros_cipa.estabilidade_inicio/fim` |
| 032 | `sst_reunioes_cipa` |
| 033 | `sst_membros_cipa.treinamento_cipa_id` + `sst_treinamentos` |
| 034 | `sst_reuniao_cipa_presentes` + `sst_acoes_corretivas` (origem `reuniao_cipa`) |
| 035, 036, 037, 038 | `sst_riscos_ocupacionais` + `sst_acoes_corretivas` (origem `pgr`) |
| 039 | `sst_ges` |
| 040 | `sst_ges_funcionarios` + `sst_eventos_esocial` (tipo S-2240) |
| 041 | `sst_asos` + `sst_eventos_esocial` (tipo S-2220) |
| 042 | `sst_cats` + `sst_eventos_esocial` (tipo S-2210) |
| 043 | `sst_eventos_esocial` |
| 044 | `sst_matriz_treinamento` |
| 045 | `sst_treinamentos` |
| 046 | join `sst_matriz_treinamento` × `sst_treinamentos` × `employees` (sem tabela dedicada, é uma view/consulta) |
| 047 | `sst_treinamentos.identificacao_operador` |
| 048, 049 | `sst_inspecoes_seguranca` + `sst_inspecao_itens` + `sst_acoes_corretivas` (origem `inspecao_seguranca`) |
| 050 | integração de leitura com Patrimônio/Manutenção, sem tabela dedicada neste bloco |
| 051 | `sst_permissoes_trabalho` + `sst_pt_executantes` |
| 052 | `sst_brigadistas` |
| 053 | `sst_registros_dds` + `sst_dds_presencas` |
| 054, 055 | RBAC (`accessModules.ts`, chave `sst`) + log de acesso — sem tabela de dados nova; reaproveita mecanismo de auditoria já existente do projeto |

---

## 13. Alterações fora das novas tabelas SST

1. **`server/src/shared/domain/accessModules.ts`** — adicionada a chave
   `sst` à union `AccessModuleKey` e ao array `ACCESS_MODULES` (30 → 31
   chaves), com o mesmo padrão de comentário de `rh`, explicitando que
   `sst` é **mais restritivo** (bloqueia rota inteira via
   `authorizeModule`, diferente de `rh`).
2. **`inventory_movements.reference_type`** (ENUM) — adicionado o valor
   `'sst_epi_delivery'` (migration `20260806-000131`), sem alterar nenhuma
   linha existente. **Correção aplicada na auditoria cruzada
   (`AuditorIntegrador`, 2026-08-06):** o valor só tinha sido adicionado ao
   tipo ENUM do Postgres — três pontos de validação em código (TypeScript)
   ainda listavam só os 5 valores antigos e rejeitariam `'sst_epi_delivery'`
   em runtime mesmo com o schema já aceitando: `server/src/models/InventoryMovement.ts`
   (tipo TS + `DataTypes.ENUM` da definição Sequelize),
   `server/src/modules/inventory/presentation/validators/inventoryValidators.ts`
   (`z.enum` do validador de `POST /api/inventory/movements`), e
   `server/src/modules/inventory/domain/entities/InventoryMovementEntity.ts`
   (`REFERENCE_TYPES`). Os três já foram corrigidos como parte desta
   auditoria — sem essa correção, `POST /api/sst/epi-deliveries/:id/confirm`
   falharia sempre ao chamar `InventoryMovementService.registerOutbound`
   com `reference_type: 'sst_epi_delivery'`.
3. **`sst_planos_exames.ges_id`** e **`sst_membros_cipa.treinamento_cipa_id`**
   nascem sem FK em suas migrations de origem (`000133`/`000138`) e são
   fechadas depois que as tabelas-alvo existem (`000139`/`000140`) — ordem
   de criação documentada em cada arquivo, sem risco de órfão porque as
   colunas ficam `NULL`/não populadas até a FK existir (nenhum dado é
   inserido entre as duas migrations em produção).

---

## 14. Pendências para o `ArquitetoSoftwareAPI`

1. **Nomenclatura de campo (DB PT-BR vs. DTO já esboçado):**
   `sst_tipos_epi.ca` ↔ `ca_numero`; `.ativo` ↔ `active`; `.tamanhos_variacoes`
   (string) ↔ `tamanhos` (array) em `BLOCO_1_SST_API.md` — não é um
   problema de modelagem, é responsabilidade do repositório/DTO mapear;
   apenas confirmando que a tradução é necessária e onde.
2. **Fluxo de confirmação (rascunho → confirmado) em `sst_entregas_epi` e
   `sst_acidentes`:** o contrato de API precisa expor 2 operações
   distintas por recurso — `POST` (cria rascunho) e um endpoint de
   confirmação dedicado (ex.: `POST /:id/confirm`) que faz o único UPDATE
   permitido pela trigger. Um `PUT` genérico de edição pós-confirmação
   sempre falhará com erro do Postgres (`RAISE EXCEPTION`) — o
   `errorHandler` precisa mapear essa exceção de banco para um
   `AppError`/`ConflictError` 409 amigável, não vazar a mensagem SQL crua.
3. **Devolução de EPI não é mais um campo da entrega original:** ao
   contrário do texto do brief/UC-44 ("registra devolução ... na entrega
   original"), a devolução vive em `sst_devolucoes_epi` (tabela própria) —
   a Ficha de EPI consolidada (RF-SST-007) precisa fazer o JOIN das duas
   tabelas na leitura.
4. **`sst_acoes_corretivas`/`sst_eventos_esocial` são polimórficas**
   (`origem_tipo`+`origem_id`, sem FK real) — o repositório precisa
   resolver a origem em aplicação (não é possível um `include`/`join`
   Sequelize automático baseado em `origem_tipo`; provavelmente um
   `switch` no repositório ou 4 métodos de resolução distintos).
5. **RF-SST-021 (status de aptidão do RH)** e **RF-SST-031 (estabilidade
   CIPA)**: os campos mínimos necessários já existem
   (`sst_asos.resultado`/`data_vencimento`;
   `sst_membros_cipa.estabilidade_inicio/fim`) — nenhuma tabela adicional é
   necessária para esses 2 endpoints de leitura enxuta.

---

## Referências

- `docs/business/briefs/BRIEF_SST_2026-08-06.md`
- `docs/business/BLOCO_1_SST_REQUISITOS.md`
- `docs/business/BLOCO_1_SST_API.md` (contrato REST, `ArquitetoSoftwareAPI`)
- `docs/database/06-ESTRUTURAS_PROGRAMAVEIS.md` (atualizado com a exceção
  de trigger deste bloco)
- `server/src/shared/domain/accessModules.ts` (chave `sst` adicionada)
- Migrations: `server/migrations/20260806-000130-*.cjs` a
  `20260806-000141-*.cjs`

**Fim do modelo de dados do BLOCO 1 — SST.**
