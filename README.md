# 📱 Webhook HUB v1.0.0

Una aplicación PWA moderna para gestionar y monitorear workflows de **n8n** desde tu teléfono móvil.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)
![Mobile](https://img.shields.io/badge/Mobile-Optimized-10B981)

## ✨ Características

### 🔐 Gestión de Workflows
- Lista de workflows con estado activo/inactivo
- Activar/desactivar workflows con un tap
- Búsqueda por nombre
- Filtros (todos, activos, inactivos)

### 📊 Insights & Analytics
- Ejecuciones totales (7/14/30 días)
- Ejecuciones fallidas con porcentaje
- Tasa de fallo visual
- Tiempo promedio de ejecución
- Gráfica de barras por día
- **¡Funcionalidad premium de n8n, gratis!**

### 📋 Historial de Ejecuciones
- Lista completa de ejecuciones (hasta 5000)
- Filtros por estado (éxito/error) y fecha
- Detalle de cada ejecución

### 🎨 Canvas Visual
- Visualización del flujo de nodos como en n8n
- Zoom controls (+, -, reset)
- Nodos clickeables para debug
- Conexiones con curvas Bézier

### 🔧 Debug por Nodo
- Input/Output de cada nodo
- Detalle de errores
- Datos en formato JSON expandible

### ☁️ Backup a Google Drive
- Respaldo individual por workflow
- Respaldo masivo de todos los workflows
- Archivos guardados en carpeta `n8n-backups`
- Progreso en tiempo real

### 📱 Optimizado para Móvil
- Touch targets de 44px (estándar Apple)
- Safe areas para iPhone notch
- Scroll suave nativo
- Feedback táctil al tocar
- Tema oscuro premium

## 🚀 Instalación

```bash
git clone https://github.com/fernandosegrr/Webhook-HUB.git
cd Webhook-HUB
npm install
npm run dev
```

## ⚙️ Configuración

### n8n
```env
N8N_PUBLIC_API_ENABLED=true
```

### Google Drive (opcional)
1. Crea proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita Google Drive API
3. Crea credenciales OAuth 2.0
4. Agrega tu dominio a orígenes autorizados
5. Copia el Client ID a la app

## 📂 Estructura

```
src/
├── components/
│   ├── Dashboard.jsx       # Vista principal
│   ├── Insights.jsx        # Analytics
│   ├── ExecutionsList.jsx  # Historial
│   ├── ExecutionDetail.jsx # Canvas y debug
│   ├── Login.jsx           # Autenticación
│   └── WorkflowCard.jsx    # Tarjeta workflow
├── services/
│   ├── n8nService.js       # API n8n
│   └── googleDriveService.js # Backups
└── context/
    └── AuthContext.jsx     # Estado global
```

---

## ⚠️ Licencia Propietaria

**© 2024 Fernando Guerrero. Todos los derechos reservados.**

Este software es propiedad exclusiva de Fernando Guerrero. Queda prohibida su reproducción, distribución, modificación o uso comercial sin autorización expresa por escrito del propietario.

---

## 👨‍💻 Créditos

Desarrollado por **Fernando Guerrero** con asistencia de **Claude AI (Anthropic)**

[![GitHub](https://img.shields.io/badge/GitHub-fernandosegrr-181717?logo=github)](https://github.com/fernandosegrr)
