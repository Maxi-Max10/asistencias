# Guía de Despliegue en Hostinger

## Pre-requisitos
- Plan de Hostinger con soporte para aplicaciones Node.js (Premium/Business/Cloud)
- Acceso a hPanel
- Git conectado a Hostinger (ya lo tenés)

## Estructura del Proyecto
Todo está unificado: backend Express en la raíz, frontend React compilado a `dist/`

## Pasos para Desplegar

### 1. Subir el código
El proyecto ya está conectado por Git. Hacé push de los últimos cambios:
```bash
git add .
git commit -m "Unificado para Hostinger"
git push origin main
```

### 2. Crear/Configurar App Node.js en hPanel

1. Entrá a **hPanel → Avanzado → Node.js**
2. Clic en **Crear aplicación** (o editar si ya existe)
3. Configurá:
   - **Node.js version**: 20
   - **Application root**: `public_html` (o la carpeta donde clonaste el repo)
   - **Application startup file**: `index.js`
   - **Application URL**: tu dominio o subdominio

4. **Variables de entorno**:
   - `DB_DIR` = `storage` (carpeta para la base de datos)
   - `NODE_ENV` = `production`
   - `PORT` = `4000` (opcional, Hostinger puede asignar su propio puerto)

### 3. Instalar Dependencias

En la página de la App Node.js:
- Clic en **"Run NPM install"**

Si falla o usás comandos custom:
```bash
npm install
```

### 4. Compilar el Frontend

Ejecutá como "Custom command" o "Run NPM script":
```bash
npm run build
```

Esto crea la carpeta `dist/` con el frontend compilado.

### 5. Crear Carpeta de Datos

Ejecutá como "Custom command":
```bash
mkdir -p storage
```

### 6. Iniciar la Aplicación

- Clic en **"Restart"** o **"Start"**

### 7. Verificar

Abrí tu dominio:
- `https://tu-dominio.com/health` → debe responder `{"ok": true}`
- `https://tu-dominio.com/` → debe cargar la aplicación

## Estructura de Archivos en Hostinger

```
public_html/
├── index.js          (servidor Express)
├── package.json      (dependencias unificadas)
├── db.js            (base de datos SQLite)
├── config.js        (configuración)
├── seed.js          (datos iniciales)
├── routes/          (rutas de la API)
├── dist/            (frontend compilado - generado por build)
├── storage/         (base de datos fincas.db)
└── web/             (código fuente React - no se usa en producción)
```

## Troubleshooting

### Error 403 Forbidden
- La App Node.js no está iniciada o el dominio no está conectado a la app
- Verificá que "Application URL" esté configurado correctamente
- Restart la app

### Error de better-sqlite3
En Hostinger, ejecutá:
```bash
npm rebuild better-sqlite3
```

### Base de datos no persiste
- Verificá que la variable `DB_DIR=storage` esté configurada
- Asegurate que la carpeta `storage/` exista y tenga permisos de escritura

### Frontend no carga
- Verificá que existe `dist/index.html` después del build
- Revisá los logs de la app en hPanel

### Cambiar puerto
Hostinger puede asignar su propio puerto. El código ya respeta `process.env.PORT`.

## Comandos Útiles

```bash
# Ver logs
# (en hPanel → Node.js → tu app → Logs)

# Seed inicial (crear fincas de ejemplo)
npm run seed

# Rebuild de módulos nativos
npm rebuild better-sqlite3

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Notas

- El frontend usa rutas relativas en producción (no llama a localhost)
- La base SQLite se crea automáticamente en `storage/fincas.db`
- Los workers y fincas se crean desde la interfaz de administrador
- El idioma está en español

## Soporte

Si algo falla, revisá los logs en hPanel y asegurate de:
1. Node.js 20 seleccionado
2. Variables de entorno configuradas
3. npm install completado sin errores
4. npm run build ejecutado correctamente
5. App reiniciada después de cambios
