# Cronograma e Checklist - Fases 2 e 3

## 📅 FASE 2: Módulos Extras (Estimativa: 3-4 semanas)

### 2.1 QR Code para Patrimônio e Produtos (1 semana)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 2.1.1 | Model `Asset` para patrimônio (QR code fields) | 4h | ⬜ |
| 2.1.2 | Controller `assetController.js` (CRUD + generateQR) | 6h | ⬜ |
| 2.1.3 | Rota `assets.js` (CRUD + GET qrcode/:id) | 2h | ⬜ |
| 2.1.4 | Serviço de geração de QR Code (qrcode npm) | 4h | ⬜ |
| 2.1.5 | Adicionar campo `qr_code` ao Product model | 2h | ⬜ |
| 2.1.6 | Endpoint para gerar/regenerar QR do produto | 2h | ⬜ |
| 2.1.7 | Testes de geração e leitura de QR | 4h | ⬜ |

### 2.2 App Mobile para Inventário de Estoque (1.5 semanas)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 2.2.1 | Criar estrutura `mobile/` (React Native ou PWA) | 8h | ⬜ |
| 2.2.2 | Tela de login com JWT | 4h | ⬜ |
| 2.2.3 | Leitor de QR Code integrado (camera) | 6h | ⬜ |
| 2.2.4 | Tela de inventário (listar + contar estoque) | 8h | ⬜ |
| 2.2.5 | Sincronização com backend (API offline-first) | 8h | ⬜ |
| 2.2.6 | Endpoint `POST /api/inventory/count` (contagem) | 4h | ⬜ |
| 2.2.7 | Relatório de divergências (contagem vs sistema) | 4h | ⬜ |

### 2.3 Auditor Inteligente de Estoque (0.5 semana)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 2.3.1 | Algoritmo de detecção de anomalias | 6h | ⬜ |
| 2.3.2 | Notificações automáticas (estoque crítico) | 4h | ⬜ |
| 2.3.3 | Sugestão de reposição baseada em histórico | 4h | ⬜ |
| 2.3.4 | Relatório de auditoria com score de risco | 4h | ⬜ |

---

## 📅 FASE 3: Melhorias Gerais (Estimativa: 3-4 semanas)

### 3.1 Dashboard de KPIs (1.5 semanas)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 3.1.1 | Endpoint `GET /api/dashboard/kpi` (backend) | 6h | ⬜ |
| 3.1.2 | KPI: Faturamento mensal vs meta | 2h | ⬜ |
| 3.1.3 | KPI: OEE (Overall Equipment Effectiveness) | 4h | ⬜ |
| 3.1.4 | KPI: Giro de estoque | 2h | ⬜ |
| 3.1.5 | KPI: Nível de serviço (entregas no prazo) | 2h | ⬜ |
| 3.1.6 | KPI: Taxa de refugo (%) | 2h | ⬜ |
| 3.1.7 | Frontend React com gráficos (Recharts/ApexCharts) | 12h | ⬜ |
| 3.1.8 | Filtros por período e departamento | 4h | ⬜ |

### 3.2 Relatórios Avançados (Excel/PDF) (1 semana)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 3.2.1 | Instalar ExcelJS + jsPDF | 1h | ⬜ |
| 3.2.2 | Serviço `reportService.js` (fábrica de relatórios) | 6h | ⬜ |
| 3.2.3 | Relatório Vendas (PDF + Excel) | 4h | ⬜ |
| 3.2.4 | Relatório Estoque (PDF + Excel) | 4h | ⬜ |
| 3.2.5 | Relatório Financeiro (PDF + Excel) | 4h | ⬜ |
| 3.2.6 | Relatório Produção (PDF + Excel) | 4h | ⬜ |
| 3.2.7 | Relatório Clientes (PDF + Excel) | 4h | ⬜ |
| 3.2.8 | Endpoints `GET /api/reports/:type/export?format=pdf|xlsx` | 4h | ⬜ |

### 3.3 Upload de Imagens (0.5 semana)
| Tarefa | Descrição | Esforço | Status |
|--------|-----------|---------|--------|
| 3.3.1 | Configurar multer para upload | 2h | ⬜ |
| 3.3.2 | Endpoint `POST /api/upload` (imagem única) | 2h | ⬜ |
| 3.3.3 | Endpoint `POST /api/upload/multiple` (galeria) | 2h | ⬜ |
| 3.3.4 | Adicionar campo `images` ao Product model | 2h | ⬜ |
| 3.3.5 | Adicionar campo `photo` ao Employee model | 1h | ⬜ |
| 3.3.6 | Adicionar campo `logo` ao Supplier model | 1h | ⬜ |
| 3.3.7 | Servir arquivos estáticos (express.static) | 1h | ⬜ |
| 3.3.8 | Validação de tipo/tamanho de arquivo | 2h | ⬜ |

---

## 🗺️ Roadmap Visual

```
SEMANA 1    SEMANA 2    SEMANA 3    SEMANA 4    SEMANA 5    SEMANA 6    SEMANA 7
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│  FASE 2  ││  FASE 2  ││  FASE 2  ││  FASE 3  ││  FASE 3  ││  FASE 3  ││ TESTES   │
│ 2.1 QR   ││ 2.2 App  ││ 2.2 App  ││ 3.1 Dash ││ 3.1 Dash ││ 3.2 Rep  ││ INT +    │
│ Code     ││ Mobile   ││ + 2.3    ││ board    ││ board    ││ Excel/PDF││ E2E +    │
│          ││ (início) ││ Auditor  ││ (início) ││ (fim)    ││ + 3.3 Up ││ Homolog  │
│          ││          ││          ││          ││          ││ load     ││          │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
```

---

## ✅ CHECKLIST CONSOLIDADO

### FASE 2 - Módulos Extras
- [ ] 2.1 QR Code para Patrimônio e Produtos
  - [ ] Model Asset
  - [ ] Asset Controller
  - [ ] QR Code generation service
  - [ ] Product QR field + endpoint
- [ ] 2.2 App Mobile para Inventário
  - [ ] Estrutura mobile/ criada
  - [ ] Login + JWT
  - [ ] Leitor QR integrado
  - [ ] Tela de inventário
  - [ ] Sincronização offline
  - [ ] Endpoint de contagem
  - [ ] Relatório de divergências
- [ ] 2.3 Auditor Inteligente
  - [ ] Algoritmo de anomalias
  - [ ] Notificações
  - [ ] Sugestão de reposição
  - [ ] Relatório de auditoria

### FASE 3 - Melhorias Gerais
- [ ] 3.1 Dashboard de KPIs
  - [ ] Endpoint backend (6+ KPIs)
  - [ ] Frontend com gráficos
  - [ ] Filtros
- [ ] 3.2 Relatórios Avançados
  - [ ] ExcelJS configurado
  - [ ] jsPDF configurado
  - [ ] 5 tipos de relatório (vendas, estoque, financeiro, produção, clientes)
  - [ ] Endpoints de exportação
- [ ] 3.3 Upload de Imagens
  - [ ] Multer configurado
  - [ ] Upload single + multiple
  - [ ] Campos nas models (Product, Employee, Supplier)
  - [ ] Servir arquivos estáticos

---

## 📊 Estimativa de Esforço Total

| Fase | Horas | Semanas |
|------|-------|---------|
| Fase 2.1 - QR Code | 20h | 1 |
| Fase 2.2 - App Mobile | 38h | 1.5 |
| Fase 2.3 - Auditor | 18h | 0.5 |
| Fase 3.1 - Dashboard | 30h | 1.5 |
| Fase 3.2 - Relatórios | 27h | 1 |
| Fase 3.3 - Upload | 11h | 0.5 |
| Testes e Homologação | 20h | 1 |
| **TOTAL** | **~164h** | **~7 semanas** |

