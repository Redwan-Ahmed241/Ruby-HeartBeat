import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Building2, Clock, MapPin, Phone, AlertCircle } from "lucide-react";

export interface BloodBankPin {
  id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  emergencyHotline: string;
  operatingHours: string;
  is24Hours: boolean;
  type: string;
  lat: number;
  lng: number;
}

interface BloodBankMapProps {
  banks: BloodBankPin[];
  selectedBankId?: string | null | undefined;
  onBankClick?: ((bank: BloodBankPin) => void) | undefined;
  heightClassName?: string | undefined;
}

const DHAKA_CENTER: [number, number] = [23.7935, 90.4066];

function FitBounds({
  banks,
  selectedBankId,
}: {
  banks: BloodBankPin[];
  selectedBankId?: string | null | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (selectedBankId) {
        const bank = banks.find((b) => b.id === selectedBankId);
        if (bank) {
          map.setView([bank.lat, bank.lng], 15, { animate: true });
          return;
        }
      }

      if (banks.length === 0) {
        map.setView(DHAKA_CENTER, 12);
        return;
      }

      if (banks.length === 1) {
        map.setView([banks[0]!.lat, banks[0]!.lng], 14);
        return;
      }

      const lats = banks.map((b) => b.lat);
      const lngs = banks.map((b) => b.lng);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map, banks, selectedBankId]);

  return null;
}

export default function BloodBankMap({
  banks,
  selectedBankId,
  onBankClick,
  heightClassName = "h-[300px] sm:h-[380px] lg:h-[420px]",
}: BloodBankMapProps) {
  const center = useMemo(() => {
    if (banks.length === 0) return DHAKA_CENTER;
    const avgLat = banks.reduce((s, b) => s + b.lat, 0) / banks.length;
    const avgLng = banks.reduce((s, b) => s + b.lng, 0) / banks.length;
    return [avgLat, avgLng] as [number, number];
  }, [banks]);

  return (
    <div
      className={`relative isolate z-0 w-full overflow-hidden rounded-2xl shadow-sm border border-border ${heightClassName}`}
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <FitBounds banks={banks} selectedBankId={selectedBankId} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {banks.map((bank) => {
          const isSelected = selectedBankId === bank.id;

          return (
            <CircleMarker
              key={bank.id}
              center={[bank.lat, bank.lng]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                color: "#ffffff",
                fillColor: isSelected
                  ? "#dc2626"
                  : bank.is24Hours
                    ? "#8B0000"
                    : "#b91c1c",
                fillOpacity: isSelected ? 1 : 0.9,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onBankClick?.(bank),
              }}
            >
              <Popup>
                <div className="p-1.5 min-w-[200px] max-w-[260px] text-xs space-y-1.5">
                  {/* Name */}
                  <div className="font-bold flex items-start gap-1.5 text-foreground text-sm leading-tight">
                    <Building2 className="size-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{bank.name}</span>
                  </div>

                  {/* Address */}
                  <div className="text-muted-foreground flex items-start gap-1">
                    <MapPin className="size-3 shrink-0 mt-0.5" />
                    <span>{bank.address}</span>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-1 pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3 text-primary shrink-0" />
                      <span className="font-medium text-foreground">
                        {bank.operatingHours}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="size-3 text-primary shrink-0" />
                      <a
                        href={`tel:${bank.phone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {bank.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="size-3 text-destructive shrink-0" />
                      <span className="font-bold text-destructive">
                        {bank.emergencyHotline}
                      </span>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <div className="pt-1">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                      {bank.type}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
