import { useState } from 'react';
import { n8nService } from '../services/n8nService';

export function WorkflowCard({ workflow, onToggle, onViewExecutions, onBackup }) {
    const [isToggling, setIsToggling] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [error, setError] = useState('');
    const [backupSuccess, setBackupSuccess] = useState(false);

    const handleToggle = async (e) => {
        e.stopPropagation();
        if (isToggling) return;

        setIsToggling(true);
        setError('');

        const result = await n8nService.toggleWorkflow(workflow.id, !workflow.active);

        if (result.success) {
            onToggle(workflow.id, !workflow.active);
        } else {
            setError(result.error);
            setTimeout(() => setError(''), 3000);
        }

        setIsToggling(false);
    };

    const handleBackup = async (e) => {
        e.stopPropagation();
        if (isBackingUp || !onBackup) return;

        setIsBackingUp(true);
        setError('');
        setBackupSuccess(false);

        try {
            await onBackup(workflow);
            setBackupSuccess(true);
            setTimeout(() => setBackupSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }

        setIsBackingUp(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Sin fecha';
        return new Date(dateString).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className={`workflow-card ${workflow.active ? 'active' : 'inactive'}`}>
            <button className="workflow-main" onClick={() => onViewExecutions(workflow)}>
                <div className="workflow-info">
                    <h3 className="workflow-name">{workflow.name}</h3>
                    <div className="workflow-meta">
                        <span className={`status-badge ${workflow.active ? 'active' : 'inactive'}`}>
                            {workflow.active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="updated-at">{formatDate(workflow.updatedAt)}</span>
                    </div>
                    {error && <p className="workflow-error">{error}</p>}
                    {backupSuccess && <p className="workflow-success">✓ Respaldado</p>}
                </div>
                <svg className="chevron" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <div className="workflow-actions">
                {/* Botón de backup */}
                {onBackup && (
                    <button
                        className={`backup-btn ${isBackingUp ? 'loading' : ''} ${backupSuccess ? 'success' : ''}`}
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        aria-label="Respaldar workflow"
                    >
                        {isBackingUp ? (
                            <svg className="spinning" viewBox="0 0 24 24" fill="none">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : backupSuccess ? (
                            <span>✓</span>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Toggle switch */}
                <button
                    className={`toggle-switch ${workflow.active ? 'on' : 'off'} ${isToggling ? 'toggling' : ''}`}
                    onClick={handleToggle}
                    disabled={isToggling}
                    aria-label={workflow.active ? 'Desactivar' : 'Activar'}
                >
                    <span className="toggle-slider"></span>
                </button>
            </div>
        </div>
    );
}
