/**
 * Test: Sales Validators (Zod Schemas)
 *
 * Valida que o módulo de vendas rejeita payload inválido/desconhecido,
 * cobrindo o achado F.5 que exigia validação Zod no módulo.
 *
 * Critério de aceite F.5: Rotas de vendas rejeitam payload inválido/desconhecido
 * com erro estruturado (HTTP 400), igual aos demais módulos críticos.
 *
 * @group unit
 * @ticket F.5-Sprint-F
 */

import {
  createSaleSchema,
  updateSaleStatusSchema,
  listSalesQuerySchema,
  getSaleByIdParamSchema
} from '../../src/modules/sales/presentation/validators/saleValidators';

describe('Sales Validators - Zod Schemas (F.5)', () => {
  describe('createSaleSchema', () => {
    it('deve aceitar payload válido de criação de venda', () => {
      const validPayload = {
        customer_id: 1,
        items: [
          { product_id: 10, quantity: 5, unit_price: 100.50 }
        ],
        discount: 10,
        payment_method: 'credit_card',
        installments: 3,
        notes: 'Venda teste'
      };

      const result = createSaleSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        customer_id: 1,
        discount: 10,
        installments: 3
      }));
    });

    it('deve rejeitar campo desconhecido (strict mode)', () => {
      const invalidPayload = {
        customer_id: 1,
        items: [
          { product_id: 10, quantity: 5, unit_price: 100.50 }
        ],
        unknown_field: 'deve ser rejeitado'
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.code === 'unrecognized_keys')).toBe(true);
      }
    });

    it('deve rejeitar customer_id inválido', () => {
      const invalidPayload = {
        customer_id: -1, // inválido: deve ser positivo
        items: [{ product_id: 10, quantity: 5, unit_price: 100.50 }]
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar items vazio', () => {
      const invalidPayload = {
        customer_id: 1,
        items: [] // inválido: deve ter pelo menos 1
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar quantity negativa ou zero', () => {
      const invalidPayload = {
        customer_id: 1,
        items: [
          { product_id: 10, quantity: 0, unit_price: 100 } // inválido
        ]
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar payment_method inválido', () => {
      const invalidPayload = {
        customer_id: 1,
        items: [{ product_id: 10, quantity: 5, unit_price: 100 }],
        payment_method: 'crypto_currency' // inválido: não está no enum
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve usar valores padrão para discount e installments', () => {
      const minimalPayload = {
        customer_id: 1,
        items: [{ product_id: 10, quantity: 5, unit_price: 100 }]
      };

      const result = createSaleSchema.safeParse(minimalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discount).toBe(0);
        expect(result.data.installments).toBe(1);
      }
    });

    it('deve rejeitar decimal com mais de 6 casas', () => {
      const invalidPayload = {
        customer_id: 1,
        items: [
          { product_id: 10, quantity: 5.1234567, unit_price: 100 } // > 6 casas
        ]
      };

      const result = createSaleSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSaleStatusSchema', () => {
    it('deve aceitar status válido', () => {
      const validPayload = { status: 'confirmed' };
      const result = updateSaleStatusSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar status inválido', () => {
      const invalidPayload = { status: 'pending' }; // não existe no enum
      const result = updateSaleStatusSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar campo desconhecido', () => {
      const invalidPayload = { status: 'confirmed', extra_field: 'deve ser rejeitado' };
      const result = updateSaleStatusSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('listSalesQuerySchema', () => {
    it('deve aceitar query válida', () => {
      const validQuery = {
        page: '1',
        limit: '10',
        status: 'confirmed'
      };

      const result = listSalesQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar page inválida (zero ou negativa)', () => {
      const invalidQuery = { page: '0' };
      const result = listSalesQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('deve converter string para número automaticamente', () => {
      const queryWithStrings = { page: '5', limit: '20' };
      const result = listSalesQuerySchema.safeParse(queryWithStrings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.page).toBe('number');
      }
    });
  });

  describe('getSaleByIdParamSchema', () => {
    it('deve aceitar id válido', () => {
      const validParams = { id: '123' };
      const result = getSaleByIdParamSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar id inválido (zero ou negativo)', () => {
      const invalidParams = { id: '0' };
      const result = getSaleByIdParamSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar id não-numérico', () => {
      const invalidParams = { id: 'abc' };
      const result = getSaleByIdParamSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });
});
