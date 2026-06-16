import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthContext, type AuthContextValue } from "@/context/auth";
import type { AppUser, Role } from "@/types/domain";

function makeUser(role: Role): AppUser {
  return {
    uid: "u1",
    email: "u1@example.com",
    displayName: "Test User",
    role,
    status: "active",
  };
}

function makeAuth(partial: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    loading: false,
    configured: true,
    login: async () => {},
    register: async () => {},
    loginWithGoogle: async () => {},
    resetPassword: async () => {},
    logout: async () => {},
    refreshProfile: async () => {},
    ...partial,
  };
}

function renderGuarded(auth: AuthContextValue, requireRole?: Role) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requireRole={requireRole}>
                <div>CONTENU PROTÉGÉ</div>
              </ProtectedRoute>
            }
          />
          <Route path="/connexion" element={<div>PAGE CONNEXION</div>} />
          <Route path="/dashboard" element={<div>TABLEAU DE BORD</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is resolving", () => {
    renderGuarded(makeAuth({ loading: true }));
    expect(screen.getByText(/Vérification de votre session/i)).toBeInTheDocument();
  });

  it("redirects an anonymous user to the login page", () => {
    renderGuarded(makeAuth({ user: null }));
    expect(screen.getByText("PAGE CONNEXION")).toBeInTheDocument();
    expect(screen.queryByText("CONTENU PROTÉGÉ")).not.toBeInTheDocument();
  });

  it("renders the content for an authenticated user without a role requirement", () => {
    renderGuarded(makeAuth({ user: makeUser("patient_public") }));
    expect(screen.getByText("CONTENU PROTÉGÉ")).toBeInTheDocument();
  });

  it("blocks a patient from an admin-only route", () => {
    renderGuarded(makeAuth({ user: makeUser("patient_public") }), "admin");
    expect(screen.getByText("Accès réservé")).toBeInTheDocument();
    expect(screen.queryByText("CONTENU PROTÉGÉ")).not.toBeInTheDocument();
  });

  it("admits an admin to an admin-only route", () => {
    renderGuarded(makeAuth({ user: makeUser("admin") }), "admin");
    expect(screen.getByText("CONTENU PROTÉGÉ")).toBeInTheDocument();
  });

  it("admits a super_admin to an admin-only route (role hierarchy)", () => {
    renderGuarded(makeAuth({ user: makeUser("super_admin") }), "admin");
    expect(screen.getByText("CONTENU PROTÉGÉ")).toBeInTheDocument();
  });

  it("denies an admin on a super_admin-only route", () => {
    renderGuarded(makeAuth({ user: makeUser("admin") }), "super_admin");
    expect(screen.getByText("Accès réservé")).toBeInTheDocument();
  });
});
