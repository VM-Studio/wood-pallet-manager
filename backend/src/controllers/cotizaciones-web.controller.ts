import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import prisma from '../utils/prisma';
import { enviarNotificacionCotizacionWeb } from '../utils/mailer';
import {
  crearCotizacionWebService,
  getCotizacionesWebService,
  getCotizacionWebByIdService,
  cambiarEstadoCotizacionWebService,
  marcarComoVistaCotizacionWebService,
  getContadorCotizacionesWebService,
  convertirCotizacionWebService,
} from '../services/cotizaciones-web.service';

// ─── Validación del formulario web ───────────────────────────────────────────

const nuevaWebSchema = z.object({
  nombre:           z.string().min(2, 'El nombre es requerido'),
  empresa:          z.string().optional(),
  email:            z.string().email('Email inválido'),
  telefono:         z.string().optional(),
  tipoPallet:       z.string().optional(),
  cantidad:         z.number().int().min(1).optional(),
  fechaNecesidad:   z.string().optional(),
  tipoEntrega:      z.enum(['retira', 'envio']).optional(),
  localidadEntrega: z.string().optional(),
  requiereSenasa:   z.boolean().optional().default(false),
  observaciones:    z.string().optional(),
});

// ─── Endpoint público: recibe formulario web ──────────────────────────────────

export const recibirCotizacionWeb = async (req: Request, res: Response) => {
  try {
    const parsed = nuevaWebSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

    // 1. Guardar en BD
    const cotizacionWeb = await crearCotizacionWebService({
      ...parsed.data,
      ipOrigen: ip,
    });

    // 2. Notificar propietarios por email (en paralelo, sin bloquear la respuesta)
    try {
      const propietarios = await prisma.usuario.findMany({
        where: { activo: true, rol: { in: ['propietario_carlos', 'propietario_juancruz'] } },
        select: { email: true },
      });
      const destinatarios = propietarios.map(p => p.email).filter(Boolean);
      if (destinatarios.length > 0) {
        enviarNotificacionCotizacionWeb({
          destinatarios,
          nombre: parsed.data.nombre,
          empresa: parsed.data.empresa,
          email: parsed.data.email,
          telefono: parsed.data.telefono,
          tipoPallet: parsed.data.tipoPallet,
          cantidad: parsed.data.cantidad,
          fechaNecesidad: parsed.data.fechaNecesidad,
          tipoEntrega: parsed.data.tipoEntrega,
          localidadEntrega: parsed.data.localidadEntrega,
          requiereSenasa: parsed.data.requiereSenasa ?? false,
          observaciones: parsed.data.observaciones,
        }).catch(err => console.error('[CotizacionWeb] Error al enviar email:', err));
      }
    } catch (emailErr) {
      console.error('[CotizacionWeb] Error al buscar propietarios:', emailErr);
    }

    res.status(201).json({ ok: true, id: cotizacionWeb.id });
  } catch (error: any) {
    console.error('[CotizacionWeb] Error:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud' });
  }
};

// ─── Listar cotizaciones web (JWT protegido) ──────────────────────────────────

export const getCotizacionesWeb = async (req: AuthRequest, res: Response) => {
  try {
    const estado = req.query.estado as string | undefined;
    const data = await getCotizacionesWebService(estado);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Detalle + marcar como vista ─────────────────────────────────────────────

export const getCotizacionWebById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    await marcarComoVistaCotizacionWebService(id);
    const data = await getCotizacionWebByIdService(id);
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

// ─── Contador para badge ─────────────────────────────────────────────────────

export const getContadorCotizacionesWeb = async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getContadorCotizacionesWebService();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export const cambiarEstadoCotizacionWeb = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      estado:           z.enum(['pendiente', 'vista', 'convertida', 'descartada']),
      motivoDescarte:   z.string().optional(),
      propietarioAsignadoId: z.number().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const data = await cambiarEstadoCotizacionWebService(id, parsed.data.estado, {
      motivoDescarte: parsed.data.motivoDescarte,
      propietarioAsignadoId: parsed.data.propietarioAsignadoId,
    });
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ─── Convertir a cotización formal ────────────────────────────────────────────

export const convertirCotizacionWeb = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      clienteId:      z.number().optional(),
      nuevoCliente:   z.object({
        razonSocial:       z.string().min(2),
        nombreContacto:    z.string().min(2),
        emailContacto:     z.string().email(),
        telefonoContacto:  z.string().min(7),
        localidad:         z.string().optional(),
      }).optional(),
      precioUnitario: z.number().min(0),
      costoFlete:     z.number().optional(),
      incluyeFlete:   z.boolean().default(false),
    }).refine(d => d.clienteId || d.nuevoCliente, {
      message: 'Debés seleccionar un cliente existente o crear uno nuevo',
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const cotizacion = await convertirCotizacionWebService(id, {
      usuarioId: req.user!.userId,
      ...parsed.data,
    });

    res.status(201).json(cotizacion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
