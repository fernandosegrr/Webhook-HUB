export default async function handler(req, res) {
    // Obtener la URL de n8n y API key del body o headers
    const n8nUrl = req.headers['x-n8n-url'] || req.query.n8nUrl;
    const apiKey = req.headers['x-n8n-api-key'];

    if (!n8nUrl || !apiKey) {
        return res.status(400).json({ error: 'Missing n8n URL or API Key' });
    }

    // Obtener el path después de /api/proxy
    const path = req.query.path || '';
    const targetUrl = `${n8nUrl}/api/v1/${path}`;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'X-N8N-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.json();

        // Agregar headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
