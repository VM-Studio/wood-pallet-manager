"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarEstadoCompraService = exports.getCompraByIdService = exports.getDeudaProveedoresService = exports.cancelarCompraService = exports.registrarPagoCompraService = exports.crearCompraService = exports.getComprasService = exports.getVentasParaCompraDirectaService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Proveedores y sus condiciones permitidas
const CONDICIONES_PROVEEDOR = {
    seminuevo: ['seminuevo'], // Galpón Familiar → solo semi-nuevos
    nuevo_medida: ['nuevo'], // Todo Pallets → solo nuevos
};
// Obtener ventas de tipo compra directa pendientes de abastecimiento
const getVentasParaCompraDirectaService = async (usuarioId, rol) => {
    const where = rol === 'admin'
        ? { origenStock: 'compra_directa' }
        : { origenStock: 'compra_directa', usuarioId };
    const ventas = await prisma_1.default.venta.findMany({
        where: {
            ...where,
            estadoPedido: { notIn: ['cancelado'] },
        },
        include: {
            cliente: { select: { id: true, razonSocial: true, nombreContacto: true } },
            detalles: {
                include: { producto: { select: { id: true, nombre: true, condicion: true, tipo: true } } }
            },
            compras: { select: { id: true } },
        },
        orderBy: { fechaVenta: 'desc' },
    });
    // Filtrar solo las que NO tienen compra asociada aún
    return ventas.filter(v => v.compras.length === 0);
};
exports.getVentasParaCompraDirectaService = getVentasParaCompraDirectaService;
// Obtener compras filtradas por usuario y rol
const getComprasService = async (usuarioId, rol) => {
    const where = rol === 'admin' ? {} : { usuarioId };
    return await prisma_1.default.compra.findMany({
        where,
        include: {
            proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
            detalles: { include: { producto: { select: { id: true, nombre: true, tipo: true, condicion: true } } } },
            pagos: true,
            venta: {
                include: {
                    cliente: { select: { id: true, razonSocial: true, nombreContacto: true } },
                    detalles: { include: { producto: { select: { id: true, nombre: true, condicion: true } } } },
                }
            }
        },
        orderBy: { fechaCompra: 'desc' }
    });
};
exports.getComprasService = getComprasService;
// Crear una compra nueva
const crearCompraService = async (datos, usuarioId, rol) => {
    const proveedor = await prisma_1.default.proveedor.findUnique({ where: { id: datos.proveedorId } });
    if (!proveedor)
        throw new Error('Proveedor no encontrado');
    if (rol === 'propietario_juancruz' && proveedor.tipoProducto !== 'seminuevo') {
        throw new Error('Juan Cruz solo puede comprar al Galpón Familiar (pallets semi-nuevos)');
    }
    // Validar: compra directa requiere ventaId
    if (datos.tipoCompra === 'reventa_inmediata') {
        if (!datos.ventaId) {
            throw new Error('Una compra directa debe estar asociada a una venta confirmada. Seleccioná la venta antes de continuar.');
        }
        const venta = await prisma_1.default.venta.findUnique({
            where: { id: datos.ventaId },
            include: { compras: { select: { id: true } } },
        });
        if (!venta)
            throw new Error('La venta seleccionada no existe');
        if (venta.origenStock !== 'compra_directa')
            throw new Error('La venta seleccionada no es de tipo compra directa');
        if (venta.compras.length > 0)
            throw new Error('Esta venta ya tiene una compra asociada');
    }
    // Validar restricción proveedor ↔ condición de producto
    const condicionesPermitidas = CONDICIONES_PROVEEDOR[proveedor.tipoProducto ?? ''];
    if (condicionesPermitidas) {
        for (const det of datos.detalles) {
            const producto = await prisma_1.default.producto.findUnique({ where: { id: det.productoId } });
            if (producto && !condicionesPermitidas.includes(producto.condicion)) {
                const condPermStr = condicionesPermitidas.join(' o ');
                throw new Error(`El producto "${producto.nombre}" (${producto.condicion}) no es compatible con ${proveedor.nombreEmpresa}. Solo acepta pallets ${condPermStr}.`);
            }
        }
    }
    const total = datos.detalles.reduce((acc, d) => acc + d.precioCostoUnit * d.cantidad, 0);
    const compra = await prisma_1.default.compra.create({
        data: {
            proveedorId: datos.proveedorId,
            usuarioId,
            ventaId: datos.ventaId ?? null,
            tipoCompra: datos.tipoCompra,
            total,
            nroRemito: datos.nroRemito,
            observaciones: datos.observaciones,
            estado: 'pendiente_pago',
            saldoDeudor: true,
            detalles: {
                create: datos.detalles.map(d => ({
                    productoId: d.productoId,
                    cantidad: d.cantidad,
                    precioCostoUnit: d.precioCostoUnit,
                    subtotal: d.precioCostoUnit * d.cantidad
                }))
            }
        },
        include: {
            proveedor: true,
            detalles: { include: { producto: true } }
        }
    });
    // Actualizar el stock del producto
    for (const detalle of datos.detalles) {
        const stockEntry = await prisma_1.default.stock.findFirst({
            where: { productoId: detalle.productoId, proveedorId: datos.proveedorId }
        });
        if (stockEntry) {
            if (datos.tipoCompra === 'stock_propio') {
                await prisma_1.default.stock.update({
                    where: { id: stockEntry.id },
                    data: {
                        cantidadDisponible: { increment: detalle.cantidad },
                        cantidadDeudora: { increment: detalle.cantidad }
                    }
                });
            }
            else {
                await prisma_1.default.stock.update({
                    where: { id: stockEntry.id },
                    data: { cantidadDeudora: { increment: detalle.cantidad } }
                });
            }
            await prisma_1.default.movimientoStock.create({
                data: {
                    stockId: stockEntry.id,
                    tipoMovimiento: 'entrada',
                    cantidad: detalle.cantidad,
                    motivo: 'compra',
                    idReferencia: compra.id,
                    registradoPorId: usuarioId
                }
            });
        }
        else {
            const nuevoStock = await prisma_1.default.stock.create({
                data: {
                    productoId: detalle.productoId,
                    proveedorId: datos.proveedorId,
                    cantidadDisponible: datos.tipoCompra === 'stock_propio' ? detalle.cantidad : 0,
                    cantidadDeudora: detalle.cantidad,
                    cantidadMinima: 20
                }
            });
            await prisma_1.default.movimientoStock.create({
                data: {
                    stockId: nuevoStock.id,
                    tipoMovimiento: 'entrada',
                    cantidad: detalle.cantidad,
                    motivo: 'compra',
                    idReferencia: compra.id,
                    registradoPorId: usuarioId
                }
            });
        }
    }
    return compra;
};
exports.crearCompraService = crearCompraService;
// Registrar el pago de una compra (tick)
const registrarPagoCompraService = async (compraId, datos, usuarioId) => {
    const compra = await prisma_1.default.compra.findUnique({
        where: { id: compraId },
        include: { detalles: true }
    });
    if (!compra)
        throw new Error('Compra no encontrada');
    if (compra.estado === 'pagada')
        throw new Error('Esta compra ya fue pagada');
    const compraActualizada = await prisma_1.default.compra.update({
        where: { id: compraId },
        data: {
            estado: 'pagada',
            saldoDeudor: false,
            fechaPago: new Date(),
            metodoPago: datos.metodoPago,
            cuentaDestino: datos.cuentaDestino,
            nroComprobante: datos.nroComprobante,
        }
    });
    // Bajar la cantidad deudora del stock
    for (const detalle of compra.detalles) {
        const stockEntry = await prisma_1.default.stock.findFirst({
            where: { productoId: detalle.productoId, proveedorId: compra.proveedorId }
        });
        if (stockEntry) {
            await prisma_1.default.stock.update({
                where: { id: stockEntry.id },
                data: { cantidadDeudora: Math.max(0, stockEntry.cantidadDeudora - detalle.cantidad) }
            });
        }
    }
    return compraActualizada;
};
exports.registrarPagoCompraService = registrarPagoCompraService;
// Cancelar una compra (cruz — sin stock)
const cancelarCompraService = async (compraId, usuarioId) => {
    const compra = await prisma_1.default.compra.findUnique({
        where: { id: compraId },
        include: { detalles: true }
    });
    if (!compra)
        throw new Error('Compra no encontrada');
    if (compra.estado !== 'pendiente_pago')
        throw new Error('Solo se pueden cancelar compras pendientes');
    for (const detalle of compra.detalles) {
        const stockEntry = await prisma_1.default.stock.findFirst({
            where: { productoId: detalle.productoId, proveedorId: compra.proveedorId }
        });
        if (stockEntry) {
            const updateData = {
                cantidadDeudora: Math.max(0, stockEntry.cantidadDeudora - detalle.cantidad)
            };
            if (compra.tipoCompra === 'stock_propio') {
                updateData.cantidadDisponible = Math.max(0, stockEntry.cantidadDisponible - detalle.cantidad);
            }
            await prisma_1.default.stock.update({
                where: { id: stockEntry.id },
                data: updateData
            });
        }
    }
    return await prisma_1.default.compra.update({
        where: { id: compraId },
        data: { estado: 'cancelada', saldoDeudor: false }
    });
};
exports.cancelarCompraService = cancelarCompraService;
// Obtener la deuda total con proveedores
const getDeudaProveedoresService = async () => {
    const comprasPendientes = await prisma_1.default.compra.findMany({
        where: { saldoDeudor: true },
        include: {
            proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
        }
    });
    const deudaPorProveedor = {};
    for (const compra of comprasPendientes) {
        const provId = compra.proveedor.id;
        if (!deudaPorProveedor[provId]) {
            deudaPorProveedor[provId] = {
                proveedor: compra.proveedor,
                deudaTotal: 0,
                comprasPendientes: 0
            };
        }
        deudaPorProveedor[provId].deudaTotal += Number(compra.total || 0);
        deudaPorProveedor[provId].comprasPendientes += 1;
    }
    return Object.values(deudaPorProveedor);
};
exports.getDeudaProveedoresService = getDeudaProveedoresService;
const getCompraByIdService = async (compraId) => {
    return await prisma_1.default.compra.findUnique({
        where: { id: compraId },
        include: {
            proveedor: { select: { id: true, nombreEmpresa: true, nombreContacto: true } },
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
            detalles: { include: { producto: { select: { id: true, nombre: true, tipo: true } } } },
            pagos: true
        }
    });
};
exports.getCompraByIdService = getCompraByIdService;
const actualizarEstadoCompraService = async (compraId, estado) => {
    return await prisma_1.default.compra.update({
        where: { id: compraId },
        data: { estado }
    });
};
exports.actualizarEstadoCompraService = actualizarEstadoCompraService;
