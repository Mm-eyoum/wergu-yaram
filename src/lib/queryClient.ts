import { QueryClient } from "@tanstack/react-query";

/** Shared query client. Firestore data is fairly stable → modest staleTime. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
