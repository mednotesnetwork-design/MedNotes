import { Activity } from 'lucide-react';
export function AppLogo({ size = 38 }: { size?: number }) {
  return <span className="mednote-brand-symbol" style={{ width: size, height: Math.round(size * 1.08) }} aria-hidden="true"><Activity size={Math.round(size * .6)} strokeWidth={1.5}/></span>;
}
