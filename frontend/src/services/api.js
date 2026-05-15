const API_URL = `${window.location.protocol}//${window.location.hostname}:4000/api`;
export const fetchAPI = async (endpoint, optionsOrMethod = {}, bodyContent = null) => {
  const token = localStorage.getItem('token');
  
  let options = {};
  if (typeof optionsOrMethod === 'string') {
    options = { 
      method: optionsOrMethod, 
      ...(bodyContent && { body: JSON.stringify(bodyContent) })
    };
  } else {
    options = optionsOrMethod;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await response.json();
    return { status: response.status, ...data };
  } catch (error) {
    console.error(`Error connecting to ${endpoint}:`, error);
    return { success: false, message: 'Error de red o CORS' };
  }
};
