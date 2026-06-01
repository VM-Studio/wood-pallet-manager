"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarClientesService = exports.getHistorialClienteService = exports.desactivarClienteService = exports.actualizarClienteService = exports.crearClienteService = exports.getClienteByIdService = exports.getClientesService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getClientesService = async (usuarioId, rol) => {
    const clientes = await prisma_1.default.cliente.findMany({
        where: { activo: true },
        include: {
            usuarioAsignado: {
                select: { id: true, nombre: true, apellido: true, rol: true },
            },
        },
        orderBy: { razonSocial: 'asc' },
    });
    return clientes;
};
exports.getClientesService = getClientesService;
const getClienteByIdService = async (id) => {
    const cliente = await prisma_1.default.cliente.findUnique({
        where: { id },
        include: {
            usuarioAsignado: {
                select: { id: true, nombre: true, apellido: true, rol: true },
            },
            cotizaciones: {
                orderBy: { fechaCotizacion: 'desc' },
                take: 10,
                include: {
                    detalles: { include: { producto: true } },
                },
            },
            ventas: {
                orderBy: { fechaVenta: 'desc' },
                take: 10,
                include: {
                    detalles: { include: { producto: true } },
                    facturas: true,
                },
            },
            facturas: {
                orderBy: { fechaEmision: 'desc' },
                take: 10,
            },
        },
    });
    if (!cliente)
        throw new Error('Cliente no encontrado');
    return cliente;
};
exports.getClienteByIdService = getClienteByIdService;
const crearClienteService = async (datos, usuarioId) => {
    return prisma_1.default.cliente.create({
        data: { ...datos, usuarioAsignadoId: usuarioId },
        include: {
            usuarioAsignado: {
                select: { id: true, nombre: true, apellido: true, rol: true },
            },
        },
    });
};
exports.crearClienteService = crearClienteService;
const actualizarClienteService = async (id, datos, usuarioId, rol) => {
    const cliente = await prisma_1.default.cliente.findUnique({ where: { id } });
    if (!cliente)
        throw new Error('Cliente no encontrado');
    if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
        throw new Error('Solo el propietario asignado puede editar este cliente');
    }
    return prisma_1.default.cliente.update({
        where: { id },
        data: datos,
        include: {
            usuarioAsignado: {
                select: { id: true, nombre: true, apellido: true, rol: true },
            },
        },
    });
};
exports.actualizarClienteService = actualizarClienteService;
const desactivarClienteService = async (id, usuarioId, rol) => {
    const cliente = await prisma_1.default.cliente.findUnique({ where: { id } });
    if (!cliente)
        throw new Error('Cliente no encontrado');
    if (cliente.usuarioAsignadoId !== usuarioId && rol !== 'admin') {
        throw new Error('Solo el propietario asignado puede desactivar este cliente');
    }
    await prisma_1.default.cliente.update({ where: { id }, data: { activo: false } });
    return { mensaje: 'Cliente desactivado correctamente' };
};
exports.desactivarClienteService = desactivarClienteService;
const getHistorialClienteService = async (id) => {
    const cliente = await prisma_1.default.cliente.findUniqueOrThrow({
        where: { id },
        include: {
            cotizaciones: {
                orderBy: { fechaCotizacion: 'desc' },
                include: {
                    detalles: {
                        include: {
                            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
                            especificacion: true,
                        },
                    },
                    usuario: { select: { nombre: true, apellido: true, rol: true } },
                    seguimientos: { orderBy: { fechaContacto: 'desc' }, take: 5 },
                },
            },
            ventas: {
                orderBy: { fechaVenta: 'desc' },
                include: {
                    detalles: {
                        include: {
                            producto: { select: { id: true, nombre: true, tipo: true, condicion: true } },
                            retiros: { orderBy: { fechaRetiro: 'desc' } },
                        },
                    },
                    facturas: {
                        include: {
                            pagos: { orderBy: { fechaPago: 'desc' } },
                            notasCredito: true,
                        },
                    },
                    logistica: true,
                    retiroGalpon: true,
                    usuario: { select: { nombre: true, apellido: true, rol: true } },
                },
            },
        },
    });
    const totalPallets = cliente.ventas.reduce((acc, venta) => acc + venta.detalles.reduce((a, d) => a + d.cantidadPedida, 0), 0);
    const totalFacturado = cliente.ventas.reduce((acc, venta) => acc + Number(venta.totalConIva || 0), 0);
    const totalCobrado = cliente.ventas.reduce((acc, venta) => {
        return acc + venta.facturas.reduce((fa, f) => {
            return fa + f.pagos.reduce((pa, p) => pa + Number(p.monto || 0), 0);
        }, 0);
    }, 0);
    const totalPendiente = totalFacturado - totalCobrado;
    const primerVenta = cliente.ventas.length
        ? cliente.ventas[cliente.ventas.length - 1].fechaVenta
        : null;
    const ultimaVenta = cliente.ventas.length
        ? cliente.ventas[0].fechaVenta
        : null;
    return {
        cliente: {
            id: cliente.id,
            razonSocial: cliente.razonSocial,
            cuit: cliente.cuit,
            emailContacto: cliente.emailContacto,
            telefonoContacto: cliente.telefonoContacto,
        },
        estadisticas: {
            totalVentas: cliente.ventas.length,
            totalCotizaciones: cliente.cotizaciones.length,
            totalPallets,
            totalFacturado,
            totalCobrado,
            totalPendiente,
            primerVenta,
            ultimaVenta,
        },
        cotizaciones: cliente.cotizaciones,
        ventas: cliente.ventas,
    };
};
exports.getHistorialClienteService = getHistorialClienteService;
const buscarClientesService = async (query) => {
    return prisma_1.default.cliente.findMany({
        where: {
            activo: true,
            OR: [
                { razonSocial: { contains: query, mode: 'insensitive' } },
                { cuit: { contains: query } },
                { nombreContacto: { contains: query, mode: 'insensitive' } },
            ],
        },
        include: {
            usuarioAsignado: {
                select: { id: true, nombre: true, apellido: true, rol: true },
            },
        },
        take: 20,
        orderBy: { razonSocial: 'asc' },
    });
};
exports.buscarClientesService = buscarClientesService;
