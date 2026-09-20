import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, MapPin, ShieldCheck, User } from "lucide-react";
import type { MapDonor } from "@/lib/donor-data";
import { formatBloodGroup } from "@/lib/formatters";

export interface HospitalLocationProp {
  lat: number;
  lng: number;
  name: string;
  area?: string | null | undefined;
}

export interface DonorLocationProp {
  lat: number;
  lng: number;
  label: string;
  isApproximate?: boolean | undefined;
  bloodGroup?: string | undefined;
}

export interface Props {
  hospitalLocation?: HospitalLocationProp | undefined;
  donorLocation?: DonorLocationProp | undefined;
  radiusKm?: number | undefined;
  heightClassName?: string | undefined;
  donors?: MapDonor[] | undefined;
  onRequestContact?: ((donor: MapDonor) => void) | undefined;
}

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka City Center

function MapBoundsUpdater({
  hospitalLocation,
  donorLocation,
  center,
  zoom,
}: {
  hospitalLocation?: HospitalLocationProp | undefined;
  donorLocation?: DonorLocationProp | undefined;
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (hospitalLocation && donorLocation) {
        // Fit both pins within view with comfortable padding
        const bounds: [[number, number], [number, number]] = [
          [
            Math.min(hospitalLocation.lat, donorLocation.lat),
            Math.min(hospitalLocation.lng, donorLocation.lng),
          ],
          [
            Math.max(hospitalLocation.lat, donorLocation.lat),
            Math.max(hospitalLocation.lng, donorLocation.lng),
          ],
        ];
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView(center, zoom);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [map, hospitalLocation, donorLocation, center, zoom]);

  return null;
}

export default function DonorMap({
  hospitalLocation,
  donorLocation,
  radiusKm = 10,
  heightClassName = "h-[320px] sm:h-[420px] lg:h-[500px]",
  donors = [],
  onRequestContact,
}: Props) {
  // Determine center based on provided locations
  let center = DEFAULT_CENTER;
  let defaultZoom = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : 10;

  if (hospitalLocation && donorLocation) {
    center = [
      (hospitalLocation.lat + donorLocation.lat) / 2,
      (hospitalLocation.lng + donorLocation.lng) / 2,
    ];
    defaultZoom = 13;
  } else if (hospitalLocation) {
    center = [hospitalLocation.lat, hospitalLocation.lng];
    defaultZoom = 14;
  } else if (donorLocation) {
    center = [donorLocation.lat, donorLocation.lng];
    defaultZoom = 14;
  }

  const hasRouteLine = !!(hospitalLocation && donorLocation);

  return (
    <div className={`relative isolate z-0 w-full overflow-hidden rounded-2xl shadow-sm border border-border ${heightClassName}`}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <MapBoundsUpdater
          hospitalLocation={hospitalLocation}
          donorLocation={donorLocation}
          center={center}
          zoom={defaultZoom}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Connecting Route Line (Dashed) between Hospital and Donor */}
        {hasRouteLine && hospitalLocation && donorLocation && (
          <Polyline
            positions={[
              [hospitalLocation.lat, hospitalLocation.lng],
              [donorLocation.lat, donorLocation.lng],
            ]}
            pathOptions={{
              color: "#3b82f6",
              weight: 3,
              dashArray: "6, 8",
              opacity: 0.8,
            }}
          />
        )}

        {/* 2. Radius Circle (when single center or search radius active) */}
        {!hasRouteLine && radiusKm && (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#8B0000",
              fillColor: "#8B0000",
              fillOpacity: 0.05,
              weight: 1.5,
            }}
          />
        )}

        {/* 3. Hospital Location Pin */}
        {hospitalLocation && (
          <CircleMarker
            center={[hospitalLocation.lat, hospitalLocation.lng]}
            radius={11}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#dc2626",
              fillOpacity: 0.95,
              weight: 2.5,
            }}
          >
            <Popup>
              <div className="p-1 min-w-[170px] text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-foreground text-sm">
                  <Building2 className="size-4 text-red-600 shrink-0" />
                  <span>{hospitalLocation.name}</span>
                </div>
                {hospitalLocation.area && (
                  <div className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    <span>{hospitalLocation.area}</span>
                  </div>
                )}
                <div className="text-[10px] text-red-600 font-semibold uppercase tracking-wider pt-0.5">
                  Hospital Transfusion Destination
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 4. Single Donor Location Pin (with Privacy Blur Zone) */}
        {donorLocation && (
          <>
            {/* 600m Privacy Circle for Approximate Donor Grid */}
            <Circle
              center={[donorLocation.lat, donorLocation.lng]}
              radius={600}
              pathOptions={{
                color: "#10b981",
                fillColor: "#10b981",
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: "4, 6",
              }}
            />

            <CircleMarker
              center={[donorLocation.lat, donorLocation.lng]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#059669",
                fillOpacity: 0.95,
                weight: 2.5,
              }}
            >
              <Popup>
                <div className="p-1 min-w-[170px] text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-foreground text-sm">
                    <User className="size-4 text-emerald-600 shrink-0" />
                    <span>{donorLocation.label}</span>
                  </div>
                  {donorLocation.bloodGroup && (
                    <div className="text-xs text-muted-foreground">
                      Blood Group: <strong className="text-foreground">{formatBloodGroup(donorLocation.bloodGroup)}</strong>
                    </div>
                  )}
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 pt-0.5">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    <span>Approximate Area (~1km privacy grid)</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* 5. Multiple Donors (when browsing in find-donors or home map) */}
        {!donorLocation &&
          donors.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={9}
              pathOptions={{
                color: "#8B0000",
                fillColor: d.available ? "#8B0000" : "#9ca3af",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-2 p-1 text-xs">
                  <p className="font-semibold text-sm">{d.name}</p>
                  <p className="text-muted-foreground">
                    Blood group <strong>{formatBloodGroup(d.group)}</strong> · {d.distanceKm} km away
                  </p>
                  <p className="text-muted-foreground">{d.area}</p>
                  {onRequestContact && (
                    <button
                      type="button"
                      className="mt-1 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium text-xs disabled:opacity-50"
                      disabled={!d.available}
                      onClick={() => onRequestContact(d)}
                    >
                      Request contact
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
