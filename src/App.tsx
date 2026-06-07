import React, { useState, useMemo } from 'react';

// --- INITIAL DUMMY DATA ---
const INITIAL_PLAYERS = [
  { id: 1, name: 'אוסקר גלוך', team: 'רד בול זלצבורג', position: 'קשר', price: 850000, change: 5.4, stats: { goals: 8, assists: 12, matches: 28, rating: 8.1 }, history: [810000, 815000, 830000, 825000, 840000, 835000, 850000], img: '⚽' },
  { id: 2, name: 'מנור סולומון', team: 'לידס יונייטד', position: 'קשר', price: 720000, change: -1.2, stats: { goals: 4, assists: 5, matches: 15, rating: 7.2 }, history: [740000, 735000, 730000, 725000, 728000, 722000, 720000], img: '🏃‍♂️' },
  { id: 3, name: 'ערן זהבי', team: 'מכבי תל אביב', position: 'חלוץ', price: 450000, change: 2.1, stats: { goals: 19, assists: 3, matches: 30, rating: 7.8 }, history: [435000, 440000, 438000, 442000, 445000, 448000, 450000], img: '🔥' },
  { id: 4, name: 'ענאן חלאילי', team: 'סן ז׳ילואז', position: 'חלוץ', price: 580000, change: 4.2, stats: { goals: 11, assists: 6, matches: 26, rating: 7.9 }, history: [540000, 550000, 555000, 562000, 570000, 575000, 580000], img: '⚡' },
  { id: 5, name: 'דניאל פרץ', team: 'באיירן מינכן', position: 'שוער', price: 390000, change: -0.5, stats: { goals: 0, assists: 0, matches: 8, rating: 7.1 }, history: [395000, 394000, 392000, 393000, 391000, 390000, 390000], img: '🧤' },
  { id: 6, name: 'ליאל עבדה', team: 'שארלוט', position: 'חלוץ', price: 520000, change: 1.8, stats: { goals: 7, assists: 4, matches: 20, rating: 7.4 }, history: [510000, 505000, 508000, 512000, 515000, 518000, 520000], img: '🎯' },
  { id: 7, name: 'מוחמד אבו פאני', team: 'פרנצווארוש', position: 'קשר', price: 350000, change: 0.9, stats: { goals: 5, assists: 9, matches: 29, rating: 7.6 }, history: [342000, 345000, 344000, 346000, 348000, 347000, 350000], img: '💪' },
  { id: 8, name: 'שגיב יחזקאל', team: 'מכבי תל אביב', position: 'מגן', price: 310000, change: 3.0, stats: { goals: 3, assists: 5, matches: 22, rating: 7.3 }, history: [298000, 301000, 302000, 305000, 307000, 309000, 310000], img: '🛡️' },
  { id: 9, name: 'עומרי גלזר', team: 'הכוכב האדום', position: 'שוער', price: 340000, change: 2.5, stats: { goals: 0, assists: 1, matches: 32, rating: 7.7 }, history: [328000, 331000, 330000, 333000, 335000, 338000, 340000], img: '🧤' },
  { id: 10, name: 'דור פרץ', team: 'מכבי תל אביב', position: 'קשר', price: 290000, change: -1.5, stats: { goals: 6, assists: 4, matches: 27, rating: 7.2 }, history: [298000, 296000, 295000, 294000, 291000, 292000, 290000], img: '🧠' },
  { id: 11, name: 'גדי קינדה', team: 'מכבי חיפה', position: 'קשר', price: 270000, change: 0.2, stats: { goals: 4, assists: 3, matches: 18, rating: 7.0 }, history: [268000, 269000, 268000, 271000, 270000, 269000, 270000], img: '🎩' },
  { id: 12, name: 'רועי גורדנה', team: 'הפועל באר שבע', position: 'קשר', price: 180000, change: -0.8, stats: { goals: 2, assists: 2, matches: 24, rating: 6.9 }, history: [183000, 182000, 181000, 182000, 180000, 181000, 180000], img: '⚓' },
  { id: 13, name: 'סתיו למקין', team: 'מכבי תל אביב', position: 'מגן', price: 210000, change: -1.1, stats: { goals: 1, assists: 0, matches: 12, rating: 6.8 }, history: [214000, 213000, 212000, 211000, 210000, 212000, 210000], img: '🛡️' },
  { id: 14, name: 'אילי מדמון', team: 'הפועל ירושלים', position: 'קשר', price: 140000, change: 0.0, stats: { goals: 1, assists: 2, matches: 19, rating: 6.7 }, history: [140000, 140000, 139000, 140000, 141000, 140000, 140000], img: '✨' },
  { id: 15, name: 'רוי רביבו', team: 'מכבי תל אביב', position: 'מגן', price: 250000, change: 1.2, stats: { goals: 2, assists: 4, matches: 25, rating: 7.1 }, history: [245000, 246000, 248000, 247000, 249000, 248000, 250000], img: '🏃‍♂️' }
];

const INITIAL_PORTFOLIO = [
  { playerId: 1, boughtPrice: 820000, quantity: 1 },
  { playerId: 3, boughtPrice: 430000, quantity: 2 },
  { playerId: 5, boughtPrice: 395000, quantity: 1 },
  { playerId: 7, boughtPrice: 340000, quantity: 2 },
  { playerId: 8, boughtPrice: 300000, quantity: 3 },
  { playerId: 11, boughtPrice: 265000, quantity: 2 },
  { playerId: 12, boughtPrice: 185000, quantity: 1 },
  { playerId: 15, boughtPrice: 240000, quantity: 3 }
]; // Totaling 15 units of different players representing the user's base squad.

const INITIAL_TRANSACTIONS = [
  { id: 1, type: 'buy', playerName: 'אוסקר גלוך', quantity: 1, price: 820000, timestamp: '03/06/2026, 10:15' },
  { id: 2, type: 'buy', playerName: 'ערן זהבי', quantity: 2, price: 430000, timestamp: '02/06/2026, 14:30' },
  { id: 3, type: 'sell', playerName: 'מנור סולומון', quantity: 1, price: 735000, timestamp: '01/06/2026, 09:12' }
];

export default function SportexApp() {
  const [activeTab, setActiveTab] = useState('market'); // market | profile | portfolio | transactions
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [selectedPlayerId, setSelectedPlayerId] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('הכל');
  
  // Wallet state
  const [balance, setBalance] = useState(4850000); // 4.85 Million NIS
  const [portfolio, setPortfolio] = useState(INITIAL_PORTFOLIO);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [tradeMessage, setTradeMessage] = useState({ text: '', type: '' });

  // Get selected player object
  const selectedPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || players[0];
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
        profitLossPercent
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
  const handleBuy = (player, qty) => {
    const cost = player.price * qty;
    if (balance < cost) {
      showTradeMsg('אין מספיק יתרה פנויה בקופה לביצוע הרכישה!', 'error');
      return;
    }

    setBalance(prev => prev - cost);
    
    // Update portfolio
    setPortfolio(prev => {
      const existing = prev.find(item => item.playerId === player.id);
      if (existing) {
        // Average cost basis recalculation
        const totalCost = (existing.boughtPrice * existing.quantity) + cost;
        const newQty = existing.quantity + qty;
        return prev.map(item => 
          item.playerId === player.id 
            ? { ...item, quantity: newQty, boughtPrice: Math.round(totalCost / newQty) }
            : item
        );
      } else {
        return [...prev, { playerId: player.id, boughtPrice: player.price, quantity: qty }];
      }
    });

    // Add transaction log
    const newTx = {
      id: Date.now(),
      type: 'buy',
      playerName: player.name,
      quantity: qty,
      price: player.price,
      timestamp: new Date().toLocaleString('he-IL', { hour12: false })
    };
    setTransactions(prev => [newTx, ...prev]);
    showTradeMsg(`רכישת ${qty} יחידות של ${player.name} הושלמה בהצלחה!`, 'success');
  };

  // Handle sell event
  const handleSell = (player, qty) => {
    const existing = portfolio.find(item => item.playerId === player.id);
    if (!existing || existing.quantity < qty) {
      showTradeMsg('אין ברשותך מספיק יחידות של שחקן זה למכירה!', 'error');
      return;
    }

    const earnings = player.price * qty;
    setBalance(prev => prev + earnings);

    // Update portfolio
    setPortfolio(prev => {
      return prev.map(item => {
        if (item.playerId === player.id) {
          return { ...item, quantity: item.quantity - qty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });

    // Add transaction log
    const newTx = {
      id: Date.now(),
      type: 'sell',
      playerName: player.name,
      quantity: qty,
      price: player.price,
      timestamp: new Date().toLocaleString('he-IL', { hour12: false })
    };
    setTransactions(prev => [newTx, ...prev]);
    showTradeMsg(`מכירת ${qty} יחידות של ${player.name} הושלמה בהצלחה!`, 'success');
  };

  const showTradeMsg = (text, type) => {
    setTradeMessage({ text, type });
    setTimeout(() => setTradeMessage({ text: '', type: '' }), 4000);
  };

  // Helper formatting values to NIS (₪)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  // Helper for rendering line graph dynamically using SVG coordinates based on selected player history
  const renderSVGChart = (history) => {
    if (!history || history.length === 0) return null;
    const width = 500;
    const height = 180;
    const padding = 20;

    const min = Math.min(...history) * 0.99;
    const max = Math.max(...history) * 1.01;
    const range = max - min;

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
            💼 התיק שלי ({portfolioDetails.items.length})
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
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">נתונים סטטיסטיים העונה</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">שערים</span>
                    <span className="text-2xl font-black text-slate-200">{selectedPlayer.stats.goals}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">בישולים</span>
                    <span className="text-2xl font-black text-slate-200">{selectedPlayer.stats.assists}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">הופעות</span>
                    <span className="text-2xl font-black text-slate-200">{selectedPlayer.stats.matches}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block">ציון ממוצע</span>
                    <span className="text-2xl font-black text-emerald-400">★ {selectedPlayer.stats.rating}</span>
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
                  <span>לפני 7 מחזורים</span>
                  <span>לפני 4 מחזורים</span>
                  <span>מחזור נוכחי</span>
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
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">כמות יחידות לרכישה/מכירה:</label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setTradeQuantity(prev => Math.max(1, prev - 1))}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 w-12 h-12 rounded-xl text-lg font-bold transition-colors"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1" 
                          value={tradeQuantity} 
                          onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-center text-lg font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                        <button 
                          onClick={() => setTradeQuantity(prev => prev + 1)}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 w-12 h-12 rounded-xl text-lg font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">שווי יחידה:</span>
                        <span className="font-semibold text-slate-200">{formatCurrency(selectedPlayer.price)}</span>
                      </div>
                      <div className="flex justify-between text-base font-black border-t border-slate-800 pt-2">
                        <span className="text-slate-100">סך הכל בעסקה:</span>
                        <span className="text-emerald-400">{formatCurrency(selectedPlayer.price * tradeQuantity)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buy/Sell Buttons */}
                  <div className="flex flex-col justify-between gap-3">
                    <div className="text-xs text-slate-400 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      🛡️ <span className="font-bold">החזקה שלך:</span> {portfolio.find(item => item.playerId === selectedPlayer.id)?.quantity || 0} יחידות שחקן.
                    </div>
                    
                    <button 
                      onClick={() => handleBuy(selectedPlayer, tradeQuantity)}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-base transition-all duration-200 shadow-lg shadow-emerald-500/10 hover:-translate-y-0.5"
                    >
                      קנייה מיידית לתיק
                    </button>
                    
                    <button 
                      onClick={() => handleSell(selectedPlayer, tradeQuantity)}
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
                <span className="text-xs font-bold text-slate-400 block mb-1">תשואת תיק כוללת</span>
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
                      <th className="py-4 px-6">כמות יח'</th>
                      <th className="py-4 px-6">מחיר קנייה ממוצע</th>
                      <th className="py-4 px-6">שווי שוק נוכחי</th>
                      <th className="py-4 px-6">שווי פוזיציה כולל</th>
                      <th className="py-4 px-6">רווח / הפסד פוזיציה</th>
                      <th className="py-4 px-6 text-center">פעולות</th>
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
                          <td className="py-4 px-6 font-bold text-slate-300">{item.quantity}</td>
                          <td className="py-4 px-6 text-slate-300">{formatCurrency(item.boughtPrice)}</td>
                          <td className="py-4 px-6 font-semibold text-slate-100">{formatCurrency(item.currentValue)}</td>
                          <td className="py-4 px-6 font-extrabold text-teal-300">{formatCurrency(item.totalCurrentVal)}</td>
                          <td className="py-4 px-6">
                            <div className={`font-bold ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                            </div>
                            <div className={`text-[11px] ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              ({item.profitLossPercent >= 0 ? '+' : ''}{item.profitLossPercent.toFixed(1)}%)
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex gap-2 justify-center">
                              <button 
                                onClick={() => {
                                  setSelectedPlayerId(item.id);
                                  setActiveTab('profile');
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all"
                              >
                                ניהול
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-500">
                          התיק שלך ריק כרגע. גש לשוק השחקנים כדי לרכוש את הכוכבים שלך!
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