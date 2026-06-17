import React, { useState, useMemo, useEffect } from 'react';

export default function SportexApp() {
  const [activeTab, setActiveTab] = useState('market'); // market | profile | portfolio | transactions
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('הכל');
  
  // Wallet state
  const [balance, setBalance] = useState(0);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tradeMessage, setTradeMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  // Helper fetching functions
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      if (data.length > 0) {
        const hasUser1 = data.find((u: any) => u.id === 1);
        setCurrentUserId(hasUser1 ? 1 : data[0].id);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/players');
      const data = await res.json();
      setPlayers(data);
      if (data.length > 0) {
        setSelectedPlayerId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const fetchUserData = async (userId: number) => {
    try {
      const [userRes, portfolioRes, txRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/portfolio`),
        fetch(`/api/users/${userId}/transactions`)
      ]);
      const userData = await userRes.json();
      const portfolioData = await portfolioRes.json();
      const txData = await txRes.json();

      setBalance(userData.balance);
      setPortfolio(portfolioData);
      setTransactions(txData);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchPlayers()]);
      setLoading(false);
    };
    initLoad();
  }, []);

  // Fetch user specific data when selected user changes
  useEffect(() => {
    if (currentUserId) {
      fetchUserData(currentUserId);
    }
  }, [currentUserId]);

  // Get selected player object
  const selectedPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || players[0] || {
      id: 0, name: '', team: '', position: '', price: 0, change: 0, stats: { goals: 0, assists: 0, matches: 0, rating: 0 }, history: [], img: '⚽'
    };
  }, [players, selectedPlayerId]);

  // Calculate dynamic Portfolio stats
  const portfolioDetails = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    
    const items = portfolio.map(item => {
      const player = players.find(p => p.id === item.playerId);
      const currentVal = player ? player.price : 0;
      totalValue += currentVal * item.quantity;
      totalCost += item.boughtPrice * item.quantity;
      
      const profitLoss = (currentVal - item.boughtPrice) * item.quantity;
      const profitLossPercent = item.boughtPrice > 0 ? ((currentVal - item.boughtPrice) / item.boughtPrice) * 100 : 0;
      
      return {
        ...player,
        boughtPrice: item.boughtPrice,
        quantity: item.quantity,
        currentValue: currentVal,
        totalCurrentVal: currentVal * item.quantity,
        profitLoss,
        profitLossPercent,
        lineupStatus: item.lineupStatus
      };
    });

    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return { items, totalValue, totalProfitLoss, totalProfitLossPercent };
  }, [portfolio, players]);

  // Filtered players list for the Dashboard
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.includes(searchQuery) || player.team.includes(searchQuery);
      const matchesPosition = positionFilter === 'הכל' || player.position === positionFilter;
      return matchesSearch && matchesPosition;
    });
  }, [players, searchQuery, positionFilter]);

  // Handle buy event
  const handleBuy = async (player: any) => {
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          playerId: player.id,
          actionType: 'BUY'
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showTradeMsg(data.error || 'שגיאה בביצוע הרכישה', 'error');
      } else {
        showTradeMsg(`רכישת ${player.name} הושלמה בהצלחה!`, 'success');
        await Promise.all([fetchUserData(currentUserId), fetchPlayers()]);
      }
    } catch (err) {
      showTradeMsg('שגיאה בתקשורת עם השרת', 'error');
    }
  };

  // Handle sell event
  const handleSell = async (player: any) => {
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          playerId: player.id,
          actionType: 'SELL'
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showTradeMsg(data.error || 'שגיאה בביצוע המכירה', 'error');
      } else {
        showTradeMsg(`מכירת ${player.name} הושלמה בהצלחה!`, 'success');
        await Promise.all([fetchUserData(currentUserId), fetchPlayers()]);
      }
    } catch (err) {
      showTradeMsg('שגיאה בתקשורת עם השרת', 'error');
    }
  };

  // Toggle lineup status between Starter and Bench
  const handleToggleLineup = async (player: any, currentStatus: string) => {
    const nextStatus = currentStatus === 'Starter' ? 'Bench' : 'Starter';
    try {
      const res = await fetch('/api/portfolio/lineup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          playerId: player.id,
          lineupStatus: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showTradeMsg(data.error || 'שגיאה בעדכון ההרכב', 'error');
      } else {
        showTradeMsg(`השחקן ${player.name} הועבר ל${nextStatus === 'Starter' ? 'הרכב הפותח' : 'ספסל החילופים'}!`, 'success');
        await fetchUserData(currentUserId);
      }
    } catch (err) {
      showTradeMsg('שגיאה בתקשורת עם השרת', 'error');
    }
  };

  const showTradeMsg = (text: string, type: string) => {
    setTradeMessage({ text, type });
    setTimeout(() => setTradeMessage({ text: '', type: '' }), 4000);
  };

  // Helper formatting values to NIS (₪)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  // Helper for rendering line graph dynamically using SVG coordinates based on selected player history
  const renderSVGChart = (history: number[]) => {
    if (!history || history.length === 0) return null;
    const width = 500;
    const height = 180;
    const padding = 20;

    const min = Math.min(...history) * 0.99;
    const max = Math.max(...history) * 1.01;
    const range = max - min || 1;

    const points = history.map((val, index) => {
      const x = padding + (index / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#334155" strokeDasharray="3" />
        <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#1e293b" />
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#334155" />
        
        {/* Dynamic path gradient */}
        <polygon points={fillPoints} fill="url(#chartGrad)" />
        
        {/* Main Line */}
        <polyline fill="none" stroke="#10B981" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Dots on nodes */}
        {history.map((val, index) => {
          const x = padding + (index / (history.length - 1)) * (width - padding * 2);
          const y = height - padding - ((val - min) / range) * (height - padding * 2);
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="4" fill="#10B981" className="hover:r-6 cursor-pointer" />
              <text x={x} y={y - 8} fill="#94A3B8" fontSize="9" textAnchor="middle">
                {formatCurrency(val).replace('₪', '')}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans antialiased">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          <h2 className="text-xl font-bold">טוען נתונים מהשרת...</h2>
          <p className="text-sm text-slate-400">מתחבר לבסיס הנתונים ומסנכרן את בורסת השחקנים</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white pb-12">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-xl shadow-lg shadow-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-7 h-7 text-slate-950">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-l from-emerald-400 to-teal-200 bg-clip-text text-transparent">ספורטקס</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">בורסת שחקני הכדורגל הראשונה בישראל</p>
            </div>
          </div>

          {/* Active User Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl">
            <span className="text-[11px] text-slate-400 font-bold block">משתמש פעיל:</span>
            <select 
              value={currentUserId}
              onChange={(e) => setCurrentUserId(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-xs sm:text-sm px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-bold"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} (מזהה: {u.id})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex gap-4 sm:gap-6 bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-2xl text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">יתרה פנויה בקופה:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(balance)}</span>
            </div>
            <div className="border-r border-slate-800 pr-4 sm:pr-6">
              <span className="text-slate-400 block text-[11px] mb-0.5">שווי סגל נוכחי:</span>
              <span className="font-bold text-teal-300">{formatCurrency(portfolioDetails.totalValue)}</span>
            </div>
            <div className="border-r border-slate-800 pr-4 sm:pr-6">
              <span className="text-slate-400 block text-[11px] mb-0.5">סך הכל הון עצמי:</span>
              <span className="font-bold text-slate-100">{formatCurrency(balance + portfolioDetails.totalValue)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('market')} 
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'market' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            📊 שוק השחקנים
          </button>
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            👤 פרופיל שחקן ({selectedPlayer.name})
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')} 
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'portfolio' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            💼 הסגל שלי ({portfolioDetails.items.length})
          </button>
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'transactions' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            📜 היסטוריית פעולות
          </button>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* SCREEN 1: MARKET DASHBOARD */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="חיפוש לפי שם שחקן או קבוצה..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl py-3 px-11 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors duration-200"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  🔍
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {['הכל', 'חלוץ', 'קשר', 'מגן', 'שוער'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${positionFilter === pos ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* PLAYERS LIST TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold">מחירון שחקנים נוכחי</h2>
                <span className="text-xs text-slate-400">נמצאו {filteredPlayers.length} שחקנים</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 text-xs border-b border-slate-800">
                      <th className="py-4 px-6">שחקן</th>
                      <th className="py-4 px-6">קבוצה</th>
                      <th className="py-4 px-6">תפקיד</th>
                      <th className="py-4 px-6">מחיר שוק</th>
                      <th className="py-4 px-6">שינוי 24ש׳</th>
                      <th className="py-4 px-6 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map((player) => (
                        <tr key={player.id} className="hover:bg-slate-800/40 transition-colors duration-150 group">
                          <td className="py-4 px-6 font-semibold flex items-center gap-3">
                            <span className="text-2xl bg-slate-950 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-800">{player.img}</span>
                            <div>
                              <div className="text-slate-100 group-hover:text-emerald-400 transition-colors">{player.name}</div>
                              <div className="text-[11px] text-slate-400">שווי יחידה</div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-300">{player.team}</td>
                          <td className="py-4 px-6 text-sm">
                            <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-300 text-xs">
                              {player.position}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-200">{formatCurrency(player.price)}</td>
                          <td className="py-4 px-6 text-sm">
                            <span className={`flex items-center gap-1 font-bold ${player.change >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {player.change >= 0 ? '▲' : '▼'} {Math.abs(player.change)}%
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button 
                              onClick={() => {
                                setSelectedPlayerId(player.id);
                                setActiveTab('profile');
                              }}
                              className="px-4 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all duration-200"
                            >
                              ניתוח ומסחר
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          לא נמצאו שחקנים התואמים את החיפוש.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: PLAYER PROFILE */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PLAYER CARD & STATS */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center relative overflow-hidden">
                <div className="absolute top-4 left-4 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-emerald-400">
                  {selectedPlayer.position}
                </div>
                <div className="w-24 h-24 bg-slate-950 rounded-full border-2 border-emerald-500 flex items-center justify-center text-5xl mx-auto mt-4 mb-4 shadow-lg shadow-emerald-500/10">
                  {selectedPlayer.img}
                </div>
                <h2 className="text-2xl font-black text-slate-100">{selectedPlayer.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedPlayer.team}</p>
                
                <div className="mt-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block text-right">מחיר נוכחי</span>
                    <span className="text-xl font-black text-emerald-400">{formatCurrency(selectedPlayer.price)}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] text-slate-400 block text-left">שינוי 24ש'</span>
                    <span className={`text-lg font-extrabold flex items-center gap-1 ${selectedPlayer.change >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {selectedPlayer.change >= 0 ? '▲' : '▼'} {Math.abs(selectedPlayer.change)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* STATS DETAIL */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">נתוני שוק אמיתיים (מסד נתונים)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">מחיר שפל</span>
                    <span className="text-lg font-black text-rose-500">{formatCurrency(selectedPlayer.stats.min_price)}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">מחיר שיא</span>
                    <span className="text-lg font-black text-emerald-400">{formatCurrency(selectedPlayer.stats.max_price)}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">בעלים בליגה</span>
                    <span className="text-2xl font-black text-slate-200">{selectedPlayer.stats.squad_owners}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">עסקאות שוק</span>
                    <span className="text-2xl font-black text-slate-200">{selectedPlayer.stats.total_trades}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CHART & TRADING MODULE */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* PRICE HISTORY CHART */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold">גרף היסטוריית שווי</h3>
                    <p className="text-xs text-slate-400">תנודות בורסה על פני המחזורים האחרונים</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-full font-semibold">שידור חי</span>
                </div>
                
                {/* Responsive Chart */}
                {renderSVGChart(selectedPlayer.history)}

                <div className="flex justify-between text-xs text-slate-500 mt-2 px-4">
                  <span>מחזור אחרון שתועד</span>
                  <span>מחזור ראשון שתועד</span>
                </div>
              </div>

              {/* TRADING ACTIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">ביצוע עסקה בשוק</h3>
                
                {/* Trade Messages */}
                {tradeMessage.text && (
                  <div className={`p-4 rounded-xl mb-4 text-sm font-bold text-center ${tradeMessage.type === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'}`}>
                    {tradeMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Quantity and Estimate */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">מחיר השחקן לרכישה/מכירה:</span>
                        <span className="font-semibold text-slate-200">{formatCurrency(selectedPlayer.price)}</span>
                      </div>
                      <div className="text-xs text-slate-400 border-t border-slate-800 pt-2">
                        * ניתן לרכוש כל שחקן פעם אחת בלבד לסגל האישי שלך (בהתאם לחוקי הליגה).
                      </div>
                    </div>
                  </div>

                  {/* Buy/Sell Buttons */}
                  <div className="flex flex-col justify-between gap-3">
                    <div className="text-xs text-slate-400 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      🛡️ <span className="font-bold">סטטוס בעלות:</span> {
                        portfolio.find(item => item.playerId === selectedPlayer.id) 
                          ? (portfolio.find(item => item.playerId === selectedPlayer.id)?.lineupStatus === 'Starter' ? 'בסגל שלך (הרכב פותח)' : 'בסגל שלך (ספסל)') 
                          : 'לא בסגל שלך'
                      }
                    </div>
                    
                    <button 
                      onClick={() => handleBuy(selectedPlayer)}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-base transition-all duration-200 shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5"
                    >
                      קנייה מיידית לסגל
                    </button>
                    
                    <button 
                      onClick={() => handleSell(selectedPlayer)}
                      className="w-full py-4 bg-transparent hover:bg-rose-500/10 border border-rose-500/50 hover:border-rose-500 text-rose-500 font-bold rounded-xl text-base transition-all duration-200"
                    >
                      מכירת החזקות פנויות
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: MY PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            
            {/* PORTFOLIO METRICS HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">יתרה פנויה בקופה</span>
                <span className="text-2xl font-black text-emerald-400">{formatCurrency(balance)}</span>
                <div className="absolute top-2 left-3 text-2xl opacity-10">🏦</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">שווי סגל כולל</span>
                <span className="text-2xl font-black text-teal-300">{formatCurrency(portfolioDetails.totalValue)}</span>
                <div className="absolute top-2 left-3 text-2xl opacity-10">🏃‍♂️</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">רווח / הפסד כולל</span>
                <span className={`text-2xl font-black ${portfolioDetails.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {portfolioDetails.totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioDetails.totalProfitLoss)}
                </span>
                <div className="absolute top-2 left-3 text-2xl opacity-10">📈</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">תשואת סגל כוללת</span>
                <span className={`text-2xl font-black ${portfolioDetails.totalProfitLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {portfolioDetails.totalProfitLossPercent >= 0 ? '+' : ''}{portfolioDetails.totalProfitLossPercent.toFixed(2)}%
                </span>
                <div className="absolute top-2 left-3 text-2xl opacity-10">📊</div>
              </div>
            </div>

            {/* OWNED PLAYERS SQUAD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold">סגל השחקנים שלי ({portfolioDetails.items.length} שחקנים בסגל)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 text-xs border-b border-slate-800">
                      <th className="py-4 px-6">שחקן</th>
                      <th className="py-4 px-6">סטטוס סגל</th>
                      <th className="py-4 px-6">מחיר קנייה</th>
                      <th className="py-4 px-6">שווי שוק נוכחי</th>
                      <th className="py-4 px-6">רווח / הפסד פוזיציה</th>
                      <th className="py-4 px-6 text-center">פעולות הרכב</th>
                      <th className="py-4 px-6 text-center">ניתוח</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {portfolioDetails.items.length > 0 ? (
                      portfolioDetails.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors duration-150">
                          <td className="py-4 px-6 font-semibold flex items-center gap-3">
                            <span className="text-2xl bg-slate-950 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-800">{item.img}</span>
                            <div>
                              <div className="text-slate-100">{item.name}</div>
                              <div className="text-[11px] text-slate-400">{item.team}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.lineupStatus === 'Starter' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}>
                              {item.lineupStatus === 'Starter' ? 'הרכב פותח' : 'ספסל'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-300">{formatCurrency(item.boughtPrice)}</td>
                          <td className="py-4 px-6 font-semibold text-slate-100">{formatCurrency(item.currentValue)}</td>
                          <td className="py-4 px-6">
                            <div className={`font-bold ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                            </div>
                            <div className={`text-[11px] ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              ({item.profitLossPercent >= 0 ? '+' : ''}{item.profitLossPercent.toFixed(1)}%)
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleToggleLineup(item, item.lineupStatus)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${item.lineupStatus === 'Starter' ? 'bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 border border-transparent text-slate-300' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
                            >
                              {item.lineupStatus === 'Starter' ? 'הורד לספסל' : 'העלה להרכב'}
                            </button>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button 
                              onClick={() => {
                                setSelectedPlayerId(item.id);
                                setActiveTab('profile');
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all"
                            >
                              גרף ומסחר
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-500">
                          הסגל שלך ריק כרגע. גש לשוק השחקנים כדי לרכוש את הכוכבים שלך!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: TRANSACTION LOG */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6">
              <div className="border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-lg font-bold">היסטוריית עסקאות ופעולות בבורסה</h2>
                <p className="text-xs text-slate-400">רישום מלא ומאובטח של כל רכישות ומכירות השחקנים שבוצעו בחשבונך</p>
              </div>

              <div className="relative border-r border-slate-800 mr-4 space-y-8 py-2">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="relative pr-8">
                      {/* Timeline Icon */}
                      <div className={`absolute -right-3.5 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 ${tx.type === 'buy' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-rose-950 border-rose-500 text-rose-500'}`}>
                        {tx.type === 'buy' ? '📥' : '📤'}
                      </div>
                      
                      {/* Timeline Content Card */}
                      <div className="bg-slate-950/80 border border-slate-800 hover:border-slate-800 rounded-2xl p-4 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                              {tx.type === 'buy' ? 'רכישה' : 'מכירה'}
                            </span>
                            <h4 className="text-base font-bold text-slate-100 mt-2 inline-block mr-2">{tx.playerName}</h4>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{tx.timestamp}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-900/40 p-3 rounded-xl text-xs sm:text-sm">
                          <div>
                            <span className="text-slate-500 block text-[10px]">כמות מבוצעת</span>
                            <span className="font-bold text-slate-300">{tx.quantity} יח׳</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">מחיר ליחידה</span>
                            <span className="font-bold text-slate-300">{formatCurrency(tx.price)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">סכום כולל</span>
                            <span className="font-bold text-slate-100">{formatCurrency(tx.price * tx.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    עדיין לא בוצעו עסקאות בחשבון זה.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}