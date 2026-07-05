import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsInitCallbacks?: Array<() => void>;
    __googleMapsLoading?: boolean;
    initLovableGoogleMap?: () => void;
  }
}

/**
 * Loads the Google Maps JS API asynchronously (once) and resolves when ready.
 */
function loadGoogleMaps(): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no-window"));
    if (window.google?.maps) return resolve(window.google);

    window.__googleMapsInitCallbacks = window.__googleMapsInitCallbacks ?? [];
    window.__googleMapsInitCallbacks.push(() => resolve(window.google!));

    if (window.__googleMapsLoading) return;
    window.__googleMapsLoading = true;

    window.initLovableGoogleMap = () => {
      (window.__googleMapsInitCallbacks ?? []).forEach((cb) => cb());
      window.__googleMapsInitCallbacks = [];
    };

    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
    if (!key) {
      reject(new Error("Google Maps browser key missing"));
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=initLovableGoogleMap${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

export type MapMarker = {
  position: LatLng;
  label?: string;
  title?: string;
  color?: "driver" | "pickup" | "dropoff" | "target";
};

export function GoogleMapView({
  markers,
  polyline,
  className,
  center,
}: {
  markers: MapMarker[];
  polyline?: string | null;
  className?: string;
  center?: LatLng;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerObjsRef = useRef<google.maps.Marker[]>([]);
  const polylineObjRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !ref.current) return;
        const c = center ?? markers[0]?.position ?? { lat: 8.9824, lng: -79.5199 };
        mapRef.current = new g.maps.Map(ref.current, {
          center: c,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const g = window.google;

    markerObjsRef.current.forEach((m) => m.setMap(null));
    markerObjsRef.current = [];

    const colorFor = (c?: MapMarker["color"]) => {
      switch (c) {
        case "driver":
          return "#1e3a5f";
        case "pickup":
          return "#c8862e";
        case "dropoff":
          return "#059669";
        default:
          return "#E6C35C";
      }
    };

    const bounds = new g.maps.LatLngBounds();
    markers.forEach((m, i) => {
      const marker = new g.maps.Marker({
        position: m.position,
        map,
        title: m.title,
        label: m.label ? { text: m.label, color: "#fff", fontWeight: "bold", fontSize: "12px" } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: colorFor(m.color),
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 100 + i,
      });
      markerObjsRef.current.push(marker);
      bounds.extend(m.position);
    });

    if (markers.length > 1) {
      map.fitBounds(bounds, 48);
    } else if (markers.length === 1) {
      map.setCenter(markers[0].position);
      map.setZoom(15);
    }
  }, [markers]);

  // Update polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const g = window.google;

    if (polylineObjRef.current) {
      polylineObjRef.current.setMap(null);
      polylineObjRef.current = null;
    }
    if (!polyline) return;

    // Decode Google encoded polyline
    const path = decodePolyline(polyline);
    if (path.length === 0) return;
    polylineObjRef.current = new g.maps.Polyline({
      path,
      map,
      geodesic: true,
      strokeColor: "#1e3a5f",
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
  }, [polyline]);

  return <div ref={ref} className={className ?? "h-full w-full"} />;
}

// Standard Google encoded polyline decoder
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
