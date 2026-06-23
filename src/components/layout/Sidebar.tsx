"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard",          icon: "⚡", label: "Dashboard"           },
  { href: "/campaigns",          icon: "🏆", label: "Campaigns"           },
  { href: "/calendar",           icon: "📅", label: "Lịch Tuần"           },
  { href: "/tracker",            icon: "📋", label: "Content Tracker"     },
  { href: "/bookings",           icon: "🔒", label: "Booking Tài nguyên"  },
  { href: "/bookings/settings",  icon: "⚙️", label: "Thiết Lập Tài Nguyên"},
  { href: "/kpis",               icon: "📊", label: "KPI Teams"           },
  { href: "/conflicts",          icon: "⚠️", label: "Conflict Check"      },
  { href: "/users",              icon: "👥", label: "Quản lý Users"       },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();

  const allowedTabs = userProfile?.allowedTabs || [];
  const filteredNav = NAV.filter(item => {
    if (userProfile?.role === "campaign_lead") return true; // Admin luôn thấy tất cả
    return allowedTabs.includes(item.href);
  });

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col shadow-xl z-40"
      style={{ background: BRAND.navy }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm tracking-widest flex-shrink-0"
          style={{ background: BRAND.red }}
        >
          PV
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">Campaign Hub</div>
          <div className="text-slate-400 text-xs">Phong Vũ Marketing</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {filteredNav.map(item => {
          const active =
            item.href === "/bookings"
              ? pathname === "/bookings"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all mb-0.5",
                active
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/8"
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
              {active && (
                <div
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ background: BRAND.red }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.[0] ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.displayName}</div>
              <div className="text-slate-400 text-xs truncate">{user.email}</div>
            </div>
            <button
              onClick={signOut}
              className="text-slate-400 hover:text-white text-xs p-1 rounded"
              title="Đăng xuất"
            >
              ⎋
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
