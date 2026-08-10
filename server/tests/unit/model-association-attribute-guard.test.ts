/**
 * Guarda estrutural contra o **atributo-fantasma de associação** — achado S-1b
 * (commit `92cf555`), corrigido em 2026-08-10.
 *
 * ## O defeito que este teste impede de voltar
 *
 * Quando uma associação em `src/models/index.ts` recebe `foreignKey` com o
 * nome da **coluna** (`'access_profile_id'`) em vez do nome do **atributo**
 * (`'accessProfileId'`), o Sequelize não encontra o atributo declarado e
 * **cria um segundo atributo homônimo** apontando para a mesma coluna — com
 * `allowNull: true` (o default de associação), convivendo com o atributo
 * declarado `allowNull: false`.
 *
 * O estrago é silencioso: banco e model continuam concordando, o typecheck não
 * vê nada (o `foreignKey` do Sequelize é `string`), e o JSON das respostas
 * passa a expor a MESMA informação sob dois nomes (`accessProfileId` e
 * `access_profile_id`). Além disso, o atributo-fantasma desalinha a guarda de
 * drift de schema, que compara nulabilidade de model × banco.
 *
 * ## Por que a checagem é "dois atributos para a mesma coluna"
 *
 * É a assinatura exata e mecânica do defeito, e independe de conhecer os nomes
 * envolvidos — vale para qualquer model presente e futuro. Nenhum model
 * legítimo deste ERP mapeia dois atributos para a mesma coluna física.
 *
 * Complementa `tests/integration/schema-model-drift-guard.test.ts`, que cobre a
 * variante de nulabilidade model × banco (e que só roda com `RUN_INTEGRATION`);
 * esta guarda é puramente estrutural e roda sempre, sem banco.
 */

const models = require('../../src/models/index');

describe('models/index.ts — guarda de atributo-fantasma de associação (S-1b)', () => {
  /** Agrupa os atributos de um model pela coluna física que cada um mapeia. */
  function attributesByColumn(model: any): Map<string, string[]> {
    const byColumn = new Map<string, string[]>();
    for (const attribute of Object.keys(model.rawAttributes)) {
      const column = model.rawAttributes[attribute].field || attribute;
      if (!byColumn.has(column)) byColumn.set(column, []);
      (byColumn.get(column) as string[]).push(attribute);
    }
    return byColumn;
  }

  it('nenhum model tem dois atributos apontando para a mesma coluna', () => {
    const offenders: string[] = [];

    for (const modelName of Object.keys(models.sequelize.models)) {
      const model = models.sequelize.models[modelName];
      attributesByColumn(model).forEach((attributes, column) => {
        if (attributes.length > 1) {
          offenders.push(`${modelName}.${column} <- ${attributes.join(' + ')}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });

  it('User.accessProfileId e o unico atributo da coluna access_profile_id', () => {
    expect(models.User.rawAttributes.accessProfileId.field).toBe('access_profile_id');
    expect(models.User.rawAttributes.access_profile_id).toBeUndefined();
  });

  it('AccessProfilePermission.accessProfileId preserva allowNull:false do model', () => {
    const attribute = models.AccessProfilePermission.rawAttributes.accessProfileId;
    expect(attribute.field).toBe('access_profile_id');
    expect(attribute.allowNull).toBe(false);
    expect(models.AccessProfilePermission.rawAttributes.access_profile_id).toBeUndefined();
  });

  it('as associacoes de perfil de acesso continuam resolvendo para a coluna real', () => {
    expect(models.User.associations.accessProfile.identifierField).toBe('access_profile_id');
    expect(models.AccessProfilePermission.associations.accessProfile.identifierField).toBe('access_profile_id');
    expect(models.AccessProfile.associations.permissions.foreignKey).toBe('accessProfileId');
    expect(models.AccessProfile.associations.users.foreignKey).toBe('accessProfileId');
  });
});

describe('models/index.ts — QualityInspection registrado (G7)', () => {
  it('esta no barrel e na instancia do Sequelize', () => {
    expect(models.QualityInspection).toBeDefined();
    expect(models.sequelize.models.QualityInspection).toBeDefined();
  });

  it('tem as associacoes que a migration 20260810-000032 exige', () => {
    const associations = models.QualityInspection.associations;
    expect(associations.lot.target.name).toBe('LotControl');
    expect(associations.lot.identifierField).toBe('lot_id');
    expect(associations.inspector.target.name).toBe('User');
    expect(associations.inspector.identifierField).toBe('inspector_id');
    expect(associations.nonConformity.target.name).toBe('NonConformity');
    expect(associations.nonConformity.identifierField).toBe('non_conformity_id');
  });

  it('expoe o lado inverso usado pelas consultas de qualidade', () => {
    expect(models.LotControl.associations.inspections.target.name).toBe('QualityInspection');
    expect(models.User.associations.quality_inspections.target.name).toBe('QualityInspection');
    expect(models.NonConformity.associations.quality_inspections.target.name).toBe('QualityInspection');
  });

  it('liga a rastreabilidade de liberacao do lote (ISO 9001 8.6)', () => {
    expect(models.LotControl.associations.releaseInspection.target.name).toBe('QualityInspection');
    expect(models.LotControl.associations.releaseInspection.foreignKey).toBe('release_inspection_id');
    expect(models.LotControl.associations.releasedBy.target.name).toBe('User');
    expect(models.LotControl.associations.releasedBy.foreignKey).toBe('released_by');
  });
});
