"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ejecutarReglasAutomaticasService = exports.getSeguimientosDeClienteService = exports.eliminarReglaService = exports.toggleReglaService = exports.crearReglaService = exports.getReglasService = exports.eliminarPlantillaService = exports.actualizarPlantillaService = exports.crearPlantillaService = exports.getPlantillasService = exports.getDetalleCampanaService = exports.getHistorialCampanasService = exports.enviarCampanaService = exports.previsualizarSegmentoService = exports.getClientesPorSegmento = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'WoodPallet <noreply@woodpallet.com.ar>';
// ─── SEGMENTACIÓN ────────────────────────────────────────────────────────────
const getClientesPorSegmento = async (segmento, diasCondicion, clienteIdsManual) => {
    const hoy = new Date();
    if (segmento === 'todos') {
        return prisma_1.default.cliente.findMany({
            where: { activo: true, emailContacto: { not: null } },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
    }
    if (segmento === 'manual' && clienteIdsManual?.length) {
        return prisma_1.default.cliente.findMany({
            where: { id: { in: clienteIdsManual }, activo: true, emailContacto: { not: null } },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
    }
    if (segmento === 'activos') {
        const meses = diasCondicion ?? 3;
        const desde = new Date(hoy);
        desde.setMonth(desde.getMonth() - meses);
        const clientes = await prisma_1.default.cliente.findMany({
            where: {
                activo: true,
                emailContacto: { not: null },
                ventas: { some: { fechaVenta: { gte: desde } } },
            },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
        return clientes;
    }
    if (segmento === 'cotizacion_sin_respuesta') {
        const dias = diasCondicion ?? 5;
        const umbral = new Date(hoy);
        umbral.setDate(umbral.getDate() - dias);
        return prisma_1.default.cliente.findMany({
            where: {
                activo: true,
                emailContacto: { not: null },
                cotizaciones: {
                    some: {
                        estado: { in: ['enviada', 'en_seguimiento'] },
                        fechaCotizacion: { lte: umbral },
                    },
                },
            },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
    }
    if (segmento === 'cotizacion_rechazada') {
        return prisma_1.default.cliente.findMany({
            where: {
                activo: true,
                emailContacto: { not: null },
                cotizaciones: { some: { estado: 'rechazada' } },
            },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
    }
    if (segmento === 'sin_actividad') {
        const meses = diasCondicion ?? 3;
        const umbral = new Date(hoy);
        umbral.setMonth(umbral.getMonth() - meses);
        return prisma_1.default.cliente.findMany({
            where: {
                activo: true,
                emailContacto: { not: null },
                ventas: { some: {} }, // alguna vez compró
                NOT: { ventas: { some: { fechaVenta: { gte: umbral } } } },
            },
            select: { id: true, razonSocial: true, emailContacto: true, nombreContacto: true },
        });
    }
    return [];
};
exports.getClientesPorSegmento = getClientesPorSegmento;
// ─── PREVISUALIZAR SEGMENTO (sólo conteo + lista preview) ────────────────────
const previsualizarSegmentoService = async (segmento, diasCondicion, clienteIdsManual) => {
    const clientes = await (0, exports.getClientesPorSegmento)(segmento, diasCondicion, clienteIdsManual);
    return {
        total: clientes.length,
        preview: clientes.slice(0, 5).map(c => ({
            id: c.id,
            razonSocial: c.razonSocial,
            email: c.emailContacto,
        })),
    };
};
exports.previsualizarSegmentoService = previsualizarSegmentoService;
// ─── RENDER HTML DEL EMAIL ────────────────────────────────────────────────────
function renderBloquesHtml(bloques, vars) {
    const reemplazar = (txt) => txt.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
    const partes = [];
    for (const bloque of bloques) {
        if (!bloque.activo)
            continue;
        if (bloque.tipo === 'header') {
            const bg = bloque.headerBg || '#3c250f';
            partes.push(`
        <div style="background:${bg};padding:24px 32px;text-align:center;">
          ${bloque.logoUrl ? `<img src="${bloque.logoUrl}" alt="logo" style="height:60px;object-fit:contain;margin-bottom:8px;display:block;margin:0 auto 8px;" />` : ''}
          <p style="margin:0;color:#fff;font-size:22px;font-family:Georgia,serif;font-style:italic;font-weight:600;">
            ${reemplazar(bloque.empresaNombre || 'WoodPallet')}
          </p>
        </div>`);
        }
        if (bloque.tipo === 'text') {
            partes.push(`
        <div style="padding:24px 32px;font-family:Inter,Arial,sans-serif;font-size:15px;color:#374151;line-height:1.7;">
          ${reemplazar(bloque.contenido || '').replace(/\n/g, '<br/>')}
        </div>`);
        }
        if (bloque.tipo === 'image' && bloque.imageUrl) {
            partes.push(`
        <div style="padding:0 32px 16px;">
          <img src="${bloque.imageUrl}" alt="${bloque.imageAlt || ''}" style="width:100%;border-radius:4px;" />
        </div>`);
        }
        if (bloque.tipo === 'button' && bloque.botonTexto) {
            const bg = bloque.botonColor || '#3c250f';
            partes.push(`
        <div style="padding:8px 32px 24px;text-align:center;">
          <a href="${bloque.botonUrl || '#'}"
            style="display:inline-block;background:${bg};color:#fff;padding:12px 28px;text-decoration:none;font-family:Inter,Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:0.02em;">
            ${reemplazar(bloque.botonTexto)}
          </a>
        </div>`);
        }
        if (bloque.tipo === 'footer') {
            partes.push(`
        <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;font-family:Inter,Arial,sans-serif;font-size:12px;color:#9CA3AF;">
          <p style="margin:0 0 4px;font-weight:600;color:#6B7280;">WoodPallet</p>
          ${bloque.telefono ? `<p style="margin:0 0 2px;">${bloque.telefono}</p>` : ''}
          ${bloque.emailEmpresa ? `<p style="margin:0 0 2px;">${bloque.emailEmpresa}</p>` : ''}
          ${bloque.sitioWeb ? `<p style="margin:0;"><a href="${bloque.sitioWeb}" style="color:#9CA3AF;">${bloque.sitioWeb}</a></p>` : ''}
        </div>`);
        }
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#F3F4F6;">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        ${partes.join('\n')}
      </div>
    </body></html>`;
}
// ─── OBTENER VARIABLES DE UN CLIENTE ─────────────────────────────────────────
async function getVariablesCliente(clienteId, vendedorNombre) {
    const cliente = await prisma_1.default.cliente.findUnique({
        where: { id: clienteId },
        include: {
            cotizaciones: {
                orderBy: { fechaCotizacion: 'desc' },
                take: 1,
                include: { usuario: { select: { nombre: true, apellido: true } } },
            },
        },
    });
    const ultimaCot = cliente?.cotizaciones[0];
    return {
        nombre_cliente: cliente?.razonSocial ?? '',
        monto_cotizacion: ultimaCot ? `$${Number(ultimaCot.totalConIva).toLocaleString('es-AR')}` : '',
        fecha_cotizacion: ultimaCot ? ultimaCot.fechaCotizacion.toLocaleDateString('es-AR') : '',
        vendedor: ultimaCot
            ? `${ultimaCot.usuario.nombre} ${ultimaCot.usuario.apellido}`
            : (vendedorNombre ?? 'WoodPallet'),
    };
}
// ─── ENVIAR CAMPAÑA ───────────────────────────────────────────────────────────
const enviarCampanaService = async (datos, usuarioId) => {
    const destinatarios = await (0, exports.getClientesPorSegmento)(datos.segmento, datos.diasCondicion, datos.clienteIdsManual);
    if (destinatarios.length === 0) {
        throw new Error('No hay destinatarios para el segmento seleccionado');
    }
    // Crear registro de campaña
    const campana = await prisma_1.default.campanaSeguimiento.create({
        data: {
            nombre: datos.nombre,
            asunto: datos.asunto,
            segmento: datos.segmento,
            diasCondicion: datos.diasCondicion,
            bloques: datos.bloques,
            plantillaId: datos.plantillaId,
            enviadaPorId: usuarioId,
            totalDestinatarios: destinatarios.length,
            estado: 'enviado',
        },
    });
    // Crear registros de destinatarios
    await prisma_1.default.destinatarioCampana.createMany({
        data: destinatarios
            .filter(c => c.emailContacto)
            .map(c => ({
            campanaId: campana.id,
            clienteId: c.id,
            email: c.emailContacto,
            enviado: false,
        })),
    });
    // Enviar emails en background (no bloqueante para el response)
    setImmediate(async () => {
        for (const dest of destinatarios.filter(c => c.emailContacto)) {
            try {
                const vars = await getVariablesCliente(dest.id);
                const html = renderBloquesHtml(datos.bloques, vars);
                const asuntoPersonalizado = datos.asunto.replace(/\{\{nombre_cliente\}\}/g, dest.razonSocial);
                await resend.emails.send({
                    from: FROM_EMAIL,
                    to: dest.emailContacto,
                    subject: asuntoPersonalizado,
                    html,
                });
                await prisma_1.default.destinatarioCampana.updateMany({
                    where: { campanaId: campana.id, clienteId: dest.id },
                    data: { enviado: true, enviadoEn: new Date() },
                });
            }
            catch (err) {
                await prisma_1.default.destinatarioCampana.updateMany({
                    where: { campanaId: campana.id, clienteId: dest.id },
                    data: { error: String(err.message ?? err) },
                });
            }
        }
        // Actualizar total real enviado
        const enviados = await prisma_1.default.destinatarioCampana.count({
            where: { campanaId: campana.id, enviado: true },
        });
        await prisma_1.default.campanaSeguimiento.update({
            where: { id: campana.id },
            data: { totalDestinatarios: enviados },
        });
    });
    return { campanaId: campana.id, totalDestinatarios: destinatarios.length };
};
exports.enviarCampanaService = enviarCampanaService;
// ─── HISTORIAL DE CAMPAÑAS ────────────────────────────────────────────────────
const getHistorialCampanasService = async () => {
    return prisma_1.default.campanaSeguimiento.findMany({
        orderBy: { enviadaEn: 'desc' },
        include: {
            enviadaPor: { select: { nombre: true, apellido: true, rol: true } },
            plantilla: { select: { nombre: true } },
            _count: { select: { destinatarios: true } },
        },
    });
};
exports.getHistorialCampanasService = getHistorialCampanasService;
const getDetalleCampanaService = async (id) => {
    return prisma_1.default.campanaSeguimiento.findUnique({
        where: { id },
        include: {
            enviadaPor: { select: { nombre: true, apellido: true } },
            plantilla: { select: { nombre: true } },
            destinatarios: {
                include: { cliente: { select: { razonSocial: true } } },
                orderBy: { id: 'asc' },
            },
        },
    });
};
exports.getDetalleCampanaService = getDetalleCampanaService;
// ─── PLANTILLAS ───────────────────────────────────────────────────────────────
const getPlantillasService = async () => {
    return prisma_1.default.plantillaEmail.findMany({
        where: { activa: true },
        orderBy: { creadaEn: 'desc' },
        include: { creadaPor: { select: { nombre: true, apellido: true } } },
    });
};
exports.getPlantillasService = getPlantillasService;
const crearPlantillaService = async (datos, usuarioId) => {
    return prisma_1.default.plantillaEmail.create({
        data: {
            nombre: datos.nombre,
            asunto: datos.asunto,
            bloques: datos.bloques,
            creadaPorId: usuarioId,
        },
    });
};
exports.crearPlantillaService = crearPlantillaService;
const actualizarPlantillaService = async (id, datos) => {
    return prisma_1.default.plantillaEmail.update({
        where: { id },
        data: {
            nombre: datos.nombre,
            asunto: datos.asunto,
            bloques: datos.bloques,
        },
    });
};
exports.actualizarPlantillaService = actualizarPlantillaService;
const eliminarPlantillaService = async (id) => {
    return prisma_1.default.plantillaEmail.update({ where: { id }, data: { activa: false } });
};
exports.eliminarPlantillaService = eliminarPlantillaService;
// ─── AUTOMATIZACIONES ────────────────────────────────────────────────────────
const getReglasService = async () => {
    return prisma_1.default.reglaAutomatizacion.findMany({
        orderBy: { creadaEn: 'desc' },
        include: {
            plantilla: { select: { nombre: true } },
            creadaPor: { select: { nombre: true, apellido: true } },
        },
    });
};
exports.getReglasService = getReglasService;
const crearReglaService = async (datos, usuarioId) => {
    return prisma_1.default.reglaAutomatizacion.create({
        data: { ...datos, creadaPorId: usuarioId },
    });
};
exports.crearReglaService = crearReglaService;
const toggleReglaService = async (id) => {
    const regla = await prisma_1.default.reglaAutomatizacion.findUnique({ where: { id } });
    if (!regla)
        throw new Error('Regla no encontrada');
    return prisma_1.default.reglaAutomatizacion.update({
        where: { id },
        data: { activa: !regla.activa },
    });
};
exports.toggleReglaService = toggleReglaService;
const eliminarReglaService = async (id) => {
    return prisma_1.default.reglaAutomatizacion.delete({ where: { id } });
};
exports.eliminarReglaService = eliminarReglaService;
// ─── SEGUIMIENTOS RECIBIDOS POR CLIENTE ──────────────────────────────────────
const getSeguimientosDeClienteService = async (clienteId) => {
    return prisma_1.default.destinatarioCampana.findMany({
        where: { clienteId },
        orderBy: { enviadoEn: 'desc' },
        include: {
            campana: {
                select: { nombre: true, asunto: true, enviadaEn: true, segmento: true },
            },
        },
    });
};
exports.getSeguimientosDeClienteService = getSeguimientosDeClienteService;
// ─── EJECUTAR REGLAS AUTOMÁTICAS (llamado desde cron) ────────────────────────
const ejecutarReglasAutomaticasService = async () => {
    const reglas = await prisma_1.default.reglaAutomatizacion.findMany({
        where: { activa: true },
        include: { plantilla: true, creadaPor: { select: { id: true, nombre: true, apellido: true } } },
    });
    let totalEnviados = 0;
    for (const regla of reglas) {
        const segmento = regla.evento === 'cotizacion_sin_respuesta'
            ? 'cotizacion_sin_respuesta'
            : 'sin_actividad';
        const clientes = await (0, exports.getClientesPorSegmento)(segmento, regla.diasCondicion);
        if (clientes.length === 0)
            continue;
        const bloques = regla.plantilla.bloques;
        const campana = await prisma_1.default.campanaSeguimiento.create({
            data: {
                nombre: `[AUTO] ${regla.nombre}`,
                asunto: regla.asunto,
                segmento,
                diasCondicion: regla.diasCondicion,
                bloques: bloques,
                plantillaId: regla.plantillaId,
                enviadaPorId: regla.creadaPorId,
                totalDestinatarios: clientes.length,
                estado: 'enviado',
            },
        });
        await prisma_1.default.destinatarioCampana.createMany({
            data: clientes
                .filter(c => c.emailContacto)
                .map(c => ({
                campanaId: campana.id,
                clienteId: c.id,
                email: c.emailContacto,
                enviado: false,
            })),
        });
        for (const dest of clientes.filter(c => c.emailContacto)) {
            try {
                const vars = await getVariablesCliente(dest.id);
                const html = renderBloquesHtml(bloques, vars);
                await resend.emails.send({
                    from: FROM_EMAIL,
                    to: dest.emailContacto,
                    subject: regla.asunto.replace(/\{\{nombre_cliente\}\}/g, dest.razonSocial),
                    html,
                });
                await prisma_1.default.destinatarioCampana.updateMany({
                    where: { campanaId: campana.id, clienteId: dest.id },
                    data: { enviado: true, enviadoEn: new Date() },
                });
                totalEnviados++;
            }
            catch (err) {
                await prisma_1.default.destinatarioCampana.updateMany({
                    where: { campanaId: campana.id, clienteId: dest.id },
                    data: { error: String(err.message ?? err) },
                });
            }
        }
    }
    return totalEnviados;
};
exports.ejecutarReglasAutomaticasService = ejecutarReglasAutomaticasService;
