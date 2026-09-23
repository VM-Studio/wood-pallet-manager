import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, DollarSign, Package, Percent, Search, TrendingUp, Wallet } from 'lucide-react';
import {
  useMesesConDatos,
  useRentabilidadVentas,
  type FuenteCosto,
  type RentabilidadVenta,
} from '../../hooks/useReportes';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
const formatNumero = (v: number) => new Intl.NumberFormat('es-AR').format(v);
const formatPct = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`);
const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const labelMes = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const txt = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const TIPO_LABEL: Record<string, string> = {
  estandar: 'Estándar', reforzado: 'Reforzado', liviano: 'Liviano', exportacion: 'Exportación',
  carton: 'Cartón', a_medida: 'A medida', personalizado: 'Personalizado',
};
const CONDICION_LABEL: Record<string, string> = { nuevo: 'Nuevo', seminuevo: 'Seminuevo', usado: 'Usado' };

// Exacto: costo real de esta venta. Estimado: costo de referencia del producto.
const FUENTE_COSTO: Record<FuenteCosto, { label: string; exacto: boolean }> = {
  historico:       { label: 'Costo cargado en la venta', exacto: true },
  compra_venta:    { label: 'Compra al proveedor de esta venta', exacto: true },
  ultima_compra:   { label: 'Última compra de stock (estimado)', exacto: false },
  lista_proveedor: { label: 'Precio de costo del proveedor (estimado)', exacto: false },
  sin_costo:       { label: 'Sin costo cargado', exacto: false },
};

// Color del % de ganancia
const colorPct = (v: number | null) =>
  v == null ? '#9CA3AF' : v < 0 ? '#B91C1C' : v < 15 ? '#B45309' : '#15803D';

type Orden = 'ganancia' | 'porcentaje_desc' | 'porcentaje_asc' | 'facturacion' | 'fecha';

const ORDENES: { value: Orden; label: string }[] = [
  { value: 'ganancia',        label: 'Mayor ganancia' },
  { value: 'porcentaje_desc', label: 'Mayor % de ganancia' },
  { value: 'porcentaje_asc',  label: 'Menor % de ganancia' },
  { value: 'facturacion',     label: 'Mayor facturación' },
  { value: 'fecha',           label: 'Más recientes' },
];

// Sin costo conocido va siempre al final
const ordenar = (orden: Orden) => (a: RentabilidadVenta, b: RentabilidadVenta) => {
  const nulo = (x: number | null) => (x == null ? 1 : 0);
  switch (orden) {
    case 'ganancia':        return nulo(a.ganancia) - nulo(b.ganancia) || (b.ganancia ?? 0) - (a.ganancia ?? 0);
    case 'porcentaje_desc': return nulo(a.porcentajeGanancia) - nulo(b.porcentajeGanancia) || (b.porcentajeGanancia ?? 0) - (a.porcentajeGanancia ?? 0);
    case 'porcentaje_asc':  return nulo(a.porcentajeGanancia) - nulo(b.porcentajeGanancia) || (a.porcentajeGanancia ?? 0) - (b.porcentajeGanancia ?? 0);
    case 'facturacion':     return b.facturacion - a.facturacion;
    case 'fecha':           return new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime();
  }
};

export default function RentabilidadPorVenta() {
  const { data: meses, isLoading: loadingMeses } = useMesesConDatos();
  const [mesElegido, setMesElegido] = useState('');
  const mes = mesElegido || meses?.[0] || '';
  const { data, isLoading } = useRentabilidadVentas(mes);

  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('ganancia');
  const [abierta, setAbierta] = useState<number | null>(null);

  const ventas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (data?.ventas ?? [])
      .filter(v => !q || v.cliente.toLowerCase().includes(q) || `#${v.ventaId}`.includes(q) || String(v.ventaId) === q)
      .sort(ordenar(orden));
  }, [data, busqueda, orden]);

  if (loadingMeses) return <div className="p-8"><LoadingSpinner text="Cargando meses..." /></div>;
  if (!meses?.length) {
    return <div className="card-kpi"><p className="text-sm text-gray-400">Todavía no hay ventas registradas.</p></div>;
  }

  const r = data?.resumen;

  return (
    <div className="space-y-4">
      {/* Mes */}
      <div className="card-kpi flex flex-wrap items-center gap-3">
        <p className="titulo-card">Rendimiento por venta</p>
        <select className="input w-auto ml-auto" value={mes} onChange={e => { setMesElegido(e.target.value); setAbierta(null); }}>
          {meses.map(m => <option key={m} value={m}>{labelMes(m)}</option>)}
        </select>
      </div>

      {isLoading || !data || !r ? (
        <div className="p-8"><LoadingSpinner text="Calculando rentabilidad..." /></div>
      ) : (
        <>
          {/* KPIs del mes */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Facturación', valor: formatPesos(r.facturacion), sub: 'pallets, sin IVA', icono: <DollarSign size={15} /> },
              { label: 'Costo', valor: formatPesos(r.costo), sub: 'de los pallets vendidos', icono: <Wallet size={15} /> },
              { label: 'Ganancia', valor: formatPesos(r.ganancia), sub: `${r.cantidadVentas} venta${r.cantidadVentas === 1 ? '' : 's'}`, icono: <TrendingUp size={15} />, color: r.ganancia >= 0 ? '#15803D' : '#B91C1C' },
              { label: '% de ganancia', valor: formatPct(r.porcentajeGanancia), sub: 'sobre la facturación', icono: <Percent size={15} />, color: colorPct(r.porcentajeGanancia) },
              { label: 'Pallets', valor: formatNumero(r.pallets), sub: 'unidades vendidas', icono: <Package size={15} /> },
            ].map(k => (
              <div key={k.label} className="card-kpi">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: '#F3EDE8', color: '#7c4b2c' }}>{k.icono}</div>
                  <p className="titulo-card flex-1">{k.label}</p>
                </div>
                <p className="text-xl font-bold leading-none mb-1" style={{ color: k.color ?? '#111827' }}>{k.valor}</p>
                <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {r.ventasSinCosto > 0 && (
            <div className="flex gap-2.5 p-3 border border-amber-200 bg-amber-50">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {r.ventasSinCosto} venta{r.ventasSinCosto === 1 ? '' : 's'} sin costo cargado: no se suman a la ganancia ni al costo.
                Cargá el precio de costo del producto en Proveedores o registrá la compra para verlas.
              </p>
            </div>
          )}

          {/* Por tipo de pallet */}
          {data.porTipo.length > 0 && (
            <div className="table-container">
              <div className="p-3 border-b border-gray-100"><p className="titulo-card">Por tipo de pallet</p></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Tipo</th><th className="text-right">Pallets</th><th className="text-right">Facturación</th><th className="text-right">Ganancia</th><th className="text-right">% ganancia</th></tr></thead>
                  <tbody>
                    {data.porTipo.map(t => (
                      <tr key={t.tipo}>
                        <td className="font-semibold text-sm text-gray-900">{TIPO_LABEL[t.tipo] ?? t.tipo}</td>
                        <td className="text-right text-sm">{formatNumero(t.pallets)}</td>
                        <td className="text-right text-sm">{formatPesos(t.facturacion)}</td>
                        <td className="text-right text-sm font-semibold" style={{ color: t.ganancia >= 0 ? '#15803D' : '#B91C1C' }}>{formatPesos(t.ganancia)}</td>
                        <td className="text-right text-sm font-semibold" style={{ color: colorPct(t.porcentajeGanancia) }}>{formatPct(t.porcentajeGanancia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ventas */}
          <div className="table-container">
            <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
              <p className="titulo-card">Ventas de {labelMes(mes)} ({ventas.length})</p>
              <div className="relative ml-auto" style={{ minWidth: 220 }}>
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input pl-9" placeholder="Buscar cliente o N° de venta..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <select className="input w-auto" value={orden} onChange={e => setOrden(e.target.value as Orden)}>
                {ORDENES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {ventas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                {data.ventas.length ? 'No hay ventas que coincidan con la búsqueda.' : 'No hay ventas en este mes.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Venta</th><th>Cliente</th><th>Pallets</th>
                      <th className="text-right">Facturación</th><th className="text-right">Costo</th>
                      <th className="text-right">Ganancia</th><th className="text-right">% ganancia</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map(v => {
                      const open = abierta === v.ventaId;
                      const estimado = v.productos.some(p => !FUENTE_COSTO[p.fuenteCosto].exacto && p.fuenteCosto !== 'sin_costo');
                      return (
                        <FilaVenta key={v.ventaId} v={v} open={open} estimado={estimado}
                          onToggle={() => setAbierta(open ? null : v.ventaId)} />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">
              Facturación y costo de los pallets sin IVA. El flete y el SENASA se cobran al costo y no suman ganancia. Se descuentan las devoluciones confirmadas. Las ventas canceladas no se incluyen.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function FilaVenta({ v, open, estimado, onToggle }: { v: RentabilidadVenta; open: boolean; estimado: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td>
          <p className="font-mono text-xs text-gray-500">#{v.ventaId}</p>
          <p className="text-xs text-gray-400">{formatFecha(v.fechaVenta)}</p>
        </td>
        <td>
          <p className="font-semibold text-sm text-gray-900">{v.cliente}</p>
          <p className="text-xs text-gray-400">{v.vendedor}</p>
        </td>
        <td>
          {v.productos.map(p => (
            <p key={p.detalleId} className="text-xs text-gray-600 whitespace-nowrap">
              {formatNumero(p.cantidad)} × {TIPO_LABEL[p.tipo] ?? p.tipo} <span className="text-gray-400">({CONDICION_LABEL[p.condicion] ?? p.condicion})</span>
            </p>
          ))}
        </td>
        <td className="text-right text-sm">{formatPesos(v.facturacion)}</td>
        <td className="text-right text-sm text-gray-600">
          {v.costo != null ? formatPesos(v.costo) : <span className="text-amber-600 text-xs font-medium">Sin costo</span>}
          {estimado && v.costo != null && <p className="text-[10px] text-gray-400">estimado</p>}
        </td>
        <td className="text-right text-sm font-bold" style={{ color: v.ganancia == null ? '#9CA3AF' : v.ganancia >= 0 ? '#15803D' : '#B91C1C' }}>
          {v.ganancia != null ? formatPesos(v.ganancia) : '—'}
        </td>
        <td className="text-right text-sm font-bold" style={{ color: colorPct(v.porcentajeGanancia) }}>{formatPct(v.porcentajeGanancia)}</td>
        <td className="text-gray-400">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} style={{ background: '#FAF7F4', padding: '0.875rem 1rem' }}>
            <div className="space-y-3">
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 text-left">
                      <th className="py-1 pr-3 font-semibold">Producto</th>
                      <th className="py-1 pr-3 font-semibold text-right">Cant.</th>
                      <th className="py-1 pr-3 font-semibold text-right">Precio unit.</th>
                      <th className="py-1 pr-3 font-semibold text-right">Costo unit.</th>
                      <th className="py-1 pr-3 font-semibold text-right">Facturación</th>
                      <th className="py-1 pr-3 font-semibold text-right">Costo</th>
                      <th className="py-1 pr-3 font-semibold text-right">Ganancia</th>
                      <th className="py-1 pr-3 font-semibold text-right">%</th>
                      <th className="py-1 font-semibold">Origen del costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.productos.map(p => (
                      <tr key={p.detalleId} className="border-t border-gray-200">
                        <td className="py-1.5 pr-3">
                          <p className="font-medium text-gray-800">{p.producto}</p>
                          <p className="text-gray-400">{TIPO_LABEL[p.tipo] ?? p.tipo} · {CONDICION_LABEL[p.condicion] ?? p.condicion}</p>
                        </td>
                        <td className="py-1.5 pr-3 text-right">
                          {formatNumero(p.cantidad)}
                          {p.cantidadDevuelta > 0 && <p className="text-red-500">−{p.cantidadDevuelta} devueltos</p>}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{formatPesos(p.precioUnitario)}</td>
                        <td className="py-1.5 pr-3 text-right">{p.costoUnitario != null ? formatPesos(p.costoUnitario) : '—'}</td>
                        <td className="py-1.5 pr-3 text-right">{formatPesos(p.facturacion)}</td>
                        <td className="py-1.5 pr-3 text-right">{p.costo != null ? formatPesos(p.costo) : '—'}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold" style={{ color: p.ganancia == null ? '#9CA3AF' : p.ganancia >= 0 ? '#15803D' : '#B91C1C' }}>
                          {p.ganancia != null ? formatPesos(p.ganancia) : '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-right font-semibold" style={{ color: colorPct(p.porcentajeGanancia) }}>{formatPct(p.porcentajeGanancia)}</td>
                        <td className="py-1.5">
                          <p style={{ color: FUENTE_COSTO[p.fuenteCosto].exacto ? '#15803D' : p.fuenteCosto === 'sin_costo' ? '#B45309' : '#6B7280' }}>
                            {FUENTE_COSTO[p.fuenteCosto].label}
                          </p>
                          {p.referenciaCosto && <p className="text-gray-400">{p.referenciaCosto}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                <span>Total de la venta (con IVA): <strong className="text-gray-800">{formatPesos(v.totalConIva)}</strong></span>
                {v.flete > 0 && <span>Flete trasladado al cliente: {formatPesos(v.flete)}</span>}
                {v.senasa > 0 && <span>SENASA: {formatPesos(v.senasa)}</span>}
                <span>Cobrado: {formatPesos(v.cobrado)} ({Math.round(v.porcentajeCobrado)}%)</span>
                <span>Origen: {v.origenStock === 'stock_propio' ? 'Stock propio' : 'Compra directa'}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
