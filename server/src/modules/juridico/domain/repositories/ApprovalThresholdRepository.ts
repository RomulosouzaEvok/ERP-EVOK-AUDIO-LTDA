/**
 * Contrato do repositório da política configurável de alçada de aprovação de
 * contrato (`jur_approval_thresholds` + `jur_approval_threshold_history`).
 *
 * FIND-ERP-005 / Falha 1 — `APR-2026-021` Parte B decisão 3.
 *
 * @module modules/juridico/domain/repositories/ApprovalThresholdRepository
 */

import type { ApprovalThresholdRule } from '../approvalPolicy';

class ApprovalThresholdRepository {
  /** Todas as faixas configuradas (a filtragem por vigência/tipo é do domínio, não do SQL). */
  public async listAll(): Promise<ApprovalThresholdRule[]> {
    throw new Error('ApprovalThresholdRepository.listAll não implementado.');
  }

  /**
   * Substitui o conjunto de faixas por um novo conjunto, registrando o
   * estado anterior e o novo em `jur_approval_threshold_history`.
   *
   * @param rules - Novo conjunto completo de faixas (validado na camada de aplicação).
   * @param meta - Quem alterou (`changedBy`, sempre do JWT) e o motivo.
   */
  public async replaceAll(
    _rules: ApprovalThresholdRule[],
    _meta: { changedBy: number | null; reason?: string | null },
  ): Promise<ApprovalThresholdRule[]> {
    throw new Error('ApprovalThresholdRepository.replaceAll não implementado.');
  }

  /** Histórico de alterações, mais recente primeiro. */
  public async listHistory(_limit?: number): Promise<any[]> {
    throw new Error('ApprovalThresholdRepository.listHistory não implementado.');
  }
}

export = ApprovalThresholdRepository;
