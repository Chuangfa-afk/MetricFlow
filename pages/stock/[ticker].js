import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- HELPER: Smart Formatting ---
const formatLargeNumber = (num) => {
  if (!num) return "N/A";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toLocaleString();
};

// --- COMPONENT: Stat Card (For the Top Bar) ---
const StatCard = ({ label, value, subtext, color = "blue" }) => {
    const colorClasses = {
        blue: "border-blue-500 text-blue-600",
        green: "border-green-500 text-green-600",
        indigo: "border-indigo-500 text-indigo-600",
        purple: "border-purple-500 text-purple-600",
        gray: "border-gray-400 text-gray-900"
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm p-5 border-t-4 ${colorClasses[color]} flex flex-col justify-between h-full`}>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">{label}</p>
            <div>
                <p className={`text-2xl font-mono font-bold ${colorClasses[color].split(" ")[1]}`}>
                    {value}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>
            </div>
        </div>
    );
};

// --- COMPONENT: Chart Tooltip ---
const CustomTooltip = ({ active, payload, label, startPrice }) => {
  if (active && payload && payload.length > 0 && startPrice !== undefined) {
    const dataPoint = payload[0];
    const currentPrice = dataPoint.value;
    const dateStr = dataPoint.payload.date; 
    let diff = currentPrice - startPrice;
    let pct = (diff / startPrice) * 100;
    if (Math.abs(pct) < 0.01) pct = 0.00;
    const isPositive = diff >= 0;
    const sign = isPositive ? "+" : "";
    const colorClass = isPositive ? "text-green-600" : "text-red-600";
    return (
      <div className="bg-white p-3 border border-gray-100 rounded shadow-xl min-w-[140px] z-50">
        <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">
          {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-lg font-mono font-bold text-gray-900 mb-1">${currentPrice}</p>
        <p className={`text-xs font-bold ${colorClass}`}>
           {sign}{pct.toFixed(2)}% <span className="text-[10px] text-gray-400 font-normal ml-1">return</span>
        </p>
      </div>
    );
  }
  return null;
};

// --- DATA FETCHING ---
export async function getStaticPaths() {
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContents);
  const paths = data.map(stock => ({ params: { ticker: stock.symbol } }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContents);
  const stock = data.find(s => s.symbol === params.ticker);
  return { props: { stock } };
}

// --- MAIN PAGE COMPONENT ---
export default function StockPage({ stock }) {
  const [timeRange, setTimeRange] = useState('1Y'); 
  const [chartData, setChartData] = useState([]);
  const [color, setColor] = useState("#22c55e"); 
  const [periodChange, setPeriodChange] = useState({ dollar: 0, percent: 0 });
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    if (!stock.full_history) return;
    const today = new Date();
    let cutoffDate = new Date();
    if (timeRange === '1M') cutoffDate.setMonth(today.getMonth() - 1);
    else if (timeRange === '6M') cutoffDate.setMonth(today.getMonth() - 6);
    else if (timeRange === 'YTD') cutoffDate = new Date(today.getFullYear(), 0, 1);
    else if (timeRange === '1Y') cutoffDate.setFullYear(today.getFullYear() - 1);
    else if (timeRange === 'ALL') cutoffDate = new Date('1990-01-01');

    const filtered = stock.full_history.filter(point => new Date(point.date) >= cutoffDate).sort((a, b) => new Date(a.date) - new Date(b.date));
    setChartData(filtered);

    if (filtered.length > 0) {
        const startPrice = filtered[0].price;
        const endPrice = filtered[filtered.length - 1].price;
        const diff = endPrice - startPrice;
        const percent = (diff / startPrice) * 100;
        setPeriodChange({ dollar: diff.toFixed(2), percent: percent.toFixed(2) });
        setColor(endPrice >= startPrice ? "#22c55e" : "#ef4444");
    }
  }, [timeRange, stock]);

  const chartStartPrice = chartData.length > 0 ? chartData[0].price : 0;
  const isRisky = stock.sharpe_ratio < 0.5;
  const verdictColor = isRisky ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800";
  const isPositivePeriod = periodChange.dollar >= 0;
  const periodColor = isPositivePeriod ? "text-green-600" : "text-red-600";
  const periodSign = isPositivePeriod ? "+" : "";
  const displayPrice = stock.price;
  const dayColor = stock.change >= 0 ? "text-green-600" : "text-red-600";
  const daySign = stock.change >= 0 ? "+" : "";

  // Read More Logic
  const fullDesc = stock.description ? String(stock.description) : "No description available.";
  const CHAR_LIMIT = 100;
  const shortDesc = fullDesc.length > CHAR_LIMIT ? fullDesc.slice(0, CHAR_LIMIT) + "..." : fullDesc;
  const shouldShowButton = fullDesc.length > CHAR_LIMIT;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <Head>
        <title>{stock.symbol} | Sentinel Equity</title>
      </Head>

      <main className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        
        {/* --- NAV --- */}
        <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 mb-6 transition-colors uppercase tracking-widest">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Dashboard
        </Link>

        {/* --- HEADER: COMPACT & CLEAN --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-200 pb-6">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{stock.symbol}</h1>
                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${verdictColor}`}>
                        {stock.verdict}
                    </span>
                </div>
                <p className="text-sm font-medium text-slate-500">{stock.name}</p>
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right">
                <div className="flex items-baseline gap-3 md:justify-end">
                    <span className="text-4xl font-mono tracking-tighter font-bold text-slate-900">${displayPrice}</span>
                    <span className={`text-lg font-bold ${dayColor}`}>
                        {daySign}{stock.change} <span className="text-sm">({daySign}{stock.change_percent}%)</span>
                    </span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">
                    Market Cap: {formatLargeNumber(stock.market_cap)}
                </p>
            </div>
        </div>

        {/* --- TOP ROW: PROFILE & KEY STATS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            
            {/* 1. DESCRIPTION (Spans 8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <div className="flex gap-2 mb-4">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">{stock.sector}</span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">{stock.industry}</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                    {isDescExpanded ? fullDesc : shortDesc}
                    {shouldShowButton && (
                        <button 
                            onClick={() => setIsDescExpanded(!isDescExpanded)} 
                            className="text-blue-600 font-bold ml-1 hover:underline text-xs uppercase"
                        >
                            {isDescExpanded ? "Show Less" : "Read More"}
                        </button>
                    )}
                </p>
            </div>

            {/* 2. CORPORATE INFO (Spans 4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-lg shadow-sm p-6 border-l-4 border-slate-400 flex flex-col justify-center">
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase text-slate-400 font-bold">CEO</span>
                        <span className="text-sm font-bold text-slate-900 text-right">{stock.ceo || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase text-slate-400 font-bold">HQ</span>
                        <span className="text-sm font-bold text-slate-900 text-right truncate w-40">{stock.hq || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase text-slate-400 font-bold">Employees</span>
                        <span className="text-sm font-bold text-slate-900 text-right">{stock.employees ? stock.employees.toLocaleString() : "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                         <span className="text-[10px] uppercase text-slate-400 font-bold">Web</span>
                         <a href={stock.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline truncate w-40 text-right">
                             {stock.website ? stock.website.replace(/^https?:\/\//, '') : "N/A"}
                         </a>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MIDDLE ROW: VITAL SIGNS STRIP (Balances the layout) --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
                label="Profit Margin" 
                value={`${stock.profit_margin}%`} 
                subtext="Keep per $1 revenue" 
                color={stock.profit_margin > 15 ? "green" : "gray"} 
            />
            <StatCard 
                label="Return On Equity" 
                value={`${stock.roe}%`} 
                subtext="Efficiency Score" 
                color={stock.roe > 15 ? "green" : "gray"} 
            />
            <StatCard 
                label="Analyst Target" 
                value={`$${stock.target_price ? Number(stock.target_price).toFixed(2) : "N/A"}`} 
                subtext="Consensus Fair Value" 
                color="blue" 
            />
            <StatCard 
                label="52-Week High" 
                value={`$${stock.high_52}`} 
                subtext="Yearly Ceiling" 
                color="indigo" 
            />
        </div>

        {/* --- BOTTOM GRID: ANALYSIS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN (Charts - Takes 2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. PRICE CHART CARD */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 relative">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Price Performance</h3>
                            <p className={`text-sm font-mono font-bold ${periodColor}`}>
                                {periodSign}{periodChange.dollar} ({periodSign}{periodChange.percent}%)
                                <span className="text-slate-400 font-sans font-normal text-xs ml-2">past {timeRange}</span>
                            </p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-md">
                            {['1M', '6M', 'YTD', '1Y', 'ALL'].map((range) => (
                                <button 
                                    key={range} 
                                    onClick={() => setTimeRange(range)} 
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${timeRange === range ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide padding={{ left: 10, right: 10 }} />
                                <YAxis domain={['auto', 'auto']} orientation="right" tickFormatter={(number) => `$${number}`} tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={50} />
                                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} content={<CustomTooltip startPrice={chartStartPrice} />} />
                                <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. DRAWDOWN CHART CARD */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 relative">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-red-600">Drawdown Risk</h3>
                            <div className="relative group flex items-center justify-center pt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-300 hover:text-slate-500 cursor-help transition-colors">
                                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                <div className="absolute left-6 top-0 w-64 p-3 bg-slate-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border border-slate-700">
                                    <p className="font-bold mb-1 border-b border-slate-700 pb-1 text-slate-200">MAX PAIN INDEX</p>
                                    <p className="leading-relaxed mt-1 text-slate-300">Tracks the % loss an investor would face if they bought at the absolute peak.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#fee2e2" />
                                <XAxis dataKey="date" hide padding={{ left: 10, right: 10 }} />
                                <YAxis orientation="right" tickFormatter={(val) => `${val}%`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={35} />
                                <Tooltip cursor={{ stroke: '#ef4444', strokeWidth: 1 }} contentStyle={{backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0'}} itemStyle={{color: '#ef4444', fontWeight: 'bold'}} labelStyle={{color: '#64748b', fontSize: '11px'}} formatter={(value) => [`${value}%`, "Drawdown"]} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN (Details - Takes 1/3 width) */}
            <div className="space-y-6">
                
                {/* 1. RISK GAUGE (Dark Card) */}
                <div className="bg-slate-900 text-white rounded-lg p-6 shadow-lg h-fit border-t-4 border-slate-600">
                    <h3 className="text-xs uppercase text-slate-400 font-bold mb-6 tracking-widest">Risk Intelligence</h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300">Sharpe Ratio</span>
                                <span className="font-mono text-yellow-400 text-xl">{stock.sharpe_ratio}</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${Math.min(stock.sharpe_ratio * 30, 100)}%` }}></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Score &gt; 1.0 is Excellent</p>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-slate-300">Beta (Volatility)</span>
                                <span className="font-mono text-emerald-400 text-xl">{stock.beta}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">1.0 = Moves with S&P 500</p>
                        </div>
                        <div className="pt-4 border-t border-slate-800">
                             <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-slate-300">Sortino Ratio</span>
                                <span className="font-mono text-blue-400 text-lg">{stock.sortino_ratio}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. FINANCIAL FLOW (Styled as a lighter card) */}
                {stock.financials && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 border-t-4 border-indigo-500">
                        <h3 className="text-xs uppercase text-slate-400 font-bold mb-6 tracking-widest">Financial Flow</h3>
                        <div className="space-y-6 font-sans text-xs font-bold text-white text-center relative">
                            {/* REVENUE */}
                            <div className="w-full bg-blue-600 rounded p-2 relative mb-6 shadow-md">
                                <span className="block opacity-75 text-[9px] uppercase tracking-wider mb-1">Total Revenue</span>
                                <span className="text-sm font-mono">${formatLargeNumber(stock.financials.revenue)}</span>
                                <div className="absolute -bottom-4 left-1/2 w-0.5 h-4 bg-slate-200"></div>
                            </div>

                            {/* SPLIT */}
                            <div className="flex gap-2">
                                <div className="bg-slate-400 rounded p-2 flex-1 shadow-sm">
                                    <span className="block opacity-75 text-[9px] uppercase mb-1">Costs</span>
                                    <span className="font-mono">${formatLargeNumber(stock.financials.cost_of_revenue)}</span>
                                </div>
                                <div className="bg-emerald-500 rounded p-2 flex-1 relative shadow-md">
                                    <span className="block opacity-75 text-[9px] uppercase mb-1">Gross Profit</span>
                                    <span className="font-mono">${formatLargeNumber(stock.financials.gross_profit)}</span>
                                    <div className="absolute -bottom-4 right-1/4 w-0.5 h-4 bg-slate-200"></div>
                                </div>
                            </div>

                            {/* NET INCOME */}
                            <div className="flex justify-end mt-4">
                                <div className="bg-green-700 rounded p-3 w-2/3 shadow-lg ring-2 ring-green-50">
                                    <span className="block opacity-75 text-[9px] uppercase tracking-wider mb-1">Net Earnings</span>
                                    <span className="text-sm font-mono">${formatLargeNumber(stock.financials.net_income)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}