import { createContext, useContext, useState, useEffect } from 'react';
import { n8nService } from '../services/n8nService';

const AuthContext = createContext(null);

const STORAGE_KEY = 'n8n_credentials';

export function AuthProvider({ children }) {
    const [credentials, setCredentials] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Cargar credenciales guardadas al iniciar
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setCredentials(parsed);
                n8nService.setCredentials(parsed.baseUrl, parsed.apiKey);
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    /**
     * Conectar con credenciales nuevas
     */
    const connect = async (baseUrl, apiKey) => {
        const result = await n8nService.checkConnection(baseUrl, apiKey);

        if (result.success) {
            const newCredentials = { baseUrl, apiKey };
            setCredentials(newCredentials);
            setUser(result.user);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
        }

        return result;
    };

    /**
     * Desconectar y limpiar credenciales
     */
    const disconnect = () => {
        setCredentials(null);
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        n8nService.setCredentials('', '');
    };

    const value = {
        credentials,
        user,
        isAuthenticated: !!credentials,
        isLoading,
        connect,
        disconnect,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
