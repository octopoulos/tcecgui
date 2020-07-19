// chess-wasm.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-18
//
/*
globals
beforeAll, beforeEach, describe, expect, require, test
*/
'use strict';

let Module = require('./chess-wasm.js'),
    {IsString, Keys, Undefined} = require('./common'),
    {get_move_ply} = require('./global');

let chess,
    EMPTY = -1,
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe('chess.wasm', () => {
beforeAll(async () => {
    let instance = await Module();
    chess = new instance.Chess();
});
beforeEach(() => {
    chess.reset();
});

// anToSquare
[
    ['a8', 0],
    ['h8', 7],
    ['i8', 8],
    ['d5', 51],
    ['a0', 128],
    ['a1', 112],
    ['h1', 119],
].forEach(([an, answer], id) => {
    test(`anToSquare:${id}`, () => {
        expect(chess.anToSquare(an)).toEqual(answer);
    });
});

// attacked
[
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', 0, 97, true],
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', 1, 97, true],
    ['8/8/8/8/8/2k5/1K6/8 b - - 1 1', 1, 97, true],
    ['8/8/8/8/8/2k5/1K6/8 b - - 1 1', 0, 82, true],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', 1, 37, true],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', 1, 39, false],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', 0, 53, true],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', 1, 97, false],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/1Kq5/8 w - - 1 43', 1, 97, true],
].forEach(([fen, color, square, answer], id) => {
    test(`attacked:${id}`, () => {
        chess.load(fen);
        expect(chess.attacked(color, square)).toEqual(answer);
    });
});

// board
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', 128, {127: 0}],
    ['8/8/8/8/8/8/8/4K3 w - - 0 1', 128, {116: 6, 127: 0}],
].forEach(([fen, answer, dico], id) => {
    test(`board:${id}`, () => {
        chess.load(fen);
        answer = new Uint8Array(answer);
        Keys(dico).forEach(key => {
            answer[key] = dico[key];
        });
        expect(chess.board()).toEqual(answer);
    });
});

// castling
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', [-1, -1, -1, -1]],
    [START_FEN, [119, 112, 7, 0]],
    ['qnnbbrkr/pppppppp/8/8/8/8/PPPPPPPP/QNNBBRKR w HFhf - 0 1', [119, 117, 7, 5]],
    ['q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7', [119, 117, 7, 5]],
    ['rnkrnbbq/pppppppp/8/8/8/8/PPPPPPPP/RNKRNBBQ w DAda - 0 1', [115, 112, 3, 0]],
    ['bbrknqrn/pppppppp/8/8/8/8/PPPPPPPP/BBRKNQRN w GCgc - 0 1', [118, 114, 6, 2]],
].forEach(([fen, answer], id) => {
    test(`castling:${id}`, () => {
        chess.load(fen);
        answer = new Int32Array(answer);
        expect(chess.castling()).toEqual(answer);
    });
});

// checked
[
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', false],
    ['8/8/8/8/8/2k5/1K6/8 b - - 1 1', true],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', false],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/1Kq5/8 w - - 1 43', true],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/2q5/K7 b - - 2 43', false],
].forEach(([fen, answer], id) => {
    test(`checked:${id}`, () => {
        chess.load(fen);
        expect(chess.checked()).toEqual(answer);
    });
});

// cleanSan
[
    ['', ''],
    ['O-O-O+', 'O-O-O'],
    ['a8=Q!', 'a8Q'],
    ['bxc3??!', 'bxc3'],
    ['d2d4', 'd2d4'],
    ['Nxd6#', 'Nxd6'],
].forEach(([san, answer], id) => {
    test(`cleanSan:${id}`, () => {
        expect(chess.cleanSan(san)).toEqual(answer);
    });
});

// clear
[
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', '8/8/8/8/8/8/8/8 w - - 0 1'],
].forEach(([fen, answer], id) => {
    test(`clear:${id}`, () => {
        chess.load(fen);
        chess.clear();
        expect(chess.fen()).toEqual(answer);
    });
});

// currentFen
[
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', undefined],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1',
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
    ],
].forEach(([fen, answer], id) => {
    test(`currentFen:${id}`, () => {
        chess.load(fen);
        expect(chess.currentFen()).toEqual(Undefined(answer, fen));
    });
});

// fen
[
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1',
        [],
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        ['O-O'],
        'rbq2rk1/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R w KQ - 3 11',
    ],
    [START_FEN, [], undefined],
    [START_FEN, ['e4'], 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, ['e4', 'e5'], 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'],
    [
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w GDgd - 1 11',
        ['Rc1'],
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B1R1KBR1 b Ggd - 2 11',
    ],
    [
        'r1bqk2r/1P3ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R w KQkq - 0 14',
        ['bxa8=Q'],
        'Q1bqk2r/5ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R b KQk - 0 14',
    ],
    ['qnnbbrkr/pppppppp/8/8/8/8/PPPPPPPP/QNNBBRKR w HFhf - 0 1', [], undefined],
    ['rnkrnbbq/pppppppp/8/8/8/8/PPPPPPPP/RNKRNBBQ w DAda - 0 1', [], undefined],
    ['bbrknqrn/pppppppp/8/8/8/8/PPPPPPPP/BBRKNQRN w GCgc - 0 1', [], undefined],
    ['rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', [], undefined],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        ['e4'],
        'rknrbqnb/pppppppp/8/8/4P3/8/PPPP1PPP/RKNRBQNB b DAda e3 0 1',
    ],
].forEach(([fen, moves, answer], id) => {
    test(`fen:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.moveSan(move, false, false);
        expect(chess.fen()).toEqual(Undefined(answer, fen));
    });
});

// load
[
    [START_FEN, [], undefined, START_FEN],
    [START_FEN, ['d5'], undefined, START_FEN],
    [START_FEN, ['d4'], undefined, 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'],
    [START_FEN, ['d4', 'd5'], undefined, 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        ['O-O'],
        undefined,
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 b kq - 1 1',
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        ['O-O-O'],
        undefined,
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/2KR3R b kq - 1 1',
    ],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1',
        [],
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
    ],
].forEach(([fen, moves, answer, new_fen], id) => {
    test(`load:${id}`, () => {
        expect(chess.load(fen)).toEqual(Undefined(answer, fen));
        for (let move of moves)
            chess.moveSan(move, false, false);
        expect(chess.fen()).toEqual(new_fen);
    });
});

// moveObject
[
    [
        START_FEN,
        {capture: 0, fen: '', flags: 0, from: 97, m: '', piece: 0, ply: -1, promote: 0, to: 65},
        false,
        {capture: 0, fen: '', flags: 4, from: 97, m: 'b4', piece: 1, ply: 0, promote: 0, to: 65},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        {capture: 0, fen: '', flags: 0, from: 6, m: '', piece: 0, ply: -1, promote: 0, to: 5},
        true,
        {capture: 0, fen: '', flags: 64, from: 6, m: 'O-O-O', piece: 14, ply: 13, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        {capture: 0, fen: '', flags: 0, from: 6, m: '', piece: 0, ply: -1, promote: 0, to: 7},
        true,
        {capture: 0, fen: '', flags: 32, from: 6, m: 'O-O', piece: 14, ply: 15, promote: 0, to: 7},
    ],
].forEach(([fen, move, frc, answer], id) => {
    test(`moveObject:${id}`, () => {
        chess.load(fen);
        expect(chess.moveObject(move, frc)).toEqual(answer);
    });
});

// moves
[
    [START_FEN, [false, false, EMPTY], 20, []],
    ['7k/8/8/8/8/8/8/K7 w - - 0 1', [false, false, EMPTY], 3, []],
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', [false, false, EMPTY], 3, []],
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', [false, true, EMPTY], 2, []],
    ['8/8/5k2/8/2K5/8/8/8 w - - 0 1', [false, false, EMPTY], 8, []],
    ['8/8/8/3Q4/8/2k5/8/K7 w - - 0 1', [false, false, EMPTY], 30, []],
    ['8/8/8/3Q4/8/2k5/8/K7 b - - 0 1', [false, false, EMPTY], 8, []],
    ['8/8/8/3Q4/8/2k5/8/K7 b - - 0 1', [false, true, EMPTY], 2, []],
    [
        '4k2r/7p/8/8/8/8/7P/4K2R w Kk - 0 20',
        [false, false, EMPTY],
        10,
        [{capture: 0, fen: '', flags: 32, from: 116, m: '', piece: 6, ply: 38, promote: 0, to: 118}],
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        [false, false, EMPTY],
        25,
        [{capture: 0, fen: '', flags: 32, from: 116, m: '', piece: 6, ply: 0, promote: 0, to: 118}],
    ],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', [false, false, EMPTY], 47, []],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        [true, false, EMPTY],
        47,
        [
            {capture: 0, fen: '', flags: 32, from: 115, m: '', piece: 6, ply: 38, promote: 0, to: 119},
        ],
    ],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/5P2/1P1Np3/2QP1NPP/B1R1KBR1 w Qq - 0 12', [false, false, EMPTY], 36, []],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20',
        [false, false, EMPTY],
        48,
        [
            {capture: 0, fen: '', flags: 32, from: 115, m: '', piece: 6, ply: 38, promote: 0, to: 119},
            {capture: 0, fen: '', flags: 64, from: 115, m: '', piece: 6, ply: 38, promote: 0, to: 113},
        ],
    ],
].forEach(([fen, options, number, answer], id) => {
    test(`moves:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(options[0], options[1], options[2]);
        moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
        expect(moves.length).toEqual(number);
        for (let item of answer)
            expect(moves).toContainEqual(item);
    });
});

// moveSan
[
    [
        START_FEN,
        'd5',
        [false, false],
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
    [
        START_FEN,
        'd4',
        [false, false],
        {capture: 0, fen: '', flags: 4, from: 99, m: 'd4', piece: 1, ply: 0, promote: 0, to: 67},
    ],
    [
        START_FEN,
        'b2b4',
        [false, false],
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O',
        [false, false],
        {capture: 0, fen: '', flags: 32, from: 116, m: 'O-O', piece: 6, ply: 0, promote: 0, to: 118},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O-O',
        [false, false],
        {capture: 0, fen: '', flags: 64, from: 116, m: 'O-O-O', piece: 6, ply: 0, promote: 0, to: 114},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        [false, false],
        {capture: 0, fen: '', flags: 32, from: 3, m: 'O-O', piece: 14, ply: 19, promote: 0, to: 7},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        [true, false],
        {capture: 0, fen: '', flags: 32, from: 3, m: 'O-O', piece: 14, ply: 19, promote: 0, to: 7},
    ],
    [
        'brqnn1kr/ppppppbp/6p1/8/8/6P1/PPPPPPBP/BRQNN1KR w KQkq - 2 3',
        'O-O',
        [true, false],
        {capture: 0, fen: '', flags: 32, from: 118, m: 'O-O', piece: 6, ply: 4, promote: 0, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        'O-O',
        [true, false],
        {capture: 0, fen: '', flags: 32, from: 115, m: 'O-O', piece: 6, ply: 38, promote: 0, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20',
        'O-O-O',
        [true, false],
        {capture: 0, fen: '', flags: 64, from: 115, m: 'O-O-O', piece: 6, ply: 38, promote: 0, to: 113},
    ],
    [
        '4k1r1/p2rbpp1/1q2p1n1/2pb3p/5P1P/1PB1P1P1/2Q1BN2/R3K1R1 w Gg - 2 21',
        'O-O',
        [true, false],
        {capture: 0, fen: '', flags: 32, from: 116, m: 'O-O', piece: 6, ply: 40, promote: 0, to: 118},
    ],
    [
        'rk2r3/1pp4p/p5bQ/P2q4/2R4P/1PB1p3/2P5/1K2R3 b q - 2 34',
        'O-O-O',
        [true, false],
        {capture: 0, fen: '', flags: 64, from: 1, m: 'O-O-O', piece: 14, ply: 67, promote: 0, to: 0},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=Q',
        [false, false],
        {capture: 0, fen: '', flags: 17, from: 19, m: 'd8=Q', piece: 1, ply: 50, promote: 5, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        [false, false],
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'axb1=Q',
        [false, false],
        {capture: 4, fen: '', flags: 18, from: 96, m: 'axb1=Q', piece: 9, ply: 51, promote: 5, to: 113},
    ],
    [
        'r2r2k1/pp4pp/2pN1pb1/8/5P2/6P1/PP2P1NP/R2K3R w KQ - 0 16',
        'O-O-O',
        [true, false],
        {capture: 0, fen: '', flags: 64, from: 115, m: 'O-O-O', piece: 6, ply: 30, promote: 0, to: 112},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'O-O-O',
        [true, false],
        {capture: 0, fen: '', flags: 64, from: 6, m: 'O-O-O', piece: 14, ply: 13, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'O-O',
        [true, false],
        {capture: 0, fen: '', flags: 32, from: 6, m: 'O-O', piece: 14, ply: 15, promote: 0, to: 7},
    ],
].forEach(([fen, move, options, answer], id) => {
    test(`moveSan:${id}`, () => {
        chess.load(fen);
        let result = chess.moveSan(move, options[0], options[1]);
        expect(result).toEqual(answer);
        if (result.piece)
            expect(get_move_ply({fen: fen}) + 1).toEqual(result.ply);
    });
});

// moveToSan
[
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        {capture: 0, fen: '', flags: 0, from: 6, m: '', piece: 10, ply: -1, promote: 0, to: 20},
        false,
        'Ne7',
    ],
].forEach(([fen, move, sloppy, answer], id) => {
    test(`moveToSan:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(false, true, sloppy);
        expect(chess.moveToSan(move, moves)).toEqual(answer);
    });
});

// moveUci
[
    [
        START_FEN,
        'd2d4',
        false,
        {capture: 0, fen: '', flags: 4, from: 99, m: 'd4', piece: 1, ply: 0, promote: 0, to: 67},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'e1h1',
        true,
        {capture: 0, fen: '', flags: 32, from: 116, m: 'O-O', piece: 6, ply: 0, promote: 0, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'e1g1',
        true,
        {capture: 0, fen: '', flags: 32, from: 116, m: 'O-O', piece: 6, ply: 0, promote: 0, to: 119},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'd8h8',
        true,
        {capture: 0, fen: '', flags: 32, from: 3, m: 'O-O', piece: 14, ply: 19, promote: 0, to: 7},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'a2b1q',
        false,
        {capture: 4, fen: '', flags: 18, from: 96, m: 'axb1=Q', piece: 9, ply: 51, promote: 5, to: 113},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'g8f8',
        true,
        {capture: 0, fen: '', flags: 64, from: 6, m: 'O-O-O', piece: 14, ply: 13, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'g8h8',
        true,
        {capture: 0, fen: '', flags: 32, from: 6, m: 'O-O', piece: 14, ply: 15, promote: 0, to: 7},
    ],
].forEach(([fen, move, frc, answer], id) => {
    test(`moveUci:${id}`, () => {
        chess.load(fen);
        expect(chess.moveUci(move, frc)).toEqual(answer);
    });
});

// multiSan
[
    [
        '1. d4 d5 2. c4',
        [false, false],
        [
            {
                capture: 0,
                fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
                flags: 4,
                from: 99,
                m: 'd4',
                piece: 1,
                ply: 0,
                promote: 0,
                to: 67,
            },
            {
                capture: 0,
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
                flags: 4,
                from: 19,
                m: 'd5',
                piece: 9,
                ply: 1,
                promote: 0,
                to: 51,
            },
            {
                capture: 0,
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
                flags: 4,
                from: 98,
                m: 'c4',
                piece: 1,
                ply: 2,
                promote: 0,
                to: 66,
            },
        ],
    ],
].forEach(([multi, options, answer], id) => {
    test(`multiSan:${id}`, () => {
        chess.load(START_FEN);
        let moves = chess.multiSan(multi, options[0], options[1]);
        moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
        for (let move of moves)
            expect(get_move_ply({fen: move.fen})).toEqual(move.ply);
        expect(moves).toEqual(answer);
    });
});

// multiUci
[
    [
        'd2d4 d7d5 c2c4',
        false,
        [
            {
                capture: 0,
                fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
                flags: 4,
                from: 99,
                m: 'd4',
                piece: 1,
                ply: 0,
                promote: 0,
                to: 67,
              },
              {
                capture: 0,
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
                flags: 4,
                from: 19,
                m: 'd5',
                piece: 9,
                ply: 1,
                promote: 0,
                to: 51,
              },
              {
                capture: 0,
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
                flags: 4,
                from: 98,
                m: 'c4',
                piece: 1,
                ply: 2,
                promote: 0,
                to: 66,
              },
        ],
    ],
    [
        'd2d4 d7d5 c2c4 c7c6 b1c3 g8f6 e2e3 e7e6 f1d3 d5c4 d3c4 a7a6 a2a4 c6c5 g1f3 b8c6 e1g1 f8e7 d4c5 d8d1 f1d1 e7c5 h2h3 e8e7 e3e4 h8d8 d1d8 e7d8 e4e5 f6d7 c1f4 c5e7 c3e4 d7b6 c4b3 c6a5 b3a2 b6a4 f4e3 d8c7 a1c1 a5c6 c1c2 b7b6 a2b3 a4c5 e4c5 b6c5 e3c5 e7c5 c2c5 c7b6 c5c3 c8b7 f3g5 a8f8 g5h7 f8d8 h7g5 c6e5 c3e3 b7d5 f2f4 e5c4 e3c3 c4d6 f4f5 d6f5 g5f7 d8d7 f7e5 d7c7 c3d3 b6c5 b3d5 e6d5 d3c3 c5b6 c3d3 b6c5 d3c3 c5b6 c3c7 b6c7 g1f2 a6a5 g2g4 c7d6 e5f3',
        false,
        '1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. e3 e6 5. Bd3 dxc4 6. Bxc4 a6 7. a4 c5 8. Nf3 Nc6 9. O-O Be7 10. dxc5 Qxd1 11. Rxd1 Bxc5 12. h3 Ke7 13. e4 Rd8 14. Rxd8 Kxd8 15. e5 Nd7 16. Bf4 Be7 17. Ne4 Nb6 18. Bb3 Na5 19. Ba2 Nxa4 20. Be3 Kc7 21. Rc1 Nc6 22. Rc2 b6 23. Bb3 Nc5 24. Nxc5 bxc5 25. Bxc5 Bxc5 26. Rxc5 Kb6 27. Rc3 Bb7 28. Ng5 Rf8 29. Nxh7 Rd8 30. Ng5 Nxe5 31. Re3 Bd5 32. f4 Nc4 33. Rc3 Nd6 34. f5 Nxf5 35. Nxf7 Rd7 36. Ne5 Rc7 37. Rd3 Kc5 38. Bxd5 exd5 39. Rc3 Kb6 40. Rd3 Kc5 41. Rc3 Kb6 42. Rxc7 Kxc7 43. Kf2 a5 44. g4 Kd6 45. Nf3',

    ],
].forEach(([multi, frc, answer], id) => {
    test(`multiUci:${id}`, () => {
        chess.load(START_FEN);
        let moves = chess.multiUci(multi, frc);
        moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
        for (let move of moves)
            expect(get_move_ply({fen: move.fen})).toEqual(move.ply);

        if (IsString(answer))
            moves = moves.map((item, id) => `${id % 2 == 0? (1 + id / 2 + '. '): ''}${item.m}`).join(' ');
        expect(moves).toEqual(answer);
    });
});

// piece
[
    ['P', 1],
    ['p', 9],
    ['N', 2],
    ['b', 11],
    ['R', 4],
    ['Q', 5],
    ['K', 6],
    ['k', 14],
    ['T', 0],
    ['', 0],
    ['PQ', 0],
].forEach(([text, answer], id) => {
    test(`piece:${id}`, () => {
        expect(chess.piece(text)).toEqual(answer);
    });
});

// print
[
    [
        START_FEN,
        'rnbqkbnr\npppppppp\n        \n        \n        \n        \nPPPPPPPP\nRNBQKBNR',
    ],
].forEach(([fen, answer], id) => {
    test(`print:${id}`, () => {
        chess.load(fen);
        expect(chess.print()).toEqual(answer);
    });
});

// put
[
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        13,
        3,
        '1r1qkb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        5,
        3,      // 'd8',
        '1r1Qkb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        5,
        123,    // 'e0',
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '8/8/8/8/8/8/8/8 w - - 0 1',
        6,
        116,    // 'e1',
        '8/8/8/8/8/8/8/4K3 w - - 0 1',
    ],
    [
        '8/8/8/8/8/8/8/8 w - - 0 1',
        6,
        116,
        '8/8/8/8/8/8/8/4K3 w - - 0 1',
    ],
].forEach(([fen, piece, square, answer], id) => {
    test(`put:${id}`, () => {
        chess.load(fen);
        chess.put(piece, square);
        expect(chess.fen()).toEqual(answer);
    });
});

// reset
[
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', START_FEN],
].forEach(([fen, answer], id) => {
    test(`reset:${id}`, () => {
        chess.load(fen);
        chess.reset();
        expect(chess.fen()).toEqual(answer);
    });
});

// sanToMove
[
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Ne7',
        false,
        {capture: 0, fen: '', flags: 1, from: 6, m: 'Ne7', piece: 10, ply: 7, promote: 0, to: 20},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7',
        false,
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7',
        true,
        {capture: 0, fen: '', flags: 1, from: 6, m: 'Ne7', piece: 10, ply: 7, promote: 0, to: 20},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        false,
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        true,
        {capture: 0, fen: '', flags: 17, from: 19, m: 'd8=Q', piece: 1, ply: 50, promote: 5, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'Rd1',
        false,
        {capture: 0, fen: '', flags: 0, from: -1, m: '', piece: 0, ply: -1, promote: 0, to: -1},
    ],
].forEach(([fen, san, sloppy, answer], id) => {
    test(`sanToMove:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(false, true, EMPTY),
            move = chess.sanToMove(san, moves, sloppy);
        expect(move).toEqual(answer);
    });
});

// squareToAn
[
    [0, false, 'a8'],
    [7, false, 'h8'],
    [8, false, 'i8'],
    [8, true, ''],
    [51, false, 'd5'],
    [111, false, 'p2'],
    [111, true, ''],
    [112, false, 'a1'],
    [119, false, 'h1'],
].forEach(([square, check, answer], id) => {
    test(`squareToAn:${id}`, () => {
        expect(chess.squareToAn(square, check)).toEqual(answer);
    });
});

// undo
[
    [START_FEN, ['e4'], false, 1, ''],
    [START_FEN, ['e4', 'e5'], false, 1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, ['e4', 'e5'], false, 2, ''],
    ['r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['O-O'], false, 1, ''],
    ['r1bqk2r/ppppbppp/3n4/4R3/8/8/PPPP1PPP/RNBQ1BK1 b kq - 0 8', ['O-O'], false, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', ['O-O'], true, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', ['O-O-O'], true, 1, ''],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w Qq - 1 11', ['O-O-O'], true, 1, ''],
].forEach(([fen, moves, frc, steps, answer], id) => {
    test(`undo:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.moveSan(move, frc, false);
        for (let i = 0; i < steps; i ++)
            chess.undo();
        expect(chess.fen()).toEqual(answer || fen);
    });
});
});
