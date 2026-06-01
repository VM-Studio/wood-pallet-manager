"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reenviarCodigoService = exports.crearRetiroService = exports.cambiarEstadoRetiroService = exports.getStatsRetirosService = exports.getRetiroByIdService = exports.getRetirosService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const mailer_1 = require("../utils/mailer");
// ─── Include base para queries ────────────────────────────────────────────────
const RETIRO_INCLUDE = {
    venta: {
        include: {
            cliente: {
                select: {
                    id: true, razonSocial: true, nombreContacto: true,
                    telefonoContacto: true, emailContacto: true,
                },
            },
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
            detalles: {
                include: { producto: { select: { id: true, nombre: true, tipo: true, condicion: true } } },
            },
            remito: {
                select: {
                    id: true, numeroRemito: true, fechaEmision: true,
                    estado: true, fechaFirmaCliente: true,
                },
            },
        },
    },
    confirmadoPor: { select: { id: true, nombre: true, apellido: true } },
    historialReenvios: {
        include: { enviadoPor: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: { creadoEn: 'desc' },
    },
};
// ─── Generador de código único ────────────────────────────────────────────────
const generarCodigoRetiro = async () => {
    let codigo;
    let existe;
    do {
        const num = Math.floor(1000 + Math.random() * 9000);
        codigo = `WP-${num}`;
        const found = await prisma_1.default.retiro.findUnique({ where: { codigoRetiro: codigo } });
        existe = !!found;
    } while (existe);
    return codigo;
};
// ─── LIST ─────────────────────────────────────────────────────────────────────
const getRetirosService = async () => {
    return prisma_1.default.retiro.findMany({
        include: RETIRO_INCLUDE,
        orderBy: { creadoEn: 'desc' },
    });
};
exports.getRetirosService = getRetirosService;
// ─── GET ONE ──────────────────────────────────────────────────────────────────
const getRetiroByIdService = async (id) => {
    const retiro = await prisma_1.default.retiro.findUnique({ where: { id }, include: RETIRO_INCLUDE });
    if (!retiro)
        throw new Error('Retiro no encontrado');
    return retiro;
};
exports.getRetiroByIdService = getRetiroByIdService;
// ─── KPIs ─────────────────────────────────────────────────────────────────────
const getStatsRetirosService = async () => {
    const now = new Date();
    // Hoy: utilizar fechaRetiro de la venta (fecha estimada de retiro)
    const inicioHoy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const finHoy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    // Esta semana (lunes a domingo)
    const diaSemana = now.getUTCDay(); // 0=dom, 1=lun...
    const diasDesdelunes = diaSemana === 0 ? 6 : diaSemana - 1;
    const inicioSemana = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diasDesdelunes));
    const finSemana = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diasDesdelunes + 7));
    // Este mes
    const inicioMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const finMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [pendientesHoy, pendientesSemana, completadosMes] = await Promise.all([
        prisma_1.default.retiro.count({
            where: {
                estadoRetiro: { in: ['pendiente', 'confirmado'] },
                venta: { fechaRetiro: { gte: inicioHoy, lt: finHoy } },
            },
        }),
        prisma_1.default.retiro.count({
            where: {
                estadoRetiro: { in: ['pendiente', 'confirmado'] },
                venta: { fechaRetiro: { gte: inicioSemana, lt: finSemana } },
            },
        }),
        prisma_1.default.retiro.count({
            where: {
                estadoRetiro: 'completado',
                fechaConfirmacion: { gte: inicioMes, lt: finMes },
            },
        }),
    ]);
    return { pendientesHoy, pendientesSemana, completadosMes };
};
exports.getStatsRetirosService = getStatsRetirosService;
// ─── CAMBIAR ESTADO ───────────────────────────────────────────────────────────
const cambiarEstadoRetiroService = async (id, estado, usuarioId, extra) => {
    const retiro = await prisma_1.default.retiro.findUnique({ where: { id } });
    if (!retiro)
        throw new Error('Retiro no encontrado');
    const updateData = { estadoRetiro: estado };
    if (estado === 'completado') {
        updateData.confirmadoPorId = usuarioId;
        updateData.fechaConfirmacion = new Date();
        if (extra?.observaciones)
            updateData.observacionesConf = extra.observaciones;
    }
    if (estado === 'cancelado' && extra?.motivoCancelacion) {
        updateData.motivoCancelacion = extra.motivoCancelacion;
    }
    const [retiroActualizado] = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.retiro.update({ where: { id }, data: updateData });
        // Sincronizar estado de venta
        if (estado === 'completado') {
            await tx.venta.update({
                where: { id: retiro.ventaId },
                data: { estadoPedido: 'entregado', fechaEntregaReal: new Date() },
            });
        }
        else if (estado === 'cancelado') {
            await tx.venta.update({
                where: { id: retiro.ventaId },
                data: { estadoPedido: 'cancelado' },
            });
        }
        return [updated];
    });
    return retiroActualizado;
};
exports.cambiarEstadoRetiroService = cambiarEstadoRetiroService;
// ─── AUTO-CREAR RETIRO (llamado desde cotizaciones.service) ───────────────────
const crearRetiroService = async (params) => {
    const codigo = await generarCodigoRetiro();
    const retiro = await prisma_1.default.retiro.create({
        data: {
            ventaId: params.ventaId,
            codigoRetiro: codigo,
            galpon: params.galpon,
            horaEstimadaRetiro: params.horaEstimadaRetiro,
        },
    });
    // Enviar email al cliente con el código
    if (params.clienteEmail) {
        try {
            const fechaStr = params.fechaRetiro
                ? new Date(params.fechaRetiro).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : undefined;
            const horaStr = params.horaEstimadaRetiro
                ? new Date(params.horaEstimadaRetiro).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : undefined;
            await (0, mailer_1.sendCodigoRetiro)({
                to: params.clienteEmail,
                nombre: params.clienteNombre,
                codigoRetiro: codigo,
                fechaRetiro: fechaStr,
                horaRetiro: horaStr,
                galpon: params.galpon,
                productos: params.productos,
            });
        }
        catch (_err) {
            // No fallar la conversión si el email falla
        }
    }
    return retiro;
};
exports.crearRetiroService = crearRetiroService;
// ─── REENVIAR CÓDIGO ──────────────────────────────────────────────────────────
const reenviarCodigoService = async (retiroId, usuarioId, emailDestino, telefonoDestino) => {
    const retiro = await prisma_1.default.retiro.findUnique({
        where: { id: retiroId },
        include: {
            venta: {
                include: {
                    cliente: { select: { razonSocial: true, nombreContacto: true, emailContacto: true } },
                    detalles: { include: { producto: { select: { nombre: true } } } },
                },
            },
        },
    });
    if (!retiro)
        throw new Error('Retiro no encontrado');
    // Registrar en historial
    const historial = await prisma_1.default.historialReenvioRetiro.create({
        data: {
            retiroId,
            emailEnviado: emailDestino || null,
            telefonoEnviado: telefonoDestino || null,
            enviadoPorId: usuarioId,
        },
    });
    // Enviar email si hay destinatario
    if (emailDestino) {
        const nombre = retiro.venta.cliente.nombreContacto || retiro.venta.cliente.razonSocial;
        const productos = retiro.venta.detalles.map(d => ({
            nombre: d.producto.nombre,
            cantidad: d.cantidadPedida,
        }));
        await (0, mailer_1.sendCodigoRetiro)({
            to: emailDestino,
            nombre,
            codigoRetiro: retiro.codigoRetiro,
            galpon: retiro.galpon ?? undefined,
            productos,
        });
    }
    return historial;
};
exports.reenviarCodigoService = reenviarCodigoService;
