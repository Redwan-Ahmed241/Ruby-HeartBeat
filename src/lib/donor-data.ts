export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type MapDonor = {
  id: string;
  name: string;
  group: BloodGroup;
  area: string;
  distanceKm: number;
  lat: number;
  lng: number;
  available: boolean;
  lastDonationDays: number;
};

export type Hospital = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
};

/** Approximate city centre used as the "you are here" reference point. */
export const CITY_CENTER: [number, number] = [23.7806, 90.4074];

/**
 * Hospital blood banks are public, real-world reference points used to render the
 * blood-bank network map. Individual donor locations are never listed here — donor
 * discovery happens only through the privacy-preserving request/match flow.
 */
export const HOSPITALS: Hospital[] = [
  {
    id: "h1",
    name: "Dhaka Medical College Hospital",
    area: "Shahbagh",
    lat: 23.7261,
    lng: 90.3972,
  },
  { id: "h2", name: "Square Hospital", area: "Panthapath", lat: 23.7521, lng: 90.3838 },
  { id: "h3", name: "United Hospital", area: "Gulshan", lat: 23.8006, lng: 90.4152 },
  { id: "h4", name: "Evercare Hospital", area: "Bashundhara", lat: 23.8135, lng: 90.4276 },
];
