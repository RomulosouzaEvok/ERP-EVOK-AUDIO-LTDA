const {
  createProductSchema,
  productMovementSchema,
} = require('../../src/modules/products/presentation/validators/productValidators');
const { createItemSchema } = require('../../src/modules/items/presentation/validators/itemValidators');

describe('CASE-006 - contratos bloqueiam saldo fantasma', () => {
  it('rejeita cadastro de produto com saldo inicial nao-zero', () => {
    const parsed = createProductSchema.safeParse({
      name: 'Driver',
      code: 'DRV-CASE006',
      price: 10,
      quantity: 327,
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toMatch(/Saldo inicial/i);
  });

  it('aceita cadastro de produto sem saldo inicial', () => {
    const parsed = createProductSchema.safeParse({
      name: 'Driver',
      code: 'DRV-CASE006-ZERO',
      price: 10,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data.quantity).toBeUndefined();
  });

  it('rejeita cadastro de item mestre com estoque_atual nao-zero', () => {
    const parsed = createItemSchema.safeParse({
      codigo: 'ITEM-CASE006',
      descricao: 'Item com saldo indevido',
      tipo: 'USO_E_CONSUMO',
      unidade: 'UN',
      estoque_atual: 327,
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toMatch(/Estoque inicial/i);
  });

  it('rejeita cadastro de item mestre com estoque_reservado nao-zero', () => {
    const parsed = createItemSchema.safeParse({
      codigo: 'ITEM-CASE006-RESERVADO',
      descricao: 'Item com saldo reservado indevido',
      tipo: 'USO_E_CONSUMO',
      unidade: 'UN',
      estoque_reservado: 327,
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toMatch(/Estoque inicial/i);
  });

  it('exige warehouse_code em movimentacao manual legada de produto', () => {
    const parsed = productMovementSchema.safeParse({
      product_id: 1,
      type: 'in',
      quantity: 1,
    });

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toMatch(/warehouse_code|Deposito/i);
  });
});
