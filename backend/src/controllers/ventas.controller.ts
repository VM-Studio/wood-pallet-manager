import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getVentasService,
  getVentaByIdService,
  actualizarEstadoVentaService,
  registrarRetiroParcialService,
  getResumenRetiroService,
  getVentasActivasService,
  getVentasPorPeriodoService,
} from '../services/ventas.service';
import prisma from '../utils/prisma';

const actualizarEstadoSchema = z.object({
  estado: z.enum([
    'confirmado',
    'en_preparacion',
    'listo_para_envio',
    'en_transito',
    'entregado',
    'entregado_parcial',
    'cancelado',
  ]),
});

const retiroParcialSchema = z.object({
  detalleVentaId: z.number(),
  cantidadRetirada: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
});

export const getVentas = async (req: AuthRequest, res: Response) => {
  try {
    const ventas = await getVentasService(req.user!.userId, req.user!.rol);
    res.json(ventas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVentaById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const venta = await getVentaByIdService(id);
    res.json(venta);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const actualizarEstadoVenta = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { estado } = actualizarEstadoSchema.parse(req.body);
    const venta = await actualizarEstadoVentaService(id, estado);
    res.json(venta);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const registrarRetiro = async (req: AuthRequest, res: Response) => {
  try {
    const datos = retiroParcialSchema.parse(req.body);
    const resultado = await registrarRetiroParcialService(
      datos.detalleVentaId,
      datos.cantidadRetirada,
      req.user!.userId
    );
    res.status(201).json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getResumenRetiro = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const resumen = await getResumenRetiroService(id);
    res.json(resumen);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVentasActivas = async (req: AuthRequest, res: Response) => {
  try {
    const ventas = await getVentasActivasService();
    res.json(ventas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVentasPorPeriodo = async (req: AuthRequest, res: Response) => {
  try {
    const { desde, hasta, usuarioId } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
    }
    const resultado = await getVentasPorPeriodoService(
      new Date(desde as string),
      new Date(hasta as string),
      usuarioId ? parseInt(usuarioId as string) : undefined
    );
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const eliminarVenta = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);

    // 1. Desvincular Compras que referencian esta venta (FK opcional)
    await prisma.compra.updateMany({ where: { ventaId: id }, data: { ventaId: null } });

    // 2. Desvincular SolicitudLogistica (FK opcional)
    await prisma.solicitudLogistica.updateMany({ where: { ventaId: id }, data: { ventaId: null } });

    // 3. EspecificacionMedida vinculada a DetalleVenta
    const detalles = await prisma.detalleVenta.findMany({ where: { ventaId: id }, select: { id: true } });
    const detalleIds = detalles.map(d => d.id);
    if (detalleIds.length) {
      await prisma.especificacionMedida.deleteMany({ where: { detalleVentaId: { in: detalleIds } } });
      await prisma.retiroParcial.deleteMany({ where: { detalleVentaId: { in: detalleIds } } });
    }

    // 4. Detalles de venta
    await prisma.detalleVenta.deleteMany({ where: { ventaId: id } });

    // 5. Pagos y facturas
    await prisma.pagoCobro.deleteMany({ where: { factura: { ventaId: id } } });
    await prisma.factura.deleteMany({ where: { ventaId: id } });

    // 6. Logística
    await prisma.logistica.deleteMany({ where: { ventaId: id } });

    // 7. Venta
    await prisma.venta.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ error: 'No se pudo eliminar la venta' });
  }
};
