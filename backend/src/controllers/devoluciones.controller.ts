import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getDevolucionesService,
  getDevolucionByIdService,
  crearDevolucionService,
  confirmarDepositoService,
  cancelarDevolucionService,
  getEstadisticasDevolucionesService,
} from '../services/devoluciones.service';

const detalleSchema = z.object({
  detalleVentaId: z.number().int().positive().optional(),
  productoId: z.number().int().positive(),
  cantidadDevuelta: z.number().int().positive(),
  precioUnitario: z.number().positive(),
});

const crearSchema = z.object({
  ventaId: z.number().int().positive(),
  tipoCaso: z.enum(['pallet_danado', 'cliente_no_quiere', 'devolucion_parcial', 'cancelacion_anticipada']),
  devuelveFlete: z.boolean().default(false),
  devuelveSenasa: z.boolean().default(false),
  compensaEnSiguientePedido: z.boolean().default(false),
  metodoPago: z.enum(['transferencia', 'e_check', 'efectivo']).optional(),
  cuentaDestino: z.string().optional(),
  observaciones: z.string().optional(),
  detalles: z.array(detalleSchema).min(1, 'Debe haber al menos un producto a devolver'),
});

export const getDevoluciones = async (req: AuthRequest, res: Response) => {
  try {
    const devoluciones = await getDevolucionesService(req.user!.userId);
    res.json(devoluciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener devoluciones' });
  }
};

export const getDevolucionById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const devolucion = await getDevolucionByIdService(id);
    if (!devolucion) return res.status(404).json({ error: 'Devolución no encontrada' });
    res.json(devolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener devolución' });
  }
};

export const crearDevolucion = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearSchema.parse(req.body);
    const devolucion = await crearDevolucionService(datos, req.user!.userId);
    res.status(201).json(devolucion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error al crear devolución' });
  }
};

export const confirmarDeposito = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const devolucion = await confirmarDepositoService(id, req.user!.userId);
    res.json(devolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error al confirmar depósito' });
  }
};

export const cancelarDevolucion = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const devolucion = await cancelarDevolucionService(id);
    res.json(devolucion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error al cancelar devolución' });
  }
};

export const getEstadisticasDevoluciones = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getEstadisticasDevolucionesService();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
