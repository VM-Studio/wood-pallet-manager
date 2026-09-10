import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  getAlertasActivasService,
  getAlertasResueltasService,
  marcarAlertaResueltaService,
  reabrirAlertaService,
} from '../services/alertas.service';

export const getAlertas = async (req: AuthRequest, res: Response) => {
  const resultado = await getAlertasActivasService();

  if (req.user!.rol !== 'admin') {
    resultado.alertas = resultado.alertas.filter(
      (a) => a.propietario === req.user!.rol || a.propietario === 'ambos'
    );
    resultado.total = resultado.alertas.length;
    resultado.alta = resultado.alertas.filter((a) => a.urgencia === 'alta').length;
    resultado.media = resultado.alertas.filter((a) => a.urgencia === 'media').length;
    resultado.baja = resultado.alertas.filter((a) => a.urgencia === 'baja').length;
  }

  res.json(resultado);
};

export const getAlertasResueltas = async (req: AuthRequest, res: Response) => {
  let resueltas = await getAlertasResueltasService();

  if (req.user!.rol !== 'admin') {
    resueltas = resueltas.filter(
      (a) => a.propietario === req.user!.rol || a.propietario === 'ambos'
    );
  }

  res.json(resueltas);
};

export const marcarAlertaResuelta = async (req: AuthRequest, res: Response) => {
  const { tipo, titulo, detalle, urgencia, propietario, referenciaTipo, referenciaId } = req.body;
  const usuarioId = req.user!.userId;

  const resuelta = await marcarAlertaResueltaService(
    { tipo, titulo, detalle, urgencia, propietario, referenciaTipo, referenciaId: Number(referenciaId) },
    usuarioId
  );

  res.status(201).json(resuelta);
};

export const reabrirAlerta = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await reabrirAlertaService(id);
  res.status(204).send();
};
