import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

// Assinatura PNG real (8 bytes) — suficiente para passar na validação de
// magic bytes real do uploadService, sem precisar de um PNG completo.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describeIntegration('Upload de foto e geração de QR Code (produtos e ativos)', () => {
  /** @returns Promise resolvida após validar upload de foto + persistência real de photo_path. */
  it('envia a foto de um produto e persiste photo_path', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const upload = await api()
      .post(`/api/products/${productId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_SIGNATURE, 'foto.png');

    expect(upload.status).toBe(200);
    expect(upload.body.data.photo_path).toMatch(/^uploads\/products\/.*\.png$/);

    const fetched = await api().get(`/api/products/${productId}`).set('Authorization', `Bearer ${token}`);
    expect(fetched.body.data.photo_path).toBe(upload.body.data.photo_path);
  });

  /** @returns Promise resolvida após validar rejeição de arquivo não-imagem. */
  it('rejeita upload de foto sem arquivo de imagem', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const upload = await api()
      .post(`/api/products/${productId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', Buffer.from('nao e uma imagem'), { filename: 'arquivo.txt', contentType: 'text/plain' });

    expect(upload.status).toBe(400);
  });

  /** @returns Promise resolvida após validar geração de QR Code PNG e SVG do produto. */
  it('gera o QR Code (PNG e SVG) de um produto', async () => {
    const token = authToken();
    const productId = Number(process.env.TEST_PRODUCT_ID);

    const png = await api().get(`/api/products/${productId}/qrcode`).set('Authorization', `Bearer ${token}`);
    expect(png.status).toBe(200);
    expect(png.body.data.format).toBe('png');
    expect(png.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    const svg = await api().get(`/api/products/${productId}/qrcode?format=svg`).set('Authorization', `Bearer ${token}`);
    expect(svg.status).toBe(200);
    expect(svg.body.data.format).toBe('svg');
    expect(svg.body.data.qrSvg).toContain('<svg');
  });

  /** @returns Promise resolvida após validar upload de foto + QR Code de um ativo (patrimônio). */
  it('envia a foto e gera o QR Code de um ativo (patrimônio)', async () => {
    const token = authToken();

    const created = await api()
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({ tag: `AT-${Date.now()}`, name: 'Ativo de teste de integração' });
    expect(created.status).toBe(201);
    const assetId = created.body.data.id;

    const upload = await api()
      .post(`/api/assets/${assetId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_SIGNATURE, 'foto.png');
    expect(upload.status).toBe(200);
    expect(upload.body.data.photo_path).toMatch(/^uploads\/assets\/.*\.png$/);

    const qrcode = await api().get(`/api/assets/${assetId}/qrcode`).set('Authorization', `Bearer ${token}`);
    expect(qrcode.status).toBe(200);
    expect(qrcode.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  /** @returns Promise resolvida após validar 404 para foto/QR Code de ativo inexistente. */
  it('retorna 404 para foto/QR Code de ativo inexistente', async () => {
    const token = authToken();

    const upload = await api()
      .post('/api/assets/999999999/photo')
      .set('Authorization', `Bearer ${token}`)
      .attach('photo', PNG_SIGNATURE, 'foto.png');
    expect(upload.status).toBe(404);

    const qrcode = await api().get('/api/assets/999999999/qrcode').set('Authorization', `Bearer ${token}`);
    expect(qrcode.status).toBe(404);
  });
});
