export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Manejar preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': '*',
            },
        });
    }

    try {
        const url = new URL(req.url);

        // Obtener credenciales de query params
        const n8nUrl = url.searchParams.get('_n8nUrl');
        const apiKey = url.searchParams.get('_apiKey');

        if (!n8nUrl || !apiKey) {
            return new Response(JSON.stringify({ error: 'Missing credentials' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // Extraer solo el path (sin /api/proxy/)
        const fullPath = url.pathname.replace('/api/proxy/', '');

        // Lista de params a filtrar (internos y Vercel)
        const filterParams = ['_n8nUrl', '_apiKey', 'path', 'path[]', '...path'];

        // Reconstruir query params limpios
        const cleanParams = new URLSearchParams();
        for (const [key, value] of url.searchParams) {
            // Filtrar params internos y cualquier variante de path
            if (!filterParams.includes(key) && !key.startsWith('path')) {
                cleanParams.append(key, value);
            }
        }

        const queryString = cleanParams.toString();
        const targetUrl = `${n8nUrl}/api/v1/${fullPath}${queryString ? '?' + queryString : ''}`;

        const fetchOptions = {
            method: req.method,
            headers: {
                'X-N8N-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
        };

        // Solo agregar body si no es GET/HEAD
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            try {
                const body = await req.text();
                if (body) fetchOptions.body = body;
            } catch (e) { }
        }

        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.text();

        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}
