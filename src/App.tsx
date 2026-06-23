import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RequirePermission } from "@/components/admin/PermissionGate";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { LoadingState } from "@/components/ui/LoadingState";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { RedirectHandler } from "@/components/layout/RedirectHandler";
import { useTenant } from "@/hooks/useTenant";

const Home = lazy(() => import("@/pages/Home"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));
const MedicationDetail = lazy(() => import("@/pages/MedicationDetail"));
const PathologyDetail = lazy(() => import("@/pages/PathologyDetail"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const FacilityDetail = lazy(() => import("@/pages/FacilityDetail"));
const Carte = lazy(() => import("@/pages/Carte"));
const OrganizationDetail = lazy(() => import("@/pages/OrganizationDetail"));
const Structures = lazy(() => import("@/pages/Structures"));
const ClaimStructure = lazy(() => import("@/pages/ClaimStructure"));
const Communities = lazy(() => import("@/pages/Communities"));
const CommunityDetail = lazy(() => import("@/pages/CommunityDetail"));
const Forum = lazy(() => import("@/pages/Forum"));
const Messages = lazy(() => import("@/pages/Messages"));
const EquipmentList = lazy(() => import("@/pages/EquipmentList"));
const EquipmentDetail = lazy(() => import("@/pages/EquipmentDetail"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const Evenements = lazy(() => import("@/pages/Evenements"));
const Partners = lazy(() => import("@/pages/Partners"));
const PartnerDetail = lazy(() => import("@/pages/PartnerDetail"));
const Soutenir = lazy(() => import("@/pages/Soutenir"));
const Formations = lazy(() => import("@/pages/Formations"));
const FormationDetail = lazy(() => import("@/pages/FormationDetail"));
const TenantSpace = lazy(() => import("@/pages/TenantSpace"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const CreatePage = lazy(() => import("@/pages/CreatePage"));
const ManagePage = lazy(() => import("@/pages/ManagePage"));
const ProfessionalVerification = lazy(() => import("@/pages/ProfessionalVerification"));
const MyDonations = lazy(() => import("@/pages/MyDonations"));
const ManageFacility = lazy(() => import("@/pages/ManageFacility"));
const AdminShell = lazy(() => import("@/components/admin/AdminShell").then((m) => ({ default: m.AdminShell })));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const Moderation = lazy(() => import("@/pages/admin/Moderation"));
const Directory = lazy(() => import("@/pages/admin/Directory"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const Media = lazy(() => import("@/pages/admin/Media"));
const ContentHub = lazy(() => import("@/pages/admin/ContentHub"));
const ContentList = lazy(() => import("@/pages/admin/ContentList"));
const ContentEditor = lazy(() => import("@/pages/admin/ContentEditor"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const Menus = lazy(() => import("@/pages/admin/Menus"));
const Comments = lazy(() => import("@/pages/admin/Comments"));
const AuditLog = lazy(() => import("@/pages/admin/AuditLog"));
const Revenue = lazy(() => import("@/pages/admin/Revenue"));
const Campaigns = lazy(() => import("@/pages/admin/Campaigns"));
const Appearance = lazy(() => import("@/pages/admin/Appearance"));
const Redirects = lazy(() => import("@/pages/admin/Redirects"));
const Emails = lazy(() => import("@/pages/admin/Emails"));
const Legal = lazy(() => import("@/pages/admin/Legal"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="container-page py-24">
      <LoadingState />
    </div>
  );
}

/** On a partner-space host (`<slug>.werguyaram.org`), `/` lands on that space. */
function HomeOrTenant() {
  const { tenant } = useTenant();
  return tenant ? <Navigate to={`/espace/${tenant.slug}`} replace /> : <Home />;
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
        <Route path="/" element={<HomeOrTenant />} />
        <Route path="/recherche" element={<SearchResults />} />
        <Route path="/medicaments/:slug" element={<MedicationDetail />} />
        <Route path="/pathologies/:slug" element={<PathologyDetail />} />
        <Route path="/articles/:slug" element={<ArticleDetail />} />
        {/*
          Modèle unifié des lieux de santé :
          • `facilities` = TOUT établissement de santé (user-créé, importé, éditorial)
            → /etablissements (annuaire), /etablissements/:slug (fiche), id = slug.
          • `organizations` = pages PARTENAIRE / DONATEUR uniquement
            → /structures/:id (id Firestore), page OrganizationDetail.
          Les anciennes URLs /structures* (santé) sont redirigées vers /etablissements*.
        */}
        <Route path="/etablissements" element={<Structures />} />
        <Route path="/etablissements/revendiquer" element={<ClaimStructure />} />
        <Route path="/etablissements/:slug" element={<FacilityDetail />} />
        <Route path="/carte" element={<Carte />} />
        {/* Legacy redirects (SEO/back-compat). /structures/:id reste OrganizationDetail
            pour les partenaires/donateurs ; il redirige lui-même vers /etablissements/:slug
            si l'id correspond à une structure de santé migrée. */}
        <Route path="/structures" element={<Navigate to="/etablissements" replace />} />
        <Route path="/structures/revendiquer" element={<Navigate to="/etablissements/revendiquer" replace />} />
        <Route path="/structures/:id" element={<OrganizationDetail />} />
        <Route path="/communautes" element={<Communities />} />
        <Route path="/communautes/:slug" element={<CommunityDetail />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/besoins" element={<EquipmentList />} />
        <Route path="/besoins/:id" element={<EquipmentDetail />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/evenements/:id" element={<EventDetail />} />
        <Route path="/partenaires" element={<Partners />} />
        <Route path="/partenaires/:slug" element={<PartnerDetail />} />
        <Route path="/soutenir" element={<Soutenir />} />
        <Route path="/formations" element={<Formations />} />
        <Route path="/formations/:slug" element={<FormationDetail />} />
        <Route path="/espace/:slug" element={<TenantSpace />} />
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
          path="/dashboard/dons"
          element={
            <ProtectedRoute>
              <MyDonations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/verification-pro"
          element={
            <ProtectedRoute>
              <ProfessionalVerification />
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
          path="/dashboard/facilities/:slug"
          element={
            <ProtectedRoute>
              <ManageFacility />
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
          <Route
            path="menus"
            element={
              <RequirePermission permission="menus.manage">
                <Menus />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission permission="settings.update">
                <Settings />
              </RequirePermission>
            }
          />
          <Route
            path="comments"
            element={
              <RequirePermission permission="comments.moderate">
                <Comments />
              </RequirePermission>
            }
          />
          <Route
            path="audit-log"
            element={
              <RequirePermission permission="audit.read">
                <AuditLog />
              </RequirePermission>
            }
          />
          <Route
            path="revenue"
            element={
              <RequirePermission permission="revenue.read">
                <Revenue />
              </RequirePermission>
            }
          />
          <Route
            path="campaigns"
            element={
              <RequirePermission permission="campaigns.manage">
                <Campaigns />
              </RequirePermission>
            }
          />
          <Route
            path="appearance"
            element={
              <RequirePermission permission="appearance.manage">
                <Appearance />
              </RequirePermission>
            }
          />
          <Route
            path="redirects"
            element={
              <RequirePermission permission="redirects.manage">
                <Redirects />
              </RequirePermission>
            }
          />
          <Route
            path="emails"
            element={
              <RequirePermission permission="emails.manage">
                <Emails />
              </RequirePermission>
            }
          />
          <Route
            path="legal"
            element={
              <RequirePermission permission="settings.update">
                <Legal />
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
      <RedirectHandler />
      {bareLayout ? content : <AppShell>{content}</AppShell>}
    </>
  );
}
