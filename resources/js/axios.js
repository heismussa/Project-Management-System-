import axios from 'axios'; 
 
const api = axios.create({   baseURL: 'http://localhost:8000/api', // Adjust to your API URL   headers: { 
    'Content-Type': 'application/json', 
    'Accept': 'application/json', 
  }, 
}); 
 
// Interceptor to auto-attach Bearer Token api.interceptors.request.use((config) => {   const token = localStorage.getItem('auth_token');   if (token) {     config.headers.Authorization = `Bearer ${token}`; 
  } 
  return config; 
}, (error) => Promise.reject(error)); 
 
export default api; 
