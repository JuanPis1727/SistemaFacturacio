import React, { useState, useRef, useEffect, useContext } from 'react';
import { Barcode, Trash2, Search, Plus, Minus, Printer, XCircle, ArrowLeft } from 'lucide-react';
import { fetchAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import './POS.css';

export default function POS() {
  const { user } = useContext(AuthContext);
  const [codigo, setCodigo] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sugerenciasProd, setSugerenciasProd] = useState([]);

  // Almacenamiento en memoria para agilidad
  const [productosMemo, setProductosMemo] = useState([]);
  const [clientesMemo, setClientesMemo] = useState([]);

  // Custom Toast Notificator
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Modales
  const [step, setStep] = useState('CART'); // 'CART', 'CHECKOUT', 'RECEIPT'
  const [checkoutData, setCheckoutData] = useState({
    metodo_pago: 'Efectivo',
    tipo_venta: 'Contado',
    cliente_selected: null,
    monto_entregado: '',
  });

  const [currentInvoice, setCurrentInvoice] = useState(null);
  const scannerInputRef = useRef(null);
  const busquedaClienteRef = useRef(null);

  // Cliente para el carrito y cobro de deudas
  const [cartClienteSelected, setCartClienteSelected] = useState(null);
  const [busquedaCartCliente, setBusquedaCartCliente] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (step === 'CART') {
      scannerInputRef.current?.focus();
    }
  }, [cart, step]);

  const cargarDatos = async () => {
    const [resProd, resCli] = await Promise.all([
      fetchAPI('/productos'),
      fetchAPI('/clientes')
    ]);
    if (resProd.success) setProductosMemo(resProd.data);
    if (resCli.success) setClientesMemo(resCli.data);
  };

  useEffect(() => {
    const handleGlobalKeyDown = async (e) => {
      if (e.key === '+' && step === 'CART') {
        e.preventDefault();
        const { value: valorStr } = await window.Swal.fire({
          title: 'Agregar Valor Manual',
          input: 'number',
          inputLabel: 'Ingrese el valor a cobrar',
          inputPlaceholder: 'Ej: 5000',
          showCancelButton: true,
          confirmButtonText: 'Agregar',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => {
            if (!value || isNaN(value) || Number(value) <= 0) {
              return 'Por favor ingrese un valor válido';
            }
          }
        });

        if (valorStr) {
          const valor = Number(valorStr);
          setCart(prev => [
            ...prev,
            {
              id: 'MANUAL_' + Date.now(),
              nombre: 'Varios',
              codigo: 'MANUAL',
              precio_venta: valor,
              stock: 9999, // stock infinito para items manuales
              cantidad: 1,
              subtotal: valor,
              isManual: true
            }
          ]);
          showToast('✅ Ítem manual agregado');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step]);

  const handleCodigoChange = (e) => {
    const val = e.target.value;
    setCodigo(val);

    if (val.trim() !== '') {
      const matchExacto = productosMemo.find(p => p.codigo === val.trim());
      if (matchExacto) {
        agregarAlCarrito(matchExacto);
        setCodigo('');
        setSugerenciasProd([]);
        return;
      }

      const sugerencias = productosMemo.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(val.toLowerCase())) ||
        (p.codigo && p.codigo.includes(val))
      ).slice(0, 10);
      setSugerenciasProd(sugerencias);
    } else {
      setSugerenciasProd([]);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && codigo.trim() !== '') {
      e.preventDefault();
      const matchExacto = productosMemo.find(p => p.codigo === codigo.trim());
      if (matchExacto) {
        await agregarAlCarrito(matchExacto);
        setCodigo('');
        setSugerenciasProd([]);
      } else if (sugerenciasProd.length > 0) {
        await agregarAlCarrito(sugerenciasProd[0]);
        setCodigo('');
        setSugerenciasProd([]);
      } else {
        showToast('❌ Producto no encontrado en la base de datos');
      }
    }
  };

  const agregarAlCarrito = async (producto) => {
    if (producto.stock <= 0) {
      showToast(`⚠️ No se puede agregar "${producto.nombre}" porque el stock es 0.`);
      return;
    }

    let cantidadAAgregar = 1;
    let precioUnitario = producto.precio_venta;

    // Si el producto se vende por peso
    if (producto.por_peso && Number(producto.por_peso) !== 0) {
      const { value: pesoStr } = await window.Swal.fire({
        title: `Venta por Peso: ${producto.nombre}`,
        input: 'number',
        inputLabel: 'Ingrese el peso en Kg (Ej: 1.5)',
        inputPlaceholder: 'Ej: 1.5',
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        inputAttributes: { step: '0.01' },
        inputValidator: (value) => {
          if (!value || isNaN(value) || Number(value) <= 0) {
            return 'Por favor ingrese un peso válido';
          }
        }
      });

      if (!pesoStr) return; // Se canceló
      
      const pesoKg = Number(pesoStr);
      // Se utiliza precio_venta para el cobro final
      const precioPorBandeja = pesoKg * producto.precio_venta; 

      // Se agrega como un ítem único de 1 unidad (para descontar 1 del stock)
      setCart(prevCart => [
        ...prevCart, 
        { 
          ...producto, 
          id: producto.id + '_peso_' + Date.now(), // ID único para no agrupar bandejas de distinto peso
          original_id: producto.id, // Para descontar del producto real en la BD
          nombre: `${producto.nombre} (${pesoKg} Kg)`,
          cantidad: 1, // Descuenta 1 unidad de stock
          precio_venta: precioPorBandeja, // El precio unitario de esta bandeja específica
          subtotal: precioPorBandeja
        }
      ]);
      return; // Terminamos aquí para no ejecutar la lógica normal de agrupación
    }

    // Lógica normal para productos por unidad
    setCart(prevCart => {
      const exists = prevCart.find(item => item.id === producto.id);
      if (exists) {
        if (exists.cantidad + cantidadAAgregar > producto.stock) {
          showToast(`⚠️ Solo quedan ${producto.stock} unidades/Kg disponibles.`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidadAAgregar, subtotal: (item.cantidad + cantidadAAgregar) * precioUnitario }
            : item
        );
      }
      return [...prevCart, { ...producto, cantidad: cantidadAAgregar, precio_venta: precioUnitario, subtotal: cantidadAAgregar * precioUnitario }];
    });
  };

  const modificarCantidad = (id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
        const nuevaCant = Math.max(1, item.cantidad + delta);
        if (nuevaCant > item.stock) {
          showToast(`⚠️ Solo dispones de ${item.stock} unidades en el sistema.`);
          return item;
        }
        return { ...item, cantidad: nuevaCant, subtotal: nuevaCant * item.precio_venta };
      }
      return item;
    }));
  };

  const eliminarItem = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  // === COBRO DE DEUDA ANTERIOR ===
  const buscarClienteCart = () => {
    if (busquedaCartCliente.trim() === '') {
      showToast("⚠️ Ingresa una cédula para buscar al cliente.");
      return;
    }
    const cli = clientesMemo.find(c => c.cedula && c.cedula.toString().includes(busquedaCartCliente.trim()));
    if (cli) {
      setCartClienteSelected(cli);
      if (cli.deuda_total > 0) {
        showToast(`💰 El cliente ${cli.nombre} tiene una deuda pendiente de $${cli.deuda_total.toLocaleString()}`);
      } else {
        showToast(`✅ Cliente ${cli.nombre} seleccionado. No tiene deudas pendientes.`);
      }
    } else {
      showToast("❌ Cliente no encontrado.");
    }
  };

  const agregarDeudaAlCarrito = () => {
    if (!cartClienteSelected || cartClienteSelected.deuda_total <= 0) return;
    
    // Verificar si ya se agregó la deuda
    if (cart.find(item => item.id === 'DEUDA')) {
      showToast("⚠️ La deuda ya fue agregada al carrito.");
      return;
    }

    setCart(prevCart => [
      ...prevCart, 
      { 
        id: 'DEUDA', 
        nombre: 'Pago Deuda Pendiente', 
        precio_venta: cartClienteSelected.deuda_total, 
        cantidad: 1, 
        subtotal: cartClienteSelected.deuda_total, 
        isDeuda: true 
      }
    ]);
  };

  // === CALCULOS DE CHECKOUT ===
  const cambio = checkoutData.monto_entregado ? Math.max(0, Number(checkoutData.monto_entregado) - total) : 0;
  // Sugerencias cedula clientes
  const valorBusqueda = busquedaClienteRef.current?.value || "";
  const clientesSugeridos = checkoutData.tipo_venta === 'Crédito' && valorBusqueda.trim() !== ''
    ? clientesMemo.filter(c => c.cedula && c.cedula.toString().includes(valorBusqueda.trim()))
    : [];

  const iniciarCheckout = () => {
    if (cart.length === 0) return;
    setStep('CHECKOUT');
    setCheckoutData({ 
      ...checkoutData, 
      monto_entregado: total.toString(),
      cliente_selected: cartClienteSelected // Heredar el cliente del carrito si ya lo seleccionó
    });
  };

  const confirmarFactura = async (e) => {
    if (e) e.preventDefault();
    if (checkoutData.tipo_venta === 'Crédito' && !checkoutData.cliente_selected) {
      showToast("❌ Debes asignar un cliente si la venta es a Crédito (Fiar)");
      return;
    }

    setLoading(true);
    const invoiceData = {
      numero: `FAC-${Date.now()}`,
      cliente_id: checkoutData.cliente_selected?.id || null,
      cliente_nombre: checkoutData.cliente_selected?.nombre || 'Mostrador',
      usuario_id: user?.id,
      tipo_venta: checkoutData.tipo_venta.toLowerCase(), // 'contado' o 'credito'
      estado: checkoutData.tipo_venta === 'Crédito' ? 'Pendiente' : 'Pagada',
      metodo_pago: checkoutData.metodo_pago.toLowerCase(),
      subtotal: total,
      total: total,
      monto_entregado: checkoutData.metodo_pago === 'Efectivo' ? Number(checkoutData.monto_entregado) : total,
      cambio: checkoutData.metodo_pago === 'Efectivo' ? cambio : 0,
      items: cart.map(c => ({
        producto_id: c.isDeuda ? null : (c.original_id || c.id),
        descripcion: c.nombre,
        cantidad: c.cantidad,
        precio_unitario: c.precio_venta,
        subtotal: c.subtotal
      }))
    };

    const res = await fetchAPI('/facturas', 'POST', invoiceData);
    if (res.success) {
      
      // === PAGAR LA DEUDA SI HAY UN ITEM DE DEUDA EN EL CARRITO ===
      const itemDeuda = cart.find(c => c.isDeuda);
      if (itemDeuda && checkoutData.cliente_selected) {
        try {
          await fetchAPI('/abonos', 'POST', {
            factura_id: res.id,
            cliente_id: checkoutData.cliente_selected.id,
            monto: itemDeuda.subtotal,
            notas: 'Pago de deuda anterior liquidado en nueva compra POS'
          });
          // La BD recalculará automáticamente la deuda_total a 0 (o la reducirá) gracias al abonosController y los triggers
        } catch (err) {
          console.error("Error al registrar abono de deuda:", err);
        }
      }

      setCurrentInvoice({
        ...invoiceData,
        vendedor: user?.nombre || 'Administrador',
        fecha: new Date().toLocaleString()
      });
      setStep('RECEIPT');
      setCart([]);
      setCartClienteSelected(null);
      setBusquedaCartCliente('');
    } else {
      showToast('❌ Error en BD: ' + res.message);
    }
    setLoading(false);
  };

  return (
    <div className="pos-container">

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'slideDown 0.3s ease-out' }}>
          {toastMessage}
        </div>
      )}

      {/* ===== PASO 1: CARRITO Y ESCÁNER ===== */}
      {step === 'CART' && (
        <>
          <div className="pos-main no-print">
            <div className="scanner-section" style={{ position: 'relative' }}>
              <Barcode size={32} color="var(--primary-color)" />
              <input
                ref={scannerInputRef}
                type="text"
                className="scanner-input"
                placeholder="Escanea el código de barras o busca por nombre..."
                value={codigo}
                onChange={handleCodigoChange}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              {sugerenciasProd.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: '48px', right: 0,
                  background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
                  zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  {sugerenciasProd.map(prod => (
                    <div key={prod.id}
                         style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                         onClick={async () => {
                           await agregarAlCarrito(prod);
                           setCodigo('');
                           setSugerenciasProd([]);
                           scannerInputRef.current?.focus();
                         }}>
                      <div>
                        <strong style={{color: '#0f172a'}}>{prod.nombre}</strong> <span style={{fontSize: '0.85em', color: '#64748b'}}>({prod.codigo})</span>
                      </div>
                      <div style={{color: '#059669', fontWeight: 'bold'}}>${prod.precio_venta.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cart-section">
              <div className="table-responsive">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Cant.</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.nombre} <br /><small style={{ color: 'var(--text-muted)' }}>{item.codigo}</small></td>
                        <td>${item.precio_venta.toLocaleString()}</td>
                        <td>
                          <div className="qty-control">
                            <button className="qty-btn" onClick={() => modificarCantidad(item.id, -1)}><Minus size={14} /></button>
                            <span>{item.cantidad}</span>
                            <button className="qty-btn" onClick={() => modificarCantidad(item.id, 1)}><Plus size={14} /></button>
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>${item.subtotal.toLocaleString()}</td>
                        <td>
                          <button className="qty-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }} onClick={() => eliminarItem(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pos-sidebar no-print">
            
            {/* Buscador de Cliente y Deuda */}
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Asignar Cliente / Cobrar Deuda</label>
              <div style={{ display: 'flex', gap: '5px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Cédula del cliente..."
                  value={busquedaCartCliente}
                  onChange={e => setBusquedaCartCliente(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarClienteCart()}
                  style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                />
                <button className="primary-btn" onClick={buscarClienteCart} style={{ padding: '8px 12px', background: '#3b82f6' }}>
                  <Search size={16} />
                </button>
              </div>
              {cartClienteSelected && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.95rem' }}>
                    👤 {cartClienteSelected.nombre}
                  </div>
                  {cartClienteSelected.deuda_total > 0 && (
                     <button onClick={agregarDeudaAlCarrito} style={{ marginTop: '8px', width: '100%', padding: '8px', fontSize: '0.9rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                       + Cobrar Deuda (${cartClienteSelected.deuda_total.toLocaleString()})
                     </button>
                  )}
                  {cartClienteSelected.deuda_total <= 0 && (
                     <div style={{ marginTop: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                       (Sin deuda pendiente)
                     </div>
                  )}
                </div>
              )}
            </div>

            <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Resumen de Factura</h2>
            <div className="checkout-summary">
              <div className="summary-total">
                <span>TOTAL:</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
            <button className="pay-btn" disabled={cart.length === 0} onClick={iniciarCheckout}>
              PROCESAR PAGO
            </button>
          </div>
        </>
      )}

      {/* ===== PASO 2: MODAL CHECKOUT ===== */}
      {step === 'CHECKOUT' && (
        <div className="modal-overlay no-print">
          <div className="modal-content glass-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Confirmar Pago</h2>
              <button className="close-btn" onClick={() => setStep('CART')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}><XCircle size={28} /></button>
            </div>

            <form onSubmit={confirmarFactura} style={{ textAlign: 'left', marginTop: '1rem' }}>

              <div style={{ marginBottom: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>A COBRAR</span>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#059669' }}>${total.toLocaleString()}</div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Método de Pago:</label>
                <select className="form-control" value={checkoutData.metodo_pago} onChange={e => setCheckoutData({ ...checkoutData, metodo_pago: e.target.value })}>
                  <option>Efectivo</option>
                  <option>Tarjeta</option>
                  <option>QR / Banco</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Tipo de Venta:</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label><input type="radio" name="tipo" checked={checkoutData.tipo_venta === 'Contado'} onChange={() => setCheckoutData({ ...checkoutData, tipo_venta: 'Contado', cliente_selected: null })} /> Al Contado</label>
                  <label><input type="radio" name="tipo" checked={checkoutData.tipo_venta === 'Crédito'} onChange={() => setCheckoutData({ ...checkoutData, tipo_venta: 'Crédito' })} /> Dar a Crédito (Fiar)</label>
                </div>
              </div>

              {checkoutData.metodo_pago === 'Efectivo' && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Efectivo Recibido ($):</label>
                    <input type="number" className="form-control" required min={total}
                      value={checkoutData.monto_entregado}
                      onChange={e => setCheckoutData({ ...checkoutData, monto_entregado: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Cambio a Devolver:</label>
                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontWeight: 'bold', borderRadius: '8px', fontSize: '1.2rem' }}>
                      ${cambio.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {checkoutData.tipo_venta === 'Crédito' && (
                <div className="form-group" style={{ marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '8px' }}>
                  <label style={{ color: '#fca5a5' }}>Filtrar por Cédula del Cliente (Dar a Crédito):</label>
                  <input type="text" className="form-control" placeholder="Digita la cédula del cliente a buscar..." ref={busquedaClienteRef} onChange={() => setCheckoutData({ ...checkoutData, cliente_selected: null })} />

                  {clientesSugeridos.length > 0 && (
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px', marginTop: '5px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      {clientesSugeridos.map(cli => (
                        <div key={cli.id} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', color: '#0f172a', fontWeight: '500' }}
                          onClick={() => setCheckoutData({ ...checkoutData, cliente_selected: cli })}>
                          {cli.cedula} - {cli.nombre}
                        </div>
                      ))}
                    </div>
                  )}

                  {checkoutData.cliente_selected && (
                    <div style={{ marginTop: '10px', color: '#10b981', fontWeight: 'bold' }}>
                      ✅ Cliente Seleccionado: {checkoutData.cliente_selected.nombre}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', marginTop: '1rem', background: '#10b981' }}>
                Confirmar Factura
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== PASO 3: TICKET IMPRIMIR ===== */}
      {step === 'RECEIPT' && currentInvoice && (
        <div className="modal-overlay no-print">
          <div className="modal-content invoice-modal">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#10b981', marginBottom: '0' }}>¡Facturada con Éxito!</h2>
              {currentInvoice.tipo_venta === 'credito' && (
                <div style={{ color: '#fca5a5', marginTop: '5px' }}>Asignada a la deuda de {currentInvoice.cliente_nombre}</div>
              )}
            </div>

            <div className="invoice-actions no-print" style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => window.print()} className="primary-btn" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={18} /> Imprimir Ticket
              </button>
              <button onClick={() => { 
                setStep('CART'); 
                cargarDatos(); 
                setCartClienteSelected(null);
                setBusquedaCartCliente('');
                setCheckoutData({
                  metodo_pago: 'Efectivo',
                  tipo_venta: 'Contado',
                  cliente_selected: null,
                  monto_entregado: '',
                });
              }} className="btn-cancel" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowLeft size={18} /> Volver a Inicio
              </button>
            </div>
            
            <p className="no-print" style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              * Si tu impresora tiene configurado el cajón monedero, este se abrirá automáticamente al imprimir.
            </p>

            {/* Este es el Ticket Térmico Nativo */}
            <div id="print-area" className="print-area" style={{ background: '#fff', color: '#000', padding: '20px', borderRadius: '8px', width: '300px', margin: '0 auto', fontSize: '12px', fontFamily: 'monospace' }}>
              {/* Carácter de control oculto para forzar apertura de cajón en algunas impresoras ESC/POS genéricas */}
              <div style={{ fontFamily: 'control', color: 'transparent', fontSize: '1px', lineHeight: '1px' }}>A</div>

              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>TICKET DE VENTA</h3>
                <p style={{ margin: 0 }}>Nº {currentInvoice.numero}</p>
                <p style={{ margin: 0 }}>------------------------</p>
                <p style={{ margin: 0 }}>Fecha: {currentInvoice.fecha}</p>
                <p style={{ margin: 0 }}>Cajero: {currentInvoice.vendedor}</p>
                {currentInvoice.cliente_id && (
                  <p style={{ margin: 0 }}>Cliente: {currentInvoice.cliente_nombre}</p>
                )}
                <p style={{ margin: 0 }}>Tipo: {currentInvoice.tipo_venta.toUpperCase()}</p>
              </div>
              <p style={{ margin: '10px 0', borderBottom: '1px dashed #000' }}></p>

              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '5px' }}>Cant</th>
                    <th style={{ paddingBottom: '5px' }}>Desc</th>
                    <th style={{ paddingBottom: '5px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingTop: '5px' }}>{it.cantidad}</td>
                      <td style={{ paddingTop: '5px' }}>{it.descripcion}</td>
                      <td style={{ paddingTop: '5px', textAlign: 'right' }}>${it.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ margin: '10px 0', borderBottom: '1px dashed #000' }}></p>
              <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                TOTAL: ${currentInvoice.total.toLocaleString()}
              </div>

              {currentInvoice.metodo_pago === 'efectivo' && currentInvoice.tipo_venta !== 'credito' && (
                <>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    Recibido: ${currentInvoice.monto_entregado.toLocaleString()}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    Cambio: ${currentInvoice.cambio.toLocaleString()}
                  </div>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ margin: 0 }}>¡Gracias por su visita!</p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
