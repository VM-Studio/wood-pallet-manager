import { Request, Response } from 'express';
import { z } from 'zod';
import { loginService, crearUsuarioService, getMeService, registerService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

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
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(401).json({ error: error.message });
  }
};

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const datos = crearUsuarioSchema.parse(req.body);
    const usuario = await crearUsuarioService(datos);
    res.status(201).json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
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
    const datos = registerSchema.parse(req.body);
    const usuario = await registerService(datos.nombre, datos.apellido, datos.email, datos.password);
    res.status(201).json(usuario);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: error.message });
  }
};
