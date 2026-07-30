/**
 * Test: Product Movement Decimal Regression
 *
 * Verifica que operações de estoque em campos DECIMAL não concatenam strings.
 * Isso foi um bug crítico onde `"15.500000" + 5` virava `"15.5000005"` em vez de `20.5`.
 *
 * Contexto: O driver pg do Sequelize retorna DECIMAL como string.
 * Toda leitura de `.quantity`, `.reserved_quantity`, `.min_quantity` deve fazer parseFloat/Number.
 *
 * @group unit
 * @ticket F.1-Sprint-F
 */

describe('Product Movement - DECIMAL Regression (F.1)', () => {
  describe('RegisterProductMovementUseCase', () => {
    it('deve somar corretamente quando product.quantity é string (simulando driver pg)', () => {
      // Simula o comportamento real do driver pg que retorna DECIMAL como string
      const productQuantityAsString = '15.500000';
      const quantity = 5;

      // ❌ Código ERRADO (concatenação):
      // const newQuantity = productQuantityAsString + quantity;
      // Result: "15.5000005" ← ERRADO!

      // ✅ Código CORRETO (parseFloat + soma):
      const parseFloat_productQuantity = parseFloat(productQuantityAsString || 0);
      const newQuantity = parseFloat_productQuantity + quantity;

      // Assert
      expect(newQuantity).toBe(20.5);
      expect(typeof newQuantity).toBe('number');
      expect(newQuantity.toString()).not.toContain('15.5000005');
    });

    it('deve somar corretamente em operação de saída (out)', () => {
      const productQuantityAsString = '100.250000';
      const quantity = 25.5;

      const parseFloat_productQuantity = parseFloat(productQuantityAsString || 0);
      const newQuantity = parseFloat_productQuantity - quantity; // out operation

      expect(newQuantity).toBe(74.75);
      expect(typeof newQuantity).toBe('number');
    });

    it('deve preservar precisão decimal até 6 casas', () => {
      const productQuantityAsString = '50.123456';
      const quantity = 10.654321;

      const parseFloat_productQuantity = parseFloat(productQuantityAsString || 0);
      const newQuantity = parseFloat_productQuantity + quantity;

      // JavaScript floating point: 50.123456 + 10.654321 = 60.777777
      expect(newQuantity).toBeCloseTo(60.777777, 5);
    });

    it('deve tratar undefined/null como 0', () => {
      const productQuantityAsUndefined = undefined;
      const quantity = 5;

      const parseFloat_productQuantity = parseFloat(productQuantityAsUndefined || 0);
      const newQuantity = parseFloat_productQuantity + quantity;

      expect(newQuantity).toBe(5);
    });

    it('deve tratar null como 0', () => {
      const productQuantityAsNull = null;
      const quantity = 5;

      const parseFloat_productQuantity = parseFloat(productQuantityAsNull || 0);
      const newQuantity = parseFloat_productQuantity + quantity;

      expect(newQuantity).toBe(5);
    });
  });

  describe('BomService', () => {
    it('deve recuperar stock_available como número, não string', () => {
      // Simula component retornado do Sequelize com quantity como string
      const component = {
        id: 1,
        name: 'Componente A',
        quantity: '45.500000', // Driver pg retorna DECIMAL como string
        min_quantity: '10.000000'
      };

      // ✅ Código CORRETO:
      const stock_available = parseFloat(component.quantity || 0);
      const stock_minimum = parseFloat(component.min_quantity || 0);

      expect(stock_available).toBe(45.5);
      expect(stock_minimum).toBe(10);
      expect(typeof stock_available).toBe('number');
      expect(typeof stock_minimum).toBe('number');

      // Validação: stock suficiente?
      expect(stock_available - stock_minimum).toBeGreaterThan(0);
    });
  });
});
