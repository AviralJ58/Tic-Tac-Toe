// Pure game rule functions
// Per AGENT_INIT.md § 3, these validate game state and determine outcomes

import { Cell } from '../types';

// Winning combinations (board positions 0-8 in 3x3 grid)
const WINNING_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

/**
 * Check if a player has won the game
 */
export function checkWinner(board: Cell[]): 'X' | 'O' | null {
    for (const combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a] as 'X' | 'O';
        }
    }
    return null;
}

/**
 * Check if the game is a draw (board full and no winner)
 */
export function isDraw(board: Cell[]): boolean {
    return board.every(cell => cell !== null) && !checkWinner(board);
}

/**
 * Check if the game is over (either won or draw)
 */
export function isGameOver(board: Cell[]): boolean {
    return checkWinner(board) !== null || isDraw(board);
}

/**
 * Determine the next player's turn (toggle between X and O)
 */
export function getNextTurn(currentTurn: 'X' | 'O'): 'X' | 'O' {
    return currentTurn === 'X' ? 'O' : 'X';
}