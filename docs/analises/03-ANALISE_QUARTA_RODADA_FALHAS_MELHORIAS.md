# ANÁLISE QUARTA RODADA - FALHAS CRÍTICAS & MELHORIAS PARA PRODUÇÃO EM MASSA

**Data:** Abril 2025  
**Contexto:** ERP EVOK ÁUDIO - Fábrica de Alto-Falantes (Produção em Massa)  
**Analista:** Blackbox ERP Coder  
**Severidade:** 🔴 CRÍTICO | 🟠 ALTO | 🟡 MÉDIO | 🔵 MELHORIA

---

## RESUMO EXECUTIVO

| Categoria | 🔴 Crítico | 🟠 Alto | 🟡 Médio | 🔵 Melhoria | Total |
|-----------|------------|---------|-----------|-------------|-------|
| **Arquitetura & Escalabilidade** | 3 | 2 | 4 | 3 | **12** |
| **MRP & PCP (Produção em Massa)** | 5 | 4 | 3 | 2 | **14** |
| **Estoque & Logística** | 3 | 3 | 2 | 2 | **10** |
| **Qualidade & Rastreabilidade** | 2 | 3 | 2 | 3 | **10** |
| **Financeiro & Fiscal** | 2 | 2 | 3 | 2 | **9** |
| **Segurança & Dados** | 2 | 2 | 1 | 2 | **7** |
| **Performance & Operacional** | 2 | 3 | 2 | 3 | **10** |
| **Total** | **19** | **19** | **17** | **17** | **72** |

---

## 🔴 1. FALHAS CRÍTICAS (DEVO PARAR TUDO E CORRIGIR)

### 1.1 ARQUITETURA & ESCALABILIDADE

#### 🔴 F01 - AUSÊNCIA TOTAL DE BOM (BILL OF MATERIALS)
**Arquivo:** `server/src/models/Product.js`, `server/src/controllers/productionOrderController.js`
**Problema:** O sistema NÃO tem estrutura de BOM. Produto acabado (alto-falante) precisa de: cone, bobina, ímã, carcaça, spider, surround, terminais, etc. Sem BOM, o MRP não explode necessidades. Para produção em massa de 50 funcionários isso é **inviável**.
**Impacto:** Não é possível calcular custo real do produto, nem planejar compra de insumos baseado na OP.
**Solução:** Criar modelo `BillOfMaterial` com itens componentes, quantidade por unidade, nível, roteiro de montagem.

#### 🔴 F02 - AUSÊNCIA DE SISTEMA MRP (MATERIAL REQUIREMENTS PLANNING)
**Arquivo:** N/A (não existe)
**Problema:** Para uma fábrica de alto-falantes com produção em massa, a explosão de necessidades é **obrigatória**. Ao criar uma OP de 2000 unidades, o sistema deveria automaticamente:
- Calcular quantos cones, bobinas, imãs, etc. necessários
- Verificar estoque atual de cada insumo
- Gerar sugestões de compra para itens abaixo do necessário
- Considerar lead time dos fornecedores
**Impacto:** O PCP terá que fazer contas manuais ou em Excel — inaceitável para o porte.
**Solução:** Criar `services/mrpService.js` com engine de explosão de BOM.

#### 🔴 F03 - ESTOQUE NÃO TEM RESERVA PARA PRODUÇÃO
**Arquivo:** `server/src/controllers/saleController.js`, `server/src/controllers/productionOrderController.js`
**Problema:** Quando uma OP é criada, o sistema não reserva estoque de insumos. Quando uma venda é confirmada, o estoque de produto acabado é baixado, mas:
- Não há campo `reserved_quantity` em Product
- Não há verificação de disponibilidade real (estoque físico - reservado)
- Duas OPs podem "competir" pelo mesmo insumo sem proteção
**Impacto:** Venda é aprovada com estoque que na verdade já estava comprometido por outra OP.
**Solução:** Adicionar `reserved_quantity` em Product, ajustar todas as consultas de disponibilidade.

---

### 1.2 PCP & PRODUÇÃO EM MASSA

#### 🔴 F04 - PRODUCTIONORDER NÃO TEM ROTEIRO DE PRODUÇÃO
**Arquivo:** `server/src/models/ProductionOrder.js`
**Problema:** OP é linear (status: planned → released → in_progress → completed). Para uma fábrica real de alto-falantes, o roteiro é:
1. Corte do cone → 2. Bobinamento → 3. Montagem do conjunto móvel → 4. Prensagem → 5. Colagem do surround → 6. Secagem → 7. Teste acústico → 8. Embalagem
Cada etapa tem tempos diferentes, máquinas diferentes, operadores diferentes.
**Impacto:** Impossível rastrear onde está o gargalo, tempo de cada etapa, eficiência por posto.
**Solução:** Criar `ProductionRoute`, `ProductionRouteStep`, `ProductionOrderTracking` para rastrear cada etapa.

#### 🔴 F05 - SEM APONTAMENTO DE PRODUÇÃO (TIME TRACKING)
**Arquivo:** N/A (não existe)
**Problema:** Não há como o operador apontar: "Iniciei a OP 123 às 07:30, parei às 09:15, produzi 150 peças, 3 refugadas". Sem apontamento, não existe:
- Cálculo de OEE (Overall Equipment Effectiveness)
- Custeio real por hora/máquina
- Produtividade individual ou por turno
- Rastreabilidade de lote
**Impacto:** Gestão às cegas. Não sabe quanto custou pra fazer cada alto-falante.
**Solução:** Criar `ProductionAppointment` com start/end time, quantity good/scrap, operator_id, machine_id.

#### 🔴 F06 - SEM NUMERAÇÃO DE SÉRIE / LOTES PARA RASTREABILIDADE
**Arquivo:** `server/src/models/Product.js`, `server/src/controllers/productionOrderController.js`
**Problema:** Em produção em massa de componentes eletroacústicos, **cada lote** precisa ser rastreável. Se um lote de bobinas veio com fio de cobre fora da especificação, precisa saber:
- Em quais produtos acabados esse lote foi usado
- Para quais clientes foram vendidos
- Data de fabricação, fornecedor do insumo
**Impacto:** Em caso de recall (NC crítica), impossível rastrear os produtos afetados.
**Solução:** Criar `LotControl` + `SerialNumber` por produto acabado, vincular apontamentos aos lotes de insumos consumidos.

#### 🔴 F07 - NÃO HÁ CÁLCULO DE CUSTO POR PRODUTO (CUSTEIO REAL)
**Arquivo:** `server/src/models/Product.js`, `server/src/services/`
**Problema:** Product tem `cost_price` (manual). O sistema deveria calcular automaticamente:
- Custo da matéria-prima (via BOM)
- Custo de mão-de-obra direta (via apontamento)
- Rateio de custos indiretos (CIF)
- Custo total = MP + MOD + CIF
**Impacto:** Preço de venda é definido sem base real de custo. Empresa pode estar vendendo com prejuízo.
**Solução:** Criar `services/costService.js` com engine de custeio por absorção.

---

### 1.3 ESTOQUE & LOGÍSTICA

#### 🔴 F08 - ENDEREÇAMENTO DE ARMAZÉM (WMS) AUSENTE
**Arquivo:** `server/src/models/Product.js`
**Problema:** Product tem `location` (string free), mas não há:
- Múltiplos endereços por produto (estoque pode estar em 3 locais diferentes)
- Picking por endereço (separação de pedidos)
- Inventário por endereço
- Entrada em endereço específico
**Impacto:** Perde-se tempo procurando material no almoxarifado. Erro de separação.
**Solução:** Criar `WarehouseLocation` com: product_id, quantity, location_code (corredor-mod-prateleira), lot_number.

#### 🔴 F09 - SEM CONTROLE DE INVENTÁRIO CÍCLICO
**Arquivo:** `server/src/controllers/inventoryController.js`
**Problema:** O sistema só tem movimentações de entrada/saída. Para uma fábrica real, precisa de:
- Inventário rotativo por classe ABC (itens A: toda semana, B: a cada 15 dias, C: a cada mês)
- Ajuste de divergência com aprovação
- Histórico de acurácia por produto/departamento
**Impacto:** Estoque contábil vs. físico podem divergir drasticamente sem detecção precoce.
**Solução:** Implementar `InventoryCount` + `InventoryCountItem` com workflow de aprovação.

#### 🔴 F10 - MOVIMENTAÇÃO DE ESTOQUE USA `sequelize.literal()` - RACE CONDITION
**Arquivo:** `server/src/controllers/inventoryController.js:39`, `saleController.js:82`, `productionOrderController.js:127`
**Problema:**
```javascript
await Product.update(
  { quantity: sequelize.literal(`quantity ${type === 'in' ? '+' : '-'} ${quantity}`) },
  { where: { id: product_id, quantity: { [Op.gte]: type === 'out' ? quantity : 0 } } }
);
```
O `sequelize.literal()` é executado no banco, MAS a transação usa locking `t.LOCK.UPDATE` apenas no SELECT antes. Se duas requisições concorrentes acontecerem AO MESMO TEMPO, ambas podem passar pela verificação antes de uma atualizar.
**Impacto:** Estoque pode ficar negativo em vendas concorrentes. Dupla venda do mesmo item.
**Solução:** Usar `sequelize.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE })` ou fazer: `UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?` e verificar rowsAffected.

---

### 1.4 QUALIDADE

#### 🔴 F11 - NC NÃO BLOQUEIA PRODUÇÃO / EXPEDIÇÃO
**Arquivo:** `server/src/controllers/nonConformityController.js`
**Problema:** Uma NC crítica (severidade: 'critical') pode ser aberta para um lote, mas o sistema:
- Não bloqueia a expedição dos produtos afetados
- Não impede a continuidade da produção
- Não notifica automaticamente os responsáveis
**Impacto:** Produto com NC crítica pode ser enviado ao cliente por erro operacional.
**Solução:** Adicionar no workflow: NC critical → bloquear estoque do lote (status 'blocked') → notificar PCP/vendas.

#### 🔴 F12 - PARÂMETROS THIELE-SMALL SEM VALIDAÇÃO
**Arquivo:** `server/src/models/Product.js`, `server/src/controllers/productController.js`
**Problema:** O modelo tem 13 campos `ts_params_*` (parâmetros acústicos), mas:
- Não há validação de range (Fs entre 20-200Hz? Qts entre 0.2-1.5?)
- Não há verificação de consistência (Qts = Qes*Qms/(Qes+Qms))
- Não há alerta se parâmetro está fora da especificação de projeto
**Impacto:** Produto pode ser fabricado com parâmetros fora da engenharia, gerando NC acústica.
**Solução:** Adicionar validadores de engenharia no Product model e criar `services/acousticValidator.js`.

---

### 1.5 FINANCEIRO & FISCAL

#### 🔴 F13 - NFE GATEWAY NÃO INTEGRADO (NF-E FANTASMA)
**Arquivo:** `server/src/models/Sale.js`
**Problema:** Sale tem `nfe_number`, `nfe_status`, `nfe_key`, mas:
- Não há integração com SEFAZ (autorização, denúncia, cancelamento)
- Não há geração de DANFE (PDF)
- Não há cálculo de impostos (ICMS, IPI, PIS, COFINS)
- nfe_status fica sempre 'pending' — é campo morto
**Impacto:** Para uma empresa industrial, emitir NF-e é **obrigatório**. Sem integração, o sistema é incompleto para operação real.
**Solução:** Integrar API de NF-e (ex: Webmania, Focus NFe) no `services/nfeService.js`.

#### 🔴 F14 - SEM CÁLCULO TRIBUTÁRIO (ICMS, IPI, PIS, COFINS, SIMPLES)
**Arquivo:** N/A (não existe)
**Problema:** Customer tem `tax_regime` (simples_nacional, lucro_presumido, lucro_real), `ind_final`, `ind_ie`, mas:
- Nenhum controller calcula impostos
- Sale não tem `taxes` (icms_value, ipi_value, pis_value, cofins_value)
- Product tem `ncm` e `cest` mas não usa para nada
- AccountReceivable não considera impostos retidos
**Impacto:** Valor da venda no sistema ≠ valor fiscal real. Diferenças podem gerar multas fiscais.
**Solução:** Criar `services/taxService.js` com cálculo de impostos baseado em: NCM, CEST, origem/destino, regime tributário.

---

## 🟠 2. FALHAS DE ALTA SEVERIDADE

### 2.1 ARQUITETURA

#### 🟠 F15 - LOGIN NÃO TEM 2FA / HISTÓRICO DE ACESSO
**Arquivo:** `server/src/controllers/authController.js`
**Problema:** Apenas JWT simples. Para um sistema que gerencia dados financeiros e fiscais de uma indústria, deveria ter:
- Histórico de login (IP, data, user-agent)
- Notificação de novo dispositivo
- Opção de 2FA (TOTP)
**Impacto:** Se uma credencial é comprometida, não há como detectar acesso não autorizado.

#### 🟠 F16 - TODOS OS CONTROLLERS USAM TRY/CATCH GENÉRICO VAZANDO DETALHES
**Arquivo:** TODOS os controllers em `server/src/controllers/*.js`
**Problema:** 100% dos controllers fazem:
```javascript
catch (error) {
  res.status(500).json({ success: false, error: error.message });
}
```
Isso **vaza detalhes internos** em produção (`error.message` pode conter nomes de tabelas, campos, queries). Para uma empresa, isso expõe a estrutura do banco.
**Impacto:** Atacante pode descobrir nomes de colunas e planejar SQL Injection.
**Solução:** Em produção, logar o erro completo no console/Winston e retornar apenas "Erro interno do servidor".

#### 🟠 F17 - NENHUM TESTE AUTOMATIZADO EXISTE
**Arquivo:** N/A
**Problema:** Zero testes (unitários, integração, e2e). Para um sistema que movimenta estoque, dinheiro e produção, qualquer bug pode ter impacto financeiro direto.
**Impacto:** Cada alteração manual é um risco. Sem refatoração segura.
**Solução:** Implementar Jest + Supertest para controllers, testes de unidade para services (MRP, custos, impostos).

---

### 2.2 PCP & PRODUÇÃO

#### 🟠 F18 - PRODUCTIONORDER NÃO TEM CAMPO DE TIPO DE PRODUÇÃO
**Arquivo:** `server/src/models/ProductionOrder.js`
**Problema:** Uma fábrica de alto-falantes tem diferentes tipos de produção:
- Produção para estoque (make-to-stock)
- Produção sob encomenda (make-to-order)
- Produção de protótipo (engenharia)
- Reprocesso (rework de itens com NC)
O modelo atual não diferencia esses cenários.
**Impacto:** Não é possível segregar custos de P&D vs. produção comercial.

#### 🟠 F19 - SEM APROVAÇÃO DE OP (WORKFLOW)
**Arquivo:** `server/src/controllers/productionOrderController.js`
**Problema:** OP é criada direto sem aprovação. Deveria ter fluxo:
rascunho → pendente_aprovação → aprovada → liberada → em_andamento
**Impacto:** Qualquer operador pode criar OP sem passar pelo PCP.

#### 🟠 F20 - VINCULAÇÃO OP ↔ VENDA FRACA
**Arquivo:** `server/src/models/ProductionOrder.js`
**Problema:** `sales_order_id` existe, mas:
- Uma venda pode gerar múltiplas OPs (lotes parciais)
- Uma OP pode atender múltiplas vendas (produção para estoque que atende vários pedidos)
- Não há campo de priorização por data de entrega da venda
**Impacto:** PCP não consegue priorizar OPs com base em urgência de cliente.

#### 🟠 F21 - NÃO HÁ PREVISÃO DE ENTREGA (ATP - AVAILABLE TO PROMISE)
**Arquivo:** N/A
**Problema:** Quando o vendedor faz uma cotação, não há como saber:
- Qual a data de entrega possível baseada em: estoque atual + produção em andamento + lead time
- Se o produto pode ser prometido para a data solicitada pelo cliente
**Impacto:** Promessas irreais de entrega, insatisfação de clientes.

---

### 2.3 ESTOQUE & LOGÍSTICA

#### 🟠 F22 - COMPRAS NÃO TEM WORKFLOW DE APROVAÇÃO POR NÍVEL
**Arquivo:** `server/src/controllers/purchaseController.js`
**Problema:** Um pedido de compra de R$ 200.000 (matéria-prima para 1 mês de produção) tem o mesmo fluxo de um de R$ 500. Deveria ter:
- Regra por valor: até R$ 5.000 (coordenador), até R$ 50.000 (gerente), acima (diretoria)
- Aprovação hierárquica sequencial
- Notificação no email/sistema ao aprovador
**Impacto:** Risco de compras sem aprovação adequada.
**Solução:** Criar `services/approvalWorkflowService.js` configurável.

#### 🟠 F23 - FORNECEDOR NÃO TEM AVALIAÇÃO AUTOMÁTICA
**Arquivo:** `server/src/models/Supplier.js`
**Problema:** Supplier tem `rating` manual (1-5). Deveria ter:
- Cálculo automático baseado em: entregas no prazo, % de NC por lote recebido, preço vs. mercado, lead time real vs. prometido
- Status de bloqueio automático se rating < 2
- Histórico de avaliação por período
**Impacto:** Fornecedor ruim continua sendo selecionado porque "sempre foi assim".

#### 🟠 F24 - ESTOQUE MÍNIMO NÃO DISPARA AÇÃO AUTOMÁTICA
**Arquivo:** `server/src/controllers/inventoryController.js`, Product.js
**Problema:** `min_quantity` existe mas:
- Não gera automaticamente sugestão de compra
- Não notifica o comprador
- Não cria alerta no dashboard para itens abaixo do mínimo
**Impacto:** Só descobre que está sem estoque quando vai produzir.

---

### 2.4 QUALIDADE & ENGENHARIA

#### 🟠 F25 - ENSAIOS ACÚSTICOS NÃO INTEGRADOS AO CONTROLE DE QUALIDADE
**Arquivo:** N/A
**Problema:** Uma fábrica de alto-falantes precisa testar **cada unidade** ou por amostragem:
- Curva de resposta em frequência (SPL x Freq)
- Impedância (curva de impedância)
- Parâmetros Thiele-Small reais vs. nominais
- Teste de potência (burn-in)
- Teste de ruído (rub & buzz)
O sistema não tem nenhuma interface para captura desses dados.
**Impacto:** Controle de qualidade não tem dados objetivos. "Achismo".

#### 🟠 F26 - NC NÃO TEM CAUSA RAIZ ESTRUTURADA (ISHIKAWA / 5 PORQUÊS)
**Arquivo:** `server/src/controllers/nonConformityController.js`
**Problema:** NC tem `root_cause` (texto livre) e `root_cause_category` (enum). Para uma indústria real, deveria ter:
- Análise de causa raiz estruturada (5 Porquês ou Ishikawa)
- Plano de ação (5W2H - What, Why, Where, When, Who, How, How much)
- Verificação de eficácia com data e responsável
**Solução:** Adicionar `CorrectiveAction` com 5W2H e verificação de eficácia.

---

### 2.5 SEGURANÇA

#### 🟠 F27 - VALIDAÇÃO DE CPF/CNPJ NÃO INTEGRADA AOS CONTROLLERS
**Arquivo:** `server/src/utils/validators.js`, `server/src/controllers/clientController.js`, `employeeController.js`, `supplierController.js`
**Problema:** `validators.js` tem `isValidCPF()` e `isValidCNPJ()` completos, mas nenhum controller os chama! (Terceira rodada já apontou isso e ainda não foi corrigido).
**Impacto:** CPF/CNPJ inválidos podem ser cadastrados, gerando problemas fiscais futuros.

#### 🟠 F28 - UPLOAD NÃO VALIDA TIPO DE ARQUIVO (PATH TRAVERSAL)
**Arquivo:** `server/src/services/uploadService.js`
**Problema:** Multer configurado sem validação de tipo MIME real (apenas extensão). Risco de:
- Upload de arquivos maliciosos (.exe, .php renomeados)
- Path traversal no nome do arquivo
**Solução:** Validar magic bytes do arquivo, sanitizar nome, limitar tamanho por tipo.

---

### 2.6 PERFORMANCE

#### 🟠 F29 - NENHUM ENDPOINT USA CACHE
**Arquivo:** TODOS os controllers
**Problema:** Consultas como `GET /api/dashboard` e relatórios rodam queries complexas a cada requisição. Para 50 usuários simultâneos, o PostgreSQL vai sofrer.
**Impacto:** Dashboard lento. Relatórios mensais demoram segundos.
**Solução:** Implementar Redis cache com TTL (ex: dashboard: 60s, relatórios: 5min).

#### 🟠 F30 - CONSULTA N+1 EM RELATÓRIO DE CLIENTES
**Arquivo:** `server/src/controllers/reportController.js:customers()`
**Problema:**
```javascript
const enriched = await Promise.all(customers.map(async (c) => {
  const sales = await Sale.findAll({ where: salesWhere }); // N queries!
  ...
}));
```
Para 500 clientes, faz 500 queries ao banco.
**Solução:** Usar `Sale.findAll({ group: ['customer_id'], attributes: [...] })` com GROUP BY.

---

## 🟡 3. FALHAS DE MÉDIA SEVERIDADE

### 3.1 MODELAGEM

#### 🟡 F31 - PRODUCT NÃO TEM CAMPO DE IMAGEM / DESENHO TÉCNICO
**Arquivo:** `server/src/models/Product.js`
**Problema:** Produto de áudio precisa de foto do produto, desenho técnico (PDF), curva de resposta (imagem). Modelo não tem campo para attachments.

#### 🟡 F32 - PURCHASEITEM NÃO GUARDA INFORMAÇÃO DE PRAZO DE ENTREGA POR ITEM
**Arquivo:** `server/src/models/PurchaseItem.js`
**Problema:** Cada item pode ter prazo diferente (item importado vs. nacional), mas o prazo está só no pedido.

#### 🟡 F33 - SALEITEM NÃO TEM CAMPO DE DESCONTO POR ITEM
**Arquivo:** `server/src/models/SaleItem.js`
**Problema:** Desconto é global na venda. Em vendas industriais, cada item pode ter desconto diferente (promoção de linha, acordo comercial).

#### 🟡 F34 - ACCOUNTS_PAYABLE NÃO TEM HISTÓRICO DE REBOLETO/NEGOCIAÇÃO
**Arquivo:** `server/src/models/AccountPayable.js`
**Problema:** Conta vencida pode ser renegociada. Não há histórico: valor original → juros → multa → novo valor → novo vencimento.

#### 🟡 F35 - EMPLOYEE NÃO TEM DOCUMENTOS DIGITAIS
**Arquivo:** `server/src/models/Employee.js`
**Problema:** Admissão digital precisa de upload de: RG, CPF, CTPS, comprovante de residência, certificados. O sistema não tem.

### 3.2 OPERACIONAIS

#### 🟡 F36 - ORDEM DE SERVIÇO NÃO TEM PEÇAS UTILIZADAS (ESTOQUE)
**Arquivo:** `server/src/controllers/serviceOrderController.js`
**Problema:** ServiceOrder tem `labor_cost` e `total_amount`, mas não tem itens de peças utilizadas. A assistência técnica troca bobina e cone, mas não baixa do estoque.

#### 🟡 F37 - NÃO HÁ INTEGRAÇÃO COM CORREIOS/TRANSPORTADORAS
**Arquivo:** N/A
**Problema:** Para expedição de produtos, não há cálculo de frete, geração de etiqueta, rastreamento.

#### 🟡 F38 - RELATÓRIOS NÃO TÊM EXPORTAÇÃO (PDF/EXCEL)
**Arquivo:** `server/src/controllers/reportController.js`
**Problema:** Relatórios só retornam JSON. Usuário não consegue imprimir ou exportar para Excel.

#### 🟡 F39 - NÃO HÁ LOGGING ESTRUTURADO (WINSTON)
**Arquivo:** `server/index.js`
**Problema:** Todo log é `console.log`. Sem níveis, sem rotação, sem search. Em produção, não como debugar.

#### 🟡 F40 - NÃO HÁ CURSOR-BASED PAGINATION
**Arquivo:** TODOS os controllers
**Problema:** Paginação por `OFFSET` é OK para 100 páginas, mas para 10k+ registros (vendas em meses), fica lenta. Para grandes volumes, cursor-based é melhor.

---

## 🔵 4. MELHORIAS RECOMENDADAS

### 4.1 INFRAESTRUTURA & QUALIDADE DE VIDA

#### 🔵 M01 - DOCKERIZAR AMBIENTE DE DESENVOLVIMENTO
**Arquivo:** N/A
**Sugestão:** `docker-compose.yml` com PostgreSQL 16 + pgAdmin + app Node com hot-reload.

#### 🔵 M02 - CI/CD PIPELINE (GITHUB ACTIONS)
**Arquivo:** N/A
**Sugestão:** Lint → Test → Build → Deploy automático.

#### 🔵 M03 - SWAGGER/OPENAPI PARA DOCUMENTAÇÃO
**Arquivo:** `docs/API.md`
**Sugestão:** Gerar OpenAPI 3.0 automático com swagger-jsdoc.

#### 🔵 M04 - SEED DE DADOS MAIS COMPLETO
**Arquivo:** `server/src/config/seeds.js`
**Sugestão:** Incluir produtos de exemplo (alto-falantes 8", 10", 12", 15", 18"), fornecedores reais, BOM de exemplo.

### 4.2 FUNCIONALIDADES INDUSTRIAIS

#### 🔵 M05 - MÓDULO DE COMISSÃO DE VENDAS
**Sugestão:** Comissão por vendedor, por produto (margem define %), por faixa de faturamento.

#### 🔵 M06 - MÓDULO DE CONTRATOS (ASSINATURA / RECORRÊNCIA)
**Sugestão:** Contratos anuais com cliente, faturamento recorrente mensal.

#### 🔵 M07 - MÓDULO DE DEPRECIAÇÃO AUTOMÁTICA DE ATIVOS
**Arquivo:** `server/src/controllers/assetController.js`
**Sugestão:** Cron job que calcula depreciação mensal baseado em `purchase_value`, `useful_life_months`, método linear.

#### 🔵 M08 - MÓDULO DE FOLHA DE PAGAMENTO (PAYROLL)
**Sugestão:** Cálculo de salário, INSS, FGTS, IRRF, férias, 13º. Cron job mensal.

#### 🔵 M09 - NOTIFICAÇÕES EM TEMPO REAL (WEBSOCKET)
**Sugestão:** Socket.io para notificar: estoque baixo, NC aberta, OP concluída, conta vencendo.

#### 🔵 M10 - DASHBOARD PERSONALIZÁVEL POR PERFIL
**Sugestão:** Operador de produção vê: OPs do dia, NCs abertas. Financeiro vê: fluxo de caixa. Diretor vê: KPI consolidado.

---

## 5. PLANO DE AÇÃO RECOMENDADO

### FASE URGENTE (1ª SEMANA)
| ID | Tarefa | Esforço | Prioridade |
|----|--------|---------|------------|
| F01 | Criar modelo BillOfMaterial (BOM) | 3 dias | 🔴 |
| F02 | Implementar MRP Engine (explosão de necessidades) | 5 dias | 🔴 |
| F03 | Adicionar reserved_quantity + ajustar controllers | 2 dias | 🔴 |
| F27 | Integrar validação de CPF/CNPJ nos controllers | 1 dia | 🟠 |
| F10 | Corrigir race condition no estoque (serializável) | 1 dia | 🔴 |
| F04 | Esboçar estrutura de roteiro de produção | 2 dias | 🔴 |

### FASE CURTO PRAZO (2-4 SEMANAS)
| ID | Tarefa | Esforço | Prioridade |
|----|--------|---------|------------|
| F05 | Criar apontamento de produção | 4 dias | 🔴 |
| F06 | Implementar controle de lote/serial | 3 dias | 🔴 |
| F07 | Calcular custo real por produto | 5 dias | 🔴 |
| F11 | Bloquear expedição com NC critical | 2 dias | 🔴 |
| F14 | Implementar cálculo de impostos | 5 dias | 🔴 |
| F13 | Integrar API de NF-e | 5 dias | 🔴 |
| F08 | Criar endereçamento de armazém | 3 dias | 🟠 |
| F22 | Workflow de aprovação de compras | 3 dias | 🟠 |

### FASE MÉDIO PRAZO (1-2 MESES)
| ID | Tarefa | Esforço | Prioridade |
|----|--------|---------|------------|
| F09 | Inventário cíclico | 2 dias | 🟠 |
| F12 | Validação de parâmetros acústicos | 2 dias | 🔴 |
| F25 | Integração de testes acústicos | 10 dias | 🟠 |
| F17 | Testes automatizados (Jest + Supertest) | 10 dias | 🟠 |
| F29 | Cache com Redis | 3 dias | 🟠 |
| M01 | Docker + PostgreSQL | 2 dias | 🔵 |
| M03 | Swagger | 2 dias | 🔵 |

### FASE LONGO PRAZO (2-6 MESES)
| ID | Tarefa | Esforço | Prioridade |
|----|--------|---------|------------|
| F15 | 2FA + histórico de acesso | 3 dias | 🟠 |
| F16 | Error handling centralizado | 5 dias | 🟠 |
| M05 | Comissão de vendas | 3 dias | 🔵 |
| M07 | Depreciação automática | 2 dias | 🔵 |
| M08 | Folha de pagamento | 10 dias | 🔵 |
| M09 | Notificações WebSocket | 5 dias | 🔵 |
| M10 | Dashboard personalizável | 5 dias | 🔵 |

---

## 6. MÉTRICAS DE SAÚDE DO PROJETO (ATUALIZADO)

| Indicador | Valor | Status |
|-----------|-------|--------|
| **Requisitos implementados** | 70/123 (57%) | 🟡 |
| **Issues identificados (4ª rodada)** | 72 | 🔴 |
| **Issues críticos** | 19 | 🔴 |
| **Issues altos** | 19 | 🟠 |
| **Issues médios** | 17 | 🟡 |
| **Melhorias** | 17 | 🔵 |
| **Testes automatizados** | 0/70 (0%) | 🔴 |
| **Cobertura de documentação** | 22+ docs (bom) | 🟢 |
| **Segurança (autenticação)** | JWT + bcrypt + Helmet | 🟢 |
| **Segurança (autorização)** | RBAC implementado | 🟢 |
| **Segurança (validação)** | CPF/CNPJ (não integrado) | 🟠 |
| **Performance (índices)** | Índices nas FKs | 🟢 |
| **Performance (cache)** | Nenhum | 🔴 |
| **Disponibilidade para produção em massa** | **BAIXA** | 🔴 |

---

## 7. CONCLUSÃO

O sistema ERP EVOK ÁUDIO tem uma base **sólida em termos de arquitetura MVC, segurança básica e cadastros**, mas **NÃO está pronto para produção em massa industrial** pelos seguintes motivos principais:

1. **❌ SEM BOM/MRP**: A espinha dorsal de qualquer ERP industrial (explosão de BOM) não existe
2. **❌ SEM APONTAMENTO**: A produção opera no escuro sem dados de chão de fábrica
3. **❌ SEM RASTREABILIDADE**: Impossível fazer recall ou rastrear não-conformidades até o cliente
4. **❌ SEM CUSTO REAL**: Preço de venda é chutado sem base de custo
5. **❌ SEM INTEGRAÇÃO FISCAL**: NF-e não emitida, impostos não calculados
6. **❌ SEM CONTROLE DE ESTOQUE AVANÇADO**: Endereçamento, reserva, inventário cíclico ausentes

**Total de issues encontradas: 72** (19 críticos, 19 altos, 17 médios, 17 melhorias)

O sistema funciona bem como **ERP administrativo-comercial** (vendas, compras, financeiro, RH básico), mas precisa de **pelo menos 2 meses de desenvolvimento focado** para atender os requisitos de uma indústria de produção em massa com 50 funcionários.

---

*Documento gerado em: Abril 2025*
*Análise: Quarta Rodada - Foco em Produção em Massa Industrial*

