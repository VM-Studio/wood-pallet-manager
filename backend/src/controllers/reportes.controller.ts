import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import {
  getDashboardService,
  getReporteVentasService,
  getTopClientesService,
  getReporteCobranzasService,
  getVentasUltimos12MesesService,
} from '../services/reportes.service';

export const getDashboard = async (_req: AuthRequest, res: Response) => {
  const dashboard = await getDashboardService();
  res.json(dashboard);
};

export const getReporteVentas = async (req: AuthRequest, res: Response) => {
  const { desde, hasta, usuarioId, vista } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
    return;
  }

  let resolvedUsuarioId: number | undefined;
  if (vista === 'mis_datos') {
    resolvedUsuarioId = req.user!.userId;
  } else if (vista === 'carlos') {
    const carlos = await prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
    resolvedUsuarioId = carlos?.id;
  } else if (vista === 'juancruz') {
    const juancruz = await prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
    resolvedUsuarioId = juancruz?.id;
  } else if (vista === 'todos') {
    resolvedUsuarioId = undefined;
  } else if (usuarioId) {
    resolvedUsuarioId = parseInt(usuarioId as string);
  } else {
    resolvedUsuarioId = req.user!.userId;
  }

  const reporte = await getReporteVentasService(
    new Date(desde as string),
    new Date(hasta as string),
    resolvedUsuarioId
  );
  res.json(reporte);
};

export const getTopClientes = async (req: AuthRequest, res: Response) => {
  const limite = req.query.limite ? parseInt(req.query.limite as string) : 10;
  const clientes = await getTopClientesService(limite);
  res.json(clientes);
};

export const getReporteCobranzas = async (req: AuthRequest, res: Response) => {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
    return;
  }

  const reporte = await getReporteCobranzasService(
    new Date(desde as string),
    new Date(hasta as string)
  );
  res.json(reporte);
};

export const getEstacionalidad = async (req: AuthRequest, res: Response) => {
  try {
    const vista = req.query.vista as string;

    let usuarioId: number | undefined;
    if (vista === 'mis_datos') {
      usuarioId = req.user!.userId;
    } else if (vista === 'carlos') {
      const carlos = await prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
      usuarioId = carlos?.id;
    } else if (vista === 'juancruz') {
      const juancruz = await prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
      usuarioId = juancruz?.id;
    }
    // vista === 'todos' o sin vista → usuarioId queda undefined (todos)

    const datos = await getVentasUltimos12MesesService(usuarioId);
    res.json(datos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
