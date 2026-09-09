import { useState } from 'react';
import type { AppUser } from './api';
import AdminApp from './admin/AdminApp';
import LoginScreen from './screens/LoginScreen';
import TradingApp from './trader/TradingApp';

type Screen = 'login' | 'trader' | 'admin';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<AppUser | null>(null);

  const logout = () => { setUser(null); setScreen('login'); };

  if (screen === 'trader' && user) {
    return <TradingApp key={user.id} user={user} onUserUpdated={setUser} onLogout={logout} />;
  }
  if (screen === 'admin') return <AdminApp onLogout={logout} />;
  return <LoginScreen onTrader={(u) => { setUser(u); setScreen('trader'); }} onAdmin={() => setScreen('admin')} />;
}
