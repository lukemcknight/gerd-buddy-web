import { cn } from '@/lib/utils';

interface SeveritySliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const severityLabels = ['None', 'Mild', 'Light', 'Moderate', 'Severe', 'Intense'];
const severityEmojis = ['😊', '😐', '😕', '😣', '😖', '😫'];

export const SeveritySlider = ({ value, onChange, className }: SeveritySliderProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Severity</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{severityEmojis[value]}</span>
          <span className={cn(
            'font-semibold',
            value <= 1 ? 'text-success' :
            value <= 3 ? 'text-warning' :
            'text-accent'
          )}>
            {severityLabels[value]}
          </span>
        </div>
      </div>
      
      <div className="relative pt-1">
        <input
          type="range"
          min="0"
          max="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer bg-muted
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              hsl(var(--success)) 0%, 
              hsl(var(--warning)) 50%, 
              hsl(var(--accent)) 100%)`
          }}
        />
        <div className="flex justify-between mt-2 px-1">
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => onChange(num)}
              className={cn(
                'w-6 h-6 rounded-full text-xs font-medium transition-all',
                value === num 
                  ? 'bg-primary text-primary-foreground scale-110' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
