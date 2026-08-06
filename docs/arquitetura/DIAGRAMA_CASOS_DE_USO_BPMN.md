# Diagrama de Casos de Uso e Mapeamento de Processos (BPMN simplificado)

**Status:** 🟢 Novo (2026-08-06). Este documento converte o conteúdo textual
já existente em `docs/projeto/04-USE_CASES.md` e `docs/business/01-USE_CASES.md`
(atores × casos de uso formais UC-01 a UC-41) em dois artefatos visuais
complementares:

1. **Diagrama de Casos de Uso** (Mermaid `flowchart`) — visão atores ×
   funcionalidades, por módulo.
2. **Mapeamento de Processos (BPMN simplificado)** — fluxo ponta a ponta
   por departamento, mostrando onde a tecnologia (ERP) substitui/otimiza
   uma etapa que antes seria manual.

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
