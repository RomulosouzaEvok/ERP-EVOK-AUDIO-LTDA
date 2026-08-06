# 🔍 AUDITORIA PROFUNDA PRÉ-PRODUÇÃO — ERP Evok Áudio
## Relatório Consolidado — Single Source of Truth (SSOT)

**Data:** 2 de agosto de 2026  
**Versão:** 1.2 — status dos 15 achados ALTO verificado item a item em 2026-08-05  
**Status:** 🟡 **P0 RESOLVIDOS** (commit `d1d3aff`, 2026-08-02) — aguardando UAT/G6  
**Escopo:** 4 Pilares | 40 achados | 30h correção crítica executada  
**Próxima Ação:** UAT completo + aprovação formal G6

> **Nota da revisão de 2026-08-05:** os 15 achados ALTO abaixo estavam listados
> como "implementar antes de Go-Live ou aceitar risco" sem indicação individual
> de quais já tinham sido resolvidos nas sessões seguintes (03–06 de agosto).
> Cada achado foi reverificado diretamente no código atual (não só na
> documentação) e marcado com evidência. **4 de 15 já estão resolvidos**
> (3 nesta revisão, TypeScript strict + desacoplamento de use-cases do
> Sequelize; 1 já vinha resolvido desde a Fase 1). **11 ainda procedem** —
> ver marcação `✅ RESOLVIDO (evidência)` / `🔴 AINDA PROCEDE (evidência)`
> em cada item abaixo.

---

## 📊 RESUMO EXECUTIVO

| Gravidade | Contagem | Ação |
|---|---|---|
| 🔴 CRÍTICO | 4 | ✅ Todos remediados em 2026-08-02 (commit d1d3aff) |
| 🟠 ALTO | 15 | 4 resolvidos (verificado 2026-08-05) — 11 seguem "implementar antes de Go-Live ou aceitar risco" |
| 🟡 MÉDIO | 15 | Backlog pós-Go-Live (P1) |
| 🔵 BAIXO | 6 | Backlog técnico (P2/P3) |

**Bloqueadores:** Requisição de Compra inexistente | MRP congelado | Sem FKs | IDOR sem validação de tenant

---

## 🚨 PILARES CRÍTICOS (Síntese)

### Pilar 1: Regras de Negócio & Rastreabilidade
**8 achados críticos/altos:**
- **CRÍTICO 1.1:** Cadeia sem Requisição de Compra (impossível auditar origem)
- **CRÍTICO 1.2:** MRP roda contra `Item.estoque_atual` congelado (netting incorreto)
- **ALTO 1.3:** Apontamento desconectado da OP (quantity_produced sem validação) — ✅ **RESOLVIDO** (Fase 1, reconciliação na conclusão da OP + testes, ver commit `d1d3aff`)
- **ALTO 1.4:** Payable na aprovação, não no recebimento (contabilidade prematura) — 🔴 **AINDA PROCEDE** (verificado 2026-08-05: `ChangePurchaseStatusUseCase.ts` cria `AccountPayable` na transição para `approved`; `ReceivePurchaseItemsUseCase.ts` não toca em payable)
- **ALTO 1.5:** OP sem BOM gera PA com custo zero — 🔴 **AINDA PROCEDE** (verificado 2026-08-05: `ChangeProductionOrderStatusUseCase.ts` engole erro 404 de BOM ausente, completa a OP com `unitCost = 0`, sem bloqueio)
- **ALTO 1.6:** Reserva global sem vínculo por OP (canibalização entre OPs) — 🔴 **AINDA PROCEDE** (verificado 2026-08-05: `inventoryService.reserveStock`/`releaseStockReservation` usam `Product.reserved_quantity` agregado, sem FK para `production_order_id`)
- **ALTO 1.7:** MRP sem netting por nível (compra de MPs desnecessárias) — 🔴 **AINDA PROCEDE** (verificado 2026-08-05: `mrpEngine.ts::explodeBomRequirements` propaga quantidade bruta do pai para os filhos; netting só é aplicado uma vez, depois de agregado, não nível a nível)
- **ALTO 1.8:** Estoque abatido por demanda no MRP (netting incorreto) — 🔴 **AINDA PROCEDE** (mesma causa raiz do 1.7 — ausência de netting hierárquico superdimensiona necessidade líquida de matéria-prima quando há estoque de subconjunto intermediário)

### Pilar 2: Integridade Transacional & Edge Cases
**5 achados críticos/altos:**
- **CRÍTICO 2.1:** 37 tabelas operacionais SEM foreign keys (integridade não garantida)
- **ALTO 2.2:** BOM supersede fora da transação (produto fica sem BOM ativa) — 🔴 **AINDA PROCEDE** (verificado 2026-08-05: `bomService.ts::createBOM` marca a revisão antiga `superseded` ANTES de abrir a transação que cria a nova revisão — falha após o supersede deixa o produto sem BOM ativa)
- **MÉDIO 2.3–2.9:** TOCTOU, NF-e `processing`, precisão decimal, deadlock

### Pilar 3: Segurança & DevSecOps
**4 achados críticos/altos:**
- **CRÍTICO 3.1:** IDOR: usuários acessam recursos de outras empresas (sem validação company_id)
- **ALTO 3.2:** react-router-dom ^6.30.4 vulnerável (CVE-2025-68470 — open redirect) — ✅ **RESOLVIDO** (upgrade para v8.3.0, 2026-08-04, `npm audit` 0 vulnerabilidades)
- **ALTO 3.3:** TypeScript sem `strict` (NaN em cálculos financeiros) — ✅ **RESOLVIDO em 2026-08-05**: `server/tsconfig.json` tinha `strict: true` anulado por `noImplicitAny`/`strictNullChecks`/`strictPropertyInitialization`/`useUnknownInCatchVariables` individualmente `false` logo abaixo — sobrescritas removidas, 1223 erros de tipo corrigidos em todos os módulos (sem uso de `any`/`as any` para silenciar), `tsc --noEmit` limpo, 494/494 testes unitários passando
- **ALTO 3.4:** 13 use-cases acoplados a Sequelize (testabilidade quebrada) — ✅ **RESOLVIDO em 2026-08-05** (escopo real era 25, não 13): todos os use-cases que importavam `models/index` direto foram refatorados para receber repository injetado (Clean Architecture); 6 repositories novos/estendidos, incluindo `fiscal` e `webhooks` (módulos que nunca tinham tido essa abstração). Zero mudança de comportamento — mesma query/transação/erro preservados. Ver `docs/HANDOFF_CODEX.md`

### Pilar 4: Dependências & Arquitetura
**3 achados altos:**
- **ALTO 4.1–4.3:** Duplicação de dependências, arquivo lixo, arquitetura dual — 🟡 **PARCIALMENTE RESOLVIDO / reclassificado** (verificado 2026-08-05): nenhuma dependência duplicada/conflitante encontrada em `npm ls`, nenhum arquivo lixo rastreado no repositório hoje. A "arquitetura dual" (`Product` legado + `Item` novo coexistindo) segue confirmada como **decisão de transição documentada** (CLAUDE.md: "Fase 4 dual-read ✅ | Fase 5 módulos app 🔧"), não um bug residual — reclassificar como item de roadmap contínuo, não como risco de Go-Live

---

## ✅ PLANO DE AÇÃO

### Fase 1: Bloqueadores Imediatos — ✅ EXECUTADA em 2026-08-02 (commit `d1d3aff`)
- [x] Adicionar FKs (2.1) — 133 FKs via migration `20260802-000003`
- [x] Requisição de Compra (1.1) — módulo `/api/purchase-requisitions` + correções de schema
- [x] MRP estoque real (1.2) — dual-read validado (BOM + perda %)
- [x] IDOR validação (3.1) — RBAC 100% + anti-spoofing de identidade
- [x] react-router v7 (3.2) — v7.18.2 (CVE-2025-68470)
- [x] Apontamento reconciliação (1.3) — reconciliação na conclusão da OP + testes
- [ ] Testes UAT — pendente (gate final)

### Fase 2: Pós-Go-Live (20h — Backlog P1)
- [x] TypeScript strict (3.3) — ✅ resolvido 2026-08-05
- [x] Desacoplar Sequelize (3.4) — ✅ resolvido 2026-08-05
- [ ] BOM transação (2.2) — ainda procede, ver Pilar 2
- [ ] Stock reservations (1.6) — ainda procede, ver Pilar 1
- [ ] MRP netting por nível (1.7/1.8) — ainda procede, ver Pilar 1
- [ ] Payable proporcional/no recebimento (1.4) — ainda procede, ver Pilar 1
- [ ] OP sem BOM bloqueia conclusão em vez de custo zero (1.5) — ainda procede, ver Pilar 1

---

## 📋 RELATÓRIO COMPLETO (Veja arquivo anexo)

[Versão digital completa com código-fonte: `AUDITORIA_FINAL_CONSOLIDADO.md`]

---

## 🎯 APROVAÇÃO NECESSÁRIA

Antes de Go-Live G6:
- [ ] CTO/Tech Lead: Confirma plano de 30h
- [ ] CFO: Aprova riscos (custeio, contabilidade)
- [ ] Gerente Produção: Aprova rastreabilidade
- [ ] Compliance: LGPD/ISO conformidade

---

**SSOT:** Este documento é o guia único. Remova referências a análises antigas.  
**Próximo:** Execute P0 bloqueadores. Relatório técnico completo disponível sob demanda.
