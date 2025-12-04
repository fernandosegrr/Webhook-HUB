/**
 * n8n API Service
 * Wrapper para comunicarse con la API pública de n8n
 */

class N8nService {
    constructor() {
        this.baseUrl = '';
        this.apiKey = '';
    }

    /**
     * Configura las credenciales para las peticiones
     */
    setCredentials(baseUrl, apiKey) {
        // Eliminar trailing slash
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }

    /**
     * Obtiene la URL correcta para las peticiones
     * En desarrollo usa proxy local, en producción usa proxy de Vercel
     */
    getApiUrl(endpoint) {
        const isDev = window.location.hostname === 'localhost';
        const isKnownServer = this.baseUrl.includes('n8n-n8n.d6cr6o.easypanel.host');

        if (isDev && isKnownServer) {
            // Desarrollo: proxy de Vite
            return `/n8n-api${endpoint}`;
        }

        // Producción: proxy de Vercel con credenciales en query
        const path = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const encodedUrl = encodeURIComponent(this.baseUrl);
        const encodedKey = encodeURIComponent(this.apiKey);
        const separator = path.includes('?') ? '&' : '?';
        return `/api/proxy/${path}${separator}_n8nUrl=${encodedUrl}&_apiKey=${encodedKey}`;
    }

    /**
     * Headers comunes para todas las peticiones
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        const isDev = window.location.hostname === 'localhost';

        if (isDev) {
            headers['X-N8N-API-KEY'] = this.apiKey;
        }

        return headers;
    }

    /**
     * Valida la conexión con el servidor n8n
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    async checkConnection(baseUrl, apiKey) {
        try {
            // Primero guardamos las credenciales para poder usar getApiUrl y getHeaders
            this.setCredentials(baseUrl, apiKey);

            // Usamos /workflows para validar - más compatible que /users/me
            const url = this.getApiUrl('/workflows?limit=1');

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(), // Usar getHeaders para incluir X-N8N-URL en producción
            });

            if (!response.ok) {
                // Limpiamos credenciales si falla
                this.baseUrl = '';
                this.apiKey = '';

                if (response.status === 401) {
                    return { success: false, error: 'API Key inválida' };
                }
                if (response.status === 403) {
                    return { success: false, error: 'Sin permisos. Verifica tu API Key.' };
                }
                if (response.status === 404) {
                    return { success: false, error: 'Endpoint no encontrado. Verifica la URL' };
                }
                return { success: false, error: `Error del servidor: ${response.status}` };
            }

            // Conexión exitosa
            return { success: true, user: { firstName: 'Usuario' } };
        } catch (error) {
            // Limpiamos credenciales si falla
            this.baseUrl = '';
            this.apiKey = '';

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return {
                    success: false,
                    error: 'No se puede conectar al servidor. Verifica la URL o el CORS.'
                };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene todos los workflows
     * @param {boolean|null} active - Filtrar por estado (null = todos)
     * @returns {Promise<{success: boolean, workflows?: array, error?: string}>}
     */
    async getWorkflows(active = null) {
        try {
            let endpoint = '/workflows';

            if (active !== null) {
                endpoint += `?active=${active}`;
            }

            const response = await fetch(this.getApiUrl(endpoint), {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                return { success: false, error: `Error: ${response.status}` };
            }

            const data = await response.json();

            // La API de n8n retorna { data: [...workflows] }
            const workflows = data.data || data;

            return { success: true, workflows };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Activa un workflow
     * @param {string} id - ID del workflow
     * @returns {Promise<{success: boolean, workflow?: object, error?: string}>}
     */
    async activateWorkflow(id) {
        try {
            const response = await fetch(this.getApiUrl(`/workflows/${id}/activate`), {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `Error: ${response.status}`
                };
            }

            const workflow = await response.json();
            return { success: true, workflow };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Desactiva un workflow
     * @param {string} id - ID del workflow
     * @returns {Promise<{success: boolean, workflow?: object, error?: string}>}
     */
    async deactivateWorkflow(id) {
        try {
            const response = await fetch(this.getApiUrl(`/workflows/${id}/deactivate`), {
                method: 'POST',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.message || `Error: ${response.status}`
                };
            }

            const workflow = await response.json();
            return { success: true, workflow };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle de estado de workflow
     * @param {string} id - ID del workflow
     * @param {boolean} active - Estado deseado
     */
    async toggleWorkflow(id, active) {
        if (active) {
            return this.activateWorkflow(id);
        } else {
            return this.deactivateWorkflow(id);
        }
    }

    /**
     * Obtiene las ejecuciones de un workflow o todas
     * @param {string|null} workflowId - ID del workflow (null = todas)
     * @param {number} limit - Cantidad máxima de resultados (max 250)
     * @returns {Promise<{success: boolean, executions?: array, error?: string}>}
     */
    async getExecutions(workflowId = null, limit = 100) {
        try {
            // n8n API tiene límite máximo de 250
            const safeLimit = Math.min(limit, 250);
            let endpoint = `/executions?limit=${safeLimit}`;

            if (workflowId) {
                endpoint += `&workflowId=${workflowId}`;
            }

            const response = await fetch(this.getApiUrl(endpoint), {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                return { success: false, error: `Error: ${response.status}` };
            }

            const data = await response.json();
            const executions = data.data || data;
            const nextCursor = data.nextCursor;

            return { success: true, executions, nextCursor };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene TODAS las ejecuciones con paginación automática
     * @param {string|null} workflowId - ID del workflow (null = todas)
     * @param {function} onProgress - Callback de progreso (loaded, total)
     * @returns {Promise<{success: boolean, executions?: array, error?: string}>}
     */
    async getAllExecutions(workflowId = null, onProgress = null) {
        try {
            let allExecutions = [];
            let cursor = null;
            let page = 0;
            const limit = 250; // Máximo por página

            do {
                let endpoint = `/executions?limit=${limit}`;
                if (workflowId) endpoint += `&workflowId=${workflowId}`;
                if (cursor) endpoint += `&cursor=${cursor}`;

                const response = await fetch(this.getApiUrl(endpoint), {
                    method: 'GET',
                    headers: this.getHeaders(),
                });

                if (!response.ok) {
                    return { success: false, error: `Error: ${response.status}` };
                }

                const data = await response.json();
                const executions = data.data || data;
                allExecutions = allExecutions.concat(executions);
                cursor = data.nextCursor;
                page++;

                if (onProgress) {
                    onProgress(allExecutions.length);
                }

                // Límite de seguridad: máximo 20 páginas (5000 ejecuciones)
                if (page >= 20) break;

            } while (cursor);

            return { success: true, executions: allExecutions };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene el detalle de una ejecución específica
     * @param {string} id - ID de la ejecución
     * @returns {Promise<{success: boolean, execution?: object, error?: string}>}
     */
    async getExecution(id) {
        try {
            // includeData=true para obtener los datos de los nodos ejecutados
            const response = await fetch(this.getApiUrl(`/executions/${id}?includeData=true`), {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                return { success: false, error: `Error: ${response.status}` };
            }

            const execution = await response.json();
            return { success: true, execution };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene el detalle de un workflow específico
     * @param {string} id - ID del workflow
     * @returns {Promise<{success: boolean, workflow?: object, error?: string}>}
     */
    async getWorkflowDetail(id) {
        try {
            const response = await fetch(this.getApiUrl(`/workflows/${id}`), {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                return { success: false, error: `Error: ${response.status}` };
            }

            const workflow = await response.json();
            return { success: true, workflow };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Exportar instancia única (singleton)
export const n8nService = new N8nService();
