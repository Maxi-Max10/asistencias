# ✅ Checklist de Despliegue Hostinger

Marcá cada paso a medida que lo completás:

---

## 📦 Pre-despliegue (En tu PC)

- [ ] Revisé que existe `dist/index.html` (ejecutar `npm run build` si no existe)
- [ ] Hice commit de todos los cambios
- [ ] Hice push a GitHub: `git push origin main`

---

## 🌐 En Hostinger (hPanel)

### Configuración de la App

- [ ] Entré a **hPanel**
- [ ] Fui a **Avanzado → Node.js**
- [ ] Clic en **Crear aplicación** (o Editar existente)
- [ ] Configuré:
  - [ ] **Node.js version**: 20
  - [ ] **Application root**: `public_html`
  - [ ] **Application startup file**: `index.js`
  - [ ] **Application URL**: mi dominio/subdominio
- [ ] Agregué variables de entorno:
  - [ ] `DB_DIR` = `storage`
  - [ ] `NODE_ENV` = `production`
- [ ] Guardé la configuración

### Instalación

- [ ] Ejecuté **"Run NPM install"**
- [ ] O ejecuté en "Custom command": `npm install`
- [ ] Esperé que termine sin errores

### Build del Frontend

- [ ] Ejecuté en "Custom command": `npm run build`
- [ ] Esperé que termine (crea la carpeta `dist/`)

### Base de Datos

- [ ] Ejecuté en "Custom command": `mkdir -p storage`
- [ ] (La base `fincas.db` se crea automáticamente al iniciar)

### Iniciar

- [ ] Clic en **"Restart"** o **"Start"**
- [ ] Esperé que inicie (10-20 segundos)

---

## ✅ Verificación

- [ ] Abrí `https://MI-DOMINIO.com/health`
  - [ ] Respondió: `{"ok": true}`
  
- [ ] Abrí `https://MI-DOMINIO.com/`
  - [ ] Cargó el login
  - [ ] Probé acceder con: `cuadrillero` / `cuadri12`
  - [ ] Funcionó correctamente

- [ ] Probé el admin:
  - [ ] Accedí con: `admin` / `admin`
  - [ ] Cargó el dashboard

---

## 🎉 ¡Completado!

Si todos los checks están ✅, **tu app está online**.

---

## 🆘 Si algo falló

### El health no responde o da 403

- [ ] Verificá que **Application root** = `public_html`
- [ ] Verificá que **Application startup** = `index.js`
- [ ] Verificá que el **Application URL** sea tu dominio
- [ ] Haz **Restart** de la app

### Error en logs sobre better-sqlite3

- [ ] Ejecutá: `npm rebuild better-sqlite3`
- [ ] Restart

### Frontend no carga (pantalla blanca)

- [ ] Verificá que existe `dist/index.html`
- [ ] Ejecutá: `npm run build`
- [ ] Restart

### Ver errores

- [ ] hPanel → Node.js → tu app → **"Logs"**

---

**📖 Más ayuda**: Ver `GUIA_HOSTINGER.md`
