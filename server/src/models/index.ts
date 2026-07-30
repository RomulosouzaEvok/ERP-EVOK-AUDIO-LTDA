/**
 * 🗄️ Barrel de Models — ponto central de importação de todos os modelos.
 *
 * Define os relacionamentos entre entidades e exporta a instância do Sequelize.
 * Compatível com importação CommonJS (require) de módulos .ts anteriors.
 *
 * @module models/index
 */

import { sequelize } from '../config/database';

// Import all models (.ts preferencialmente, fallback .ts via tsx runtime)
import User = require('./User');
import Client = require('./Client');
import Category = require('./Category');
import Product = require('./Product');
import Supplier = require('./Supplier');
import Purchase = require('./Purchase');
import PurchaseItem = require('./PurchaseItem');
import Sale = require('./Sale');
import SaleItem = require('./SaleItem');
import AccountReceivable = require('./AccountReceivable');
import AccountPayable = require('./AccountPayable');
import InventoryMovement = require('./InventoryMovement');
import InventoryCount = require('./InventoryCount');
import InventoryCountItem = require('./InventoryCountItem');
import ProductCostLedger = require('./ProductCostLedger');
import Department = require('./Department');
import Employee = require('./Employee');
import ProductionOrder = require('./ProductionOrder');
import ProductionRoute = require('./ProductionRoute');
import ProductionRouteStep = require('./ProductionRouteStep');
import ProductionOrderTracking = require('./ProductionOrderTracking');
import LotControl = require('./LotControl');
import SerialNumber = require('./SerialNumber');
import ProductionLotConsumption = require('./ProductionLotConsumption');
import ServiceOrder = require('./ServiceOrder');
import Asset = require('./Asset');
import NonConformity = require('./NonConformity');
import MaintenanceOrder = require('./MaintenanceOrder');
import AuditLog = require('./AuditLog');
import BillOfMaterial = require('./BillOfMaterial');
import BillOfMaterialItem = require('./BillOfMaterialItem');
import Item = require('./Item');
import ItemEstrutura = require('./ItemEstrutura');
import ItemCategoria = require('./ItemCategoria');
import ItemDetalheComercial = require('./ItemDetalheComercial');
import ItemEspecificacaoTecnica = require('./ItemEspecificacaoTecnica');
import MrpOrdemPlanejada = require('./MrpOrdemPlanejada');

// ============================================
// RELACIONAMENTOS
// ============================================

// User ↔ Employee
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Department ↔ Employee
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Department self-reference (manager)
Department.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Employee.hasMany(Department, { foreignKey: 'manager_id', as: 'managed_departments' });

// Category ↔ Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Supplier ↔ Purchase
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// User ↔ Purchase (requester)
User.hasMany(Purchase, { foreignKey: 'requester_id', as: 'purchases' });
Purchase.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

// Purchase ↔ PurchaseItem
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

// Product ↔ PurchaseItem
Product.hasMany(PurchaseItem, { foreignKey: 'product_id', as: 'purchase_items' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Item ↔ PurchaseItem (Fase 4.2 expand-contract)
Item.hasMany(PurchaseItem, { foreignKey: 'item_id', as: 'purchase_items' });
PurchaseItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Client ↔ Sale
Client.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
Sale.belongsTo(Client, { foreignKey: 'customer_id', as: 'customer' });

// User ↔ Sale (seller)
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sale ↔ SaleItem
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Product ↔ SaleItem
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'sale_items' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Sale ↔ AccountReceivable
Sale.hasMany(AccountReceivable, { foreignKey: 'sale_id', as: 'accounts_receivable' });
AccountReceivable.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Client ↔ AccountReceivable
Client.hasMany(AccountReceivable, { foreignKey: 'customer_id', as: 'accounts_receivable' });
AccountReceivable.belongsTo(Client, { foreignKey: 'customer_id', as: 'customer' });

// Supplier ↔ AccountPayable
Supplier.hasMany(AccountPayable, { foreignKey: 'supplier_id', as: 'accounts_payable' });
AccountPayable.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Purchase ↔ AccountPayable
Purchase.hasMany(AccountPayable, { foreignKey: 'purchase_id', as: 'accounts_payable' });
AccountPayable.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

// Product ↔ InventoryMovement
Product.hasMany(InventoryMovement, { foreignKey: 'product_id', as: 'movements' });
InventoryMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ InventoryMovement
User.hasMany(InventoryMovement, { foreignKey: 'user_id', as: 'inventory_movements' });
InventoryMovement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item ↔ InventoryMovement (Fase 4.1 expand-contract)
Item.hasMany(InventoryMovement, { foreignKey: 'item_id', as: 'item_movements' });
InventoryMovement.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// ============================================
// RELACIONAMENTOS - INVENTÁRIO CÍCLICO (F09)
// ============================================

// InventoryCount ↔ InventoryCountItem
InventoryCount.hasMany(InventoryCountItem, { foreignKey: 'inventory_count_id', as: 'items' });
InventoryCountItem.belongsTo(InventoryCount, { foreignKey: 'inventory_count_id', as: 'inventoryCount' });

// Product ↔ InventoryCountItem
Product.hasMany(InventoryCountItem, { foreignKey: 'product_id', as: 'inventory_count_items' });
InventoryCountItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ InventoryCount (created by / approved by)
User.hasMany(InventoryCount, { foreignKey: 'created_by', as: 'created_inventory_counts' });
InventoryCount.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
User.hasMany(InventoryCount, { foreignKey: 'approved_by', as: 'approved_inventory_counts' });
InventoryCount.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

// User ↔ InventoryCountItem (counted by)
User.hasMany(InventoryCountItem, { foreignKey: 'counted_by', as: 'counted_inventory_items' });
InventoryCountItem.belongsTo(User, { foreignKey: 'counted_by', as: 'countedBy' });

// Product ↔ ProductionOrder
Product.hasMany(ProductionOrder, { foreignKey: 'product_id', as: 'production_orders' });
ProductionOrder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Employee ↔ ProductionOrder (responsible)
Employee.hasMany(ProductionOrder, { foreignKey: 'responsible_id', as: 'production_orders' });
ProductionOrder.belongsTo(Employee, { foreignKey: 'responsible_id', as: 'responsible' });

// User ↔ ProductionOrder (createdBy)
User.hasMany(ProductionOrder, { foreignKey: 'created_by', as: 'created_production_orders' });
ProductionOrder.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// Sale ↔ ProductionOrder
Sale.hasMany(ProductionOrder, { foreignKey: 'sales_order_id', as: 'production_orders' });
ProductionOrder.belongsTo(Sale, { foreignKey: 'sales_order_id', as: 'salesOrder' });

Product.hasMany(ProductionRoute, { foreignKey: 'product_id', as: 'production_routes' });
ProductionRoute.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductionRoute.hasMany(ProductionRouteStep, { foreignKey: 'production_route_id', as: 'steps' });
ProductionRouteStep.belongsTo(ProductionRoute, { foreignKey: 'production_route_id', as: 'route' });

ProductionOrder.hasMany(ProductionOrderTracking, { foreignKey: 'production_order_id', as: 'tracking' });
ProductionOrderTracking.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

ProductionRouteStep.hasMany(ProductionOrderTracking, { foreignKey: 'production_route_step_id', as: 'tracking_entries' });
ProductionOrderTracking.belongsTo(ProductionRouteStep, { foreignKey: 'production_route_step_id', as: 'routeStep' });

Employee.hasMany(ProductionOrderTracking, { foreignKey: 'operator_id', as: 'production_tracking' });
ProductionOrderTracking.belongsTo(Employee, { foreignKey: 'operator_id', as: 'operator' });

User.hasMany(ProductionRoute, { foreignKey: 'created_by', as: 'created_production_routes' });
ProductionRoute.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
User.hasMany(ProductionRoute, { foreignKey: 'approved_by', as: 'approved_production_routes' });
ProductionRoute.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

// ============================================
// RELACIONAMENTOS - RASTREABILIDADE LOTE/SERIE (F06)
// ============================================

Product.hasMany(LotControl, { foreignKey: 'product_id', as: 'lot_controls' });
LotControl.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Supplier.hasMany(LotControl, { foreignKey: 'supplier_id', as: 'lot_controls' });
LotControl.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

Purchase.hasMany(LotControl, { foreignKey: 'purchase_id', as: 'lot_controls' });
LotControl.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });

ProductionOrder.hasMany(LotControl, { foreignKey: 'production_order_id', as: 'generated_lots' });
LotControl.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

User.hasMany(LotControl, { foreignKey: 'created_by', as: 'created_lot_controls' });
LotControl.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

Product.hasMany(SerialNumber, { foreignKey: 'product_id', as: 'serial_numbers' });
SerialNumber.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

LotControl.hasMany(SerialNumber, { foreignKey: 'lot_control_id', as: 'serial_numbers' });
SerialNumber.belongsTo(LotControl, { foreignKey: 'lot_control_id', as: 'lotControl' });

ProductionOrder.hasMany(SerialNumber, { foreignKey: 'production_order_id', as: 'generated_serial_numbers' });
SerialNumber.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

Sale.hasMany(SerialNumber, { foreignKey: 'sale_id', as: 'serial_numbers' });
SerialNumber.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

ProductionOrder.hasMany(ProductionLotConsumption, { foreignKey: 'production_order_id', as: 'lot_consumptions' });
ProductionLotConsumption.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

LotControl.hasMany(ProductionLotConsumption, { foreignKey: 'lot_control_id', as: 'production_consumptions' });
ProductionLotConsumption.belongsTo(LotControl, { foreignKey: 'lot_control_id', as: 'lotControl' });

Product.hasMany(ProductionLotConsumption, { foreignKey: 'product_id', as: 'production_lot_consumptions' });
ProductionLotConsumption.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(ProductionLotConsumption, { foreignKey: 'user_id', as: 'production_lot_consumptions' });
ProductionLotConsumption.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Product cost ledger (F07)
Product.hasMany(ProductCostLedger, { foreignKey: 'product_id', as: 'cost_ledgers' });
ProductCostLedger.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(ProductCostLedger, { foreignKey: 'created_by', as: 'created_cost_ledgers' });
ProductCostLedger.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// ============================================
// RELACIONAMENTOS - MODELO CANONICO INDUSTRIAL
// ============================================

Supplier.hasMany(Item, { foreignKey: 'fornecedor_padrao_id', as: 'itens_padrao' });
Item.belongsTo(Supplier, { foreignKey: 'fornecedor_padrao_id', as: 'fornecedorPadrao' });

Item.hasMany(ItemEstrutura, { foreignKey: 'item_pai_id', as: 'estruturas_filhas' });
ItemEstrutura.belongsTo(Item, { foreignKey: 'item_pai_id', as: 'itemPai', onDelete: 'RESTRICT' });

Item.hasMany(ItemEstrutura, { foreignKey: 'item_componente_id', as: 'estruturas_componente' });
ItemEstrutura.belongsTo(Item, { foreignKey: 'item_componente_id', as: 'itemComponente', onDelete: 'RESTRICT' });

User.hasMany(ItemEstrutura, { foreignKey: 'criado_por', as: 'estruturas_criadas' });
ItemEstrutura.belongsTo(User, { foreignKey: 'criado_por', as: 'criadoPor' });

// ItemEstrutura (Fase 2A - novos campos)
User.hasMany(ItemEstrutura, { foreignKey: 'approved_by', as: 'estruturas_aprovadas' });
ItemEstrutura.belongsTo(User, { foreignKey: 'approved_by', as: 'aprovadorPor' });

ItemEstrutura.hasMany(ItemEstrutura, { foreignKey: 'parent_item_estrutura_id', as: 'sub_estruturas' });
ItemEstrutura.belongsTo(ItemEstrutura, { foreignKey: 'parent_item_estrutura_id', as: 'estruturaPai', onDelete: 'SET NULL' });

Item.hasMany(ItemEstrutura, { foreignKey: 'alternative_product_id', as: 'estruturas_alternativas' });
ItemEstrutura.belongsTo(Item, { foreignKey: 'alternative_product_id', as: 'itemAlternativo' });

Item.hasMany(MrpOrdemPlanejada, { foreignKey: 'item_id', as: 'ordens_mrp_planejadas' });
MrpOrdemPlanejada.belongsTo(Item, { foreignKey: 'item_id', as: 'item', onDelete: 'RESTRICT' });

// ItemCategoria ↔ ItemDetalheComercial
ItemCategoria.hasMany(ItemDetalheComercial, { foreignKey: 'categoria_id', as: 'itens_detalhe' });
ItemDetalheComercial.belongsTo(ItemCategoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Item ↔ ItemDetalheComercial (1:1)
Item.hasOne(ItemDetalheComercial, { foreignKey: 'item_id', as: 'detalheComercial', onDelete: 'CASCADE' });
ItemDetalheComercial.belongsTo(Item, { foreignKey: 'item_id', as: 'item', onDelete: 'CASCADE' });

// Item ↔ ItemEspecificacaoTecnica (1:1 optional)
Item.hasOne(ItemEspecificacaoTecnica, { foreignKey: 'item_id', as: 'especificacaoTecnica', onDelete: 'CASCADE' });
ItemEspecificacaoTecnica.belongsTo(Item, { foreignKey: 'item_id', as: 'item', onDelete: 'CASCADE' });

// Client ↔ ServiceOrder
Client.hasMany(ServiceOrder, { foreignKey: 'client_id', as: 'service_orders' });
ServiceOrder.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// Product ↔ ServiceOrder
Product.hasMany(ServiceOrder, { foreignKey: 'product_id', as: 'service_orders' });
ServiceOrder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// User ↔ ServiceOrder (technician)
User.hasMany(ServiceOrder, { foreignKey: 'technician_id', as: 'service_orders_technician' });
ServiceOrder.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' });

// User ↔ ServiceOrder (responsible)
User.hasMany(ServiceOrder, { foreignKey: 'responsible_id', as: 'service_orders_responsible' });
ServiceOrder.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });

// Department ↔ Asset
Department.hasMany(Asset, { foreignKey: 'department_id', as: 'assets' });
Asset.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Employee ↔ Asset (responsible)
Employee.hasMany(Asset, { foreignKey: 'responsible_id', as: 'assets' });
Asset.belongsTo(Employee, { foreignKey: 'responsible_id', as: 'responsible' });

// Product ↔ Asset
Product.hasMany(Asset, { foreignKey: 'product_id', as: 'assets' });
Asset.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// ============================================
// RELACIONAMENTOS - MÓDULOS DE QUALIDADE (FASE 4)
// ============================================

// NonConformity associations
Product.hasMany(NonConformity, { foreignKey: 'product_id', as: 'non_conformities' });
NonConformity.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductionOrder.hasMany(NonConformity, { foreignKey: 'production_order_id', as: 'non_conformities' });
NonConformity.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

Supplier.hasMany(NonConformity, { foreignKey: 'supplier_id', as: 'non_conformities' });
NonConformity.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

User.hasMany(NonConformity, { foreignKey: 'reported_by', as: 'reported_ncs' });
NonConformity.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });

User.hasMany(NonConformity, { foreignKey: 'responsible_id', as: 'responsible_ncs' });
NonConformity.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });

User.hasMany(NonConformity, { foreignKey: 'closed_by', as: 'closed_ncs' });
NonConformity.belongsTo(User, { foreignKey: 'closed_by', as: 'closer' });

// MaintenanceOrder associations
Asset.hasMany(MaintenanceOrder, { foreignKey: 'asset_id', as: 'maintenance_orders' });
MaintenanceOrder.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });

User.hasMany(MaintenanceOrder, { foreignKey: 'technician_id', as: 'maintenance_as_technician' });
MaintenanceOrder.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' });

User.hasMany(MaintenanceOrder, { foreignKey: 'reported_by', as: 'maintenance_reported' });
MaintenanceOrder.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });

User.hasMany(MaintenanceOrder, { foreignKey: 'diagnosed_by', as: 'maintenance_diagnosed' });
MaintenanceOrder.belongsTo(User, { foreignKey: 'diagnosed_by', as: 'diagnoser' });

// AuditLog associations
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ============================================
// RELACIONAMENTOS - BOM
// ============================================

// Product ↔ BillOfMaterial
Product.hasMany(BillOfMaterial, { foreignKey: 'product_id', as: 'boms' });
BillOfMaterial.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// BillOfMaterial ↔ BillOfMaterialItem
BillOfMaterial.hasMany(BillOfMaterialItem, { foreignKey: 'bom_id', as: 'items' });
BillOfMaterialItem.belongsTo(BillOfMaterial, { foreignKey: 'bom_id', as: 'bom' });

// Product ↔ BillOfMaterialItem (component)
Product.hasMany(BillOfMaterialItem, { foreignKey: 'component_product_id', as: 'bom_references' });
BillOfMaterialItem.belongsTo(Product, { foreignKey: 'component_product_id', as: 'componentProduct' });

// BillOfMaterialItem self-reference (parent item)
BillOfMaterialItem.belongsTo(BillOfMaterialItem, { foreignKey: 'parent_item_id', as: 'parentItem' });
BillOfMaterialItem.hasMany(BillOfMaterialItem, { foreignKey: 'parent_item_id', as: 'subItems' });

// Alternative product in BOM
BillOfMaterialItem.belongsTo(Product, { foreignKey: 'alternative_product_id', as: 'alternativeProduct' });

export {
  sequelize,
  User, Client, Category, Product, Supplier,
  Purchase, PurchaseItem, Sale, SaleItem,
  AccountReceivable, AccountPayable,
  InventoryMovement, InventoryCount, InventoryCountItem, ProductCostLedger, Department, Employee,
  ProductionOrder, ProductionRoute, ProductionRouteStep, ProductionOrderTracking,
  LotControl, SerialNumber, ProductionLotConsumption,
  ServiceOrder, Asset,
  NonConformity, MaintenanceOrder, AuditLog,
  BillOfMaterial, BillOfMaterialItem,
  Item, ItemEstrutura, ItemCategoria, ItemDetalheComercial, ItemEspecificacaoTecnica, MrpOrdemPlanejada
};
