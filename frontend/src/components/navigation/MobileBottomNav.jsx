const items = [
  { href: '#home', label: 'Home', icon: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /> },
  { href: '#explore', label: 'Explore', icon: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></> },
  { href: '#planner', label: 'Plan', icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" /></> },
  { href: '#trips', label: 'Saved', icon: <path d="M6 3h12v18l-6-4-6 4z" /> },
  { href: '#about', label: 'About', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
];

export default function MobileBottomNav({ page, signedIn }) {
  return <nav className="mobile-bottom-nav" aria-label="Quick navigation">
    {items.map(item => {
      const active = item.href === '#explore'
        ? page === 'explore' || page.startsWith('place/')
        : item.href === '#trips'
          ? ['trips', 'saved-places', 'profile'].includes(page)
          : page === item.href.slice(1);
      return <a key={item.href} href={item.href === '#trips' && !signedIn ? '#login' : item.href} aria-current={active ? 'page' : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
        <span>{item.label}</span>
      </a>;
    })}
  </nav>;
}
