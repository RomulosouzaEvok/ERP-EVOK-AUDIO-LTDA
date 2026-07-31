# Frontend — melhorias de UX/corporativo e módulo fiscal na UI

**Data**: 2026-07-31
**Branch**: `remediation/production-readiness`
**Escopo**: somente `client/` (React + TypeScript + Vite). Nenhuma mudança de
backend/schema nesta leva.

---

## Contexto

Pedido do usuário: revisar o frontend construído nas sessões anteriores,
deixá-lo mais "corporativo" (visual e explicativo), e resolver um gap
concreto — não dava para clicar num pedido de compra/venda e ver o detalhe
completo da operação. A partir daí, o escopo foi ampliado para cobrir todos os
gaps identificados numa auditoria funcional da própria sessão.

## O que foi entregue

### 1. Painel de detalhes (drawer lateral) — Compras, Vendas e Produção

Novo componente compartilhado `client/src/components/ui/sheet.tsx` (drawer
lateral usando o mesmo `@radix-ui/react-dialog` já usado nos modais, sem
dependência nova). Aplicado em:

- **Compras** (`PurchasesPage.tsx`): clicar na linha (ou botão "Detalhes")
  abre fornecedor, status, datas, itens completos (pedido/recebido/preço/
  subtotal) e total consolidado.
- **Vendas** (`SalesPage.tsx`): cliente, status, forma de pagamento,
  parcelas, desconto, itens e total — **mais a seção fiscal (ver item 2)**.
- **Produção** (`ProductionOrdersPage.tsx`): produto, status, prioridade,
  data prevista, **mais o consumo previsto da BOM ativa (ver item 3)**.

Patrimônio e Financeiro ficaram fora desta leva (decisão explícita do
usuário: "não deixamos isso para outra hora" primeiro, depois adiado de novo).

### 2. Emissão de NF-e na tela de Vendas

O módulo fiscal já existia no backend (rotas `/api/sales/:id/nfe*`) mas não
tinha nenhuma UI. Adicionado:

- `client/src/api/fiscal.ts` — client para `issueSaleNfe`, `getSaleNfeStatus`,
  `cancelSaleNfe`.
- `Sale` (`client/src/api/sales.ts`) ganhou os campos `nfe_status`,
  `nfe_number`, `nfe_key`, `nfe_xml_url`, `nfe_danfe_url`,
  `nfe_error_message`, `nfe_issued_at`.
- No drawer de detalhes da venda: badge de status da NF-e, botão "Emitir
  NF-e" (só quando a venda está `confirmed` e a NF-e está pendente/negada),
  "Consultar status" (quando `processing`), "Cancelar NF-e" (admin, quando
  `authorized`), links para DANFE/XML quando autorizada, e mensagem de erro
  quando negada.

### 3. Preview de consumo de BOM em Produção

Antes, só era possível ver o que seria consumido de insumos **depois** de
concluir a ordem (fluxo obrigatório de `CompleteProductionOrderDialog`). Agora
o drawer de detalhes da ordem busca a BOM ativa do produto
(`getActiveBomByProduct`) e explode a estrutura pela quantidade planejada
(`explodeBom`), mostrando componente, quantidade necessária, estoque
disponível (com aviso visual quando insuficiente) e custo.

### 4. Financeiro — pagamentos parciais e estados de erro

Gaps reais encontrados ao ler o código (não só polimento):

- `FinancialPage.tsx` não tratava `isError` das queries de contas a
  pagar/receber — uma falha de rede simplesmente não mostrava nada. Corrigido
  seguindo o mesmo padrão já usado nas outras páginas (linha de erro
  destrutiva na tabela).
- Não havia como registrar pagamento **parcial** — só existia o botão
  "Registrar pagamento" que quitava o valor total. O backend já suportava
  (`AccountPayable.amount_paid`, status `partial`), só faltava UI. Agora o
  botão pede o valor via prompt (em branco = quita o restante) e a tabela
  mostra a coluna "Pago"/"Recebido" e o status "Parcial".

### 5. Polimento "corporativo" do layout

- `AppLayout.tsx`: sidebar reorganizada em seções (Operações / Gestão /
  Administração), marca "EA" no topo, avatar com iniciais do usuário no
  header, e **breadcrumbs reais** por rota (novo componente `Breadcrumbs`
  dentro do próprio `AppLayout.tsx`, com mapeamento explícito rota → trilha).

### 6. Skeletons de carregamento

Novo `client/src/components/ui/skeleton.tsx` +
`client/src/components/TableSkeletonRows.tsx`. Substituído o texto solto
"Carregando..." por linhas de skeleton animadas em **todas** as tabelas de
listagem (Produtos, Vendas, Compras, Produção, Patrimônio, Clientes,
Fornecedores, BOM, Usuários, Contagem de inventário, Log de auditoria,
Financeiro).

### 7. Paginação server-side

Novo `client/src/components/Pagination.tsx` (usa `pagination.total/page/
totalPages` que a API já retorna em `ListResponse<T>`, isso não mudou).
Antes, todas as listagens usavam um `limit` fixo (50 ou 200) sem forma de ver
a próxima página — registros além do limite ficavam invisíveis. Aplicado nas
mesmas páginas do item 6, com `limit: 20` e estado de página local
(resetado para `1` quando um filtro de busca muda).

### 8. Acessibilidade — labels em buscas sem `<label>`

Inputs de busca que só tinham `placeholder` (sem associação semântica para
leitor de tela) ganharam `aria-label`: Produtos, Clientes, Fornecedores, Log
de auditoria.

## O que ficou fora desta leva (decisão explícita, não esquecimento)

- **Menu mobile/hamburger**: a sidebar continua fixa em telas pequenas. É uma
  peça de UI maior (overlay, toggle, animação) que precisa de alinhamento de
  design antes de construir.
- **Gráfico de fluxo de caixa no Dashboard**: o endpoint
  `GET /api/finance/cash-flow` só agrega totais por status no período, sem
  série diária — um gráfico de tendência real precisaria dessa granularidade
  no backend primeiro. Fabricar dados só para ter um gráfico seria enganoso,
  então foi deixado como nota explícita na própria tela.
- **Drawer de detalhes em Patrimônio e Financeiro**: adiado a pedido do
  usuário.
- **Teste visual no navegador**: validado via `tsc -b` (typecheck),
  `npm run build` (build de produção) e `vitest run` (13/13 testes) — não há
  acesso a browser neste ambiente para conferência visual manual.

## Arquivos novos

```
client/src/api/fiscal.ts
client/src/components/DetailField.tsx
client/src/components/Pagination.tsx
client/src/components/TableSkeletonRows.tsx
client/src/components/ui/sheet.tsx
client/src/components/ui/skeleton.tsx
docs/FRONTEND_MELHORIAS_2026-07-31.md
docs/DOCKER_POSTGRES_SETUP.md
```

## Arquivos modificados

```
client/src/api/financial.ts
client/src/api/sales.ts
client/src/layouts/AppLayout.tsx
client/src/pages/financial/FinancialPage.tsx
client/src/pages/patrimonio/AssetsPage.tsx
client/src/pages/production/BomPage.tsx
client/src/pages/production/ProductionOrdersPage.tsx
client/src/pages/products/InventoryCountsPage.tsx
client/src/pages/products/ProductsPage.tsx
client/src/pages/purchases/PurchasesPage.tsx
client/src/pages/purchases/SuppliersPage.tsx
client/src/pages/sales/ClientsPage.tsx
client/src/pages/sales/SalesPage.tsx
client/src/pages/traceability/AuditLogsPage.tsx
client/src/pages/users/UsersPage.tsx
README.md
```

## Verificação

```bash
cd client
npx tsc -b        # limpo
npm run build     # build de produção ok
npm test -- --run # 13/13 testes passando
```
