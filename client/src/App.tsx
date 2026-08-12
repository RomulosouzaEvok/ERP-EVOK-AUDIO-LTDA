import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { ProtectedRoute, RoleRoute, ModuleRoute, AnyModuleRoute } from '@/routes/ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
// Sala de Comando da Diretoria — ocupa `/dashboard`, que era rota órfã
// (auditoria de 2026-08-11). O antigo `DashboardPage` de 4 KPIs foi
// substituído por esta visão de cadeia completa.
const CommandCenterPage = lazy(() => import('@/pages/executive/CommandCenterPage'));
import HomePage from '@/pages/home/HomePage';

// Paginas internas carregadas sob demanda (code-splitting): reduz o bundle
// inicial, que so precisa do essencial para renderizar o login/dashboard.
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'));
const ItemMasterPage = lazy(() => import('@/pages/products/ItemMasterPage'));
const ItemMasterDetailPage = lazy(() => import('@/pages/products/ItemMasterDetailPage'));
const InventoryCountsPage = lazy(() => import('@/pages/products/InventoryCountsPage'));
const InventoryPage = lazy(() => import('@/pages/logistics/InventoryPage'));
const ReceivingPage = lazy(() => import('@/pages/logistics/ReceivingPage'));
const ShippingPage = lazy(() => import('@/pages/logistics/ShippingPage'));
const WarehousesPage = lazy(() => import('@/pages/logistics/WarehousesPage'));
const LogisticsRequisitionsPage = lazy(() => import('@/pages/logistics/LogisticsRequisitionsPage'));
const ClientsPage = lazy(() => import('@/pages/sales/ClientsPage'));
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'));
const SuppliersPage = lazy(() => import('@/pages/purchases/SuppliersPage'));
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'));
const RequisitionsPage = lazy(() => import('@/pages/purchases/RequisitionsPage'));
const RfqPage = lazy(() => import('@/pages/purchases/RfqPage'));
const ComexPage = lazy(() => import('@/pages/purchases/ComexPage'));
const BomPage = lazy(() => import('@/pages/production/BomPage'));
const ProductionOrdersPage = lazy(() => import('@/pages/production/ProductionOrdersPage'));
const MrpPage = lazy(() => import('@/pages/production/MrpPage'));
const MasterProductionPlanPage = lazy(() => import('@/pages/production/MasterProductionPlanPage'));
const ShopFloorPage = lazy(() => import('@/pages/production/ShopFloorPage'));
const WorkCentersPage = lazy(() => import('@/pages/production/WorkCentersPage'));
const ProductionRoutesPage = lazy(() => import('@/pages/production/ProductionRoutesPage'));
const ProductionRequisitionsPage = lazy(() => import('@/pages/production/ProductionRequisitionsPage'));
const QualityPage = lazy(() => import('@/pages/quality/QualityPage'));
const QualityRequisitionsPage = lazy(() => import('@/pages/quality/QualityRequisitionsPage'));
const LaboratoryPage = lazy(() => import('@/pages/laboratory/LaboratoryPage'));
const EngineeringPage = lazy(() => import('@/pages/engineering/EngineeringPage'));
const SstPage = lazy(() => import('@/pages/sst/SstPage'));
const TiPage = lazy(() => import('@/pages/ti/TiPage'));
const MyTicketsPage = lazy(() => import('@/pages/ti/MyTicketsPage'));
const FacilitiesPage = lazy(() => import('@/pages/facilities/FacilitiesPage'));
const FacilityTicketPage = lazy(() => import('@/pages/facilities/FacilityTicketPage'));
const MarketingPage = lazy(() => import('@/pages/marketing/MarketingPage'));
const JuridicoPage = lazy(() => import('@/pages/juridico/JuridicoPage'));
const AccountingPage = lazy(() => import('@/pages/accounting/AccountingPage'));
const TreasuryPage = lazy(() => import('@/pages/treasury/TreasuryPage'));
const BudgetPage = lazy(() => import('@/pages/budget/BudgetPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const AssetsPage = lazy(() => import('@/pages/patrimonio/AssetsPage'));
const MaintenanceRequisitionsPage = lazy(() => import('@/pages/maintenance/MaintenanceRequisitionsPage'));
const MaintenanceOrdersPage = lazy(() =>
  import('@/pages/maintenance/MaintenanceOrdersTab').then((m) => ({ default: m.MaintenanceOrdersTab })),
);
const ServiceOrdersPage = lazy(() =>
  import('@/pages/maintenance/ServiceOrdersTab').then((m) => ({ default: m.ServiceOrdersTab })),
);
const FinancialPage = lazy(() => import('@/pages/financial/FinancialPage'));
const TraceabilityPage = lazy(() => import('@/pages/traceability/TraceabilityPage'));
const AuditLogsPage = lazy(() => import('@/pages/traceability/AuditLogsPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const AccessProfilesPage = lazy(() => import('@/pages/users/AccessProfilesPage'));
const HrPage = lazy(() => import('@/pages/hr/HrPage'));
const FiscalConfigPage = lazy(() => import('@/pages/settings/FiscalConfigPage'));
const IntelligentAuditorPage = lazy(() => import('@/pages/reports/IntelligentAuditorPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          {/* Sala de Comando: mesmo módulo da alçada de aprovação da diretoria.
              Sem esta guarda, qualquer autenticado abria a rota e as 4 queries
              devolviam 403 (V-2, VARREDURA_DUPLA_2026-08-11.md). */}
          <Route element={<ModuleRoute module="diretor" />}>
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CommandCenterPage />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="/change-password"
            element={
              <Suspense fallback={<PageFallback />}>
                <ChangePasswordPage />
              </Suspense>
            }
          />
          {/*
            /hr: nao ha modulo dedicado em access-profiles para RH (ver
            HrPage.tsx) — GET /api/employees e /api/departments exigem so
            sessao autenticada (sem restricao de role), escrita e que exige
            'admin' (checado dentro das abas via hasRole). Por isso a rota
            fica fora de ModuleRoute/RoleRoute, igual /change-password.
          */}
          <Route
            path="/hr"
            element={
              <Suspense fallback={<PageFallback />}>
                <HrPage />
              </Suspense>
            }
          />

          {/*
            /meus-chamados: auto-serviço de Helpdesk de TI (BR-TI-001/
            RNF-TI-02) — qualquer usuário autenticado abre/acompanha os
            PRÓPRIOS chamados, sem exigir o módulo `ti` (mesmo motivo de
            /hr acima ficar fora de ModuleRoute). A gestão completa da fila
            fica em /ti, atrás de ModuleRoute module="ti".
          */}
          <Route
            path="/meus-chamados"
            element={
              <Suspense fallback={<PageFallback />}>
                <MyTicketsPage />
              </Suspense>
            }
          />

          {/*
            /chamado-predial: auto-serviço de abertura de chamado de
            Manutenção Predial (RF-FAC-040, UC-60) — qualquer usuário
            autenticado abre um chamado, sem exigir o módulo `facilities`,
            mesmo precedente de /meus-chamados acima (Bloco 2, TI). A gestão
            completa (triagem/execução) fica em /facilities, atrás de
            ModuleRoute module="facilities".
          */}
          <Route
            path="/chamado-predial"
            element={
              <Suspense fallback={<PageFallback />}>
                <FacilityTicketPage />
              </Suspense>
            }
          />

          <Route element={<ModuleRoute module="produtos" />}>
            <Route
              path="/products"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProductsPage />
                </Suspense>
              }
            />
            <Route
              path="/products/inventory-counts"
              element={
                <Suspense fallback={<PageFallback />}>
                  <InventoryCountsPage />
                </Suspense>
              }
            />
            <Route
              path="/products/items"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ItemMasterPage />
                </Suspense>
              }
            />
            <Route
              path="/products/items/:codigo"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ItemMasterDetailPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="estoque" />}>
            <Route
              path="/logistics/estoque"
              element={
                <Suspense fallback={<PageFallback />}>
                  <InventoryPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="recebimento" />}>
            <Route
              path="/logistics/recebimento"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ReceivingPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="expedicao" />}>
            <Route
              path="/logistics/expedicao"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ShippingPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="estoque" />}>
            <Route
              path="/logistics/warehouses"
              element={
                <Suspense fallback={<PageFallback />}>
                  <WarehousesPage />
                </Suspense>
              }
            />
            <Route
              path="/logistics/requisitions"
              element={
                <Suspense fallback={<PageFallback />}>
                  <LogisticsRequisitionsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="vendas" />}>
            <Route
              path="/sales"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SalesPage />
                </Suspense>
              }
            />
            <Route
              path="/sales/clients"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ClientsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="compras" />}>
            <Route
              path="/purchases"
              element={
                <Suspense fallback={<PageFallback />}>
                  <PurchasesPage />
                </Suspense>
              }
            />
            <Route
              path="/purchases/suppliers"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SuppliersPage />
                </Suspense>
              }
            />
            <Route
              path="/purchases/rfqs"
              element={
                <Suspense fallback={<PageFallback />}>
                  <RfqPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="requisicoes" />}>
            <Route
              path="/purchases/requisitions"
              element={
                <Suspense fallback={<PageFallback />}>
                  <RequisitionsPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="comex" />}>
            <Route
              path="/purchases/comex"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ComexPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="producao" />}>
            <Route
              path="/production"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProductionOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="/production/bom"
              element={
                <Suspense fallback={<PageFallback />}>
                  <BomPage />
                </Suspense>
              }
            />
            <Route
              path="/production/routes"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProductionRoutesPage />
                </Suspense>
              }
            />
            <Route
              path="/production/requisitions"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProductionRequisitionsPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="mrp" />}>
            <Route
              path="/production/mrp"
              element={
                <Suspense fallback={<PageFallback />}>
                  <MrpPage />
                </Suspense>
              }
            />
            {/* MPS (G17): o caminho é de produção, mas o ator é o PCP — mesmo
                módulo de acesso de quem opera o MRP, igual ao backend. */}
            <Route
              path="/production/master-plans"
              element={
                <Suspense fallback={<PageFallback />}>
                  <MasterProductionPlanPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="chao_de_fabrica" />}>
            <Route
              path="/production/shop-floor"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ShopFloorPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<ModuleRoute module="centros_de_trabalho" />}>
            <Route
              path="/production/work-centers"
              element={
                <Suspense fallback={<PageFallback />}>
                  <WorkCentersPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="qualidade" />}>
            <Route
              path="/quality"
              element={
                <Suspense fallback={<PageFallback />}>
                  <QualityPage />
                </Suspense>
              }
            />
            <Route
              path="/quality/requisitions"
              element={
                <Suspense fallback={<PageFallback />}>
                  <QualityRequisitionsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="manutencao" />}>
            <Route
              path="/maintenance"
              element={
                <Suspense fallback={<PageFallback />}>
                  <MaintenanceOrdersPage />
                </Suspense>
              }
            />
            <Route
              path="/maintenance/requisitions"
              element={
                <Suspense fallback={<PageFallback />}>
                  <MaintenanceRequisitionsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="garantia" />}>
            <Route
              path="/service-orders"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ServiceOrdersPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="laboratorio" />}>
            <Route
              path="/laboratory"
              element={
                <Suspense fallback={<PageFallback />}>
                  <LaboratoryPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="engenharia" />}>
            <Route
              path="/engineering"
              element={
                <Suspense fallback={<PageFallback />}>
                  <EngineeringPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="sst" />}>
            <Route
              path="/sst"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SstPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="ti" />}>
            <Route
              path="/ti"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TiPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="facilities" />}>
            <Route
              path="/facilities"
              element={
                <Suspense fallback={<PageFallback />}>
                  <FacilitiesPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="marketing" />}>
            <Route
              path="/marketing"
              element={
                <Suspense fallback={<PageFallback />}>
                  <MarketingPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<AnyModuleRoute modules={['juridico', 'financeiro']} />}>
            <Route
              path="/juridico"
              element={
                <Suspense fallback={<PageFallback />}>
                  <JuridicoPage />
                </Suspense>
              }
            />
          </Route>
          {/* Rota antiga do módulo Jurídico enxuto (removido, BLOCO 3) — redireciona para a nova. */}
          <Route path="/legal" element={<Navigate to="/juridico" replace />} />

          <Route element={<ModuleRoute module="contabilidade" />}>
            <Route
              path="/accounting"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AccountingPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="tesouraria" />}>
            <Route
              path="/treasury"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TreasuryPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="controladoria" />}>
            <Route
              path="/budget"
              element={
                <Suspense fallback={<PageFallback />}>
                  <BudgetPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            element={
              <AnyModuleRoute modules={['relatorios.producao', 'relatorios.compras', 'relatorios.custos', 'relatorios.financeiro']} />
            }
          >
            <Route
              path="/reports"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ReportsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<ModuleRoute module="patrimonio" />}>
            <Route
              path="/patrimonio"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AssetsPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'financial']} />}>
            <Route element={<ModuleRoute module="financeiro" />}>
              <Route
                path="/financial"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <FinancialPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          <Route element={<ModuleRoute module="rastreabilidade" />}>
            <Route
              path="/traceability"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TraceabilityPage />
                </Suspense>
              }
            />
          </Route>

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route
              path="/users"
              element={
                <Suspense fallback={<PageFallback />}>
                  <UsersPage />
                </Suspense>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AuditLogsPage />
                </Suspense>
              }
            />
            <Route
              path="/users/access-profiles"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AccessProfilesPage />
                </Suspense>
              }
            />
            <Route
              path="/settings/fiscal"
              element={
                <Suspense fallback={<PageFallback />}>
                  <FiscalConfigPage />
                </Suspense>
              }
            />
            <Route
              path="/reports/auditor"
              element={
                <Suspense fallback={<PageFallback />}>
                  <IntelligentAuditorPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <Suspense fallback={<PageFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
