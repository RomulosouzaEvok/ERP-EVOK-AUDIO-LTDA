/**
 * Test: Semáforo de Handoff Entre Departamentos (UC-40, BUSINESS_RULES.md
 * §10, docs/governance/TODO.md Bloco 3).
 *
 * Cobre a tabela normativa completa de `calculateHandoffSignal` — uma
 * cadeia (`kind`) por bloco `describe`, cruzando os critérios de cor da
 * tabela §10/UC-40 com os campos reais de cada model.
 *
 * @group unit
 */

import { calculateHandoffSignal } from '../../src/shared/domain/handoffSignal';

describe('calculateHandoffSignal — tabela normativa §10/UC-40', () => {
  describe("Compras → Recebimento (kind='purchase')", () => {
    const now = new Date('2026-08-04T12:00:00Z');

    it('pedido sent dentro do prazo -> green ("A caminho")', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'sent', expected_date: '2026-08-09', delivery_date: null },
        now,
      );
      expect(result).toBe('green');
    });

    it('pedido approved/partial dentro do prazo -> green', () => {
      expect(
        calculateHandoffSignal('purchase', { status: 'approved', expected_date: '2026-08-10', delivery_date: null }, now),
      ).toBe('green');
      expect(
        calculateHandoffSignal('purchase', { status: 'partial', expected_date: '2026-08-10', delivery_date: null }, now),
      ).toBe('green');
    });

    it('pedido com expected_date vencida e sem delivery_date -> red, e continua na fila (nao ha estado "fora da fila" neste utilitario)', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'sent', expected_date: '2026-08-01', delivery_date: null },
        now,
      );
      expect(result).toBe('red');
    });

    it('pedido sem expected_date informada -> green (sem criterio de atraso aplicavel)', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'sent', expected_date: null, delivery_date: null },
        now,
      );
      expect(result).toBe('green');
    });

    it('pedido com expected_date vencida MAS ja com delivery_date -> green (nao esta mais em aberto)', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'partial', expected_date: '2026-08-01', delivery_date: '2026-08-03' },
        now,
      );
      expect(result).toBe('green');
    });

    it('pedido received sai da regua de atraso mesmo com expected_date vencida -> green (estado terminal)', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'received', expected_date: '2026-08-01', delivery_date: null },
        now,
      );
      expect(result).toBe('green');
    });

    it('pedido canceled sai da regua de atraso -> green (estado terminal)', () => {
      const result = calculateHandoffSignal(
        'purchase',
        { status: 'canceled', expected_date: '2026-08-01', delivery_date: null },
        now,
      );
      expect(result).toBe('green');
    });
  });

  describe("Recebimento/Qualidade → Almoxarifado (kind='lot')", () => {
    it('lote available -> green ("Liberado")', () => {
      expect(calculateHandoffSignal('lot', { status: 'available' })).toBe('green');
    });

    it('lote quarantine -> yellow ("Aguardando inspecao")', () => {
      expect(calculateHandoffSignal('lot', { status: 'quarantine' })).toBe('yellow');
    });

    it('lote blocked -> red ("Bloqueado"/"Reprovado")', () => {
      expect(calculateHandoffSignal('lot', { status: 'blocked' })).toBe('red');
    });

    it('demais status de lote (reserved/consumed/expired) -> green (fora da regua de alerta)', () => {
      expect(calculateHandoffSignal('lot', { status: 'reserved' })).toBe('green');
      expect(calculateHandoffSignal('lot', { status: 'consumed' })).toBe('green');
      expect(calculateHandoffSignal('lot', { status: 'expired' })).toBe('green');
    });
  });

  describe("Vendas → Expedição (kind='sale')", () => {
    it('venda invoiced -> green ("Pronta para embarque")', () => {
      expect(calculateHandoffSignal('sale', { status: 'invoiced', nfe_status: 'authorized' })).toBe('green');
    });

    it('venda com nfe_status processing (NF-e em emissao) -> yellow', () => {
      expect(calculateHandoffSignal('sale', { status: 'confirmed', nfe_status: 'processing' })).toBe('yellow');
    });

    it('venda com nfe_status denied -> red', () => {
      expect(calculateHandoffSignal('sale', { status: 'confirmed', nfe_status: 'denied' })).toBe('red');
    });

    it('venda com nfe_status cancelled -> red', () => {
      expect(calculateHandoffSignal('sale', { status: 'confirmed', nfe_status: 'cancelled' })).toBe('red');
    });

    it('venda cancelada (sale.status=canceled) -> red, mesmo sem nfe_status', () => {
      expect(calculateHandoffSignal('sale', { status: 'canceled', nfe_status: null })).toBe('red');
    });

    it('venda quote/confirmed sem NF-e em andamento -> green (fora da regua de alerta, ainda nao chegou na Expedicao)', () => {
      expect(calculateHandoffSignal('sale', { status: 'quote', nfe_status: 'pending' })).toBe('green');
      expect(calculateHandoffSignal('sale', { status: 'confirmed', nfe_status: 'pending' })).toBe('green');
    });

    it('venda shipped -> green (ja embarcada, nao e mais um alerta de pendencia)', () => {
      expect(calculateHandoffSignal('sale', { status: 'shipped', nfe_status: 'authorized' })).toBe('green');
    });
  });

  describe("Recebimento/Qualidade → RNC (kind='non_conformity')", () => {
    it('RNC open -> yellow ("Em tratativa")', () => {
      expect(calculateHandoffSignal('non_conformity', { status: 'open' })).toBe('yellow');
    });

    it('RNC analysis (equivalente a in_analysis) -> yellow', () => {
      expect(calculateHandoffSignal('non_conformity', { status: 'analysis' })).toBe('yellow');
    });

    it('RNC closed com effectiveness_result != effective -> red ("Reincidente")', () => {
      expect(
        calculateHandoffSignal('non_conformity', { status: 'closed', effectiveness_result: 'ineffective' }),
      ).toBe('red');
      expect(
        calculateHandoffSignal('non_conformity', { status: 'closed', effectiveness_result: 'partially_effective' }),
      ).toBe('red');
      expect(calculateHandoffSignal('non_conformity', { status: 'closed', effectiveness_result: null })).toBe('red');
    });

    it('RNC closed com effectiveness_result=effective -> green (resolvida com sucesso)', () => {
      expect(
        calculateHandoffSignal('non_conformity', { status: 'closed', effectiveness_result: 'effective' }),
      ).toBe('green');
    });

    it('RNC corrective_action/effectiveness_check/canceled -> green (fora da regua de alerta desta tabela)', () => {
      expect(calculateHandoffSignal('non_conformity', { status: 'corrective_action' })).toBe('green');
      expect(calculateHandoffSignal('non_conformity', { status: 'effectiveness_check' })).toBe('green');
      expect(calculateHandoffSignal('non_conformity', { status: 'canceled' })).toBe('green');
    });
  });

  describe("Requisições de compra — fila de aprovação (kind='purchase_requisition', aditivo)", () => {
    it('requisicao pending -> yellow ("Aguardando aprovacao")', () => {
      expect(calculateHandoffSignal('purchase_requisition', { status: 'pending' })).toBe('yellow');
    });

    it('demais status (draft/approved/ordered/partial/received/canceled) -> green', () => {
      expect(calculateHandoffSignal('purchase_requisition', { status: 'draft' })).toBe('green');
      expect(calculateHandoffSignal('purchase_requisition', { status: 'approved' })).toBe('green');
      expect(calculateHandoffSignal('purchase_requisition', { status: 'ordered' })).toBe('green');
      expect(calculateHandoffSignal('purchase_requisition', { status: 'canceled' })).toBe('green');
    });
  });

  it('lanca erro para um kind desconhecido (guarda de exaustividade)', () => {
    expect(() => calculateHandoffSignal('invalid' as any, {} as any)).toThrow(
      /kind desconhecido/,
    );
  });
});
