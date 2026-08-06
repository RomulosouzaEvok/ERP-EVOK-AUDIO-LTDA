# Diagrama de Casos de Uso e Mapeamento de Processos (BPMN simplificado)

**Status:** 🟢 Atualizado (2026-08-06). Este documento converte o conteúdo
textual já existente em `docs/projeto/04-USE_CASES.md` e
`docs/business/01-USE_CASES.md` (atores × casos de uso formais UC-01 a
UC-41) em artefatos visuais complementares:

1. **Diagrama de Casos de Uso** (Mermaid `flowchart`) — visão atores ×
   funcionalidades, por módulo.
2. **Mapeamento de Processos (BPMN simplificado)** — fluxo ponta a ponta
   por departamento, mostrando onde a tecnologia (ERP) substitui/otimiza
   uma etapa que antes seria manual. Cobre hoje 4 fluxos: Order-to-Cash
   (Vendas), Purchase-to-Pay (Suprimentos), Qualidade (inspeção → NC →
   liberação de lote) e Manutenção (solicitação → execução → atualização
   de ativo).

Não redefine nenhuma regra de negócio nova — é uma representação visual do
que já está formalizado em texto. Onde um processo cruza módulos ainda sem
UC formal (ex.: parte do fluxo RFQ), o rótulo indica a origem
(`CLAUDE.md §4`) em vez de inventar um número de UC.

---

## 1. Diagrama de Casos de Uso — Atores × Módulos

Atores conforme `docs/projeto/04-USE_CASES.md` (papel JWT global:
admin/operator/financial) **e** `docs/business/01-USE_CASES.md`
(perfis de acesso configuráveis por área/módulo, `operate`/`approve`).

```mermaid
flowchart LR
    subgraph ATORES["Atores"]
        ADM["Administrador<br/>(role=admin, acima de<br/>qualquer perfil de área)"]
        OPER["Operador<br/>(role=operator +<br/>perfil de área nível operate)"]
        FIN["Financeiro<br/>(role=financial)"]
        GESTOR["Gestor de área<br/>(perfil nível approve:<br/>ex. Compras, Vendas, Qualidade)"]
        SISTEMA["Sistema (MRP síncrono,<br/>conversão automática opt-in)"]
    end

    subgraph VENDAS["Vendas / Comercial"]
        UC02[UC-02 Cadastrar Cliente]
        UC04[UC-04 Registrar Venda]
        UC27[UC-27 Expedir Venda Faturada]
        UC41[UC-41 Emitir/Cancelar NF-e]
        UCPRECO["Tabela de preços por cliente<br/>(CLAUDE.md §4)"]
    end

    subgraph SUPRIMENTOS["Compras / Suprimentos"]
        UC15[UC-15 Registrar Pedido de Compra]
        UC16[UC-16 Receber Pedido de Compra]
        UC22[UC-22 Catálogo Item×Fornecedor]
        UC23[UC-23 Aprovar Requisição de Compra]
        UC25[UC-25 Requisição → Pedido de Compra]
        UCRFQ["RFQ / Cotação multi-fornecedor<br/>(CLAUDE.md §4)"]
    end

    subgraph PRODUCAO["PCP / Produção"]
        UC12[UC-12 Cadastrar OP]
        UC13[UC-13 Apontar Produção]
        UC20[UC-20 Gerenciar BOM]
        UC24[UC-24 / UC-24b MRP → Requisição]
        UCDOWN["Paradas de Máquina / OEE<br/>(CLAUDE.md §4)"]
    end

    subgraph QUALIDADE["Qualidade / Laboratório"]
        UC17[UC-17 Registrar Não Conformidade]
        UC17B[UC-17B Liberar/Bloquear Lote]
        UCLAB[UC-LAB-01/02 Testes Acústicos]
    end

    subgraph ESTOQUE["Almoxarifado / Logística"]
        UC08[UC-08 Controlar Estoque]
        UC14[UC-14 Movimentar Insumos]
        UCCONT["Inventário Cíclico<br/>(pool/atribuídas — mobile/)"]
    end

    subgraph FINANCEIRO["Financeiro"]
        UC05[UC-05 Contas a Pagar]
        UC06[UC-06 Contas a Receber]
        UC29[UC-29 Projeção de Fluxo de Caixa]
        UCCC["Centros de Custo<br/>(CLAUDE.md §4)"]
        UCREC["Conciliação Bancária OFX<br/>(CLAUDE.md §4)"]
    end

    subgraph ENGENHARIA["Engenharia / P&D"]
        UCENG1[UC-ENG-01 Projeto de Engenharia]
        UCENG2[UC-ENG-02 Desenho Técnico]
        UC39[UC-39 Requisição de Amostra]
    end

    subgraph ADMIN_MOD["Administração / Acesso"]
        UC10[UC-10 Gerenciar Usuários]
        UC30[UC-30 Criar Perfil de Acesso]
        UC33[UC-33 Atribuir Perfil a Usuário]
    end

    OPER --> UC02 & UC04 & UC08 & UC14 & UC15 & UC12 & UC13 & UC17 & UCLAB
    GESTOR --> UC23 & UC25 & UC27 & UC41 & UCRFQ & UC17B
    FIN --> UC05 & UC06 & UC29 & UCCC & UCREC
    ADM --> UC10 & UC30 & UC33 & UC22 & UC20 & UCENG1 & UCENG2 & UC39
    SISTEMA --> UC24 & UCDOWN & UCCONT & UCPRECO
```

---

## 2. Mapeamento de Processos — Order-to-Cash (Vendas)

Fluxo ponta a ponta desde a criação do pedido até a baixa financeira,
mostrando onde o ERP substitui etapas que antes eram manuais/planilha.

```mermaid
flowchart TD
    subgraph SW_VENDAS["Vendas"]
        A1([Cliente solicita pedido]) --> A2[Operador cadastra venda<br/>UC-04]
        A2 --> A3{Estoque<br/>disponível?}
    end

    subgraph SW_ESTOQUE["Estoque"]
        A3 -->|Não| A4["Sistema alerta e bloqueia<br/>a confirmação da venda<br/>[ANTES: verificação manual em planilha]"]
        A3 -->|Sim| A5["Sistema reserva/baixa estoque<br/>automaticamente na mesma transação<br/>[ANTES: baixa manual, risco de venda duplicada]"]
    end

    subgraph SW_FINANCEIRO["Financeiro"]
        A5 --> A6{Pagamento<br/>parcelado?}
        A6 -->|Sim| A7["Sistema gera Contas a Receber<br/>automaticamente (1 linha/parcela)"]
        A6 -->|Não| A8[Recebimento à vista registrado]
        A7 --> A9[Fluxo de caixa projetado<br/>30/60/90 dias + diário]
        A8 --> A9
    end

    subgraph SW_VENDAS2["Vendas (faturamento)"]
        A9 --> A10{Gestor de vendas<br/>emite NF-e?<br/>UC-41, nível approve}
        A10 -->|Sim, parcial ou total| A11["sale_items.invoiced_quantity<br/>acumula; status → partially_invoiced/invoiced"]
        A10 -->|Alteração antes de faturar| A12["PUT /api/sales/:id/items<br/>ajusta itens + reserva<br/>(bloqueado após faturamento parcial)"]
    end

    subgraph SW_EXPEDICAO["Expedição/Logística"]
        A11 --> A13[UC-27 Expedir venda faturada<br/>status → shipped, terminal]
    end

    A4 --> FIM1([Fim — pedido não confirmado])
    A13 --> FIM2([Fim — ciclo completo])
```

---

## 3. Mapeamento de Processos — Purchase-to-Pay (Suprimentos)

Fluxo ponta a ponta desde a necessidade de material até o pagamento ao
fornecedor — a espinha dorsal de rastreabilidade do sistema (decisão
arquitetural "Requisição de Compra como Origem", `CLAUDE.md` §7).

```mermaid
flowchart TD
    subgraph SW_ORIGEM["Origem da necessidade"]
        B1([Estoque baixo / OP nova / MRP]) --> B2{Origem}
        B2 -->|Manual| B3[Solicitante cria requisição<br/>status=draft]
        B2 -->|MRP| B4["UC-24: planejador converte<br/>ordens planejadas em requisição<br/>[ANTES: replanejamento manual em planilha]"]
        B2 -->|MRP auto opt-in| B5["UC-24b: conversão automática<br/>por item marcado conversao_automatica<br/>sem intervenção humana"]
    end

    subgraph SW_APROVACAO["Aprovação (Suprimentos/Administração)"]
        B3 --> B6[draft → pending]
        B4 --> B6
        B5 --> B6
        B6 --> B7{Aprovador = admin?<br/>UC-23}
        B7 -->|Não| B8["403 — só admin aprova<br/>[ANTES: aprovação verbal/e-mail sem rastro]"]
        B7 -->|Sim| B9["pending → approved<br/>approved_by/approval_date do JWT,<br/>nunca do payload (anti-fraude)"]
    end

    subgraph SW_COTACAO["Cotação (opcional)"]
        B9 --> B10{Cotar com<br/>múltiplos fornecedores?}
        B10 -->|Sim| B11["RFQ: convida fornecedores,<br/>registra cotações, mapa comparativo,<br/>adjudica por item (pode dividir)<br/>[ANTES: cotação por telefone/e-mail sem histórico]"]
        B10 -->|Não| B12[Segue direto para conversão]
        B11 --> B13[Gera pedido por fornecedor vencedor]
    end

    subgraph SW_COMPRAS["Compras"]
        B12 --> B14["UC-25: converte requisição aprovada<br/>em 1 pedido por fornecedor resolvido<br/>(preferencial → fallback)"]
        B13 --> B15[status pedido → sent]
        B14 --> B15
    end

    subgraph SW_ALMOX["Almoxarifado"]
        B15 --> B16["UC-16: confere NF, dá entrada física<br/>no estoque (products.quantity)"]
        B16 --> B17["Lote criado em status quarantine<br/>[ANTES: material ia direto para uso,<br/>sem barreira formal de qualidade]"]
    end

    subgraph SW_QUALIDADE["Qualidade"]
        B17 --> B18{Inspeção de<br/>recebimento — UC-17B}
        B18 -->|Aprovado| B19[Lote → available, liberado p/ consumo]
        B18 -->|Reprovado| B20[Lote → blocked + RNC aberta<br/>UC-17]
    end

    subgraph SW_FIN2["Financeiro"]
        B19 --> B21["Conta a pagar gerada APÓS<br/>recebimento (nunca na aprovação)<br/>— decisão arquitetural"]
        B21 --> FIM([Fim — pagamento no vencimento])
    end

    B20 --> FIM2([Fim — material bloqueado, sem consumo])
```

---

## 4. Mapeamento de Processos — Qualidade (Inspeção → NC → Liberação de Lote)

Fluxo ponta a ponta de garantia da qualidade, cobrindo tanto a inspeção de
recebimento (chega do Purchase-to-Pay, seção 3, quando o lote nasce em
`quarantine`) quanto a inspeção in-process/final ligada a uma Ordem de
Produção. Baseado no código real de
`server/src/modules/nonConformities/`, `server/src/modules/inventory/`
(`ReleaseLotUseCase`/`BlockLotUseCase`) e nas telas
`client/src/pages/quality/` (`InspectionTab.tsx`, `NonConformitiesTab.tsx`),
`client/src/pages/laboratory/`.

```mermaid
flowchart TD
    subgraph SW_ORIGEM_Q["Origem da inspeção"]
        C1([Lote chega do Recebimento<br/>status=quarantine]) --> C2{Tipo de<br/>inspeção}
        C2 -->|Recebimento| C3["UC-17B: Inspeção de recebimento<br/>tela /quality (aba Inspeção)"]
        C2 -->|In-process/Final| C4["Apontamento de produção sinaliza<br/>refugo/defeito — origin=in_process/final"]
        C2 -->|Laboratório| C5["UC-LAB-01: Teste acústico/Thiele-Small<br/>/laboratory — opção de teste destrutivo<br/>debita depósito de laboratório"]
    end

    subgraph SW_DECISAO_Q["Decisão de qualidade"]
        C3 --> C6{Lote aprovado<br/>na inspeção?}
        C6 -->|Sim| C7["POST /lots/:id/release<br/>status → available<br/>liberado para consumo/venda"]
        C6 -->|Não| C8["POST /lots/:id/block<br/>status → blocked<br/>opção openRnc marca abertura<br/>simultânea de NC"]
        C4 --> C9[Reporta não conformidade]
        C5 --> C9
        C8 --> C9
    end

    subgraph SW_NC["Registro e tratamento da NC (UC-17)"]
        C9 --> C10["POST /api/quality/non-conformities<br/>nc_number, origin, defect_type,<br/>severity, immediate_action<br/>status=open"]
        C10 --> C11["status → analysis<br/>root_cause + root_cause_category<br/>(método Ishikawa: material, máquina,<br/>método, mão de obra, medição, ambiente)"]
        C11 --> C12["status → corrective_action<br/>corrective_action + responsible_id<br/>+ corrective_action_deadline"]
        C12 --> C13["status → effectiveness_check<br/>effectiveness_check + effectiveness_result<br/>(effective/partially_effective/ineffective)"]
        C13 --> C14{Ação foi<br/>eficaz?}
        C14 -->|Sim| C15["status → closed<br/>closed_by/closed_date"]
        C14 -->|Não| C11
    end

    subgraph SW_CONSUMO_Q["Impacto em produção/estoque"]
        C7 --> C16([Fim — lote disponível<br/>para consumo/venda])
        C15 --> C17{Origem era<br/>fornecedor?}
        C17 -->|Sim| C18["quality_score do fornecedor<br/>recalculado automaticamente<br/>(purchases/suppliers)"]
        C17 -->|Não| C19([Fim — ciclo de NC encerrado])
        C18 --> C19
    end
```

**Observações de fidelidade ao código:**
- O bloqueio de lote (`block`) permite abrir a NC no mesmo ato
  (`openRnc: boolean` em `InspectionTab.tsx`), mas isso é uma conveniência de
  UI — a NC continua sendo um recurso independente
  (`POST /api/quality/non-conformities`), não uma sub-entidade do lote.
- O ciclo de status da NC (`open → analysis → corrective_action →
  effectiveness_check → closed`) é o enum real de
  `server/src/models/NonConformity.ts`; o diagrama não inventa nenhum estado
  intermediário.
- `canceled` (estado alternativo do enum) não está desenhado como caminho
  formal porque nenhum use case dedicado (`Cancel...UseCase`) foi encontrado
  para NC — a transição, se usada, passa pelo `UpdateNonConformityUseCase`
  genérico.

---

## 5. Mapeamento de Processos — Manutenção (Solicitação → Execução → Atualização de Ativo)

Fluxo de manutenção de ativos/patrimônio, baseado em
`server/src/modules/maintenance/` (use cases `CreateMaintenanceOrderUseCase`,
`UpdateMaintenanceOrderUseCase`, `CancelMaintenanceOrderUseCase`) e nas telas
`client/src/pages/maintenance/` (`MaintenanceOrdersTab.tsx`,
`ServiceOrdersTab.tsx`, `MaintenanceRequisitionsPage.tsx`).

```mermaid
flowchart TD
    subgraph SW_SOLICITACAO_M["Solicitação"]
        D1([Operador/gestor identifica<br/>problema em um ativo]) --> D2["UC-18: POST /api/maintenance<br/>asset_id + description obrigatórios<br/>maintenance_type default=corrective<br/>status=open"]
        D2 --> D3{Precisa de peças/<br/>insumos?}
        D3 -->|Sim| D4["Requisição da área de Manutenção<br/>tela /maintenance/requisitions"]
        D3 -->|Não| D5[Segue direto para execução]
        D4 --> D5
    end

    subgraph SW_EXECUCAO_M["Execução"]
        D5 --> D6{Prioridade}
        D6 -->|emergency| D7["status → in_progress<br/>imediato"]
        D6 -->|low/normal/high| D8["status → scheduled<br/>agenda técnico (technician_id)"]
        D8 --> D9["status → in_progress<br/>start_date preenchido<br/>automaticamente pelo use case"]
        D7 --> D9
        D9 --> D10{Falta peça<br/>durante execução?}
        D10 -->|Sim| D11["status → waiting_parts<br/>(pausa até chegar material)"]
        D11 --> D9
        D10 -->|Não| D12["Técnico registra parts_cost,<br/>labor_cost, downtime_hours"]
    end

    subgraph SW_CONCLUSAO_M["Conclusão"]
        D12 --> D13{Resultado}
        D13 -->|completed| D14["status → completed<br/>completion_date automático,<br/>result=completed, total_cost calculado"]
        D13 -->|Cancelada| D15["CancelMaintenanceOrderUseCase<br/>status → canceled"]
        D13 -->|Parcial/transferida| D16["result=partial/transferred<br/>status permanece até nova decisão"]
    end

    subgraph SW_ATIVO_M["Atualização do ativo (patrimônio)"]
        D9 --> D9B["[IMPLEMENTADO 2026-08-06]<br/>OM entra em in_progress →<br/>Asset.status = 'in_maintenance'<br/>(UpdateMaintenanceOrderUseCase,<br/>na mesma transação)"]
        D14 --> D17{"Existe outra OM aberta<br/>(open/scheduled/in_progress/<br/>waiting_parts) para o mesmo ativo?"}
        D17 -->|Não, e ativo ainda<br/>'in_maintenance'| D18["[IMPLEMENTADO] Asset.status = 'active'<br/>(releaseAssetFromMaintenanceIfNoOtherOpenOrders,<br/>UPDATE condicional — nunca ressuscita<br/>decommissioned/lost/returned_to_supplier)"]
        D17 -->|Sim| D18B["Asset.status permanece<br/>'in_maintenance'<br/>(outra OM ainda em aberto)"]
        D18 --> D19([Fim — ordem de manutenção<br/>encerrada; Asset.status<br/>sincronizado automaticamente])
        D18B --> D19
        D15 --> D17
    end
```

**Observações de fidelidade ao código (atualizado 2026-08-06 — sincronização
automática implementada, gap fechado):** o modelo `Asset` tem o valor
`in_maintenance` no enum `status`, e agora **é** atribuído automaticamente
pelo módulo `maintenance`: a transição da OM para `in_progress`
(`UpdateMaintenanceOrderUseCase`) marca `Asset.status = 'in_maintenance'`;
a conclusão (`completed`, mesmo use case) ou o cancelamento
(`CancelMaintenanceOrderUseCase`) tentam devolver `Asset.status = 'active'`,
mas **somente se** (a) não existir nenhuma outra OM aberta para o mesmo
ativo, e (b) o ativo ainda estiver `in_maintenance` no momento (o `UPDATE`
usa `WHERE status = 'in_maintenance'`, então nunca sobrescreve um ativo
baixado — `decommissioned`/`lost`/`returned_to_supplier` — durante a
manutenção). Toda a sincronização roda na mesma transação Sequelize da
mudança de status da OM. Isso está registrado como `RF-PAT-05
[IMPLEMENTADO]` em `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §8 e
detalhado em `docs/patrimonio/03-MANUTENCAO.md` §6.

---

## Legenda de convenções BPMN simplificado

- Cada `subgraph` representa uma raia (swimlane) departamental.
- Textos entre colchetes `[ANTES: ...]` indicam, quando conhecido pela
  documentação de negócio (`docs/<área>/00-README.md`), o que o ERP
  substituiu de processo manual — **não são inventados**: refletem as
  decisões arquiteturais já documentadas em `CLAUDE.md` §7 e nos UCs de
  origem. Onde a documentação não descreve explicitamente o "antes",
  nenhuma anotação foi adicionada.
- Losangos (`{}`) são pontos de decisão/aprovação, sempre citando o UC
  formal quando existir.

## Referências

- `docs/projeto/04-USE_CASES.md` — UCs formais numerados.
- `docs/business/01-USE_CASES.md`, `docs/business/BUSINESS_RULES.md` —
  perfis de acesso e regras `operate`/`approve`.
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamentos reais da empresa.
- `docs/arquitetura/DIAGRAMAS_SEQUENCIA.md` — mesmo conteúdo em nível de
  sequência técnica (API/DB), para os 3 fluxos mais críticos.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — requisitos funcionais
  rastreáveis por módulo (RF-QUA, RF-PAT entre outros), incluindo os gaps
  anotados nas seções 4 e 5 acima.
