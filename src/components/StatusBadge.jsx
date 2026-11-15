export default function StatusBadge({ tone = 'idle', children, big = false }) {
  return <span className={`badge badge-${tone}${big ? ' badge-big' : ''}`}>{children}</span>
}
