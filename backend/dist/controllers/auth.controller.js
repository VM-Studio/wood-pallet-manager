"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.recuperarPassword = exports.actualizarFirma = exports.actualizarFoto = exports.cambiarTelefono = exports.cambiarEmail = exports.cambiarPasswordConCodigo = exports.solicitarCodigo = exports.getMeCompleto = exports.cambiarPassword = exports.actualizarPerfil = exports.register = exports.getMe = exports.crearUsuario = exports.login = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
const crearUsuarioSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es requerido'),
    apellido: zod_1.z.string().min(1, 'El apellido es requerido'),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    rol: zod_1.z.enum(['propietario_carlos', 'propietario_juancruz', 'admin']),
    telefono: zod_1.z.string().optional(),
});
const registerSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es requerido'),
    apellido: zod_1.z.string().optional().default(''),
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});
const login = async (req, res) => {
    try {
        const datos = loginSchema.parse(req.body);
        const resultado = await (0, auth_service_1.loginService)(datos.email, datos.password);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(401).json({ error: error.message });
    }
};
exports.login = login;
const crearUsuario = async (req, res) => {
    try {
        const cantidadUsuarios = await prisma_1.default.usuario.count();
        if (cantidadUsuarios >= 2) {
            return res.status(403).json({
                error: 'El sistema ya tiene los dos usuarios configurados. Contactá al administrador.'
            });
        }
        const datos = crearUsuarioSchema.parse(req.body);
        const usuario = await (0, auth_service_1.crearUsuarioService)(datos);
        res.status(201).json(usuario);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.crearUsuario = crearUsuario;
const getMe = async (req, res) => {
    try {
        const userId = req.user.userId;
        const usuario = await (0, auth_service_1.getMeService)(userId);
        res.json(usuario);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getMe = getMe;
const register = async (req, res) => {
    try {
        const cantidadUsuarios = await prisma_1.default.usuario.count();
        if (cantidadUsuarios >= 2) {
            return res.status(403).json({
                error: 'El sistema ya tiene los dos usuarios configurados. Contactá al administrador.'
            });
        }
        const datos = registerSchema.parse(req.body);
        const usuario = await (0, auth_service_1.registerService)(datos.nombre, datos.apellido, datos.email, datos.password);
        res.status(201).json(usuario);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.register = register;
const actualizarPerfil = async (req, res) => {
    try {
        const datos = zod_1.z.object({
            nombre: zod_1.z.string().min(1),
            apellido: zod_1.z.string().min(1),
            telefono: zod_1.z.string().optional()
        }).parse(req.body);
        const usuario = await (0, auth_service_1.actualizarPerfilService)(req.user.userId, datos);
        res.json(usuario);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarPerfil = actualizarPerfil;
const cambiarPassword = async (req, res) => {
    try {
        const datos = zod_1.z.object({
            passwordActual: zod_1.z.string().min(1),
            passwordNuevo: zod_1.z.string().min(6)
        }).parse(req.body);
        const resultado = await (0, auth_service_1.cambiarPasswordService)(req.user.userId, datos.passwordActual, datos.passwordNuevo);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(400).json({ error: error.message });
    }
};
exports.cambiarPassword = cambiarPassword;
// ─── Mi Cuenta ──────────────────────────────────────────────────────────────
const getMeCompleto = async (req, res) => {
    try {
        const usuario = await (0, auth_service_1.getMeCompletoService)(req.user.userId);
        res.json(usuario);
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.getMeCompleto = getMeCompleto;
const solicitarCodigo = async (req, res) => {
    try {
        const { tipo, dato, canal } = zod_1.z.object({
            tipo: zod_1.z.enum(['cambio_password', 'cambio_email', 'cambio_telefono']),
            dato: zod_1.z.string().optional(),
            canal: zod_1.z.enum(['email']).default('email'),
        }).parse(req.body);
        const resultado = await (0, auth_service_1.solicitarCodigoService)(req.user.userId, tipo, dato, canal);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.solicitarCodigo = solicitarCodigo;
const cambiarPasswordConCodigo = async (req, res) => {
    try {
        const { codigo, nuevaPassword } = zod_1.z.object({
            codigo: zod_1.z.string().length(6),
            nuevaPassword: zod_1.z.string().min(6),
        }).parse(req.body);
        const resultado = await (0, auth_service_1.cambiarPasswordConCodigoService)(req.user.userId, codigo, nuevaPassword);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.cambiarPasswordConCodigo = cambiarPasswordConCodigo;
const cambiarEmail = async (req, res) => {
    try {
        const { codigo, nuevoEmail } = zod_1.z.object({
            codigo: zod_1.z.string().length(6),
            nuevoEmail: zod_1.z.string().email(),
        }).parse(req.body);
        const resultado = await (0, auth_service_1.cambiarEmailService)(req.user.userId, codigo, nuevoEmail);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.cambiarEmail = cambiarEmail;
const cambiarTelefono = async (req, res) => {
    try {
        const { codigo, nuevoTelefono } = zod_1.z.object({
            codigo: zod_1.z.string().length(6),
            nuevoTelefono: zod_1.z.string().min(6),
        }).parse(req.body);
        const resultado = await (0, auth_service_1.cambiarTelefonoService)(req.user.userId, codigo, nuevoTelefono);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.cambiarTelefono = cambiarTelefono;
const actualizarFoto = async (req, res) => {
    try {
        const { fotoPerfil } = zod_1.z.object({ fotoPerfil: zod_1.z.string().min(1) }).parse(req.body);
        const usuario = await (0, auth_service_1.actualizarFotoService)(req.user.userId, fotoPerfil);
        res.json(usuario);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarFoto = actualizarFoto;
const actualizarFirma = async (req, res) => {
    try {
        const { firma } = zod_1.z.object({ firma: zod_1.z.string().min(1) }).parse(req.body);
        const usuario = await (0, auth_service_1.actualizarFirmaService)(req.user.userId, firma);
        res.json(usuario);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.actualizarFirma = actualizarFirma;
const recuperarPassword = async (req, res) => {
    try {
        const { email } = zod_1.z.object({ email: zod_1.z.string().email() }).parse(req.body);
        const resultado = await (0, auth_service_1.solicitarRecuperacionService)(email);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.recuperarPassword = recuperarPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = zod_1.z.object({
            token: zod_1.z.string().min(1),
            nuevaPassword: zod_1.z.string().min(6),
        }).parse(req.body);
        const resultado = await (0, auth_service_1.resetPasswordService)(token, nuevaPassword);
        res.json(resultado);
    }
    catch (error) {
        if (error.name === 'ZodError')
            return res.status(400).json({ error: error.issues[0].message });
        res.status(400).json({ error: error.message });
    }
};
exports.resetPassword = resetPassword;
