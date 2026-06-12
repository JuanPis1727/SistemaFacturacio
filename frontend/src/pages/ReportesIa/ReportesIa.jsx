import React, { useState, useRef, useEffect, useContext } from 'react';
import { Sparkles, Send, Download, Bot, User, Loader2, HelpCircle, AlertCircle } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import './ReportesIa.css';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ReportesIa() {
  const { user } = useContext(AuthContext);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [conversacion, setConversacion] = useState([
    {
      id: 'welcome',
      remitente: 'bot',
      texto: `¡Hola **${user?.nombre || 'Administrador'}**! Soy tu asistente de análisis de datos para **JIZFact**. 
      Puedo traducir tus preguntas en lenguaje natural a reportes dinámicos de tu negocio.
      
      Pregúntame algo o selecciona una de las siguientes sugerencias para empezar:`,
      sugerencias: [
        '¿Cuáles son los 5 productos más vendidos de este mes?',
        '¿Cuánto dinero nos deben los clientes en total?',
        '¿Cuál ha sido el resumen de ventas de esta semana?',
        '¿Qué productos están por debajo de su stock mínimo?'
      ]
    }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversacion, cargando]);

  const enviarPregunta = async (preguntaTexto) => {
    if (!preguntaTexto.trim() || cargando) return;

    const userMessageId = Date.now().toString();
    const botMessageId = (Date.now() + 1).toString();

    // 1. Agregar mensaje del usuario a la conversación
    setConversacion(prev => [
      ...prev,
      {
        id: userMessageId,
        remitente: 'user',
        texto: preguntaTexto
      }
    ]);

    setMensaje('');
    setCargando(true);

    try {
      // 2. Consumir API del backend
      const res = await fetchAPI('/reportes-ia/chat', {
        method: 'POST',
        body: JSON.stringify({ mensaje: preguntaTexto })
      });

      if (res.success) {
        setConversacion(prev => [
          ...prev,
          {
            id: botMessageId,
            remitente: 'bot',
            texto: res.explicacion,
            datos: res.datos,
            grafica: res.grafica,
            sql: res.sql
          }
        ]);
      } else {
        setConversacion(prev => [
          ...prev,
          {
            id: botMessageId,
            remitente: 'bot',
            texto: `❌ **Error:** ${res.message || 'No pude procesar tu solicitud.'}`
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setConversacion(prev => [
        ...prev,
        {
          id: botMessageId,
          remitente: 'bot',
          texto: '❌ **Error de conexión:** No se pudo comunicar con el servidor de IA.'
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    enviarPregunta(mensaje);
  };

  const handleExportExcel = async (datos, titulo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reportes-ia/exportar-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ datos, titulo })
      });

      if (!response.ok) {
        throw new Error('Error en el servidor al generar Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${titulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      window.Swal.fire('Error', 'No se pudo exportar el reporte a Excel.', 'error');
    }
  };

  const renderChart = (grafica) => {
    if (!grafica || !grafica.requiereGrafica) return null;

    const chartData = {
      labels: grafica.labels,
      datasets: [
        {
          label: grafica.titulo || 'Datos de Reporte',
          data: grafica.data,
          backgroundColor:
            grafica.tipo === 'pie' || grafica.tipo === 'doughnut'
              ? [
                  '#3b82f6',
                  '#8b5cf6',
                  '#06b6d4',
                  '#10b981',
                  '#f59e0b',
                  '#ef4444',
                  '#ec4899',
                  '#6366f1',
                  '#14b8a6',
                  '#f43f5e'
                ]
              : 'rgba(59, 130, 246, 0.75)',
          borderColor:
            grafica.tipo === 'pie' || grafica.tipo === 'doughnut'
              ? '#ffffff'
              : '#2563eb',
          borderWidth: 1.5,
          borderRadius: grafica.tipo === 'bar' ? 6 : 0
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: grafica.tipo === 'pie' || grafica.tipo === 'doughnut',
          position: 'bottom',
          labels: {
            font: { family: 'Outfit', size: 11 }
          }
        },
        title: {
          display: true,
          text: grafica.titulo || '',
          font: { family: 'Outfit', size: 14, weight: 'bold' },
          color: '#1e293b'
        }
      },
      scales:
        grafica.tipo === 'pie' || grafica.tipo === 'doughnut'
          ? {}
          : {
              y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9' },
                ticks: { font: { family: 'Outfit' } }
              },
              x: {
                grid: { display: false },
                ticks: { font: { family: 'Outfit' } }
              }
            }
    };

    return (
      <div style={{ height: '320px', width: '100%', position: 'relative', marginTop: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        {grafica.tipo === 'line' && <Line data={chartData} options={options} />}
        {(grafica.tipo === 'pie' || grafica.tipo === 'doughnut') && <Doughnut data={chartData} options={options} />}
        {grafica.tipo === 'bar' && <Bar data={chartData} options={options} />}
      </div>
    );
  };

  const renderTable = (datos) => {
    if (!datos || datos.length === 0) return null;
    const keys = Object.keys(datos[0]);

    return (
      <div className="crud-table-container" style={{ marginTop: '1.25rem', maxHeight: '250px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <table className="crud-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
              {keys.map((k) => (
                <th key={k} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  {k.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.slice(0, 10).map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {keys.map((k) => {
                  const val = row[k];
                  let displayVal = String(val === null || val === undefined ? '' : val);

                  if (typeof val === 'number') {
                    const lowerK = k.toLowerCase();
                    if (
                      lowerK.includes('precio') ||
                      lowerK.includes('total') ||
                      lowerK.includes('subtotal') ||
                      lowerK.includes('deuda') ||
                      lowerK.includes('monto') ||
                      lowerK.includes('valor')
                    ) {
                      displayVal = `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    } else {
                      displayVal = val.toLocaleString();
                    }
                  } else if (val && !isNaN(Date.parse(val)) && String(val).includes('T')) {
                    displayVal = new Date(val).toLocaleDateString();
                  }

                  return (
                    <td key={k} style={{ padding: '10px 14px', color: '#334155' }}>
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {datos.length > 10 && (
          <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
            Mostrando las primeras 10 filas de {datos.length} totales. Descarga el Excel para ver completo.
          </div>
        )}
      </div>
    );
  };

  // Renderizar texto con soporte básico de markdown (negrita **)
  const formatText = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="reportes-ia-container fade-in">
      {/* Header */}
      <div className="reportes-ia-header">
        <div className="message-avatar" style={{ background: '#dbeafe', color: '#1e40af' }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h2>Analista Financiero Virtual</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Pregunta detalles de ventas, inventario, deudas o rendimiento de productos.
          </p>
        </div>
      </div>

      {/* Historial de Chat */}
      <div className="chat-history">
        {conversacion.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.remitente}`}>
            <div className="message-avatar">
              {msg.remitente === 'bot' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div className="message-content">
              {/* Texto de la respuesta */}
              <div style={{ whiteSpace: 'pre-line' }}>{formatText(msg.texto)}</div>

              {/* Sugerencias en el mensaje de bienvenida */}
              {msg.sugerencias && (
                <div className="suggestions-grid">
                  {msg.sugerencias.map((sug, index) => (
                    <button
                      key={index}
                      className="suggestion-chip"
                      onClick={() => enviarPregunta(sug)}
                      disabled={cargando}
                    >
                      <HelpCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Render de Tabla si tiene datos */}
              {msg.datos && msg.datos.length > 0 && renderTable(msg.datos)}

              {/* Render de Gráfica si lo requiere */}
              {msg.grafica?.requiereGrafica && renderChart(msg.grafica)}

              {/* Botón de Excel si tiene datos */}
              {msg.datos && msg.datos.length > 0 && (
                <button
                  className="export-btn"
                  onClick={() => handleExportExcel(msg.datos, msg.texto.substring(0, 40))}
                >
                  <Download size={14} /> Exportar Reporte a Excel
                </button>
              )}

              {/* Consulta SQL generada (Solo desarrolladores/Admin, informativa discreta) */}
              {msg.sql && (
                <details style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <summary>Ver consulta SQL ejecutada por seguridad</summary>
                  <pre style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '5px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {msg.sql}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Indicador de carga de respuesta */}
        {cargando && (
          <div className="message-bubble bot">
            <div className="message-avatar" style={{ background: '#f1f5f9', color: '#475569' }}>
              <Bot size={18} />
            </div>
            <div className="message-content" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Analizando base de datos y redactando respuesta...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input de Chat */}
      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            placeholder="Pregúntale a la IA sobre tu negocio... (ej: Ventas de esta semana)"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            disabled={cargando}
            required
          />
          <button type="submit" className="send-btn" disabled={cargando || !mensaje.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
