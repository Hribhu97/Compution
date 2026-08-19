export default function WavyDivider({ flip = false, color = "fill-cream" }: { flip?: boolean; color?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-none ${flip ? "rotate-180" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-8 md:h-12">
        <path
          d="M0,30 C200,60 400,0 600,30 C800,60 1000,0 1200,30 L1200,60 L0,60 Z"
          className={color}
        />
      </svg>
    </div>
  );
}
