import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { n8nService } from '../services/n8nService';
import { WorkflowCard } from './WorkflowCard';
import { ExecutionsList } from './ExecutionsList';
import { ExecutionDetail } from './ExecutionDetail';

export function Dashboard() {
    const { credentials, disconnect, user } = useAuth();
    const [workflows, setWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Estado de navegación
    const [currentView, setCurrentView] = useState('workflows');
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [selectedExecution, setSelectedExecution] = useState(null);

    // Cargar workflows
    const loadWorkflows = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError('');

        const result = await n8nService.getWorkflows();

        if (result.success) {
            setWorkflows(result.workflows);
        } else {
            setError(result.error);
        }

        setIsLoading(false);
        setIsRefreshing(false);
    }, []);

    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    const handleToggle = (id, newActive) => {
        setWorkflows(prev =>
            prev.map(w =>
                w.id === id ? { ...w, active: newActive } : w
            )
        );
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

    // Filtrar workflows por estado Y búsqueda
    const filteredWorkflows = workflows.filter(w => {
        // Filtro por estado
        if (filter === 'active' && !w.active) return false;
        if (filter === 'inactive' && w.active) return false;

        // Filtro por búsqueda
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const name = (w.name || '').toLowerCase();
            if (!name.includes(query)) return false;
        }

        return true;
    });

    const activeCount = workflows.filter(w => w.active).length;
    const inactiveCount = workflows.filter(w => !w.active).length;

    // Render según la vista actual
    if (currentView === 'execution-detail' && selectedExecution) {
        return <ExecutionDetail execution={selectedExecution} onBack={handleBack} />;
    }

    if (currentView === 'executions') {
        return (
            <ExecutionsList
                workflowId={selectedWorkflow?.id}
                workflowName={selectedWorkflow?.name}
                onBack={handleBack}
                onSelectExecution={handleSelectExecution}
            />
        );
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
                    <input
                        type="text"
                        placeholder="Buscar workflow..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                            ✕
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-item">
                        <span className="stat-value">{workflows.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-item active">
                        <span className="stat-value">{activeCount}</span>
                        <span className="stat-label">Activos</span>
                    </div>
                    <div className="stat-item inactive">
                        <span className="stat-value">{inactiveCount}</span>
                        <span className="stat-label">Inactivos</span>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Todos
                    </button>
                    <button
                        className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Activos
                    </button>
                    <button
                        className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`}
                        onClick={() => setFilter('inactive')}
                    >
                        Inactivos
                    </button>
                </div>

                <div className="header-actions">
                    <button
                        className="action-btn"
                        onClick={handleViewAllExecutions}
                        title="Ver ejecuciones"
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                    <button
                        className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                        onClick={() => loadWorkflows(true)}
                        disabled={isRefreshing}
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="workflow-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>Cargando workflows...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="12" cy="16" r="1" fill="currentColor" />
                        </svg>
                        <p>{error}</p>
                        <button onClick={() => loadWorkflows()}>Reintentar</button>
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p>
                            {searchQuery
                                ? `No hay resultados para "${searchQuery}"`
                                : filter === 'all'
                                    ? 'No hay workflows'
                                    : `No hay workflows ${filter === 'active' ? 'activos' : 'inactivos'}`
                            }
                        </p>
                    </div>
                ) : (
                    filteredWorkflows.map(workflow => (
                        <WorkflowCard
                            key={workflow.id}
                            workflow={workflow}
                            onToggle={handleToggle}
                            onViewExecutions={handleViewExecutions}
                        />
                    ))
                )}
            </main>
        </div>
    );
}
