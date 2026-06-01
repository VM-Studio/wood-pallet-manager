"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogisticasAceptadasService = exports.confirmarLogisticaCarlosService = exports.avanzarLogisticaService = exports.responderConsultaLogisticaService = exports.consultarLogisticaService = exports.getLogisticasPorRolService = exports.getEntregasDelDiaService = exports.confirmarEntregaClienteService = exports.actualizarEstadoEntregaService = exports.crearLogisticaService = exports.getLogisticaByVentaService = exports.getLogisticasService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getLogisticasService = async () => {
    return prisma_1.default.logistica.findMany({
        include: {
            venta: {
                include: {
                    cliente: { select: { razonSocial: true, nombreContacto: true, telefonoContacto: true } },
                    detalles: { include: { producto: { select: { nombre: true } } } },
                },
            },
        },
        orderBy: { fechaRetiroGalpon: 'desc' },
    });
};
exports.getLogisticasService = getLogisticasService;
const getLogisticaByVentaService = async (ventaId) => {
    const logistica = await prisma_1.default.logistica.findUnique({
        where: { ventaId },
        include: {
            venta: {
                include: {
                    cliente: true,
                    detalles: { include: { producto: true } },
                },
            },
        },
    });
    if (!logistica)
        throw new Error('Logística no encontrada');
    return logistica;
};
exports.getLogisticaByVentaService = getLogisticaByVentaService;
const crearLogisticaService = async (data, usuarioId, rol) => {
    if (rol !== 'admin' && rol !== 'propietario_carlos') {
        throw new Error('Solo Carlos o un administrador puede crear logística');
    }
    const venta = await prisma_1.default.venta.findUnique({ where: { id: data.ventaId } });
    if (!venta)
        throw new Error('Venta no encontrada');
    const existente = await prisma_1.default.logistica.findUnique({ where: { ventaId: data.ventaId } });
    if (existente)
        throw new Error('Ya existe una logística para esta venta');
    const [logistica] = await prisma_1.default.$transaction([
        prisma_1.default.logistica.create({
            data: {
                ventaId: data.ventaId,
                nombreTransportista: data.nombreTransportista ?? '',
                telefonoTransp: data.telefonoTransp,
                fechaRetiroGalpon: data.fechaRetiroGalpon,
                horaRetiro: data.horaRetiro,
                horaEstimadaEntrega: data.horaEstimadaEntrega,
                costoFlete: data.costoFlete,
                observaciones: data.observaciones,
                registradoPorId: usuarioId,
                confTransportista: false,
                confCliente: false,
            },
        }),
        prisma_1.default.venta.update({
            where: { id: data.ventaId },
            data: { estadoPedido: 'en_transito' },
        }),
    ]);
    return logistica;
};
exports.crearLogisticaService = crearLogisticaService;
const actualizarEstadoEntregaService = async (ventaId, estado, rol) => {
    if (rol !== 'admin' && rol !== 'propietario_carlos') {
        throw new Error('Solo Carlos o un administrador puede actualizar el estado');
    }
    const logistica = await prisma_1.default.logistica.findUnique({ where: { ventaId } });
    if (!logistica)
        throw new Error('Logística no encontrada');
    const updateData = {};
    if (estado === 'entregado') {
        updateData.horaEntregaReal = new Date();
        updateData.confTransportista = true;
        updateData.estadoEntrega = 'entregado';
    }
    else {
        updateData.estadoEntrega = estado;
    }
    const [updated] = await prisma_1.default.$transaction([
        prisma_1.default.logistica.update({
            where: { ventaId },
            data: updateData,
        }),
        prisma_1.default.venta.update({
            where: { id: ventaId },
            data: { estadoPedido: estado },
        }),
    ]);
    return updated;
};
exports.actualizarEstadoEntregaService = actualizarEstadoEntregaService;
const confirmarEntregaClienteService = async (ventaId) => {
    const logistica = await prisma_1.default.logistica.findUnique({ where: { ventaId } });
    if (!logistica)
        throw new Error('Logística no encontrada');
    return prisma_1.default.logistica.update({
        where: { ventaId },
        data: { confCliente: true },
    });
};
exports.confirmarEntregaClienteService = confirmarEntregaClienteService;
const getEntregasDelDiaService = async () => {
    const hoy = new Date();
    // Usar UTC para evitar problemas de timezone
    const inicio = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), 0, 0, 0));
    const fin = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1, 0, 0, 0));
    return prisma_1.default.logistica.findMany({
        where: {
            fechaRetiroGalpon: {
                not: null,
                gte: inicio,
                lt: fin,
            },
        },
        include: {
            venta: {
                include: {
                    cliente: { select: { razonSocial: true, nombreContacto: true, telefonoContacto: true } },
                    detalles: { include: { producto: { select: { nombre: true } } } },
                },
            },
        },
        orderBy: { horaEstimadaEntrega: 'asc' },
    });
};
exports.getEntregasDelDiaService = getEntregasDelDiaService;
const ventaLogisticaInclude = {
    venta: {
        select: {
            id: true,
            costoFlete: true,
            fechaEstimEntrega: true,
            lugarEntrega: true,
            tipoEntrega: true,
            cliente: { select: { razonSocial: true, direccionEntrega: true, localidad: true } },
            usuario: { select: { nombre: true, apellido: true, rol: true } },
            detalles: { select: { id: true, cantidadPedida: true, producto: { select: { nombre: true } } } },
        },
    },
    registradoPor: { select: { nombre: true, apellido: true, rol: true } },
    consultadaPor: { select: { nombre: true, apellido: true } },
};
const getLogisticasPorRolService = async (usuarioId, rol, vista) => {
    const esCarlos = rol === 'propietario_carlos' || rol === 'admin';
    const orderByFecha = [{ fechaRetiroGalpon: 'asc' }, { id: 'desc' }];
    // Vista "todos" → todas las logísticas por fecha
    if (vista === 'todos') {
        return prisma_1.default.logistica.findMany({
            include: ventaLogisticaInclude,
            orderBy: orderByFecha,
        });
    }
    // Vista "mis_datos" → ventas del usuario logueado
    // Carlos siempre ve TODAS las logísticas (propias + Juan) para poder gestionar todo
    if (vista === 'mis_datos' || !vista) {
        if (esCarlos) {
            return prisma_1.default.logistica.findMany({
                include: ventaLogisticaInclude,
                orderBy: { id: 'desc' },
            });
        }
        return prisma_1.default.logistica.findMany({
            where: { venta: { usuarioId } },
            include: ventaLogisticaInclude,
            orderBy: { id: 'desc' },
        });
    }
    // Vista "otro" → las del otro propietario
    if (vista === 'otro') {
        if (esCarlos) {
            // Carlos ve las de Juan Cruz
            return prisma_1.default.logistica.findMany({
                where: { venta: { usuario: { NOT: { rol: 'propietario_carlos' } } } },
                include: ventaLogisticaInclude,
                orderBy: { id: 'desc' },
            });
        }
        // Juan ve las de Carlos
        return prisma_1.default.logistica.findMany({
            where: { venta: { usuario: { rol: 'propietario_carlos' } } },
            include: ventaLogisticaInclude,
            orderBy: { id: 'desc' },
        });
    }
    // Fallback seguro
    return prisma_1.default.logistica.findMany({
        include: ventaLogisticaInclude,
        orderBy: { id: 'desc' },
    });
};
exports.getLogisticasPorRolService = getLogisticasPorRolService;
const consultarLogisticaService = async (ventaId, usuarioId) => {
    // Si ya existe el registro, solo actualiza estadoConsulta
    const existente = await prisma_1.default.logistica.findUnique({ where: { ventaId } });
    if (existente) {
        return prisma_1.default.logistica.update({
            where: { ventaId },
            data: { estadoConsulta: 'pendiente_consulta', fechaConsulta: new Date(), consultadaPorId: usuarioId },
        });
    }
    // Si NO existe, crea el registro con estadoConsulta = 'pendiente_consulta'
    // para que Carlos pueda verlo en su panel de "Consultas de Juan Cruz"
    const venta = await prisma_1.default.venta.findUnique({ where: { id: ventaId } });
    if (!venta)
        throw new Error('Venta no encontrada');
    return prisma_1.default.logistica.create({
        data: {
            ventaId,
            nombreTransportista: '',
            estadoConsulta: 'pendiente_consulta',
            fechaConsulta: new Date(),
            consultadaPorId: usuarioId,
            registradoPorId: usuarioId,
            confTransportista: false,
            confCliente: false,
        },
    });
};
exports.consultarLogisticaService = consultarLogisticaService;
const responderConsultaLogisticaService = async (ventaId, respuesta, usuarioId, rol, datos) => {
    if (rol !== 'propietario_carlos' && rol !== 'admin') {
        throw new Error('Solo Carlos puede aceptar o rechazar consultas de logística');
    }
    const logistica = await prisma_1.default.logistica.findUnique({ where: { ventaId } });
    if (!logistica)
        throw new Error('Logística no encontrada');
    return prisma_1.default.logistica.update({
        where: { ventaId },
        data: {
            estadoConsulta: respuesta,
            nombreTransportista: datos?.nombreTransportista ?? logistica.nombreTransportista,
            telefonoTransp: datos?.telefonoTransp,
            fechaRetiroGalpon: datos?.fechaRetiroGalpon,
            costoFlete: datos?.costoFlete,
            observaciones: datos?.observaciones,
        },
    });
};
exports.responderConsultaLogisticaService = responderConsultaLogisticaService;
// Avanza el estado de una logística desde el panel de Carlos.
// Los 3 botones son: consultando → aceptada → entregada
const avanzarLogisticaService = async (ventaId, accion, rol) => {
    if (rol !== 'propietario_carlos' && rol !== 'admin') {
        throw new Error('Solo Carlos puede avanzar el estado de la logística');
    }
    const logistica = await prisma_1.default.logistica.findUnique({ where: { ventaId } });
    if (!logistica)
        throw new Error('Logística no encontrada');
    if (accion === 'consultando') {
        return prisma_1.default.logistica.update({
            where: { ventaId },
            data: { estadoConsulta: 'consultada' },
        });
    }
    if (accion === 'aceptada') {
        return prisma_1.default.$transaction([
            prisma_1.default.logistica.update({
                where: { ventaId },
                data: { estadoConsulta: 'aceptada', estadoEntrega: 'en_camino' },
            }),
            prisma_1.default.venta.update({
                where: { id: ventaId },
                data: { estadoPedido: 'en_transito' },
            }),
        ]).then(([l]) => l);
    }
    // entregada
    return prisma_1.default.$transaction([
        prisma_1.default.logistica.update({
            where: { ventaId },
            data: { estadoEntrega: 'entregado', horaEntregaReal: new Date(), confTransportista: true },
        }),
        prisma_1.default.venta.update({
            where: { id: ventaId },
            data: { estadoPedido: 'entregado', fechaEntregaReal: new Date() },
        }),
    ]).then(([l]) => l);
};
exports.avanzarLogisticaService = avanzarLogisticaService;
const confirmarLogisticaCarlosService = async (ventaId, rol, datos) => {
    if (rol !== 'propietario_carlos' && rol !== 'admin') {
        throw new Error('Solo Carlos puede confirmar logística');
    }
    return prisma_1.default.logistica.update({
        where: { ventaId },
        data: { ...datos, estadoConsulta: 'aceptada', estadoEntrega: 'pendiente' },
    });
};
exports.confirmarLogisticaCarlosService = confirmarLogisticaCarlosService;
// Retorna todas las logísticas con estadoConsulta = 'aceptada', ordenadas por fecha estimada de entrega
const getLogisticasAceptadasService = async () => {
    return prisma_1.default.logistica.findMany({
        where: {
            estadoConsulta: 'aceptada',
            estadoEntrega: { not: 'entregado' }, // excluir ya entregadas
        },
        include: {
            venta: {
                select: {
                    id: true,
                    fechaEstimEntrega: true,
                    lugarEntrega: true,
                    cliente: { select: { razonSocial: true, nombreContacto: true } },
                    usuario: { select: { nombre: true, apellido: true, rol: true } },
                },
            },
        },
        orderBy: [
            { horaEstimadaEntrega: 'asc' },
            { id: 'asc' },
        ],
    });
};
exports.getLogisticasAceptadasService = getLogisticasAceptadasService;
