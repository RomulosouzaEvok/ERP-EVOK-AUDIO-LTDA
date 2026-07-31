import { api, authToken, hasIntegrationPrerequisites } from '../helpers/testApi';

const describeIntegration = hasIntegrationPrerequisites() ? describe : describe.skip;

describeIntegration('Regressao: criar BOM com componente de product_type incompativel com component_type', () => {
  /**
   * Regressao para um bug real encontrado ao construir o frontend: o
   * frontend de cadastro de produto nao pede `product_type` (default do
   * model e `finished`), entao qualquer produto criado pela tela, mesmo
   * destinado a ser materia-prima/componente, nasce com `product_type:
   * 'finished'`. `BomService.createBOM` usava
   * `item.component_type || component.product_type` como fallback, mas
   * `product_type` ('finished') e `component_type` sao enums Postgres
   * distintos e incompativeis - `finished` nao existe no enum
   * `enum_bill_of_material_items_component_type`, e o INSERT quebrava com
   * 500 ("invalid input value for enum"). Qualquer BOM cujo componente nao
   * tivesse `component_type` explicito e cujo produto fosse 'finished'
   * (o default) derrubava a criacao de estrutura inteira.
   *
   * @returns Promise resolvida apos validar 201 (nao 500).
   */
  it('cria BOM com sucesso quando o componente tem product_type=finished (default) e sem component_type explicito', async () => {
    const token = authToken();

    const parent = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `BOM Parent ${Date.now()}`,
        code: `BOM-PARENT-${Date.now()}`,
        category_id: 1,
        unit: 'UN',
        quantity: 0,
        min_quantity: 0,
        cost_price: 1,
        price: 2,
      });
    expect(parent.status).toBe(201);

    const component = await api()
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `BOM Component ${Date.now()}`,
        code: `BOM-COMP-${Date.now()}`,
        category_id: 1,
        unit: 'KG',
        quantity: 0,
        min_quantity: 0,
        cost_price: 1,
        price: 1.5,
      });
    expect(component.status).toBe(201);
    expect(component.body.data.product_type).toBe('finished');

    const bom = await api()
      .post('/api/engineering/bom')
      .set('Authorization', `Bearer ${token}`)
      .send({
        product_id: parent.body.data.id,
        items: [{ component_product_id: component.body.data.id, quantity: 2 }],
      });

    expect(bom.status).toBe(201);
    expect(bom.body.success).toBe(true);
  });
});
