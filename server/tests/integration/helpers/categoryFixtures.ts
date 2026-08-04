import { api } from '../../helpers/testApi';

/**
 * 🏷️ Fixture compartilhada de categoria para testes de integração do
 * módulo `products`.
 *
 * Alguns testes de integração assumiam `category_id: 1` fixo, partindo do
 * pressuposto de que a categoria semeada (`seeds.ts`) sempre nasce com id
 * 1 num banco "zero". Isso é frágil: em qualquer banco de desenvolvimento/
 * homologação de longa duração (reutilizado entre rodadas de CI, sem
 * `TRUNCATE ... RESTART IDENTITY`), a sequência de `categories.id` avança
 * e a categoria semeada pode nascer com outro id (ex.: id 7) — o hardcode
 * `category_id: 1` então aponta para um registro inexistente e a criação
 * de produto falha com 400 (`Registro referenciado não encontrado`),
 * mesmo sem nenhuma regressão real de código.
 *
 * @module tests/integration/helpers/categoryFixtures
 */

/**
 * Resolve o id de uma categoria ativa qualquer, reutilizando a primeira
 * disponível (`GET /api/categories`) ou criando uma fixture dedicada se a
 * tabela estiver vazia. Não depende de nenhum id fixo.
 *
 * @param token - Token Bearer autenticado.
 * @returns Id de uma categoria ativa válida para uso em `category_id`.
 * @throws {Error} Se não for possível listar nem criar uma categoria.
 */
export async function ensureFixtureCategoryId(token: string): Promise<number> {
  const listResponse = await api()
    .get('/api/categories')
    .set('Authorization', `Bearer ${token}`);

  const existing = listResponse.body?.data?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const createResponse = await api()
    .post('/api/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Categoria Fixture CI ${Date.now()}`, description: 'Fixture automatizada de testes de integracao' });

  if (createResponse.status !== 201) {
    throw new Error(`Falha ao criar/localizar categoria fixture: ${JSON.stringify(createResponse.body)}`);
  }

  return createResponse.body.data.id;
}
