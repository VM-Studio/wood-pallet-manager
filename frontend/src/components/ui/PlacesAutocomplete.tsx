import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Dirección completa de entrega',
  className = 'input',
  disabled = false,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);

  // Mantener las callbacks actualizadas sin re-inicializar el autocomplete
  useEffect(() => { onSelectRef.current = onSelect; });
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;

    let cancelled = false;

    (async () => {
      setOptions({ key: API_KEY, v: 'weekly' });
      const { Autocomplete } = await importLibrary('places') as google.maps.PlacesLibrary;
      if (cancelled || !inputRef.current) return;

      const ac = new Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ar' },
        fields: ['formatted_address', 'geometry'],
        types: ['address'],
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location && place.formatted_address) {
          const result: PlaceResult = {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onSelectRef.current(result);
          onChangeRef.current(result.address);
        }
      });

      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>
        <MapPin size={14} style={{ color: ready ? '#6B3A2A' : '#9CA3AF' }} />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        style={{ paddingLeft: '2rem' }}
        autoComplete="off"
      />
    </div>
  );
}
