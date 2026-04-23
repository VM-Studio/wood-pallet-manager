import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export interface DetalleDevolucion {
  id: number
  devolucionId: number
  detalleVentaId?: number
  productoId: number
  cantidadDevuelta: number
  precioUnitario: number
  subtotal: number
  producto: { id: number; nombre: string; tipo: string }
  detalleVenta?: { cantidadPedida: number; cantidadEntregada: number }
}

export interface Devolucion {
  id: number
  ventaId: number
  clienteId: number
  usuarioId: number
  fechaSolicitud: string
  tipoCaso: 'pallet_danado' | 'cliente_no_quiere' | 'devolucion_parcial' | 'cancelacion_anticipada'
  estado: 'pendiente' | 'esperando_confirmacion_deposito' | 'confirmada' | 'procesada' | 'cancelada'
  devuelveFlete: boolean
  devuelveSenasa: boolean
  montoPallets: number
  montoFlete?: number
  montoSenasa?: number
  montoTotal: number
  requiereConfirmacionDeposito: boolean
  depositoConfirmo: boolean
  fechaConfirmacionDeposito?: string
  stockRestaurado: boolean
  compensaEnSiguientePedido: boolean
  metodoPago?: string
  cuentaDestino?: string
  observaciones?: string
  cliente: { id: number; razonSocial: string }
  usuario: { id: number; nombre: string; apellido: string }
  venta: {
    id: number
    detalles: { id: number; productoId: number; cantidadPedida: number; cantidadEntregada: number; precioUnitario: number; subtotal: number; producto: { nombre: string } }[]
    facturas: { id: number; totalConIva: number; estadoCobro: string }[]
    logistica?: { estadoEntrega: string }
    costoFlete?: number
  }
  detalles: DetalleDevolucion[]
}

export interface CrearDevolucionPayload {
  ventaId: number
  tipoCaso: Devolucion['tipoCaso']
  devuelveFlete: boolean
  devuelveSenasa: boolean
  compensaEnSiguientePedido: boolean
  metodoPago?: string
  cuentaDestino?: string
  observaciones?: string
  detalles: {
    detalleVentaId?: number
    productoId: number
    cantidadDevuelta: number
    precioUnitario: number
  }[]
}

// ── Listar todas ─────────────────────────────────────────────────────────────
export const useDevoluciones = () =>
  useQuery<Devolucion[]>({
    queryKey: ['devoluciones'],
    queryFn: async () => (await api.get('/devoluciones')).data,
  })

// ── Obtener una ───────────────────────────────────────────────────────────────
export const useDevolucion = (id: number) =>
  useQuery<Devolucion>({
    queryKey: ['devoluciones', id],
    queryFn: async () => (await api.get(`/devoluciones/${id}`)).data,
    enabled: !!id,
  })

// ── Estadísticas ──────────────────────────────────────────────────────────────
export const useEstadisticasDevoluciones = () =>
  useQuery({
    queryKey: ['devoluciones-stats'],
    queryFn: async () => (await api.get('/devoluciones/estadisticas')).data,
  })

// ── Crear ────────────────────────────────────────────────────────────────────
export const useCrearDevolucion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearDevolucionPayload) => api.post('/devoluciones', datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devoluciones'] })
      qc.invalidateQueries({ queryKey: ['devoluciones-stats'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['inventario-consolidado'] })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}

// ── Confirmar depósito ────────────────────────────────────────────────────────
export const useConfirmarDeposito = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.put(`/devoluciones/${id}/confirmar-deposito`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devoluciones'] })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}

// ── Cancelar ─────────────────────────────────────────────────────────────────
export const useCancelarDevolucion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.put(`/devoluciones/${id}/cancelar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devoluciones'] })
    },
  })
}
