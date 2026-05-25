import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { sendVerificationCode, sendPasswordRecoveryLink } from '../utils/mailer';

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
      cuit: usuario.cuit ?? undefined,
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

// ─── Helpers privados ────────────────────────────────────────────────────────

const generarCodigo = () =>
  String(Math.floor(100000 + Math.random() * 900000));

// ─── Solicitar código de verificación ───────────────────────────────────────
export const solicitarCodigoService = async (
  userId: number,
  tipo: 'cambio_password' | 'cambio_email' | 'cambio_telefono',
  dato?: string, // nuevo email o teléfono (payload)
  canal: 'email' = 'email'
) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario) throw new Error('Usuario no encontrado');

  // Invalidar códigos previos del mismo tipo
  await prisma.verificacionCodigo.updateMany({
    where: { usuarioId: userId, tipo, usado: false },
    data: { usado: true },
  });

  const codigo = generarCodigo();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await prisma.verificacionCodigo.create({
    data: { usuarioId: userId, codigo, tipo, dato, canal, expiresAt },
  });

  // Enviar al email del usuario (canal email)
  await sendVerificationCode({
    to: usuario.email,
    codigo,
    tipo,
    nombre: usuario.nombre,
  });

  return { mensaje: 'Código enviado al email registrado' };
};

// ─── Cambiar contraseña con código ──────────────────────────────────────────
export const cambiarPasswordConCodigoService = async (
  userId: number,
  codigo: string,
  nuevaPassword: string
) => {
  const registro = await prisma.verificacionCodigo.findFirst({
    where: {
      usuarioId: userId,
      tipo: 'cambio_password',
      codigo,
      usado: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!registro) throw new Error('Código inválido o expirado');

  const nuevoHash = await bcrypt.hash(nuevaPassword, 10);
  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash: nuevoHash },
  });

  await prisma.verificacionCodigo.update({
    where: { id: registro.id },
    data: { usado: true },
  });

  return { mensaje: 'Contraseña actualizada correctamente' };
};

// ─── Cambiar email con código ────────────────────────────────────────────────
export const cambiarEmailService = async (
  userId: number,
  codigo: string,
  nuevoEmail: string
) => {
  const registro = await prisma.verificacionCodigo.findFirst({
    where: {
      usuarioId: userId,
      tipo: 'cambio_email',
      codigo,
      usado: false,
      expiresAt: { gt: new Date() },
      dato: nuevoEmail, // verifica que el nuevo email coincide con el solicitado
    },
  });

  if (!registro) throw new Error('Código inválido o expirado');

  const existente = await prisma.usuario.findUnique({ where: { email: nuevoEmail } });
  if (existente && existente.id !== userId)
    throw new Error('Ese email ya está registrado en otra cuenta');

  await prisma.usuario.update({
    where: { id: userId },
    data: { email: nuevoEmail },
  });

  await prisma.verificacionCodigo.update({
    where: { id: registro.id },
    data: { usado: true },
  });

  return { mensaje: 'Email actualizado correctamente', nuevoEmail };
};

// ─── Cambiar teléfono con código ─────────────────────────────────────────────
export const cambiarTelefonoService = async (
  userId: number,
  codigo: string,
  nuevoTelefono: string
) => {
  const registro = await prisma.verificacionCodigo.findFirst({
    where: {
      usuarioId: userId,
      tipo: 'cambio_telefono',
      codigo,
      usado: false,
      expiresAt: { gt: new Date() },
      dato: nuevoTelefono,
    },
  });

  if (!registro) throw new Error('Código inválido o expirado');

  await prisma.usuario.update({
    where: { id: userId },
    data: { telefono: nuevoTelefono },
  });

  await prisma.verificacionCodigo.update({
    where: { id: registro.id },
    data: { usado: true },
  });

  return { mensaje: 'Teléfono actualizado correctamente', nuevoTelefono };
};

// ─── Actualizar foto de perfil ───────────────────────────────────────────────
export const actualizarFotoService = async (userId: number, fotoPerfil: string) => {
  const u = await prisma.usuario.update({
    where: { id: userId },
    data: { fotoPerfil },
    select: { id: true, nombre: true, apellido: true, email: true, rol: true, telefono: true, fotoPerfil: true, firma: true },
  });
  return u;
};

// ─── Actualizar firma digital ────────────────────────────────────────────────
export const actualizarFirmaService = async (userId: number, firma: string) => {
  const u = await prisma.usuario.update({
    where: { id: userId },
    data: { firma },
    select: { id: true, nombre: true, apellido: true, email: true, rol: true, telefono: true, fotoPerfil: true, firma: true },
  });
  return u;
};

// ─── Recuperación de contraseña (desde login) ────────────────────────────────
export const solicitarRecuperacionService = async (email: string) => {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  // Por seguridad, siempre respondemos lo mismo aunque no exista el email
  if (!usuario) return { mensaje: 'Si el email existe, recibirás las instrucciones' };

  // Generar JWT de un solo uso, 30 minutos
  const resetToken = jwt.sign(
    { userId: usuario.id, tipo: 'reset_password' },
    process.env.JWT_SECRET!,
    { expiresIn: '30m' }
  );

  // Guardar registro (para invalidar si ya fue usado)
  await prisma.verificacionCodigo.updateMany({
    where: { usuarioId: usuario.id, tipo: 'recuperacion_password', usado: false },
    data: { usado: true },
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.verificacionCodigo.create({
    data: {
      usuarioId: usuario.id,
      codigo: resetToken, // usamos el campo codigo para guardar el JWT
      tipo: 'recuperacion_password',
      expiresAt,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendPasswordRecoveryLink({
    to: email,
    nombre: usuario.nombre,
    resetLink,
  });

  return { mensaje: 'Si el email existe, recibirás las instrucciones' };
};

// ─── Reset de contraseña con token de recuperación ───────────────────────────
export const resetPasswordService = async (token: string, nuevaPassword: string) => {
  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    throw new Error('El enlace es inválido o ha expirado');
  }

  if (payload.tipo !== 'reset_password') throw new Error('Token inválido');

  // Verificar que el token no fue usado
  const registro = await prisma.verificacionCodigo.findFirst({
    where: {
      usuarioId: payload.userId,
      codigo: token,
      tipo: 'recuperacion_password',
      usado: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!registro) throw new Error('El enlace ya fue utilizado o expiró');

  const nuevoHash = await bcrypt.hash(nuevaPassword, 10);
  await prisma.usuario.update({
    where: { id: payload.userId },
    data: { passwordHash: nuevoHash },
  });

  await prisma.verificacionCodigo.update({
    where: { id: registro.id },
    data: { usado: true },
  });

  return { mensaje: 'Contraseña restablecida correctamente' };
};

// ─── getMeCompleto (para Mi Cuenta) ─────────────────────────────────────────
export const getMeCompletoService = async (userId: number) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true, nombre: true, apellido: true,
      email: true, rol: true, telefono: true,
      fotoPerfil: true, firma: true, fechaCreacion: true,
    },
  });
  if (!usuario) throw new Error('Usuario no encontrado');
  return usuario;
};
