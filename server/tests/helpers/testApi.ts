import request from 'supertest';

/**
 * Cria um agente Supertest apontando para a API em execucao.
 *
 * @returns Agente HTTP para testes de integracao.
 */
export function api(): request.SuperTest<request.Test> {
  const baseUrl = process.env.TEST_API_URL || 'http://127.0.0.1:3001';
  return request(baseUrl);
}

/**
 * Retorna o token Bearer usado nos testes de integracao protegidos.
 *
 * @returns Token JWT configurado no ambiente.
 * @throws {Error} Quando o token nao foi informado.
 */
export function authToken(): string {
  const token = process.env.TEST_AUTH_TOKEN;
  if (!token) {
    throw new Error('Configure TEST_AUTH_TOKEN para executar testes de integracao autenticados.');
  }
  return token;
}

/**
 * Define se os testes de integracao devem rodar contra API/PostgreSQL reais.
 *
 * @returns Verdadeiro quando RUN_INTEGRATION=true.
 */
export function integrationEnabled(): boolean {
  return process.env.RUN_INTEGRATION === 'true';
}

/**
 * Indica se o ambiente minimo para testes de integracao esta pronto.
 *
 * @returns Verdadeiro quando a API e as credenciais basicas estao configuradas.
 */
export function hasIntegrationPrerequisites(): boolean {
  return integrationEnabled() && Boolean(process.env.TEST_AUTH_TOKEN) && Boolean(process.env.TEST_API_URL);
}
