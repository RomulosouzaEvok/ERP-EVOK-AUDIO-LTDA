# Plano do Projeto - ERP EVOK ÁUDIO

## Visão Geral

Sistema ERP completo para **EVOK ÁUDIO** - indústria de alto-falantes e componentes de áudio.
Backend: Node.ts + Express + Sequelize + PostgreSQL.
Frontend: React (planejado).

---

## 1. Arquitetura do Projeto

```
erp-evok-audio/
├── server/                    # Backend Express (MVC)
│   ├── src/
│   │   ├── controllers/       # 22 controladores
│   │   ├── models/            # 18 modelos Sequelize
│   │   ├── routes/            # 19 arquivos de rotas
│   │   ├── middlewares/       # auth + errorHandler
│   │   ├── services/          # dashboard, reports, qrcode, upload
│   │   └── config/            # database.ts, seeds.ts
│   ├── config/                # db.ts (conexão PostgreSQL)
│   └── index.ts               # Entry point
├── docs/                      # Documentação completa
│   ├── ANALISE_PROFUNDA.md    # Análise de segurança e lógica
│   ├── API.md                 # Documentação da API
│   ├── USE_CASES.md           # Casos de uso
│   ├── DATABASE.md            # Modelagem de dados
│   ├── PLANO.md               # Este documento
│   ├── CRONOGRAMA_FASES_2_3.md
│   └── [modulos]/             # Docs por módulo
└── package.json
```

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão | Status |
|--------|------------|--------|--------|
| Backend | Node.ts | 18+ | ✅ |
| Framework | Express | 4.18 | ✅ |
| ORM | Sequelize | 6.37 | ✅ |
| Banco | PostgreSQL | 8.0+ | ✅ |
| Autenticação | JWT + bcryptjs | - | ✅ |
| Upload | Multer | 2.2 | ✅ |
| QR Code | qrcode | 1.5 | ✅ |
| Rate Limit | express-rate-limit | 8.6 | ✅ |
| Validação | express-validator | 7.0 | ✅ |
| Frontend | React | (pendente) | 🔧 |

## 3. Módulos Implementados

### ✅ Módulo 1: Autenticação e Usuários
- Login com JWT (com rate limit)
- Cadastro/registro de usuários
- 3 perfis: admin, operator, financial
- Controle de usuários ativos/inativos

### ✅ Módulo 2: Cadastros Base
- Clientes (com dados fiscais: CPF/CNPJ, IE, IM, regime tributário)
- Fornecedores (com avaliação e prazos)
- Produtos (com parâmetros Thiele-Small para alto-falantes)
- Categorias de produtos (soft delete implementado)
- Departamentos (com hierarquia e gestor)

### ✅ Módulo 3: Estoque e Inventário
- Controle de entrada/saída/ajuste
- Histórico completo de movimentações
- Alerta de estoque mínimo
- Inventário mobile com QR Code
- Leitura em lote (batch scan)
- Inventário por localização

### ✅ Módulo 4: Vendas
- Criação de pedidos (itens, descontos, parcelas)
- Controle de status (quote → confirmed → invoiced → canceled)
- Baixa automática de estoque
- Geração automática de contas a receber
- Validação de transições de status
- Restauração de estoque ao cancelar

### ✅ Módulo 5: Compras
- Pedidos de compra com itens
- Fluxo de aprovação (pending → approved → sent)
- Recebimento parcial/total de itens
- Atualização automática de estoque
- Geração automática de contas a pagar 🔄

### ✅ Módulo 6: Financeiro
- Contas a receber (originadas de vendas)
- Contas a pagar (manuais + automáticas de compras)
- Baixa de contas (receber/pagar)
- Fluxo de caixa por período
- Projeção financeira 30 dias
- Cobrança: controle de inadimplência

### ✅ Módulo 7: Produção
- Ordens de Produção (OP)
- Status: planned → released → in_progress → completed
- Controle de quantidade produzida
- Vinculação com ordens de venda
- Relatório de eficiência e pontualidade

### ✅ Módulo 8: Ordens de Serviço
- OS para assistência técnica
- Diagnóstico, serviço realizado, peças
- Cálculo de mão-de-obra + peças
- Controle de garantia (90 dias default)
- Relatório de desempenho

### ✅ Módulo 9: Patrimônio (Ativos)
- Cadastro completo com tag única
- QR Code para inventário mobile
- Controle por departamento/responsável
- Tipos: máquina, equipamento, ferramenta, móvel, veículo, TI
- Depreciação (valor atual x vida útil) - cálculo pendente

### ✅ Módulo 10: RH
- Funcionários com dados completos (CTPS, PIS, banco)
- Departamentos com hierarquia
- Vínculo com usuário do sistema
- Controle de turnos e regime de trabalho
- Folha de pagamento (modelo pendente)

### ✅ Módulo 11: Relatórios e Dashboard
- Dashboard com KPIs (vendas hoje/mês/ano)
- Relatórios de vendas, estoque, clientes, fluxo de caixa
- Relatório de produção e eficiência
- Serviço de relatórios genérico

### ✅ Módulo 12: Segurança e Auditoria
- JWT com expiração configurável
- Proteção Helmet
- Rate limiting
- CORS configurável
- Tratamento centralizado de erros
- Autorização por perfil (admin/operator/financial)

### ✅ Módulo 13: Qualidade (Pendente)
- Controle de qualidade (testes acústicos)
- Não conformidades (NC) - **modelo pendente**
- Certificações
- Testes de parâmetros Thiele-Small

### ✅ Módulo 14: Auditor Inteligente
- Análise de estoque (negativo, zerado, baixo, excessivo)
- Sugestão de reposição baseada em consumo
- Curva ABC de estoque
- Valuação financeira do estoque
- Relatório de acurácia

## 4. Modelos de Dados (18 implementados)

| Modelo | Tabela | Status |
|--------|--------|--------|
| User | users | ✅ |
| Customer | customers | ✅ |
| Category | product_categories | ✅ |
| Product | products | ✅ |
| Supplier | suppliers | ✅ |
| Purchase | purchase_orders | ✅ |
| PurchaseItem | purchase_order_items | ✅ |
| Sale | sales | ✅ |
| SaleItem | sale_items | ✅ |
| AccountReceivable | accounts_receivable | ✅ |
| AccountPayable | accounts_payable | ✅ |
| InventoryMovement | inventory_movements | ✅ |
| Department | departments | ✅ |
| Employee | employees | ✅ |
| ProductionOrder | production_orders | ✅ |
| ServiceOrder | service_orders | ✅ |
| Asset | assets | ✅ |

### Modelos Pendentes

| Modelo | Prioridade | Módulo |
|--------|------------|--------|
| NonConformity | Alta | Qualidade |
| MaintenanceOrder | Alta | Patrimônio |
| Payroll | Média | RH |
| Benefit | Média | RH |
| AuditLog | Alta | Administrativo/TI |
| Contract | Média | Jurídico |
| ShippingOrder | Média | Logística |
| Commission | Média | Vendas |

## 5. Correções e Melhorias Aplicadas (v2.0.0)

### Segurança
- ✅ Senha admin movida para variável de ambiente
- ✅ CORS restrito a localhost como fallback
- ✅ Validação de JWT_SECRET no startup

### Lógica de Negócio
- ✅ InventoryMovement com timestamps habilitados
- ✅ Asset controller usando 'tag' em vez de 'code'
- ✅ Validação de current_value no Asset
- ✅ Geração automática de AccountPayable ao receber compra
- ✅ Consistência payment_method/payment_type

### Modelagem
- ✅ Category com campo 'active' para soft delete
- ✅ CategoryController com soft delete em vez de destroy
- ✅ ClientController bloqueia inativação com vendas ativas

### Qualidade de Código
- ✅ DashboardService: imports não utilizados removidos
- ✅ Documentação atualizada (API.md, DATABASE.md, PLANO.md)
- ✅ Análise profunda documentada

## 6. Pendências e Roadmap

### Fase 2 - Prioridade Alta
- [ ] Modelo NonConformity (NC) para controle de qualidade
- [ ] Modelo MaintenanceOrder para manutenção de ativos
- [ ] Validação de dígitos de CPF/CNPJ
- [ ] Modelo AuditLog para rastreamento de alterações
- [ ] Notificações de estoque baixo (email/sistema)
- [ ] Workflow de aprovação de compras com níveis

### Fase 2 - Prioridade Média
- [ ] Cálculo de depreciação automática de ativos
- [ ] Comissão de vendas
- [ ] Módulo de folha de pagamento (Payroll)
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Logging estruturado (Winston)

### Fase 2 - Prioridade Baixa
- [ ] Frontend React
- [ ] Testes automatizados (Jest + Supertest)
- [ ] Remover dependência dependencia removida não utilizada
- [ ] Cursor-based pagination
- [ ] CI/CD pipeline

## 7. Segurança

### Implementado
- ✅ JWT com expiração (7 dias configurável)
- ✅ Bcrypt (10 rounds) para hash de senha
- ✅ Helmet para headers de segurança
- ✅ Rate limiting (login: 10/15min, API: 100/15min)
- ✅ CORS configurável por ambiente
- ✅ Tratamento de erros sem vazamento de informação
- ✅ Separação de perfis (admin/operator/financial)
- ✅ Proteção contra XSS via express-validator

### Recomendado
- 🔄 Implementar refresh tokens
- 🔄 Adicionar 2FA (opcional)
- 🔄 Rate limiting por endpoint específico
- 🔄 Auditoria de operações sensíveis (preço, salário, exclusão)

## 8. Performance

### Boas Práticas
- ✅ Paginação em todas as listagens
- ✅ Índices nas foreign keys
- ✅ Pool de conexões PostgreSQL (max: 10/20)
- ✅ Transações em operações críticas (vendas, compras, produção)

### Pontos de Atenção
- ⚠️ Relatório de clientes faz N+1 queries (otimizar com GROUP BY)
- ⚠️ Uploads não têm limpeza automática
- ⚠️ Logging apenas no console (sem persistência)

---

**Última atualização:** Após análise profunda e correções de segurança/lógica

