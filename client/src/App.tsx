import { Route, Routes } from 'react-router-dom';

import { ProtectedRoute, RoleRoute } from '@/routes/ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/products/ProductsPage';
import InventoryCountsPage from '@/pages/products/InventoryCountsPage';
import ClientsPage from '@/pages/sales/ClientsPage';
import SalesPage from '@/pages/sales/SalesPage';
import SuppliersPage from '@/pages/purchases/SuppliersPage';
import PurchasesPage from '@/pages/purchases/PurchasesPage';
import BomPage from '@/pages/production/BomPage';
import ProductionOrdersPage from '@/pages/production/ProductionOrdersPage';
import FinancialPage from '@/pages/financial/FinancialPage';
import TraceabilityPage from '@/pages/traceability/TraceabilityPage';
import AuditLogsPage from '@/pages/traceability/AuditLogsPage';
import UsersPage from '@/pages/users/UsersPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />

          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/inventory-counts" element={<InventoryCountsPage />} />

          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/clients" element={<ClientsPage />} />

          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/purchases/suppliers" element={<SuppliersPage />} />

          <Route path="/production" element={<ProductionOrdersPage />} />
          <Route path="/production/bom" element={<BomPage />} />

          <Route element={<RoleRoute roles={['admin', 'financial']} />}>
            <Route path="/financial" element={<FinancialPage />} />
          </Route>

          <Route path="/traceability" element={<TraceabilityPage />} />

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
