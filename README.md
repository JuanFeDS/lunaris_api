# Lunaris API

API REST para gestión de productos Lunaris con Google Sheets como base de datos.

## 🚀 Características

- Conexión con Google Sheets para almacenamiento de productos
- Paginación de resultados
- Filtrado de productos activos
- CORS habilitado
- Health check endpoint
- Manejo de errores y fallback

## 📋 Requisitos

- Node.js >= 14.0.0
- npm

## 🛠️ Instalación

1. Clonar el repositorio
2. Copiar el archivo `.env.example` a `.env` (o crear el archivo `.env`)
3. Configurar las variables de entorno
4. Instalar dependencias

```bash
npm install
```

## ⚙️ Configuración

Crear un archivo `.env` con las siguientes variables:

```env
GOOGLE_SHEETS_ID=tu_google_sheets_id
GOOGLE_SHEETS_API_KEY=tu_google_sheets_api_key
PORT=3001
```

### Google Sheets Setup

1. Crear una hoja de cálculo en Google Sheets
2. La hoja debe llamarse "Productos"
3. Las columnas requeridas son: `nombre`, `precio`, `stock`, `activo`
4. Obtener el ID de la hoja (de la URL)
5. Crear una API key en Google Cloud Console
6. Habilitar Google Sheets API

### Estructura del Google Sheets

| nombre | precio | stock | activo | descripcion | categoria | imagen_url | destacado |
|--------|--------|-------|--------|-------------|-----------|------------|-----------|

## 🏃‍♂️ Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

La API iniciará en `http://localhost:3001`

## 📡 Endpoints

### GET `/api/products`
Obtener lista de productos con paginación

**Parámetros:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Productos por página (default: 12)

**Ejemplo:**
```bash
GET /api/products?page=1&limit=12
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-1",
      "name": "Producto Ejemplo",
      "description": "Descripción del producto",
      "price": 99.99,
      "stock": 10,
      "category": "General",
      "image": "/images/producto.jpg",
      "featured": false,
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "total": 1,
    "totalPages": 1,
    "limit": 12,
    "hasNext": false,
    "hasPrev": false
  },
  "lastUpdated": "2023-12-31T12:00:00.000Z"
}
```

### GET `/health`
Verificar estado del servidor

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2023-12-31T12:00:00.000Z",
  "version": "1.0.0"
}
```

### GET `/`
Información de la API

**Respuesta:**
```json
{
  "message": "Lunaris API v1.0.0",
  "endpoints": {
    "products": "/api/products?page=1&limit=12",
    "health": "/health"
  }
}
```

## 🔧 Filtrado

- Solo se muestran productos con `activo = "Si"`
- Los productos inactivos son ignorados
- Se incluye paginación automática

## 🛡️ Seguridad

- CORS configurado para permitir solicitudes desde cualquier origen
- Variables de entorno protegidas con `.gitignore`
- Validación de datos de entrada

## 🐛 Errores

En caso de error con Google Sheets, la API devuelve productos fallback para mantener el servicio funcionando.

## 📝 Notas

- Los productos se cachean automáticamente
- La API es stateless
- Compatible con cualquier frontend que consuma REST APIs
