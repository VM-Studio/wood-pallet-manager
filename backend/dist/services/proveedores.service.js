"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vincularProductoProveedorService = exports.desactivarProveedorService = exports.actualizarProveedorService = exports.crearProveedorService = exports.getProveedorByIdService = exports.getProveedoresService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getProveedoresService = async () => {
    return prisma_1.default.proveedor.findMany({
        where: { activo: true },
        orderBy: { nombreEmpresa: 'asc' },
    });
};
exports.getProveedoresService = getProveedoresService;
const getProveedorByIdService = async (id) => {
    const proveedor = await prisma_1.default.proveedor.findUnique({
        where: { id },
        include: {
            prodProveedores: {
                include: {
                    producto: { select: { id: true, nombre: true, tipo: true } },
                },
            },
        },
    });
    if (!proveedor)
        throw new Error('Proveedor no encontrado');
    return proveedor;
};
exports.getProveedorByIdService = getProveedorByIdService;
const crearProveedorService = async (datos) => {
    return prisma_1.default.proveedor.create({ data: { ...datos, nombreContacto: datos.nombreContacto ?? '' } });
};
exports.crearProveedorService = crearProveedorService;
const actualizarProveedorService = async (id, datos) => {
    await (0, exports.getProveedorByIdService)(id);
    return prisma_1.default.proveedor.update({ where: { id }, data: datos });
};
exports.actualizarProveedorService = actualizarProveedorService;
const desactivarProveedorService = async (id) => {
    await (0, exports.getProveedorByIdService)(id);
    return prisma_1.default.proveedor.update({ where: { id }, data: { activo: false } });
};
exports.desactivarProveedorService = desactivarProveedorService;
const vincularProductoProveedorService = async (datos) => {
    return prisma_1.default.productoProveedor.upsert({
        where: {
            id: (await prisma_1.default.productoProveedor.findFirst({
                where: { proveedorId: datos.proveedorId, productoId: datos.productoId },
                select: { id: true },
            }))?.id ?? 0,
        },
        update: {
            precioCosto: datos.precioCosto,
            observaciones: datos.observaciones,
            fechaActualizacion: new Date(),
        },
        create: {
            proveedorId: datos.proveedorId,
            productoId: datos.productoId,
            precioCosto: datos.precioCosto,
            observaciones: datos.observaciones,
        },
    });
};
exports.vincularProductoProveedorService = vincularProductoProveedorService;
