import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- HELPER FOR FINANCIALS (Smart Formatting T/B/M) ---
const formatLargeNumber = (num) => {
  if (!num) return "N/A";
  
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + "T";
  }
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + "B";
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + "M";
  }
  
  return num.toLocaleString();
};

// --- CUSTOM TOOLTIP (Standard Logic) ---
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
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[150px] z-50">
        <p className="text-gray-500 text-xs uppercase font-bold mb-1">
          {new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-xl font-mono font-bold text-gray-900 mb-1">
          ${currentPrice}
        </p>
        <p className={`text-sm font-bold ${colorClass}`}>
           {sign}{pct.toFixed(2)}% <span className="text-xs text-gray-400 font-normal ml-1">since start</span>
        </p>
      </div>
    );
  }
  return null;
};

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

    const filtered = stock.full_history
        .filter(point => new Date(point.date) >= cutoffDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    setChartData(filtered);

    if (filtered.length > 0) {
        const startPrice = filtered[0].price;
        const endPrice = filtered[filtered.length - 1].price;
        const diff = endPrice - startPrice;
        const percent = (diff / startPrice) * 100;
        
        setPeriodChange({
            dollar: diff.toFixed(2),
            percent: percent.toFixed(2)
        });

        setColor(endPrice >= startPrice ? "#22c55e" : "#ef4444");
    }
  }, [timeRange, stock]);

  const chartStartPrice = chartData.length > 0 ? chartData[0].price : 0;
  
  const isRisky = stock.sharpe_ratio < 0.5;
  const verdictColor = isRisky ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  const isPositivePeriod = periodChange.dollar >= 0;
  const periodColor = isPositivePeriod ? "text-green-600" : "text-red-600";
  const periodSign = isPositivePeriod ? "+" : "";

  const displayPrice = stock.price;
  const dayColor = stock.change >= 0 ? "text-green-600" : "text-red-600";
  const daySign = stock.change >= 0 ? "+" : "";

  const shortDescription = stock.description ? stock.description.slice(0, 180) + "..." : "No description.";

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Head>
        <title>{stock.symbol} - {stock.name}</title>
      </Head>

      <main className="max-w-5xl mx-auto py-10 px-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-black mb-6 block">← Back to Dashboard</Link>

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 flex justify-between items-center transition-all">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight">{stock.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-4xl font-mono tracking-tighter font-bold">
                        ${displayPrice}
                    </span>
                    
                    <div className={`flex flex-col text-sm font-bold ${dayColor}`}>
                        <span>{daySign}{stock.change} ({daySign}{stock.change_percent}%)</span>
                        <span className="text-gray-400 font-normal text-xs uppercase tracking-wide">Today</span>
                    </div>

                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${verdictColor}`}>
                        {stock.verdict}
                    </span>
                </div>
            </div>
            
            <div className="text-right hidden md:block">
                <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Market Cap</p>
                <p className="font-bold text-xl">
                    {formatLargeNumber(stock.market_cap)}
                </p>
            </div>
        </div>

        {/* --- COMPANY PROFILE --- */}
        <div className="mb-8">
            <div className="flex gap-2 mb-3">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {stock.sector}
                </span>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    {stock.industry}
                </span>
            </div>
            <div className="text-gray-600 text-sm leading-relaxed max-w-4xl transition-all">
                <p>
                    {isDescExpanded ? stock.description : shortDescription}
                    <button 
                        onClick={() => setIsDescExpanded(!isDescExpanded)} 
                        className="text-blue-600 font-bold ml-2 hover:underline focus:outline-none"
                    >
                        {isDescExpanded ? "Show Less" : "Read More"}
                    </button>
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. PRICE CHART */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Price Performance</h3>
                            <p className={`text-sm font-mono font-bold ${periodColor}`}>
                                {periodSign}{periodChange.dollar} ({periodSign}{periodChange.percent}%)
                                <span className="text-gray-400 font-sans font-normal text-xs ml-2">past {timeRange}</span>
                            </p>
                        </div>
                        
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg h-fit">
                            {['1M', '6M', 'YTD', '1Y', 'ALL'].map((range) => (
                                <button 
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                        timeRange === range ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-900"
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={chartData} 
                                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                    dataKey="date" 
                                    hide 
                                    padding={{ left: 20, right: 20 }}
                                />
                                <YAxis 
                                    domain={['auto', 'auto']} 
                                    orientation="right"
                                    tickFormatter={(number) => `$${number}`}
                                    tick={{fontSize: 12, fill: '#9ca3af'}}
                                    axisLine={false}
                                    tickLine={false}
                                    width={60}
                                />
                                
                                <Tooltip 
                                    cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    content={<CustomTooltip startPrice={chartStartPrice} />}
                                />

                                <Area 
                                    type="monotone" 
                                    dataKey="price" 
                                    stroke={color} 
                                    strokeWidth={2}
                                    fillOpacity={1} 
                                    fill="url(#colorPrice)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. UNDERWATER PLOT */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                        Details: Drawdown Risk
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={chartData} 
                                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#fee2e2" />
                                <XAxis 
                                    dataKey="date" 
                                    hide 
                                    padding={{ left: 20, right: 20 }} 
                                />
                                <YAxis 
                                    orientation="right"
                                    tickFormatter={(val) => `${val}%`}
                                    tick={{fontSize: 11, fill: '#9ca3af'}}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                
                                <Tooltip 
                                    cursor={{ stroke: '#ef4444', strokeWidth: 1 }}
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb'}}
                                    itemStyle={{color: '#ef4444', fontWeight: 'bold'}}
                                    labelStyle={{color: '#6b7280', fontSize: '12px'}}
                                />
                                
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Right Column: Cards */}
            <div className="space-y-6">
                
                {/* 1. RISK GAUGE */}
                <div className="bg-black text-white rounded-xl p-6 shadow-lg h-fit">
                    <h3 className="text-sm uppercase text-gray-400 font-bold mb-8">Risk Intelligence</h3>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">Sharpe Ratio</span>
                                <span className="font-mono text-yellow-400 text-xl">{stock.sharpe_ratio}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2">
                                <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${Math.min(stock.sharpe_ratio * 30, 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Score &gt; 1.0 is Excellent</p>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">Sortino Ratio</span>
                                <span className="font-mono text-blue-400 text-xl">{stock.sortino_ratio}</span>
                            </div>
                            <p className="text-xs text-gray-500">Return vs. Downside Volatility</p>
                        </div>

                         <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium">Beta (Volatility)</span>
                                <span className="font-mono text-green-400 text-xl">{stock.beta}</span>
                            </div>
                            <p className="text-xs text-gray-500">1.0 = Moves with S&P 500</p>
                        </div>
                    </div>
                </div>

                {/* 2. VITAL SIGNS (Investor Stats) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm uppercase text-gray-500 font-bold mb-6">
                        Investor Vital Signs
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        
                        {/* Profit Margin */}
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold">Profit Margin</p>
                            <p className={`text-xl font-mono font-bold ${stock.profit_margin > 15 ? 'text-green-600' : 'text-gray-900'}`}>
                                {stock.profit_margin}%
                            </p>
                            <p className="text-[10px] text-gray-400">Keep per $1 rev</p>
                        </div>

                        {/* ROE */}
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold">Return on Equity</p>
                            <p className={`text-xl font-mono font-bold ${stock.roe > 15 ? 'text-green-600' : 'text-gray-900'}`}>
                                {stock.roe}%
                            </p>
                            <p className="text-[10px] text-gray-400">Efficiency score</p>
                        </div>

                        {/* Wall St Target */}
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold">Analyst Target</p>
                            <p className="text-xl font-mono font-bold text-blue-600">
                                ${stock.target_price ? Number(stock.target_price).toFixed(2) : "N/A"}
                            </p>
                            <p className="text-[10px] text-gray-400">Consensus Fair Value</p>
                        </div>

                        {/* 52 Week High */}
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold">52-Week High</p>
                            <p className="text-xl font-mono font-bold text-gray-900">
                                ${stock.high_52}
                            </p>
                            <p className="text-[10px] text-gray-400">Yearly Ceiling</p>
                        </div>
                    </div>
                </div>

                {/* 3. FINANCIAL FLOW (Sankey Style) */}
                {stock.financials && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm uppercase text-gray-500 font-bold mb-6">
                            Financial Flow ({stock.financials.year})
                        </h3>

                        <div className="space-y-6 font-sans text-xs font-bold text-white text-center relative">
                            
                            {/* REVENUE */}
                            <div className="w-full bg-blue-500 rounded p-2 relative mb-8">
                                <span className="block opacity-80 text-[10px] uppercase">Total Revenue</span>
                                <span className="text-sm">${formatLargeNumber(stock.financials.revenue)}</span>
                                <div className="absolute -bottom-6 left-0 w-1/2 h-6 border-r border-gray-300"></div>
                                <div className="absolute -bottom-6 right-0 w-1/2 h-6 border-l border-gray-300"></div>
                            </div>

                            {/* COSTS vs PROFIT */}
                            <div className="flex justify-between gap-2 relative mb-8">
                                <div className="bg-gray-400 rounded p-2 flex-1">
                                    <span className="block opacity-80 text-[10px] uppercase">Cost of Sales</span>
                                    <span>${formatLargeNumber(stock.financials.cost_of_revenue)}</span>
                                </div>

                                <div className="bg-emerald-500 rounded p-2 flex-1 relative">
                                    <span className="block opacity-80 text-[10px] uppercase">Gross Profit</span>
                                    <span className="text-sm">${formatLargeNumber(stock.financials.gross_profit)}</span>
                                    <div className="absolute -bottom-6 left-0 w-1/2 h-6 border-r border-gray-300"></div>
                                    <div className="absolute -bottom-6 right-0 w-1/2 h-6 border-l border-gray-300"></div>
                                </div>
                            </div>

                            {/* EXPENSES vs INCOME */}
                            <div className="flex justify-end gap-2">
                                <div className="flex-1"></div>
                                <div className="flex-1 flex justify-between gap-2">
                                    <div className="bg-amber-400 rounded p-2 flex-1">
                                        <span className="block opacity-80 text-[10px] uppercase text-amber-900">Expenses</span>
                                        <span className="text-amber-900">${formatLargeNumber(stock.financials.op_expenses)}</span>
                                    </div>

                                    <div className="bg-green-600 rounded p-2 flex-1 shadow-lg ring-2 ring-green-100">
                                        <span className="block opacity-80 text-[10px] uppercase">Net Earnings</span>
                                        <span className="text-sm">${formatLargeNumber(stock.financials.net_income)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                        
                        <p className="text-xs text-gray-400 mt-6 text-center">
                            *Simplified flow based on {stock.financials.year} report.
                        </p>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
}