export default function BotanicalAccent({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={`w-16 h-16 opacity-20 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M40 5 C40 5 20 25 20 45 C20 55 28 65 40 70 C52 65 60 55 60 45 C60 25 40 5 40 5Z"
        fill="currentColor"
        className="text-olive"
      />
      <path
        d="M40 70 L40 78 M35 75 L40 78 L45 75"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-olive"
      />
      <ellipse cx="30" cy="35" rx="8" ry="4" fill="currentColor" className="text-olive" transform="rotate(-30 30 35)" />
      <ellipse cx="50" cy="35" rx="8" ry="4" fill="currentColor" className="text-olive" transform="rotate(30 50 35)" />
    </svg>
  );
}
