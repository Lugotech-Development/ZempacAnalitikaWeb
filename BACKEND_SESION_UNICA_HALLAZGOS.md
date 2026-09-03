# Hallazgos — Sesión única y permisos

**Para**: equipo de Backend
**De**: equipo de Frontend (Web / Flutter)
**Fecha**: 2026-09-02
**Ambiente probado**: `https://reporteszempacapi-staging.azurewebsites.net`
**Relacionado con**: `FRONTEND_SESION_UNICA_LOGIN.md` (guía del flujo 409)

Terminamos de implementar el flujo de sesión única con el 409 en la web y funciona
correctamente: el popup aparece, el usuario decide, y al confirmar el login nuevo
entra sin problema. Durante las pruebas contra staging encontramos tres cosas que
necesitamos revisar con ustedes.

**Ninguna de las tres se corrige desde el frontend.** En los tres casos el cliente
está haciendo lo que corresponde con la información que el backend le entrega.

| # | Hallazgo | Severidad | Impacto |
|---|---|---|---|
| 1 | El permiso se otorga con un nombre y se exige con otro | **Media** | Un reporte concedido es inaccesible |
| 2 | La sesión desalojada conserva acceso completo a los datos | **Alta** | La sesión única no se está aplicando realmente |
| 3 | El 401 no indica *por qué* se cerró la sesión | **Media** | Bloquea una pantalla que ya está implementada y esperando el campo |

---

## 1. El permiso se otorga con un nombre y se exige con otro

### Qué pasa

Al hacer login, el campo `reportesPermitidos` devuelve el permiso llamado
**`pantalla-principal`**. Al llamar al endpoint correspondiente, la respuesta es:

```
GET /api/Reportes/pantalla-principal-v2
→ 403  "No tiene permisos para acceder al reporte 'pantalla-principal-v2'"
```

El mismo backend **otorga el permiso con un nombre y lo exige con otro**. El string
`pantalla-principal-v2` nunca aparece en el listado de permisos que ustedes nos envían.

### Evidencia

Usuario `admin@lugotech.com.do`, empresa *Farmacias VIP MENDO*, perfil **Vendedor**.
Contenido real de `reportesPermitidos` en la respuesta del login:

```json
["pantalla-principal", "cuentas-por-cobrar", "analitica-productos-negativos",
 "cuadre-lotes", "cuadre-lote-condensado", "cuadre-productos-lote",
 "cuadre-consolidado", "cuadre-caja", "cxc-antiguedad", "cxc-detalle-cliente",
 "cxc-resumen", "cxc-top-clientes", "test", "productos-mas-vendidos",
 "sobre-stock-productos", "devoluciones-30", "ventas-30",
 "ventas-facturador-sucursal", "ventas-producto-marca"]
```

El usuario **sí tiene** `pantalla-principal`, y aun así el endpoint v2 lo rechaza.

### Por qué no lo arreglamos del lado del frontend

Filtramos el menú usando exactamente el permiso que ustedes nos entregan. Si
cambiáramos nuestro filtro a `pantalla-principal-v2`, le ocultaríamos el reporte a
un usuario que **sí tiene el permiso concedido** — estaríamos quitando un acceso
legítimo para tapar el error, no corrigiéndolo.

### Qué necesitamos

Cualquiera de las dos vías, la que les resulte más limpia:

1. Que el endpoint `pantalla-principal-v2` autorice contra el permiso `pantalla-principal`, **o**
2. Que `reportesPermitidos` entregue `pantalla-principal-v2` cuando el perfil tenga ese acceso.

Lo importante es que **el nombre que se otorga y el nombre que se exige sean el mismo**.

> **Adicional**: agradeceríamos que revisen si hay otros reportes versionados con el
> mismo patrón, para no irlos descubriendo uno por uno en producción.

---

## 2. La sesión desalojada conserva acceso completo a los datos

### Qué pasa

Después de que un usuario confirma *"Cerrar sesión y continuar"* desde un dispositivo
nuevo, el dispositivo anterior **sigue leyendo información normalmente**. No queda
desalojado en la práctica.

La revocación aplica **únicamente al refresh token**. El access token (JWT) sigue
siendo completamente válido hasta que vence por su cuenta.

### Evidencia medida

Tomamos el access token de una sesión, la desalojamos desde otro navegador
confirmando el popup, y volvimos a usar ese mismo token:

| Llamada | Resultado |
|---|---|
| `GET /api/Reportes/ventas-30` | **200 OK** — 623 KB de datos de ventas |
| `GET /api/Reportes/cuentas-por-cobrar` | **200 OK** |
| `GET /api/Reportes/productos-mas-vendidos` | **200 OK** |
| `POST /api/auth/refresh` | 401 — *"Refresh token inválido o expirado"* ✅ |

Es decir: **el refresh token sí se revocó correctamente** (eso funciona como está
documentado), pero el access token nunca se tocó y siguió entregando todos los
reportes.

### Por qué pasa

Decodificamos el JWT. Sus claims son:

```
nameidentifier, name, role, empresaId, empresaCodigo, empresaNombre, iss, aud, exp
```

**No contiene `jti` ni ningún identificador de sesión.** Sin eso, la API no tiene
contra qué comparar el token para rechazarlo, aunque la sesión ya esté revocada en
la base de datos. Es un token stateless: se valida la firma y la expiración, nada más.

### Hallazgo adicional: se acepta ~5 minutos después de vencido

Al medir la ventana real encontramos que el token se sigue aceptando **más allá de
su propio `exp`**. Probamos cada 30 segundos con un token cuyo `exp` era `18:26:28Z`:

| Momento | Respuesta |
|---|---|
| exp +1.4 min | 200 |
| exp +2.6 min | 200 |
| exp +3.7 min | 200 |
| exp +4.8 min | 200 |
| **exp +5.4 min** | **401** ← primer rechazo |

El corte está justo en los **5 minutos**. Ese es el valor por defecto de
`TokenValidationParameters.ClockSkew` en ASP.NET Core, que hay que poner
explícitamente en `TimeSpan.Zero` para desactivar.

**La ventana real de exposición es entonces: duración del access token + 5 minutos.**
¿Nos confirman cuál es la duración configurada del access token? Con eso sabemos el
tamaño exacto de la ventana.

> Nota menor: el JWT tampoco trae `iat`, así que no podemos calcular la duración
> desde el token mismo.

### Lo que esto significa

Esto **coincide con lo documentado** en la guía (§2 punto 3 y §6): *"la próxima vez
que intente refrescar su token recibirá 401"*. El comportamiento actual es el que
ustedes describieron, y del lado del frontend ya lo manejamos: cuando el refresh
falla, mostramos el modal de sesión expirada y mandamos al login.

Nuestra inquietud es de **seguridad**, no de implementación:

- El sentido de una sesión única es que **solo un dispositivo esté activo a la vez**.
  Hoy el dispositivo desalojado conserva acceso completo durante toda la ventana.
- El botón *"Cerrar sesión y continuar"* le promete al usuario algo que el backend
  no está entregando: la otra sesión no se cierra de inmediato.
- Quien guarde el bearer token conserva ese acceso aunque cierre el navegador.

Un detalle de redacción: la guía dice en §6 que *"la sesión anterior deja de ser
válida de inmediato"*. En la práctica lo inmediato es la invalidación del **refresh
token**, no la del access token. Vale la pena precisarlo para no generar una
expectativa equivocada en quien integre después.

### Qué necesitamos

Primero, saber si **es intencional** que quede esa ventana o si se esperaba un corte
inmediato. Según la respuesta, las opciones habituales son:

1. **Corte inmediato**: agregar un `jti` (o el `sessionId`) al JWT y validarlo contra
   las sesiones activas en cada request. Es lo correcto en términos de seguridad,
   pero tiene costo de rendimiento — la decisión es de ustedes.
2. **Mitigación barata**: poner `ClockSkew = TimeSpan.Zero` y **acortar la vigencia
   del access token**, de modo que la ventana de exposición sea mínima. No cierra el
   hueco, pero lo reduce mucho y es un cambio de configuración.

---

## 3. El 401 no indica por qué se cerró la sesión

> **Este es el único punto donde les pedimos un cambio concreto para desbloquearnos.**
> La pantalla del lado del cliente **ya está implementada, probada y lista para salir**.
> Funciona en cuanto ustedes agreguen el campo `code`, sin ningún despliegue adicional
> de nuestra parte. Mientras no venga, se sigue mostrando el mensaje genérico actual.

### Qué pasa

Cuando la sesión desalojada finalmente intenta refrescar, recibe un 401 genérico.
Desde el cliente **no podemos distinguir** entre:

- "tu token venció normalmente" (rutina, sin importancia), y
- "tu sesión fue cerrada porque alguien inició sesión en otro dispositivo".

Hoy mostramos el mismo mensaje *"Sesión Expirada"* en ambos casos.

### Por qué importa (y no es solo estética)

El estándar de la industria es avisar explícitamente — Spotify (*"Music paused because
your account is being used elsewhere"*), WhatsApp Web, Steam, Netflix, y prácticamente
toda la banca en línea lo hacen.

Pero el argumento de peso es de **seguridad**: si al usuario le decimos *"tu sesión se
cerró porque alguien inició sesión desde Chrome - Windows 11 (190.123.45.67)"* y él no
reconoce ese dispositivo ni esa IP, **esa es su señal de que sus credenciales están
comprometidas**. Un *"Sesión Expirada"* genérico esconde un posible robo de cuenta
detrás de un mensaje rutinario.

### Qué necesitamos

Un código de motivo en el 401 de `/api/auth/refresh`. Ustedes ya tienen todos los
datos — los agregaron para el 409:

```jsonc
// sesión revocada por un login nuevo
401 {
  "code": "SESSION_REVOKED_BY_NEW_LOGIN",
  "deviceName": "Chrome - Windows 11",
  "ipAddress": "190.123.45.67",
  "at": "2026-09-02T18:26:28Z"
}

// expiración normal
401 { "code": "TOKEN_EXPIRED" }
```

### Lo que ya está listo de nuestro lado

Ya implementamos el manejo completo y es **tolerante a que el campo no llegue**:

| Respuesta del backend | Qué muestra la web |
|---|---|
| `401 { "message": "..." }` (como hoy) | *"Sesión Expirada"* genérico, con redirección automática a los 5s — **sin cambios** |
| `401 { "code": "SESSION_REVOKED_BY_NEW_LOGIN", ... }` | *"Cerramos tu sesión aquí"*, con dispositivo, IP y fecha, la advertencia de seguridad, y **sin** redirección automática |
| `401 { "code": "ALGO_QUE_NO_CONOCEMOS" }` | Vuelve al mensaje genérico — nunca inventamos una causa |

Puntos de diseño que vale la pena mencionar:

- **No hay redirección automática** en el caso de revocación. El mensaje genérico
  sí redirige a los 5 segundos, pero este el usuario tiene que poder leerlo — y
  eventualmente actuar sobre él.
- Incluimos la línea **"¿No fuiste tú? Cambia tu contraseña y avisa a tu
  administrador."** Ese es el valor real de la pantalla.
- Si el `code` no viene, o viene uno que no reconocemos, **no afirmamos nada**.
  Preferimos un mensaje genérico antes que decirle a alguien que entraron a su
  cuenta cuando en realidad solo se le venció el token.

Los campos `deviceName`, `ipAddress` y `at` son **opcionales**: si vienen los
mostramos, si no, el mensaje funciona igual. El único campo indispensable es `code`.

> **Relación con el punto 2**: si se resuelve el punto 2 con corte inmediato, este
> aviso gana bastante valor, porque le llegaría al usuario al instante en lugar de
> esperar al siguiente intento de refresh.

---

## Anexo — Cómo reproducir

**Hallazgo 1**

1. Iniciar sesión con un usuario cuyo perfil tenga `pantalla-principal` (ej. perfil *Vendedor*).
2. Revisar `reportesPermitidos` en la respuesta del login → contiene `pantalla-principal`.
3. `GET /api/Reportes/pantalla-principal-v2` con ese token → **403**.

**Hallazgo 2**

1. Iniciar sesión en el navegador A. Guardar el `token` que devuelve el login.
2. Iniciar sesión con el mismo usuario en el navegador B → llega el **409**.
3. Confirmar el cierre de la sesión anterior → B entra con **200**.
4. Con el token guardado del paso 1, llamar cualquier reporte → sigue devolviendo **200**.
5. Con el `refreshToken` del paso 1, llamar `POST /api/auth/refresh` → **401** (correcto).
6. Repetir el paso 4 pasado el `exp` del token → se sigue aceptando ~5 minutos más.

---

## Resumen de lo que pedimos

| # | Pedido | Prioridad |
|---|---|---|
| 1 | Unificar el nombre del permiso de `pantalla-principal` / `pantalla-principal-v2`, y revisar otros reportes versionados | Media |
| 2 | Confirmar la duración configurada del access token, y decidir entre corte inmediato (`jti` + validación) o mitigación (`ClockSkew = 0` + token corto) | **Alta** |
| 3 | Agregar un código de motivo (`code`) al 401 de `/api/auth/refresh` — **la pantalla del cliente ya está lista y esperando** | Media |
| 4 | Corregir en `FRONTEND_SESION_UNICA_LOGIN.md` §6 la frase *"deja de ser válida de inmediato"* | Baja |

Quedamos atentos. El flujo del 409 ya está implementado y probado del lado web; el
port a la app Flutter queda pendiente de estas definiciones.
