import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  listarUsuariosService,
  aprobarUsuarioService,
  rechazarUsuarioService,
  actualizarAccesoUsuarioService,
  cambiarEstadoActivoService,
  listarUsuariosParaVistaService,
} from '../services/usuarios.service';

export const listarUsuarios = async (_req: AuthRequest, res: Response) => {
  try {
    const usuarios = await listarUsuariosService();
    res.json(usuarios);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Endpoint accesible para cualquier usuario autenticado (no solo Carlos):
// alimenta el selector "Mis datos / Otro / Total" del dashboard con la lista
// de usuarios aprobados+activos que tienen habilitado el módulo indicado.
export const listarUsuariosParaVista = async (req: AuthRequest, res: Response) => {
  try {
    const modulo = typeof req.query.modulo === 'string' ? req.query.modulo : 'dashboard';
    const usuarios = await listarUsuariosParaVistaService(req.user!.userId, modulo);
    res.json(usuarios);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const aprobarSchema = z.object({
  rol: z.enum(['propietario_carlos', 'propietario_juancruz', 'admin']),
  modulosPermitidos: z.array(z.string()),
});

export const aprobarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const datos = aprobarSchema.parse(req.body);
    const usuario = await aprobarUsuarioService(id, datos);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const rechazarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { motivo } = z.object({ motivo: z.string().optional() }).parse(req.body ?? {});
    const usuario = await rechazarUsuarioService(id, motivo);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const actualizarAccesoUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { modulosPermitidos } = z.object({ modulosPermitidos: z.array(z.string()) }).parse(req.body);
    const usuario = await actualizarAccesoUsuarioService(id, modulosPermitidos);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const cambiarEstadoActivo = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
    const usuario = await cambiarEstadoActivoService(id, activo);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};
