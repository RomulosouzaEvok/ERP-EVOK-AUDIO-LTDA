--
-- PostgreSQL database dump
--

\restrict hc6ECkWUzOd17Ux6hoP5UVLXvXgXPcVIVneAnmkcaz1KnODDwxefECWIZX69FAb

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: SequelizeMeta; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SequelizeMeta" (name) FROM stdin;
20260731-000001-baseline-schema.cjs
20260731-000002-add-expand-contract-item-columns.cjs
20260731-000003-align-nullable-legacy-columns.cjs
20260731-000004-align-supplier-optional-columns.cjs
20260731-000005-align-product-optional-columns.cjs
20260731-000006-align-bom-optional-columns.cjs
20260731-000007-align-purchase-optional-columns.cjs
20260731-000008-align-account-payable-optional-columns.cjs
20260731-000009-align-audit-log-optional-columns.cjs
20260731-000010-add-user-password-version.cjs
20260731-000011-add-user-password-reset-fields.cjs
20260731-000012-add-production-order-scrap-fields.cjs
20260731-000013-add-partial-payment-tracking.cjs
20260731-000014-create-webhook-events.cjs
20260731-000015-create-company-fiscal-config.cjs
20260731-000016-add-sale-item-fiscal-fields.cjs
20260731-000017-add-nfe-tracking-fields.cjs
20260731-000018-create-purchase-receipts.cjs
20260731-000019-add-inventory-movements-indexes.cjs
20260731-000020-add-photo-path-products-assets.cjs
20260802-000002-purchase-requisitions.cjs
20260802-000003-add-critical-foreign-keys.cjs
20260802-000004-fix-requisition-timestamp-columns.cjs
20260802-000005-fix-item-estruturas-user-columns.cjs
20260803-000001-create-item-suppliers.cjs
20260803-000002-add-quarantine-lot-status.cjs
20260803-000003-fix-non-conformities-nullability.cjs
20260803-000004-create-work-centers.cjs
20260803-000005-create-engineering-tables.cjs
20260803-000006-create-acoustic-tests.cjs
20260803-000007-add-shipped-sale-status.cjs
20260803-000008-create-access-profiles.cjs
20260804-000001-create-warehouses.cjs
20260804-000002-warehouse-transfers.cjs
20260804-000003-requisition-engineering-project.cjs
20260804-000004-add-consumed-quantity-acoustic-tests.cjs
20260804-000005-fix-consumed-quantity-precision.cjs
20260804-000006-add-warehouse-id-to-inventory-counts.cjs
20260804-000007-add-cost-per-hour-work-centers.cjs
20260804-000008-create-production-cost-settings.cjs
20260804-000009-add-labor-overhead-cost-ledger-sources.cjs
20260804-000010-add-mrp-auto-convert-to-items.cjs
20260804-000011-add-supplier-quality-score.cjs
20260804-000012-fix-production-orders-nullable-columns.cjs
20260805-000001-add-item-tipo-uso-consumo-ativo.cjs
20260805-000002-add-asset-type-license.cjs
20260805-000003-add-asset-license-and-purchase-item.cjs
20260805-000004-add-invoice-type-payable-and-purchase.cjs
20260805-000005-add-asset-id-non-conformities.cjs
20260805-000006-add-asset-status-returned-to-supplier.cjs
20260806-000130-create-sst-tipo-epi-matriz-epi.cjs
20260806-000131-create-sst-entrega-epi.cjs
20260806-000132-create-sst-acao-corretiva.cjs
20260806-000133-create-sst-plano-exames.cjs
20260806-000134-create-sst-aso.cjs
20260806-000135-create-sst-acidente.cjs
20260806-000136-create-sst-cat.cjs
20260806-000137-create-sst-evento-esocial.cjs
20260806-000138-create-sst-cipa.cjs
20260806-000139-create-sst-pgr-ges.cjs
20260806-000140-create-sst-treinamento.cjs
20260806-000141-create-sst-rotina-preventiva.cjs
20260807-000150-create-it-ticket-categories-tickets.cjs
20260807-000151-create-it-ticket-comments-priority-history.cjs
20260807-000152-create-it-responsibility-terms.cjs
20260807-000153-create-it-software-license-details-seats.cjs
20260807-000154-create-it-access-requests.cjs
20260807-000155-create-it-backup-logs.cjs
20260807-000156-create-ti-settings.cjs
20260807-000200-create-facilities-module.cjs
20260807-000210-create-marketing-module.cjs
20260807-000220-create-legal-module.cjs
20260806-000001-add-assigned-to-inventory-counts.cjs
20260806-000002-make-product-id-nullable-inventory-count-items.cjs
20260806-000003-add-department-id-to-production-orders-and-inventory-counts.cjs
20260806-000004-add-missing-indexes-status-item-id.cjs
20260806-000010-create-rfq-tables.cjs
20260806-000020-create-cost-centers.cjs
20260806-000040-fix-items-fornecedor-padrao-id-type.cjs
20260806-000041-fix-orphan-pt-schema-user-columns.cjs
20260806-000042-comment-deprecated-orphan-pt-schema-tables.cjs
20260806-000050-create-customer-price-lists.cjs
20260806-000051-add-invoiced-quantity-sale-items.cjs
20260806-000052-add-partially-invoiced-sale-status.cjs
20260806-000060-create-production-downtimes.cjs
20260806-000070-create-bank-statements.cjs
20260806-000080-create-app-role-least-privilege.cjs
20260806-000090-create-import-processes.cjs
20260806-000100-create-sale-invoices.cjs
20260806-000110-create-company-banking-config.cjs
20260806-000111-create-cnab-remittances.cjs
20260806-000112-create-cnab-remittance-items.cjs
20260806-000113-create-cnab-return-files.cjs
20260806-000114-create-cnab-return-occurrences.cjs
20260806-000115-add-cost-center-id-to-departments.cjs
20260806-000120-reconcile-departments-with-official-seed.cjs
20260807-000230-create-accounting-module.cjs
20260807-000231-seed-accounting-chart-of-accounts.cjs
20260807-000240-create-treasury-module.cjs
20260807-000250-create-budget-module.cjs
20260807-000260-create-jur-contracts.cjs
20260807-000261-create-jur-contract-documents-signatories-addendums.cjs
20260807-000262-create-jur-external-lawyers.cjs
20260807-000263-create-jur-legal-cases.cjs
20260807-000264-create-jur-legal-case-events.cjs
20260807-000265-create-jur-legal-case-deadlines.cjs
20260807-000266-create-jur-legal-case-provisions.cjs
20260807-000267-create-jur-legal-alerts.cjs
20260807-000268-add-legal-case-id-to-accounts-payable.cjs
20260807-000269-create-jur-proxies.cjs
20260807-000270-create-jur-intellectual-property.cjs
20260807-000271-create-jur-lgpd.cjs
20260807-000280-migrate-legal-lean-to-jur.cjs
20260807-000290-migrate-facility-vehicles-to-asset-extension.cjs
20260807-000291-create-facility-vehicle-documents.cjs
20260807-000292-create-facility-drivers.cjs
20260807-000293-create-facility-vehicle-trips.cjs
20260807-000294-add-full-tank-invoice-ref-to-facility-fuel-records.cjs
20260807-000295-create-facility-fines.cjs
20260807-000296-add-facility-fields-to-maintenance-orders.cjs
20260807-000297-facility-cleaning-plan-execution.cjs
20260807-000298-create-facility-visitors-visits.cjs
20260807-000299-create-facility-correspondence.cjs
20260807-000300-create-facility-resource-reservations.cjs
20260807-000310-marketing-leads-funnel-and-handoff.cjs
20260807-000311-marketing-leads-lgpd-consent.cjs
20260807-000312-marketing-leads-conversion-integrity-saneamento.cjs
20260807-000313-create-marketing-events.cjs
20260807-000314-marketing-campaigns-budget-approval-and-metrics.cjs
20260807-000315-marketing-materials-stock-item-and-approval-audit.cjs
20260808-000001-create-jur-corporate-acts.cjs
20260808-000002-create-jur-contract-approvals.cjs
20260808-000010-create-hr-job-positions.cjs
20260808-000011-add-pcd-job-position-to-employees.cjs
20260808-000012-create-hr-job-vacancies-candidates.cjs
20260808-000013-create-hr-employee-job-history.cjs
20260808-000014-create-hr-employee-contracts.cjs
20260808-000015-create-hr-admission-processes.cjs
20260808-000016-create-hr-termination-processes.cjs
20260808-000017-create-hr-employee-documents.cjs
20260808-000018-create-hr-vacation-accrual-periods.cjs
20260808-000019-create-hr-vacation-schedules.cjs
20260808-000020-create-hr-absences.cjs
20260808-000021-create-hr-benefits.cjs
20260808-000022-create-hr-trainings.cjs
20260808-000023-create-hr-time-sheet-summaries.cjs
20260808-000024-create-hr-payroll-import.cjs
20260808-000025-create-hr-performance-reviews.cjs
20260809-000026-create-production-order-reservations.cjs
20260809-000027-add-import-origin-to-inventory-and-cost-enums.cjs
20260810-000028-fix-nullable-columns-round-2.cjs
20260810-000029-purchase-approval-authority-g11.cjs
20260810-000030-generalize-stock-reservations-for-sales-g9.cjs
20260810-000031-comex-directorate-approval-gate.cjs
20260810-000032-create-quality-inspections-g7.cjs
20260810-000033-fix-nullable-columns-round-3.cjs
20260810-000034-production-route-active-unique-g5.cjs
20260810-000035-bom-single-source-g1.cjs
20260810-000036-extend-audit-log-action-enum.cjs
20260810-000037-create-master-production-plan-g17.cjs
\.


--
-- PostgreSQL database dump complete
--

\unrestrict hc6ECkWUzOd17Ux6hoP5UVLXvXgXPcVIVneAnmkcaz1KnODDwxefECWIZX69FAb

