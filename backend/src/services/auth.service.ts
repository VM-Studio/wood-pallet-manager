import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const loginService = async (email: string, password: string) => {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw new Error('Email o contraseña incorrectos');
  }

  if (!usuario.activo) {
    throw new Error('Usuario inactivo. Contactá al administrador');
  }

  const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

  if (!passwordValido) {
    throw new Error('Email o contraseña incorrectos');
  }

  const token = jwt.sign(
    {
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
};

export const actualizarPerfilService = async (
  userId: number,
  datos: { nombre: string; apellido: string; telefono?: string }
) => {
  const u = await prisma.usuario.update({
    where: { id: userId },
    data: datos,
    select: {
      id: true, nombre: true, apellido: true,
      email: true, rol: true, telefono: true
    }
  });
  return u;
};

export const cambiarPasswordService = async (
  userId: number,
  passwordActual: string,
  passwordNuevo: string
) => {
  const u = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!u) throw new Error('Usuario no encontrado');

  const valido = await bcrypt.compare(passwordActual, u.passwordHash);
  if (!valido) throw new Error('La contraseña actual es incorrecta');

  const nuevoHash = await bcrypt.hash(passwordNuevo, 10);
  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash: nuevoHash }
  });

  return { mensaje: 'Contraseña actualizada correctamente' };
};export const crearUsuarioService = async (datos: {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin';
  telefono?: string;
}) => {
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: datos.email },
  });

  if (usuarioExistente) {
    throw new Error('Ya existe un usuario con ese email');
  }

  const passwordHash = await bcrypt.hash(datos.password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      passwordHash,
      rol: datos.rol,
      telefono: datos.telefono,
    },
  });

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
};

export const getMeService = async (userId: number) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      rol: true,
      telefono: true,
      fechaCreacion: true,
    },
  });

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  return usuario;
};

export const registerService = async (
  nombre: string,
  apellido: string,
  email: string,
  password: string,
) => {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    throw new Error('Ya existe una cuenta con ese email');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      apellido,
      email,
      passwordHash,
      rol: 'admin',
    },
  });

  const token = jwt.sign(
    { userId: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    },
  };
};
