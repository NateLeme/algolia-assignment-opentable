// Raw client files: their shapes exactly as provided, and a loader.
// Shared by the exploration and build scripts so both read the data the same way.
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

export interface RawListRecord {
  objectID: number;
  name: string;
  address: string;
  area: string;
  city: string;
  country: string;
  image_url: string;
  mobile_reserve_url: string;
  payment_options: string[];
  phone: string;
  postal_code: string;
  price: number;
  reserve_url: string;
  state: string;
  _geoloc: { lat: number; lng: number };
}

export interface RawInfoRow {
  objectID: string;
  food_type: string;
  stars_count: string;
  reviews_count: string;
  neighborhood: string;
  phone_number: string;
  price_range: string;
  dining_style: string;
}

export function loadRawData() {
  const list: RawListRecord[] = JSON.parse(
    readFileSync('data/raw/restaurants_list.json', 'utf8'),
  );
  const { data: info, errors } = Papa.parse<RawInfoRow>(
    readFileSync('data/raw/restaurants_info.csv', 'utf8'),
    { header: true, delimiter: ';', skipEmptyLines: true },
  );
  return { list, info, parseErrors: errors };
}

/** Name before the first " - " / " – ", e.g. "Benihana - Carlsbad" → "Benihana". */
export const baseName = (name: string) => name.split(/\s+[–-]\s+/)[0].trim();
