export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9 21c2-6 5-9 7-9s3 2 7 9" stroke="var(--accent-fg)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="9" r="2.2" fill="var(--accent-fg)" />
    </svg>
  );
}
