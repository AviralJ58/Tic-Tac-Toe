// Pure game engine functions for board manipulation
// Per AGENT_INIT.md § 3, these are testable functions with no side effects

import { Cell } from '../types';

/**
 * Create an empty 3x3 board (9 cells, all null)
 */
export function createBoard(): Cell[] {
    return Array(9).fill(null);
}

/**
 * Check if a move at the given position is valid (cell must be empty)
 */
export function isValidMove(board: Cell[], position: number): boolean {
    if (position < 0 || position >= 9) {
        return false;
    }
    return board[position] === null;
}

/**
 * Apply a move to the board. Returns a new board (immutable).
 */
export function makeMove(board: Cell[], position: number, symbol: 'X' | 'O'): Cell[] {
    if (!isValidMove(board, position)) {
        throw new Error(`Invalid move at position ${position}`);
    }
    const newBoard = [...board];
    newBoard[position] = symbol;
    return newBoard;
}

/**
 * Get all empty cell positions on the board
 */
export function getAvailableMoves(board: Cell[]): number[] {
    return board
        .map((cell, index) => (cell === null ? index : -1))
        .filter(index => index !== -1);
}

/**
 * Check if the board is full
 */
export function isBoardFull(board: Cell[]): boolean {
    return board.every(cell => cell !== null);
}