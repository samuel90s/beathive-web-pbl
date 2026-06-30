'use client';
import { API_URL as API } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartPoint = { label: string; value: number };
type RevenuePoint = { label: string; revenue: number; orders: number };
type UserGrowthPoint = { label: string; users: number };

interface Stats {
  users: number;
  activeUsers: number;
  retentionRate: number;
  sounds: number;
  pendingSounds: number;
  orders: number;
  activeSubscriptions: number;
  totalRevenue: number;
  charts?: {
    revenueByMonth: RevenuePoint[];
    usersByMonth: UserGrowthPoint[];
    orderStatus: ChartPoint[];
    reviewStatus: ChartPoint[];
    contentType: ChartPoint[];
    topCategories: ChartPoint[];
    featureUsage: ChartPoint[];
  };
}

const PIE_COLORS = ['#14b8a6', '#f7941d', '#ef4444', '#8b8fa8', '#22c55e', '#38bdf8'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

function EmptyChart() {
  return <div className="flex h-[220px] items-center justify-center text-sm text-[#6b6f82]">Belum ada data statistik.</div>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card rounded-xl border border-rim p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminDashboard() {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = accessToken || sessionStorage.getItem('accessToken');
    fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, [accessToken]);

  const cards = stats ? [
    { label: 'Total Users', value: stats.users.toLocaleString('id-ID'), color: 'text-teal' },
    { label: 'Active Users (30d)', value: stats.activeUsers.toLocaleString('id-ID'), color: 'text-emerald-400' },
    { label: 'Retention Rate (30d)', value: `${stats.retentionRate}%`, color: 'text-purple-400' },
    { label: 'Paid Orders', value: stats.orders.toLocaleString('id-ID'), color: 'text-accent-bright' },
    { label: 'Active Subscribers', value: stats.activeSubscriptions.toLocaleString('id-ID'), color: 'text-sky-400' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: 'text-green-400' },
  ] : [];

  const charts = stats?.charts;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-[#6b6f82] mt-0.5">Arsonus Platform Overview</p>
      </div>

      {!stats ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="card rounded-xl border border-rim p-5">
                <p className="mb-2 text-xs text-[#6b6f82]">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard title="Pertumbuhan User (6 Bulan)">
              {!charts?.usersByMonth?.length ? <EmptyChart /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.usersByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#252837" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip
                        contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }}
                        formatter={(value) => [value, 'User baru']}
                      />
                      <Area type="monotone" dataKey="users" stroke="#14b8a6" strokeWidth={2} fill="url(#usersFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Fitur Paling Banyak Dipakai">
              {!charts?.featureUsage?.length ? <EmptyChart /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.featureUsage} layout="vertical" margin={{ top: 8, right: 16, left: 30, bottom: 0 }}>
                      <CartesianGrid stroke="#252837" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <ChartCard title="Revenue Trend (6 Bulan)">
              {!charts?.revenueByMonth?.length ? <EmptyChart /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.revenueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f7941d" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#f7941d" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#252837" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatCompactCurrency} width={58} />
                      <Tooltip
                        contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }}
                        formatter={(value, name) => {
                          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                          return [name === 'revenue' ? formatCurrency(numericValue) : numericValue, name === 'revenue' ? 'Revenue' : 'Orders'];
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#f7941d" strokeWidth={2} fill="url(#revenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Order Status">
              {!charts?.orderStatus?.length ? <EmptyChart /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.orderStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#252837" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="value" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Komposisi Konten">
              {!charts?.contentType?.length ? <EmptyChart /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.contentType} dataKey="value" nameKey="label" innerRadius={58} outerRadius={90} paddingAngle={4}>
                        {charts.contentType.map((entry, index) => (
                          <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {charts.contentType.map((item, index) => (
                      <span key={item.label} className="inline-flex items-center gap-2 text-xs text-[#8b8fa8]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartCard title="Review Status Konten">
              {!charts?.reviewStatus?.length ? <EmptyChart /> : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.reviewStatus} layout="vertical" margin={{ top: 8, right: 16, left: 30, bottom: 0 }}>
                      <CartesianGrid stroke="#252837" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="value" fill="#f7941d" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Kategori Teratas">
              {!charts?.topCategories?.length ? <EmptyChart /> : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topCategories} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#252837" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fill: '#8b8fa8', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip contentStyle={{ background: '#111318', border: '1px solid #252837', borderRadius: 8, color: '#fff' }} />
                      <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}