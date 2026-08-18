/**
 * `GET`/`PUT /api/jur/settings/approval-thresholds` — política configurável
 * de alçada de aprovação de contrato (RF-JUR-003).
 *
 * Estes dois endpoints estavam **declarados no contrato de API desde sempre**
 * (`docs/business/BLOCO_3_JUR_API.md` §2.7, que os descreve como algo que
 * *"precisa existir antes de `POST .../activate` poder checar a regra"*) e
 * nunca haviam sido implementados — Falha 1 de `FIND-ERP-005`. Criados na
 * remediação, por decisão do dono em `APR-2026-021` Parte B decisão 3.
 *
 * ## Requisitos mínimos da decisão, e onde cada um está atendido
 *
 * | Requisito (`APR-2026-021` B.3) | Onde |
 * |---|---|
 * | configuração persistida | `jur_approval_thresholds` (migration `20260814-000048`) |
 * | identificação da faixa/alçada | `min_value`/`max_value` por linha |
 * | perfil/papel autorizado | `required_roles` + `required_level` |
 * | vigência quando aplicável | `valid_from`/`valid_to`/`active` |
 * | histórico/auditoria das alterações | `jur_approval_threshold_history` (gravado em `replaceAll`) |
 * | validação server-side | {@link validatePayload}, abaixo — o cliente não é consultado |
 * | nenhuma autorização baseada apenas no frontend | escrita atrás de `authorizeModule('juridico','approve')` na rota |
 *
 * @module modules/juridico/presentation/controllers/approvalThresholdController
 */

import type { Request, Response, NextFunction } from 'express';

const SequelizeApprovalThresholdRepository = require('../../infrastructure/sequelize/SequelizeApprovalThresholdRepository');
const { logAction } = require('../../../../services/auditLogService');
const { ValidationError } = require('../../../../errors');
const { CONTRACT_APPROVER_ROLES } = require('../../domain/constants');

const thresholdRepository = new SequelizeApprovalThresholdRepository();

const VALID_LEVELS = ['operate', 'approve'];

function toNumber(value: string | number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function describeBound(value: number | null): string {
  return value === null ? '∞' : String(value);
}

function validateContiguity(rules: any[]): void {
  const groups = new Map<string, any[]>();
  // Somente faixas ativas participam da política viva; inativas são ignoradas
  // nesta checagem para não bloquear versões desativadas/temporárias.
  for (const rule of rules.filter((entry) => entry.active !== false)) {
    const key = rule.contract_type;
    const bucket = groups.get(key) ?? [];
    bucket.push(rule);
    groups.set(key, bucket);
  }

  for (const [contractType, groupRules] of groups.entries()) {
    const ordered = [...groupRules].sort((a, b) => {
      const minDiff = toNumber(a.min_value, 0) - toNumber(b.min_value, 0);
      if (minDiff !== 0) return minDiff;
      const aMax = a.max_value === null || a.max_value === undefined ? Number.POSITIVE_INFINITY : toNumber(a.max_value, Number.POSITIVE_INFINITY);
      const bMax = b.max_value === null || b.max_value === undefined ? Number.POSITIVE_INFINITY : toNumber(b.max_value, Number.POSITIVE_INFINITY);
      return aMax - bMax;
    });

    const firstMin = toNumber(ordered[0].min_value, 0);
    if (firstMin > 0) {
      throw new ValidationError(
        `Grupo "${contractType}" não cobre o piso 0: a primeira faixa começa em ${describeBound(firstMin)}.`,
      );
    }

    const lastRule = ordered[ordered.length - 1];
    const lastMax = lastRule.max_value === null || lastRule.max_value === undefined
      ? null
      : toNumber(lastRule.max_value, 0);
    if (lastMax !== null) {
      throw new ValidationError(
        `Grupo "${contractType}" precisa terminar com teto aberto (max_value: null); a última faixa termina em ${describeBound(lastMax)}.`,
      );
    }

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const current = ordered[index];
      const next = ordered[index + 1];
      const currentMin = toNumber(current.min_value, 0);
      const currentMax = current.max_value === null || current.max_value === undefined
        ? null
        : toNumber(current.max_value, 0);
      const nextMin = toNumber(next.min_value, 0);

      if (currentMax === null) {
        throw new ValidationError(
          `Grupo "${contractType}" tem faixa aberta antes da última posição: `
            + `${describeBound(currentMin)}-${describeBound(currentMax)}.`,
        );
      }

      if (nextMin > currentMax) {
        throw new ValidationError(
          `Grupo "${contractType}" tem lacuna entre ${describeBound(currentMax)} e ${describeBound(nextMin)}: `
            + 'nenhum valor real nesse intervalo fica coberto pela política.',
        );
      }

      if (nextMin < currentMax) {
        throw new ValidationError(
          `Grupo "${contractType}" tem sobreposição entre ${describeBound(currentMin)}-${describeBound(currentMax)} e `
            + `${describeBound(nextMin)}-${describeBound(
              next.max_value === null || next.max_value === undefined ? null : toNumber(next.max_value, 0),
            )}.`,
        );
      }
    }
  }
}

/**
 * Valida o conjunto de faixas recebido. Rejeita conjunto vazio: uma política
 * vazia significaria "nenhum contrato exige aprovação", que é exatamente o
 * fail-open que o finding descreve — e o domínio, por segurança, também
 * bloqueia (fail-closed) se isso escapasse por outro caminho.
 *
 * @param body - Corpo da requisição (`{ rules: [...], reason?: string }`).
 * @returns Faixas normalizadas.
 * @throws {ValidationError} Qualquer inconsistência estrutural (400).
 */
function validatePayload(body: any): any[] {
  const rules = Array.isArray(body?.rules) ? body.rules : null;
  if (!rules || rules.length === 0) {
    throw new ValidationError('Informe "rules" com ao menos uma faixa de alçada. Política vazia não é aceita.');
  }

  const normalized = rules.map((rule: any, index: number) => {
    const position = `rules[${index}]`;
    const contractType = typeof rule?.contract_type === 'string' && rule.contract_type.trim() !== ''
      ? rule.contract_type.trim()
      : '*';

    const minValue = Number(rule?.min_value ?? 0);
    if (Number.isNaN(minValue) || minValue < 0) {
      throw new ValidationError(`${position}.min_value deve ser um número >= 0.`);
    }

    const hasMax = rule?.max_value !== null && rule?.max_value !== undefined && rule?.max_value !== '';
    const maxValue = hasMax ? Number(rule.max_value) : null;
    if (hasMax && (Number.isNaN(maxValue as number) || (maxValue as number) <= minValue)) {
      throw new ValidationError(`${position}.max_value deve ser maior que min_value (ou nulo para "sem teto").`);
    }

    const roles = Array.isArray(rule?.required_roles) ? rule.required_roles : [];
    for (const role of roles) {
      if (!CONTRACT_APPROVER_ROLES.includes(role)) {
        throw new ValidationError(`${position}.required_roles contém papel inválido "${role}". Válidos: ${CONTRACT_APPROVER_ROLES.join(', ')}.`);
      }
    }

    const level = rule?.required_level ?? 'approve';
    if (!VALID_LEVELS.includes(level)) {
      throw new ValidationError(`${position}.required_level deve ser um de: ${VALID_LEVELS.join(', ')}.`);
    }

    return {
      contract_type: contractType,
      min_value: minValue,
      max_value: maxValue,
      required_roles: roles,
      required_level: level,
      active: rule?.active === undefined ? true : Boolean(rule.active),
      valid_from: rule?.valid_from ?? null,
      valid_to: rule?.valid_to ?? null,
    };
  });
  validateContiguity(normalized);
  return normalized;
}

/** `GET /api/jur/settings/approval-thresholds` — faixas vigentes + histórico recente. */
exports.list = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rules, history] = await Promise.all([
      thresholdRepository.listAll(),
      thresholdRepository.listHistory(20),
    ]);
    res.json({ success: true, data: { rules, history } });
  } catch (error) { next(error); }
};

/**
 * `PUT /api/jur/settings/approval-thresholds` — substitui o conjunto de
 * faixas. Exige `juridico:approve` na rota (RBAC server-side); `changed_by`
 * vem sempre do JWT, nunca do body.
 */
exports.replace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = validatePayload(req.body);
    const changedBy = (req as any).user?.id ?? null;
    const saved = await thresholdRepository.replaceAll(rules, {
      changedBy,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    });
    logAction(req, {
      action: 'update',
      entityType: 'JurApprovalThreshold',
      entityId: null,
      newValues: { rules: saved },
    });
    res.json({ success: true, data: { rules: saved } });
  } catch (error) { next(error); }
};

exports.__test__validatePayload = validatePayload;
