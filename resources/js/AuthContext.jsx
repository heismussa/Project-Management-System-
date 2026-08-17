  import React, { createContext, useContext, useState } from 'react'; 
 
const AuthContext = createContext(); 
 
export const AuthProvider = ({ children }) => {   const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user_data')) || null);   const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null); 
 
  const login = (userData, authToken) => {     setUser(userData);     setToken(authToken);     localStorage.setItem('user_data', JSON.stringify(userData));     localStorage.setItem('auth_token', authToken); 
  }; 
 
  const logout = () => {     setUser(null);     setToken(null);     localStorage.clear(); 
  }; 
 
  return ( 
    <AuthContext.Provider value={{ user, token, login, logout }}> 
      {children} 
    </AuthContext.Provider> 
  ); 
}; 
 
export const useAuth = () => useContext(AuthContext); 
