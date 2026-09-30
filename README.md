# Recruitment API

API REST para gestionar las postulaciones de candidatos a las vacantes publicadas por la empresa. Permite registrar postulaciones, consultarlas y cambiar su estado. Al registrar una postulación, el backend calcula automáticamente un **puntaje** y una **prioridad de revisión**, para que el equipo de selección atienda primero los perfiles más afines.

## Tecnologías

- Node.js 20.6 o superior
- Módulo nativo `http` de Node.js para el servidor (sin frameworks)
- MySQL 8, accedido con el driver `mysql2`, único paquete externo (Node.js no incluye un cliente nativo de MySQL)
- Pruebas con el runner nativo de Node (`node:test`)

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   | Variable | Descripción | Ejemplo |
   |---|---|---|
   | `PORT` | Puerto de la API | `3000` |
   | `DB_HOST` | Host de MySQL | `localhost` |
   | `DB_PORT` | Puerto de MySQL | `3306` |
   | `DB_USER` | Usuario de MySQL | `root` |
   | `DB_PASSWORD` | Contraseña de MySQL | |
   | `DB_NAME` | Nombre de la base de datos | `recruitment` |

3. **Crear la base de datos y cargar datos de prueba**

   ```bash
   mysql -u root -p < db/schema.sql
   ```

4. **Iniciar el servidor**

   ```bash
   npm start
   ```

5. **Ejecutar las pruebas automáticas (cálculo de puntaje y prioridad)**

   ```bash
   npm test
   ```

## Estructura del proyecto

```
recruitment-api/
├── db/
│   └── schema.sql
├── src/
│   ├── config/
│   │   └── db.js
│   ├── constants.js
│   ├── errors.js
│   ├── scoring.js
│   ├── httpUtils.js
│   ├── applications.service.js
│   ├── applications.controller.js
│   ├── applications.routes.js
│   ├── errorHandler.js
│   ├── app.js
│   └── server.js
├── tests/
│   └── scoring.test.js
├── .env.example
├── package.json
└── README.md
```

| Ruta | Contenido |
|---|---|
| `db/schema.sql` | Crea la base de datos y las tablas `candidates`, `vacancies` y `applications` (con `ENUM`, llaves foráneas e índices). Incluye datos de prueba. |
| `src/config/db.js` | Pool de conexiones MySQL. Lee las credenciales del entorno y trabaja las fechas en UTC. |
| `src/constants.js` | Valores permitidos (fuentes y estados), estados finales y los 30 días de espera para re-postularse. |
| `src/errors.js` | Clase `HttpError`, que transporta el código HTTP y el mensaje de un error de negocio. |
| `src/scoring.js` | Funciones puras que calculan el puntaje y derivan la prioridad. No tocan la base de datos. |
| `src/httpUtils.js` | Utilidades sobre el módulo `http` nativo: lee y valida el cuerpo JSON (límite de 50 kb) y envía respuestas JSON. |
| `src/applications.service.js` | Reglas de negocio y consultas SQL: crear (con transacción y regla de duplicidad), listar y cambiar estado. |
| `src/applications.controller.js` | Valida los datos de entrada (cuerpo, parámetros y filtros) y delega en el servicio. Devuelve el código HTTP y el cuerpo de la respuesta. |
| `src/applications.routes.js` | Enrutado manual: decide qué función atiende cada combinación de método y ruta (`POST` y `GET /applications`, `PUT /applications/:id/status`). |
| `src/errorHandler.js` | Convierte errores en respuestas JSON con el código adecuado. Los errores inesperados devuelven `500` sin exponer detalles internos. |
| `src/app.js` | Manejador de peticiones: interpreta la URL, resuelve la ruta, lee el cuerpo JSON, ejecuta el controlador y envía la respuesta. |
| `src/server.js` | Punto de entrada: levanta el servidor HTTP. |
| `tests/scoring.test.js` | Pruebas del puntaje y de las fronteras de prioridad. |
| `.env.example` | Plantilla de variables de entorno. |
| `package.json` | Dependencias y scripts (`start`, `test`). |

## Modelo de datos

**Candidato** (`candidates`): identificador, nombre, correo (único), años de experiencia.

**Vacante** (`vacancies`): identificador, título del cargo, años mínimos de experiencia, estado (`OPEN` o `CLOSED`).

**Postulación** (`applications`): identificador, candidato, vacante, carta de presentación, fuente, puntaje, prioridad, estado, fecha de creación y fecha de última actualización de estado.

### Valores permitidos

| Campo | Valores |
|---|---|
| Fuente | `REFERRAL`, `INTERNAL`, `JOB_BOARD`, `OTHER` |
| Estado de postulación | `RECEIVED`, `IN_REVIEW`, `REJECTED`, `HIRED` |
| Estado de vacante | `OPEN`, `CLOSED` |
| Prioridad | `LOW`, `MEDIUM`, `HIGH`, `TOP` |

Son postulaciones **activas** las que están en `RECEIVED` o `IN_REVIEW`. `REJECTED` y `HIRED` son estados **finales**.

## Endpoints

### `POST /applications`: registrar una postulación

Cuerpo:

```json
{
  "candidateId": 1,
  "vacancyId": 1,
  "source": "REFERRAL",
  "coverLetter": "Trabajo con Node y SQL"
}
```

El puntaje y la prioridad **no se reciben**: si se envían, se ignoran. El backend valida los datos, verifica que el candidato exista y que la vacante exista y esté `OPEN`, aplica la regla de duplicidad, calcula el puntaje y registra la postulación con estado inicial `RECEIVED`.

Respuesta `201`:

```json
{
  "id": 1,
  "candidateId": 1,
  "candidateName": "Ana Pérez",
  "candidateEmail": "ana@mail.com",
  "vacancyId": 1,
  "vacancyTitle": "Backend Developer",
  "coverLetter": "Trabajo con Node y SQL",
  "source": "REFERRAL",
  "score": 9,
  "priority": "TOP",
  "status": "RECEIVED",
  "createdAt": "2026-09-30T15:00:00.000Z",
  "statusUpdatedAt": "2026-09-30T15:00:00.000Z"
}
```

### `GET /applications`: consultar postulaciones

Devuelve las postulaciones con el nombre y correo del candidato y el título de la vacante. Orden: **puntaje de mayor a menor** y, en caso de empate, **fecha de creación más antigua primero**.

Filtros opcionales, combinables:

```
GET /applications?status=IN_REVIEW
GET /applications?status=RECEIVED&vacancyId=1
```

### `PUT /applications/:id/status`: cambiar el estado

Cuerpo:

```json
{ "status": "IN_REVIEW" }
```

Valida que la postulación exista, que el estado sea permitido y que la postulación no esté en un estado final. Actualiza la fecha de última actualización de estado.

### Códigos HTTP

| Código | Cuándo |
|---|---|
| `200` | Consulta o cambio de estado exitoso |
| `201` | Postulación creada |
| `400` | Datos o parámetros inválidos, o JSON mal formado |
| `404` | Candidato, vacante, postulación o ruta inexistente |
| `409` | Vacante cerrada, postulación duplicada o postulación en estado final |
| `413` | Cuerpo de la petición demasiado grande |
| `500` | Error interno inesperado |

## Reglas de negocio

### Cálculo del puntaje

| Condición | Puntos |
|---|---|
| Años de experiencia del candidato ≥ mínimo de la vacante | +4 |
| Fuente `REFERRAL` | +3 |
| Fuente `INTERNAL` | +2 |
| La carta contiene "node", "sql" o "api" | +2 |
| La carta tiene más de 500 caracteres | +1 |
| El candidato tiene 3 o más postulaciones activas en otras vacantes | -2 |

### Prioridad

| Puntaje | Prioridad |
|---|---|
| 0 a 2 | `LOW` |
| 3 a 4 | `MEDIUM` |
| 5 a 6 | `HIGH` |
| 7 o más | `TOP` |

### Regla de duplicidad

Un candidato **no puede** postularse a una vacante en la que ya tiene una postulación `RECEIVED`, `IN_REVIEW` o `HIRED`. Si la anterior fue `REJECTED`, solo puede volver a postularse cuando hayan pasado **al menos 30 días** desde el rechazo. En ambos casos la API responde `409` con un mensaje explicativo.

Para evitar condiciones de carrera, la creación se ejecuta en una transacción que bloquea la fila del candidato.

## Supuestos adoptados

El enunciado tiene ambigüedades; estas son las decisiones tomadas:

1. **`REFERRAL`:** la lista de fuentes dice `REFERAL`, pero la regla de puntaje dice `REFERRAL`. Se usa `REFERRAL`.
2. **Puntaje negativo:** el mínimo posible es -2. Todo puntaje de 2 o menos se clasifica como `LOW`.
3. **Palabras clave:** se busca la palabra completa, sin distinguir mayúsculas (`node`, `sql`, `api`). "capital" no suma; "MySQL" tampoco.
4. **Longitud de la carta:** se cuenta sobre el texto sin espacios al inicio y al final; debe ser estrictamente mayor que 500. El máximo permitido es 5000 caracteres.
5. **Postulaciones activas en otras vacantes:** se cuentan las `RECEIVED` o `IN_REVIEW` del candidato en vacantes distintas a la actual.
6. **Fecha de rechazo:** es la fecha de última actualización de estado de la postulación `REJECTED`. A los 30 días exactos ya se puede re-postular.
7. **Transiciones:** desde un estado activo se puede pasar a cualquiera de los cuatro estados. Solo se bloquean los estados finales.
8. **Datos obligatorios del POST:** `candidateId`, `vacancyId`, `source` y `coverLetter`.
9. **Años de experiencia:** valores enteros.
10. **Fechas:** se almacenan y devuelven en UTC.
11. **Candidatos y vacantes:** no tienen endpoints; se cargan directamente en la base de datos (ver `db/schema.sql`).

## Seguridad

- Todas las consultas SQL son parametrizadas.
- Validación estricta de tipos y valores permitidos en cuerpo, parámetros de ruta y filtros.
- Límite de tamaño del cuerpo de la petición (50 kb).
- Los errores internos no exponen detalles al cliente.
- Las credenciales se leen del entorno; `.env` no debe subirse al repositorio.

## Limitaciones conocidas

- No hay autenticación ni autorización, porque el alcance no las pide.
- No hay paginación en `GET /applications`.
- No se incluyen pruebas de integración con base de datos; las pruebas automáticas cubren el cálculo de puntaje y prioridad.


