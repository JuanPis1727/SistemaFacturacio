// Usar la URL del backend (mismo servidor)
const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:4000'  // Desarrollo local
  : `${window.location.protocol}//${window.location.hostname}:4000`; // Producción

export const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    console.log(`Llamando a: ${API_BASE_URL}${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    console.log('Respuesta:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Error de conexión: ' + error.message };
  }
};
