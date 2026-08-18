import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { httpClient } from './httpClient';
import { emitCat, reopenCat, type Cat } from './sst';

vi.mock('./httpClient', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('contrato do cliente SST/CAT — CASE-011', () => {
  beforeEach(() => {
    vi.mocked(httpClient.post).mockReset();
    vi.mocked(httpClient.post).mockResolvedValue({ data: { data: {} } });
  });

  it('emite e reabre CAT sem tipo ou emitente textual no payload', async () => {
    await emitCat(77);
    await reopenCat(200);

    expect(httpClient.post).toHaveBeenNthCalledWith(1, '/api/sst/accidents/77/cat');
    expect(httpClient.post).toHaveBeenNthCalledWith(2, '/api/sst/cat/200/reopen');
  });

  it('expõe tipo obito e assinaturas sem parâmetro emitente', () => {
    expectTypeOf<Parameters<typeof emitCat>>().toEqualTypeOf<[accidentId: number]>();
    expectTypeOf<Parameters<typeof reopenCat>>().toEqualTypeOf<[catId: number]>();

    const cat: Cat = {
      id: 200,
      accident_id: 77,
      tipo: 'obito',
      prazo_limite: '2026-08-18',
      status: 'pendente_transmissao',
    };
    expect(cat.tipo).toBe('obito');
  });
});
