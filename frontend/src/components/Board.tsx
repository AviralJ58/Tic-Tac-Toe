import { Cell } from '../types';
import CellComponent from './Cell';

interface BoardProps {
  board: Cell[];
  isMyTurn: boolean;
  isGameActive: boolean;
  onCellClick: (index: number) => void;
}

export default function Board({ board, isMyTurn, isGameActive, onCellClick }: BoardProps) {
  const isInteractive = isMyTurn && isGameActive;

  return (
    <div
      id="game-board"
      className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto"
    >
      {board.map((cell, index) => (
        <CellComponent
          key={index}
          value={cell}
          index={index}
          isInteractive={isInteractive}
          onClick={onCellClick}
        />
      ))}
    </div>
  );
}
