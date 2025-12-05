import { useState, useEffect, useMemo, useRef } from 'react';
import { n8nService } from '../services/n8nService';

export function ExecutionDetail({ execution: initialExecution, onBack }) {
    const [execution, setExecution] = useState(initialExecution);
    const [workflow, setWorkflow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedNode, setExpandedNode] = useState(null);
    const [activeTab, setActiveTab] = useState('output');
    const [scale, setScale] = useState(0.6); // Zoom más pequeño para ver todo
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => { loadData(); }, [initialExecution.id]);

    const loadData = async () => {
        setIsLoading(true);
        const execResult = await n8nService.getExecution(initialExecution.id);
        if (execResult.success) {
            setExecution(execResult.execution);
            const workflowId = execResult.execution.workflowId || initialExecution.workflowId;
            if (workflowId) {
                const wfResult = await n8nService.getWorkflowDetail(workflowId);
                if (wfResult.success) setWorkflow(wfResult.workflow);
            }
        }
        setIsLoading(false);
    };

    const getStatusInfo = () => {
        const status = execution.status || (execution.finished ? 'success' : 'error');
        if (status === 'running' || status === 'waiting') return { class: 'running', label: 'Ejecutando' };
        if (status === 'success') return { class: 'success', label: 'Completado' };
        return { class: 'error', label: 'Error' };
    };

    const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
    const formatDuration = (start, stop) => {
        if (!start || !stop) return '-';
        const ms = new Date(stop) - new Date(start);
        return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
    };

    const getRunData = () => {
        return execution.data?.resultData?.runData ||
            execution.data?.executionData?.resultData?.runData ||
            execution.executionData?.resultData?.runData || {};
    };

    // Obtener error principal de la ejecución
    const getMainError = () => {
        // Error en resultData
        if (execution.data?.resultData?.error) {
            const err = execution.data.resultData.error;
            return err.message || err.description || JSON.stringify(err);
        }
        // Error en executionData
        if (execution.data?.executionData?.resultData?.error) {
            const err = execution.data.executionData.resultData.error;
            return err.message || err.description || JSON.stringify(err);
        }
        // Error en lastNodeExecuted
        if (execution.data?.resultData?.lastNodeExecuted) {
            const runData = getRunData();
            const lastNode = runData[execution.data.resultData.lastNodeExecuted];
            if (lastNode) {
                const lastRun = Array.isArray(lastNode) ? lastNode[lastNode.length - 1] : lastNode;
                if (lastRun?.error) {
                    return lastRun.error.message || lastRun.error.description || JSON.stringify(lastRun.error);
                }
            }
        }
        return null;
    };

    const canvasData = useMemo(() => {
        if (!workflow?.nodes) return null;

        const runData = getRunData();
        const connections = workflow.connections || {};

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const nodes = workflow.nodes.map(node => {
            const pos = node.position || [0, 0];
            const x = pos[0], y = pos[1];

            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);

            const nodeRunData = runData[node.name];
            const lastRun = nodeRunData ? (Array.isArray(nodeRunData) ? nodeRunData[nodeRunData.length - 1] : nodeRunData) : null;

            return {
                id: node.name, name: node.name,
                type: node.type?.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', '') || 'Node',
                x, y,
                status: lastRun ? (lastRun.error ? 'error' : 'success') : 'pending',
                error: lastRun?.error,
                inputData: lastRun?.inputData?.main || lastRun?.inputData,
                outputData: lastRun?.data?.main || lastRun?.data,
                executionTime: lastRun?.executionTime
            };
        });

        const padding = 60, nodeWidth = 180, nodeHeight = 56;
        const width = maxX - minX + nodeWidth + padding * 2;
        const height = maxY - minY + nodeHeight + padding * 2;

        nodes.forEach(node => {
            node.x = node.x - minX + padding;
            node.y = node.y - minY + padding;
        });

        const nodeMap = {};
        nodes.forEach(n => nodeMap[n.id] = n);

        const lines = [];
        Object.entries(connections).forEach(([sourceName, outputs]) => {
            const sourceNode = nodeMap[sourceName];
            if (!sourceNode) return;
            Object.values(outputs).forEach(outputConnections => {
                if (!Array.isArray(outputConnections)) return;
                outputConnections.forEach(conns => {
                    if (!Array.isArray(conns)) return;
                    conns.forEach(conn => {
                        const targetNode = nodeMap[conn.node];
                        if (targetNode) {
                            lines.push({
                                x1: sourceNode.x + nodeWidth, y1: sourceNode.y + nodeHeight / 2,
                                x2: targetNode.x, y2: targetNode.y + nodeHeight / 2,
                                sourceStatus: sourceNode.status
                            });
                        }
                    });
                });
            });
        });

        return { nodes, lines, width, height, nodeWidth, nodeHeight };
    }, [workflow, execution]);

    // Auto-ajustar canvas en móvil
    useEffect(() => {
        if (wrapperRef.current && canvasData && !isLoading) {
            const wrapper = wrapperRef.current;
            const isMobile = window.innerWidth < 600;

            if (isMobile) {
                const newScale = Math.min(wrapper.clientWidth / canvasData.width, 0.8);
                setScale(Math.max(newScale, 0.3));
            }
            wrapper.scrollLeft = 0;
            wrapper.scrollTop = 0;
        }
    }, [canvasData, isLoading]);

    const formatJSON = (data) => {
        if (!data) return 'Sin datos';
        try {
            const str = JSON.stringify(data, null, 2);
            return str.length > 2500 ? str.slice(0, 2500) + '\n...(truncado)' : str;
        } catch { return String(data); }
    };

    const statusInfo = getStatusInfo();
    const executedNodes = canvasData?.nodes.filter(n => n.status !== 'pending') || [];
    const errorNodes = executedNodes.filter(n => n.status === 'error');
    const mainError = getMainError();

    const zoomIn = () => setScale(s => Math.min(s + 0.2, 2));
    const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.3));
    const resetZoom = () => setScale(0.6);

    // Ajustar al viewport
    const fitToView = () => {
        if (wrapperRef.current && canvasData) {
            const wrapperWidth = wrapperRef.current.clientWidth;
            const newScale = Math.min(wrapperWidth / canvasData.width, 1);
            setScale(Math.max(newScale, 0.3));
            setTimeout(() => {
                if (wrapperRef.current) {
                    wrapperRef.current.scrollLeft = 0;
                    wrapperRef.current.scrollTop = 0;
                }
            }, 50);
        }
    };

    // Cuando se expande un nodo con error, mostrar tab de error
    const handleExpandNode = (nodeId) => {
        const node = executedNodes.find(n => n.id === nodeId);
        if (expandedNode === nodeId) {
            setExpandedNode(null);
        } else {
            setExpandedNode(nodeId);
            if (node?.error) setActiveTab('error');
            else setActiveTab('output');
        }
    };

    return (
        <div className="execution-detail">
            <header className="view-header">
                <button className="back-btn" onClick={onBack} aria-label="Volver">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div className="header-content">
                    <h1>#{execution.id}</h1>
                    {workflow && <p className="subtitle">{workflow.name}</p>}
                </div>
                <button className="refresh-btn" onClick={loadData} disabled={isLoading} aria-label="Actualizar">
                    <svg viewBox="0 0 24 24" fill="none" className={isLoading ? 'spinning' : ''}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </header>

            {isLoading ? (
                <div className="loading-state"><div className="loader"></div><p>Cargando...</p></div>
            ) : (
                <main className="detail-content">
                    <div className={`status-banner ${statusInfo.class}`}>
                        <span>{statusInfo.class === 'success' ? '✓' : statusInfo.class === 'error' ? '✕' : '⏳'} {statusInfo.label}</span>
                    </div>

                    {/* BANNER DE ERROR PRINCIPAL */}
                    {mainError && (
                        <div className="error-banner">
                            <span className="error-icon">⚠️</span>
                            <div className="error-content">
                                <strong>Error:</strong>
                                <p>{mainError}</p>
                            </div>
                        </div>
                    )}

                    <div className="info-row">
                        <span>📅 {formatDate(execution.startedAt)}</span>
                        <span>⏱️ {formatDuration(execution.startedAt, execution.stoppedAt)}</span>
                        <span>🔧 {execution.mode || 'manual'}</span>
                    </div>

                    {/* Canvas */}
                    {canvasData && (
                        <div className="flow-section">
                            <div className="flow-header">
                                <h2>Flujo</h2>
                                <div className="zoom-controls">
                                    <button onClick={zoomOut} className="zoom-btn">−</button>
                                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                                    <button onClick={zoomIn} className="zoom-btn">+</button>
                                    <button onClick={fitToView} className="zoom-btn reset" title="Ajustar a pantalla">⊡</button>
                                </div>
                            </div>

                            <div className="flow-canvas-wrapper" ref={wrapperRef}>
                                <div className="flow-canvas-inner" ref={canvasRef} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                    <svg className="flow-canvas" width={canvasData.width} height={canvasData.height} viewBox={`0 0 ${canvasData.width} ${canvasData.height}`}>
                                        {canvasData.lines.map((line, i) => {
                                            const isExecuted = line.sourceStatus !== 'pending';
                                            const midX = (line.x1 + line.x2) / 2;
                                            return (
                                                <path key={i} d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                                                    className={`flow-line ${isExecuted ? 'executed' : 'pending'}`} fill="none" strokeWidth="2" />
                                            );
                                        })}
                                        {canvasData.nodes.map((node, i) => (
                                            <g key={i} className={`flow-node-g ${node.status}`} transform={`translate(${node.x}, ${node.y})`}
                                                onClick={() => node.status !== 'pending' && handleExpandNode(node.id)}>
                                                <rect width={canvasData.nodeWidth} height={canvasData.nodeHeight} rx="10" className="node-rect" />
                                                <circle cx="20" cy={canvasData.nodeHeight / 2} r="12" className="node-status-circle" />
                                                <text x="40" y="22" className="node-name-text">{node.name.length > 12 ? node.name.slice(0, 12) + '...' : node.name}</text>
                                                <text x="40" y="40" className="node-type-text">{node.type.length > 14 ? node.type.slice(0, 14) + '...' : node.type}</text>
                                                {node.executionTime && <text x={canvasData.nodeWidth - 10} y="22" className="node-time-text" textAnchor="end">{node.executionTime}ms</text>}
                                                <text x="20" y={canvasData.nodeHeight / 2 + 5} className="node-status-text" textAnchor="middle">
                                                    {node.status === 'success' ? '✓' : node.status === 'error' ? '✕' : '○'}
                                                </text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                            </div>

                            <div className="flow-legend">
                                <span><span className="dot success"></span>OK</span>
                                <span><span className="dot error"></span>Error</span>
                                <span><span className="dot pending"></span>No ejecutado</span>
                            </div>
                        </div>
                    )}

                    {/* NODOS CON ERROR PRIMERO */}
                    {errorNodes.length > 0 && (
                        <div className="nodes-section error-section">
                            <h2>❌ Nodos con error ({errorNodes.length})</h2>
                            <div className="nodes-list">
                                {errorNodes.map((node, i) => (
                                    <div key={i} className="node-card error">
                                        <button className="node-header" onClick={() => handleExpandNode(node.id)}>
                                            <span className="node-status-icon error">✕</span>
                                            <div className="node-info">
                                                <span className="node-name">{node.name}</span>
                                                <span className="node-type">{node.type}</span>
                                            </div>
                                            <span className={`expand-arrow ${expandedNode === node.id ? 'expanded' : ''}`}>▼</span>
                                        </button>
                                        {expandedNode === node.id && (
                                            <div className="node-details">
                                                <div className="debug-tabs">
                                                    <button className={`debug-tab ${activeTab === 'error' ? 'active' : ''}`} onClick={() => setActiveTab('error')}>⚠️ Error</button>
                                                    <button className={`debug-tab ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>📥 Input</button>
                                                    <button className={`debug-tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>📤 Output</button>
                                                </div>
                                                <pre className={`debug-pre ${activeTab === 'error' ? 'error' : ''}`}>
                                                    {activeTab === 'error' ? formatJSON(node.error) : activeTab === 'input' ? formatJSON(node.inputData) : formatJSON(node.outputData)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Debug todos los nodos ejecutados */}
                    {executedNodes.length > 0 && (
                        <div className="nodes-section">
                            <h2>🔧 Debug ({executedNodes.length})</h2>
                            <div className="nodes-list">
                                {executedNodes.filter(n => n.status !== 'error').map((node, i) => (
                                    <div key={i} className={`node-card ${node.status}`}>
                                        <button className="node-header" onClick={() => handleExpandNode(node.id)}>
                                            <span className={`node-status-icon ${node.status}`}>✓</span>
                                            <div className="node-info">
                                                <span className="node-name">{node.name}</span>
                                                <span className="node-type">{node.type}</span>
                                            </div>
                                            {node.executionTime && <span className="node-time">{node.executionTime}ms</span>}
                                            <span className={`expand-arrow ${expandedNode === node.id ? 'expanded' : ''}`}>▼</span>
                                        </button>
                                        {expandedNode === node.id && (
                                            <div className="node-details">
                                                <div className="debug-tabs">
                                                    <button className={`debug-tab ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>📥 Input</button>
                                                    <button className={`debug-tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>📤 Output</button>
                                                </div>
                                                <pre className="debug-pre">
                                                    {activeTab === 'input' ? formatJSON(node.inputData) : formatJSON(node.outputData)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            )}
        </div>
    );
}
