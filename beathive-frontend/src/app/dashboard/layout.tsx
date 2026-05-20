// src/app/dashboard/layout.tsx
// Sidebar sudah di AppSidebarWrapper (root layout) — tidak perlu sidebar lagi di sini
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
