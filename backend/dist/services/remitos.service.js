"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelarRemitoService = exports.actualizarNumeroRemitoService = exports.firmarClienteService = exports.enviarRemitoService = exports.firmarPropietarioService = exports.crearRemitoService = exports.getRemitoByTokenService = exports.getRemitoByIdService = exports.getRemitosService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const mailer_1 = require("../utils/mailer");
const REMITO_INCLUDE = {
    venta: {
        include: {
            detalles: { include: { producto: true } },
            facturas: { select: { id: true, nroFactura: true, estadoCobro: true } },
        },
    },
    cliente: { select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true, cuit: true, direccionEntrega: true, localidad: true } },
    usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
};
const getRemitosService = async (usuarioId, rol) => {
    const where = rol === 'admin' ? {} : { usuarioId };
    return prisma_1.default.remito.findMany({
        where,
        include: REMITO_INCLUDE,
        orderBy: { fechaEmision: 'desc' },
    });
};
exports.getRemitosService = getRemitosService;
const getRemitoByIdService = async (id) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { id }, include: REMITO_INCLUDE });
    if (!remito)
        throw new Error('Remito no encontrado');
    return remito;
};
exports.getRemitoByIdService = getRemitoByIdService;
const getRemitoByTokenService = async (token) => {
    const remito = await prisma_1.default.remito.findUnique({
        where: { tokenFirma: token },
        include: REMITO_INCLUDE,
    });
    if (!remito)
        throw new Error('Remito no encontrado o token inválido');
    // Devuelve el remito sin importar el estado —
    // el frontend muestra la pantalla correcta según estado (ya-firmado, cancelado, etc.)
    return remito;
};
exports.getRemitoByTokenService = getRemitoByTokenService;
const crearRemitoService = async (datos, usuarioId) => {
    const venta = await prisma_1.default.venta.findUnique({
        where: { id: datos.ventaId },
        include: { remito: true },
    });
    if (!venta)
        throw new Error('Venta no encontrada');
    if (venta.remito)
        throw new Error('Esta venta ya tiene un remito asociado');
    const remito = await prisma_1.default.remito.create({
        data: {
            ventaId: datos.ventaId,
            clienteId: venta.clienteId,
            usuarioId,
            firmaPropietario: datos.firmaPropietario ?? null,
            fechaFirmaPropietario: datos.firmaPropietario ? new Date() : null,
            estado: datos.firmaPropietario ? 'enviado_a_cliente' : 'pendiente_firma_propietario',
            fechaEntrega: datos.fechaEntrega,
            observaciones: datos.observaciones,
        },
        include: REMITO_INCLUDE,
    });
    return remito;
};
exports.crearRemitoService = crearRemitoService;
const firmarPropietarioService = async (id, firma) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { id } });
    if (!remito)
        throw new Error('Remito no encontrado');
    if (remito.estado !== 'pendiente_firma_propietario') {
        throw new Error('El remito ya tiene firma del propietario');
    }
    return prisma_1.default.remito.update({
        where: { id },
        data: {
            firmaPropietario: firma,
            fechaFirmaPropietario: new Date(),
            estado: 'pendiente_firma_propietario',
        },
        include: REMITO_INCLUDE,
    });
};
exports.firmarPropietarioService = firmarPropietarioService;
const enviarRemitoService = async (id) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { id }, include: REMITO_INCLUDE });
    if (!remito)
        throw new Error('Remito no encontrado');
    if (!remito.firmaPropietario)
        throw new Error('El remito necesita la firma del propietario antes de enviarse');
    if (remito.estado === 'cancelado')
        throw new Error('El remito está cancelado');
    if (!remito.cliente.emailContacto)
        throw new Error('El cliente no tiene email registrado');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkFirma = `${frontendUrl}/remito/${remito.tokenFirma}/firmar`;
    const detalles = remito.venta.detalles.map(d => ({
        nombre: d.producto.nombre,
        cantidad: d.cantidadPedida,
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
    }));
    await (0, mailer_1.enviarRemitoParaFirmar)({
        destinatario: remito.cliente.emailContacto,
        razonSocial: remito.cliente.razonSocial,
        numeroRemito: remito.numeroRemito ?? String(remito.id).padStart(4, '0'),
        fechaEmision: remito.fechaEmision.toLocaleDateString('es-AR'),
        fechaEntrega: remito.fechaEntrega?.toLocaleDateString('es-AR'),
        linkFirma,
        productos: detalles,
        totalConIva: Number(remito.venta.totalConIva ?? 0),
        firmaPropietarioBase64: remito.firmaPropietario ?? undefined,
    });
    return prisma_1.default.remito.update({
        where: { id },
        data: {
            estado: 'enviado_a_cliente',
            emailEnviado: true,
            fechaEmailEnviado: new Date(),
        },
        include: REMITO_INCLUDE,
    });
};
exports.enviarRemitoService = enviarRemitoService;
const firmarClienteService = async (token, firmaCliente, nombreFirmante) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { tokenFirma: token }, include: REMITO_INCLUDE });
    if (!remito)
        throw new Error('Remito no encontrado o token inválido');
    if (remito.estado === 'cancelado')
        throw new Error('Este remito fue cancelado');
    if (remito.estado === 'firmado_por_cliente' || remito.estado === 'completado') {
        throw new Error('Este remito ya fue firmado');
    }
    const actualizado = await prisma_1.default.remito.update({
        where: { id: remito.id },
        data: {
            firmaCliente,
            fechaFirmaCliente: new Date(),
            estado: 'firmado_por_cliente',
        },
        include: REMITO_INCLUDE,
    });
    const nro = actualizado.numeroRemito ?? String(actualizado.id).padStart(4, '0');
    const fechaEmision = actualizado.fechaEmision.toLocaleDateString('es-AR');
    const productos = actualizado.venta.detalles.map(d => ({
        nombre: d.producto.nombre,
        cantidad: d.cantidadPedida,
        precioUnitario: Number(d.precioUnitario),
        subtotal: Number(d.subtotal),
    }));
    const totalConIva = Number(actualizado.venta.totalConIva ?? 0);
    // Enviar copia firmada al cliente
    if (actualizado.cliente.emailContacto) {
        try {
            await (0, mailer_1.enviarRemitoFirmado)({
                destinatario: actualizado.cliente.emailContacto,
                razonSocial: actualizado.cliente.razonSocial,
                numeroRemito: nro,
                fechaEmision,
                fechaEntrega: actualizado.fechaEntrega?.toLocaleDateString('es-AR'),
                productos,
                totalConIva,
                firmaPropietarioBase64: actualizado.firmaPropietario ?? undefined,
                firmaClienteBase64: firmaCliente,
                nombreFirmante,
                esCopia: 'cliente',
            });
        }
        catch (_) { /* no bloquear si falla el mail */ }
    }
    // Enviar notificación al propietario
    const propietario = await prisma_1.default.usuario.findUnique({ where: { id: actualizado.usuarioId } });
    if (propietario?.email) {
        try {
            await (0, mailer_1.enviarRemitoFirmado)({
                destinatario: propietario.email,
                razonSocial: actualizado.cliente.razonSocial,
                numeroRemito: nro,
                fechaEmision,
                fechaEntrega: actualizado.fechaEntrega?.toLocaleDateString('es-AR'),
                productos,
                totalConIva,
                firmaPropietarioBase64: actualizado.firmaPropietario ?? undefined,
                firmaClienteBase64: firmaCliente,
                nombreFirmante,
                esCopia: 'propietario',
            });
        }
        catch (_) { /* no bloquear si falla el mail */ }
    }
    // Marcar como completado
    return prisma_1.default.remito.update({
        where: { id: remito.id },
        data: { estado: 'completado' },
        include: REMITO_INCLUDE,
    });
};
exports.firmarClienteService = firmarClienteService;
const actualizarNumeroRemitoService = async (id, numeroRemito) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { id } });
    if (!remito)
        throw new Error('Remito no encontrado');
    return prisma_1.default.remito.update({
        where: { id },
        data: { numeroRemito },
        include: REMITO_INCLUDE,
    });
};
exports.actualizarNumeroRemitoService = actualizarNumeroRemitoService;
const cancelarRemitoService = async (id) => {
    const remito = await prisma_1.default.remito.findUnique({ where: { id } });
    if (!remito)
        throw new Error('Remito no encontrado');
    if (remito.estado === 'completado')
        throw new Error('No se puede cancelar un remito completado');
    return prisma_1.default.remito.update({
        where: { id },
        data: { estado: 'cancelado' },
        include: REMITO_INCLUDE,
    });
};
exports.cancelarRemitoService = cancelarRemitoService;
