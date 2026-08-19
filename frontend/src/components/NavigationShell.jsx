import React, { useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function NavigationShell({ onOpenModal }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <aside style={{ width: '220px', background: '#2c3e50', color: '#fff', padding: '20px', minHeight: '100vh' }}>
      <h3>Sidebar</h3>
      <p>User: <strong>{user?.userName}</strong></p>
      <p>Role: <i>{user?.role}</i></p>
      <hr />
      
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        <li style={{ padding: '8px 0' }}><a href="#dashboard" style={{ color: '#fff' }}>Dashboard</a></li>
        <li style={{ padding: '8px 0' }}><a href="#projects" style={{ color: '#fff' }}>Projects</a></li>
        <li style={{ padding: '8px 0' }}><a href="#reviews" style={{ color: '#fff' }}>Reviews</a></li>
        <li style={{ padding: '8px 0' }}><a href="#settings" style={{ color: '#fff' }}>Settings</a></li>
      </ul>

      <hr />

      {/* Dynamic button visibility based on role */}
      {user?.role === 'Project Reviewer' && (
        <button 
          onClick={onOpenModal} 
          style={{ width: '100%', padding: '8px', background: '#27ae60', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '10px' }}
        >
          + Register New Project
        </button>
      )}

      {user?.role === 'Project Planner' && (
        <button 
          style={{ width: '100%', padding: '8px', background: '#2980b9', color: 'white', border: 'none', cursor: 'pointer', marginBottom: '10px' }}
        >
          View Assigned Tasks
        </button>
      )}

      <button onClick={logout} style={{ width: '100%', padding: '8px', background: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer' }}>
        Logout
      </button>
    </aside>
  );
}