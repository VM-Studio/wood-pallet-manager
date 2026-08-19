import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';
import { parseFechaLocal } from '../utils/fecha';
import {
  getDashboardService,
  getReporteVentasService,
  getTopClientesService,
  getReporteCobranzasService,
  getVentasUltimos12MesesService,
  getGananciasDetalleService,
  parseOtroUsuarioId,
  getReportePdfDataService,
  getMesesConDatosService,
} from '../services/reportes.service';
import { generarReportePdfStream } from '../utils/reportePdf';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  const vista = typeof req.query.vista === 'string' ? req.query.vista : undefined;
  const dashboard = await getDashboardService(req.user!.userId, vista);
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
  } else if (typeof vista === 'string' && parseOtroUsuarioId(vista) !== undefined) {
    resolvedUsuarioId = parseOtroUsuarioId(vista);
  } else if (usuarioId) {
    resolvedUsuarioId = parseInt(usuarioId as string);
  } else {
    resolvedUsuarioId = req.user!.userId;
  }

  const reporte = await getReporteVentasService(
    parseFechaLocal(desde as string),
    parseFechaLocal(hasta as string),
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
    parseFechaLocal(desde as string),
    parseFechaLocal(hasta as string)
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
    } else if (parseOtroUsuarioId(vista) !== undefined) {
      usuarioId = parseOtroUsuarioId(vista);
    }
    // vista === 'todos' o sin vista → usuarioId queda undefined (todos)

    const datos = await getVentasUltimos12MesesService(usuarioId);
    res.json(datos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGananciasDetalle = async (req: AuthRequest, res: Response) => {
  const { vista, desde, hasta } = req.query;

  let usuarioId: number | undefined;
  if (vista === 'mis_datos') {
    usuarioId = req.user!.userId;
  } else if (vista === 'carlos') {
    const carlos = await prisma.usuario.findFirst({ where: { rol: 'propietario_carlos' } });
    usuarioId = carlos?.id;
  } else if (vista === 'juancruz') {
    const juancruz = await prisma.usuario.findFirst({ where: { rol: 'propietario_juancruz' } });
    usuarioId = juancruz?.id;
  } else if (typeof vista === 'string' && parseOtroUsuarioId(vista) !== undefined) {
    usuarioId = parseOtroUsuarioId(vista);
  }
  // vista === 'todos' o sin vista → usuarioId queda undefined (todos)

  const desdeDate = typeof desde === 'string' && desde ? parseFechaLocal(desde) : undefined;
  const hastaDate = typeof hasta === 'string' && hasta ? parseFechaLocal(hasta) : undefined;

  const detalle = await getGananciasDetalleService(desdeDate, hastaDate, usuarioId);
  res.json(detalle);
};

// ─── Meses con datos (para el selector del frontend) ───────────────────────
export const getMesesConDatos = async (_req: AuthRequest, res: Response) => {
  try {
    const meses = await getMesesConDatosService();
    res.json(meses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Reporte PDF de ventas por rango de fechas ─────────────────────────────
// Un único endpoint parametrizado por rango. El selector de "mes" del
// frontend es azúcar sintáctica: traduce el mes elegido a desde/hasta y pega
// a este mismo endpoint. No se generan endpoints separados por mes.
const MESES_MAXIMOS_RANGO = 24;

export const getReportePdf = async (req: AuthRequest, res: Response) => {
  const { desde, hasta } = req.query;

  if (typeof desde !== 'string' || typeof hasta !== 'string' || !desde || !hasta) {
    res.status(400).json({ error: 'Los parámetros desde y hasta son requeridos (formato YYYY-MM-DD).' });
    return;
  }

  let desdeDate: Date;
  let hastaDate: Date;
  try {
    desdeDate = parseFechaLocal(desde);
    hastaDate = parseFechaLocal(hasta);
    if (isNaN(desdeDate.getTime()) || isNaN(hastaDate.getTime())) throw new Error('Fecha inválida');
  } catch {
    res.status(400).json({ error: 'Las fechas enviadas no son válidas.' });
    return;
  }

  // Rango inclusivo en ambos extremos, en hora local Argentina:
  // desde 00:00:00.000 hasta 23:59:59.999.
  desdeDate.setHours(0, 0, 0, 0);
  hastaDate.setHours(23, 59, 59, 999);

  if (desdeDate.getTime() > hastaDate.getTime()) {
    res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a la fecha "hasta".' });
    return;
  }

  const mesesDeRango =
    (hastaDate.getFullYear() - desdeDate.getFullYear()) * 12 +
    (hastaDate.getMonth() - desdeDate.getMonth()) + 1;
  if (mesesDeRango > MESES_MAXIMOS_RANGO) {
    res.status(400).json({ error: `El rango máximo permitido es de ${MESES_MAXIMOS_RANGO} meses.` });
    return;
  }

  try {
    const datos = await getReportePdfDataService(desdeDate, hastaDate);

    const fmtNombreArchivo = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const filename = `reporte_${fmtNombreArchivo(desdeDate)}_${fmtNombreArchivo(hastaDate)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Se streamea directo a la respuesta (doc.pipe(res)): nunca se buferea
    // el PDF completo en memoria ni se persiste en disco/DB.
    const doc = generarReportePdfStream(datos);
    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'No se pudo generar el reporte PDF.' });
  }
};
