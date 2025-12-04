import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { n8nService } from '../services/n8nService';
import { initGoogleAuth, requestGoogleAuth, isGoogleAuthenticated, backupWorkflow, backupAllWorkflows } from '../services/googleDriveService';
import { WorkflowCard } from './WorkflowCard';
import { ExecutionsList } from './ExecutionsList';
import { ExecutionDetail } from './ExecutionDetail';
import { Insights } from './Insights';

// Tu Google Client ID (necesitas crearlo en Google Cloud Console)
const GOOGLE_CLIENT_ID = localStorage.getItem('googleClientId') || '';

export function Dashboard() {
    const { credentials, disconnect, user } = useAuth();
    const [workflows, setWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Navegación
    const [currentView, setCurrentView] = useState('workflows');
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [selectedExecution, setSelectedExecution] = useState(null);

    // Google Drive
    const [googleReady, setGoogleReady] = useState(false);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const [showGoogleSetup, setShowGoogleSetup] = useState(false);
    const [clientIdInput, setClientIdInput] = useState(GOOGLE_CLIENT_ID);

    // Inicializar Google Auth
    useEffect(() => {
        if (GOOGLE_CLIENT_ID) {
            initGoogleAuth(GOOGLE_CLIENT_ID)
                .then(() => setGoogleReady(true))
                .catch(() => setGoogleReady(false));
        }
    }, []);

    const handleConnectGoogle = async () => {
        try {
            if (!googleReady && clientIdInput) {
                localStorage.setItem('googleClientId', clientIdInput);
                await initGoogleAuth(clientIdInput);
                setGoogleReady(true);
            }
            await requestGoogleAuth();
            setGoogleConnected(true);
            setBackupStatus('✓ Google Drive conectado');
            setTimeout(() => setBackupStatus(''), 3000);
            setShowGoogleSetup(false);
        } catch (err) {
            setBackupStatus('Error: ' + err.message);
            setTimeout(() => setBackupStatus(''), 5000);
        }
    };

    const handleBackupWorkflow = async (workflow) => {
        if (!googleConnected) {
            setBackupStatus('Conecta Google Drive primero');
            setTimeout(() => setBackupStatus(''), 3000);
            return;
        }

        try {
            // Obtener workflow completo con detalles
            const detail = await n8nService.getWorkflowDetail(workflow.id);
            if (!detail.success) throw new Error('Error obteniendo workflow');

            const result = await backupWorkflow(detail.workflow);
            setBackupStatus(`✓ ${result.fileName} respaldado`);
            setTimeout(() => setBackupStatus(''), 3000);
        } catch (err) {
            throw err;
        }
    };

    const handleBackupAll = async () => {
        if (!googleConnected) {
            setShowGoogleSetup(true);
            return;
        }

        setBackupStatus('Obteniendo workflows...');

        try {
            // Obtener todos los workflows completos
            const fullWorkflows = [];
            for (let i = 0; i < workflows.length; i++) {
                setBackupStatus(`Obteniendo ${i + 1}/${workflows.length}...`);
                const detail = await n8nService.getWorkflowDetail(workflows[i].id);
                if (detail.success) fullWorkflows.push(detail.workflow);
            }

            // Subir cada uno individualmente
            const result = await backupAllWorkflows(fullWorkflows, (current, total, name) => {
                setBackupStatus(`Subiendo ${current}/${total}: ${name}`);
            });

            setBackupStatus(`✓ ${result.count}/${result.total} workflows respaldados`);
            setTimeout(() => setBackupStatus(''), 5000);
        } catch (err) {
            setBackupStatus('Error: ' + err.message);
            setTimeout(() => setBackupStatus(''), 5000);
        }
    };

    const loadWorkflows = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError('');

        const result = await n8nService.getWorkflows();

        if (result.success) setWorkflows(result.workflows);
        else setError(result.error);

        setIsLoading(false);
        setIsRefreshing(false);
    }, []);

    useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

    const handleToggle = (id, newActive) => {
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: newActive } : w));
    };

    const handleViewExecutions = (workflow) => {
        setSelectedWorkflow(workflow);
        setCurrentView('executions');
    };

    const handleViewAllExecutions = () => {
        setSelectedWorkflow(null);
        setCurrentView('executions');
    };

    const handleSelectExecution = (execution) => {
        setSelectedExecution(execution);
        setCurrentView('execution-detail');
    };

    const handleBack = () => {
        if (currentView === 'execution-detail') {
            setCurrentView('executions');
            setSelectedExecution(null);
        } else {
            setCurrentView('workflows');
            setSelectedWorkflow(null);
        }
    };

    const filteredWorkflows = workflows.filter(w => {
        if (filter === 'active' && !w.active) return false;
        if (filter === 'inactive' && w.active) return false;
        if (searchQuery.trim()) {
            if (!w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }
        return true;
    });

    const activeCount = workflows.filter(w => w.active).length;
    const inactiveCount = workflows.filter(w => !w.active).length;

    if (currentView === 'insights') {
        return <Insights onBack={handleBack} />;
    }

    if (currentView === 'execution-detail' && selectedExecution) {
        return <ExecutionDetail execution={selectedExecution} onBack={handleBack} />;
    }

    if (currentView === 'executions') {
        return <ExecutionsList workflowId={selectedWorkflow?.id} workflowName={selectedWorkflow?.name} onBack={handleBack} onSelectExecution={handleSelectExecution} />;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-top">
                    <div className="user-info">
                        <span className="user-greeting">Hola, {user?.firstName || 'Usuario'}</span>
                        <span className="server-url">{credentials?.baseUrl}</span>
                    </div>
                    <button className="logout-btn" onClick={disconnect}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <h1 className="dashboard-title">Workflows</h1>

                {/* Buscador */}
                <div className="search-box">
                    <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input type="text" placeholder="Buscar workflow..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>}
                </div>

                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-item"><span className="stat-value">{workflows.length}</span><span className="stat-label">Total</span></div>
                    <div className="stat-item active"><span className="stat-value">{activeCount}</span><span className="stat-label">Activos</span></div>
                    <div className="stat-item inactive"><span className="stat-value">{inactiveCount}</span><span className="stat-label">Inactivos</span></div>
                </div>

                {/* Google Drive Status */}
                {backupStatus && (
                    <div className={`backup-status ${backupStatus.includes('Error') ? 'error' : 'success'}`}>
                        {backupStatus}
                    </div>
                )}
            </header>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-tabs">
                    <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
                    <button className={`filter-tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Activos</button>
                    <button className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`} onClick={() => setFilter('inactive')}>Inactivos</button>
                </div>

                <div className="header-actions">
                    {/* Insights Button */}
                    <button className="action-btn insights" onClick={() => setCurrentView('insights')} title="Ver insights">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    {/* Backup All Button */}
                    <button className={`action-btn backup ${googleConnected ? 'connected' : ''}`} onClick={handleBackupAll} title="Respaldar todos">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button className="action-btn" onClick={handleViewAllExecutions} title="Ver ejecuciones">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`} onClick={() => loadWorkflows(true)} disabled={isRefreshing}>
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Google Setup Modal */}
            {showGoogleSetup && (
                <div className="modal-overlay" onClick={() => setShowGoogleSetup(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>🔗 Conectar Google Drive</h2>
                        <p>Para respaldar tus workflows necesitas un Google Client ID.</p>
                        <ol>
                            <li>Ve a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a></li>
                            <li>Crea un proyecto y habilita Google Drive API</li>
                            <li>Crea credenciales OAuth 2.0 (Web Application)</li>
                            <li>Agrega tu dominio a orígenes autorizados</li>
                            <li>Copia el Client ID aquí:</li>
                        </ol>
                        <input
                            type="text"
                            placeholder="Tu Google Client ID"
                            value={clientIdInput}
                            onChange={e => setClientIdInput(e.target.value)}
                            className="google-input"
                        />
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowGoogleSetup(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleConnectGoogle} disabled={!clientIdInput}>
                                Conectar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <main className="workflow-list">
                {isLoading ? (
                    <div className="loading-state"><div className="loader"></div><p>Cargando workflows...</p></div>
                ) : error ? (
                    <div className="error-state">
                        <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="16" r="1" fill="currentColor" /></svg>
                        <p>{error}</p>
                        <button onClick={() => loadWorkflows()}>Reintentar</button>
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <p>{searchQuery ? `No hay resultados para "${searchQuery}"` : 'No hay workflows'}</p>
                    </div>
                ) : (
                    filteredWorkflows.map(workflow => (
                        <WorkflowCard
                            key={workflow.id}
                            workflow={workflow}
                            onToggle={handleToggle}
                            onViewExecutions={handleViewExecutions}
                            onBackup={googleConnected ? handleBackupWorkflow : null}
                        />
                    ))
                )}
            </main>
        </div>
    );
}
