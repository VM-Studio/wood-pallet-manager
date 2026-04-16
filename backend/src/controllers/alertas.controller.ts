import { Response } from 'express';
import { AuthRequest } from '../types';
import { getAlertasActivasService } from '../services/alertas.service';

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
