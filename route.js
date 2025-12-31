// API independiente para productos Lunaris
require('dotenv').config();
const http = require('http');
const url = require('url');

// Exportar para Vercel
module.exports = (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Endpoint de productos
  if (path === '/api/products' && req.method === 'GET') {
    return handleProducts(req, res, parsedUrl);
  }

  // Endpoint de health check
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }));
    return;
  }

  // Endpoint raíz
  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Lunaris API v1.0.0',
      endpoints: {
        products: '/api/products?page=1&limit=12',
        health: '/health'
      }
    }));
    return;
  }

  // 404 para rutas no encontradas
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not Found',
    message: 'Endpoint not found',
    availableEndpoints: ['/api/products', '/health', '/']
  }));
};

// Manejador de productos
async function handleProducts(req, res, parsedUrl) {
  const page = parseInt(parsedUrl.query.page || '1');
  const limit = parseInt(parsedUrl.query.limit || '12');
  
  const result = await getProducts(page, limit);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}

const REQUIRED_HEADERS = ["nombre", "precio", "stock", "activo"];
function buildResponse(products, success = true, page = 1, total = 0, totalPages = 1, limit = 12) {
  console.log("📤 API Response:", {
    success,
    page,
    total,
    totalPages,
    limit,
    productCount: products.length,
    products: products.map(p => ({ name: p.name, active: p.active }))
  });
  
  return {
    success,
    data: products,
    pagination: {
      page,
      total,
      totalPages,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    lastUpdated: new Date().toISOString()
  };
}

function getFallbackProducts() {
  return [
    {
      id: "fallback-1",
      name: "Producto no disponible",
      description: "",
      price: 0,
      stock: 0,
      category: "General",
      image: "/images/placeholder.jpg",
      active: true,
      featured: false
    }
  ];
}

// Función principal para obtener productos
async function getProducts(page = 1, limit = 12) {
  const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

  if (!SHEET_ID || !API_KEY) {
    return {
      success: false,
      data: [],
      error: "Configuration error",
      status: 500
    };
  }

  const startIndex = (page - 1) * limit;
  const RANGE = "Productos!A1:Z1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Google Sheets API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.values || data.values.length < 2) {
      return {
        success: true,
        data: getFallbackProducts(),
        pagination: {
          page: 1,
          total: 0,
          totalPages: 1,
          limit: 12,
          hasNext: false,
          hasPrev: false
        },
        lastUpdated: new Date().toISOString()
      };
    }

    const [rawHeaders, ...rows] = data.values;
    const headers = rawHeaders.map(h => h.toLowerCase().trim());

    console.log(`📊 Found ${rows.length} rows with headers:`, headers);

    const hasRequiredHeaders = REQUIRED_HEADERS.every(h =>
      headers.includes(h)
    );

    if (!hasRequiredHeaders) {
      console.error("❌ Missing required headers");
      return {
        success: true,
        data: getFallbackProducts(),
        pagination: {
          page: 1,
          total: 0,
          totalPages: 1,
          limit: 12,
          hasNext: false,
          hasPrev: false
        },
        lastUpdated: new Date().toISOString()
      };
    }

    const allProducts = rows
      .map((row, index) => {
        const product = Object.fromEntries(
          headers.map((h, i) => [h, row[i]?.trim() || ""])
        );

        const price = Number(product.precio);
        const stock = Number(product.stock);

        // SOLO mostrar si activo = "Si"
        const activeValue = (product.activo || "")
          .toString()
          .trim()
          .toLowerCase();
        const active = activeValue === "si";

        console.log(`🔍 Row ${index + 1}: "${product.nombre}" - activo: "${product.activo}" -> active: ${active} - price: ${price} - stock: ${stock}`);

        // Si no está activo, no incluir
        if (!active) {
          console.log(`❌ Skipping inactive product: ${product.nombre}`);
          return null;
        }

        const result = {
          id: product.id || `product-${index + 1}`,
          name: product.nombre || "Producto sin nombre",
          description: product.descripcion || "",
          price: price || 0,
          stock: stock || 0,
          category: product.categoria || "General",
          image: product.imagen_url || "/images/placeholder.jpg",
          featured:
            product.destacado === "TRUE" ||
            product.destacado === "true",
          active
        };

        console.log(`✅ Included active product: ${result.name}`);
        return result;
      })
      .filter(p => p !== null); // Filtrar nulos y productos inactivos

    // Paginación
    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = allProducts.slice(startIndex, startIndex + limit);

    console.log(`📈 Pagination: page ${page} of ${totalPages}, showing ${paginatedProducts.length} of ${totalProducts} products`);

    return buildResponse(paginatedProducts, true, page, totalProducts, totalPages, limit);

  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return {
      success: true,
      data: getFallbackProducts(),
      pagination: {
        page: 1,
        total: 0,
        totalPages: 1,
        limit: 12,
        hasNext: false,
        hasPrev: false
      },
      lastUpdated: new Date().toISOString()
    };
  }
}

// Código local para desarrollo (solo se ejecuta si no es en Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const setCORSHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  };

  const server = http.createServer(async (req, res) => {
    setCORSHeaders(res);

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Endpoint de productos
    if (path === '/api/products' && req.method === 'GET') {
      const page = parseInt(parsedUrl.query.page || '1');
      const limit = parseInt(parsedUrl.query.limit || '12');
      
      const result = await getProducts(page, limit);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // Endpoint de health check
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }));
      return;
    }

    // Endpoint raíz
    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Lunaris API v1.0.0',
        endpoints: {
          products: '/api/products?page=1&limit=12',
          health: '/health'
        }
      }));
      return;
    }

    // 404 para rutas no encontradas
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      message: 'Endpoint not found',
      availableEndpoints: ['/api/products', '/health', '/']
    }));
  });

  const PORT = process.env.PORT || 3001;

  server.listen(PORT, () => {
    console.log(`🚀 Lunaris API running on port ${PORT}`);
    console.log(`📊 Products endpoint: http://localhost:${PORT}/api/products`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
  });
}
