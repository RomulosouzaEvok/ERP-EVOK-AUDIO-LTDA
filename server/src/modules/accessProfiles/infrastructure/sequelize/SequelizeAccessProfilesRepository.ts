/**
 * Implementação Sequelize/PostgreSQL de `AccessProfilesRepository`, usando
 * exclusivamente os models `AccessProfile`/`AccessProfilePermission`/`User`
 * já existentes em `server/src/models/` — nenhum model novo foi criado por
 * este módulo (o schema já foi aplicado no Bloco 1.1).
 *
 * @module modules/accessProfiles/infrastructure/sequelize/SequelizeAccessProfilesRepository
 */

import AccessProfilesRepository, { AccessProfileListItem, AccessProfilePermissionInput } from '../../domain/repositories/AccessProfilesRepository';

const { sequelize, AccessProfile, AccessProfilePermission, User } = require('../../../../models/index');

/** Serializa uma instância Sequelize de `AccessProfile` (com `permissions` incluída) para o formato de saída do domínio. */
function toListItem(profile: any, userCount: number): AccessProfileListItem {
  const permissions: AccessProfilePermissionInput[] = (profile.permissions ?? []).map((p: any) => ({
    module: p.module,
    level: p.level,
  }));

  return {
    id: profile.id,
    nome: profile.nome,
    descricao: profile.descricao,
    allowedWarehouses: profile.allowedWarehouses,
    active: profile.active,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    permissions,
    userCount,
  };
}

class SequelizeAccessProfilesRepository extends AccessProfilesRepository {
  async list(): Promise<AccessProfileListItem[]> {
    const profiles = await AccessProfile.findAll({
      include: [{ model: AccessProfilePermission, as: 'permissions' }],
      order: [['nome', 'ASC']],
    });

    const counts = await User.findAll({
      attributes: ['accessProfileId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { active: true },
      group: ['access_profile_id'],
      raw: true,
    });

    const countByProfileId = new Map<number, number>();
    for (const row of counts as any[]) {
      if (row.accessProfileId !== null && row.accessProfileId !== undefined) {
        countByProfileId.set(row.accessProfileId, Number(row.count));
      }
    }

    return profiles.map((profile: any) => toListItem(profile, countByProfileId.get(profile.id) ?? 0));
  }

  async findById(id: number): Promise<AccessProfileListItem | null> {
    const profile = await AccessProfile.findByPk(id, {
      include: [{ model: AccessProfilePermission, as: 'permissions' }],
    });
    if (!profile) return null;

    const userCount = await User.count({ where: { accessProfileId: id, active: true } });
    return toListItem(profile, userCount);
  }

  async findByNome(nome: string, excludeId?: number): Promise<{ id: number } | null> {
    const { Op } = require('sequelize');
    const where: any = { nome };
    if (excludeId !== undefined) {
      where.id = { [Op.ne]: excludeId };
    }
    return AccessProfile.findOne({ where, attributes: ['id'] });
  }

  async create(
    data: { nome: string; descricao?: string | null; allowedWarehouses?: string[] | null },
    permissions: AccessProfilePermissionInput[],
  ): Promise<AccessProfileListItem> {
    const created = await sequelize.transaction(async (transaction: any) => {
      const profile = await AccessProfile.create(
        {
          nome: data.nome,
          descricao: data.descricao ?? null,
          allowedWarehouses: data.allowedWarehouses ?? null,
        },
        { transaction },
      );

      if (permissions.length > 0) {
        await AccessProfilePermission.bulkCreate(
          permissions.map((p) => ({ accessProfileId: profile.id, module: p.module, level: p.level })),
          { transaction },
        );
      }

      return profile.id;
    });

    return (await this.findById(created)) as AccessProfileListItem;
  }

  async update(
    id: number,
    data: { nome?: string; descricao?: string | null; allowedWarehouses?: string[] | null },
    permissions: AccessProfilePermissionInput[],
  ): Promise<AccessProfileListItem | null> {
    const existing = await AccessProfile.findByPk(id);
    if (!existing) return null;

    await sequelize.transaction(async (transaction: any) => {
      const updateData: Record<string, unknown> = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.allowedWarehouses !== undefined) updateData.allowedWarehouses = data.allowedWarehouses;

      if (Object.keys(updateData).length > 0) {
        await existing.update(updateData, { transaction });
      }

      // Substitui a matriz de permissões por completo (UC-31): remove todas
      // as linhas anteriores e recria a partir do payload recebido, dentro
      // da mesma transação.
      await AccessProfilePermission.destroy({ where: { accessProfileId: id }, transaction });
      if (permissions.length > 0) {
        await AccessProfilePermission.bulkCreate(
          permissions.map((p) => ({ accessProfileId: id, module: p.module, level: p.level })),
          { transaction },
        );
      }
    });

    return this.findById(id);
  }

  async countActiveUsers(profileId: number): Promise<{ count: number; users: Array<{ id: number; name: string; email: string }> }> {
    const users = await User.findAll({
      where: { accessProfileId: profileId, active: true },
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']],
    });

    return {
      count: users.length,
      users: users.map((u: any) => ({ id: u.id, name: u.name, email: u.email })),
    };
  }

  async deactivate(id: number): Promise<boolean> {
    const [updated] = await AccessProfile.update({ active: false }, { where: { id } });
    return updated > 0;
  }
}

export = SequelizeAccessProfilesRepository;
