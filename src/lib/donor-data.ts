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

export const MAP_DONORS: MapDonor[] = [
  { id: "d1", name: "Ayesha Rahman", group: "O-", area: "Dhanmondi", distanceKm: 1.4, lat: 23.7465, lng: 90.376, available: true, lastDonationDays: 142 },
  { id: "d2", name: "Tanvir Hasan", group: "O+", area: "Mirpur", distanceKm: 3.2, lat: 23.8069, lng: 90.3687, available: true, lastDonationDays: 98 },
  { id: "d3", name: "Nusrat Jahan", group: "A-", area: "Gulshan", distanceKm: 2.1, lat: 23.7925, lng: 90.4078, available: true, lastDonationDays: 210 },
  { id: "d4", name: "Imran Kabir", group: "AB+", area: "Uttara", distanceKm: 8.6, lat: 23.8759, lng: 90.3795, available: true, lastDonationDays: 120 },
  { id: "d5", name: "Sadia Islam", group: "B+", area: "Bashundhara", distanceKm: 5.9, lat: 23.8223, lng: 90.4265, available: true, lastDonationDays: 365 },
  { id: "d6", name: "Rafiul Karim", group: "A+", area: "Banani", distanceKm: 2.8, lat: 23.7936, lng: 90.4043, available: true, lastDonationDays: 190 },
  { id: "d7", name: "Mahmud Alam", group: "AB-", area: "Motijheel", distanceKm: 6.4, lat: 23.7331, lng: 90.4172, available: true, lastDonationDays: 130 },
  { id: "d8", name: "Farhana Chowdhury", group: "B-", area: "Mohakhali", distanceKm: 4.3, lat: 23.7806, lng: 90.4009, available: true, lastDonationDays: 156 },
  { id: "d9", name: "Shakil Ahmed", group: "O+", area: "Badda", distanceKm: 7.7, lat: 23.7806, lng: 90.4256, available: false, lastDonationDays: 40 },
  { id: "d10", name: "Mitu Barua", group: "A+", area: "Tejgaon", distanceKm: 3.9, lat: 23.7639, lng: 90.3944, available: true, lastDonationDays: 220 },
];

export const HOSPITALS: Hospital[] = [
  { id: "h1", name: "Dhaka Medical College Hospital", area: "Shahbagh", lat: 23.7261, lng: 90.3972 },
  { id: "h2", name: "Square Hospital", area: "Panthapath", lat: 23.7521, lng: 90.3838 },
  { id: "h3", name: "United Hospital", area: "Gulshan", lat: 23.8006, lng: 90.4152 },
  { id: "h4", name: "Evercare Hospital", area: "Bashundhara", lat: 23.8135, lng: 90.4276 },
];
