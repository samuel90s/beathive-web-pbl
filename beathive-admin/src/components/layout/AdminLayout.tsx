'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/sounds',    icon: '♪', label: 'Sound Effects' },
  { href: '/users',     icon: '👤', label: 'Pengguna' },
  { href: '/orders',    icon: '🛒', label: 'Pesanan' },
  { href: '/categories',icon: '📁', label: 'Kategori' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-gray-900 text-white flex flex-col transition-all duration-200 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          {!collapsed && (
            <span className="text-lg font-semibold">
              beat<span className="text-violet-400">hive</span>
              <span className="ml-2 text-xs text-gray-400 font-normal">admin</span>
            </span>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors ml-auto">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}>
                <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-800">
          <Link href="http://localhost:3001" target="_blank"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <span className="w-5 text-center">↗</span>
            {!collapsed && 'Lihat Website'}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-semibold text-gray-700 capitalize">
            {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Admin'}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Admin</span>
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-semibold">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
