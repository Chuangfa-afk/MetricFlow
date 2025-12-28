import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

// --- HELPER: Market Status (Timezone Aware) ---
const getMarketStatus = () => {
    const now = new Date(); 
    const nycTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = nycTime.getDay(); 
    const hour = nycTime.getHours();
    const minute = nycTime.getMinutes();
    const timeVal = hour + (minute / 60);

    const isWeekend = day === 0 || day === 6;
    const isClosedHours = timeVal < 9.5 || timeVal >= 16;

    if (isWeekend || isClosedHours) {
        return { status: "MARKET CLOSED", color: "text-red-400", dot: "bg-red-500" };
    }
    return { status: "MARKET OPEN", color: "text-green-400", dot: "bg-green-500 animate-pulse" };
};

// --- HELPER: Chart Data Generator (Now with TIME) ---
const generateSparkline = (price, change) => {
    const startPrice = price - change;
    const data = [];
    const points = 40; 
    const volatility = Math.max(Math.abs(change) * 0.8, price * 0.002); 
    
    // Create a base date for 9:30 AM
    const baseDate = new Date();
    baseDate.setHours(9, 30, 0, 0);

    for (let i = 0; i <= points; i++) {
        const progress = i / points;
        const trend = startPrice + (change * progress);
        const randomNoise = (Math.random() - 0.5) * volatility;
        const wave = Math.sin(progress * Math.PI * 2) * (volatility * 0.4); 
        const dampener = 1 - Math.pow(2 * progress - 1, 4); 
        const val = trend + ((randomNoise + wave) * dampener);
        
        // Calculate Time (9:30 AM + progress * 6.5 hours)
        const pointTime = new Date(baseDate.getTime() + (progress * 6.5 * 60 * 60 * 1000));
        const timeStr = pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const pointChange = ((val - startPrice) / startPrice) * 100;
        
        data.push({ i, val, change: pointChange, time: timeStr });
    }
    return data;
};

// --- HELPER: Custom Tooltip (Added Time) ---
const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl border border-slate-700">
                {/* NEW: Time Display */}
                <div className="text-slate-400 mb-1 uppercase tracking-wider font-bold text-[9px]">{data.time}</div>
                
                <div className="font-mono font-bold text-lg leading-none mb-1">${data.val.toFixed(2)}</div>
                <div className={`${data.change >= 0 ? "text-green-400" : "text-red-400"} font-bold`}>
                    {data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}%
                </div>
            </div>
        );
    }
    return null;
};

// --- COMPONENT: Stock Card ---
const StockCard = ({ stock }) => {
    const [chartData, setChartData] = useState([]);
    const isPositive = stock.change >= 0;
    const color = isPositive ? "#16a34a" : "#dc2626"; 
    
    const isSafe = stock.sharpe_ratio > 1;
    const riskLabel = isSafe ? "LOW RISK" : "MED RISK";
    const riskColor = isSafe ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-yellow-50 text-yellow-700 border-yellow-200";

    useEffect(() => {
        setChartData(generateSparkline(stock.price, stock.change));
    }, [stock]);

    const minVal = Math.min(...chartData.map(d => d.val));
    const maxVal = Math.max(...chartData.map(d => d.val));

    return (
        <Link href={`/stock/${stock.symbol}`} className="block group h-full">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-600 hover:shadow-xl transition-all duration-300 h-full flex flex-col justify-between group-hover:-translate-y-1 relative overflow-hidden">
                
                {/* TOP ROW */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stock.symbol}</h2>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${riskColor}`}>
                                {riskLabel}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate w-40">{stock.name}</p>
                    </div>
                    <div className="text-right">
                        <span className="block font-mono font-bold text-2xl text-slate-900 tracking-tight">${stock.price}</span>
                        <span className={`text-sm font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? "+" : ""}{stock.change} ({isPositive ? "+" : ""}{stock.change_percent}%)
                        </span>
                    </div>
                </div>

                {/* MIDDLE ROW: Chart */}
                <div className="h-20 -mx-2 my-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`grad-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <YAxis domain={[minVal, maxVal]} hide />
                            <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke={color} 
                                strokeWidth={2.5} 
                                fill={`url(#grad-${stock.symbol})`} 
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* BOTTOM ROW: Stats */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                    <div className="text-center">
                        <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Sharpe</span>
                        <span className="font-mono font-bold text-slate-700">{stock.sharpe_ratio}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100 mx-4"></div>
                    <div className="text-center">
                        <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Max DD</span>
                        <span className="font-mono font-bold text-red-600">{stock.max_drawdown_pct}%</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100 mx-4"></div>
                    <div className="text-center">
                        <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-0.5">Verdict</span>
                        <span className={`font-bold text-xs uppercase ${stock.verdict === 'Buy' ? 'text-blue-600' : 'text-slate-600'}`}>
                            {stock.verdict}
                        </span>
                    </div>
                </div>

            </div>
        </Link>
    );
};

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const stocks = JSON.parse(fileContents);
  return { props: { stocks } };
}

export default function Home({ stocks }) {
  const [query, setQuery] = useState(""); 
  const [marketStatus, setMarketStatus] = useState({ status: "LOADING...", color: "text-gray-400" });

  useEffect(() => {
      setMarketStatus(getMarketStatus());
  }, []);

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
    stock.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>Ronka Equity Research</title>
      </Head>

      {/* --- TOP BAR --- */}
      <div className="bg-slate-900 text-slate-400 text-[10px] py-1.5 px-6 flex justify-between items-center border-b border-slate-800 font-bold tracking-widest uppercase sticky top-0 z-50">
          <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${marketStatus.dot}`}></span>
              <span className={marketStatus.color}>{marketStatus.status}</span>
          </div>
          <div className="flex gap-4 hidden sm:flex">
              <span>S&P 500 <span className="text-green-500">+0.45%</span></span>
              <span>NASDAQ <span className="text-green-500">+0.82%</span></span>
              <span>GOLD <span className="text-green-500">+0.30%</span></span>
          </div>
      </div>

      {/* --- HERO SECTION (Updated: Tighter Spacing) --- */}
      {/* Changed py-16/pb-12 to py-10 for less whitespace */}
      <div className="bg-white text-center py-10 px-6 border-b border-slate-200">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-4">
                v2.0 Institutional Beta
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-3 tracking-tight text-slate-900">
            Ronka <span className="text-blue-600">Equity.</span>
            </h1>
            <p className="text-slate-500 max-w-xl mx-auto mb-8 text-sm leading-relaxed font-medium">
            Institutional-grade risk modeling. Quantitative analysis. <br/>
            Precision intelligence for the modern allocator.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative group shadow-2xl rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                    type="text" 
                    placeholder="Search Ticker (e.g. NVDA)..." 
                    className="block w-full pl-12 pr-12 py-4 border-none rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm font-semibold"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-slate-300 text-[10px] font-bold border border-slate-200 px-1.5 py-0.5 rounded">ESC</span>
                </div>
            </div>
      </div>

      {/* --- MAIN GRID --- */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-end mb-8">
            <h3 className="text-slate-900 font-extrabold text-xl">Market Movers</h3>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Updated: {new Date().toLocaleTimeString()}
            </span>
        </div>

        {filteredStocks.length === 0 && (
            <div className="text-center py-20 text-gray-400 bg-white rounded-lg border border-gray-200 border-dashed">
                <p className="text-xl font-bold">No assets found</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStocks.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      </main>
    </div>
  );
}