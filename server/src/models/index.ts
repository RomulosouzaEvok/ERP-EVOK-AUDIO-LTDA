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
import PurchaseOrderApproval = require('./PurchaseOrderApproval');
import PurchaseRequisition = require('./PurchaseRequisition');
import PurchaseRequisitionItem = require('./PurchaseRequisitionItem');
import Sale = require('./Sale');
import SaleItem = require('./SaleItem');
import AccountReceivable = require('./AccountReceivable');
import AccountPayable = require('./AccountPayable');
import InventoryMovement = require('./InventoryMovement');
import InventoryCount = require('./InventoryCount');
import InventoryCountItem = require('./InventoryCountItem');
import ProductCostLedger = require('./ProductCostLedger');
import Department = require('./Department');
import Directorate = require('./Directorate');
import StrategicPlanning = require('./StrategicPlanning');
import MeetingMinute = require('./MeetingMinute');
import BusinessRisk = require('./BusinessRisk');
import Employee = require('./Employee');
import ProductionOrder = require('./ProductionOrder');
import ProductionRoute = require('./ProductionRoute');
import ProductionRouteStep = require('./ProductionRouteStep');
import ProductionOrderTracking = require('./ProductionOrderTracking');
import LotControl = require('./LotControl');
import SerialNumber = require('./SerialNumber');
import ProductionLotConsumption = require('./ProductionLotConsumption');
import ProductionOrderReservation = require('./ProductionOrderReservation');
import ServiceOrder = require('./ServiceOrder');
import Asset = require('./Asset');
import NonConformity = require('./NonConformity');
import QualityInspection = require('./QualityInspection');
import MasterProductionPlan = require('./MasterProductionPlan');
import MasterProductionPlanLine = require('./MasterProductionPlanLine');
import MaintenanceOrder = require('./MaintenanceOrder');
import AuditLog = require('./AuditLog');
import WebhookEvent = require('./WebhookEvent');
import CompanyFiscalConfig = require('./CompanyFiscalConfig');
import PurchaseReceipt = require('./PurchaseReceipt');
import FinancialPaymentEvent = require('./FinancialPaymentEvent');
import BillOfMaterial = require('./BillOfMaterial');
import BillOfMaterialItem = require('./BillOfMaterialItem');
import Item = require('./Item');
import ItemEstrutura = require('./ItemEstrutura');
import ItemCategoria = require('./ItemCategoria');
import ItemDetalheComercial = require('./ItemDetalheComercial');
import ItemEspecificacaoTecnica = require('./ItemEspecificacaoTecnica');
import MrpOrdemPlanejada = require('./MrpOrdemPlanejada');
import ItemSupplier = require('./ItemSupplier');
import WorkCenter = require('./WorkCenter');
import WorkCenterShift = require('./WorkCenterShift');
import EngineeringProject = require('./EngineeringProject');
import ProductDrawing = require('./ProductDrawing');
import AcousticTestResult = require('./AcousticTestResult');
import AccessProfile = require('./AccessProfile');
import AccessProfilePermission = require('./AccessProfilePermission');
import Warehouse = require('./Warehouse');
import ProductWarehouseStock = require('./ProductWarehouseStock');
import WarehouseTransfer = require('./WarehouseTransfer');
import ProductionCostSettings = require('./ProductionCostSettings');
import Rfq = require('./Rfq');
import RfqItem = require('./RfqItem');
import RfqSupplier = require('./RfqSupplier');
import RfqQuote = require('./RfqQuote');
import CostCenter = require('./CostCenter');
import BankStatement = require('./BankStatement');
import BankStatementEntry = require('./BankStatementEntry');
import ProductionDowntime = require('./ProductionDowntime');
import CustomerPriceList = require('./CustomerPriceList');
import ImportProcess = require('./ImportProcess');
import ImportProcessItem = require('./ImportProcessItem');
import ImportProcessApproval = require('./ImportProcessApproval');
import SaleInvoice = require('./SaleInvoice');
import SaleLotShipment = require('./SaleLotShipment');
import CompanyBankingConfig = require('./CompanyBankingConfig');
import CnabRemittance = require('./CnabRemittance');
import CnabRemittanceItem = require('./CnabRemittanceItem');
import CnabReturnFile = require('./CnabReturnFile');
import CnabReturnOccurrence = require('./CnabReturnOccurrence');
import SstTipoEpi = require('./SstTipoEpi');
import SstMatrizEpi = require('./SstMatrizEpi');
import SstEntregaEpi = require('./SstEntregaEpi');
import SstDevolucaoEpi = require('./SstDevolucaoEpi');
import SstAcaoCorretiva = require('./SstAcaoCorretiva');
import SstPlanoExames = require('./SstPlanoExames');
import SstAso = require('./SstAso');
import SstExameComplementar = require('./SstExameComplementar');
import SstAcidente = require('./SstAcidente');
import SstAcidenteTestemunha = require('./SstAcidenteTestemunha');
import SstInvestigacaoAcidente = require('./SstInvestigacaoAcidente');
import SstAcidenteComplemento = require('./SstAcidenteComplemento');
import SstCat = require('./SstCat');
import SstEventoEsocial = require('./SstEventoEsocial');
import SstMandatoCipa = require('./SstMandatoCipa');
import SstMembroCipa = require('./SstMembroCipa');
import SstProcessoEleitoralCipa = require('./SstProcessoEleitoralCipa');
import SstCandidatoCipa = require('./SstCandidatoCipa');
import SstReuniaoCipa = require('./SstReuniaoCipa');
import SstReuniaoCipaPresente = require('./SstReuniaoCipaPresente');
import SstGes = require('./SstGes');
import SstGesFuncionario = require('./SstGesFuncionario');
import SstRiscoOcupacional = require('./SstRiscoOcupacional');
import SstRiscoEpi = require('./SstRiscoEpi');
import SstRiscoExame = require('./SstRiscoExame');
import SstMatrizTreinamento = require('./SstMatrizTreinamento');
import SstTreinamento = require('./SstTreinamento');
import SstInspecaoSeguranca = require('./SstInspecaoSeguranca');
import SstInspecaoItem = require('./SstInspecaoItem');
import SstPermissaoTrabalho = require('./SstPermissaoTrabalho');
import SstPtExecutante = require('./SstPtExecutante');
import SstBrigadista = require('./SstBrigadista');
import SstRegistroDds = require('./SstRegistroDds');
import SstDdsPresenca = require('./SstDdsPresenca');
import ItTicketCategory = require('./ItTicketCategory');
import ItTicket = require('./ItTicket');
import ItTicketComment = require('./ItTicketComment');
import ItTicketPriorityHistory = require('./ItTicketPriorityHistory');
import ItResponsibilityTerm = require('./ItResponsibilityTerm');
import ItSoftwareLicenseDetail = require('./ItSoftwareLicenseDetail');
import ItLicenseSeat = require('./ItLicenseSeat');
import ItAccessRequest = require('./ItAccessRequest');
import ItBackupLog = require('./ItBackupLog');
import TiSettings = require('./TiSettings');
import FacilityVehicleDetail = require('./FacilityVehicleDetail');
import FacilityVehicleDocument = require('./FacilityVehicleDocument');
import FacilityDriver = require('./FacilityDriver');
import FacilityVehicleTrip = require('./FacilityVehicleTrip');
import FacilityFuelRecord = require('./FacilityFuelRecord');
import FacilityFine = require('./FacilityFine');
import FacilityCleaningSchedule = require('./FacilityCleaningSchedule');
import FacilityCleaningExecution = require('./FacilityCleaningExecution');
import FacilityArea = require('./FacilityArea');
import FacilityVisitor = require('./FacilityVisitor');
import FacilityVisit = require('./FacilityVisit');
import FacilityCorrespondence = require('./FacilityCorrespondence');
import FacilityResourceReservation = require('./FacilityResourceReservation');
import MarketingCampaign = require('./MarketingCampaign');
import MarketingLead = require('./MarketingLead');
import MarketingMaterial = require('./MarketingMaterial');
import MarketingEvent = require('./MarketingEvent');
import MarketingEventChecklistItem = require('./MarketingEventChecklistItem');
import MarketingLeadSaneamentoLog = require('./MarketingLeadSaneamentoLog');
import JurContract = require('./JurContract');
import JurContractDocument = require('./JurContractDocument');
import JurContractSignatory = require('./JurContractSignatory');
import JurContractAddendum = require('./JurContractAddendum');
import JurExternalLawyer = require('./JurExternalLawyer');
import JurLegalCase = require('./JurLegalCase');
import JurLegalCaseEvent = require('./JurLegalCaseEvent');
import JurLegalCaseDeadline = require('./JurLegalCaseDeadline');
import JurLegalCaseProvision = require('./JurLegalCaseProvision');
import JurLegalAlert = require('./JurLegalAlert');
import JurProxy = require('./JurProxy');
import JurIntellectualProperty = require('./JurIntellectualProperty');
import JurIpContractLink = require('./JurIpContractLink');
import JurLgpdProcessingActivity = require('./JurLgpdProcessingActivity');
import JurLgpdDataSubjectRequest = require('./JurLgpdDataSubjectRequest');
import JurLgpdIncident = require('./JurLgpdIncident');
import JurCorporateAct = require('./JurCorporateAct');
import JurContractApproval = require('./JurContractApproval');
import AccountingChartOfAccount = require('./AccountingChartOfAccount');
import AccountingEntry = require('./AccountingEntry');
import AccountingEntryItem = require('./AccountingEntryItem');
import TreasuryBankAccount = require('./TreasuryBankAccount');
import TreasuryFinancialOperation = require('./TreasuryFinancialOperation');
import BudgetLine = require('./BudgetLine');
import HrJobPosition = require('./HrJobPosition');
import HrEmployeeContract = require('./HrEmployeeContract');
import HrAdmissionProcess = require('./HrAdmissionProcess');
import HrTerminationProcess = require('./HrTerminationProcess');
import HrEmployeeDocument = require('./HrEmployeeDocument');
import HrVacationAccrualPeriod = require('./HrVacationAccrualPeriod');
import HrVacationSchedule = require('./HrVacationSchedule');
import HrEmployeeJobHistory = require('./HrEmployeeJobHistory');
import HrAbsence = require('./HrAbsence');
import HrBenefitType = require('./HrBenefitType');
import HrEmployeeBenefit = require('./HrEmployeeBenefit');
import HrTrainingCourse = require('./HrTrainingCourse');
import HrJobPositionTraining = require('./HrJobPositionTraining');
import HrEmployeeTraining = require('./HrEmployeeTraining');
import HrTimeImportBatch = require('./HrTimeImportBatch');
import HrTimeImportItem = require('./HrTimeImportItem');

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

// Directorate ↔ Department (hierarquia do organograma, F-6 de 2026-08-11).
// `directorate_id` é NULL-ável de propósito: SST é transversal, "reporta
// tipicamente à Diretoria/RH, varia por porte de empresa" — forçar NOT NULL
// obrigaria o banco a afirmar uma subordinação que a empresa não definiu.
Directorate.hasMany(Department, { foreignKey: 'directorate_id', as: 'departments' });
Department.belongsTo(Directorate, { foreignKey: 'directorate_id', as: 'directorate' });

// Directorate ↔ Employee (diretor responsável; NULL = cargo vago)
Directorate.belongsTo(Employee, { foreignKey: 'manager_id', as: 'manager' });
Employee.hasMany(Directorate, { foreignKey: 'manager_id', as: 'managed_directorates' });

// ---- Módulo Diretoria — Governança (Planejamento Estratégico, Atas, Riscos) ----
Directorate.hasMany(StrategicPlanning, { foreignKey: 'directorate_id', as: 'strategic_plannings' });
StrategicPlanning.belongsTo(Directorate, { foreignKey: 'directorate_id', as: 'directorate' });
Department.hasMany(StrategicPlanning, { foreignKey: 'department_id', as: 'strategic_plannings' });
StrategicPlanning.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Employee.hasMany(StrategicPlanning, { foreignKey: 'responsible_id', as: 'strategic_plannings_responsible' });
StrategicPlanning.belongsTo(Employee, { foreignKey: 'responsible_id', as: 'responsible' });
User.hasMany(StrategicPlanning, { foreignKey: 'created_by', as: 'strategic_plannings_created' });
StrategicPlanning.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(MeetingMinute, { foreignKey: 'created_by', as: 'meeting_minutes_created' });
MeetingMinute.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Employee.hasMany(BusinessRisk, { foreignKey: 'responsible_id', as: 'business_risks_responsible' });
BusinessRisk.belongsTo(Employee, { foreignKey: 'responsible_id', as: 'responsible' });
User.hasMany(BusinessRisk, { foreignKey: 'created_by', as: 'business_risks_created' });
BusinessRisk.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// AccessProfile ↔ Department (n:1 — Compras tem perfil de analista E de
// gerente). Substitui o casamento por NOME digitado à mão, que já havia
// derivado em 2 dos 21 perfis (F-7).
Department.hasMany(AccessProfile, { foreignKey: 'department_id', as: 'access_profiles' });
AccessProfile.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

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

// Purchase ↔ PurchaseOrderApproval (G11 — alçada de aprovação por origem/valor)
Purchase.hasMany(PurchaseOrderApproval, { foreignKey: 'purchase_id', as: 'approvals' });
PurchaseOrderApproval.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
User.hasMany(PurchaseOrderApproval, { foreignKey: 'approver_user_id', as: 'purchase_approvals' });
PurchaseOrderApproval.belongsTo(User, { foreignKey: 'approver_user_id', as: 'approver' });

// Purchase ↔ PurchaseRequisition (Bloco 2, UC-39 — leitura simples para o
// Recebimento identificar pedidos originados de amostra de engenharia via
// `requisition.origin`, sem depender do texto livre em `notes`)
PurchaseRequisition.hasMany(Purchase, { foreignKey: 'requisition_id', as: 'purchase_orders' });
Purchase.belongsTo(PurchaseRequisition, { foreignKey: 'requisition_id', as: 'requisition' });

// Purchase requisitions
User.hasMany(PurchaseRequisition, { foreignKey: 'requester_id', as: 'purchase_requisitions' });
PurchaseRequisition.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

User.hasMany(PurchaseRequisition, { foreignKey: 'approved_by', as: 'approved_purchase_requisitions' });
PurchaseRequisition.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

Department.hasMany(PurchaseRequisition, { foreignKey: 'department_id', as: 'purchase_requisitions' });
PurchaseRequisition.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

ProductionOrder.hasMany(PurchaseRequisition, { foreignKey: 'production_order_id', as: 'purchase_requisitions' });
PurchaseRequisition.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

// Purchase requisitions ↔ EngineeringProject (Bloco 2, UC-39 — vinculo opcional da amostra ao projeto de P&D)
EngineeringProject.hasMany(PurchaseRequisition, { foreignKey: 'engineering_project_id', as: 'purchase_requisitions' });
PurchaseRequisition.belongsTo(EngineeringProject, { foreignKey: 'engineering_project_id', as: 'engineeringProject' });

PurchaseRequisition.hasMany(PurchaseRequisitionItem, { foreignKey: 'requisition_id', as: 'items' });
PurchaseRequisitionItem.belongsTo(PurchaseRequisition, { foreignKey: 'requisition_id', as: 'requisition' });

Item.hasMany(PurchaseRequisitionItem, { foreignKey: 'item_id', as: 'purchase_requisition_items' });
PurchaseRequisitionItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

Supplier.hasMany(PurchaseRequisitionItem, { foreignKey: 'suggested_supplier_id', as: 'purchase_requisition_items' });
PurchaseRequisitionItem.belongsTo(Supplier, { foreignKey: 'suggested_supplier_id', as: 'suggestedSupplier' });

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

// Item ↔ SaleItem (Fase 4.3 expand-contract)
Item.hasMany(SaleItem, { foreignKey: 'item_id', as: 'sale_items' });
SaleItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Sale ↔ SaleInvoice (histórico multi-NF-e por pedido, 2026-08-06 —
// `docs/governance/TODO.md`; ver JSDoc de `models/SaleInvoice.ts`)
Sale.hasMany(SaleInvoice, { foreignKey: 'sale_id', as: 'invoices' });
SaleInvoice.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// ---- SaleLotShipment (D-L/D-M, migration 20260810-000039) ----
// O rastro de expedição por LOTE. Todos os atributos são snake_case e iguais
// ao nome da coluna (o model não usa `field:`), então `foreignKey` abaixo é o
// nome do ATRIBUTO — não cria atributo-fantasma.
Sale.hasMany(SaleLotShipment, { foreignKey: 'sale_id', as: 'lot_shipments' });
SaleLotShipment.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// A emissão dona da saída: é por ela que o cancelamento da NF-e devolve a
// quantidade DAQUELA nota (faturamento parcial), não a do pedido inteiro.
SaleInvoice.hasMany(SaleLotShipment, { foreignKey: 'sale_invoice_id', as: 'lot_shipments' });
SaleLotShipment.belongsTo(SaleInvoice, { foreignKey: 'sale_invoice_id', as: 'saleInvoice' });

// O lote de onde a mercadoria saiu — o vínculo que responde "para qual
// cliente foi o lote X" num recall, e o destino da devolução (D-M).
LotControl.hasMany(SaleLotShipment, { foreignKey: 'lot_control_id', as: 'sale_shipments' });
SaleLotShipment.belongsTo(LotControl, { foreignKey: 'lot_control_id', as: 'lotControl' });

Product.hasMany(SaleLotShipment, { foreignKey: 'product_id', as: 'sale_lot_shipments' });
SaleLotShipment.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(SaleLotShipment, { foreignKey: 'user_id', as: 'sale_lot_shipments' });
SaleLotShipment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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

// AccountPayable/AccountReceivable ↔ FinancialPaymentEvent (FIND-ERP-001,
// GRUPO B: log append-only de baixas, cada evento com operation_id único —
// `account_id` referencia AccountPayable OU AccountReceivable dependendo de
// `account_type`, sem FK direta pois é polimórfico).
User.hasMany(FinancialPaymentEvent, { foreignKey: 'created_by', as: 'financial_payment_events' });
FinancialPaymentEvent.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

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

// User ↔ InventoryCount (created by / approved by / assigned to)
User.hasMany(InventoryCount, { foreignKey: 'created_by', as: 'created_inventory_counts' });
InventoryCount.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
User.hasMany(InventoryCount, { foreignKey: 'approved_by', as: 'approved_inventory_counts' });
InventoryCount.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });
// assigned_to (nullable = pool): funcionário responsável pela contagem, ver
// migration 20260806-000001-add-assigned-to-inventory-counts.cjs.
User.hasMany(InventoryCount, { foreignKey: 'assigned_to', as: 'assigned_inventory_counts' });
InventoryCount.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo' });

// User ↔ InventoryCountItem (counted by)
User.hasMany(InventoryCountItem, { foreignKey: 'counted_by', as: 'counted_inventory_items' });
InventoryCountItem.belongsTo(User, { foreignKey: 'counted_by', as: 'countedBy' });

// Department ↔ InventoryCount (painel de TV de demandas por departamento,
// migration 20260806-000003; nullable também no histórico legado).
Department.hasMany(InventoryCount, { foreignKey: 'department_id', as: 'inventory_counts' });
InventoryCount.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Product ↔ ProductionOrder
Product.hasMany(ProductionOrder, { foreignKey: 'product_id', as: 'production_orders' });
ProductionOrder.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Item ↔ ProductionOrder (Fase 4.4 expand-contract)
Item.hasMany(ProductionOrder, { foreignKey: 'item_id', as: 'production_orders' });
ProductionOrder.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Employee ↔ ProductionOrder (responsible)
Employee.hasMany(ProductionOrder, { foreignKey: 'responsible_id', as: 'production_orders' });
ProductionOrder.belongsTo(Employee, { foreignKey: 'responsible_id', as: 'responsible' });

// User ↔ ProductionOrder (createdBy)
User.hasMany(ProductionOrder, { foreignKey: 'created_by', as: 'created_production_orders' });
ProductionOrder.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// Sale ↔ ProductionOrder
Sale.hasMany(ProductionOrder, { foreignKey: 'sales_order_id', as: 'production_orders' });
ProductionOrder.belongsTo(Sale, { foreignKey: 'sales_order_id', as: 'salesOrder' });

// Department ↔ ProductionOrder (painel de TV de demandas por departamento,
// migration 20260806-000003; nullable também no histórico legado).
Department.hasMany(ProductionOrder, { foreignKey: 'department_id', as: 'production_orders' });
ProductionOrder.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Product.hasMany(ProductionRoute, { foreignKey: 'product_id', as: 'production_routes' });
ProductionRoute.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Item ↔ ProductionRoute (Fase 4.8 expand-contract)
Item.hasMany(ProductionRoute, { foreignKey: 'item_id', as: 'production_routes' });
ProductionRoute.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

ProductionRoute.hasMany(ProductionRouteStep, { foreignKey: 'production_route_id', as: 'steps' });
ProductionRouteStep.belongsTo(ProductionRoute, { foreignKey: 'production_route_id', as: 'route' });

// WorkCenter (fundacao de capacidade finita) — expand-contract sobre production_route_steps.work_center
WorkCenter.hasMany(WorkCenterShift, { foreignKey: 'work_center_id', as: 'shifts', onDelete: 'CASCADE' });
WorkCenterShift.belongsTo(WorkCenter, { foreignKey: 'work_center_id', as: 'workCenter', onDelete: 'CASCADE' });

WorkCenter.hasMany(ProductionRouteStep, { foreignKey: 'work_center_id', as: 'route_steps' });
ProductionRouteStep.belongsTo(WorkCenter, { foreignKey: 'work_center_id', as: 'workCenter' });

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

// Item ↔ LotControl (Fase 4.6 expand-contract)
Item.hasMany(LotControl, { foreignKey: 'item_id', as: 'lot_controls' });
LotControl.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

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

// Item ↔ SerialNumber (Fase 4.7 expand-contract)
Item.hasMany(SerialNumber, { foreignKey: 'item_id', as: 'serial_numbers' });
SerialNumber.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

ProductionOrder.hasMany(ProductionLotConsumption, { foreignKey: 'production_order_id', as: 'lot_consumptions' });
ProductionLotConsumption.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

LotControl.hasMany(ProductionLotConsumption, { foreignKey: 'lot_control_id', as: 'production_consumptions' });
ProductionLotConsumption.belongsTo(LotControl, { foreignKey: 'lot_control_id', as: 'lotControl' });

Product.hasMany(ProductionLotConsumption, { foreignKey: 'product_id', as: 'production_lot_consumptions' });
ProductionLotConsumption.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(ProductionLotConsumption, { foreignKey: 'user_id', as: 'production_lot_consumptions' });
ProductionLotConsumption.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Item ↔ ProductionLotConsumption (Fase 4.5 expand-contract)
Item.hasMany(ProductionLotConsumption, { foreignKey: 'item_id', as: 'production_lot_consumptions' });
ProductionLotConsumption.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Reserva de estoque (G3, 2026-08-09) — fonte da verdade da reserva.
// `products.reserved_quantity` e apenas o cache derivado desta relacao.
// Desde o G9 (2026-08-10) a reserva tem DOIS donos possiveis, exatamente um
// por linha: ordem de producao OU venda (confirmacao de pedido reserva; a
// baixa so ocorre na autorizacao da NF-e).
ProductionOrder.hasMany(ProductionOrderReservation, { foreignKey: 'production_order_id', as: 'material_reservations' });
ProductionOrderReservation.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

Sale.hasMany(ProductionOrderReservation, { foreignKey: 'sale_id', as: 'stock_reservations' });
ProductionOrderReservation.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

Product.hasMany(ProductionOrderReservation, { foreignKey: 'product_id', as: 'production_reservations' });
ProductionOrderReservation.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(ProductionOrderReservation, { foreignKey: 'created_by', as: 'created_production_reservations' });
ProductionOrderReservation.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// Product cost ledger (F07)
Product.hasMany(ProductCostLedger, { foreignKey: 'product_id', as: 'cost_ledgers' });
ProductCostLedger.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(ProductCostLedger, { foreignKey: 'created_by', as: 'created_cost_ledgers' });
ProductCostLedger.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// Purchase receipt (NF de entrada recebida contra pedido de compra)
Purchase.hasMany(PurchaseReceipt, { foreignKey: 'purchase_id', as: 'receipts' });
PurchaseReceipt.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
User.hasMany(PurchaseReceipt, { foreignKey: 'received_by', as: 'received_purchase_receipts' });
PurchaseReceipt.belongsTo(User, { foreignKey: 'received_by', as: 'receivedByUser' });

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

// Item ↔ Supplier (catálogo N:N via ItemSupplier)
ItemSupplier.belongsTo(Item, { foreignKey: 'item_id', as: 'item', onDelete: 'CASCADE' });
ItemSupplier.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'RESTRICT' });
Item.hasMany(ItemSupplier, { foreignKey: 'item_id', as: 'fornecedores' });
Supplier.hasMany(ItemSupplier, { foreignKey: 'supplier_id', as: 'itens_fornecidos' });

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

// ---- QualityInspection (G7, migration 20260810-000032) ----
// Registro que faltava: o model era carregado direto do arquivo por
// `SequelizeQualityRepository` (bastava para `sequelize.define` conhecer a
// tabela), mas SEM associação alguma — nenhuma consulta do módulo podia usar
// `include`. As FKs abaixo espelham exatamente as da migration.
//
// ⚠️ Todos os atributos de `QualityInspection` são snake_case e iguais ao nome
// da coluna (o model não usa `field:`), então passar `lot_id`/`inspector_id`/
// `non_conformity_id` como `foreignKey` é o nome do ATRIBUTO — não repete o
// defeito de atributo-fantasma corrigido em `access_profile_id` logo abaixo.

// LotControl ↔ QualityInspection (toda inspeção é sobre um lote — ISO 9001 8.6)
LotControl.hasMany(QualityInspection, { foreignKey: 'lot_id', as: 'inspections' });
QualityInspection.belongsTo(LotControl, { foreignKey: 'lot_id', as: 'lot' });

// User ↔ QualityInspection (inspetor — SEMPRE do JWT, nunca do body)
User.hasMany(QualityInspection, { foreignKey: 'inspector_id', as: 'quality_inspections' });
QualityInspection.belongsTo(User, { foreignKey: 'inspector_id', as: 'inspector' });

// NonConformity ↔ QualityInspection (RNC aberta quando `verdict = 'rejected'`,
// ISO 9001 8.7; NULL nos demais vereditos)
NonConformity.hasMany(QualityInspection, { foreignKey: 'non_conformity_id', as: 'quality_inspections' });
QualityInspection.belongsTo(NonConformity, { foreignKey: 'non_conformity_id', as: 'nonConformity' });

// LotControl.release_inspection_id / released_by — a rastreabilidade de QUEM
// autorizou a saída da quarentena (ISO 9001 8.6). NULL = lote nunca liberado
// OU liberação legada anterior ao G7 (é o NULL que denuncia, numa auditoria,
// a liberação sem evidência). `released_by` pode diferir de `inspector_id`:
// inspecionar e liberar são atos distintos.
QualityInspection.hasMany(LotControl, { foreignKey: 'release_inspection_id', as: 'released_lots' });
LotControl.belongsTo(QualityInspection, { foreignKey: 'release_inspection_id', as: 'releaseInspection' });

User.hasMany(LotControl, { foreignKey: 'released_by', as: 'released_lot_controls' });
LotControl.belongsTo(User, { foreignKey: 'released_by', as: 'releasedBy' });

// ---- MasterProductionPlan / MasterProductionPlanLine (G17, migration 20260810-000037) ----
// A camada de Plano Mestre (MPS) entre a carteira de pedidos e a OP. As
// associações abaixo espelham exatamente as FKs da migration. Todos os
// atributos são snake_case e iguais ao nome da coluna (os models não usam
// `field:`), então `foreignKey` é o nome do ATRIBUTO.
MasterProductionPlan.hasMany(MasterProductionPlanLine, { foreignKey: 'plan_id', as: 'lines', onDelete: 'CASCADE' });
MasterProductionPlanLine.belongsTo(MasterProductionPlan, { foreignKey: 'plan_id', as: 'plan' });

Product.hasMany(MasterProductionPlanLine, { foreignKey: 'product_id', as: 'master_plan_lines' });
MasterProductionPlanLine.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// O rastro de origem da OP: da ordem se chega à linha, ao plano, ao planejador
// e à demanda que a justificou. É o vínculo que não existia antes do G17.
ProductionOrder.hasMany(MasterProductionPlanLine, { foreignKey: 'production_order_id', as: 'master_plan_lines' });
MasterProductionPlanLine.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

// Rastreabilidade de quem planejou / firmou / liberou / cancelou — sempre do JWT.
User.hasMany(MasterProductionPlan, { foreignKey: 'planner_id', as: 'master_production_plans' });
MasterProductionPlan.belongsTo(User, { foreignKey: 'planner_id', as: 'planner' });
MasterProductionPlan.belongsTo(User, { foreignKey: 'firmed_by', as: 'firmedBy' });
MasterProductionPlan.belongsTo(User, { foreignKey: 'released_by', as: 'releasedBy' });
MasterProductionPlan.belongsTo(User, { foreignKey: 'canceled_by', as: 'canceledBy' });
MasterProductionPlanLine.belongsTo(User, { foreignKey: 'decided_by', as: 'decidedBy' });

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

// Item ↔ BillOfMaterialItem (Fase 4.9 expand-contract)
Item.hasMany(BillOfMaterialItem, { foreignKey: 'item_id', as: 'bill_of_material_items' });
BillOfMaterialItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// BillOfMaterialItem self-reference (parent item)
BillOfMaterialItem.belongsTo(BillOfMaterialItem, { foreignKey: 'parent_item_id', as: 'parentItem' });
BillOfMaterialItem.hasMany(BillOfMaterialItem, { foreignKey: 'parent_item_id', as: 'subItems' });

// Alternative product in BOM
BillOfMaterialItem.belongsTo(Product, { foreignKey: 'alternative_product_id', as: 'alternativeProduct' });

// ============================================
// RELACIONAMENTOS - ENGENHARIA & TESTES ACÚSTICOS
// ============================================

// EngineeringProject associations
Product.hasMany(EngineeringProject, { foreignKey: 'product_id', as: 'engineering_projects' });
EngineeringProject.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(EngineeringProject, { foreignKey: 'project_manager_id', as: 'managed_engineering_projects' });
EngineeringProject.belongsTo(User, { foreignKey: 'project_manager_id', as: 'projectManager' });

// ProductDrawing associations
Product.hasMany(ProductDrawing, { foreignKey: 'product_id', as: 'drawings' });
ProductDrawing.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(ProductDrawing, { foreignKey: 'approved_by', as: 'approved_product_drawings' });
ProductDrawing.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// AcousticTestResult associations
Product.hasMany(AcousticTestResult, { foreignKey: 'product_id', as: 'acoustic_test_results' });
AcousticTestResult.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

ProductionOrder.hasMany(AcousticTestResult, { foreignKey: 'production_order_id', as: 'acoustic_test_results' });
AcousticTestResult.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

User.hasMany(AcousticTestResult, { foreignKey: 'tester_id', as: 'acoustic_tests_performed' });
AcousticTestResult.belongsTo(User, { foreignKey: 'tester_id', as: 'tester' });

NonConformity.hasMany(AcousticTestResult, { foreignKey: 'non_conformity_id', as: 'acoustic_test_results' });
AcousticTestResult.belongsTo(NonConformity, { foreignKey: 'non_conformity_id', as: 'nonConformity' });

// ============================================
// RELACIONAMENTOS - PERFIS DE ACESSO CONFIGURÁVEIS (Bloco 1.1)
// ============================================

// ⚠️ `foreignKey` aqui é o nome do ATRIBUTO do model, não o da coluna.
// `User` e `AccessProfilePermission` declaram o atributo `accessProfileId` com
// `field: 'access_profile_id'`. Até 2026-08-10 estas 4 associações passavam
// `'access_profile_id'`, e o Sequelize, não encontrando atributo com esse
// nome, CRIAVA um segundo atributo homônimo apontando para a mesma coluna —
// com `allowNull: true` (o default de associação), ao lado do `accessProfileId`
// declarado `allowNull: false`. Banco e model sempre concordaram; o problema
// era o atributo-fantasma, que aparecia duplicado no JSON das respostas
// (`access_profile_id` E `accessProfileId`) e desalinhava a guarda de drift
// de schema. Achado S-1b (commit `92cf555`), documentado na migration
// `20260810-000033-fix-nullable-columns-round-3.cjs` §`access_profile_permissions`.
// Nenhum consumidor lia o nome antigo (verificado em server/, client/, mobile/
// e tv/ — todos usam `accessProfileId`; `req.body.access_profile_id` é campo de
// PAYLOAD e não é afetado, e o `group: ['access_profile_id']` de
// `SequelizeAccessProfilesRepository` é nome de COLUNA em SQL cru, idem).

// AccessProfile ↔ AccessProfilePermission
AccessProfile.hasMany(AccessProfilePermission, { foreignKey: 'accessProfileId', as: 'permissions', onDelete: 'CASCADE' });
AccessProfilePermission.belongsTo(AccessProfile, { foreignKey: 'accessProfileId', as: 'accessProfile', onDelete: 'CASCADE' });

// AccessProfile ↔ User (null = sem perfil = bloqueio total, UC-35-Exceção)
AccessProfile.hasMany(User, { foreignKey: 'accessProfileId', as: 'users' });
User.belongsTo(AccessProfile, { foreignKey: 'accessProfileId', as: 'accessProfile' });

// ============================================
// RELACIONAMENTOS - MULTIPLOS DEPOSITOS (Bloco 4, UC-42)
// ============================================

// Warehouse ↔ ProductWarehouseStock
Warehouse.hasMany(ProductWarehouseStock, { foreignKey: 'warehouse_id', as: 'stocks', onDelete: 'RESTRICT' });
ProductWarehouseStock.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse', onDelete: 'RESTRICT' });

// Product ↔ ProductWarehouseStock
Product.hasMany(ProductWarehouseStock, { foreignKey: 'product_id', as: 'warehouseStocks', onDelete: 'CASCADE' });
ProductWarehouseStock.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE' });

// Warehouse ↔ InventoryMovement (NULL = movimento legado sem deposito)
Warehouse.hasMany(InventoryMovement, { foreignKey: 'warehouse_id', as: 'movements' });
InventoryMovement.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// Warehouse ↔ LotControl (NULL = lote legado sem deposito)
Warehouse.hasMany(LotControl, { foreignKey: 'warehouse_id', as: 'lot_controls' });
LotControl.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// WarehouseTransfer associations
Product.hasMany(WarehouseTransfer, { foreignKey: 'product_id', as: 'warehouse_transfers' });
WarehouseTransfer.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Warehouse.hasMany(WarehouseTransfer, { foreignKey: 'from_warehouse_id', as: 'transfers_out' });
WarehouseTransfer.belongsTo(Warehouse, { foreignKey: 'from_warehouse_id', as: 'fromWarehouse' });

Warehouse.hasMany(WarehouseTransfer, { foreignKey: 'to_warehouse_id', as: 'transfers_in' });
WarehouseTransfer.belongsTo(Warehouse, { foreignKey: 'to_warehouse_id', as: 'toWarehouse' });

User.hasMany(WarehouseTransfer, { foreignKey: 'user_id', as: 'requested_warehouse_transfers' });
WarehouseTransfer.belongsTo(User, { foreignKey: 'user_id', as: 'requestedBy' });

User.hasMany(WarehouseTransfer, { foreignKey: 'approved_by', as: 'approved_warehouse_transfers' });
WarehouseTransfer.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

// Warehouse ↔ InventoryCount (NULL = contagem legada anterior ao Bloco 4;
// contagens novas devem sempre informar warehouse_id na camada de use case)
Warehouse.hasMany(InventoryCount, { foreignKey: 'warehouse_id', as: 'inventory_counts' });
InventoryCount.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// ============================================
// RELACIONAMENTOS - COTACAO / RFQ MULTI-FORNECEDOR
// ============================================

// PurchaseRequisition ↔ Rfq (opcional — RFQ pode nascer de requisicao ou avulsa)
PurchaseRequisition.hasMany(Rfq, { foreignKey: 'requisition_id', as: 'rfqs' });
Rfq.belongsTo(PurchaseRequisition, { foreignKey: 'requisition_id', as: 'requisition' });

// User ↔ Rfq (comprador que criou a cotacao)
User.hasMany(Rfq, { foreignKey: 'created_by', as: 'created_rfqs' });
Rfq.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// Rfq ↔ RfqItem
Rfq.hasMany(RfqItem, { foreignKey: 'rfq_id', as: 'items', onDelete: 'CASCADE' });
RfqItem.belongsTo(Rfq, { foreignKey: 'rfq_id', as: 'rfq', onDelete: 'CASCADE' });

// Item ↔ RfqItem
Item.hasMany(RfqItem, { foreignKey: 'item_id', as: 'rfq_items' });
RfqItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// Supplier ↔ RfqItem (vencedor da adjudicacao)
Supplier.hasMany(RfqItem, { foreignKey: 'awarded_supplier_id', as: 'awarded_rfq_items' });
RfqItem.belongsTo(Supplier, { foreignKey: 'awarded_supplier_id', as: 'awardedSupplier' });

// Rfq ↔ RfqSupplier (fornecedores convidados)
Rfq.hasMany(RfqSupplier, { foreignKey: 'rfq_id', as: 'suppliers', onDelete: 'CASCADE' });
RfqSupplier.belongsTo(Rfq, { foreignKey: 'rfq_id', as: 'rfq', onDelete: 'CASCADE' });

Supplier.hasMany(RfqSupplier, { foreignKey: 'supplier_id', as: 'rfq_invitations' });
RfqSupplier.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// RfqItem ↔ RfqQuote (resposta por item x fornecedor)
RfqItem.hasMany(RfqQuote, { foreignKey: 'rfq_item_id', as: 'quotes', onDelete: 'CASCADE' });
RfqQuote.belongsTo(RfqItem, { foreignKey: 'rfq_item_id', as: 'rfqItem', onDelete: 'CASCADE' });

Supplier.hasMany(RfqQuote, { foreignKey: 'supplier_id', as: 'rfq_quotes' });
RfqQuote.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// ============================================
// RELACIONAMENTOS - CENTROS DE CUSTO (Financeiro)
// ============================================

// CostCenter ↔ AccountPayable/AccountReceivable (NULL = "Sem centro de
// custo" nos relatórios; ver migration 20260806-000020-create-cost-centers.cjs)
CostCenter.hasMany(AccountPayable, { foreignKey: 'cost_center_id', as: 'accounts_payable' });
AccountPayable.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

CostCenter.hasMany(AccountReceivable, { foreignKey: 'cost_center_id', as: 'accounts_receivable' });
AccountReceivable.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

// ============================================
// RELACIONAMENTOS - PARADAS DE MAQUINA (DOWNTIME)
// ============================================

// WorkCenter ↔ ProductionDowntime (parada geral do centro ou vinculada a uma OP)
WorkCenter.hasMany(ProductionDowntime, { foreignKey: 'work_center_id', as: 'downtimes' });
ProductionDowntime.belongsTo(WorkCenter, { foreignKey: 'work_center_id', as: 'workCenter' });

// ProductionOrder ↔ ProductionDowntime (opcional — null = parada geral do centro)
ProductionOrder.hasMany(ProductionDowntime, { foreignKey: 'production_order_id', as: 'downtimes' });
ProductionDowntime.belongsTo(ProductionOrder, { foreignKey: 'production_order_id', as: 'productionOrder' });

// User ↔ ProductionDowntime (quem abriu o registro)
User.hasMany(ProductionDowntime, { foreignKey: 'created_by', as: 'created_production_downtimes' });
ProductionDowntime.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// ============================================
// RELACIONAMENTOS - TABELA DE PRECOS POR CLIENTE (gap 1/3 modulo sales)
// ============================================

Client.hasMany(CustomerPriceList, { foreignKey: 'customer_id', as: 'price_lists' });
CustomerPriceList.belongsTo(Client, { foreignKey: 'customer_id', as: 'customer' });

Product.hasMany(CustomerPriceList, { foreignKey: 'product_id', as: 'customer_prices' });
CustomerPriceList.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(CustomerPriceList, { foreignKey: 'created_by', as: 'created_customer_prices' });
CustomerPriceList.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// ============================================
// RELACIONAMENTOS - CONCILIACAO BANCARIA (importacao OFX)
// ============================================

// User ↔ BankStatement (quem fez o upload do .ofx)
User.hasMany(BankStatement, { foreignKey: 'imported_by', as: 'bank_statements' });
BankStatement.belongsTo(User, { foreignKey: 'imported_by', as: 'importedBy' });

// BankStatement ↔ BankStatementEntry
BankStatement.hasMany(BankStatementEntry, { foreignKey: 'statement_id', as: 'entries', onDelete: 'CASCADE' });
BankStatementEntry.belongsTo(BankStatement, { foreignKey: 'statement_id', as: 'statement', onDelete: 'CASCADE' });

// AccountPayable/AccountReceivable ↔ BankStatementEntry (XOR — no maximo um preenchido, ver CHECK da migration)
AccountPayable.hasMany(BankStatementEntry, { foreignKey: 'matched_payable_id', as: 'bank_statement_entries' });
BankStatementEntry.belongsTo(AccountPayable, { foreignKey: 'matched_payable_id', as: 'matchedPayable' });

AccountReceivable.hasMany(BankStatementEntry, { foreignKey: 'matched_receivable_id', as: 'bank_statement_entries' });
BankStatementEntry.belongsTo(AccountReceivable, { foreignKey: 'matched_receivable_id', as: 'matchedReceivable' });

// User ↔ BankStatementEntry (quem confirmou a conciliacao)
User.hasMany(BankStatementEntry, { foreignKey: 'matched_by', as: 'matched_bank_statement_entries' });
BankStatementEntry.belongsTo(User, { foreignKey: 'matched_by', as: 'matchedBy' });

// ============================================
// RELACIONAMENTOS - IMPORTACAO / COMEX (UC-19)
// ============================================

// Supplier ↔ ImportProcess (fornecedor internacional)
Supplier.hasMany(ImportProcess, { foreignKey: 'supplier_id', as: 'import_processes' });
ImportProcess.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// User ↔ ImportProcess (analista de comex que registrou o processo)
User.hasMany(ImportProcess, { foreignKey: 'created_by', as: 'created_import_processes' });
ImportProcess.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

// ImportProcess ↔ ImportProcessItem
ImportProcess.hasMany(ImportProcessItem, { foreignKey: 'import_process_id', as: 'items', onDelete: 'CASCADE' });
ImportProcessItem.belongsTo(ImportProcess, { foreignKey: 'import_process_id', as: 'importProcess', onDelete: 'CASCADE' });

// Item ↔ ImportProcessItem
Item.hasMany(ImportProcessItem, { foreignKey: 'item_id', as: 'import_process_items' });
ImportProcessItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });

// ImportProcess ↔ ImportProcessApproval (G11-COMEX — gate da diretoria em `draft → shipped`)
ImportProcess.hasMany(ImportProcessApproval, { foreignKey: 'import_process_id', as: 'approvals', onDelete: 'CASCADE' });
ImportProcessApproval.belongsTo(ImportProcess, { foreignKey: 'import_process_id', as: 'importProcess', onDelete: 'CASCADE' });
User.hasMany(ImportProcessApproval, { foreignKey: 'approver_user_id', as: 'import_process_approvals' });
ImportProcessApproval.belongsTo(User, { foreignKey: 'approver_user_id', as: 'approver' });

// ============================================
// RELACIONAMENTOS - COBRANCA CNAB 240 (remessa/retorno)
// ============================================

// CostCenter ↔ Department (de-para opcional usado na AP automática de compras)
CostCenter.hasMany(Department, { foreignKey: 'cost_center_id', as: 'departments' });
Department.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

// User ↔ CnabRemittance (quem gerou a remessa)
User.hasMany(CnabRemittance, { foreignKey: 'generated_by', as: 'cnab_remittances' });
CnabRemittance.belongsTo(User, { foreignKey: 'generated_by', as: 'generatedBy' });

// CnabRemittance ↔ CnabRemittanceItem
CnabRemittance.hasMany(CnabRemittanceItem, { foreignKey: 'remittance_id', as: 'items', onDelete: 'CASCADE' });
CnabRemittanceItem.belongsTo(CnabRemittance, { foreignKey: 'remittance_id', as: 'remittance', onDelete: 'CASCADE' });

// AccountReceivable ↔ CnabRemittanceItem
AccountReceivable.hasMany(CnabRemittanceItem, { foreignKey: 'receivable_id', as: 'cnab_remittance_items' });
CnabRemittanceItem.belongsTo(AccountReceivable, { foreignKey: 'receivable_id', as: 'receivable' });

// User ↔ CnabReturnFile (quem processou o retorno)
User.hasMany(CnabReturnFile, { foreignKey: 'processed_by', as: 'cnab_return_files' });
CnabReturnFile.belongsTo(User, { foreignKey: 'processed_by', as: 'processedBy' });

// CnabReturnFile ↔ CnabReturnOccurrence
CnabReturnFile.hasMany(CnabReturnOccurrence, { foreignKey: 'return_file_id', as: 'occurrences', onDelete: 'CASCADE' });
CnabReturnOccurrence.belongsTo(CnabReturnFile, { foreignKey: 'return_file_id', as: 'returnFile', onDelete: 'CASCADE' });

// CnabRemittanceItem ↔ CnabReturnOccurrence (NULL = nosso_numero do retorno não corresponde a nenhuma remessa gerada por este sistema)
CnabRemittanceItem.hasMany(CnabReturnOccurrence, { foreignKey: 'remittance_item_id', as: 'return_occurrences' });
CnabReturnOccurrence.belongsTo(CnabRemittanceItem, { foreignKey: 'remittance_item_id', as: 'remittanceItem' });

// ============================================
// RELACIONAMENTOS — BLOCO 1 SST (Segurança e Saúde do Trabalho, dept. 15)
// ============================================

// EPI (NR-6)
Item.hasOne(SstTipoEpi, { foreignKey: 'item_id', as: 'sst_tipo_epi' });
SstTipoEpi.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
User.hasMany(SstTipoEpi, { foreignKey: 'created_by', as: 'sst_tipos_epi_criados' });
SstTipoEpi.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

Department.hasMany(SstMatrizEpi, { foreignKey: 'department_id', as: 'sst_matriz_epi' });
SstMatrizEpi.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
SstTipoEpi.hasMany(SstMatrizEpi, { foreignKey: 'tipo_epi_id', as: 'matriz' });
SstMatrizEpi.belongsTo(SstTipoEpi, { foreignKey: 'tipo_epi_id', as: 'tipoEpi' });

Employee.hasMany(SstEntregaEpi, { foreignKey: 'employee_id', as: 'sst_entregas_epi' });
SstEntregaEpi.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
SstTipoEpi.hasMany(SstEntregaEpi, { foreignKey: 'tipo_epi_id', as: 'entregas' });
SstEntregaEpi.belongsTo(SstTipoEpi, { foreignKey: 'tipo_epi_id', as: 'tipoEpi' });
User.hasMany(SstEntregaEpi, { foreignKey: 'entregue_por', as: 'sst_entregas_epi_realizadas' });
SstEntregaEpi.belongsTo(User, { foreignKey: 'entregue_por', as: 'entreguePor' });
InventoryMovement.hasOne(SstEntregaEpi, { foreignKey: 'inventory_movement_id', as: 'sst_entrega_epi' });
SstEntregaEpi.belongsTo(InventoryMovement, { foreignKey: 'inventory_movement_id', as: 'inventoryMovement' });

SstEntregaEpi.hasMany(SstDevolucaoEpi, { foreignKey: 'entrega_epi_id', as: 'devolucoes' });
SstDevolucaoEpi.belongsTo(SstEntregaEpi, { foreignKey: 'entrega_epi_id', as: 'entrega' });
User.hasMany(SstDevolucaoEpi, { foreignKey: 'registrado_por', as: 'sst_devolucoes_registradas' });
SstDevolucaoEpi.belongsTo(User, { foreignKey: 'registrado_por', as: 'registradoPor' });

// Ações corretivas (polimórfico — sem FK real de origem)
Employee.hasMany(SstAcaoCorretiva, { foreignKey: 'responsavel_id', as: 'sst_acoes_corretivas' });
SstAcaoCorretiva.belongsTo(Employee, { foreignKey: 'responsavel_id', as: 'responsavel' });
User.hasMany(SstAcaoCorretiva, { foreignKey: 'created_by', as: 'sst_acoes_corretivas_criadas' });
SstAcaoCorretiva.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// ASO/PCMSO (NR-7)
Employee.hasMany(SstAso, { foreignKey: 'employee_id', as: 'sst_asos' });
SstAso.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(SstAso, { foreignKey: 'registrado_por', as: 'sst_asos_registrados' });
SstAso.belongsTo(User, { foreignKey: 'registrado_por', as: 'registradoPor' });
SstAso.hasMany(SstExameComplementar, { foreignKey: 'aso_id', as: 'exames_complementares', onDelete: 'CASCADE' });
SstExameComplementar.belongsTo(SstAso, { foreignKey: 'aso_id', as: 'aso', onDelete: 'CASCADE' });

// Acidente/CAT (Lei 8.213/91)
Employee.hasMany(SstAcidente, { foreignKey: 'employee_id', as: 'sst_acidentes' });
SstAcidente.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(SstAcidente, { foreignKey: 'registrado_por', as: 'sst_acidentes_registrados' });
SstAcidente.belongsTo(User, { foreignKey: 'registrado_por', as: 'registradoPor' });

SstAcidente.hasMany(SstAcidenteTestemunha, { foreignKey: 'acidente_id', as: 'testemunhas', onDelete: 'CASCADE' });
SstAcidenteTestemunha.belongsTo(SstAcidente, { foreignKey: 'acidente_id', as: 'acidente', onDelete: 'CASCADE' });
Employee.hasMany(SstAcidenteTestemunha, { foreignKey: 'employee_id', as: 'sst_testemunhos' });
SstAcidenteTestemunha.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

SstAcidente.hasOne(SstInvestigacaoAcidente, { foreignKey: 'acidente_id', as: 'investigacao' });
SstInvestigacaoAcidente.belongsTo(SstAcidente, { foreignKey: 'acidente_id', as: 'acidente' });
User.hasMany(SstInvestigacaoAcidente, { foreignKey: 'created_by', as: 'sst_investigacoes_criadas' });
SstInvestigacaoAcidente.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

SstAcidente.hasMany(SstAcidenteComplemento, { foreignKey: 'acidente_id', as: 'complementos' });
SstAcidenteComplemento.belongsTo(SstAcidente, { foreignKey: 'acidente_id', as: 'acidente' });
User.hasMany(SstAcidenteComplemento, { foreignKey: 'registrado_por', as: 'sst_acidente_complementos_registrados' });
SstAcidenteComplemento.belongsTo(User, { foreignKey: 'registrado_por', as: 'registradoPor' });

SstAcidente.hasMany(SstCat, { foreignKey: 'acidente_id', as: 'cats' });
SstCat.belongsTo(SstAcidente, { foreignKey: 'acidente_id', as: 'acidente' });
User.hasMany(SstCat, { foreignKey: 'emitente_id', as: 'sst_cats_emitidas' });
SstCat.belongsTo(User, { foreignKey: 'emitente_id', as: 'emitente' });

// ---- Cluster CIPA (NR-5, CF/88) — BLOCO 1 SST, migration 20260806-000138 ----
SstMandatoCipa.hasMany(SstMembroCipa, { foreignKey: 'mandato_id', as: 'membros' });
SstMembroCipa.belongsTo(SstMandatoCipa, { foreignKey: 'mandato_id', as: 'mandato' });
Employee.hasMany(SstMembroCipa, { foreignKey: 'employee_id', as: 'sst_membros_cipa' });
SstMembroCipa.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
SstTreinamento.hasMany(SstMembroCipa, { foreignKey: 'treinamento_cipa_id', as: 'membros_cipa_posse' });
SstMembroCipa.belongsTo(SstTreinamento, { foreignKey: 'treinamento_cipa_id', as: 'treinamentoCipa' });

SstMandatoCipa.hasOne(SstProcessoEleitoralCipa, { foreignKey: 'mandato_id', as: 'processoEleitoral' });
SstProcessoEleitoralCipa.belongsTo(SstMandatoCipa, { foreignKey: 'mandato_id', as: 'mandato' });

SstProcessoEleitoralCipa.hasMany(SstCandidatoCipa, { foreignKey: 'processo_eleitoral_id', as: 'candidatos', onDelete: 'CASCADE' });
SstCandidatoCipa.belongsTo(SstProcessoEleitoralCipa, { foreignKey: 'processo_eleitoral_id', as: 'processoEleitoral', onDelete: 'CASCADE' });
Employee.hasMany(SstCandidatoCipa, { foreignKey: 'employee_id', as: 'sst_candidaturas_cipa' });
SstCandidatoCipa.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

SstMandatoCipa.hasMany(SstReuniaoCipa, { foreignKey: 'mandato_id', as: 'reunioes' });
SstReuniaoCipa.belongsTo(SstMandatoCipa, { foreignKey: 'mandato_id', as: 'mandato' });
User.hasMany(SstReuniaoCipa, { foreignKey: 'created_by', as: 'sst_reunioes_cipa_criadas' });
SstReuniaoCipa.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

SstReuniaoCipa.hasMany(SstReuniaoCipaPresente, { foreignKey: 'reuniao_id', as: 'presentes', onDelete: 'CASCADE' });
SstReuniaoCipaPresente.belongsTo(SstReuniaoCipa, { foreignKey: 'reuniao_id', as: 'reuniao', onDelete: 'CASCADE' });
SstMembroCipa.hasMany(SstReuniaoCipaPresente, { foreignKey: 'membro_cipa_id', as: 'presencas_reuniao' });
SstReuniaoCipaPresente.belongsTo(SstMembroCipa, { foreignKey: 'membro_cipa_id', as: 'membro' });

// ---- Cluster PGR/GRO + GES (NR-1) — migration 20260806-000139 ----
SstGes.hasMany(SstGesFuncionario, { foreignKey: 'ges_id', as: 'funcionarios' });
SstGesFuncionario.belongsTo(SstGes, { foreignKey: 'ges_id', as: 'ges' });
Employee.hasMany(SstGesFuncionario, { foreignKey: 'employee_id', as: 'sst_ges_vinculos' });
SstGesFuncionario.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

SstGes.hasMany(SstPlanoExames, { foreignKey: 'ges_id', as: 'planosExames', onDelete: 'SET NULL' });
SstPlanoExames.belongsTo(SstGes, { foreignKey: 'ges_id', as: 'ges', onDelete: 'SET NULL' });

Department.hasMany(SstRiscoOcupacional, { foreignKey: 'department_id', as: 'sst_riscos_ocupacionais' });
SstRiscoOcupacional.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
SstGes.hasMany(SstRiscoOcupacional, { foreignKey: 'ges_id', as: 'riscos', onDelete: 'SET NULL' });
SstRiscoOcupacional.belongsTo(SstGes, { foreignKey: 'ges_id', as: 'ges', onDelete: 'SET NULL' });
User.hasMany(SstRiscoOcupacional, { foreignKey: 'created_by', as: 'sst_riscos_criados' });
SstRiscoOcupacional.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

SstRiscoOcupacional.hasMany(SstRiscoEpi, { foreignKey: 'risco_id', as: 'riscoEpis', onDelete: 'CASCADE' });
SstRiscoEpi.belongsTo(SstRiscoOcupacional, { foreignKey: 'risco_id', as: 'risco', onDelete: 'CASCADE' });
SstTipoEpi.hasMany(SstRiscoEpi, { foreignKey: 'tipo_epi_id', as: 'riscosVinculados' });
SstRiscoEpi.belongsTo(SstTipoEpi, { foreignKey: 'tipo_epi_id', as: 'tipoEpi' });

SstRiscoOcupacional.hasMany(SstRiscoExame, { foreignKey: 'risco_id', as: 'riscoExames', onDelete: 'CASCADE' });
SstRiscoExame.belongsTo(SstRiscoOcupacional, { foreignKey: 'risco_id', as: 'risco', onDelete: 'CASCADE' });

// ---- Cluster Treinamentos (NR-1 e específicas) — migration 20260806-000140 ----
Employee.hasMany(SstTreinamento, { foreignKey: 'employee_id', as: 'sst_treinamentos' });
SstTreinamento.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(SstTreinamento, { foreignKey: 'created_by', as: 'sst_treinamentos_criados' });
SstTreinamento.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// ---- Cluster Rotina Preventiva (DDS, Inspeções, PT, Brigada) — migration 20260806-000141 ----
Department.hasMany(SstInspecaoSeguranca, { foreignKey: 'department_id', as: 'sst_inspecoes_seguranca' });
SstInspecaoSeguranca.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
User.hasMany(SstInspecaoSeguranca, { foreignKey: 'inspetor_id', as: 'sst_inspecoes_realizadas' });
SstInspecaoSeguranca.belongsTo(User, { foreignKey: 'inspetor_id', as: 'inspetor' });

SstInspecaoSeguranca.hasMany(SstInspecaoItem, { foreignKey: 'inspecao_id', as: 'itens', onDelete: 'CASCADE' });
SstInspecaoItem.belongsTo(SstInspecaoSeguranca, { foreignKey: 'inspecao_id', as: 'inspecao', onDelete: 'CASCADE' });
SstAcaoCorretiva.hasOne(SstInspecaoItem, { foreignKey: 'acao_corretiva_id', as: 'itemInspecao', onDelete: 'SET NULL' });
SstInspecaoItem.belongsTo(SstAcaoCorretiva, { foreignKey: 'acao_corretiva_id', as: 'acaoCorretiva', onDelete: 'SET NULL' });

Department.hasMany(SstPermissaoTrabalho, { foreignKey: 'department_id', as: 'sst_permissoes_trabalho' });
SstPermissaoTrabalho.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
User.hasMany(SstPermissaoTrabalho, { foreignKey: 'autorizante_id', as: 'sst_pts_autorizadas' });
SstPermissaoTrabalho.belongsTo(User, { foreignKey: 'autorizante_id', as: 'autorizante' });

SstPermissaoTrabalho.hasMany(SstPtExecutante, { foreignKey: 'permissao_trabalho_id', as: 'executantes', onDelete: 'CASCADE' });
SstPtExecutante.belongsTo(SstPermissaoTrabalho, { foreignKey: 'permissao_trabalho_id', as: 'permissaoTrabalho', onDelete: 'CASCADE' });
Employee.hasMany(SstPtExecutante, { foreignKey: 'employee_id', as: 'sst_pts_executadas' });
SstPtExecutante.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasOne(SstBrigadista, { foreignKey: 'employee_id', as: 'sst_brigadista' });
SstBrigadista.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Department.hasMany(SstRegistroDds, { foreignKey: 'department_id', as: 'sst_registros_dds' });
SstRegistroDds.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Employee.hasMany(SstRegistroDds, { foreignKey: 'condutor_id', as: 'sst_dds_conduzidos' });
SstRegistroDds.belongsTo(Employee, { foreignKey: 'condutor_id', as: 'condutor' });

SstRegistroDds.hasMany(SstDdsPresenca, { foreignKey: 'registro_dds_id', as: 'presencas', onDelete: 'CASCADE' });
SstDdsPresenca.belongsTo(SstRegistroDds, { foreignKey: 'registro_dds_id', as: 'registroDds', onDelete: 'CASCADE' });
Employee.hasMany(SstDdsPresenca, { foreignKey: 'employee_id', as: 'sst_dds_presencas' });
SstDdsPresenca.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// ---- BLOCO 2 TI (departamento 13) — helpdesk, termos, licenças, acessos, backup ----
ItTicketCategory.hasMany(ItTicket, { foreignKey: 'category_id', as: 'tickets' });
ItTicket.belongsTo(ItTicketCategory, { foreignKey: 'category_id', as: 'category' });
User.hasMany(ItTicket, { foreignKey: 'requester_id', as: 'it_tickets_solicitados' });
ItTicket.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });
User.hasMany(ItTicket, { foreignKey: 'assigned_to', as: 'it_tickets_atribuidos' });
ItTicket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedToUser' });
Employee.hasMany(ItTicket, { foreignKey: 'opened_on_behalf_of', as: 'it_tickets_em_nome' });
ItTicket.belongsTo(Employee, { foreignKey: 'opened_on_behalf_of', as: 'onBehalfOfEmployee' });
Asset.hasMany(ItTicket, { foreignKey: 'asset_id', as: 'it_tickets' });
ItTicket.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
MaintenanceOrder.hasMany(ItTicket, { foreignKey: 'maintenance_order_id', as: 'it_tickets' });
ItTicket.belongsTo(MaintenanceOrder, { foreignKey: 'maintenance_order_id', as: 'maintenanceOrder' });
ItAccessRequest.hasMany(ItTicket, { foreignKey: 'access_request_id', as: 'tickets' });
ItTicket.belongsTo(ItAccessRequest, { foreignKey: 'access_request_id', as: 'accessRequest' });

ItTicket.hasMany(ItTicketComment, { foreignKey: 'ticket_id', as: 'comments', onDelete: 'CASCADE' });
ItTicketComment.belongsTo(ItTicket, { foreignKey: 'ticket_id', as: 'ticket', onDelete: 'CASCADE' });
User.hasMany(ItTicketComment, { foreignKey: 'author_id', as: 'it_ticket_comments' });
ItTicketComment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

ItTicket.hasMany(ItTicketPriorityHistory, { foreignKey: 'ticket_id', as: 'priorityHistory', onDelete: 'CASCADE' });
ItTicketPriorityHistory.belongsTo(ItTicket, { foreignKey: 'ticket_id', as: 'ticket', onDelete: 'CASCADE' });
User.hasMany(ItTicketPriorityHistory, { foreignKey: 'changed_by', as: 'it_ticket_priority_changes' });
ItTicketPriorityHistory.belongsTo(User, { foreignKey: 'changed_by', as: 'changedByUser' });

Asset.hasMany(ItResponsibilityTerm, { foreignKey: 'asset_id', as: 'it_responsibility_terms' });
ItResponsibilityTerm.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Employee.hasMany(ItResponsibilityTerm, { foreignKey: 'employee_id', as: 'it_responsibility_terms' });
ItResponsibilityTerm.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(ItResponsibilityTerm, { foreignKey: 'delivered_by', as: 'it_terms_entregues' });
ItResponsibilityTerm.belongsTo(User, { foreignKey: 'delivered_by', as: 'deliveredByUser' });
User.hasMany(ItResponsibilityTerm, { foreignKey: 'received_by', as: 'it_terms_recebidos' });
ItResponsibilityTerm.belongsTo(User, { foreignKey: 'received_by', as: 'receivedByUser' });
ItTicket.hasMany(ItResponsibilityTerm, { foreignKey: 'related_ticket_id', as: 'relatedTerms' });
ItResponsibilityTerm.belongsTo(ItTicket, { foreignKey: 'related_ticket_id', as: 'relatedTicket' });
MaintenanceOrder.hasMany(ItResponsibilityTerm, { foreignKey: 'related_maintenance_order_id', as: 'relatedTerms' });
ItResponsibilityTerm.belongsTo(MaintenanceOrder, { foreignKey: 'related_maintenance_order_id', as: 'relatedMaintenanceOrder' });

Asset.hasOne(ItSoftwareLicenseDetail, { foreignKey: 'asset_id', as: 'licenseDetail' });
ItSoftwareLicenseDetail.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
ItSoftwareLicenseDetail.hasMany(ItLicenseSeat, { foreignKey: 'license_detail_id', as: 'seatAllocations' });
ItLicenseSeat.belongsTo(ItSoftwareLicenseDetail, { foreignKey: 'license_detail_id', as: 'licenseDetail' });
Employee.hasMany(ItLicenseSeat, { foreignKey: 'employee_id', as: 'it_license_seats' });
ItLicenseSeat.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(ItAccessRequest, { foreignKey: 'employee_id', as: 'it_access_requests' });
ItAccessRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(ItAccessRequest, { foreignKey: 'requested_by', as: 'it_access_requests_solicitadas' });
ItAccessRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requestedByUser' });
Department.hasMany(ItAccessRequest, { foreignKey: 'department_id', as: 'it_access_requests' });
ItAccessRequest.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
AccessProfile.hasMany(ItAccessRequest, { foreignKey: 'requested_profile_id', as: 'it_access_requests' });
ItAccessRequest.belongsTo(AccessProfile, { foreignKey: 'requested_profile_id', as: 'requestedProfile' });
User.hasMany(ItAccessRequest, { foreignKey: 'approved_by', as: 'it_access_requests_aprovadas' });
ItAccessRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedByUser' });
User.hasMany(ItAccessRequest, { foreignKey: 'executed_by', as: 'it_access_requests_executadas' });
ItAccessRequest.belongsTo(User, { foreignKey: 'executed_by', as: 'executedByUser' });

ItTicket.hasMany(ItBackupLog, { foreignKey: 'generated_ticket_id', as: 'backupLogs' });
ItBackupLog.belongsTo(ItTicket, { foreignKey: 'generated_ticket_id', as: 'generatedTicket' });
User.hasMany(ItBackupLog, { foreignKey: 'verified_by', as: 'it_backup_logs_verificados' });
ItBackupLog.belongsTo(User, { foreignKey: 'verified_by', as: 'verifiedByUser' });

// ============================================
// RELACIONAMENTOS - FACILITIES (departamento 17, FAC) — BLOCO 4 (correção)
// ============================================

// Asset ↔ FacilityVehicleDetail (extensão 1:1, asset_type='vehicle')
Asset.hasOne(FacilityVehicleDetail, { foreignKey: 'asset_id', as: 'vehicleDetail' });
FacilityVehicleDetail.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });

// Asset ↔ FacilityVehicleDocument
Asset.hasMany(FacilityVehicleDocument, { foreignKey: 'asset_id', as: 'vehicleDocuments' });
FacilityVehicleDocument.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
User.hasMany(FacilityVehicleDocument, { foreignKey: 'released_by', as: 'facility_documents_liberados' });
FacilityVehicleDocument.belongsTo(User, { foreignKey: 'released_by', as: 'releasedByUser' });

// Employee ↔ FacilityDriver
Employee.hasOne(FacilityDriver, { foreignKey: 'employee_id', as: 'facilityDriver' });
FacilityDriver.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
User.hasMany(FacilityDriver, { foreignKey: 'authorized_by', as: 'facility_drivers_autorizados' });
FacilityDriver.belongsTo(User, { foreignKey: 'authorized_by', as: 'authorizedByUser' });

// Asset/FacilityDriver ↔ FacilityVehicleTrip (diário de uso)
Asset.hasMany(FacilityVehicleTrip, { foreignKey: 'asset_id', as: 'trips' });
FacilityVehicleTrip.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
FacilityDriver.hasMany(FacilityVehicleTrip, { foreignKey: 'driver_id', as: 'trips' });
FacilityVehicleTrip.belongsTo(FacilityDriver, { foreignKey: 'driver_id', as: 'driver' });
User.hasMany(FacilityVehicleTrip, { foreignKey: 'requested_by', as: 'facility_trips_solicitados' });
FacilityVehicleTrip.belongsTo(User, { foreignKey: 'requested_by', as: 'requestedByUser' });

// Asset ↔ FacilityFuelRecord
Asset.hasMany(FacilityFuelRecord, { foreignKey: 'asset_id', as: 'fuelRecords' });
FacilityFuelRecord.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
FacilityVehicleTrip.hasMany(FacilityFuelRecord, { foreignKey: 'trip_id', as: 'fuelRecords' });
FacilityFuelRecord.belongsTo(FacilityVehicleTrip, { foreignKey: 'trip_id', as: 'trip' });

// Employee ↔ FacilityFuelRecord (driver, texto/legado)
Employee.hasMany(FacilityFuelRecord, { foreignKey: 'driver_id', as: 'facility_fuel_records' });
FacilityFuelRecord.belongsTo(Employee, { foreignKey: 'driver_id', as: 'driver' });

// Asset ↔ FacilityFine
Asset.hasMany(FacilityFine, { foreignKey: 'asset_id', as: 'fines' });
FacilityFine.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
FacilityDriver.hasMany(FacilityFine, { foreignKey: 'identified_driver_id', as: 'fines' });
FacilityFine.belongsTo(FacilityDriver, { foreignKey: 'identified_driver_id', as: 'identifiedDriver' });
AccountPayable.hasOne(FacilityFine, { foreignKey: 'accounts_payable_id', as: 'facilityFine' });
FacilityFine.belongsTo(AccountPayable, { foreignKey: 'accounts_payable_id', as: 'accountsPayable' });

// Department ↔ FacilityArea
Department.hasMany(FacilityArea, { foreignKey: 'department_id', as: 'facility_areas' });
FacilityArea.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// FacilityArea ↔ MaintenanceOrder (chamado predial, D-1)
FacilityArea.hasMany(MaintenanceOrder, { foreignKey: 'facility_area_id', as: 'maintenanceTickets' });
MaintenanceOrder.belongsTo(FacilityArea, { foreignKey: 'facility_area_id', as: 'facilityArea' });

// FacilityArea/Employee ↔ FacilityCleaningSchedule (plano)
FacilityArea.hasMany(FacilityCleaningSchedule, { foreignKey: 'facility_area_id', as: 'cleaningSchedules' });
FacilityCleaningSchedule.belongsTo(FacilityArea, { foreignKey: 'facility_area_id', as: 'facilityArea' });
Employee.hasMany(FacilityCleaningSchedule, { foreignKey: 'responsible_employee_id', as: 'facility_cleaning_schedules_responsavel' });
FacilityCleaningSchedule.belongsTo(Employee, { foreignKey: 'responsible_employee_id', as: 'responsibleEmployee' });

// FacilityCleaningSchedule ↔ FacilityCleaningExecution
FacilityCleaningSchedule.hasMany(FacilityCleaningExecution, { foreignKey: 'plan_id', as: 'executions' });
FacilityCleaningExecution.belongsTo(FacilityCleaningSchedule, { foreignKey: 'plan_id', as: 'plan' });
Employee.hasMany(FacilityCleaningExecution, { foreignKey: 'executed_by', as: 'facility_cleaning_executions' });
FacilityCleaningExecution.belongsTo(Employee, { foreignKey: 'executed_by', as: 'executedByEmployee' });

// FacilityVisitor ↔ FacilityVisit
FacilityVisitor.hasMany(FacilityVisit, { foreignKey: 'visitor_id', as: 'visits' });
FacilityVisit.belongsTo(FacilityVisitor, { foreignKey: 'visitor_id', as: 'visitor' });
Employee.hasMany(FacilityVisit, { foreignKey: 'host_employee_id', as: 'facility_visits_hospedadas' });
FacilityVisit.belongsTo(Employee, { foreignKey: 'host_employee_id', as: 'hostEmployee' });

// FacilityCorrespondence ↔ Employee/Department
Employee.hasMany(FacilityCorrespondence, { foreignKey: 'recipient_employee_id', as: 'facility_correspondence' });
FacilityCorrespondence.belongsTo(Employee, { foreignKey: 'recipient_employee_id', as: 'recipientEmployee' });
Department.hasMany(FacilityCorrespondence, { foreignKey: 'recipient_department_id', as: 'facility_correspondence' });
FacilityCorrespondence.belongsTo(Department, { foreignKey: 'recipient_department_id', as: 'recipientDepartment' });

// FacilityResourceReservation ↔ FacilityArea/Asset/Employee
FacilityArea.hasMany(FacilityResourceReservation, { foreignKey: 'facility_area_id', as: 'reservations' });
FacilityResourceReservation.belongsTo(FacilityArea, { foreignKey: 'facility_area_id', as: 'facilityArea' });
Asset.hasMany(FacilityResourceReservation, { foreignKey: 'asset_id', as: 'reservations' });
FacilityResourceReservation.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Employee.hasMany(FacilityResourceReservation, { foreignKey: 'reserved_by', as: 'facility_reservations' });
FacilityResourceReservation.belongsTo(Employee, { foreignKey: 'reserved_by', as: 'reservedByEmployee' });

// ============================================
// RELACIONAMENTOS - MARKETING (departamento 14, MKT)
// ============================================

// MarketingCampaign ↔ MarketingLead
MarketingCampaign.hasMany(MarketingLead, { foreignKey: 'campaign_id', as: 'leads' });
MarketingLead.belongsTo(MarketingCampaign, { foreignKey: 'campaign_id', as: 'campaign' });

// Client ↔ MarketingLead (conversão de lead em cliente real)
Client.hasMany(MarketingLead, { foreignKey: 'converted_to_customer_id', as: 'marketing_leads' });
MarketingLead.belongsTo(Client, { foreignKey: 'converted_to_customer_id', as: 'convertedCustomer' });

// Item ↔ MarketingMaterial
Item.hasMany(MarketingMaterial, { foreignKey: 'product_id', as: 'marketing_materials' });
MarketingMaterial.belongsTo(Item, { foreignKey: 'product_id', as: 'product' });

// Item ↔ MarketingMaterial (stock_item_id, BLOCO 5 MKT correção, RF-MKT-038)
Item.hasMany(MarketingMaterial, { foreignKey: 'stock_item_id', as: 'marketing_materials_as_stock_item' });
MarketingMaterial.belongsTo(Item, { foreignKey: 'stock_item_id', as: 'stockItem' });

// User ↔ MarketingMaterial (approved_by, RF-MKT-039)
User.hasMany(MarketingMaterial, { foreignKey: 'approved_by', as: 'marketing_materials_approved' });
MarketingMaterial.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedByUser' });

// ---- BLOCO 5 MKT (correção) — handoff, evento/feira, orçamento ----

// User ↔ MarketingLead (sales_owner_user_id, RF-MKT-011, UC-64)
User.hasMany(MarketingLead, { foreignKey: 'sales_owner_user_id', as: 'marketing_leads_owned' });
MarketingLead.belongsTo(User, { foreignKey: 'sales_owner_user_id', as: 'salesOwner' });

// User ↔ MarketingCampaign (budget_approved_by, RF-MKT-030/031)
User.hasMany(MarketingCampaign, { foreignKey: 'budget_approved_by', as: 'marketing_campaigns_approved' });
MarketingCampaign.belongsTo(User, { foreignKey: 'budget_approved_by', as: 'budgetApprovedByUser' });

// MarketingCampaign ↔ MarketingEvent (campanha guarda-chuva opcional, RF-MKT-020)
MarketingCampaign.hasMany(MarketingEvent, { foreignKey: 'campaign_id', as: 'events' });
MarketingEvent.belongsTo(MarketingCampaign, { foreignKey: 'campaign_id', as: 'campaign' });

// MarketingEvent ↔ MarketingLead (captação em campo, RF-MKT-022/023/024)
MarketingEvent.hasMany(MarketingLead, { foreignKey: 'event_id', as: 'leads' });
MarketingLead.belongsTo(MarketingEvent, { foreignKey: 'event_id', as: 'event' });

// MarketingEvent ↔ MarketingEventChecklistItem (RF-MKT-021)
MarketingEvent.hasMany(MarketingEventChecklistItem, { foreignKey: 'event_id', as: 'checklist' });
MarketingEventChecklistItem.belongsTo(MarketingEvent, { foreignKey: 'event_id', as: 'event' });

// User ↔ MarketingEventChecklistItem (responsible_user_id)
User.hasMany(MarketingEventChecklistItem, { foreignKey: 'responsible_user_id', as: 'marketing_event_checklist_items' });
MarketingEventChecklistItem.belongsTo(User, { foreignKey: 'responsible_user_id', as: 'responsibleUser' });

// MarketingLead ↔ MarketingLeadSaneamentoLog (auditoria de rebaixamento, §2/§3.2)
MarketingLead.hasMany(MarketingLeadSaneamentoLog, { foreignKey: 'lead_id', as: 'saneamento_log' });
MarketingLeadSaneamentoLog.belongsTo(MarketingLead, { foreignKey: 'lead_id', as: 'lead' });

// ============================================
// RELACIONAMENTOS - JURÍDICO (departamento 16, JUR) — BLOCO 3
// ============================================
// Substitui o módulo enxuto (LegalContract*/LegalIntellectualProperty,
// migration 20260807-000220) — ver plano de substituição em
// `docs/business/BLOCO_3_JUR_AUDITORIA.md` §6 e a migration de transição
// `20260807-000280-migrate-legal-lean-to-jur.cjs`.

// JurContract ↔ JurContractDocument/JurContractSignatory/JurContractAddendum
JurContract.hasMany(JurContractDocument, { foreignKey: 'contract_id', as: 'documents' });
JurContractDocument.belongsTo(JurContract, { foreignKey: 'contract_id', as: 'contract' });
JurContract.hasMany(JurContractSignatory, { foreignKey: 'contract_id', as: 'signatories' });
JurContractSignatory.belongsTo(JurContract, { foreignKey: 'contract_id', as: 'contract' });
JurContract.hasMany(JurContractAddendum, { foreignKey: 'contract_id', as: 'addendums' });
JurContractAddendum.belongsTo(JurContract, { foreignKey: 'contract_id', as: 'contract' });

// JurExternalLawyer ↔ JurLegalCase/JurProxy
JurExternalLawyer.hasMany(JurLegalCase, { foreignKey: 'external_lawyer_id', as: 'legal_cases' });
JurLegalCase.belongsTo(JurExternalLawyer, { foreignKey: 'external_lawyer_id', as: 'externalLawyer' });
JurExternalLawyer.hasMany(JurProxy, { foreignKey: 'external_lawyer_id', as: 'proxies' });
JurProxy.belongsTo(JurExternalLawyer, { foreignKey: 'external_lawyer_id', as: 'externalLawyer' });

// JurLegalCase ↔ JurLegalCaseEvent/JurLegalCaseDeadline/JurLegalCaseProvision
JurLegalCase.hasMany(JurLegalCaseEvent, { foreignKey: 'legal_case_id', as: 'events' });
JurLegalCaseEvent.belongsTo(JurLegalCase, { foreignKey: 'legal_case_id', as: 'legalCase' });
JurLegalCase.hasMany(JurLegalCaseDeadline, { foreignKey: 'legal_case_id', as: 'deadlines' });
JurLegalCaseDeadline.belongsTo(JurLegalCase, { foreignKey: 'legal_case_id', as: 'legalCase' });
JurLegalCase.hasMany(JurLegalCaseProvision, { foreignKey: 'legal_case_id', as: 'provisions' });
JurLegalCaseProvision.belongsTo(JurLegalCase, { foreignKey: 'legal_case_id', as: 'legalCase' });

// JurProxy (auto-relacionamento — renovação referencia a procuração anterior)
JurProxy.belongsTo(JurProxy, { foreignKey: 'superseded_proxy_id', as: 'supersededProxy' });

// JurContract ↔ JurContractApproval (RF-JUR-003, alçada de aprovação por valor)
JurContract.hasMany(JurContractApproval, { foreignKey: 'contract_id', as: 'approvals' });
JurContractApproval.belongsTo(JurContract, { foreignKey: 'contract_id', as: 'contract' });

// JurIntellectualProperty ↔ JurContract (N:N via JurIpContractLink)
JurIntellectualProperty.hasMany(JurIpContractLink, { foreignKey: 'ip_id', as: 'contractLinks' });
JurIpContractLink.belongsTo(JurIntellectualProperty, { foreignKey: 'ip_id', as: 'ipAsset' });
JurContract.hasMany(JurIpContractLink, { foreignKey: 'contract_id', as: 'ipLinks' });
JurIpContractLink.belongsTo(JurContract, { foreignKey: 'contract_id', as: 'contract' });

// ============================================
// RELACIONAMENTOS - CONTABILIDADE (subárea CONT do Financeiro)
// ============================================

// AccountingChartOfAccount (auto-relacionamento — hierarquia do Plano de Contas)
AccountingChartOfAccount.hasMany(AccountingChartOfAccount, { foreignKey: 'parent_id', as: 'children' });
AccountingChartOfAccount.belongsTo(AccountingChartOfAccount, { foreignKey: 'parent_id', as: 'parent' });

// AccountingEntry ↔ AccountingEntryItem
AccountingEntry.hasMany(AccountingEntryItem, { foreignKey: 'entry_id', as: 'items' });
AccountingEntryItem.belongsTo(AccountingEntry, { foreignKey: 'entry_id', as: 'entry' });

// AccountingEntryItem ↔ AccountingChartOfAccount
AccountingChartOfAccount.hasMany(AccountingEntryItem, { foreignKey: 'account_id', as: 'entry_items' });
AccountingEntryItem.belongsTo(AccountingChartOfAccount, { foreignKey: 'account_id', as: 'account' });

// AccountingEntryItem ↔ CostCenter (opcional)
CostCenter.hasMany(AccountingEntryItem, { foreignKey: 'cost_center_id', as: 'accounting_entry_items' });
AccountingEntryItem.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

// AccountingEntry ↔ User (autor / aprovador)
User.hasMany(AccountingEntry, { foreignKey: 'created_by', as: 'accounting_entries_created' });
AccountingEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(AccountingEntry, { foreignKey: 'approved_by', as: 'accounting_entries_approved' });
AccountingEntry.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// AccountingEntry (auto-relacionamento — estorno aponta para o lançamento original)
AccountingEntry.belongsTo(AccountingEntry, { foreignKey: 'reversal_of_id', as: 'reversalOf' });

// CostCenter ↔ BudgetLine (Controladoria — orçamento por centro de custo)
CostCenter.hasMany(BudgetLine, { foreignKey: 'cost_center_id', as: 'budget_lines' });
BudgetLine.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });
AccountingEntry.hasOne(AccountingEntry, { foreignKey: 'reversal_of_id', as: 'reversalEntry' });

// ---- BLOCO 6 RH — Admissão, Contrato de Experiência, Demissão, Férias (P0) ----
// Employee ↔ HrJobPosition (RF-RH-025, opcional — Employee.job_position_id já criado via migration 20260808-000011)
Employee.belongsTo(HrJobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
HrJobPosition.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Employee.hasMany(HrEmployeeContract, { foreignKey: 'employee_id', as: 'hrContracts' });
HrEmployeeContract.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(HrAdmissionProcess, { foreignKey: 'employee_id', as: 'hrAdmissionProcesses' });
HrAdmissionProcess.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HrAdmissionProcess.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
HrAdmissionProcess.belongsTo(HrJobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
HrAdmissionProcess.belongsTo(HrEmployeeContract, { foreignKey: 'contract_id', as: 'contract' });
HrAdmissionProcess.belongsTo(HrEmployeeJobHistory, { foreignKey: 'job_history_id', as: 'jobHistory' });

Employee.hasMany(HrTerminationProcess, { foreignKey: 'employee_id', as: 'hrTerminationProcesses' });
HrTerminationProcess.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(HrEmployeeDocument, { foreignKey: 'employee_id', as: 'hrDocuments' });
HrEmployeeDocument.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(HrVacationAccrualPeriod, { foreignKey: 'employee_id', as: 'hrVacationAccrualPeriods' });
HrVacationAccrualPeriod.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HrVacationAccrualPeriod.belongsTo(HrVacationAccrualPeriod, { foreignKey: 'zeroed_from_period_id', as: 'zeroedFromPeriod' });

HrVacationAccrualPeriod.hasMany(HrVacationSchedule, { foreignKey: 'accrual_period_id', as: 'schedules' });
HrVacationSchedule.belongsTo(HrVacationAccrualPeriod, { foreignKey: 'accrual_period_id', as: 'accrualPeriod' });
HrVacationSchedule.belongsTo(HrVacationSchedule, { foreignKey: 'superseded_by_id', as: 'supersededBy' });

Employee.hasMany(HrEmployeeJobHistory, { foreignKey: 'employee_id', as: 'hrJobHistory' });
HrEmployeeJobHistory.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HrEmployeeJobHistory.belongsTo(HrJobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
HrEmployeeJobHistory.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// ---- BLOCO 6 RH — Afastamentos, Benefícios, Treinamentos (Grupos 7/8/9) ----
Employee.hasMany(HrAbsence, { foreignKey: 'employee_id', as: 'hrAbsences' });
HrAbsence.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HrAbsence.belongsTo(HrEmployeeDocument, { foreignKey: 'document_id', as: 'document' });
HrAbsence.belongsTo(HrVacationAccrualPeriod, { foreignKey: 'accrual_period_impact_id', as: 'accrualPeriodImpact' });

HrBenefitType.hasMany(HrEmployeeBenefit, { foreignKey: 'benefit_type_id', as: 'employeeBenefits' });
HrEmployeeBenefit.belongsTo(HrBenefitType, { foreignKey: 'benefit_type_id', as: 'benefitType' });
Employee.hasMany(HrEmployeeBenefit, { foreignKey: 'employee_id', as: 'hrBenefits' });
HrEmployeeBenefit.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

HrJobPosition.hasMany(HrJobPositionTraining, { foreignKey: 'job_position_id', as: 'requiredTrainings' });
HrJobPositionTraining.belongsTo(HrJobPosition, { foreignKey: 'job_position_id', as: 'jobPosition' });
HrTrainingCourse.hasMany(HrJobPositionTraining, { foreignKey: 'training_course_id', as: 'jobPositionRequirements' });
HrJobPositionTraining.belongsTo(HrTrainingCourse, { foreignKey: 'training_course_id', as: 'trainingCourse' });

Employee.hasMany(HrEmployeeTraining, { foreignKey: 'employee_id', as: 'hrTrainings' });
HrEmployeeTraining.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
HrTrainingCourse.hasMany(HrEmployeeTraining, { foreignKey: 'training_course_id', as: 'employeeTrainings' });
HrEmployeeTraining.belongsTo(HrTrainingCourse, { foreignKey: 'training_course_id', as: 'trainingCourse' });

// ---- BLOCO 6 RH — Frequência/Ponto (Grupo 10, importação AEJ) ----
User.hasMany(HrTimeImportBatch, { foreignKey: 'imported_by', as: 'hrTimeImportBatchesImported' });
HrTimeImportBatch.belongsTo(User, { foreignKey: 'imported_by', as: 'importedBy' });
User.hasMany(HrTimeImportBatch, { foreignKey: 'confirmed_by', as: 'hrTimeImportBatchesConfirmed' });
HrTimeImportBatch.belongsTo(User, { foreignKey: 'confirmed_by', as: 'confirmedBy' });

HrTimeImportBatch.hasMany(HrTimeImportItem, { foreignKey: 'batch_id', as: 'items' });
HrTimeImportItem.belongsTo(HrTimeImportBatch, { foreignKey: 'batch_id', as: 'batch' });
Employee.hasMany(HrTimeImportItem, { foreignKey: 'employee_id', as: 'hrTimeImportItems' });
HrTimeImportItem.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

export {
  sequelize,
  User, Client, Category, Product, Supplier,
  Purchase, PurchaseItem, PurchaseOrderApproval, Sale, SaleItem,
  PurchaseRequisition, PurchaseRequisitionItem,
  AccountReceivable, AccountPayable,
  InventoryMovement, InventoryCount, InventoryCountItem, ProductCostLedger, Department, Directorate, Employee,
  ProductionOrder, ProductionRoute, ProductionRouteStep, ProductionOrderTracking,
  LotControl, SerialNumber, ProductionLotConsumption, ProductionOrderReservation,
  ServiceOrder, Asset,
  NonConformity, QualityInspection, MaintenanceOrder, AuditLog, WebhookEvent, CompanyFiscalConfig, PurchaseReceipt, FinancialPaymentEvent,
  MasterProductionPlan, MasterProductionPlanLine,
  BillOfMaterial, BillOfMaterialItem,
  Item, ItemEstrutura, ItemCategoria, ItemDetalheComercial, ItemEspecificacaoTecnica, MrpOrdemPlanejada,
  ItemSupplier,
  WorkCenter, WorkCenterShift,
  EngineeringProject, ProductDrawing, AcousticTestResult,
  AccessProfile, AccessProfilePermission,
  Warehouse, ProductWarehouseStock, WarehouseTransfer,
  ProductionCostSettings,
  CostCenter,
  Rfq, RfqItem, RfqSupplier, RfqQuote,
  ProductionDowntime,
  CustomerPriceList,
  BankStatement, BankStatementEntry,
  ImportProcess, ImportProcessItem, ImportProcessApproval,
  SaleInvoice,
  SaleLotShipment,
  CompanyBankingConfig,
  CnabRemittance, CnabRemittanceItem, CnabReturnFile, CnabReturnOccurrence,
  SstTipoEpi, SstMatrizEpi, SstEntregaEpi, SstDevolucaoEpi, SstAcaoCorretiva,
  SstPlanoExames, SstAso, SstExameComplementar,
  SstAcidente, SstAcidenteTestemunha, SstInvestigacaoAcidente, SstAcidenteComplemento, SstCat,
  SstEventoEsocial,
  SstMandatoCipa, SstMembroCipa, SstProcessoEleitoralCipa, SstCandidatoCipa, SstReuniaoCipa, SstReuniaoCipaPresente,
  SstGes, SstGesFuncionario, SstRiscoOcupacional, SstRiscoEpi, SstRiscoExame,
  SstMatrizTreinamento, SstTreinamento,
  SstInspecaoSeguranca, SstInspecaoItem, SstPermissaoTrabalho, SstPtExecutante, SstBrigadista, SstRegistroDds, SstDdsPresenca,
  ItTicketCategory, ItTicket, ItTicketComment, ItTicketPriorityHistory,
  ItResponsibilityTerm, ItSoftwareLicenseDetail, ItLicenseSeat, ItAccessRequest, ItBackupLog, TiSettings,
  FacilityVehicleDetail, FacilityVehicleDocument, FacilityDriver, FacilityVehicleTrip,
  FacilityFuelRecord, FacilityFine, FacilityCleaningSchedule, FacilityCleaningExecution, FacilityArea,
  FacilityVisitor, FacilityVisit, FacilityCorrespondence, FacilityResourceReservation,
  MarketingCampaign, MarketingLead, MarketingMaterial,
  MarketingEvent, MarketingEventChecklistItem, MarketingLeadSaneamentoLog,
  JurContract, JurContractDocument, JurContractSignatory, JurContractAddendum,
  JurExternalLawyer, JurLegalCase, JurLegalCaseEvent, JurLegalCaseDeadline,
  JurLegalCaseProvision, JurLegalAlert, JurProxy, JurIntellectualProperty,
  JurIpContractLink, JurLgpdProcessingActivity, JurLgpdDataSubjectRequest, JurLgpdIncident,
  JurCorporateAct, JurContractApproval,
  AccountingChartOfAccount, AccountingEntry, AccountingEntryItem,
  TreasuryBankAccount, TreasuryFinancialOperation,
  BudgetLine,
  HrJobPosition, HrEmployeeContract, HrAdmissionProcess, HrTerminationProcess,
  HrEmployeeDocument, HrVacationAccrualPeriod, HrVacationSchedule, HrEmployeeJobHistory,
  HrAbsence, HrBenefitType, HrEmployeeBenefit,
  HrTrainingCourse, HrJobPositionTraining, HrEmployeeTraining,
  HrTimeImportBatch, HrTimeImportItem,
  StrategicPlanning, MeetingMinute, BusinessRisk
};
