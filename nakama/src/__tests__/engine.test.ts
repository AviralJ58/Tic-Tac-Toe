/**
 * Unit tests for pure game engine logic
 * Run with: npx ts-node src/__tests__/engine.test.ts
 * Or compile and run with node
 */

import * as assert from 'assert';
import { createBoard, isValidMove, makeMove, getAvailableMoves, isBoardFull } from '../engine/board';
import { checkWinner, isDraw, isGameOver, getNextTurn } from '../engine/rules';
import { Cell } from '../types';

// Test helpers
let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void): void {
    try {
        fn();
        console.log(`✓ ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error}`);
        testsFailed++;
    }
}

// Board tests
console.log('\n=== Board Tests ===\n');

test('createBoard creates 9 empty cells', () => {
    const board = createBoard();
    assert.strictEqual(board.length, 9);
    assert.ok(board.every((cell) => cell === null));
});

test('isValidMove returns true for empty cell', () => {
    const board = createBoard();
    assert.ok(isValidMove(board, 0));
    assert.ok(isValidMove(board, 4));
    assert.ok(isValidMove(board, 8));
});

test('isValidMove returns false for out of bounds', () => {
    const board = createBoard();
    assert.ok(!isValidMove(board, -1));
    assert.ok(!isValidMove(board, 9));
    assert.ok(!isValidMove(board, 100));
});

test('isValidMove returns false for occupied cell', () => {
    const board = createBoard();
    board[0] = 'X';
    assert.ok(!isValidMove(board, 0));
});

test('makeMove applies move without error', () => {
    const board = createBoard();
    const newBoard = makeMove(board, 0, 'X');
    assert.strictEqual(newBoard[0], 'X');
    assert.deepStrictEqual(newBoard.slice(1), Array(8).fill(null));
});

test('makeMove throws on invalid position', () => {
    const board = createBoard();
    try {
        makeMove(board, -1, 'X');
        throw new Error('Should have thrown');
    } catch (error: any) {
        assert.ok(error.message.includes('Invalid move'));
    }
});

test('getAvailableMoves returns all positions initially', () => {
    const board = createBoard();
    const moves = getAvailableMoves(board);
    assert.deepStrictEqual(moves, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('getAvailableMoves excludes occupied cells', () => {
    const board = createBoard();
    board[0] = 'X';
    board[4] = 'O';
    const moves = getAvailableMoves(board);
    assert.ok(!moves.includes(0));
    assert.ok(!moves.includes(4));
    assert.ok(moves.includes(1));
});

test('isBoardFull returns false for empty board', () => {
    const board = createBoard();
    assert.ok(!isBoardFull(board));
});

test('isBoardFull returns true when all cells filled', () => {
    const board = Array(9).fill('X');
    assert.ok(isBoardFull(board));
});

// Rules tests
console.log('\n=== Rules Tests ===\n');

test('checkWinner detects row win', () => {
    const board = createBoard();
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    assert.strictEqual(checkWinner(board), 'X');
});

test('checkWinner detects column win', () => {
    const board = createBoard();
    board[0] = 'O';
    board[3] = 'O';
    board[6] = 'O';
    assert.strictEqual(checkWinner(board), 'O');
});

test('checkWinner detects diagonal win', () => {
    const board = createBoard();
    board[0] = 'X';
    board[4] = 'X';
    board[8] = 'X';
    assert.strictEqual(checkWinner(board), 'X');
});

test('checkWinner detects anti-diagonal win', () => {
    const board = createBoard();
    board[2] = 'O';
    board[4] = 'O';
    board[6] = 'O';
    assert.strictEqual(checkWinner(board), 'O');
});

test('checkWinner returns null for no winner', () => {
    const board = createBoard();
    board[0] = 'X';
    board[1] = 'O';
    assert.strictEqual(checkWinner(board), null);
});

test('isDraw returns true for full board with no winner', () => {
    const board: Cell[] = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
    ] as Cell[];
    assert.ok(isDraw(board));
});

test('isDraw returns false for empty board', () => {
    const board = createBoard();
    assert.ok(!isDraw(board));
});

test('isDraw returns false if winner exists', () => {
    const board = createBoard();
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    board[3] = 'O';
    board[4] = 'O';
    board[5] = 'O';
    board[6] = 'O';
    board[7] = 'X';
    board[8] = 'O';
    assert.ok(!isDraw(board)); // X won
});

test('isGameOver returns true for winner', () => {
    const board = createBoard();
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    assert.ok(isGameOver(board));
});

test('isGameOver returns true for draw', () => {
    const board: Cell[] = [
        'X', 'O', 'X',
        'O', 'X', 'O',
        'O', 'X', 'O'
    ] as Cell[];
    assert.ok(isGameOver(board));
});

test('isGameOver returns false for ongoing game', () => {
    const board = createBoard();
    board[0] = 'X';
    assert.ok(!isGameOver(board));
});

// Turn tests
console.log('\n=== Turn Tests ===\n');

test('getNextTurn switches X to O', () => {
    assert.strictEqual(getNextTurn('X'), 'O');
});

test('getNextTurn switches O to X', () => {
    assert.strictEqual(getNextTurn('O'), 'X');
});

// Summary
console.log('\n=== Summary ===\n');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
    process.exit(1);
}
