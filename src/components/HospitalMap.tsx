import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, MapPin } from "lucide-react";

interface HospitalMapProps {
  latitude: number;
  longitude: number;
  hospitalName: string;
  areaZone?: string | null | undefined;
  heightClassName?: string | undefined;
}

function InvalidateOnMount({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
      map.setView(center, map.getZoom());
    }, 100);
    return () => window.clearTimeout(id);
  }, [map, center]);
  return null;
}

export default function HospitalMap({
  latitude,
  longitude,
  hospitalName,
  areaZone,
  heightClassName = "h-[240px] sm:h-[300px]",
}: HospitalMapProps) {
  const center: [number, number] = [
    latitude && !isNaN(latitude) ? latitude : 23.8103,
    longitude && !isNaN(longitude) ? longitude : 90.4125,
  ];

  return (
    <div className={`relative isolate z-0 w-full overflow-hidden rounded-xl border border-border shadow-xs ${heightClassName}`}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <InvalidateOnMount center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pulse radius around hospital */}
        <Circle
          center={center}
          radius={500}
          pathOptions={{
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.15,
            weight: 1.5,
          }}
        />

        {/* Hospital pin */}
        <CircleMarker
          center={center}
          radius={11}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#dc2626",
            fillOpacity: 0.95,
            weight: 2.5,
          }}
        >
          <Popup>
            <div className="p-1 min-w-[160px] text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-foreground text-sm">
                <Building2 className="size-4 text-red-600 shrink-0" />
                <span>{hospitalName}</span>
              </div>
              {areaZone && (
                <div className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span>{areaZone}</span>
                </div>
              )}
              <div className="text-[10px] text-red-600 font-semibold uppercase tracking-wider pt-1">
                Hospital Transfusion Center
              </div>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
