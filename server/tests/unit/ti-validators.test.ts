/**
 * Test: TI Module Validators (Zod Schemas)
 *
 * Cobre a superfície de risco identificada na auditoria pós-incidente do
 * módulo Jurídico (500 `invalid input value for enum` quando um valor de
 * enum inválido chegava direto no `.create()`/`.update()` do Sequelize):
 * o módulo `ti` não tinha validador nenhum para os campos de enum de
 * `it_software_license_details`, `it_responsibility_terms`,
 * `it_backup_logs`, `it_access_requests` e `it_ticket_categories`/
 * `it_tickets`. Cada literal abaixo é conferido contra o enum real do
 * Postgres (`server/migrations/20260807-000150` a `000155`), não contra a
 * lista solta do prompt que motivou esta tarefa.
 *
 * @group unit
 */

import { createLicenseSchema, updateLicenseSchema } from '../../src/modules/ti/presentation/validators/licenseValidators';
import { createTermSchema, returnTermSchema } from '../../src/modules/ti/presentation/validators/termValidators';
import { registerBackupLogSchema } from '../../src/modules/ti/presentation/validators/backupValidators';
import { createAccessRequestSchema } from '../../src/modules/ti/presentation/validators/accessRequestValidators';
import {
  createTicketCategorySchema,
  updateTicketCategorySchema,
  changeTicketPrioritySchema,
} from '../../src/modules/ti/presentation/validators/ticketValidators';

describe('TI Module Validators - Zod Schemas', () => {
  describe('licenseValidators', () => {
    it('aceita license_type/billing_cycle válidos em createLicenseSchema', () => {
      const result = createLicenseSchema.safeParse({
        asset_id: 205,
        license_type: 'subscription',
        billing_cycle: 'yearly',
        vendor: 'Autodesk',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita license_type inválido em createLicenseSchema (400, não 500 de banco)', () => {
      const result = createLicenseSchema.safeParse({ asset_id: 205, license_type: 'trial' });
      expect(result.success).toBe(false);
    });

    it('rejeita billing_cycle inválido em createLicenseSchema', () => {
      const result = createLicenseSchema.safeParse({ asset_id: 205, license_type: 'perpetual', billing_cycle: 'weekly' });
      expect(result.success).toBe(false);
    });

    it('aceita billing_cycle válido em updateLicenseSchema', () => {
      const result = updateLicenseSchema.safeParse({ billing_cycle: 'monthly', seats: 3 });
      expect(result.success).toBe(true);
    });

    it('rejeita billing_cycle inválido em updateLicenseSchema', () => {
      const result = updateLicenseSchema.safeParse({ billing_cycle: 'annual' });
      expect(result.success).toBe(false);
    });

    it('rejeita license_type em updateLicenseSchema (imutável após criação, RF-TI-024/API doc §3)', () => {
      const result = updateLicenseSchema.safeParse({ license_type: 'free' });
      expect(result.success).toBe(false);
    });
  });

  describe('termValidators', () => {
    it('aceita acceptance_type válido em createTermSchema', () => {
      const result = createTermSchema.safeParse({ asset_id: 1, employee_id: 2, acceptance_type: 'digital_ack' });
      expect(result.success).toBe(true);
    });

    it('rejeita acceptance_type inválido em createTermSchema', () => {
      const result = createTermSchema.safeParse({ asset_id: 1, employee_id: 2, acceptance_type: 'email_confirmation' });
      expect(result.success).toBe(false);
    });

    it('aceita condition_on_return válido em returnTermSchema', () => {
      const result = returnTermSchema.safeParse({ condition_on_return: 'damaged' });
      expect(result.success).toBe(true);
    });

    it('rejeita condition_on_return inválido em returnTermSchema', () => {
      const result = returnTermSchema.safeParse({ condition_on_return: 'broken' });
      expect(result.success).toBe(false);
    });
  });

  describe('backupValidators', () => {
    it('aceita backup_type válido em registerBackupLogSchema', () => {
      const result = registerBackupLogSchema.safeParse({
        executed_at: '2026-08-09T03:00:00Z',
        backup_type: 'restore_test',
        target: 'database',
        success: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejeita backup_type inválido em registerBackupLogSchema', () => {
      const result = registerBackupLogSchema.safeParse({
        executed_at: '2026-08-09T03:00:00Z',
        backup_type: 'yearly',
        target: 'database',
        success: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('accessRequestValidators', () => {
    it('aceita type válido em createAccessRequestSchema', () => {
      const result = createAccessRequestSchema.safeParse({ type: 'revoke', employee_id: 10 });
      expect(result.success).toBe(true);
    });

    it('rejeita type inválido em createAccessRequestSchema', () => {
      const result = createAccessRequestSchema.safeParse({ type: 'suspend', employee_id: 10 });
      expect(result.success).toBe(false);
    });
  });

  describe('ticketValidators', () => {
    it('aceita default_priority válida em createTicketCategorySchema', () => {
      const result = createTicketCategorySchema.safeParse({ name: 'Rede', default_priority: 'high' });
      expect(result.success).toBe(true);
    });

    it('rejeita default_priority inválida em createTicketCategorySchema', () => {
      const result = createTicketCategorySchema.safeParse({ name: 'Rede', default_priority: 'critical' });
      expect(result.success).toBe(false);
    });

    it('aceita default_priority válida em updateTicketCategorySchema', () => {
      const result = updateTicketCategorySchema.safeParse({ default_priority: 'low' });
      expect(result.success).toBe(true);
    });

    it('rejeita default_priority inválida em updateTicketCategorySchema', () => {
      const result = updateTicketCategorySchema.safeParse({ default_priority: 'none' });
      expect(result.success).toBe(false);
    });

    it('aceita priority válida em changeTicketPrioritySchema', () => {
      const result = changeTicketPrioritySchema.safeParse({ priority: 'urgent', impact: 1, urgency: 2 });
      expect(result.success).toBe(true);
    });

    it('rejeita priority inválida em changeTicketPrioritySchema', () => {
      const result = changeTicketPrioritySchema.safeParse({ priority: 'critical' });
      expect(result.success).toBe(false);
    });

    it('rejeita campo desconhecido (strict mode)', () => {
      const result = changeTicketPrioritySchema.safeParse({ priority: 'high', status: 'open' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
      }
    });
  });
});
