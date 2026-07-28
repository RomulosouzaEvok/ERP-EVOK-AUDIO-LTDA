# ANÁLISE PROFUNDA - TERCEIRA RODADA
## Foco: Regras de Negócio, Segurança Avançada, Edge Cases e Omissões vs Requisitos

**Data:** $(date +%Y-%m-%d)
**Versão do Código:** 2.0.0 (MySQL/Sequelize)
**Total de Arquivos Analisados:** 74+ (21 models, 25 controllers, 22 routes, 4 services, 2 middlewares)

---

## SUMÁRIO DOS ACHADOS

| Categoria | Qtd | Crítico | Alto | Médio | Baixo |
|-----------|-----|---------|------|-------|-------|
| 🔴 Segurança | 5 | 2 | 2 | 1 | 0 |
| 🔵 Lógica/Modelagem | 8 | 1 | 3 | 3 | 1 |
| 🟡 Regras de Negócio | 7 | 2 | 3 | 2 | 0 |
| 🟠 Edge Cases | 6 | 0 | 2 | 3 | 1 |
| ⚪ Omissões vs Requisitos | 5 | 0 | 2 | 3 | 0 |
| **TOTAL** | **31** | **5** | **12** | **12** | **2** |

---

## 🔴 SEGURANÇA

### CRÍTICO

#### S1 - [CRÍTICO] Injeção SQL via sequelize.literal() em múltiplos controllers
**Arquivos:** `saleController.js`, `purchaseController.js`, `productionOrderController.js`, `productController.js`
**Problema:** Uso de `sequelize.literal(`quantity - ${item.quantity}`)` permite injeção de SQL se os valores não forem sanitizados. Embora sequelize.literal escape strings, números inteiros passados diretamente via template string podem ser vulneráveis se o valor vier modificado.
**Impacto:** Manipulação indevida de estoque, corrupção de dados.
**Correção:** Usar `sequelize.literal('quantity - :qty', { qty: item.quantity })` ou `increment`/`decrement` do Sequelize.

#### S2 - [CRÍTICO] Auditoria e rastreabilidade insuficientes
**Arquivos:** Todos os controllers
**Problema:** Apenas o módulo de auditoria foi criado mas NENHUM controller registra logs de auditoria. Alterações críticas (preço, status, exclusão) não são rastreadas.
**Impacto:** Impossibilidade de audit trail forense em caso de fraude ou erro.
**Correção:** Integrar `AuditLog.register()` em todas as operações de create, update, delete.

### ALTO

#### S3 - [ALTO] Exposição de dados sensíveis em listagens
**Arquivo:** `employeeController.js` - método `list()`
**Problema:** Originalmente a listagem expunha salary, bank_account, pix_key, pis_pasep, ctps. Foi corrigido parcialmente, mas `getById()` ainda expõe bank_account, pix_key para usuários não-admin.
**Impacto:** Vazamento de dados bancários de funcionários.
**Correção:** Criar atributos diferenciados por role (admin vê tudo, operador vê apenas dados básicos).

#### S4 - [ALTO] Rate limiting insuficiente
**Arquivo:** `index.js`
**Problema:** Apenas login tem rate limit (10/15min). API geral tem 100/15min, mas endpoints críticos como criação de vendas, compras e usuários não têm proteção individual.
**Impacto:** Possibilidade de ataques de força bruta ou DoS em endpoints específicos.
**Correção:** Adicionar rate limiters específicos para POST /api/sales, POST /api/purchases, POST /api/users.

### MÉDIO

#### S5 - [MÉDIO] UploadService sem sanitização de nome de arquivo
**Arquivo:** `uploadService.js`
**Problema:** O nome do arquivo original não é sanitizado, apenas prefixado com timestamp. Path traversal não é verificado.
**Impacto:** Possibilidade de upload de arquivos com nomes maliciosos.
**Correção:** Sanitizar `file.originalname` removendo caracteres especiais e path separators.

---

## 🔵 LÓGICA E MODELAGEM

### CRÍTICO

#### L1 - [CRÍTICO] Máquina de estados de vendas sem transição para "canceled" a partir de "quote"
**Arquivo:** `saleController.js` - `updateStatus()`
**Problema:** A transição `quote → canceled` está definida, mas se uma venda em status `quote` for cancelada, o estoque não é restaurado (porque a venda em status `quote` nunca deu baixa no estoque). Porém, vendas em `quote` podem ter itens reservados? Não há lógica de reserva. Isso cria inconsistência: um item pode ser vendido para dois clientes diferentes (um em quote, outro confirmado) e ambos passarem na validação de estoque.
**Impacto:** Venda duplicada do mesmo item em estoque.
**Correção:** Implementar sistema de reserva de estoque para quotes, ou bloquear criação de quote sem confirmação.

### ALTO

#### L2 - [ALTO] Cálculo de parcelas com erro de arredondamento
**Arquivo:** `saleController.js` - `create()`
**Problema:** O cálculo de parcelas usa `Math.floor` para a base e `Math.round` para o resto. Isso pode causar discrepância de centavos entre o total das parcelas e o valor líquido da venda. Exemplo: R$ 100,00 em 3 parcelas → base = 33,33, resto = 0,01 → parcelas: 33,33 + 33,33 + 33,34 = 100,00. Correto, mas o `Math.round` seguido de `toFixed(2)` pode causar inconsistências.
**Impacto:** Pequenas diferenças contábeis que se acumulam.
**Correção:** Usar `(totalNet * 100 - baseInstallment * 100 * (installments - 1)) / 100` para a última parcela.

#### L3 - [ALTO] Falta de validação de CPF/CNPJ nos cadastros
**Arquivos:** `clientController.js`, `supplierController.js`, `employeeController.js`
**Problema:** CPF e CNPJ são aceitos sem validação de dígitos verificadores. Um CPF "000.000.000-00" é aceito.
**Impacto:** Dados inconsistentes, problemas fiscais com NFe.
**Correção:** Implementar validação de dígitos do CPF (11 dígitos) e CNPJ (14 dígitos) com algoritmo oficial.

#### L4 - [ALTO] AccountPayable sem supplier_id na criação de compra
**Arquivo:** `purchaseController.js` - `create()`
**Problema:** A conta a pagar é gerada APENAS no recebimento dos itens (receiveItems). Se o pedido for recebido parcialmente, não há conta a pagar. Também não há geração no momento da criação da compra.
**Impacto:** Fluxo financeiro desalinhado com o fluxo de compras.
**Correção:** Criar AccountPayable no momento da aprovação da compra (status → approved), não no recebimento.

### MÉDIO

#### L5 - [MÉDIO] Campo `cost_center` em AccountPayable não é preenchido
**Arquivo:** `financeController.js` - `createPayable()`
**Problema:** O campo `cost_center` existe no model mas nunca é preenchido na criação de contas a pagar.
**Impacto:** Impossibilidade de gerar relatórios por centro de custo.
**Correção:** Adicionar campo `cost_center` na validação e criação.

#### L6 - [MÉDIO] ProductionOrder sem validação de lead_time
**Arquivo:** `productionOrderController.js` - `create()`
**Problema:** A data de vencimento (due_date) é obrigatória, mas não há validação contra o lead_time do produto. Uma OP pode ser criada com prazo menor que o lead time do produto.
**Impacto:** Ordens de produção com prazo irrealista.
**Correção:** Validar se `due_date - start_date >= product.lead_time`.

#### L7 - [MÉDIO] Inconsistência de deleção lógica vs física
**Arquivos:** `categoryController.js`, `productController.js`, `clientController.js`
**Problema:**
- `Category.remove()` → `destroy()` (deleção física)
- `Product.remove()` → `update({ status: 'inactive' })` (deleção lógica)
- `Client.remove()` → `update({ status: 'inactive' })` (deleção lógica)
- `Supplier.remove()` → `update({ status: 'inactive' })` (deleção lógica)
**Impacto:** Inconsistência de comportamento.
**Correção:** Padronizar todas como deleção lógica (soft delete) com campo `active`/`status`.

### BAIXO

#### L8 - [BAIXO] Campo `address` no Supplier model não é usado corretamente
**Arquivo:** `supplierController.js` - `create()` e `update()`
**Problema:** O model Supplier tem campos `cep, street, number, complement, neighborhood, city, state` mas o controller trata `address` como campo único. A criação usa `address` mas a atualização usa campos separados.
**Impacto:** Endereços inconsistentes entre criação e edição.
**Correção:** Unificar o tratamento de endereço (usar campos separados).

---

## 🟡 REGRAS DE NEGÓCIO NÃO IMPLEMENTADAS

### CRÍTICO

#### R1 - [CRÍTICO] Reserva de estoque não implementada
**Arquivo:** `saleController.js`
**Requisito:** Em uma indústria, quando uma venda é criada como "quote" (orçamento), o estoque deve ser reservado para evitar que outro cliente compre o mesmo item.
**Status:** ❌ NÃO IMPLEMENTADO - Quotes não reservam estoque.
**Problema:** Dois orçamentos podem ser aprovados para o mesmo produto sem estoque suficiente.
**Correção:** Criar campo `reserved_quantity` em Product e somar ao validation.

#### R2 - [CRÍTICO] Cálculo de ICMS interestadual não implementado
**Arquivos:** `saleController.js`, `Customer.js`
**Requisito:** Para vendas interestaduais, o ICMS deve ser calculado com base na alíquota do estado de destino vs origem. Clientes têm `ind_final` (consumidor final) e `ind_ie` (contribuinte ICMS).
**Status:** ❌ NÃO IMPLEMENTADO - O preço da venda não considera ICMS.
**Problema:** Impossibilidade de emitir NFe com valores corretos de imposto.
**Correção:** Implementar cálculo de ICMS com base nos campos do cliente e produto.

### ALTO

#### R3 - [ALTO] Workflow de aprovação de compras com níveis
**Arquivo:** `purchaseController.js`
**Requisito:** Compras acima de R$ 5.000 devem ser aprovadas pelo supervisor; acima de R$ 50.000 pela diretoria.
**Status:** ❌ NÃO IMPLEMENTADO - A transição `pending → approved` é livre para qualquer usuário com permissão.
**Correção:** Implementar aprovação por níveis baseada no valor total + role do usuário.

#### R4 - [ALTO] Notificações de estoque baixo (automáticas)
**Arquivo:** `intelligentAuditorController.js`
**Requisito:** Quando um produto atinge o estoque mínimo, uma notificação deve ser gerada automaticamente (email/sistema).
**Status:** ⚠️ PARCIAL - O auditor identifica estoque baixo mas não envia notificações.
**Problema:** O usuário precisa acessar o relatório manualmente para saber.
**Correção:** Implementar sistema de notificações (email, in-app) ao detectar low_stock.

#### R5 - [ALTO] Comissão de vendas
**Arquivo:** `saleController.js`, `Employee.js`
**Requisito:** Vendedores devem receber comissão baseada no valor das vendas (percentual configurável por produto ou vendedor).
**Status:** ❌ NÃO IMPLEMENTADO - Não há campo de comissão em Employee nem cálculo em Sale.
**Correção:** Adicionar `commission_rate` em Employee e calcular comissão na criação da venda.

### MÉDIO

#### R6 - [MÉDIO] Depreciação automática de ativos
**Arquivo:** `assetController.js`
**Requisito:** Ativos com `useful_life_months` definido devem ter depreciação calculada automaticamente.
**Status:** ❌ NÃO IMPLEMENTADO - `current_value` nunca é atualizado.
**Correção:** Implementar job agendado (cron) para calcular depreciação mensal.

#### R7 - [MÉDIO] Bloqueio de funcionário com múltiplos vínculos ativos
**Arquivo:** `employeeController.js`
**Requisito:** Um CPF não pode ter mais de um funcionário ativo ao mesmo tempo.
**Status:** ⚠️ PARCIAL - O unique constraint no CPF impede duplicatas, mas a inativação não valida se o funcionário tem ordens de serviço ou produção em aberto.
**Correção:** Validar vínculos ativos antes de permitir reativação.

---

## 🟠 EDGE CASES

### ALTO

#### E1 - [ALTO] Timezone handling em datas
**Arquivos:** Todos os controllers
**Problema:** `new Date()` é usado extensivamente sem considerar fuso horário. O servidor pode estar em UTC enquanto o usuário está em GMT-3 (Brasil).
**Impacto:** Relatórios de vendas do dia podem incluir datas do dia anterior ou seguinte.
**Correção:** Usar `moment-timezone` ou `date-fns-tz` para normalizar datas para o fuso do cliente (America/Sao_Paulo).

#### E2 - [ALTO] Concorrência em atualização de estoque
**Arquivos:** `saleController.js`, `purchaseController.js`, `productController.js`
**Problema:** O uso de `sequelize.literal('quantity - X')` dentro de transações ainda pode causar race conditions se duas requisições simultâneas tentarem alterar o mesmo produto. A leitura do estoque (`product.quantity`) e a atualização não são atômicas.
**Impacto:** Estoque negativo ou inconsistente sob alta concorrência.
**Correção:** Usar `sequelize.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE })` ou `sequelize.literal` com `quantity = quantity - :qty` diretamente no SQL.

### MÉDIO

#### E3 - [MÉDIO] Transições de status inválidas em serviceOrder
**Arquivo:** `serviceOrderController.js` - `updateStatus()`
**Problema:** A transição `waiting_parts → canceled` é permitida, mas não restaura o status do equipamento nem notifica o cliente.
**Impacto:** Cliente não é informado sobre cancelamento.
**Correção:** Adicionar notificação ao cliente e registro de motivo no cancelamento.

#### E4 - [MÉDIO] Deleção de categoria com produtos associados
**Arquivo:** `categoryController.js` - `remove()`
**Problema:** A deleção é bloqueada se houver produtos vinculados, mas não verifica se os produtos estão ativos ou inativos. Um produto inativo ainda impede a deleção.
**Impacto:** Categorias não podem ser limpas mesmo sem uso ativo.
**Correção:** Contar apenas produtos com status 'active'.

#### E5 - [MÉDIO] Venda com valor zero após desconto
**Arquivo:** `saleController.js` - `create()`
**Problema:** Se `totalAmount - parsedDiscount = 0`, a venda é criada com valor zero. Isso pode ser um edge case válido (brinde), mas gera contas a receber com valor zero.
**Impacto:** Relatórios financeiros distorcidos.
**Correção:** Validar se `totalAmount - parsedDiscount > 0` ou permitir com flag específica.

### BAIXO

#### E6 - [BAIXO] Número de ordem de serviço com colisão
**Arquivo:** `serviceOrderController.js` - `create()`
**Problema:** O número é gerado como `OS-YYYYMMDD-XXX` onde XXX é baseado em COUNT do dia. Se duas requisições forem simultâneas, podem gerar o mesmo número.
**Impacto:** Unique constraint violation.
**Correção:** Usar UUID ou lock pessimista na geração.

---

## ⚪ OMISSÕES VS REQUISITOS

### ALTO

#### O1 - [ALTO] Módulo de Folha de Pagamento (Payroll) não implementado
**Documento:** `docs/rh/02-FOLHA_PAGAMENTO.md`
**Requisito:** Cálculo de salário líquido (INSS, IRRF, FGTS), férias, 13º salário, rescisão.
**Status:** ❌ NÃO IMPLEMENTADO - O model Employee tem dados bancários e salário, mas não há cálculo de folha.
**Impacto:** O sistema não pode ser usado como ERP completo de RH.
**Correção:** Desenvolver módulo de payroll com cálculos de encargos.

#### O2 - [ALTO] Integração fiscal (NFe) não implementada
**Documento:** `docs/comercial/01-VENDAS.md`
**Requisito:** Emissão de NFe, DANFE, cálculo de impostos (ICMS, IPI, PIS, COFINS).
**Status:** ❌ NÃO IMPLEMENTADO - O model Sale tem campos `nfe_number`, `nfe_status`, `nfe_key` mas não há integração com SEFAZ.
**Impacto:** O sistema não emite notas fiscais.
**Correção:** Integrar com API de NFe (ex: TecnoSpeed, Webmania).

### MÉDIO

#### O3 - [MÉDIO] Módulo de Logística/Expedição não implementado
**Documento:** `docs/logistica/01-EXPEDICAO.md`
**Requisito:** Controle de entregas, fretes, rastreamento, romaneio.
**Status:** ❌ NÃO IMPLEMENTADO - Não há models, controllers ou rotas para logística.
**Impacto:** Processo de expedição manual/desintegrado.
**Correção:** Desenvolver módulo de expedição com cálculo de frete e rastreamento.

#### O4 - [MÉDIO] Módulo Tributário não integrado ao sistema
**Documento:** `docs/tributario/01-REGIMES.md`
**Requisito:** Cálculo automático de tributos por regime (Simples Nacional, Lucro Presumido, Lucro Real).
**Status:** ❌ NÃO IMPLEMENTADO - Os docs existem mas não há código de integração tributária.
**Impacto:** Impossibilidade de calcular impostos automaticamente nas vendas.
**Correção:** Implementar engine de cálculo tributário baseada no regime do cliente.

#### O5 - [MÉDIO] Módulo de Qualidade (Testes Acústicos) não integrado
**Documento:** `docs/qualidade/02-TESTES_ACUSTICOS.md`
**Requisito:** Registro de parâmetros Thiele-Small (Fs, Qms, Qes, Qts, Vas) dos alto-falantes no controle de qualidade.
**Status:** ⚠️ PARCIAL - O model Product tem campos `ts_params_*` mas não há fluxo de qualidade vinculado à produção.
**Impacto:** Parâmetros TS não são preenchidos durante a produção.
**Correção:** Criar modelo `AcousticTest` vinculado a ProductionOrder e Product.

---

## 📋 PLANO DE AÇÃO CORRETIVO

### Prioridade 1 - Crítico (Corrigir Imediatamente)

| ID | Ação | Arquivo | Esforço |
|----|------|---------|---------|
| S1 | Substituir `sequelize.literal()` por `increment`/`decrement` | 4 controllers | 2h |
| S2 | Integrar AuditLog.register() em todos os controllers | 22 controllers | 8h |
| L1 | Implementar sistema de reserva de estoque | saleController.js | 4h |
| R1 | Criar campo `reserved_quantity` e lógica de reserva | Product model + saleController | 6h |
| R2 | Implementar cálculo de ICMS interestadual | saleController.js | 8h |

### Prioridade 2 - Alto (Corrigir em 1 semana)

| ID | Ação | Arquivo | Esforço |
|----|------|---------|---------|
| S3 | Implementar atributos por role no employeeController | employeeController.js | 2h |
| S4 | Adicionar rate limiters específicos | index.js | 1h |
| L2 | Corrigir cálculo de parcelas | saleController.js | 1h |
| L3 | Implementar validação de CPF/CNPJ | utils/validators.js | 3h |
| L4 | Gerar AccountPayable na aprovação da compra | purchaseController.js | 2h |
| R3 | Workflow de aprovação de compras | purchaseController.js | 6h |
| R4 | Sistema de notificações | intelligentAuditorController.js | 4h |
| E1 | Implementar timezone handling | utils/date.js | 2h |
| E2 | Corrigir race condition no estoque | saleController.js | 3h |

### Prioridade 3 - Médio (Corrigir em 1 mês)

| ID | Ação | Arquivo | Esforço |
|----|------|---------|---------|
| S5 | Sanitizar upload de arquivos | uploadService.js | 1h |
| L5 | Adicionar cost_center no AccountPayable | financeController.js | 1h |
| L6 | Validar lead_time na OP | productionOrderController.js | 1h |
| L7 | Padronizar soft delete | categoryController.js | 2h |
| R5 | Implementar comissão de vendas | saleController.js | 6h |
| R6 | Depreciação automática de ativos | assetController.js | 4h |
| O1 | Módulo de Folha de Pagamento | Novo | 40h |
| O2 | Integração NFe | Novo | 60h |

### Prioridade 4 - Baixo (Melhorias Contínuas)

| ID | Ação | Arquivo | Esforço |
|----|------|---------|---------|
| L8 | Unificar tratamento de endereço | supplierController.js | 1h |
| E3 | Notificação de cancelamento OS | serviceOrderController.js | 2h |
| E4 | Validar apenas produtos ativos | categoryController.js | 0.5h |
| E5 | Validar venda com valor zero | saleController.js | 0.5h |
| E6 | Usar UUID para OS | serviceOrderController.js | 1h |
| O3 | Módulo de Logística | Novo | 30h |
| O4 | Módulo Tributário | Novo | 50h |
| O5 | Testes Acústicos na Qualidade | Novo | 10h |

---

## 📊 MÉTRICAS DE SAÚDE DO PROJETO

### Cobertura de Requisitos por Módulo

| Módulo | Requisitos | Implementados | % | Status |
|--------|------------|---------------|---|--------|
| Autenticação | 5 | 5 | 100% | ✅ |
| Usuários | 5 | 5 | 100% | ✅ |
| Produtos | 8 | 7 | 88% | ✅ |
| Clientes | 6 | 5 | 83% | ✅ |
| Fornecedores | 6 | 5 | 83% | ✅ |
| Vendas | 10 | 6 | 60% | ⚠️ |
| Compras | 8 | 6 | 75% | ⚠️ |
| Financeiro | 10 | 7 | 70% | ⚠️ |
| Estoque | 6 | 5 | 83% | ✅ |
| Produção | 8 | 6 | 75% | ⚠️ |
| RH | 12 | 6 | 50% | ⚠️ |
| Patrimônio | 8 | 6 | 75% | ⚠️ |
| Qualidade | 10 | 1 | 10% | ❌ |
| Tributário | 8 | 0 | 0% | ❌ |
| Logística | 8 | 0 | 0% | ❌ |
| Jurídico | 5 | 0 | 0% | ❌ |
| **TOTAL** | **123** | **70** | **57%** | ⚠️ |

### Análise de Risco

| Risco | Probabilidade | Impacto | Nível |
|-------|--------------|---------|-------|
| Estoque negativo por concorrência | Média | Alto | 🔴 Crítico |
| Fraude sem audit trail | Baixa | Crítico | 🔴 Crítico |
| Inconsistência contábil (parcelas) | Média | Médio | 🟡 Alto |
| Vazamento de dados bancários | Baixa | Alto | 🟡 Alto |
| Perda de dados por soft delete inconsistente | Média | Médio | 🟡 Médio |
| Não conformidade fiscal (NFe) | Alta | Crítico | 🔴 Crítico |

---

## RECOMENDAÇÕES ESTRATÉGICAS

### 1. Arquitetura
- **Micro-serviços futuros:** Separar módulos críticos (Financeiro, Fiscal) em serviços independentes
- **Event-driven:** Implementar fila de eventos (RabbitMQ/Redis) para notificações e logs
- **API Gateway:** Implementar gateway para rate limiting, autenticação e logging centralizado

### 2. Qualidade de Código
- **Testes:** Implementar Jest + Supertest para testes de integração (mínimo 80% de cobertura)
- **Linting:** Adicionar ESLint + Prettier com regras de segurança
- **TypeScript:** Migrar para TypeScript para catching de erros em tempo de compilação

### 3. DevOps
- **CI/CD:** GitHub Actions para testes automáticos e deploy
- **Docker:** Containerizar aplicação e banco de dados
- **Variáveis de Ambiente:** Garantir que todas as configs sensíveis usem .env (JWT_SECRET, DB_PASSWORD)

### 4. Segurança
- **JWT:** Implementar refresh tokens e rotação de chaves
- **2FA:** Adicionar autenticação de dois fatores para admin
- **Criptografia:** Criptografar dados sensíveis (PIS, CTPS, dados bancários) em repouso

---

## CONCLUSÃO

O projeto ERP EVOK ÁUDIO possui **70 funcionalidades implementadas** de **123 requisitos mapeados** (57% de cobertura). Os módulos mais críticos (Tributário, Logística, Jurídico) ainda não foram iniciados.

**Pontos fortes:**
- Estrutura de código limpa e consistente
- Uso correto de transações em operações críticas
- Models bem modelados com relacionamentos adequados
- Documentação extensa e detalhada

**Pontos fracos:**
- Falta de validações de dados (CPF, CNPJ, datas)
- Ausência de testes automatizados
- Segurança perimetral frágil (rate limiting, auditoria)
- Módulos fiscais e tributários não implementados

**Risco principal:** O sistema não pode ser usado em produção sem os módulos fiscal e tributário, pois não emite NFe nem calcula impostos.

---

*Documento gerado automaticamente pela Terceira Rodada de Análise Profunda*
*Próxima revisão recomendada: Após implementação das correções críticas*
