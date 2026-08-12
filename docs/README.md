# Índice de Documentação — ERP Evok Áudio

Porta de entrada da pasta `docs/`. Comece pelo [`CLAUDE.md`](../CLAUDE.md) na
raiz do repositório — é o SSOT geral do projeto (status vigente do Go-Live,
stack, runbook). Este arquivo é o mapa de navegação de tudo que existe aqui
dentro.

## Documentos-chave

| Documento | Conteúdo |
| --- | --- |
| [`../CLAUDE.md`](../CLAUDE.md) | SSOT geral do projeto — status, stack, runbook, links críticos |
| [`00-ESTRUTURA_ORGANIZACIONAL.md`](00-ESTRUTURA_ORGANIZACIONAL.md) | Estrutura organizacional (departamentos + subáreas) — doc mestre |
| [`governance/RESIDUAIS_ABERTOS_2026-08-10.md`](governance/RESIDUAIS_ABERTOS_2026-08-10.md) | **Fonte de pendências abertas** — cada item medido contra banco/código/suíte. Prevalece sobre o `TODO.md` quando os dois divergirem |
| [`governance/TODO.md`](governance/TODO.md) | Diário/rastreamento histórico dia a dia (tarefas, bugs, achados de auditoria). Registro do que foi feito, **não** lista confiável do que falta |
| [`governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md`](governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md) | Diário de bordo append-only da execução do Go-Live G6 |
| [`governance/go-live/GO_LIVE_G6_CHECKLIST.md`](governance/go-live/GO_LIVE_G6_CHECKLIST.md) | Checklist operacional/gate atual de Go-Live |
| [`governance/HANDOFF_CODEX.md`](governance/HANDOFF_CODEX.md) | Handoffs de execução por bloco (migração Product→Item, reorganização de departamentos, etc.) |
| [`database/DATABASE.md`](database/DATABASE.md) | Changelog narrativo do banco (ver `database/00-INDICE.md` para o modelo estruturado atual) |
| [`projeto/04-USE_CASES.md`](projeto/04-USE_CASES.md) | Casos de uso formais (UC-01 a UC-XX) — verdade do negócio |
| [`arquitetura/API.md`](arquitetura/API.md) | Endpoints, payloads, erros |

## Estrutura por pasta

| Pasta | Conteúdo |
| --- | --- |
| [`projeto/`](projeto/) | Plano de arquitetura, plano industrial e casos de uso formais (numeração 00-04) |
| [`arquitetura/`](arquitetura/) | Requisitos funcionais/não funcionais, contrato de API, diagramas (classes, sequência, infraestrutura, casos de uso/BPMN) |
| [`database/`](database/) | Modelo de dados estruturado e sempre-atual: índice, modelo conceitual/lógico/físico, dicionário de dados, acessos/isolamento, estruturas programáveis, disaster recovery, changelog narrativo (`DATABASE.md`) e setup local |
| [`infra/`](infra/) | Deploy (geral e Ubuntu/produção), Docker/PostgreSQL local, backup e restore |
| [`governance/`](governance/) | Fonte de pendências (`RESIDUAIS_ABERTOS_2026-08-10.md`), diário histórico (`TODO.md`), handoffs de execução, cronograma de frontend, e subpastas `auditorias/` (achados pré-produção/conformidade/levantamento, incluindo as auditorias de 2026-08-11 — ampla, de escrita real e a classe de defeito de verificação) e `go-live/` (checklist, diário de bordo, plano de implementação de bloqueadores) |
| [`business/`](business/) | Casos de uso em draft (UC-30+) e regras de negócio — consolidados em `projeto/04-USE_CASES.md` conforme implementados |
| [`manual/`](manual/) | Manual do usuário final por módulo |
| [`design/`](design/) | Referências visuais e inspiração de UI (não reorganizar) |
| [`incidentes/`](incidentes/) | Registro de incidentes de produção/operação (não reorganizar) |
| [`tributario/`](tributario/) | Regimes tributários, ICMS por estado, Receita Federal, setup fiscal de NF-e |
| [`administrativo/`](administrativo/) | Diretoria, TI, facilities, perfis de acesso (RBAC), organograma executivo |
| [`comercial/`](comercial/) | Vendas e marketing |
| [`financeiro/`](financeiro/) | Financeiro, contabilidade, tesouraria |
| [`juridico/`](juridico/) | Contratos e propriedade intelectual |
| [`logistica/`](logistica/) | Expedição e estoque de produto acabado |
| [`patrimonio/`](patrimonio/) | Ativos fixos, ferramentas, manutenção, almoxarifado de insumos, depreciação |
| [`producao/`](producao/) | Engenharia, PCP, manufatura, roteiros, custos, BOM |
| [`qualidade/`](qualidade/) | Controle de qualidade, testes acústicos, certificações |
| [`rh/`](rh/) | Funcionários, folha de pagamento, benefícios |
| [`seguranca_trabalho/`](seguranca_trabalho/) | SST e CIPA |
| [`suprimentos/`](suprimentos/) | Compras e comércio exterior (COMEX) |
| [`carga-inicial/`](carga-inicial/) | Guia de carga inicial de dados reais da fábrica (insumos, custos, BOM, roteiros, inventário) — **gate de Go-Live** |
| [`omnichannel/`](omnichannel/) | Assistente WhatsApp / omnichannel (Bloco 7): conceito e especificação formal |
| [`modelos/`](modelos/) | Modelos/templates de documento reutilizáveis |

## Convenções

- Cada área de negócio segue o padrão `00-README.md` (índice da área) +
  `NN-TEMA.md` (documentos temáticos numerados).
- Tags de estado usadas em checklists e casos de uso: `[IMPLEMENTADO]`/`[x]`,
  `[PENDENTE]`/`[ ]`, `[DESCONTINUADO]`, `[AUDITORIA-FALHOU]`.
- Não criar novos relatórios de auditoria soltos — consolidar a pendência em
  `governance/RESIDUAIS_ABERTOS_2026-08-10.md` (fonte medida), registrar o
  histórico em `governance/TODO.md` e, quando houver contexto de execução do
  Go-Live, em `governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (entrada nova,
  nunca reescrever entradas antigas).
