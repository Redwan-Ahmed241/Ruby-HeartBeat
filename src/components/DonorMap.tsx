import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { CITY_CENTER, HOSPITALS, type MapDonor } from "@/lib/donor-data";

type Props = {
  donors: MapDonor[];
  radiusKm: number;
  onRequestContact: (donor: MapDonor) => void;
};

export default function DonorMap({ donors, radiusKm, onRequestContact }: Props) {
  const zoom = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : 10;

  return (
    <MapContainer
      center={CITY_CENTER}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-[520px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle
        center={CITY_CENTER}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#8B0000", fillColor: "#8B0000", fillOpacity: 0.06, weight: 1 }}
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
            <p className="text-xs">Hospital · {h.area}</p>
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
                Blood group <strong>{d.group}</strong> · {d.distanceKm} km away
              </p>
              <p className="text-xs">{d.area}</p>
              <Button size="sm" disabled={!d.available} onClick={() => onRequestContact(d)}>
                Request Contact
              </Button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
