import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { CITY_CENTER, HOSPITALS, type MapDonor } from "@/lib/donor-data";
import { formatBloodGroup } from "@/lib/formatters";

type Props = {
  donors?: MapDonor[];
  radiusKm: number;
  onRequestContact?: (donor: MapDonor) => void;
};

/**
 * Leaflet renders gray/half-drawn tiles when it mounts before its container has
 * a known size (common inside grid/flex + lazy Suspense). Force a resize once
 * mounted and whenever the radius (zoom) changes.
 */
function InvalidateOnMount({ dep }: { dep: number }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [map, dep]);
  return null;
}

export default function DonorMap({ donors = [], radiusKm, onRequestContact }: Props) {
  const zoom = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : 10;

  return (
    <div className="relative isolate z-0 w-full overflow-hidden rounded-2xl shadow-sm">
      <MapContainer
        center={CITY_CENTER}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-[320px] sm:h-[420px] lg:h-[520px] 2xl:h-[600px] w-full"
      >
        <InvalidateOnMount dep={radiusKm} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={CITY_CENTER}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#8B0000", fillColor: "#8B0000", fillOpacity: 0.05, weight: 1 }}
        />

        {HOSPITALS.map((h) => (
          <CircleMarker
            key={h.id}
            center={[h.lat, h.lng]}
            radius={8}
            pathOptions={{ color: "#1d4ed8", fillColor: "#1d4ed8", fillOpacity: 0.85, weight: 2 }}
          >
            <Popup>
              <p className="font-semibold">{h.name}</p>
              <p className="text-xs">Blood bank · {h.area}</p>
            </Popup>
          </CircleMarker>
        ))}

        {donors.map((d) => (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={10}
            pathOptions={{
              color: "#8B0000",
              fillColor: d.available ? "#8B0000" : "#9ca3af",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-2">
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs">
                  Blood group <strong>{formatBloodGroup(d.group)}</strong> · {d.distanceKm} km away
                </p>
                <p className="text-xs">{d.area}</p>
                {onRequestContact && (
                  <Button size="sm" disabled={!d.available} onClick={() => onRequestContact(d)}>
                    Request contact
                  </Button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
