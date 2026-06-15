import { Suspense, lazy } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoadingState } from "@/components/ui/LoadingState";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

const Home = lazy(() => import("@/pages/Home"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));
const MedicationDetail = lazy(() => import("@/pages/MedicationDetail"));
const PathologyDetail = lazy(() => import("@/pages/PathologyDetail"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const FacilityDetail = lazy(() => import("@/pages/FacilityDetail"));
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

  const content = (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recherche" element={<SearchResults />} />
        <Route path="/medicaments/:slug" element={<MedicationDetail />} />
        <Route path="/pathologies/:slug" element={<PathologyDetail />} />
        <Route path="/articles/:slug" element={<ArticleDetail />} />
        <Route path="/etablissements/:slug" element={<FacilityDetail />} />
        <Route path="/communautes" element={<Communities />} />
        <Route path="/communautes/:slug" element={<CommunityDetail />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/besoins" element={<EquipmentList />} />
        <Route path="/besoins/:id" element={<EquipmentDetail />} />
        <Route path="/evenements/:id" element={<EventDetail />} />
        <Route path="/partenaires" element={<Partners />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  return (
    <>
      <ScrollToTop />
      {isAuthPage ? content : <AppShell>{content}</AppShell>}
    </>
  );
}
