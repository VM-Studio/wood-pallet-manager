import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getCotizacionesService,
  getCotizacionByIdService,
  crearCotizacionService,
  actualizarEstadoCotizacionService,
  registrarSeguimientoService,
  convertirCotizacionAVentaService,
  generarTextoWhatsAppService,
  getCotizacionesPendientesService,
} from '../services/cotizaciones.service';
import prisma from '../utils/prisma';
import { enviarPresupuestoPorEmail } from '../utils/mailer';

const detalleSchema = z.object({
  productoId: z.number(),
  cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  esAMedida: z.boolean().optional(),
  especificacion: z
    .object({
      largoMm: z.number().optional(),
      anchoMm: z.number().optional(),
      altoMm: z.number().optional(),
      cargaMaximaKg: z.number().optional(),
      tipoMadera: z.string().optional(),
      observacionesCliente: z.string().optional(),
    })
    .optional(),
});

const crearCotizacionSchema = z.object({
  clienteId: z.number(),
  incluyeFlete: z.boolean().default(false),
  costoFlete: z.number().optional(),
  fleteIncluido: z.boolean().optional(),
  requiereSenasa: z.boolean().default(false),
  costoSenasa: z.number().optional(),
  canalEnvio: z.enum(['whatsapp', 'email']).optional(),
  observaciones: z.string().optional(),
  detalles: z.array(detalleSchema).min(1, 'Debe haber al menos un producto'),
});

const seguimientoSchema = z.object({
  tipoContacto: z.enum(['whatsapp', 'llamada', 'email', 'presencial']),
  resultado: z.enum(['sin_respuesta', 'interesado', 'no_interesado', 'cerrado', 'reprogramado']),
  observaciones: z.string().optional(),
  proximoContacto: z.string().optional(),
});

const convertirSchema = z.object({
  tipoEntrega: z.enum(['retira_cliente', 'envio_woodpallet']),
  fechaEstimEntrega: z.string().optional(),
  observaciones: z.string().optional(),
  medioPago: z.enum(['transferencia', 'e_check', 'efectivo']),
  modalidadPago: z.enum(['completo_anticipado', 'completo_entrega', 'mitad_adelanto_mitad_entrega']),
});

export const getCotizaciones = async (req: AuthRequest, res: Response) => {
  try {
    const cotizaciones = await getCotizacionesService(req.user!.userId, req.user!.rol);
    res.json(cotizaciones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCotizacionById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const cotizacion = await getCotizacionByIdService(id);
    res.json(cotizacion);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const crearCotizacion = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearCotizacionSchema.parse(req.body);
    const cotizacion = await crearCotizacionService(datos, req.user!.userId);
    res.status(201).json(cotizacion);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const actualizarEstado = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { estado } = req.body;
    const cotizacion = await actualizarEstadoCotizacionService(id, estado, req.user!.userId);
    res.json(cotizacion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const registrarSeguimiento = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const datos = seguimientoSchema.parse(req.body);
    const seguimiento = await registrarSeguimientoService(
      id,
      {
        ...datos,
        proximoContacto: datos.proximoContacto ? new Date(datos.proximoContacto) : undefined,
      },
      req.user!.userId
    );
    res.status(201).json(seguimiento);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const convertirAVenta = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const datos = convertirSchema.parse(req.body);
    const venta = await convertirCotizacionAVentaService(
      id,
      {
        ...datos,
        fechaEstimEntrega: datos.fechaEstimEntrega ? new Date(datos.fechaEstimEntrega) : undefined,
      },
      req.user!.userId
    );
    res.status(201).json(venta);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getTextoWhatsApp = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const resultado = await generarTextoWhatsAppService(id);
    res.json(resultado);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getCotizacionesPendientes = async (req: AuthRequest, res: Response) => {
  try {
    const pendientes = await getCotizacionesPendientesService();
    res.json(pendientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const enviarEmailCotizacion = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { pdfBase64, filename, razonSocial, emailDestino, fecha } = req.body;

    if (!pdfBase64 || !emailDestino) {
      return res.status(400).json({ error: 'Faltan datos para enviar el email' });
    }

    await enviarPresupuestoPorEmail({
      destinatario: emailDestino,
      razonSocial:  razonSocial ?? '',
      numeroCotizacion: id,
      fecha:   fecha ?? new Date().toLocaleDateString('es-AR'),
      pdfBase64,
      filename: filename ?? `presupuesto-${id}.pdf`,
    });

    res.json({ ok: true, message: 'Email enviado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al enviar el email' });
  }
};

export const eliminarCotizacion = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);

    // 1. Desvincular venta que referencia a esta cotización (FK opcional)
    await prisma.venta.updateMany({
      where: { cotizacionId: id },
      data: { cotizacionId: null },
    });

    // 2. Borrar EspecificacionMedida (FK a DetalleCotizacion)
    const detalles = await prisma.detalleCotizacion.findMany({ where: { cotizacionId: id }, select: { id: true } });
    const detalleIds = detalles.map(d => d.id);
    if (detalleIds.length) {
      await prisma.especificacionMedida.deleteMany({ where: { detalleCotizacionId: { in: detalleIds } } });
    }

    // 3. Borrar detalles
    await prisma.detalleCotizacion.deleteMany({ where: { cotizacionId: id } });

    // 4. Borrar seguimientos
    await prisma.seguimientoCotizacion.deleteMany({ where: { cotizacionId: id } });

    // 5. Borrar la cotización
    await prisma.cotizacion.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar cotización:', err);
    res.status(500).json({ error: 'No se pudo eliminar la cotización' });
  }
};
