import { useState, useEffect, useMemo } from 'react';
import { n8nService } from '../services/n8nService';

export function Insights({ onBack }) {
    const [executions, setExecutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7'); // días
    const [error, setError] = useState('');

    useEffect(() => {
        loadExecutions();
    }, [dateRange]);

    const loadExecutions = async () => {
        setIsLoading(true);
        setError('');

        // Usar getAllExecutions para obtener todas con paginación
        const result = await n8nService.getAllExecutions(null, (loaded) => {
            setError(`Cargando... ${loaded} ejecuciones`);
        });

        if (result.success) {
            setError('');
            // Filtrar por rango de fechas
            const now = new Date();
            const daysAgo = new Date(now - parseInt(dateRange) * 24 * 60 * 60 * 1000);

            const filtered = result.executions.filter(exec => {
                const execDate = new Date(exec.startedAt);
                return execDate >= daysAgo;
            });

            setExecutions(filtered);
        } else {
            setError(result.error);
        }

        setIsLoading(false);
    };

    // Calcular métricas
    const metrics = useMemo(() => {
        if (executions.length === 0) {
            return { total: 0, failed: 0, success: 0, failureRate: 0, avgRunTime: 0, totalTime: 0 };
        }

        let failed = 0;
        let success = 0;
        let totalRunTime = 0;
        let executionsWithTime = 0;

        executions.forEach(exec => {
            const status = exec.status || (exec.finished ? 'success' : 'error');

            if (status === 'success') success++;
            else if (status === 'error' || !exec.finished) failed++;

            // Calcular tiempo de ejecución
            if (exec.startedAt && exec.stoppedAt) {
                const runTime = new Date(exec.stoppedAt) - new Date(exec.startedAt);
                if (runTime > 0 && runTime < 3600000) { // menos de 1 hora
                    totalRunTime += runTime;
                    executionsWithTime++;
                }
            }
        });

        const total = success + failed;
        const failureRate = total > 0 ? ((failed / total) * 100).toFixed(2) : 0;
        const avgRunTime = executionsWithTime > 0 ? totalRunTime / executionsWithTime : 0;

        return {
            total,
            failed,
            success,
            failureRate,
            avgRunTime,
            totalTime: totalRunTime
        };
    }, [executions]);

    // Agrupar ejecuciones por día para gráfica
    const dailyData = useMemo(() => {
        const days = {};
        const now = new Date();

        // Inicializar todos los días
        for (let i = parseInt(dateRange) - 1; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const key = date.toISOString().split('T')[0];
            days[key] = { date: key, success: 0, failed: 0, total: 0 };
        }

        // Contar ejecuciones por día
        executions.forEach(exec => {
            const key = new Date(exec.startedAt).toISOString().split('T')[0];
            if (days[key]) {
                const status = exec.status || (exec.finished ? 'success' : 'error');
                if (status === 'success') days[key].success++;
                else days[key].failed++;
                days[key].total++;
            }
        });

        return Object.values(days);
    }, [executions, dateRange]);

    const formatTime = (ms) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    };

    // Calcular altura máxima para la gráfica
    const maxValue = Math.max(...dailyData.map(d => d.total), 1);

    return (
        <div className="insights-view">
            <header className="view-header">
                <button className="back-btn" onClick={onBack} aria-label="Volver">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="header-content">
                    <h1>📊 Insights</h1>
                </div>
                <button className="refresh-btn" onClick={loadExecutions} disabled={isLoading}>
                    <svg viewBox="0 0 24 24" fill="none" className={isLoading ? 'spinning' : ''}>
                        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </header>

            <main className="insights-content">
                {/* Filtro de fechas */}
                <div className="date-range-selector">
                    <button className={dateRange === '7' ? 'active' : ''} onClick={() => setDateRange('7')}>7 días</button>
                    <button className={dateRange === '14' ? 'active' : ''} onClick={() => setDateRange('14')}>14 días</button>
                    <button className={dateRange === '30' ? 'active' : ''} onClick={() => setDateRange('30')}>30 días</button>
                </div>

                {isLoading ? (
                    <div className="loading-state"><div className="loader"></div><p>Cargando insights...</p></div>
                ) : error ? (
                    <div className="error-state"><p>{error}</p></div>
                ) : (
                    <>
                        {/* Métricas principales */}
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <span className="metric-value">{metrics.total.toLocaleString()}</span>
                                <span className="metric-label">Ejecuciones</span>
                                <span className="metric-period">Últimos {dateRange} días</span>
                            </div>

                            <div className="metric-card error">
                                <span className="metric-value">{metrics.failed.toLocaleString()}</span>
                                <span className="metric-label">Fallidas</span>
                                <span className="metric-change">
                                    {metrics.failureRate > 0 ? `${metrics.failureRate}%` : '0%'}
                                </span>
                            </div>

                            <div className="metric-card success">
                                <span className="metric-value">{metrics.success.toLocaleString()}</span>
                                <span className="metric-label">Exitosas</span>
                                <span className="metric-change">
                                    {metrics.total > 0 ? `${(100 - metrics.failureRate).toFixed(1)}%` : '100%'}
                                </span>
                            </div>

                            <div className="metric-card">
                                <span className="metric-value">{formatTime(metrics.avgRunTime)}</span>
                                <span className="metric-label">Tiempo promedio</span>
                                <span className="metric-period">por ejecución</span>
                            </div>
                        </div>

                        {/* Tasa de fallo visual */}
                        <div className="failure-rate-card">
                            <div className="failure-header">
                                <span className="failure-title">Tasa de fallo</span>
                                <span className="failure-value">{metrics.failureRate}%</span>
                            </div>
                            <div className="failure-bar">
                                <div
                                    className="failure-fill"
                                    style={{ width: `${Math.min(metrics.failureRate * 5, 100)}%` }}
                                ></div>
                            </div>
                            <div className="failure-labels">
                                <span>0%</span>
                                <span>5%</span>
                                <span>10%</span>
                                <span>20%</span>
                            </div>
                        </div>

                        {/* Gráfica de barras */}
                        <div className="chart-section">
                            <h2>Ejecuciones por día</h2>
                            <div className="chart-container">
                                {dailyData.map((day, i) => (
                                    <div key={i} className="chart-bar-group">
                                        <div className="chart-bars">
                                            <div
                                                className="chart-bar success"
                                                style={{ height: `${(day.success / maxValue) * 100}%` }}
                                                title={`${day.success} exitosas`}
                                            ></div>
                                            <div
                                                className="chart-bar error"
                                                style={{ height: `${(day.failed / maxValue) * 100}%` }}
                                                title={`${day.failed} fallidas`}
                                            ></div>
                                        </div>
                                        <span className="chart-label">{formatDate(day.date)}</span>
                                        <span className="chart-value">{day.total}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="chart-legend">
                                <span><span className="dot success"></span> Exitosas</span>
                                <span><span className="dot error"></span> Fallidas</span>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
