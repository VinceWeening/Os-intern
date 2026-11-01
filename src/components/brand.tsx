// The OS logo in black for light screens and white for dark screens.
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`brand-logo on-light ${className}`} src="/brand/os-logo-zwart.png" alt="OS Steakhouse" width={694} height={318} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`brand-logo on-dark ${className}`} src="/brand/os-logo-wit.png" alt="" aria-hidden="true" width={694} height={318} />
    </>
  );
}

export function Brand() {
  return <span className="brand"><BrandLogo /><span className="brand-divider" /><span className="brand-word">WERKPLEK</span></span>;
}
