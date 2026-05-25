import { Request, Response } from 'express';
import { z } from 'zod';
import {
  loginService, crearUsuarioService, getMeService, registerService,
  actualizarPerfilService, cambiarPasswordService,
  solicitarCodigoService, cambiarPasswordConCodigoService,
  cambiarEmailService, cambiarTelefonoService,
  actualizarFotoService, actualizarFirmaService,
  solicitarRecuperacionService, resetPasswordService,
  getMeCompletoService,
} from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.enum(['propietario_carlos', 'propietario_juancruz', 'admin']),
  telefono: z.string().optional(),
});

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().optional().default(''),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const login = async (req: Request, res: Response) => {
  try {
    const datos = loginSchema.parse(req.body);
    const resultado = await loginService(datos.email, datos.password);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(401).json({ error: error.message });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const cantidadUsuarios = await prisma.usuario.count();
    if (cantidadUsuarios >= 2) {
      return res.status(403).json({
        error: 'El sistema ya tiene los dos usuarios configurados. Contactá al administrador.'
      });
    }
    const datos = crearUsuarioSchema.parse(req.body);
    const usuario = await crearUsuarioService(datos);
    res.status(201).json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const usuario = await getMeService(userId);
    res.json(usuario);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const cantidadUsuarios = await prisma.usuario.count();
    if (cantidadUsuarios >= 2) {
      return res.status(403).json({
        error: 'El sistema ya tiene los dos usuarios configurados. Contactá al administrador.'
      });
    }
    const datos = registerSchema.parse(req.body);
    const usuario = await registerService(datos.nombre, datos.apellido, datos.email, datos.password);
    res.status(201).json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const actualizarPerfil = async (req: AuthRequest, res: Response) => {
  try {
    const datos = z.object({
      nombre:   z.string().min(1),
      apellido: z.string().min(1),
      telefono: z.string().optional()
    }).parse(req.body);

    const usuario = await actualizarPerfilService(req.user!.userId, datos);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

export const cambiarPassword = async (req: AuthRequest, res: Response) => {
  try {
    const datos = z.object({
      passwordActual: z.string().min(1),
      passwordNuevo:  z.string().min(6)
    }).parse(req.body);

    const resultado = await cambiarPasswordService(
      req.user!.userId,
      datos.passwordActual,
      datos.passwordNuevo
    );
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};

// ─── Mi Cuenta ──────────────────────────────────────────────────────────────

export const getMeCompleto = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await getMeCompletoService(req.user!.userId);
    res.json(usuario);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const solicitarCodigo = async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, dato, canal } = z.object({
      tipo:  z.enum(['cambio_password', 'cambio_email', 'cambio_telefono']),
      dato:  z.string().optional(),
      canal: z.enum(['email']).default('email'),
    }).parse(req.body);

    const resultado = await solicitarCodigoService(req.user!.userId, tipo, dato, canal);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const cambiarPasswordConCodigo = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo, nuevaPassword } = z.object({
      codigo:        z.string().length(6),
      nuevaPassword: z.string().min(6),
    }).parse(req.body);

    const resultado = await cambiarPasswordConCodigoService(req.user!.userId, codigo, nuevaPassword);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const cambiarEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo, nuevoEmail } = z.object({
      codigo:     z.string().length(6),
      nuevoEmail: z.string().email(),
    }).parse(req.body);

    const resultado = await cambiarEmailService(req.user!.userId, codigo, nuevoEmail);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const cambiarTelefono = async (req: AuthRequest, res: Response) => {
  try {
    const { codigo, nuevoTelefono } = z.object({
      codigo:        z.string().length(6),
      nuevoTelefono: z.string().min(6),
    }).parse(req.body);

    const resultado = await cambiarTelefonoService(req.user!.userId, codigo, nuevoTelefono);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const actualizarFoto = async (req: AuthRequest, res: Response) => {
  try {
    const { fotoPerfil } = z.object({ fotoPerfil: z.string().min(1) }).parse(req.body);
    const usuario = await actualizarFotoService(req.user!.userId, fotoPerfil);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const actualizarFirma = async (req: AuthRequest, res: Response) => {
  try {
    const { firma } = z.object({ firma: z.string().min(1) }).parse(req.body);
    const usuario = await actualizarFirmaService(req.user!.userId, firma);
    res.json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const recuperarPassword = async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const resultado = await solicitarRecuperacionService(email);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, nuevaPassword } = z.object({
      token:         z.string().min(1),
      nuevaPassword: z.string().min(6),
    }).parse(req.body);

    const resultado = await resetPasswordService(token, nuevaPassword);
    res.json(resultado);
  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.issues[0].message });
    res.status(400).json({ error: error.message });
  }
};
