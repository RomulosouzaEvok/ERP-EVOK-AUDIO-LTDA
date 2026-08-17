'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.audit_logs_prevent_update_delete_case009()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'audit_logs is immutable and protected by design (CASE-009/FIND-ERP-002): UPDATE is not allowed for audit trail id=%', OLD.id
            USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'audit_logs is immutable and protected by design (CASE-009/FIND-ERP-002): DELETE is not allowed for audit trail id=%', OLD.id
            USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_audit_logs_immutable_case009 ON public.audit_logs;

      CREATE TRIGGER trg_audit_logs_immutable_case009
      BEFORE UPDATE OR DELETE ON public.audit_logs
      FOR EACH ROW EXECUTE FUNCTION public.audit_logs_prevent_update_delete_case009();
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE public.audit_logs ENABLE ALWAYS TRIGGER trg_audit_logs_immutable_case009;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_audit_logs_immutable_case009 ON public.audit_logs;
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS public.audit_logs_prevent_update_delete_case009();
    `);
  },
};
