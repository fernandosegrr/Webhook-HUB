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

    const url = new URL(req.url);

    // Obtener credenciales de query params
    const n8nUrl = url.searchParams.get('_n8nUrl');
    const apiKey = url.searchParams.get('_apiKey');

    if (!n8nUrl || !apiKey) {
        return new Response(JSON.stringify({
            error: 'Missing n8n URL or API Key',
            receivedUrl: n8nUrl ? 'yes' : 'no',
            receivedKey: apiKey ? 'yes' : 'no'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    // Obtener el path - quitar /api/proxy del inicio
    const pathMatch = url.pathname.match(/\/api\/proxy\/(.*)/);
    let path = pathMatch ? pathMatch[1] : '';

    // Reconstruir query string sin los params internos
    const cleanParams = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
        if (!key.startsWith('_')) {
            cleanParams.append(key, value);
        }
    }
    const queryString = cleanParams.toString();

    const targetUrl = `${n8nUrl}/api/v1/${path}${queryString ? '?' + queryString : ''}`;

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'X-N8N-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
        };

        // Solo agregar body si no es GET
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const body = await req.text();
            if (body) {
                fetchOptions.body = body;
            }
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
        return new Response(JSON.stringify({ error: error.message, targetUrl }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}
