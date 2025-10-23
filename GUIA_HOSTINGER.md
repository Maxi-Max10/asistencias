# 🚀 Desplegar en Hostinger - Guía Rápida

## ✅ Tu app está lista para Hostinger

Todo está unificado en una estructura simple:
- Backend Express en la raíz (`index.js`)
- Frontend React compilado a `dist/`
- Base de datos SQLite local
- Un solo `package.json` con todas las dependencias

---

## 📋 Pasos para Desplegar

### 1️⃣ Subir el código a Hostinger

Tu repo Git ya está conectado. Solo hacé:

```bash
git add .
git commit -m "App lista para Hostinger"
git push origin main
```

Hostinger sincronizará automáticamente los archivos a `public_html`.

---

### 2️⃣ Configurar la Aplicación Node.js

1. **Entrá a hPanel** → Avanzado → **Node.js**

2. **Crear aplicación** (o editar si ya existe):
   - **Versión Node.js**: `20`
   - **Application root**: `public_html`
   - **Application startup file**: `index.js`
   - **Application URL**: tu dominio (ej: `asistencias.midominio.com`)

3. **Variables de entorno** (agregá estas):
   ```
   DB_DIR=storage
   NODE_ENV=production
   ```

4. **Guardar**

---

### 3️⃣ Instalar Dependencias

En la página de tu aplicación Node.js:

- Clic en **"Run NPM install"**

Esto instalará todas las dependencias del backend automáticamente.

---

### 4️⃣ Compilar el Frontend

Ejecutá este comando como **"Custom command"** o **"Run NPM script"**:

```bash
npm run build
```

Esto creará la carpeta `dist/` con tu aplicación React lista.

---

### 5️⃣ Crear carpeta para la base de datos

Ejecutá como **"Custom command"**:

```bash
mkdir -p storage
```

---

### 6️⃣ Iniciar la Aplicación

- Clic en **"Restart"** o **"Start"**

---

### 7️⃣ Verificar que funciona

Abrí tu navegador:

- **API Health**: `https://tu-dominio.com/health`  
  ✅ Debe responder: `{"ok": true}`

- **Aplicación**: `https://tu-dominio.com/`  
  ✅ Debe cargar el login

---

## 🎯 Credenciales de Acceso

### Cuadrillero (Registrar asistencias)
- **Usuario**: `cuadrillero`
- **Contraseña**: `cuadri12`

### Administrador (Panel completo)
- **Usuario**: `admin`
- **Contraseña**: `admin`

---

## 📁 Estructura en Hostinger

```
public_html/
├── index.js          ← Servidor Express (punto de entrada)
├── package.json      ← Dependencias unificadas
├── db.js            ← Configuración base de datos
├── config.js        ← Variables de entorno
├── seed.js          ← Datos iniciales
├── routes/          ← Rutas de la API
│   ├── admin.js
│   ├── attendance.js
│   ├── crews.js
│   └── workers.js
├── dist/            ← Frontend compilado (generado por build)
│   ├── index.html
│   └── assets/
├── storage/         ← Base de datos SQLite
│   └── fincas.db    (se crea automáticamente)
└── web/             ← Código fuente React (no se usa en producción)
```

---

## 🔧 Troubleshooting

### ❌ Error 403 Forbidden

**Causa**: El dominio está sirviendo archivos estáticos en vez de la app Node.js

**Solución**:
1. Verificá que en Node.js → tu aplicación:
   - **Application root** = `public_html`
   - **Application startup file** = `index.js`
2. Verificá que el **Application URL** sea tu dominio
3. Hacé **Restart**

---

### ❌ Error de better-sqlite3

**Causa**: El módulo nativo necesita recompilarse en el servidor

**Solución** - Ejecutá como "Custom command":
```bash
npm rebuild better-sqlite3
```

---

### ❌ Frontend no carga

**Causa**: No existe `dist/index.html`

**Solución**:
```bash
npm run build
```
Luego hacé **Restart**

---

### ❌ Base de datos no persiste

**Causa**: La carpeta `storage` no existe o no tiene permisos

**Solución**:
```bash
mkdir -p storage
chmod 755 storage
```

---

### 🔍 Ver Logs

En hPanel:
- Node.js → tu aplicación → **"Logs"**

Los errores aparecerán ahí.

---

## 🎨 Personalización

### Cambiar credenciales de login

Editá `web/src/components/Login.jsx`:

```javascript
if (user === "TU_USUARIO" && pass === "TU_PASSWORD") {
  login("cuadrillero");
} else if (user === "ADMIN_USUARIO" && pass === "ADMIN_PASSWORD") {
  login("admin");
}
```

Luego:
```bash
npm run build
```

---

### Agregar fincas iniciales

Editá `index.js`:

```javascript
const names = ["Finca Norte", "Finca Sur", "Finca Este", "Finca Oeste"];
```

---

### Cambiar puerto (opcional)

En Variables de entorno:
```
PORT=5000
```

(Aunque Hostinger suele asignar su propio puerto automáticamente)

---

## 📱 Funcionalidades

✅ **Sistema de roles** (Cuadrillero / Admin)  
✅ **Gestión de fincas** (CRUD completo)  
✅ **Gestión de trabajadores** (por finca)  
✅ **Registro de asistencias** (presente/ausente)  
✅ **Reconocimiento por voz** (español Argentina)  
✅ **Dashboard administrativo** (gráficos, reportes)  
✅ **Ubicación de fincas** (Google Maps integrado)  
✅ **Exportar a CSV**  
✅ **Responsive** (móvil/tablet/escritorio)  

---

## 📞 Soporte

Si algo falla:

1. Revisá los **Logs** en hPanel
2. Verificá que Node.js 20 esté seleccionado
3. Asegurate que `npm install` y `npm run build` terminaron sin errores
4. Reiniciá la aplicación

---

## 🎉 ¡Listo!

Tu sistema de asistencias está funcionando en Hostinger.

Podés acceder desde cualquier dispositivo con internet.

---

**Desarrollado con ❤️ para gestión de fincas**
