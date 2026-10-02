import { useState, useRef, useEffect } from "react";
import { MapPin, Building2, Search, Check, Crosshair } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchLocations,
  resolveCoordinates,
  DHAKA_AREAS,
  DHAKA_HOSPITALS,
  type LocationEntry,
} from "@/lib/locationService";

export interface SelectedLocation {
  name: string;
  area: string;
  lat: number;
  lng: number;
  isHospital?: boolean;
}

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCoordinates?: (location: SelectedLocation) => void;
  placeholder?: string;
  label?: string;
  typeFilter?: "ALL" | "HOSPITALS_ONLY" | "AREAS_ONLY";
  className?: string;
  id?: string;
}

export function LocationSelector({
  value,
  onChange,
  onSelectCoordinates,
  placeholder = "Search area (e.g. Aftabnagar, Dhanmondi, DMCH...)",
  typeFilter = "ALL",
  className = "",
  id = "location-selector",
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search query with external value prop
  useEffect(() => {
    setSearchQuery(value || "");
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter locations
  let results = searchLocations(searchQuery, 10);
  if (typeFilter === "HOSPITALS_ONLY") {
    results = results.filter((r) => r.category === "HOSPITAL");
  } else if (typeFilter === "AREAS_ONLY") {
    results = results.filter((r) => r.category === "AREA");
  }

  const handleSelect = (entry: LocationEntry) => {
    setSearchQuery(entry.name);
    onChange(entry.name);
    setIsOpen(false);

    if (onSelectCoordinates) {
      onSelectCoordinates({
        name: entry.name,
        area: entry.parentArea || entry.name,
        lat: entry.lat,
        lng: entry.lng,
        isHospital: entry.category === "HOSPITAL",
      });
    }
  };

  const handleCustomInput = (text: string) => {
    setSearchQuery(text);
    onChange(text);
    if (!isOpen && text.trim().length > 0) {
      setIsOpen(true);
    }

    // Auto-resolve coordinates in background
    if (onSelectCoordinates && text.trim().length >= 2) {
      const resolved = resolveCoordinates({
        hospitalName: typeFilter === "HOSPITALS_ONLY" ? text : undefined,
        areaZone: typeFilter === "AREAS_ONLY" ? text : undefined,
        rawAddress: text,
      });
      onSelectCoordinates({
        name: text,
        area: resolved.area,
        lat: resolved.lat,
        lng: resolved.lng,
        isHospital: resolved.isHospital,
      });
    }
  };

  // Quick popular pills for fast access
  const popularShortlist = typeFilter === "HOSPITALS_ONLY"
    ? DHAKA_HOSPITALS.slice(0, 4)
    : [
        DHAKA_AREAS.find((a) => a.name === "Aftabnagar")!,
        DHAKA_AREAS.find((a) => a.name === "Dhanmondi")!,
        DHAKA_AREAS.find((a) => a.name === "Mirpur 10")!,
        DHAKA_AREAS.find((a) => a.name === "Uttara")!,
        DHAKA_AREAS.find((a) => a.name === "Gulshan 2")!,
        DHAKA_AREAS.find((a) => a.name === "Badda")!,
      ].filter(Boolean);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary pointer-events-none" />
        <Input
          id={id}
          value={searchQuery}
          onChange={(e) => handleCustomInput(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-8 text-xs h-9 font-medium"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              onChange("");
              setIsOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            title="Clear location"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl text-xs space-y-1">
          {/* Quick Shortcuts */}
          <div className="px-2 py-1 flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <Crosshair className="size-3 text-primary" /> Popular Dhaka Locations:
            </span>
            <span className="text-[10px] italic">or type any custom area</span>
          </div>

          <div className="flex flex-wrap gap-1 px-1.5 pb-1.5 border-b border-border/40">
            {popularShortlist.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelect(loc)}
                className="px-2 py-0.5 rounded-full text-[10px] bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors border border-border/40 cursor-pointer"
              >
                {loc.name}
              </button>
            ))}
          </div>

          {/* Autocomplete list */}
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={`${item.category}-${item.name}`}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.category === "HOSPITAL" ? (
                    <Building2 className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                    {item.parentArea && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        Zone: {item.parentArea}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                    {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                  </Badge>
                  {searchQuery.trim().toLowerCase() === item.name.toLowerCase() && (
                    <Check className="size-3 text-primary" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-muted-foreground text-xs space-y-1">
              <p>Custom location: &ldquo;<strong>{searchQuery}</strong>&rdquo;</p>
              <p className="text-[10px] text-muted-foreground">
                LifeDrop will automatically geocode this location for real-time donor matching.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
