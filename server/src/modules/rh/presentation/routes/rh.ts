/**
 * Router agregador do módulo RH (departamento 02, Bloco 6) — montado em
 * `/api/rh` por `server/app.ts`, **ao lado** do módulo já existente
 * `/api/employees` (que NÃO é substituído — ver §0/§18 de
 * `docs/business/BLOCO_6_RH_API.md`).
 *
 * ## Escopo desta passada: apenas os fluxos P0 + os dois workflows de
 * ciclo de vida que os sustentam
 *
 * Férias (UC-67, RF-RH-031 a 043), Contrato de Experiência (UC-68,
 * RF-RH-013 a 016), Admissão (UC-69, RF-RH-007 a 012) e Demissão (UC-70,
 * RF-RH-017 a 023), mais Documentos do Funcionário (RF-RH-027 a 030, que
 * é o gate de ASO de que UC-69/UC-70 dependem). Os grupos P1/P2 do
 * contrato (Cargos, Afastamentos, Benefícios, Treinamentos, Ponto,
 * Histórico Contratual, Quotas, Folha importada, Painel/KPIs, Avaliação/
 * Recrutamento) ficam para a passada 2 — ver `docs/governance/TODO.md`.
 *
 * ## RBAC (desenho do contrato §0 + decisão normativa do dono do produto)
 *
 * - **Rota inteira** atrás de `authorizeModule('rh', ...)` — diferente de
 *   `GET /api/employees` (que permanece aberto a qualquer autenticado com
 *   segregação por campo, RF-RH-006): nenhum consumidor legítimo de
 *   nome/cargo precisa ver contrato de experiência, demissão ou férias.
 * - `rh:approve` é exigido em **exatamente 2 ações**, as de maior blast
 *   radius (§0, critério de parcimônia):
 *   1. `POST /termination-processes/:id/conclude` (RF-RH-022 — desliga o
 *      funcionário e desativa o login no mesmo ato transacional);
 *   2. `PATCH /employee-contracts/:id/decision` **quando**
 *      `decision === 'rescindir'` (§5.2 — encaminha para demissão);
 *      `prorrogar`/`efetivar` seguem em `operate`.
 * - **Decisão do dono do produto (2026-08-09), fecha o achado 10 da
 *   auditoria cruzada:** `rh:approve` **não** é reaproveitado como nível de
 *   leitura de dado sensível. `hr_absences.cid` e
 *   `hr_payroll_import_items.bruto/liquido` usam **interseção de módulos**
 *   (`rh`+`sst` e `rh`+`financeiro`), implementada como omissão de campo em
 *   `domain/services/rhSensitiveFields.ts` — nunca como 403 de rota.
 *
 * @module modules/rh/presentation/routes/rh
 */

import type { Request, Response, NextFunction } from 'express';

const { Router } = require('express');
const router = Router();
const { authenticate, authorizeModule } = require('../../../../middlewares/auth');
const rhFileUpload = require('../middlewares/rhFileUpload');

const admissionController = require('../controllers/admissionController');
const employeeContractController = require('../controllers/employeeContractController');
const terminationController = require('../controllers/terminationController');
const employeeDocumentController = require('../controllers/employeeDocumentController');
const vacationController = require('../controllers/vacationController');

router.use(authenticate);

/**
 * `PATCH /employee-contracts/:id/decision` exige `rh:approve` **apenas**
 * quando `decision='rescindir'` (§5.2 — `403 FORBIDDEN` nesse caso, e
 * `operate` nos demais). Como `authorizeModule` é fixo por rota, a
 * checagem condicional acontece aqui, delegando ao próprio middleware para
 * não reimplementar a semântica de níveis/`admin`/auditoria de negação.
 */
function authorizeContractDecision(req: Request, res: Response, next: NextFunction): void {
  const requiredLevel = (req.body as any)?.decision === 'rescindir' ? 'approve' : 'operate';
  authorizeModule('rh', requiredLevel)(req, res, next);
}

// ---- Grupo 2 — Admissão (UC-69, RF-RH-007 a 012) ----
router.get('/admission-processes', authorizeModule('rh'), admissionController.list);
router.get('/admission-processes/:id', authorizeModule('rh'), admissionController.getById);
router.post('/admission-processes', authorizeModule('rh', 'operate'), admissionController.create);
router.post('/admission-processes/:id/request-aso', authorizeModule('rh', 'operate'), admissionController.requestAso);
router.patch('/admission-processes/:id/aso-confirmation', authorizeModule('rh', 'operate'), admissionController.confirmAsoResult);
router.post('/admission-processes/:id/checklist', authorizeModule('rh', 'operate'), admissionController.updateChecklist);
router.post('/admission-processes/:id/conclude', authorizeModule('rh', 'operate'), admissionController.conclude);
router.patch('/admission-processes/:id/esocial-confirmation', authorizeModule('rh', 'operate'), admissionController.confirmEsocial);
router.post('/admission-processes/:id/cancel', authorizeModule('rh', 'operate'), admissionController.cancel);

// ---- Grupo 3 — Contrato de Experiência (UC-68, RF-RH-013 a 016, P0) ----
router.get('/employee-contracts', authorizeModule('rh'), employeeContractController.list);
router.get('/employee-contracts/:id', authorizeModule('rh'), employeeContractController.getById);
router.patch('/employee-contracts/:id/extend', authorizeModule('rh', 'operate'), employeeContractController.extend);
router.patch('/employee-contracts/:id/decision', authorizeContractDecision, employeeContractController.decide);

// ---- Grupo 4 — Demissão (UC-70, RF-RH-017 a 023) ----
router.get('/termination-processes', authorizeModule('rh'), terminationController.list);
router.get('/termination-processes/:id', authorizeModule('rh'), terminationController.getById);
router.get('/termination-processes/:id/asset-checklist', authorizeModule('rh'), terminationController.assetChecklist);
router.post('/termination-processes', authorizeModule('rh', 'operate'), terminationController.create);
router.post('/termination-processes/:id/request-aso', authorizeModule('rh', 'operate'), terminationController.requestAso);
router.patch('/termination-processes/:id/aso-confirmation', authorizeModule('rh', 'operate'), terminationController.confirmAsoResult);
router.post('/termination-processes/:id/trct', authorizeModule('rh', 'operate'), rhFileUpload.single('file'), terminationController.attachTrct);
router.patch('/termination-processes/:id/esocial-confirmation', authorizeModule('rh', 'operate'), terminationController.confirmEsocial);
// Única ação do bloco em nível `approve` além da rescisão de experiência (RF-RH-022).
router.post('/termination-processes/:id/conclude', authorizeModule('rh', 'approve'), terminationController.conclude);

// ---- Grupo 5 — Documentos do Funcionário (RF-RH-027 a 030) ----
router.get('/employee-documents', authorizeModule('rh'), employeeDocumentController.list);
router.get('/employee-documents/:id', authorizeModule('rh'), employeeDocumentController.getById);
router.post('/employee-documents', authorizeModule('rh', 'operate'), rhFileUpload.single('file'), employeeDocumentController.create);
router.put('/employee-documents/:id', authorizeModule('rh', 'operate'), rhFileUpload.single('file'), employeeDocumentController.update);

// ---- Grupo 6 — Férias (UC-67, RF-RH-031 a 043, P0) ----
// `VacationAccrualPeriod` nunca nasce por POST manual (§8.1, RF-RH-031) —
// a abertura é automática na conclusão da admissão.
router.get('/vacation-accrual-periods', authorizeModule('rh'), vacationController.listAccrualPeriods);
router.get('/vacation-accrual-periods/:id', authorizeModule('rh'), vacationController.getAccrualPeriodById);
router.post('/vacation-accrual-periods/:id/recalculate', authorizeModule('rh', 'operate'), vacationController.recalculateAccrualPeriod);

// Ordem importa: `/calendar` antes de qualquer rota com parâmetro no mesmo prefixo.
router.get('/vacation-schedules/calendar', authorizeModule('rh'), vacationController.calendar);
router.get('/vacation-schedules', authorizeModule('rh'), vacationController.listSchedules);
router.post('/vacation-schedules', authorizeModule('rh', 'operate'), vacationController.createSchedule);
router.post('/vacation-schedules/:id/revise', authorizeModule('rh', 'operate'), vacationController.reviseSchedule);
router.post('/vacation-schedules/:id/confirm-taken', authorizeModule('rh', 'operate'), vacationController.confirmTaken);

module.exports = router;
