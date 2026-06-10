/**
 * PlacesAutocomplete — búsqueda de direcciones a través del backend (Nominatim proxy).
 * NO usa la Maps JavaScript API ni Places API del lado del cliente.
 * Las sugerencias vienen de GET /api/logistica/address-search?q=...
 * Las coordenadas se devuelven directamente en el resultado de la selección.
 */
import { useRef, useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import api from '../../services/api';

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface Suggestion {
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    setSuggestions([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) { setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const { data } = await api.get<Suggestion[]>('/logistica/address-search', {
          params: { q: val },
        });
        setSuggestions(data ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleSelect = (s: Suggestion) => {
    onSelect({ address: s.address, lat: s.lat, lng: s.lng });
    onChange(s.address);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Ícono izquierdo */}
      <div style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1,
      }}>
        {loading
          ? <Loader2 size={14} style={{ color: '#C4895A', animation: 'spin 0.8s linear infinite' }} />
          : <MapPin size={14} style={{ color: value ? '#6B3A2A' : '#9CA3AF' }} />
        }
      </div>

      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        style={{ paddingLeft: '2rem' }}
        autoComplete="off"
      />

      {/* Dropdown de sugerencias */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#fff',
          border: '1.5px solid #E8E2DA',
          borderTop: 'none',
          borderRadius: '0 0 0.5rem 0.5rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '0.625rem 0.875rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
              Buscando direcciones…
            </div>
          )}
          {!loading && suggestions.length === 0 && value.trim().length >= 3 && (
            <div style={{ padding: '0.625rem 0.875rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
              No se encontraron resultados. Verificá la dirección.
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                width: '100%', padding: '0.5625rem 0.875rem',
                background: 'transparent', border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                textAlign: 'left', cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <MapPin size={13} style={{ color: '#C4895A', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.4 }}>
                {s.address}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
