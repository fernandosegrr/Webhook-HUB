import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginForm() {
    const { connect } = useAuth();
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validaciones básicas
        if (!baseUrl.trim()) {
            setError('Ingresa la URL de tu servidor n8n');
            setIsLoading(false);
            return;
        }

        if (!apiKey.trim()) {
            setError('Ingresa tu API Key');
            setIsLoading(false);
            return;
        }

        const result = await connect(baseUrl.trim(), apiKey.trim());

        if (!result.success) {
            setError(result.error);
        }

        setIsLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1>n8n Manager</h1>
                    <p>Conecta con tu servidor n8n</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label htmlFor="baseUrl">URL del servidor</label>
                        <input
                            id="baseUrl"
                            type="url"
                            placeholder="https://n8n.tudominio.com"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            disabled={isLoading}
                            autoComplete="url"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="apiKey">API Key</label>
                        <input
                            id="apiKey"
                            type="password"
                            placeholder="n8n_api_..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={isLoading}
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <circle cx="12" cy="16" r="1" fill="currentColor" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Conectando...
                            </>
                        ) : (
                            'Conectar'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        Necesitas habilitar la API en tu n8n
                        <br />
                        <small>Settings → API → Create API Key</small>
                    </p>
                </div>
            </div>
        </div>
    );
}
