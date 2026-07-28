const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Client = require('./Client');
const Category = require('./Category');
const Product = require('./Product');
const Supplier = require('./Supplier');
const Purchase = require('./Purchase');
const PurchaseItem = require('./PurchaseItem');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const AccountReceivable = require('./AccountReceivable');
const AccountPayable = require('./AccountPayable');
const InventoryMovement = require('./InventoryMovement');
const Department = require('./Department');
const Employee = require('./Employee');
const ProductionOrder = require('./ProductionOrder');
const ServiceOrder = require('./ServiceOrder');
const Asset = require('./Asset');
const NonConformity = require('./NonConformity');
const MaintenanceOrder = require('./MaintenanceOrder');
const AuditLog = require('./AuditLog');
const BillOfMaterial = require('./BillOfMaterial');
const BillOfMaterialItem = require('./BillOfMaterialItem');

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
// RELACIONAMENTOS - NOVOS MÓDULOS FASE 4
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
// RELACIONAMENTOS - BOM (Bill of Materials)
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

module.exports = {
  sequelize,
  User, Client, Category, Product, Supplier,
  Purchase, PurchaseItem, Sale, SaleItem,
  AccountReceivable, AccountPayable,
  InventoryMovement, Department, Employee,
  ProductionOrder, ServiceOrder, Asset,
  NonConformity, MaintenanceOrder, AuditLog,
  BillOfMaterial, BillOfMaterialItem
};

