import React from "react";

const data = [
  {
    Name: "Aadhar Hsg. Fin.",
    BSECode: 544176.0,
    NSECode: "AADHARHFC",
    IndustryGroup: "Finance",
    Industry: "Housing Finance Company",
    CurrentPrice: 494.55,
    MarketCapitalization: 21419,
    Return1Day: -0.98,
    Return1Week: -3.0,
    Return1Month: -4.06,
    Return3Months: -2.41,
    Return6Months: 7.38,
    Return1Year: 7.55,
    From52wHigh: 0.9,
    DMA50: 509.59,
    DMA200: 474.18,
    RSI: 36.49,
    MACD: -3.22,
    HighPrice: 547.8,
    LowPrice: 340.5,
    CapRange: "10000 - 30000",
  },
  {
    Name: "AAVAS Financiers",
    BSECode: 541988.0,
    NSECode: "AAVAS",
    IndustryGroup: "Finance",
    Industry: "Housing Finance Company",
    CurrentPrice: 1574.1,
    MarketCapitalization: 12462,
    Return1Day: -1.86,
    Return1Week: -4.6,
    Return1Month: -3.53,
    Return3Months: -8.12,
    Return6Months: -12.6,
    Return1Year: -5.31,
    From52wHigh: 0.7,
    DMA50: 1653.24,
    DMA200: 1730.56,
    RSI: 37.11,
    MACD: -4.92,
    HighPrice: 2238.35,
    LowPrice: 1516.9,
    CapRange: "10000 - 30000",
  },
  {
    Name: "Aditya Birla Cap",
    BSECode: 540691.0,
    NSECode: "ABCAPITAL",
    IndustryGroup: "Finance",
    Industry: "Investment Company",
    CurrentPrice: 338.1,
    MarketCapitalization: 88336,
    Return1Day: 3.38,
    Return1Week: 4.29,
    Return1Month: 15.25,
    Return3Months: 24.67,
    Return6Months: 65.02,
    Return1Year: 68.12,
    From52wHigh: 0.98,
    DMA50: 300.19,
    DMA200: 255.11,
    RSI: 71.4,
    MACD: 10.39,
    HighPrice: 345.4,
    LowPrice: 148.75,
    CapRange: "50000+",
  },
];

export default function FinanceTable() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Finance Data Table</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100 font-semibold">
            <tr>
              {Object.keys(data[0]).map((key) => (
                <th key={key} className="border px-2 py-1 whitespace-nowrap">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {Object.values(row).map((value, idx) => (
                  <td key={idx} className="border px-2 py-1 whitespace-nowrap text-center">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
