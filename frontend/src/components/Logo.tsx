export default function Logo() {
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: 30, height: 26 }}
      aria-hidden="true"
    >
      <span
        className="absolute bottom-0"
        style={{
          left: 4,
          width: 14,
          height: 22,
          background: 'var(--color-brass)',
          borderRadius: '3px 1px 1px 3px',
          transform: 'rotate(-7deg)',
          transformOrigin: 'bottom right',
        }}
      />
      <span
        className="absolute bottom-0"
        style={{
          right: 4,
          width: 14,
          height: 22,
          background: 'var(--color-ink)',
          borderRadius: '1px 3px 3px 1px',
          transform: 'rotate(7deg)',
          transformOrigin: 'bottom left',
        }}
      />
    </span>
  );
}
