import { useCallback, useEffect, useState } from 'react';

export interface UserLocation {
  /** "lat,lng" for Algolia's aroundLatLng; null → fall back to IP-based location. */
  latLng: string | null;
  label: string;
  source: 'browser' | 'preset' | 'ip';
}

// Demo presets: the dataset only covers some US cities, and the presenter may be
// somewhere with no restaurants. Lets us "travel" during the demo.
export const CITY_PRESETS: { label: string; latLng: string }[] = [
  { label: 'New York', latLng: '40.7484,-73.9857' },
  { label: 'San Francisco', latLng: '37.7749,-122.4194' },
  { label: 'Houston', latLng: '29.7604,-95.3698' },
  { label: 'Las Vegas', latLng: '36.1147,-115.1728' },
  { label: 'Denver', latLng: '39.7392,-104.9903' },
  { label: 'San Diego', latLng: '32.7157,-117.1611' },
  { label: 'Honolulu', latLng: '21.3069,-157.8583' },
];

const IP_FALLBACK: UserLocation = { latLng: null, label: 'Near you (approx.)', source: 'ip' };

/** Browser geolocation when allowed; otherwise Algolia estimates location from the IP. */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(IP_FALLBACK);

  const requestBrowserLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setLocation({
          latLng: `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`,
          label: 'Your location',
          source: 'browser',
        }),
      () => setLocation(IP_FALLBACK),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  useEffect(requestBrowserLocation, [requestBrowserLocation]);

  const choosePreset = (label: string) => {
    const preset = CITY_PRESETS.find((p) => p.label === label);
    if (preset) setLocation({ ...preset, source: 'preset' });
  };

  return { location, choosePreset, requestBrowserLocation };
}

/** Meters → "0.4 mi" / "12 mi". */
export function formatDistance(meters: number | undefined) {
  if (meters === undefined) return null;
  const miles = meters / 1609.34;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}
