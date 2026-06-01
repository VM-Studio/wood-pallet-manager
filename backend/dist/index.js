"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const clientes_routes_1 = __importDefault(require("./routes/clientes.routes"));
const productos_routes_1 = __importDefault(require("./routes/productos.routes"));
const cotizaciones_routes_1 = __importDefault(require("./routes/cotizaciones.routes"));
const ventas_routes_1 = __importDefault(require("./routes/ventas.routes"));
const compras_routes_1 = __importDefault(require("./routes/compras.routes"));
const inventario_routes_1 = __importDefault(require("./routes/inventario.routes"));
const logistica_routes_1 = __importDefault(require("./routes/logistica.routes"));
const facturacion_routes_1 = __importDefault(require("./routes/facturacion.routes"));
const reportes_routes_1 = __importDefault(require("./routes/reportes.routes"));
const alertas_routes_1 = __importDefault(require("./routes/alertas.routes"));
const solicitudes_logistica_routes_1 = __importDefault(require("./routes/solicitudes-logistica.routes"));
const proveedores_routes_1 = __importDefault(require("./routes/proveedores.routes"));
const devoluciones_routes_1 = __importDefault(require("./routes/devoluciones.routes"));
const remitos_routes_1 = __importDefault(require("./routes/remitos.routes"));
const seguimientos_routes_1 = __importDefault(require("./routes/seguimientos.routes"));
const retiros_routes_1 = __importDefault(require("./routes/retiros.routes"));
const cron_1 = require("./utils/cron");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir sin origin (apps móviles, Postman) y cualquier localhost/IP local
        // En producción reemplazar por lista de dominios permitidos
        callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/clientes', clientes_routes_1.default);
app.use('/api/productos', productos_routes_1.default);
app.use('/api/cotizaciones', cotizaciones_routes_1.default);
app.use('/api/ventas', ventas_routes_1.default);
app.use('/api/compras', compras_routes_1.default);
app.use('/api/inventario', inventario_routes_1.default);
app.use('/api/logistica', logistica_routes_1.default);
app.use('/api/facturas', facturacion_routes_1.default);
app.use('/api/reportes', reportes_routes_1.default);
app.use('/api/alertas', alertas_routes_1.default);
app.use('/api/solicitudes-logistica', solicitudes_logistica_routes_1.default);
app.use('/api/proveedores', proveedores_routes_1.default);
app.use('/api/devoluciones', devoluciones_routes_1.default);
app.use('/api/remitos', remitos_routes_1.default);
app.use('/api/seguimientos', seguimientos_routes_1.default);
app.use('/api/retiros', retiros_routes_1.default);
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        mensaje: 'WoodPallet Manager API funcionando',
        version: '1.0.0',
        modulos: [
            'auth', 'clientes', 'productos', 'cotizaciones',
            'ventas', 'compras', 'inventario', 'logistica',
            'facturas', 'reportes', 'alertas',
        ],
    });
});
app.use((_req, res) => {
    res.status(404).json({ error: `Ruta no encontrada` });
});
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});
app.listen(PORT, () => {
    console.log(`\n🚀 WoodPallet Manager API corriendo en http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health\n`);
    (0, cron_1.iniciarTareasProgramadas)();
});
exports.default = app;
