--
-- PostgreSQL database dump
--

\restrict MUD2jTcAHC4S8PiEvPhxJHdzdD82wxA4EdcixwxTZX3yIilPJRHEECRa7CYk0Dz

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
-- Name: enum_accounts_payable_invoice_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_accounts_payable_invoice_type AS ENUM (
    'nfe',
    'nfse'
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
    'print'
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
    'transfer'
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
-- Name: enum_item_estruturas_component_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_item_estruturas_component_type AS ENUM (
    'raw_material',
    'component',
    'semi_finished',
    'packaging',
    'consumable',
    'other'
);


--
-- Name: enum_item_estruturas_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_item_estruturas_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'superseded'
);


--
-- Name: enum_items_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_items_status AS ENUM (
    'ATIVO',
    'INATIVO',
    'BLOQUEADO'
);


--
-- Name: enum_items_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_items_tipo AS ENUM (
    'MATERIA_PRIMA',
    'SUBCONJUNTO',
    'PRODUTO_ACABADO'
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
-- Name: enum_mrp_ordens_planejadas_origem; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_mrp_ordens_planejadas_origem AS ENUM (
    'PEDIDO_VENDA',
    'PREVISAO',
    'ORDEM_PRODUCAO',
    'MANUAL'
);


--
-- Name: enum_mrp_ordens_planejadas_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_mrp_ordens_planejadas_status AS ENUM (
    'RASCUNHO',
    'APROVADA',
    'EM_EXECUCAO',
    'CONCLUIDA',
    'CANCELADA'
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
    'production_overhead'
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
-- Name: enum_suppliers_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_suppliers_status AS ENUM (
    'active',
    'inactive',
    'blocked'
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
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id integer NOT NULL,
    description character varying(200) NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    payment_date date,
    status public.enum_accounts_payable_status DEFAULT 'pending'::public.enum_accounts_payable_status,
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
    cost_center_id integer
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
    installment integer DEFAULT 1,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    payment_date date,
    status public.enum_accounts_receivable_status DEFAULT 'pending'::public.enum_accounts_receivable_status,
    payment_method character varying(30),
    invoice_number character varying(50),
    barcode character varying(50),
    pix_key character varying(100),
    interest numeric(10,2) DEFAULT 0,
    fine numeric(10,2) DEFAULT 0,
    discount numeric(10,2) DEFAULT 0,
    collection_status public.enum_accounts_receivable_collection_status DEFAULT 'normal'::public.enum_accounts_receivable_collection_status,
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
    asset_type public.enum_assets_asset_type DEFAULT 'equipment'::public.enum_assets_asset_type,
    brand character varying(100),
    model character varying(100),
    serial_number character varying(100),
    purchase_date date,
    purchase_value numeric(10,2),
    current_value numeric(10,2),
    useful_life_months integer,
    status public.enum_assets_status DEFAULT 'active'::public.enum_assets_status,
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
    success boolean DEFAULT true,
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

COMMENT ON TABLE public.auditoria_eventos IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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
    quantity numeric(12,4) DEFAULT 1 NOT NULL,
    unit character varying(10) DEFAULT 'un'::character varying,
    bom_level integer DEFAULT 1,
    parent_item_id integer,
    sequence_order integer DEFAULT 0,
    component_type public.enum_bill_of_material_items_component_type DEFAULT 'component'::public.enum_bill_of_material_items_component_type,
    scrap_percentage numeric(5,2) DEFAULT 0,
    unit_cost numeric(12,2) DEFAULT 0,
    total_cost numeric(12,2) DEFAULT 0,
    notes text,
    alternative_product_id integer,
    is_critical boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid
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

COMMENT ON COLUMN public.bill_of_material_items.component_product_id IS 'FK → Product.id (o componente)';


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
    revision character varying(10) DEFAULT '00'::character varying,
    revision_date date,
    revision_notes text,
    status public.enum_bill_of_materials_status DEFAULT 'draft'::public.enum_bill_of_materials_status,
    created_by integer,
    approved_by integer,
    approval_date date,
    notes text,
    total_components integer DEFAULT 0,
    total_cost numeric(12,2) DEFAULT 0,
    manufacturing_time_minutes integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


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

COMMENT ON COLUMN public.bill_of_materials.revision IS 'Revisão da BOM (00, 01, A, B...)';


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

COMMENT ON COLUMN public.bill_of_materials.status IS 'Status: draft=rascunho, active=vigente, inactive=desativada, superseded=substituída';


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
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    cpf_cnpj character varying(18) NOT NULL,
    phone character varying(20) DEFAULT ''::character varying,
    email character varying(100) DEFAULT ''::character varying,
    cep character varying(10),
    street character varying(200),
    number character varying(20),
    complement character varying(100),
    neighborhood character varying(100),
    city character varying(100),
    state character varying(2),
    status public.enum_clients_status DEFAULT 'active'::public.enum_clients_status,
    notes text DEFAULT ''::text,
    tax_regime public.enum_clients_tax_regime,
    ie character varying(20),
    im character varying(20),
    ind_final public.enum_clients_ind_final DEFAULT '0'::public.enum_clients_ind_final,
    ind_ie public.enum_clients_ind_ie DEFAULT '9'::public.enum_clients_ind_ie,
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
    active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
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
    salary numeric(10,2) DEFAULT 0,
    salary_type public.enum_employees_salary_type DEFAULT 'mensal'::public.enum_employees_salary_type,
    hire_date date NOT NULL,
    dismissal_date date,
    status public.enum_employees_status DEFAULT 'active'::public.enum_employees_status,
    shift public.enum_employees_shift DEFAULT 'commercial'::public.enum_employees_shift,
    work_regime public.enum_employees_work_regime DEFAULT 'clt'::public.enum_employees_work_regime,
    work_hours_weekly integer DEFAULT 44,
    bank_name character varying(100),
    bank_agency character varying(10),
    bank_account character varying(20),
    bank_account_type public.enum_employees_bank_account_type DEFAULT 'corrente'::public.enum_employees_bank_account_type,
    pix_key character varying(100),
    education_level character varying(50),
    emergency_contact character varying(100),
    emergency_phone character varying(20),
    notes text,
    photo_url character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
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

COMMENT ON TABLE public.entradas_nf IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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

COMMENT ON TABLE public.entradas_nf_items IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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

COMMENT ON TABLE public.fornecedores IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: inventory_count_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_count_items (
    id integer NOT NULL,
    inventory_count_id integer NOT NULL,
    product_id integer,
    system_quantity numeric(12,3) DEFAULT 0 NOT NULL,
    counted_quantity numeric(12,3),
    variance_quantity numeric(12,3),
    status public.enum_inventory_count_items_status DEFAULT 'pending'::public.enum_inventory_count_items_status NOT NULL,
    counted_by integer,
    counted_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid,
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
    user_id integer NOT NULL,
    type public.enum_inventory_movements_type NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit_cost numeric(10,2) DEFAULT 0,
    description text,
    reference_id integer,
    reference_type public.enum_inventory_movements_reference_type,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid,
    warehouse_id integer
);


--
-- Name: COLUMN inventory_movements.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.product_id IS 'FK → products.id';


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
-- Name: item_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_categorias (
    id uuid NOT NULL,
    codigo character varying(50) NOT NULL,
    descricao character varying(240) NOT NULL,
    criado_em timestamp with time zone NOT NULL,
    atualizado_em timestamp with time zone NOT NULL
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
    criado_em timestamp with time zone NOT NULL,
    atualizado_em timestamp with time zone NOT NULL
);


--
-- Name: COLUMN item_detalhes_comerciais.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.item_id IS 'Referência ao Item (FK para items.id)';


--
-- Name: COLUMN item_detalhes_comerciais.preco_venda; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.preco_venda IS 'Preço de venda em moeda local';


--
-- Name: COLUMN item_detalhes_comerciais.categoria_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.categoria_id IS 'Referência a ItemCategoria (FK para item_categorias.id)';


--
-- Name: COLUMN item_detalhes_comerciais.ncm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.ncm IS 'Nomenclatura Comum do Mercosul para fins fiscais';


--
-- Name: COLUMN item_detalhes_comerciais.cest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.cest IS 'Código de Especificação da Substituição Tributária (CEST)';


--
-- Name: COLUMN item_detalhes_comerciais.peso_kg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.peso_kg IS 'Peso em quilogramas';


--
-- Name: COLUMN item_detalhes_comerciais.localizacao_estoque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.localizacao_estoque IS 'Localização física no depósito/armazém';


--
-- Name: COLUMN item_detalhes_comerciais.numero_desenho; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.numero_desenho IS 'Número de desenho ou referência técnica do produto';


--
-- Name: COLUMN item_detalhes_comerciais.revisao_tecnica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.revisao_tecnica IS 'Revisão técnica/versão do desenho';


--
-- Name: COLUMN item_detalhes_comerciais.lote_rastreabilidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.lote_rastreabilidade IS 'Lote para rastreabilidade';


--
-- Name: COLUMN item_detalhes_comerciais.numero_serie; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_detalhes_comerciais.numero_serie IS 'Número de série para rastreabilidade';


--
-- Name: item_especificacoes_tecnicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_especificacoes_tecnicas (
    item_id uuid NOT NULL,
    familia_tecnica character varying(40) NOT NULL,
    atributos jsonb DEFAULT '{}'::jsonb NOT NULL,
    criado_em timestamp with time zone NOT NULL,
    atualizado_em timestamp with time zone NOT NULL
);


--
-- Name: COLUMN item_especificacoes_tecnicas.item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_especificacoes_tecnicas.item_id IS 'Referência ao Item (FK para items.id)';


--
-- Name: COLUMN item_especificacoes_tecnicas.familia_tecnica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_especificacoes_tecnicas.familia_tecnica IS 'Família/tipo de especificação técnica (ex: ALTO_FALANTE, CABO, AMPLIFICADOR)';


--
-- Name: COLUMN item_especificacoes_tecnicas.atributos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_especificacoes_tecnicas.atributos IS 'JSON com atributos específicos da família (ex: Thiele-Small para ALTO_FALANTE)';


--
-- Name: item_estruturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_estruturas (
    id uuid NOT NULL,
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
    status public.enum_item_estruturas_status DEFAULT 'active'::public.enum_item_estruturas_status NOT NULL,
    approved_by integer,
    approval_date date,
    unit_cost numeric(18,6) DEFAULT 0 NOT NULL,
    total_cost numeric(18,6) DEFAULT 0 NOT NULL,
    parent_item_estrutura_id uuid,
    component_type public.enum_item_estruturas_component_type DEFAULT 'component'::public.enum_item_estruturas_component_type NOT NULL,
    is_critical boolean DEFAULT false NOT NULL,
    alternative_product_id uuid,
    criado_em timestamp with time zone NOT NULL,
    atualizado_em timestamp with time zone NOT NULL
);


--
-- Name: COLUMN item_estruturas.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.status IS 'Workflow status de versão de BOM (draft→active→inactive/superseded)';


--
-- Name: COLUMN item_estruturas.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.approved_by IS 'FK para usuario que aprovou esta estrutura';


--
-- Name: COLUMN item_estruturas.approval_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.approval_date IS 'Data de aprovação';


--
-- Name: COLUMN item_estruturas.unit_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.unit_cost IS 'Custo unitário do componente (cache)';


--
-- Name: COLUMN item_estruturas.total_cost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.total_cost IS 'Custo total: quantity × unit_cost × (1 + scrap%) (cache)';


--
-- Name: COLUMN item_estruturas.parent_item_estrutura_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.parent_item_estrutura_id IS 'FK para ItemEstrutura pai (para sub-BOMs)';


--
-- Name: COLUMN item_estruturas.component_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.component_type IS 'Tipo de componente';


--
-- Name: COLUMN item_estruturas.is_critical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.is_critical IS 'Flag: item crítico (single supplier, long lead time)';


--
-- Name: COLUMN item_estruturas.alternative_product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.item_estruturas.alternative_product_id IS 'FK para Item alternativo aprovado';


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
    id uuid NOT NULL,
    codigo character varying(80) NOT NULL,
    descricao character varying(240) NOT NULL,
    tipo public.enum_items_tipo NOT NULL,
    unidade character varying(12) NOT NULL,
    status public.enum_items_status DEFAULT 'ATIVO'::public.enum_items_status NOT NULL,
    estoque_atual numeric(18,6) DEFAULT 0 NOT NULL,
    estoque_reservado numeric(18,6) DEFAULT 0 NOT NULL,
    estoque_seguranca numeric(18,6) DEFAULT 0 NOT NULL,
    lote_minimo numeric(18,6) DEFAULT 0 NOT NULL,
    lead_time_dias integer DEFAULT 0 NOT NULL,
    custo_padrao numeric(18,6) DEFAULT 0 NOT NULL,
    fornecedor_padrao_id integer,
    criado_em timestamp with time zone NOT NULL,
    atualizado_em timestamp with time zone NOT NULL,
    conversao_automatica boolean DEFAULT false NOT NULL
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
-- Name: lot_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_controls (
    id integer NOT NULL,
    product_id integer NOT NULL,
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
    item_id uuid,
    warehouse_id integer
);


--
-- Name: COLUMN lot_controls.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_controls.product_id IS 'FK -> products.id';


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

COMMENT ON TABLE public.lotes IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: maintenance_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    asset_id integer NOT NULL,
    maintenance_type public.enum_maintenance_orders_maintenance_type NOT NULL,
    priority public.enum_maintenance_orders_priority DEFAULT 'normal'::public.enum_maintenance_orders_priority,
    problem_description text NOT NULL,
    reported_by integer,
    report_date date,
    diagnosed_problem text,
    diagnosed_by integer,
    diagnosis_date date,
    service_performed text,
    technician_id integer,
    start_date date,
    completion_date date,
    parts_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    downtime_hours numeric(10,1) DEFAULT 0,
    result public.enum_maintenance_orders_result,
    notes text,
    scheduled_date date,
    frequency_days integer,
    next_maintenance_date date,
    status public.enum_maintenance_orders_status DEFAULT 'open'::public.enum_maintenance_orders_status,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
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
-- Name: migracao_categoria_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migracao_categoria_map (
    product_category_id integer NOT NULL,
    item_categoria_id uuid NOT NULL,
    mapeado_em timestamp with time zone DEFAULT now() NOT NULL
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

COMMENT ON TABLE public.movimentos_estoque IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


--
-- Name: COLUMN movimentos_estoque.usuario_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.movimentos_estoque.usuario_id IS 'FK -> users.id (INTEGER). Corrigido em 20260806-000041 (era uuid -> usuarios, tabela orfa do schema-fantasma dual). Tabela movimentos_estoque e ela mesma orfa (0 uso em codigo vivo) — ver COMMENT ON TABLE.';


--
-- Name: mrp_ordens_planejadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mrp_ordens_planejadas (
    id uuid NOT NULL,
    item_id uuid NOT NULL,
    origem public.enum_mrp_ordens_planejadas_origem NOT NULL,
    origem_id uuid,
    necessidade_bruta numeric(18,6) NOT NULL,
    estoque_disponivel numeric(18,6) NOT NULL,
    necessidade_liquida numeric(18,6) NOT NULL,
    quantidade_planejada numeric(18,6) NOT NULL,
    data_necessidade date NOT NULL,
    data_liberacao date NOT NULL,
    status public.enum_mrp_ordens_planejadas_status DEFAULT 'RASCUNHO'::public.enum_mrp_ordens_planejadas_status NOT NULL,
    criado_em timestamp with time zone NOT NULL
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
    quantity_affected integer DEFAULT 0,
    immediate_action public.enum_non_conformities_immediate_action DEFAULT 'rework'::public.enum_non_conformities_immediate_action,
    immediate_action_desc text,
    root_cause text,
    root_cause_category public.enum_non_conformities_root_cause_category,
    corrective_action text,
    corrective_action_deadline date,
    responsible_id integer,
    effectiveness_check text,
    effectiveness_date date,
    effectiveness_result public.enum_non_conformities_effectiveness_result,
    status public.enum_non_conformities_status DEFAULT 'open'::public.enum_non_conformities_status,
    lot_number character varying(50),
    batch_number character varying(50),
    report_date date DEFAULT CURRENT_DATE,
    closed_date date,
    scrap_cost numeric(10,2) DEFAULT 0,
    rework_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
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

COMMENT ON TABLE public.numeros_serie IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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

COMMENT ON TABLE public.ordens_producao IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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
    description text DEFAULT ''::text,
    active boolean DEFAULT true,
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
    quantity_consumed numeric(12,4) NOT NULL,
    consumed_at timestamp with time zone NOT NULL,
    user_id integer,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid
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
    quantity_produced numeric(18,6) DEFAULT 0,
    priority public.enum_production_orders_priority DEFAULT 'normal'::public.enum_production_orders_priority,
    status public.enum_production_orders_status DEFAULT 'planned'::public.enum_production_orders_status,
    start_date date,
    due_date date NOT NULL,
    completion_date date,
    sales_order_id integer,
    responsible_id integer,
    notes text,
    created_by integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid,
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

COMMENT ON COLUMN public.production_route_steps.sequence IS 'Ordem sequencial da etapa';


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
    route_code character varying(50) NOT NULL,
    revision character varying(10) DEFAULT '00'::character varying NOT NULL,
    status public.enum_production_routes_status DEFAULT 'draft'::public.enum_production_routes_status NOT NULL,
    description text,
    total_standard_time_minutes numeric(10,2) DEFAULT 0 NOT NULL,
    created_by integer,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid
);


--
-- Name: COLUMN production_routes.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.product_id IS 'FK -> products.id';


--
-- Name: COLUMN production_routes.route_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.route_code IS 'Codigo unico do roteiro';


--
-- Name: COLUMN production_routes.revision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.production_routes.revision IS 'Revisao do roteiro';


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
    description text DEFAULT ''::text,
    category_id integer,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2) DEFAULT 0,
    quantity numeric(18,6) DEFAULT 0,
    reserved_quantity numeric(18,6) DEFAULT 0,
    min_quantity numeric(18,6) DEFAULT 5,
    status public.enum_products_status DEFAULT 'active'::public.enum_products_status,
    location character varying(100) DEFAULT ''::character varying,
    product_type public.enum_products_product_type DEFAULT 'finished'::public.enum_products_product_type,
    ncm character varying(10) DEFAULT '85182100'::character varying,
    cest character varying(10),
    weight numeric(10,3) DEFAULT 0,
    unit character varying(10) DEFAULT 'un'::character varying,
    lead_time integer DEFAULT 0,
    drawing_number character varying(50),
    lot_number character varying(50),
    serial_number character varying(80),
    revision character varying(10) DEFAULT '00'::character varying,
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

COMMENT ON COLUMN public.products.reserved_quantity IS 'Estoque reservado para pedidos/OPs';


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
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0,
    status public.enum_purchase_order_items_status DEFAULT 'pending'::public.enum_purchase_order_items_status,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid
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
    status public.enum_purchase_orders_status DEFAULT 'pending'::public.enum_purchase_orders_status,
    requisition_id integer,
    order_date date,
    expected_date date,
    delivery_date date,
    freight_type public.enum_purchase_orders_freight_type,
    freight_value numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) DEFAULT 0,
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
    invoice_type public.enum_purchase_orders_invoice_type
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

COMMENT ON TABLE public.requisicao_compra_items IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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

COMMENT ON TABLE public.requisicoes_compra IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id integer NOT NULL,
    sale_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(18,6) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid,
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

COMMENT ON COLUMN public.sale_items.product_id IS 'FK → products.id';


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
    discount numeric(10,2) DEFAULT 0,
    status public.enum_sales_status DEFAULT 'quote'::public.enum_sales_status,
    payment_method public.enum_sales_payment_method DEFAULT 'pix'::public.enum_sales_payment_method,
    installments integer DEFAULT 1,
    notes text DEFAULT ''::text,
    nfe_number character varying(50),
    nfe_status public.enum_sales_nfe_status DEFAULT 'pending'::public.enum_sales_nfe_status,
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
    lot_control_id integer,
    production_order_id integer,
    sale_id integer,
    serial_number character varying(120) NOT NULL,
    status public.enum_serial_numbers_status DEFAULT 'available'::public.enum_serial_numbers_status NOT NULL,
    manufactured_at date,
    sold_at date,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    item_id uuid
);


--
-- Name: COLUMN serial_numbers.product_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.serial_numbers.product_id IS 'FK -> products.id';


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
    labor_cost numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) DEFAULT 0,
    status public.enum_service_orders_status DEFAULT 'open'::public.enum_service_orders_status,
    priority public.enum_service_orders_priority DEFAULT 'normal'::public.enum_service_orders_priority,
    entry_date date,
    completion_date date,
    delivery_date date,
    technician_id integer,
    responsible_id integer,
    warranty_days integer DEFAULT 90,
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
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    company_name character varying(200) NOT NULL,
    trade_name character varying(200) DEFAULT ''::character varying,
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
    delivery_time integer DEFAULT 15,
    rating integer DEFAULT 3,
    status public.enum_suppliers_status DEFAULT 'active'::public.enum_suppliers_status,
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    quality_score numeric(5,2) DEFAULT 100 NOT NULL
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
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'operator'::public.enum_users_role,
    department character varying(100) DEFAULT ''::character varying,
    active boolean DEFAULT true,
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

COMMENT ON TABLE public.usuarios IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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

COMMENT ON TABLE public.webhooks_eventos IS 'DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. Ver docs/LEVANTAMENTO_ERP_2026-08-02.md e server/tests/unit/no-orphan-pt-schema-tables.test.ts.';


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
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


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
-- Name: item_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers ALTER COLUMN id SET DEFAULT nextval('public.item_suppliers_id_seq'::regclass);


--
-- Name: lot_controls id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls ALTER COLUMN id SET DEFAULT nextval('public.lot_controls_id_seq'::regclass);


--
-- Name: maintenance_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_orders ALTER COLUMN id SET DEFAULT nextval('public.maintenance_orders_id_seq'::regclass);


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
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


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
-- Name: migracao_bom_log migracao_bom_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_bom_log
    ADD CONSTRAINT migracao_bom_log_pkey PRIMARY KEY (id);


--
-- Name: migracao_categoria_map migracao_categoria_map_item_categoria_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_categoria_map
    ADD CONSTRAINT migracao_categoria_map_item_categoria_id_key UNIQUE (item_categoria_id);


--
-- Name: migracao_categoria_map migracao_categoria_map_product_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_categoria_map
    ADD CONSTRAINT migracao_categoria_map_product_category_id_key UNIQUE (product_category_id);


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
-- Name: access_profile_permissions uq_access_profile_permissions_profile_module; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions
    ADD CONSTRAINT uq_access_profile_permissions_profile_module UNIQUE (access_profile_id, module);


--
-- Name: item_suppliers uq_item_suppliers_item_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suppliers
    ADD CONSTRAINT uq_item_suppliers_item_supplier UNIQUE (item_id, supplier_id);


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
-- Name: idx_accounts_payable_cost_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_payable_cost_center_id ON public.accounts_payable USING btree (cost_center_id);


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
-- Name: idx_bill_of_material_items_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bill_of_material_items_item_id ON public.bill_of_material_items USING btree (item_id);


--
-- Name: idx_bom_item_bom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_bom ON public.bill_of_material_items USING btree (bom_id);


--
-- Name: idx_bom_item_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bom_item_component ON public.bill_of_material_items USING btree (component_product_id);


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
-- Name: idx_item_categorias_codigo_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_item_categorias_codigo_unique ON public.item_categorias USING btree (codigo);


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
-- Name: idx_item_estruturas_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_ativo ON public.item_estruturas USING btree (ativo);


--
-- Name: idx_item_estruturas_component_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_item_estruturas_component_type ON public.item_estruturas USING btree (component_type);


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
-- Name: idx_lot_controls_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_item_id ON public.lot_controls USING btree (item_id);


--
-- Name: idx_lot_controls_warehouse_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_controls_warehouse_id ON public.lot_controls USING btree (warehouse_id);


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
-- Name: idx_work_center_shifts_work_center_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_center_shifts_work_center_id ON public.work_center_shifts USING btree (work_center_id);


--
-- Name: inventory_count_items_inventory_count_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_count_items_inventory_count_id ON public.inventory_count_items USING btree (inventory_count_id);


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
-- Name: uq_bank_statement_entries_statement_fitid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bank_statement_entries_statement_fitid ON public.bank_statement_entries USING btree (statement_id, fitid);


--
-- Name: uq_item_estruturas_ativa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_item_estruturas_ativa ON public.item_estruturas USING btree (item_pai_id, item_componente_id, revisao);


--
-- Name: uq_mrp_sem_duplicidade; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_mrp_sem_duplicidade ON public.mrp_ordens_planejadas USING btree (item_id, origem, origem_id, data_necessidade);


--
-- Name: uq_production_downtimes_open_per_work_center; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_production_downtimes_open_per_work_center ON public.production_downtimes USING btree (work_center_id) WHERE (finished_at IS NULL);


--
-- Name: webhook_events_source_event_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX webhook_events_source_event_id_unique ON public.webhook_events USING btree (source, event_id);


--
-- Name: access_profile_permissions access_profile_permissions_access_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_profile_permissions
    ADD CONSTRAINT access_profile_permissions_access_profile_id_fkey FOREIGN KEY (access_profile_id) REFERENCES public.access_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: accounts_payable accounts_payable_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id) ON UPDATE CASCADE ON DELETE SET NULL;


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
-- Name: entradas_nf_items entradas_nf_items_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entradas_nf_items
    ADD CONSTRAINT entradas_nf_items_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


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
-- Name: lot_controls lot_controls_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_controls
    ADD CONSTRAINT lot_controls_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: migracao_categoria_map migracao_categoria_map_item_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracao_categoria_map
    ADD CONSTRAINT migracao_categoria_map_item_categoria_id_fkey FOREIGN KEY (item_categoria_id) REFERENCES public.item_categorias(id);


--
-- Name: movimentos_estoque movimentos_estoque_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_estoque
    ADD CONSTRAINT movimentos_estoque_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: non_conformities non_conformities_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.non_conformities
    ADD CONSTRAINT non_conformities_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: numeros_serie numeros_serie_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.numeros_serie
    ADD CONSTRAINT numeros_serie_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE SET NULL;


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

\unrestrict MUD2jTcAHC4S8PiEvPhxJHdzdD82wxA4EdcixwxTZX3yIilPJRHEECRa7CYk0Dz

