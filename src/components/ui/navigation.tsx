"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { Menu, X, Leaf, Target, MessageSquare, Compass, BarChart2, ShieldAlert, User as UserIcon, LogOut, Sliders, Calendar } from "lucide-react";

export function Navigation() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // If user is not logged in, don't show internal navigation items
  const isLoggedIn = !!user;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
    { href: "/assessment", label: "Assessment", icon: Compass },
    { href: "/simulator", label: "Simulator", icon: Sliders },
    { href: "/coach", label: "AI Coach", icon: MessageSquare },
    { href: "/reports", label: "Reports", icon: Calendar },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/challenges", label: "Challenges", icon: ShieldAlert },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090d10]/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <div className="rounded-xl bg-brand/20 p-2 text-brand group-hover:bg-brand/35 transition-colors">
                <Leaf className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                CarbonWise
              </span>
            </Link>
          </div>

          {/* Desktop Nav — hidden while auth resolves to prevent flash */}
          {!loading && isLoggedIn && (
            <div className="hidden md:block animate-fade-in">
              <div className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-brand/10 text-brand font-semibold"
                          : "text-gray-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Action Area — suppressed during auth init to prevent flicker */}
          <div className="flex items-center gap-4">
            {loading ? (
              // Stable placeholder while Firebase resolves auth state
              <div className="h-8 w-24 rounded-xl bg-white/5 animate-pulse" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-4 animate-fade-in">
                {/* User Badges */}
                <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-200">
                  <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
                  Lvl {user!.level}
                  <span className="text-gray-400">|</span>
                  <span className="text-brand">{user!.points} XP</span>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex gap-2 animate-fade-in">
                <Link
                  href="/auth?mode=login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-background hover:bg-brand-light transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {!loading && isLoggedIn && (
              <div className="flex md:hidden">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="inline-flex items-center justify-center rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-none"
                >
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && isLoggedIn && (
        <div className="md:hidden border-t border-white/10 bg-[#090d10] px-2 py-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-red-400 hover:bg-red-500/5 transition-all text-left"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
