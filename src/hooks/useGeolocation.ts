import { useCallback, useState } from "react";
import type { Coords } from "@/types/domain";

export type GeolocationStatus = "idle" | "prompt" | "granted" | "denied" | "unavailable";

interface GeolocationState {
  position: Coords | null;
  status: GeolocationStatus;
  error: string | null;
}

/**
 * Thin wrapper around `navigator.geolocation`. Never auto-requests — the caller
 * triggers `request()` on an explicit user action (privacy + permission UX).
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    status: "idle",
    error: null,
  });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ position: null, status: "unavailable", error: "Géolocalisation non disponible." });
      return;
    }
    setState((s) => ({ ...s, status: "prompt", error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          status: "granted",
          error: null,
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState({
          position: null,
          status: denied ? "denied" : "unavailable",
          error: denied
            ? "Accès à la position refusé. Vous pouvez choisir une région à la place."
            : "Impossible de récupérer votre position.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { ...state, request } as const;
}
