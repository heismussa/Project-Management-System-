import React, { useContext, useState } from 'react';
import { AuthProvider, AuthContext } from './AuthContext';
import Login from './components/Login';
import NavigationShell from './components/NavigationShell';
import ProjectRegistrationModal from './components/ProjectRegistrationModal';

function MainContent() {
  const { user } = useContext(AuthContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex' }}>
      <NavigationShell onOpenModal={() => setIsModalOpen(true)} />
      <main style={{ padding: '20px', flexGrow: 1 }}>
        <h1>Welcome, {user.userName}!</h1>
        <p>Main content area for current view.</p>
      </main>
      <ProjectRegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}