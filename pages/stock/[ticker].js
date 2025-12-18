import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [cursorData, setCursorData] = useState(null);

  useEffect(() => {
    if (!stock.full_history) return;

    setCursorData(null); 

    const today = new Date();
    let cutoffDate = new Date();

    if (timeRange === '1M') cutoffDate.setMonth(today.getMonth() - 1);
    else if (timeRange === '6M') cutoffDate.setMonth(today.getMonth() - 6);
    else if (timeRange === 'YTD') cutoffDate = new Date(today.getFullYear(), 0, 1);
    else if (timeRange === '1Y') cutoffDate.setFullYear(today.getFullYear() - 1);
    else if (timeRange === 'ALL') cutoffDate = new Date('1990-01-01');

    const filtered = stock.full_history.filter(point => new Date(point.date) >= cutoffDate);
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

  const handleMouseMove = (e) => {
    if (e.activePayload && e.activePayload.length > 0) {
        setCursorData(e.activePayload[0].payload);
    }
  };

  const isRisky = stock.sharpe_ratio < 0.5;
  const verdictColor = isRisky ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  const isPositivePeriod = periodChange.dollar >= 0;
  const periodColor = isPositivePeriod ? "text-green-600" : "text-red-600";
  const periodSign = isPositivePeriod ? "+" : "";

  // --- DYNAMIC HEADER LOGIC ---
  let displayPrice = stock.price;
  let displayChange = stock.change;
  let displayChangePct = stock.change_percent;
  let displayLabel = "Today";
  let displayColor = stock.change >= 0 ? "text-green-600" : "text-red-600";
  let displaySign = stock.change >= 0 ? "+" : "";

  // If scrubbing (hovering), override values
  if (cursorData && chartData.length > 0) {
      displayPrice = cursorData.price;
      
      // Calculate change relative to the START of the visible chart
      const startPrice = chartData[0].price;
      const diff = cursorData.price - startPrice;
      const pct = (diff / startPrice) * 100;

      displayChange = diff.toFixed(2);
      displayChangePct = pct.toFixed(2);
      displayLabel = new Date(cursorData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      displayColor = diff >= 0 ? "text-green-600" : "text-red-600";
      displaySign = diff >= 0 ? "+" : "";
  }

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
                    {/* BIG DYNAMIC PRICE */}
                    <span className="text-4xl font-mono tracking-tighter font-bold">
                        ${displayPrice}
                    </span>
                    
                    {/* Dynamic Change Badge (Updates on Hover) */}
                    <div className={`flex flex-col text-sm font-bold ${displayColor}`}>
                        <span>{displaySign}{displayChange} ({displaySign}{displayChangePct}%)</span>
                        <span className="text-gray-400 font-normal text-xs uppercase tracking-wide">{displayLabel}</span>
                    </div>

                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${verdictColor}`}>
                        {stock.verdict}
                    </span>
                </div>
            </div>
            
            <div className="text-right hidden md:block">
                <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Market Cap</p>
                <p className="font-bold text-xl">
                    {stock.market_cap !== "N/A" ? (stock.market_cap / 1e9).toFixed(1) + "B" : "N/A"}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. PRICE CHART */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h3 className="text-lg font-bold">Price Performance</h3>
                            {/* Shows total period return (Static context) */}
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
                                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                                onMouseMove={handleMouseMove}
                            >
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" hide />
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
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    itemStyle={{color: '#000', fontWeight: 'bold'}}
                                    labelStyle={{color: '#6b7280', fontSize: '12px'}}
                                    active={true}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                        Details: Drawdown Risk
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart 
                                data={chartData} 
                                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                                onMouseMove={handleMouseMove}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#fee2e2" />
                                <XAxis dataKey="date" hide />
                                <YAxis 
                                    orientation="right"
                                    tickFormatter={(val) => `${val}%`}
                                    tick={{fontSize: 11, fill: '#9ca3af'}}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb'}}
                                    itemStyle={{color: '#ef4444', fontWeight: 'bold'}}
                                    labelStyle={{color: '#6b7280', fontSize: '12px'}}
                                    active={true}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Right Column: Risk Gauge */}
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

        </div>
      </main>
    </div>
  );
}