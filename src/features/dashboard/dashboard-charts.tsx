"use client";
import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface ChartsProps {
  assessment: {
    transportEmissions: number;
    energyEmissions: number;
    foodEmissions: number;
    shoppingEmissions: number;
    wasteEmissions: number;
  };
  history: Array<{
    createdAt: string | Date;
    annualFootprint: number;
    carbonScore: number;
  }>;
}

const CATEGORY_COLORS = {
  Transport: "#3b82f6", // Blue
  Energy: "#eab308",    // Amber
  Diet: "#10b981",      // Emerald
  Shopping: "#a855f7",  // Purple
  Waste: "#ec4899",     // Pink
};

// Custom tooltips declared outside render to prevent recreation/state resets
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0c1319] p-3 shadow-xl">
        <p className="text-xs font-bold text-white">{payload[0].name}</p>
        <p className="text-sm font-black text-brand mt-1">
          {payload[0].value.toLocaleString()} kg CO₂e
        </p>
      </div>
    );
  }
  return null;
};

interface HistoryTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      date: string;
    };
  }>;
}

const HistoryTooltip = ({ active, payload }: HistoryTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0c1319] p-3 shadow-xl space-y-1">
        <p className="text-xs font-semibold text-gray-400">{payload[0].payload.date}</p>
        <p className="text-xs font-medium text-white flex justify-between gap-6">
          <span>Footprint:</span>
          <span className="font-extrabold text-red-400">{payload[0].value} tonnes</span>
        </p>
        <p className="text-xs font-medium text-white flex justify-between gap-6">
          <span>Score:</span>
          <span className="font-extrabold text-brand">{payload[1].value}/100</span>
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ assessment, history }: ChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-gray-500 font-semibold">
        Loading charts layout...
      </div>
    );
  }

  // Format Category Data for Pie Chart
  const pieData = [
    { name: "Transport", value: assessment.transportEmissions },
    { name: "Energy", value: assessment.energyEmissions },
    { name: "Diet", value: assessment.foodEmissions },
    { name: "Shopping", value: assessment.shoppingEmissions },
    { name: "Waste", value: assessment.wasteEmissions },
  ].filter((item) => item.value > 0);

  // Format History Data for Line Chart
  const lineData = history.map((item, index) => ({
    name: `Ass. ${index + 1}`,
    Footprint: Math.round(item.annualFootprint / 1000), // tonnes
    Score: item.carbonScore,
    date: new Date(item.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Category Pie Chart */}
      <div className="rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Category Breakdown</h3>
          <p className="text-xs text-gray-500 font-medium">Emission sharing of your lifestyle</p>
        </div>

        <div className="h-64 relative flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <span className="text-xs text-gray-500 font-semibold">No category metrics available</span>
          )}
        </div>
      </div>

      {/* Historical line chart */}
      <div className="rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Carbon Footprint Trend</h3>
          <p className="text-xs text-gray-500 font-medium">Footprint & Score over assessments</p>
        </div>

        <div className="h-64">
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="left"
                  label={{ value: 'tonnes', angle: -90, position: 'insideLeft', fill: '#4b5563', style: { fontSize: 10, fontWeight: 500 } }}
                />
                <YAxis
                  stroke="#4b5563"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                />
                <Tooltip content={<HistoryTooltip />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Footprint"
                  name="Footprint"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={{ r: 4, stroke: "#ef4444", strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Score"
                  name="Score"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 4, stroke: "#10b981", strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-500 font-semibold">
              Not enough data points yet. Complete assessments over time to track trends!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
