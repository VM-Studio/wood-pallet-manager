import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import prisma from '../utils/prisma';
import {
  getComprasService,
  getCompraByIdService,
  crearCompraService,
  actualizarEstadoCompraService,
  registrarPagoProveedorService,
  getDeudaProveedoresService,
} from '../services/compras.service';

export const getCompras = async (req: AuthRequest, res: Response) => {
  try {
    const vista = req.query.vista as string | undefined;

    let usuarioId = req.user!.userId;
    let rol = req.user!.rol;

    if (vista === 'carlos') {
      const carlos = await prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
      if (carlos) { usuarioId = carlos.id; rol = carlos.rol; }
    } else if (vista === 'juancruz') {
      const juancruz = await prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
      if (juancruz) { usuarioId = juancruz.id; rol = juancruz.rol; }
    } else if (vista === 'todos') {
      rol = 'admin'; // devuelve todas
    }
    // 'mis_datos' o sin vista → usa el usuario del token (default)

    const compras = await getComprasService(usuarioId, rol);
    res.json(compras);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCompraById = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const compra = await getCompraByIdService(id);
  res.json(compra);
};

export const crearCompra = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    proveedorId: z.number().int().positive(),
    detalles: z.array(z.object({
      productoId: z.number().int().positive(),
      cantidad: z.number().int().positive(),
      precioCostoUnit: z.number().positive(),
    })).min(1),
    observaciones: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const compra = await crearCompraService(parsed.data, req.user!.userId, req.user!.rol);
  res.status(201).json(compra);
};

export const actualizarEstadoCompra = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({ estado: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const compra = await actualizarEstadoCompraService(id, parsed.data.estado as any);
  res.json(compra);
};

export const registrarPago = async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id);
  const schema = z.object({
    monto: z.number().positive(),
    medioPago: z.enum(['transferencia', 'e_check', 'efectivo']),
    nroComprobante: z.string().optional(),
    observaciones: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const pago = await registrarPagoProveedorService(id, parsed.data, req.user!.userId);
  res.status(201).json(pago);
};

export const getDeudaProveedores = async (_req: Request, res: Response) => {
  const deuda = await getDeudaProveedoresService();
  res.json(deuda);
};
