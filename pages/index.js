import Head from 'next/head';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'stock_data.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(fileContents);
  return { props: { stocks: data } };
}

export default function Dashboard({ stocks }) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Head>
        <title>Market Lens | Institutional Intelligence</title>
      </Head>

      <main className="max-w-6xl mx-auto py-12 px-4">
        
        {/* BRANDING HEADER */}
        <div className="mb-12 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                Market Lens
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Instant company intelligence. Master risk, financials, and fundamentals at a glance. 
                <span className="block mt-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Professional Grade • Zero Noise
                </span>
            </p>
        </div>

        {/* STOCK GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((stock) => (
            <Link key={stock.symbol} href={`/stock/${stock.symbol}`} className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md hover:border-blue-500 cursor-pointer h-full">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {stock.symbol}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">{stock.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                        stock.change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                        {stock.change >= 0 ? "+" : ""}{stock.change_percent}%
                    </span>
                </div>

                {/* Key Metrics Mini-Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-gray-100 pt-4">
                    <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Price</p>
                        <p className="font-mono font-medium text-gray-900">${stock.price}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-400 font-bold">Risk Score</p>
                        <p className={`font-mono font-bold ${stock.sharpe_ratio < 1 ? "text-yellow-600" : "text-green-600"}`}>
                            {stock.sharpe_ratio}
                        </p>
                    </div>
                </div>

                {/* Verdict Badge */}
                <div className="mt-4 pt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">Verdict</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {stock.verdict}
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