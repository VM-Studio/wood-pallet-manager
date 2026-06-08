# WoodPallet Manager — Diagrama Entidad-Relación

> **Tool:** [Mermaid Live Editor](https://mermaid.live) — pegar el bloque `erDiagram` completo  
> **Alternativas:** GitHub (renderiza automáticamente), Notion, GitLab, VS Code + extensión Mermaid  
> **Base:** PostgreSQL | 35 entidades | Junio 2026

---

```mermaid
erDiagram

    %% ══════════════════════════════════════════════════════════
    %% ENTIDADES
    %% ══════════════════════════════════════════════════════════

    USUARIOS {
        int      id             PK
        string   nombre
        string   apellido
        string   email          UK
        string   passwordHash
        string   telefono
        string   cuit
        string   rol            "enum: propietario_carlos | propietario_juancruz | admin"
        boolean  activo
        datetime fechaCreacion
        text     fotoPerfil     "base64 data URL"
        text     firma          "base64 data URL"
    }

    VERIFICACIONES_CODIGO {
        int      id             PK
        int      usuarioId      FK
        string   email          "para recuperación sin usuario registrado"
        string   codigo         "6 dígitos"
        string   tipo           "enum: cambio_password | cambio_email | cambio_telefono | recuperacion_password"
        string   dato           "payload: nuevo email / teléfono"
        string   canal          "email | telefono"
        datetime expiresAt
        boolean  usado
        datetime creadoAt
    }

    CLIENTES {
        int      id              PK
        string   razonSocial
        string   cuit
        string   nombreContacto
        string   telefonoContacto
        string   emailContacto
        string   canalEntrada   "enum: whatsapp | formulario_web | llamada | recomendacion | instagram | email | otro"
        int      usuarioAsignadoId FK
        string   direccionEntrega
        string   localidad
        boolean  esExportador
        text     observaciones
        datetime fechaAlta
        boolean  activo
    }

    PRODUCTOS {
        int     id             PK
        string  nombre
        string  tipo           "enum: estandar | reforzado | liviano | exportacion | carton | a_medida | personalizado"
        string  condicion      "enum: nuevo | seminuevo | usado"
        int     propietarioId  FK
        int     dimensionLargo
        int     dimensionAncho
        int     cargaMaximaKg
        boolean requiereSenasa
        text    descripcion
        boolean activo
    }

    PROVEEDORES {
        int     id                  PK
        string  nombreEmpresa
        string  nombreContacto
        string  telefono
        string  email
        string  tipoProducto        "enum: seminuevo | nuevo_medida | ambos"
        int     contactoExclusivoId "id del propietario con acceso exclusivo"
        int     distanciaKm
        string  ubicacion
        text    observaciones
        boolean activo
    }

    PRODUCTO_PROVEEDOR {
        int      id                 PK
        int      proveedorId        FK
        int      productoId         FK
        decimal  precioCosto
        datetime fechaActualizacion
        text     observaciones
    }

    LISTA_PRECIOS {
        int      id             PK
        int      productoId     FK
        decimal  precioUnitario
        decimal  margenPct
        int      cantMinima
        int      cantMaxima
        boolean  bonificaFlete
        datetime vigentDesde
        datetime vigentHasta
        int      creadoPorId    FK
        text     observaciones
    }

    HISTORIAL_PRECIOS {
        int      id              PK
        int      productoId      FK
        decimal  precioAnterior
        decimal  precioNuevo
        text     motivo
        datetime fechaCambio
        int      registradoPorId FK
    }

    STOCK {
        int      id                 PK
        int      productoId         FK
        int      proveedorId        FK    "UNIQUE(productoId, proveedorId)"
        int      cantidadDisponible
        int      cantidadMinima     "null = sin mínimo configurado"
        int      cantidadDeudora
        datetime ultimaActualizacion
        text     observaciones
    }

    MOVIMIENTOS_STOCK {
        int      id              PK
        int      stockId         FK
        string   tipoMovimiento  "enum: entrada | salida | ajuste"
        int      cantidad
        string   motivo          "enum: venta | compra | devolucion | ajuste_manual"
        int      idReferencia    "id de la venta / compra / devolución"
        datetime fecha
        int      registradoPorId FK
    }

    COTIZACIONES {
        int      id                PK
        int      clienteId         FK  "null en cotización rápida"
        int      usuarioId         FK
        datetime fechaCotizacion
        datetime fechaVencimiento
        string   estado            "enum: enviada | en_seguimiento | aceptada | rechazada | perdida | vencida"
        boolean  incluyeFlete
        decimal  costoFlete
        boolean  fleteIncluido
        boolean  requiereSenasa
        decimal  costoSenasa
        decimal  totalSinIva
        decimal  totalConIva
        string   canalEnvio        "enum: whatsapp | email"
        text     observaciones
        boolean  esRapida
        string   nombreProspecto   "solo en cotizaciones rápidas"
        string   telefonoProspecto
        string   emailProspecto
    }

    DETALLE_COTIZACION {
        int     id             PK
        int     cotizacionId   FK
        int     productoId     FK
        int     cantidad
        decimal precioUnitario
        decimal subtotal
        boolean esAMedida
    }

    ESPECIFICACIONES_MEDIDA {
        int    id                  PK
        int    detalleCotizacionId FK  "UK — 1:1 opcional"
        int    detalleVentaId      FK  "UK — 1:1 opcional"
        int    largoMm
        int    anchoMm
        int    altoMm
        int    cargaMaximaKg
        string tipoMadera
        text   observacionesCliente
        json   medidas
    }

    SEGUIMIENTO_COTIZACION {
        int      id              PK
        int      cotizacionId    FK
        int      usuarioId       FK
        datetime fechaContacto
        string   tipoContacto    "enum: whatsapp | llamada | email | presencial"
        string   resultado       "enum: sin_respuesta | interesado | no_interesado | cerrado | reprogramado"
        text     observaciones
        datetime proximoContacto
    }

    VENTAS {
        int      id                PK
        int      cotizacionId      FK  "UK — 1:1 opcional"
        int      clienteId         FK
        int      usuarioId         FK
        datetime fechaVenta
        string   estadoPedido      "enum: confirmado | en_preparacion | listo_para_envio | en_transito | entregado | entregado_parcial | cancelado"
        string   tipoEntrega       "enum: retira_cliente | envio_woodpallet"
        boolean  requiereSenasa
        datetime fechaEstimEntrega
        datetime fechaEntregaReal
        datetime fechaRetiro
        text     lugarEntrega
        decimal  totalSinIva
        decimal  totalConIva
        decimal  costoFlete
        string   metodoPago        "enum: transferencia | e_check | efectivo"
        string   cuentaDestino
        string   modalidadPago     "enum: adelantado | contra_entrega | por_partes"
        text     observaciones
        string   origenStock
        boolean  esHistorica
    }

    DETALLE_VENTA {
        int     id                     PK
        int     ventaId                FK
        int     productoId             FK
        int     cantidadPedida
        int     cantidadEntregada
        decimal precioUnitario
        decimal subtotal
        text    observaciones
        decimal costoUnitarioHistorico
        int     proveedorHistoricoId   "ref histórica sin FK enforced"
        string  tipoCompraHistorico
    }

    RETIROS_GALPON {
        int      id                 PK
        int      ventaId            FK  "UK — 1:1"
        string   codigoRetiro       UK
        string   estadoRetiro       "enum: pendiente | confirmado | completado | cancelado"
        string   galpon
        datetime horaEstimadaRetiro
        int      confirmadoPorId    FK
        datetime fechaConfirmacion
        text     observacionesConf
        text     motivoCancelacion
        datetime creadoEn
    }

    HISTORIAL_REENVIO_RETIRO {
        int      id              PK
        int      retiroId        FK
        string   emailEnviado
        string   telefonoEnviado
        int      enviadoPorId    FK
        datetime creadoEn
    }

    RETIROS_PARCIALES {
        int      id               PK
        int      detalleVentaId   FK
        datetime fechaRetiro
        int      cantidadRetirada
        int      registradoPorId  FK
    }

    COMPRAS {
        int      id             PK
        int      proveedorId    FK
        int      usuarioId      FK
        int      ventaId        FK  "null en compras stock propio"
        datetime fechaCompra
        string   estado         "enum: pendiente_pago | pagada | cancelada"
        string   tipoCompra     "enum: reventa_inmediata | stock_propio"
        decimal  total
        string   nroRemito
        text     observaciones
        boolean  saldoDeudor
        datetime fechaPago
        string   metodoPago     "enum: transferencia | e_check | efectivo"
        string   cuentaDestino
        string   nroComprobante
    }

    DETALLE_COMPRA {
        int     id              PK
        int     compraId        FK
        int     productoId      FK
        int     cantidad
        decimal precioCostoUnit
        decimal subtotal
    }

    LOGISTICA {
        int      id                  PK
        int      ventaId             FK  "UK — 1:1"
        string   nombreTransportista
        string   telefonoTransp
        datetime fechaRetiroGalpon
        datetime horaRetiro
        datetime horaEstimadaEntrega
        datetime horaEntregaReal
        string   estadoEntrega       "enum: pendiente | en_camino | entregado | con_problema"
        boolean  confTransportista
        boolean  confCliente
        decimal  costoFlete
        int      registradoPorId     FK
        text     lugarEntrega
        float    latEntrega
        float    lngEntrega
        string   estadoConsulta      "enum: no_aplica | pendiente_consulta | consultada | aceptada | rechazada"
        datetime fechaConsulta
        int      consultadaPorId     FK
    }

    FACTURAS {
        int      id               PK
        int      ventaId          FK
        int      clienteId        FK
        int      usuarioId        FK
        string   tipoFactura      "enum: A"
        string   nroFactura
        boolean  esSinFactura
        datetime fechaEmision
        datetime fechaVencimiento
        decimal  totalNeto
        decimal  iva
        decimal  totalConIva
        string   estadoCobro      "enum: pendiente | cobrada_parcial | cobrada_total | vencida | incobrable"
        string   modalidadPago
        string   medioPago
        string   metodoPago       "enum: transferencia | e_check | efectivo"
        string   cuentaDestino
        text     observaciones
    }

    PAGOS_COBROS {
        int      id              PK
        int      facturaId       FK
        int      clienteId       FK
        datetime fechaPago
        decimal  monto
        string   medioPago       "enum: transferencia | e_check | efectivo"
        string   nroComprobante
        boolean  esAdelanto
        int      registradoPorId FK
        text     observaciones
    }

    NOTAS_CREDITO {
        int      id          PK
        int      facturaId   FK
        int      clienteId   FK
        int      usuarioId   FK
        datetime fechaEmision
        string   nroNota
        decimal  monto
        text     motivo
    }

    PAGOS_PROVEEDORES {
        int      id              PK
        int      compraId        FK
        int      proveedorId     FK
        datetime fechaPago
        decimal  monto
        string   medioPago       "enum: transferencia | e_check | efectivo"
        string   nroComprobante
        int      registradoPorId FK
        text     observaciones
    }

    SOLICITUDES_LOGISTICA {
        int      id               PK
        int      ventaId          FK  "null si es solicitud genérica"
        int      solicitanteId    FK
        int      destinatarioId   FK
        datetime fechaSolicitud
        datetime fechaEntrega
        int      cantidadUnidades
        text     ubicacionEntrega
        text     notas
        string   estado           "enum: pendiente | aceptada | rechazada"
        datetime fechaRespuesta
        text     notasRespuesta
    }

    DEVOLUCIONES {
        int      id                           PK
        int      ventaId                      FK
        int      clienteId                    FK
        int      usuarioId                    FK
        datetime fechaSolicitud
        string   tipoCaso                     "enum: pallet_danado | cliente_no_quiere | devolucion_parcial | cancelacion_anticipada"
        string   estado                       "enum: pendiente | esperando_confirmacion_deposito | confirmada | procesada | cancelada"
        boolean  devuelveFlete
        boolean  devuelveSenasa
        decimal  montoPallets
        decimal  montoFlete
        decimal  montoSenasa
        decimal  montoTotal
        boolean  requiereConfirmacionDeposito
        boolean  depositoConfirmo
        datetime fechaConfirmacionDeposito
        boolean  stockRestaurado
        datetime fechaStockRestaurado
        boolean  transferenciaDevuelta
        datetime fechaTransferenciaDevuelta
        boolean  compensaEnSiguientePedido
        string   metodoPago
        string   cuentaDestino
        text     observaciones
    }

    DETALLE_DEVOLUCION {
        int     id               PK
        int     devolucionId     FK
        int     detalleVentaId   FK  "null si no hay línea de venta original"
        int     productoId       FK
        int     cantidadDevuelta
        decimal precioUnitario
        decimal subtotal
    }

    REMITOS {
        int      id                    PK
        string   numeroRemito
        int      ventaId               FK  "UK — 1:1"
        int      clienteId             FK
        int      usuarioId             FK
        datetime fechaEmision
        datetime fechaEntrega
        string   estado                "enum: pendiente_firma_propietario | enviado_a_cliente | firmado_por_cliente | completado | cancelado"
        text     firmaPropietario      "firma digital base64"
        datetime fechaFirmaPropietario
        text     firmaCliente          "firma digital base64"
        datetime fechaFirmaCliente
        string   tokenFirma            UK  "UUID para enlace externo"
        boolean  emailEnviado
        datetime fechaEmailEnviado
        text     observaciones
    }

    PLANTILLAS_EMAIL {
        int      id          PK
        string   nombre
        string   asunto
        json     bloques     "array de bloques de contenido"
        int      creadaPorId FK
        datetime creadaEn
        boolean  activa
    }

    CAMPANAS_SEGUIMIENTO {
        int      id                 PK
        string   nombre
        string   asunto
        string   segmento           "activos | cotizacion_sin_respuesta | sin_actividad | manual | todos"
        int      diasCondicion
        json     bloques            "snapshot al momento del envío"
        int      plantillaId        FK
        int      enviadaPorId       FK
        datetime enviadaEn
        int      totalDestinatarios
        string   estado             "borrador | enviado"
    }

    DESTINATARIOS_CAMPANA {
        int      id        PK
        int      campanaId FK
        int      clienteId FK
        string   email
        boolean  enviado
        text     error
        datetime enviadoEn
    }

    REGLAS_AUTOMATIZACION {
        int      id            PK
        string   nombre
        boolean  activa
        string   evento        "cotizacion_sin_respuesta | sin_actividad"
        int      diasCondicion
        int      plantillaId   FK
        string   asunto
        int      creadaPorId   FK
        datetime creadaEn
    }

    COTIZACIONES_WEB {
        int      id                    PK
        string   nombre
        string   empresa
        string   email
        string   telefono
        string   tipoPallet
        int      cantidad
        datetime fechaNecesidad
        string   tipoEntrega           "retira | envio"
        string   localidadEntrega
        boolean  requiereSenasa
        text     observaciones
        string   estado                "enum: pendiente | vista | convertida | descartada"
        int      propietarioAsignadoId FK
        int      cotizacionId          FK  "UK — 1:1 opcional"
        text     motivoDescarte
        string   ipOrigen
        datetime creadoEn
        datetime actualizadoEn
    }


    %% ══════════════════════════════════════════════════════════
    %% RELACIONES
    %% Notación: ||  = exactamente uno   o|  = cero o uno
    %%           |{  = uno o muchos      o{  = cero o muchos
    %% ══════════════════════════════════════════════════════════

    %% ── USUARIOS ────────────────────────────────────────────
    USUARIOS           ||--o{ VERIFICACIONES_CODIGO    : "tiene"
    USUARIOS           ||--o{ CLIENTES                 : "gestiona"
    USUARIOS           ||--o{ PRODUCTOS                : "es propietario de"
    USUARIOS           ||--o{ LISTA_PRECIOS            : "crea lista de precios"
    USUARIOS           ||--o{ HISTORIAL_PRECIOS        : "registra cambio de precio"
    USUARIOS           ||--o{ MOVIMIENTOS_STOCK        : "registra movimiento"
    USUARIOS           ||--o{ COTIZACIONES             : "emite"
    USUARIOS           ||--o{ SEGUIMIENTO_COTIZACION   : "realiza seguimiento"
    USUARIOS           ||--o{ VENTAS                   : "registra venta"
    USUARIOS           ||--o{ COMPRAS                  : "realiza compra"
    USUARIOS           ||--o{ FACTURAS                 : "emite factura"
    USUARIOS           ||--o{ PAGOS_COBROS             : "registra cobro"
    USUARIOS           ||--o{ NOTAS_CREDITO            : "emite nota crédito"
    USUARIOS           ||--o{ PAGOS_PROVEEDORES        : "registra pago proveedor"
    USUARIOS           ||--o{ DEVOLUCIONES             : "procesa devolución"
    USUARIOS           ||--o{ REMITOS                  : "emite remito"
    USUARIOS           ||--o{ LOGISTICA                : "registra envío"
    USUARIOS           ||--o{ LOGISTICA                : "consulta envío (consultadaPor)"
    USUARIOS           ||--o{ RETIROS_GALPON           : "confirma retiro"
    USUARIOS           ||--o{ HISTORIAL_REENVIO_RETIRO : "reenvía código retiro"
    USUARIOS           ||--o{ RETIROS_PARCIALES        : "registra retiro parcial"
    USUARIOS           ||--o{ SOLICITUDES_LOGISTICA    : "solicita (solicitante)"
    USUARIOS           ||--o{ SOLICITUDES_LOGISTICA    : "recibe (destinatario)"
    USUARIOS           ||--o{ PLANTILLAS_EMAIL         : "crea plantilla"
    USUARIOS           ||--o{ CAMPANAS_SEGUIMIENTO     : "envía campaña"
    USUARIOS           ||--o{ REGLAS_AUTOMATIZACION    : "configura regla"
    USUARIOS           ||--o{ COTIZACIONES_WEB         : "asignado a web lead"

    %% ── CLIENTES ────────────────────────────────────────────
    CLIENTES           ||--o{ COTIZACIONES             : "solicita"
    CLIENTES           ||--o{ VENTAS                   : "realiza"
    CLIENTES           ||--o{ FACTURAS                 : "tiene"
    CLIENTES           ||--o{ PAGOS_COBROS             : "paga"
    CLIENTES           ||--o{ NOTAS_CREDITO            : "recibe nota crédito"
    CLIENTES           ||--o{ DEVOLUCIONES             : "genera devolución"
    CLIENTES           ||--o{ REMITOS                  : "firma remito"
    CLIENTES           ||--o{ DESTINATARIOS_CAMPANA    : "es destinatario"

    %% ── PRODUCTOS ───────────────────────────────────────────
    PRODUCTOS          ||--o{ PRODUCTO_PROVEEDOR       : "tiene precio con proveedor"
    PRODUCTOS          ||--o{ LISTA_PRECIOS            : "tiene escalones de precio"
    PRODUCTOS          ||--o{ HISTORIAL_PRECIOS        : "tiene historial de precios"
    PRODUCTOS          ||--o{ STOCK                    : "tiene stock"
    PRODUCTOS          ||--o{ DETALLE_COTIZACION       : "aparece en cotización"
    PRODUCTOS          ||--o{ DETALLE_VENTA            : "aparece en venta"
    PRODUCTOS          ||--o{ DETALLE_COMPRA           : "aparece en compra"
    PRODUCTOS          ||--o{ DETALLE_DEVOLUCION       : "aparece en devolución"

    %% ── PROVEEDORES ─────────────────────────────────────────
    PROVEEDORES        ||--o{ PRODUCTO_PROVEEDOR       : "provee producto"
    PROVEEDORES        ||--o{ STOCK                    : "almacena stock en galpón"
    PROVEEDORES        ||--o{ COMPRAS                  : "origen de compra"
    PROVEEDORES        ||--o{ PAGOS_PROVEEDORES        : "recibe pago"

    %% ── STOCK ───────────────────────────────────────────────
    STOCK              ||--o{ MOVIMIENTOS_STOCK        : "registra movimientos"

    %% ── COTIZACIONES ────────────────────────────────────────
    COTIZACIONES       ||--o{ DETALLE_COTIZACION       : "tiene detalles"
    COTIZACIONES       ||--o{ SEGUIMIENTO_COTIZACION   : "tiene seguimientos"
    COTIZACIONES       ||--o| VENTAS                   : "puede convertirse en venta (1:1)"
    COTIZACIONES       ||--o| COTIZACIONES_WEB         : "puede originarse en web (1:1)"

    %% ── DETALLE_COTIZACION ──────────────────────────────────
    DETALLE_COTIZACION ||--o| ESPECIFICACIONES_MEDIDA  : "puede tener medidas (1:1)"

    %% ── VENTAS ──────────────────────────────────────────────
    VENTAS             ||--|{ DETALLE_VENTA            : "tiene detalles"
    VENTAS             ||--o{ FACTURAS                 : "genera facturas"
    VENTAS             ||--o{ COMPRAS                  : "origina compra (reventa)"
    VENTAS             ||--o{ SOLICITUDES_LOGISTICA    : "tiene solicitudes logística"
    VENTAS             ||--o{ DEVOLUCIONES             : "puede tener devoluciones"
    VENTAS             ||--o| LOGISTICA                : "tiene logística (1:1)"
    VENTAS             ||--o| RETIROS_GALPON           : "tiene retiro de galpón (1:1)"
    VENTAS             ||--o| REMITOS                  : "tiene remito (1:1)"

    %% ── DETALLE_VENTA ───────────────────────────────────────
    DETALLE_VENTA      ||--o| ESPECIFICACIONES_MEDIDA  : "puede tener medidas (1:1)"
    DETALLE_VENTA      ||--o{ RETIROS_PARCIALES        : "tiene retiros parciales"
    DETALLE_VENTA      ||--o{ DETALLE_DEVOLUCION       : "puede devolverse"

    %% ── RETIROS_GALPON ──────────────────────────────────────
    RETIROS_GALPON     ||--o{ HISTORIAL_REENVIO_RETIRO : "tiene historial de reenvíos"

    %% ── COMPRAS ─────────────────────────────────────────────
    COMPRAS            ||--|{ DETALLE_COMPRA           : "tiene detalles"
    COMPRAS            ||--o{ PAGOS_PROVEEDORES        : "tiene pagos a proveedor"

    %% ── FACTURAS ────────────────────────────────────────────
    FACTURAS           ||--o{ PAGOS_COBROS             : "tiene pagos / cobros"
    FACTURAS           ||--o{ NOTAS_CREDITO            : "puede tener notas de crédito"

    %% ── DEVOLUCIONES ────────────────────────────────────────
    DEVOLUCIONES       ||--|{ DETALLE_DEVOLUCION       : "tiene detalles"

    %% ── EMAIL MARKETING ─────────────────────────────────────
    PLANTILLAS_EMAIL   ||--o{ CAMPANAS_SEGUIMIENTO     : "es base de campaña"
    PLANTILLAS_EMAIL   ||--o{ REGLAS_AUTOMATIZACION    : "usa en regla automática"
    CAMPANAS_SEGUIMIENTO ||--|{ DESTINATARIOS_CAMPANA  : "tiene destinatarios"
```

---

## Leyenda de cardinalidades

| Símbolo | Significado                   |
| ------- | ----------------------------- |
| `\|\|`  | Exactamente uno (obligatorio) |
| `o\|`   | Cero o uno (opcional)         |
| `\|{`   | Uno o muchos (obligatorio)    |
| `o{`    | Cero o muchos (opcional)      |

## Grupos funcionales del sistema

| Grupo                    | Entidades                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| **Usuarios y seguridad** | USUARIOS, VERIFICACIONES_CODIGO                                                                     |
| **Clientes**             | CLIENTES                                                                                            |
| **Catálogo**             | PRODUCTOS, PROVEEDORES, PRODUCTO_PROVEEDOR, LISTA_PRECIOS, HISTORIAL_PRECIOS                        |
| **Inventario y stock**   | STOCK, MOVIMIENTOS_STOCK                                                                            |
| **Cotizaciones**         | COTIZACIONES, DETALLE_COTIZACION, ESPECIFICACIONES_MEDIDA, SEGUIMIENTO_COTIZACION, COTIZACIONES_WEB |
| **Ventas**               | VENTAS, DETALLE_VENTA, RETIROS_GALPON, HISTORIAL_REENVIO_RETIRO, RETIROS_PARCIALES                  |
| **Compras**              | COMPRAS, DETALLE_COMPRA, PAGOS_PROVEEDORES                                                          |
| **Logística**            | LOGISTICA, SOLICITUDES_LOGISTICA                                                                    |
| **Facturación y cobros** | FACTURAS, PAGOS_COBROS, NOTAS_CREDITO                                                               |
| **Devoluciones**         | DEVOLUCIONES, DETALLE_DEVOLUCION                                                                    |
| **Remitos**              | REMITOS                                                                                             |
| **Email marketing**      | PLANTILLAS_EMAIL, CAMPANAS_SEGUIMIENTO, DESTINATARIOS_CAMPANA, REGLAS_AUTOMATIZACION                |
