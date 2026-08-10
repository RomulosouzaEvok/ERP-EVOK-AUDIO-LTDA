/**
 * 👥 Model: Client (Clientes)
 *
 * @module models/Client
 *
 * Gerencia cadastro de clientes pessoa física (CPF) e jurídica (CNPJ),
 * com validação de documentos fiscais e regime tributário para NF-e.
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

interface ClientAttributes {
  id: number;
  name: string;
  cpf_cnpj: string;
  phone: string;
  email: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  status: 'active' | 'inactive';
  notes: string;
  tax_regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | null;
  ie: string | null;
  im: string | null;
  ind_final: '0' | '1';
  ind_ie: '1' | '2' | '9';
  cnae: string | null;
  city_ibge_code: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const Client = sequelize.define('Client', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, comment: 'Identificador único' },
  name: { type: DataTypes.STRING(200), allowNull: false, comment: 'Nome ou Razão Social' },
  cpf_cnpj: { type: DataTypes.STRING(18), allowNull: false, unique: true, comment: 'CPF ou CNPJ (apenas números ou formatado)' },
  phone: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '', comment: 'Telefone de contato' },
  email: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '', comment: 'Email de contato' },
  // Endereço inteiro é opcional no cadastro (o createClientSchema não exige
  // nenhum destes campos). O NOT NULL sem default que existia no banco
  // tornava impossível criar cliente — removido na migration 20260810-000028
  // (BUG-02).
  cep: { type: DataTypes.STRING(10), allowNull: true },
  street: { type: DataTypes.STRING(200), allowNull: true },
  number: { type: DataTypes.STRING(20), allowNull: true },
  complement: { type: DataTypes.STRING(100), allowNull: true },
  neighborhood: { type: DataTypes.STRING(100), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  state: { type: DataTypes.STRING(2), allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active', comment: 'Status do cadastro' },
  notes: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  tax_regime: { type: DataTypes.ENUM('simples_nacional', 'lucro_presumido', 'lucro_real'), allowNull: true, comment: 'Regime tributário; só se aplica a pessoa jurídica' },
  ie: { type: DataTypes.STRING(20), allowNull: true, comment: 'Inscrição estadual; só se aplica a contribuinte de ICMS' },
  im: { type: DataTypes.STRING(20), allowNull: true, comment: 'Inscrição municipal; só se aplica a prestador de serviço' },
  ind_final: { type: DataTypes.ENUM('0', '1'), allowNull: false, defaultValue: '0', comment: 'Consumidor final (0=não, 1=sim)' },
  ind_ie: { type: DataTypes.ENUM('1', '2', '9'), allowNull: false, defaultValue: '9', comment: 'Contribuinte ICMS (1=contribuinte, 2=isento, 9=não contribuinte)' },
  // ATENÇÃO: `cnae` não é aceito por createClientSchema (.strict()) — hoje
  // nenhum endpoint consegue preenchê-lo. Se o negócio decidir passar a
  // coletar CNAE, o campo precisa entrar no validador ANTES de qualquer
  // discussão sobre torná-lo obrigatório.
  cnae: { type: DataTypes.STRING(10), allowNull: true, comment: 'CNAE (classificação de atividade econômica); só se aplica a pessoa jurídica' },
  city_ibge_code: { type: DataTypes.STRING(7), allowNull: true }
}, {
  tableName: 'clients',
  underscored: true,
  timestamps: true
});

export = Client;

