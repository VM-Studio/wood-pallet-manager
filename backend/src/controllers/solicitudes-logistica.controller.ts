import { Request, Response } from 'express';
import {
  crearSolicitudService,
  getSolicitudesService,
  responderSolicitudService,
} from '../services/solicitudes-logistica.service';

export async function crearSolicitud(req: Request, res: Response) {
  try {
    const usuario = (req as any).user;
    const solicitud = await crearSolicitudService(usuario.userId, req.body);
    res.status(201).json(solicitud);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getSolicitudes(req: Request, res: Response) {
  try {
    const usuario = (req as any).user;
    const solicitudes = await getSolicitudesService(usuario.userId, usuario.rol);
    res.json(solicitudes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function responderSolicitud(req: Request, res: Response) {
  try {
    const usuario = (req as any).user;
    const id = parseInt(String(req.params.id));
    const { estado, notasRespuesta } = req.body;
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser aceptada o rechazada' });
    }
    const solicitud = await responderSolicitudService(id, usuario.userId, estado, notasRespuesta);
    res.json(solicitud);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}
