import './sidebar.css'

type SidebarIconName = 'quizzes' | 'create' | 'results' | 'users' | 'join' | 'logout'
const paths: Record<SidebarIconName, string> = {
  quizzes: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  create: 'M12 3v18 M3 12h18',
  results: 'M4 20h16 M6 16V9 M12 16V4 M18 16v-5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  join: 'M14 3h6v18h-6 M3 12h12 M10 7l5 5-5 5',
  logout: 'M10 3H4v18h6 M10 12h11 M17 8l4 4-4 4',
}

export function SidebarIcon({ name }: { name: SidebarIconName }) {
  return <svg className="sidebar-icon" data-icon={name} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>
}
