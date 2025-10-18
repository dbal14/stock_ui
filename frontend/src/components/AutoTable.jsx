
import React, { useEffect, useState } from "react";

function Percent({ value }) {
  if (value === "--" || value === undefined) return <span className="text-gray-500">--</span>;
  const raw = String(value).trim().replace('%','');
  const num = parseFloat(raw);
  const cls = (num > 0) ? 'text-green-600' : (num < 0) ? 'text-red-600' : 'text-gray-700';
  return <span className={cls}>{value}</span>;
}

function ScoreBadge({score, highlighted}) {
  return (
    <div className={"px-3 py-1 rounded-md text-white font-semibold " + (highlighted ? "bg-blue-600" : "bg-blue-800")}>
      {score}
    </div>
  );
}

export default function AutoTable(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch("http://localhost:4000/api/auto_data")
      .then(r=>r.json())
      .then(res=>{
        setRows(res.data || []);
        setLoading(false);
      })
      .catch(err=>{
        console.error(err);
        setLoading(false);
      });
  },[]);

  if(loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-200 text-sm text-left">
            <th className="p-2">Ticker</th>
            <th className="p-2">Price</th>
            <th className="p-2">1-Mo Return</th>
            <th className="p-2">3-Mo Return</th>
            <th className="p-2">1-Yr Return</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const highlighted = r.Ticker === "TATAMOTORS";
            const isAverage = r.Ticker === "Average";
            return (
              <tr key={idx} className={isAverage ? "bg-gray-100 font-semibold" : (highlighted ? "bg-blue-600 text-white" : (idx%2===0 ? "" : "bg-gray-50"))}>
                <td className="p-2 align-middle">
                  <ScoreBadge score={r.AverageScore} highlighted={highlighted}/>
                </td>
                <td className={"p-2 align-middle " + (highlighted ? "font-bold" : "")}>{r.Ticker}</td>
                <td className={"p-2 align-middle " + (highlighted ? "font-bold" : "")}>{r.Price}</td>
                <td className="p-2 align-middle"><Percent value={r.OneMoReturn} /></td>
                <td className="p-2 align-middle"><Percent value={r.ThreeMoReturn} /></td>
                <td className="p-2 align-middle"><Percent value={r.OneYrReturn} /></td>
                <td className="p-2 align-middle">{r.MarketCap}</td>
                <td className="p-2 align-middle">{r.TrailingPE}</td>
                <td className="p-2 align-middle">{r.ForwardPE}</td>
                <td className="p-2 align-middle">{r.DividendYield}</td>
                <td className="p-2 align-middle">{r.NetMargin}</td>
                <td className="p-2 align-middle">{r.LTGForecast}</td>
                <td className="p-2 align-middle">{r.AnalystMean}</td>
                <td className="p-2 align-middle">{r.AnalystCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
