import { useState } from 'react';
import { Plus, Search, DollarSign, AlertTriangle, Clock, CheckCircle, Receipt } from 'lucide-react';
import { useFacturas, useFacturasVencidas, useCobrosPendientes } from '../../hooks/useFacturacion';
import type { Factura } from '../../types';
import NuevaFactura from './NuevaFactura';
import RegistrarCobro from './RegistrarCobro';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

interface FacturaVencida extends Factura {
  saldoPendiente: number;
  diasVencida: number;
  urgencia: 'alta' | 'media' | 'baja';
}

interface CobroData {
  facturaId: number;
  clienteNombre: string;
  totalFactura: number;
  totalCobrado: number;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const estadoFiltros = [
  { key: 'todos',           label: 'Todas' },
  { key: 'pendiente',       label: 'Pendientes' },
  { key: 'cobrada_parcial', label: 'Cobro parcial' },
  { key: 'cobrada_total',   label: 'Cobradas' },
  { key: 'vencida',         label: 'Vencidas' },
];

export default function FacturacionPage() {
  const { data: facturas, isLoading, isError } = useFacturas() as {
    data: Factura[] | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  const { data: vencidas } = useFacturasVencidas() as { data: FacturaVencida[] | undefined };
  const { data: pendientes } = useCobrosPendientes() as { data: Factura[] | undefined };

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);
  const [cobroData, setCobroData] = useState<CobroData | null>(null);

  const filtradas = facturas?.filter(f => {
    const matchBusqueda =
      f.cliente?.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.nroFactura?.includes(busqueda) ||
      `#${f.id}`.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || f.estadoCobro === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const totalPendiente = pendientes?.reduce((acc, f) => {
    const cobrado = f.pagos?.reduce((a, p) => a + Number(p.monto), 0) ?? 0;
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0) ?? 0;

  const totalVencidas = vencidas?.reduce((acc, f) => acc + (f.saldoPendiente ?? 0), 0) ?? 0;

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Cargando facturas..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorMessage message="No se pudieron cargar las facturas." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Facturación y Cobranzas</h1>
          <p className="text-sm text-gray-500 mt-1">{facturas?.length ?? 0} facturas registradas</p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} /> Registrar factura
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-kpi">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cobros pendientes</p>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{formatPesos(totalPendiente)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {pendientes?.length ?? 0} factura{(pendientes?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
              <Clock size={18} style={{ color: '#C4895A' }} />
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Facturas vencidas</p>
              <p className="text-2xl font-bold" style={{ color: totalVencidas > 0 ? '#B91C1C' : '#6B3A2A' }}>
                {vencidas?.length ?? 0}
              </p>
              {totalVencidas > 0 && (
                <p className="text-xs text-red-500 mt-1">{formatPesos(totalVencidas)}</p>
              )}
            </div>
            <div className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{ background: totalVencidas > 0 ? '#FEF2F2' : '#FEF3E2', borderRadius: '0.25rem' }}>
              <AlertTriangle size={18} style={{ color: totalVencidas > 0 ? '#B91C1C' : '#C4895A' }} />
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cobradas</p>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>
                {facturas?.filter(f => f.estadoCobro === 'cobrada_total').length ?? 0}
              </p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
              <CheckCircle size={18} style={{ color: '#C4895A' }} />
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total emitido</p>
              <p className="text-xl font-bold" style={{ color: '#6B3A2A' }}>
                {formatPesos(facturas?.reduce((acc, f) => acc + Number(f.totalConIva), 0) ?? 0)}
              </p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
              <Receipt size={18} style={{ color: '#6B3A2A' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Panel de alertas vencidas */}
      {vencidas && vencidas.length > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {vencidas.length} factura{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''} — requieren atención urgente
            </p>
          </div>
          <div className="space-y-2">
            {vencidas.slice(0, 3).map(f => (
              <div key={f.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-100"
                style={{ borderRadius: '0.25rem' }}>
                <div>
                  <p className="text-sm font-semibold text-red-800">{f.cliente?.razonSocial}</p>
                  <p className="text-xs text-red-500">
                    Vencida hace {f.diasVencida} días
                    {f.nroFactura && ` · ${f.nroFactura}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-700">{formatPesos(f.saldoPendiente)}</p>
                    <span className={`text-xs font-semibold ${f.urgencia === 'alta' ? 'text-red-600' : 'text-amber-600'}`}>
                      {f.urgencia}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const totalCobrado = Number(f.totalConIva) - f.saldoPendiente;
                      setCobroData({
                        facturaId: f.id,
                        clienteNombre: f.cliente?.razonSocial ?? '',
                        totalFactura: Number(f.totalConIva),
                        totalCobrado
                      });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white"
                    style={{ background: '#B91C1C', borderRadius: '0.25rem' }}
                  >
                    <DollarSign size={13} /> Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente, N° factura..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-field pl-10" />
        </div>
        <div className="flex gap-1 p-1 overflow-x-auto" style={{ background: '#fff', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}>
          {estadoFiltros.map(f => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              style={filtroEstado === f.key
                ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                : { borderRadius: '0.25rem' }
              }
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all text-gray-500 hover:bg-gray-50">
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {!filtradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Receipt size={24} style={{ color: '#6B3A2A' }} />
          </div>
          <p className="titulo-card" style={{ color: '#6B3A2A' }}>Sin facturas</p>
          <p className="text-xs text-gray-400 mt-1">Registrá la primera factura con el botón de arriba</p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Comprobante</th>
                <th>Total</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(f => {
                const totalCobrado = f.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0;
                const saldo = Number(f.totalConIva) - totalCobrado;
                const hoy = new Date();
                const vencida = !!f.fechaVencimiento
                  && new Date(f.fechaVencimiento) < hoy
                  && f.estadoCobro !== 'cobrada_total';

                return (
                  <tr key={f.id} style={vencida ? { background: 'rgba(254,242,242,0.5)' } : {}}>
                    <td className="font-semibold text-gray-400 text-xs">#{f.id}</td>
                    <td>
                      <p className="font-semibold text-gray-900 text-sm">{f.cliente?.razonSocial}</p>
                      {f.cliente?.cuit && (
                        <p className="text-xs text-gray-400">{f.cliente.cuit}</p>
                      )}
                    </td>
                    <td>
                      {f.esSinFactura ? (
                        <span className="badge-yellow">SN</span>
                      ) : (
                        <div>
                          <span className="badge-blue">Factura A</span>
                          {f.nroFactura && (
                            <p className="text-xs text-gray-400 mt-0.5">{f.nroFactura}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatPesos(Number(f.totalConIva))}
                      </p>
                      {saldo > 0 && saldo < Number(f.totalConIva) && (
                        <p className="text-xs text-amber-600">Saldo: {formatPesos(saldo)}</p>
                      )}
                    </td>
                    <td>
                      {f.fechaVencimiento ? (
                        <div>
                          <p className="text-sm" style={vencida ? { color: '#B91C1C', fontWeight: 600 } : { color: '#374151' }}>
                            {formatFecha(f.fechaVencimiento)}
                          </p>
                          {vencida && <p className="text-xs text-red-500">Vencida</p>}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td><EstadoBadge estado={f.estadoCobro} /></td>
                    <td>
                      {f.estadoCobro !== 'cobrada_total' && (
                        <button
                          onClick={() => setCobroData({
                            facturaId: f.id,
                            clienteNombre: f.cliente?.razonSocial ?? '',
                            totalFactura: Number(f.totalConIva),
                            totalCobrado
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white"
                          style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
                        >
                          <DollarSign size={13} /> Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNueva && (
        <NuevaFactura onClose={() => setShowNueva(false)} onSuccess={() => setShowNueva(false)} />
      )}

      {cobroData && (
        <RegistrarCobro
          facturaId={cobroData.facturaId}
          clienteNombre={cobroData.clienteNombre}
          totalFactura={cobroData.totalFactura}
          totalCobrado={cobroData.totalCobrado}
          onClose={() => setCobroData(null)}
          onSuccess={() => setCobroData(null)}
        />
      )}
    </div>
  );
}
