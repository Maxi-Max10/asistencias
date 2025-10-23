# ⚡ Comandos para Hostinger - Copiar y Pegar

Ejecutá estos comandos en orden en la sección **"Custom commands"** de tu App Node.js en hPanel.

---

## 1️⃣ Instalar dependencias del backend

```bash
npm install
```

Esperá que termine sin errores.

---

## 2️⃣ Compilar el frontend

```bash
npm run build
```

Esto crea la carpeta `dist/` con tu aplicación React.

---

## 3️⃣ Crear carpeta para la base de datos

```bash
mkdir -p storage
```

---

## 4️⃣ (Opcional) Si better-sqlite3 da error

Solo ejecutá si ves errores de "better-sqlite3":

```bash
npm rebuild better-sqlite3
```

---

## 5️⃣ Restart

Después de ejecutar los comandos anteriores:

- Clic en **"Restart"** en la página de tu aplicación

---

## ✅ Verificar

Abrí en tu navegador:

- `https://tu-dominio.com/health` → debe responder `{"ok":true}`
- `https://tu-dominio.com/` → debe cargar el login

---

## 🔄 Para actualizar después de cambios

```bash
npm install
npm run build
```

Luego **Restart**.

---

## 📋 Variables de Entorno

Agregá estas en la sección **"Environment variables"**:

| Variable | Valor |
|----------|-------|
| `DB_DIR` | `storage` |
| `NODE_ENV` | `production` |

---

## 🆘 Si algo falla

### Ver logs:
En hPanel → Node.js → tu app → **"Logs"**

### Limpiar e instalar de nuevo:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Verificar Node.js:
Asegurate de tener **Node.js 20** seleccionado en la configuración de tu app.

---

**¡Listo!** Tu app estará funcionando en minutos.
