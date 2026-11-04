import { Navigate, Route, Routes } from "react-router-dom"
import { GuestOnly, RequireAuth, RequireRole, RequireStoreStaff } from "./auth/guards.jsx"
import { useAuth } from "./auth/AuthContext.jsx"
import { isStoreStaff } from "./auth/roles.js"
import { AppShell } from "./layouts/AppShell.jsx"
import { LoginPage } from "./pages/LoginPage.jsx"
import { OverviewPage } from "./pages/OverviewPage.jsx"
import { ApprovalsPage } from "./pages/store/ApprovalsPage.jsx"
import { CategoriesPage } from "./pages/store/CategoriesPage.jsx"
import { CategoryDetailPage } from "./pages/store/CategoryDetailPage.jsx"
import { CouponsPage } from "./pages/store/CouponsPage.jsx"
import { CustomersPage } from "./pages/store/CustomersPage.jsx"
import { ExpiryPage } from "./pages/store/ExpiryPage.jsx"
import { InventoryPage } from "./pages/store/InventoryPage.jsx"
import { LocationsPage } from "./pages/store/LocationsPage.jsx"
import { MovementsPage } from "./pages/store/MovementsPage.jsx"
import { DiscountsPage } from "./pages/store/OffersPage.jsx"
import { DiscountFormPage } from "./pages/store/DiscountFormPage.jsx"
import { TransferFormPage } from "./pages/store/TransferFormPage.jsx"
import { StockMovementFormPage } from "./pages/store/StockMovementFormPage.jsx"
import { SurchargesPage } from "./pages/store/SurchargesPage.jsx"
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage.jsx"
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage.jsx"
import { OrderDetailPage } from "./pages/store/OrderDetailPage.jsx"
import { ProductDetailPage } from "./pages/store/ProductDetailPage.jsx"
import { ProductFormPage } from "./pages/store/ProductFormPage.jsx"
import { ProductsPage } from "./pages/store/ProductsPage.jsx"
import { ReportingPage } from "./pages/store/ReportingPage.jsx"
import { ReviewsPage } from "./pages/store/ReviewsPage.jsx"
import { StoreAuditPage } from "./pages/store/StoreAuditPage.jsx"
import { StoreBillingPage } from "./pages/store/StoreBillingPage.jsx"
import { StoreDevicesPage } from "./pages/store/StoreDevicesPage.jsx"
import { SupplierDetailPage } from "./pages/store/SupplierDetailPage.jsx"
import { SuppliersPage } from "./pages/store/SuppliersPage.jsx"
import { TransfersPage } from "./pages/store/TransfersPage.jsx"
import { WeightPage } from "./pages/store/WeightPage.jsx"
import { StaffPage } from "./pages/store/StaffPage.jsx"
import { BackupPage } from "./pages/store/BackupPage.jsx"
import { ProfilePage } from "./pages/ProfilePage.jsx"
import { DataToolsPage } from "./pages/superadmin/DataToolsPage.jsx"
import { BillingsPage } from "./pages/superadmin/BillingsPage.jsx"
import { LicensesPage } from "./pages/superadmin/LicensesPage.jsx"
import { PlansPage } from "./pages/superadmin/PlansPage.jsx"
import { StoreDetailPage } from "./pages/superadmin/StoreDetailPage.jsx"
import { StoreFormPage } from "./pages/superadmin/StoreFormPage.jsx"
import { StoresPage } from "./pages/superadmin/StoresPage.jsx"
import { AuditPage } from "./pages/superadmin/AuditPage.jsx"
import { DevicesPage } from "./pages/superadmin/DevicesPage.jsx"
import { OrdersTablePage } from "./pages/store/OrdersTablePage.jsx"
import { TransactionsTablePage } from "./pages/store/TransactionsTablePage.jsx"
import { SessionsPage } from "./pages/store/SessionsPage.jsx"
import { BatchesPage } from "./pages/store/BatchesPage.jsx"
import { CurrencySettingsPage, TaxSettingsPage } from "./pages/store/SettingsSectionPages.jsx"

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

/** Store staff land on Reports (their Overview); Super Admin keeps the platform overview. */
function HomeRoute() {
  const { user } = useAuth()
  if (isStoreStaff(user?.role)) return <Navigate to="/reports" replace />
  return <OverviewPage />
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      {/* Opened from the reset email, signed in or not. */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="account" element={<Navigate to="/profile" replace />} />

          <Route element={<RequireRole roles={["superadmin"]} />}>
            <Route path="stores/register" element={<StoreFormPage />} />
            <Route path="stores/:id/edit" element={<StoreFormPage />} />
            <Route path="stores/:id" element={<StoreDetailPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="licenses" element={<LicensesPage />} />
            <Route path="billings" element={<BillingsPage />} />
            <Route path="data" element={<DataToolsPage />} />
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
            <Route path="staff" element={<StaffPage />} />
            <Route path="reports" element={<ReportingPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories/:id" element={<CategoryDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="movements/new" element={<StockMovementFormPage />} />
            <Route path="expiry" element={<ExpiryPage />} />
            <Route path="weight" element={<WeightPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="orders/custom" element={<Navigate to="/orders?tab=custom" replace />} />
            <Route path="orders/history" element={<Navigate to="/orders" replace />} />
            <Route path="orders/cancelled" element={<Navigate to="/orders?tab=cancelled" replace />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="orders" element={<OrdersTablePage />} />
            <Route path="refunds" element={<Navigate to="/orders?tab=refunded" replace />} />
            <Route path="transactions" element={<TransactionsTablePage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="transfers" element={<TransfersPage />} />
            <Route path="transfers/new" element={<TransferFormPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="shifts" element={<Navigate to="/batches" replace />} />
            <Route path="discounts" element={<DiscountsPage />} />
            <Route path="taxes" element={<Navigate to="/settings/taxes" replace />} />
            <Route path="discounts/new" element={<DiscountFormPage />} />
            <Route path="discounts/:id/edit" element={<DiscountFormPage />} />
            <Route path="offers" element={<Navigate to="/discounts" replace />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="website" element={<Navigate to="/settings?tab=website" replace />} />
            <Route path="tax" element={<Navigate to="/settings/taxes" replace />} />
            <Route path="settings/taxes" element={<TaxSettingsPage />} />
            <Route path="settings/surcharges" element={<SurchargesPage />} />
            <Route path="settings/currency" element={<CurrencySettingsPage />} />
            <Route path="settings/account" element={<Navigate to="/profile" replace />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="settings" element={<Navigate to="/settings/taxes" replace />} />
          </Route>

          <Route element={<RequireRole roles={["store_admin"]} />}>
            <Route path="backup" element={<BackupPage />} />
            <Route path="billing" element={<StoreBillingPage />} />
            <Route path="settings/store" element={<Navigate to="/profile" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
