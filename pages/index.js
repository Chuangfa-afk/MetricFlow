import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const stocks = JSON.parse(fileContents);
  return { props: { stocks } };
}

export default function Home({ stocks }) {
  const [query, setQuery] = useState(""); 

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
    stock.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Head>
        <title>Stock Risk Database</title>
        <meta name="description" content="Analyze stock risk metrics like Sharpe Ratio and Drawdown." />
      </Head>

      {/* Hero Section */}
      <div className="bg-black text-white py-24 px-6 text-center">
        <h1 className="text-6xl font-extrabold mb-6 tracking-tight">Stock Risk Database</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Wall Street grade analysis. Zero fluff. 
          See volatility, drawdowns, and Sharpe ratios instantly.
        </p>
        
        {/* NEW: High Visibility Search Bar */}
        <div className="max-w-xl mx-auto relative group">
            {/* The Input Field */}
            <input 
                type="text" 
                placeholder="Search ticker (e.g. AAPL, Tesla)..." 
                className="w-full py-5 px-8 rounded-full bg-white text-gray-900 font-bold text-xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500 placeholder-gray-400 transition-all"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {/* Search Icon */}
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </div>
      </div>

      {/* The Grid of Stocks */}
      <main className="max-w-7xl mx-auto p-8 -mt-10">
        
        {filteredStocks.length === 0 && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm">
                <p className="text-2xl font-bold">No stocks found.</p>
                <p>Try searching for a different symbol.</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {filteredStocks.map((stock) => (
            <Link href={`/stock/${stock.symbol}`} key={stock.symbol} className="group">
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100">
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold text-gray-900">{stock.symbol}</h2>
                    <p className="text-sm text-gray-500 font-medium truncate w-48">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono font-bold text-xl text-gray-900">${stock.price}</span>
                    <span className={`text-sm font-bold ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {stock.change > 0 ? "+" : ""}{stock.change_percent}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-500 font-medium">Sharpe Ratio</span>
                        <div className="flex items-center gap-2">
                             <div className={`h-2 w-16 rounded-full bg-gray-100 overflow-hidden`}>
                                <div className={`h-full ${stock.sharpe_ratio > 1 ? "bg-green-500" : "bg-yellow-500"}`} style={{width: `${Math.min(stock.sharpe_ratio*30, 100)}%`}}></div>
                             </div>
                             <span className={`font-bold ${stock.sharpe_ratio > 1 ? "text-green-600" : "text-yellow-600"}`}>
                                {stock.sharpe_ratio}
                             </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Max Drawdown</span>
                        <span className="font-bold text-red-500">{stock.max_drawdown_pct}%</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                     <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {stock.verdict}
                     </span>
                     <span className="text-blue-600 font-semibold group-hover:underline text-sm">
                        Analysis &rarr;
                     </span>
                </div>
                
              </div>
            </Link>
          ))}

        </div>
      </main>
    </div>
  );
}