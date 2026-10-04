import { Navigate, Route, Routes } from "react-router-dom"
import { GuestOnly, RequireAuth, RequireRole, RequireStoreStaff } from "./auth/guards.jsx"
import { useAuth } from "./auth/AuthContext.jsx"
import { isStoreStaff } from "./auth/roles.js"
import { AppShell } from "./layouts/AppShell.jsx"
import { LoginPage } from "./pages/LoginPage.jsx"
import { OverviewPage } from "./pages/OverviewPage.jsx"
import { ApprovalsPage } from "./pages/store/ApprovalsPage.jsx"
import { CategoriesPage } from "./pages/store/CategoriesPage.jsx"
import { CouponsPage } from "./pages/store/CouponsPage.jsx"
import { CustomersPage } from "./pages/store/CustomersPage.jsx"
import { ExpiryPage } from "./pages/store/ExpiryPage.jsx"
import { InventoryPage } from "./pages/store/InventoryPage.jsx"
import { LocationsPage } from "./pages/store/LocationsPage.jsx"
import { MovementsPage } from "./pages/store/MovementsPage.jsx"
import { OffersPage } from "./pages/store/OffersPage.jsx"
import { OrdersPage } from "./pages/store/OrdersPage.jsx"
import { OrderDetailPage } from "./pages/store/OrderDetailPage.jsx"
import { ProductDetailPage } from "./pages/store/ProductDetailPage.jsx"
import { ProductFormPage } from "./pages/store/ProductFormPage.jsx"
import { ProductsPage } from "./pages/store/ProductsPage.jsx"
import { ReportsPage } from "./pages/store/ReportsPage.jsx"
import { ReviewsPage } from "./pages/store/ReviewsPage.jsx"
import { StoreAuditPage } from "./pages/store/StoreAuditPage.jsx"
import { StoreBillingPage } from "./pages/store/StoreBillingPage.jsx"
import { StoreDevicesPage } from "./pages/store/StoreDevicesPage.jsx"
import { SupplierDetailPage } from "./pages/store/SupplierDetailPage.jsx"
import { SuppliersPage } from "./pages/store/SuppliersPage.jsx"
import { TaxPage } from "./pages/store/TaxPage.jsx"
import { TransactionsPage } from "./pages/store/TransactionsPage.jsx"
import { TransfersPage } from "./pages/store/TransfersPage.jsx"
import { WeightPage } from "./pages/store/WeightPage.jsx"
import { ShiftsPage } from "./pages/store/ShiftsPage.jsx"
import { StaffPage } from "./pages/store/StaffPage.jsx"
import { OrderHistoryPage } from "./pages/store/OrderHistoryPage.jsx"
import { SettingsPage } from "./pages/store/SettingsPage.jsx"
import { BackupPage } from "./pages/store/BackupPage.jsx"
import { AccountPage } from "./pages/AccountPage.jsx"
import { DataToolsPage } from "./pages/superadmin/DataToolsPage.jsx"
import { BillingsPage } from "./pages/superadmin/BillingsPage.jsx"
import { LicensesPage } from "./pages/superadmin/LicensesPage.jsx"
import { PlansPage } from "./pages/superadmin/PlansPage.jsx"
import { StoreDetailPage } from "./pages/superadmin/StoreDetailPage.jsx"
import { StoreFormPage } from "./pages/superadmin/StoreFormPage.jsx"
import { StoresPage } from "./pages/superadmin/StoresPage.jsx"
import { AuditPage } from "./pages/superadmin/AuditPage.jsx"
import { DevicesPage } from "./pages/superadmin/DevicesPage.jsx"

/** Shared paths: pick platform vs store page by role (avoids duplicate-route redirect). */
function AuditRoute() {
  const { user } = useAuth()
  if (user?.role === "superadmin") return <AuditPage />
  if (isStoreStaff(user?.role)) return <StoreAuditPage />
  return <Navigate to="/" replace />
}

function DevicesRoute() {
  const { user } = useAuth()
  if (user?.role === "superadmin") return <DevicesPage />
  if (isStoreStaff(user?.role)) return <StoreDevicesPage />
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />

          <Route element={<RequireRole roles={["superadmin"]} />}>
            <Route path="stores/register" element={<StoreFormPage />} />
            <Route path="stores/:id/edit" element={<StoreFormPage />} />
            <Route path="stores/:id" element={<StoreDetailPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="licenses" element={<LicensesPage />} />
            <Route path="billings" element={<BillingsPage />} />
            <Route path="data" element={<DataToolsPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>

          <Route
            element={
              <RequireRole roles={["superadmin", "store_admin", "manager"]} />
            }
          >
            <Route path="audit" element={<AuditRoute />} />
            <Route path="devices" element={<DevicesRoute />} />
          </Route>

          <Route element={<RequireStoreStaff />}>
            <Route path="shifts" element={<ShiftsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="expiry" element={<ExpiryPage />} />
            <Route path="weight" element={<WeightPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="orders/custom" element={<OrdersPage mode="custom" />} />
            <Route path="orders/history" element={<OrderHistoryPage />} />
            <Route path="orders/cancelled" element={<Navigate to="/orders/history?tab=cancelled" replace />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="orders" element={<OrdersPage mode="all" />} />
            <Route path="refunds" element={<Navigate to="/orders/history?tab=refunds" replace />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="website" element={<Navigate to="/settings?tab=website" replace />} />
            <Route path="tax" element={<TaxPage />} />
            <Route path="billing" element={<StoreBillingPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RequireRole roles={["store_admin"]} />}>
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="backup" element={<BackupPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
