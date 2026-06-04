"use client";
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Sun, Moon,
  ChevronLeft, ChevronRight,
  Menu, X, LogOut, Wifi, WifiOff, Search, Settings,
  ChevronDown, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import versionData from '../../version.json';

/* ── Tipos ────────────────────────────────────────────────────── */
interface Lead { id: string; [key: string]: unknown }

interface SidebarProps {
  health:        { ok: boolean; googleMaps: boolean; supabase?: boolean } | null;
  theme:         'dark' | 'light';
  onToggleTheme: () => void;
  leads:         Lead[];
  onSave:        () => void;
  activeNav:     string;
  onNavChange:   (id: string) => void;
  username?:     string;
  onLogout?:     () => void;
  className?:    string;
}

/* ── Section header ──────────────────────────────────────────── */
function SectionHeader({
  icon, label, expanded, collapsed,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative w-full flex items-center overflow-hidden"
      style={{
        padding: collapsed ? '8px 0' : '7px 12px',
        gap: 8,
        borderRadius: 'var(--r2)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: 'var(--txt)',
        fontFamily: 'var(--fd)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        transition: 'background .15s',
        marginBottom: 2,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title={collapsed ? label : undefined}
    >
      <span style={{ color: 'var(--ac)', flexShrink: 0 }}>{icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
          <ChevronDown
            size={13}
            style={{
              color: 'var(--txt3)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform .2s ease',
              flexShrink: 0,
            }}
          />
        </>
      )}
      {collapsed && (
        <span className="sb-tooltip">{label}</span>
      )}
    </button>
  );
}

/* ── Nav sub-item ────────────────────────────────────────────── */
function NavItem({
  id, icon, label, soon, active, collapsed,
  onClick,
}: {
  id: string; icon: React.ReactNode; label: string;
  soon?: boolean; active?: boolean; collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center overflow-hidden"
      disabled={soon}
      style={{
        gap: 8,
        padding: collapsed ? '8px 0' : '7px 10px 7px 28px',
        borderRadius: 'var(--r2)',
        border: 'none',
        background: active ? 'var(--ac-tint)' : 'transparent',
        color: active ? 'var(--ac)' : 'var(--txt2)',
        fontFamily: 'var(--fb)',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        cursor: soon ? 'default' : 'pointer',
        opacity: soon ? .45 : 1,
        textAlign: 'left',
        transition: 'background .15s, color .15s',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => { if (!active && !soon) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = active ? 'var(--ac-tint)' : 'transparent' }}
      title={collapsed ? label : undefined}
    >
      <span style={{ color: active ? 'var(--ac)' : 'var(--txt3)', flexShrink: 0 }}>{icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1 }}>{label}</span>
          {soon && (
            <span style={{
              fontSize: '9px', fontFamily: 'var(--fm)',
              background: 'var(--bg4)', color: 'var(--txt3)',
              padding: '1px 6px', borderRadius: 'var(--r)',
              letterSpacing: '.04em',
            }}>SOON</span>
          )}
        </>
      )}
      {collapsed && <span className="sb-tooltip">{label}</span>}
    </button>
  );
}

/* ── Action sub-item ─────────────────────────────────────────── */
function ActionItem({
  id, icon, label, accent, collapsed,
  onClick,
}: {
  id: string; icon: React.ReactNode; label: string;
  accent?: boolean; collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full flex items-center overflow-hidden"
      style={{
        gap: 8,
        padding: collapsed ? '8px 0' : '7px 10px 7px 28px',
        borderRadius: 'var(--r2)',
        border: 'none',
        background: 'transparent',
        color: accent ? 'var(--ac)' : 'var(--txt2)',
        fontFamily: 'var(--fb)',
        fontSize: '13px',
        fontWeight: accent ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background .15s, color .15s',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      title={collapsed ? label : undefined}
    >
      <span style={{ color: accent ? 'var(--ac)' : 'var(--txt3)', flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
      {collapsed && <span className="sb-tooltip">{label}</span>}
    </button>
  );
}

/* ── Main sidebar ────────────────────────────────────────────── */
export function Sidebar({
  health, theme, onToggleTheme, leads,
  onSave,
  activeNav, onNavChange,
  username, onLogout,
  className = '',
}: SidebarProps) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({
    leads:    true,
    clientes: true,
    config:   false,
  });

  useEffect(() => {
    const fn = () => setIsOpen(window.innerWidth >= 768);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const toggleSection = (id: string) => {
    // When collapsed, expanding a section also uncolllapses the sidebar
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpanded(prev => ({ ...prev, [id]: true }));
    } else {
      setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    }
  };

  const handleAction = (id: string) => {
    if (id === 'save')  onSave();
    if (id === 'theme') onToggleTheme();
  };

  const serverOk     = health?.ok;
  const googleMapsOk = health?.googleMaps;
  const supabaseOk   = health?.supabase;
  const allOk        = serverOk && googleMapsOk && supabaseOk !== false;
  const statusClass  = !health ? 'warn' : !serverOk ? 'off' : allOk ? 'ok' : 'warn';
  const statusText   = !health            ? 'Conectando...'
    : !serverOk                           ? '⚠️ Servidor offline'
    : !googleMapsOk                       ? '⚠️ Sin API Key Google'
    : supabaseOk === false                ? '⚠️ Sin conexión DB'
    : supabaseOk                          ? '✓ Google Maps · Supabase'
    : '✓ Google Maps API';

  return (
    <>
      {/* ── Hamburger móvil */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed top-4 left-4 z-50 md:hidden flex items-center justify-center w-9 h-9"
        style={{ background: 'var(--bg2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r)', color: 'var(--txt2)', cursor: 'pointer' }}
        aria-label="Abrir menú"
      >
        {isOpen ? <X size={17}/> : <Menu size={17}/>}
      </button>

      {/* ── Overlay móvil */}
      {isOpen && (
        <div className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,.4)' }}
          onClick={() => setIsOpen(false)}/>
      )}

      {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'md:static md:z-auto md:translate-x-0 md:shrink-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'w-[68px]' : 'w-[248px]',
        'sidebar-wrap transition-[width] duration-250',
        className,
      )}>

        {/* ── Header: Logo ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bor2)' }}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.png"
                alt="Bleak's Solutions CRM"
                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
              />
              <div className="min-w-0">
                <div className="sb-brand-title" style={{ fontSize: 15 }}>
                  Bleak's Solutions
                </div>
                <div className="sb-brand-sub">CRM</div>
              </div>
            </div>
          ) : (
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6, margin: '0 auto', display: 'block' }}
            />
          )}
          <button
            onClick={() => setIsCollapsed(v => !v)}
            className="hidden md:flex items-center justify-center w-7 h-7 flex-shrink-0"
            style={{ background: 'transparent', border: 'none', borderRadius: 'var(--r)', color: 'var(--txt3)', cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label={isCollapsed ? 'Expandir' : 'Colapsar'}
          >
            {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        {/* ── Status badge ─────────────────────────────────────── */}
        {!isCollapsed && (
          <div className="px-4 pt-4">
            <div className={`sb-status-badge ${statusClass}`} style={{ fontFamily: 'var(--fb)' }}>
              {serverOk ? <Wifi size={13}/> : <WifiOff size={13}/>}
              {statusText}
            </div>
          </div>
        )}

        {/* ── Navegación ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">

          {/* ── LEADS ─────────────── */}
          <SectionHeader
            icon={<Users size={14}/>}
            label="Leads"
            expanded={expanded.leads}
            collapsed={isCollapsed}
            onToggle={() => toggleSection('leads')}
          />
          {expanded.leads && !isCollapsed && (
            <div className="mb-1">
              <NavItem
                id="dashboard" icon={<LayoutDashboard size={13}/>}
                label="Dashboard" collapsed={isCollapsed}
                active={activeNav === 'dashboard'}
                onClick={() => onNavChange('dashboard')}
              />
              <NavItem
                id="busqueda" icon={<Search size={13}/>}
                label="Búsqueda" collapsed={isCollapsed}
                active={activeNav === 'busqueda'}
                onClick={() => onNavChange('busqueda')}
              />
            </div>
          )}
          {isCollapsed && (
            <>
              <NavItem id="dashboard" icon={<LayoutDashboard size={14}/>} label="Dashboard" collapsed active={activeNav === 'dashboard'} onClick={() => onNavChange('dashboard')} />
              <NavItem id="busqueda"  icon={<Search size={14}/>}          label="Búsqueda"       collapsed active={activeNav === 'busqueda'}   onClick={() => onNavChange('busqueda')} />
            </>
          )}

          {/* ── CLIENTES ──────────── */}
          <SectionHeader
            icon={<Building2 size={14}/>}
            label="Clientes"
            expanded={expanded.clientes}
            collapsed={isCollapsed}
            onToggle={() => toggleSection('clientes')}
          />
          {expanded.clientes && !isCollapsed && (
            <div className="mb-1">
              <NavItem
                id="clientes" icon={<Building2 size={13}/>}
                label="Clientes" collapsed={isCollapsed}
                active={activeNav === 'clientes'}
                onClick={() => onNavChange('clientes')}
              />
            </div>
          )}
          {isCollapsed && (
            <NavItem id="clientes" icon={<Building2 size={14}/>} label="Clientes" collapsed active={activeNav === 'clientes'} onClick={() => onNavChange('clientes')} />
          )}

          {/* ── CONFIGURACIÓN ─────── */}
          <SectionHeader
            icon={<Settings size={14}/>}
            label="Configuración"
            expanded={expanded.config}
            collapsed={isCollapsed}
            onToggle={() => toggleSection('config')}
          />
          {expanded.config && !isCollapsed && (
            <div className="mb-1 px-3 py-3 rounded-[var(--r2)]" style={{ background: 'var(--bg3)' }}>
              <p style={{ fontSize: '12px', color: 'var(--txt3)', fontFamily: 'var(--fb)' }}>
                Próximamente
              </p>
            </div>
          )}
        </nav>

        {/* ── Footer: Perfil + Logout ───────────────────────────── */}
        <div className="flex-shrink-0 px-3 pb-4" style={{ borderTop: '1px solid var(--bor2)', paddingTop: '12px' }}>
          {!isCollapsed ? (
            <>
              <div className="sb-user-card mb-2">
                <div className="sb-avatar">{username ? username[0].toUpperCase() : 'U'}</div>
                <div className="min-w-0">
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username || 'Usuario'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--txt3)' }}>{leads.length} leads activos</div>
                </div>
              </div>
              <button
                onClick={() => handleAction('theme')}
                className="w-full flex items-center justify-center gap-1.5 font-semibold mb-2"
                style={{ color: 'var(--txt2)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '8px 12px', fontSize: '13px', background: 'transparent', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {theme === 'light' ? <Moon size={13}/> : <Sun size={13}/>}
                {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 font-semibold"
                style={{ color: 'var(--danger)', border: '1px solid var(--bor2)', borderRadius: 'var(--r2)', padding: '8px 12px', fontSize: '13px', background: 'transparent', cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.borderColor = 'transparent' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--bor2)' }}
              >
                <LogOut size={13}/>
                Cerrar sesión
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--txt3)', fontFamily: 'var(--fb)', letterSpacing: '0.05em' }}>
                v{versionData.version}
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="sb-avatar" style={{ cursor: 'default' }}>CD</div>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
