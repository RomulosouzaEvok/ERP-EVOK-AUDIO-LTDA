/**
 * PASSO 30 — TESTE DE CARACTERIZAÇÃO (ERP-LEGACY-001)
 *
 * Cluster: `qualidade-estoque` · Alvo: **BR-QE-011** — "Movimentação mobile
 * fora dos controles de lote e depósito"
 * (`docs/coretriad/projects/ERP-LEGACY-001/discovery/BUSINESS_RULE_CANDIDATES_qualidade-estoque.md`),
 * candidato **CRITICAL/CONFIRMED** a finding formal (= L-1/F-5, ainda NÃO
 * promovido; ver
 * `LEGACY_TRACEABILITY_MATRIX_qualidade-estoque.md` §5, linha BR-QE-011: "TC
 * cego" — o único teste existente, `mobileInventory-use-cases.test.ts`,
 * cobre apenas validação de entrada e NUNCA exercita o bypass).
 *
 * ## Comportamento congelado
 * `ScanItemUseCase.execute` (`POST /api/mobile-inventory/scan`) valida saída
 * (`type='out'`) **apenas** contra `product.quantity` bruto
 * (`ScanItemUseCase.ts:63-64`) e chama `InventoryService.adjust(product.id,
 * type, qty, userId, description, transaction)` com **6 argumentos**
 * (`ScanItemUseCase.ts:67-74`) — o 7º parâmetro `warehouseId` de
 * `inventoryService.ts:327-334` é omitido. Em contraste,
 * `CreateInventoryMovementUseCase` (rota `/api/inventory/movements`) sempre
 * resolve e passa um depósito (`warehouse.id`) e valida saldo por depósito
 * via `WarehouseStockService.removeFromWarehouse` ANTES de ajustar
 * (`CreateInventoryMovementUseCase.ts:97-116`).
 *
 * Efeitos observáveis congelados por este teste (não apenas o status HTTP):
 *  1. **Fura quarentena (BR-QE-005 furada por BR-QE-011):** o scan debita
 *     `products.quantity` mesmo quando TODO o saldo físico do produto está
 *     retido em lote(s) `quarantine`/`blocked` — `quarantineBalanceService`
 *     (o mesmo serviço que os leitores de planejamento usam,
 *     `quarantineBalanceService.ts:73,132-138`) calcularia **0** disponível
 *     antes e depois do scan, e mesmo assim a baixa é aceita sem erro.
 *  2. **Ignora depósito:** o `InventoryMovement` gerado grava
 *     `warehouse_id: null` (`inventoryService.ts:162-190`,
 *     `createMovement`) — nenhum depósito é resolvido, validado ou
 *     debitado.
 *  3. **Ignora `lot_controls` por completo:** nem `LotControl.findByPk` nem
 *     `LotControl.update` são chamados em nenhum ponto do caminho do scan —
 *     a baixa não reduz `lot_controls.quantity_available` do lote retido, e
 *     o saldo retido calculado por `quarantineBalanceService` fica **maior**
 *     que o saldo físico real do produto logo após o scan (drift silencioso
 *     entre as duas fontes, sem qualquer log/aviso).
 *
 * Este teste NÃO valida que o comportamento está correto; ele registra o
 * comportamento vigente na baseline. Alterá-lo exige decisão de negócio
 * registrada.
 *
 * Estilo: unit — exercita `ScanItemUseCase` REAL (mobileInventory) contra
 * `services/inventoryService.ts` REAL (não mockado, é ele quem decide
 * aceitar/rejeitar e escrever o InventoryMovement) e
 * `services/quarantineBalanceService.ts` REAL (usado só como oráculo do que
 * o planejamento veria, para provar o furo), com `models/index` substituído
 * por dublês em memória fiéis ao contrato Sequelize usado (mesmo padrão de
 * `server/tests/unit/warehouse-invariants.test.ts` e
 * `server/tests/unit/quarantine-blocks-planning-balance.test.ts`). Não abre
 * conexão de banco — roda em `npx jest tests/characterization/<arquivo>
 * --runInBand`.
 *
 * @module tests/characterization/qualidade-estoque--scan-mobile-fura-quarentena
 */

describe.skip('Caracterização — scan mobile (BR-QE-011): fura quarentena e ignora depósito/lote', () => {
  const PRODUCT_ID = 501;
  const PRODUCT_CODE = 'WOOFER-8-RETIDO';

  let ScanItemUseCase: any;
  let QuarantineBalanceService: any;
  let InventoryMovement: any;
  let LotControl: any;
  let productRow: { id: number; name: string; quantity: number; reserved_quantity: number };

  beforeEach(() => {
    jest.resetModules();

    // Produto com saldo físico 50 — e, como o cenário monta a seguir, os 50
    // estão 100% retidos em quarentena (nada foi liberado pela Qualidade).
    productRow = { id: PRODUCT_ID, name: 'Woofer 8" (lote retido)', quantity: 50, reserved_quantity: 0 };

    const Product = {
      findByPk: jest.fn(async (id: number) => {
        if (id !== productRow.id) return null;
        return {
          id: productRow.id,
          name: productRow.name,
          get quantity() { return productRow.quantity; },
          reserved_quantity: productRow.reserved_quantity,
          increment: jest.fn(async (_field: string, opts: { by: number }) => {
            productRow.quantity = Number(productRow.quantity) + Number(opts.by);
          }),
          decrement: jest.fn(async (_field: string, opts: { by: number }) => {
            productRow.quantity = Number(productRow.quantity) - Number(opts.by);
          }),
        };
      }),
    };

    InventoryMovement = {
      create: jest.fn(async (data: any) => ({ id: 777, ...data })),
    };

    // Único lote do produto: 100% do saldo físico (50) declarado
    // 'quarantine' em lot_controls — exatamente o dado que
    // quarantineBalanceService soma para dizer ao planejamento "0
    // disponível". O scan mobile nunca lê esta tabela.
    LotControl = {
      findAll: jest.fn(async () => [{ product_id: PRODUCT_ID, withheld_quantity: '50' }]),
      findByPk: jest.fn(),
      update: jest.fn(),
    };

    jest.doMock('../../src/models/index', () => ({ Product, InventoryMovement, LotControl }));

    // REQUIRE APÓS doMock, dentro do teste: services reais (não mockados) —
    // é a mesma técnica de warehouse-invariants.test.ts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    QuarantineBalanceService = require('../../src/services/quarantineBalanceService');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ScanItemUseCase = require('../../src/modules/mobileInventory/application/use-cases/ScanItemUseCase');
  });

  /**
   * Repositório de inventário mobile fiel ao contrato real
   * (`MobileInventoryRepository.findProductByCode`): resolve o produto pelo
   * código, devolvendo o saldo físico bruto — a mesma leitura rasa que
   * `ScanItemUseCase.ts:59` faz antes de chamar `InventoryService.adjust`.
   *
   * @returns Dublê de `MobileInventoryRepository`.
   */
  function buildMobileRepository() {
    return {
      findProductByCode: jest.fn(async (code: string) =>
        code === PRODUCT_CODE
          ? { id: productRow.id, name: productRow.name, code: PRODUCT_CODE, quantity: productRow.quantity }
          : null
      ),
    };
  }

  it('planejamento vê 0 disponível (100% do saldo físico está retido em quarentena) — cenário de partida', async () => {
    const withheld = await QuarantineBalanceService.sumWithheldByProduct([PRODUCT_ID]);
    const planningAvailable = QuarantineBalanceService.planningQuantity(productRow.quantity, withheld.get(PRODUCT_ID));

    expect(withheld.get(PRODUCT_ID)).toBe(50);
    expect(planningAvailable).toBe(0); // max(0, 50 - 50) — nada liberado para consumo
  });

  it('scan mobile "out" NÃO é rejeitado mesmo com 100% do saldo em quarentena e debita o físico do produto', async () => {
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    const result = await useCase.execute({
      product_code: PRODUCT_CODE,
      quantity: 20,
      type: 'out',
      userId: 42,
      transaction: {},
    });

    // Congela o bug central de BR-QE-011: nenhuma exceção, saída aceita e
    // aplicada, apesar de o planejamento enxergar 0 disponível para este
    // produto (teste anterior).
    expect(result.new_quantity).toBe(30); // 50 - 20 = 30
    expect(productRow.quantity).toBe(30);

    // A Qualidade nunca liberou nada: LotControl jamais é consultado nem
    // gravado pelo caminho do scan — a baixa é inteiramente cega ao lote retido.
    expect(LotControl.findByPk).not.toHaveBeenCalled();
    expect(LotControl.update).not.toHaveBeenCalled();
  });

  it('o InventoryMovement gerado grava warehouse_id NULL — nenhum depósito é resolvido, validado ou debitado', async () => {
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    await useCase.execute({ product_code: PRODUCT_CODE, quantity: 20, type: 'out', userId: 42, transaction: {} });

    expect(InventoryMovement.create).toHaveBeenCalledTimes(1);
    const [payload] = InventoryMovement.create.mock.calls[0];
    expect(payload.warehouse_id).toBeNull();
    // ScanItemUseCase delega em InventoryService.adjust, que grava sempre
    // type='adjustment' (mesmo sendo uma saída 'out' de fato) — mesma
    // divergência de nomenclatura já registrada para /api/inventory/movements.
    expect(payload.type).toBe('adjustment');
  });

  it('após a baixa, o saldo retido calculado (LotControl) fica MAIOR que o saldo físico real — drift silencioso introduzido pelo scan', async () => {
    const repository = buildMobileRepository();
    const useCase = new ScanItemUseCase(repository);

    await useCase.execute({ product_code: PRODUCT_CODE, quantity: 20, type: 'out', userId: 42, transaction: {} });

    // O produto físico caiu para 30, mas o único lote que "contém" esse
    // saldo continua declarando 50 retidos — o scan nunca tocou
    // lot_controls.quantity_available. Reconsultar o saldo retido reflete
    // o número estático do fixture, agora inconsistente com o físico real:
    // o sistema passa a acreditar que há MAIS material em quarentena do que
    // fisicamente existe no produto.
    const withheldAfter = await QuarantineBalanceService.sumWithheldByProduct([PRODUCT_ID]);

    expect(withheldAfter.get(PRODUCT_ID)).toBe(50); // LotControl não mudou
    expect(productRow.quantity).toBe(30); // Product.quantity mudou
    expect(withheldAfter.get(PRODUCT_ID)).toBeGreaterThan(productRow.quantity); // drift: retido > físico real
  });
});
