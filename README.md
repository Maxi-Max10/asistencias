# Asistencias — Deploy en Hostinger

Esta guía explica cómo publicar este proyecto (backend Node.js + frontend React/Vite) en Hostinger usando el Administrador de aplicaciones Node.js de hPanel.

## Qué contiene el proyecto

- `server/`: API en Node.js + Express con base de datos SQLite (better-sqlite3).
- `web/`: Frontend en React con Vite. Al compilar genera `web/dist/`.
- El servidor ya está listo para servir el frontend estático desde `web/dist` y exponer la API bajo `/api/*`.

## Requisitos

- Plan de Hosting con soporte para aplicaciones Node.js (p. ej. Premium/Business/Cloud en Hostinger).
- Node.js 20.x (configurable en hPanel).

## Variables de entorno (server/.env)

Crea `server/.env` (o usa el gestor de variables de entorno en hPanel) con, al menos:

- `PORT=4000` (Hostinger a veces ignora este valor y define su propio puerto; el código ya respeta `process.env.PORT`).
- `DB_DIR=/home/<usuario>/apps/asistencias/storage` (carpeta escribible para la base `fincas.db`). Si no la defines, se intentará `/var/data` y si no es escribible caerá a la carpeta `server/`.
- `FRONTEND_DIR` (opcional). Por defecto apunta a `../web/dist` respecto de `server/`. Sólo cámbialo si movés la carpeta.
- `ALLOWED_ORIGINS` (opcional). No es obligatorio porque actualmente `cors()` está abierto.

Un ejemplo está en `server/.env.example`.

## Opción recomendada: una sola app en Hostinger

Publicar todo el repo en una única app Node.js y que el backend sirva el frontend.

1) Compilar el frontend de forma local (opcional, pero recomendable)
   - En tu PC:
     - `npm install` (desde la raíz del proyecto)
     - `npm run build` (crea `web/dist/`)

2) Subir el proyecto a Hostinger
   - Comprimí la carpeta del proyecto (incluyendo `web/dist/`).
   - En hPanel > Archivos > Administrador de archivos, subí y extraé el .zip dentro de una carpeta, por ejemplo `asistencias/`.

3) Crear la aplicación Node.js
   - hPanel > Avanzado > Node.js > Crear Aplicación
   - Versión de Node.js: 20
   - Ruta de la aplicación (Application root): la carpeta donde subiste el proyecto (p. ej. `asistencias`)
   - Archivo de inicio (Application startup file): `server/index.js`
   - Variables de entorno: agregá `DB_DIR` apuntando a una carpeta escribible, por ejemplo `storage/` dentro del proyecto.
     - Creá esa carpeta `storage/` en el Administrador de archivos.

4) Instalar dependencias en el servidor
   - Desde el gestor de Node.js en hPanel, ejecutá "Run NPM install" en la aplicación. Esto instalará dependencias en los workspaces (`server/` y `web/`). Si ya subiste `web/dist/`, no hace falta instalar devDependencies del frontend.

5) Iniciar/Reiniciar la app
   - Usá el botón "Restart" en el gestor de Node.js. La API quedará disponible y el frontend se servirá desde `web/dist/`.

6) Probar
   - Abrí la URL de la aplicación (Hostinger te muestra el dominio o subdominio). Probá `/health` para ver `{ ok: true }` y la app en la raíz `/`.

Notas sobre la base de datos SQLite
- La primera ejecución crea el archivo `fincas.db`. Configurá `DB_DIR` a una ruta persistente (p. ej. `storage/`) para que no se pierdan datos en despliegues.
- Las tablas e índices se crean y migran suavemente al iniciar.

## Alternativa: frontend estático aparte

Si preferís, podés servir el frontend como sitio estático (otro hosting o la misma cuenta) y sólo desplegar la API como app Node.js.

- Compilá `web/` y subí el contenido de `web/dist/` al hosting estático.
- Configurá la variable `VITE_API` en build para apuntar al dominio de la API, por ejemplo:
  - `VITE_API=https://api.midominio.com npm -w web run build`
- En `server/`, podés deshabilitar el servido estático eliminando/ignorando `FRONTEND_DIR`.

## Scripts útiles

- `npm run dev`: levanta backend y frontend en desarrollo.
- `npm run build`: compila el frontend (`web/dist`).
- `npm start`: inicia el backend (`server/index.js`).

## Problemas comunes

- 404 al refrescar rutas del frontend: ya está cubierto; el servidor responde `index.html` para cualquier ruta que no empiece con `/api/`.
- `better-sqlite3` en hosting: instalá dependencias en el servidor, no subas `node_modules` desde Windows. Hostinger descargará el binario precompilado correcto para Linux.
- CORS: por defecto está abierto. Si desplegás frontend y backend en dominios distintos, considerá configurar `cors({ origin: ... })` con `ALLOWED_ORIGINS`.

---

Si querés, puedo hacer el build local, preparar el .zip y ayudarte a configurar la app en Hostinger paso a paso.
