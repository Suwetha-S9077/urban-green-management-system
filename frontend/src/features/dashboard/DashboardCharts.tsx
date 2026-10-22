
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardChartsProps {
  status: {
    count1: number;
    count0: number;
    countNull: number;
    countOther?: number;
  };
  topSpecies: {
    treeName: string;
    count: number;
  }[];
  topWards: {
    wardNumber: string;
    count: number;
  }[];
}

const STATUS_COLORS = ['#059669', '#f59e0b', '#94a3b8', '#64748b'];

const chartTooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 25px rgba(15, 23, 42, 0.08)',
};

export function DashboardCharts({
  status,
  topSpecies,
  topWards,
}: DashboardChartsProps) {
  const statusData = [
    { name: 'Status 1', value: status.count1 },
    { name: 'Status 0', value: status.count0 },
    { name: 'Missing', value: status.countNull },
    ...(status.countOther
      ? [{ name: 'Other', value: status.countOther }]
      : []),
  ].filter((item) => item.value > 0);

  const speciesData = topSpecies.slice(0, 8);
  const wardData = topWards.slice(0, 8);

  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Tree census
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">
            Status distribution
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Breakdown of recorded tree status values
          </p>
        </div>

        <div className="relative h-72">
          {totalStatus > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={4}
                    stroke="none"
                    cornerRadius={5}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [
                      Number(value).toLocaleString('en-IN'),
                      'Records',
                    ]}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-7">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">
                    {totalStatus.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-slate-500">Records</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No status data available
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Species analysis
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">
            Top tree categories
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Most frequently recorded tree names
          </p>
        </div>

        <div className="h-72">
          {speciesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={speciesData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="treeName"
                  width={105}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [
                    Number(value).toLocaleString('en-IN'),
                    'Trees',
                  ]}
                />
                <Bar
                  dataKey="count"
                  name="Trees"
                  fill="#059669"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No species data available
            </div>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Geographic coverage
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900">
              Ward-wise tree records
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Wards with the highest recorded tree counts
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            Top {wardData.length} wards
          </span>
        </div>

        <div className="h-80">
          {wardData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wardData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="wardNumber"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(value) => `Ward ${value}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(value) => `Ward ${value}`}
                  formatter={(value) => [
                    Number(value).toLocaleString('en-IN'),
                    'Tree records',
                  ]}
                />
                <Bar
                  dataKey="count"
                  name="Tree records"
                  fill="#65a30d"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No ward data available
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
