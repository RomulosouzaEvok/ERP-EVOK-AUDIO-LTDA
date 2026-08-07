# VERIFICAÇÃO — Módulo Facilities (FAC) vs. Brief de Domínio

**Autor:** Especialista de Domínio Facilities (agente `especialista-facilities`) — verificação, não implementação
**Data:** 2026-08-07
**Objeto verificado:** commit `2ad27fd` — migration `server/migrations/20260807-000200-create-facilities-module.cjs`, models `FacilityVehicle`/`FacilityFuelRecord`/`FacilityCleaningSchedule`/`FacilityArea` (`server/src/models/`), módulo `server/src/modules/facilities/` (Clean Architecture), rotas `/api/facilities/*`, tela `client/src/pages/facilities/FacilitiesPage.tsx`, api client `client/src/api/facilities.ts`, `docs/administrativo/03-FACILITIES.md`, entradas em `docs/governance/HANDOFF_CODEX.md` e `docs/governance/TODO.md` (seção "2026-08-07 — Módulo Facilities implementado do zero").
**Referência:** `docs/business/briefs/BRIEF_FAC_2026-08-06.md` (17 regras BR-FAC-001…017, processos P-FAC-01…05, decisões D-1…D-4).

**Método:** leitura de código real (migration, models, use cases, validators Zod, rotas, api client) contra cada regra e decisão do brief. Nenhum arquivo de código foi alterado nesta verificação.

---

## 1. Tabela regra-a-regra (BR-FAC-001 a 017)

| Código | Regra (resumo) | Status | Evidência |
|--------|-----------------|--------|-----------|
| BR-FAC-001 | Veículo não sai sem condutor autorizado vinculado ao diário de uso | **NÃO ATENDIDA** | Não existe entidade `Condutor` nem `DiarioDeUso`/uso do veículo. `facility_fuel_records.driver_id` é o único vínculo a `employees`, sem flag `authorized` e sem "saída" de veículo — `server/migrations/20260807-000200-create-facilities-module.cjs` linhas 100-127; `server/src/modules/facilities/` não tem pasta `trip`/`usage`/`driver` |
| BR-FAC-002 | Condutor com CNH vencida/categoria incompatível bloqueado; alerta 60/30/7 dias | **NÃO ATENDIDA** | Nenhum campo `cnh_number`/`cnh_category`/`cnh_valid_until` em qualquer tabela; `driver_id` em `facility_fuel_records` é FK simples a `employees.id`, sem CNH — migration linhas 117-123 |
| BR-FAC-003 | `DocumentoVeiculo.valid_until` obrigatório, alerta 60/30/7/vencido; CRLV vencido bloqueia saída | **NÃO ATENDIDA** | Não há tabela `DocumentoVeiculo`/generalização de documentos. `facility_vehicles` só tem `insurance_expiry` (1 campo fixo) — sem CRLV/licenciamento, sem IPVA, sem job/alerta de vencimento em nenhuma camada (migration linhas 68-97; nenhum cron/scheduler de alerta encontrado no módulo) |
| BR-FAC-004 | Seguro vencido gera alerta crítico, exige liberação do Supervisor | **NÃO ATENDIDA** | `insurance_expiry` é armazenado mas não há nenhuma lógica de alerta, bloqueio ou liberação — `CreateVehicleUseCase.ts`/`UpdateVehicleUseCase.ts` não referenciam `insurance_expiry` em nenhuma validação |
| BR-FAC-005 | `return_km ≥ departure_km`; `departure_km` do novo uso ≥ maior `return_km` anterior | **NÃO ATENDIDA** | Não há conceito de "uso"/"viagem" (departure/return); regra é inaplicável porque a entidade que ela protege não existe |
| BR-FAC-006 | Um veículo só com um uso aberto por vez; um condutor só um veículo aberto por vez | **NÃO ATENDIDA** | Idem — sem `DiarioDeUso`, não há "uso em aberto" a controlar |
| BR-FAC-007 | Multa: `indication_deadline` = recebimento + prazo (default 30d, CTB Art. 257 §7º), alerta decrescente, nunca excluída, muda para `expired_nic` | **NÃO ATENDIDA** | Não existe entidade `Multa`/infração em nenhum lugar do módulo (migration, models, use cases) — busca por `fine`/`infraction`/`multa` no diretório retorna vazio |
| BR-FAC-008 | Multa sugere condutor cruzando `infraction_at`+placa com `DiarioDeUso`; confirmação humana | **NÃO ATENDIDA** | Depende de BR-FAC-007 (Multa) e BR-FAC-001 (DiarioDeUso), nenhuma das duas existe |
| BR-FAC-009 | Abastecimento: `km_at_refuel ≥` último km conhecido; `liters ≤ tank_capacity_liters`; alerta de anomalia de consumo (±30%) | **NÃO ATENDIDA** | `CreateFuelRecordUseCase.ts` (linhas 32-41) só valida que o veículo existe e calcula `total_cost` se ausente; **não valida `km_at_refuel` contra `current_km` do veículo, não atualiza `current_km` após o abastecimento, não existe `tank_capacity_liters` no schema (migration linhas 68-97), e não há cálculo/alerta de consumo km/l.** `fuelRecordValidators.ts` (linhas 11-20) só valida tipos/positividade, sem regra de negócio cruzada |
| BR-FAC-010 | Preventiva veicular por km OU tempo (o que vencer primeiro), extensão de `maintenance_orders` | **NÃO ATENDIDA** | Veículo não é `asset` nesta implementação (ver Gap D-2 abaixo) — não há vínculo com `maintenance_orders`. `facility_vehicles` tem apenas `last_oil_change`/`next_oil_change_km` como campos soltos, sem gatilho, alerta ou geração de ordem de manutenção — migration linhas 86-87 |
| BR-FAC-011 | Chamado predial com risco de segurança/produção recebe prioridade `emergency` + notifica Supervisor/SST | **NÃO ATENDIDA** | Não existe `ChamadoPredial`/`facility_specialty`/`facility_area_id` em `maintenance_orders`, nem tabela própria de chamados. `facility_areas` existe (cadastro de área física) mas nada a consome para chamados — ver Gap D-1 abaixo |
| BR-FAC-012 | Insumos de consumo saem do estoque central com categoria própria; nenhum estoque paralelo; reposição via Requisição de Compra | **NÃO ATENDIDA (por omissão)** | Não há integração nenhuma com `/api/inventory` nem categoria "Consumo Interno/Facilities" criada no seed (`server/src/config/seeds.ts` não contém referência) — mas também não foi criado estoque paralelo, então não há violação ativa, apenas ausência total da funcionalidade |
| BR-FAC-013 | Visitante: check-in exige nome+documento+anfitrião; check-out obrigatório; alerta se `onsite` após horário-limite | **NÃO ATENDIDA** | Não existe `Visitante`/`Visita` em nenhum lugar do módulo |
| BR-FAC-014 | Reserva de sala/recurso sem sobreposição de intervalo | **NÃO ATENDIDA** | Não existe `ReservaRecurso` |
| BR-FAC-015 | Execução de limpeza requer `operate`; plano (frequências/áreas) requer `approve` | **DIVERGENTE** | `facilities.ts` (rotas, linhas 9-14 e 42-45) usa **apenas** `authorizeModule('facilities')`/`authorizeModule('facilities', 'operate')` — não há nível `approve` no módulo inteiro ("Nenhuma rota deste módulo usa nível `approve`", comentário nas próprias rotas linha 14). Além disso, o brief pedia separação Plano × Execução; a implementação tem uma única tabela `facility_cleaning_schedules` (plano com `last_cleaning`/`next_cleaning`), sem tabela de execução — o mesmo POST/PUT que cria a programação também seria usado para "marcar execução", sem RBAC diferenciado |
| BR-FAC-016 | Todo custo de frota (combustível, multa, documento, manutenção) atribuível ao veículo, compõe custo/km; multa/documento com desembolso gera título em Contas a Pagar | **PARCIAL** | Só `facility_fuel_records.total_cost` existe e é atribuível ao veículo (`vehicle_id`, migration linha 104). Não há custo de documento (sem `DocumentoVeiculo`), não há custo de multa (sem `Multa`), não há custo de manutenção vinculado (veículo não é `asset`, logo não usa `maintenance_orders`), e **nenhuma integração com Contas a Pagar** (`grep` por `accounts_payable`/`AccountsPayable` no módulo `facilities` não retorna nada) |
| BR-FAC-017 | Nada é excluído fisicamente; usa `status`/cancelamento | **ATENDIDA** | Migration não cria endpoint de delete (confirmado em `facilities.ts`, só GET/POST/PUT) e model `FacilityVehicle` tem `status` enum (`active/maintenance/deactivated/sold`) — migration linhas 89-93; docs `03-FACILITIES.md` linha 32 confirma "sem delete, físico ou lógico" |

### Contagem
- **ATENDIDA:** 1 (BR-FAC-017)
- **PARCIAL:** 1 (BR-FAC-016)
- **DIVERGENTE:** 1 (BR-FAC-015)
- **NÃO ATENDIDA:** 14 (BR-FAC-001 a 014, exceto 016/017)

---

## 2. Gaps funcionais relevantes (processos do brief não cobertos)

O brief definiu 5 processos ponta a ponta (P-FAC-01 a 05) e 12 entidades (seção b). A implementação entrega **apenas 4 tabelas de cadastro simples**, cobrindo uma fração pequena e estruturalmente diferente do desenhado:

| Processo/Entidade do brief | Implementado? | Observação |
|---|---|---|
| P-FAC-01 Uso de veículo ponta a ponta (solicitação→saída→retorno→abastecimento→multa→manutenção) | **Parcial — só abastecimento isolado** | Sem `DiarioDeUso`, sem `Condutor`/CNH, sem `Multa`, sem vínculo com `maintenance_orders`. O abastecimento existe mas desconectado de qualquer viagem/uso |
| P-FAC-02 Chamado de manutenção predial | **Não implementado** | `facility_areas` existe como cadastro, mas nada gera/consome chamados; decisão D-1 (reutilizar `maintenance_orders` com `facility_specialty`/`facility_area_id`) não foi seguida nem alternativa equivalente criada |
| P-FAC-03 Recepção/portaria (visitantes, correspondência) | **Não implementado** | Nenhuma tabela/endpoint de visitante ou correspondência |
| P-FAC-04 Serviços gerais (limpeza, copa, insumos, EPIs) | **Parcial** | Só a "programação" de limpeza (plano) existe, sem execução separada (impossibilita KPI de aderência do brief). Copa e insumos: nada implementado (nem a integração com `/api/inventory` prevista em D-3). EPIs: docs corretamente aponta que é coberto pelo módulo SST (decisão razoável, não é gap) |
| P-FAC-05 Reserva de salas/recursos | **Não implementado** | Nenhuma tabela `ReservaRecurso` |

**Resumo de cobertura por área do checklist do brief (autorrevisão original, seção final):**
- Frota: veículo ✔ (mas mal desenhado, ver Gap D-2) / condutor ✘ / uso ✘ / abastecimento ✔ (parcial, sem regra de km) / multa ✘ / manutenção ✘ / documentos ✘
- Predial: chamados por especialidade ✘
- Serviços gerais: rotinas parcial (só plano, sem execução) / insumos ✘
- Recepção: visitantes ✘ / correspondência ✘
- Reservas: ✘

Ou seja, das 5 áreas funcionais do checklist original do brief, **somente "frota" tem alguma cobertura, e mesmo essa é incompleta** (falta tudo que dá rastreabilidade legal: condutor/CNH, uso/viagem, multa, documentos com vencimento).

---

## 3. Divergências de arquitetura (decisões D-1 a D-4 do brief)

### D-2 — Veículo deveria ser extensão 1:1 de `assets` — **VIOLADA**
O brief foi explícito e teve tom de "obrigatório, não criar `fleet_vehicles` isolada" (seção d, D-2, linha 172-175): *"A tabela `fleet_vehicles` do planejamento (`03-FACILITIES.md`) **não deve ser criada como está** — duplicaria marca/modelo/status que já existem em `assets` e criaria dois cadastros do mesmo bem."*

A implementação fez exatamente o que o brief pediu para não fazer: criou `facility_vehicles` como tabela **independente**, com `brand`, `model`, `status` (`active/maintenance/deactivated/sold`) próprios — duplicando exatamente os campos que já existem em `Asset` (`server/src/models/Asset.ts`, citado no próprio brief linha 12). O veículo administrativo **não** aparece como `asset_type='vehicle'` em Patrimônio, não tem depreciação, QR code, nem `responsible_id` — quebra a integração com o módulo de Patrimônio que o brief definiu como obrigatória (mapa de integrações, linha 187). A própria documentação nova (`03-FACILITIES.md` linha 100-103) reconhece a divergência e a justifica como decisão consciente de "operação de frota" vs "depreciação contábil" — mas essa justificativa não estava no brief e contradiz a decisão D-2 registrada.

### D-1 — Chamado predial deveria reutilizar `maintenance_orders` — **NÃO ENDEREÇADA**
Nenhuma extensão foi feita a `maintenance_orders` (sem `facility_specialty`/`facility_area_id`), nem foi criada tabela alternativa clonando o desenho, como o brief previa como plano B (linha 170). O processo P-FAC-02 simplesmente não existe na entrega.

### D-3 — Insumos via `/api/inventory` — **NÃO ENDEREÇADA**
Nenhuma categoria de "Consumo Interno/Facilities" foi criada, nenhuma integração com estoque.

### D-4 — Módulos novos de fato — **PARCIALMENTE ENDEREÇADA**
Das entidades listadas como "não há nada a reutilizar, precisa ser criado do zero" (VeiculoDetalhe, Condutor, DiarioDeUso, Abastecimento, Multa, DocumentoVeiculo, AreaFisica, Limpeza plano+execução, Visitante/Visita, Correspondencia, ReservaRecurso — 11 conceitos), a entrega cobre efetivamente **3**: um cadastro de veículo (mal desenhado, ver D-2), abastecimento (incompleto, ver BR-FAC-009) e área física. **8 dos 11 conceitos não têm nenhum código.**

---

## 4. Problemas de regra de negócio na implementação (achados adicionais)

1. **Hodômetro não é protegido em nenhum ponto.** `km_at_refuel` no abastecimento não é validado contra `facility_vehicles.current_km`, e `current_km` não é atualizado a partir do abastecimento — nenhum mecanismo impede um abastecimento com km menor que o anterior (viola o espírito de BR-FAC-005/009). `CreateFuelRecordUseCase.ts` linhas 32-41 confirma ausência dessa checagem.
2. **Sem cálculo de consumo (km/l) e sem detecção de anomalia** — BR-FAC-009 previa alerta de consumo fora de ±30% da média; nada disso existe, nem o campo `full_tank` necessário para o cálculo correto.
3. **Sem `tank_capacity_liters`** — o brief pedia esse campo "para sanidade do abastecimento"; ausente do schema, então não há teto de litros por abastecimento.
4. **RBAC sem distinção view/operate/approve** — diferente do padrão do módulo `maintenance` citado como referência no próprio brief (`authorizeModule('manutencao')`: view/operate/approve), o módulo FAC usa apenas 2 níveis. Isso diverge do BR-FAC-015 explicitamente.
5. **Nenhum alerta/job de vencimento** — nem para `insurance_expiry` (o único campo de vencimento que sobrou no schema), nem para qualquer outra coisa. O brief tratou vencimento de documento como "coração dos alertas" (seção b, item 2) e item central da autorrevisão ("todo documento com vencimento tem alerta?" — resposta aqui é não, para o único documento que existe).
6. **Sem rastreabilidade de responsável por uso de veículo** — pergunta central da autorrevisão do brief ("todo uso de veículo tem responsável rastreável?") não pode ser respondida "sim" nesta implementação, porque não há conceito de "uso".
7. **`facility_cleaning_schedules.area` como texto livre**, sem FK para `facility_areas` — decisão documentada e consciente (migration linhas 48-54), mas quebra o cruzamento área×limpeza que o brief mencionava como KPI potencial; aceitável como trade-off registrado, não é uma regra de negócio quebrada, apenas uma limitação a registrar.
8. **Nenhuma integração financeira** (Contas a Pagar) para nenhum custo de frota, mesmo o único custo existente (abastecimento) — BR-FAC-016 previa isso para documento/multa (que não existem) mas também é uma lacuna em relação ao mapa de integrações geral do brief.

---

## 5. Veredito

## **GAPS CRÍTICOS**

A implementação entrega um CRUD de cadastro simples e tecnicamente limpo (Clean Architecture, RBAC básico, testes, validação Zod, sem soft-delete indevido — aspectos de qualidade de código corretos), mas **cobre uma fração muito pequena e estruturalmente divergente do brief de domínio combinado**:

- **14 de 17 regras de negócio (BR-FAC-001 a 014) não atendidas**, 1 divergente (015), 1 parcial (016), apenas 1 plenamente atendida (017 — que é uma regra "negativa", fácil de cumprir por omissão de funcionalidade).
- **Todos os itens P0 do brief** (seção f: VeiculoDetalhe+DocumentoVeiculo com alertas, Condutor+CNH, DiarioDeUso, Multa com prazo legal, Abastecimento completo, Chamado predial+AreaFisica) — **exceto Abastecimento (incompleto) e AreaFisica (cadastro simples)** — estão ausentes.
- **A decisão arquitetural obrigatória D-2** (veículo como extensão de `Asset`, não tabela isolada) foi violada, criando duplicação de patrimônio que o próprio ERP tenta evitar (princípio geral do CLAUDE.md de reutilização e integridade referencial).
- **Risco legal/financeiro direto não mitigado:** sem `Multa`/prazo de indicação (CTB Art. 257 §7º — risco de multa NIC agravada), sem alerta de vencimento de CRLV/IPVA/seguro (CTB Art. 230, V — risco de apreensão), sem CNH controlada (CTB Art. 159/162) — exatamente os itens que o brief apontou como "o risco mais caro e mais silencioso" (seção f, P0 item 1).

### Lista priorizada do que precisa ser complementado

**P0 — bloqueante para uso seguro do módulo em produção (risco legal/financeiro):**
1. Migrar `facility_vehicles` para extensão 1:1 de `assets` (D-2) ou, no mínimo, documentar formalmente a divergência como decisão revisada e aprovada (hoje é uma nota unilateral em `03-FACILITIES.md`, não uma decisão de arquitetura revisada com `ArquitetoSoftwareAPI`).
2. Criar `DocumentoVeiculo` (ou generalizar campos de vencimento) com alertas 60/30/7 dias e bloqueio de saída por CRLV vencido (BR-FAC-003).
3. Criar `Condutor` com CNH/validade e vínculo de autorização (BR-FAC-001/002).
4. Criar `DiarioDeUso` (saída/retorno/km) — pré-requisito para custo/km real e para indicação de multa (BR-FAC-005/006).
5. Criar `Multa` com `indication_deadline` e alerta decrescente (BR-FAC-007/008) — maior exposição legal do departamento.
6. Corrigir `CreateFuelRecordUseCase` para validar `km_at_refuel ≥ current_km` e atualizar `current_km` do veículo (BR-FAC-009).
7. Implementar chamado predial (D-1: estender `maintenance_orders` com `facility_specialty`/`facility_area_id`) — P-FAC-02 inteiro está ausente.

**P1 — eficiência/controle (conforme priorização original do brief):**
8. Separar plano × execução de limpeza (permitir KPI de aderência).
9. Integrar insumos com `/api/inventory` (D-3) — categoria própria + requisição de compra.
10. Adicionar nível `approve` ao RBAC do módulo (BR-FAC-015) para diferenciar plano (Supervisor) de execução (Serviços Gerais).
11. Visitante/Visita (P-FAC-03) — hoje inexistente.

**P2:**
12. ReservaRecurso, Correspondencia — conforme priorização original do brief.

---

## Confirmação de existência do relatório
Arquivo salvo em `docs/business/BLOCO_4_FAC_VERIFICACAO.md` (confirmado via `ls` no encerramento desta verificação).
