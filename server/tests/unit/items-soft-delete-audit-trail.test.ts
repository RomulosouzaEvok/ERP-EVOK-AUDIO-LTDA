/**
 * Regressão `AUD-ALOG-01` item B — `PATCH /api/items/:id/inactivate` **e**
 * `DELETE /api/items/:id` (inativação de item do cadastro mestre industrial)
 * têm de deixar trilha de auditoria **com autor e origem**.
 *
 * Caso de remediação: `ERP-LEGACY-001-CASE-004` (SanaCore), estágio 2,
 * autorizado por `APR-2026-033` e por `APR-2026-034` D1 (`OR-21` = Rota 2,
 * contorno documentado declaradamente). Finding:
 * `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-ALOG-01.md` (HIGH,
 * produção real).
 *
 * ## O que este arquivo prova, e por que cada asserção existe
 *
 * 1. **A trilha existe.** Antes da remediação o módulo `items` tinha ZERO
 *    `logAction` em qualquer camada — foi este módulo que originou o
 *    incidente de 2026-08-10 (327 itens criados, `audit_logs` com 2 linhas,
 *    os dois logins). O primeiro teste reprova exatamente esse estado.
 * 2. **As DUAS portas de entrada estão cobertas.** As duas rotas convergem no
 *    mesmo handler, mas a prova é feita POR ENTRADA (requisito de reteste de
 *    `T-37` §7.4) — e um teste estrutural lê `presentation/routes/items.ts`
 *    para garantir que a convergência continua valendo. Se alguém apontar
 *    `DELETE /:id` para outro handler no futuro, a trilha do `DELETE`
 *    sumiria em silêncio; aqui isso vira falha.
 * 3. **A trilha tem autor.** A asserção não é "logAction foi chamado", é
 *    "logAction recebeu ESTE `req`" — é dele que `AuditLog.register` extrai
 *    `user_id`, `user_name`, `user_ip`, `user_agent`, `route` e `method`.
 *    `AUD-ALOG-01` §7: registro sem autor **não fecha o finding**.
 * 4. **A armadilha do UUID está barrada.** `Item.id` é UUID e
 *    `audit_logs.entity_id` é `integer`; `AuditLog.register` faz
 *    `Number(entityId)`. Passar o UUID daria `NaN` → `INSERT` rejeitado →
 *    como `logAction` nunca propaga erro, o usuário receberia 200 e a trilha
 *    **não existiria**. O teste falha se `entityId` deixar de ser
 *    `undefined`, e falha explicitamente se virar `NaN`.
 * 5. **O contorno permanece recuperável.** Como `entity_id` fica nulo
 *    (`AUD-DB-04`, aberto), a linha só é achável por `entity_type='Item'` +
 *    `entity_description`. Logo `entityDescription` DEVE conter `codigo` e
 *    UUID, e DEVE caber em `varchar(255)` mesmo com `descricao` no tamanho
 *    máximo — senão o `INSERT` estoura e a trilha some pelo mesmo modo de
 *    falha do item 4.
 * 6. **Nada é logado quando o ato não aconteceu** (409 por vínculos ativos,
 *    404 por item inexistente). Trilha de fato que não ocorreu é tão
 *    defeituosa quanto a ausência de trilha.
 * 7. **O contrato HTTP não mudou** (`client/src/api/items.ts` espera o item
 *    em `data`).
 *
 * Nenhuma conexão de banco é aberta por este teste (`APR-2026-016`): models,
 * repositórios e serviço de auditoria são substituídos por dublês.
 *
 * @module tests/unit/items-soft-delete-audit-trail
 * @ticket ERP-LEGACY-001-CASE-004 / AUD-ALOG-01 item B
 */

import * as fs from 'fs';
import * as path from 'path';

const mockLogAction = jest.fn();
const mockFindById = jest.fn();
const mockUpdate = jest.fn();
const mockHasActiveParentOrComponent = jest.fn();

jest.mock('../../src/services/auditLogService', () => ({
  logAction: mockLogAction,
}));

jest.mock('../../src/models/index', () => ({
  ProductionOrder: { count: jest.fn(async () => 0) },
  InventoryMovement: { count: jest.fn(async () => 0) },
  LotControl: { count: jest.fn(async () => 0) },
  MrpOrdemPlanejada: { count: jest.fn(async () => 0) },
  Product: { findAll: jest.fn(async () => []) },
  Item: {},
}));

jest.mock(
  '../../src/modules/items/infrastructure/sequelize/SequelizeItemRepository',
  () =>
    class SequelizeItemRepositoryDouble {
      findById = mockFindById;
      update = mockUpdate;
    },
);

jest.mock(
  '../../src/modules/items/infrastructure/sequelize/SequelizeItemEstruturaRepository',
  () =>
    class SequelizeItemEstruturaRepositoryDouble {
      hasActiveParentOrComponent = mockHasActiveParentOrComponent;
    },
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const itemController = require('../../src/modules/items/presentation/controllers/itemController');

/** UUID real de item — é o formato que quebra `Number()` em `AuditLog.register`. */
const ITEM_UUID = '3f2a91c4-7b6e-4d59-9a10-8c4d2e5f7b31';

/** Item ativo, com campos comerciais que NÃO devem ir para a trilha. */
function itemAtivo(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_UUID,
    codigo: 'MP-0042',
    descricao: 'Bobina de aço 0,5mm',
    tipo: 'MATERIA_PRIMA',
    unidade: 'KG',
    status: 'ATIVO',
    custo_padrao: '1234.56',
    estoque_atual: '87.500',
    estoque_reservado: '10.000',
    ...overrides,
  };
}

function fakeReqPatch() {
  return {
    params: { id: ITEM_UUID },
    user: { id: 7, name: 'Admin Teste', role: 'admin' },
    ip: '10.0.0.9',
    headers: { 'user-agent': 'jest' },
    originalUrl: `/api/items/${ITEM_UUID}/inactivate`,
    method: 'PATCH',
  } as any;
}

function fakeReqDelete() {
  return {
    params: { id: ITEM_UUID },
    user: { id: 9, name: 'Operador Teste', role: 'operator' },
    ip: '10.0.0.21',
    headers: { 'user-agent': 'jest' },
    originalUrl: `/api/items/${ITEM_UUID}`,
    method: 'DELETE',
  } as any;
}

function fakeRes() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() } as any;
}

/** Estado feliz: item ativo, sem vínculo algum, update devolve INATIVO. */
function cenarioInativacaoPermitida(item = itemAtivo()) {
  mockFindById.mockResolvedValue(item);
  mockHasActiveParentOrComponent.mockResolvedValue(false);
  mockUpdate.mockResolvedValue({ ...item, status: 'INATIVO' });
}

describe('AUD-ALOG-01/B — inativação de item registra trilha de auditoria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emite logAction com action=soft_delete e par oldValues/newValues', async () => {
    cenarioInativacaoPermitida();
    const next = jest.fn();

    await itemController.inactivate(fakeReqPatch(), fakeRes(), next);

    expect(next).not.toHaveBeenCalled();
    // ESTA é a asserção que reprova o estado anterior à remediação: o módulo
    // `items` não chamava `logAction` em nenhuma camada.
    expect(mockLogAction).toHaveBeenCalledTimes(1);

    const params = mockLogAction.mock.calls[0][1];
    expect(params.action).toBe('soft_delete');
    expect(params.entityType).toBe('Item');
    expect(params.oldValues).toEqual({ item_id: ITEM_UUID, codigo: 'MP-0042', status: 'ATIVO' });
    expect(params.newValues).toEqual({ item_id: ITEM_UUID, codigo: 'MP-0042', status: 'INATIVO' });
  });

  it('cobre a rota PATCH /:id/inactivate com autor e origem próprios', async () => {
    cenarioInativacaoPermitida();
    const req = fakeReqPatch();

    await itemController.inactivate(req, fakeRes(), jest.fn());

    expect(mockLogAction).toHaveBeenCalledTimes(1);
    // Identidade, não equivalência: é do `req` que `AuditLog.register` extrai
    // user_id, user_name, user_ip, user_agent, route e method. Um `req`
    // sintético sem `user` produziria linha anônima — reprovação do finding.
    expect(mockLogAction.mock.calls[0][0]).toBe(req);
    expect(mockLogAction.mock.calls[0][0].user).toEqual({ id: 7, name: 'Admin Teste', role: 'admin' });
    expect(mockLogAction.mock.calls[0][1].description).toContain('PATCH');
  });

  it('cobre a rota DELETE /api/items/:id com autor e origem próprios', async () => {
    cenarioInativacaoPermitida();
    const req = fakeReqDelete();

    await itemController.inactivate(req, fakeRes(), jest.fn());

    expect(mockLogAction).toHaveBeenCalledTimes(1);
    expect(mockLogAction.mock.calls[0][0]).toBe(req);
    expect(mockLogAction.mock.calls[0][0].user).toEqual({ id: 9, name: 'Operador Teste', role: 'operator' });
    // A distinção entre as duas portas de entrada sobrevive na trilha:
    // `AuditLog.register` grava `method`/`route` a partir do próprio `req`.
    expect(mockLogAction.mock.calls[0][1].description).toContain('DELETE');
    expect(mockLogAction.mock.calls[0][0].method).toBe('DELETE');
  });

  it('as duas rotas continuam apontando para o handler auditado (prova estrutural)', () => {
    const rotas = fs.readFileSync(
      path.resolve(__dirname, '../../src/modules/items/presentation/routes/items.ts'),
      'utf8',
    );

    // Se alguém desviar uma das duas rotas para outro handler, a trilha
    // daquela porta sumiria sem nenhum teste reclamar. Aqui reclama.
    expect(rotas).toMatch(/router\.patch\(\s*'\/:id\/inactivate'[^\n]*itemController\.inactivate\s*\)/);
    expect(rotas).toMatch(/router\.delete\(\s*'\/:id'[^\n]*itemController\.inactivate\s*\)/);
  });

  it('NÃO passa o UUID em entityId — contorno declarado de AUD-DB-04 / OR-21', async () => {
    cenarioInativacaoPermitida();

    await itemController.inactivate(fakeReqPatch(), fakeRes(), jest.fn());

    const params = mockLogAction.mock.calls[0][1];

    // `audit_logs.entity_id` é `integer` e `AuditLog.register` faz
    // `Number(entityId)`. Com o UUID isso vira NaN, o INSERT é rejeitado
    // (22P02), a degradação do auditLogService não socorre (só trata erro de
    // ENUM) e o resultado é 200 ao usuário com trilha INEXISTENTE — pior que
    // a ausência atual, porque pareceria remediado.
    expect(params.entityId).toBeUndefined();
    expect(params.entityId).not.toBe(ITEM_UUID);
    expect(Number.isNaN(Number(params.entityId ?? null))).toBe(false);
  });

  it('mantém o item recuperável por entity_description (codigo + UUID), já que entity_id fica nulo', async () => {
    cenarioInativacaoPermitida();

    await itemController.inactivate(fakeReqPatch(), fakeRes(), jest.fn());

    const params = mockLogAction.mock.calls[0][1];
    // Enquanto `AUD-DB-04` estiver aberto, a consulta de reteste é por
    // `entity_type='Item'` + `entity_description`. Sem estas duas chaves o
    // contorno viraria trilha órfã.
    expect(params.entityDescription).toContain('MP-0042');
    expect(params.entityDescription).toContain(ITEM_UUID);
    expect(params.oldValues.item_id).toBe(ITEM_UUID);
    expect(params.newValues.item_id).toBe(ITEM_UUID);
  });

  it('entityDescription cabe em varchar(255) mesmo com codigo e descricao no tamanho máximo', async () => {
    // `codigo` é varchar(80) e `descricao` varchar(240): concatenados com o
    // UUID passam de 255 e o INSERT seria rejeitado — mesmo modo de falha
    // silenciosa do UUID. A truncagem tem de preservar as duas chaves de
    // recuperação e cortar só a descrição.
    cenarioInativacaoPermitida(itemAtivo({ codigo: 'C'.repeat(80), descricao: 'D'.repeat(240) }));

    await itemController.inactivate(fakeReqPatch(), fakeRes(), jest.fn());

    const { entityDescription } = mockLogAction.mock.calls[0][1];
    expect(entityDescription.length).toBeLessThanOrEqual(255);
    expect(entityDescription).toContain('C'.repeat(80));
    expect(entityDescription).toContain(ITEM_UUID);
  });

  it('não despeja campos comerciais do item no payload da trilha (payload mínimo)', async () => {
    cenarioInativacaoPermitida();

    await itemController.inactivate(fakeReqPatch(), fakeRes(), jest.fn());

    const params = mockLogAction.mock.calls[0][1];
    expect(Object.keys(params.oldValues).sort()).toEqual(['codigo', 'item_id', 'status']);
    expect(Object.keys(params.newValues).sort()).toEqual(['codigo', 'item_id', 'status']);

    // `old_values`/`new_values` são colunas `json` livres, sem mascaramento e
    // sem imutabilidade (AUD-DB-08, FIND-ERP-002): serializar o item inteiro
    // trocaria um defeito de auditoria por exposição desnecessária.
    const serializado = JSON.stringify(params);
    for (const valor of ['1234.56', '87.500', '10.000']) {
      expect(serializado).not.toContain(valor);
    }
    for (const chave of ['custo_padrao', 'estoque_atual', 'estoque_reservado']) {
      expect(serializado).not.toContain(`"${chave}"`);
    }
  });

  it('não registra soft_delete quando o item tem vínculos ativos (409)', async () => {
    mockFindById.mockResolvedValue(itemAtivo());
    mockHasActiveParentOrComponent.mockResolvedValue(true); // BOM ativa
    const next = jest.fn();

    await itemController.inactivate(fakeReqDelete(), fakeRes(), next);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('não registra soft_delete quando o item não existe (404)', async () => {
    mockFindById.mockResolvedValue(null);
    const next = jest.fn();

    await itemController.inactivate(fakeReqPatch(), fakeRes(), next);

    expect(mockLogAction).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('preserva o contrato HTTP das duas rotas (envelope e item inalterados)', async () => {
    cenarioInativacaoPermitida();
    const res = fakeRes();

    await itemController.inactivate(fakeReqPatch(), res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ id: ITEM_UUID, codigo: 'MP-0042', status: 'INATIVO' }),
    });
  });
});
