'use client';
// Navigation bar and the full-screen menu drawer. While the drawer is open, page content is inert, focus stays inside
// the menu, and Escape closes it. Navigating closes it too.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nav, site } from '@/content/site';
import { Wordmark, pad } from './ui';

const isCurrent = (href: string, path: string) => href === path || (href !== '/' && path.startsWith(href + '/'));

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // menu expanded
  const [shown, setShown] = useState(false); // drawer not hidden (stays shown while the close transition runs)
  const [entered, setEntered] = useState(false); // .open class, added a frame after the drawer is shown so it animates
  const [lastPath, setLastPath] = useState(pathname);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (pathname !== lastPath) {
    // Route changed: close immediately, as a full page load did before.
    setLastPath(pathname);
    setOpen(false); setEntered(false); setShown(false);
  }

  const setDrawer = useCallback((next: boolean, restoreFocus = true) => {
    clearTimeout(hideTimer.current);
    setOpen(next);
    if (next) { setShown(true); return; }
    setEntered(false);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    hideTimer.current = setTimeout(() => setShown(false), reduce ? 0 : 700);
    if (restoreFocus) menuRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener('scroll', onScroll); clearTimeout(hideTimer.current); };
  }, []);

  useEffect(() => {
    if (!open || !shown) return;
    const raf = requestAnimationFrame(() => {
      setEntered(true);
      drawerRef.current?.querySelector('a')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, shown]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    const outside = [document.querySelector('main'), document.querySelector('.p-foot'), document.querySelector('.skip')];
    for (const el of outside) if (el instanceof HTMLElement) el.inert = open;
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setDrawer(false); return; }
      if (e.key !== 'Tab') return;
      // Keep focus inside the open menu (the toggle button plus the drawer links).
      const items: HTMLElement[] = [menuRef.current!, ...drawerRef.current!.querySelectorAll('a')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setDrawer]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`p-nav${scrolled ? ' scrolled' : ''}`} id="nav">
        <nav className="nav-quick p-mono" aria-label="Primary">
          {nav.slice(0, 4).map(n => <Link key={n.href} href={n.href} aria-current={isCurrent(n.href, pathname) ? 'page' : undefined}>{n.label}</Link>)}
        </nav>
        <Wordmark eager />
        <div className="nav-end">
          <Link className="p-cta sm nav-cta" href="/contact">Book a consultation</Link>
          <button ref={menuRef} className="p-menu" type="button" aria-expanded={open} aria-controls="drawer" onClick={() => setDrawer(!open)}>
            <span>{open ? 'Close' : 'Menu'}</span><i aria-hidden="true" />
          </button>
        </div>
      </header>
      <div ref={drawerRef} className={`p-drawer${entered ? ' open' : ''}`} id="drawer" hidden={!shown}>
        <nav aria-label="Site">
          <ul className="drawer-main">
            {nav.map((n, i) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isCurrent(n.href, pathname) ? 'page' : undefined} onClick={() => setDrawer(false, false)}>
                  <small aria-hidden="true">{pad(i + 1)}</small>{n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="drawer-sub p-mono">
            <a href={`mailto:${site.email}`}>{site.email}</a><span>{site.location.primary}</span>
          </div>
        </nav>
      </div>
    </>
  );
}
