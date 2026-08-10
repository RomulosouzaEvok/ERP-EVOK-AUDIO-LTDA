--
-- PostgreSQL database dump
--

\restrict miQzhzsJDx1uijoQpycVIosaQheID2XjEbqrfX0c3cQIMadQvyBNQc91E2eaOHs

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
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: enum_access_profile_permissions_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_access_profile_permissions_level AS ENUM (
    'operate',
    'approve'
);


--
-- Name: enum_accounting_chart_of_accounts_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounting_chart_of_accounts_account_type AS ENUM (
    'asset',
    'liability',
    'equity',
    'revenue',
    'expense',
    'cost'
);


--
-- Name: enum_accounting_entries_entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounting_entries_entry_type AS ENUM (
    'receipt',
    'payment',
    'sales',
    'purchase',
    'payroll',
    'depreciation',
    'closing',
    'adjustment'
);


--
-- Name: enum_accounting_entries_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounting_entries_status AS ENUM (
    'draft',
    'posted',
    'reversed'
);


--
-- Name: enum_accounts_payable_invoice_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_payable_invoice_type AS ENUM (
    'nfe',
    'nfse'
);


--
-- Name: enum_accounts_payable_legal_expense_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_payable_legal_expense_type AS ENUM (
    'expense',
    'judicial_deposit'
);


--
-- Name: enum_accounts_payable_payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_payable_payment_type AS ENUM (
    'ted',
    'pix',
    'boleto',
    'cheque',
    'dinheiro'
);


--
-- Name: enum_accounts_payable_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_payable_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'canceled',
    'partial'
);


--
-- Name: enum_accounts_receivable_collection_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_receivable_collection_status AS ENUM (
    'normal',
    'warning',
    'overdue_30',
    'overdue_60',
    'overdue_90',
    'protested'
);


--
-- Name: enum_accounts_receivable_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_receivable_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'canceled',
    'partial'
);


--
-- Name: enum_acoustic_test_results_test_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_acoustic_test_results_test_type AS ENUM (
    'impedance',
    'frequency_response',
    'thd',
    'power_rms',
    'power_peak',
    'life',
    'polarity',
    'noise',
    'thiele_small'
);


--
-- Name: enum_assets_asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_assets_asset_type AS ENUM (
    'machine',
    'equipment',
    'tool',
    'furniture',
    'vehicle',
    'it',
    'other',
    'license'
);


--
-- Name: enum_assets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_assets_status AS ENUM (
    'active',
    'in_maintenance',
    'decommissioned',
    'lost',
    'returned_to_supplier'
);


--
-- Name: enum_audit_logs_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_audit_logs_action AS ENUM (
    'create',
    'update',
    'delete',
    'soft_delete',
    'login',
    'logout',
    'password_change',
    'status_change',
    'approve',
    'reject',
    'price_change',
    'salary_change',
    'export',
    'import',
    'print',
    'access_denied',
    'read',
    'read_sensitive',
    'permission_change',
    'cancel',
    'close',
    'post',
    'reverse',
    'settle'
);


--
-- Name: enum_bank_statement_entries_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_bank_statement_entries_status AS ENUM (
    'pending',
    'matched',
    'ignored'
);


--
-- Name: enum_bill_of_material_items_component_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_bill_of_material_items_component_type AS ENUM (
    'raw_material',
    'component',
    'semi_finished',
    'packaging',
    'consumable',
    'other'
);


--
-- Name: enum_bill_of_materials_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_bill_of_materials_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'superseded'
);


--
-- Name: enum_budget_lines_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_budget_lines_category AS ENUM (
    'custo_fixo',
    'custo_variavel',
    'investimento',
    'outro'
);


--
-- Name: enum_clients_ind_final; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_clients_ind_final AS ENUM (
    '0',
    '1'
);


--
-- Name: enum_clients_ind_ie; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_clients_ind_ie AS ENUM (
    '1',
    '2',
    '9'
);


--
-- Name: enum_clients_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_clients_status AS ENUM (
    'active',
    'inactive'
);


--
-- Name: enum_clients_tax_regime; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_clients_tax_regime AS ENUM (
    'simples_nacional',
    'lucro_presumido',
    'lucro_real'
);


--
-- Name: enum_cnab_remittance_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_cnab_remittance_items_status AS ENUM (
    'pending',
    'settled',
    'error'
);


--
-- Name: enum_company_fiscal_config_crt; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_company_fiscal_config_crt AS ENUM (
    '1',
    '2',
    '3'
);


--
-- Name: enum_company_fiscal_config_nfe_environment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_company_fiscal_config_nfe_environment AS ENUM (
    'homologacao',
    'producao'
);


--
-- Name: enum_company_fiscal_config_nfe_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_company_fiscal_config_nfe_provider AS ENUM (
    'mock',
    'focus_nfe',
    'enotas'
);


--
-- Name: enum_employees_bank_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_bank_account_type AS ENUM (
    'corrente',
    'poupanca'
);


--
-- Name: enum_employees_salary_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_salary_type AS ENUM (
    'mensal',
    'horista',
    'comissionado'
);


--
-- Name: enum_employees_shift; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_shift AS ENUM (
    'morning',
    'afternoon',
    'night',
    'commercial',
    'rotating'
);


--
-- Name: enum_employees_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_status AS ENUM (
    'active',
    'inactive',
    'fired',
    'vacation',
    'license'
);


--
-- Name: enum_employees_work_regime; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_employees_work_regime AS ENUM (
    'clt',
    'pj',
    'estagiario',
    'aprendiz'
);


--
-- Name: enum_engineering_projects_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_engineering_projects_priority AS ENUM (
    'low',
    'normal',
    'high',
    'critical'
);


--
-- Name: enum_engineering_projects_project_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_engineering_projects_project_type AS ENUM (
    'new_product',
    'improvement',
    'customization',
    'research'
);


--
-- Name: enum_engineering_projects_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_engineering_projects_stage AS ENUM (
    'concept',
    'design',
    'prototype',
    'testing',
    'homologation',
    'production'
);


--
-- Name: enum_engineering_projects_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_engineering_projects_status AS ENUM (
    'active',
    'paused',
    'completed',
    'canceled'
);


--
-- Name: enum_facility_areas_area_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_areas_area_type AS ENUM (
    'production',
    'warehouse',
    'office',
    'lab',
    'amenities',
    'external'
);


--
-- Name: enum_facility_cleaning_schedules_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_cleaning_schedules_frequency AS ENUM (
    'daily',
    'alternate',
    'weekly',
    'biweekly',
    'monthly'
);


--
-- Name: enum_facility_correspondence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_correspondence_type AS ENUM (
    'letter',
    'package',
    'document',
    'other'
);


--
-- Name: enum_facility_fines_indication_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_fines_indication_status AS ENUM (
    'pending',
    'indicated',
    'expired_nic',
    'not_applicable'
);


--
-- Name: enum_facility_fines_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_fines_status AS ENUM (
    'open',
    'paid',
    'appealed',
    'canceled'
);


--
-- Name: enum_facility_resource_reservations_resource_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_resource_reservations_resource_type AS ENUM (
    'room',
    'equipment'
);


--
-- Name: enum_facility_resource_reservations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_resource_reservations_status AS ENUM (
    'confirmed',
    'canceled',
    'completed'
);


--
-- Name: enum_facility_vehicle_details_fuel_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_vehicle_details_fuel_type AS ENUM (
    'gasoline',
    'ethanol',
    'diesel',
    'flex',
    'electric'
);


--
-- Name: enum_facility_vehicle_documents_doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_vehicle_documents_doc_type AS ENUM (
    'crlv_licenciamento',
    'seguro',
    'ipva',
    'outro'
);


--
-- Name: enum_facility_vehicle_documents_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_vehicle_documents_status AS ENUM (
    'vigente',
    'vencido',
    'renovado'
);


--
-- Name: enum_facility_vehicle_trips_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_vehicle_trips_purpose AS ENUM (
    'delivery',
    'executive',
    'errand',
    'other'
);


--
-- Name: enum_facility_vehicle_trips_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_vehicle_trips_status AS ENUM (
    'scheduled',
    'out',
    'returned',
    'canceled'
);


--
-- Name: enum_facility_visits_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_facility_visits_status AS ENUM (
    'scheduled',
    'onsite',
    'completed',
    'no_show',
    'canceled'
);


--
-- Name: enum_hr_absences_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_absences_type AS ENUM (
    'doenca_ate_15d',
    'auxilio_doenca_inss',
    'acidente_trabalho',
    'maternidade',
    'paternidade',
    'licenca_outras'
);


--
-- Name: enum_hr_admission_processes_aso_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_admission_processes_aso_result AS ENUM (
    'apto',
    'inapto',
    'apto_com_restricao'
);


--
-- Name: enum_hr_admission_processes_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_admission_processes_status AS ENUM (
    'documentos_pendentes',
    'aso_pendente',
    'aguardando_esocial',
    'concluida',
    'cancelada'
);


--
-- Name: enum_hr_benefit_types_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_benefit_types_category AS ENUM (
    'vt',
    'vr',
    'va',
    'saude',
    'odonto',
    'vida',
    'outros'
);


--
-- Name: enum_hr_benefit_types_funding_rule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_benefit_types_funding_rule AS ENUM (
    'percentual',
    'fixo'
);


--
-- Name: enum_hr_candidates_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_candidates_stage AS ENUM (
    'triagem',
    'entrevista',
    'aprovado',
    'reprovado'
);


--
-- Name: enum_hr_employee_benefits_enrollment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_benefits_enrollment_status AS ENUM (
    'ativo',
    'cancelado'
);


--
-- Name: enum_hr_employee_contracts_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_contracts_status AS ENUM (
    'ativo',
    'prorrogado',
    'efetivado',
    'indeterminado_automatico',
    'rescindido'
);


--
-- Name: enum_hr_employee_contracts_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_contracts_type AS ENUM (
    'indeterminado',
    'experiencia',
    'aprendiz',
    'estagio'
);


--
-- Name: enum_hr_employee_documents_aptitude_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_documents_aptitude_result AS ENUM (
    'apto',
    'inapto',
    'apto_com_restricao'
);


--
-- Name: enum_hr_employee_documents_doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_documents_doc_type AS ENUM (
    'rg',
    'cpf',
    'ctps',
    'aso_admissional',
    'aso_periodico',
    'aso_retorno',
    'aso_mudanca_risco',
    'aso_demissional',
    'contrato',
    'certificado',
    'outro'
);


--
-- Name: enum_hr_employee_documents_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_documents_origin AS ENUM (
    'rh',
    'sst'
);


--
-- Name: enum_hr_employee_job_history_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_employee_job_history_reason AS ENUM (
    'admissao',
    'promocao',
    'transferencia',
    'reajuste'
);


--
-- Name: enum_hr_job_vacancies_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_job_vacancies_status AS ENUM (
    'aberta',
    'em_triagem',
    'fechada',
    'cancelada'
);


--
-- Name: enum_hr_performance_reviews_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_performance_reviews_status AS ENUM (
    'rascunho',
    'concluida'
);


--
-- Name: enum_hr_termination_processes_aso_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_termination_processes_aso_result AS ENUM (
    'apto',
    'inapto',
    'apto_com_restricao'
);


--
-- Name: enum_hr_termination_processes_notice_modality; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_termination_processes_notice_modality AS ENUM (
    'trabalhado',
    'indenizado'
);


--
-- Name: enum_hr_termination_processes_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_termination_processes_status AS ENUM (
    'aberto',
    'aguardando_aso',
    'aguardando_trct',
    'concluido',
    'cancelado'
);


--
-- Name: enum_hr_termination_processes_termination_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_termination_processes_termination_type AS ENUM (
    'pedido',
    'sem_justa_causa',
    'justa_causa',
    'termino_experiencia',
    'acordo'
);


--
-- Name: enum_hr_time_sheet_summaries_fonte; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_time_sheet_summaries_fonte AS ENUM (
    'arquivo',
    'manual'
);


--
-- Name: enum_hr_vacation_accrual_periods_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_vacation_accrual_periods_status AS ENUM (
    'em_curso',
    'programado',
    'gozado',
    'vencido_dobra',
    'zerado'
);


--
-- Name: enum_hr_vacation_schedules_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_hr_vacation_schedules_status AS ENUM (
    'planejado',
    'confirmado',
    'em_gozo',
    'concluido',
    'cancelado'
);


--
-- Name: enum_import_process_approvals_approver_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_import_process_approvals_approver_role AS ENUM (
    'diretor'
);


--
-- Name: enum_import_processes_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_import_processes_status AS ENUM (
    'draft',
    'shipped',
    'arrived',
    'customs_cleared',
    'received',
    'cancelled'
);


--
-- Name: enum_inventory_count_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_inventory_count_items_status AS ENUM (
    'pending',
    'counted',
    'adjusted'
);


--
-- Name: enum_inventory_counts_count_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_inventory_counts_count_type AS ENUM (
    'cycle',
    'full',
    'spot'
);


--
-- Name: enum_inventory_counts_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_inventory_counts_status AS ENUM (
    'draft',
    'counting',
    'pending_approval',
    'approved',
    'rejected',
    'adjusted'
);


--
-- Name: enum_inventory_movements_reference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_inventory_movements_reference_type AS ENUM (
    'sale',
    'purchase',
    'production',
    'adjustment',
    'transfer',
    'sst_epi_delivery',
    'import'
);


--
-- Name: enum_inventory_movements_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_inventory_movements_type AS ENUM (
    'in',
    'out',
    'adjustment',
    'transfer'
);


--
-- Name: enum_it_access_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_access_requests_status AS ENUM (
    'pending',
    'approved',
    'done',
    'rejected',
    'canceled'
);


--
-- Name: enum_it_access_requests_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_access_requests_type AS ENUM (
    'grant',
    'change',
    'revoke'
);


--
-- Name: enum_it_backup_logs_backup_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_backup_logs_backup_type AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'restore_test'
);


--
-- Name: enum_it_responsibility_terms_acceptance_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_responsibility_terms_acceptance_type AS ENUM (
    'physical_signature',
    'digital_ack'
);


--
-- Name: enum_it_responsibility_terms_condition_on_return; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_responsibility_terms_condition_on_return AS ENUM (
    'ok',
    'damaged',
    'incomplete'
);


--
-- Name: enum_it_responsibility_terms_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_responsibility_terms_status AS ENUM (
    'active',
    'returned',
    'lost'
);


--
-- Name: enum_it_software_license_details_billing_cycle; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_software_license_details_billing_cycle AS ENUM (
    'one_time',
    'monthly',
    'yearly'
);


--
-- Name: enum_it_software_license_details_license_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_software_license_details_license_type AS ENUM (
    'perpetual',
    'subscription',
    'free'
);


--
-- Name: enum_it_ticket_categories_default_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_ticket_categories_default_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: enum_it_ticket_priority_history_new_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_ticket_priority_history_new_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: enum_it_ticket_priority_history_previous_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_ticket_priority_history_previous_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: enum_it_tickets_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_tickets_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: enum_it_tickets_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_it_tickets_status AS ENUM (
    'open',
    'in_progress',
    'waiting',
    'resolved',
    'closed',
    'canceled'
);


--
-- Name: enum_jur_contract_addendums_addendum_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contract_addendums_addendum_type AS ENUM (
    'term',
    'value',
    'clause',
    'party',
    'other'
);


--
-- Name: enum_jur_contract_approvals_approver_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contract_approvals_approver_role AS ENUM (
    'diretor',
    'financeiro'
);


--
-- Name: enum_jur_contract_signatories_signatory_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contract_signatories_signatory_role AS ENUM (
    'party_a',
    'party_b',
    'witness'
);


--
-- Name: enum_jur_contracts_adjustment_index; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contracts_adjustment_index AS ENUM (
    'ipca',
    'igpm',
    'inpc',
    'other',
    'none'
);


--
-- Name: enum_jur_contracts_contract_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contracts_contract_type AS ENUM (
    'commercial',
    'employment',
    'supplier',
    'service',
    'rental',
    'nda',
    'distribution',
    'commercial_representation',
    'trademark_license',
    'other'
);


--
-- Name: enum_jur_contracts_counterparty_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contracts_counterparty_type AS ENUM (
    'supplier',
    'client',
    'employee',
    'other'
);


--
-- Name: enum_jur_contracts_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_contracts_status AS ENUM (
    'draft',
    'in_approval',
    'approved',
    'signed',
    'active',
    'expired',
    'terminated',
    'canceled'
);


--
-- Name: enum_jur_corporate_acts_act_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_corporate_acts_act_type AS ENUM (
    'general_assembly',
    'partners_meeting',
    'bylaw_amendment',
    'board_resolution',
    'other'
);


--
-- Name: enum_jur_corporate_acts_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_corporate_acts_status AS ENUM (
    'draft',
    'registered'
);


--
-- Name: enum_jur_intellectual_property_ip_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_intellectual_property_ip_type AS ENUM (
    'trademark',
    'patent',
    'utility_model',
    'industrial_design',
    'copyright',
    'trade_secret'
);


--
-- Name: enum_jur_intellectual_property_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_intellectual_property_status AS ENUM (
    'filed',
    'granted',
    'active',
    'expired',
    'abandoned'
);


--
-- Name: enum_jur_legal_alerts_origin_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_alerts_origin_type AS ENUM (
    'contract',
    'proxy',
    'intellectual_property',
    'lgpd_request',
    'legal_case_deadline'
);


--
-- Name: enum_jur_legal_alerts_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_alerts_status AS ENUM (
    'pending',
    'acknowledged',
    'escalated',
    'resolved'
);


--
-- Name: enum_jur_legal_case_deadlines_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_case_deadlines_status AS ENUM (
    'pending',
    'fulfilled_pending_confirmation',
    'confirmed',
    'missed',
    'confirmed_late'
);


--
-- Name: enum_jur_legal_case_events_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_case_events_event_type AS ENUM (
    'petition',
    'hearing',
    'decision',
    'appeal',
    'deposit',
    'other'
);


--
-- Name: enum_jur_legal_case_provisions_risk_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_case_provisions_risk_class AS ENUM (
    'probable',
    'possible',
    'remote'
);


--
-- Name: enum_jur_legal_cases_case_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_cases_case_role AS ENUM (
    'plaintiff',
    'defendant',
    'third_party'
);


--
-- Name: enum_jur_legal_cases_case_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_cases_case_type AS ENUM (
    'labor',
    'civil',
    'tax',
    'consumer',
    'regulatory',
    'administrative'
);


--
-- Name: enum_jur_legal_cases_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_legal_cases_status AS ENUM (
    'active',
    'won',
    'lost',
    'settled',
    'archived'
);


--
-- Name: enum_jur_lgpd_data_subject_requests_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_lgpd_data_subject_requests_request_type AS ENUM (
    'confirmation',
    'access',
    'correction',
    'anonymization',
    'deletion',
    'portability',
    'consent_revocation',
    'info_sharing'
);


--
-- Name: enum_jur_lgpd_data_subject_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_lgpd_data_subject_requests_status AS ENUM (
    'received',
    'verifying',
    'in_progress',
    'answered',
    'rejected_justified'
);


--
-- Name: enum_jur_lgpd_incidents_communication_decision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_lgpd_incidents_communication_decision AS ENUM (
    'communicate_anpd',
    'communicate_subjects',
    'communicate_both',
    'not_communicate'
);


--
-- Name: enum_jur_lgpd_incidents_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_lgpd_incidents_status AS ENUM (
    'open',
    'investigating',
    'closed'
);


--
-- Name: enum_jur_lgpd_processing_activities_legal_basis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_lgpd_processing_activities_legal_basis AS ENUM (
    'consent',
    'legal_obligation',
    'public_administration',
    'research',
    'contract_execution',
    'judicial_process',
    'life_protection',
    'health_protection',
    'legitimate_interest',
    'credit_protection'
);


--
-- Name: enum_jur_proxies_proxy_form; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_proxies_proxy_form AS ENUM (
    'public',
    'private'
);


--
-- Name: enum_jur_proxies_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_jur_proxies_status AS ENUM (
    'active',
    'revoked',
    'expired'
);


--
-- Name: enum_lot_controls_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_lot_controls_status AS ENUM (
    'available',
    'reserved',
    'consumed',
    'blocked',
    'expired',
    'quarantine'
);


--
-- Name: enum_maintenance_orders_facility_specialty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_maintenance_orders_facility_specialty AS ENUM (
    'electrical',
    'plumbing',
    'civil',
    'hvac',
    'roofing',
    'gardening',
    'other'
);


--
-- Name: enum_maintenance_orders_maintenance_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_maintenance_orders_maintenance_type AS ENUM (
    'preventive',
    'corrective',
    'predictive',
    'emergency',
    'overhaul'
);


--
-- Name: enum_maintenance_orders_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_maintenance_orders_priority AS ENUM (
    'low',
    'normal',
    'high',
    'emergency'
);


--
-- Name: enum_maintenance_orders_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_maintenance_orders_result AS ENUM (
    'completed',
    'partial',
    'transferred',
    'canceled'
);


--
-- Name: enum_maintenance_orders_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_maintenance_orders_status AS ENUM (
    'open',
    'scheduled',
    'in_progress',
    'waiting_parts',
    'completed',
    'canceled'
);


--
-- Name: enum_marketing_campaigns_budget_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_campaigns_budget_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: enum_marketing_campaigns_campaign_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_campaigns_campaign_type AS ENUM (
    'ads',
    'social',
    'email',
    'event',
    'trade',
    'content'
);


--
-- Name: enum_marketing_campaigns_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_campaigns_status AS ENUM (
    'planned',
    'active',
    'paused',
    'completed',
    'canceled'
);


--
-- Name: enum_marketing_event_checklist_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_event_checklist_items_status AS ENUM (
    'pending',
    'done'
);


--
-- Name: enum_marketing_events_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_events_event_type AS ENUM (
    'feira',
    'lancamento',
    'workshop',
    'regional'
);


--
-- Name: enum_marketing_events_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_events_status AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'canceled'
);


--
-- Name: enum_marketing_leads_consent_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_leads_consent_channel AS ENUM (
    'formulario_site',
    'whatsapp',
    'telefone',
    'feira',
    'indicacao',
    'outro'
);


--
-- Name: enum_marketing_leads_lead_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_leads_lead_source AS ENUM (
    'website',
    'instagram',
    'facebook',
    'google',
    'email',
    'event',
    'indication',
    'other'
);


--
-- Name: enum_marketing_leads_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_leads_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'converted',
    'lost',
    'in_sales_attendance'
);


--
-- Name: enum_marketing_materials_material_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_marketing_materials_material_type AS ENUM (
    'catalog',
    'flyer',
    'banner',
    'video',
    'manual',
    'technical_sheet',
    'presentation'
);


--
-- Name: enum_master_production_plan_lines_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_master_production_plan_lines_status AS ENUM (
    'pending',
    'planned',
    'dismissed',
    'released'
);


--
-- Name: enum_master_production_plans_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_master_production_plans_status AS ENUM (
    'draft',
    'firm',
    'released',
    'canceled'
);


--
-- Name: enum_non_conformities_defect_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_defect_type AS ENUM (
    'dimensional',
    'visual',
    'electrical',
    'acoustic',
    'material',
    'packaging',
    'other'
);


--
-- Name: enum_non_conformities_effectiveness_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_effectiveness_result AS ENUM (
    'effective',
    'partially_effective',
    'ineffective'
);


--
-- Name: enum_non_conformities_immediate_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_immediate_action AS ENUM (
    'rework',
    'scrap',
    'return_supplier',
    'use_as_is',
    'sorting',
    'other'
);


--
-- Name: enum_non_conformities_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_origin AS ENUM (
    'incoming',
    'in_process',
    'final',
    'audit',
    'customer_complaint',
    'supplier'
);


--
-- Name: enum_non_conformities_root_cause_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_root_cause_category AS ENUM (
    'material',
    'machine',
    'method',
    'manpower',
    'measurement',
    'environment'
);


--
-- Name: enum_non_conformities_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_severity AS ENUM (
    'critical',
    'major',
    'minor'
);


--
-- Name: enum_non_conformities_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_non_conformities_status AS ENUM (
    'open',
    'analysis',
    'corrective_action',
    'effectiveness_check',
    'closed',
    'canceled'
);


--
-- Name: enum_product_cost_ledgers_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_product_cost_ledgers_source_type AS ENUM (
    'purchase',
    'production',
    'adjustment',
    'production_labor',
    'production_overhead',
    'import'
);


--
-- Name: enum_product_drawings_drawing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_product_drawings_drawing_type AS ENUM (
    'assembly',
    'detail',
    'exploded',
    'schematic',
    'bom'
);


--
-- Name: enum_product_drawings_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_product_drawings_status AS ENUM (
    'draft',
    'released',
    'obsolete',
    'canceled'
);


--
-- Name: enum_production_cost_settings_overhead_calculation_basis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_cost_settings_overhead_calculation_basis AS ENUM (
    'material_labor',
    'labor_only',
    'material_only'
);


--
-- Name: enum_production_downtimes_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_downtimes_reason AS ENUM (
    'setup',
    'manutencao_corretiva',
    'manutencao_preventiva',
    'falta_material',
    'falta_operador',
    'qualidade',
    'outros'
);


--
-- Name: enum_production_order_reservations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_order_reservations_status AS ENUM (
    'active',
    'released'
);


--
-- Name: enum_production_order_tracking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_order_tracking_status AS ENUM (
    'pending',
    'in_progress',
    'paused',
    'completed',
    'skipped'
);


--
-- Name: enum_production_orders_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_orders_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


--
-- Name: enum_production_orders_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_orders_status AS ENUM (
    'planned',
    'released',
    'in_progress',
    'completed',
    'paused',
    'canceled'
);


--
-- Name: enum_production_routes_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_production_routes_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'superseded'
);


--
-- Name: enum_products_product_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_products_product_type AS ENUM (
    'finished',
    'semi_finished',
    'component',
    'raw_material'
);


--
-- Name: enum_products_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_products_status AS ENUM (
    'active',
    'inactive'
);


--
-- Name: enum_purchase_order_approvals_approver_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_order_approvals_approver_role AS ENUM (
    'diretor'
);


--
-- Name: enum_purchase_order_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_order_items_status AS ENUM (
    'pending',
    'partial',
    'received',
    'canceled'
);


--
-- Name: enum_purchase_orders_freight_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_orders_freight_type AS ENUM (
    'cif',
    'fob'
);


--
-- Name: enum_purchase_orders_invoice_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_orders_invoice_type AS ENUM (
    'nfe',
    'nfse'
);


--
-- Name: enum_purchase_orders_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_orders_origin AS ENUM (
    'national',
    'import'
);


--
-- Name: enum_purchase_orders_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_orders_status AS ENUM (
    'pending',
    'approved',
    'sent',
    'partial',
    'received',
    'canceled'
);


--
-- Name: enum_purchase_requisition_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_requisition_items_status AS ENUM (
    'pending',
    'ordered',
    'canceled'
);


--
-- Name: enum_purchase_requisitions_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_requisitions_priority AS ENUM (
    'normal',
    'urgent',
    'emergency'
);


--
-- Name: enum_purchase_requisitions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_purchase_requisitions_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'ordered',
    'partial',
    'received',
    'canceled'
);


--
-- Name: enum_quality_inspections_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_quality_inspections_stage AS ENUM (
    'incoming',
    'in_process',
    'final'
);


--
-- Name: enum_quality_inspections_verdict; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_quality_inspections_verdict AS ENUM (
    'approved',
    'rejected',
    'approved_under_concession'
);


--
-- Name: enum_rfq_suppliers_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_rfq_suppliers_status AS ENUM (
    'invited',
    'responded',
    'declined'
);


--
-- Name: enum_rfqs_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_rfqs_status AS ENUM (
    'draft',
    'sent',
    'quoted',
    'awarded',
    'cancelled'
);


--
-- Name: enum_sale_invoices_nfe_environment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sale_invoices_nfe_environment AS ENUM (
    'homologacao',
    'producao'
);


--
-- Name: enum_sale_invoices_nfe_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sale_invoices_nfe_provider AS ENUM (
    'mock',
    'focus_nfe',
    'enotas'
);


--
-- Name: enum_sale_invoices_nfe_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sale_invoices_nfe_status AS ENUM (
    'processing',
    'authorized',
    'denied',
    'cancelled'
);


--
-- Name: enum_sales_nfe_environment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sales_nfe_environment AS ENUM (
    'homologacao',
    'producao'
);


--
-- Name: enum_sales_nfe_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sales_nfe_status AS ENUM (
    'pending',
    'processing',
    'authorized',
    'denied',
    'cancelled'
);


--
-- Name: enum_sales_payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sales_payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'pix',
    'boleto',
    'transfer'
);


--
-- Name: enum_sales_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sales_status AS ENUM (
    'quote',
    'confirmed',
    'invoiced',
    'canceled',
    'shipped',
    'partially_invoiced'
);


--
-- Name: enum_serial_numbers_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_serial_numbers_status AS ENUM (
    'available',
    'reserved',
    'sold',
    'blocked',
    'scrapped'
);


--
-- Name: enum_service_orders_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_service_orders_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


--
-- Name: enum_service_orders_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_service_orders_status AS ENUM (
    'open',
    'diagnosing',
    'in_progress',
    'waiting_parts',
    'completed',
    'delivered',
    'canceled'
);


--
-- Name: enum_sst_acidente_complementos_campo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_acidente_complementos_campo AS ENUM (
    'dias_perdidos',
    'houve_cat'
);


--
-- Name: enum_sst_acidentes_gravidade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_acidentes_gravidade AS ENUM (
    'sem_afastamento',
    'com_afastamento',
    'incapacidade_permanente',
    'obito'
);


--
-- Name: enum_sst_acidentes_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_acidentes_tipo AS ENUM (
    'tipico',
    'trajeto',
    'doenca_ocupacional'
);


--
-- Name: enum_sst_acoes_corretivas_origem_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_acoes_corretivas_origem_tipo AS ENUM (
    'investigacao_acidente',
    'reuniao_cipa',
    'inspecao_seguranca',
    'pgr'
);


--
-- Name: enum_sst_acoes_corretivas_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_acoes_corretivas_status AS ENUM (
    'aberta',
    'em_andamento',
    'concluida',
    'atrasada'
);


--
-- Name: enum_sst_asos_resultado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_asos_resultado AS ENUM (
    'apto',
    'inapto',
    'apto_com_restricoes'
);


--
-- Name: enum_sst_asos_status_esocial_s2220; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_asos_status_esocial_s2220 AS ENUM (
    'pendente',
    'enviado',
    'aceito',
    'rejeitado'
);


--
-- Name: enum_sst_asos_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_asos_tipo AS ENUM (
    'admissional',
    'periodico',
    'retorno_trabalho',
    'mudanca_riscos',
    'demissional'
);


--
-- Name: enum_sst_cats_status_esocial_s2210; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_cats_status_esocial_s2210 AS ENUM (
    'pendente',
    'enviado',
    'aceito',
    'rejeitado'
);


--
-- Name: enum_sst_cats_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_cats_tipo AS ENUM (
    'inicial',
    'reabertura',
    'obito'
);


--
-- Name: enum_sst_entregas_epi_evidencia_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_entregas_epi_evidencia_tipo AS ENUM (
    'assinatura_digitalizada',
    'aceite_eletronico',
    'biometria'
);


--
-- Name: enum_sst_entregas_epi_motivo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_entregas_epi_motivo AS ENUM (
    'primeira_entrega',
    'troca_periodica',
    'dano',
    'perda',
    'mudanca_funcao'
);


--
-- Name: enum_sst_eventos_esocial_origem_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_eventos_esocial_origem_tipo AS ENUM (
    'cat',
    'aso',
    'ges_funcionario'
);


--
-- Name: enum_sst_eventos_esocial_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_eventos_esocial_status AS ENUM (
    'pendente',
    'enviado',
    'aceito',
    'rejeitado'
);


--
-- Name: enum_sst_eventos_esocial_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_eventos_esocial_tipo AS ENUM (
    'S-2210',
    'S-2220',
    'S-2240'
);


--
-- Name: enum_sst_mandatos_cipa_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_mandatos_cipa_status AS ENUM (
    'eleicao_em_curso',
    'vigente',
    'encerrado'
);


--
-- Name: enum_sst_matriz_treinamento_norma; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_matriz_treinamento_norma AS ENUM (
    'NR-6',
    'NR-10',
    'NR-11',
    'NR-12',
    'NR-17',
    'NR-20',
    'NR-23_brigada',
    'primeiros_socorros',
    'CIPA',
    'outro'
);


--
-- Name: enum_sst_membros_cipa_origem; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_membros_cipa_origem AS ENUM (
    'eleito',
    'designado'
);


--
-- Name: enum_sst_membros_cipa_papel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_membros_cipa_papel AS ENUM (
    'presidente',
    'vice_presidente',
    'secretario',
    'titular',
    'suplente'
);


--
-- Name: enum_sst_permissoes_trabalho_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_permissoes_trabalho_status AS ENUM (
    'emitida',
    'encerrada',
    'cancelada'
);


--
-- Name: enum_sst_registros_dds_turno; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_registros_dds_turno AS ENUM (
    'morning',
    'afternoon',
    'night',
    'commercial',
    'rotating'
);


--
-- Name: enum_sst_reunioes_cipa_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_reunioes_cipa_tipo AS ENUM (
    'ordinaria',
    'extraordinaria'
);


--
-- Name: enum_sst_riscos_ocupacionais_categoria_agente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_riscos_ocupacionais_categoria_agente AS ENUM (
    'fisico',
    'quimico',
    'biologico',
    'ergonomico',
    'mecanico_acidente'
);


--
-- Name: enum_sst_treinamentos_norma; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_sst_treinamentos_norma AS ENUM (
    'NR-6',
    'NR-10',
    'NR-11',
    'NR-12',
    'NR-17',
    'NR-20',
    'NR-23_brigada',
    'primeiros_socorros',
    'CIPA',
    'DDS_tema',
    'outro'
);


--
-- Name: enum_suppliers_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_suppliers_status AS ENUM (
    'active',
    'inactive',
    'blocked'
);


--
-- Name: enum_treasury_bank_accounts_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_treasury_bank_accounts_account_type AS ENUM (
    'corrente',
    'poupanca',
    'aplicacao'
);


--
-- Name: enum_treasury_financial_operations_guarantee_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_treasury_financial_operations_guarantee_type AS ENUM (
    'aval',
    'fianca',
    'alienacao',
    'recebiveis',
    'none'
);


--
-- Name: enum_treasury_financial_operations_operation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_treasury_financial_operations_operation_type AS ENUM (
    'loan',
    'investment',
    'financing',
    'leasing'
);


--
-- Name: enum_treasury_financial_operations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_treasury_financial_operations_status AS ENUM (
    'active',
    'settled',
    'canceled'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'operator',
    'financial'
);


--
-- Name: enum_warehouse_transfers_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_warehouse_transfers_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: item_estrutura_component_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_estrutura_component_type AS ENUM (
    'raw_material',
    'component',
    'semi_finished',
    'packaging',
    'consumable',
    'other'
);


--
-- Name: item_estrutura_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_estrutura_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'superseded'
);


--
-- Name: item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_status AS ENUM (
    'ATIVO',
    'INATIVO',
    'BLOQUEADO'
);


--
-- Name: item_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_tipo AS ENUM (
    'MATERIA_PRIMA',
    'SUBCONJUNTO',
    'PRODUTO_ACABADO',
    'USO_E_CONSUMO',
    'ATIVO_IMOBILIZADO'
);


--
-- Name: movimento_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.movimento_tipo AS ENUM (
    'ENTRADA_NF',
    'BAIXA_PRODUCAO',
    'REQUISICAO_MATERIAL',
    'AJUSTE',
    'RESERVA',
    'LIBERACAO_RESERVA'
);


--
-- Name: ordem_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ordem_status AS ENUM (
    'RASCUNHO',
    'APROVADA',
    'EM_EXECUCAO',
    'CONCLUIDA',
    'CANCELADA'
);


--
-- Name: origem_mrp; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.origem_mrp AS ENUM (
    'PEDIDO_VENDA',
    'PREVISAO',
    'ORDEM_PRODUCAO',
    'MANUAL'
);


--
-- Name: hr_block_delete_employee_benefit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hr_block_delete_employee_benefit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'hr_employee_benefits nunca e excluido fisicamente (RF-RH-054) - use enrollment_status=cancelado (id=%)', OLD.id;
      END;
      $$;


--
-- Name: hr_block_delete_vacation_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hr_block_delete_vacation_schedule() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'hr_vacation_schedules nunca e excluido fisicamente (RF-RH-040) - use novo registro com superseded_by_id (id=%)', OLD.id;
      END;
      $$;


--
-- Name: hr_lock_employee_contract(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hr_lock_employee_contract() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_employee_contracts e imutavel (RNF-RH-04) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.type IS DISTINCT FROM OLD.type
             OR NEW.start_date IS DISTINCT FROM OLD.start_date
             OR NEW.period_1_end_date IS DISTINCT FROM OLD.period_1_end_date
             OR NEW.created_by IS DISTINCT FROM OLD.created_by
             OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'hr_employee_contracts - campos estruturais sao imutaveis apos o cadastro (id=%)', OLD.id;
          END IF;

          IF OLD.period_2_end_date IS NOT NULL AND NEW.period_2_end_date IS DISTINCT FROM OLD.period_2_end_date THEN
            RAISE EXCEPTION 'hr_employee_contracts - period_2_end_date so admite uma prorrogacao (RF-RH-015, id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: hr_lock_job_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hr_lock_job_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_employee_job_history e imutavel (RNF-RH-04, CLT art. 468) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.job_position_id IS DISTINCT FROM OLD.job_position_id
             OR NEW.department_id IS DISTINCT FROM OLD.department_id
             OR NEW.salary IS DISTINCT FROM OLD.salary
             OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
             OR NEW.reason IS DISTINCT FROM OLD.reason
             OR NEW.created_by IS DISTINCT FROM OLD.created_by
             OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'hr_employee_job_history e imutavel (RNF-RH-04) - apenas effective_to/pending_aso_risk_change/esocial_event_confirmed_at/esocial_event_confirmed_by podem mudar (id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: hr_lock_vacation_accrual_period(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hr_lock_vacation_accrual_period() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'hr_vacation_accrual_periods e imutavel na sua janela legal (RNF-RH-04, BR-RH-004) - DELETE nao permitido (id=%)', OLD.id;
        END IF;

        IF TG_OP = 'UPDATE' THEN
          IF NEW.employee_id IS DISTINCT FROM OLD.employee_id
             OR NEW.period_start IS DISTINCT FROM OLD.period_start
             OR NEW.period_end IS DISTINCT FROM OLD.period_end
             OR NEW.concessive_end IS DISTINCT FROM OLD.concessive_end THEN
            RAISE EXCEPTION 'hr_vacation_accrual_periods - period_start/period_end/concessive_end sao imutaveis apos abertura (id=%)', OLD.id;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: jur_lock_contract_addendum(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jur_lock_contract_addendum() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_contract_addendums id=% e imutavel; DELETE nao permitido (RF-JUR-008/RNF-JUR-02). Registre um novo aditivo corretivo.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_contract_addendums id=% e imutavel; UPDATE nao permitido (RF-JUR-008/RNF-JUR-02). Registre um novo aditivo corretivo.', OLD.id;
      END;
      $$;


--
-- Name: jur_lock_legal_case_deadline(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jur_lock_legal_case_deadline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_deadlines id=% nao pode ser excluido (RF-JUR-044). Use status para refletir o desfecho.', OLD.id;
        END IF;

        IF OLD.status IN ('confirmed', 'confirmed_late') THEN
          RAISE EXCEPTION 'jur_legal_case_deadlines id=% ja foi baixado (status=%) e e imutavel (RNF-JUR-02/BR-JUR-013/014).', OLD.id, OLD.status;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: jur_lock_legal_case_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jur_lock_legal_case_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_events id=% e imutavel; DELETE nao permitido (RF-JUR-014/RNF-JUR-02). Registre um novo andamento corretivo.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_legal_case_events id=% e imutavel; UPDATE nao permitido (RF-JUR-014/RNF-JUR-02). Registre um novo andamento corretivo.', OLD.id;
      END;
      $$;


--
-- Name: jur_lock_legal_case_provision(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jur_lock_legal_case_provision() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'jur_legal_case_provisions id=% e append-only (CPC 25/RNF-JUR-02); DELETE nao permitido. Registre nova avaliacao.', OLD.id;
        END IF;
        RAISE EXCEPTION 'jur_legal_case_provisions id=% e append-only (CPC 25/RNF-JUR-02); UPDATE nao permitido. Registre nova avaliacao.', OLD.id;
      END;
      $$;


--
-- Name: sst_block_delete_evento_esocial(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sst_block_delete_evento_esocial() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RAISE EXCEPTION 'sst_eventos_esocial id=% nao pode ser excluido (RNF-SST-03/RF-SST-043).', OLD.id;
      END;
      $$;


--
-- Name: sst_lock_acidente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sst_lock_acidente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.confirmado THEN
            RAISE EXCEPTION 'sst_acidentes id=% e confirmado; DELETE nao permitido (RNF-SST-01/BR-SST-017).', OLD.id;
          END IF;
          RETURN OLD;
        END IF;

        IF OLD.confirmado THEN
          IF NEW.id = OLD.id
             AND NEW.employee_id = OLD.employee_id
             AND NEW.data_hora = OLD.data_hora
             AND NEW.tipo = OLD.tipo
             AND NEW.setor_local = OLD.setor_local
             AND NEW.descricao = OLD.descricao
             AND (NEW.parte_corpo_atingida IS NOT DISTINCT FROM OLD.parte_corpo_atingida)
             AND (NEW.agente_causador IS NOT DISTINCT FROM OLD.agente_causador)
             AND NEW.gravidade = OLD.gravidade
             AND (NEW.justificativa_sem_cat IS NOT DISTINCT FROM OLD.justificativa_sem_cat)
             AND NEW.confirmado = OLD.confirmado
             AND NEW.confirmado_em = OLD.confirmado_em
             AND NEW.registrado_por = OLD.registrado_por
             AND NEW.created_at = OLD.created_at
          THEN
            -- Somente dias_perdidos/houve_cat (e updated_at) puderam mudar.
            RETURN NEW;
          END IF;
          RAISE EXCEPTION 'sst_acidentes id=% ja confirmado; somente dias_perdidos/houve_cat sao atualizaveis (RNF-SST-01/BR-SST-017).', OLD.id;
        END IF;

        RETURN NEW;
      END;
      $$;


--
-- Name: sst_lock_cat(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sst_lock_cat() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'sst_cats id=% nao pode ser excluida (RNF-SST-01/RF-SST-043: evento eSocial nunca descartado silenciosamente).', OLD.id;
        END IF;

        IF NEW.id = OLD.id
           AND NEW.acidente_id = OLD.acidente_id
           AND (NEW.numero_cat IS NOT DISTINCT FROM OLD.numero_cat)
           AND NEW.tipo = OLD.tipo
           AND NEW.data_emissao = OLD.data_emissao
           AND NEW.prazo_limite = OLD.prazo_limite
           AND NEW.emitente_id = OLD.emitente_id
           AND NEW.created_at = OLD.created_at
        THEN
          RETURN NEW;
        END IF;

        RAISE EXCEPTION 'sst_cats id=%: conteudo legal imutavel apos emissao; somente colunas de status eSocial sao atualizaveis (RNF-SST-01).', OLD.id;
      END;
      $$;


--
-- Name: sst_lock_entrega_epi(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sst_lock_entrega_epi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.confirmada THEN
            RAISE EXCEPTION 'sst_entregas_epi id=% e confirmada; DELETE nao permitido (RNF-SST-01/BR-SST-006). Use sst_estornos_entrega_epi.', OLD.id;
          END IF;
          RETURN OLD;
        END IF;

        IF OLD.confirmada THEN
          RAISE EXCEPTION 'sst_entregas_epi id=% ja confirmada e imutavel (RNF-SST-01/BR-SST-006). Use sst_estornos_entrega_epi para correcao.', OLD.id;
        END IF;

        RETURN NEW;
      END;
      $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: SequelizeMeta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SequelizeMeta" (
    name character varying(255) NOT NULL
);


--
-- Name: access_profile_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_profile_permissions (
    id integer NOT NULL,
    access_profile_id integer NOT NULL,
    module character varying(50) NOT NULL,
    level public.enum_access_profile_permissions_level NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN access_profile_permissions.module; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.access_profile_permissions.module IS 'Chave do modulo conforme a matriz de BUSINESS_RULES.md §1 (ex.: compras, estoque, producao)';


--
-- Name: COLUMN access_profile_permissions.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.access_profile_permissions.level IS 'Presenca da linha = modulo visivel (view implicito); approve inclui operate';


--
-- Name: access_profile_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.access_profile_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_profile_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.access_profile_permissions_id_seq OWNED BY public.access_profile_permissions.id;


--
-- Name: access_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_profiles (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    allowed_warehouses jsonb,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN access_profiles.allowed_warehouses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.access_profiles.allowed_warehouses IS 'Lista simples de depositos permitidos para o perfil (null = sem restricao por deposito)';


--
-- Name: access_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.access_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.access_profiles_id_seq OWNED BY public.access_profiles.id;


--
-- Name: accounting_chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_chart_of_accounts (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    account_type public.enum_accounting_chart_of_accounts_account_type NOT NULL,
    account_level integer DEFAULT 1 NOT NULL,
    parent_id integer,
    accept_entries boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: accounting_chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounting_chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounting_chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounting_chart_of_accounts_id_seq OWNED BY public.accounting_chart_of_accounts.id;


--
-- Name: accounting_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_entries (
    id integer NOT NULL,
    entry_number character varying(20) NOT NULL,
    entry_date date NOT NULL,
    description character varying(255) NOT NULL,
    entry_type public.enum_accounting_entries_entry_type NOT NULL,
    status public.enum_accounting_entries_status DEFAULT 'draft'::public.enum_accounting_entries_status NOT NULL,
    created_by integer NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    reversal_of_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: accounting_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounting_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounting_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounting_entries_id_seq OWNED BY public.accounting_entries.id;


--
-- Name: accounting_entry_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_entry_items (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    account_id integer NOT NULL,
    cost_center_id integer,
    debit numeric(15,2) DEFAULT 0 NOT NULL,
    credit numeric(15,2) DEFAULT 0 NOT NULL,
    historical text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: accounting_entry_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounting_entry_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounting_entry_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounting_entry_items_id_seq OWNED BY public.accounting_entry_items.id;


--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id integer NOT NULL,
    description character varying(200) NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    payment_date date,
    status public.enum_accounts_payable_status DEFAULT 'pending'::public.enum_accounts_payable_status NOT NULL,
    category character varying(100),
    supplier_id integer,
    purchase_id integer,
    invoice_number character varying(50),
    barcode character varying(50),
    payment_type public.enum_accounts_payable_payment_type,
    cost_center character varying(100),
    notes text,
    approved_by integer,
    approval_date date,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0 NOT NULL,
    invoice_type public.enum_accounts_payable_invoice_type,
    cost_center_id integer,
    legal_case_id integer,
    legal_expense_type public.enum_accounts_payable_legal_expense_type,
    CONSTRAINT ck_jur_accounts_payable_legal_expense_type_requires_case CHECK (((legal_expense_type IS NULL) OR (legal_case_id IS NOT NULL)))
);


--
-- Name: COLUMN accounts_payable.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.description IS 'Descrição da conta';


--
-- Name: COLUMN accounts_payable.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.amount IS 'Valor';


--
-- Name: COLUMN accounts_payable.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.due_date IS 'Data de vencimento';


--
-- Name: COLUMN accounts_payable.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.supplier_id IS 'FK → suppliers.id';


--
-- Name: COLUMN accounts_payable.purchase_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.purchase_id IS 'FK → purchase_orders.id';


--
-- Name: COLUMN accounts_payable.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.approved_by IS 'FK → users.id';


--
-- Name: COLUMN accounts_payable.amount_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.amount_paid IS 'Soma dos valores ja pagos/recebidos nesta conta. O campo `amount` permanece o valor TOTAL original (nunca sobrescrito); status so vira "paid" quando amount_paid >= amount.';


--
-- Name: COLUMN accounts_payable.invoice_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.invoice_type IS 'Tipo de nota vinculada: nfe (mercadoria) ou nfse (servico/licenca digital)';


--
-- Name: COLUMN accounts_payable.legal_case_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.legal_case_id IS 'FK para jur_legal_cases.id (RF-JUR-018) - custos de contencioso (honorarios, custas, pericias, depositos)';


--
-- Name: COLUMN accounts_payable.legal_expense_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_payable.legal_expense_type IS 'Distingue despesa juridica normal de deposito judicial/recursal (RF-JUR-018) - so preenchido quando legal_case_id nao e nulo';


--
-- Name: accounts_payable_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_payable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_payable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_payable_id_seq OWNED BY public.accounts_payable.id;


--
-- Name: accounts_receivable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_receivable (
    id integer NOT NULL,
    sale_id integer,
    customer_id integer NOT NULL,
    installment integer DEFAULT 1 NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    payment_date date,
    status public.enum_accounts_receivable_status DEFAULT 'pending'::public.enum_accounts_receivable_status NOT NULL,
    payment_method character varying(30),
    invoice_number character varying(50),
    barcode character varying(50),
    pix_key character varying(100),
    interest numeric(10,2) DEFAULT 0 NOT NULL,
    fine numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    collection_status public.enum_accounts_receivable_collection_status DEFAULT 'normal'::public.enum_accounts_receivable_collection_status NOT NULL,
    protest_date date,
    negativation_date date,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0 NOT NULL,
    cost_center_id integer
);


--
-- Name: COLUMN accounts_receivable.sale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.sale_id IS 'FK → sales.id (venda de origem)';


--
-- Name: COLUMN accounts_receivable.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.customer_id IS 'FK → clients.id';


--
-- Name: COLUMN accounts_receivable.installment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.installment IS 'Nº da parcela';


--
-- Name: COLUMN accounts_receivable.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.amount IS 'Valor da parcela';


--
-- Name: COLUMN accounts_receivable.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.due_date IS 'Data de vencimento';


--
-- Name: COLUMN accounts_receivable.interest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.interest IS 'Juros';


--
-- Name: COLUMN accounts_receivable.fine; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.fine IS 'Multa';


--
-- Name: COLUMN accounts_receivable.discount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.discount IS 'Desconto';


--
-- Name: COLUMN accounts_receivable.amount_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounts_receivable.amount_paid IS 'Soma dos valores ja pagos/recebidos nesta conta. O campo `amount` permanece o valor TOTAL original (nunca sobrescrito); status so vira "paid" quando amount_paid >= amount.';


--
-- Name: accounts_receivable_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_receivable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_receivable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_receivable_id_seq OWNED BY public.accounts_receivable.id;


--
-- Name: acoustic_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acoustic_test_results (
    id integer NOT NULL,
    product_id integer NOT NULL,
    serial_number character varying(50),
    lot_number character varying(80),
    production_order_id integer,
    test_type public.enum_acoustic_test_results_test_type NOT NULL,
    test_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tester_id integer NOT NULL,
    parameters jsonb,
    result numeric(12,4),
    unit character varying(20),
    specification_min numeric(12,4),
    specification_max numeric(12,4),
    passed boolean NOT NULL,
    curve_data jsonb,
    notes text,
    non_conformity_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    consumed_quantity numeric(18,6)
);


--
-- Name: COLUMN acoustic_test_results.consumed_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acoustic_test_results.consumed_quantity IS 'Quantidade consumida (destruída) do produto testado, debitada automaticamente do Depósito LABORATORIO na mesma transação do registro do teste (UC-42-E). Nulo/zero quando o teste não é destrutivo.';


--
-- Name: acoustic_test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.acoustic_test_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: acoustic_test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.acoustic_test_results_id_seq OWNED BY public.acoustic_test_results.id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    tag character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    product_id integer,
    department_id integer,
    responsible_id integer,
    location character varying(100),
    asset_type public.enum_assets_asset_type DEFAULT 'equipment'::public.enum_assets_asset_type NOT NULL,
    brand character varying(100),
    model character varying(100),
    serial_number character varying(100),
    purchase_date date,
    purchase_value numeric(10,2),
    current_value numeric(10,2),
    useful_life_months integer,
    status public.enum_assets_status DEFAULT 'active'::public.enum_assets_status NOT NULL,
    qr_code character varying(255),
    notes text,
    last_inventory_date date,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    photo_path character varying(500),
    license_expires_at date,
    purchase_item_id integer
);


--
-- Name: COLUMN assets.tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.tag IS 'Tag/plaqueta de identificação do ativo';


--
-- Name: COLUMN assets.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.name IS 'Nome do ativo';


--
-- Name: COLUMN assets.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.product_id IS 'FK → products.id (quando aplicável)';


--
-- Name: COLUMN assets.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.department_id IS 'FK → departments.id';


--
-- Name: COLUMN assets.responsible_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.responsible_id IS 'FK → employees.id';


--
-- Name: COLUMN assets.purchase_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.purchase_value IS 'Valor de aquisição';


--
-- Name: COLUMN assets.current_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.current_value IS 'Valor contábil atual';


--
-- Name: COLUMN assets.photo_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.photo_path IS 'Caminho relativo (uploads/assets/...) da foto do ativo';


--
-- Name: COLUMN assets.license_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.license_expires_at IS 'Data de vencimento da licenca (usado quando asset_type = license)';


--
-- Name: COLUMN assets.purchase_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.assets.purchase_item_id IS 'FK -> purchase_order_items.id (origem de compra do ativo, quando aplicavel)';


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    user_name character varying(200),
    user_ip character varying(45),
    user_agent character varying(255),
    action public.enum_audit_logs_action NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    entity_description character varying(255),
    old_values json,
    new_values json,
    description text,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    route character varying(100),
    method character varying(10),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN audit_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.user_id IS 'FK → users.id (quem executou a ação)';


--
-- Name: COLUMN audit_logs.action; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.action IS 'Tipo de ação executada';


--
-- Name: COLUMN audit_logs.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_type IS 'Tipo de entidade (ex: sale, product, user)';


--
-- Name: COLUMN audit_logs.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID da entidade';


--
-- Name: COLUMN audit_logs.old_values; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.old_values IS 'Valores anteriores (antes da alteração)';


--
-- Name: COLUMN audit_logs.new_values; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.audit_logs.new_values IS 'Novos valores (depois da alteração)';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: auditoria_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entidade character varying(80) NOT NULL,
    entidade_id uuid NOT NULL,
    acao character varying(80) NOT NULL,
    usuario_id integer,
    antes jsonb,
    depois jsonb,
    correlation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE auditoria_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditoria_eventos IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN auditoria_eventos.usuario_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_eventos.usuario_id IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela auditoria_eventos e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: bank_statement_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statement_entries (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    entry_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    description character varying(255),
    fitid character varying(100) NOT NULL,
    status public.enum_bank_statement_entries_status DEFAULT 'pending'::public.enum_bank_statement_entries_status NOT NULL,
    matched_payable_id integer,
    matched_receivable_id integer,
    matched_by integer,
    matched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_bank_statement_entries_single_match CHECK (((matched_payable_id IS NULL) OR (matched_receivable_id IS NULL)))
);


--
-- Name: COLUMN bank_statement_entries.entry_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statement_entries.entry_date IS 'DTPOSTED do <STMTTRN>';


--
-- Name: COLUMN bank_statement_entries.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statement_entries.amount IS 'TRNAMT com sinal (negativo = saída/debito, positivo = entrada/credito)';


--
-- Name: COLUMN bank_statement_entries.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statement_entries.description IS 'MEMO/NAME do <STMTTRN>';


--
-- Name: COLUMN bank_statement_entries.fitid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statement_entries.fitid IS 'FITID do <STMTTRN> (ou id sintético determinístico quando ausente no arquivo) — usado para dedup na reimportação';


--
-- Name: bank_statement_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_statement_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_statement_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_statement_entries_id_seq OWNED BY public.bank_statement_entries.id;


--
-- Name: bank_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statements (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    bank_name character varying(150),
    account_number character varying(60),
    period_start date,
    period_end date,
    imported_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN bank_statements.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statements.filename IS 'Nome original do arquivo .ofx enviado';


--
-- Name: COLUMN bank_statements.bank_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statements.bank_name IS 'Nome do banco (deduzido do BANKID do OFX quando reconhecido) — apenas informativo';


--
-- Name: COLUMN bank_statements.account_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statements.account_number IS 'ACCTID do OFX — apenas informativo';


--
-- Name: COLUMN bank_statements.period_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statements.period_start IS 'DTSTART do OFX';


--
-- Name: COLUMN bank_statements.period_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_statements.period_end IS 'DTEND do OFX';


--
-- Name: bank_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_statements_id_seq OWNED BY public.bank_statements.id;


--
-- Name: bill_of_material_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_of_material_items (
    id integer NOT NULL,
    bom_id integer NOT NULL,
    component_product_id integer NOT NULL,
    item_id uuid,
    quantity numeric(12,4) DEFAULT 1 NOT NULL,
    unit character varying(10) DEFAULT 'un'::character varying NOT NULL,
    bom_level integer DEFAULT 1 NOT NULL,
    parent_item_id integer,
    sequence_order integer DEFAULT 0 NOT NULL,
    component_type public.enum_bill_of_material_items_component_type DEFAULT 'component'::public.enum_bill_of_material_items_component_type NOT NULL,
    scrap_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    unit_cost numeric(12,2) DEFAULT 0 NOT NULL,
    total_cost numeric(12,2) DEFAULT 0 NOT NULL,
    notes text,
    alternative_product_id integer,
    is_critical boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN bill_of_material_items.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.id IS 'Identificador único do item da BOM';


--
-- Name: COLUMN bill_of_material_items.bom_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.bom_id IS 'FK → bill_of_materials.id';


--
-- Name: COLUMN bill_of_material_items.component_product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.component_product_id IS 'FK → Product.id (o componente, LEGADO)';


--
-- Name: COLUMN bill_of_material_items.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.item_id IS 'FK → items.id (NOVO, parallel to component_product_id)';


--
-- Name: COLUMN bill_of_material_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.quantity IS 'Quantidade para UMA unidade do produto pai';


--
-- Name: COLUMN bill_of_material_items.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.unit IS 'Unidade: un, g, kg, m, l';


--
-- Name: COLUMN bill_of_material_items.bom_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.bom_level IS 'Nível hierárquico (0=produto final)';


--
-- Name: COLUMN bill_of_material_items.parent_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.parent_item_id IS 'Auto-relacionamento: item pai';


--
-- Name: COLUMN bill_of_material_items.sequence_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.sequence_order IS 'Ordem de montagem';


--
-- Name: COLUMN bill_of_material_items.scrap_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.scrap_percentage IS '% de perda técnica esperada';


--
-- Name: COLUMN bill_of_material_items.unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.unit_cost IS 'Custo unitário (cache)';


--
-- Name: COLUMN bill_of_material_items.total_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.total_cost IS 'Custo total (cache: qtd × unit_cost + scrap)';


--
-- Name: COLUMN bill_of_material_items.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.notes IS 'Observações específicas do item';


--
-- Name: COLUMN bill_of_material_items.alternative_product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.alternative_product_id IS 'FK → Product.id (substituto aprovado)';


--
-- Name: COLUMN bill_of_material_items.is_critical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_material_items.is_critical IS 'Item crítico (único fornecedor, lead time longo)';


--
-- Name: bill_of_material_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_of_material_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bill_of_material_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_of_material_items_id_seq OWNED BY public.bill_of_material_items.id;


--
-- Name: bill_of_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_of_materials (
    id integer NOT NULL,
    product_id integer NOT NULL,
    revision character varying(10) DEFAULT '00'::character varying NOT NULL,
    revision_date date NOT NULL,
    revision_notes text,
    status public.enum_bill_of_materials_status DEFAULT 'draft'::public.enum_bill_of_materials_status NOT NULL,
    created_by integer,
    approved_by integer,
    approval_date date,
    notes text,
    total_components integer DEFAULT 0 NOT NULL,
    total_cost numeric(12,2) DEFAULT 0 NOT NULL,
    manufacturing_time_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE bill_of_materials; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bill_of_materials IS 'G1 (2026-08-10): FONTE UNICA da estrutura de produto do ERP. Lida pela criacao/liberacao/conclusao de OP (reserva, consumo, custeio) e, desde o G1, tambem pelo MRP e pela explosao de item via projecao em UUID (services/bomStructureProjection). Ciclo de revisao ISO 9001 8.5.6: draft = editavel; active = vigente e IMUTAVEL no conteudo (so 1 por produto, ver uq_bill_of_materials_active_per_product); inactive = aposentada; superseded = substituida por revisao mais nova, com os componentes INTACTOS para sustentar as OPs que rodaram com ela.';


--
-- Name: COLUMN bill_of_materials.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.id IS 'Identificador único da BOM';


--
-- Name: COLUMN bill_of_materials.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.product_id IS 'FK → Product.id. Produto ao qual esta BOM pertence';


--
-- Name: COLUMN bill_of_materials.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.revision IS 'G1: identifica a versao da estrutura. Nao pode repetir para o mesmo produto entre revisoes nao-inativas (regra G1-BOM-REV-DUP em BomService.createBOM) — sem rotulo unico nao ha como dizer contra qual versao cada OP rodou.';


--
-- Name: COLUMN bill_of_materials.revision_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.revision_date IS 'Data de efetivação desta revisão';


--
-- Name: COLUMN bill_of_materials.revision_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.revision_notes IS 'Notas de alteração da revisão';


--
-- Name: COLUMN bill_of_materials.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.status IS 'G1: draft = editavel; active = vigente, conteudo congelado, no maximo 1 por produto; inactive = aposentada; superseded = substituida por revisao mais nova (terminal, intocavel).';


--
-- Name: COLUMN bill_of_materials.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.created_by IS 'FK → User.id (criador)';


--
-- Name: COLUMN bill_of_materials.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.approved_by IS 'FK → User.id (aprovador)';


--
-- Name: COLUMN bill_of_materials.approval_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.approval_date IS 'Data de aprovação';


--
-- Name: COLUMN bill_of_materials.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.notes IS 'Observações técnicas gerais';


--
-- Name: COLUMN bill_of_materials.total_components; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.total_components IS 'Cache: total de itens distintos';


--
-- Name: COLUMN bill_of_materials.total_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.total_cost IS 'Cache: custo total calculado';


--
-- Name: COLUMN bill_of_materials.manufacturing_time_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bill_of_materials.manufacturing_time_minutes IS 'Cache: tempo total de fabricação (min)';


--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_of_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_of_materials_id_seq OWNED BY public.bill_of_materials.id;


--
-- Name: budget_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_lines (
    id integer NOT NULL,
    cost_center_id integer NOT NULL,
    year integer NOT NULL,
    month integer,
    category public.enum_budget_lines_category DEFAULT 'outro'::public.enum_budget_lines_category NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_budget_lines_month CHECK (((month IS NULL) OR ((month >= 1) AND (month <= 12)))),
    CONSTRAINT chk_budget_lines_planned_amount CHECK ((planned_amount >= (0)::numeric)),
    CONSTRAINT chk_budget_lines_year CHECK (((year >= 2000) AND (year <= 2100)))
);


--
-- Name: COLUMN budget_lines.month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budget_lines.month IS 'NULL = linha anual "achatada"; 1-12 = linha mensal';


--
-- Name: budget_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budget_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: budget_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budget_lines_id_seq OWNED BY public.budget_lines.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    cpf_cnpj character varying(18) NOT NULL,
    phone character varying(20) DEFAULT ''::character varying NOT NULL,
    email character varying(100) DEFAULT ''::character varying NOT NULL,
    cep character varying(10),
    street character varying(200),
    number character varying(20),
    complement character varying(100),
    neighborhood character varying(100),
    city character varying(100),
    state character varying(2),
    status public.enum_clients_status DEFAULT 'active'::public.enum_clients_status NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    tax_regime public.enum_clients_tax_regime,
    ie character varying(20),
    im character varying(20),
    ind_final public.enum_clients_ind_final DEFAULT '0'::public.enum_clients_ind_final NOT NULL,
    ind_ie public.enum_clients_ind_ie DEFAULT '9'::public.enum_clients_ind_ie NOT NULL,
    cnae character varying(10),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    city_ibge_code character varying(7)
);


--
-- Name: COLUMN clients.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.id IS 'Identificador único';


--
-- Name: COLUMN clients.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.name IS 'Nome ou Razão Social';


--
-- Name: COLUMN clients.cpf_cnpj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.cpf_cnpj IS 'CPF ou CNPJ (apenas números ou formatado)';


--
-- Name: COLUMN clients.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.phone IS 'Telefone de contato';


--
-- Name: COLUMN clients.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.email IS 'Email de contato';


--
-- Name: COLUMN clients.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.status IS 'Status do cadastro';


--
-- Name: COLUMN clients.tax_regime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.tax_regime IS 'Regime tributário';


--
-- Name: COLUMN clients.ind_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.ind_final IS 'Consumidor final (0=não, 1=sim)';


--
-- Name: COLUMN clients.ind_ie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.ind_ie IS 'Contribuinte ICMS (1=contribuinte, 2=isento, 9=não contribuinte)';


--
-- Name: COLUMN clients.city_ibge_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.city_ibge_code IS 'Codigo IBGE do municipio do cliente (obrigatorio para NF-e destinatario)';


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: cnab_remittance_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cnab_remittance_items (
    id integer NOT NULL,
    remittance_id integer NOT NULL,
    receivable_id integer NOT NULL,
    nosso_numero character varying(20) NOT NULL,
    amount numeric(18,6) NOT NULL,
    due_date date NOT NULL,
    status public.enum_cnab_remittance_items_status DEFAULT 'pending'::public.enum_cnab_remittance_items_status NOT NULL,
    settled_at timestamp with time zone,
    error_description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cnab_remittance_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cnab_remittance_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cnab_remittance_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cnab_remittance_items_id_seq OWNED BY public.cnab_remittance_items.id;


--
-- Name: cnab_remittances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cnab_remittances (
    id integer NOT NULL,
    sequential_number integer NOT NULL,
    bank_code character varying(3) NOT NULL,
    filename character varying(60) NOT NULL,
    file_content text NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    total_amount numeric(18,6) DEFAULT 0 NOT NULL,
    generated_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cnab_remittances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cnab_remittances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cnab_remittances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cnab_remittances_id_seq OWNED BY public.cnab_remittances.id;


--
-- Name: cnab_return_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cnab_return_files (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    bank_code character varying(3),
    occurrences_count integer DEFAULT 0 NOT NULL,
    settled_count integer DEFAULT 0 NOT NULL,
    duplicates_skipped integer DEFAULT 0 NOT NULL,
    processed_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cnab_return_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cnab_return_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cnab_return_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cnab_return_files_id_seq OWNED BY public.cnab_return_files.id;


--
-- Name: cnab_return_occurrences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cnab_return_occurrences (
    id integer NOT NULL,
    return_file_id integer NOT NULL,
    remittance_item_id integer,
    nosso_numero character varying(20) NOT NULL,
    movement_code character varying(2) NOT NULL,
    movement_description character varying(100),
    amount_paid numeric(18,6) DEFAULT 0 NOT NULL,
    occurrence_date date,
    applied boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cnab_return_occurrences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cnab_return_occurrences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cnab_return_occurrences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cnab_return_occurrences_id_seq OWNED BY public.cnab_return_occurrences.id;


--
-- Name: company_banking_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_banking_config (
    id integer NOT NULL,
    bank_code character varying(3) NOT NULL,
    bank_name character varying(30) NOT NULL,
    agency character varying(5) NOT NULL,
    agency_dv character varying(1),
    account_number character varying(12) NOT NULL,
    account_dv character varying(1),
    agency_account_dv character varying(1),
    covenant_code character varying(20) NOT NULL,
    wallet_code character varying(1) NOT NULL,
    company_document character varying(14) NOT NULL,
    company_legal_name character varying(30) NOT NULL,
    next_our_number integer DEFAULT 1 NOT NULL,
    next_remittance_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: company_banking_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_banking_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_banking_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_banking_config_id_seq OWNED BY public.company_banking_config.id;


--
-- Name: company_fiscal_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_fiscal_config (
    id integer NOT NULL,
    legal_name character varying(200) NOT NULL,
    trade_name character varying(200),
    cnpj character varying(18) NOT NULL,
    ie character varying(20),
    im character varying(20),
    crt public.enum_company_fiscal_config_crt DEFAULT '3'::public.enum_company_fiscal_config_crt NOT NULL,
    cnae character varying(10),
    cep character varying(10),
    street character varying(200),
    number character varying(20),
    complement character varying(100),
    neighborhood character varying(100),
    city character varying(100),
    city_ibge_code character varying(7),
    state character varying(2),
    nfe_series integer DEFAULT 1 NOT NULL,
    nfe_next_number integer DEFAULT 1 NOT NULL,
    nfe_environment public.enum_company_fiscal_config_nfe_environment DEFAULT 'homologacao'::public.enum_company_fiscal_config_nfe_environment NOT NULL,
    nfe_provider public.enum_company_fiscal_config_nfe_provider DEFAULT 'mock'::public.enum_company_fiscal_config_nfe_provider NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN company_fiscal_config.legal_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.legal_name IS 'Razao social do emitente';


--
-- Name: COLUMN company_fiscal_config.trade_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.trade_name IS 'Nome fantasia';


--
-- Name: COLUMN company_fiscal_config.cnpj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.cnpj IS 'CNPJ do emitente (somente numeros ou formatado)';


--
-- Name: COLUMN company_fiscal_config.ie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.ie IS 'Inscricao Estadual do emitente';


--
-- Name: COLUMN company_fiscal_config.im; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.im IS 'Inscricao Municipal do emitente';


--
-- Name: COLUMN company_fiscal_config.crt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.crt IS 'Codigo de Regime Tributario: 1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal';


--
-- Name: COLUMN company_fiscal_config.city_ibge_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.city_ibge_code IS 'Codigo IBGE do municipio (cMun na NFe), obrigatorio para emitir';


--
-- Name: COLUMN company_fiscal_config.nfe_series; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.nfe_series IS 'Serie da NF-e';


--
-- Name: COLUMN company_fiscal_config.nfe_next_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.nfe_next_number IS 'Proximo numero de NF-e a ser usado (sequencial por serie)';


--
-- Name: COLUMN company_fiscal_config.nfe_environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.nfe_environment IS 'Ambiente SEFAZ: homologacao (testes) ou producao (emissao com valor fiscal real)';


--
-- Name: COLUMN company_fiscal_config.nfe_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_fiscal_config.nfe_provider IS 'Provedor de emissao configurado';


--
-- Name: company_fiscal_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_fiscal_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_fiscal_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_fiscal_config_id_seq OWNED BY public.company_fiscal_config.id;


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id integer NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cost_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_centers_id_seq OWNED BY public.cost_centers.id;


--
-- Name: customer_price_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_price_lists (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    product_id integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    valid_from date,
    valid_until date,
    active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN customer_price_lists.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.customer_id IS 'FK -> clients.id';


--
-- Name: COLUMN customer_price_lists.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.product_id IS 'FK -> products.id';


--
-- Name: COLUMN customer_price_lists.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.unit_price IS 'Preco unitario negociado com o cliente para este produto';


--
-- Name: COLUMN customer_price_lists.valid_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.valid_from IS 'Inicio da vigencia (NULL = valido desde sempre)';


--
-- Name: COLUMN customer_price_lists.valid_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.valid_until IS 'Fim da vigencia (NULL = sem prazo de expiracao)';


--
-- Name: COLUMN customer_price_lists.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_price_lists.active IS 'Soft delete - false = preco desativado, mantido para auditoria';


--
-- Name: customer_price_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_price_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_price_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_price_lists_id_seq OWNED BY public.customer_price_lists.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    sigla character varying(10) NOT NULL,
    description text,
    manager_id integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cost_center_id integer
);


--
-- Name: COLUMN departments.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.code IS 'Código único do departamento';


--
-- Name: COLUMN departments.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.name IS 'Nome do departamento';


--
-- Name: COLUMN departments.sigla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.sigla IS 'Sigla (DIR, RH, ENG, etc.)';


--
-- Name: COLUMN departments.manager_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.manager_id IS 'FK → employees.id (gestor)';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer,
    department_id integer NOT NULL,
    name character varying(200) NOT NULL,
    cpf character varying(14) NOT NULL,
    rg character varying(20),
    pis_pasep character varying(20),
    ctps character varying(20),
    phone character varying(20),
    email character varying(100),
    address text,
    "position" character varying(100),
    salary numeric(10,2) DEFAULT 0 NOT NULL,
    salary_type public.enum_employees_salary_type DEFAULT 'mensal'::public.enum_employees_salary_type NOT NULL,
    hire_date date NOT NULL,
    dismissal_date date,
    status public.enum_employees_status DEFAULT 'active'::public.enum_employees_status NOT NULL,
    shift public.enum_employees_shift DEFAULT 'commercial'::public.enum_employees_shift NOT NULL,
    work_regime public.enum_employees_work_regime DEFAULT 'clt'::public.enum_employees_work_regime NOT NULL,
    work_hours_weekly integer DEFAULT 44 NOT NULL,
    bank_name character varying(100),
    bank_agency character varying(10),
    bank_account character varying(20),
    bank_account_type public.enum_employees_bank_account_type DEFAULT 'corrente'::public.enum_employees_bank_account_type NOT NULL,
    pix_key character varying(100),
    education_level character varying(50),
    emergency_contact character varying(100),
    emergency_phone character varying(20),
    notes text,
    photo_url character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    pcd boolean,
    job_position_id integer
);


--
-- Name: COLUMN employees.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.user_id IS 'FK → users.id (vinculo com usuário do sistema)';


--
-- Name: COLUMN employees.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.department_id IS 'FK → departments.id';


--
-- Name: COLUMN employees.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.name IS 'Nome completo';


--
-- Name: COLUMN employees.cpf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.cpf IS 'CPF (apenas números)';


--
-- Name: COLUMN employees.salary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.salary IS 'Salário';


--
-- Name: COLUMN employees.hire_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.hire_date IS 'Data de admissão';


--
-- Name: COLUMN employees.pcd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.pcd IS 'RF-RH-067 - indicador PCD para calculo de quota legal (BR-RH-018) - dado sensivel, segregacao rh/BR-RH-020';


--
-- Name: COLUMN employees.job_position_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.job_position_id IS 'RF-RH-025 - FK opcional para hr_job_positions.id - Employee.position (texto livre) permanece valido para registros nao migrados';


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: engineering_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engineering_projects (
    id integer NOT NULL,
    project_code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    project_type public.enum_engineering_projects_project_type DEFAULT 'new_product'::public.enum_engineering_projects_project_type NOT NULL,
    product_id integer,
    project_manager_id integer,
    start_date date,
    target_date date,
    completion_date date,
    budget numeric(15,2),
    actual_cost numeric(15,2) DEFAULT 0 NOT NULL,
    stage public.enum_engineering_projects_stage DEFAULT 'concept'::public.enum_engineering_projects_stage NOT NULL,
    status public.enum_engineering_projects_status DEFAULT 'active'::public.enum_engineering_projects_status NOT NULL,
    priority public.enum_engineering_projects_priority DEFAULT 'normal'::public.enum_engineering_projects_priority NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: engineering_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.engineering_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: engineering_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.engineering_projects_id_seq OWNED BY public.engineering_projects.id;


--
-- Name: entradas_nf; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entradas_nf (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fornecedor_id uuid,
    numero_nf character varying(80) NOT NULL,
    chave_acesso character varying(80),
    recebido_por integer,
    recebido_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE entradas_nf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entradas_nf IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN entradas_nf.recebido_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.entradas_nf.recebido_por IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela entradas_nf e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: entradas_nf_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entradas_nf_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entrada_nf_id uuid NOT NULL,
    item_id uuid NOT NULL,
    lote_id uuid,
    quantidade numeric(18,6) NOT NULL,
    custo_unitario numeric(18,6) DEFAULT 0 NOT NULL,
    CONSTRAINT ck_nf_items_quantidade CHECK ((quantidade > (0)::numeric))
);


--
-- Name: TABLE entradas_nf_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.entradas_nf_items IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: facility_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_areas (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    area_type public.enum_facility_areas_area_type NOT NULL,
    square_meters numeric(10,2),
    department_id integer,
    capacity_persons integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: facility_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_areas_id_seq OWNED BY public.facility_areas.id;


--
-- Name: facility_cleaning_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_cleaning_executions (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    executed_at timestamp with time zone NOT NULL,
    executed_by integer,
    ok boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: facility_cleaning_executions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_cleaning_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_cleaning_executions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_cleaning_executions_id_seq OWNED BY public.facility_cleaning_executions.id;


--
-- Name: facility_cleaning_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_cleaning_schedules (
    id integer NOT NULL,
    area character varying(100) NOT NULL,
    frequency public.enum_facility_cleaning_schedules_frequency NOT NULL,
    responsible_person character varying(100),
    last_cleaning date,
    next_cleaning date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    facility_area_id integer,
    responsible_employee_id integer,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: facility_cleaning_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_cleaning_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_cleaning_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_cleaning_schedules_id_seq OWNED BY public.facility_cleaning_schedules.id;


--
-- Name: facility_correspondence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_correspondence (
    id integer NOT NULL,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sender character varying(150),
    recipient_employee_id integer,
    recipient_department_id integer,
    type public.enum_facility_correspondence_type DEFAULT 'other'::public.enum_facility_correspondence_type NOT NULL,
    delivered_at timestamp with time zone,
    delivered_to character varying(150),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_correspondence_recipient_present CHECK (((recipient_employee_id IS NOT NULL) OR (recipient_department_id IS NOT NULL)))
);


--
-- Name: facility_correspondence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_correspondence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_correspondence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_correspondence_id_seq OWNED BY public.facility_correspondence.id;


--
-- Name: facility_drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_drivers (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    cnh_number character varying(20) NOT NULL,
    cnh_category character varying(5) NOT NULL,
    cnh_valid_until date NOT NULL,
    cnh_file_path character varying(500),
    authorized boolean DEFAULT false NOT NULL,
    authorized_by integer,
    authorized_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: facility_drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_drivers_id_seq OWNED BY public.facility_drivers.id;


--
-- Name: facility_fines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_fines (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    infraction_at timestamp with time zone NOT NULL,
    location character varying(200),
    infraction_code character varying(20),
    description text,
    amount numeric(10,2) NOT NULL,
    points smallint,
    notice_received_at date,
    indication_deadline date,
    identified_driver_id integer,
    indicated_at date,
    indication_status public.enum_facility_fines_indication_status DEFAULT 'pending'::public.enum_facility_fines_indication_status NOT NULL,
    charge_to_driver boolean DEFAULT false NOT NULL,
    financial_ref character varying(150),
    accounts_payable_id integer,
    status public.enum_facility_fines_status DEFAULT 'open'::public.enum_facility_fines_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_fines_amount_positive CHECK ((amount > (0)::numeric))
);


--
-- Name: facility_fines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_fines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_fines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_fines_id_seq OWNED BY public.facility_fines.id;


--
-- Name: facility_fuel_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_fuel_records (
    id integer NOT NULL,
    record_date timestamp with time zone NOT NULL,
    km_at_refuel integer,
    liters numeric(10,2) NOT NULL,
    price_per_liter numeric(10,2) NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    fuel_station character varying(100),
    driver_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    asset_id integer NOT NULL,
    full_tank boolean DEFAULT false NOT NULL,
    invoice_ref character varying(100),
    trip_id integer
);


--
-- Name: facility_fuel_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_fuel_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_fuel_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_fuel_records_id_seq OWNED BY public.facility_fuel_records.id;


--
-- Name: facility_resource_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_resource_reservations (
    id integer NOT NULL,
    resource_type public.enum_facility_resource_reservations_resource_type NOT NULL,
    facility_area_id integer,
    asset_id integer,
    reserved_by integer NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    subject character varying(200),
    status public.enum_facility_resource_reservations_status DEFAULT 'confirmed'::public.enum_facility_resource_reservations_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_resource_reservations_ends_after_starts CHECK ((ends_at > starts_at)),
    CONSTRAINT ck_facility_resource_reservations_resource_matches_type CHECK ((((resource_type = 'room'::public.enum_facility_resource_reservations_resource_type) AND (facility_area_id IS NOT NULL) AND (asset_id IS NULL)) OR ((resource_type = 'equipment'::public.enum_facility_resource_reservations_resource_type) AND (asset_id IS NOT NULL) AND (facility_area_id IS NULL))))
);


--
-- Name: facility_resource_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_resource_reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_resource_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_resource_reservations_id_seq OWNED BY public.facility_resource_reservations.id;


--
-- Name: facility_vehicle_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_vehicle_details (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    plate character varying(10) NOT NULL,
    renavam character varying(30),
    chassi character varying(50),
    color character varying(30),
    year integer,
    fuel_type public.enum_facility_vehicle_details_fuel_type,
    current_km integer DEFAULT 0 NOT NULL,
    tank_capacity_liters numeric(10,2),
    required_cnh_category character varying(5),
    last_oil_change date,
    next_oil_change_km integer,
    insurance_company character varying(100),
    insurance_policy character varying(50),
    insurance_expiry date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_vehicle_details_current_km_non_negative CHECK ((current_km >= 0)),
    CONSTRAINT ck_facility_vehicle_details_tank_capacity_positive CHECK (((tank_capacity_liters IS NULL) OR (tank_capacity_liters > (0)::numeric)))
);


--
-- Name: facility_vehicle_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_vehicle_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_vehicle_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_vehicle_details_id_seq OWNED BY public.facility_vehicle_details.id;


--
-- Name: facility_vehicle_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_vehicle_documents (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    doc_type public.enum_facility_vehicle_documents_doc_type NOT NULL,
    reference character varying(100),
    issuer character varying(150),
    valid_until date,
    cost numeric(10,2),
    file_path character varying(500),
    status public.enum_facility_vehicle_documents_status DEFAULT 'vigente'::public.enum_facility_vehicle_documents_status NOT NULL,
    released_by integer,
    released_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_vehicle_documents_valid_until_required CHECK (((doc_type = 'outro'::public.enum_facility_vehicle_documents_doc_type) OR (valid_until IS NOT NULL)))
);


--
-- Name: facility_vehicle_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_vehicle_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_vehicle_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_vehicle_documents_id_seq OWNED BY public.facility_vehicle_documents.id;


--
-- Name: facility_vehicle_trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_vehicle_trips (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    driver_id integer NOT NULL,
    requested_by integer,
    purpose public.enum_facility_vehicle_trips_purpose NOT NULL,
    destination character varying(200),
    departure_at timestamp with time zone,
    departure_km integer,
    return_at timestamp with time zone,
    return_km integer,
    fuel_level_out smallint,
    fuel_level_in smallint,
    incidents text,
    odometer_override_reason text,
    odometer_override_approved_by integer,
    odometer_override_approved_at timestamp with time zone,
    status public.enum_facility_vehicle_trips_status DEFAULT 'scheduled'::public.enum_facility_vehicle_trips_status NOT NULL,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_vehicle_trips_fuel_level_in_range CHECK (((fuel_level_in IS NULL) OR ((fuel_level_in >= 0) AND (fuel_level_in <= 100)))),
    CONSTRAINT ck_facility_vehicle_trips_fuel_level_out_range CHECK (((fuel_level_out IS NULL) OR ((fuel_level_out >= 0) AND (fuel_level_out <= 100)))),
    CONSTRAINT ck_facility_vehicle_trips_km_non_negative CHECK (((departure_km IS NULL) OR (departure_km >= 0))),
    CONSTRAINT ck_facility_vehicle_trips_return_ge_departure CHECK (((return_km IS NULL) OR (departure_km IS NULL) OR (return_km >= departure_km))),
    CONSTRAINT ck_facility_vehicle_trips_return_km_non_negative CHECK (((return_km IS NULL) OR (return_km >= 0)))
);


--
-- Name: facility_vehicle_trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_vehicle_trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_vehicle_trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_vehicle_trips_id_seq OWNED BY public.facility_vehicle_trips.id;


--
-- Name: facility_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_visitors (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    document character varying(30) NOT NULL,
    company character varying(150),
    phone character varying(20),
    photo_path character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: facility_visitors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_visitors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_visitors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_visitors_id_seq OWNED BY public.facility_visitors.id;


--
-- Name: facility_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_visits (
    id integer NOT NULL,
    visitor_id integer NOT NULL,
    host_employee_id integer NOT NULL,
    scheduled_at timestamp with time zone,
    checkin_at timestamp with time zone,
    checkout_at timestamp with time zone,
    badge_number character varying(20),
    purpose character varying(200),
    areas_authorized text,
    status public.enum_facility_visits_status DEFAULT 'scheduled'::public.enum_facility_visits_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_facility_visits_checkout_requires_checkin CHECK (((checkout_at IS NULL) OR (checkin_at IS NOT NULL)))
);


--
-- Name: facility_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facility_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facility_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facility_visits_id_seq OWNED BY public.facility_visits.id;


--
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fornecedores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    razao_social character varying(180) NOT NULL,
    cnpj character varying(20),
    email character varying(180),
    telefone character varying(40),
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE fornecedores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fornecedores IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: hr_absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_absences (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    type public.enum_hr_absences_type NOT NULL,
    start_date date NOT NULL,
    expected_end_date date,
    actual_end_date date,
    extended_program boolean DEFAULT false NOT NULL,
    cid character varying(10),
    document_id integer,
    s2230_confirmed_at timestamp with time zone,
    s2230_confirmed_by integer,
    accrual_period_impact_id integer,
    accrual_impact_days integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_absences_actual_end_after_start CHECK (((actual_end_date IS NULL) OR (actual_end_date >= start_date)))
);


--
-- Name: COLUMN hr_absences.cid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_absences.cid IS 'RNF-RH-01 - dado de saude (LGPD art. 5o II) - acesso reforcado (rota bloqueada), mais restrito que a segregacao padrao de campo do modulo rh';


--
-- Name: hr_absences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_absences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_absences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_absences_id_seq OWNED BY public.hr_absences.id;


--
-- Name: hr_admission_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_admission_processes (
    id integer NOT NULL,
    job_vacancy_id integer,
    candidate_id integer,
    candidate_name character varying(200) NOT NULL,
    candidate_cpf character varying(14),
    department_id integer NOT NULL,
    job_position_id integer,
    planned_start_date date NOT NULL,
    checklist_rg boolean DEFAULT false NOT NULL,
    checklist_cpf boolean DEFAULT false NOT NULL,
    checklist_ctps boolean DEFAULT false NOT NULL,
    checklist_pis boolean DEFAULT false NOT NULL,
    checklist_proof_of_address boolean DEFAULT false NOT NULL,
    checklist_photo boolean DEFAULT false NOT NULL,
    status public.enum_hr_admission_processes_status DEFAULT 'documentos_pendentes'::public.enum_hr_admission_processes_status NOT NULL,
    cancel_reason text,
    aso_requested_at timestamp with time zone,
    aso_confirmed_at timestamp with time zone,
    aso_result public.enum_hr_admission_processes_aso_result,
    aso_valid_until date,
    esocial_s2200_confirmed_at timestamp with time zone,
    esocial_s2200_confirmed_by integer,
    employee_id integer,
    contract_id integer,
    job_history_id integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN hr_admission_processes.esocial_s2200_confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_admission_processes.esocial_s2200_confirmed_at IS 'RF-RH-010 - enquanto NULL, a data de inicio efetiva do funcionario fica bloqueada para edicao livre (regra de aplicacao)';


--
-- Name: hr_admission_processes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_admission_processes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_admission_processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_admission_processes_id_seq OWNED BY public.hr_admission_processes.id;


--
-- Name: hr_benefit_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_benefit_types (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    category public.enum_hr_benefit_types_category NOT NULL,
    funding_rule public.enum_hr_benefit_types_funding_rule NOT NULL,
    supplier character varying(150),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_benefit_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_benefit_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_benefit_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_benefit_types_id_seq OWNED BY public.hr_benefit_types.id;


--
-- Name: hr_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_candidates (
    id integer NOT NULL,
    job_vacancy_id integer NOT NULL,
    name character varying(200) NOT NULL,
    contact character varying(255),
    resume_file_path character varying(255),
    stage public.enum_hr_candidates_stage DEFAULT 'triagem'::public.enum_hr_candidates_stage NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_candidates_id_seq OWNED BY public.hr_candidates.id;


--
-- Name: hr_employee_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_benefits (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    benefit_type_id integer NOT NULL,
    enrollment_status public.enum_hr_employee_benefits_enrollment_status DEFAULT 'ativo'::public.enum_hr_employee_benefits_enrollment_status NOT NULL,
    enrolled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    canceled_at timestamp with time zone,
    discount_value numeric(12,2),
    company_cost_value numeric(12,2),
    dependents jsonb,
    suspended_days integer DEFAULT 0 NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN hr_employee_benefits.discount_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_employee_benefits.discount_value IS 'Dado sensivel (financeiro individual) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';


--
-- Name: hr_employee_benefits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_benefits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_benefits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_benefits_id_seq OWNED BY public.hr_employee_benefits.id;


--
-- Name: hr_employee_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_contracts (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    type public.enum_hr_employee_contracts_type NOT NULL,
    start_date date NOT NULL,
    period_1_end_date date,
    period_2_end_date date,
    effective_end_date date,
    status public.enum_hr_employee_contracts_status DEFAULT 'ativo'::public.enum_hr_employee_contracts_status NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_employee_contracts_experiencia_90_dias CHECK (((type <> 'experiencia'::public.enum_hr_employee_contracts_type) OR (period_1_end_date IS NULL) OR ((COALESCE(period_2_end_date, period_1_end_date) - start_date) <= 90)))
);


--
-- Name: hr_employee_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_contracts_id_seq OWNED BY public.hr_employee_contracts.id;


--
-- Name: hr_employee_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_documents (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    doc_type public.enum_hr_employee_documents_doc_type NOT NULL,
    file_path character varying(255) NOT NULL,
    valid_until date,
    aptitude_result public.enum_hr_employee_documents_aptitude_result,
    origin public.enum_hr_employee_documents_origin DEFAULT 'rh'::public.enum_hr_employee_documents_origin NOT NULL,
    uploaded_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN hr_employee_documents.aptitude_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_employee_documents.aptitude_result IS 'RF-RH-028 - apenas para doc_type aso_* - somente aptidao/validade, nunca laudo clinico (LGPD art. 5o II)';


--
-- Name: hr_employee_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_documents_id_seq OWNED BY public.hr_employee_documents.id;


--
-- Name: hr_employee_job_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_job_history (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    job_position_id integer,
    department_id integer NOT NULL,
    salary numeric(12,2) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    reason public.enum_hr_employee_job_history_reason NOT NULL,
    pending_aso_risk_change boolean DEFAULT false NOT NULL,
    esocial_event_confirmed_at timestamp with time zone,
    esocial_event_confirmed_by integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN hr_employee_job_history.salary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_employee_job_history.salary IS 'Dado sensivel - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020, RF-RH-043)';


--
-- Name: hr_employee_job_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_job_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_job_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_job_history_id_seq OWNED BY public.hr_employee_job_history.id;


--
-- Name: hr_employee_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_employee_trainings (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    training_course_id integer NOT NULL,
    completed_at date NOT NULL,
    instructor_or_provider character varying(200),
    certificate_file_path character varying(255),
    valid_until date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_employee_trainings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_employee_trainings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_employee_trainings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_employee_trainings_id_seq OWNED BY public.hr_employee_trainings.id;


--
-- Name: hr_job_position_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_job_position_trainings (
    id integer NOT NULL,
    job_position_id integer NOT NULL,
    training_course_id integer NOT NULL,
    required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_job_position_trainings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_job_position_trainings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_job_position_trainings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_job_position_trainings_id_seq OWNED BY public.hr_job_position_trainings.id;


--
-- Name: hr_job_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_job_positions (
    id integer NOT NULL,
    department_id integer NOT NULL,
    name character varying(150) NOT NULL,
    cbo_code character varying(20),
    description text,
    salary_range_min numeric(12,2),
    salary_range_max numeric(12,2),
    requirements text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_job_positions_salary_range CHECK (((salary_range_min IS NULL) OR (salary_range_max IS NULL) OR (salary_range_min <= salary_range_max)))
);


--
-- Name: COLUMN hr_job_positions.salary_range_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_job_positions.salary_range_min IS 'Dado sensivel (faixa salarial) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';


--
-- Name: COLUMN hr_job_positions.salary_range_max; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_job_positions.salary_range_max IS 'Dado sensivel (faixa salarial) - segue segregacao de campo do modulo rh (RF-RH-006/BR-RH-020)';


--
-- Name: hr_job_positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_job_positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_job_positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_job_positions_id_seq OWNED BY public.hr_job_positions.id;


--
-- Name: hr_job_vacancies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_job_vacancies (
    id integer NOT NULL,
    job_position_id integer,
    department_id integer NOT NULL,
    status public.enum_hr_job_vacancies_status DEFAULT 'aberta'::public.enum_hr_job_vacancies_status NOT NULL,
    opened_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_job_vacancies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_job_vacancies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_job_vacancies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_job_vacancies_id_seq OWNED BY public.hr_job_vacancies.id;


--
-- Name: hr_payroll_import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_payroll_import_batches (
    id integer NOT NULL,
    competencia date NOT NULL,
    importado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    importado_por integer NOT NULL,
    fonte character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_payroll_import_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_payroll_import_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_payroll_import_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_payroll_import_batches_id_seq OWNED BY public.hr_payroll_import_batches.id;


--
-- Name: hr_payroll_import_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_payroll_import_items (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    employee_id integer NOT NULL,
    bruto numeric(12,2) NOT NULL,
    encargos numeric(12,2),
    liquido numeric(12,2) NOT NULL,
    custo_total numeric(12,2) NOT NULL,
    department_id integer,
    cost_center_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN hr_payroll_import_items.bruto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_payroll_import_items.bruto IS 'RF-RH-072 - dado financeiro individual de alta sensibilidade - exige modulo rh E nivel financeiro/admin (mais restrito que a segregacao padrao rh/RF-RH-006)';


--
-- Name: COLUMN hr_payroll_import_items.liquido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_payroll_import_items.liquido IS 'RF-RH-072 - dado financeiro individual de alta sensibilidade - exige modulo rh E nivel financeiro/admin (mais restrito que a segregacao padrao rh/RF-RH-006)';


--
-- Name: hr_payroll_import_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_payroll_import_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_payroll_import_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_payroll_import_items_id_seq OWNED BY public.hr_payroll_import_items.id;


--
-- Name: hr_performance_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_performance_reviews (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    period character varying(20) NOT NULL,
    reviewer_id integer NOT NULL,
    score numeric(4,2),
    notes text,
    status public.enum_hr_performance_reviews_status DEFAULT 'rascunho'::public.enum_hr_performance_reviews_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_performance_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_performance_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_performance_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_performance_reviews_id_seq OWNED BY public.hr_performance_reviews.id;


--
-- Name: hr_termination_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_termination_processes (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    termination_type public.enum_hr_termination_processes_termination_type NOT NULL,
    notice_date date NOT NULL,
    notice_modality public.enum_hr_termination_processes_notice_modality NOT NULL,
    termination_date date,
    trct_file_path character varying(255),
    trct_paid_at timestamp with time zone,
    s2299_confirmed_at timestamp with time zone,
    s2299_confirmed_by integer,
    aso_confirmed_at timestamp with time zone,
    aso_result public.enum_hr_termination_processes_aso_result,
    checklist_assets_returned boolean DEFAULT false NOT NULL,
    status public.enum_hr_termination_processes_status DEFAULT 'aberto'::public.enum_hr_termination_processes_status NOT NULL,
    cancel_reason text,
    concluded_by integer,
    concluded_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payment_deadline date GENERATED ALWAYS AS ((termination_date + 10)) STORED,
    CONSTRAINT ck_hr_termination_processes_concluido_requires_checklist CHECK (((status <> 'concluido'::public.enum_hr_termination_processes_status) OR (checklist_assets_returned = true)))
);


--
-- Name: COLUMN hr_termination_processes.payment_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hr_termination_processes.payment_deadline IS 'RF-RH-018 - gerado pelo banco: termination_date + 10 dias corridos (CLT art. 477 par. 6o)';


--
-- Name: hr_termination_processes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_termination_processes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_termination_processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_termination_processes_id_seq OWNED BY public.hr_termination_processes.id;


--
-- Name: hr_time_sheet_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_time_sheet_summaries (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    competencia date NOT NULL,
    horas_normais numeric(8,2) DEFAULT 0 NOT NULL,
    he_50 numeric(8,2) DEFAULT 0 NOT NULL,
    he_100 numeric(8,2) DEFAULT 0 NOT NULL,
    adicional_noturno_horas numeric(8,2) DEFAULT 0 NOT NULL,
    faltas_injustificadas integer DEFAULT 0 NOT NULL,
    atrasos_min integer DEFAULT 0 NOT NULL,
    saldo_banco_horas numeric(8,2) DEFAULT 0 NOT NULL,
    data_limite_compensacao_banco date,
    fonte public.enum_hr_time_sheet_summaries_fonte DEFAULT 'manual'::public.enum_hr_time_sheet_summaries_fonte NOT NULL,
    importado_em timestamp with time zone,
    importado_por integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: hr_time_sheet_summaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_time_sheet_summaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_time_sheet_summaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_time_sheet_summaries_id_seq OWNED BY public.hr_time_sheet_summaries.id;


--
-- Name: hr_training_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_training_courses (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    is_normative boolean DEFAULT false NOT NULL,
    nr_code character varying(20),
    validity_months integer,
    workload_hours numeric(6,2),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_training_courses_validity_months CHECK (((validity_months IS NULL) OR (validity_months > 0)))
);


--
-- Name: hr_training_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_training_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_training_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_training_courses_id_seq OWNED BY public.hr_training_courses.id;


--
-- Name: hr_vacation_accrual_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_vacation_accrual_periods (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    concessive_end date NOT NULL,
    unexcused_absences integer DEFAULT 0 NOT NULL,
    entitled_days integer DEFAULT 30 NOT NULL,
    days_taken integer DEFAULT 0 NOT NULL,
    status public.enum_hr_vacation_accrual_periods_status DEFAULT 'em_curso'::public.enum_hr_vacation_accrual_periods_status NOT NULL,
    zeroed_reason text,
    zeroed_from_period_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_vacation_accrual_periods_concessive_end CHECK ((concessive_end = ((period_end + '1 year'::interval))::date)),
    CONSTRAINT ck_hr_vacation_accrual_periods_entitled_days CHECK (((entitled_days >= 0) AND (entitled_days <= 30))),
    CONSTRAINT ck_hr_vacation_accrual_periods_period_end CHECK ((period_end = ((period_start + '1 year'::interval))::date))
);


--
-- Name: hr_vacation_accrual_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_vacation_accrual_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_vacation_accrual_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_vacation_accrual_periods_id_seq OWNED BY public.hr_vacation_accrual_periods.id;


--
-- Name: hr_vacation_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hr_vacation_schedules (
    id integer NOT NULL,
    accrual_period_id integer NOT NULL,
    fraction_number smallint NOT NULL,
    start_date date NOT NULL,
    days integer NOT NULL,
    abono boolean DEFAULT false NOT NULL,
    abono_days integer,
    abono_requested_at timestamp with time zone,
    notice_sent_at date,
    employee_agreement_confirmed boolean DEFAULT false NOT NULL,
    fractioning_justification text,
    status public.enum_hr_vacation_schedules_status DEFAULT 'planejado'::public.enum_hr_vacation_schedules_status NOT NULL,
    revision_reason text,
    superseded_by_id integer,
    financial_confirmed_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_hr_vacation_schedules_abono_days CHECK (((abono_days IS NULL) OR (abono_days > 0))),
    CONSTRAINT ck_hr_vacation_schedules_days_positive CHECK ((days > 0)),
    CONSTRAINT ck_hr_vacation_schedules_fraction_number CHECK (((fraction_number >= 1) AND (fraction_number <= 3)))
);


--
-- Name: hr_vacation_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hr_vacation_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hr_vacation_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hr_vacation_schedules_id_seq OWNED BY public.hr_vacation_schedules.id;


--
-- Name: import_process_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_process_approvals (
    id integer NOT NULL,
    import_process_id integer NOT NULL,
    approver_user_id integer NOT NULL,
    approver_role public.enum_import_process_approvals_approver_role NOT NULL,
    approved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE import_process_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.import_process_approvals IS 'G11-COMEX: aprovacoes da diretoria sobre processos de importacao. Exigidas para a transicao draft -> shipped (embarque), em qualquer valor.';


--
-- Name: COLUMN import_process_approvals.approver_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_approvals.approver_user_id IS 'G11-COMEX: usuario aprovador, SEMPRE vindo do JWT (req.user.id) — nunca aceito do body (anti-spoofing P0).';


--
-- Name: COLUMN import_process_approvals.approver_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_approvals.approver_role IS 'G11-COMEX: papel de alcada, SEMPRE resolvido pelo modulo de acesso do usuario logado (permissions.diretor) — nunca aceito do body.';


--
-- Name: import_process_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_process_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_process_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_process_approvals_id_seq OWNED BY public.import_process_approvals.id;


--
-- Name: import_process_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_process_items (
    id integer NOT NULL,
    import_process_id integer NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(18,6) NOT NULL,
    fob_unit_price numeric(18,6) NOT NULL,
    ii_rate numeric(7,4) DEFAULT 0 NOT NULL,
    ipi_rate numeric(7,4) DEFAULT 0 NOT NULL,
    pis_rate numeric(7,4) DEFAULT 0 NOT NULL,
    cofins_rate numeric(7,4) DEFAULT 0 NOT NULL,
    icms_rate numeric(7,4) DEFAULT 0 NOT NULL,
    customs_value numeric(18,6),
    ii_value numeric(18,6),
    ipi_value numeric(18,6),
    pis_value numeric(18,6),
    cofins_value numeric(18,6),
    icms_value numeric(18,6),
    nationalized_unit_cost numeric(18,6),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN import_process_items.fob_unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.fob_unit_price IS 'Preco unitario FOB, na moeda estrangeira (import_processes.fob_currency)';


--
-- Name: COLUMN import_process_items.ii_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.ii_rate IS 'Aliquota do Imposto de Importacao, percentual (ex.: 60.0000 = 60%), informada manualmente';


--
-- Name: COLUMN import_process_items.ipi_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.ipi_rate IS 'Aliquota do IPI, percentual, informada manualmente';


--
-- Name: COLUMN import_process_items.pis_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.pis_rate IS 'Aliquota do PIS-Importacao, percentual, informada manualmente';


--
-- Name: COLUMN import_process_items.cofins_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.cofins_rate IS 'Aliquota da COFINS-Importacao, percentual, informada manualmente';


--
-- Name: COLUMN import_process_items.icms_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.icms_rate IS 'Aliquota do ICMS, percentual, informada manualmente';


--
-- Name: COLUMN import_process_items.customs_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.customs_value IS 'Valor aduaneiro rateado deste item (FOB em BRL + frete + seguro rateados) — calculado';


--
-- Name: COLUMN import_process_items.ii_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.ii_value IS 'II calculado';


--
-- Name: COLUMN import_process_items.ipi_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.ipi_value IS 'IPI calculado';


--
-- Name: COLUMN import_process_items.pis_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.pis_value IS 'PIS-Importacao calculado';


--
-- Name: COLUMN import_process_items.cofins_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.cofins_value IS 'COFINS-Importacao calculado';


--
-- Name: COLUMN import_process_items.icms_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.icms_value IS 'ICMS calculado (formula "por dentro")';


--
-- Name: COLUMN import_process_items.nationalized_unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_process_items.nationalized_unit_cost IS 'Custo unitario nacionalizado final — usado na entrada de estoque';


--
-- Name: import_process_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_process_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_process_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_process_items_id_seq OWNED BY public.import_process_items.id;


--
-- Name: import_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_processes (
    id integer NOT NULL,
    process_number character varying(60) NOT NULL,
    supplier_id integer NOT NULL,
    status public.enum_import_processes_status DEFAULT 'draft'::public.enum_import_processes_status NOT NULL,
    fob_currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    freight_value numeric(18,6) DEFAULT 0 NOT NULL,
    insurance_value numeric(18,6) DEFAULT 0 NOT NULL,
    other_expenses_value numeric(18,6) DEFAULT 0 NOT NULL,
    shipped_at date,
    arrived_at date,
    customs_cleared_at date,
    received_at date,
    notes text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN import_processes.process_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.process_number IS 'Numero do processo de importacao, formato IMP-<ano>-XXXX';


--
-- Name: COLUMN import_processes.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.supplier_id IS 'Fornecedor internacional (reutiliza o cadastro de suppliers — sem campo dedicado de fornecedor estrangeiro, ver decisao no handoff)';


--
-- Name: COLUMN import_processes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.status IS 'draft=registrado, shipped=embarque, arrived=chegada, customs_cleared=desembaracado, received=entrada em estoque, cancelled=cancelado';


--
-- Name: COLUMN import_processes.fob_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.fob_currency IS 'Codigo ISO da moeda do valor FOB (ex.: USD, EUR)';


--
-- Name: COLUMN import_processes.exchange_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.exchange_rate IS 'Cotacao (moeda estrangeira -> BRL) usada para converter o FOB';


--
-- Name: COLUMN import_processes.freight_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.freight_value IS 'Frete internacional em BRL, rateado entre os itens pro-rata do FOB';


--
-- Name: COLUMN import_processes.insurance_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.insurance_value IS 'Seguro internacional em BRL, rateado entre os itens pro-rata do FOB';


--
-- Name: COLUMN import_processes.other_expenses_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.other_expenses_value IS 'Despesas aduaneiras adicionais (armazenagem, capatazia, etc.) em BRL, rateadas pro-rata do FOB';


--
-- Name: COLUMN import_processes.shipped_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.shipped_at IS 'Data de embarque';


--
-- Name: COLUMN import_processes.arrived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.arrived_at IS 'Data de chegada';


--
-- Name: COLUMN import_processes.customs_cleared_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.customs_cleared_at IS 'Data de desembaraco aduaneiro';


--
-- Name: COLUMN import_processes.received_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.import_processes.received_at IS 'Data de entrada em estoque (nacionalizacao concluida)';


--
-- Name: import_processes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_processes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_processes_id_seq OWNED BY public.import_processes.id;


--
-- Name: inventory_count_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_count_items (
    id integer NOT NULL,
    inventory_count_id integer NOT NULL,
    product_id integer,
    item_id uuid,
    system_quantity numeric(12,3) DEFAULT 0 NOT NULL,
    counted_quantity numeric(12,3),
    variance_quantity numeric(12,3),
    status public.enum_inventory_count_items_status DEFAULT 'pending'::public.enum_inventory_count_items_status NOT NULL,
    counted_by integer,
    counted_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT chk_inventory_count_items_product_or_item CHECK (((product_id IS NOT NULL) OR (item_id IS NOT NULL)))
);


--
-- Name: COLUMN inventory_count_items.inventory_count_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.inventory_count_id IS 'FK → inventory_counts.id';


--
-- Name: COLUMN inventory_count_items.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.product_id IS 'FK -> products.id (LEGADO, dual-read com item_id — um dos dois deve estar preenchido)';


--
-- Name: COLUMN inventory_count_items.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.item_id IS 'FK → items.id (NOVO, parallel to product_id)';


--
-- Name: COLUMN inventory_count_items.system_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.system_quantity IS 'Quantidade em sistema no momento em que o item entrou na contagem';


--
-- Name: COLUMN inventory_count_items.counted_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.counted_quantity IS 'Quantidade contada fisicamente';


--
-- Name: COLUMN inventory_count_items.variance_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.variance_quantity IS 'counted_quantity - system_quantity';


--
-- Name: COLUMN inventory_count_items.counted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.counted_by IS 'FK → users.id (quem contou o item)';


--
-- Name: COLUMN inventory_count_items.counted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_count_items.counted_at IS 'Data/hora do registro da contagem do item';


--
-- Name: inventory_count_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_count_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_count_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_count_items_id_seq OWNED BY public.inventory_count_items.id;


--
-- Name: inventory_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_counts (
    id integer NOT NULL,
    count_number character varying(30) NOT NULL,
    status public.enum_inventory_counts_status DEFAULT 'draft'::public.enum_inventory_counts_status NOT NULL,
    count_type public.enum_inventory_counts_count_type DEFAULT 'cycle'::public.enum_inventory_counts_count_type NOT NULL,
    location character varying(100),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    approved_at timestamp with time zone,
    created_by integer NOT NULL,
    approved_by integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    warehouse_id integer,
    assigned_to integer,
    department_id integer
);


--
-- Name: COLUMN inventory_counts.count_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.count_number IS 'Nº da contagem de inventário';


--
-- Name: COLUMN inventory_counts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.status IS 'Workflow: draft -> counting -> pending_approval -> approved -> adjusted (ou rejected)';


--
-- Name: COLUMN inventory_counts.count_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.count_type IS 'cycle=inventário cíclico, full=inventário geral, spot=contagem pontual';


--
-- Name: COLUMN inventory_counts.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.location IS 'Local/área física contada (opcional)';


--
-- Name: COLUMN inventory_counts.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.started_at IS 'Data/hora de início da contagem';


--
-- Name: COLUMN inventory_counts.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.completed_at IS 'Data/hora de envio para aprovação';


--
-- Name: COLUMN inventory_counts.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.approved_at IS 'Data/hora da aprovação (ou rejeição)';


--
-- Name: COLUMN inventory_counts.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.created_by IS 'FK → users.id (quem criou a contagem)';


--
-- Name: COLUMN inventory_counts.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.approved_by IS 'FK → users.id (quem aprovou/rejeitou)';


--
-- Name: COLUMN inventory_counts.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.warehouse_id IS 'FK -> warehouses.id. Deposito ao qual TODA a contagem pertence (nullable apenas por legado pre-Bloco 4; use case de criacao deve exigir o campo em contagens novas).';


--
-- Name: COLUMN inventory_counts.assigned_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.assigned_to IS 'FK -> users.id. Funcionário responsável pela contagem (NULL = pool, disponível para qualquer funcionário autorizado pegar via claim atômico em POST /:id/start).';


--
-- Name: COLUMN inventory_counts.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_counts.department_id IS 'FK -> departments.id. Departamento dono da contagem para agregacao no painel de TV (nullable; historico legado fica NULL/"Sem departamento" por design, ver migration).';


--
-- Name: inventory_counts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_counts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_counts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_counts_id_seq OWNED BY public.inventory_counts.id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    user_id integer NOT NULL,
    type public.enum_inventory_movements_type NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit_cost numeric(10,2) DEFAULT 0 NOT NULL,
    description text NOT NULL,
    reference_id integer,
    reference_type public.enum_inventory_movements_reference_type NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    warehouse_id integer
);


--
-- Name: COLUMN inventory_movements.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.product_id IS 'FK → products.id (LEGADO)';


--
-- Name: COLUMN inventory_movements.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.item_id IS 'FK → items.id (NOVO, parallel to product_id)';


--
-- Name: COLUMN inventory_movements.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.user_id IS 'FK → users.id (responsável)';


--
-- Name: COLUMN inventory_movements.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.type IS 'Tipo: in=entrada, out=saída, adjustment=ajuste';


--
-- Name: COLUMN inventory_movements.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.quantity IS 'Quantidade movimentada';


--
-- Name: COLUMN inventory_movements.unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.unit_cost IS 'Custo unitário no momento';


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_movements_id_seq OWNED BY public.inventory_movements.id;


--
-- Name: it_access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_access_requests (
    id integer NOT NULL,
    request_number character varying(30) NOT NULL,
    type public.enum_it_access_requests_type NOT NULL,
    employee_id integer NOT NULL,
    requested_by integer NOT NULL,
    department_id integer NOT NULL,
    requested_profile_id integer,
    justification text,
    corporate_email character varying(150),
    equipment_needed jsonb,
    approved_by integer,
    approved_at timestamp with time zone,
    executed_by integer,
    executed_at timestamp with time zone,
    execution_notes text,
    status public.enum_it_access_requests_status DEFAULT 'pending'::public.enum_it_access_requests_status NOT NULL,
    rejection_reason text,
    checklist jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN it_access_requests.requested_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_access_requests.requested_by IS 'Sempre do JWT (padrao anti-spoofing do projeto, aplicado por analogia a BR-TI-002)';


--
-- Name: COLUMN it_access_requests.corporate_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_access_requests.corporate_email IS 'E-mail corporativo a provisionar/já provisionado (grant/change) — RF-TI-031';


--
-- Name: COLUMN it_access_requests.equipment_needed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_access_requests.equipment_needed IS 'Lista livre de equipamentos necessários informados na abertura (ex.: ["notebook","headset"]); a entrega real vira ItResponsibilityTerm via UC-50 — RF-TI-031';


--
-- Name: COLUMN it_access_requests.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_access_requests.approved_by IS 'Sempre do JWT de quem aprova. Elegibilidade (ti:approve OU gestor do department_id via departments.manager_id) e checada em app — ver nota de cabecalho §5.2';


--
-- Name: COLUMN it_access_requests.checklist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_access_requests.checklist IS 'Estrutura livre para offboarding (usuario desativado, e-mail revogado, equipamentos recolhidos, arquivos transferidos) — RF-TI-033';


--
-- Name: it_access_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_access_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_access_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_access_requests_id_seq OWNED BY public.it_access_requests.id;


--
-- Name: it_backup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_backup_logs (
    id integer NOT NULL,
    executed_at timestamp with time zone NOT NULL,
    backup_type public.enum_it_backup_logs_backup_type NOT NULL,
    target character varying(50) NOT NULL,
    destination character varying(255),
    size_bytes bigint,
    success boolean NOT NULL,
    error_message text,
    generated_ticket_id integer,
    verified_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN it_backup_logs.target; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_backup_logs.target IS 'Escopo do backup (ex.: database, uploads) — texto livre curto, sem tabela normalizada dedicada (baixa cardinalidade)';


--
-- Name: COLUMN it_backup_logs.generated_ticket_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_backup_logs.generated_ticket_id IS 'Chamado urgent aberto automaticamente quando success=false (RF-TI-040)';


--
-- Name: COLUMN it_backup_logs.verified_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_backup_logs.verified_by IS 'Preenchido em teste de restore verificado manualmente (RF-TI-042)';


--
-- Name: it_backup_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_backup_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_backup_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_backup_logs_id_seq OWNED BY public.it_backup_logs.id;


--
-- Name: it_license_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_license_seats (
    id integer NOT NULL,
    license_detail_id integer NOT NULL,
    employee_id integer NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: it_license_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_license_seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_license_seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_license_seats_id_seq OWNED BY public.it_license_seats.id;


--
-- Name: it_responsibility_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_responsibility_terms (
    id integer NOT NULL,
    term_number character varying(30) NOT NULL,
    asset_id integer NOT NULL,
    employee_id integer NOT NULL,
    delivered_at timestamp with time zone NOT NULL,
    delivered_by integer NOT NULL,
    condition_on_delivery text,
    accessories text,
    acceptance_type public.enum_it_responsibility_terms_acceptance_type NOT NULL,
    signed_document_path character varying(500),
    returned_at timestamp with time zone,
    received_by integer,
    condition_on_return public.enum_it_responsibility_terms_condition_on_return,
    return_notes text,
    lost_justification text,
    related_ticket_id integer,
    related_maintenance_order_id integer,
    status public.enum_it_responsibility_terms_status DEFAULT 'active'::public.enum_it_responsibility_terms_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN it_responsibility_terms.signed_document_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_responsibility_terms.signed_document_path IS 'Upload do termo assinado (infra Multer existente, CLAUDE.md §2). Validade juridica do digital_ack sem upload e parametro de aplicacao (RF-TI-046 item 2), nao trava de schema.';


--
-- Name: COLUMN it_responsibility_terms.lost_justification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_responsibility_terms.lost_justification IS 'Obrigatoria em app quando status=lost (extravio sem devolucao fisica possivel, UC-50 A2)';


--
-- Name: COLUMN it_responsibility_terms.related_ticket_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_responsibility_terms.related_ticket_id IS 'Chamado aberto quando devolucao e damaged (RF-TI-021)';


--
-- Name: COLUMN it_responsibility_terms.related_maintenance_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_responsibility_terms.related_maintenance_order_id IS 'Alternativa a related_ticket_id quando a devolucao damaged vai direto para manutencao (RF-TI-021)';


--
-- Name: it_responsibility_terms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_responsibility_terms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_responsibility_terms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_responsibility_terms_id_seq OWNED BY public.it_responsibility_terms.id;


--
-- Name: it_software_license_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_software_license_details (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    license_type public.enum_it_software_license_details_license_type NOT NULL,
    vendor character varying(150),
    seats integer DEFAULT 1 NOT NULL,
    license_key character varying(500),
    cost numeric(18,6),
    billing_cycle public.enum_it_software_license_details_billing_cycle DEFAULT 'one_time'::public.enum_it_software_license_details_billing_cycle NOT NULL,
    renewal_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_it_software_license_details_seats_positive CHECK ((seats > 0))
);


--
-- Name: COLUMN it_software_license_details.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_software_license_details.asset_id IS 'FK 1:1 -> assets.id (esperado asset_type=license, validado em app, BR-TI-008)';


--
-- Name: COLUMN it_software_license_details.license_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_software_license_details.license_key IS 'Acesso restrito (modulo ti ou role=admin) e mascarado nas demais consultas — BR-TI-014/RNF-TI-01. Controle 100% de aplicacao, ver nota de cabecalho.';


--
-- Name: COLUMN it_software_license_details.renewal_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_software_license_details.renewal_date IS 'Data da ultima acao de renovacao — distinta de assets.license_expires_at (data canonica de vencimento, RF-TI-024)';


--
-- Name: it_software_license_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_software_license_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_software_license_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_software_license_details_id_seq OWNED BY public.it_software_license_details.id;


--
-- Name: it_ticket_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_ticket_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    default_priority public.enum_it_ticket_categories_default_priority DEFAULT 'medium'::public.enum_it_ticket_categories_default_priority NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN it_ticket_categories.default_priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_ticket_categories.default_priority IS 'Prioridade sugerida ao abrir chamado nesta categoria (RF-TI-001); o analista pode ajustar na triagem (RF-TI-004)';


--
-- Name: it_ticket_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_ticket_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_ticket_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_ticket_categories_id_seq OWNED BY public.it_ticket_categories.id;


--
-- Name: it_ticket_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_ticket_comments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    author_id integer NOT NULL,
    body text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN it_ticket_comments.is_internal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_ticket_comments.is_internal IS 'true = nota visivel apenas para modulo ti (RF-TI-014) — enforcement de leitura na aplicacao';


--
-- Name: it_ticket_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_ticket_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_ticket_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_ticket_comments_id_seq OWNED BY public.it_ticket_comments.id;


--
-- Name: it_ticket_priority_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_ticket_priority_history (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    changed_by integer NOT NULL,
    previous_priority public.enum_it_ticket_priority_history_previous_priority NOT NULL,
    new_priority public.enum_it_ticket_priority_history_new_priority NOT NULL,
    reason text,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: it_ticket_priority_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_ticket_priority_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_ticket_priority_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_ticket_priority_history_id_seq OWNED BY public.it_ticket_priority_history.id;


--
-- Name: it_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.it_tickets (
    id integer NOT NULL,
    ticket_number character varying(20) NOT NULL,
    requester_id integer,
    system_generated boolean DEFAULT false NOT NULL,
    opened_on_behalf_of integer,
    category_id integer NOT NULL,
    priority public.enum_it_tickets_priority NOT NULL,
    impact smallint,
    urgency smallint,
    subject character varying(200) NOT NULL,
    description text,
    asset_id integer,
    assigned_to integer,
    status public.enum_it_tickets_status DEFAULT 'open'::public.enum_it_tickets_status NOT NULL,
    solution text,
    maintenance_order_id integer,
    access_request_id integer,
    first_response_at timestamp with time zone,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    sla_response_due_at timestamp with time zone,
    sla_resolution_due_at timestamp with time zone,
    waiting_minutes integer DEFAULT 0 NOT NULL,
    satisfaction_rating smallint,
    satisfaction_comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_it_tickets_impact_range CHECK (((impact IS NULL) OR ((impact >= 1) AND (impact <= 3)))),
    CONSTRAINT ck_it_tickets_requester_or_system CHECK (((requester_id IS NOT NULL) OR (system_generated = true))),
    CONSTRAINT ck_it_tickets_satisfaction_range CHECK (((satisfaction_rating IS NULL) OR ((satisfaction_rating >= 1) AND (satisfaction_rating <= 5)))),
    CONSTRAINT ck_it_tickets_solution_when_resolved CHECK (((status <> ALL (ARRAY['resolved'::public.enum_it_tickets_status, 'closed'::public.enum_it_tickets_status])) OR (solution IS NOT NULL))),
    CONSTRAINT ck_it_tickets_urgency_range CHECK (((urgency IS NULL) OR ((urgency >= 1) AND (urgency <= 3)))),
    CONSTRAINT ck_it_tickets_waiting_minutes_non_negative CHECK ((waiting_minutes >= 0))
);


--
-- Name: COLUMN it_tickets.ticket_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.ticket_number IS 'Numero legivel gerado pela aplicacao (ex.: TI-2026-0001), nao pelo banco';


--
-- Name: COLUMN it_tickets.requester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.requester_id IS 'Populado a partir do JWT pela aplicacao (BR-TI-002) — nunca aceito do payload. NULL apenas quando system_generated=true (RF-TI-040, chamado automatico de falha de backup).';


--
-- Name: COLUMN it_tickets.system_generated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.system_generated IS 'true quando o chamado foi criado automaticamente pelo sistema (ex.: falha de it_backup_logs, RF-TI-040), sem requester_id humano';


--
-- Name: COLUMN it_tickets.opened_on_behalf_of; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.opened_on_behalf_of IS 'Preenchido apenas quando o analista (modulo ti:operate) abre em nome de terceiro por telefone/presencial (RF-TI-003)';


--
-- Name: COLUMN it_tickets.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.priority IS 'Derivada de impact x urgency na abertura (herdada da categoria) e editavel pelo analista na triagem (RF-TI-004/005)';


--
-- Name: COLUMN it_tickets.impact; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.impact IS '1-3, opcional — usado para justificar a prioridade (matriz 3x3)';


--
-- Name: COLUMN it_tickets.urgency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.urgency IS '1-3, opcional — usado para justificar a prioridade (matriz 3x3)';


--
-- Name: COLUMN it_tickets.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.asset_id IS 'Equipamento afetado, opcional — busca por tag/QR do patrimonio (BR-TI-008, sem cadastro paralelo)';


--
-- Name: COLUMN it_tickets.assigned_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.assigned_to IS 'Analista de TI ou suporte terceirizado que assumiu o chamado';


--
-- Name: COLUMN it_tickets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.status IS 'Transicoes validas em BR-TI-003 — enforcement de aplicacao, nao de banco (sem trigger de maquina de estados neste bloco)';


--
-- Name: COLUMN it_tickets.solution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.solution IS 'Obrigatoria para status=resolved (BR-TI-004) — validacao de aplicacao, nao CHECK de banco (permite rascunho antes de resolver)';


--
-- Name: COLUMN it_tickets.maintenance_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.maintenance_order_id IS 'Preenchido quando o problema de equipamento exige intervencao fisica (RF-TI-007/BR-TI-009) — nao duplica o fluxo de manutencao';


--
-- Name: COLUMN it_tickets.access_request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.access_request_id IS 'FK fechada em 20260807-000154-create-it-access-requests.cjs (it_access_requests ainda nao existe nesta migration)';


--
-- Name: COLUMN it_tickets.sla_response_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.sla_response_due_at IS 'Calculado na abertura a partir da tabela de SLA por prioridade (parametrizavel em app, RF-TI-009/046)';


--
-- Name: COLUMN it_tickets.sla_resolution_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.sla_resolution_due_at IS 'Calculado na abertura; status=waiting pausa o cronometro (acumula waiting_minutes) — logica de aplicacao';


--
-- Name: COLUMN it_tickets.waiting_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.waiting_minutes IS 'Acumulado de tempo em status=waiting (pausa do SLA de resolucao, BR-TI-005)';


--
-- Name: COLUMN it_tickets.satisfaction_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.it_tickets.satisfaction_rating IS '1-5, opcional, preenchido na confirmacao de fechamento (RF-TI-012)';


--
-- Name: it_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.it_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: it_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.it_tickets_id_seq OWNED BY public.it_tickets.id;


--
-- Name: item_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    descricao character varying(240) NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_detalhes_comerciais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_detalhes_comerciais (
    item_id uuid NOT NULL,
    preco_venda numeric(14,2) DEFAULT 0 NOT NULL,
    categoria_id uuid,
    ncm character varying(10) DEFAULT '85182100'::character varying NOT NULL,
    cest character varying(10),
    peso_kg numeric(10,3) DEFAULT 0 NOT NULL,
    localizacao_estoque character varying(100),
    numero_desenho character varying(50),
    revisao_tecnica character varying(10) DEFAULT '00'::character varying NOT NULL,
    lote_rastreabilidade character varying(50),
    numero_serie character varying(80),
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_especificacoes_tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_especificacoes_tecnicas (
    item_id uuid NOT NULL,
    familia_tecnica character varying(40) NOT NULL,
    atributos jsonb DEFAULT '{}'::jsonb NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: item_estruturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_estruturas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_pai_id uuid NOT NULL,
    item_componente_id uuid NOT NULL,
    quantidade numeric(18,6) NOT NULL,
    perda_percentual numeric(9,6) DEFAULT 0 NOT NULL,
    nivel integer DEFAULT 1 NOT NULL,
    sequencia integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    revisao character varying(20) DEFAULT '00'::character varying NOT NULL,
    observacoes text,
    criado_por integer,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    status public.item_estrutura_status DEFAULT 'active'::public.item_estrutura_status NOT NULL,
    approved_by integer,
    approval_date date,
    unit_cost numeric(18,6) DEFAULT 0 NOT NULL,
    total_cost numeric(18,6) DEFAULT 0 NOT NULL,
    parent_item_estrutura_id uuid,
    component_type public.item_estrutura_component_type DEFAULT 'component'::public.item_estrutura_component_type NOT NULL,
    is_critical boolean DEFAULT false NOT NULL,
    alternative_product_id uuid,
    CONSTRAINT ck_item_estruturas_quantidade CHECK (((quantidade > (0)::numeric) AND (perda_percentual >= (0)::numeric))),
    CONSTRAINT ck_item_estruturas_sem_auto_referencia CHECK ((item_pai_id <> item_componente_id))
);


--
-- Name: TABLE item_estruturas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.item_estruturas IS 'LEGADO CONGELADO (G1, 2026-08-10). Era a segunda arvore de produto do ERP (mestre items/UUID) e alimentava o MRP em paralelo a bill_of_materials, que a producao consome e custeia. Desde o G1 NINGUEM le esta tabela: MRP e explosao de item leem a BOM ativa projetada (services/bomStructureProjection), e a escrita esta bloqueada (regra G1-ESTRUTURA-DUPLA em CreateItemStructureUseCase). Nao inserir. Remocao prevista para a fase de contracao do schema, junto com as tabelas orfas do schema PT — ver docs/database/DATABASE.md.';


--
-- Name: item_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_suppliers (
    id integer NOT NULL,
    item_id uuid NOT NULL,
    supplier_id integer NOT NULL,
    unit_price numeric(18,6),
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    lead_time_days integer,
    moq numeric(18,6),
    supplier_item_code character varying(80),
    preferred boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: item_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_suppliers_id_seq OWNED BY public.item_suppliers.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(80) NOT NULL,
    descricao character varying(240) NOT NULL,
    tipo public.item_tipo NOT NULL,
    unidade character varying(12) NOT NULL,
    status public.item_status DEFAULT 'ATIVO'::public.item_status NOT NULL,
    estoque_atual numeric(18,6) DEFAULT 0 NOT NULL,
    estoque_reservado numeric(18,6) DEFAULT 0 NOT NULL,
    estoque_seguranca numeric(18,6) DEFAULT 0 NOT NULL,
    lote_minimo numeric(18,6) DEFAULT 0 NOT NULL,
    lead_time_dias integer DEFAULT 0 NOT NULL,
    custo_padrao numeric(18,6) DEFAULT 0 NOT NULL,
    fornecedor_padrao_id integer,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    conversao_automatica boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_items_quantidades CHECK (((estoque_atual >= (0)::numeric) AND (estoque_reservado >= (0)::numeric) AND (estoque_seguranca >= (0)::numeric) AND (lote_minimo >= (0)::numeric) AND (lead_time_dias >= 0)))
);


--
-- Name: COLUMN items.fornecedor_padrao_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.fornecedor_padrao_id IS 'FK -> suppliers.id (INTEGER). Corrigido em 20260806-000040 (era uuid -> fornecedores, tabela orfa dual-schema).';


--
-- Name: COLUMN items.conversao_automatica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.items.conversao_automatica IS 'Opt-in por item: quando true, ordens planejadas RASCUNHO deste item viram Requisicao de Compra automaticamente ao rodar o MRP (origin=mrp_auto), sem intervencao do planejador. Default false preserva o fluxo manual existente.';


--
-- Name: jur_contract_addendums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_contract_addendums (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    addendum_number integer NOT NULL,
    addendum_type public.enum_jur_contract_addendums_addendum_type NOT NULL,
    description text NOT NULL,
    previous_end_date date,
    new_end_date date,
    previous_value numeric(18,6),
    new_value numeric(18,6),
    document_url character varying(255),
    signed_at date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_contract_addendums.addendum_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_addendums.addendum_number IS 'Sequencial unico no par (contract_id, addendum_number)';


--
-- Name: COLUMN jur_contract_addendums.previous_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_addendums.previous_end_date IS 'Snapshot do valor vigente antes deste aditivo';


--
-- Name: jur_contract_addendums_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_contract_addendums_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_contract_addendums_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_contract_addendums_id_seq OWNED BY public.jur_contract_addendums.id;


--
-- Name: jur_contract_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_contract_approvals (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    approver_user_id integer NOT NULL,
    approver_role public.enum_jur_contract_approvals_approver_role NOT NULL,
    approved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: jur_contract_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_contract_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_contract_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_contract_approvals_id_seq OWNED BY public.jur_contract_approvals.id;


--
-- Name: jur_contract_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_contract_documents (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    version_number integer NOT NULL,
    file_url character varying(255) NOT NULL,
    author_id integer NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observations text,
    is_signed_version boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_contract_documents.version_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_documents.version_number IS 'Sequencia v1, v2... por contrato';


--
-- Name: jur_contract_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_contract_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_contract_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_contract_documents_id_seq OWNED BY public.jur_contract_documents.id;


--
-- Name: jur_contract_signatories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_contract_signatories (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    signatory_role public.enum_jur_contract_signatories_signatory_role NOT NULL,
    name character varying(200) NOT NULL,
    document character varying(20),
    employee_id integer,
    signed_at date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_contract_signatories.signatory_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_signatories.signatory_role IS 'party_a/party_b = partes (minimo 2 exigidas em aplicacao antes de signed/active — BR-JUR-004); witness = testemunha opcional recomendada';


--
-- Name: COLUMN jur_contract_signatories.document; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_signatories.document IS 'CPF/CNPJ';


--
-- Name: COLUMN jur_contract_signatories.employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contract_signatories.employee_id IS 'Vinculo opcional quando o signatario e funcionario interno';


--
-- Name: jur_contract_signatories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_contract_signatories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_contract_signatories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_contract_signatories_id_seq OWNED BY public.jur_contract_signatories.id;


--
-- Name: jur_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_contracts (
    id integer NOT NULL,
    contract_number character varying(20) NOT NULL,
    contract_type public.enum_jur_contracts_contract_type NOT NULL,
    object text NOT NULL,
    counterparty_type public.enum_jur_contracts_counterparty_type NOT NULL,
    supplier_id integer,
    client_id integer,
    employee_id integer,
    counterparty_name character varying(200),
    counterparty_doc character varying(20),
    value numeric(18,6),
    currency character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    start_date date,
    end_date date,
    renewal_auto boolean DEFAULT false NOT NULL,
    notice_days integer,
    adjustment_index public.enum_jur_contracts_adjustment_index DEFAULT 'none'::public.enum_jur_contracts_adjustment_index NOT NULL,
    adjustment_base_date date,
    alert_advance_days integer DEFAULT 60 NOT NULL,
    clause_checklist jsonb,
    status public.enum_jur_contracts_status DEFAULT 'draft'::public.enum_jur_contracts_status NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    signed_at date,
    responsible_user_id integer,
    termination_reason text,
    termination_date date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_contracts_active_requires_responsible CHECK (((status <> 'active'::public.enum_jur_contracts_status) OR (responsible_user_id IS NOT NULL))),
    CONSTRAINT ck_jur_contracts_alert_advance_days_non_negative CHECK ((alert_advance_days >= 0)),
    CONSTRAINT ck_jur_contracts_counterparty_exclusive CHECK ((((counterparty_type = 'supplier'::public.enum_jur_contracts_counterparty_type) AND (supplier_id IS NOT NULL) AND (client_id IS NULL) AND (employee_id IS NULL) AND (counterparty_name IS NULL) AND (counterparty_doc IS NULL)) OR ((counterparty_type = 'client'::public.enum_jur_contracts_counterparty_type) AND (client_id IS NOT NULL) AND (supplier_id IS NULL) AND (employee_id IS NULL) AND (counterparty_name IS NULL) AND (counterparty_doc IS NULL)) OR ((counterparty_type = 'employee'::public.enum_jur_contracts_counterparty_type) AND (employee_id IS NOT NULL) AND (supplier_id IS NULL) AND (client_id IS NULL) AND (counterparty_name IS NULL) AND (counterparty_doc IS NULL)) OR ((counterparty_type = 'other'::public.enum_jur_contracts_counterparty_type) AND (supplier_id IS NULL) AND (client_id IS NULL) AND (employee_id IS NULL) AND (counterparty_name IS NOT NULL) AND (counterparty_doc IS NOT NULL)))),
    CONSTRAINT ck_jur_contracts_notice_days_non_negative CHECK (((notice_days IS NULL) OR (notice_days >= 0))),
    CONSTRAINT ck_jur_contracts_terminated_requires_reason CHECK (((status <> 'terminated'::public.enum_jur_contracts_status) OR ((termination_reason IS NOT NULL) AND (termination_date IS NOT NULL)))),
    CONSTRAINT ck_jur_contracts_value_non_negative CHECK (((value IS NULL) OR (value >= (0)::numeric)))
);


--
-- Name: COLUMN jur_contracts.contract_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.contract_number IS 'Gerado pela aplicacao no formato CT-AAAA-NNNN (RF-JUR-001), nao pelo banco';


--
-- Name: COLUMN jur_contracts.object; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.object IS 'Objeto do contrato';


--
-- Name: COLUMN jur_contracts.counterparty_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.counterparty_name IS 'Contraparte avulsa, sem cadastro no ERP — exigido quando counterparty_type=other';


--
-- Name: COLUMN jur_contracts.counterparty_doc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.counterparty_doc IS 'CPF/CNPJ da contraparte avulsa';


--
-- Name: COLUMN jur_contracts.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.end_date IS 'NULL = vigencia indeterminada';


--
-- Name: COLUMN jur_contracts.notice_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.notice_days IS 'Janela de denuncia para nao-renovacao automatica (RF-JUR-006)';


--
-- Name: COLUMN jur_contracts.adjustment_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.adjustment_index IS 'Indice de reajuste (RF-JUR-007) — calculo do novo valor permanece manual';


--
-- Name: COLUMN jur_contracts.alert_advance_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.alert_advance_days IS 'Antecedencia do alerta de vencimento (RF-JUR-005), configuravel por contrato';


--
-- Name: COLUMN jur_contracts.clause_checklist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.clause_checklist IS 'Checklist PI/confidencialidade/nao-concorrencia (RF-JUR-010) para employment/supplier/nda. Estrutura livre: {pi, confidentiality, non_compete} in (yes|no|not_applicable)';


--
-- Name: COLUMN jur_contracts.responsible_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_contracts.responsible_user_id IS 'Gestor interno do contrato — obrigatorio apenas para status=active (CHECK), nao no cadastro';


--
-- Name: jur_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_contracts_id_seq OWNED BY public.jur_contracts.id;


--
-- Name: jur_corporate_acts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_corporate_acts (
    id integer NOT NULL,
    act_type public.enum_jur_corporate_acts_act_type NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    act_date date NOT NULL,
    registration_protocol character varying(60),
    registered_at date,
    status public.enum_jur_corporate_acts_status DEFAULT 'draft'::public.enum_jur_corporate_acts_status NOT NULL,
    document_file_path character varying(500),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_corporate_acts.registration_protocol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_corporate_acts.registration_protocol IS 'Número de registro na Junta Comercial';


--
-- Name: COLUMN jur_corporate_acts.registered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_corporate_acts.registered_at IS 'Data do registro — pode ficar pendente por um tempo após act_date';


--
-- Name: COLUMN jur_corporate_acts.document_file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_corporate_acts.document_file_path IS 'Referência de arquivo — mesmo padrão de jur_contract_documents, sem upload real nesta rodada';


--
-- Name: jur_corporate_acts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_corporate_acts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_corporate_acts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_corporate_acts_id_seq OWNED BY public.jur_corporate_acts.id;


--
-- Name: jur_external_lawyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_external_lawyers (
    id integer NOT NULL,
    full_name character varying(150) NOT NULL,
    oab_number character varying(30) NOT NULL,
    law_firm character varying(150),
    document character varying(20),
    contact_email character varying(150),
    contact_phone character varying(30),
    specialty character varying(150),
    fee_terms text,
    supplier_id integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_external_lawyers.oab_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_external_lawyers.oab_number IS 'Numero de inscricao na OAB';


--
-- Name: COLUMN jur_external_lawyers.document; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_external_lawyers.document IS 'CPF/CNPJ';


--
-- Name: COLUMN jur_external_lawyers.fee_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_external_lawyers.fee_terms IS 'Condicoes de honorarios (texto livre)';


--
-- Name: COLUMN jur_external_lawyers.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_external_lawyers.supplier_id IS 'Vinculo 1:1 opcional para faturamento via Contas a Pagar';


--
-- Name: jur_external_lawyers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_external_lawyers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_external_lawyers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_external_lawyers_id_seq OWNED BY public.jur_external_lawyers.id;


--
-- Name: jur_intellectual_property; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_intellectual_property (
    id integer NOT NULL,
    ip_type public.enum_jur_intellectual_property_ip_type NOT NULL,
    registration_number character varying(50),
    title character varying(200) NOT NULL,
    description text,
    holding_area character varying(150),
    filing_date date,
    grant_date date,
    expiration_date date,
    next_annuity_date date,
    status public.enum_jur_intellectual_property_status DEFAULT 'filed'::public.enum_jur_intellectual_property_status NOT NULL,
    responsible_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_intellectual_property.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_intellectual_property.description IS 'Para trade_secret: descricao GENERICA apenas — nunca o conteudo do segredo (RF-JUR-033)';


--
-- Name: COLUMN jur_intellectual_property.holding_area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_intellectual_property.holding_area IS 'Area detentora do segredo (relevante para trade_secret)';


--
-- Name: COLUMN jur_intellectual_property.filing_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_intellectual_property.filing_date IS 'Data de deposito';


--
-- Name: COLUMN jur_intellectual_property.grant_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_intellectual_property.grant_date IS 'Data de concessao';


--
-- Name: COLUMN jur_intellectual_property.next_annuity_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_intellectual_property.next_annuity_date IS 'Proxima anuidade/prorrogacao — janelas exatas por tipo sujeitas a conferencia nos certificados (RF-JUR-032)';


--
-- Name: jur_intellectual_property_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_intellectual_property_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_intellectual_property_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_intellectual_property_id_seq OWNED BY public.jur_intellectual_property.id;


--
-- Name: jur_ip_contract_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_ip_contract_links (
    id integer NOT NULL,
    ip_id integer NOT NULL,
    contract_id integer NOT NULL,
    link_description character varying(200),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_ip_contract_links.link_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_ip_contract_links.link_description IS 'Ex.: "NDA que protege o segredo", "licenciamento da marca EVOK"';


--
-- Name: jur_ip_contract_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_ip_contract_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_ip_contract_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_ip_contract_links_id_seq OWNED BY public.jur_ip_contract_links.id;


--
-- Name: jur_legal_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_legal_alerts (
    id integer NOT NULL,
    origin_type public.enum_jur_legal_alerts_origin_type NOT NULL,
    origin_id integer NOT NULL,
    alert_subtype character varying(40) NOT NULL,
    due_date date NOT NULL,
    recipient_user_id integer NOT NULL,
    status public.enum_jur_legal_alerts_status DEFAULT 'pending'::public.enum_jur_legal_alerts_status NOT NULL,
    acknowledged_at timestamp with time zone,
    escalated_to_user_id integer,
    escalated_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_legal_alerts.origin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_alerts.origin_id IS 'Polimorfico — sem FK real (ver cabecalho da migration)';


--
-- Name: COLUMN jur_legal_alerts.alert_subtype; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_alerts.alert_subtype IS 'Ex.: expiration, renewal_notice, adjustment_index, d7, d3, d1, d0, escalation, annuity, response_d5, response_d1';


--
-- Name: COLUMN jur_legal_alerts.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_alerts.due_date IS 'Data em que o alerta deve disparar';


--
-- Name: jur_legal_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_legal_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_legal_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_legal_alerts_id_seq OWNED BY public.jur_legal_alerts.id;


--
-- Name: jur_legal_case_deadlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_legal_case_deadlines (
    id integer NOT NULL,
    legal_case_id integer NOT NULL,
    description character varying(200) NOT NULL,
    due_date date NOT NULL,
    is_fatal boolean DEFAULT true NOT NULL,
    responsible_user_id integer NOT NULL,
    backup_user_id integer,
    escalation_user_id integer,
    status public.enum_jur_legal_case_deadlines_status DEFAULT 'pending'::public.enum_jur_legal_case_deadlines_status NOT NULL,
    acknowledged_at timestamp with time zone,
    evidence_file_path character varying(255),
    fulfilled_by integer,
    fulfilled_at timestamp with time zone,
    confirmed_by integer,
    confirmed_at timestamp with time zone,
    escalated_at timestamp with time zone,
    missed_at timestamp with time zone,
    retroactive_justification text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_legal_case_deadlines_confirmed_late_requires_justificati CHECK (((status <> 'confirmed_late'::public.enum_jur_legal_case_deadlines_status) OR (retroactive_justification IS NOT NULL))),
    CONSTRAINT ck_jur_legal_case_deadlines_confirmed_requires_evidence CHECK (((status <> ALL (ARRAY['confirmed'::public.enum_jur_legal_case_deadlines_status, 'confirmed_late'::public.enum_jur_legal_case_deadlines_status])) OR ((fulfilled_by IS NOT NULL) AND (confirmed_by IS NOT NULL) AND (evidence_file_path IS NOT NULL)))),
    CONSTRAINT ck_jur_legal_case_deadlines_fatal_requires_escalation CHECK (((is_fatal = false) OR (escalation_user_id IS NOT NULL))),
    CONSTRAINT ck_jur_legal_case_deadlines_fulfilled_confirmed_distinct CHECK (((fulfilled_by IS NULL) OR (confirmed_by IS NULL) OR (fulfilled_by <> confirmed_by)))
);


--
-- Name: COLUMN jur_legal_case_deadlines.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.due_date IS 'Data fatal informada manualmente pelo advogado — o sistema NAO calcula (RF-JUR-023)';


--
-- Name: COLUMN jur_legal_case_deadlines.responsible_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.responsible_user_id IS 'Obrigatorio sem excecao, inclusive para rascunho (RF-JUR-021)';


--
-- Name: COLUMN jur_legal_case_deadlines.backup_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.backup_user_id IS 'Substituto opcional que pode registrar o cumprimento em ausencia do titular (UC-54 A2)';


--
-- Name: COLUMN jur_legal_case_deadlines.escalation_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.escalation_user_id IS 'Destinatario da escalada automatica em D-3 sem acknowledge — obrigatorio quando is_fatal=true (CHECK)';


--
-- Name: COLUMN jur_legal_case_deadlines.acknowledged_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.acknowledged_at IS 'Confirmacao de ciencia do responsavel (evita escalada automatica em D-3)';


--
-- Name: COLUMN jur_legal_case_deadlines.evidence_file_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.evidence_file_path IS '1a confirmacao: evidencia de cumprimento (protocolo)';


--
-- Name: COLUMN jur_legal_case_deadlines.confirmed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.confirmed_by IS '2a confirmacao — usuario obrigatoriamente distinto de fulfilled_by (CHECK)';


--
-- Name: COLUMN jur_legal_case_deadlines.missed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.missed_at IS 'Preenchido quando due_date vence sem baixa (transicao automatica para missed)';


--
-- Name: COLUMN jur_legal_case_deadlines.retroactive_justification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_deadlines.retroactive_justification IS 'Obrigatoria para baixa apos missed (status=confirmed_late) — RF-JUR-025';


--
-- Name: jur_legal_case_deadlines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_legal_case_deadlines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_legal_case_deadlines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_legal_case_deadlines_id_seq OWNED BY public.jur_legal_case_deadlines.id;


--
-- Name: jur_legal_case_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_legal_case_events (
    id integer NOT NULL,
    legal_case_id integer NOT NULL,
    event_type public.enum_jur_legal_case_events_event_type NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    description text NOT NULL,
    document_url character varying(255),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: jur_legal_case_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_legal_case_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_legal_case_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_legal_case_events_id_seq OWNED BY public.jur_legal_case_events.id;


--
-- Name: jur_legal_case_provisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_legal_case_provisions (
    id integer NOT NULL,
    legal_case_id integer NOT NULL,
    risk_class public.enum_jur_legal_case_provisions_risk_class NOT NULL,
    claim_amount numeric(18,6),
    provisioned_amount numeric(18,6) DEFAULT 0 NOT NULL,
    rationale text,
    assessed_by integer NOT NULL,
    assessed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_legal_case_provisions_amount_non_negative CHECK (((provisioned_amount >= (0)::numeric) AND ((claim_amount IS NULL) OR (claim_amount >= (0)::numeric)))),
    CONSTRAINT ck_jur_legal_case_provisions_probable_requires_amount CHECK (((risk_class <> 'probable'::public.enum_jur_legal_case_provisions_risk_class) OR ((provisioned_amount > (0)::numeric) AND (rationale IS NOT NULL))))
);


--
-- Name: COLUMN jur_legal_case_provisions.risk_class; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_provisions.risk_class IS 'Nomenclatura CPC 25';


--
-- Name: COLUMN jur_legal_case_provisions.claim_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_case_provisions.claim_amount IS 'Valor exposto nesta avaliacao — usado no relatorio de "exposicao possivel" (RF-JUR-020) quando risk_class=possible';


--
-- Name: jur_legal_case_provisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_legal_case_provisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_legal_case_provisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_legal_case_provisions_id_seq OWNED BY public.jur_legal_case_provisions.id;


--
-- Name: jur_legal_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_legal_cases (
    id integer NOT NULL,
    case_number character varying(30) NOT NULL,
    case_type public.enum_jur_legal_cases_case_type NOT NULL,
    case_role public.enum_jur_legal_cases_case_role NOT NULL,
    opposing_party_name character varying(200) NOT NULL,
    opposing_party_employee_id integer,
    opposing_party_supplier_id integer,
    opposing_party_client_id integer,
    court character varying(150),
    external_lawyer_id integer,
    claim_value numeric(18,6),
    internal_responsible_user_id integer NOT NULL,
    status public.enum_jur_legal_cases_status DEFAULT 'active'::public.enum_jur_legal_cases_status NOT NULL,
    outcome_amount numeric(18,6),
    outcome_installments integer,
    closed_at timestamp with time zone,
    next_risk_reassessment_due_at date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_legal_cases_closed_requires_closed_at CHECK (((status <> ALL (ARRAY['won'::public.enum_jur_legal_cases_status, 'lost'::public.enum_jur_legal_cases_status, 'settled'::public.enum_jur_legal_cases_status, 'archived'::public.enum_jur_legal_cases_status])) OR (closed_at IS NOT NULL))),
    CONSTRAINT ck_jur_legal_cases_opposing_party_single CHECK ((((
CASE
    WHEN (opposing_party_employee_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (opposing_party_supplier_id IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN (opposing_party_client_id IS NOT NULL) THEN 1
    ELSE 0
END) <= 1))
);


--
-- Name: COLUMN jur_legal_cases.case_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.case_number IS 'Numero CNJ';


--
-- Name: COLUMN jur_legal_cases.case_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.case_role IS 'Papel da EVOK no processo (autor/reu/terceiro)';


--
-- Name: COLUMN jur_legal_cases.opposing_party_employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.opposing_party_employee_id IS 'Ex.: reclamatoria trabalhista movida por (ex-)empregado — preservado mesmo apos desligamento (RNF-JUR-03)';


--
-- Name: COLUMN jur_legal_cases.court; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.court IS 'Vara/tribunal';


--
-- Name: COLUMN jur_legal_cases.claim_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.claim_value IS 'Valor da causa';


--
-- Name: COLUMN jur_legal_cases.outcome_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.outcome_amount IS 'Valor do acordo/condenacao quando settled/lost';


--
-- Name: COLUMN jur_legal_cases.next_risk_reassessment_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_legal_cases.next_risk_reassessment_due_at IS 'Pendencia de reavaliacao de risco (RF-JUR-017) — a cada andamento tipo decision e, no minimo, a cada 90 dias por processo ativo (periodicidade configuravel em app)';


--
-- Name: jur_legal_cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_legal_cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_legal_cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_legal_cases_id_seq OWNED BY public.jur_legal_cases.id;


--
-- Name: jur_lgpd_data_subject_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_lgpd_data_subject_requests (
    id integer NOT NULL,
    request_type public.enum_jur_lgpd_data_subject_requests_request_type NOT NULL,
    requester_name character varying(200) NOT NULL,
    requester_document character varying(20),
    requester_email character varying(150),
    data_subject_category character varying(100),
    received_at timestamp with time zone NOT NULL,
    due_date date NOT NULL,
    status public.enum_jur_lgpd_data_subject_requests_status DEFAULT 'received'::public.enum_jur_lgpd_data_subject_requests_status NOT NULL,
    identity_verified boolean DEFAULT false NOT NULL,
    identity_verified_by integer,
    identity_verified_at timestamp with time zone,
    rejection_justification text,
    resolution_notes text,
    answered_at timestamp with time zone,
    dpo_user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_lgpd_dsr_in_progress_requires_verification CHECK (((status <> ALL (ARRAY['in_progress'::public.enum_jur_lgpd_data_subject_requests_status, 'answered'::public.enum_jur_lgpd_data_subject_requests_status])) OR (identity_verified = true))),
    CONSTRAINT ck_jur_lgpd_dsr_rejected_requires_justification CHECK (((status <> 'rejected_justified'::public.enum_jur_lgpd_data_subject_requests_status) OR (rejection_justification IS NOT NULL)))
);


--
-- Name: COLUMN jur_lgpd_data_subject_requests.request_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_data_subject_requests.request_type IS 'LGPD art. 18';


--
-- Name: COLUMN jur_lgpd_data_subject_requests.data_subject_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_data_subject_requests.data_subject_category IS 'Ex.: funcionario, cliente PF, contato de fornecedor';


--
-- Name: COLUMN jur_lgpd_data_subject_requests.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_data_subject_requests.due_date IS 'Calculada em app: received_at + 15 dias (art. 19, II)';


--
-- Name: COLUMN jur_lgpd_data_subject_requests.dpo_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_data_subject_requests.dpo_user_id IS 'Encarregado (DPO) responsavel — RF-JUR-041';


--
-- Name: jur_lgpd_data_subject_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_lgpd_data_subject_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_lgpd_data_subject_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_lgpd_data_subject_requests_id_seq OWNED BY public.jur_lgpd_data_subject_requests.id;


--
-- Name: jur_lgpd_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_lgpd_incidents (
    id integer NOT NULL,
    occurred_at timestamp with time zone,
    detected_at timestamp with time zone NOT NULL,
    description text NOT NULL,
    affected_categories text,
    affected_data_subjects_estimate integer,
    risk_assessment text NOT NULL,
    communication_decision public.enum_jur_lgpd_incidents_communication_decision,
    communication_justification text,
    action_plan text,
    status public.enum_jur_lgpd_incidents_status DEFAULT 'open'::public.enum_jur_lgpd_incidents_status NOT NULL,
    dpo_user_id integer NOT NULL,
    closed_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_lgpd_incidents_closed_requires_decision CHECK (((status <> 'closed'::public.enum_jur_lgpd_incidents_status) OR ((communication_decision IS NOT NULL) AND (communication_justification IS NOT NULL) AND (closed_at IS NOT NULL))))
);


--
-- Name: COLUMN jur_lgpd_incidents.occurred_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_incidents.occurred_at IS 'Data estimada da ocorrencia, quando conhecida';


--
-- Name: COLUMN jur_lgpd_incidents.communication_decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_incidents.communication_decision IS 'Preenchida durante a investigacao — obrigatoria para fechar o incidente (CHECK)';


--
-- Name: COLUMN jur_lgpd_incidents.communication_justification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_incidents.communication_justification IS 'Obrigatoria em ambos os sentidos (comunicar ou nao) — CHECK exige quando status=closed';


--
-- Name: jur_lgpd_incidents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_lgpd_incidents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_lgpd_incidents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_lgpd_incidents_id_seq OWNED BY public.jur_lgpd_incidents.id;


--
-- Name: jur_lgpd_processing_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_lgpd_processing_activities (
    id integer NOT NULL,
    purpose text NOT NULL,
    legal_basis public.enum_jur_lgpd_processing_activities_legal_basis NOT NULL,
    data_categories text NOT NULL,
    data_subject_categories text NOT NULL,
    source_system character varying(150),
    sharing_description text,
    retention_period character varying(150),
    security_measures text,
    department_id integer NOT NULL,
    last_reviewed_at date,
    next_review_due_at date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN jur_lgpd_processing_activities.legal_basis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_processing_activities.legal_basis IS 'Rol taxativo do art. 7 da LGPD';


--
-- Name: COLUMN jur_lgpd_processing_activities.source_system; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_processing_activities.source_system IS 'Tabela/sistema de origem no ERP';


--
-- Name: COLUMN jur_lgpd_processing_activities.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_processing_activities.department_id IS 'Area dona da atividade de tratamento';


--
-- Name: COLUMN jur_lgpd_processing_activities.next_review_due_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_lgpd_processing_activities.next_review_due_at IS 'Revisao anual obrigatoria (RF-JUR-036)';


--
-- Name: jur_lgpd_processing_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_lgpd_processing_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_lgpd_processing_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_lgpd_processing_activities_id_seq OWNED BY public.jur_lgpd_processing_activities.id;


--
-- Name: jur_proxies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jur_proxies (
    id integer NOT NULL,
    grantor_name character varying(200) DEFAULT 'EVOK ÁUDIO LTDA'::character varying NOT NULL,
    grantee_name character varying(200) NOT NULL,
    grantee_document character varying(20),
    employee_id integer,
    external_lawyer_id integer,
    powers_description text NOT NULL,
    power_tags character varying(255),
    proxy_form public.enum_jur_proxies_proxy_form NOT NULL,
    issue_date date NOT NULL,
    expiration_date date,
    alert_advance_days integer DEFAULT 30 NOT NULL,
    status public.enum_jur_proxies_status DEFAULT 'active'::public.enum_jur_proxies_status NOT NULL,
    revoked_at timestamp with time zone,
    revocation_communication text,
    superseded_proxy_id integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_jur_proxies_alert_advance_days_non_negative CHECK ((alert_advance_days >= 0)),
    CONSTRAINT ck_jur_proxies_revoked_requires_data CHECK (((status <> 'revoked'::public.enum_jur_proxies_status) OR ((revoked_at IS NOT NULL) AND (revocation_communication IS NOT NULL))))
);


--
-- Name: COLUMN jur_proxies.power_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_proxies.power_tags IS 'Lista livre: ad_judicia, ad_negotia, banking, other';


--
-- Name: COLUMN jur_proxies.expiration_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_proxies.expiration_date IS 'NULL = vigencia indeterminada';


--
-- Name: COLUMN jur_proxies.revocation_communication; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_proxies.revocation_communication IS 'Registro de comunicacao da revogacao';


--
-- Name: COLUMN jur_proxies.superseded_proxy_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.jur_proxies.superseded_proxy_id IS 'Procuracao anterior substituida por esta (renovacao — UC-55 A2)';


--
-- Name: jur_proxies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jur_proxies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jur_proxies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jur_proxies_id_seq OWNED BY public.jur_proxies.id;


--
-- Name: lot_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_controls (
    id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    supplier_id integer,
    purchase_id integer,
    production_order_id integer,
    lot_number character varying(80) NOT NULL,
    status public.enum_lot_controls_status DEFAULT 'available'::public.enum_lot_controls_status NOT NULL,
    quantity_initial numeric(12,4) NOT NULL,
    quantity_available numeric(12,4) NOT NULL,
    manufactured_at date,
    expires_at date,
    received_at date,
    created_by integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    warehouse_id integer,
    release_inspection_id integer,
    released_by integer,
    released_at timestamp with time zone
);


--
-- Name: COLUMN lot_controls.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.product_id IS 'FK -> products.id (legado)';


--
-- Name: COLUMN lot_controls.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.item_id IS 'FK -> items.id (Fase 4.6 expand-contract)';


--
-- Name: COLUMN lot_controls.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.supplier_id IS 'FK -> suppliers.id quando o lote veio de compra';


--
-- Name: COLUMN lot_controls.purchase_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.purchase_id IS 'FK -> purchase_orders.id quando o lote veio de recebimento';


--
-- Name: COLUMN lot_controls.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.production_order_id IS 'FK -> production_orders.id quando o lote foi produzido internamente';


--
-- Name: COLUMN lot_controls.lot_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.lot_number IS 'Codigo unico do lote por produto';


--
-- Name: COLUMN lot_controls.quantity_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.quantity_initial IS 'Quantidade original recebida ou produzida';


--
-- Name: COLUMN lot_controls.quantity_available; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.quantity_available IS 'Saldo atual rastreavel do lote';


--
-- Name: COLUMN lot_controls.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.created_by IS 'FK -> users.id';


--
-- Name: COLUMN lot_controls.release_inspection_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.release_inspection_id IS 'G7: FK -> quality_inspections.id que autorizou a saida da quarentena/bloqueio. NULL em lote nunca liberado OU em liberacao legada anterior ao G7 (sem evidencia).';


--
-- Name: COLUMN lot_controls.released_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.released_by IS 'G7 / ISO 9001 8.6: FK -> users.id de quem AUTORIZOU a liberacao (do JWT). Pode diferir do inspetor: inspecionar e liberar sao atos distintos.';


--
-- Name: COLUMN lot_controls.released_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.released_at IS 'G7: data/hora da liberacao do lote.';


--
-- Name: lot_controls_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_controls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_controls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_controls_id_seq OWNED BY public.lot_controls.id;


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    codigo_lote character varying(100) NOT NULL,
    quantidade numeric(18,6) DEFAULT 0 NOT NULL,
    validade date,
    origem character varying(80),
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_lotes_quantidade CHECK ((quantidade >= (0)::numeric))
);


--
-- Name: TABLE lotes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lotes IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: maintenance_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    asset_id integer,
    maintenance_type public.enum_maintenance_orders_maintenance_type NOT NULL,
    priority public.enum_maintenance_orders_priority DEFAULT 'normal'::public.enum_maintenance_orders_priority NOT NULL,
    problem_description text NOT NULL,
    reported_by integer,
    report_date date NOT NULL,
    diagnosed_problem text,
    diagnosed_by integer,
    diagnosis_date date,
    service_performed text,
    technician_id integer,
    start_date date,
    completion_date date,
    parts_cost numeric(10,2) DEFAULT 0 NOT NULL,
    labor_cost numeric(10,2) DEFAULT 0 NOT NULL,
    total_cost numeric(10,2) DEFAULT 0 NOT NULL,
    downtime_hours numeric(10,1) DEFAULT 0 NOT NULL,
    result public.enum_maintenance_orders_result,
    notes text,
    scheduled_date date,
    frequency_days integer,
    next_maintenance_date date,
    status public.enum_maintenance_orders_status DEFAULT 'open'::public.enum_maintenance_orders_status NOT NULL,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    next_maintenance_km integer,
    facility_specialty public.enum_maintenance_orders_facility_specialty,
    facility_area_id integer,
    CONSTRAINT ck_maintenance_orders_asset_or_area_present CHECK (((asset_id IS NOT NULL) OR (facility_area_id IS NOT NULL)))
);


--
-- Name: COLUMN maintenance_orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.order_number IS 'Nº da ordem de manutenção';


--
-- Name: COLUMN maintenance_orders.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.asset_id IS 'FK → assets.id';


--
-- Name: COLUMN maintenance_orders.problem_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.problem_description IS 'Descrição do problema relatado';


--
-- Name: COLUMN maintenance_orders.reported_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.reported_by IS 'FK → users.id';


--
-- Name: COLUMN maintenance_orders.technician_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.technician_id IS 'FK → users.id';


--
-- Name: COLUMN maintenance_orders.parts_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.parts_cost IS 'Custo de peças';


--
-- Name: COLUMN maintenance_orders.labor_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.labor_cost IS 'Custo de mão de obra';


--
-- Name: COLUMN maintenance_orders.total_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.total_cost IS 'Custo total';


--
-- Name: COLUMN maintenance_orders.downtime_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.downtime_hours IS 'Horas de parada';


--
-- Name: COLUMN maintenance_orders.frequency_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.frequency_days IS 'Frequência em dias para manutenção preventiva';


--
-- Name: COLUMN maintenance_orders.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_orders.created_by IS 'FK → users.id';


--
-- Name: maintenance_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_orders_id_seq OWNED BY public.maintenance_orders.id;


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    campaign_type public.enum_marketing_campaigns_campaign_type NOT NULL,
    start_date date NOT NULL,
    end_date date,
    budget_requested numeric(15,2),
    actual_cost numeric(15,2) DEFAULT 0 NOT NULL,
    target_audience character varying(255),
    channel character varying(100),
    leads_generated integer DEFAULT 0 NOT NULL,
    conversions integer DEFAULT 0 NOT NULL,
    roi numeric(10,2),
    status public.enum_marketing_campaigns_status DEFAULT 'planned'::public.enum_marketing_campaigns_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    budget_approved numeric(15,2),
    budget_approval_status public.enum_marketing_campaigns_budget_approval_status DEFAULT 'pending'::public.enum_marketing_campaigns_budget_approval_status NOT NULL,
    budget_approved_by integer,
    budget_approved_at timestamp with time zone,
    notes text,
    metrics_recalculated_at timestamp with time zone,
    CONSTRAINT ck_marketing_campaigns_active_requires_budget_approval CHECK (((status <> 'active'::public.enum_marketing_campaigns_status) OR (budget_approval_status = 'approved'::public.enum_marketing_campaigns_budget_approval_status)))
);


--
-- Name: COLUMN marketing_campaigns.budget_requested; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_campaigns.budget_requested IS 'RF-MKT-030 — orcamento solicitado no planejamento (renomeado de budget)';


--
-- Name: COLUMN marketing_campaigns.budget_approved; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_campaigns.budget_approved IS 'RF-MKT-030 — orcamento aprovado, nulo ate a aprovacao';


--
-- Name: COLUMN marketing_campaigns.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_campaigns.notes IS 'RF-MKT-034 — unico campo editavel quando status e completed/canceled (regra de aplicacao)';


--
-- Name: COLUMN marketing_campaigns.metrics_recalculated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_campaigns.metrics_recalculated_at IS 'RF-MKT-009 — ultima vez que leads_generated/conversions/roi foram recalculados a partir dos vinculos reais';


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_campaigns_id_seq OWNED BY public.marketing_campaigns.id;


--
-- Name: marketing_event_checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_event_checklist_items (
    id integer NOT NULL,
    event_id integer NOT NULL,
    description character varying(255) NOT NULL,
    status public.enum_marketing_event_checklist_items_status DEFAULT 'pending'::public.enum_marketing_event_checklist_items_status NOT NULL,
    responsible_user_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: marketing_event_checklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_event_checklist_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_event_checklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_event_checklist_items_id_seq OWNED BY public.marketing_event_checklist_items.id;


--
-- Name: marketing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_events (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    location character varying(255),
    event_type public.enum_marketing_events_event_type NOT NULL,
    campaign_id integer,
    start_date date NOT NULL,
    end_date date,
    budget numeric(15,2),
    actual_cost numeric(15,2),
    status public.enum_marketing_events_status DEFAULT 'planned'::public.enum_marketing_events_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_marketing_events_completed_requires_actual_cost CHECK (((status <> 'completed'::public.enum_marketing_events_status) OR (actual_cost IS NOT NULL))),
    CONSTRAINT ck_marketing_events_end_after_start CHECK (((end_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: marketing_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_events_id_seq OWNED BY public.marketing_events.id;


--
-- Name: marketing_lead_saneamento_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_lead_saneamento_log (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    previous_status character varying(30) NOT NULL,
    reverted_to_status character varying(30) NOT NULL,
    reason text NOT NULL,
    reverted_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE marketing_lead_saneamento_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marketing_lead_saneamento_log IS 'Auditoria permanente do saneamento de leads converted sem cliente vinculado — BLOCO_5_MKT_REQUISITOS.md secao 2, migration 20260807-000312';


--
-- Name: marketing_lead_saneamento_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_lead_saneamento_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_lead_saneamento_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_lead_saneamento_log_id_seq OWNED BY public.marketing_lead_saneamento_log.id;


--
-- Name: marketing_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_leads (
    id integer NOT NULL,
    campaign_id integer,
    name character varying(200) NOT NULL,
    email character varying(100),
    phone character varying(20),
    company character varying(200),
    interest character varying(255),
    lead_source public.enum_marketing_leads_lead_source,
    lead_score integer DEFAULT 0 NOT NULL,
    status public.enum_marketing_leads_status DEFAULT 'new'::public.enum_marketing_leads_status NOT NULL,
    converted_to_customer_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    qualified_at timestamp with time zone,
    sales_owner_user_id integer,
    handoff_at timestamp with time zone,
    first_response_at timestamp with time zone,
    consent_given boolean DEFAULT false NOT NULL,
    consent_date timestamp with time zone,
    consent_channel public.enum_marketing_leads_consent_channel,
    converted_at timestamp with time zone,
    needs_review boolean DEFAULT false NOT NULL,
    event_id integer,
    CONSTRAINT ck_marketing_leads_converted_requires_client CHECK (((status <> 'converted'::public.enum_marketing_leads_status) OR (converted_to_customer_id IS NOT NULL))),
    CONSTRAINT ck_marketing_leads_event_requires_event_source CHECK (((event_id IS NULL) OR (lead_source = 'event'::public.enum_marketing_leads_lead_source)))
);


--
-- Name: COLUMN marketing_leads.qualified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.qualified_at IS 'RF-MKT-013 — momento da transição do lead para status qualified, base do calculo de SLA de handoff';


--
-- Name: COLUMN marketing_leads.sales_owner_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.sales_owner_user_id IS 'RF-MKT-011 — vendedor responsavel pelo handoff (responsavel_vendas do brief), FK users.id';


--
-- Name: COLUMN marketing_leads.handoff_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.handoff_at IS 'RF-MKT-013 — momento em que sales_owner_user_id foi atribuido, base do calculo de SLA de handoff';


--
-- Name: COLUMN marketing_leads.first_response_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.first_response_at IS 'Momento do primeiro contato do vendedor apos o handoff — apoia KPI de tempo de ciclo (RF-MKT-026), nao estava no RF original';


--
-- Name: COLUMN marketing_leads.consent_given; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.consent_given IS 'RF-MKT-035 — flag de consentimento LGPD explicito do titular do lead';


--
-- Name: COLUMN marketing_leads.consent_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.consent_date IS 'RF-MKT-035 — momento em que o consentimento foi registrado, nulo se consent_given=false';


--
-- Name: COLUMN marketing_leads.consent_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.consent_channel IS 'RF-MKT-035 — canal pelo qual o consentimento foi capturado';


--
-- Name: COLUMN marketing_leads.converted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.converted_at IS 'RF-MKT-002/026 (via auditoria cruzada AuditorIntegrador) — momento em que o lead foi convertido (status=converted gravado), usado por median_lead_cycle_days; nulo para leads convertidos antes desta migration';


--
-- Name: COLUMN marketing_leads.needs_review; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.needs_review IS 'true quando o lead foi rebaixado automaticamente pelo saneamento de 20260807-000312 (converted orfao sem cliente) e precisa de triagem manual de Marketing/Vendas';


--
-- Name: COLUMN marketing_leads.event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_leads.event_id IS 'RF-MKT-020/022 — evento/feira de origem do lead, opcional; quando preenchido, lead_source deve ser event (CHECK ck_marketing_leads_event_requires_event_source)';


--
-- Name: marketing_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_leads_id_seq OWNED BY public.marketing_leads.id;


--
-- Name: marketing_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_materials (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    material_type public.enum_marketing_materials_material_type NOT NULL,
    product_id uuid,
    file_path character varying(255),
    version character varying(10) DEFAULT '01'::character varying NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    stock_item_id uuid,
    approved_by integer,
    approved_at timestamp with time zone
);


--
-- Name: COLUMN marketing_materials.stock_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.marketing_materials.stock_item_id IS 'RF-MKT-038 — item de estoque (Almoxarifado) do material fisico, categoria Material Promocional; nenhuma movimentacao e criada pelo modulo MKT (BR-MKT-011)';


--
-- Name: marketing_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketing_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketing_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketing_materials_id_seq OWNED BY public.marketing_materials.id;


--
-- Name: master_production_plan_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_production_plan_lines (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    product_id integer NOT NULL,
    demand_sales_orders numeric(18,6) DEFAULT 0 NOT NULL,
    demand_safety_stock numeric(18,6) DEFAULT 0 NOT NULL,
    demand_forecast numeric(18,6) DEFAULT 0 NOT NULL,
    gross_requirement numeric(18,6) DEFAULT 0 NOT NULL,
    supply_on_hand numeric(18,6) DEFAULT 0 NOT NULL,
    supply_withheld numeric(18,6) DEFAULT 0 NOT NULL,
    supply_reserved numeric(18,6) DEFAULT 0 NOT NULL,
    supply_in_production numeric(18,6) DEFAULT 0 NOT NULL,
    net_requirement numeric(18,6) DEFAULT 0 NOT NULL,
    suggested_quantity numeric(18,6) DEFAULT 0 NOT NULL,
    planned_quantity numeric(18,6) DEFAULT 0 NOT NULL,
    due_date date NOT NULL,
    status public.enum_master_production_plan_lines_status DEFAULT 'pending'::public.enum_master_production_plan_lines_status NOT NULL,
    production_order_id integer,
    decided_by integer,
    decided_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_master_production_plan_lines_planned_quantity_non_negative CHECK ((planned_quantity >= (0)::numeric))
);


--
-- Name: TABLE master_production_plan_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.master_production_plan_lines IS 'G17: linha do plano mestre — um produto por plano. Guarda a demanda consolidada decomposta por origem, o suprimento confrontado, a sugestao calculada e, em coluna separada, a DECISAO do planejador.';


--
-- Name: COLUMN master_production_plan_lines.demand_sales_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.demand_sales_orders IS 'Carteira de pedidos: soma de (sale_items.quantity - sale_items.invoiced_quantity) das vendas confirmed/partially_invoiced. E a demanda que ninguem lia antes do G17.';


--
-- Name: COLUMN master_production_plan_lines.demand_safety_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.demand_safety_stock IS 'products.min_quantity — o estoque minimo passa a ser demanda de planejamento, nao so alerta de dashboard.';


--
-- Name: COLUMN master_production_plan_lines.demand_forecast; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.demand_forecast IS 'Previsao informada manualmente pelo planejador na criacao do plano. NAO existe entidade de forecast no ERP (risco residual registrado); zero quando nao informada.';


--
-- Name: COLUMN master_production_plan_lines.supply_on_hand; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.supply_on_hand IS 'Saldo de PLANEJAMENTO do produto = max(0, products.quantity - retido em quarentena/bloqueio - reservado). Mesmo saldo do G7/G9: material nao inspecionado e material reservado NAO contam como disponivel.';


--
-- Name: COLUMN master_production_plan_lines.supply_withheld; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.supply_withheld IS 'Parcela retida em lot_controls com status quarantine/blocked (services/quarantineBalanceService), ja descontada de supply_on_hand. Guardada para auditoria do numero.';


--
-- Name: COLUMN master_production_plan_lines.supply_reserved; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.supply_reserved IS 'products.reserved_quantity (cache derivado da soma das reservas vivas por OP e por venda, G3/G9), ja descontado de supply_on_hand.';


--
-- Name: COLUMN master_production_plan_lines.supply_in_production; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.supply_in_production IS 'Saldo a produzir das OPs abertas (planned/released/in_progress/paused): soma de max(0, quantity - quantity_produced). E o "confronto com o que ja esta em producao".';


--
-- Name: COLUMN master_production_plan_lines.suggested_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.suggested_quantity IS 'Sugestao do sistema = necessidade liquida crua. SEM arredondamento de lote minimo/multiplo: politica de lote e decisao de PCP nao tomada pelo dono.';


--
-- Name: COLUMN master_production_plan_lines.planned_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.planned_quantity IS 'A DECISAO do planejador — o que de fato sera produzido. Nasce igual a sugestao e pode divergir dela; a divergencia fica visivel porque suggested_quantity nunca e sobrescrita.';


--
-- Name: COLUMN master_production_plan_lines.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.status IS 'pending (sugestao nao revisada) | planned (planejador decidiu produzir) | dismissed (planejador decidiu NAO produzir) | released (OP gerada).';


--
-- Name: COLUMN master_production_plan_lines.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.production_order_id IS 'FK -> production_orders.id gerada por esta linha. E o RASTRO DE ORIGEM da OP: dela se chega ao plano, ao planejador e a demanda que a justificou.';


--
-- Name: COLUMN master_production_plan_lines.decided_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plan_lines.decided_by IS 'FK -> users.id de quem registrou a decisao da linha. SEMPRE do JWT.';


--
-- Name: master_production_plan_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_production_plan_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_production_plan_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_production_plan_lines_id_seq OWNED BY public.master_production_plan_lines.id;


--
-- Name: master_production_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_production_plans (
    id integer NOT NULL,
    plan_number character varying(30) NOT NULL,
    horizon_start date NOT NULL,
    horizon_end date NOT NULL,
    status public.enum_master_production_plans_status DEFAULT 'draft'::public.enum_master_production_plans_status NOT NULL,
    planner_id integer NOT NULL,
    consolidated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    firmed_by integer,
    firmed_at timestamp with time zone,
    released_by integer,
    released_at timestamp with time zone,
    canceled_by integer,
    canceled_at timestamp with time zone,
    cancel_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_master_production_plans_horizon_order CHECK ((horizon_end >= horizon_start))
);


--
-- Name: TABLE master_production_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.master_production_plans IS 'G17: Plano Mestre de Producao (MPS) — camada de decisao entre a carteira de pedidos e a ordem de producao. Decisao D-F do dono do produto (existe PCP formal). NAO existe geracao automatica de OP na confirmacao da venda: a OP nasce do ato explicito de liberar um plano firme.';


--
-- Name: COLUMN master_production_plans.plan_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.plan_number IS 'Numero legivel do plano (MPS-YYYY-NNNN), serializado por advisory lock anual — mesmo padrao de production_orders.order_number apos o G16.';


--
-- Name: COLUMN master_production_plans.horizon_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.horizon_start IS 'Inicio do horizonte de planejamento. SEM default: horizonte e politica de PCP e o dono nao a definiu — quem planeja declara a cada plano.';


--
-- Name: COLUMN master_production_plans.horizon_end; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.horizon_end IS 'Fim do horizonte de planejamento. Vira a data de necessidade padrao das linhas (e, por consequencia, o due_date da OP gerada) quando o planejador nao informa outra.';


--
-- Name: COLUMN master_production_plans.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.status IS 'draft (consolidado, em edicao) | firm (decisao congelada) | released (OPs geradas) | canceled. So plano firm gera OP.';


--
-- Name: COLUMN master_production_plans.planner_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.planner_id IS 'FK -> users.id de quem criou o plano. SEMPRE do JWT (req.user.id), nunca do body — anti-spoofing e regra P0 do projeto.';


--
-- Name: COLUMN master_production_plans.consolidated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_production_plans.consolidated_at IS 'Momento em que a demanda foi fotografada. O plano NAO se re-consolida sozinho: pedido que chega depois entra no proximo plano (politica de replanejamento nao decidida pelo dono).';


--
-- Name: master_production_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_production_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_production_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_production_plans_id_seq OWNED BY public.master_production_plans.id;


--
-- Name: migracao_bom_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migracao_bom_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bill_of_material_id integer,
    bill_of_material_item_id integer,
    item_estrutura_id uuid,
    status character varying(40) DEFAULT 'PENDENTE'::character varying NOT NULL,
    mensagem_erro text,
    processado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migracao_product_item_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migracao_product_item_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id integer NOT NULL,
    item_id uuid NOT NULL,
    product_code character varying(50),
    product_name character varying(200),
    mapeado_em timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(40) DEFAULT 'SUCESSO'::character varying NOT NULL,
    observacoes text
);


--
-- Name: movimentos_estoque; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimentos_estoque (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    lote_id uuid,
    tipo public.movimento_tipo NOT NULL,
    quantidade numeric(18,6) NOT NULL,
    saldo_antes numeric(18,6) NOT NULL,
    saldo_depois numeric(18,6) NOT NULL,
    origem_tabela character varying(80) NOT NULL,
    origem_id uuid NOT NULL,
    usuario_id integer,
    observacoes text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_movimentos_quantidade CHECK ((quantidade > (0)::numeric)),
    CONSTRAINT ck_movimentos_saldo CHECK (((saldo_antes >= (0)::numeric) AND (saldo_depois >= (0)::numeric)))
);


--
-- Name: TABLE movimentos_estoque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.movimentos_estoque IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN movimentos_estoque.usuario_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movimentos_estoque.usuario_id IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela movimentos_estoque e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: mrp_ordens_planejadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mrp_ordens_planejadas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    origem public.origem_mrp NOT NULL,
    origem_id uuid,
    necessidade_bruta numeric(18,6) NOT NULL,
    estoque_disponivel numeric(18,6) NOT NULL,
    necessidade_liquida numeric(18,6) NOT NULL,
    quantidade_planejada numeric(18,6) NOT NULL,
    data_necessidade date NOT NULL,
    data_liberacao date NOT NULL,
    status public.ordem_status DEFAULT 'RASCUNHO'::public.ordem_status NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_mrp_quantidades CHECK (((necessidade_bruta >= (0)::numeric) AND (estoque_disponivel >= (0)::numeric) AND (necessidade_liquida >= (0)::numeric) AND (quantidade_planejada > (0)::numeric)))
);


--
-- Name: non_conformities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.non_conformities (
    id integer NOT NULL,
    nc_number character varying(20) NOT NULL,
    origin public.enum_non_conformities_origin NOT NULL,
    product_id integer,
    purchase_item_id integer,
    production_order_id integer,
    service_order_id integer,
    supplier_id integer,
    description text NOT NULL,
    defect_type public.enum_non_conformities_defect_type NOT NULL,
    severity public.enum_non_conformities_severity NOT NULL,
    quantity_affected integer DEFAULT 0 NOT NULL,
    immediate_action public.enum_non_conformities_immediate_action DEFAULT 'rework'::public.enum_non_conformities_immediate_action NOT NULL,
    immediate_action_desc text,
    root_cause text,
    root_cause_category public.enum_non_conformities_root_cause_category,
    corrective_action text,
    corrective_action_deadline date,
    responsible_id integer,
    effectiveness_check text,
    effectiveness_date date,
    effectiveness_result public.enum_non_conformities_effectiveness_result,
    status public.enum_non_conformities_status DEFAULT 'open'::public.enum_non_conformities_status NOT NULL,
    lot_number character varying(50),
    batch_number character varying(50),
    report_date date DEFAULT CURRENT_DATE,
    closed_date date,
    scrap_cost numeric(10,2) DEFAULT 0 NOT NULL,
    rework_cost numeric(10,2) DEFAULT 0 NOT NULL,
    total_cost numeric(10,2) DEFAULT 0 NOT NULL,
    reported_by integer NOT NULL,
    closed_by integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    asset_id integer
);


--
-- Name: COLUMN non_conformities.nc_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.nc_number IS 'Nº da não conformidade';


--
-- Name: COLUMN non_conformities.origin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.origin IS 'Origem da NC';


--
-- Name: COLUMN non_conformities.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.product_id IS 'FK → products.id';


--
-- Name: COLUMN non_conformities.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.production_order_id IS 'FK → production_orders.id';


--
-- Name: COLUMN non_conformities.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.supplier_id IS 'FK → suppliers.id';


--
-- Name: COLUMN non_conformities.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.description IS 'Descrição da NC';


--
-- Name: COLUMN non_conformities.responsible_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.responsible_id IS 'FK → users.id';


--
-- Name: COLUMN non_conformities.reported_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.reported_by IS 'FK → users.id (quem reportou)';


--
-- Name: COLUMN non_conformities.closed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.closed_by IS 'FK → users.id (quem encerrou)';


--
-- Name: COLUMN non_conformities.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.non_conformities.asset_id IS 'FK -> assets.id (quando a NC se refere a um ativo/patrimonio, nao a um produto)';


--
-- Name: non_conformities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.non_conformities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: non_conformities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.non_conformities_id_seq OWNED BY public.non_conformities.id;


--
-- Name: numeros_serie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.numeros_serie (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    lote_id uuid,
    numero_serie character varying(120) NOT NULL,
    status character varying(40) DEFAULT 'DISPONIVEL'::character varying NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE numeros_serie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.numeros_serie IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: ordens_producao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordens_producao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(60) NOT NULL,
    item_id uuid NOT NULL,
    quantidade_planejada numeric(18,6) NOT NULL,
    quantidade_produzida numeric(18,6) DEFAULT 0 NOT NULL,
    status public.ordem_status DEFAULT 'RASCUNHO'::public.ordem_status NOT NULL,
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    criado_por integer,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_op_quantidades CHECK (((quantidade_planejada > (0)::numeric) AND (quantidade_produzida >= (0)::numeric)))
);


--
-- Name: TABLE ordens_producao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ordens_producao IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN ordens_producao.criado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordens_producao.criado_por IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela ordens_producao e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN product_categories.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_categories.name IS 'Nome da categoria';


--
-- Name: COLUMN product_categories.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_categories.description IS 'Descrição da categoria';


--
-- Name: COLUMN product_categories.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_categories.active IS 'Status (soft delete)';


--
-- Name: product_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_categories_id_seq OWNED BY public.product_categories.id;


--
-- Name: product_cost_ledgers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_cost_ledgers (
    id integer NOT NULL,
    product_id integer NOT NULL,
    source_type public.enum_product_cost_ledgers_source_type NOT NULL,
    source_id integer,
    quantity numeric(12,4) NOT NULL,
    unit_cost numeric(12,4) NOT NULL,
    total_cost numeric(14,4) NOT NULL,
    previous_cost numeric(12,4) DEFAULT 0 NOT NULL,
    new_cost numeric(12,4) DEFAULT 0 NOT NULL,
    created_by integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN product_cost_ledgers.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_cost_ledgers.product_id IS 'FK -> products.id';


--
-- Name: COLUMN product_cost_ledgers.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_cost_ledgers.source_id IS 'ID da origem: compra, OP ou ajuste';


--
-- Name: COLUMN product_cost_ledgers.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_cost_ledgers.created_by IS 'FK -> users.id';


--
-- Name: product_cost_ledgers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_cost_ledgers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_cost_ledgers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_cost_ledgers_id_seq OWNED BY public.product_cost_ledgers.id;


--
-- Name: product_drawings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_drawings (
    id integer NOT NULL,
    product_id integer NOT NULL,
    drawing_number character varying(50) NOT NULL,
    revision character varying(10) DEFAULT '00'::character varying NOT NULL,
    title character varying(200) NOT NULL,
    drawing_type public.enum_product_drawings_drawing_type DEFAULT 'detail'::public.enum_product_drawings_drawing_type NOT NULL,
    file_path character varying(255),
    material_spec text,
    dimensions text,
    tolerances text,
    approved_by integer,
    approval_date date,
    status public.enum_product_drawings_status DEFAULT 'draft'::public.enum_product_drawings_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: product_drawings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_drawings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_drawings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_drawings_id_seq OWNED BY public.product_drawings.id;


--
-- Name: product_warehouse_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_warehouse_stock (
    id integer NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(18,6) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_product_warehouse_stock_quantity_non_negative CHECK ((quantity >= (0)::numeric))
);


--
-- Name: COLUMN product_warehouse_stock.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_warehouse_stock.quantity IS 'Saldo do produto neste deposito';


--
-- Name: product_warehouse_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_warehouse_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_warehouse_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_warehouse_stock_id_seq OWNED BY public.product_warehouse_stock.id;


--
-- Name: production_cost_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_cost_settings (
    id integer NOT NULL,
    overhead_calculation_basis public.enum_production_cost_settings_overhead_calculation_basis DEFAULT 'material_labor'::public.enum_production_cost_settings_overhead_calculation_basis NOT NULL,
    overhead_rate_percent numeric(9,6) DEFAULT 0 NOT NULL,
    default_labor_rate_per_hour numeric(18,6) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_production_cost_settings_labor_rate_non_negative CHECK ((default_labor_rate_per_hour >= (0)::numeric)),
    CONSTRAINT ck_production_cost_settings_rate_range CHECK (((overhead_rate_percent >= (0)::numeric) AND (overhead_rate_percent <= (1000)::numeric))),
    CONSTRAINT ck_production_cost_settings_singleton_id CHECK ((id = 1))
);


--
-- Name: COLUMN production_cost_settings.overhead_calculation_basis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_cost_settings.overhead_calculation_basis IS 'Base de calculo do rateio: sobre custo de material+mao-de-obra, so mao-de-obra, ou so material';


--
-- Name: COLUMN production_cost_settings.overhead_rate_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_cost_settings.overhead_rate_percent IS 'Percentual de rateio de overhead aplicado sobre a base escolhida (ex.: 25.5 = 25,5%)';


--
-- Name: COLUMN production_cost_settings.default_labor_rate_per_hour; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_cost_settings.default_labor_rate_per_hour IS 'Taxa de mao-de-obra/h de fallback quando a etapa da rota nao tem work_center_id vinculado (ainda usa o campo legado work_center em texto)';


--
-- Name: production_cost_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_cost_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_cost_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_cost_settings_id_seq OWNED BY public.production_cost_settings.id;


--
-- Name: production_downtimes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_downtimes (
    id integer NOT NULL,
    work_center_id integer NOT NULL,
    production_order_id integer,
    reason public.enum_production_downtimes_reason NOT NULL,
    notes text,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: production_downtimes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_downtimes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_downtimes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_downtimes_id_seq OWNED BY public.production_downtimes.id;


--
-- Name: production_lot_consumptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_lot_consumptions (
    id integer NOT NULL,
    production_order_id integer NOT NULL,
    lot_control_id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    quantity_consumed numeric(12,4) NOT NULL,
    consumed_at timestamp with time zone NOT NULL,
    user_id integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN production_lot_consumptions.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_lot_consumptions.production_order_id IS 'FK -> production_orders.id';


--
-- Name: COLUMN production_lot_consumptions.lot_control_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_lot_consumptions.lot_control_id IS 'FK -> lot_controls.id';


--
-- Name: COLUMN production_lot_consumptions.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_lot_consumptions.product_id IS 'FK -> products.id consumido';


--
-- Name: COLUMN production_lot_consumptions.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_lot_consumptions.item_id IS 'FK -> items.id consumido (expand-contract F4.5)';


--
-- Name: COLUMN production_lot_consumptions.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_lot_consumptions.user_id IS 'FK -> users.id que registrou o consumo';


--
-- Name: production_lot_consumptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_lot_consumptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_lot_consumptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_lot_consumptions_id_seq OWNED BY public.production_lot_consumptions.id;


--
-- Name: production_order_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_order_reservations (
    id integer NOT NULL,
    production_order_id integer,
    product_id integer NOT NULL,
    quantity numeric(18,6) NOT NULL,
    quantity_released numeric(18,6) DEFAULT 0 NOT NULL,
    status public.enum_production_order_reservations_status DEFAULT 'active'::public.enum_production_order_reservations_status NOT NULL,
    released_at timestamp with time zone,
    created_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sale_id integer,
    CONSTRAINT chk_production_order_reservations_quantity CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_production_order_reservations_released_range CHECK (((quantity_released >= (0)::numeric) AND (quantity_released <= quantity))),
    CONSTRAINT chk_production_order_reservations_status_coherence CHECK ((((status = 'active'::public.enum_production_order_reservations_status) AND (quantity_released < quantity)) OR ((status = 'released'::public.enum_production_order_reservations_status) AND (quantity_released = quantity)))),
    CONSTRAINT chk_stock_reservations_exactly_one_owner CHECK (((
CASE
    WHEN (production_order_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (sale_id IS NULL) THEN 0
    ELSE 1
END) = 1))
);


--
-- Name: TABLE production_order_reservations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.production_order_reservations IS 'Reserva de estoque (G3 + G9). Fonte da verdade do que esta comprometido; products.reserved_quantity e cache derivado. Dono = EXATAMENTE UM entre production_order_id e sale_id. Nome da tabela e historico (G3 era so producao) - trate como stock_reservations.';


--
-- Name: COLUMN production_order_reservations.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_reservations.production_order_id IS 'OP dona da reserva. NULL quando a dona e uma venda (G9) - CHECK chk_stock_reservations_exactly_one_owner garante exatamente um dono.';


--
-- Name: COLUMN production_order_reservations.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_reservations.quantity IS 'Quantidade originalmente reservada pela OP para este produto. Imutavel apos a criacao - a liberacao acumula em quantity_released.';


--
-- Name: COLUMN production_order_reservations.quantity_released; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_reservations.quantity_released IS 'Quantidade ja liberada desta reserva. Saldo vivo = quantity - quantity_released.';


--
-- Name: COLUMN production_order_reservations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_reservations.status IS 'active = ainda ha saldo reservado; released = liberado integralmente (historico).';


--
-- Name: COLUMN production_order_reservations.sale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_reservations.sale_id IS 'G9 (2026-08-10) - venda dona da reserva. Confirmacao do pedido RESERVA; a baixa efetiva so ocorre na autorizacao da NF-e (Ajuste SINIEF 07/05, clausula 9a §1o).';


--
-- Name: production_order_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_order_reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_order_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_order_reservations_id_seq OWNED BY public.production_order_reservations.id;


--
-- Name: production_order_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_order_tracking (
    id integer NOT NULL,
    production_order_id integer NOT NULL,
    production_route_step_id integer,
    sequence integer NOT NULL,
    status public.enum_production_order_tracking_status DEFAULT 'pending'::public.enum_production_order_tracking_status NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    operator_id integer,
    quantity_good numeric(18,6) DEFAULT 0 NOT NULL,
    quantity_scrapped numeric(18,6) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN production_order_tracking.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_tracking.production_order_id IS 'FK -> production_orders.id';


--
-- Name: COLUMN production_order_tracking.production_route_step_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_tracking.production_route_step_id IS 'FK -> production_route_steps.id';


--
-- Name: COLUMN production_order_tracking.sequence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_tracking.sequence IS 'Sequencia da etapa na OP';


--
-- Name: COLUMN production_order_tracking.operator_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_order_tracking.operator_id IS 'FK -> employees.id';


--
-- Name: production_order_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_order_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_order_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_order_tracking_id_seq OWNED BY public.production_order_tracking.id;


--
-- Name: production_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(18,6) NOT NULL,
    quantity_produced numeric(18,6) DEFAULT 0 NOT NULL,
    priority public.enum_production_orders_priority DEFAULT 'normal'::public.enum_production_orders_priority NOT NULL,
    status public.enum_production_orders_status DEFAULT 'planned'::public.enum_production_orders_status NOT NULL,
    start_date date,
    due_date date NOT NULL,
    completion_date date,
    sales_order_id integer,
    responsible_id integer,
    notes text,
    created_by integer,
    item_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    quantity_scrapped numeric(18,6) DEFAULT 0 NOT NULL,
    scrap_reason text,
    department_id integer
);


--
-- Name: COLUMN production_orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.order_number IS 'Nº da OP (OP-YYYY-XXXX)';


--
-- Name: COLUMN production_orders.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.product_id IS 'FK → products.id';


--
-- Name: COLUMN production_orders.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.quantity IS 'Quantidade planejada';


--
-- Name: COLUMN production_orders.quantity_produced; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.quantity_produced IS 'Quantidade produzida';


--
-- Name: COLUMN production_orders.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.due_date IS 'Prazo final';


--
-- Name: COLUMN production_orders.sales_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.sales_order_id IS 'FK → sales.id (pedido de venda associado)';


--
-- Name: COLUMN production_orders.responsible_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.responsible_id IS 'FK → employees.id (responsável)';


--
-- Name: COLUMN production_orders.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.created_by IS 'FK → users.id (criador)';


--
-- Name: COLUMN production_orders.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.item_id IS 'FK → items.id (Fase 4.4 expand-contract)';


--
-- Name: COLUMN production_orders.quantity_scrapped; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.quantity_scrapped IS 'Quantidade refugada na conclusao da OP (nao entra em estoque nem em quantity_produced).';


--
-- Name: COLUMN production_orders.scrap_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.scrap_reason IS 'Motivo do refugo registrado na conclusao da OP.';


--
-- Name: COLUMN production_orders.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_orders.department_id IS 'FK -> departments.id. Departamento dono da OP para agregacao no painel de TV (nullable; historico legado fica NULL/"Sem departamento" por design, ver migration).';


--
-- Name: production_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_orders_id_seq OWNED BY public.production_orders.id;


--
-- Name: production_route_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_route_steps (
    id integer NOT NULL,
    production_route_id integer NOT NULL,
    sequence integer NOT NULL,
    step_code character varying(50) NOT NULL,
    name character varying(120) NOT NULL,
    work_center character varying(100),
    standard_time_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    setup_time_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    instructions text,
    quality_check_required boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    work_center_id integer
);


--
-- Name: COLUMN production_route_steps.production_route_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_route_steps.production_route_id IS 'FK -> production_routes.id';


--
-- Name: COLUMN production_route_steps.sequence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_route_steps.sequence IS 'G5: ordem da operacao, obrigatoriamente 1..N contigua e sem repeticao dentro do roteiro (validada em productionRouteRules.normalizeAndValidateSteps; unicidade tambem no indice production_route_steps(production_route_id, sequence)).';


--
-- Name: COLUMN production_route_steps.step_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_route_steps.step_code IS 'Codigo da etapa';


--
-- Name: COLUMN production_route_steps.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_route_steps.name IS 'Nome da etapa';


--
-- Name: COLUMN production_route_steps.work_center; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_route_steps.work_center IS 'Posto/centro de trabalho';


--
-- Name: production_route_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_route_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_route_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_route_steps_id_seq OWNED BY public.production_route_steps.id;


--
-- Name: production_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_routes (
    id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    route_code character varying(50) NOT NULL,
    revision character varying(10) DEFAULT '00'::character varying NOT NULL,
    status public.enum_production_routes_status DEFAULT 'draft'::public.enum_production_routes_status NOT NULL,
    description text,
    total_standard_time_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    created_by integer,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN production_routes.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.product_id IS 'FK -> products.id (legacy)';


--
-- Name: COLUMN production_routes.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.item_id IS 'FK -> items.id (Fase 4.8 expand-contract)';


--
-- Name: COLUMN production_routes.route_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.route_code IS 'Codigo unico do roteiro';


--
-- Name: COLUMN production_routes.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.revision IS 'G5: revisao do roteiro, unica por produto (indice unico product_id+revision). Alterar roteiro liberado exige NOVA revisao (POST /api/production/routes/:id/revise), preservando as etapas que as OPs em andamento referenciam.';


--
-- Name: COLUMN production_routes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.status IS 'G5: ciclo de vida do roteiro. draft = editavel; active = liberado e CONGELADO (so 1 por produto, ver uq_production_routes_active_per_product); inactive = aposentado (reversivel); superseded = substituido por revisao mais nova (final).';


--
-- Name: COLUMN production_routes.total_standard_time_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.total_standard_time_minutes IS 'G5: soma de standard_time_minutes das etapas ATIVAS (tempo padrao por unidade). NAO inclui setup_time_minutes, que e tempo por lote — mesma convencao do OEE (GetOeeReportUseCase).';


--
-- Name: COLUMN production_routes.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.created_by IS 'FK -> users.id';


--
-- Name: COLUMN production_routes.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.approved_by IS 'FK -> users.id';


--
-- Name: production_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_routes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_routes_id_seq OWNED BY public.production_routes.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category_id integer,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    quantity numeric(18,6) DEFAULT 0 NOT NULL,
    reserved_quantity numeric(18,6) DEFAULT 0 NOT NULL,
    min_quantity numeric(18,6) DEFAULT 5 NOT NULL,
    status public.enum_products_status DEFAULT 'active'::public.enum_products_status NOT NULL,
    location character varying(100) DEFAULT ''::character varying NOT NULL,
    product_type public.enum_products_product_type DEFAULT 'finished'::public.enum_products_product_type NOT NULL,
    ncm character varying(10) DEFAULT '85182100'::character varying NOT NULL,
    cest character varying(10),
    weight numeric(10,3) DEFAULT 0 NOT NULL,
    unit character varying(10) DEFAULT 'un'::character varying NOT NULL,
    lead_time integer DEFAULT 0 NOT NULL,
    drawing_number character varying(50),
    lot_number character varying(50),
    serial_number character varying(80),
    revision character varying(10) DEFAULT '00'::character varying NOT NULL,
    ts_params_fs numeric(10,2),
    ts_params_qms numeric(10,2),
    ts_params_qes numeric(10,2),
    ts_params_qts numeric(10,2),
    ts_params_vas numeric(10,2),
    ts_params_sd numeric(10,2),
    ts_params_xmax numeric(10,2),
    ts_params_re numeric(10,2),
    ts_params_le numeric(10,2),
    ts_params_bl numeric(10,2),
    ts_params_mms numeric(10,2),
    ts_params_cms numeric(10,2),
    ts_params_spl numeric(10,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    photo_path character varying(500)
);


--
-- Name: COLUMN products.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.name IS 'Nome do produto';


--
-- Name: COLUMN products.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.code IS 'Código/SKU único';


--
-- Name: COLUMN products.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.description IS 'Descrição detalhada';


--
-- Name: COLUMN products.category_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.category_id IS 'FK → product_categories.id';


--
-- Name: COLUMN products.price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.price IS 'Preço de venda';


--
-- Name: COLUMN products.cost_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.cost_price IS 'Preço de custo';


--
-- Name: COLUMN products.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.quantity IS 'Estoque atual';


--
-- Name: COLUMN products.reserved_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.reserved_quantity IS 'CACHE DERIVADO (G3, 2026-08-09) - somatorio de production_order_reservations.quantity - quantity_released das reservas ativas do produto, atualizado na mesma transacao. NAO alterar diretamente: use inventoryService.reserve / releaseReservation / releaseAllReservationsForOrder.';


--
-- Name: COLUMN products.min_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.min_quantity IS 'Estoque mínimo para alerta';


--
-- Name: COLUMN products.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.status IS 'Status do produto';


--
-- Name: COLUMN products.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.location IS 'Localização física no estoque';


--
-- Name: COLUMN products.product_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.product_type IS 'Tipo: acabado, subconjunto, componente ou matéria-prima';


--
-- Name: COLUMN products.ncm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.ncm IS 'Nomenclatura Comum do Mercosul';


--
-- Name: COLUMN products.weight; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.weight IS 'Peso em kg';


--
-- Name: COLUMN products.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.unit IS 'Unidade de medida';


--
-- Name: COLUMN products.lead_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.lead_time IS 'Lead time em dias';


--
-- Name: COLUMN products.lot_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.lot_number IS 'Lote de rastreabilidade industrial';


--
-- Name: COLUMN products.serial_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.serial_number IS 'Numero de serie para rastreabilidade';


--
-- Name: COLUMN products.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.revision IS 'Revisão técnica';


--
-- Name: COLUMN products.photo_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.photo_path IS 'Caminho relativo (uploads/products/...) da foto do produto';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_order_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_approvals (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    approver_user_id integer NOT NULL,
    approver_role public.enum_purchase_order_approvals_approver_role NOT NULL,
    approved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: purchase_order_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_approvals_id_seq OWNED BY public.purchase_order_approvals.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0 NOT NULL,
    status public.enum_purchase_order_items_status DEFAULT 'pending'::public.enum_purchase_order_items_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN purchase_order_items.purchase_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.purchase_id IS 'FK → purchase_orders.id';


--
-- Name: COLUMN purchase_order_items.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.product_id IS 'FK → products.id';


--
-- Name: COLUMN purchase_order_items.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.item_id IS 'FK → items.id (expand-contract Fase 4.2)';


--
-- Name: COLUMN purchase_order_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.quantity IS 'Quantidade pedida';


--
-- Name: COLUMN purchase_order_items.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.unit_price IS 'Preço unitário';


--
-- Name: COLUMN purchase_order_items.total_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.total_price IS 'Total (qtd × preço)';


--
-- Name: COLUMN purchase_order_items.received_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_order_items.received_quantity IS 'Quantidade já recebida';


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    supplier_id integer NOT NULL,
    requester_id integer,
    status public.enum_purchase_orders_status DEFAULT 'pending'::public.enum_purchase_orders_status NOT NULL,
    requisition_id integer,
    order_date date NOT NULL,
    expected_date date,
    delivery_date date,
    freight_type public.enum_purchase_orders_freight_type,
    freight_value numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    invoice_number character varying(50),
    invoice_date date,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    nfe_key character varying(50),
    nfe_series character varying(10),
    nfe_xml_path character varying(500),
    nfe_registered_by integer,
    nfe_registered_at timestamp with time zone,
    invoice_type public.enum_purchase_orders_invoice_type,
    origin public.enum_purchase_orders_origin DEFAULT 'national'::public.enum_purchase_orders_origin NOT NULL
);


--
-- Name: COLUMN purchase_orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.order_number IS 'Nº do pedido (PO-timestamp)';


--
-- Name: COLUMN purchase_orders.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.supplier_id IS 'FK → suppliers.id';


--
-- Name: COLUMN purchase_orders.requester_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.requester_id IS 'FK → users.id (solicitante)';


--
-- Name: COLUMN purchase_orders.freight_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.freight_type IS 'CIF=fornecedor responsável, FOB=comprador responsável';


--
-- Name: COLUMN purchase_orders.total_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.total_amount IS 'Valor total do pedido';


--
-- Name: COLUMN purchase_orders.nfe_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.nfe_key IS 'Chave de acesso (44 digitos) da NF-e de entrada';


--
-- Name: COLUMN purchase_orders.nfe_xml_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.nfe_xml_path IS 'Caminho do XML da NF-e de entrada armazenado (upload manual)';


--
-- Name: COLUMN purchase_orders.nfe_registered_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.nfe_registered_by IS 'FK -> users.id (quem registrou a NFe de entrada)';


--
-- Name: COLUMN purchase_orders.invoice_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.invoice_type IS 'Tipo de nota vinculada: nfe (mercadoria) ou nfse (servico/licenca digital)';


--
-- Name: COLUMN purchase_orders.origin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.origin IS 'G11: origem declarada da compra (national|import). Escalation-only: so torna a alcada mais restritiva; fornecedor estrangeiro (suppliers.is_foreign) prevalece sobre national.';


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: purchase_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_receipts (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    received_by integer,
    received_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN purchase_receipts.purchase_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_receipts.purchase_id IS 'FK -> purchase_orders.id';


--
-- Name: COLUMN purchase_receipts.invoice_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_receipts.invoice_number IS 'Numero da NF-e do fornecedor referente a este recebimento';


--
-- Name: COLUMN purchase_receipts.received_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_receipts.received_by IS 'FK -> users.id';


--
-- Name: purchase_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_receipts_id_seq OWNED BY public.purchase_receipts.id;


--
-- Name: purchase_requisition_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisition_items (
    id integer NOT NULL,
    requisition_id integer NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit character varying(12),
    required_date date,
    suggested_supplier_id integer,
    unit_price_estimated numeric(14,2),
    status public.enum_purchase_requisition_items_status DEFAULT 'pending'::public.enum_purchase_requisition_items_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: purchase_requisition_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisition_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisition_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisition_items_id_seq OWNED BY public.purchase_requisition_items.id;


--
-- Name: purchase_requisitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requisitions (
    id integer NOT NULL,
    requisition_number character varying(60) NOT NULL,
    requester_id integer NOT NULL,
    department_id integer,
    production_order_id integer,
    request_date date DEFAULT CURRENT_DATE NOT NULL,
    priority public.enum_purchase_requisitions_priority DEFAULT 'normal'::public.enum_purchase_requisitions_priority NOT NULL,
    status public.enum_purchase_requisitions_status DEFAULT 'pending'::public.enum_purchase_requisitions_status NOT NULL,
    origin character varying(80) DEFAULT 'manual'::character varying NOT NULL,
    approved_by integer,
    approval_date date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    engineering_project_id integer
);


--
-- Name: COLUMN purchase_requisitions.engineering_project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_requisitions.engineering_project_id IS 'FK -> engineering_projects.id (opcional) — vinculo da requisicao de amostra ao projeto de P&D (UC-39, Bloco 2)';


--
-- Name: purchase_requisitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requisitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requisitions_id_seq OWNED BY public.purchase_requisitions.id;


--
-- Name: quality_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_inspections (
    id integer NOT NULL,
    inspection_number character varying(30) NOT NULL,
    lot_id integer NOT NULL,
    stage public.enum_quality_inspections_stage DEFAULT 'incoming'::public.enum_quality_inspections_stage NOT NULL,
    acceptance_criteria text NOT NULL,
    sampling_plan character varying(120),
    lot_size numeric(12,4),
    sample_size numeric(12,4),
    defects_found integer DEFAULT 0 NOT NULL,
    verdict public.enum_quality_inspections_verdict NOT NULL,
    concession_justification text,
    non_conformity_id integer,
    inspector_id integer NOT NULL,
    inspected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE quality_inspections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.quality_inspections IS 'G7: registro de inspecao de qualidade por lote. Evidencia exigida pela ISO 9001:2015 8.6 (criterio de aceitacao, resultado, responsavel) e 8.7 (aceitacao sob concessao). Uma inspecao aprovada e pre-condicao para POST /api/inventory/lots/:id/release.';


--
-- Name: COLUMN quality_inspections.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.lot_id IS 'FK -> lot_controls.id. Toda inspecao e sobre um lote — e o vinculo que torna a liberacao rastreavel.';


--
-- Name: COLUMN quality_inspections.stage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.stage IS 'Estagio da inspecao: incoming (recebimento), in_process (processo), final (produto acabado).';


--
-- Name: COLUMN quality_inspections.acceptance_criteria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.acceptance_criteria IS 'ISO 9001 8.6: criterio de aceitacao contra o qual o lote foi verificado. Texto livre obrigatorio — a Engenharia da Qualidade ainda nao definiu niveis de inspecao/AQL (ISO 2859-1), e o ERP nao inventa esses numeros.';


--
-- Name: COLUMN quality_inspections.sampling_plan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.sampling_plan IS 'Plano de amostragem aplicado (ex.: "ISO 2859-1 nivel II, AQL 1,0"). OPCIONAL e sem efeito de calculo: nao existe motor Ac/Re neste ERP ate a Engenharia da Qualidade definir os numeros.';


--
-- Name: COLUMN quality_inspections.verdict; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.verdict IS 'Veredito do inspetor: approved | rejected | approved_under_concession. Concessao (ISO 9001 8.7) exige concession_justification.';


--
-- Name: COLUMN quality_inspections.concession_justification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.concession_justification IS 'ISO 9001 8.7: justificativa obrigatoria da aceitacao sob concessao. NULL nos demais vereditos.';


--
-- Name: COLUMN quality_inspections.non_conformity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.non_conformity_id IS 'FK -> non_conformities.id aberta automaticamente quando verdict = rejected (mesmo caminho do G8/G10, que ja bloqueia o lote).';


--
-- Name: COLUMN quality_inspections.inspector_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quality_inspections.inspector_id IS 'FK -> users.id. SEMPRE do JWT (req.user.id), nunca do body — anti-spoofing e regra P0 do projeto.';


--
-- Name: quality_inspections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quality_inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quality_inspections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quality_inspections_id_seq OWNED BY public.quality_inspections.id;


--
-- Name: requisicao_compra_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisicao_compra_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requisicao_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantidade numeric(18,6) NOT NULL,
    data_necessidade date NOT NULL,
    observacoes text,
    CONSTRAINT ck_req_items_quantidade CHECK ((quantidade > (0)::numeric))
);


--
-- Name: TABLE requisicao_compra_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requisicao_compra_items IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: requisicoes_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisicoes_compra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(60) NOT NULL,
    solicitante_id integer,
    status public.ordem_status DEFAULT 'RASCUNHO'::public.ordem_status NOT NULL,
    origem character varying(80) DEFAULT 'ENGENHARIA'::character varying NOT NULL,
    observacoes text,
    aprovado_por integer,
    aprovado_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE requisicoes_compra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requisicoes_compra IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN requisicoes_compra.solicitante_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisicoes_compra.solicitante_id IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela requisicoes_compra e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: COLUMN requisicoes_compra.aprovado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisicoes_compra.aprovado_por IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela requisicoes_compra e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: rfq_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_items (
    id integer NOT NULL,
    rfq_id integer NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit character varying(12),
    awarded_supplier_id integer,
    awarded_unit_price numeric(18,6),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN rfq_items.awarded_supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfq_items.awarded_supplier_id IS 'Preenchido em POST /api/rfqs/:id/award — fornecedor vencedor deste item';


--
-- Name: COLUMN rfq_items.awarded_unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfq_items.awarded_unit_price IS 'Preco unitario cotado do vencedor, congelado no momento da adjudicacao';


--
-- Name: rfq_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfq_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfq_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfq_items_id_seq OWNED BY public.rfq_items.id;


--
-- Name: rfq_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_quotes (
    id integer NOT NULL,
    rfq_item_id integer NOT NULL,
    supplier_id integer NOT NULL,
    unit_price numeric(18,6) NOT NULL,
    lead_time_days integer,
    moq numeric(18,6),
    validity_date date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN rfq_quotes.validity_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfq_quotes.validity_date IS 'Validade da cotacao informada pelo fornecedor';


--
-- Name: rfq_quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfq_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfq_quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfq_quotes_id_seq OWNED BY public.rfq_quotes.id;


--
-- Name: rfq_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfq_suppliers (
    id integer NOT NULL,
    rfq_id integer NOT NULL,
    supplier_id integer NOT NULL,
    status public.enum_rfq_suppliers_status DEFAULT 'invited'::public.enum_rfq_suppliers_status NOT NULL,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: rfq_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfq_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfq_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfq_suppliers_id_seq OWNED BY public.rfq_suppliers.id;


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfqs (
    id integer NOT NULL,
    rfq_number character varying(60) NOT NULL,
    requisition_id integer,
    status public.enum_rfqs_status DEFAULT 'draft'::public.enum_rfqs_status NOT NULL,
    created_by integer NOT NULL,
    response_deadline date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN rfqs.rfq_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfqs.rfq_number IS 'Numero da cotacao, formato RFQ-<ano>-XXXX';


--
-- Name: COLUMN rfqs.requisition_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfqs.requisition_id IS 'FK opcional -> purchase_requisitions.id (RFQ pode nascer de requisicao ou avulsa)';


--
-- Name: COLUMN rfqs.response_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rfqs.response_deadline IS 'Prazo de resposta dos fornecedores convidados';


--
-- Name: rfqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rfqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rfqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rfqs_id_seq OWNED BY public.rfqs.id;


--
-- Name: sale_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_invoices (
    id integer NOT NULL,
    sale_id integer NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    nfe_number character varying(50),
    nfe_series integer,
    nfe_environment public.enum_sale_invoices_nfe_environment,
    nfe_provider public.enum_sale_invoices_nfe_provider NOT NULL,
    nfe_status public.enum_sale_invoices_nfe_status DEFAULT 'processing'::public.enum_sale_invoices_nfe_status NOT NULL,
    nfe_key character varying(50),
    nfe_protocol character varying(50),
    nfe_provider_ref character varying(100) NOT NULL,
    nfe_xml_url character varying(500),
    nfe_danfe_url character varying(500),
    nfe_error_message text,
    nfe_issued_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sale_invoices.items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_invoices.items IS 'Snapshot dos itens/quantidades/tributos desta emissao especifica';


--
-- Name: COLUMN sale_invoices.nfe_provider_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_invoices.nfe_provider_ref IS 'Referencia unica desta emissao, formato sale-{saleId}-{series}-{number}';


--
-- Name: sale_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_invoices_id_seq OWNED BY public.sale_invoices.id;


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id integer NOT NULL,
    sale_id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    quantity numeric(18,6) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cfop character varying(4),
    icms_cst character varying(3),
    icms_aliquot numeric(5,2),
    icms_base numeric(12,2),
    icms_value numeric(12,2),
    ipi_cst character varying(3),
    ipi_aliquot numeric(5,2),
    ipi_value numeric(12,2),
    pis_cst character varying(3),
    pis_aliquot numeric(5,2),
    pis_value numeric(12,2),
    cofins_cst character varying(3),
    cofins_aliquot numeric(5,2),
    cofins_value numeric(12,2),
    invoiced_quantity numeric(18,6) DEFAULT 0 NOT NULL
);


--
-- Name: COLUMN sale_items.sale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.sale_id IS 'FK → sales.id';


--
-- Name: COLUMN sale_items.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.product_id IS 'FK → products.id (LEGADO)';


--
-- Name: COLUMN sale_items.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.item_id IS 'FK → items.id (NOVO, parallel to product_id)';


--
-- Name: COLUMN sale_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.quantity IS 'Quantidade vendida';


--
-- Name: COLUMN sale_items.unit_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.unit_price IS 'Preço unitário';


--
-- Name: COLUMN sale_items.total_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.total_price IS 'Total (qtd × preço)';


--
-- Name: COLUMN sale_items.cfop; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.cfop IS 'Codigo Fiscal de Operacoes e Prestacoes';


--
-- Name: COLUMN sale_items.icms_cst; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.icms_cst IS 'Codigo de Situacao Tributaria do ICMS';


--
-- Name: COLUMN sale_items.icms_aliquot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.icms_aliquot IS 'Aliquota de ICMS aplicada (%)';


--
-- Name: COLUMN sale_items.icms_base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.icms_base IS 'Base de calculo do ICMS';


--
-- Name: COLUMN sale_items.icms_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.icms_value IS 'Valor do ICMS';


--
-- Name: COLUMN sale_items.ipi_cst; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.ipi_cst IS 'Codigo de Situacao Tributaria do IPI';


--
-- Name: COLUMN sale_items.ipi_aliquot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.ipi_aliquot IS 'Aliquota de IPI aplicada (%)';


--
-- Name: COLUMN sale_items.ipi_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.ipi_value IS 'Valor do IPI';


--
-- Name: COLUMN sale_items.pis_cst; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.pis_cst IS 'Codigo de Situacao Tributaria do PIS';


--
-- Name: COLUMN sale_items.pis_aliquot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.pis_aliquot IS 'Aliquota de PIS aplicada (%)';


--
-- Name: COLUMN sale_items.pis_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.pis_value IS 'Valor do PIS';


--
-- Name: COLUMN sale_items.cofins_cst; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.cofins_cst IS 'Codigo de Situacao Tributaria do COFINS';


--
-- Name: COLUMN sale_items.cofins_aliquot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.cofins_aliquot IS 'Aliquota de COFINS aplicada (%)';


--
-- Name: COLUMN sale_items.cofins_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.cofins_value IS 'Valor do COFINS';


--
-- Name: COLUMN sale_items.invoiced_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sale_items.invoiced_quantity IS 'Quantidade ja faturada (NF-e emitida) deste item, cumulativa entre emissoes parciais. quantity - invoiced_quantity = saldo pendente.';


--
-- Name: sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_items_id_seq OWNED BY public.sale_items.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    status public.enum_sales_status DEFAULT 'quote'::public.enum_sales_status NOT NULL,
    payment_method public.enum_sales_payment_method DEFAULT 'pix'::public.enum_sales_payment_method NOT NULL,
    installments integer DEFAULT 1 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    nfe_number character varying(50),
    nfe_status public.enum_sales_nfe_status DEFAULT 'pending'::public.enum_sales_nfe_status NOT NULL,
    nfe_key character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    nfe_series integer,
    nfe_protocol character varying(50),
    nfe_environment public.enum_sales_nfe_environment,
    nfe_provider_ref character varying(100),
    nfe_xml_url character varying(500),
    nfe_danfe_url character varying(500),
    nfe_error_message text,
    nfe_issued_at timestamp with time zone
);


--
-- Name: COLUMN sales.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.customer_id IS 'FK → clients.id';


--
-- Name: COLUMN sales.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.user_id IS 'FK → users.id (vendedor)';


--
-- Name: COLUMN sales.total_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.total_amount IS 'Valor total da venda';


--
-- Name: COLUMN sales.discount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.discount IS 'Desconto concedido';


--
-- Name: COLUMN sales.installments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.installments IS 'Número de parcelas';


--
-- Name: COLUMN sales.nfe_series; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_series IS 'Serie da NF-e emitida';


--
-- Name: COLUMN sales.nfe_protocol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_protocol IS 'Protocolo de autorizacao SEFAZ';


--
-- Name: COLUMN sales.nfe_environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_environment IS 'Ambiente em que a NF-e foi emitida';


--
-- Name: COLUMN sales.nfe_provider_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_provider_ref IS 'Referencia externa usada no provedor (idempotencia da emissao)';


--
-- Name: COLUMN sales.nfe_xml_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_xml_url IS 'URL do XML autorizado (fornecida pelo provedor)';


--
-- Name: COLUMN sales.nfe_danfe_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_danfe_url IS 'URL do PDF do DANFE (fornecida pelo provedor)';


--
-- Name: COLUMN sales.nfe_error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_error_message IS 'Ultima mensagem de erro/rejeicao da SEFAZ, se houver';


--
-- Name: COLUMN sales.nfe_issued_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales.nfe_issued_at IS 'Data/hora da autorizacao';


--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: serial_numbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.serial_numbers (
    id integer NOT NULL,
    product_id integer NOT NULL,
    item_id uuid,
    lot_control_id integer,
    production_order_id integer,
    sale_id integer,
    serial_number character varying(120) NOT NULL,
    status public.enum_serial_numbers_status DEFAULT 'available'::public.enum_serial_numbers_status NOT NULL,
    manufactured_at date,
    sold_at date,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN serial_numbers.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.product_id IS 'FK -> products.id (legado)';


--
-- Name: COLUMN serial_numbers.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.item_id IS 'FK -> items.id (novo UUID)';


--
-- Name: COLUMN serial_numbers.lot_control_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.lot_control_id IS 'FK -> lot_controls.id';


--
-- Name: COLUMN serial_numbers.production_order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.production_order_id IS 'FK -> production_orders.id';


--
-- Name: COLUMN serial_numbers.sale_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.sale_id IS 'FK -> sales.id';


--
-- Name: serial_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.serial_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: serial_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.serial_numbers_id_seq OWNED BY public.serial_numbers.id;


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    client_id integer NOT NULL,
    product_id integer,
    equipment_description text,
    reported_issue text,
    diagnosed_issue text,
    service_performed text,
    labor_cost numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    status public.enum_service_orders_status DEFAULT 'open'::public.enum_service_orders_status NOT NULL,
    priority public.enum_service_orders_priority DEFAULT 'normal'::public.enum_service_orders_priority NOT NULL,
    entry_date date NOT NULL,
    completion_date date,
    delivery_date date,
    technician_id integer,
    responsible_id integer,
    warranty_days integer DEFAULT 90 NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN service_orders.order_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.order_number IS 'Nº da OS';


--
-- Name: COLUMN service_orders.client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.client_id IS 'FK → clients.id';


--
-- Name: COLUMN service_orders.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.product_id IS 'FK → products.id';


--
-- Name: COLUMN service_orders.technician_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.technician_id IS 'FK → users.id';


--
-- Name: COLUMN service_orders.responsible_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.responsible_id IS 'FK → users.id';


--
-- Name: COLUMN service_orders.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.service_orders.created_by IS 'FK → users.id';


--
-- Name: service_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_orders_id_seq OWNED BY public.service_orders.id;


--
-- Name: sst_acidente_complementos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_acidente_complementos (
    id integer NOT NULL,
    acidente_id integer NOT NULL,
    campo public.enum_sst_acidente_complementos_campo NOT NULL,
    valor_anterior character varying(50),
    valor_novo character varying(50) NOT NULL,
    motivo text NOT NULL,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_acidente_complementos.campo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidente_complementos.campo IS 'Única coluna que o trigger sst_lock_acidente permite atualizar em sst_acidentes após confirmado';


--
-- Name: sst_acidente_complementos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_acidente_complementos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_acidente_complementos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_acidente_complementos_id_seq OWNED BY public.sst_acidente_complementos.id;


--
-- Name: sst_acidente_testemunhas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_acidente_testemunhas (
    id integer NOT NULL,
    acidente_id integer NOT NULL,
    employee_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_acidente_testemunhas.acidente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidente_testemunhas.acidente_id IS 'CASCADE: lista de testemunhas não sobrevive à remoção do acidente (não deveria acontecer na prática, pois acidente é imutável/retido 20 anos, mas mantém o join coerente)';


--
-- Name: sst_acidente_testemunhas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_acidente_testemunhas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_acidente_testemunhas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_acidente_testemunhas_id_seq OWNED BY public.sst_acidente_testemunhas.id;


--
-- Name: sst_acidentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_acidentes (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    data_hora timestamp with time zone NOT NULL,
    tipo public.enum_sst_acidentes_tipo NOT NULL,
    setor_local character varying(150) NOT NULL,
    descricao text NOT NULL,
    parte_corpo_atingida character varying(100),
    agente_causador character varying(150),
    gravidade public.enum_sst_acidentes_gravidade NOT NULL,
    dias_perdidos integer DEFAULT 0 NOT NULL,
    houve_cat boolean DEFAULT false NOT NULL,
    justificativa_sem_cat text,
    confirmado boolean DEFAULT false NOT NULL,
    confirmado_em timestamp with time zone,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_acidentes_dias_perdidos_nao_negativo CHECK ((dias_perdidos >= 0))
);


--
-- Name: COLUMN sst_acidentes.dias_perdidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidentes.dias_perdidos IS 'Atualizável mesmo após confirmado (ver nota de imutabilidade no cabeçalho)';


--
-- Name: COLUMN sst_acidentes.houve_cat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidentes.houve_cat IS 'Atualizável mesmo após confirmado — setado quando a 1ª CAT é emitida';


--
-- Name: COLUMN sst_acidentes.justificativa_sem_cat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidentes.justificativa_sem_cat IS 'RF-SST-025/BR-SST-016: obrigatória quando gravidade=sem_afastamento e o Técnico SST decide não emitir CAT';


--
-- Name: COLUMN sst_acidentes.confirmado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acidentes.confirmado IS 'false=rascunho, true=confirmado (imutável exceto dias_perdidos/houve_cat, trigger sst_lock_acidente)';


--
-- Name: sst_acidentes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_acidentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_acidentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_acidentes_id_seq OWNED BY public.sst_acidentes.id;


--
-- Name: sst_acoes_corretivas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_acoes_corretivas (
    id integer NOT NULL,
    origem_tipo public.enum_sst_acoes_corretivas_origem_tipo NOT NULL,
    origem_id integer NOT NULL,
    descricao text NOT NULL,
    responsavel_id integer NOT NULL,
    prazo date NOT NULL,
    status public.enum_sst_acoes_corretivas_status DEFAULT 'aberta'::public.enum_sst_acoes_corretivas_status NOT NULL,
    evidencia_conclusao_url character varying(255),
    concluida_em timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_acoes_corretivas.origem_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acoes_corretivas.origem_tipo IS 'Entidade de origem (polimórfica, ver nota de exceção no cabeçalho do arquivo)';


--
-- Name: COLUMN sst_acoes_corretivas.origem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_acoes_corretivas.origem_id IS 'PK da entidade de origem, sem FK de banco (ver nota polimórfica)';


--
-- Name: sst_acoes_corretivas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_acoes_corretivas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_acoes_corretivas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_acoes_corretivas_id_seq OWNED BY public.sst_acoes_corretivas.id;


--
-- Name: sst_asos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_asos (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    tipo public.enum_sst_asos_tipo NOT NULL,
    data_realizacao date NOT NULL,
    resultado public.enum_sst_asos_resultado NOT NULL,
    restricoes text,
    medico_examinador character varying(150) NOT NULL,
    medico_coordenador_pcmso character varying(150),
    data_vencimento date,
    arquivo_url character varying(255),
    status_esocial_s2220 public.enum_sst_asos_status_esocial_s2220 DEFAULT 'pendente'::public.enum_sst_asos_status_esocial_s2220 NOT NULL,
    recibo_esocial character varying(80),
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_asos.restricoes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_asos.restricoes IS 'Dado clinico sensivel (LGPD) — preenchido quando resultado = apto_com_restricoes';


--
-- Name: COLUMN sst_asos.medico_examinador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_asos.medico_examinador IS 'Nome/CRM do médico examinador';


--
-- Name: COLUMN sst_asos.data_vencimento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_asos.data_vencimento IS 'Vencimento do próximo ASO periódico, calculado em app a partir de sst_planos_exames (BR-SST-011)';


--
-- Name: sst_asos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_asos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_asos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_asos_id_seq OWNED BY public.sst_asos.id;


--
-- Name: sst_brigadistas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_brigadistas (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    data_formacao date NOT NULL,
    validade_reciclagem date,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_brigadistas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_brigadistas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_brigadistas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_brigadistas_id_seq OWNED BY public.sst_brigadistas.id;


--
-- Name: sst_candidatos_cipa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_candidatos_cipa (
    id integer NOT NULL,
    processo_eleitoral_id integer NOT NULL,
    employee_id integer NOT NULL,
    votos integer DEFAULT 0 NOT NULL,
    eleito boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_candidatos_cipa.processo_eleitoral_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_candidatos_cipa.processo_eleitoral_id IS 'CASCADE: lista de candidatos não sobrevive à remoção do processo eleitoral (registro preparatório, diferente do mandato/membro já efetivado)';


--
-- Name: sst_candidatos_cipa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_candidatos_cipa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_candidatos_cipa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_candidatos_cipa_id_seq OWNED BY public.sst_candidatos_cipa.id;


--
-- Name: sst_cats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_cats (
    id integer NOT NULL,
    acidente_id integer NOT NULL,
    numero_cat character varying(60),
    tipo public.enum_sst_cats_tipo NOT NULL,
    data_emissao date NOT NULL,
    prazo_limite date NOT NULL,
    emitente_id integer NOT NULL,
    status_esocial_s2210 public.enum_sst_cats_status_esocial_s2210 DEFAULT 'pendente'::public.enum_sst_cats_status_esocial_s2210 NOT NULL,
    recibo_esocial character varying(80),
    data_envio_esocial timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_cats.numero_cat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_cats.numero_cat IS 'Número/recibo da CAT no eSocial, preenchido quando aceito';


--
-- Name: COLUMN sst_cats.prazo_limite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_cats.prazo_limite IS '1º dia útil seguinte à ocorrência, imediato (mesmo dia) em óbito — calculado em app (RNF-SST-04)';


--
-- Name: COLUMN sst_cats.emitente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_cats.emitente_id IS 'Usuário (Técnico SST) que emitiu a CAT';


--
-- Name: sst_cats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_cats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_cats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_cats_id_seq OWNED BY public.sst_cats.id;


--
-- Name: sst_dds_presencas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_dds_presencas (
    id integer NOT NULL,
    registro_dds_id integer NOT NULL,
    employee_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_dds_presencas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_dds_presencas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_dds_presencas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_dds_presencas_id_seq OWNED BY public.sst_dds_presencas.id;


--
-- Name: sst_devolucoes_epi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_devolucoes_epi (
    id integer NOT NULL,
    entrega_epi_id integer NOT NULL,
    data_devolucao date NOT NULL,
    condicao character varying(255) NOT NULL,
    registrado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_devolucoes_epi.condicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_devolucoes_epi.condicao IS 'Estado do EPI devolvido (ex.: danificado, extraviado, reutilizável)';


--
-- Name: sst_devolucoes_epi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_devolucoes_epi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_devolucoes_epi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_devolucoes_epi_id_seq OWNED BY public.sst_devolucoes_epi.id;


--
-- Name: sst_entregas_epi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_entregas_epi (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    tipo_epi_id integer NOT NULL,
    quantidade numeric(18,6) NOT NULL,
    data_entrega date NOT NULL,
    motivo public.enum_sst_entregas_epi_motivo NOT NULL,
    data_prevista_troca date,
    evidencia_tipo public.enum_sst_entregas_epi_evidencia_tipo,
    evidencia_arquivo_url character varying(255),
    confirmada boolean DEFAULT false NOT NULL,
    confirmada_em timestamp with time zone,
    inventory_movement_id integer,
    entregue_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_entregas_epi_quantidade_positiva CHECK ((quantidade > (0)::numeric))
);


--
-- Name: COLUMN sst_entregas_epi.data_prevista_troca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_entregas_epi.data_prevista_troca IS 'Calculada em app: data_entrega + tipo_epi.vida_util_dias (BR-SST-004)';


--
-- Name: COLUMN sst_entregas_epi.evidencia_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_entregas_epi.evidencia_tipo IS 'Preenchido só na confirmação (BR-SST-002)';


--
-- Name: COLUMN sst_entregas_epi.confirmada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_entregas_epi.confirmada IS 'false=rascunho (editável), true=confirmada (imutável, trigger sst_lock_entrega_epi)';


--
-- Name: COLUMN sst_entregas_epi.inventory_movement_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_entregas_epi.inventory_movement_id IS 'Movimentação de saída gerada na confirmação, quando tipo_epi.item_id IS NOT NULL. NULL = TipoEPI ainda não rastreado como Item.';


--
-- Name: COLUMN sst_entregas_epi.entregue_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_entregas_epi.entregue_por IS 'Técnico SST responsável pela entrega';


--
-- Name: sst_entregas_epi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_entregas_epi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_entregas_epi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_entregas_epi_id_seq OWNED BY public.sst_entregas_epi.id;


--
-- Name: sst_estornos_entrega_epi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_estornos_entrega_epi (
    id integer NOT NULL,
    entrega_epi_id integer NOT NULL,
    motivo text NOT NULL,
    estornado_por integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_estornos_entrega_epi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_estornos_entrega_epi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_estornos_entrega_epi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_estornos_entrega_epi_id_seq OWNED BY public.sst_estornos_entrega_epi.id;


--
-- Name: sst_eventos_esocial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_eventos_esocial (
    id integer NOT NULL,
    tipo public.enum_sst_eventos_esocial_tipo NOT NULL,
    origem_tipo public.enum_sst_eventos_esocial_origem_tipo NOT NULL,
    origem_id integer NOT NULL,
    payload_referencia text,
    prazo_legal date,
    status public.enum_sst_eventos_esocial_status DEFAULT 'pendente'::public.enum_sst_eventos_esocial_status NOT NULL,
    recibo character varying(80),
    motivo_rejeicao text,
    data_envio timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_eventos_esocial.origem_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_eventos_esocial.origem_tipo IS 'cat->sst_cats, aso->sst_asos, ges_funcionario->sst_ges_funcionarios (ver nota polimórfica no cabeçalho)';


--
-- Name: COLUMN sst_eventos_esocial.payload_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_eventos_esocial.payload_referencia IS 'Snapshot/referência dos dados enviados (JSON serializado), para auditoria sem depender do estado atual da origem';


--
-- Name: COLUMN sst_eventos_esocial.prazo_legal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_eventos_esocial.prazo_legal IS 'Prazo calculado em app conforme calendário eSocial vigente (BR-SST-028/029, [VERIFICAR COM TÉCNICO SST DA EMPRESA])';


--
-- Name: sst_eventos_esocial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_eventos_esocial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_eventos_esocial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_eventos_esocial_id_seq OWNED BY public.sst_eventos_esocial.id;


--
-- Name: sst_exames_complementares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_exames_complementares (
    id integer NOT NULL,
    aso_id integer NOT NULL,
    tipo_exame character varying(80) NOT NULL,
    data_realizacao date NOT NULL,
    resultado_laudo_url character varying(255),
    alterado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_exames_complementares.aso_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_exames_complementares.aso_id IS 'CASCADE: exame complementar não tem existência fora do ASO pai (diferente das demais FKs do módulo, que são RESTRICT por serem registros históricos independentes)';


--
-- Name: COLUMN sst_exames_complementares.tipo_exame; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_exames_complementares.tipo_exame IS 'Ex.: audiometria, espirometria, hemograma, acuidade visual';


--
-- Name: COLUMN sst_exames_complementares.alterado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_exames_complementares.alterado IS 'true = resultado fora da normalidade';


--
-- Name: sst_exames_complementares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_exames_complementares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_exames_complementares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_exames_complementares_id_seq OWNED BY public.sst_exames_complementares.id;


--
-- Name: sst_ges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_ges (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_ges_funcionarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_ges_funcionarios (
    id integer NOT NULL,
    ges_id integer NOT NULL,
    employee_id integer NOT NULL,
    inicio_exposicao date NOT NULL,
    fim_exposicao date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_ges_funcionarios.inicio_exposicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_ges_funcionarios.inicio_exposicao IS 'Base do prazo de envio do S-2240 (BR-SST-028)';


--
-- Name: sst_ges_funcionarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_ges_funcionarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_ges_funcionarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_ges_funcionarios_id_seq OWNED BY public.sst_ges_funcionarios.id;


--
-- Name: sst_ges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_ges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_ges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_ges_id_seq OWNED BY public.sst_ges.id;


--
-- Name: sst_inspecao_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_inspecao_itens (
    id integer NOT NULL,
    inspecao_id integer NOT NULL,
    item_verificado character varying(200) NOT NULL,
    conforme boolean NOT NULL,
    observacao text,
    acao_corretiva_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_inspecao_itens.acao_corretiva_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_inspecao_itens.acao_corretiva_id IS 'Preenchida quando conforme = false (BR-SST-033: NC gera AcaoCorretiva obrigatória)';


--
-- Name: sst_inspecao_itens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_inspecao_itens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_inspecao_itens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_inspecao_itens_id_seq OWNED BY public.sst_inspecao_itens.id;


--
-- Name: sst_inspecoes_seguranca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_inspecoes_seguranca (
    id integer NOT NULL,
    department_id integer NOT NULL,
    data date NOT NULL,
    checklist_modelo character varying(150),
    inspetor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_inspecoes_seguranca.checklist_modelo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_inspecoes_seguranca.checklist_modelo IS 'Nome do checklist aplicado (ex.: extintores, proteção NR-12, sinalização NR-26)';


--
-- Name: sst_inspecoes_seguranca_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_inspecoes_seguranca_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_inspecoes_seguranca_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_inspecoes_seguranca_id_seq OWNED BY public.sst_inspecoes_seguranca.id;


--
-- Name: sst_investigacoes_acidente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_investigacoes_acidente (
    id integer NOT NULL,
    acidente_id integer NOT NULL,
    causas_identificadas text,
    participantes text,
    evidencias_urls text,
    concluida_em timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_investigacoes_acidente.acidente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_investigacoes_acidente.acidente_id IS 'unique: acidente tem zero-ou-uma investigação (entidade (b).9 do brief)';


--
-- Name: COLUMN sst_investigacoes_acidente.causas_identificadas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_investigacoes_acidente.causas_identificadas IS 'Lista de causas (árvore de causas), texto estruturado em app';


--
-- Name: COLUMN sst_investigacoes_acidente.participantes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_investigacoes_acidente.participantes IS 'Descrição livre dos participantes (SST + CIPA + liderança); vínculo formal por employee fica fora do MVP (baixo volume, sem necessidade de FK N:N no bloco P0)';


--
-- Name: COLUMN sst_investigacoes_acidente.evidencias_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_investigacoes_acidente.evidencias_urls IS 'Lista de URLs de evidência (fotos/depoimentos), serializada; sem tabela dedicada por volume baixo';


--
-- Name: sst_investigacoes_acidente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_investigacoes_acidente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_investigacoes_acidente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_investigacoes_acidente_id_seq OWNED BY public.sst_investigacoes_acidente.id;


--
-- Name: sst_mandatos_cipa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_mandatos_cipa (
    id integer NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    titulares_empregador integer NOT NULL,
    titulares_empregados integer NOT NULL,
    suplentes_empregador integer NOT NULL,
    suplentes_empregados integer NOT NULL,
    status public.enum_sst_mandatos_cipa_status DEFAULT 'eleicao_em_curso'::public.enum_sst_mandatos_cipa_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_mandatos_cipa_datas CHECK ((data_fim > data_inicio))
);


--
-- Name: COLUMN sst_mandatos_cipa.titulares_empregador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_mandatos_cipa.titulares_empregador IS 'Dimensionamento calculado (Quadro I NR-5) — nº titulares representantes do empregador';


--
-- Name: sst_mandatos_cipa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_mandatos_cipa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_mandatos_cipa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_mandatos_cipa_id_seq OWNED BY public.sst_mandatos_cipa.id;


--
-- Name: sst_matriz_epi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_matriz_epi (
    id integer NOT NULL,
    department_id integer,
    "position" character varying(100),
    tipo_epi_id integer NOT NULL,
    quantidade_padrao numeric(18,6) DEFAULT 1 NOT NULL,
    observacao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_matriz_epi_alvo_definido CHECK (((department_id IS NOT NULL) OR ("position" IS NOT NULL)))
);


--
-- Name: COLUMN sst_matriz_epi.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_matriz_epi.department_id IS 'Setor exigido (departamento). CASCADE: se o setor é removido do organograma, a exigência de EPI associada perde sentido (diferente de FKs de registro histórico, que são RESTRICT)';


--
-- Name: COLUMN sst_matriz_epi."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_matriz_epi."position" IS 'Função/cargo (employees.position, texto livre, sem tabela normalizada de cargos no projeto)';


--
-- Name: sst_matriz_epi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_matriz_epi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_matriz_epi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_matriz_epi_id_seq OWNED BY public.sst_matriz_epi.id;


--
-- Name: sst_matriz_treinamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_matriz_treinamento (
    id integer NOT NULL,
    "position" character varying(100) NOT NULL,
    norma public.enum_sst_matriz_treinamento_norma NOT NULL,
    periodicidade_reciclagem_meses integer,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_matriz_treinamento."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_matriz_treinamento."position" IS 'Função (employees.position)';


--
-- Name: COLUMN sst_matriz_treinamento.periodicidade_reciclagem_meses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_matriz_treinamento.periodicidade_reciclagem_meses IS 'NULL = sem reciclagem periódica exigida (ex.: treinamento único); NR-10 = 24 (bienal, confirmado)';


--
-- Name: sst_matriz_treinamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_matriz_treinamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_matriz_treinamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_matriz_treinamento_id_seq OWNED BY public.sst_matriz_treinamento.id;


--
-- Name: sst_membros_cipa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_membros_cipa (
    id integer NOT NULL,
    mandato_id integer NOT NULL,
    employee_id integer NOT NULL,
    origem public.enum_sst_membros_cipa_origem NOT NULL,
    papel public.enum_sst_membros_cipa_papel NOT NULL,
    votos_recebidos integer,
    estabilidade_inicio date,
    estabilidade_fim date,
    treinamento_cipa_id integer,
    posse_confirmada_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_membros_cipa.votos_recebidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_membros_cipa.votos_recebidos IS 'Preenchido apenas quando origem = eleito';


--
-- Name: COLUMN sst_membros_cipa.estabilidade_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_membros_cipa.estabilidade_inicio IS 'Registro da candidatura (só para eleitos, BR-SST-022)';


--
-- Name: COLUMN sst_membros_cipa.estabilidade_fim; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_membros_cipa.estabilidade_fim IS 'Fim do mandato + 1 ano (calculado em app), BR-SST-022';


--
-- Name: COLUMN sst_membros_cipa.treinamento_cipa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_membros_cipa.treinamento_cipa_id IS 'FK -> sst_treinamentos.id, fechada em 20260806-000139 (cluster Treinamentos criado depois) — obrigatória antes da posse (BR-SST-024), validado em app até a FK poder ser fechada';


--
-- Name: sst_membros_cipa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_membros_cipa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_membros_cipa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_membros_cipa_id_seq OWNED BY public.sst_membros_cipa.id;


--
-- Name: sst_permissoes_trabalho; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_permissoes_trabalho (
    id integer NOT NULL,
    atividade character varying(200) NOT NULL,
    tipo_risco character varying(100) NOT NULL,
    department_id integer NOT NULL,
    requisitos_verificados text,
    autorizante_id integer NOT NULL,
    inicio_validade timestamp with time zone NOT NULL,
    fim_validade timestamp with time zone NOT NULL,
    status public.enum_sst_permissoes_trabalho_status DEFAULT 'emitida'::public.enum_sst_permissoes_trabalho_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_permissoes_trabalho_validade CHECK ((fim_validade > inicio_validade))
);


--
-- Name: COLUMN sst_permissoes_trabalho.tipo_risco; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_permissoes_trabalho.tipo_risco IS 'Ex.: trabalho a quente, elétrica energizada (NR-10), altura (NR-35), espaço confinado (NR-33)';


--
-- Name: COLUMN sst_permissoes_trabalho.requisitos_verificados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_permissoes_trabalho.requisitos_verificados IS 'Checklist de requisitos verificados, serializado';


--
-- Name: sst_permissoes_trabalho_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_permissoes_trabalho_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_permissoes_trabalho_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_permissoes_trabalho_id_seq OWNED BY public.sst_permissoes_trabalho.id;


--
-- Name: sst_planos_exames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_planos_exames (
    id integer NOT NULL,
    "position" character varying(100),
    ges_id integer,
    tipo_exame character varying(80) NOT NULL,
    periodicidade_meses integer NOT NULL,
    risco_exigente character varying(150),
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_planos_exames_alvo_definido CHECK ((("position" IS NOT NULL) OR (ges_id IS NOT NULL))),
    CONSTRAINT ck_sst_planos_exames_periodicidade_positiva CHECK ((periodicidade_meses > 0))
);


--
-- Name: COLUMN sst_planos_exames."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_planos_exames."position" IS 'Função (employees.position); alvo alternativo a ges_id';


--
-- Name: COLUMN sst_planos_exames.ges_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_planos_exames.ges_id IS 'FK -> sst_ges.id, fechada em 20260806-000138 (ver nota de ordem no cabeçalho)';


--
-- Name: COLUMN sst_planos_exames.tipo_exame; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_planos_exames.tipo_exame IS 'Ex.: audiometria, espirometria, hemograma, acuidade visual, clinico geral';


--
-- Name: COLUMN sst_planos_exames.periodicidade_meses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_planos_exames.periodicidade_meses IS 'Periodicidade em meses (ex.: 12 = anual)';


--
-- Name: COLUMN sst_planos_exames.risco_exigente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_planos_exames.risco_exigente IS 'Risco/agente que justifica a exigência (texto livre, referência informativa; o vínculo formal fica em sst_risco_exames)';


--
-- Name: sst_planos_exames_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_planos_exames_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_planos_exames_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_planos_exames_id_seq OWNED BY public.sst_planos_exames.id;


--
-- Name: sst_processos_eleitorais_cipa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_processos_eleitorais_cipa (
    id integer NOT NULL,
    mandato_id integer NOT NULL,
    data_edital date,
    data_inicio_inscricoes date,
    data_fim_inscricoes date,
    data_votacao date,
    total_votantes integer,
    atas_urls text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_processos_eleitorais_cipa.mandato_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_processos_eleitorais_cipa.mandato_id IS 'unique: um processo eleitoral por mandato (entidade (b).13 do brief)';


--
-- Name: COLUMN sst_processos_eleitorais_cipa.atas_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_processos_eleitorais_cipa.atas_urls IS 'Lista de URLs de atas do processo, serializada';


--
-- Name: sst_processos_eleitorais_cipa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_processos_eleitorais_cipa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_processos_eleitorais_cipa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_processos_eleitorais_cipa_id_seq OWNED BY public.sst_processos_eleitorais_cipa.id;


--
-- Name: sst_pt_executantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_pt_executantes (
    id integer NOT NULL,
    permissao_trabalho_id integer NOT NULL,
    employee_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_pt_executantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_pt_executantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_pt_executantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_pt_executantes_id_seq OWNED BY public.sst_pt_executantes.id;


--
-- Name: sst_registros_dds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_registros_dds (
    id integer NOT NULL,
    data date NOT NULL,
    department_id integer NOT NULL,
    turno public.enum_sst_registros_dds_turno,
    tema character varying(200) NOT NULL,
    condutor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_registros_dds.turno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_registros_dds.turno IS 'Mesmo enum de employees.shift para consistência';


--
-- Name: sst_registros_dds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_registros_dds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_registros_dds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_registros_dds_id_seq OWNED BY public.sst_registros_dds.id;


--
-- Name: sst_reuniao_cipa_presentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_reuniao_cipa_presentes (
    id integer NOT NULL,
    reuniao_id integer NOT NULL,
    membro_cipa_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_reuniao_cipa_presentes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_reuniao_cipa_presentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_reuniao_cipa_presentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_reuniao_cipa_presentes_id_seq OWNED BY public.sst_reuniao_cipa_presentes.id;


--
-- Name: sst_reunioes_cipa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_reunioes_cipa (
    id integer NOT NULL,
    mandato_id integer NOT NULL,
    data date NOT NULL,
    tipo public.enum_sst_reunioes_cipa_tipo NOT NULL,
    pauta text,
    ata_texto text,
    ata_arquivo_url character varying(255),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_reunioes_cipa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_reunioes_cipa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_reunioes_cipa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_reunioes_cipa_id_seq OWNED BY public.sst_reunioes_cipa.id;


--
-- Name: sst_risco_epis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_risco_epis (
    id integer NOT NULL,
    risco_id integer NOT NULL,
    tipo_epi_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sst_risco_epis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_risco_epis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_risco_epis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_risco_epis_id_seq OWNED BY public.sst_risco_epis.id;


--
-- Name: sst_risco_exames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_risco_exames (
    id integer NOT NULL,
    risco_id integer NOT NULL,
    tipo_exame character varying(80) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_risco_exames.tipo_exame; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_risco_exames.tipo_exame IS 'Texto livre (catálogo aberto de exames, sem tabela normalizada — mesmo padrão de sst_planos_exames.tipo_exame)';


--
-- Name: sst_risco_exames_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_risco_exames_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_risco_exames_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_risco_exames_id_seq OWNED BY public.sst_risco_exames.id;


--
-- Name: sst_riscos_ocupacionais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_riscos_ocupacionais (
    id integer NOT NULL,
    department_id integer NOT NULL,
    ges_id integer,
    categoria_agente public.enum_sst_riscos_ocupacionais_categoria_agente,
    agente character varying(150),
    fonte_geradora character varying(200),
    intensidade_concentracao character varying(100),
    data_medicao date,
    medido_por character varying(150),
    severidade integer,
    probabilidade integer,
    classificacao_resultante character varying(50),
    medidas_controle text,
    ausencia_risco_identificado boolean DEFAULT false NOT NULL,
    data_revisao date,
    proxima_revisao_prevista date,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_riscos_ocupacionais_ausencia_coerente CHECK ((((ausencia_risco_identificado = true) AND (categoria_agente IS NULL) AND (agente IS NULL)) OR ((ausencia_risco_identificado = false) AND (categoria_agente IS NOT NULL) AND (agente IS NOT NULL))))
);


--
-- Name: COLUMN sst_riscos_ocupacionais.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.department_id IS 'RESTRICT (diferente de sst_matriz_epi.department_id, que é CASCADE): risco é registro histórico de avaliação, não deve desaparecer se o setor for reorganizado';


--
-- Name: COLUMN sst_riscos_ocupacionais.categoria_agente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.categoria_agente IS 'NULL somente quando ausencia_risco_identificado = true (RF-SST-036/BR-SST-026) — ver CHECK ck_sst_riscos_ocupacionais_ausencia_coerente';


--
-- Name: COLUMN sst_riscos_ocupacionais.agente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.agente IS 'Ex.: ruído, cola/solvente. NULL somente quando ausencia_risco_identificado = true';


--
-- Name: COLUMN sst_riscos_ocupacionais.intensidade_concentracao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.intensidade_concentracao IS 'Valor medido com unidade (ex.: 87 dB(A))';


--
-- Name: COLUMN sst_riscos_ocupacionais.classificacao_resultante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.classificacao_resultante IS 'Classificação de risco resultante (severidade × probabilidade), calculada em app';


--
-- Name: COLUMN sst_riscos_ocupacionais.ausencia_risco_identificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.ausencia_risco_identificado IS 'RF-SST-036: registro explícito de "nenhum risco identificado" para o setor';


--
-- Name: COLUMN sst_riscos_ocupacionais.data_revisao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_riscos_ocupacionais.data_revisao IS 'Última revisão do item do inventário (BR-SST-027)';


--
-- Name: sst_riscos_ocupacionais_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_riscos_ocupacionais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_riscos_ocupacionais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_riscos_ocupacionais_id_seq OWNED BY public.sst_riscos_ocupacionais.id;


--
-- Name: sst_tipos_epi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_tipos_epi (
    id integer NOT NULL,
    nome character varying(150) NOT NULL,
    descricao text,
    ca character varying(20) NOT NULL,
    ca_validade date NOT NULL,
    fabricante character varying(150),
    vida_util_dias integer DEFAULT 0 NOT NULL,
    tamanhos_variacoes character varying(255),
    foto_url character varying(255),
    ativo boolean DEFAULT true NOT NULL,
    item_id uuid,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_sst_tipos_epi_ca_nao_vazio CHECK ((btrim((ca)::text) <> ''::text))
);


--
-- Name: COLUMN sst_tipos_epi.nome; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.nome IS 'Nome comercial do EPI (ex.: Protetor Auricular Plug)';


--
-- Name: COLUMN sst_tipos_epi.ca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.ca IS 'Certificado de Aprovação (CAEPI/MTE) — obrigatório, BR-SST-001. Não usar placeholders sequenciais em produção (ver brief, correção (a) item 2).';


--
-- Name: COLUMN sst_tipos_epi.ca_validade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.ca_validade IS 'Validade do CA, definida pelo MTE — distinta da vida útil do item entregue (brief, correção (a) item 3)';


--
-- Name: COLUMN sst_tipos_epi.vida_util_dias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.vida_util_dias IS 'Periodicidade de troca em dias, definida pelo fabricante/PGR — usada para calcular EntregaEPI.data_prevista_troca (BR-SST-004)';


--
-- Name: COLUMN sst_tipos_epi.tamanhos_variacoes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.tamanhos_variacoes IS 'Lista livre de tamanhos/variações disponíveis (ex.: P/M/G), sem tabela normalizada dedicada — baixo volume de variação';


--
-- Name: COLUMN sst_tipos_epi.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_tipos_epi.item_id IS 'FK opcional 1:1 -> items.id (almoxarifado). NULL = EPI ainda não rastreado como item de estoque (BLOCO_1_SST_REQUISITOS.md §5.2)';


--
-- Name: sst_tipos_epi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_tipos_epi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_tipos_epi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_tipos_epi_id_seq OWNED BY public.sst_tipos_epi.id;


--
-- Name: sst_treinamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sst_treinamentos (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    norma public.enum_sst_treinamentos_norma NOT NULL,
    curso_descricao character varying(200),
    data_realizacao date NOT NULL,
    carga_horaria integer NOT NULL,
    instrutor_entidade character varying(150),
    certificado_url character varying(255),
    validade date,
    identificacao_operador character varying(60),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN sst_treinamentos.carga_horaria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_treinamentos.carga_horaria IS 'Em horas';


--
-- Name: COLUMN sst_treinamentos.validade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_treinamentos.validade IS 'Data de reciclagem, calculada em app a partir de sst_matriz_treinamento.periodicidade_reciclagem_meses';


--
-- Name: COLUMN sst_treinamentos.identificacao_operador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sst_treinamentos.identificacao_operador IS 'RF-SST-047 (NR-11): crachá/identificação de operador de empilhadeira';


--
-- Name: sst_treinamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sst_treinamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sst_treinamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sst_treinamentos_id_seq OWNED BY public.sst_treinamentos.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    company_name character varying(200) NOT NULL,
    trade_name character varying(200) DEFAULT ''::character varying NOT NULL,
    cnpj character varying(18) NOT NULL,
    ie character varying(20),
    phone character varying(20),
    email character varying(100),
    cep character varying(10),
    street character varying(200),
    number character varying(20),
    complement character varying(100),
    neighborhood character varying(100),
    city character varying(100),
    state character varying(2),
    contact_name character varying(100),
    contact_phone character varying(20),
    payment_terms character varying(100),
    delivery_time integer DEFAULT 15 NOT NULL,
    rating integer DEFAULT 3 NOT NULL,
    status public.enum_suppliers_status DEFAULT 'active'::public.enum_suppliers_status NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    quality_score numeric(5,2) DEFAULT 100 NOT NULL,
    is_foreign boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN suppliers.company_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.company_name IS 'Razão Social';


--
-- Name: COLUMN suppliers.trade_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.trade_name IS 'Nome Fantasia';


--
-- Name: COLUMN suppliers.cnpj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.cnpj IS 'CNPJ (apenas dígitos)';


--
-- Name: COLUMN suppliers.delivery_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.delivery_time IS 'Prazo de entrega (dias)';


--
-- Name: COLUMN suppliers.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.rating IS 'Avaliação (1-5)';


--
-- Name: COLUMN suppliers.quality_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.quality_score IS 'Avaliacao calculada (0-100), NUNCA editavel via API: recalculada de forma sincrona por CreateNonConformityUseCase quando uma RNC referencia um lote (lote -> recebimento -> fornecedor). Distinto de `rating` (inteiro 1-5 digitado a mao no cadastro).';


--
-- Name: COLUMN suppliers.is_foreign; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.is_foreign IS 'G11: fornecedor estrangeiro (importacao). Dado de cadastro — fonte NAO controlada pelo comprador dentro do pedido; torna a alcada de diretoria obrigatoria em qualquer valor.';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: ti_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ti_settings (
    id integer NOT NULL,
    sla_response_minutes_low integer DEFAULT 1440 NOT NULL,
    sla_response_minutes_medium integer DEFAULT 240 NOT NULL,
    sla_response_minutes_high integer DEFAULT 120 NOT NULL,
    sla_response_minutes_urgent integer DEFAULT 30 NOT NULL,
    sla_resolution_minutes_low integer DEFAULT 7200 NOT NULL,
    sla_resolution_minutes_medium integer DEFAULT 2880 NOT NULL,
    sla_resolution_minutes_high integer DEFAULT 480 NOT NULL,
    sla_resolution_minutes_urgent integer DEFAULT 240 NOT NULL,
    auto_close_business_days integer DEFAULT 3 NOT NULL,
    reopen_window_days integer DEFAULT 7 NOT NULL,
    license_alert_window_days_1 integer DEFAULT 30 NOT NULL,
    license_alert_window_days_2 integer DEFAULT 15 NOT NULL,
    license_alert_window_days_3 integer DEFAULT 7 NOT NULL,
    restore_test_max_interval_days integer DEFAULT 31 NOT NULL,
    backup_daily_alert_hours integer DEFAULT 26 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_ti_settings_singleton CHECK ((id = 1))
);


--
-- Name: COLUMN ti_settings.auto_close_business_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ti_settings.auto_close_business_days IS 'Dias úteis para auto-close de chamado resolved sem confirmação (RF-TI-011/BR-TI-006)';


--
-- Name: COLUMN ti_settings.reopen_window_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ti_settings.reopen_window_days IS 'Dias corridos após closed_at em que a reabertura ainda é permitida (RF-TI-006/BR-TI-003)';


--
-- Name: COLUMN ti_settings.restore_test_max_interval_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ti_settings.restore_test_max_interval_days IS 'Frequência mínima de teste de restore antes de alertar (RF-TI-042/BR-TI-018)';


--
-- Name: COLUMN ti_settings.backup_daily_alert_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ti_settings.backup_daily_alert_hours IS 'Horas sem backup daily bem-sucedido antes de alertar (RF-TI-041/BR-TI-017)';


--
-- Name: ti_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ti_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ti_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ti_settings_id_seq OWNED BY public.ti_settings.id;


--
-- Name: treasury_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treasury_bank_accounts (
    id integer NOT NULL,
    bank_name character varying(100) NOT NULL,
    agency character varying(20) NOT NULL,
    account_number character varying(20) NOT NULL,
    account_type public.enum_treasury_bank_accounts_account_type NOT NULL,
    current_balance numeric(15,2) DEFAULT 0 NOT NULL,
    manager_name character varying(100),
    manager_phone character varying(20),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: treasury_bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.treasury_bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: treasury_bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.treasury_bank_accounts_id_seq OWNED BY public.treasury_bank_accounts.id;


--
-- Name: treasury_financial_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treasury_financial_operations (
    id integer NOT NULL,
    operation_type public.enum_treasury_financial_operations_operation_type NOT NULL,
    institution character varying(100) NOT NULL,
    contract_number character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    interest_rate numeric(5,2),
    start_date date NOT NULL,
    end_date date,
    guarantee_type public.enum_treasury_financial_operations_guarantee_type DEFAULT 'none'::public.enum_treasury_financial_operations_guarantee_type NOT NULL,
    status public.enum_treasury_financial_operations_status DEFAULT 'active'::public.enum_treasury_financial_operations_status NOT NULL,
    notes text,
    settled_at date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: treasury_financial_operations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.treasury_financial_operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: treasury_financial_operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.treasury_financial_operations_id_seq OWNED BY public.treasury_financial_operations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'operator'::public.enum_users_role NOT NULL,
    department character varying(100) DEFAULT ''::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    password_version integer DEFAULT 1 NOT NULL,
    reset_password_token_hash character varying(64),
    reset_password_expires_at timestamp with time zone,
    access_profile_id integer
);


--
-- Name: COLUMN users.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.id IS 'Identificador único do usuário';


--
-- Name: COLUMN users.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.name IS 'Nome completo do usuário';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'Email de acesso ao sistema';


--
-- Name: COLUMN users.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password IS 'Hash bcrypt da senha';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Perfil de acesso: admin=administrador, operator=operador, financial=financeiro';


--
-- Name: COLUMN users.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.department IS 'Departamento do usuário';


--
-- Name: COLUMN users.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.active IS 'Status ativo/inativo (soft delete)';


--
-- Name: COLUMN users.password_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_version IS 'Versao de senha do usuario, incrementada a cada troca de senha para invalidar tokens JWT emitidos anteriormente.';


--
-- Name: COLUMN users.reset_password_token_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.reset_password_token_hash IS 'Hash SHA-256 do token de recuperacao de senha (nunca armazena o token em texto plano).';


--
-- Name: COLUMN users.reset_password_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.reset_password_expires_at IS 'Data de expiracao do token de recuperacao de senha (SEC-12).';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(160) NOT NULL,
    email character varying(180) NOT NULL,
    senha_hash text NOT NULL,
    papel character varying(60) DEFAULT 'operator'::character varying NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: warehouse_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_transfers (
    id integer NOT NULL,
    product_id integer NOT NULL,
    from_warehouse_id integer NOT NULL,
    to_warehouse_id integer NOT NULL,
    quantity numeric(18,6) NOT NULL,
    reason text NOT NULL,
    user_id integer NOT NULL,
    approved_by integer,
    status public.enum_warehouse_transfers_status DEFAULT 'pending'::public.enum_warehouse_transfers_status NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_warehouse_transfers_from_ne_to CHECK ((from_warehouse_id <> to_warehouse_id)),
    CONSTRAINT ck_warehouse_transfers_quantity_positive CHECK ((quantity > (0)::numeric))
);


--
-- Name: COLUMN warehouse_transfers.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_transfers.quantity IS 'Quantidade solicitada para transferencia (CHECK > 0 no banco)';


--
-- Name: COLUMN warehouse_transfers.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_transfers.reason IS 'Motivo obrigatorio da transferencia (ex.: retrabalho, cessao a laboratorio)';


--
-- Name: COLUMN warehouse_transfers.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_transfers.user_id IS 'Usuario que solicitou a transferencia';


--
-- Name: COLUMN warehouse_transfers.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_transfers.approved_by IS 'Usuario (nivel gestor do modulo estoque) que aprovou ou rejeitou a transferencia';


--
-- Name: warehouse_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_transfers_id_seq OWNED BY public.warehouse_transfers.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: COLUMN warehouses.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.code IS 'Codigo unico do deposito (ex.: INSUMOS, ACABADOS, LABORATORIO)';


--
-- Name: COLUMN warehouses.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.name IS 'Nome descritivo do deposito';


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id integer NOT NULL,
    source character varying(50) NOT NULL,
    event_id character varying(200) NOT NULL,
    event_type character varying(100),
    payload jsonb,
    received_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: COLUMN webhook_events.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_events.source IS 'Origem do webhook, ex.: "n8n"';


--
-- Name: COLUMN webhook_events.event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_events.event_id IS 'Identificador de idempotencia do evento (unico por source)';


--
-- Name: webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_events_id_seq OWNED BY public.webhook_events.id;


--
-- Name: webhooks_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks_eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provedor character varying(60) NOT NULL,
    evento character varying(120) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(40) DEFAULT 'RECEBIDO'::character varying NOT NULL,
    resposta jsonb,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    processado_em timestamp with time zone
);


--
-- Name: TABLE webhooks_eventos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhooks_eventos IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/governance/auditorias/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: work_center_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_center_shifts (
    id integer NOT NULL,
    work_center_id integer NOT NULL,
    weekday smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_work_center_shifts_end_after_start CHECK ((end_time > start_time)),
    CONSTRAINT ck_work_center_shifts_weekday_range CHECK (((weekday >= 0) AND (weekday <= 6)))
);


--
-- Name: work_center_shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_center_shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_center_shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_center_shifts_id_seq OWNED BY public.work_center_shifts.id;


--
-- Name: work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_centers (
    id integer NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    machines_count integer DEFAULT 1 NOT NULL,
    capacity_hours_per_day numeric(6,2) DEFAULT 8 NOT NULL,
    efficiency_factor numeric(5,4) DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cost_per_hour numeric(18,6) DEFAULT 0 NOT NULL,
    CONSTRAINT ck_work_centers_cost_per_hour_non_negative CHECK ((cost_per_hour >= (0)::numeric))
);


--
-- Name: COLUMN work_centers.cost_per_hour; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.work_centers.cost_per_hour IS 'Custo de mao-de-obra + operacao por hora produtiva deste centro de trabalho (BRL/h), usado no custeio real de producao';


--
-- Name: work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_centers_id_seq OWNED BY public.work_centers.id;


--
-- Name: access_profile_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions ALTER COLUMN id SET DEFAULT nextval('public.access_profile_permissions_id_seq'::regclass);


--
-- Name: access_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profiles ALTER COLUMN id SET DEFAULT nextval('public.access_profiles_id_seq'::regclass);


--
-- Name: accounting_chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.accounting_chart_of_accounts_id_seq'::regclass);


--
-- Name: accounting_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries ALTER COLUMN id SET DEFAULT nextval('public.accounting_entries_id_seq'::regclass);


--
-- Name: accounting_entry_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entry_items ALTER COLUMN id SET DEFAULT nextval('public.accounting_entry_items_id_seq'::regclass);


--
-- Name: accounts_payable id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable ALTER COLUMN id SET DEFAULT nextval('public.accounts_payable_id_seq'::regclass);


--
-- Name: accounts_receivable id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable ALTER COLUMN id SET DEFAULT nextval('public.accounts_receivable_id_seq'::regclass);


--
-- Name: acoustic_test_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results ALTER COLUMN id SET DEFAULT nextval('public.acoustic_test_results_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bank_statement_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries ALTER COLUMN id SET DEFAULT nextval('public.bank_statement_entries_id_seq'::regclass);


--
-- Name: bank_statements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements ALTER COLUMN id SET DEFAULT nextval('public.bank_statements_id_seq'::regclass);


--
-- Name: bill_of_material_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items ALTER COLUMN id SET DEFAULT nextval('public.bill_of_material_items_id_seq'::regclass);


--
-- Name: bill_of_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials ALTER COLUMN id SET DEFAULT nextval('public.bill_of_materials_id_seq'::regclass);


--
-- Name: budget_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines ALTER COLUMN id SET DEFAULT nextval('public.budget_lines_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: cnab_remittance_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittance_items ALTER COLUMN id SET DEFAULT nextval('public.cnab_remittance_items_id_seq'::regclass);


--
-- Name: cnab_remittances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittances ALTER COLUMN id SET DEFAULT nextval('public.cnab_remittances_id_seq'::regclass);


--
-- Name: cnab_return_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_files ALTER COLUMN id SET DEFAULT nextval('public.cnab_return_files_id_seq'::regclass);


--
-- Name: cnab_return_occurrences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_occurrences ALTER COLUMN id SET DEFAULT nextval('public.cnab_return_occurrences_id_seq'::regclass);


--
-- Name: company_banking_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_banking_config ALTER COLUMN id SET DEFAULT nextval('public.company_banking_config_id_seq'::regclass);


--
-- Name: company_fiscal_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_fiscal_config ALTER COLUMN id SET DEFAULT nextval('public.company_fiscal_config_id_seq'::regclass);


--
-- Name: cost_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers ALTER COLUMN id SET DEFAULT nextval('public.cost_centers_id_seq'::regclass);


--
-- Name: customer_price_lists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_price_lists ALTER COLUMN id SET DEFAULT nextval('public.customer_price_lists_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: engineering_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_projects ALTER COLUMN id SET DEFAULT nextval('public.engineering_projects_id_seq'::regclass);


--
-- Name: facility_areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_areas ALTER COLUMN id SET DEFAULT nextval('public.facility_areas_id_seq'::regclass);


--
-- Name: facility_cleaning_executions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_executions ALTER COLUMN id SET DEFAULT nextval('public.facility_cleaning_executions_id_seq'::regclass);


--
-- Name: facility_cleaning_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_schedules ALTER COLUMN id SET DEFAULT nextval('public.facility_cleaning_schedules_id_seq'::regclass);


--
-- Name: facility_correspondence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_correspondence ALTER COLUMN id SET DEFAULT nextval('public.facility_correspondence_id_seq'::regclass);


--
-- Name: facility_drivers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_drivers ALTER COLUMN id SET DEFAULT nextval('public.facility_drivers_id_seq'::regclass);


--
-- Name: facility_fines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fines ALTER COLUMN id SET DEFAULT nextval('public.facility_fines_id_seq'::regclass);


--
-- Name: facility_fuel_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fuel_records ALTER COLUMN id SET DEFAULT nextval('public.facility_fuel_records_id_seq'::regclass);


--
-- Name: facility_resource_reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_resource_reservations ALTER COLUMN id SET DEFAULT nextval('public.facility_resource_reservations_id_seq'::regclass);


--
-- Name: facility_vehicle_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_details ALTER COLUMN id SET DEFAULT nextval('public.facility_vehicle_details_id_seq'::regclass);


--
-- Name: facility_vehicle_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_documents ALTER COLUMN id SET DEFAULT nextval('public.facility_vehicle_documents_id_seq'::regclass);


--
-- Name: facility_vehicle_trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips ALTER COLUMN id SET DEFAULT nextval('public.facility_vehicle_trips_id_seq'::regclass);


--
-- Name: facility_visitors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visitors ALTER COLUMN id SET DEFAULT nextval('public.facility_visitors_id_seq'::regclass);


--
-- Name: facility_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visits ALTER COLUMN id SET DEFAULT nextval('public.facility_visits_id_seq'::regclass);


--
-- Name: hr_absences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences ALTER COLUMN id SET DEFAULT nextval('public.hr_absences_id_seq'::regclass);


--
-- Name: hr_admission_processes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes ALTER COLUMN id SET DEFAULT nextval('public.hr_admission_processes_id_seq'::regclass);


--
-- Name: hr_benefit_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_benefit_types ALTER COLUMN id SET DEFAULT nextval('public.hr_benefit_types_id_seq'::regclass);


--
-- Name: hr_candidates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_candidates ALTER COLUMN id SET DEFAULT nextval('public.hr_candidates_id_seq'::regclass);


--
-- Name: hr_employee_benefits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_benefits ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_benefits_id_seq'::regclass);


--
-- Name: hr_employee_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_contracts ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_contracts_id_seq'::regclass);


--
-- Name: hr_employee_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_documents_id_seq'::regclass);


--
-- Name: hr_employee_job_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_job_history_id_seq'::regclass);


--
-- Name: hr_employee_trainings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings ALTER COLUMN id SET DEFAULT nextval('public.hr_employee_trainings_id_seq'::regclass);


--
-- Name: hr_job_position_trainings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_position_trainings ALTER COLUMN id SET DEFAULT nextval('public.hr_job_position_trainings_id_seq'::regclass);


--
-- Name: hr_job_positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_positions ALTER COLUMN id SET DEFAULT nextval('public.hr_job_positions_id_seq'::regclass);


--
-- Name: hr_job_vacancies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_vacancies ALTER COLUMN id SET DEFAULT nextval('public.hr_job_vacancies_id_seq'::regclass);


--
-- Name: hr_payroll_import_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_batches ALTER COLUMN id SET DEFAULT nextval('public.hr_payroll_import_batches_id_seq'::regclass);


--
-- Name: hr_payroll_import_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items ALTER COLUMN id SET DEFAULT nextval('public.hr_payroll_import_items_id_seq'::regclass);


--
-- Name: hr_performance_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_reviews ALTER COLUMN id SET DEFAULT nextval('public.hr_performance_reviews_id_seq'::regclass);


--
-- Name: hr_termination_processes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes ALTER COLUMN id SET DEFAULT nextval('public.hr_termination_processes_id_seq'::regclass);


--
-- Name: hr_time_sheet_summaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_time_sheet_summaries ALTER COLUMN id SET DEFAULT nextval('public.hr_time_sheet_summaries_id_seq'::regclass);


--
-- Name: hr_training_courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_courses ALTER COLUMN id SET DEFAULT nextval('public.hr_training_courses_id_seq'::regclass);


--
-- Name: hr_vacation_accrual_periods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_accrual_periods ALTER COLUMN id SET DEFAULT nextval('public.hr_vacation_accrual_periods_id_seq'::regclass);


--
-- Name: hr_vacation_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_schedules ALTER COLUMN id SET DEFAULT nextval('public.hr_vacation_schedules_id_seq'::regclass);


--
-- Name: import_process_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_approvals ALTER COLUMN id SET DEFAULT nextval('public.import_process_approvals_id_seq'::regclass);


--
-- Name: import_process_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_items ALTER COLUMN id SET DEFAULT nextval('public.import_process_items_id_seq'::regclass);


--
-- Name: import_processes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_processes ALTER COLUMN id SET DEFAULT nextval('public.import_processes_id_seq'::regclass);


--
-- Name: inventory_count_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_count_items_id_seq'::regclass);


--
-- Name: inventory_counts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts ALTER COLUMN id SET DEFAULT nextval('public.inventory_counts_id_seq'::regclass);


--
-- Name: inventory_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_movements_id_seq'::regclass);


--
-- Name: it_access_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests ALTER COLUMN id SET DEFAULT nextval('public.it_access_requests_id_seq'::regclass);


--
-- Name: it_backup_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_backup_logs ALTER COLUMN id SET DEFAULT nextval('public.it_backup_logs_id_seq'::regclass);


--
-- Name: it_license_seats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_license_seats ALTER COLUMN id SET DEFAULT nextval('public.it_license_seats_id_seq'::regclass);


--
-- Name: it_responsibility_terms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms ALTER COLUMN id SET DEFAULT nextval('public.it_responsibility_terms_id_seq'::regclass);


--
-- Name: it_software_license_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_software_license_details ALTER COLUMN id SET DEFAULT nextval('public.it_software_license_details_id_seq'::regclass);


--
-- Name: it_ticket_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_categories ALTER COLUMN id SET DEFAULT nextval('public.it_ticket_categories_id_seq'::regclass);


--
-- Name: it_ticket_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_comments ALTER COLUMN id SET DEFAULT nextval('public.it_ticket_comments_id_seq'::regclass);


--
-- Name: it_ticket_priority_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_priority_history ALTER COLUMN id SET DEFAULT nextval('public.it_ticket_priority_history_id_seq'::regclass);


--
-- Name: it_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets ALTER COLUMN id SET DEFAULT nextval('public.it_tickets_id_seq'::regclass);


--
-- Name: item_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers ALTER COLUMN id SET DEFAULT nextval('public.item_suppliers_id_seq'::regclass);


--
-- Name: jur_contract_addendums id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_addendums ALTER COLUMN id SET DEFAULT nextval('public.jur_contract_addendums_id_seq'::regclass);


--
-- Name: jur_contract_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_approvals ALTER COLUMN id SET DEFAULT nextval('public.jur_contract_approvals_id_seq'::regclass);


--
-- Name: jur_contract_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_documents ALTER COLUMN id SET DEFAULT nextval('public.jur_contract_documents_id_seq'::regclass);


--
-- Name: jur_contract_signatories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_signatories ALTER COLUMN id SET DEFAULT nextval('public.jur_contract_signatories_id_seq'::regclass);


--
-- Name: jur_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts ALTER COLUMN id SET DEFAULT nextval('public.jur_contracts_id_seq'::regclass);


--
-- Name: jur_corporate_acts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_corporate_acts ALTER COLUMN id SET DEFAULT nextval('public.jur_corporate_acts_id_seq'::regclass);


--
-- Name: jur_external_lawyers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_external_lawyers ALTER COLUMN id SET DEFAULT nextval('public.jur_external_lawyers_id_seq'::regclass);


--
-- Name: jur_intellectual_property id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_intellectual_property ALTER COLUMN id SET DEFAULT nextval('public.jur_intellectual_property_id_seq'::regclass);


--
-- Name: jur_ip_contract_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_ip_contract_links ALTER COLUMN id SET DEFAULT nextval('public.jur_ip_contract_links_id_seq'::regclass);


--
-- Name: jur_legal_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_alerts ALTER COLUMN id SET DEFAULT nextval('public.jur_legal_alerts_id_seq'::regclass);


--
-- Name: jur_legal_case_deadlines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines ALTER COLUMN id SET DEFAULT nextval('public.jur_legal_case_deadlines_id_seq'::regclass);


--
-- Name: jur_legal_case_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_events ALTER COLUMN id SET DEFAULT nextval('public.jur_legal_case_events_id_seq'::regclass);


--
-- Name: jur_legal_case_provisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_provisions ALTER COLUMN id SET DEFAULT nextval('public.jur_legal_case_provisions_id_seq'::regclass);


--
-- Name: jur_legal_cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases ALTER COLUMN id SET DEFAULT nextval('public.jur_legal_cases_id_seq'::regclass);


--
-- Name: jur_lgpd_data_subject_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_data_subject_requests ALTER COLUMN id SET DEFAULT nextval('public.jur_lgpd_data_subject_requests_id_seq'::regclass);


--
-- Name: jur_lgpd_incidents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_incidents ALTER COLUMN id SET DEFAULT nextval('public.jur_lgpd_incidents_id_seq'::regclass);


--
-- Name: jur_lgpd_processing_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_processing_activities ALTER COLUMN id SET DEFAULT nextval('public.jur_lgpd_processing_activities_id_seq'::regclass);


--
-- Name: jur_proxies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies ALTER COLUMN id SET DEFAULT nextval('public.jur_proxies_id_seq'::regclass);


--
-- Name: lot_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls ALTER COLUMN id SET DEFAULT nextval('public.lot_controls_id_seq'::regclass);


--
-- Name: maintenance_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders ALTER COLUMN id SET DEFAULT nextval('public.maintenance_orders_id_seq'::regclass);


--
-- Name: marketing_campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns ALTER COLUMN id SET DEFAULT nextval('public.marketing_campaigns_id_seq'::regclass);


--
-- Name: marketing_event_checklist_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_event_checklist_items ALTER COLUMN id SET DEFAULT nextval('public.marketing_event_checklist_items_id_seq'::regclass);


--
-- Name: marketing_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_events ALTER COLUMN id SET DEFAULT nextval('public.marketing_events_id_seq'::regclass);


--
-- Name: marketing_lead_saneamento_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_lead_saneamento_log ALTER COLUMN id SET DEFAULT nextval('public.marketing_lead_saneamento_log_id_seq'::regclass);


--
-- Name: marketing_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads ALTER COLUMN id SET DEFAULT nextval('public.marketing_leads_id_seq'::regclass);


--
-- Name: marketing_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_materials ALTER COLUMN id SET DEFAULT nextval('public.marketing_materials_id_seq'::regclass);


--
-- Name: master_production_plan_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines ALTER COLUMN id SET DEFAULT nextval('public.master_production_plan_lines_id_seq'::regclass);


--
-- Name: master_production_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans ALTER COLUMN id SET DEFAULT nextval('public.master_production_plans_id_seq'::regclass);


--
-- Name: non_conformities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities ALTER COLUMN id SET DEFAULT nextval('public.non_conformities_id_seq'::regclass);


--
-- Name: product_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories ALTER COLUMN id SET DEFAULT nextval('public.product_categories_id_seq'::regclass);


--
-- Name: product_cost_ledgers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_cost_ledgers ALTER COLUMN id SET DEFAULT nextval('public.product_cost_ledgers_id_seq'::regclass);


--
-- Name: product_drawings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_drawings ALTER COLUMN id SET DEFAULT nextval('public.product_drawings_id_seq'::regclass);


--
-- Name: product_warehouse_stock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse_stock ALTER COLUMN id SET DEFAULT nextval('public.product_warehouse_stock_id_seq'::regclass);


--
-- Name: production_cost_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_cost_settings ALTER COLUMN id SET DEFAULT nextval('public.production_cost_settings_id_seq'::regclass);


--
-- Name: production_downtimes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_downtimes ALTER COLUMN id SET DEFAULT nextval('public.production_downtimes_id_seq'::regclass);


--
-- Name: production_lot_consumptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions ALTER COLUMN id SET DEFAULT nextval('public.production_lot_consumptions_id_seq'::regclass);


--
-- Name: production_order_reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations ALTER COLUMN id SET DEFAULT nextval('public.production_order_reservations_id_seq'::regclass);


--
-- Name: production_order_tracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_tracking ALTER COLUMN id SET DEFAULT nextval('public.production_order_tracking_id_seq'::regclass);


--
-- Name: production_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders ALTER COLUMN id SET DEFAULT nextval('public.production_orders_id_seq'::regclass);


--
-- Name: production_route_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_steps ALTER COLUMN id SET DEFAULT nextval('public.production_route_steps_id_seq'::regclass);


--
-- Name: production_routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes ALTER COLUMN id SET DEFAULT nextval('public.production_routes_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_order_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_approvals ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_approvals_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: purchase_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts ALTER COLUMN id SET DEFAULT nextval('public.purchase_receipts_id_seq'::regclass);


--
-- Name: purchase_requisition_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_requisition_items_id_seq'::regclass);


--
-- Name: purchase_requisitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions ALTER COLUMN id SET DEFAULT nextval('public.purchase_requisitions_id_seq'::regclass);


--
-- Name: quality_inspections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections ALTER COLUMN id SET DEFAULT nextval('public.quality_inspections_id_seq'::regclass);


--
-- Name: rfq_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items ALTER COLUMN id SET DEFAULT nextval('public.rfq_items_id_seq'::regclass);


--
-- Name: rfq_quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_quotes ALTER COLUMN id SET DEFAULT nextval('public.rfq_quotes_id_seq'::regclass);


--
-- Name: rfq_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_suppliers ALTER COLUMN id SET DEFAULT nextval('public.rfq_suppliers_id_seq'::regclass);


--
-- Name: rfqs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs ALTER COLUMN id SET DEFAULT nextval('public.rfqs_id_seq'::regclass);


--
-- Name: sale_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_invoices ALTER COLUMN id SET DEFAULT nextval('public.sale_invoices_id_seq'::regclass);


--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: serial_numbers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers ALTER COLUMN id SET DEFAULT nextval('public.serial_numbers_id_seq'::regclass);


--
-- Name: service_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders ALTER COLUMN id SET DEFAULT nextval('public.service_orders_id_seq'::regclass);


--
-- Name: sst_acidente_complementos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_complementos ALTER COLUMN id SET DEFAULT nextval('public.sst_acidente_complementos_id_seq'::regclass);


--
-- Name: sst_acidente_testemunhas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_testemunhas ALTER COLUMN id SET DEFAULT nextval('public.sst_acidente_testemunhas_id_seq'::regclass);


--
-- Name: sst_acidentes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidentes ALTER COLUMN id SET DEFAULT nextval('public.sst_acidentes_id_seq'::regclass);


--
-- Name: sst_acoes_corretivas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acoes_corretivas ALTER COLUMN id SET DEFAULT nextval('public.sst_acoes_corretivas_id_seq'::regclass);


--
-- Name: sst_asos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_asos ALTER COLUMN id SET DEFAULT nextval('public.sst_asos_id_seq'::regclass);


--
-- Name: sst_brigadistas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_brigadistas ALTER COLUMN id SET DEFAULT nextval('public.sst_brigadistas_id_seq'::regclass);


--
-- Name: sst_candidatos_cipa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_candidatos_cipa ALTER COLUMN id SET DEFAULT nextval('public.sst_candidatos_cipa_id_seq'::regclass);


--
-- Name: sst_cats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_cats ALTER COLUMN id SET DEFAULT nextval('public.sst_cats_id_seq'::regclass);


--
-- Name: sst_dds_presencas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_dds_presencas ALTER COLUMN id SET DEFAULT nextval('public.sst_dds_presencas_id_seq'::regclass);


--
-- Name: sst_devolucoes_epi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_devolucoes_epi ALTER COLUMN id SET DEFAULT nextval('public.sst_devolucoes_epi_id_seq'::regclass);


--
-- Name: sst_entregas_epi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi ALTER COLUMN id SET DEFAULT nextval('public.sst_entregas_epi_id_seq'::regclass);


--
-- Name: sst_estornos_entrega_epi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_estornos_entrega_epi ALTER COLUMN id SET DEFAULT nextval('public.sst_estornos_entrega_epi_id_seq'::regclass);


--
-- Name: sst_eventos_esocial id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_eventos_esocial ALTER COLUMN id SET DEFAULT nextval('public.sst_eventos_esocial_id_seq'::regclass);


--
-- Name: sst_exames_complementares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_exames_complementares ALTER COLUMN id SET DEFAULT nextval('public.sst_exames_complementares_id_seq'::regclass);


--
-- Name: sst_ges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges ALTER COLUMN id SET DEFAULT nextval('public.sst_ges_id_seq'::regclass);


--
-- Name: sst_ges_funcionarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges_funcionarios ALTER COLUMN id SET DEFAULT nextval('public.sst_ges_funcionarios_id_seq'::regclass);


--
-- Name: sst_inspecao_itens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecao_itens ALTER COLUMN id SET DEFAULT nextval('public.sst_inspecao_itens_id_seq'::regclass);


--
-- Name: sst_inspecoes_seguranca id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecoes_seguranca ALTER COLUMN id SET DEFAULT nextval('public.sst_inspecoes_seguranca_id_seq'::regclass);


--
-- Name: sst_investigacoes_acidente id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_investigacoes_acidente ALTER COLUMN id SET DEFAULT nextval('public.sst_investigacoes_acidente_id_seq'::regclass);


--
-- Name: sst_mandatos_cipa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_mandatos_cipa ALTER COLUMN id SET DEFAULT nextval('public.sst_mandatos_cipa_id_seq'::regclass);


--
-- Name: sst_matriz_epi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_epi ALTER COLUMN id SET DEFAULT nextval('public.sst_matriz_epi_id_seq'::regclass);


--
-- Name: sst_matriz_treinamento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_treinamento ALTER COLUMN id SET DEFAULT nextval('public.sst_matriz_treinamento_id_seq'::regclass);


--
-- Name: sst_membros_cipa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_membros_cipa ALTER COLUMN id SET DEFAULT nextval('public.sst_membros_cipa_id_seq'::regclass);


--
-- Name: sst_permissoes_trabalho id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_permissoes_trabalho ALTER COLUMN id SET DEFAULT nextval('public.sst_permissoes_trabalho_id_seq'::regclass);


--
-- Name: sst_planos_exames id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_planos_exames ALTER COLUMN id SET DEFAULT nextval('public.sst_planos_exames_id_seq'::regclass);


--
-- Name: sst_processos_eleitorais_cipa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_processos_eleitorais_cipa ALTER COLUMN id SET DEFAULT nextval('public.sst_processos_eleitorais_cipa_id_seq'::regclass);


--
-- Name: sst_pt_executantes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_pt_executantes ALTER COLUMN id SET DEFAULT nextval('public.sst_pt_executantes_id_seq'::regclass);


--
-- Name: sst_registros_dds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_registros_dds ALTER COLUMN id SET DEFAULT nextval('public.sst_registros_dds_id_seq'::regclass);


--
-- Name: sst_reuniao_cipa_presentes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reuniao_cipa_presentes ALTER COLUMN id SET DEFAULT nextval('public.sst_reuniao_cipa_presentes_id_seq'::regclass);


--
-- Name: sst_reunioes_cipa id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reunioes_cipa ALTER COLUMN id SET DEFAULT nextval('public.sst_reunioes_cipa_id_seq'::regclass);


--
-- Name: sst_risco_epis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_epis ALTER COLUMN id SET DEFAULT nextval('public.sst_risco_epis_id_seq'::regclass);


--
-- Name: sst_risco_exames id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_exames ALTER COLUMN id SET DEFAULT nextval('public.sst_risco_exames_id_seq'::regclass);


--
-- Name: sst_riscos_ocupacionais id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_riscos_ocupacionais ALTER COLUMN id SET DEFAULT nextval('public.sst_riscos_ocupacionais_id_seq'::regclass);


--
-- Name: sst_tipos_epi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_tipos_epi ALTER COLUMN id SET DEFAULT nextval('public.sst_tipos_epi_id_seq'::regclass);


--
-- Name: sst_treinamentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_treinamentos ALTER COLUMN id SET DEFAULT nextval('public.sst_treinamentos_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: ti_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ti_settings ALTER COLUMN id SET DEFAULT nextval('public.ti_settings_id_seq'::regclass);


--
-- Name: treasury_bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treasury_bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.treasury_bank_accounts_id_seq'::regclass);


--
-- Name: treasury_financial_operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treasury_financial_operations ALTER COLUMN id SET DEFAULT nextval('public.treasury_financial_operations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouse_transfers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers ALTER COLUMN id SET DEFAULT nextval('public.warehouse_transfers_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: webhook_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events ALTER COLUMN id SET DEFAULT nextval('public.webhook_events_id_seq'::regclass);


--
-- Name: work_center_shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_center_shifts ALTER COLUMN id SET DEFAULT nextval('public.work_center_shifts_id_seq'::regclass);


--
-- Name: work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers ALTER COLUMN id SET DEFAULT nextval('public.work_centers_id_seq'::regclass);


--
-- Name: SequelizeMeta SequelizeMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SequelizeMeta"
    ADD CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY (name);


--
-- Name: access_profile_permissions access_profile_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions
    ADD CONSTRAINT access_profile_permissions_pkey PRIMARY KEY (id);


--
-- Name: access_profiles access_profiles_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profiles
    ADD CONSTRAINT access_profiles_nome_key UNIQUE (nome);


--
-- Name: access_profiles access_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profiles
    ADD CONSTRAINT access_profiles_pkey PRIMARY KEY (id);


--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts
    ADD CONSTRAINT accounting_chart_of_accounts_code_key UNIQUE (code);


--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts
    ADD CONSTRAINT accounting_chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: accounting_entries accounting_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries
    ADD CONSTRAINT accounting_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: accounting_entries accounting_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries
    ADD CONSTRAINT accounting_entries_pkey PRIMARY KEY (id);


--
-- Name: accounting_entry_items accounting_entry_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entry_items
    ADD CONSTRAINT accounting_entry_items_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: accounts_receivable accounts_receivable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_pkey PRIMARY KEY (id);


--
-- Name: acoustic_test_results acoustic_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results
    ADD CONSTRAINT acoustic_test_results_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: assets assets_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_tag_key UNIQUE (tag);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auditoria_eventos auditoria_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_eventos
    ADD CONSTRAINT auditoria_eventos_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_entries bank_statement_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries
    ADD CONSTRAINT bank_statement_entries_pkey PRIMARY KEY (id);


--
-- Name: bank_statements bank_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_pkey PRIMARY KEY (id);


--
-- Name: bill_of_material_items bill_of_material_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT bill_of_material_items_pkey PRIMARY KEY (id);


--
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- Name: budget_lines budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_pkey PRIMARY KEY (id);


--
-- Name: clients clients_cpf_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_cpf_cnpj_key UNIQUE (cpf_cnpj);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: cnab_remittance_items cnab_remittance_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittance_items
    ADD CONSTRAINT cnab_remittance_items_pkey PRIMARY KEY (id);


--
-- Name: cnab_remittances cnab_remittances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittances
    ADD CONSTRAINT cnab_remittances_pkey PRIMARY KEY (id);


--
-- Name: cnab_return_files cnab_return_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_files
    ADD CONSTRAINT cnab_return_files_pkey PRIMARY KEY (id);


--
-- Name: cnab_return_occurrences cnab_return_occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_occurrences
    ADD CONSTRAINT cnab_return_occurrences_pkey PRIMARY KEY (id);


--
-- Name: company_banking_config company_banking_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_banking_config
    ADD CONSTRAINT company_banking_config_pkey PRIMARY KEY (id);


--
-- Name: company_fiscal_config company_fiscal_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_fiscal_config
    ADD CONSTRAINT company_fiscal_config_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_code_key UNIQUE (code);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: customer_price_lists customer_price_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_price_lists
    ADD CONSTRAINT customer_price_lists_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_cpf_key UNIQUE (cpf);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: engineering_projects engineering_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_projects
    ADD CONSTRAINT engineering_projects_pkey PRIMARY KEY (id);


--
-- Name: engineering_projects engineering_projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_projects
    ADD CONSTRAINT engineering_projects_project_code_key UNIQUE (project_code);


--
-- Name: entradas_nf entradas_nf_fornecedor_id_numero_nf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf
    ADD CONSTRAINT entradas_nf_fornecedor_id_numero_nf_key UNIQUE (fornecedor_id, numero_nf);


--
-- Name: entradas_nf_items entradas_nf_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf_items
    ADD CONSTRAINT entradas_nf_items_pkey PRIMARY KEY (id);


--
-- Name: entradas_nf entradas_nf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf
    ADD CONSTRAINT entradas_nf_pkey PRIMARY KEY (id);


--
-- Name: facility_areas facility_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_areas
    ADD CONSTRAINT facility_areas_pkey PRIMARY KEY (id);


--
-- Name: facility_cleaning_executions facility_cleaning_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_executions
    ADD CONSTRAINT facility_cleaning_executions_pkey PRIMARY KEY (id);


--
-- Name: facility_cleaning_schedules facility_cleaning_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_schedules
    ADD CONSTRAINT facility_cleaning_schedules_pkey PRIMARY KEY (id);


--
-- Name: facility_correspondence facility_correspondence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_correspondence
    ADD CONSTRAINT facility_correspondence_pkey PRIMARY KEY (id);


--
-- Name: facility_drivers facility_drivers_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_drivers
    ADD CONSTRAINT facility_drivers_employee_id_key UNIQUE (employee_id);


--
-- Name: facility_drivers facility_drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_drivers
    ADD CONSTRAINT facility_drivers_pkey PRIMARY KEY (id);


--
-- Name: facility_fines facility_fines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fines
    ADD CONSTRAINT facility_fines_pkey PRIMARY KEY (id);


--
-- Name: facility_fuel_records facility_fuel_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fuel_records
    ADD CONSTRAINT facility_fuel_records_pkey PRIMARY KEY (id);


--
-- Name: facility_resource_reservations facility_resource_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_resource_reservations
    ADD CONSTRAINT facility_resource_reservations_pkey PRIMARY KEY (id);


--
-- Name: facility_vehicle_details facility_vehicle_details_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_details
    ADD CONSTRAINT facility_vehicle_details_asset_id_key UNIQUE (asset_id);


--
-- Name: facility_vehicle_details facility_vehicle_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_details
    ADD CONSTRAINT facility_vehicle_details_pkey PRIMARY KEY (id);


--
-- Name: facility_vehicle_details facility_vehicle_details_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_details
    ADD CONSTRAINT facility_vehicle_details_plate_key UNIQUE (plate);


--
-- Name: facility_vehicle_documents facility_vehicle_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_documents
    ADD CONSTRAINT facility_vehicle_documents_pkey PRIMARY KEY (id);


--
-- Name: facility_vehicle_trips facility_vehicle_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips
    ADD CONSTRAINT facility_vehicle_trips_pkey PRIMARY KEY (id);


--
-- Name: facility_visitors facility_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visitors
    ADD CONSTRAINT facility_visitors_pkey PRIMARY KEY (id);


--
-- Name: facility_visits facility_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visits
    ADD CONSTRAINT facility_visits_pkey PRIMARY KEY (id);


--
-- Name: fornecedores fornecedores_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_cnpj_key UNIQUE (cnpj);


--
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);


--
-- Name: hr_absences hr_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_pkey PRIMARY KEY (id);


--
-- Name: hr_admission_processes hr_admission_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_pkey PRIMARY KEY (id);


--
-- Name: hr_benefit_types hr_benefit_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_benefit_types
    ADD CONSTRAINT hr_benefit_types_pkey PRIMARY KEY (id);


--
-- Name: hr_candidates hr_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_candidates
    ADD CONSTRAINT hr_candidates_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_benefits hr_employee_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_benefits
    ADD CONSTRAINT hr_employee_benefits_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_contracts hr_employee_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_contracts
    ADD CONSTRAINT hr_employee_contracts_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_documents hr_employee_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_job_history hr_employee_job_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_pkey PRIMARY KEY (id);


--
-- Name: hr_employee_trainings hr_employee_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_pkey PRIMARY KEY (id);


--
-- Name: hr_job_position_trainings hr_job_position_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_position_trainings
    ADD CONSTRAINT hr_job_position_trainings_pkey PRIMARY KEY (id);


--
-- Name: hr_job_positions hr_job_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_positions
    ADD CONSTRAINT hr_job_positions_pkey PRIMARY KEY (id);


--
-- Name: hr_job_vacancies hr_job_vacancies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_vacancies
    ADD CONSTRAINT hr_job_vacancies_pkey PRIMARY KEY (id);


--
-- Name: hr_payroll_import_batches hr_payroll_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_batches
    ADD CONSTRAINT hr_payroll_import_batches_pkey PRIMARY KEY (id);


--
-- Name: hr_payroll_import_items hr_payroll_import_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items
    ADD CONSTRAINT hr_payroll_import_items_pkey PRIMARY KEY (id);


--
-- Name: hr_performance_reviews hr_performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_reviews
    ADD CONSTRAINT hr_performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: hr_termination_processes hr_termination_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes
    ADD CONSTRAINT hr_termination_processes_pkey PRIMARY KEY (id);


--
-- Name: hr_time_sheet_summaries hr_time_sheet_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_time_sheet_summaries
    ADD CONSTRAINT hr_time_sheet_summaries_pkey PRIMARY KEY (id);


--
-- Name: hr_training_courses hr_training_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_training_courses
    ADD CONSTRAINT hr_training_courses_pkey PRIMARY KEY (id);


--
-- Name: hr_vacation_accrual_periods hr_vacation_accrual_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_accrual_periods
    ADD CONSTRAINT hr_vacation_accrual_periods_pkey PRIMARY KEY (id);


--
-- Name: hr_vacation_schedules hr_vacation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_schedules
    ADD CONSTRAINT hr_vacation_schedules_pkey PRIMARY KEY (id);


--
-- Name: import_process_approvals import_process_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_approvals
    ADD CONSTRAINT import_process_approvals_pkey PRIMARY KEY (id);


--
-- Name: import_process_items import_process_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_items
    ADD CONSTRAINT import_process_items_pkey PRIMARY KEY (id);


--
-- Name: import_processes import_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_processes
    ADD CONSTRAINT import_processes_pkey PRIMARY KEY (id);


--
-- Name: import_processes import_processes_process_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_processes
    ADD CONSTRAINT import_processes_process_number_key UNIQUE (process_number);


--
-- Name: inventory_count_items inventory_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT inventory_count_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_counts inventory_counts_count_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_count_number_key UNIQUE (count_number);


--
-- Name: inventory_counts inventory_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: it_access_requests it_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_pkey PRIMARY KEY (id);


--
-- Name: it_access_requests it_access_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_request_number_key UNIQUE (request_number);


--
-- Name: it_backup_logs it_backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_backup_logs
    ADD CONSTRAINT it_backup_logs_pkey PRIMARY KEY (id);


--
-- Name: it_license_seats it_license_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_license_seats
    ADD CONSTRAINT it_license_seats_pkey PRIMARY KEY (id);


--
-- Name: it_responsibility_terms it_responsibility_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_pkey PRIMARY KEY (id);


--
-- Name: it_responsibility_terms it_responsibility_terms_term_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_term_number_key UNIQUE (term_number);


--
-- Name: it_software_license_details it_software_license_details_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_software_license_details
    ADD CONSTRAINT it_software_license_details_asset_id_key UNIQUE (asset_id);


--
-- Name: it_software_license_details it_software_license_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_software_license_details
    ADD CONSTRAINT it_software_license_details_pkey PRIMARY KEY (id);


--
-- Name: it_ticket_categories it_ticket_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_categories
    ADD CONSTRAINT it_ticket_categories_name_key UNIQUE (name);


--
-- Name: it_ticket_categories it_ticket_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_categories
    ADD CONSTRAINT it_ticket_categories_pkey PRIMARY KEY (id);


--
-- Name: it_ticket_comments it_ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_comments
    ADD CONSTRAINT it_ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: it_ticket_priority_history it_ticket_priority_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_priority_history
    ADD CONSTRAINT it_ticket_priority_history_pkey PRIMARY KEY (id);


--
-- Name: it_tickets it_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_pkey PRIMARY KEY (id);


--
-- Name: it_tickets it_tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: item_categorias item_categorias_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categorias
    ADD CONSTRAINT item_categorias_codigo_key UNIQUE (codigo);


--
-- Name: item_categorias item_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_categorias
    ADD CONSTRAINT item_categorias_pkey PRIMARY KEY (id);


--
-- Name: item_detalhes_comerciais item_detalhes_comerciais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_detalhes_comerciais
    ADD CONSTRAINT item_detalhes_comerciais_pkey PRIMARY KEY (item_id);


--
-- Name: item_especificacoes_tecnicas item_especificacoes_tecnicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_especificacoes_tecnicas
    ADD CONSTRAINT item_especificacoes_tecnicas_pkey PRIMARY KEY (item_id);


--
-- Name: item_estruturas item_estruturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT item_estruturas_pkey PRIMARY KEY (id);


--
-- Name: item_suppliers item_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT item_suppliers_pkey PRIMARY KEY (id);


--
-- Name: items items_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_codigo_key UNIQUE (codigo);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: jur_contract_addendums jur_contract_addendums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_addendums
    ADD CONSTRAINT jur_contract_addendums_pkey PRIMARY KEY (id);


--
-- Name: jur_contract_approvals jur_contract_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_approvals
    ADD CONSTRAINT jur_contract_approvals_pkey PRIMARY KEY (id);


--
-- Name: jur_contract_documents jur_contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_documents
    ADD CONSTRAINT jur_contract_documents_pkey PRIMARY KEY (id);


--
-- Name: jur_contract_signatories jur_contract_signatories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_signatories
    ADD CONSTRAINT jur_contract_signatories_pkey PRIMARY KEY (id);


--
-- Name: jur_contracts jur_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: jur_contracts jur_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_pkey PRIMARY KEY (id);


--
-- Name: jur_corporate_acts jur_corporate_acts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_corporate_acts
    ADD CONSTRAINT jur_corporate_acts_pkey PRIMARY KEY (id);


--
-- Name: jur_external_lawyers jur_external_lawyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_external_lawyers
    ADD CONSTRAINT jur_external_lawyers_pkey PRIMARY KEY (id);


--
-- Name: jur_external_lawyers jur_external_lawyers_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_external_lawyers
    ADD CONSTRAINT jur_external_lawyers_supplier_id_key UNIQUE (supplier_id);


--
-- Name: jur_intellectual_property jur_intellectual_property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_intellectual_property
    ADD CONSTRAINT jur_intellectual_property_pkey PRIMARY KEY (id);


--
-- Name: jur_ip_contract_links jur_ip_contract_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_ip_contract_links
    ADD CONSTRAINT jur_ip_contract_links_pkey PRIMARY KEY (id);


--
-- Name: jur_legal_alerts jur_legal_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_alerts
    ADD CONSTRAINT jur_legal_alerts_pkey PRIMARY KEY (id);


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_pkey PRIMARY KEY (id);


--
-- Name: jur_legal_case_events jur_legal_case_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_events
    ADD CONSTRAINT jur_legal_case_events_pkey PRIMARY KEY (id);


--
-- Name: jur_legal_case_provisions jur_legal_case_provisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_provisions
    ADD CONSTRAINT jur_legal_case_provisions_pkey PRIMARY KEY (id);


--
-- Name: jur_legal_cases jur_legal_cases_case_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_case_number_key UNIQUE (case_number);


--
-- Name: jur_legal_cases jur_legal_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_pkey PRIMARY KEY (id);


--
-- Name: jur_lgpd_data_subject_requests jur_lgpd_data_subject_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_data_subject_requests
    ADD CONSTRAINT jur_lgpd_data_subject_requests_pkey PRIMARY KEY (id);


--
-- Name: jur_lgpd_incidents jur_lgpd_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_incidents
    ADD CONSTRAINT jur_lgpd_incidents_pkey PRIMARY KEY (id);


--
-- Name: jur_lgpd_processing_activities jur_lgpd_processing_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_processing_activities
    ADD CONSTRAINT jur_lgpd_processing_activities_pkey PRIMARY KEY (id);


--
-- Name: jur_proxies jur_proxies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies
    ADD CONSTRAINT jur_proxies_pkey PRIMARY KEY (id);


--
-- Name: lot_controls lot_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT lot_controls_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_item_id_codigo_lote_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_item_id_codigo_lote_key UNIQUE (item_id, codigo_lote);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: maintenance_orders maintenance_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT maintenance_orders_order_number_key UNIQUE (order_number);


--
-- Name: maintenance_orders maintenance_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT maintenance_orders_pkey PRIMARY KEY (id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketing_event_checklist_items marketing_event_checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_event_checklist_items
    ADD CONSTRAINT marketing_event_checklist_items_pkey PRIMARY KEY (id);


--
-- Name: marketing_events marketing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_events
    ADD CONSTRAINT marketing_events_pkey PRIMARY KEY (id);


--
-- Name: marketing_lead_saneamento_log marketing_lead_saneamento_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_lead_saneamento_log
    ADD CONSTRAINT marketing_lead_saneamento_log_pkey PRIMARY KEY (id);


--
-- Name: marketing_leads marketing_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads
    ADD CONSTRAINT marketing_leads_pkey PRIMARY KEY (id);


--
-- Name: marketing_materials marketing_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_pkey PRIMARY KEY (id);


--
-- Name: master_production_plan_lines master_production_plan_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines
    ADD CONSTRAINT master_production_plan_lines_pkey PRIMARY KEY (id);


--
-- Name: master_production_plans master_production_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_pkey PRIMARY KEY (id);


--
-- Name: master_production_plans master_production_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: migracao_bom_log migracao_bom_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_bom_log
    ADD CONSTRAINT migracao_bom_log_pkey PRIMARY KEY (id);


--
-- Name: migracao_product_item_map migracao_product_item_map_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_product_item_map
    ADD CONSTRAINT migracao_product_item_map_item_id_key UNIQUE (item_id);


--
-- Name: migracao_product_item_map migracao_product_item_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_product_item_map
    ADD CONSTRAINT migracao_product_item_map_pkey PRIMARY KEY (id);


--
-- Name: migracao_product_item_map migracao_product_item_map_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_product_item_map
    ADD CONSTRAINT migracao_product_item_map_product_id_key UNIQUE (product_id);


--
-- Name: movimentos_estoque movimentos_estoque_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_estoque
    ADD CONSTRAINT movimentos_estoque_pkey PRIMARY KEY (id);


--
-- Name: mrp_ordens_planejadas mrp_ordens_planejadas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mrp_ordens_planejadas
    ADD CONSTRAINT mrp_ordens_planejadas_pkey PRIMARY KEY (id);


--
-- Name: non_conformities non_conformities_nc_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT non_conformities_nc_number_key UNIQUE (nc_number);


--
-- Name: non_conformities non_conformities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT non_conformities_pkey PRIMARY KEY (id);


--
-- Name: numeros_serie numeros_serie_numero_serie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_serie
    ADD CONSTRAINT numeros_serie_numero_serie_key UNIQUE (numero_serie);


--
-- Name: numeros_serie numeros_serie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_serie
    ADD CONSTRAINT numeros_serie_pkey PRIMARY KEY (id);


--
-- Name: ordens_producao ordens_producao_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_producao
    ADD CONSTRAINT ordens_producao_codigo_key UNIQUE (codigo);


--
-- Name: ordens_producao ordens_producao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_producao
    ADD CONSTRAINT ordens_producao_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_name_key UNIQUE (name);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_cost_ledgers product_cost_ledgers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_cost_ledgers
    ADD CONSTRAINT product_cost_ledgers_pkey PRIMARY KEY (id);


--
-- Name: product_drawings product_drawings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_drawings
    ADD CONSTRAINT product_drawings_pkey PRIMARY KEY (id);


--
-- Name: product_warehouse_stock product_warehouse_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse_stock
    ADD CONSTRAINT product_warehouse_stock_pkey PRIMARY KEY (id);


--
-- Name: production_cost_settings production_cost_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_cost_settings
    ADD CONSTRAINT production_cost_settings_pkey PRIMARY KEY (id);


--
-- Name: production_downtimes production_downtimes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_downtimes
    ADD CONSTRAINT production_downtimes_pkey PRIMARY KEY (id);


--
-- Name: production_lot_consumptions production_lot_consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT production_lot_consumptions_pkey PRIMARY KEY (id);


--
-- Name: production_order_reservations production_order_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations
    ADD CONSTRAINT production_order_reservations_pkey PRIMARY KEY (id);


--
-- Name: production_order_tracking production_order_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_tracking
    ADD CONSTRAINT production_order_tracking_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_order_number_key UNIQUE (order_number);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: production_route_steps production_route_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_steps
    ADD CONSTRAINT production_route_steps_pkey PRIMARY KEY (id);


--
-- Name: production_routes production_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT production_routes_pkey PRIMARY KEY (id);


--
-- Name: production_routes production_routes_route_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT production_routes_route_code_key UNIQUE (route_code);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_approvals purchase_order_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_approvals
    ADD CONSTRAINT purchase_order_approvals_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_receipts purchase_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_receipts
    ADD CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id);


--
-- Name: purchase_requisition_items purchase_requisition_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_requisitions purchase_requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_pkey PRIMARY KEY (id);


--
-- Name: purchase_requisitions purchase_requisitions_requisition_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_requisition_number_key UNIQUE (requisition_number);


--
-- Name: quality_inspections quality_inspections_inspection_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_inspection_number_key UNIQUE (inspection_number);


--
-- Name: quality_inspections quality_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_pkey PRIMARY KEY (id);


--
-- Name: requisicao_compra_items requisicao_compra_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicao_compra_items
    ADD CONSTRAINT requisicao_compra_items_pkey PRIMARY KEY (id);


--
-- Name: requisicoes_compra requisicoes_compra_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicoes_compra
    ADD CONSTRAINT requisicoes_compra_codigo_key UNIQUE (codigo);


--
-- Name: requisicoes_compra requisicoes_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicoes_compra
    ADD CONSTRAINT requisicoes_compra_pkey PRIMARY KEY (id);


--
-- Name: rfq_items rfq_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_pkey PRIMARY KEY (id);


--
-- Name: rfq_quotes rfq_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_quotes
    ADD CONSTRAINT rfq_quotes_pkey PRIMARY KEY (id);


--
-- Name: rfq_suppliers rfq_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_suppliers
    ADD CONSTRAINT rfq_suppliers_pkey PRIMARY KEY (id);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);


--
-- Name: rfqs rfqs_rfq_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_rfq_number_key UNIQUE (rfq_number);


--
-- Name: sale_invoices sale_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_invoices
    ADD CONSTRAINT sale_invoices_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_pkey PRIMARY KEY (id);


--
-- Name: serial_numbers serial_numbers_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT serial_numbers_serial_number_key UNIQUE (serial_number);


--
-- Name: service_orders service_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_order_number_key UNIQUE (order_number);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: sst_acidente_complementos sst_acidente_complementos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_complementos
    ADD CONSTRAINT sst_acidente_complementos_pkey PRIMARY KEY (id);


--
-- Name: sst_acidente_testemunhas sst_acidente_testemunhas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_testemunhas
    ADD CONSTRAINT sst_acidente_testemunhas_pkey PRIMARY KEY (id);


--
-- Name: sst_acidentes sst_acidentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidentes
    ADD CONSTRAINT sst_acidentes_pkey PRIMARY KEY (id);


--
-- Name: sst_acoes_corretivas sst_acoes_corretivas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acoes_corretivas
    ADD CONSTRAINT sst_acoes_corretivas_pkey PRIMARY KEY (id);


--
-- Name: sst_asos sst_asos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_asos
    ADD CONSTRAINT sst_asos_pkey PRIMARY KEY (id);


--
-- Name: sst_brigadistas sst_brigadistas_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_brigadistas
    ADD CONSTRAINT sst_brigadistas_employee_id_key UNIQUE (employee_id);


--
-- Name: sst_brigadistas sst_brigadistas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_brigadistas
    ADD CONSTRAINT sst_brigadistas_pkey PRIMARY KEY (id);


--
-- Name: sst_candidatos_cipa sst_candidatos_cipa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_candidatos_cipa
    ADD CONSTRAINT sst_candidatos_cipa_pkey PRIMARY KEY (id);


--
-- Name: sst_cats sst_cats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_cats
    ADD CONSTRAINT sst_cats_pkey PRIMARY KEY (id);


--
-- Name: sst_dds_presencas sst_dds_presencas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_dds_presencas
    ADD CONSTRAINT sst_dds_presencas_pkey PRIMARY KEY (id);


--
-- Name: sst_devolucoes_epi sst_devolucoes_epi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_devolucoes_epi
    ADD CONSTRAINT sst_devolucoes_epi_pkey PRIMARY KEY (id);


--
-- Name: sst_entregas_epi sst_entregas_epi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi
    ADD CONSTRAINT sst_entregas_epi_pkey PRIMARY KEY (id);


--
-- Name: sst_estornos_entrega_epi sst_estornos_entrega_epi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_estornos_entrega_epi
    ADD CONSTRAINT sst_estornos_entrega_epi_pkey PRIMARY KEY (id);


--
-- Name: sst_eventos_esocial sst_eventos_esocial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_eventos_esocial
    ADD CONSTRAINT sst_eventos_esocial_pkey PRIMARY KEY (id);


--
-- Name: sst_exames_complementares sst_exames_complementares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_exames_complementares
    ADD CONSTRAINT sst_exames_complementares_pkey PRIMARY KEY (id);


--
-- Name: sst_ges_funcionarios sst_ges_funcionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges_funcionarios
    ADD CONSTRAINT sst_ges_funcionarios_pkey PRIMARY KEY (id);


--
-- Name: sst_ges sst_ges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges
    ADD CONSTRAINT sst_ges_pkey PRIMARY KEY (id);


--
-- Name: sst_inspecao_itens sst_inspecao_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecao_itens
    ADD CONSTRAINT sst_inspecao_itens_pkey PRIMARY KEY (id);


--
-- Name: sst_inspecoes_seguranca sst_inspecoes_seguranca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecoes_seguranca
    ADD CONSTRAINT sst_inspecoes_seguranca_pkey PRIMARY KEY (id);


--
-- Name: sst_investigacoes_acidente sst_investigacoes_acidente_acidente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_investigacoes_acidente
    ADD CONSTRAINT sst_investigacoes_acidente_acidente_id_key UNIQUE (acidente_id);


--
-- Name: sst_investigacoes_acidente sst_investigacoes_acidente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_investigacoes_acidente
    ADD CONSTRAINT sst_investigacoes_acidente_pkey PRIMARY KEY (id);


--
-- Name: sst_mandatos_cipa sst_mandatos_cipa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_mandatos_cipa
    ADD CONSTRAINT sst_mandatos_cipa_pkey PRIMARY KEY (id);


--
-- Name: sst_matriz_epi sst_matriz_epi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_epi
    ADD CONSTRAINT sst_matriz_epi_pkey PRIMARY KEY (id);


--
-- Name: sst_matriz_treinamento sst_matriz_treinamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_treinamento
    ADD CONSTRAINT sst_matriz_treinamento_pkey PRIMARY KEY (id);


--
-- Name: sst_membros_cipa sst_membros_cipa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_membros_cipa
    ADD CONSTRAINT sst_membros_cipa_pkey PRIMARY KEY (id);


--
-- Name: sst_permissoes_trabalho sst_permissoes_trabalho_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_permissoes_trabalho
    ADD CONSTRAINT sst_permissoes_trabalho_pkey PRIMARY KEY (id);


--
-- Name: sst_planos_exames sst_planos_exames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_planos_exames
    ADD CONSTRAINT sst_planos_exames_pkey PRIMARY KEY (id);


--
-- Name: sst_processos_eleitorais_cipa sst_processos_eleitorais_cipa_mandato_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_processos_eleitorais_cipa
    ADD CONSTRAINT sst_processos_eleitorais_cipa_mandato_id_key UNIQUE (mandato_id);


--
-- Name: sst_processos_eleitorais_cipa sst_processos_eleitorais_cipa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_processos_eleitorais_cipa
    ADD CONSTRAINT sst_processos_eleitorais_cipa_pkey PRIMARY KEY (id);


--
-- Name: sst_pt_executantes sst_pt_executantes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_pt_executantes
    ADD CONSTRAINT sst_pt_executantes_pkey PRIMARY KEY (id);


--
-- Name: sst_registros_dds sst_registros_dds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_registros_dds
    ADD CONSTRAINT sst_registros_dds_pkey PRIMARY KEY (id);


--
-- Name: sst_reuniao_cipa_presentes sst_reuniao_cipa_presentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reuniao_cipa_presentes
    ADD CONSTRAINT sst_reuniao_cipa_presentes_pkey PRIMARY KEY (id);


--
-- Name: sst_reunioes_cipa sst_reunioes_cipa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reunioes_cipa
    ADD CONSTRAINT sst_reunioes_cipa_pkey PRIMARY KEY (id);


--
-- Name: sst_risco_epis sst_risco_epis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_epis
    ADD CONSTRAINT sst_risco_epis_pkey PRIMARY KEY (id);


--
-- Name: sst_risco_exames sst_risco_exames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_exames
    ADD CONSTRAINT sst_risco_exames_pkey PRIMARY KEY (id);


--
-- Name: sst_riscos_ocupacionais sst_riscos_ocupacionais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_riscos_ocupacionais
    ADD CONSTRAINT sst_riscos_ocupacionais_pkey PRIMARY KEY (id);


--
-- Name: sst_tipos_epi sst_tipos_epi_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_tipos_epi
    ADD CONSTRAINT sst_tipos_epi_item_id_key UNIQUE (item_id);


--
-- Name: sst_tipos_epi sst_tipos_epi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_tipos_epi
    ADD CONSTRAINT sst_tipos_epi_pkey PRIMARY KEY (id);


--
-- Name: sst_treinamentos sst_treinamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_treinamentos
    ADD CONSTRAINT sst_treinamentos_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_cnpj_key UNIQUE (cnpj);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: ti_settings ti_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ti_settings
    ADD CONSTRAINT ti_settings_pkey PRIMARY KEY (id);


--
-- Name: treasury_bank_accounts treasury_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treasury_bank_accounts
    ADD CONSTRAINT treasury_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: treasury_financial_operations treasury_financial_operations_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treasury_financial_operations
    ADD CONSTRAINT treasury_financial_operations_contract_number_key UNIQUE (contract_number);


--
-- Name: treasury_financial_operations treasury_financial_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treasury_financial_operations
    ADD CONSTRAINT treasury_financial_operations_pkey PRIMARY KEY (id);


--
-- Name: access_profile_permissions uq_access_profile_permissions_profile_module; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions
    ADD CONSTRAINT uq_access_profile_permissions_profile_module UNIQUE (access_profile_id, module);


--
-- Name: import_process_approvals uq_import_process_approvals_process_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_approvals
    ADD CONSTRAINT uq_import_process_approvals_process_role UNIQUE (import_process_id, approver_role);


--
-- Name: item_estruturas uq_item_estruturas_ativa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT uq_item_estruturas_ativa UNIQUE (item_pai_id, item_componente_id, revisao);


--
-- Name: item_suppliers uq_item_suppliers_item_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT uq_item_suppliers_item_supplier UNIQUE (item_id, supplier_id);


--
-- Name: jur_contract_addendums uq_jur_contract_addendums_contract_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_addendums
    ADD CONSTRAINT uq_jur_contract_addendums_contract_number UNIQUE (contract_id, addendum_number);


--
-- Name: jur_contract_approvals uq_jur_contract_approvals_contract_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_approvals
    ADD CONSTRAINT uq_jur_contract_approvals_contract_role UNIQUE (contract_id, approver_role);


--
-- Name: jur_contract_documents uq_jur_contract_documents_contract_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_documents
    ADD CONSTRAINT uq_jur_contract_documents_contract_version UNIQUE (contract_id, version_number);


--
-- Name: jur_ip_contract_links uq_jur_ip_contract_links_ip_contract; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_ip_contract_links
    ADD CONSTRAINT uq_jur_ip_contract_links_ip_contract UNIQUE (ip_id, contract_id);


--
-- Name: mrp_ordens_planejadas uq_mrp_sem_duplicidade; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mrp_ordens_planejadas
    ADD CONSTRAINT uq_mrp_sem_duplicidade UNIQUE (item_id, origem, origem_id, data_necessidade);


--
-- Name: product_drawings uq_product_drawings_number_revision; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_drawings
    ADD CONSTRAINT uq_product_drawings_number_revision UNIQUE (drawing_number, revision);


--
-- Name: product_warehouse_stock uq_product_warehouse_stock_product_warehouse; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse_stock
    ADD CONSTRAINT uq_product_warehouse_stock_product_warehouse UNIQUE (product_id, warehouse_id);


--
-- Name: purchase_order_approvals uq_purchase_order_approvals_purchase_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_approvals
    ADD CONSTRAINT uq_purchase_order_approvals_purchase_role UNIQUE (purchase_id, approver_role);


--
-- Name: rfq_quotes uq_rfq_quotes_item_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_quotes
    ADD CONSTRAINT uq_rfq_quotes_item_supplier UNIQUE (rfq_item_id, supplier_id);


--
-- Name: rfq_suppliers uq_rfq_suppliers_rfq_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_suppliers
    ADD CONSTRAINT uq_rfq_suppliers_rfq_supplier UNIQUE (rfq_id, supplier_id);


--
-- Name: work_center_shifts uq_work_center_shifts_center_weekday_start; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_center_shifts
    ADD CONSTRAINT uq_work_center_shifts_center_weekday_start UNIQUE (work_center_id, weekday, start_time);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: warehouse_transfers warehouse_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_code_key UNIQUE (code);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhooks_eventos webhooks_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks_eventos
    ADD CONSTRAINT webhooks_eventos_pkey PRIMARY KEY (id);


--
-- Name: work_center_shifts work_center_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_center_shifts
    ADD CONSTRAINT work_center_shifts_pkey PRIMARY KEY (id);


--
-- Name: work_centers work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_code_key UNIQUE (code);


--
-- Name: work_centers work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_type_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_type_entity_id ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: departments_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX departments_code ON public.departments USING btree (code);


--
-- Name: departments_sigla; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX departments_sigla ON public.departments USING btree (sigla);


--
-- Name: idx_access_profile_permissions_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_profile_permissions_profile_id ON public.access_profile_permissions USING btree (access_profile_id);


--
-- Name: idx_accounting_chart_of_accounts_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_chart_of_accounts_account_type ON public.accounting_chart_of_accounts USING btree (account_type);


--
-- Name: idx_accounting_chart_of_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_chart_of_accounts_active ON public.accounting_chart_of_accounts USING btree (active);


--
-- Name: idx_accounting_chart_of_accounts_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_chart_of_accounts_parent_id ON public.accounting_chart_of_accounts USING btree (parent_id);


--
-- Name: idx_accounting_entries_entry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entries_entry_date ON public.accounting_entries USING btree (entry_date);


--
-- Name: idx_accounting_entries_entry_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entries_entry_type ON public.accounting_entries USING btree (entry_type);


--
-- Name: idx_accounting_entries_reversal_of_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entries_reversal_of_id ON public.accounting_entries USING btree (reversal_of_id);


--
-- Name: idx_accounting_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entries_status ON public.accounting_entries USING btree (status);


--
-- Name: idx_accounting_entry_items_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entry_items_account_id ON public.accounting_entry_items USING btree (account_id);


--
-- Name: idx_accounting_entry_items_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entry_items_cost_center_id ON public.accounting_entry_items USING btree (cost_center_id);


--
-- Name: idx_accounting_entry_items_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_entry_items_entry_id ON public.accounting_entry_items USING btree (entry_id);


--
-- Name: idx_accounts_payable_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_payable_cost_center_id ON public.accounts_payable USING btree (cost_center_id);


--
-- Name: idx_accounts_payable_legal_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_payable_legal_case_id ON public.accounts_payable USING btree (legal_case_id);


--
-- Name: idx_accounts_receivable_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_receivable_cost_center_id ON public.accounts_receivable USING btree (cost_center_id);


--
-- Name: idx_acoustic_test_results_passed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acoustic_test_results_passed ON public.acoustic_test_results USING btree (passed);


--
-- Name: idx_acoustic_test_results_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acoustic_test_results_product_id ON public.acoustic_test_results USING btree (product_id);


--
-- Name: idx_acoustic_test_results_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acoustic_test_results_serial_number ON public.acoustic_test_results USING btree (serial_number);


--
-- Name: idx_acoustic_test_results_test_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acoustic_test_results_test_date ON public.acoustic_test_results USING btree (test_date);


--
-- Name: idx_acoustic_test_results_test_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acoustic_test_results_test_type ON public.acoustic_test_results USING btree (test_type);


--
-- Name: idx_assets_purchase_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_purchase_item_id ON public.assets USING btree (purchase_item_id);


--
-- Name: idx_auditoria_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_correlation ON public.auditoria_eventos USING btree (correlation_id);


--
-- Name: idx_auditoria_entidade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_entidade ON public.auditoria_eventos USING btree (entidade, entidade_id, criado_em DESC);


--
-- Name: idx_bank_statement_entries_fitid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statement_entries_fitid ON public.bank_statement_entries USING btree (fitid);


--
-- Name: idx_bank_statement_entries_matched_payable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statement_entries_matched_payable ON public.bank_statement_entries USING btree (matched_payable_id);


--
-- Name: idx_bank_statement_entries_matched_receivable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statement_entries_matched_receivable ON public.bank_statement_entries USING btree (matched_receivable_id);


--
-- Name: idx_bank_statement_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statement_entries_status ON public.bank_statement_entries USING btree (status);


--
-- Name: idx_bank_statements_imported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_imported_by ON public.bank_statements USING btree (imported_by);


--
-- Name: idx_bill_of_material_items_bom_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_of_material_items_bom_item_id ON public.bill_of_material_items USING btree (bom_id, item_id);


--
-- Name: idx_bill_of_material_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_of_material_items_item_id ON public.bill_of_material_items USING btree (item_id);


--
-- Name: idx_bill_of_material_items_level_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_of_material_items_level_item_id ON public.bill_of_material_items USING btree (bom_level, item_id);


--
-- Name: idx_bom_item_bom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_bom ON public.bill_of_material_items USING btree (bom_id);


--
-- Name: idx_bom_item_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_component ON public.bill_of_material_items USING btree (component_product_id);


--
-- Name: idx_bom_item_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_item_id ON public.bill_of_material_items USING btree (item_id);


--
-- Name: idx_bom_item_item_id_bom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_item_id_bom ON public.bill_of_material_items USING btree (item_id, bom_id);


--
-- Name: idx_bom_item_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_level ON public.bill_of_material_items USING btree (bom_id, bom_level);


--
-- Name: idx_bom_item_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_parent ON public.bill_of_material_items USING btree (parent_item_id);


--
-- Name: idx_bom_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_product ON public.bill_of_materials USING btree (product_id);


--
-- Name: idx_bom_product_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_product_active ON public.bill_of_materials USING btree (product_id, status);


--
-- Name: idx_bom_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_status ON public.bill_of_materials USING btree (status);


--
-- Name: idx_budget_lines_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_cost_center_id ON public.budget_lines USING btree (cost_center_id);


--
-- Name: idx_budget_lines_year_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_year_month ON public.budget_lines USING btree (year, month);


--
-- Name: idx_cnab_remittance_items_receivable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_remittance_items_receivable_id ON public.cnab_remittance_items USING btree (receivable_id);


--
-- Name: idx_cnab_remittance_items_remittance_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_remittance_items_remittance_id ON public.cnab_remittance_items USING btree (remittance_id);


--
-- Name: idx_cnab_remittance_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_remittance_items_status ON public.cnab_remittance_items USING btree (status);


--
-- Name: idx_cnab_remittances_generated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_remittances_generated_by ON public.cnab_remittances USING btree (generated_by);


--
-- Name: idx_cnab_remittances_sequential_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_remittances_sequential_number ON public.cnab_remittances USING btree (sequential_number);


--
-- Name: idx_cnab_return_files_processed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_return_files_processed_by ON public.cnab_return_files USING btree (processed_by);


--
-- Name: idx_cnab_return_occurrences_nosso_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_return_occurrences_nosso_numero ON public.cnab_return_occurrences USING btree (nosso_numero);


--
-- Name: idx_cnab_return_occurrences_remittance_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_return_occurrences_remittance_item_id ON public.cnab_return_occurrences USING btree (remittance_item_id);


--
-- Name: idx_cnab_return_occurrences_return_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cnab_return_occurrences_return_file_id ON public.cnab_return_occurrences USING btree (return_file_id);


--
-- Name: idx_customer_price_lists_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_price_lists_customer_id ON public.customer_price_lists USING btree (customer_id);


--
-- Name: idx_customer_price_lists_customer_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_price_lists_customer_product ON public.customer_price_lists USING btree (customer_id, product_id);


--
-- Name: idx_customer_price_lists_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_price_lists_product_id ON public.customer_price_lists USING btree (product_id);


--
-- Name: idx_departments_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_cost_center_id ON public.departments USING btree (cost_center_id);


--
-- Name: idx_employees_job_position_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_job_position_id ON public.employees USING btree (job_position_id);


--
-- Name: idx_engineering_projects_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engineering_projects_product_id ON public.engineering_projects USING btree (product_id);


--
-- Name: idx_engineering_projects_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engineering_projects_stage ON public.engineering_projects USING btree (stage);


--
-- Name: idx_engineering_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engineering_projects_status ON public.engineering_projects USING btree (status);


--
-- Name: idx_facility_areas_area_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_areas_area_type ON public.facility_areas USING btree (area_type);


--
-- Name: idx_facility_areas_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_areas_department_id ON public.facility_areas USING btree (department_id);


--
-- Name: idx_facility_cleaning_executions_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_cleaning_executions_executed_at ON public.facility_cleaning_executions USING btree (executed_at);


--
-- Name: idx_facility_cleaning_executions_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_cleaning_executions_plan_id ON public.facility_cleaning_executions USING btree (plan_id);


--
-- Name: idx_facility_cleaning_schedules_facility_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_cleaning_schedules_facility_area_id ON public.facility_cleaning_schedules USING btree (facility_area_id);


--
-- Name: idx_facility_cleaning_schedules_next_cleaning; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_cleaning_schedules_next_cleaning ON public.facility_cleaning_schedules USING btree (next_cleaning);


--
-- Name: idx_facility_correspondence_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_correspondence_received_at ON public.facility_correspondence USING btree (received_at);


--
-- Name: idx_facility_correspondence_recipient_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_correspondence_recipient_department_id ON public.facility_correspondence USING btree (recipient_department_id);


--
-- Name: idx_facility_correspondence_recipient_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_correspondence_recipient_employee_id ON public.facility_correspondence USING btree (recipient_employee_id);


--
-- Name: idx_facility_drivers_authorized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_drivers_authorized ON public.facility_drivers USING btree (authorized);


--
-- Name: idx_facility_drivers_cnh_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_drivers_cnh_valid_until ON public.facility_drivers USING btree (cnh_valid_until);


--
-- Name: idx_facility_fines_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fines_asset_id ON public.facility_fines USING btree (asset_id);


--
-- Name: idx_facility_fines_identified_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fines_identified_driver_id ON public.facility_fines USING btree (identified_driver_id);


--
-- Name: idx_facility_fines_indication_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fines_indication_deadline ON public.facility_fines USING btree (indication_deadline);


--
-- Name: idx_facility_fines_indication_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fines_indication_status ON public.facility_fines USING btree (indication_status);


--
-- Name: idx_facility_fines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fines_status ON public.facility_fines USING btree (status);


--
-- Name: idx_facility_fuel_records_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fuel_records_asset_id ON public.facility_fuel_records USING btree (asset_id);


--
-- Name: idx_facility_fuel_records_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fuel_records_driver_id ON public.facility_fuel_records USING btree (driver_id);


--
-- Name: idx_facility_fuel_records_record_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fuel_records_record_date ON public.facility_fuel_records USING btree (record_date);


--
-- Name: idx_facility_fuel_records_trip_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_fuel_records_trip_id ON public.facility_fuel_records USING btree (trip_id);


--
-- Name: idx_facility_vehicle_details_fuel_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_details_fuel_type ON public.facility_vehicle_details USING btree (fuel_type);


--
-- Name: idx_facility_vehicle_documents_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_documents_asset_id ON public.facility_vehicle_documents USING btree (asset_id);


--
-- Name: idx_facility_vehicle_documents_doc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_documents_doc_type ON public.facility_vehicle_documents USING btree (doc_type);


--
-- Name: idx_facility_vehicle_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_documents_status ON public.facility_vehicle_documents USING btree (status);


--
-- Name: idx_facility_vehicle_documents_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_documents_valid_until ON public.facility_vehicle_documents USING btree (valid_until);


--
-- Name: idx_facility_vehicle_trips_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_trips_asset_id ON public.facility_vehicle_trips USING btree (asset_id);


--
-- Name: idx_facility_vehicle_trips_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_trips_driver_id ON public.facility_vehicle_trips USING btree (driver_id);


--
-- Name: idx_facility_vehicle_trips_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_vehicle_trips_status ON public.facility_vehicle_trips USING btree (status);


--
-- Name: idx_facility_visitors_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_visitors_document ON public.facility_visitors USING btree (document);


--
-- Name: idx_facility_visits_checkin_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_visits_checkin_at ON public.facility_visits USING btree (checkin_at);


--
-- Name: idx_facility_visits_host_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_visits_host_employee_id ON public.facility_visits USING btree (host_employee_id);


--
-- Name: idx_facility_visits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_visits_status ON public.facility_visits USING btree (status);


--
-- Name: idx_facility_visits_visitor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facility_visits_visitor_id ON public.facility_visits USING btree (visitor_id);


--
-- Name: idx_hr_absences_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_absences_employee_id ON public.hr_absences USING btree (employee_id);


--
-- Name: idx_hr_absences_employee_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_absences_employee_open ON public.hr_absences USING btree (employee_id, actual_end_date);


--
-- Name: idx_hr_absences_type_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_absences_type_start_date ON public.hr_absences USING btree (type, start_date);


--
-- Name: idx_hr_admission_processes_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_admission_processes_department_id ON public.hr_admission_processes USING btree (department_id);


--
-- Name: idx_hr_admission_processes_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_admission_processes_employee_id ON public.hr_admission_processes USING btree (employee_id);


--
-- Name: idx_hr_admission_processes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_admission_processes_status ON public.hr_admission_processes USING btree (status);


--
-- Name: idx_hr_benefit_types_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_benefit_types_category ON public.hr_benefit_types USING btree (category);


--
-- Name: idx_hr_candidates_job_vacancy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_candidates_job_vacancy_id ON public.hr_candidates USING btree (job_vacancy_id);


--
-- Name: idx_hr_candidates_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_candidates_stage ON public.hr_candidates USING btree (stage);


--
-- Name: idx_hr_employee_benefits_benefit_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_benefits_benefit_type_id ON public.hr_employee_benefits USING btree (benefit_type_id);


--
-- Name: idx_hr_employee_benefits_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_benefits_employee_id ON public.hr_employee_benefits USING btree (employee_id);


--
-- Name: idx_hr_employee_benefits_enrollment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_benefits_enrollment_status ON public.hr_employee_benefits USING btree (enrollment_status);


--
-- Name: idx_hr_employee_contracts_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_contracts_employee_id ON public.hr_employee_contracts USING btree (employee_id);


--
-- Name: idx_hr_employee_contracts_experiencia_alerta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_contracts_experiencia_alerta ON public.hr_employee_contracts USING btree (type, period_1_end_date);


--
-- Name: idx_hr_employee_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_contracts_status ON public.hr_employee_contracts USING btree (status);


--
-- Name: idx_hr_employee_documents_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_documents_employee_id ON public.hr_employee_documents USING btree (employee_id);


--
-- Name: idx_hr_employee_documents_employee_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_documents_employee_type ON public.hr_employee_documents USING btree (employee_id, doc_type);


--
-- Name: idx_hr_employee_documents_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_documents_valid_until ON public.hr_employee_documents USING btree (valid_until);


--
-- Name: idx_hr_employee_job_history_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_job_history_employee_id ON public.hr_employee_job_history USING btree (employee_id);


--
-- Name: idx_hr_employee_job_history_employee_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_job_history_employee_open ON public.hr_employee_job_history USING btree (employee_id, effective_to);


--
-- Name: idx_hr_employee_trainings_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_trainings_employee_id ON public.hr_employee_trainings USING btree (employee_id);


--
-- Name: idx_hr_employee_trainings_training_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_trainings_training_course_id ON public.hr_employee_trainings USING btree (training_course_id);


--
-- Name: idx_hr_employee_trainings_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_employee_trainings_valid_until ON public.hr_employee_trainings USING btree (valid_until);


--
-- Name: idx_hr_job_positions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_job_positions_active ON public.hr_job_positions USING btree (active);


--
-- Name: idx_hr_job_positions_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_job_positions_department_id ON public.hr_job_positions USING btree (department_id);


--
-- Name: idx_hr_job_vacancies_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_job_vacancies_department_id ON public.hr_job_vacancies USING btree (department_id);


--
-- Name: idx_hr_job_vacancies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_job_vacancies_status ON public.hr_job_vacancies USING btree (status);


--
-- Name: idx_hr_payroll_import_batches_competencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_payroll_import_batches_competencia ON public.hr_payroll_import_batches USING btree (competencia);


--
-- Name: idx_hr_payroll_import_items_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_payroll_import_items_batch_id ON public.hr_payroll_import_items USING btree (batch_id);


--
-- Name: idx_hr_payroll_import_items_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_payroll_import_items_cost_center_id ON public.hr_payroll_import_items USING btree (cost_center_id);


--
-- Name: idx_hr_payroll_import_items_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_payroll_import_items_employee_id ON public.hr_payroll_import_items USING btree (employee_id);


--
-- Name: idx_hr_performance_reviews_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_performance_reviews_employee_id ON public.hr_performance_reviews USING btree (employee_id);


--
-- Name: idx_hr_performance_reviews_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_performance_reviews_period ON public.hr_performance_reviews USING btree (period);


--
-- Name: idx_hr_termination_processes_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_termination_processes_employee_id ON public.hr_termination_processes USING btree (employee_id);


--
-- Name: idx_hr_termination_processes_payment_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_termination_processes_payment_deadline ON public.hr_termination_processes USING btree (payment_deadline);


--
-- Name: idx_hr_termination_processes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_termination_processes_status ON public.hr_termination_processes USING btree (status);


--
-- Name: idx_hr_time_sheet_summaries_data_limite_compensacao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_time_sheet_summaries_data_limite_compensacao ON public.hr_time_sheet_summaries USING btree (data_limite_compensacao_banco);


--
-- Name: idx_hr_vacation_accrual_periods_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_vacation_accrual_periods_employee_id ON public.hr_vacation_accrual_periods USING btree (employee_id);


--
-- Name: idx_hr_vacation_accrual_periods_status_concessive_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_vacation_accrual_periods_status_concessive_end ON public.hr_vacation_accrual_periods USING btree (status, concessive_end);


--
-- Name: idx_hr_vacation_schedules_accrual_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_vacation_schedules_accrual_period_id ON public.hr_vacation_schedules USING btree (accrual_period_id);


--
-- Name: idx_hr_vacation_schedules_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hr_vacation_schedules_start_date ON public.hr_vacation_schedules USING btree (start_date);


--
-- Name: idx_import_process_approvals_process_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_process_approvals_process_id ON public.import_process_approvals USING btree (import_process_id);


--
-- Name: idx_import_process_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_process_items_item_id ON public.import_process_items USING btree (item_id);


--
-- Name: idx_import_process_items_process_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_process_items_process_id ON public.import_process_items USING btree (import_process_id);


--
-- Name: idx_import_processes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_processes_created_by ON public.import_processes USING btree (created_by);


--
-- Name: idx_import_processes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_processes_status ON public.import_processes USING btree (status);


--
-- Name: idx_import_processes_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_processes_supplier_id ON public.import_processes USING btree (supplier_id);


--
-- Name: idx_inventory_count_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_count_items_item_id ON public.inventory_count_items USING btree (item_id);


--
-- Name: idx_inventory_counts_approved_by_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_counts_approved_by_fk ON public.inventory_counts USING btree (approved_by);


--
-- Name: idx_inventory_counts_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_counts_assigned_to ON public.inventory_counts USING btree (assigned_to);


--
-- Name: idx_inventory_counts_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_counts_department_id ON public.inventory_counts USING btree (department_id);


--
-- Name: idx_inventory_counts_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_counts_warehouse_id ON public.inventory_counts USING btree (warehouse_id);


--
-- Name: idx_inventory_movements_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements USING btree (item_id);


--
-- Name: idx_inventory_movements_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_item_id_created_at ON public.inventory_movements USING btree (item_id, created_at DESC);


--
-- Name: idx_inventory_movements_item_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_item_id_fk ON public.inventory_movements USING btree (item_id);


--
-- Name: idx_inventory_movements_item_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_item_id_type ON public.inventory_movements USING btree (item_id, type);


--
-- Name: idx_inventory_movements_user_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_user_id_fk ON public.inventory_movements USING btree (user_id);


--
-- Name: idx_inventory_movements_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_warehouse_id ON public.inventory_movements USING btree (warehouse_id);


--
-- Name: idx_it_access_requests_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_access_requests_department_id ON public.it_access_requests USING btree (department_id);


--
-- Name: idx_it_access_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_access_requests_employee_id ON public.it_access_requests USING btree (employee_id);


--
-- Name: idx_it_access_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_access_requests_status ON public.it_access_requests USING btree (status);


--
-- Name: idx_it_access_requests_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_access_requests_type ON public.it_access_requests USING btree (type);


--
-- Name: idx_it_backup_logs_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_backup_logs_success ON public.it_backup_logs USING btree (success);


--
-- Name: idx_it_backup_logs_type_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_backup_logs_type_executed_at ON public.it_backup_logs USING btree (backup_type, executed_at);


--
-- Name: idx_it_license_seats_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_license_seats_employee_id ON public.it_license_seats USING btree (employee_id);


--
-- Name: idx_it_license_seats_license_detail_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_license_seats_license_detail_id ON public.it_license_seats USING btree (license_detail_id);


--
-- Name: idx_it_responsibility_terms_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_responsibility_terms_asset_id ON public.it_responsibility_terms USING btree (asset_id);


--
-- Name: idx_it_responsibility_terms_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_responsibility_terms_employee_id ON public.it_responsibility_terms USING btree (employee_id);


--
-- Name: idx_it_responsibility_terms_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_responsibility_terms_status ON public.it_responsibility_terms USING btree (status);


--
-- Name: idx_it_ticket_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_ticket_categories_active ON public.it_ticket_categories USING btree (active);


--
-- Name: idx_it_ticket_comments_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_ticket_comments_ticket_id ON public.it_ticket_comments USING btree (ticket_id);


--
-- Name: idx_it_ticket_priority_history_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_ticket_priority_history_ticket_id ON public.it_ticket_priority_history USING btree (ticket_id);


--
-- Name: idx_it_tickets_access_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_access_request_id ON public.it_tickets USING btree (access_request_id);


--
-- Name: idx_it_tickets_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_asset_id ON public.it_tickets USING btree (asset_id);


--
-- Name: idx_it_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_assigned_to ON public.it_tickets USING btree (assigned_to);


--
-- Name: idx_it_tickets_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_category_id ON public.it_tickets USING btree (category_id);


--
-- Name: idx_it_tickets_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_priority ON public.it_tickets USING btree (priority);


--
-- Name: idx_it_tickets_requester_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_requester_id ON public.it_tickets USING btree (requester_id);


--
-- Name: idx_it_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_it_tickets_status ON public.it_tickets USING btree (status);


--
-- Name: idx_item_categorias_codigo_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_categorias_codigo_unique ON public.item_categorias USING btree (codigo);


--
-- Name: idx_item_detalhes_comerciais_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_detalhes_comerciais_categoria_id ON public.item_detalhes_comerciais USING btree (categoria_id);


--
-- Name: idx_item_detalhes_comerciais_ncm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_detalhes_comerciais_ncm ON public.item_detalhes_comerciais USING btree (ncm);


--
-- Name: idx_item_especificacoes_tecnicas_atributos_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_especificacoes_tecnicas_atributos_gin ON public.item_especificacoes_tecnicas USING gin (atributos jsonb_path_ops);


--
-- Name: idx_item_especificacoes_tecnicas_familia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_especificacoes_tecnicas_familia ON public.item_especificacoes_tecnicas USING btree (familia_tecnica);


--
-- Name: idx_item_estruturas_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_approved_by ON public.item_estruturas USING btree (approved_by);


--
-- Name: idx_item_estruturas_arvore; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_arvore ON public.item_estruturas USING btree (item_pai_id, item_componente_id, nivel, sequencia);


--
-- Name: idx_item_estruturas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_ativo ON public.item_estruturas USING btree (ativo);


--
-- Name: idx_item_estruturas_component_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_component_type ON public.item_estruturas USING btree (component_type);


--
-- Name: idx_item_estruturas_componente_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_componente_ativo ON public.item_estruturas USING btree (item_componente_id, ativo);


--
-- Name: idx_item_estruturas_is_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_is_critical ON public.item_estruturas USING btree (is_critical);


--
-- Name: idx_item_estruturas_item_componente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_item_componente ON public.item_estruturas USING btree (item_componente_id);


--
-- Name: idx_item_estruturas_item_pai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_item_pai ON public.item_estruturas USING btree (item_pai_id);


--
-- Name: idx_item_estruturas_pai_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_pai_ativo ON public.item_estruturas USING btree (item_pai_id, ativo, revisao);


--
-- Name: idx_item_estruturas_pai_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_pai_status ON public.item_estruturas USING btree (item_pai_id, status);


--
-- Name: idx_item_estruturas_parent_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_parent_item ON public.item_estruturas USING btree (parent_item_estrutura_id);


--
-- Name: idx_item_estruturas_parent_sequencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_parent_sequencia ON public.item_estruturas USING btree (parent_item_estrutura_id, sequencia);


--
-- Name: idx_item_estruturas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_status ON public.item_estruturas USING btree (status);


--
-- Name: idx_item_suppliers_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_suppliers_item_id ON public.item_suppliers USING btree (item_id);


--
-- Name: idx_item_suppliers_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_suppliers_supplier_id ON public.item_suppliers USING btree (supplier_id);


--
-- Name: idx_items_codigo_trgm_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_codigo_trgm_like ON public.items USING btree (codigo text_pattern_ops);


--
-- Name: idx_items_codigo_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_items_codigo_unique ON public.items USING btree (codigo);


--
-- Name: idx_items_conversao_automatica; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_conversao_automatica ON public.items USING btree (conversao_automatica) WHERE (conversao_automatica = true);


--
-- Name: idx_items_fornecedor_padrao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_fornecedor_padrao ON public.items USING btree (fornecedor_padrao_id);


--
-- Name: idx_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_status ON public.items USING btree (status);


--
-- Name: idx_items_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_tipo ON public.items USING btree (tipo);


--
-- Name: idx_items_tipo_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_tipo_status ON public.items USING btree (tipo, status);


--
-- Name: idx_jur_contract_addendums_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contract_addendums_contract_id ON public.jur_contract_addendums USING btree (contract_id);


--
-- Name: idx_jur_contract_approvals_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contract_approvals_contract_id ON public.jur_contract_approvals USING btree (contract_id);


--
-- Name: idx_jur_contract_documents_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contract_documents_contract_id ON public.jur_contract_documents USING btree (contract_id);


--
-- Name: idx_jur_contract_signatories_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contract_signatories_contract_id ON public.jur_contract_signatories USING btree (contract_id);


--
-- Name: idx_jur_contracts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_client_id ON public.jur_contracts USING btree (client_id);


--
-- Name: idx_jur_contracts_contract_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_contract_type ON public.jur_contracts USING btree (contract_type);


--
-- Name: idx_jur_contracts_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_employee_id ON public.jur_contracts USING btree (employee_id);


--
-- Name: idx_jur_contracts_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_end_date ON public.jur_contracts USING btree (end_date);


--
-- Name: idx_jur_contracts_responsible_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_responsible_user_id ON public.jur_contracts USING btree (responsible_user_id);


--
-- Name: idx_jur_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_status ON public.jur_contracts USING btree (status);


--
-- Name: idx_jur_contracts_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_contracts_supplier_id ON public.jur_contracts USING btree (supplier_id);


--
-- Name: idx_jur_corporate_acts_act_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_corporate_acts_act_date ON public.jur_corporate_acts USING btree (act_date);


--
-- Name: idx_jur_corporate_acts_act_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_corporate_acts_act_type ON public.jur_corporate_acts USING btree (act_type);


--
-- Name: idx_jur_corporate_acts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_corporate_acts_status ON public.jur_corporate_acts USING btree (status);


--
-- Name: idx_jur_external_lawyers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_external_lawyers_active ON public.jur_external_lawyers USING btree (active);


--
-- Name: idx_jur_external_lawyers_oab_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_external_lawyers_oab_number ON public.jur_external_lawyers USING btree (oab_number);


--
-- Name: idx_jur_intellectual_property_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_intellectual_property_expiration_date ON public.jur_intellectual_property USING btree (expiration_date);


--
-- Name: idx_jur_intellectual_property_ip_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_intellectual_property_ip_type ON public.jur_intellectual_property USING btree (ip_type);


--
-- Name: idx_jur_intellectual_property_next_annuity_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_intellectual_property_next_annuity_date ON public.jur_intellectual_property USING btree (next_annuity_date);


--
-- Name: idx_jur_intellectual_property_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_intellectual_property_status ON public.jur_intellectual_property USING btree (status);


--
-- Name: idx_jur_ip_contract_links_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_ip_contract_links_contract_id ON public.jur_ip_contract_links USING btree (contract_id);


--
-- Name: idx_jur_legal_alerts_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_alerts_due_date ON public.jur_legal_alerts USING btree (due_date);


--
-- Name: idx_jur_legal_alerts_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_alerts_origin ON public.jur_legal_alerts USING btree (origin_type, origin_id);


--
-- Name: idx_jur_legal_alerts_recipient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_alerts_recipient_status ON public.jur_legal_alerts USING btree (recipient_user_id, status);


--
-- Name: idx_jur_legal_case_deadlines_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_deadlines_due_date ON public.jur_legal_case_deadlines USING btree (due_date);


--
-- Name: idx_jur_legal_case_deadlines_is_fatal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_deadlines_is_fatal ON public.jur_legal_case_deadlines USING btree (is_fatal);


--
-- Name: idx_jur_legal_case_deadlines_legal_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_deadlines_legal_case_id ON public.jur_legal_case_deadlines USING btree (legal_case_id);


--
-- Name: idx_jur_legal_case_deadlines_responsible_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_deadlines_responsible_user_id ON public.jur_legal_case_deadlines USING btree (responsible_user_id);


--
-- Name: idx_jur_legal_case_deadlines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_deadlines_status ON public.jur_legal_case_deadlines USING btree (status);


--
-- Name: idx_jur_legal_case_events_case_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_events_case_occurred ON public.jur_legal_case_events USING btree (legal_case_id, occurred_at);


--
-- Name: idx_jur_legal_case_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_events_event_type ON public.jur_legal_case_events USING btree (event_type);


--
-- Name: idx_jur_legal_case_provisions_case_assessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_provisions_case_assessed ON public.jur_legal_case_provisions USING btree (legal_case_id, assessed_at);


--
-- Name: idx_jur_legal_case_provisions_risk_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_case_provisions_risk_class ON public.jur_legal_case_provisions USING btree (risk_class);


--
-- Name: idx_jur_legal_cases_case_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_cases_case_type ON public.jur_legal_cases USING btree (case_type);


--
-- Name: idx_jur_legal_cases_external_lawyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_cases_external_lawyer_id ON public.jur_legal_cases USING btree (external_lawyer_id);


--
-- Name: idx_jur_legal_cases_internal_responsible_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_cases_internal_responsible_user_id ON public.jur_legal_cases USING btree (internal_responsible_user_id);


--
-- Name: idx_jur_legal_cases_opposing_party_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_cases_opposing_party_employee_id ON public.jur_legal_cases USING btree (opposing_party_employee_id);


--
-- Name: idx_jur_legal_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_legal_cases_status ON public.jur_legal_cases USING btree (status);


--
-- Name: idx_jur_lgpd_dsr_dpo_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_dsr_dpo_user_id ON public.jur_lgpd_data_subject_requests USING btree (dpo_user_id);


--
-- Name: idx_jur_lgpd_dsr_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_dsr_due_date ON public.jur_lgpd_data_subject_requests USING btree (due_date);


--
-- Name: idx_jur_lgpd_dsr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_dsr_status ON public.jur_lgpd_data_subject_requests USING btree (status);


--
-- Name: idx_jur_lgpd_incidents_dpo_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_incidents_dpo_user_id ON public.jur_lgpd_incidents USING btree (dpo_user_id);


--
-- Name: idx_jur_lgpd_incidents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_incidents_status ON public.jur_lgpd_incidents USING btree (status);


--
-- Name: idx_jur_lgpd_processing_activities_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_processing_activities_department_id ON public.jur_lgpd_processing_activities USING btree (department_id);


--
-- Name: idx_jur_lgpd_processing_activities_next_review_due_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_lgpd_processing_activities_next_review_due_at ON public.jur_lgpd_processing_activities USING btree (next_review_due_at);


--
-- Name: idx_jur_proxies_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_proxies_employee_id ON public.jur_proxies USING btree (employee_id);


--
-- Name: idx_jur_proxies_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_proxies_expiration_date ON public.jur_proxies USING btree (expiration_date);


--
-- Name: idx_jur_proxies_external_lawyer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_proxies_external_lawyer_id ON public.jur_proxies USING btree (external_lawyer_id);


--
-- Name: idx_jur_proxies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jur_proxies_status ON public.jur_proxies USING btree (status);


--
-- Name: idx_lot_controls_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_item_id ON public.lot_controls USING btree (item_id);


--
-- Name: idx_lot_controls_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_item_id_created_at ON public.lot_controls USING btree (item_id, created_at DESC);


--
-- Name: idx_lot_controls_item_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_item_id_status ON public.lot_controls USING btree (item_id, status);


--
-- Name: idx_lot_controls_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_warehouse_id ON public.lot_controls USING btree (warehouse_id);


--
-- Name: idx_lotes_item_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_item_codigo ON public.lotes USING btree (item_id, codigo_lote);


--
-- Name: idx_maintenance_orders_facility_area_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_orders_facility_area_id ON public.maintenance_orders USING btree (facility_area_id);


--
-- Name: idx_maintenance_orders_facility_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_orders_facility_specialty ON public.maintenance_orders USING btree (facility_specialty);


--
-- Name: idx_marketing_campaigns_campaign_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_campaign_type ON public.marketing_campaigns USING btree (campaign_type);


--
-- Name: idx_marketing_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns USING btree (status);


--
-- Name: idx_marketing_event_checklist_items_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_event_checklist_items_event_id ON public.marketing_event_checklist_items USING btree (event_id);


--
-- Name: idx_marketing_event_checklist_items_responsible_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_event_checklist_items_responsible_user_id ON public.marketing_event_checklist_items USING btree (responsible_user_id);


--
-- Name: idx_marketing_events_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_events_campaign_id ON public.marketing_events USING btree (campaign_id);


--
-- Name: idx_marketing_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_events_status ON public.marketing_events USING btree (status);


--
-- Name: idx_marketing_lead_saneamento_log_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_lead_saneamento_log_lead_id ON public.marketing_lead_saneamento_log USING btree (lead_id);


--
-- Name: idx_marketing_leads_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_campaign_id ON public.marketing_leads USING btree (campaign_id);


--
-- Name: idx_marketing_leads_converted_to_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_converted_to_customer_id ON public.marketing_leads USING btree (converted_to_customer_id);


--
-- Name: idx_marketing_leads_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_event_id ON public.marketing_leads USING btree (event_id);


--
-- Name: idx_marketing_leads_needs_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_needs_review ON public.marketing_leads USING btree (needs_review);


--
-- Name: idx_marketing_leads_sales_owner_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_sales_owner_user_id ON public.marketing_leads USING btree (sales_owner_user_id);


--
-- Name: idx_marketing_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_status ON public.marketing_leads USING btree (status);


--
-- Name: idx_marketing_leads_status_qualified_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_leads_status_qualified_at ON public.marketing_leads USING btree (status, qualified_at);


--
-- Name: idx_marketing_materials_material_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_materials_material_type ON public.marketing_materials USING btree (material_type);


--
-- Name: idx_marketing_materials_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_materials_product_id ON public.marketing_materials USING btree (product_id);


--
-- Name: idx_marketing_materials_stock_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketing_materials_stock_item_id ON public.marketing_materials USING btree (stock_item_id);


--
-- Name: idx_master_production_plan_lines_production_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_production_plan_lines_production_order_id ON public.master_production_plan_lines USING btree (production_order_id);


--
-- Name: idx_master_production_plan_lines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_production_plan_lines_status ON public.master_production_plan_lines USING btree (status);


--
-- Name: idx_master_production_plans_horizon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_production_plans_horizon ON public.master_production_plans USING btree (horizon_start, horizon_end);


--
-- Name: idx_master_production_plans_planner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_production_plans_planner_id ON public.master_production_plans USING btree (planner_id);


--
-- Name: idx_master_production_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_production_plans_status ON public.master_production_plans USING btree (status);


--
-- Name: idx_migracao_bom_item_estrutura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracao_bom_item_estrutura ON public.migracao_bom_log USING btree (item_estrutura_id);


--
-- Name: idx_migracao_bom_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracao_bom_status ON public.migracao_bom_log USING btree (status);


--
-- Name: idx_migracao_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracao_item_id ON public.migracao_product_item_map USING btree (item_id);


--
-- Name: idx_migracao_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracao_product_id ON public.migracao_product_item_map USING btree (product_id);


--
-- Name: idx_movimentos_item_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimentos_item_data ON public.movimentos_estoque USING btree (item_id, criado_em DESC);


--
-- Name: idx_movimentos_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimentos_lote ON public.movimentos_estoque USING btree (lote_id) WHERE (lote_id IS NOT NULL);


--
-- Name: idx_movimentos_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_movimentos_origem ON public.movimentos_estoque USING btree (origem_tabela, origem_id);


--
-- Name: idx_mrp_item_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mrp_item_data ON public.mrp_ordens_planejadas USING btree (item_id, data_necessidade, status);


--
-- Name: idx_mrp_liberacao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mrp_liberacao ON public.mrp_ordens_planejadas USING btree (data_liberacao, status);


--
-- Name: idx_mrp_ordens_planejadas_data_necessidade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mrp_ordens_planejadas_data_necessidade ON public.mrp_ordens_planejadas USING btree (data_necessidade);


--
-- Name: idx_mrp_ordens_planejadas_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mrp_ordens_planejadas_item ON public.mrp_ordens_planejadas USING btree (item_id);


--
-- Name: idx_mrp_ordens_planejadas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mrp_ordens_planejadas_status ON public.mrp_ordens_planejadas USING btree (status);


--
-- Name: idx_nf_fornecedor_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nf_fornecedor_data ON public.entradas_nf USING btree (fornecedor_id, recebido_em DESC);


--
-- Name: idx_nf_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nf_items_item ON public.entradas_nf_items USING btree (item_id);


--
-- Name: idx_non_conformities_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_non_conformities_asset_id ON public.non_conformities USING btree (asset_id);


--
-- Name: idx_non_conformities_closed_by_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_non_conformities_closed_by_fk ON public.non_conformities USING btree (closed_by);


--
-- Name: idx_non_conformities_reported_by_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_non_conformities_reported_by_fk ON public.non_conformities USING btree (reported_by);


--
-- Name: idx_op_item_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_item_status ON public.ordens_producao USING btree (item_id, status);


--
-- Name: idx_op_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_op_periodo ON public.ordens_producao USING btree (data_inicio, data_fim);


--
-- Name: idx_product_cost_ledgers_created_by_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_cost_ledgers_created_by_fk ON public.product_cost_ledgers USING btree (created_by);


--
-- Name: idx_product_drawings_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_drawings_product_id ON public.product_drawings USING btree (product_id);


--
-- Name: idx_product_drawings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_drawings_status ON public.product_drawings USING btree (status);


--
-- Name: idx_product_warehouse_stock_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_warehouse_stock_product_id ON public.product_warehouse_stock USING btree (product_id);


--
-- Name: idx_product_warehouse_stock_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_warehouse_stock_warehouse_id ON public.product_warehouse_stock USING btree (warehouse_id);


--
-- Name: idx_production_downtimes_production_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_downtimes_production_order_id ON public.production_downtimes USING btree (production_order_id);


--
-- Name: idx_production_downtimes_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_downtimes_started_at ON public.production_downtimes USING btree (started_at);


--
-- Name: idx_production_downtimes_work_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_downtimes_work_center_id ON public.production_downtimes USING btree (work_center_id);


--
-- Name: idx_production_lot_consumptions_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_lot_consumptions_item_id ON public.production_lot_consumptions USING btree (item_id);


--
-- Name: idx_production_lot_consumptions_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_lot_consumptions_item_id_created_at ON public.production_lot_consumptions USING btree (item_id, created_at DESC);


--
-- Name: idx_production_lot_consumptions_item_id_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_lot_consumptions_item_id_order ON public.production_lot_consumptions USING btree (item_id, production_order_id);


--
-- Name: idx_production_order_reservations_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_order_reservations_order_id ON public.production_order_reservations USING btree (production_order_id);


--
-- Name: idx_production_order_reservations_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_order_reservations_product_id ON public.production_order_reservations USING btree (product_id);


--
-- Name: idx_production_order_reservations_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_order_reservations_sale_id ON public.production_order_reservations USING btree (sale_id);


--
-- Name: idx_production_orders_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_department_id ON public.production_orders USING btree (department_id);


--
-- Name: idx_production_orders_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_item_id ON public.production_orders USING btree (item_id);


--
-- Name: idx_production_orders_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_item_id_created_at ON public.production_orders USING btree (item_id, created_at DESC);


--
-- Name: idx_production_orders_item_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_item_id_status ON public.production_orders USING btree (item_id, status);


--
-- Name: idx_production_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_orders_status ON public.production_orders USING btree (status);


--
-- Name: idx_production_route_steps_work_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_route_steps_work_center_id ON public.production_route_steps USING btree (work_center_id);


--
-- Name: idx_production_routes_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_routes_item_id ON public.production_routes USING btree (item_id);


--
-- Name: idx_production_routes_item_id_revision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_routes_item_id_revision ON public.production_routes USING btree (item_id, revision);


--
-- Name: idx_production_routes_item_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_routes_item_id_status ON public.production_routes USING btree (item_id, status);


--
-- Name: idx_purchase_order_approvals_purchase_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_approvals_purchase_id ON public.purchase_order_approvals USING btree (purchase_id);


--
-- Name: idx_purchase_order_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_item_id ON public.purchase_order_items USING btree (item_id);


--
-- Name: idx_purchase_order_items_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_item_id_created_at ON public.purchase_order_items USING btree (item_id, created_at DESC);


--
-- Name: idx_purchase_order_items_item_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_item_id_fk ON public.purchase_order_items USING btree (item_id);


--
-- Name: idx_purchase_order_items_item_id_purchase_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_item_id_purchase_id ON public.purchase_order_items USING btree (item_id, purchase_id);


--
-- Name: idx_purchase_order_items_product_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_product_id_fk ON public.purchase_order_items USING btree (product_id);


--
-- Name: idx_purchase_order_items_purchase_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_items_purchase_id_fk ON public.purchase_order_items USING btree (purchase_id);


--
-- Name: idx_purchase_requisitions_engineering_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_requisitions_engineering_project_id ON public.purchase_requisitions USING btree (engineering_project_id);


--
-- Name: idx_quality_inspections_inspector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_inspections_inspector_id ON public.quality_inspections USING btree (inspector_id);


--
-- Name: idx_quality_inspections_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_inspections_lot_id ON public.quality_inspections USING btree (lot_id);


--
-- Name: idx_quality_inspections_verdict; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quality_inspections_verdict ON public.quality_inspections USING btree (verdict);


--
-- Name: idx_requisicao_items_item_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requisicao_items_item_data ON public.requisicao_compra_items USING btree (item_id, data_necessidade);


--
-- Name: idx_requisicoes_status_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requisicoes_status_data ON public.requisicoes_compra USING btree (status, criado_em DESC);


--
-- Name: idx_rfq_items_awarded_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_items_awarded_supplier_id ON public.rfq_items USING btree (awarded_supplier_id);


--
-- Name: idx_rfq_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_items_item_id ON public.rfq_items USING btree (item_id);


--
-- Name: idx_rfq_items_rfq_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_items_rfq_id ON public.rfq_items USING btree (rfq_id);


--
-- Name: idx_rfq_quotes_rfq_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_quotes_rfq_item_id ON public.rfq_quotes USING btree (rfq_item_id);


--
-- Name: idx_rfq_quotes_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_quotes_supplier_id ON public.rfq_quotes USING btree (supplier_id);


--
-- Name: idx_rfq_suppliers_rfq_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_suppliers_rfq_id ON public.rfq_suppliers USING btree (rfq_id);


--
-- Name: idx_rfq_suppliers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_suppliers_status ON public.rfq_suppliers USING btree (status);


--
-- Name: idx_rfq_suppliers_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfq_suppliers_supplier_id ON public.rfq_suppliers USING btree (supplier_id);


--
-- Name: idx_rfqs_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfqs_created_by ON public.rfqs USING btree (created_by);


--
-- Name: idx_rfqs_requisition_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfqs_requisition_id ON public.rfqs USING btree (requisition_id);


--
-- Name: idx_rfqs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfqs_status ON public.rfqs USING btree (status);


--
-- Name: idx_sale_invoices_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_invoices_sale_id ON public.sale_invoices USING btree (sale_id);


--
-- Name: idx_sale_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_invoices_status ON public.sale_invoices USING btree (nfe_status);


--
-- Name: idx_sale_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item_id ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item_id_created_at ON public.sale_items USING btree (item_id, created_at DESC);


--
-- Name: idx_sale_items_item_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item_id_fk ON public.sale_items USING btree (item_id);


--
-- Name: idx_sale_items_item_id_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_item_id_sale_id ON public.sale_items USING btree (item_id, sale_id);


--
-- Name: idx_sale_items_product_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_product_id_fk ON public.sale_items USING btree (product_id);


--
-- Name: idx_sale_items_sale_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale_id_fk ON public.sale_items USING btree (sale_id);


--
-- Name: idx_serial_item_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_item_status ON public.numeros_serie USING btree (item_id, status);


--
-- Name: idx_serial_numbers_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_item_id ON public.serial_numbers USING btree (item_id);


--
-- Name: idx_serial_numbers_item_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_item_id_created_at ON public.serial_numbers USING btree (item_id, created_at DESC);


--
-- Name: idx_serial_numbers_item_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_item_id_status ON public.serial_numbers USING btree (item_id, status);


--
-- Name: idx_serial_numbers_lot_control_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_lot_control_id_fk ON public.serial_numbers USING btree (lot_control_id);


--
-- Name: idx_serial_numbers_production_order_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_production_order_id_fk ON public.serial_numbers USING btree (production_order_id);


--
-- Name: idx_serial_numbers_sale_id_fk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serial_numbers_sale_id_fk ON public.serial_numbers USING btree (sale_id);


--
-- Name: idx_sst_acidente_complementos_acidente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acidente_complementos_acidente_id ON public.sst_acidente_complementos USING btree (acidente_id);


--
-- Name: idx_sst_acidente_testemunhas_acidente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acidente_testemunhas_acidente_id ON public.sst_acidente_testemunhas USING btree (acidente_id);


--
-- Name: idx_sst_acidentes_data_hora; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acidentes_data_hora ON public.sst_acidentes USING btree (data_hora);


--
-- Name: idx_sst_acidentes_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acidentes_employee_id ON public.sst_acidentes USING btree (employee_id);


--
-- Name: idx_sst_acidentes_gravidade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acidentes_gravidade ON public.sst_acidentes USING btree (gravidade);


--
-- Name: idx_sst_acoes_corretivas_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acoes_corretivas_origem ON public.sst_acoes_corretivas USING btree (origem_tipo, origem_id);


--
-- Name: idx_sst_acoes_corretivas_responsavel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acoes_corretivas_responsavel_id ON public.sst_acoes_corretivas USING btree (responsavel_id);


--
-- Name: idx_sst_acoes_corretivas_status_prazo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_acoes_corretivas_status_prazo ON public.sst_acoes_corretivas USING btree (status, prazo);


--
-- Name: idx_sst_asos_data_vencimento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_asos_data_vencimento ON public.sst_asos USING btree (data_vencimento);


--
-- Name: idx_sst_asos_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_asos_employee_id ON public.sst_asos USING btree (employee_id);


--
-- Name: idx_sst_asos_status_esocial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_asos_status_esocial ON public.sst_asos USING btree (status_esocial_s2220);


--
-- Name: idx_sst_asos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_asos_tipo ON public.sst_asos USING btree (tipo);


--
-- Name: idx_sst_brigadistas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_brigadistas_ativo ON public.sst_brigadistas USING btree (ativo);


--
-- Name: idx_sst_brigadistas_validade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_brigadistas_validade ON public.sst_brigadistas USING btree (validade_reciclagem);


--
-- Name: idx_sst_candidatos_cipa_processo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_candidatos_cipa_processo_id ON public.sst_candidatos_cipa USING btree (processo_eleitoral_id);


--
-- Name: idx_sst_cats_acidente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_cats_acidente_id ON public.sst_cats USING btree (acidente_id);


--
-- Name: idx_sst_cats_prazo_limite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_cats_prazo_limite ON public.sst_cats USING btree (prazo_limite);


--
-- Name: idx_sst_cats_status_esocial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_cats_status_esocial ON public.sst_cats USING btree (status_esocial_s2210);


--
-- Name: idx_sst_devolucoes_epi_entrega_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_devolucoes_epi_entrega_id ON public.sst_devolucoes_epi USING btree (entrega_epi_id);


--
-- Name: idx_sst_entregas_epi_confirmada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_entregas_epi_confirmada ON public.sst_entregas_epi USING btree (confirmada);


--
-- Name: idx_sst_entregas_epi_data_prevista_troca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_entregas_epi_data_prevista_troca ON public.sst_entregas_epi USING btree (data_prevista_troca);


--
-- Name: idx_sst_entregas_epi_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_entregas_epi_employee_id ON public.sst_entregas_epi USING btree (employee_id);


--
-- Name: idx_sst_entregas_epi_tipo_epi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_entregas_epi_tipo_epi_id ON public.sst_entregas_epi USING btree (tipo_epi_id);


--
-- Name: idx_sst_estornos_entrega_epi_entrega_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_estornos_entrega_epi_entrega_id ON public.sst_estornos_entrega_epi USING btree (entrega_epi_id);


--
-- Name: idx_sst_eventos_esocial_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_eventos_esocial_origem ON public.sst_eventos_esocial USING btree (origem_tipo, origem_id);


--
-- Name: idx_sst_eventos_esocial_prazo_legal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_eventos_esocial_prazo_legal ON public.sst_eventos_esocial USING btree (prazo_legal);


--
-- Name: idx_sst_eventos_esocial_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_eventos_esocial_status ON public.sst_eventos_esocial USING btree (status);


--
-- Name: idx_sst_eventos_esocial_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_eventos_esocial_tipo ON public.sst_eventos_esocial USING btree (tipo);


--
-- Name: idx_sst_exames_complementares_aso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_exames_complementares_aso_id ON public.sst_exames_complementares USING btree (aso_id);


--
-- Name: idx_sst_ges_funcionarios_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_ges_funcionarios_employee_id ON public.sst_ges_funcionarios USING btree (employee_id);


--
-- Name: idx_sst_ges_funcionarios_ges_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_ges_funcionarios_ges_id ON public.sst_ges_funcionarios USING btree (ges_id);


--
-- Name: idx_sst_inspecao_itens_conforme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_inspecao_itens_conforme ON public.sst_inspecao_itens USING btree (conforme);


--
-- Name: idx_sst_inspecao_itens_inspecao_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_inspecao_itens_inspecao_id ON public.sst_inspecao_itens USING btree (inspecao_id);


--
-- Name: idx_sst_inspecoes_seguranca_dept_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_inspecoes_seguranca_dept_data ON public.sst_inspecoes_seguranca USING btree (department_id, data);


--
-- Name: idx_sst_mandatos_cipa_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_mandatos_cipa_status ON public.sst_mandatos_cipa USING btree (status);


--
-- Name: idx_sst_mandatos_cipa_vigencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_mandatos_cipa_vigencia ON public.sst_mandatos_cipa USING btree (data_inicio, data_fim);


--
-- Name: idx_sst_matriz_epi_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_matriz_epi_department_id ON public.sst_matriz_epi USING btree (department_id);


--
-- Name: idx_sst_matriz_epi_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_matriz_epi_position ON public.sst_matriz_epi USING btree ("position");


--
-- Name: idx_sst_matriz_epi_tipo_epi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_matriz_epi_tipo_epi_id ON public.sst_matriz_epi USING btree (tipo_epi_id);


--
-- Name: idx_sst_matriz_treinamento_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_matriz_treinamento_position ON public.sst_matriz_treinamento USING btree ("position");


--
-- Name: idx_sst_membros_cipa_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_membros_cipa_employee_id ON public.sst_membros_cipa USING btree (employee_id);


--
-- Name: idx_sst_membros_cipa_estabilidade_fim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_membros_cipa_estabilidade_fim ON public.sst_membros_cipa USING btree (estabilidade_fim);


--
-- Name: idx_sst_membros_cipa_mandato_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_membros_cipa_mandato_id ON public.sst_membros_cipa USING btree (mandato_id);


--
-- Name: idx_sst_permissoes_trabalho_status_fim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_permissoes_trabalho_status_fim ON public.sst_permissoes_trabalho USING btree (status, fim_validade);


--
-- Name: idx_sst_planos_exames_ges_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_planos_exames_ges_id ON public.sst_planos_exames USING btree (ges_id);


--
-- Name: idx_sst_planos_exames_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_planos_exames_position ON public.sst_planos_exames USING btree ("position");


--
-- Name: idx_sst_registros_dds_dept_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_registros_dds_dept_data ON public.sst_registros_dds USING btree (department_id, data);


--
-- Name: idx_sst_reuniao_cipa_presentes_reuniao_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_reuniao_cipa_presentes_reuniao_id ON public.sst_reuniao_cipa_presentes USING btree (reuniao_id);


--
-- Name: idx_sst_reunioes_cipa_mandato_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_reunioes_cipa_mandato_data ON public.sst_reunioes_cipa USING btree (mandato_id, data);


--
-- Name: idx_sst_risco_exames_risco_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_risco_exames_risco_id ON public.sst_risco_exames USING btree (risco_id);


--
-- Name: idx_sst_riscos_ocupacionais_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_riscos_ocupacionais_department_id ON public.sst_riscos_ocupacionais USING btree (department_id);


--
-- Name: idx_sst_riscos_ocupacionais_ges_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_riscos_ocupacionais_ges_id ON public.sst_riscos_ocupacionais USING btree (ges_id);


--
-- Name: idx_sst_riscos_ocupacionais_proxima_revisao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_riscos_ocupacionais_proxima_revisao ON public.sst_riscos_ocupacionais USING btree (proxima_revisao_prevista);


--
-- Name: idx_sst_tipos_epi_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_tipos_epi_ativo ON public.sst_tipos_epi USING btree (ativo);


--
-- Name: idx_sst_tipos_epi_ca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_tipos_epi_ca ON public.sst_tipos_epi USING btree (ca);


--
-- Name: idx_sst_treinamentos_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_treinamentos_employee_id ON public.sst_treinamentos USING btree (employee_id);


--
-- Name: idx_sst_treinamentos_norma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_treinamentos_norma ON public.sst_treinamentos USING btree (norma);


--
-- Name: idx_sst_treinamentos_validade; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sst_treinamentos_validade ON public.sst_treinamentos USING btree (validade);


--
-- Name: idx_treasury_bank_accounts_account_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treasury_bank_accounts_account_type ON public.treasury_bank_accounts USING btree (account_type);


--
-- Name: idx_treasury_bank_accounts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treasury_bank_accounts_active ON public.treasury_bank_accounts USING btree (active);


--
-- Name: idx_treasury_financial_operations_operation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treasury_financial_operations_operation_type ON public.treasury_financial_operations USING btree (operation_type);


--
-- Name: idx_treasury_financial_operations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treasury_financial_operations_status ON public.treasury_financial_operations USING btree (status);


--
-- Name: idx_users_access_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_access_profile_id ON public.users USING btree (access_profile_id);


--
-- Name: idx_warehouse_transfers_from_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_transfers_from_warehouse_id ON public.warehouse_transfers USING btree (from_warehouse_id);


--
-- Name: idx_warehouse_transfers_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_transfers_product_id ON public.warehouse_transfers USING btree (product_id);


--
-- Name: idx_warehouse_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_transfers_status ON public.warehouse_transfers USING btree (status);


--
-- Name: idx_warehouse_transfers_to_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_transfers_to_warehouse_id ON public.warehouse_transfers USING btree (to_warehouse_id);


--
-- Name: idx_webhooks_evento_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhooks_evento_status ON public.webhooks_eventos USING btree (provedor, evento, status, criado_em DESC);


--
-- Name: idx_webhooks_payload_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhooks_payload_gin ON public.webhooks_eventos USING gin (payload);


--
-- Name: idx_work_center_shifts_work_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_center_shifts_work_center_id ON public.work_center_shifts USING btree (work_center_id);


--
-- Name: inventory_count_items_inventory_count_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_count_items_inventory_count_id ON public.inventory_count_items USING btree (inventory_count_id);


--
-- Name: inventory_count_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_count_items_item_id ON public.inventory_count_items USING btree (item_id);


--
-- Name: inventory_count_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_count_items_product_id ON public.inventory_count_items USING btree (product_id);


--
-- Name: inventory_count_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_count_items_status ON public.inventory_count_items USING btree (status);


--
-- Name: inventory_counts_count_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_counts_count_type ON public.inventory_counts USING btree (count_type);


--
-- Name: inventory_counts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_counts_created_by ON public.inventory_counts USING btree (created_by);


--
-- Name: inventory_counts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_counts_status ON public.inventory_counts USING btree (status);


--
-- Name: inventory_movements_product_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_product_id_created_at ON public.inventory_movements USING btree (product_id, created_at);


--
-- Name: inventory_movements_reference_type_reference_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_reference_type_reference_id ON public.inventory_movements USING btree (reference_type, reference_id);


--
-- Name: lot_controls_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_controls_expires_at ON public.lot_controls USING btree (expires_at);


--
-- Name: lot_controls_product_id_lot_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX lot_controls_product_id_lot_number ON public.lot_controls USING btree (product_id, lot_number);


--
-- Name: lot_controls_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lot_controls_status ON public.lot_controls USING btree (status);


--
-- Name: maintenance_orders_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_orders_asset_id ON public.maintenance_orders USING btree (asset_id);


--
-- Name: maintenance_orders_maintenance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_orders_maintenance_type ON public.maintenance_orders USING btree (maintenance_type);


--
-- Name: maintenance_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_orders_status ON public.maintenance_orders USING btree (status);


--
-- Name: maintenance_orders_technician_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maintenance_orders_technician_id ON public.maintenance_orders USING btree (technician_id);


--
-- Name: non_conformities_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX non_conformities_origin ON public.non_conformities USING btree (origin);


--
-- Name: non_conformities_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX non_conformities_product_id ON public.non_conformities USING btree (product_id);


--
-- Name: non_conformities_production_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX non_conformities_production_order_id ON public.non_conformities USING btree (production_order_id);


--
-- Name: non_conformities_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX non_conformities_severity ON public.non_conformities USING btree (severity);


--
-- Name: non_conformities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX non_conformities_status ON public.non_conformities USING btree (status);


--
-- Name: product_cost_ledgers_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_cost_ledgers_product_id ON public.product_cost_ledgers USING btree (product_id);


--
-- Name: product_cost_ledgers_source_type_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_cost_ledgers_source_type_source_id ON public.product_cost_ledgers USING btree (source_type, source_id);


--
-- Name: production_lot_consumptions_lot_control_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_lot_consumptions_lot_control_id ON public.production_lot_consumptions USING btree (lot_control_id);


--
-- Name: production_lot_consumptions_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_lot_consumptions_product_id ON public.production_lot_consumptions USING btree (product_id);


--
-- Name: production_lot_consumptions_production_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_lot_consumptions_production_order_id ON public.production_lot_consumptions USING btree (production_order_id);


--
-- Name: production_order_tracking_production_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_tracking_production_order_id ON public.production_order_tracking USING btree (production_order_id);


--
-- Name: production_order_tracking_production_order_id_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_order_tracking_production_order_id_sequence ON public.production_order_tracking USING btree (production_order_id, sequence);


--
-- Name: production_order_tracking_production_route_step_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_tracking_production_route_step_id ON public.production_order_tracking USING btree (production_route_step_id);


--
-- Name: production_order_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_order_tracking_status ON public.production_order_tracking USING btree (status);


--
-- Name: production_route_steps_production_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_route_steps_production_route_id ON public.production_route_steps USING btree (production_route_id);


--
-- Name: production_route_steps_production_route_id_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_route_steps_production_route_id_sequence ON public.production_route_steps USING btree (production_route_id, sequence);


--
-- Name: production_routes_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_routes_item_id ON public.production_routes USING btree (item_id);


--
-- Name: production_routes_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_routes_product_id ON public.production_routes USING btree (product_id);


--
-- Name: production_routes_product_id_revision; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX production_routes_product_id_revision ON public.production_routes USING btree (product_id, revision);


--
-- Name: production_routes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_routes_status ON public.production_routes USING btree (status);


--
-- Name: products_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_id ON public.products USING btree (category_id);


--
-- Name: purchase_receipts_purchase_invoice_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX purchase_receipts_purchase_invoice_unique ON public.purchase_receipts USING btree (purchase_id, invoice_number);


--
-- Name: purchase_requisition_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisition_items_item_id ON public.purchase_requisition_items USING btree (item_id);


--
-- Name: purchase_requisition_items_requisition_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisition_items_requisition_id ON public.purchase_requisition_items USING btree (requisition_id);


--
-- Name: purchase_requisition_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisition_items_status ON public.purchase_requisition_items USING btree (status);


--
-- Name: purchase_requisitions_request_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisitions_request_date ON public.purchase_requisitions USING btree (request_date);


--
-- Name: purchase_requisitions_requester_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisitions_requester_id ON public.purchase_requisitions USING btree (requester_id);


--
-- Name: purchase_requisitions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX purchase_requisitions_status ON public.purchase_requisitions USING btree (status);


--
-- Name: serial_numbers_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX serial_numbers_item_id ON public.serial_numbers USING btree (item_id);


--
-- Name: serial_numbers_item_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX serial_numbers_item_id_status ON public.serial_numbers USING btree (item_id, status);


--
-- Name: serial_numbers_product_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX serial_numbers_product_id_status ON public.serial_numbers USING btree (product_id, status);


--
-- Name: serial_numbers_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX serial_numbers_serial_number ON public.serial_numbers USING btree (serial_number);


--
-- Name: uq_accounting_chart_of_accounts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_accounting_chart_of_accounts_code ON public.accounting_chart_of_accounts USING btree (code);


--
-- Name: uq_accounting_entries_entry_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_accounting_entries_entry_number ON public.accounting_entries USING btree (entry_number);


--
-- Name: uq_bank_statement_entries_statement_fitid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bank_statement_entries_statement_fitid ON public.bank_statement_entries USING btree (statement_id, fitid);


--
-- Name: uq_bill_of_materials_active_per_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bill_of_materials_active_per_product ON public.bill_of_materials USING btree (product_id) WHERE (status = 'active'::public.enum_bill_of_materials_status);


--
-- Name: uq_budget_lines_cost_center_year_month_category; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_budget_lines_cost_center_year_month_category ON public.budget_lines USING btree (cost_center_id, year, COALESCE(month, 0), category);


--
-- Name: uq_cnab_remittance_items_nosso_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cnab_remittance_items_nosso_numero ON public.cnab_remittance_items USING btree (nosso_numero);


--
-- Name: uq_facility_vehicle_trips_open_per_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_facility_vehicle_trips_open_per_asset ON public.facility_vehicle_trips USING btree (asset_id) WHERE (status = 'out'::public.enum_facility_vehicle_trips_status);


--
-- Name: uq_facility_vehicle_trips_open_per_driver; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_facility_vehicle_trips_open_per_driver ON public.facility_vehicle_trips USING btree (driver_id) WHERE (status = 'out'::public.enum_facility_vehicle_trips_status);


--
-- Name: uq_hr_job_position_trainings_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_hr_job_position_trainings_pair ON public.hr_job_position_trainings USING btree (job_position_id, training_course_id);


--
-- Name: uq_hr_time_sheet_summaries_employee_competencia; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_hr_time_sheet_summaries_employee_competencia ON public.hr_time_sheet_summaries USING btree (employee_id, competencia);


--
-- Name: uq_it_license_seats_active_per_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_it_license_seats_active_per_employee ON public.it_license_seats USING btree (license_detail_id, employee_id) WHERE (revoked_at IS NULL);


--
-- Name: uq_it_responsibility_terms_active_per_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_it_responsibility_terms_active_per_asset ON public.it_responsibility_terms USING btree (asset_id) WHERE (status = 'active'::public.enum_it_responsibility_terms_status);


--
-- Name: uq_master_production_plan_lines_plan_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_master_production_plan_lines_plan_product ON public.master_production_plan_lines USING btree (plan_id, product_id);


--
-- Name: uq_production_downtimes_open_per_work_center; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_production_downtimes_open_per_work_center ON public.production_downtimes USING btree (work_center_id) WHERE (finished_at IS NULL);


--
-- Name: uq_production_order_reservations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_production_order_reservations_active ON public.production_order_reservations USING btree (production_order_id, product_id) WHERE ((status = 'active'::public.enum_production_order_reservations_status) AND (production_order_id IS NOT NULL));


--
-- Name: uq_production_routes_active_per_product; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_production_routes_active_per_product ON public.production_routes USING btree (product_id) WHERE (status = 'active'::public.enum_production_routes_status);


--
-- Name: uq_sale_invoices_provider_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sale_invoices_provider_ref ON public.sale_invoices USING btree (nfe_provider_ref);


--
-- Name: uq_sale_reservations_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sale_reservations_active ON public.production_order_reservations USING btree (sale_id, product_id) WHERE ((status = 'active'::public.enum_production_order_reservations_status) AND (sale_id IS NOT NULL));


--
-- Name: uq_sst_acidente_testemunhas_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_acidente_testemunhas_par ON public.sst_acidente_testemunhas USING btree (acidente_id, employee_id);


--
-- Name: uq_sst_candidatos_cipa_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_candidatos_cipa_par ON public.sst_candidatos_cipa USING btree (processo_eleitoral_id, employee_id);


--
-- Name: uq_sst_dds_presencas_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_dds_presencas_par ON public.sst_dds_presencas USING btree (registro_dds_id, employee_id);


--
-- Name: uq_sst_eventos_esocial_origem_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_eventos_esocial_origem_ativo ON public.sst_eventos_esocial USING btree (origem_tipo, origem_id) WHERE (status <> 'rejeitado'::public.enum_sst_eventos_esocial_status);


--
-- Name: uq_sst_matriz_treinamento_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_matriz_treinamento_par ON public.sst_matriz_treinamento USING btree ("position", norma);


--
-- Name: uq_sst_membros_cipa_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_membros_cipa_par ON public.sst_membros_cipa USING btree (mandato_id, employee_id);


--
-- Name: uq_sst_pt_executantes_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_pt_executantes_par ON public.sst_pt_executantes USING btree (permissao_trabalho_id, employee_id);


--
-- Name: uq_sst_reuniao_cipa_presentes_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_reuniao_cipa_presentes_par ON public.sst_reuniao_cipa_presentes USING btree (reuniao_id, membro_cipa_id);


--
-- Name: uq_sst_risco_epis_par; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_sst_risco_epis_par ON public.sst_risco_epis USING btree (risco_id, tipo_epi_id);


--
-- Name: uq_treasury_bank_accounts_agency_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_treasury_bank_accounts_agency_account ON public.treasury_bank_accounts USING btree (agency, account_number);


--
-- Name: uq_treasury_financial_operations_contract_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_treasury_financial_operations_contract_number ON public.treasury_financial_operations USING btree (contract_number);


--
-- Name: webhook_events_source_event_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX webhook_events_source_event_id_unique ON public.webhook_events USING btree (source, event_id);


--
-- Name: hr_employee_benefits trg_hr_block_delete_employee_benefit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hr_block_delete_employee_benefit BEFORE DELETE ON public.hr_employee_benefits FOR EACH ROW EXECUTE FUNCTION public.hr_block_delete_employee_benefit();


--
-- Name: hr_vacation_schedules trg_hr_block_delete_vacation_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hr_block_delete_vacation_schedule BEFORE DELETE ON public.hr_vacation_schedules FOR EACH ROW EXECUTE FUNCTION public.hr_block_delete_vacation_schedule();


--
-- Name: hr_employee_contracts trg_hr_lock_employee_contract; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hr_lock_employee_contract BEFORE DELETE OR UPDATE ON public.hr_employee_contracts FOR EACH ROW EXECUTE FUNCTION public.hr_lock_employee_contract();


--
-- Name: hr_employee_job_history trg_hr_lock_job_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hr_lock_job_history BEFORE DELETE OR UPDATE ON public.hr_employee_job_history FOR EACH ROW EXECUTE FUNCTION public.hr_lock_job_history();


--
-- Name: hr_vacation_accrual_periods trg_hr_lock_vacation_accrual_period; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hr_lock_vacation_accrual_period BEFORE DELETE OR UPDATE ON public.hr_vacation_accrual_periods FOR EACH ROW EXECUTE FUNCTION public.hr_lock_vacation_accrual_period();


--
-- Name: jur_contract_addendums trg_jur_lock_contract_addendum; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jur_lock_contract_addendum BEFORE DELETE OR UPDATE ON public.jur_contract_addendums FOR EACH ROW EXECUTE FUNCTION public.jur_lock_contract_addendum();


--
-- Name: jur_legal_case_deadlines trg_jur_lock_legal_case_deadline; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jur_lock_legal_case_deadline BEFORE DELETE OR UPDATE ON public.jur_legal_case_deadlines FOR EACH ROW EXECUTE FUNCTION public.jur_lock_legal_case_deadline();


--
-- Name: jur_legal_case_events trg_jur_lock_legal_case_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jur_lock_legal_case_event BEFORE DELETE OR UPDATE ON public.jur_legal_case_events FOR EACH ROW EXECUTE FUNCTION public.jur_lock_legal_case_event();


--
-- Name: jur_legal_case_provisions trg_jur_lock_legal_case_provision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jur_lock_legal_case_provision BEFORE DELETE OR UPDATE ON public.jur_legal_case_provisions FOR EACH ROW EXECUTE FUNCTION public.jur_lock_legal_case_provision();


--
-- Name: sst_eventos_esocial trg_sst_block_delete_evento_esocial; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sst_block_delete_evento_esocial BEFORE DELETE ON public.sst_eventos_esocial FOR EACH ROW EXECUTE FUNCTION public.sst_block_delete_evento_esocial();


--
-- Name: sst_acidentes trg_sst_lock_acidente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sst_lock_acidente BEFORE DELETE OR UPDATE ON public.sst_acidentes FOR EACH ROW EXECUTE FUNCTION public.sst_lock_acidente();


--
-- Name: sst_cats trg_sst_lock_cat; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sst_lock_cat BEFORE DELETE OR UPDATE ON public.sst_cats FOR EACH ROW EXECUTE FUNCTION public.sst_lock_cat();


--
-- Name: sst_entregas_epi trg_sst_lock_entrega_epi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sst_lock_entrega_epi BEFORE DELETE OR UPDATE ON public.sst_entregas_epi FOR EACH ROW EXECUTE FUNCTION public.sst_lock_entrega_epi();


--
-- Name: access_profile_permissions access_profile_permissions_access_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions
    ADD CONSTRAINT access_profile_permissions_access_profile_id_fkey FOREIGN KEY (access_profile_id) REFERENCES public.access_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts
    ADD CONSTRAINT accounting_chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.accounting_chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounting_entries accounting_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries
    ADD CONSTRAINT accounting_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounting_entries accounting_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries
    ADD CONSTRAINT accounting_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounting_entries accounting_entries_reversal_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entries
    ADD CONSTRAINT accounting_entries_reversal_of_id_fkey FOREIGN KEY (reversal_of_id) REFERENCES public.accounting_entries(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounting_entry_items accounting_entry_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entry_items
    ADD CONSTRAINT accounting_entry_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounting_chart_of_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounting_entry_items accounting_entry_items_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entry_items
    ADD CONSTRAINT accounting_entry_items_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounting_entry_items accounting_entry_items_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_entry_items
    ADD CONSTRAINT accounting_entry_items_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.accounting_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounts_payable accounts_payable_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounts_payable accounts_payable_legal_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_legal_case_id_fkey FOREIGN KEY (legal_case_id) REFERENCES public.jur_legal_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounts_receivable accounts_receivable_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoustic_test_results acoustic_test_results_non_conformity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results
    ADD CONSTRAINT acoustic_test_results_non_conformity_id_fkey FOREIGN KEY (non_conformity_id) REFERENCES public.non_conformities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoustic_test_results acoustic_test_results_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results
    ADD CONSTRAINT acoustic_test_results_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: acoustic_test_results acoustic_test_results_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results
    ADD CONSTRAINT acoustic_test_results_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acoustic_test_results acoustic_test_results_tester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acoustic_test_results
    ADD CONSTRAINT acoustic_test_results_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assets assets_purchase_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_purchase_item_id_fkey FOREIGN KEY (purchase_item_id) REFERENCES public.purchase_order_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_statement_entries bank_statement_entries_matched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries
    ADD CONSTRAINT bank_statement_entries_matched_by_fkey FOREIGN KEY (matched_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_statement_entries bank_statement_entries_matched_payable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries
    ADD CONSTRAINT bank_statement_entries_matched_payable_id_fkey FOREIGN KEY (matched_payable_id) REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_statement_entries bank_statement_entries_matched_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries
    ADD CONSTRAINT bank_statement_entries_matched_receivable_id_fkey FOREIGN KEY (matched_receivable_id) REFERENCES public.accounts_receivable(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_statement_entries bank_statement_entries_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_entries
    ADD CONSTRAINT bank_statement_entries_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.bank_statements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bank_statements bank_statements_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: budget_lines budget_lines_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cnab_remittance_items cnab_remittance_items_receivable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittance_items
    ADD CONSTRAINT cnab_remittance_items_receivable_id_fkey FOREIGN KEY (receivable_id) REFERENCES public.accounts_receivable(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cnab_remittance_items cnab_remittance_items_remittance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittance_items
    ADD CONSTRAINT cnab_remittance_items_remittance_id_fkey FOREIGN KEY (remittance_id) REFERENCES public.cnab_remittances(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cnab_remittances cnab_remittances_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_remittances
    ADD CONSTRAINT cnab_remittances_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cnab_return_files cnab_return_files_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_files
    ADD CONSTRAINT cnab_return_files_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cnab_return_occurrences cnab_return_occurrences_remittance_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_occurrences
    ADD CONSTRAINT cnab_return_occurrences_remittance_item_id_fkey FOREIGN KEY (remittance_item_id) REFERENCES public.cnab_remittance_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cnab_return_occurrences cnab_return_occurrences_return_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cnab_return_occurrences
    ADD CONSTRAINT cnab_return_occurrences_return_file_id_fkey FOREIGN KEY (return_file_id) REFERENCES public.cnab_return_files(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_price_lists customer_price_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_price_lists
    ADD CONSTRAINT customer_price_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customer_price_lists customer_price_lists_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_price_lists
    ADD CONSTRAINT customer_price_lists_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: customer_price_lists customer_price_lists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_price_lists
    ADD CONSTRAINT customer_price_lists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.hr_job_positions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: engineering_projects engineering_projects_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_projects
    ADD CONSTRAINT engineering_projects_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: engineering_projects engineering_projects_project_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engineering_projects
    ADD CONSTRAINT engineering_projects_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entradas_nf entradas_nf_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf
    ADD CONSTRAINT entradas_nf_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id);


--
-- Name: entradas_nf_items entradas_nf_items_entrada_nf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf_items
    ADD CONSTRAINT entradas_nf_items_entrada_nf_id_fkey FOREIGN KEY (entrada_nf_id) REFERENCES public.entradas_nf(id) ON DELETE CASCADE;


--
-- Name: entradas_nf_items entradas_nf_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf_items
    ADD CONSTRAINT entradas_nf_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: entradas_nf_items entradas_nf_items_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf_items
    ADD CONSTRAINT entradas_nf_items_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: facility_areas facility_areas_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_areas
    ADD CONSTRAINT facility_areas_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_cleaning_executions facility_cleaning_executions_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_executions
    ADD CONSTRAINT facility_cleaning_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_cleaning_executions facility_cleaning_executions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_executions
    ADD CONSTRAINT facility_cleaning_executions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.facility_cleaning_schedules(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_cleaning_schedules facility_cleaning_schedules_facility_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_schedules
    ADD CONSTRAINT facility_cleaning_schedules_facility_area_id_fkey FOREIGN KEY (facility_area_id) REFERENCES public.facility_areas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_cleaning_schedules facility_cleaning_schedules_responsible_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_cleaning_schedules
    ADD CONSTRAINT facility_cleaning_schedules_responsible_employee_id_fkey FOREIGN KEY (responsible_employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_correspondence facility_correspondence_recipient_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_correspondence
    ADD CONSTRAINT facility_correspondence_recipient_department_id_fkey FOREIGN KEY (recipient_department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_correspondence facility_correspondence_recipient_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_correspondence
    ADD CONSTRAINT facility_correspondence_recipient_employee_id_fkey FOREIGN KEY (recipient_employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_drivers facility_drivers_authorized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_drivers
    ADD CONSTRAINT facility_drivers_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_drivers facility_drivers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_drivers
    ADD CONSTRAINT facility_drivers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_fines facility_fines_accounts_payable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fines
    ADD CONSTRAINT facility_fines_accounts_payable_id_fkey FOREIGN KEY (accounts_payable_id) REFERENCES public.accounts_payable(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_fines facility_fines_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fines
    ADD CONSTRAINT facility_fines_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_fines facility_fines_identified_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fines
    ADD CONSTRAINT facility_fines_identified_driver_id_fkey FOREIGN KEY (identified_driver_id) REFERENCES public.facility_drivers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_fuel_records facility_fuel_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fuel_records
    ADD CONSTRAINT facility_fuel_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_fuel_records facility_fuel_records_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fuel_records
    ADD CONSTRAINT facility_fuel_records_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_fuel_records facility_fuel_records_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_fuel_records
    ADD CONSTRAINT facility_fuel_records_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.facility_vehicle_trips(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_resource_reservations facility_resource_reservations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_resource_reservations
    ADD CONSTRAINT facility_resource_reservations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_resource_reservations facility_resource_reservations_facility_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_resource_reservations
    ADD CONSTRAINT facility_resource_reservations_facility_area_id_fkey FOREIGN KEY (facility_area_id) REFERENCES public.facility_areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_resource_reservations facility_resource_reservations_reserved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_resource_reservations
    ADD CONSTRAINT facility_resource_reservations_reserved_by_fkey FOREIGN KEY (reserved_by) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_vehicle_details facility_vehicle_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_details
    ADD CONSTRAINT facility_vehicle_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_vehicle_documents facility_vehicle_documents_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_documents
    ADD CONSTRAINT facility_vehicle_documents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_vehicle_documents facility_vehicle_documents_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_documents
    ADD CONSTRAINT facility_vehicle_documents_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_vehicle_trips facility_vehicle_trips_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips
    ADD CONSTRAINT facility_vehicle_trips_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_vehicle_trips facility_vehicle_trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips
    ADD CONSTRAINT facility_vehicle_trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.facility_drivers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_vehicle_trips facility_vehicle_trips_odometer_override_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips
    ADD CONSTRAINT facility_vehicle_trips_odometer_override_approved_by_fkey FOREIGN KEY (odometer_override_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_vehicle_trips facility_vehicle_trips_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_vehicle_trips
    ADD CONSTRAINT facility_vehicle_trips_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: facility_visits facility_visits_host_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visits
    ADD CONSTRAINT facility_visits_host_employee_id_fkey FOREIGN KEY (host_employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: facility_visits facility_visits_visitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_visits
    ADD CONSTRAINT facility_visits_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES public.facility_visitors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: accounts_payable fk_accounts_payable_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT fk_accounts_payable_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: accounts_payable fk_accounts_payable_purchase_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT fk_accounts_payable_purchase_id FOREIGN KEY (purchase_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: accounts_payable fk_accounts_payable_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT fk_accounts_payable_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: accounts_receivable fk_accounts_receivable_customer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT fk_accounts_receivable_customer_id FOREIGN KEY (customer_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: accounts_receivable fk_accounts_receivable_sale_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT fk_accounts_receivable_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: assets fk_assets_department_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT fk_assets_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: assets fk_assets_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT fk_assets_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: assets fk_assets_responsible_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT fk_assets_responsible_id FOREIGN KEY (responsible_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auditoria_eventos fk_auditoria_eventos_usuario_id_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_eventos
    ADD CONSTRAINT fk_auditoria_eventos_usuario_id_users FOREIGN KEY (usuario_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bill_of_materials fk_bom_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT fk_bom_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bill_of_materials fk_bom_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT fk_bom_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bill_of_material_items fk_bom_items_alternative_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT fk_bom_items_alternative_product_id FOREIGN KEY (alternative_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: bill_of_material_items fk_bom_items_bom_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT fk_bom_items_bom_id FOREIGN KEY (bom_id) REFERENCES public.bill_of_materials(id) ON DELETE CASCADE;


--
-- Name: bill_of_material_items fk_bom_items_component_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT fk_bom_items_component_product_id FOREIGN KEY (component_product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: bill_of_material_items fk_bom_items_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT fk_bom_items_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: bill_of_material_items fk_bom_items_parent_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_material_items
    ADD CONSTRAINT fk_bom_items_parent_item_id FOREIGN KEY (parent_item_id) REFERENCES public.bill_of_material_items(id) ON DELETE SET NULL;


--
-- Name: bill_of_materials fk_bom_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT fk_bom_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: departments fk_departments_manager_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_manager_id FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: employees fk_employees_department_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_employees_department_id FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- Name: employees fk_employees_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_employees_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entradas_nf fk_entradas_nf_recebido_por_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf
    ADD CONSTRAINT fk_entradas_nf_recebido_por_users FOREIGN KEY (recebido_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_count_items fk_inventory_count_items_counted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT fk_inventory_count_items_counted_by FOREIGN KEY (counted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_count_items fk_inventory_count_items_inventory_count_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT fk_inventory_count_items_inventory_count_id FOREIGN KEY (inventory_count_id) REFERENCES public.inventory_counts(id) ON DELETE CASCADE;


--
-- Name: inventory_count_items fk_inventory_count_items_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT fk_inventory_count_items_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: inventory_count_items fk_inventory_count_items_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT fk_inventory_count_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inventory_counts fk_inventory_counts_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT fk_inventory_counts_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inventory_counts fk_inventory_counts_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT fk_inventory_counts_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: inventory_movements fk_inventory_movements_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: inventory_movements fk_inventory_movements_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: inventory_movements fk_inventory_movements_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT fk_inventory_movements_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: it_tickets fk_it_tickets_access_request_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT fk_it_tickets_access_request_id FOREIGN KEY (access_request_id) REFERENCES public.it_access_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: item_detalhes_comerciais fk_item_detalhes_comerciais_categoria_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_detalhes_comerciais
    ADD CONSTRAINT fk_item_detalhes_comerciais_categoria_id FOREIGN KEY (categoria_id) REFERENCES public.item_categorias(id) ON DELETE SET NULL;


--
-- Name: item_detalhes_comerciais fk_item_detalhes_comerciais_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_detalhes_comerciais
    ADD CONSTRAINT fk_item_detalhes_comerciais_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_especificacoes_tecnicas fk_item_especificacoes_tecnicas_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_especificacoes_tecnicas
    ADD CONSTRAINT fk_item_especificacoes_tecnicas_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_estruturas fk_item_estruturas_alternative_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_alternative_product_id FOREIGN KEY (alternative_product_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: item_estruturas fk_item_estruturas_approved_by_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_approved_by_users FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: item_estruturas fk_item_estruturas_criado_por_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_criado_por_users FOREIGN KEY (criado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: item_estruturas fk_item_estruturas_item_componente_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_item_componente_id FOREIGN KEY (item_componente_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: item_estruturas fk_item_estruturas_item_pai_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_item_pai_id FOREIGN KEY (item_pai_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: item_estruturas fk_item_estruturas_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT fk_item_estruturas_parent_id FOREIGN KEY (parent_item_estrutura_id) REFERENCES public.item_estruturas(id) ON DELETE SET NULL;


--
-- Name: items fk_items_fornecedor_padrao_id_suppliers; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT fk_items_fornecedor_padrao_id_suppliers FOREIGN KEY (fornecedor_padrao_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: lot_controls fk_lot_controls_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lot_controls fk_lot_controls_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: lot_controls fk_lot_controls_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: lot_controls fk_lot_controls_production_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_production_order_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE SET NULL;


--
-- Name: lot_controls fk_lot_controls_purchase_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_purchase_id FOREIGN KEY (purchase_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL;


--
-- Name: lot_controls fk_lot_controls_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT fk_lot_controls_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: maintenance_orders fk_maintenance_orders_asset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT fk_maintenance_orders_asset_id FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;


--
-- Name: maintenance_orders fk_maintenance_orders_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT fk_maintenance_orders_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_orders fk_maintenance_orders_diagnosed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT fk_maintenance_orders_diagnosed_by FOREIGN KEY (diagnosed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_orders fk_maintenance_orders_reported_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT fk_maintenance_orders_reported_by FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_orders fk_maintenance_orders_technician_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT fk_maintenance_orders_technician_id FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: movimentos_estoque fk_movimentos_estoque_usuario_id_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_estoque
    ADD CONSTRAINT fk_movimentos_estoque_usuario_id_users FOREIGN KEY (usuario_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: mrp_ordens_planejadas fk_mrp_ordens_planejadas_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mrp_ordens_planejadas
    ADD CONSTRAINT fk_mrp_ordens_planejadas_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: non_conformities fk_non_conformities_closed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_closed_by FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_production_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_production_order_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_purchase_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_purchase_item_id FOREIGN KEY (purchase_item_id) REFERENCES public.purchase_order_items(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_reported_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_reported_by FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: non_conformities fk_non_conformities_responsible_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_responsible_id FOREIGN KEY (responsible_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_service_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_service_order_id FOREIGN KEY (service_order_id) REFERENCES public.service_orders(id) ON DELETE SET NULL;


--
-- Name: non_conformities fk_non_conformities_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT fk_non_conformities_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: ordens_producao fk_ordens_producao_criado_por_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_producao
    ADD CONSTRAINT fk_ordens_producao_criado_por_users FOREIGN KEY (criado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_cost_ledgers fk_product_cost_ledgers_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_cost_ledgers
    ADD CONSTRAINT fk_product_cost_ledgers_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: production_lot_consumptions fk_production_lot_consumptions_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT fk_production_lot_consumptions_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: production_lot_consumptions fk_production_lot_consumptions_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT fk_production_lot_consumptions_lot_id FOREIGN KEY (lot_control_id) REFERENCES public.lot_controls(id) ON DELETE CASCADE;


--
-- Name: production_lot_consumptions fk_production_lot_consumptions_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT fk_production_lot_consumptions_order_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_lot_consumptions fk_production_lot_consumptions_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT fk_production_lot_consumptions_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: production_lot_consumptions fk_production_lot_consumptions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_lot_consumptions
    ADD CONSTRAINT fk_production_lot_consumptions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: production_order_tracking fk_production_order_tracking_operator_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_tracking
    ADD CONSTRAINT fk_production_order_tracking_operator_id FOREIGN KEY (operator_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: production_order_tracking fk_production_order_tracking_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_tracking
    ADD CONSTRAINT fk_production_order_tracking_order_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE CASCADE;


--
-- Name: production_order_tracking fk_production_order_tracking_step_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_tracking
    ADD CONSTRAINT fk_production_order_tracking_step_id FOREIGN KEY (production_route_step_id) REFERENCES public.production_route_steps(id) ON DELETE SET NULL;


--
-- Name: production_orders fk_production_orders_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT fk_production_orders_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: production_orders fk_production_orders_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT fk_production_orders_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: production_orders fk_production_orders_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT fk_production_orders_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: production_orders fk_production_orders_responsible_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT fk_production_orders_responsible_id FOREIGN KEY (responsible_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: production_orders fk_production_orders_sales_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT fk_production_orders_sales_order_id FOREIGN KEY (sales_order_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: production_route_steps fk_production_route_steps_route_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_steps
    ADD CONSTRAINT fk_production_route_steps_route_id FOREIGN KEY (production_route_id) REFERENCES public.production_routes(id) ON DELETE CASCADE;


--
-- Name: production_routes fk_production_routes_approved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT fk_production_routes_approved_by FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: production_routes fk_production_routes_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT fk_production_routes_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: production_routes fk_production_routes_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT fk_production_routes_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: production_routes fk_production_routes_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_routes
    ADD CONSTRAINT fk_production_routes_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: products fk_products_category_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE SET NULL;


--
-- Name: purchase_order_items fk_purchase_order_items_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT fk_purchase_order_items_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: purchase_order_items fk_purchase_order_items_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT fk_purchase_order_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_items fk_purchase_order_items_purchase_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT fk_purchase_order_items_purchase_id FOREIGN KEY (purchase_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders fk_purchase_orders_requester_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT fk_purchase_orders_requester_id FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchase_orders fk_purchase_orders_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT fk_purchase_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: requisicoes_compra fk_requisicoes_compra_aprovado_por_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicoes_compra
    ADD CONSTRAINT fk_requisicoes_compra_aprovado_por_users FOREIGN KEY (aprovado_por) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: requisicoes_compra fk_requisicoes_compra_solicitante_id_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicoes_compra
    ADD CONSTRAINT fk_requisicoes_compra_solicitante_id_users FOREIGN KEY (solicitante_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sale_items fk_sale_items_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT fk_sale_items_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: sale_items fk_sale_items_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT fk_sale_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: sale_items fk_sale_items_sale_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT fk_sale_items_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales fk_sales_customer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_sales_customer_id FOREIGN KEY (customer_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: sales fk_sales_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_sales_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: serial_numbers fk_serial_numbers_item_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT fk_serial_numbers_item_id FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE SET NULL;


--
-- Name: serial_numbers fk_serial_numbers_lot_control_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT fk_serial_numbers_lot_control_id FOREIGN KEY (lot_control_id) REFERENCES public.lot_controls(id) ON DELETE SET NULL;


--
-- Name: serial_numbers fk_serial_numbers_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT fk_serial_numbers_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: serial_numbers fk_serial_numbers_production_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT fk_serial_numbers_production_order_id FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE SET NULL;


--
-- Name: serial_numbers fk_serial_numbers_sale_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serial_numbers
    ADD CONSTRAINT fk_serial_numbers_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: service_orders fk_service_orders_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_service_orders_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: service_orders fk_service_orders_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_service_orders_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_orders fk_service_orders_product_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_service_orders_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: service_orders fk_service_orders_responsible_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_service_orders_responsible_id FOREIGN KEY (responsible_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_orders fk_service_orders_technician_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT fk_service_orders_technician_id FOREIGN KEY (technician_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sst_membros_cipa fk_sst_membros_cipa_treinamento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_membros_cipa
    ADD CONSTRAINT fk_sst_membros_cipa_treinamento FOREIGN KEY (treinamento_cipa_id) REFERENCES public.sst_treinamentos(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sst_planos_exames fk_sst_planos_exames_ges; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_planos_exames
    ADD CONSTRAINT fk_sst_planos_exames_ges FOREIGN KEY (ges_id) REFERENCES public.sst_ges(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_absences hr_absences_accrual_period_impact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_accrual_period_impact_id_fkey FOREIGN KEY (accrual_period_impact_id) REFERENCES public.hr_vacation_accrual_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_absences hr_absences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_absences hr_absences_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.hr_employee_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_absences hr_absences_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_absences hr_absences_s2230_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_absences
    ADD CONSTRAINT hr_absences_s2230_confirmed_by_fkey FOREIGN KEY (s2230_confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.hr_candidates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_admission_processes hr_admission_processes_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.hr_employee_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_esocial_s2200_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_esocial_s2200_confirmed_by_fkey FOREIGN KEY (esocial_s2200_confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_job_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_job_history_id_fkey FOREIGN KEY (job_history_id) REFERENCES public.hr_employee_job_history(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.hr_job_positions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_admission_processes hr_admission_processes_job_vacancy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_admission_processes
    ADD CONSTRAINT hr_admission_processes_job_vacancy_id_fkey FOREIGN KEY (job_vacancy_id) REFERENCES public.hr_job_vacancies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_candidates hr_candidates_job_vacancy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_candidates
    ADD CONSTRAINT hr_candidates_job_vacancy_id_fkey FOREIGN KEY (job_vacancy_id) REFERENCES public.hr_job_vacancies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_benefits hr_employee_benefits_benefit_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_benefits
    ADD CONSTRAINT hr_employee_benefits_benefit_type_id_fkey FOREIGN KEY (benefit_type_id) REFERENCES public.hr_benefit_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_benefits hr_employee_benefits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_benefits
    ADD CONSTRAINT hr_employee_benefits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_benefits hr_employee_benefits_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_benefits
    ADD CONSTRAINT hr_employee_benefits_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_contracts hr_employee_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_contracts
    ADD CONSTRAINT hr_employee_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_contracts hr_employee_contracts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_contracts
    ADD CONSTRAINT hr_employee_contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_documents hr_employee_documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_documents hr_employee_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_documents
    ADD CONSTRAINT hr_employee_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_job_history hr_employee_job_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_job_history hr_employee_job_history_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_job_history hr_employee_job_history_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_job_history hr_employee_job_history_esocial_event_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_esocial_event_confirmed_by_fkey FOREIGN KEY (esocial_event_confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_job_history hr_employee_job_history_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_job_history
    ADD CONSTRAINT hr_employee_job_history_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.hr_job_positions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_trainings hr_employee_trainings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_trainings hr_employee_trainings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_employee_trainings hr_employee_trainings_training_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_employee_trainings
    ADD CONSTRAINT hr_employee_trainings_training_course_id_fkey FOREIGN KEY (training_course_id) REFERENCES public.hr_training_courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_position_trainings hr_job_position_trainings_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_position_trainings
    ADD CONSTRAINT hr_job_position_trainings_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.hr_job_positions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_position_trainings hr_job_position_trainings_training_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_position_trainings
    ADD CONSTRAINT hr_job_position_trainings_training_course_id_fkey FOREIGN KEY (training_course_id) REFERENCES public.hr_training_courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_positions hr_job_positions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_positions
    ADD CONSTRAINT hr_job_positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_vacancies hr_job_vacancies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_vacancies
    ADD CONSTRAINT hr_job_vacancies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_vacancies hr_job_vacancies_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_vacancies
    ADD CONSTRAINT hr_job_vacancies_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_job_vacancies hr_job_vacancies_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_job_vacancies
    ADD CONSTRAINT hr_job_vacancies_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.hr_job_positions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_payroll_import_batches hr_payroll_import_batches_importado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_batches
    ADD CONSTRAINT hr_payroll_import_batches_importado_por_fkey FOREIGN KEY (importado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_payroll_import_items hr_payroll_import_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items
    ADD CONSTRAINT hr_payroll_import_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.hr_payroll_import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_payroll_import_items hr_payroll_import_items_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items
    ADD CONSTRAINT hr_payroll_import_items_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_payroll_import_items hr_payroll_import_items_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items
    ADD CONSTRAINT hr_payroll_import_items_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_payroll_import_items hr_payroll_import_items_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_payroll_import_items
    ADD CONSTRAINT hr_payroll_import_items_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_performance_reviews hr_performance_reviews_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_reviews
    ADD CONSTRAINT hr_performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_performance_reviews hr_performance_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_performance_reviews
    ADD CONSTRAINT hr_performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_termination_processes hr_termination_processes_concluded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes
    ADD CONSTRAINT hr_termination_processes_concluded_by_fkey FOREIGN KEY (concluded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_termination_processes hr_termination_processes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes
    ADD CONSTRAINT hr_termination_processes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_termination_processes hr_termination_processes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes
    ADD CONSTRAINT hr_termination_processes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_termination_processes hr_termination_processes_s2299_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_termination_processes
    ADD CONSTRAINT hr_termination_processes_s2299_confirmed_by_fkey FOREIGN KEY (s2299_confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_time_sheet_summaries hr_time_sheet_summaries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_time_sheet_summaries
    ADD CONSTRAINT hr_time_sheet_summaries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_time_sheet_summaries hr_time_sheet_summaries_importado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_time_sheet_summaries
    ADD CONSTRAINT hr_time_sheet_summaries_importado_por_fkey FOREIGN KEY (importado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_vacation_accrual_periods hr_vacation_accrual_periods_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_accrual_periods
    ADD CONSTRAINT hr_vacation_accrual_periods_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_vacation_accrual_periods hr_vacation_accrual_periods_zeroed_from_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_accrual_periods
    ADD CONSTRAINT hr_vacation_accrual_periods_zeroed_from_period_id_fkey FOREIGN KEY (zeroed_from_period_id) REFERENCES public.hr_vacation_accrual_periods(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: hr_vacation_schedules hr_vacation_schedules_accrual_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_schedules
    ADD CONSTRAINT hr_vacation_schedules_accrual_period_id_fkey FOREIGN KEY (accrual_period_id) REFERENCES public.hr_vacation_accrual_periods(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_vacation_schedules hr_vacation_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_schedules
    ADD CONSTRAINT hr_vacation_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: hr_vacation_schedules hr_vacation_schedules_superseded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hr_vacation_schedules
    ADD CONSTRAINT hr_vacation_schedules_superseded_by_id_fkey FOREIGN KEY (superseded_by_id) REFERENCES public.hr_vacation_schedules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: import_process_approvals import_process_approvals_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_approvals
    ADD CONSTRAINT import_process_approvals_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: import_process_approvals import_process_approvals_import_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_approvals
    ADD CONSTRAINT import_process_approvals_import_process_id_fkey FOREIGN KEY (import_process_id) REFERENCES public.import_processes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: import_process_items import_process_items_import_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_items
    ADD CONSTRAINT import_process_items_import_process_id_fkey FOREIGN KEY (import_process_id) REFERENCES public.import_processes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: import_process_items import_process_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_process_items
    ADD CONSTRAINT import_process_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: import_processes import_processes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_processes
    ADD CONSTRAINT import_processes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: import_processes import_processes_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_processes
    ADD CONSTRAINT import_processes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory_counts inventory_counts_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory_counts inventory_counts_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory_counts inventory_counts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT inventory_counts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory_movements inventory_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: it_access_requests it_access_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_access_requests it_access_requests_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_access_requests it_access_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_access_requests it_access_requests_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_access_requests it_access_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_access_requests it_access_requests_requested_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_access_requests
    ADD CONSTRAINT it_access_requests_requested_profile_id_fkey FOREIGN KEY (requested_profile_id) REFERENCES public.access_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_backup_logs it_backup_logs_generated_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_backup_logs
    ADD CONSTRAINT it_backup_logs_generated_ticket_id_fkey FOREIGN KEY (generated_ticket_id) REFERENCES public.it_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_backup_logs it_backup_logs_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_backup_logs
    ADD CONSTRAINT it_backup_logs_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_license_seats it_license_seats_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_license_seats
    ADD CONSTRAINT it_license_seats_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_license_seats it_license_seats_license_detail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_license_seats
    ADD CONSTRAINT it_license_seats_license_detail_id_fkey FOREIGN KEY (license_detail_id) REFERENCES public.it_software_license_details(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_delivered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_related_maintenance_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_related_maintenance_order_id_fkey FOREIGN KEY (related_maintenance_order_id) REFERENCES public.maintenance_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_responsibility_terms it_responsibility_terms_related_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_responsibility_terms
    ADD CONSTRAINT it_responsibility_terms_related_ticket_id_fkey FOREIGN KEY (related_ticket_id) REFERENCES public.it_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_software_license_details it_software_license_details_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_software_license_details
    ADD CONSTRAINT it_software_license_details_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_ticket_comments it_ticket_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_comments
    ADD CONSTRAINT it_ticket_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_ticket_comments it_ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_comments
    ADD CONSTRAINT it_ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.it_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: it_ticket_priority_history it_ticket_priority_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_priority_history
    ADD CONSTRAINT it_ticket_priority_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_ticket_priority_history it_ticket_priority_history_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_ticket_priority_history
    ADD CONSTRAINT it_ticket_priority_history_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.it_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: it_tickets it_tickets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_tickets it_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_tickets it_tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.it_ticket_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_tickets it_tickets_maintenance_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_maintenance_order_id_fkey FOREIGN KEY (maintenance_order_id) REFERENCES public.maintenance_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_tickets it_tickets_opened_on_behalf_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_opened_on_behalf_of_fkey FOREIGN KEY (opened_on_behalf_of) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: it_tickets it_tickets_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.it_tickets
    ADD CONSTRAINT it_tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: item_detalhes_comerciais item_detalhes_comerciais_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_detalhes_comerciais
    ADD CONSTRAINT item_detalhes_comerciais_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.item_categorias(id);


--
-- Name: item_detalhes_comerciais item_detalhes_comerciais_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_detalhes_comerciais
    ADD CONSTRAINT item_detalhes_comerciais_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_especificacoes_tecnicas item_especificacoes_tecnicas_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_especificacoes_tecnicas
    ADD CONSTRAINT item_especificacoes_tecnicas_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_estruturas item_estruturas_item_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT item_estruturas_item_componente_id_fkey FOREIGN KEY (item_componente_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: item_estruturas item_estruturas_item_pai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT item_estruturas_item_pai_id_fkey FOREIGN KEY (item_pai_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: item_estruturas item_estruturas_parent_item_estrutura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_estruturas
    ADD CONSTRAINT item_estruturas_parent_item_estrutura_id_fkey FOREIGN KEY (parent_item_estrutura_id) REFERENCES public.item_estruturas(id) ON DELETE SET NULL;


--
-- Name: item_suppliers item_suppliers_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT item_suppliers_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: item_suppliers item_suppliers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT item_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_addendums jur_contract_addendums_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_addendums
    ADD CONSTRAINT jur_contract_addendums_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.jur_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_addendums jur_contract_addendums_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_addendums
    ADD CONSTRAINT jur_contract_addendums_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_approvals jur_contract_approvals_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_approvals
    ADD CONSTRAINT jur_contract_approvals_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_approvals jur_contract_approvals_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_approvals
    ADD CONSTRAINT jur_contract_approvals_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.jur_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: jur_contract_documents jur_contract_documents_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_documents
    ADD CONSTRAINT jur_contract_documents_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_documents jur_contract_documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_documents
    ADD CONSTRAINT jur_contract_documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.jur_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_signatories jur_contract_signatories_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_signatories
    ADD CONSTRAINT jur_contract_signatories_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.jur_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contract_signatories jur_contract_signatories_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contract_signatories
    ADD CONSTRAINT jur_contract_signatories_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_contracts jur_contracts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_contracts
    ADD CONSTRAINT jur_contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_corporate_acts jur_corporate_acts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_corporate_acts
    ADD CONSTRAINT jur_corporate_acts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_external_lawyers jur_external_lawyers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_external_lawyers
    ADD CONSTRAINT jur_external_lawyers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_intellectual_property jur_intellectual_property_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_intellectual_property
    ADD CONSTRAINT jur_intellectual_property_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_ip_contract_links jur_ip_contract_links_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_ip_contract_links
    ADD CONSTRAINT jur_ip_contract_links_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.jur_contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_ip_contract_links jur_ip_contract_links_ip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_ip_contract_links
    ADD CONSTRAINT jur_ip_contract_links_ip_id_fkey FOREIGN KEY (ip_id) REFERENCES public.jur_intellectual_property(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_alerts jur_legal_alerts_escalated_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_alerts
    ADD CONSTRAINT jur_legal_alerts_escalated_to_user_id_fkey FOREIGN KEY (escalated_to_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_alerts jur_legal_alerts_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_alerts
    ADD CONSTRAINT jur_legal_alerts_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_backup_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_backup_user_id_fkey FOREIGN KEY (backup_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_escalation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_escalation_user_id_fkey FOREIGN KEY (escalation_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_fulfilled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_fulfilled_by_fkey FOREIGN KEY (fulfilled_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_legal_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_legal_case_id_fkey FOREIGN KEY (legal_case_id) REFERENCES public.jur_legal_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_deadlines jur_legal_case_deadlines_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_deadlines
    ADD CONSTRAINT jur_legal_case_deadlines_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_events jur_legal_case_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_events
    ADD CONSTRAINT jur_legal_case_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_events jur_legal_case_events_legal_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_events
    ADD CONSTRAINT jur_legal_case_events_legal_case_id_fkey FOREIGN KEY (legal_case_id) REFERENCES public.jur_legal_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_provisions jur_legal_case_provisions_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_provisions
    ADD CONSTRAINT jur_legal_case_provisions_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_case_provisions jur_legal_case_provisions_legal_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_case_provisions
    ADD CONSTRAINT jur_legal_case_provisions_legal_case_id_fkey FOREIGN KEY (legal_case_id) REFERENCES public.jur_legal_cases(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_external_lawyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_external_lawyer_id_fkey FOREIGN KEY (external_lawyer_id) REFERENCES public.jur_external_lawyers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_internal_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_internal_responsible_user_id_fkey FOREIGN KEY (internal_responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_opposing_party_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_opposing_party_client_id_fkey FOREIGN KEY (opposing_party_client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_opposing_party_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_opposing_party_employee_id_fkey FOREIGN KEY (opposing_party_employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_legal_cases jur_legal_cases_opposing_party_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_legal_cases
    ADD CONSTRAINT jur_legal_cases_opposing_party_supplier_id_fkey FOREIGN KEY (opposing_party_supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_data_subject_requests jur_lgpd_data_subject_requests_dpo_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_data_subject_requests
    ADD CONSTRAINT jur_lgpd_data_subject_requests_dpo_user_id_fkey FOREIGN KEY (dpo_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_data_subject_requests jur_lgpd_data_subject_requests_identity_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_data_subject_requests
    ADD CONSTRAINT jur_lgpd_data_subject_requests_identity_verified_by_fkey FOREIGN KEY (identity_verified_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_incidents jur_lgpd_incidents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_incidents
    ADD CONSTRAINT jur_lgpd_incidents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_incidents jur_lgpd_incidents_dpo_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_incidents
    ADD CONSTRAINT jur_lgpd_incidents_dpo_user_id_fkey FOREIGN KEY (dpo_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_processing_activities jur_lgpd_processing_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_processing_activities
    ADD CONSTRAINT jur_lgpd_processing_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_lgpd_processing_activities jur_lgpd_processing_activities_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_lgpd_processing_activities
    ADD CONSTRAINT jur_lgpd_processing_activities_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_proxies jur_proxies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies
    ADD CONSTRAINT jur_proxies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_proxies jur_proxies_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies
    ADD CONSTRAINT jur_proxies_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_proxies jur_proxies_external_lawyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies
    ADD CONSTRAINT jur_proxies_external_lawyer_id_fkey FOREIGN KEY (external_lawyer_id) REFERENCES public.jur_external_lawyers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: jur_proxies jur_proxies_superseded_proxy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jur_proxies
    ADD CONSTRAINT jur_proxies_superseded_proxy_id_fkey FOREIGN KEY (superseded_proxy_id) REFERENCES public.jur_proxies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lot_controls lot_controls_release_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT lot_controls_release_inspection_id_fkey FOREIGN KEY (release_inspection_id) REFERENCES public.quality_inspections(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lot_controls lot_controls_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT lot_controls_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lot_controls lot_controls_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT lot_controls_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lotes lotes_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: maintenance_orders maintenance_orders_facility_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders
    ADD CONSTRAINT maintenance_orders_facility_area_id_fkey FOREIGN KEY (facility_area_id) REFERENCES public.facility_areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketing_campaigns marketing_campaigns_budget_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_budget_approved_by_fkey FOREIGN KEY (budget_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_event_checklist_items marketing_event_checklist_items_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_event_checklist_items
    ADD CONSTRAINT marketing_event_checklist_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.marketing_events(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketing_event_checklist_items marketing_event_checklist_items_responsible_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_event_checklist_items
    ADD CONSTRAINT marketing_event_checklist_items_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_events marketing_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_events
    ADD CONSTRAINT marketing_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_lead_saneamento_log marketing_lead_saneamento_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_lead_saneamento_log
    ADD CONSTRAINT marketing_lead_saneamento_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.marketing_leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketing_leads marketing_leads_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads
    ADD CONSTRAINT marketing_leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_leads marketing_leads_converted_to_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads
    ADD CONSTRAINT marketing_leads_converted_to_customer_id_fkey FOREIGN KEY (converted_to_customer_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_leads marketing_leads_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads
    ADD CONSTRAINT marketing_leads_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.marketing_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_leads marketing_leads_sales_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_leads
    ADD CONSTRAINT marketing_leads_sales_owner_user_id_fkey FOREIGN KEY (sales_owner_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_materials marketing_materials_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_materials marketing_materials_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: marketing_materials marketing_materials_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: master_production_plan_lines master_production_plan_lines_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines
    ADD CONSTRAINT master_production_plan_lines_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: master_production_plan_lines master_production_plan_lines_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines
    ADD CONSTRAINT master_production_plan_lines_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.master_production_plans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: master_production_plan_lines master_production_plan_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines
    ADD CONSTRAINT master_production_plan_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: master_production_plan_lines master_production_plan_lines_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plan_lines
    ADD CONSTRAINT master_production_plan_lines_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: master_production_plans master_production_plans_canceled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_canceled_by_fkey FOREIGN KEY (canceled_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: master_production_plans master_production_plans_firmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_firmed_by_fkey FOREIGN KEY (firmed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: master_production_plans master_production_plans_planner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_planner_id_fkey FOREIGN KEY (planner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: master_production_plans master_production_plans_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_production_plans
    ADD CONSTRAINT master_production_plans_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: migracao_bom_log migracao_bom_log_item_estrutura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_bom_log
    ADD CONSTRAINT migracao_bom_log_item_estrutura_id_fkey FOREIGN KEY (item_estrutura_id) REFERENCES public.item_estruturas(id) ON DELETE SET NULL;


--
-- Name: migracao_product_item_map migracao_product_item_map_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_product_item_map
    ADD CONSTRAINT migracao_product_item_map_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: movimentos_estoque movimentos_estoque_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_estoque
    ADD CONSTRAINT movimentos_estoque_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: movimentos_estoque movimentos_estoque_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_estoque
    ADD CONSTRAINT movimentos_estoque_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: mrp_ordens_planejadas mrp_ordens_planejadas_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mrp_ordens_planejadas
    ADD CONSTRAINT mrp_ordens_planejadas_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: non_conformities non_conformities_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT non_conformities_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: numeros_serie numeros_serie_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_serie
    ADD CONSTRAINT numeros_serie_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: numeros_serie numeros_serie_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_serie
    ADD CONSTRAINT numeros_serie_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE SET NULL;


--
-- Name: ordens_producao ordens_producao_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordens_producao
    ADD CONSTRAINT ordens_producao_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: product_drawings product_drawings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_drawings
    ADD CONSTRAINT product_drawings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_drawings product_drawings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_drawings
    ADD CONSTRAINT product_drawings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_warehouse_stock product_warehouse_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse_stock
    ADD CONSTRAINT product_warehouse_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_warehouse_stock product_warehouse_stock_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse_stock
    ADD CONSTRAINT product_warehouse_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_downtimes production_downtimes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_downtimes
    ADD CONSTRAINT production_downtimes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_downtimes production_downtimes_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_downtimes
    ADD CONSTRAINT production_downtimes_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_downtimes production_downtimes_work_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_downtimes
    ADD CONSTRAINT production_downtimes_work_center_id_fkey FOREIGN KEY (work_center_id) REFERENCES public.work_centers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_order_reservations production_order_reservations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations
    ADD CONSTRAINT production_order_reservations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_order_reservations production_order_reservations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations
    ADD CONSTRAINT production_order_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_order_reservations production_order_reservations_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations
    ADD CONSTRAINT production_order_reservations_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: production_order_reservations production_order_reservations_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_reservations
    ADD CONSTRAINT production_order_reservations_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: production_orders production_orders_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: production_route_steps production_route_steps_work_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_steps
    ADD CONSTRAINT production_route_steps_work_center_id_fkey FOREIGN KEY (work_center_id) REFERENCES public.work_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_approvals purchase_order_approvals_approver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_approvals
    ADD CONSTRAINT purchase_order_approvals_approver_user_id_fkey FOREIGN KEY (approver_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_order_approvals purchase_order_approvals_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_approvals
    ADD CONSTRAINT purchase_order_approvals_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_requisition_items purchase_requisition_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_requisition_items purchase_requisition_items_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: purchase_requisition_items purchase_requisition_items_suggested_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisition_items
    ADD CONSTRAINT purchase_requisition_items_suggested_supplier_id_fkey FOREIGN KEY (suggested_supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_requisitions purchase_requisitions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_requisitions purchase_requisitions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_requisitions purchase_requisitions_engineering_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_engineering_project_id_fkey FOREIGN KEY (engineering_project_id) REFERENCES public.engineering_projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_requisitions purchase_requisitions_production_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_production_order_id_fkey FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_requisitions purchase_requisitions_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requisitions
    ADD CONSTRAINT purchase_requisitions_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quality_inspections quality_inspections_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quality_inspections quality_inspections_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_controls(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quality_inspections quality_inspections_non_conformity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_inspections
    ADD CONSTRAINT quality_inspections_non_conformity_id_fkey FOREIGN KEY (non_conformity_id) REFERENCES public.non_conformities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: requisicao_compra_items requisicao_compra_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicao_compra_items
    ADD CONSTRAINT requisicao_compra_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE RESTRICT;


--
-- Name: requisicao_compra_items requisicao_compra_items_requisicao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisicao_compra_items
    ADD CONSTRAINT requisicao_compra_items_requisicao_id_fkey FOREIGN KEY (requisicao_id) REFERENCES public.requisicoes_compra(id) ON DELETE CASCADE;


--
-- Name: rfq_items rfq_items_awarded_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_awarded_supplier_id_fkey FOREIGN KEY (awarded_supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rfq_items rfq_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rfq_items rfq_items_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_items
    ADD CONSTRAINT rfq_items_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rfq_quotes rfq_quotes_rfq_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_quotes
    ADD CONSTRAINT rfq_quotes_rfq_item_id_fkey FOREIGN KEY (rfq_item_id) REFERENCES public.rfq_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rfq_quotes rfq_quotes_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_quotes
    ADD CONSTRAINT rfq_quotes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rfq_suppliers rfq_suppliers_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_suppliers
    ADD CONSTRAINT rfq_suppliers_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rfq_suppliers rfq_suppliers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfq_suppliers
    ADD CONSTRAINT rfq_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rfqs rfqs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rfqs rfqs_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.purchase_requisitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sale_invoices sale_invoices_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_invoices
    ADD CONSTRAINT sale_invoices_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_acidente_complementos sst_acidente_complementos_acidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_complementos
    ADD CONSTRAINT sst_acidente_complementos_acidente_id_fkey FOREIGN KEY (acidente_id) REFERENCES public.sst_acidentes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acidente_complementos sst_acidente_complementos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_complementos
    ADD CONSTRAINT sst_acidente_complementos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acidente_testemunhas sst_acidente_testemunhas_acidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_testemunhas
    ADD CONSTRAINT sst_acidente_testemunhas_acidente_id_fkey FOREIGN KEY (acidente_id) REFERENCES public.sst_acidentes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_acidente_testemunhas sst_acidente_testemunhas_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidente_testemunhas
    ADD CONSTRAINT sst_acidente_testemunhas_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acidentes sst_acidentes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidentes
    ADD CONSTRAINT sst_acidentes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acidentes sst_acidentes_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acidentes
    ADD CONSTRAINT sst_acidentes_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acoes_corretivas sst_acoes_corretivas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acoes_corretivas
    ADD CONSTRAINT sst_acoes_corretivas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_acoes_corretivas sst_acoes_corretivas_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_acoes_corretivas
    ADD CONSTRAINT sst_acoes_corretivas_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_asos sst_asos_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_asos
    ADD CONSTRAINT sst_asos_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_asos sst_asos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_asos
    ADD CONSTRAINT sst_asos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_brigadistas sst_brigadistas_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_brigadistas
    ADD CONSTRAINT sst_brigadistas_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_candidatos_cipa sst_candidatos_cipa_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_candidatos_cipa
    ADD CONSTRAINT sst_candidatos_cipa_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_candidatos_cipa sst_candidatos_cipa_processo_eleitoral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_candidatos_cipa
    ADD CONSTRAINT sst_candidatos_cipa_processo_eleitoral_id_fkey FOREIGN KEY (processo_eleitoral_id) REFERENCES public.sst_processos_eleitorais_cipa(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_cats sst_cats_acidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_cats
    ADD CONSTRAINT sst_cats_acidente_id_fkey FOREIGN KEY (acidente_id) REFERENCES public.sst_acidentes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_cats sst_cats_emitente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_cats
    ADD CONSTRAINT sst_cats_emitente_id_fkey FOREIGN KEY (emitente_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_dds_presencas sst_dds_presencas_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_dds_presencas
    ADD CONSTRAINT sst_dds_presencas_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_dds_presencas sst_dds_presencas_registro_dds_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_dds_presencas
    ADD CONSTRAINT sst_dds_presencas_registro_dds_id_fkey FOREIGN KEY (registro_dds_id) REFERENCES public.sst_registros_dds(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_devolucoes_epi sst_devolucoes_epi_entrega_epi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_devolucoes_epi
    ADD CONSTRAINT sst_devolucoes_epi_entrega_epi_id_fkey FOREIGN KEY (entrega_epi_id) REFERENCES public.sst_entregas_epi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_devolucoes_epi sst_devolucoes_epi_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_devolucoes_epi
    ADD CONSTRAINT sst_devolucoes_epi_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_entregas_epi sst_entregas_epi_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi
    ADD CONSTRAINT sst_entregas_epi_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_entregas_epi sst_entregas_epi_entregue_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi
    ADD CONSTRAINT sst_entregas_epi_entregue_por_fkey FOREIGN KEY (entregue_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_entregas_epi sst_entregas_epi_inventory_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi
    ADD CONSTRAINT sst_entregas_epi_inventory_movement_id_fkey FOREIGN KEY (inventory_movement_id) REFERENCES public.inventory_movements(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_entregas_epi sst_entregas_epi_tipo_epi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_entregas_epi
    ADD CONSTRAINT sst_entregas_epi_tipo_epi_id_fkey FOREIGN KEY (tipo_epi_id) REFERENCES public.sst_tipos_epi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_estornos_entrega_epi sst_estornos_entrega_epi_entrega_epi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_estornos_entrega_epi
    ADD CONSTRAINT sst_estornos_entrega_epi_entrega_epi_id_fkey FOREIGN KEY (entrega_epi_id) REFERENCES public.sst_entregas_epi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_estornos_entrega_epi sst_estornos_entrega_epi_estornado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_estornos_entrega_epi
    ADD CONSTRAINT sst_estornos_entrega_epi_estornado_por_fkey FOREIGN KEY (estornado_por) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_exames_complementares sst_exames_complementares_aso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_exames_complementares
    ADD CONSTRAINT sst_exames_complementares_aso_id_fkey FOREIGN KEY (aso_id) REFERENCES public.sst_asos(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_ges_funcionarios sst_ges_funcionarios_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges_funcionarios
    ADD CONSTRAINT sst_ges_funcionarios_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_ges_funcionarios sst_ges_funcionarios_ges_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_ges_funcionarios
    ADD CONSTRAINT sst_ges_funcionarios_ges_id_fkey FOREIGN KEY (ges_id) REFERENCES public.sst_ges(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_inspecao_itens sst_inspecao_itens_acao_corretiva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecao_itens
    ADD CONSTRAINT sst_inspecao_itens_acao_corretiva_id_fkey FOREIGN KEY (acao_corretiva_id) REFERENCES public.sst_acoes_corretivas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sst_inspecao_itens sst_inspecao_itens_inspecao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecao_itens
    ADD CONSTRAINT sst_inspecao_itens_inspecao_id_fkey FOREIGN KEY (inspecao_id) REFERENCES public.sst_inspecoes_seguranca(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_inspecoes_seguranca sst_inspecoes_seguranca_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecoes_seguranca
    ADD CONSTRAINT sst_inspecoes_seguranca_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_inspecoes_seguranca sst_inspecoes_seguranca_inspetor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_inspecoes_seguranca
    ADD CONSTRAINT sst_inspecoes_seguranca_inspetor_id_fkey FOREIGN KEY (inspetor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_investigacoes_acidente sst_investigacoes_acidente_acidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_investigacoes_acidente
    ADD CONSTRAINT sst_investigacoes_acidente_acidente_id_fkey FOREIGN KEY (acidente_id) REFERENCES public.sst_acidentes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_investigacoes_acidente sst_investigacoes_acidente_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_investigacoes_acidente
    ADD CONSTRAINT sst_investigacoes_acidente_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_matriz_epi sst_matriz_epi_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_epi
    ADD CONSTRAINT sst_matriz_epi_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_matriz_epi sst_matriz_epi_tipo_epi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_matriz_epi
    ADD CONSTRAINT sst_matriz_epi_tipo_epi_id_fkey FOREIGN KEY (tipo_epi_id) REFERENCES public.sst_tipos_epi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_membros_cipa sst_membros_cipa_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_membros_cipa
    ADD CONSTRAINT sst_membros_cipa_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_membros_cipa sst_membros_cipa_mandato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_membros_cipa
    ADD CONSTRAINT sst_membros_cipa_mandato_id_fkey FOREIGN KEY (mandato_id) REFERENCES public.sst_mandatos_cipa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_permissoes_trabalho sst_permissoes_trabalho_autorizante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_permissoes_trabalho
    ADD CONSTRAINT sst_permissoes_trabalho_autorizante_id_fkey FOREIGN KEY (autorizante_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_permissoes_trabalho sst_permissoes_trabalho_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_permissoes_trabalho
    ADD CONSTRAINT sst_permissoes_trabalho_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_processos_eleitorais_cipa sst_processos_eleitorais_cipa_mandato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_processos_eleitorais_cipa
    ADD CONSTRAINT sst_processos_eleitorais_cipa_mandato_id_fkey FOREIGN KEY (mandato_id) REFERENCES public.sst_mandatos_cipa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_pt_executantes sst_pt_executantes_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_pt_executantes
    ADD CONSTRAINT sst_pt_executantes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_pt_executantes sst_pt_executantes_permissao_trabalho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_pt_executantes
    ADD CONSTRAINT sst_pt_executantes_permissao_trabalho_id_fkey FOREIGN KEY (permissao_trabalho_id) REFERENCES public.sst_permissoes_trabalho(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_registros_dds sst_registros_dds_condutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_registros_dds
    ADD CONSTRAINT sst_registros_dds_condutor_id_fkey FOREIGN KEY (condutor_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_registros_dds sst_registros_dds_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_registros_dds
    ADD CONSTRAINT sst_registros_dds_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_reuniao_cipa_presentes sst_reuniao_cipa_presentes_membro_cipa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reuniao_cipa_presentes
    ADD CONSTRAINT sst_reuniao_cipa_presentes_membro_cipa_id_fkey FOREIGN KEY (membro_cipa_id) REFERENCES public.sst_membros_cipa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_reuniao_cipa_presentes sst_reuniao_cipa_presentes_reuniao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reuniao_cipa_presentes
    ADD CONSTRAINT sst_reuniao_cipa_presentes_reuniao_id_fkey FOREIGN KEY (reuniao_id) REFERENCES public.sst_reunioes_cipa(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_reunioes_cipa sst_reunioes_cipa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reunioes_cipa
    ADD CONSTRAINT sst_reunioes_cipa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_reunioes_cipa sst_reunioes_cipa_mandato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_reunioes_cipa
    ADD CONSTRAINT sst_reunioes_cipa_mandato_id_fkey FOREIGN KEY (mandato_id) REFERENCES public.sst_mandatos_cipa(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_risco_epis sst_risco_epis_risco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_epis
    ADD CONSTRAINT sst_risco_epis_risco_id_fkey FOREIGN KEY (risco_id) REFERENCES public.sst_riscos_ocupacionais(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_risco_epis sst_risco_epis_tipo_epi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_epis
    ADD CONSTRAINT sst_risco_epis_tipo_epi_id_fkey FOREIGN KEY (tipo_epi_id) REFERENCES public.sst_tipos_epi(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_risco_exames sst_risco_exames_risco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_risco_exames
    ADD CONSTRAINT sst_risco_exames_risco_id_fkey FOREIGN KEY (risco_id) REFERENCES public.sst_riscos_ocupacionais(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sst_riscos_ocupacionais sst_riscos_ocupacionais_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_riscos_ocupacionais
    ADD CONSTRAINT sst_riscos_ocupacionais_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_riscos_ocupacionais sst_riscos_ocupacionais_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_riscos_ocupacionais
    ADD CONSTRAINT sst_riscos_ocupacionais_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_riscos_ocupacionais sst_riscos_ocupacionais_ges_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_riscos_ocupacionais
    ADD CONSTRAINT sst_riscos_ocupacionais_ges_id_fkey FOREIGN KEY (ges_id) REFERENCES public.sst_ges(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sst_tipos_epi sst_tipos_epi_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_tipos_epi
    ADD CONSTRAINT sst_tipos_epi_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_tipos_epi sst_tipos_epi_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_tipos_epi
    ADD CONSTRAINT sst_tipos_epi_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_treinamentos sst_treinamentos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_treinamentos
    ADD CONSTRAINT sst_treinamentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sst_treinamentos sst_treinamentos_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sst_treinamentos
    ADD CONSTRAINT sst_treinamentos_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_access_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_access_profile_id_fkey FOREIGN KEY (access_profile_id) REFERENCES public.access_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: warehouse_transfers warehouse_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: warehouse_transfers warehouse_transfers_from_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_from_warehouse_id_fkey FOREIGN KEY (from_warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warehouse_transfers warehouse_transfers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warehouse_transfers warehouse_transfers_to_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_to_warehouse_id_fkey FOREIGN KEY (to_warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warehouse_transfers warehouse_transfers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_transfers
    ADD CONSTRAINT warehouse_transfers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: work_center_shifts work_center_shifts_work_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_center_shifts
    ADD CONSTRAINT work_center_shifts_work_center_id_fkey FOREIGN KEY (work_center_id) REFERENCES public.work_centers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict miQzhzsJDx1uijoQpycVIosaQheID2XjEbqrfX0c3cQIMadQvyBNQc91E2eaOHs

