import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import AcenteDashboard from './dashboards/AcenteDashboard';
import KullaniciDashboard from './dashboards/KullaniciDashboard';

interface DashboardProps {
  user: any;
  token: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ user, token }) => {
  const { logout } = useAuth();

  // Rol kontrolü
  const isAdmin = user?.roles?.includes('ADMIN');
  const isAcente = user?.roles?.includes('ACENTE');
  const isKullanici = user?.roles?.includes('KULLANICI');

  // Admin Dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Acente Dashboard
  if (isAcente) {
    return <AcenteDashboard />;
  }

  // Kullanıcı Dashboard
  if (isKullanici) {
    return <KullaniciDashboard />;
  }

  // Varsayılan dashboard (rol belirlenemezse)
  return (
    <div className="dashboard default-dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <h1>🏠 Sigorta Yönetim Sistemi</h1>
          <div className="user-info">
            <span>Kullanıcı: <strong>{user?.ad} {user?.soyad}</strong></span>
            <button onClick={logout} className="logout-btn">Çıkış Yap</button>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="content-section">
          <h2>Hoş Geldiniz!</h2>
          <p>Rol bilginiz belirlenemedi. Lütfen sistem yöneticisi ile iletişime geçin.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 
