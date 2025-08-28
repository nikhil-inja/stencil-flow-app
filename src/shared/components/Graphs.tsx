import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  LabelList,
} from 'recharts';

type DataPoint = {
  /** Label for the x-axis bucket (e.g., time, date, release, etc.) */
  label: string;
  /** Total executions in this bucket (integer) */
  totalRuns: number;
  /** Success percentage (0–100) for this bucket from the backend */
  successPct: number;
};

type GraphsProps = {
  /** Array of buckets; order is the intended x-axis order */
  data: DataPoint[];
  /** Optional title above the chart */
  title?: string;
  /** Optional height in pixels (default 360) */
  height?: number;
  /** Optional: show data labels on bars (default true) */
  showBarLabels?: boolean;
};

// Custom tooltip component
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: DataPoint & { successCount: number; failedCount: number };
  }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const { totalRuns, successCount, failedCount, successPct } = data;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      <div className="space-y-1 text-gray-700">
        <p>Total Runs: <span className="font-medium">{totalRuns}</span></p>
        <p>Success: <span className="font-medium text-green-600">{successCount}</span></p>
        <p>Failed: <span className="font-medium text-red-600">{failedCount}</span></p>
        <p>Success Rate: <span className="font-medium text-blue-600">{successPct.toFixed(1)}%</span></p>
      </div>
    </div>
  );
};

// Custom legend component
const CustomLegend: React.FC<{ payload?: Array<{ value: string; color: string }> }> = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex items-center justify-center space-x-6 text-sm">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const Graphs: React.FC<GraphsProps> = ({
  data,
  title,
  height = 360,
  showBarLabels = true,
}) => {
  // Compute derived data with useMemo for performance
  const chartData = useMemo(() => {
    return data.map((point) => {
      // Clamp and validate success percentage to prevent invalid counts
      const clampedSuccessPct = Math.max(0, Math.min(100, point.successPct));
      const successCount = Math.round(point.totalRuns * (clampedSuccessPct / 100));
      const failedCount = Math.max(0, point.totalRuns - successCount);
      
      return {
        ...point,
        successCount,
        failedCount,
        successPct: clampedSuccessPct,
      };
    });
  }, [data]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-lg font-medium">No data to display</p>
          <p className="text-gray-400 text-sm">Add some data to see your execution metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            
            {/* X-Axis */}
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickMargin={8}
            />
            
            {/* Left Y-Axis - Counts */}
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickMargin={8}
              tickFormatter={(value) => Math.round(value).toString()}
            />
            
            {/* Right Y-Axis - Percentage */}
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickMargin={8}
              tickFormatter={(value) => `${Math.round(value)}%`}
              domain={[0, 100]}
            />
            
            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Legend */}
            <Legend content={<CustomLegend />} />
            
            {/* Stacked Bars */}
            <Bar
              dataKey="successCount"
              name="Success"
              yAxisId="left"
              stackId="a"
              fill="#10b981"
              stroke="#059669"
              strokeWidth={1}
              radius={[0, 0, 4, 4]}
            >
              {showBarLabels && (
                <LabelList
                  dataKey="successCount"
                  position="center"
                  formatter={(value: number) => value > 0 ? value : ''}
                  style={{ fontSize: 10, fill: '#ffffff', fontWeight: 'bold' }}
                />
              )}
            </Bar>
            <Bar
              dataKey="failedCount"
              name="Failed"
              yAxisId="left"
              stackId="a"
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
            >
              {showBarLabels && (
                <LabelList
                  dataKey="failedCount"
                  position="center"
                  formatter={(value: number) => value > 0 ? value : ''}
                  style={{ fontSize: 10, fill: '#ffffff', fontWeight: 'bold' }}
                />
              )}
            </Bar>
            
            {/* Success Percentage Line */}
            <Line
              type="monotone"
              dataKey="successPct"
              name="Success %"
              yAxisId="right"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Graphs;

// Example (dev-only)
const SAMPLE: DataPoint[] = [
  { label: "10:00", totalRuns: 120, successPct: 91.7 },
  { label: "11:00", totalRuns: 80,  successPct: 75.0 },
  { label: "12:00", totalRuns: 150, successPct: 66.0 },
  { label: "13:00", totalRuns: 200, successPct: 98.0 },
];

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _DevPreview = () => (
    <div className="p-6">
      <Graphs title="Execution Health" data={SAMPLE} />
    </div>
  );
}
