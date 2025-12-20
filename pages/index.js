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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Head>
        <title>Ronka Equity Research | Institutional Intelligence</title>
        <meta name="description" content="Institutional-grade risk modeling and fundamental analysis. Precision intelligence for capital allocation." />
      </Head>

      {/* Hero Section */}
      <div className="bg-black text-white py-24 px-6 text-center border-b-4 border-blue-900">
        {/* UPDATED PROFESSIONAL TITLE */}
        <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4 tracking-wide text-gray-100">
          Ronka Equity Research
        </h1>
        
        {/* UPDATED PROFESSIONAL DESCRIPTION */}
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
          Institutional-grade risk modeling and fundamental analysis. <br className="hidden md:block" />
          Precision intelligence for capital allocation.
        </p>
        
        {/* High Visibility Search Bar */}
        <div className="max-w-xl mx-auto relative group">
            {/* The Input Field */}
            <input 
                type="text" 
                placeholder="Search Ticker" 
                className="w-full py-4 px-6 rounded-sm bg-white text-gray-900 font-bold text-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-800 placeholder-gray-400 transition-all border-l-4 border-blue-900"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {/* Search Icon */}
            <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-900 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </div>
      </div>

      {/* The Grid of Stocks */}
      <main className="max-w-7xl mx-auto p-8 -mt-10">
        
        {filteredStocks.length === 0 && (
            <div className="text-center py-20 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="text-2xl font-serif font-bold text-gray-800">No equities found.</p>
                <p className="text-sm uppercase tracking-wide mt-2">Refine your search parameters.</p>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {filteredStocks.map((stock) => (
            <Link href={`/stock/${stock.symbol}`} key={stock.symbol} className="group">
              <div className="bg-white rounded-lg shadow-sm p-8 hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-800 cursor-pointer h-full relative overflow-hidden">
                
                {/* Subtle top accent line for professional look */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 group-hover:bg-blue-900 transition-colors"></div>

                <div className="flex justify-between items-start mb-6 mt-2">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900">{stock.symbol}</h2>
                    <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold truncate w-48 mt-1">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono font-medium text-xl text-gray-900">${stock.price}</span>
                    <span className={`text-sm font-bold ${stock.change >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {stock.change > 0 ? "+" : ""}{stock.change_percent}%
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-500 font-medium text-xs uppercase tracking-wide">Sharpe Ratio</span>
                        <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden`}>
                                <div className={`h-full ${stock.sharpe_ratio > 1 ? "bg-blue-800" : "bg-yellow-500"}`} style={{width: `${Math.min(stock.sharpe_ratio*30, 100)}%`}}></div>
                             </div>
                             <span className={`font-mono font-bold ${stock.sharpe_ratio > 1 ? "text-blue-900" : "text-yellow-600"}`}>
                                {stock.sharpe_ratio}
                             </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium text-xs uppercase tracking-wide">Max Drawdown</span>
                        <span className="font-mono font-bold text-red-700">{stock.max_drawdown_pct}%</span>
                    </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                     <span className="px-2 py-1 bg-gray-50 rounded text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100">
                        {stock.verdict}
                     </span>
                     <span className="text-blue-900 font-bold text-xs uppercase tracking-wide group-hover:underline">
                        View Report &rarr;
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