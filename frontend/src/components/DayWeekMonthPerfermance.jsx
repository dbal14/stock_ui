import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const SummaryDashboard = () => {
  const data = [
    {
      symbol: "ADANIENT",
      "5D_Change": [-1.63, -0.16, 0.07, -0.05, -0.32, 0.98, 0.63, -0.41, -0.92, 0.33],
      "5W_Change": [-1.77, -0.06, -1.51, 1.82, 0.78],
      "5M_Change": [-0.07, 11.64, -7.65, -7.2, 4.0],
    },
  ];

  return (
    <div className="p-6">
      <Card className="shadow-xl rounded-2xl border border-gray-200 hover:shadow-2xl transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center text-blue-600">Stocks Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-sm font-medium text-gray-600">Stock Name</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-600">5 Day Performance (values)</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-600">Weekly Performance (values)</th>
                  <th className="px-4 py-2 text-sm font-medium text-gray-600">Monthly Performance (values)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.symbol} className="border-t">
                    <td className="px-4 py-3 font-semibold">{item.symbol}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item["5D_Change"].map((val, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-sm font-medium ${val >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {val}%
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item["5W_Change"].map((val, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-sm font-medium ${val >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {val}%
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item["5M_Change"].map((val, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-sm font-medium ${val >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {val}%
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 text-right">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryDashboard;
