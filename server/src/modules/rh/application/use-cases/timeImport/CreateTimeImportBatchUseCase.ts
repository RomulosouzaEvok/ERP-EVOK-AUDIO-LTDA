/**
 * `POST /api/rh/time-imports` — recebe o arquivo AEJ (multipart), faz o
 * parse (`aejParser.parseAej`), grava o lote (`hr_time_import_batches`) e
 * as linhas (`hr_time_import_items`), casando cada linha por CPF contra
 * `employees.cpf`. Retorna o relatório de não-casados para o RH revisar
 * antes de `POST /time-imports/:id/confirm`.
 *
 * Falha ESTRUTURAL (nenhum registro tipo 2 reconhecido no arquivo inteiro)
 * não derruba a requisição com erro — o lote é gravado com
 * `status='rejected'` e `rejection_reason`, visível na lista de lotes
 * (auditável, mesmo raciocínio de "nunca perder o rastro do que foi
 * enviado" já usado no importador de folha).
 *
 * @module modules/rh/application/use-cases/timeImport/CreateTimeImportBatchUseCase
 */
import type { Transaction } from 'sequelize';
import UseCase from '../../../../../shared/application/UseCase';
import { ValidationError } from '../../../../../errors';
import TimeImportRepository from '../../../domain/repositories/TimeImportRepository';
import { parseAej, type ParsedAejWorkdayRecord } from '../../../domain/services/aejParser';

// ⚠️ Interface LOCAL (sem `export`): este arquivo usa `export =` — ver nota
// em `CreateAbsenceUseCase.ts` sobre `export =` convivendo com `export`.
interface CreateTimeImportBatchInput {
  filename: string;
  buffer: Buffer;
  competencia_inicio: string;
  competencia_fim: string;
  importedBy: number;
  transaction: Transaction;
}

class CreateTimeImportBatchUseCase extends UseCase<CreateTimeImportBatchInput, any> {
  private readonly repository: TimeImportRepository;

  public constructor(repository: TimeImportRepository) {
    super();
    this.repository = repository;
  }

  /** @throws {ValidationError} arquivo vazio ou datas de competência ausentes/invertidas (400). */
  public async execute(input: CreateTimeImportBatchInput): Promise<any> {
    if (!input.buffer || input.buffer.length === 0) {
      throw new ValidationError('Arquivo AEJ vazio.');
    }
    if (!input.competencia_inicio || !input.competencia_fim) {
      throw new ValidationError('competencia_inicio e competencia_fim são obrigatórios.');
    }
    if (input.competencia_inicio > input.competencia_fim) {
      throw new ValidationError('competencia_inicio não pode ser posterior a competencia_fim.');
    }

    const parsed = parseAej(input.buffer);

    const batch = await this.repository.createBatch({
      filename: input.filename,
      competencia_inicio: input.competencia_inicio,
      competencia_fim: input.competencia_fim,
      imported_by: input.importedBy,
      status: 'uploaded',
      total_lines: parsed.totalLines,
      unknown_record_types: Object.keys(parsed.unknownRecordTypes).length > 0 ? parsed.unknownRecordTypes : null,
      rejected_lines: parsed.rejectedLines.length > 0 ? parsed.rejectedLines : null,
      rejected_count: parsed.rejectedLines.length,
    }, input.transaction);

    if (parsed.records.length === 0) {
      const updated = await this.repository.updateBatch(batch.id, {
        status: 'rejected',
        matched_count: 0,
        unmatched_count: 0,
        rejection_reason: 'Nenhum registro de jornada (tipo 2) reconhecido no arquivo enviado. '
          + 'Confirme que o arquivo é um AEJ exportado pela administradora e que o layout '
          + '(campos separados por ";") não mudou — ver docs/rh/04-FREQUENCIA.md.',
      }, input.transaction);
      return { batch: updated, items: [], unmatched: [] };
    }

    const cpfs = Array.from(new Set(parsed.records.map((r) => r.cpf).filter((cpf): cpf is string => !!cpf)));
    const employeeIdByCpf = await this.repository.findEmployeeIdsByCpf(cpfs);

    let matchedCount = 0;
    const itemsToCreate = parsed.records.map((record: ParsedAejWorkdayRecord) => {
      const employeeId = record.cpf ? employeeIdByCpf.get(record.cpf) ?? null : null;
      if (employeeId) matchedCount += 1;
      return {
        batch_id: batch.id,
        employee_id: employeeId,
        original_registration: record.registration,
        cpf: record.cpf,
        work_date: record.workDate,
        hours_worked: record.hoursWorked,
        overtime_50: record.overtime50,
        overtime_100: record.overtime100,
        night_hours: record.nightHours,
        absence: record.absence,
        absence_justified: record.absenceJustified,
        absence_reason: record.absenceReason,
      };
    });

    await this.repository.bulkCreateItems(itemsToCreate, input.transaction);

    const unmatchedCount = itemsToCreate.length - matchedCount;
    const updated = await this.repository.updateBatch(batch.id, {
      status: 'validated',
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
    }, input.transaction);

    const unmatched = await this.repository.listUnmatchedItemsByBatch(batch.id, input.transaction);

    return {
      batch: updated,
      items_created: itemsToCreate.length,
      matched_count: matchedCount,
      unmatched_count: unmatchedCount,
      rejected_count: parsed.rejectedLines.length,
      unmatched,
      rejected_lines: parsed.rejectedLines,
      unknown_record_types: parsed.unknownRecordTypes,
    };
  }
}

export = CreateTimeImportBatchUseCase;
