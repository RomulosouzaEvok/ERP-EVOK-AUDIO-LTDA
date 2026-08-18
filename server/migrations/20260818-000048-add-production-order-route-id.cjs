/**
 * Registra qual roteiro ativo a OP usou na liberacao.
 *
 * `production_order_tracking.production_route_step_id` guarda o passo
 * executado, mas a OP em si ainda nao guardava o roteiro ativo de origem.
 * Esta migration adiciona `production_orders.production_route_id` como FK
 * nullable para `production_routes.id`.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('production_orders', 'production_route_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'production_routes', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('production_orders', ['production_route_id'], {
      name: 'idx_production_orders_production_route_id',
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN production_orders.production_route_id IS 'FK -> production_routes.id (roteiro efetivamente usado na liberacao da OP)';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('production_orders', 'idx_production_orders_production_route_id');
    await queryInterface.removeColumn('production_orders', 'production_route_id');
  },
};
