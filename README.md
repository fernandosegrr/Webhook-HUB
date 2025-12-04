# 📱 Webhook HUB

Una aplicación PWA moderna para gestionar y monitorear workflows de **n8n** desde tu teléfono móvil.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)

## ✨ Características

- 🔐 **Autenticación** con API Key de n8n
- 📋 **Lista de workflows** con estado activo/inactivo
- 🔍 **Buscador** de workflows por nombre
- 📊 **Historial de ejecuciones** global o por workflow
- 🎨 **Canvas visual** del flujo de nodos (como n8n)
- 🔧 **Debug por nodo** - Input/Output/Error de cada nodo
- ❌ **Detección de errores** con banners y sección dedicada
- 📅 **Filtros** por estado (éxito/error) y fecha
- 📱 **Optimizado para móvil** (iPhone 15 y similares)
- 🌙 **Tema oscuro** con diseño moderno

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/fernandosegrr/Webhook-HUB.git
cd Webhook-HUB

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev
```

## ⚙️ Configuración

### Requisitos de n8n

Tu servidor n8n debe tener habilitadas las siguientes variables:

```env
N8N_PUBLIC_API_ENABLED=true
```

### Uso

1. Abre la app en tu navegador
2. Ingresa la **URL de tu servidor n8n** (ej: `https://tu-servidor.n8n.cloud`)
3. Ingresa tu **API Key** de n8n
4. ¡Listo! Ya puedes gestionar tus workflows

## 📱 Capturas

| Dashboard | Ejecuciones | Flujo Visual |
|-----------|-------------|--------------|
| Lista de workflows con buscador y filtros | Historial con estado y duración | Canvas con nodos y conexiones |

## 🛠️ Stack Tecnológico

- **React 19** - UI Library
- **Vite 6** - Build tool
- **CSS Variables** - Theming
- **PWA** - Instalable como app nativa

## 📂 Estructura

```
src/
├── components/
│   ├── Dashboard.jsx      # Vista principal con workflows
│   ├── ExecutionDetail.jsx # Detalle de ejecución con canvas
│   ├── ExecutionsList.jsx  # Lista de ejecuciones
│   ├── Login.jsx          # Pantalla de autenticación
│   └── WorkflowCard.jsx   # Tarjeta de workflow
├── context/
│   └── AuthContext.jsx    # Estado de autenticación
├── services/
│   └── n8nService.js      # Conexión con API de n8n
├── App.jsx
├── main.jsx
└── index.css              # Estilos globales
```

## 🔒 Seguridad

- Las credenciales se almacenan en `localStorage` del navegador
- La conexión debe ser HTTPS en producción
- Nunca compartas tu API Key

## 📄 Licencia

MIT

---

**Desarrollado con ❤️ para la comunidad de n8n**
