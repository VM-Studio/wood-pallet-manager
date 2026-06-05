import { useEffect, useRef, useState } from 'react';
import { Truck, MapPin, Package } from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { RutaHoy } from '../../hooks/useLogistica';
import { useRutasHoy } from '../../hooks/useLogistica';

type LatLng = { lat: number; lng: number };

const ORIGEN: LatLng = { lat: -34.4262, lng: -58.5796 };
const COLORES = ['#E53E3E', '#38A169', '#3182CE', '#D69E2E', '#7B2FBE', '#DD6B20'];
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function MapaRutas({ rutas }: { rutas: RutaHoy[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  // Clave estable: solo re-ejecutar el efecto cuando cambien los IDs de las rutas
  const rutasKey = rutas.map(r => r.logisticaId).join(',');

  useEffect(() => {
    if (!mapRef.current || rutas.length === 0) return;

    if (!API_KEY) {
      setTimeout(() => {
        setError('Configurar VITE_GOOGLE_MAPS_API_KEY en .env');
        setCargando(false);
      }, 0);
      return;
    }

    async function initMap() {
      setOptions({ key: API_KEY!, v: 'weekly' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapsLib   = await importLibrary('maps')   as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coreLib   = await importLibrary('core')   as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const routesLib = await importLibrary('routes') as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markerLib = await importLibrary('marker') as any;

      const { Map, Polyline }                         = mapsLib;
      const { LatLngBounds }                          = coreLib;
      const { DirectionsService, DirectionsRenderer } = routesLib;
      const { AdvancedMarkerElement }                 = markerLib;

      if (!mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: ORIGEN,
        zoom: 10,
        mapId: 'woodpallet_rutas_map',   // requerido para AdvancedMarkerElement
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Helper: marcador circular con HTML (reemplaza Marker+SymbolPath legacy)
      const crearPin = (color: string, label?: string, size = 22) => {
        const el = document.createElement('div');
        el.style.cssText = [
          `width:${size}px`, `height:${size}px`,
          `background:${color}`, 'border-radius:50%',
          'border:2.5px solid #fff',
          'box-shadow:0 2px 6px rgba(0,0,0,0.35)',
          'display:flex', 'align-items:center', 'justify-content:center',
          'color:#fff', 'font-size:11px', 'font-weight:700',
          "font-family:Inter,sans-serif",
        ].join(';');
        if (label) el.textContent = label;
        return el;
      };

      // Marcador de origen (galpón)
      new AdvancedMarkerElement({
        position: ORIGEN, map, title: 'Galpón Tigre',
        content: crearPin('#6B3A2A', '', 20),
        zIndex: 100,
      });

      const directionsService = new DirectionsService();
      const bounds            = new LatLngBounds();
      bounds.extend(ORIGEN);

      let rutasOk = 0;
      for (const ruta of rutas) {
        if (ruta.lat == null || ruta.lng == null) {
          console.warn(`[MapaRutas] Sin coordenadas para: "${ruta.destino}"`);
          continue;
        }
        const coords = { lat: ruta.lat, lng: ruta.lng };
        const color  = COLORES[(ruta.orden - 1) % COLORES.length];
        bounds.extend(coords);

        new AdvancedMarkerElement({
          position: coords, map, title: ruta.destino,
          content: crearPin(color, String(ruta.orden), 26),
          zIndex: 50 + ruta.orden,
        });

        // 300 ms entre requests para no saturar Directions API
        await new Promise(r => setTimeout(r, 300));

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await new Promise<any>((resolve, reject) => {
            directionsService.route(
              { origin: ORIGEN, destination: coords, travelMode: 'DRIVING' },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (res: any, status: any) => {
                if (status === 'OK' && res) resolve(res);
                else reject(new Error(`Directions: ${status}`));
              },
            );
          });
          new DirectionsRenderer({
            map, directions: result, routeIndex: 0, suppressMarkers: true,
            polylineOptions: { strokeColor: color, strokeWeight: 4, strokeOpacity: 0.85 },
          });
        } catch (err) {
          console.warn('[MapaRutas] Directions falló, línea recta:', err);
          new Polyline({ path: [ORIGEN, coords], map, strokeColor: color, strokeWeight: 3, strokeOpacity: 0.7 });
        }
        rutasOk++;
      }

      if (rutasOk > 0) map.fitBounds(bounds, 40);
      setCargando(false);
    }

    initMap().catch((err: unknown) => {
      // Mostrar el error concreto para diagnóstico (API key/referer/limites)
      console.error('[MapaRutas] Error inicializando Google Maps:', err);
      const msg = (err && typeof err === 'object' && 'message' in err) ? (err as { message: string }).message : String(err);
      setError('Error al cargar Google Maps: ' + msg);
      setCargando(false);
    });
  }, [rutasKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexDirection: 'column', gap: 8 }}>
        <MapPin size={24} style={{ color: '#D1D5DB' }} />
        <p style={{ fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center', maxWidth: 220 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 280 }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {cargando && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(249,250,251,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: 24, height: 24, border: '3px solid #E8E2DA', borderTopColor: '#6B3A2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Cargando mapa…</p>
        </div>
      )}
    </div>
  );
}

export default function RouteMonitorCard() {
  const { data: rutasDB, isLoading } = useRutasHoy();
  const rutas: RutaHoy[] = rutasDB ?? [];
  const sinRutas = !isLoading && rutas.length === 0;

  const fechaHoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const fechaLabel = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <div style={{ background: '#FAFAF8', border: '1.5px solid #E8E2DA', borderRadius: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1.5px solid #E8E2DA', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={16} style={{ color: '#6B3A2A' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Monitor de Rutas del Día</h3>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#9E8878', marginTop: '0.2rem' }}>{fechaLabel}</p>
        </div>
        {sinRutas && (
          <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.15rem 0.45rem', background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 0 }}>
            SIN ENTREGAS
          </span>
        )}
      </div>

      {/* Mapa */}
      {isLoading ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Cargando rutas…</p>
        </div>
      ) : sinRutas ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', gap: 8 }}>
          <MapPin size={28} style={{ color: '#D1D5DB' }} />
          <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Sin entregas para hoy</p>
          <p style={{ fontSize: '0.75rem', color: '#C4B9B0', margin: 0 }}>Las rutas aparecen cuando hay logísticas aceptadas con fecha de hoy</p>
        </div>
      ) : (
        <MapaRutas rutas={rutas} />
      )}

      {/* Tabla roja */}
      <div style={{ background: '#B91C1C' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto 52px 14px', padding: '0.5rem 0.875rem', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          {['#', 'Destino', 'Venta', 'Unid.', ''].map(h => (
            <span key={h} style={{ fontSize: '0.63rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>
        {sinRutas ? (
          <div style={{ padding: '0.75rem 0.875rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>No hay entregas aceptadas para hoy</p>
          </div>
        ) : rutas.map(r => {
          const color = COLORES[(r.orden - 1) % COLORES.length];
          return (
            <div key={r.logisticaId || r.orden} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto 52px 14px', padding: '0.45rem 0.875rem', gap: '0.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>{r.orden}</span>
              <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.destino}</span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>VTA-{r.ventaId}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Package size={10} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)' }}>{r.unidades}</span>
              </div>
              <div style={{ width: 12, height: 12, background: r.lat ? color : 'rgba(255,255,255,0.3)', borderRadius: 2, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
