# TODO - PROJETO ERP EVOK ÁUDIO - EXECUÇÃO DE CORREÇÕES

## 🔴 SPRINT 0 — Entrypoint e Config de Banco
- [ ] 0.1 Decidir entrypoint oficial (usando `tsx` como padrão)
- [ ] 0.2 Ajustar scripts de start
- [ ] 0.3 Corrigir default DB_DIALECT em database.ts
- [ ] 0.4 Corrigir log de boot enganoso
- [ ] 0.5 Atualizar .env.example

## 🔴 SPRINT 1 — PURGE + Limpeza
- [ ] 1.1 Remover Grupo 1 (44 arquivos - controllers/routes legados)
- [ ] 1.2 Remover dependências não usadas (mongoose, express-validator)
- [ ] 1.3 Remover workspace.code-workspace

## 🟠 SPRINT 2 — Segurança Regressiva
- [ ] 2.1 Corrigir sanitizeSearch() nos repositórios

## 🔴 SPRINT 3 — Correções Críticas Runtime
- [ ] 3.1 F10 - Substituir sequelize.literal() nos 12 controllers
- [ ] 3.2 F32+F36 - Corrigir productController (SaleItem)
- [ ] 3.3 F33 - Corrigir assetController allowedFields
- [ ] 3.4 F34 - Corrigir serviceOrderController resposta erro
- [ ] 3.5 F35 - Corrigir inventoryController update silencioso
- [ ] 3.6 Corrigir uploadService.js validateFileMagic

## 🔴 SPRINT 4 — Auditoria e Rastreabilidade
- [ ] 4.1 Integrar AuditLog nos controllers

Status: 🔴 EM EXECUÇÃO
