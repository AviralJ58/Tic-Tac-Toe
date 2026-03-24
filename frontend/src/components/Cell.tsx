import { Cell } from '../types';

interface CellProps {
  value: Cell;
  index: number;
  isInteractive: boolean;
  onClick: (index: number) => void;
}

export default function CellComponent({ value, index, isInteractive, onClick }: CellProps) {
  const symbolClass = value === 'X' ? 'cell-x' : value === 'O' ? 'cell-o' : '';

  return (
    <button
      id={`cell-${index}`}
      className={`cell ${symbolClass} ${isInteractive && !value ? 'cell-interactive' : ''}`}
      onClick={() => isInteractive && !value && onClick(index)}
      disabled={!isInteractive || !!value}
      aria-label={`Cell ${index}: ${value || 'empty'}`}
    >
      {value && (
        <span className="animate-bounce-in">{value}</span>
      )}
    </button>
  );
}
