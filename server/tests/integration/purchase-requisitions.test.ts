import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Purchase requisitions', () => {
  it('creates and retrieves a requisition', async () => {
    const token = authToken();

    const itemsResponse = await api()
      .get('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 1 })
      .expect(200);

    const itemId = itemsResponse.body?.data?.[0]?.id;
    expect(itemId).toBeTruthy();

    const created = await api()
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        origin: 'manual',
        notes: 'Requisicao automatizada de teste',
        items: [
          {
            item_id: itemId,
            quantity: 2,
            required_date: '2026-08-15',
          },
        ],
      })
      .expect(201);

    const requisitionId = created.body?.data?.id;
    expect(requisitionId).toBeTruthy();

    const fetched = await api()
      .get(`/api/purchase-requisitions/${requisitionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(fetched.body?.data?.id).toBe(requisitionId);
    expect(fetched.body?.data?.items?.length).toBe(1);
  });
});

