import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute, RoleRoute } from '@/routes/ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';

// Paginas internas carregadas sob demanda (code-splitting): reduz o bundle
// inicial, que so precisa do essencial para renderizar o login/dashboard.
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'));
const InventoryCountsPage = lazy(() => import('@/pages/products/InventoryCountsPage'));
const InventoryPage = lazy(() => import('@/pages/logistics/InventoryPage'));
const ReceivingPage = lazy(() => import('@/pages/logistics/ReceivingPage'));
const ClientsPage = lazy(() => import('@/pages/sales/ClientsPage'));
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'));
const SuppliersPage = lazy(() => import('@/pages/purchases/SuppliersPage'));
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'));
const RequisitionsPage = lazy(() => import('@/pages/purchases/RequisitionsPage'));
const BomPage = lazy(() => import('@/pages/production/BomPage'));
const ProductionOrdersPage = lazy(() => import('@/pages/production/ProductionOrdersPage'));
const MrpPage = lazy(() => import('@/pages/production/MrpPage'));
const ShopFloorPage = lazy(() => import('@/pages/production/ShopFloorPage'));
const WorkCentersPage = lazy(() => import('@/pages/production/WorkCentersPage'));
const QualityPage = lazy(() => import('@/pages/quality/QualityPage'));
const LaboratoryPage = lazy(() => import('@/pages/laboratory/LaboratoryPage'));
const EngineeringPage = lazy(() => import('@/pages/engineering/EngineeringPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const AssetsPage = lazy(() => import('@/pages/patrimonio/AssetsPage'));
const FinancialPage = lazy(() => import('@/pages/financial/FinancialPage'));
const TraceabilityPage = lazy(() => import('@/pages/traceability/TraceabilityPage'));
const AuditLogsPage = lazy(() => import('@/pages/traceability/AuditLogsPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
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
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/change-password"
            element={
              <Suspense fallback={<PageFallback />}>
                <ChangePasswordPage />
              </Suspense>
            }
          />

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
            path="/logistics/estoque"
            element={
              <Suspense fallback={<PageFallback />}>
                <InventoryPage />
              </Suspense>
            }
          />
          <Route
            path="/logistics/recebimento"
            element={
              <Suspense fallback={<PageFallback />}>
                <ReceivingPage />
              </Suspense>
            }
          />

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
            path="/purchases/requisitions"
            element={
              <Suspense fallback={<PageFallback />}>
                <RequisitionsPage />
              </Suspense>
            }
          />

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
            path="/production/mrp"
            element={
              <Suspense fallback={<PageFallback />}>
                <MrpPage />
              </Suspense>
            }
          />
          <Route
            path="/production/shop-floor"
            element={
              <Suspense fallback={<PageFallback />}>
                <ShopFloorPage />
              </Suspense>
            }
          />
          <Route
            path="/production/work-centers"
            element={
              <Suspense fallback={<PageFallback />}>
                <WorkCentersPage />
              </Suspense>
            }
          />

          <Route
            path="/quality"
            element={
              <Suspense fallback={<PageFallback />}>
                <QualityPage />
              </Suspense>
            }
          />

          <Route
            path="/laboratory"
            element={
              <Suspense fallback={<PageFallback />}>
                <LaboratoryPage />
              </Suspense>
            }
          />

          <Route
            path="/engineering"
            element={
              <Suspense fallback={<PageFallback />}>
                <EngineeringPage />
              </Suspense>
            }
          />

          <Route
            path="/reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <ReportsPage />
              </Suspense>
            }
          />

          <Route
            path="/patrimonio"
            element={
              <Suspense fallback={<PageFallback />}>
                <AssetsPage />
              </Suspense>
            }
          />

          <Route element={<RoleRoute roles={['admin', 'financial']} />}>
            <Route
              path="/financial"
              element={
                <Suspense fallback={<PageFallback />}>
                  <FinancialPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            path="/traceability"
            element={
              <Suspense fallback={<PageFallback />}>
                <TraceabilityPage />
              </Suspense>
            }
          />

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
