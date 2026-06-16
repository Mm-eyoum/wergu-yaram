import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RequirePermission } from "@/components/admin/PermissionGate";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

const Home = lazy(() => import("@/pages/Home"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));
const MedicationDetail = lazy(() => import("@/pages/MedicationDetail"));
const PathologyDetail = lazy(() => import("@/pages/PathologyDetail"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const FacilityDetail = lazy(() => import("@/pages/FacilityDetail"));
const Carte = lazy(() => import("@/pages/Carte"));
const OrganizationDetail = lazy(() => import("@/pages/OrganizationDetail"));
const Communities = lazy(() => import("@/pages/Communities"));
const CommunityDetail = lazy(() => import("@/pages/CommunityDetail"));
const Forum = lazy(() => import("@/pages/Forum"));
const Messages = lazy(() => import("@/pages/Messages"));
const EquipmentList = lazy(() => import("@/pages/EquipmentList"));
const EquipmentDetail = lazy(() => import("@/pages/EquipmentDetail"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const Partners = lazy(() => import("@/pages/Partners"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const CreatePage = lazy(() => import("@/pages/CreatePage"));
const ManagePage = lazy(() => import("@/pages/ManagePage"));
const AdminShell = lazy(() => import("@/components/admin/AdminShell").then((m) => ({ default: m.AdminShell })));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const Moderation = lazy(() => import("@/pages/admin/Moderation"));
const Directory = lazy(() => import("@/pages/admin/Directory"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const Media = lazy(() => import("@/pages/admin/Media"));
const ContentHub = lazy(() => import("@/pages/admin/ContentHub"));
const ContentList = lazy(() => import("@/pages/admin/ContentList"));
const ContentEditor = lazy(() => import("@/pages/admin/ContentEditor"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="container-page py-24">
      <LoadingState />
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  // Auth pages use their own split layout (no global header/footer).
  const isAuthPage = pathname === "/connexion" || pathname === "/inscription";
  // Admin pages render inside their own AdminShell (sidebar + topbar).
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const bareLayout = isAuthPage || isAdminPage;

  const content = (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recherche" element={<SearchResults />} />
        <Route path="/medicaments/:slug" element={<MedicationDetail />} />
        <Route path="/pathologies/:slug" element={<PathologyDetail />} />
        <Route path="/articles/:slug" element={<ArticleDetail />} />
        <Route path="/etablissements/:slug" element={<FacilityDetail />} />
        <Route path="/carte" element={<Carte />} />
        <Route path="/structures/:id" element={<OrganizationDetail />} />
        <Route path="/communautes" element={<Communities />} />
        <Route path="/communautes/:slug" element={<CommunityDetail />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/besoins" element={<EquipmentList />} />
        <Route path="/besoins/:id" element={<EquipmentDetail />} />
        <Route path="/evenements/:id" element={<EventDetail />} />
        <Route path="/partenaires" element={<Partners />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/conditions" element={<Terms />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pages/new"
          element={
            <ProtectedRoute>
              <CreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pages/:id"
          element={
            <ProtectedRoute>
              <ManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole="editor">
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route
            path="content"
            element={
              <RequirePermission permission="content.edit">
                <ContentHub />
              </RequirePermission>
            }
          />
          <Route
            path="content/:type"
            element={
              <RequirePermission permission="content.edit">
                <ContentList />
              </RequirePermission>
            }
          />
          <Route
            path="content/:type/new"
            element={
              <RequirePermission permission="content.edit">
                <ContentEditor />
              </RequirePermission>
            }
          />
          <Route
            path="content/:type/:id/edit"
            element={
              <RequirePermission permission="content.edit">
                <ContentEditor />
              </RequirePermission>
            }
          />
          <Route
            path="media"
            element={
              <RequirePermission permission="media.manage">
                <Media />
              </RequirePermission>
            }
          />
          <Route
            path="moderation"
            element={
              <RequirePermission permission="moderation">
                <Moderation />
              </RequirePermission>
            }
          />
          <Route
            path="directory"
            element={
              <RequirePermission permission="moderation">
                <Directory />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission permission="users.manage">
                <AdminUsers />
              </RequirePermission>
            }
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <>
      <ScrollToTop />
      {bareLayout ? content : <AppShell>{content}</AppShell>}
    </>
  );
}
