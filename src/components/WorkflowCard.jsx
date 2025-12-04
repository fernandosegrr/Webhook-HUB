import { useState } from 'react';
import { n8nService } from '../services/n8nService';

export function WorkflowCard({ workflow, onToggle, onViewExecutions }) {
    const [isToggling, setIsToggling] = useState(false);
    const [error, setError] = useState('');

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

    const formatDate = (dateString) => {
        if (!dateString) return 'Sin fecha';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`workflow-card ${workflow.active ? 'active' : 'inactive'}`}>
            <button
                className="workflow-main"
                onClick={() => onViewExecutions(workflow)}
            >
                <div className="workflow-info">
                    <h3 className="workflow-name">{workflow.name}</h3>
                    <div className="workflow-meta">
                        <span className={`status-badge ${workflow.active ? 'active' : 'inactive'}`}>
                            {workflow.active ? 'Activo' : 'Inactivo'}
                        </span>
                        <span className="updated-at">
                            {formatDate(workflow.updatedAt)}
                        </span>
                    </div>
                    {error && <p className="workflow-error">{error}</p>}
                </div>
                <svg className="chevron" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <button
                className={`toggle-switch ${workflow.active ? 'on' : 'off'} ${isToggling ? 'toggling' : ''}`}
                onClick={handleToggle}
                disabled={isToggling}
                aria-label={workflow.active ? 'Desactivar workflow' : 'Activar workflow'}
            >
                <span className="toggle-slider"></span>
            </button>
        </div>
    );
}
