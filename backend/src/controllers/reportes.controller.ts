import { Response } from 'express';
import { AuthRequest } from '../types';
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
  const { desde, hasta, usuarioId } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos' });
    return;
  }

  const reporte = await getReporteVentasService(
    new Date(desde as string),
    new Date(hasta as string),
    usuarioId ? parseInt(usuarioId as string) : undefined
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

export const getEstacionalidad = async (_req: AuthRequest, res: Response) => {
  const datos = await getVentasUltimos12MesesService();
  res.json(datos);
};
