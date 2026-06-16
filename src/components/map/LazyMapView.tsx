import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import type MapView from "./MapView";

const MapViewImpl = lazy(() => import("./MapView"));

type Props = ComponentProps<typeof MapView>;

function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`${className ?? "h-72 w-full"} animate-pulse rounded-2xl bg-brand-mint/40`}
      aria-hidden
    />
  );
}

/**
 * Lazy-loaded {@link MapView}: keeps the Leaflet bundle out of pages until a map
 * actually renders. Drop-in replacement for MapView with a loading skeleton.
 */
export function LazyMapView(props: Props) {
  return (
    <Suspense fallback={<MapSkeleton className={props.className} />}>
      <MapViewImpl {...props} />
    </Suspense>
  );
}
