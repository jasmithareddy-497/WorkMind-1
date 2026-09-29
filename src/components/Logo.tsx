import { BrainCircuit } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 'w-7 h-7', text: 'text-lg', subtitle: 'text-[10px]' },
  md: { icon: 'w-9 h-9', text: 'text-xl', subtitle: 'text-xs' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl', subtitle: 'text-sm' },
};

export function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`${s.icon} rounded-xl bg-gradient-to-br from-brand-400 to-sky-500 flex items-center justify-center shadow-lg shadow-brand-500/20`}>
          <BrainCircuit className="w-1/2 h-1/2 text-slate-950" strokeWidth={2.5} />
        </div>
        <div className={`absolute inset-0 ${s.icon} rounded-xl bg-brand-400/30 blur-md -z-10`} />
      </div>
      <div>
        <div className={`${s.text} font-bold text-white tracking-tight leading-none`}>WorkMind</div>
        <div className={`${s.subtitle} text-slate-400 font-medium tracking-wide mt-0.5`}>
          AI that learns how you work
        </div>
      </div>
    </div>
  );
}
