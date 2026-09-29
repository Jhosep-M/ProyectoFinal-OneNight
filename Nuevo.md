PROMPT MAESTRO DE TRASPASO DEL PROYECTO



Quiero que tomes el control de un proyecto universitario de Ingeniería de Sistemas que estoy desarrollando. Este prompt contiene el contexto, decisiones, arquitectura, avances y pendientes. No reinicies el proyecto desde cero. Continúa exactamente desde el estado descrito aquí.



Tu función será actuar como arquitecto de software + desarrollador backend/frontend + especialista en bases de datos + especialista en seguridad, manteniendo las decisiones que ya fueron aprobadas.



1\. OBJETIVO GENERAL DEL PROYECTO



El proyecto consiste en desarrollar dos sistemas independientes pero integrados mediante APIs:



SISTEMA 1 — POS / Heladería-Cafetería



Sistema de gestión de:



ventas;

caja;

pedidos;

mesas;

productos;

categorías;

inventario;

insumos;

recetas;

proveedores;

clientes;

fidelización;

promociones;

devoluciones;

pagos;

reportes;

auditoría;

estimación de consumo de agua y energía.



Stack:



React

Node.js

Supabase/PostgreSQL

Sequelize

Docker

Kubernetes

AWS

SISTEMA 2 — Monitoreo de Agua y Energía



Sistema encargado de:



organizaciones;

puntos de medición;

tipos de recurso;

registros de consumo;

tarifas;

umbrales;

clasificación;

alertas;

notificaciones;

metas de reducción;

recomendaciones;

auditoría;

integración con aplicaciones externas.



Stack:



React

Node.js

Supabase/PostgreSQL

Sequelize

Docker

Kubernetes

AWS

2\. VISIÓN ARQUITECTÓNICA



Los dos sistemas son independientes.



NO deben compartir tablas.



NO deben acceder directamente a las tablas del otro sistema.



La comunicación será mediante APIs seguras sobre HTTPS.



Arquitectura:



INTERNET

↓

WAF/CDN + TLS/HTTPS

↓

┌───────────────────────┬────────────────────────┐

│ │ │

POS React Monitoreo React

│ │

POS Node.js API Monitoreo Node.js API

│ │

POS Supabase Monitoreo Supabase

│ │

└──────────── API SEGURA ────────────┘



Regla fundamental:



React

↓

Node.js

↓

Autenticación

↓

JWT

↓

RBAC

↓

Validación

↓

Rate limiting

↓

Auditoría

↓

Supabase/RLS

↓

PostgreSQL



La prioridad principal del proyecto es:



SEGURIDAD



La aplicación debe diseñarse pensando en evitar:



SQL Injection;

XSS;

CSRF;

robo de JWT;

abuso de endpoints;

acceso horizontal entre usuarios;

escalada de privilegios;

manipulación directa de datos;

duplicación de operaciones;

exposición de API keys;

exposición de secretos;

modificación/eliminación de auditoría;

inconsistencias de stock;

doble venta;

doble procesamiento de integraciones.

3\. REQUISITOS IMPORTANTES DEL PROYECTO



El documento de requisitos establece, entre otros:



POS:



historial de ventas;

exportación de reportes;

cierre diario;

auditoría;

cálculo de consumo de agua y energía;

envío autenticado al Monitoreo;

cola de reintentos;

recepción de alertas;

configuración de umbrales;

rechazo de umbrales inválidos.



También exige:



contraseñas protegidas;

consultas parametrizadas/ORM Sequelize;

prevención de XSS y CSRF;

comunicación HTTPS;

expiración de sesiones;

RBAC;

recuperación de contraseña segura;

auditoría de eventos críticos;

ventas concurrentes sin inconsistencias;

disponibilidad;

backup periódico.



Los requisitos relevantes del documento incluyen RF79–RF92 y RNF01–RNF18. El requisito RF87 especifica que el consumo debe estimarse al cerrar cada turno según horas operativas y equipos activos. RF88 exige envío autenticado al módulo de monitoreo. RF89 exige encolar el consumo si el monitoreo no responde. RF90 exige recibir y mostrar alertas. RF91/RF92 cubren configuración y validación de umbrales.



No inventes requisitos que contradigan el documento.



4\. DECISIÓN SOBRE AUTENTICACIÓN



Estamos usando Supabase Auth.



Por tanto:



Supabase Auth administra contraseña, sesión, recuperación y JWT.

La tabla pública usuario NO debe almacenar una contraseña propia si se está usando Supabase Auth.

No debe existir un passwordHash duplicado en public.usuario.

El identificador del usuario debe relacionarse con auth.users.id.

El backend debe validar el JWT.

El usuario no puede indicar libremente su propio usuario\_id para realizar operaciones sensibles.

Para operaciones basadas en identidad debe utilizarse la identidad autenticada/JWT.



El frontend React nunca debe contener:



service\_role;

secretos;

API keys privadas;

credenciales de base de datos.

5\. RBAC



Se decidió utilizar:



Usuario

↓

Rol

↓

RolPermiso

↓

Permiso



No queremos depender exclusivamente de:



if role == "admin"



sino manejar permisos explícitos.



Roles POS:



cajero

mesero

inventario

supervisor

admin



El sistema debe poder tener permisos como:



venta.consultar

venta.crear

venta.anular

turno.consultar

turno.consultar.todos

turno.abrir

turno.cerrar

producto.consultar

producto.gestionar

inventario.consultar

inventario.movimiento

devolucion.autorizar

auditoria.consultar

usuario.gestionar

rol.gestionar

promocion.gestionar

configuracion.gestionar



La lista puede crecer, pero no debemos eliminar el modelo RBAC.



6\. MODELO POS V2.1 APROBADO

Seguridad



Usuario:



UUID idUsuario PK

nombre

email UNIQUE

rolId FK

estado

creadoEn

actualizadoEn



Rol:



UUID idRol PK

nombre UNIQUE

descripcion

estado



Permiso:



UUID idPermiso PK

nombre UNIQUE

descripcion

modulo



RolPermiso:



UUID idRolPermiso PK

rolId FK

permisoId FK



Relaciones:



Usuario → Rol

Rol → Usuario

Rol → RolPermiso

Permiso → RolPermiso



7\. CAJA POS



TurnoCaja:



idTurno PK

usuarioId FK

montoInicial

montoFinalEsperado

montoFinalReal

diferencia

fechaApertura

fechaCierre

estado



Regla:



Un usuario no debe tener dos turnos abiertos simultáneamente.



Debe existir una restricción/index único parcial para garantizarlo.



El cierre del turno no debe ser un UPDATE común desde React.



Debe pasar por una operación controlada:



cerrar\_turno()



La función debe:



bloquear el turno con FOR UPDATE;

comprobar que esté abierto;

finalizar equipos activos;

calcular ventas;

calcular efectivo;

calcular monto esperado;

recibir monto real;

calcular diferencia;

generar alerta si supera el umbral;

cerrar el turno;

calcular consumo;

guardar consumo;

crear trabajos de integración;

registrar auditoría.

8\. CLIENTES



Cliente:



idCliente

nombre

telefono

correo

puntosFidelidad

estado

creadoEn



MovimientoPuntos:



idMovimiento

clienteId

ventaId

puntos

tipo

motivo

fecha



Reglas:



cliente puede tener muchas ventas;

cliente puede tener movimientos de puntos;

una venta puede generar movimiento de puntos;

no modificar manualmente el saldo sin trazabilidad;

las operaciones de puntos deben quedar registradas.

9\. VENTAS



Venta:



idVenta

turnoId

clienteId nullable

pedidoId nullable

subtotal

descuento

total

estado

motivoAnulacion

fecha



DetalleVenta:



idDetalleVenta

ventaId

productoId

cantidad

precioUnitario

descuento

subtotal



Relaciones:



TurnoCaja 1 → muchas Venta



Venta 1 → uno o muchos DetalleVenta



Producto 1 → muchos DetalleVenta



Una venta anulada NO debe borrarse.



Debe mantenerse en historial con:



estado = anulada



y:



motivoAnulacion



10\. PAGOS



Pago:



idPago

ventaId

metodoPagoId

monto

referencia

estado

fecha



MetodoPago:



idMetodoPago

nombre

estado



Una venta puede recibir uno o varios pagos.



Esto permite pagos divididos.



El total de pagos debe coincidir con el total de venta antes de confirmar la venta.



11\. MESAS Y PEDIDOS



Mesa:



idMesa

numero UNIQUE

estado



Pedido:



idPedido

mesaId

meseroId

estado

fecha

fechaCierre



DetallePedido:



idDetallePedido

pedidoId

productoId

cantidad

precioUnitario

observacion

subtotal



Relaciones:



Mesa → Pedido



Usuario → Pedido



Pedido → DetallePedido



Producto → DetallePedido



Pedido → Venta opcionalmente.



12\. PRODUCTOS E INVENTARIO



Producto:



idProducto

categoriaId

nombre

precio

stock

stockMinimo

estado

creadoEn



Categoria:



idCategoria

nombre UNIQUE

estado



Producto pertenece a una categoría.



Categoría tiene muchos productos.



No eliminar físicamente productos que ya tienen ventas.



Usar estado activo/inactivo.



13\. RECETAS E INSUMOS



RecetaInsumo:



idReceta

productoId

insumoId

cantidadRequerida



Insumo:



idInsumo

nombre

unidadMedida

stock

stockMinimo

fechaVencimiento

estado



Regla:



Una venta debe descontar:



producto;

insumos de la receta correspondiente.



Ejemplo:



1 helado =

100 g de base

1 barquillo



Si se venden 2:



producto -2

base -200 g

barquillo -2



Las operaciones de stock deben ser transaccionales y seguras frente a concurrencia.



Debe utilizarse bloqueo cuando sea necesario, por ejemplo:



SELECT ... FOR UPDATE



No permitir stock negativo.



14\. MOVIMIENTO DE INVENTARIO



MovimientoInventario debe tener trazabilidad.



Campos conceptuales:



idMovimiento

insumoId

proveedorId nullable

usuarioId

productoId nullable

ventaId nullable

devolucionId nullable

tipo

cantidad

motivo

fecha



Los movimientos históricos NO deberían actualizarse ni eliminarse.



La corrección se hace mediante nuevos movimientos.



Ejemplo:



INGRESO +50



si hubo error:



AJUSTE -10



en lugar de modificar el movimiento anterior.



15\. PROVEEDORES



Proveedor:



idProveedor

nombre

nit UNIQUE

contacto

telefono

correo

estado



No se debe permitir proveedor duplicado por NIT/RUC.



16\. PROMOCIONES



Promocion:



idPromocion

nombre

porcentajeDescuento

fechaInicio

fechaFin

estado



PromocionProducto:



idPromocionProducto

promocionId

productoId



Debe existir:



UNIQUE(promocion\_id, producto\_id)



Validar fechas y porcentaje.



17\. DEVOLUCIONES



Devolucion:



idDevolucion

ventaId

productoId

autorizadoPorId

cantidad

monto

motivo

estado

fecha



Una venta puede tener múltiples devoluciones.



Las devoluciones requieren autorización de supervisor/admin según las reglas del sistema.



IMPORTANTE:



La función procesar\_devolucion() que ya hicimos actualmente restaura el stock del producto, pero quedó pendiente agregar también el reintegro proporcional de los insumos de la receta.



Esto debe corregirse.



Ejemplo:



Venta:



2 helados



Devolución:



1 helado



Debe:



producto +1

insumo base +100 g

barquillo +1



Además, debe registrarse MovimientoInventario y auditoría.



18\. CONSUMO DE AGUA Y ENERGÍA



Se corrigió un diseño anterior.



NO usar:



litros

kwh



como columnas separadas dentro de ConsumoReportado.



Ahora debe utilizar:



tipoRecurso

cantidad

unidadMedida



Ejemplo:



agua → 150 litros



energia → 25 kWh



Esto evita mezclar dos recursos diferentes.



19\. EQUIPOS DE CONSUMO



Para cumplir RF87 se agregó:



EquipoConsumo:



idEquipo

nombre

tipoRecurso

consumoPorHora

unidadMedida

activo

creadoEn

actualizadoEn



Ejemplos conceptuales:



Congelador → energía → kWh/h



Refrigerador → energía → kWh/h



Lavamanos → agua → litros/h



Los valores reales deben venir de los parámetros definidos para el proyecto/local.



No inventar consumos reales si el requisito no los proporciona.



20\. EQUIPO\_TURNO



Para registrar qué equipos estuvieron activos durante el turno:



EquipoTurno:



idEquipoTurno

equipoId

turnoId

horaInicio

horaFin

estado

creadoEn



La estimación será conceptualmente:



consumo = consumoPorHora × horasActivas



Ejemplo:



2.5 kWh/h × 8 horas = 20 kWh



Al cerrar el turno:



finalizar equipos activos;

registrar horaFin;

calcular horas;

calcular agua;

calcular energía.

21\. FUNCIONES DE CONSUMO



Ya se definieron conceptualmente:



calcular\_consumo\_agua(turno\_id)



calcular\_consumo\_energia(turno\_id)



La función de energía:



CREATE OR REPLACE FUNCTION calcular\_consumo\_energia(

&#x20;   p\_turno\_id UUID

)

RETURNS NUMERIC

LANGUAGE plpgsql

AS $$

DECLARE

&#x20;   v\_total NUMERIC(14,4);

BEGIN



&#x20;   SELECT COALESCE(

&#x20;       SUM(

&#x20;           e.consumo\_por\_hora

&#x20;           \*

&#x20;           (

&#x20;               EXTRACT(

&#x20;                   EPOCH FROM

&#x20;                   (

&#x20;                       COALESCE(et.hora\_fin, NOW())

&#x20;                       - et.hora\_inicio

&#x20;                   )

&#x20;               ) / 3600

&#x20;           )

&#x20;       ),

&#x20;       0

&#x20;   )

&#x20;   INTO v\_total



&#x20;   FROM equipo\_turno et



&#x20;   INNER JOIN equipo\_consumo e

&#x20;       ON e.id\_equipo = et.equipo\_id



&#x20;   WHERE et.turno\_id = p\_turno\_id

&#x20;     AND e.tipo\_recurso = 'energia';



&#x20;   RETURN ROUND(v\_total, 4);



END;

$$;



La función de agua utiliza exactamente la misma lógica, filtrando:



tipo\_recurso = 'agua'



IMPORTANTE:



Al cerrar el turno debemos primero ejecutar:



UPDATE equipo\_turno

SET

&#x20;   hora\_fin = NOW(),

&#x20;   estado = 'finalizado'

WHERE turno\_id = p\_turno\_id

&#x20; AND estado = 'activo'

&#x20; AND hora\_fin IS NULL;



Después calcular el consumo.



22\. CONSUMO\_REPORTADO



La estructura acordada:



CREATE TABLE IF NOT EXISTS consumo\_reportado (

&#x20;   id\_consumo UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),



&#x20;   turno\_id UUID NOT NULL

&#x20;       REFERENCES turno\_caja(id\_turno),



&#x20;   tipo\_recurso VARCHAR(20) NOT NULL

&#x20;       CHECK (tipo\_recurso IN ('agua', 'energia')),



&#x20;   cantidad NUMERIC(14,4) NOT NULL

&#x20;       CHECK (cantidad >= 0),



&#x20;   unidad\_medida VARCHAR(20) NOT NULL,



&#x20;   fecha\_consumo TIMESTAMPTZ NOT NULL DEFAULT NOW(),



&#x20;   estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'

&#x20;       CHECK (estado IN ('pendiente', 'enviado', 'error')),



&#x20;   fecha\_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()

);



Índice:



CREATE UNIQUE INDEX IF NOT EXISTS ux\_consumo\_turno\_recurso

ON consumo\_reportado(turno\_id, tipo\_recurso);



Esto evita duplicar el mismo recurso para el mismo turno.



23\. COLA DE INTEGRACIÓN POS → MONITOREO



Tabla acordada:



CREATE TABLE IF NOT EXISTS cola\_integracion (

&#x20;   id\_cola UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),



&#x20;   consumo\_id UUID NOT NULL

&#x20;       REFERENCES consumo\_reportado(id\_consumo),



&#x20;   operacion VARCHAR(50) NOT NULL,



&#x20;   idempotency\_key VARCHAR(150) NOT NULL UNIQUE,



&#x20;   intentos INTEGER NOT NULL DEFAULT 0,



&#x20;   estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'

&#x20;       CHECK (

&#x20;           estado IN (

&#x20;               'pendiente',

&#x20;               'procesando',

&#x20;               'enviado',

&#x20;               'error',

&#x20;               'cancelado'

&#x20;           )

&#x20;       ),



&#x20;   respuesta TEXT,



&#x20;   error TEXT,



&#x20;   proximo\_intento TIMESTAMPTZ,



&#x20;   ultimo\_intento TIMESTAMPTZ,



&#x20;   creado\_en TIMESTAMPTZ NOT NULL DEFAULT NOW()

);



La finalidad es:



Si Monitoreo está caído:



POS guarda consumo

↓

cola\_integracion

↓

Node.js Worker

↓

reintenta posteriormente



No se debe perder el consumo.



24\. NO HACER HTTP DESDE POSTGRESQL



La base de datos NO debe llamar directamente a la API externa.



La integración debe ser:



PostgreSQL

↓

cola\_integracion

↓

Node.js Worker

↓

HTTPS

↓

Monitoring API



Node.js será responsable de:



tomar trabajos;

controlar intentos;

timeout;

retry;

backoff;

autenticación;

HTTPS;

registrar respuesta;

marcar enviado/error;

evitar procesamiento duplicado.

25\. CERRAR\_TURNO()



La función que estábamos implementando tiene esta estructura:



CREATE OR REPLACE FUNCTION cerrar\_turno(

&#x20;   p\_turno\_id UUID,

&#x20;   p\_monto\_final\_real NUMERIC

)

RETURNS JSONB

LANGUAGE plpgsql

SECURITY DEFINER

SET search\_path = public

AS $$

DECLARE

&#x20;   v\_turno turno\_caja%ROWTYPE;



&#x20;   v\_total\_ventas NUMERIC(14,2) := 0;

&#x20;   v\_total\_efectivo NUMERIC(14,2) := 0;



&#x20;   v\_monto\_esperado NUMERIC(14,2);

&#x20;   v\_diferencia NUMERIC(14,2);



&#x20;   v\_umbral NUMERIC(14,2);



&#x20;   v\_alerta\_id UUID;



&#x20;   v\_consumo\_agua UUID;

&#x20;   v\_consumo\_energia UUID;



BEGIN



&#x20;   IF p\_turno\_id IS NULL THEN

&#x20;       RAISE EXCEPTION 'El turno es obligatorio';

&#x20;   END IF;



&#x20;   IF p\_monto\_final\_real IS NULL OR p\_monto\_final\_real < 0 THEN

&#x20;       RAISE EXCEPTION 'El monto final real no es válido';

&#x20;   END IF;



&#x20;   SELECT \*

&#x20;   INTO v\_turno

&#x20;   FROM turno\_caja

&#x20;   WHERE id\_turno = p\_turno\_id

&#x20;   FOR UPDATE;



&#x20;   IF NOT FOUND THEN

&#x20;       RAISE EXCEPTION 'El turno no existe';

&#x20;   END IF;



&#x20;   IF v\_turno.estado <> 'abierto' THEN

&#x20;       RAISE EXCEPTION

&#x20;           'El turno no está abierto. Estado actual: %',

&#x20;           v\_turno.estado;

&#x20;   END IF;



&#x20;   /\*

&#x20;    \* IMPORTANTE:

&#x20;    \* antes de calcular consumo debemos finalizar

&#x20;    \* los equipos activos.

&#x20;    \*/



&#x20;   UPDATE equipo\_turno

&#x20;   SET

&#x20;       hora\_fin = NOW(),

&#x20;       estado = 'finalizado'

&#x20;   WHERE turno\_id = p\_turno\_id

&#x20;     AND estado = 'activo'

&#x20;     AND hora\_fin IS NULL;



&#x20;   SELECT COALESCE(SUM(total), 0)

&#x20;   INTO v\_total\_ventas

&#x20;   FROM venta

&#x20;   WHERE turno\_id = p\_turno\_id

&#x20;     AND estado = 'activa';



&#x20;   SELECT COALESCE(SUM(p.monto), 0)

&#x20;   INTO v\_total\_efectivo

&#x20;   FROM pago p

&#x20;   INNER JOIN venta v

&#x20;       ON v.id\_venta = p.venta\_id

&#x20;   INNER JOIN metodo\_pago mp

&#x20;       ON mp.id\_metodo\_pago = p.metodo\_pago\_id

&#x20;   WHERE v.turno\_id = p\_turno\_id

&#x20;     AND v.estado = 'activa'

&#x20;     AND p.estado = 'confirmado'

&#x20;     AND LOWER(mp.nombre) = 'efectivo';



&#x20;   v\_monto\_esperado :=

&#x20;       COALESCE(v\_turno.monto\_inicial, 0)

&#x20;       + v\_total\_efectivo;



&#x20;   v\_diferencia :=

&#x20;       p\_monto\_final\_real - v\_monto\_esperado;



&#x20;   SELECT valor::NUMERIC

&#x20;   INTO v\_umbral

&#x20;   FROM configuracion\_pos

&#x20;   WHERE clave = 'umbral\_diferencia\_caja';



&#x20;   v\_umbral := COALESCE(v\_umbral, 50.00);



&#x20;   IF ABS(v\_diferencia) > v\_umbral THEN



&#x20;       INSERT INTO alerta\_pos (

&#x20;           turno\_id,

&#x20;           tipo,

&#x20;           nivel,

&#x20;           mensaje

&#x20;       )

&#x20;       VALUES (

&#x20;           p\_turno\_id,

&#x20;           'diferencia\_caja',



&#x20;           CASE

&#x20;               WHEN ABS(v\_diferencia) >= v\_umbral \* 2

&#x20;                   THEN 'critico'

&#x20;               ELSE

&#x20;                   'alto'

&#x20;           END,



&#x20;           'Diferencia de caja detectada: '

&#x20;           || ROUND(v\_diferencia, 2)

&#x20;           || ' Bs'

&#x20;       )

&#x20;       RETURNING id\_alerta

&#x20;       INTO v\_alerta\_id;



&#x20;   END IF;



&#x20;   UPDATE turno\_caja

&#x20;   SET

&#x20;       monto\_final\_esperado = v\_monto\_esperado,

&#x20;       monto\_final\_real = p\_monto\_final\_real,

&#x20;       diferencia = v\_diferencia,

&#x20;       fecha\_cierre = NOW(),

&#x20;       estado = 'cerrado'

&#x20;   WHERE id\_turno = p\_turno\_id;



&#x20;   INSERT INTO consumo\_reportado (

&#x20;       turno\_id,

&#x20;       tipo\_recurso,

&#x20;       cantidad,

&#x20;       unidad\_medida,

&#x20;       fecha\_consumo,

&#x20;       estado

&#x20;   )

&#x20;   VALUES (

&#x20;       p\_turno\_id,

&#x20;       'agua',

&#x20;       calcular\_consumo\_agua(p\_turno\_id),

&#x20;       'litros',

&#x20;       NOW(),

&#x20;       'pendiente'

&#x20;   )

&#x20;   RETURNING id\_consumo

&#x20;   INTO v\_consumo\_agua;



&#x20;   INSERT INTO consumo\_reportado (

&#x20;       turno\_id,

&#x20;       tipo\_recurso,

&#x20;       cantidad,

&#x20;       unidad\_medida,

&#x20;       fecha\_consumo,

&#x20;       estado

&#x20;   )

&#x20;   VALUES (

&#x20;       p\_turno\_id,

&#x20;       'energia',

&#x20;       calcular\_consumo\_energia(p\_turno\_id),

&#x20;       'kWh',

&#x20;       NOW(),

&#x20;       'pendiente'

&#x20;   )

&#x20;   RETURNING id\_consumo

&#x20;   INTO v\_consumo\_energia;



&#x20;   INSERT INTO cola\_integracion (

&#x20;       consumo\_id,

&#x20;       operacion,

&#x20;       idempotency\_key,

&#x20;       intentos,

&#x20;       estado,

&#x20;       proximo\_intento

&#x20;   )

&#x20;   VALUES

&#x20;   (

&#x20;       v\_consumo\_agua,

&#x20;       'enviar\_consumo',

&#x20;       'CONSUMO-' || v\_consumo\_agua,

&#x20;       0,

&#x20;       'pendiente',

&#x20;       NOW()

&#x20;   ),

&#x20;   (

&#x20;       v\_consumo\_energia,

&#x20;       'enviar\_consumo',

&#x20;       'CONSUMO-' || v\_consumo\_energia,

&#x20;       0,

&#x20;       'pendiente',

&#x20;       NOW()

&#x20;   );



&#x20;   INSERT INTO auditoria\_accion (

&#x20;       usuario\_id,

&#x20;       accion,

&#x20;       entidad,

&#x20;       entidad\_id,

&#x20;       resultado,

&#x20;       fecha,

&#x20;       detalle

&#x20;   )

&#x20;   VALUES (

&#x20;       v\_turno.usuario\_id,

&#x20;       'CERRAR\_TURNO',

&#x20;       'turno\_caja',

&#x20;       p\_turno\_id,

&#x20;       'exitoso',

&#x20;       NOW(),

&#x20;       jsonb\_build\_object(

&#x20;           'montoInicial', v\_turno.monto\_inicial,

&#x20;           'montoEsperado', v\_monto\_esperado,

&#x20;           'montoReal', p\_monto\_final\_real,

&#x20;           'diferencia', v\_diferencia,

&#x20;           'alertaId', v\_alerta\_id,

&#x20;           'consumoAguaId', v\_consumo\_agua,

&#x20;           'consumoEnergiaId', v\_consumo\_energia

&#x20;       )::TEXT

&#x20;   );



&#x20;   RETURN jsonb\_build\_object(

&#x20;       'exito', true,

&#x20;       'turnoId', p\_turno\_id,

&#x20;       'montoInicial', v\_turno.monto\_inicial,

&#x20;       'totalEfectivo', v\_total\_efectivo,

&#x20;       'montoEsperado', v\_monto\_esperado,

&#x20;       'montoReal', p\_monto\_final\_real,

&#x20;       'diferencia', v\_diferencia,

&#x20;       'alertaGenerada', v\_alerta\_id IS NOT NULL,

&#x20;       'alertaId', v\_alerta\_id,

&#x20;       'consumoAguaId', v\_consumo\_agua,

&#x20;       'consumoEnergiaId', v\_consumo\_energia

&#x20;   );



END;

$$;



IMPORTANTE:



Este código es el borrador más reciente, NO debe considerarse todavía producción.



Debe revisarse y endurecerse antes de exponerlo.



26\. CONFIGURACIÓN DE UMBRAL



Se creó conceptualmente:



CREATE TABLE IF NOT EXISTS configuracion\_pos (

&#x20;   id\_configuracion UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),



&#x20;   clave VARCHAR(100) NOT NULL UNIQUE,



&#x20;   valor VARCHAR(100) NOT NULL,



&#x20;   descripcion TEXT,



&#x20;   actualizado\_en TIMESTAMPTZ NOT NULL DEFAULT NOW()

);



Y:



INSERT INTO configuracion\_pos

&#x20;   (clave, valor, descripcion)

VALUES

(

&#x20;   'umbral\_diferencia\_caja',

&#x20;   '50.00',

&#x20;   'Diferencia máxima permitida antes de generar alerta'

)

ON CONFLICT (clave) DO NOTHING;



No debe quedar un valor hardcodeado permanentemente en el código.



27\. ALERTAS INTERNAS POS



Se agregó:



CREATE TABLE IF NOT EXISTS alerta\_pos (

&#x20;   id\_alerta UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),



&#x20;   turno\_id UUID NOT NULL

&#x20;       REFERENCES turno\_caja(id\_turno),



&#x20;   tipo VARCHAR(50) NOT NULL,



&#x20;   nivel VARCHAR(20) NOT NULL

&#x20;       CHECK (nivel IN ('bajo', 'medio', 'alto', 'critico')),



&#x20;   mensaje TEXT NOT NULL,



&#x20;   estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'

&#x20;       CHECK (estado IN ('pendiente', 'atendida', 'cancelada')),



&#x20;   creado\_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),



&#x20;   atendido\_en TIMESTAMPTZ,



&#x20;   atendido\_por UUID

&#x20;       REFERENCES usuario(id\_usuario)

);



Una diferencia de caja pertenece al POS.



No debe confundirse con las alertas ambientales generadas por el sistema de Monitoreo.



28\. AUDITORÍA POS



AuditoriaAccion:



idAuditoria

usuarioId

accion

entidad

entidadId

resultado

direccionIP

userAgent

fecha

detalle



Debe registrar como mínimo eventos críticos:



anulaciones;

devoluciones;

cambios de precio;

inicios de sesión fallidos;

cierre de turno;

operaciones administrativas;

eventos de integración importantes.



La auditoría NO debe ser editable/eliminable por usuarios normales.



29\. RLS



RLS ya empezó a implementarse.



Todas las tablas sensibles deben tener:



ALTER TABLE ... ENABLE ROW LEVEL SECURITY;



No utilizar:



USING (true)



de forma indiscriminada.



La seguridad debe basarse en:



auth.uid()

\+

RBAC

\+

permisos

\+

relación con la fila cuando corresponda.



30\. FUNCIÓN DE ROL



Se creó:



CREATE OR REPLACE FUNCTION obtener\_rol\_usuario()

RETURNS TEXT

LANGUAGE sql

STABLE

SECURITY DEFINER

SET search\_path = public

AS $$

&#x20;   SELECT r.nombre

&#x20;   FROM usuario u

&#x20;   INNER JOIN rol r

&#x20;       ON r.id\_rol = u.rol\_id

&#x20;   WHERE u.id\_usuario = auth.uid()

&#x20;     AND u.estado = 'activo'

&#x20;   LIMIT 1;

$$;

31\. FUNCIÓN DE PERMISOS



También:



CREATE OR REPLACE FUNCTION usuario\_tiene\_permiso(

&#x20;   p\_permiso TEXT

)

RETURNS BOOLEAN

LANGUAGE sql

STABLE

SECURITY DEFINER

SET search\_path = public

AS $$

&#x20;   SELECT EXISTS (

&#x20;       SELECT 1

&#x20;       FROM usuario u

&#x20;       INNER JOIN rol r

&#x20;           ON r.id\_rol = u.rol\_id

&#x20;       INNER JOIN rol\_permiso rp

&#x20;           ON rp.rol\_id = r.id\_rol

&#x20;       INNER JOIN permiso p

&#x20;           ON p.id\_permiso = rp.permiso\_id

&#x20;       WHERE u.id\_usuario = auth.uid()

&#x20;         AND u.estado = 'activo'

&#x20;         AND r.estado = 'activo'

&#x20;         AND p.nombre = p\_permiso

&#x20;   );

$$;

32\. POLICIES YA DEFINIDAS CONCEPTUALMENTE



Producto SELECT:



CREATE POLICY producto\_select

ON producto

FOR SELECT

TO authenticated

USING (

&#x20;   usuario\_tiene\_permiso('producto.consultar')

);



Producto INSERT:



CREATE POLICY producto\_insert

ON producto

FOR INSERT

TO authenticated

WITH CHECK (

&#x20;   usuario\_tiene\_permiso('producto.gestionar')

);



Producto UPDATE:



CREATE POLICY producto\_update

ON producto

FOR UPDATE

TO authenticated

USING (

&#x20;   usuario\_tiene\_permiso('producto.gestionar')

)

WITH CHECK (

&#x20;   usuario\_tiene\_permiso('producto.gestionar')

);



NO se recomienda DELETE físico de productos.



33\. INVENTARIO RLS



Consulta:



CREATE POLICY movimiento\_inventario\_select

ON movimiento\_inventario

FOR SELECT

TO authenticated

USING (

&#x20;   usuario\_tiene\_permiso('inventario.consultar')

);



Insertar:



CREATE POLICY movimiento\_inventario\_insert

ON movimiento\_inventario

FOR INSERT

TO authenticated

WITH CHECK (

&#x20;   usuario\_tiene\_permiso('inventario.movimiento')

);



No permitir UPDATE/DELETE de movimientos históricos.



34\. VENTAS RLS



SELECT:



CREATE POLICY venta\_select

ON venta

FOR SELECT

TO authenticated

USING (

&#x20;   usuario\_tiene\_permiso('venta.consultar')

);



INSERT:



CREATE POLICY venta\_insert

ON venta

FOR INSERT

TO authenticated

WITH CHECK (

&#x20;   usuario\_tiene\_permiso('venta.crear')

&#x20;   AND EXISTS (

&#x20;       SELECT 1

&#x20;       FROM turno\_caja tc

&#x20;       WHERE tc.id\_turno = turno\_id

&#x20;         AND tc.usuario\_id = auth.uid()

&#x20;         AND tc.estado = 'abierto'

&#x20;   )

);



El objetivo es evitar que un cajero utilice el turno de otro usuario.



35\. TURNOS RLS



SELECT:



CREATE POLICY turno\_select

ON turno\_caja

FOR SELECT

TO authenticated

USING (

&#x20;   usuario\_id = auth.uid()

&#x20;   OR usuario\_tiene\_permiso('turno.consultar.todos')

);



INSERT:



CREATE POLICY turno\_insert

ON turno\_caja

FOR INSERT

TO authenticated

WITH CHECK (

&#x20;   usuario\_id = auth.uid()

&#x20;   AND usuario\_tiene\_permiso('turno.abrir')

);



El cierre debe hacerse mediante la función controlada y no mediante UPDATE libre.



36\. AUDITORÍA RLS



Consulta:



CREATE POLICY auditoria\_select

ON auditoria\_accion

FOR SELECT

TO authenticated

USING (

&#x20;   usuario\_tiene\_permiso('auditoria.consultar')

);



No dar INSERT/UPDATE/DELETE libre a usuarios normales.



37\. ADVERTENCIA DE SEGURIDAD SOBRE SECURITY DEFINER



Las funciones:



cerrar\_turno();

registrar\_venta();

anular\_venta();

procesar\_devolucion();



han utilizado SECURITY DEFINER.



Esto es peligroso si se expone sin restricciones.



Antes de producción:



revisar search\_path;

validar todas las entradas;

no confiar en IDs enviados desde frontend;

revocar EXECUTE de PUBLIC;

limitar quién puede ejecutar las funciones;

preferiblemente ejecutar las operaciones sensibles desde Node.js mediante una capa controlada;

derivar usuario de JWT/auth.uid() cuando corresponda.



Ejemplo:



REVOKE EXECUTE

ON FUNCTION cerrar\_turno(UUID, NUMERIC)

FROM PUBLIC;



No considerar estas funciones seguras automáticamente solo porque usan SECURITY DEFINER.



38\. SISTEMA DE MONITOREO V2.1



Entidades aprobadas:



Usuario

idUsuario

nombre

email UNIQUE

rolId

estado

timestamps

Rol

idRol

nombre

descripcion

estado

Permiso

idPermiso

nombre

descripcion

modulo

RolPermiso

idRolPermiso

rolId

permisoId

39\. ORGANIZACIÓN



Organizacion:



idOrganizacion

nombre

rubro

direccion

estado

creadoEn

actualizadoEn



UsuarioOrganizacion:



idUsuarioOrganizacion

usuarioId

organizacionId

estado



Esto permite que un usuario esté relacionado con organizaciones.



40\. INTEGRACIÓN



Integracion:



idIntegracion

organizacionId

sistemaExterno

tipo

apiKeyHash

estado

fechaCreacion

fechaExpiracion

ultimoUso

revocadaEn



IMPORTANTE:



NO almacenar API keys externas en texto plano.



Debe almacenarse hash cuando sea posible y manejarse el secreto de forma segura.



Debe existir revocación.



41\. PUNTOS DE MEDICIÓN



PuntoMedicion:



idPuntoMedicion

organizacionId

tipoRecursoId

codigoMedidor

ubicacion

estado

creadoEn



Debe existir:



UNIQUE(codigo\_medidor)



42\. TIPO DE RECURSO



TipoRecurso:



idTipoRecurso

nombre

unidadMedida

estado



Valores principales:



agua

energia



43\. RECEPCIÓN DEL POS



RecepcionConsumoPOS:



idRecepcion

organizacionId

consumoExternoId

idempotencyKey UNIQUE

tipoRecurso

cantidad

unidadMedida

fechaConsumo

sistemaOrigen

estado

fechaRecepcion



Esto es la frontera de integración.



44\. COLA DE PROCESAMIENTO MONITOREO



ColaProcesamiento:



idCola

recepcionConsumoId

tipoOperacion

intentos

estado

error

fechaCreacion

proximoIntento

fechaProcesamiento



Sirve para procesar el consumo recibido.



45\. REGISTRO DE CONSUMO



RegistroConsumo:



idRegistro

puntoMedicionId

tarifaId

recepcionConsumoId

fecha

cantidad

variacionPorcentual

nivel

costoEstimado

origen

facturaUrl

creadoEn



No duplicar información innecesaria del POS.



46\. UMBRALES



UmbralClasificacion:



idUmbral

tipoRecursoId

organizacionId

rangoMin

rangoMax

nivel

estado



Validaciones:



rangoMin >= 0;

rangoMax >= 0;

rangoMin < rangoMax;

evitar rangos solapados cuando la regla de negocio lo requiera;

organización opcional según el diseño aprobado.

47\. ALERTAS MONITOREO



Alerta:



idAlerta

registroConsumoId

nivel

mensaje

fechaGeneracion

estado



RegistroConsumo:



1 → 0..1 Alerta



48\. NOTIFICACIONES



Notificacion:



idNotificacion

alertaId

usuarioId

canal

titulo

mensaje

estado

fechaEnvio

fechaLectura



Una alerta puede producir varias notificaciones.



49\. ENTREGA DE ALERTAS AL POS



EntregaAlerta:



idEntrega

alertaId

organizacionId

sistemaDestino

tipo

intentos

estado

respuesta

fechaEnvio

proximoIntento

fechaProcesamiento



La entrega al POS debe permitir reintentos.



50\. METAS



MetaReduccion:



idMeta

organizacionId

tipoRecursoId

porcentajeObjetivo

periodoInicio

periodoFin

porcentajeActual

cumplida

estado



Validar:



0 <= porcentaje <= 100



periodoInicio < periodoFin



51\. TARIFAS



Tarifa:



idTarifa

tipoRecursoId

costoPorUnidad

vigenciaInicio

vigenciaFin

estado



Evitar períodos de vigencia contradictorios cuando corresponda.



52\. RECOMENDACIONES



Recomendacion:



idRecomendacion

tipoRecursoId

nivel

texto

estado

53\. AUDITORÍA MONITOREO



AuditoriaCambio:



idAuditoria

usuarioId

accion

entidad

entidadId

resultado

direccionIP

userAgent

fecha

detalle



Debe registrar cambios y eliminaciones importantes.



54\. INTEGRACIÓN POS → MONITOREO



Endpoint conceptual:



POST /api/v1/integrations/consumption



Payload:



{

&#x20; "consumoExternoId": "uuid-del-consumo",

&#x20; "tipoRecurso": "agua",

&#x20; "cantidad": 125.50,

&#x20; "unidadMedida": "litros",

&#x20; "fechaConsumo": "2026-09-17T18:30:00",

&#x20; "organizacionExternaId": "uuid-organizacion",

&#x20; "origen": "POS"

}



Para energía:



{

&#x20; "consumoExternoId": "uuid-del-consumo",

&#x20; "tipoRecurso": "energia",

&#x20; "cantidad": 18.40,

&#x20; "unidadMedida": "kWh",

&#x20; "fechaConsumo": "2026-09-17T18:30:00",

&#x20; "organizacionExternaId": "uuid-organizacion",

&#x20; "origen": "POS"

}



Debe utilizar autenticación mediante token/API credential.



HTTPS obligatorio.



55\. INTEGRACIÓN MONITOREO → POS



Endpoint conceptual:



POST /api/v1/integrations/alerts



Payload:



{

&#x20; "alertaId": "uuid-alerta",

&#x20; "nivel": "critico",

&#x20; "tipoRecurso": "agua",

&#x20; "mensaje": "Consumo superior al umbral permitido",

&#x20; "fechaGeneracion": "2026-09-17T19:00:00"

}



POS guarda solamente la información necesaria para recibir/procesar la alerta.



No copia las tablas completas de Monitoreo.



56\. IDEMPOTENCIA



Regla crítica:



POS → Monitoreo:



consumoExternoId









idempotencyKey



debe impedir duplicados.



Escenario:



POS envía consumo

↓

Monitoreo procesa

↓

se pierde respuesta

↓

POS reintenta

↓

Monitoreo reconoce idempotencyKey

↓

NO crea duplicado



Lo mismo en sentido inverso:



Monitoreo → POS



alertaExternaId



debe ser único.



Una misma alerta no puede generar:



Alerta #XYZ

Alerta #XYZ

Alerta #XYZ



como tres registros.



57\. REGLAS DE BASE DE DATOS



Utilizar:



UUID;

PK;

FK;

UNIQUE;

CHECK;

índices;

transacciones;

bloqueos cuando sea necesario;

NUMERIC para dinero;

timestamps;

estados controlados.



No usar FLOAT para dinero.



Restricciones importantes:



UNIQUE(email)



UNIQUE(nit)



UNIQUE(codigo\_medidor)



UNIQUE(idempotency\_key)



UNIQUE(promocion\_id, producto\_id)



UNIQUE(producto\_id, insumo\_id)



UNIQUE(usuario + turno abierto)



Evitar eliminación física de históricos críticos.



58\. CONCURRENCIA



Esto es obligatorio.



Dos cajas pueden vender simultáneamente.



No debe ocurrir:



Caja A lee stock 1

Caja B lee stock 1

A vende

B vende

stock termina inconsistente



Las operaciones de venta deben utilizar transacciones y bloqueo apropiado.



Ejemplo:



SELECT ...

FROM producto

WHERE id\_producto = ...

FOR UPDATE;



Después validar stock y descontar.



La venta completa debe ser atómica:



venta

\+

detalles

\+

pagos

\+

stock producto

\+

stock insumos

\+

movimientos

\+

auditoría



Si falla una parte:



ROLLBACK



59\. FUNCIÓN registrar\_venta()



Ya existe una versión conceptual implementada.



Debe:



validar usuario;

validar turno abierto;

bloquear productos;

validar stock;

validar cantidades;

calcular subtotales;

calcular total;

validar pagos;

insertar venta;

insertar detalles;

insertar pagos;

descontar producto;

descontar insumos de receta;

registrar movimientos;

registrar auditoría;

COMMIT.



Nunca permitir que React decida libremente:



precio final;

subtotal;

total;

stock resultante.



El backend/base debe recalcular y validar.



60\. FUNCIÓN anular\_venta()



Ya existe una versión conceptual.



Debe:



validar que la venta esté activa;

validar turno;

validar autorización supervisor/admin;

restaurar producto;

restaurar insumos;

registrar movimientos;

marcar venta anulada;

guardar motivo;

registrar auditoría.



Nunca borrar la venta.



61\. FUNCIÓN procesar\_devolucion()



Ya existe una versión conceptual.



Debe:



validar autorización;

comprobar cantidad vendida;

descontar devoluciones anteriores;

validar cantidad;

registrar devolución;

restaurar producto;

restaurar insumos de receta;

registrar movimiento;

registrar auditoría.



PENDIENTE:



Agregar formalmente la restauración proporcional de insumos.



62\. ESTADO DEL PROYECTO

YA DEFINIDO / APROBADO

Arquitectura de dos sistemas.

Separación de bases.

API entre sistemas.

Modelo POS V2.1.

Modelo Monitoreo V2.1.

RBAC.

UUID.

Supabase Auth como autenticación.

RLS como segunda capa.

Idempotencia.

Cola de integración.

Auditoría.

Pagos divididos.

Pedidos.

Mesas.

Recetas.

Inventario.

Devoluciones.

Consumo genérico agua/energía.

Equipos de consumo.

Equipo por turno.

Cierre de turno.

Arquitectura Node.js.

Uso de Sequelize.

Seguridad como prioridad.

Docker/Kubernetes/AWS como parte del despliegue futuro.

YA IMPLEMENTADO CON BORRADORES SQL

tablas principales POS;

funciones de venta;

función de anulación;

función de devolución;

función de cierre;

funciones de consumo;

configuración de umbral;

cola de integración;

primeras RLS/policies.



Pero los SQL todavía requieren revisión antes de producción.



63\. PENDIENTE INMEDIATO



El siguiente paso EXACTO donde debes continuar es:



TERMINAR Y ENDURECER RLS + POLICIES DEL POS



Debe hacerse tabla por tabla.



Orden recomendado:



usuario

rol

permiso

rol\_permiso

producto

categoria

insumo

receta\_insumo

proveedor

movimiento\_inventario

cliente

mesa

pedido

detalle\_pedido

venta

detalle\_venta

metodo\_pago

pago

turno\_caja

devolucion

promocion

promocion\_producto

consumo\_reportado

cola\_integracion

entrega\_alerta

alerta\_pos

auditoria\_accion

configuracion\_pos

equipo\_consumo

equipo\_turno



Para cada tabla quiero:



RLS;

SELECT;

INSERT;

UPDATE;

DELETE solamente si realmente corresponde;

USING;

WITH CHECK;

permisos;

relación con usuario/organización cuando aplique.



No crear policies permisivas solamente para "hacer funcionar" la aplicación.



64\. DESPUÉS DE RLS



El siguiente bloque será:



NODE.JS POS



Arquitectura:



src/

├── config/

├── controllers/

├── routes/

├── services/

├── repositories/

├── models/

├── middlewares/

├── validators/

├── integrations/

├── jobs/

├── utils/

├── security/

└── app.js



Endpoints conceptuales:



/api/v1/auth

/api/v1/users

/api/v1/products

/api/v1/categories

/api/v1/inventory

/api/v1/shifts

/api/v1/sales

/api/v1/payments

/api/v1/orders

/api/v1/returns

/api/v1/customers

/api/v1/promotions

/api/v1/reports

/api/v1/integrations

/api/v1/audit



Implementar:



JWT;

RBAC;

validación;

sanitización;

rate limiting;

CORS;

Helmet/security headers;

logging;

manejo centralizado de errores;

Sequelize;

transacciones;

timeouts;

idempotencia;

auditoría.

65\. SEGURIDAD WEB



El sistema debe considerar:



SQL Injection



Usar:



Sequelize

\+

consultas parametrizadas



Nunca concatenar input del usuario en SQL.



XSS



Validar/sanitizar entradas.



React escapa contenido normalmente, pero no confiar solamente en eso.



Cuidado especial con:



dangerouslySetInnerHTML



Debe evitarse salvo necesidad justificada y sanitización estricta.



CSRF



Definir correctamente estrategia de autenticación.



Si se usan cookies:



SameSite;

Secure;

HttpOnly;

protección CSRF.



Si se utiliza Authorization Bearer:



analizar correctamente almacenamiento y exposición del token.



CORS



No usar:



Access-Control-Allow-Origin: \*



en producción para endpoints privados.



Permitir únicamente dominios conocidos.



Rate limiting



Aplicarlo especialmente a:



login

recuperación de contraseña

integraciones

operaciones sensibles



Headers



Usar middleware de seguridad como Helmet y configurar:



CSP

HSTS

X-Content-Type-Options

Referrer-Policy

etc.



66\. SECRETOS



Nunca subir a GitHub:



.env

service\_role key

DB password

JWT secret

API keys privadas

AWS credentials



Usar:



.env local



y en producción:



AWS Secrets Manager / Parameter Store u otro mecanismo seguro.



67\. DOCKER



Después de backend:



crear Dockerfile para:



POS frontend;

POS backend;

Monitoring frontend;

Monitoring backend.



No meter secretos dentro de la imagen.



68\. KUBERNETES



Después:



Deployments;

Services;

ConfigMaps;

Secrets;

Ingress;

probes;

replicas;

resource limits;

autoscaling si corresponde.

69\. AWS



Objetivo final:



desplegar ambos sistemas en AWS.



Considerar:



ECS/EKS o solución acordada;

RDS si fuera necesario, aunque actualmente la base será Supabase;

CloudFront/CDN;

WAF;

Route 53;

HTTPS;

Secrets Manager;

logs;

monitoreo;

backups.



No sustituir Supabase automáticamente por RDS sin analizar primero la arquitectura.



70\. ESTILO DE TRABAJO QUE DEBES MANTENER



El usuario quiere respuestas:



en español;

prácticas;

directas;

técnicas;

ordenadas;

implementables;

sin explicaciones innecesariamente abstractas.



Cuando revises una parte, utiliza preferentemente:



ESTO YA ESTÁ

ESTO FALTA

ESTO DEBES CORREGIR



Si proporcionas SQL:



hacerlo ejecutable;

indicar dependencias;

mantener nombres consistentes;

no cambiar nombres de columnas sin explicar;

evitar código incompleto presentado como producción.



Si encuentras una decisión anterior insegura o inconsistente:



señalarla;

explicar por qué;

corregirla;

mantener compatibilidad con el diseño aprobado cuando sea posible.



No agregar tablas/clases simplemente por agregar.



Cada entidad debe justificar su existencia.



71\. REGLA FUNDAMENTAL PARA CONTINUAR



NO vuelvas a diseñar todo desde cero.



NO cambies V2.1 arbitrariamente.



NO mezcles las bases del POS y Monitoreo.



NO pongas lógica de negocio crítica en React.



NO confíes en roles enviados por el frontend.



NO expongas service\_role.



NO almacenes contraseñas si Supabase Auth ya las administra.



NO permitas eliminación física de históricos críticos.



NO hagas HTTP directamente desde PostgreSQL.



NO permitas duplicados en integraciones.



NO permitas stock inconsistente.



NO permitas dos turnos abiertos simultáneos por usuario.



NO permitas que un usuario opere sobre el turno de otro.



NO permitas que un cajero modifique precios/inventario si no tiene permiso.



NO permitas modificar/eliminar auditoría.



72\. PUNTO EXACTO DONDE DEBES TOMAR EL CONTROL



Estamos actualmente en:



FASE 1 — Base de datos y seguridad



Estado aproximado:



Autenticación → 🟡

RBAC → 🟢 diseño

Modelo POS → 🟢

Modelo Monitoreo → 🟢

Ventas → 🟢

Pagos → 🟢

Inventario → 🟢

Recetas → 🟢

Devoluciones → 🟡

Caja → 🟢

Consumo → 🟢

Integración → 🟡

Auditoría → 🟢 diseño

RLS → 🟡

Policies → 🟡

Node.js → 🔴

React → 🔴

Worker → 🔴

Docker → 🔴

Kubernetes → 🔴

AWS → 🔴



PRÓXIMA TAREA OBLIGATORIA



Continúa desde:



RLS + POLICIES COMPLETAS DEL POS



Después:



CORREGIR procesar\_devolucion() PARA RESTAURAR INSUMOS



Después:



REVISAR cerrar\_turno() DE EXTREMO A EXTREMO



Después:



NODE.JS + SEQUELIZE



Después:



API POS → MONITOREO



Después:



API MONITOREO → POS



Después:



WORKERS + RETRIES + IDEMPOTENCIA



Después:



REACT



Después:



PRUEBAS DE SEGURIDAD Y CONCURRENCIA



Después:



DOCKER



Después:



KUBERNETES



Después:



AWS

73\. OBJETIVO FINAL



No quiero únicamente que "funcione".



Quiero que el resultado final sea:



funcional;

seguro;

mantenible;

escalable;

auditable;

consistente;

preparado para concurrencia;

integrado mediante APIs;

desplegable;

documentable;

defendible académicamente.



Cuando continúes el proyecto, primero revisa lo que ya existe y después modifica únicamente lo necesario.



Empieza exactamente por RLS + Policies completas del POS y no avances a Node.js hasta dejar correctamente definida esta capa.

