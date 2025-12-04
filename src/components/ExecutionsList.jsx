import { useState, useEffect } from 'react';
import { n8nService } from '../services/n8nService';

export function ExecutionsList({ workflowId, workflowName, onBack, onSelectExecution }) {
    const [executions, setExecutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        loadExecutions();
    }, [workflowId]);

    const loadExecutions = async () => {
        setIsLoading(true);
        setError('');
        // Aumentamos límite a 250 (máximo de n8n API)
        const result = await n8nService.getExecutions(workflowId, 250);
        if (result.success) {
            setExecutions(result.executions);
            console.log('Executions loaded:', result.executions);
        } else {
            setError(result.error);
        }
        setIsLoading(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (startedAt, stoppedAt) => {
        if (!startedAt || !stoppedAt) return '-';
        const diffMs = new Date(stoppedAt) - new Date(startedAt);
        if (diffMs < 1000) return `${diffMs}ms`;
        if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
        return `${(diffMs / 60000).toFixed(1)}m`;
    };

    // Determinar el estado real de la ejecución
    const getExecutionStatus = (execution) => {
        // Primero checar el status directo
        if (execution.status === 'running' || execution.status === 'waiting') {
            return 'running';
        }
        if (execution.status === 'error' || execution.status === 'crashed') {
            return 'error';
        }
        if (execution.status === 'success') {
            return 'success';
        }
        // Si no hay status, usar finished
        if (execution.finished === false) {
            return 'error';
        }
        if (execution.finished === true) {
            return 'success';
        }
        // Por defecto success
        return 'success';
    };

    const getStatusInfo = (execution) => {
        const status = getExecutionStatus(execution);
        if (status === 'running') {
            return { class: 'running', label: 'Ejecutando', icon: '⏳' };
        }
        if (status === 'success') {
            return { class: 'success', label: 'Éxito', icon: '✓' };
        }
        return { class: 'error', label: 'Error', icon: '✕' };
    };

    // Filtrar ejecuciones
    const filteredExecutions = executions.filter(execution => {
        const status = getExecutionStatus(execution);

        if (statusFilter === 'success' && status !== 'success') return false;
        if (statusFilter === 'error' && status !== 'error') return false;

        if (dateFilter) {
            const execDate = new Date(execution.startedAt).toDateString();
            const filterDate = new Date(dateFilter).toDateString();
            if (execDate !== filterDate) return false;
        }

        return true;
    });

    const successCount = executions.filter(e => getExecutionStatus(e) === 'success').length;
    const errorCount = executions.filter(e => getExecutionStatus(e) === 'error').length;

    return (
        <div className="executions-view">
            <header className="view-header">
                <button className="back-btn" onClick={onBack}>
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="header-content">
                    <h1>Ejecuciones</h1>
                    {workflowName && <p className="subtitle">{workflowName}</p>}
                </div>
                <button className="refresh-btn" onClick={loadExecutions} disabled={isLoading}>
                    <svg viewBox="0 0 24 24" fill="none" className={isLoading ? 'spinning' : ''}>
                        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </header>

            {/* Filtros */}
            <div className="execution-filters">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Todos ({executions.length})
                    </button>
                    <button
                        className={`filter-tab success-tab ${statusFilter === 'success' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('success')}
                    >
                        ✓ Éxito ({successCount})
                    </button>
                    <button
                        className={`filter-tab error-tab ${statusFilter === 'error' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('error')}
                    >
                        ✕ Error ({errorCount})
                    </button>
                </div>

                <div className="date-filter">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                    {dateFilter && (
                        <button className="clear-date" onClick={() => setDateFilter('')}>✕</button>
                    )}
                </div>
            </div>

            <main className="executions-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>Cargando ejecuciones...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={loadExecutions}>Reintentar</button>
                    </div>
                ) : filteredExecutions.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <p>
                            {executions.length === 0
                                ? 'No hay ejecuciones registradas'
                                : 'No hay ejecuciones con estos filtros'}
                        </p>
                    </div>
                ) : (
                    filteredExecutions.map(execution => {
                        const statusInfo = getStatusInfo(execution);
                        return (
                            <button
                                key={execution.id}
                                className={`execution-card ${statusInfo.class}`}
                                onClick={() => onSelectExecution(execution)}
                            >
                                <div className={`status-indicator ${statusInfo.class}`}>
                                    <span>{statusInfo.icon}</span>
                                </div>
                                <div className="execution-info">
                                    <div className="execution-id">#{execution.id}</div>
                                    <div className="execution-meta">
                                        <span>{formatDate(execution.startedAt)}</span>
                                        <span className="separator">•</span>
                                        <span>{formatDuration(execution.startedAt, execution.stoppedAt)}</span>
                                    </div>
                                </div>
                                <svg className="chevron" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        );
                    })
                )}
            </main>
        </div>
    );
}
