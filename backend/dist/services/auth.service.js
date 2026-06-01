"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeCompletoService = exports.resetPasswordService = exports.solicitarRecuperacionService = exports.actualizarFirmaService = exports.actualizarFotoService = exports.cambiarTelefonoService = exports.cambiarEmailService = exports.cambiarPasswordConCodigoService = exports.solicitarCodigoService = exports.registerService = exports.getMeService = exports.crearUsuarioService = exports.cambiarPasswordService = exports.actualizarPerfilService = exports.loginService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const mailer_1 = require("../utils/mailer");
const loginService = async (email, password) => {
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { email },
    });
    if (!usuario) {
        throw new Error('Email o contraseña incorrectos');
    }
    if (!usuario.activo) {
        throw new Error('Usuario inactivo. Contactá al administrador');
    }
    const passwordValido = await bcrypt_1.default.compare(password, usuario.passwordHash);
    if (!passwordValido) {
        throw new Error('Email o contraseña incorrectos');
    }
    const token = jsonwebtoken_1.default.sign({
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
    }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
exports.loginService = loginService;
const actualizarPerfilService = async (userId, datos) => {
    const u = await prisma_1.default.usuario.update({
        where: { id: userId },
        data: datos,
        select: {
            id: true, nombre: true, apellido: true,
            email: true, rol: true, telefono: true
        }
    });
    return u;
};
exports.actualizarPerfilService = actualizarPerfilService;
const cambiarPasswordService = async (userId, passwordActual, passwordNuevo) => {
    const u = await prisma_1.default.usuario.findUnique({ where: { id: userId } });
    if (!u)
        throw new Error('Usuario no encontrado');
    const valido = await bcrypt_1.default.compare(passwordActual, u.passwordHash);
    if (!valido)
        throw new Error('La contraseña actual es incorrecta');
    const nuevoHash = await bcrypt_1.default.hash(passwordNuevo, 10);
    await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { passwordHash: nuevoHash }
    });
    return { mensaje: 'Contraseña actualizada correctamente' };
};
exports.cambiarPasswordService = cambiarPasswordService;
const crearUsuarioService = async (datos) => {
    const usuarioExistente = await prisma_1.default.usuario.findUnique({
        where: { email: datos.email },
    });
    if (usuarioExistente) {
        throw new Error('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt_1.default.hash(datos.password, 10);
    const usuario = await prisma_1.default.usuario.create({
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
exports.crearUsuarioService = crearUsuarioService;
const getMeService = async (userId) => {
    const usuario = await prisma_1.default.usuario.findUnique({
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
exports.getMeService = getMeService;
const registerService = async (nombre, apellido, email, password) => {
    const existente = await prisma_1.default.usuario.findUnique({ where: { email } });
    if (existente) {
        throw new Error('Ya existe una cuenta con ese email');
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const usuario = await prisma_1.default.usuario.create({
        data: {
            nombre,
            apellido,
            email,
            passwordHash,
            rol: 'admin',
        },
    });
    const token = jsonwebtoken_1.default.sign({ userId: usuario.id, email: usuario.email, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
exports.registerService = registerService;
// ─── Helpers privados ────────────────────────────────────────────────────────
const generarCodigo = () => String(Math.floor(100000 + Math.random() * 900000));
// ─── Solicitar código de verificación ───────────────────────────────────────
const solicitarCodigoService = async (userId, tipo, dato, // nuevo email o teléfono (payload)
canal = 'email') => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { id: userId } });
    if (!usuario)
        throw new Error('Usuario no encontrado');
    // Invalidar códigos previos del mismo tipo
    await prisma_1.default.verificacionCodigo.updateMany({
        where: { usuarioId: userId, tipo, usado: false },
        data: { usado: true },
    });
    const codigo = generarCodigo();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await prisma_1.default.verificacionCodigo.create({
        data: { usuarioId: userId, codigo, tipo, dato, canal, expiresAt },
    });
    // Enviar al email del usuario (canal email)
    await (0, mailer_1.sendVerificationCode)({
        to: usuario.email,
        codigo,
        tipo,
        nombre: usuario.nombre,
    });
    return { mensaje: 'Código enviado al email registrado' };
};
exports.solicitarCodigoService = solicitarCodigoService;
// ─── Cambiar contraseña con código ──────────────────────────────────────────
const cambiarPasswordConCodigoService = async (userId, codigo, nuevaPassword) => {
    const registro = await prisma_1.default.verificacionCodigo.findFirst({
        where: {
            usuarioId: userId,
            tipo: 'cambio_password',
            codigo,
            usado: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!registro)
        throw new Error('Código inválido o expirado');
    const nuevoHash = await bcrypt_1.default.hash(nuevaPassword, 10);
    await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { passwordHash: nuevoHash },
    });
    await prisma_1.default.verificacionCodigo.update({
        where: { id: registro.id },
        data: { usado: true },
    });
    return { mensaje: 'Contraseña actualizada correctamente' };
};
exports.cambiarPasswordConCodigoService = cambiarPasswordConCodigoService;
// ─── Cambiar email con código ────────────────────────────────────────────────
const cambiarEmailService = async (userId, codigo, nuevoEmail) => {
    const registro = await prisma_1.default.verificacionCodigo.findFirst({
        where: {
            usuarioId: userId,
            tipo: 'cambio_email',
            codigo,
            usado: false,
            expiresAt: { gt: new Date() },
            dato: nuevoEmail, // verifica que el nuevo email coincide con el solicitado
        },
    });
    if (!registro)
        throw new Error('Código inválido o expirado');
    const existente = await prisma_1.default.usuario.findUnique({ where: { email: nuevoEmail } });
    if (existente && existente.id !== userId)
        throw new Error('Ese email ya está registrado en otra cuenta');
    await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { email: nuevoEmail },
    });
    await prisma_1.default.verificacionCodigo.update({
        where: { id: registro.id },
        data: { usado: true },
    });
    return { mensaje: 'Email actualizado correctamente', nuevoEmail };
};
exports.cambiarEmailService = cambiarEmailService;
// ─── Cambiar teléfono con código ─────────────────────────────────────────────
const cambiarTelefonoService = async (userId, codigo, nuevoTelefono) => {
    const registro = await prisma_1.default.verificacionCodigo.findFirst({
        where: {
            usuarioId: userId,
            tipo: 'cambio_telefono',
            codigo,
            usado: false,
            expiresAt: { gt: new Date() },
            dato: nuevoTelefono,
        },
    });
    if (!registro)
        throw new Error('Código inválido o expirado');
    await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { telefono: nuevoTelefono },
    });
    await prisma_1.default.verificacionCodigo.update({
        where: { id: registro.id },
        data: { usado: true },
    });
    return { mensaje: 'Teléfono actualizado correctamente', nuevoTelefono };
};
exports.cambiarTelefonoService = cambiarTelefonoService;
// ─── Actualizar foto de perfil ───────────────────────────────────────────────
const actualizarFotoService = async (userId, fotoPerfil) => {
    const u = await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { fotoPerfil },
        select: { id: true, nombre: true, apellido: true, email: true, rol: true, telefono: true, fotoPerfil: true, firma: true },
    });
    return u;
};
exports.actualizarFotoService = actualizarFotoService;
// ─── Actualizar firma digital ────────────────────────────────────────────────
const actualizarFirmaService = async (userId, firma) => {
    const u = await prisma_1.default.usuario.update({
        where: { id: userId },
        data: { firma },
        select: { id: true, nombre: true, apellido: true, email: true, rol: true, telefono: true, fotoPerfil: true, firma: true },
    });
    return u;
};
exports.actualizarFirmaService = actualizarFirmaService;
// ─── Recuperación de contraseña (desde login) ────────────────────────────────
const solicitarRecuperacionService = async (email) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { email } });
    // Por seguridad, siempre respondemos lo mismo aunque no exista el email
    if (!usuario)
        return { mensaje: 'Si el email existe, recibirás las instrucciones' };
    // Generar JWT de un solo uso, 30 minutos
    const resetToken = jsonwebtoken_1.default.sign({ userId: usuario.id, tipo: 'reset_password' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    // Guardar registro (para invalidar si ya fue usado)
    await prisma_1.default.verificacionCodigo.updateMany({
        where: { usuarioId: usuario.id, tipo: 'recuperacion_password', usado: false },
        data: { usado: true },
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma_1.default.verificacionCodigo.create({
        data: {
            usuarioId: usuario.id,
            codigo: resetToken, // usamos el campo codigo para guardar el JWT
            tipo: 'recuperacion_password',
            expiresAt,
        },
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    await (0, mailer_1.sendPasswordRecoveryLink)({
        to: email,
        nombre: usuario.nombre,
        resetLink,
    });
    return { mensaje: 'Si el email existe, recibirás las instrucciones' };
};
exports.solicitarRecuperacionService = solicitarRecuperacionService;
// ─── Reset de contraseña con token de recuperación ───────────────────────────
const resetPasswordService = async (token, nuevaPassword) => {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch {
        throw new Error('El enlace es inválido o ha expirado');
    }
    if (payload.tipo !== 'reset_password')
        throw new Error('Token inválido');
    // Verificar que el token no fue usado
    const registro = await prisma_1.default.verificacionCodigo.findFirst({
        where: {
            usuarioId: payload.userId,
            codigo: token,
            tipo: 'recuperacion_password',
            usado: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!registro)
        throw new Error('El enlace ya fue utilizado o expiró');
    const nuevoHash = await bcrypt_1.default.hash(nuevaPassword, 10);
    await prisma_1.default.usuario.update({
        where: { id: payload.userId },
        data: { passwordHash: nuevoHash },
    });
    await prisma_1.default.verificacionCodigo.update({
        where: { id: registro.id },
        data: { usado: true },
    });
    return { mensaje: 'Contraseña restablecida correctamente' };
};
exports.resetPasswordService = resetPasswordService;
// ─── getMeCompleto (para Mi Cuenta) ─────────────────────────────────────────
const getMeCompletoService = async (userId) => {
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { id: userId },
        select: {
            id: true, nombre: true, apellido: true,
            email: true, rol: true, telefono: true,
            fotoPerfil: true, firma: true, fechaCreacion: true,
        },
    });
    if (!usuario)
        throw new Error('Usuario no encontrado');
    return usuario;
};
exports.getMeCompletoService = getMeCompletoService;
