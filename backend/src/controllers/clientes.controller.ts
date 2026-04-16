import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, parseId } from '../types';
import {
  getClientesService,
  getClienteByIdService,
  crearClienteService,
  actualizarClienteService,
  desactivarClienteService,
  getHistorialClienteService,
  buscarClientesService,
} from '../services/clientes.service';

const crearClienteSchema = z.object({
  razonSocial: z.string().min(1, 'La razón social es requerida'),
  cuit: z.string().optional(),
  nombreContacto: z.string().optional(),
  telefonoContacto: z.string().optional(),
  emailContacto: z.string().email().optional().or(z.literal('')),
  canalEntrada: z
    .enum(['whatsapp', 'formulario_web', 'llamada', 'recomendacion', 'otro'])
    .optional(),
  direccionEntrega: z.string().optional(),
  localidad: z.string().optional(),
  esExportador: z.boolean().optional(),
  observaciones: z.string().optional(),
});

const actualizarClienteSchema = crearClienteSchema.partial();

export const getClientes = async (req: AuthRequest, res: Response) => {
  try {
    const clientes = await getClientesService(req.user!.userId, req.user!.rol);
    res.json(clientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClienteById = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const cliente = await getClienteByIdService(id);
    res.json(cliente);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const crearCliente = async (req: AuthRequest, res: Response) => {
  try {
    const datos = crearClienteSchema.parse(req.body);
    const cliente = await crearClienteService(datos, req.user!.userId);
    res.status(201).json(cliente);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const actualizarCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const datos = actualizarClienteSchema.parse(req.body);
    const cliente = await actualizarClienteService(
      id,
      datos,
      req.user!.userId,
      req.user!.rol
    );
    res.json(cliente);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const desactivarCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const resultado = await desactivarClienteService(id, req.user!.userId, req.user!.rol);
    res.json(resultado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getHistorialCliente = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const historial = await getHistorialClienteService(id);
    res.json(historial);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const buscarClientes = async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ error: 'Ingresá al menos 2 caracteres para buscar' });
    }
    const clientes = await buscarClientesService(query);
    res.json(clientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
