# 🎯 Sistema de Asistencias - Listo para Hostinger

Sistema web completo para gestionar asistencias de trabajadores en múltiples fincas, **optimizado para Hostinger**.

## ✅ Ya está configurado para producción

- ✅ Estructura unificada (backend + frontend en la raíz)
- ✅ Scripts de build y start listos
- ✅ Base de datos SQLite (sin config externa)
- ✅ API y frontend en mismo origen
- ✅ Idioma: Español completo

## 🚀 Desplegar en 5 Pasos

Ver guía completa: **[GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)**

1. **Push a Git**: `git push origin main`
2. **Crear App Node.js** en hPanel (root: `public_html`, startup: `index.js`)
3. **Instalar**: `npm install`
4. **Compilar**: `npm run build`
5. **Restart** en hPanel

## 🔑 Credenciales

**Cuadrillero**: `cuadrillero` / `cuadri12`  
**Admin**: `admin` / `admin`

## 📦 Características

- Gestión de fincas y trabajadores
- Registro de asistencias (manual + voz)
- Dashboard con gráficos
- Google Maps integrado
- Exportar CSV
- Responsive

## 📁 Estructura

```
├── index.js       # Servidor Express
├── package.json   # Dependencias
├── routes/        # API
├── dist/          # Frontend (generado)
├── storage/       # Base de datos
└── web/           # Código fuente React
```

## 🛠️ Desarrollo Local

```bash
npm install
cd web && npm install && cd ..
npm run build
npm start
```

Abrí: `http://localhost:4000`

---

**📖 Documentación completa**: [GUIA_HOSTINGER.md](./GUIA_HOSTINGER.md)
