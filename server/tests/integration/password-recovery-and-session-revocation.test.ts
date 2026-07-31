import crypto from 'crypto';

import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('SEC-12: recuperacao de senha e revogacao emergencial de sessao', () => {
  /**
   * `POST /api/auth/forgot-password` nunca deve revelar se o e-mail existe:
   * a resposta deve ser identica (200, mensagem generica) tanto para um
   * e-mail cadastrado quanto para um inexistente.
   *
   * @returns Promise resolvida apos comparar as duas respostas.
   */
  it('nao revela se o e-mail existe (mesma resposta para existente e inexistente)', async () => {
    const existing = await api().post('/api/auth/forgot-password').send({ email: 'admin@evokaudio.com.br' });
    const missing = await api().post('/api/auth/forgot-password').send({ email: 'nao-existe-de-verdade@evok.local' });

    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(existing.body.data.message).toBe(missing.body.data.message);
  });

  /**
   * Fluxo completo: gera um token de recuperacao diretamente no banco (via
   * model, simulando o e-mail enviado pelo `ForgotPasswordUseCase`), usa-o
   * para redefinir a senha via HTTP e confirma que (1) o token so funciona
   * uma vez, (2) a sessao antiga (token JWT anterior) foi invalidada, e
   * (3) a nova senha efetivamente funciona no login.
   *
   * @returns Promise resolvida apos validar o ciclo completo.
   */
  it('redefine a senha com token valido, invalida sessoes antigas e o token nao pode ser reutilizado', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../../src/models/index');

    const testEmail = `sec12-${Date.now()}@evok.local`;
    const oldPassword = 'SenhaAntiga123456!';
    const newPassword = 'SenhaNovaPosReset123456!';

    const user = await User.create({
      name: 'Usuario SEC-12',
      email: testEmail,
      password: oldPassword,
      role: 'operator',
      active: true,
    });

    const oldSessionLogin = await api().post('/api/auth/login').send({ email: testEmail, password: oldPassword });
    expect(oldSessionLogin.status).toBe(200);
    const oldToken = oldSessionLogin.body.data.token;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetResponse = await api()
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });
    expect(resetResponse.status).toBe(200);

    const oldSessionAfterReset = await api().get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(oldSessionAfterReset.status).toBe(401);

    const loginOldPassword = await api().post('/api/auth/login').send({ email: testEmail, password: oldPassword });
    expect(loginOldPassword.status).toBe(401);

    const loginNewPassword = await api().post('/api/auth/login').send({ email: testEmail, password: newPassword });
    expect(loginNewPassword.status).toBe(200);

    const reuseTokenResponse = await api()
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'OutraSenha123456!' });
    expect(reuseTokenResponse.status).toBe(401);
  });

  /**
   * Token de recuperacao expirado deve ser rejeitado.
   *
   * @returns Promise resolvida apos validar 401.
   */
  it('rejeita token de recuperacao expirado', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../../src/models/index');

    const testEmail = `sec12-expired-${Date.now()}@evok.local`;
    const user = await User.create({
      name: 'Usuario SEC-12 Expirado',
      email: testEmail,
      password: 'SenhaQualquer123456!',
      role: 'operator',
      active: true,
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() - 1000);
    await user.save();

    const response = await api()
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'NovaSenha123456!' });

    expect(response.status).toBe(401);
  });

  /**
   * Revogacao emergencial (admin): invalida a sessao de um usuario sem
   * exigir/alterar a senha dele.
   *
   * @returns Promise resolvida apos validar que o token antigo passa a ser 401.
   */
  it('admin revoga sessoes de outro usuario sem alterar a senha dele', async () => {
    const adminToken = authToken();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { User } = require('../../src/models/index');

    const testEmail = `sec12-revoke-${Date.now()}@evok.local`;
    const password = 'SenhaQueNaoMuda123456!';
    await User.create({
      name: 'Usuario Revogado',
      email: testEmail,
      password,
      role: 'operator',
      active: true,
    });

    const login = await api().post('/api/auth/login').send({ email: testEmail, password });
    expect(login.status).toBe(200);
    const { token, user: loggedUser } = login.body.data;

    const beforeRevoke = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(beforeRevoke.status).toBe(200);

    const revoke = await api()
      .post(`/api/users/${loggedUser.id}/revoke-sessions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revoke.status).toBe(200);

    const afterRevoke = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(afterRevoke.status).toBe(401);

    const loginStillWorks = await api().post('/api/auth/login').send({ email: testEmail, password });
    expect(loginStillWorks.status).toBe(200);
  });
});
