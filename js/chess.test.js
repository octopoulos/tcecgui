// chess.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-09-12
//
/*
globals
beforeEach, describe, expect, require, test
*/
'use strict';

let {Chess} = require('./chess.js'),
    {Assign, IsArray, IsString, Keys, LS, Undefined} = require('./common'),
    {get_move_ply} = require('./global');

let chess = new Chess(),
    EMPTY = -1,
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe('chess.js', () => {
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
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', null, 2, false],
    ['8/8/8/8/8/2k5/1K6/8 b - - 1 1', null, 2, true],
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', null, 2, false],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/1Kq5/8 w - - 1 43', null, 2, true],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/2q5/K7 b - - 2 43', null, 2, false],
    ['8/5Np1/3k4/p2p4/6P1/7P/1Pn2K2/8 b - - 6 47', null, 0, false],
    ['8/5Np1/3k4/p2p4/6P1/7P/1Pn2K2/8 b - - 6 47', null, 1, true],
    ['rnbqkbnr/pp2pppp/3p4/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3', null, 0, false],
    ['rnbqkbnr/pp2pppp/3p4/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3', null, 1, true],
    ['rnbqkbnr/pp2pppp/3p4/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3', null, 2, false],
    ['rnbqkbnr/pp2pppp/3p4/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3', null, 3, true],
    [
        'rnbqkbnr/pp1ppppp/8/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        {capture: 0, flags: 1, from: 19, m: '', piece: 9, promote: 0, to: 35},
        2,
        false,
    ],
    [
        'rnbqkbnr/pp1ppppp/8/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        {capture: 0, flags: 1, from: 19, m: '', piece: 9, promote: 0, to: 35},
        3,
        true,
    ],
].forEach(([fen, move, color, answer], id) => {
    test(`checked:${id}`, () => {
        chess.load(fen);
        if (move)
            chess.moveRaw(move);
        expect(chess.checked(color)).toEqual(answer);
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

// configure
[
    [false, 'd=5', 4, [5, 1, 1e9, 0, 0]],
    [false, 'd=-5', 4, [4, 1, 1e9, 0, 5]],
    [false, 'd=5  e=nn n=1000 s=ab t=30', 4, [5, 7, 1000, 2, 30]],
].forEach(([frc, options, depth, answer], id) => {
    test(`configure:${id}`, () => {
        chess.configure(frc, options, depth);
        let params = chess.params();
        if (params.size)
            params = new Array(params.size()).fill(0).map((_, id) => params.get(id));
        expect(params).toEqual(answer);
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

// decorate
[
    [
        '8/5Np1/3k4/p2p4/6P1/7P/1Pn2K2/8 b - - 6 47',
        {capture: 0, flags: 1, from: 54, m: 'Nf7', piece: 2, promote: 0, to: 21},
        'Nf7+',
    ],
    [
        '3r2r1/pp3p1k/8/7P/4q2K/1P5P/P7/3R4 w - - 0 30',
        {capture: 4, flags: 2, from: 85, m: 'Qxe4', piece: 13, promote: 0, to: 68},
        'Qxe4#',
    ],
].forEach(([fen, move, answer], id) => {
    test(`decorate:${id}`, () => {
        chess.load(fen);
        expect(chess.decorate(move)).toEqual(answer);
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
    ['8/2pk4/p2p4/8/1P6/1KP4r/8/R7 w - - 42 80', ['Rxa6'], '8/2pk4/R2p4/8/1P6/1KP4r/8/8 b - - 0 80'],
    ['8/2pk4/p2p4/8/1P6/1KP4r/8/R7 w - - 42 80', ['Rxa6', 'd5'], '8/2pk4/R7/3p4/1P6/1KP4r/8/8 w - - 0 81'],
].forEach(([fen, moves, answer], id) => {
    test(`fen:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.moveSan(move, false, false, false);
        expect(chess.fen()).toEqual(Undefined(answer, fen));
    });
});

// fen960
[
    [-1, ''],
    [0, 'bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1'],
    [118, 'nqbrnbkr/pppppppp/8/8/8/8/PPPPPPPP/NQBRNBKR w HDhd - 0 1'],
    [644, 'rbbnkrqn/pppppppp/8/8/8/8/PPPPPPPP/RBBNKRQN w FAfa - 0 1'],
    [959, 'rkrnnqbb/pppppppp/8/8/8/8/PPPPPPPP/RKRNNQBB w CAca - 0 1'],
    [960, ''],
].forEach(([index, fen], id) => {
    test(`fen960:${id}`, () => {
        expect(chess.fen960(index)).toEqual(fen);
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
            chess.moveSan(move, false, false, false);
        expect(chess.fen()).toEqual(new_fen);
    });
});

// material
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', 0, 0],
    ['8/8/8/8/8/8/8/8 w - - 0 1', 1, 0],
    ['8/p7/8/8/8/8/8/Q7 w - - 0 1', 0, 900],
    ['8/p7/8/8/8/8/8/Q7 w - - 0 1', 1, 100],
    [START_FEN, 0, 3900],
    [START_FEN, 1, 3900],
].forEach(([fen, color, answer], id) => {
    test(`material:${id}`, () => {
        chess.load(fen);
        expect(chess.material(color)).toEqual(answer);
    });
});

// mobilities
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    [START_FEN, [0, 16, 4, 0, 0, 0, 0, 0, 0, 16, 4, 0, 0, 0, 0, 0]],
].forEach(([fen, answer], id) => {
    test(`mobilities:${id}`, () => {
        chess.load(fen);
        answer = new Uint8Array(answer);
        expect(chess.mobilities()).toEqual(answer);
    });
});

// moveObject
[
    [
        START_FEN,
        {capture: 0, flags: 0, from: 97, m: '', piece: 0, promote: 0, to: 65},
        [false, false],
        {capture: 0, flags: 4, from: 97, m: 'b4', piece: 1, promote: 0, to: 65},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        {capture: 0, flags: 0, from: 6, m: '', piece: 0, promote: 0, to: 5},
        [true, false],
        {capture: 0, flags: 64, from: 6, m: 'O-O-O', piece: 14, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        {capture: 0, flags: 0, from: 6, m: '', piece: 0, promote: 0, to: 7},
        [true, false],
        {capture: 0, flags: 32, from: 6, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        {capture: 0, flags: 0, from: 54, m: '', piece: 0, promote: 0, to: 21},
        [true, false],
        {capture: 0, flags: 1, from: 54, m: 'Nf7', piece: 2, promote: 0, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        {capture: 0, flags: 0, from: 54, m: '', piece: 0, promote: 0, to: 21},
        [true, true],
        {capture: 0, flags: 1, from: 54, m: 'Nf7+', piece: 2, promote: 0, to: 21},
    ],
    [
        '3r2r1/pp3p1k/8/7P/4R2K/1P3q1P/P7/3R4 b - - 7 29',
        {capture: 0, flags: 0, from: 85, m: '', piece: 0, promote: 0, to: 68},
        [true, true],
        {capture: 4, flags: 2, from: 85, m: 'Qxe4#', piece: 13, promote: 0, to: 68},
    ],
].forEach(([fen, move, [frc, decorate], answer], id) => {
    test(`moveObject:${id}`, () => {
        chess.load(fen);
        expect(chess.moveObject(move, frc, decorate)).toEqual(answer);
    });
});

// moveRaw
[
    [
        START_FEN,
        {capture: 0, depth: 0, fen: '', flags: 4, from: 97, m: '', piece: 1, ply: 0, promote: 0, score: 0, to: 65},
        undefined,
    ],
    [
        'r3k3/1P6/8/8/8/8/8/4K3 w q - 0 1',
        {capture: 0, depth: 0, fen: '', flags: 0, from: 0, m: '', piece: 0, ply: -1, promote: 0, score: 0, to: 0},
        undefined,
    ],
].forEach(([fen, move, answer], id) => {
    test(`moveRaw:${id}`, () => {
        chess.load(fen);
        let old = {...move};
        chess.moveRaw(move);
        expect(move).toEqual(Undefined(answer, old));
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
        [{capture: 0, flags: 32, from: 116, m: '', piece: 6, promote: 0, to: 118}],
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        [false, false, EMPTY],
        25,
        [{capture: 0, flags: 32, from: 116, m: '', piece: 6, promote: 0, to: 118}],
    ],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', [false, false, EMPTY], 47, []],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        [true, false, EMPTY],
        47,
        [
            {capture: 0, flags: 32, from: 115, m: '', piece: 6, promote: 0, to: 119},
        ],
    ],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/5P2/1P1Np3/2QP1NPP/B1R1KBR1 w Qq - 0 12', [false, false, EMPTY], 36, []],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20',
        [false, false, EMPTY],
        48,
        [
            {capture: 0, flags: 32, from: 115, m: '', piece: 6, promote: 0, to: 119},
            {capture: 0, flags: 64, from: 115, m: '', piece: 6, promote: 0, to: 113},
        ],
    ],
    ['5K2/P1P5/3k2P1/5P2/8/8/8/8 w - - 0 68', [true, true, EMPTY], 14, []],
    [
        'r3k3/1P6/8/8/8/8/8/4K3 w q - 0 1',
        [false, true, EMPTY],
        13,
        [{capture: 4, flags: 18, from: 17, m: '', piece: 1, promote: 5, to: 0}],
    ],
].forEach(([fen, [frc, legal, single_square], number, answer], id) => {
    test(`moves:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(frc, legal, single_square);
        if (moves.size)
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
        [false, false, false],
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
    [
        START_FEN,
        'd4',
        [false, false, false],
        {capture: 0, flags: 4, from: 99, m: 'd4', piece: 1, promote: 0, to: 67},
    ],
    [
        START_FEN,
        'b2b4',
        [false, false, false],
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O',
        [false, false, false],
        {capture: 0, flags: 32, from: 116, m: 'O-O', piece: 6, promote: 0, to: 118},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O-O',
        [false, false, false],
        {capture: 0, flags: 64, from: 116, m: 'O-O-O', piece: 6, promote: 0, to: 114},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        [false, false, false],
        {capture: 0, flags: 32, from: 3, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        [true, false, false],
        {capture: 0, flags: 32, from: 3, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        'brqnn1kr/ppppppbp/6p1/8/8/6P1/PPPPPPBP/BRQNN1KR w KQkq - 2 3',
        'O-O',
        [true, false, false],
        {capture: 0, flags: 32, from: 118, m: 'O-O', piece: 6, promote: 0, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        'O-O',
        [true, false, false],
        {capture: 0, flags: 32, from: 115, m: 'O-O', piece: 6, promote: 0, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20',
        'O-O-O',
        [true, false, false],
        {capture: 0, flags: 64, from: 115, m: 'O-O-O', piece: 6, promote: 0, to: 113},
    ],
    [
        '4k1r1/p2rbpp1/1q2p1n1/2pb3p/5P1P/1PB1P1P1/2Q1BN2/R3K1R1 w Gg - 2 21',
        'O-O',
        [true, false, false],
        {capture: 0, flags: 32, from: 116, m: 'O-O', piece: 6, promote: 0, to: 118},
    ],
    [
        'rk2r3/1pp4p/p5bQ/P2q4/2R4P/1PB1p3/2P5/1K2R3 b q - 2 34',
        'O-O-O',
        [true, false, false],
        {capture: 0, flags: 64, from: 1, m: 'O-O-O', piece: 14, promote: 0, to: 0},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=Q',
        [false, false, false],
        {capture: 0, flags: 17, from: 19, m: 'd8=Q', piece: 1, promote: 5, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        [false, false, false],
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'axb1=Q',
        [false, false, false],
        {capture: 4, flags: 18, from: 96, m: 'axb1=Q', piece: 9, promote: 5, to: 113},
    ],
    [
        'r2r2k1/pp4pp/2pN1pb1/8/5P2/6P1/PP2P1NP/R2K3R w KQ - 0 16',
        'O-O-O',
        [true, false, false],
        {capture: 0, flags: 64, from: 115, m: 'O-O-O', piece: 6, promote: 0, to: 112},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'O-O-O',
        [true, false, false],
        {capture: 0, flags: 64, from: 6, m: 'O-O-O', piece: 14, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'O-O',
        [true, false, false],
        {capture: 0, flags: 32, from: 6, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'Nf7',
        [true, false, false],
        {capture: 0, flags: 1, from: 54, m: 'Nf7', piece: 2, promote: 0, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'Nf7',
        [true, true, false],
        {capture: 0, flags: 1, from: 54, m: 'Nf7+', piece: 2, promote: 0, to: 21},
    ],
].forEach(([fen, move, [frc, decorate, sloppy], answer], id) => {
    test(`moveSan:${id}`, () => {
        chess.load(fen);
        let result = chess.moveSan(move, frc, decorate, sloppy);
        expect(result).toEqual(answer);
    });
});

// moveToSan
[
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        {capture: 0, depth: 0, fen: '', flags: 0, from: 6, m: '', piece: 10, ply: -1, promote: 0, score: 0, to: 20},
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
        [false, false],
        {capture: 0, flags: 4, from: 99, m: 'd4', piece: 1, promote: 0, to: 67},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'e1h1',
        [true, false],
        {capture: 0, flags: 32, from: 116, m: 'O-O', piece: 6, promote: 0, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'e1g1',
        [true, false],
        {capture: 0, flags: 32, from: 116, m: 'O-O', piece: 6, promote: 0, to: 119},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'd8h8',
        [true, false],
        {capture: 0, flags: 32, from: 3, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'a2b1q',
        [false, false],
        {capture: 4, flags: 18, from: 96, m: 'axb1=Q', piece: 9, promote: 5, to: 113},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'g8f8',
        [true, false],
        {capture: 0, flags: 64, from: 6, m: 'O-O-O', piece: 14, promote: 0, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'g8h8',
        [true, false],
        {capture: 0, flags: 32, from: 6, m: 'O-O', piece: 14, promote: 0, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'g5f7',
        [true, false],
        {capture: 0, flags: 1, from: 54, m: 'Nf7', piece: 2, promote: 0, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'g5f7',
        [true, true],
        {capture: 0, flags: 1, from: 54, m: 'Nf7+', piece: 2, promote: 0, to: 21},
    ],
].forEach(([fen, move, [frc, decorate], answer], id) => {
    test(`moveUci:${id}`, () => {
        chess.load(fen);
        expect(chess.moveUci(move, frc, decorate)).toEqual(answer);
    });
});

// multiSan
[
    [
        START_FEN,
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
                score: 0,
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
                score: 0,
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
                score: 0,
                to: 66,
            },
        ],
        'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    ],
    [
        START_FEN,
        '1. b4 e5 2. Bb2 d6 3. e3 Be7 4. c4 Nf6 5. Nc3 O-O 6. Qc2 c6 7. Nf3 Bg4 8. Be2 Nbd7 9. h3 Bh5 10. O-O Bg6 11. Qb3 Ne4 12. Nxe4 Bxe4 13. Bc3 Qc7 14. a4 a5 15. bxa5 Nc5 16. Qb2 Bf6 17. d4 exd4 18. exd4 Ne6 19. Nd2 Bf5 20. Rfd1 Rfe8 21. Bf1 c5 22. Nb3 h6 23. dxc5 Bxc3 24. Qxc3 Nxc5 25. Nd4 Qd7 26. Qb4 Ra6 27. Ra2 Be6 28. Nxe6 Qxe6 29. Re2 Qc8 30. Rxe8+ Qxe8 31. g3 Qe7 32. Bg2 Kf8 33. Bd5 Qd7 34. Rd4 Qxa4 35. Qb1 Rxa5 36. Kg2 Ne6 37. Bxe6 fxe6 38. Qxb7 Qe8 39. Rxd6 Qa8 40. Qxa8+ Rxa8 41. Rxe6 Kf7 42. Rc6 h5 43. Rc5 g6 44. Kf3 Ra2 45. h4 Rc2 46. Kf4 Rxf2+ 47. Kg5 Rf3 48. Rc7+ Ke6 49. Kxg6 Rxg3+ 50. Kxh5',
        [false, false],
        undefined,
        '8/2R5/4k3/7K/2P4P/6r1/8/8 b - - 0 50',
    ],
].forEach(([fen, multi, [frc, sloppy], answer, new_fen], id) => {
    test(`multiSan:${id}`, () => {
        chess.load(fen);
        let moves = chess.multiSan(multi, frc, sloppy);
        if (answer) {
            if (moves.size)
                moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
            for (let move of moves)
                expect(get_move_ply({fen: move.fen})).toEqual(move.ply);
            expect(moves).toEqual(answer);
        }
        expect(chess.fen()).toEqual(new_fen);
    });
});

// multiUci
[
    [
        START_FEN,
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
                score: 0,
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
                score: 0,
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
                score: 0,
                to: 66,
              },
        ],
        'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    ],
    [
        START_FEN,
        'd2d4 d7d5 c2c4 c7c6 b1c3 g8f6 e2e3 e7e6 f1d3 d5c4 d3c4 a7a6 a2a4 c6c5 g1f3 b8c6 e1g1 f8e7 d4c5 d8d1 f1d1 e7c5 h2h3 e8e7 e3e4 h8d8 d1d8 e7d8 e4e5 f6d7 c1f4 c5e7 c3e4 d7b6 c4b3 c6a5 b3a2 b6a4 f4e3 d8c7 a1c1 a5c6 c1c2 b7b6 a2b3 a4c5 e4c5 b6c5 e3c5 e7c5 c2c5 c7b6 c5c3 c8b7 f3g5 a8f8 g5h7 f8d8 h7g5 c6e5 c3e3 b7d5 f2f4 e5c4 e3c3 c4d6 f4f5 d6f5 g5f7 d8d7 f7e5 d7c7 c3d3 b6c5 b3d5 e6d5 d3c3 c5b6 c3d3 b6c5 d3c3 c5b6 c3c7 b6c7 g1f2 a6a5 g2g4 c7d6 e5f3',
        false,
        '1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. e3 e6 5. Bd3 dxc4 6. Bxc4 a6 7. a4 c5 8. Nf3 Nc6 9. O-O Be7 10. dxc5 Qxd1 11. Rxd1 Bxc5 12. h3 Ke7 13. e4 Rd8 14. Rxd8 Kxd8 15. e5 Nd7 16. Bf4 Be7 17. Ne4 Nb6 18. Bb3 Na5 19. Ba2 Nxa4 20. Be3 Kc7 21. Rc1+ Nc6 22. Rc2 b6 23. Bb3 Nc5 24. Nxc5 bxc5 25. Bxc5 Bxc5 26. Rxc5 Kb6 27. Rc3 Bb7 28. Ng5 Rf8 29. Nxh7 Rd8 30. Ng5 Nxe5 31. Re3 Bd5 32. f4 Nc4 33. Rc3 Nd6 34. f5 Nxf5 35. Nxf7 Rd7 36. Ne5 Rc7 37. Rd3 Kc5 38. Bxd5 exd5 39. Rc3+ Kb6 40. Rd3 Kc5 41. Rc3+ Kb6 42. Rxc7 Kxc7 43. Kf2 a5 44. g4 Kd6 45. Nf3',
        '8/6p1/3k4/p2p1n2/6P1/5N1P/1P3K2/8 b - - 2 45',
    ],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        '1. d2d4q g8f6q 2. c1b3q c8b6q 3. e2e4q',
        true,
        '1. d4 Nf6 2. Nb3 Nb6 3. e4',
        'rk1rbq1b/pppppppp/1n3n2/8/3PP3/1N6/PPP2PPP/RK1RBQNB b DAda e3 0 3',
    ],
].forEach(([fen, multi, frc, answer, new_fen], id) => {
    test(`multiUci:${id}`, () => {
        chess.load(fen);
        let moves = chess.multiUci(multi, frc);
        if (answer) {
            if (moves.size)
                moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
            for (let move of moves)
                expect(get_move_ply({fen: move.fen})).toEqual(move.ply);

            if (IsString(answer))
                moves = moves.map((item, id) => `${id % 2 == 0? (1 + id / 2 + '. '): ''}${item.m}`).join(' ');
            expect(moves).toEqual(answer);
        }
        expect(chess.fen()).toEqual(new_fen);
    });
});

// nodes
[
    [START_FEN, false, 'd=0', 4, 20],
    [START_FEN, false, '', 0, 20],
    [START_FEN, false, 'd=1', 4, 20],
    [START_FEN, false, 'd=2', 4, 400],
    [START_FEN, false, 'n=100000', 2, 400],
    [START_FEN, false, 'd=3', 4, 8902],
    [START_FEN, false, 'd=3 e=4', 4, 8902],
    [START_FEN, false, 'd=4 s=mm', 4, 197281],
    [START_FEN, false, 'd=4 s=ab', 4, [186432, 186836]],
    ['6k1/pp1R1np1/7p/5p2/3B4/1P3P1P/r5P1/7K w - - 0 33', false, 's=mm', 4, 403873],
    ['6k1/pp1R1np1/7p/5p2/3B4/1P3P1P/r5P1/7K w - - 0 33', false, 's=ab', 4, [118710, 119332]],
].forEach(([fen, frc, options, depth, answer], id) => {
    test(`nodes:${id}`, () => {
        chess.load(fen);
        chess.configure(frc, options, depth);
        let moves = chess.moves(frc, true, EMPTY);
        chess.search(moves, '');
        let nodes = chess.nodes();
        if (IsArray(answer)) {
            expect(nodes).toBeGreaterThanOrEqual(answer[0]);
            expect(nodes).toBeLessThanOrEqual(answer[1]);
        }
        else
            expect(nodes).toEqual(answer);
    });
});

// order
[
    [
        'bn2r1rn/p2pk1p1/1p1p1pp1/1q6/1PP1P1B1/3P4/6RP/4RK1N w E - 0 18',
        [true, '', 4],
        'c4b5 g4d7 f1e1 g4f5 g4e6 g4h5 g4h3 g4f3 g4e2 g4d1 h1f2 h1g3 g2g3 g2g1 g2f2 g2e2 g2d2 g2c2 g2b2 g2a2 e1e2 e1e3 e1d1 e1c1 e1b1 e1a1 c4c5 e4e5 d3d4 h2h4 h2h3 f1e2 f1f2 f1g1',
    ],
    [
        'Qbk1r1b1/1p3p1p/2p1p3/5P2/6q1/B7/PPKn3P/NBR1R3 w - - 1 22',
        [true, '', 4],
        'a8b8 f5e6 e1e6 a8b7 c2d2 a3b4 a3c5 a3d6 a3e7 a3f8 a1b3 c1d1 e1e2 e1e3 e1e4 e1e5 e1f1 e1g1 e1h1 e1d1 a8a7 a8a6 a8a5 a8a4 f5f6 b2b4 h2h4 b2b3 h2h3 c2c3 c2d3',
    ],
    [
        '3r4/2p2k2/6p1/2p5/4N2p/PP2N3/2P2PK1/2R5 b - - 3 35',
        [true, '', 4],
        'd8e8 d8f8 d8g8 d8h8 d8d7 d8d6 d8d5 d8d4 d8d3 d8d2 d8d1 d8c8 d8b8 d8a8 h4h3 c5c4 g6g5 c7c6 f7e8 f7f8 f7g8 f7g7 f7e6 f7e7',
    ],
    [
        '8/1PP5/4k3/8/6Pp/4pK2/8/8 w - - 0 47',
        [true, '', 4],
        'f3e3 b7b8q c7c8q b7b8r c7c8r b7b8b c7c8b b7b8n c7c8n g4g5 f3e4 f3f4 f3g2 f3e2',
    ],
].forEach(([fen, [frc, options, depth], answer], id) => {
    test(`order:${id}`, () => {
        chess.load(fen);
        chess.configure(frc, options, depth);
        let moves = chess.moves(frc, true, EMPTY);
        chess.order(moves);
        if (moves.size)
            moves = new Array(moves.size()).fill(0).map((_, id) => moves.get(id));
        moves = moves.map(move => chess.ucify(move)).join(' ');
        expect(moves).toEqual(answer);
    });
});

// params
[
    [false, 'd=5', 0, [5, 1, 1e9, 0, 0]],
].forEach(([frc, options, depth, answer], id) => {
    test(`params:${id}`, () => {
        chess.configure(frc, options, depth);
        let params = chess.params();
        if (params.size)
            params = new Array(params.size()).fill(0).map((_, id) => params.get(id));
        expect(params).toEqual(answer);
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
        {capture: 0, flags: 1, from: 6, m: 'Ne7', piece: 10, promote: 0, to: 20},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7',
        false,
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7',
        true,
        {capture: 0, flags: 1, from: 6, m: 'Ne7', piece: 10, promote: 0, to: 20},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        false,
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q',
        true,
        {capture: 0, flags: 17, from: 19, m: 'd8=Q', piece: 1, promote: 5, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'Rd1',
        false,
        {capture: 0, flags: 0, from: 0, m: '', piece: 0, promote: 0, to: 0},
    ],
].forEach(([fen, san, sloppy, answer], id) => {
    test(`sanToMove:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(false, true, EMPTY),
            move = chess.sanToMove(san, moves, sloppy);
        expect(move).toEqual(answer);
    });
});

// search
[
    [
        'bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1p1/1N6/PPP2PKP/B2R3R w h - 2 17',
        '',
        [false, 'd=-4 e=hce s=mm', 4],
        [],
        {g5d2: [-250, -200], g5e5: [-150, -50], f2f3: [-1150, -1100], h2h4: [-1150, -1100]},
    ],
    [
        'bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1p1/1N6/PPP2PKP/B2R3R w h - 2 17',
        '',
        [false, 'd=-4 e=hce s=ab', 4],
        [],
        {g5d2: [-250, -200], g5e5: [-150, -50], f2f3: [-1150, -1100], h2h4: [-1150, -1100]},
    ],
    [
        'bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1p1/1N6/PPP2PKP/B2R3R w h - 2 17',
        '',
        [false, 'd=-4 e=hce s=ab', 5],
        [],
        {g5d2: [-50, 0], g5e5: [100, 150], f2f3: [-1120, -1070], h2h4: [-720, -670]},
    ],
    [
        '7k/3Q4/1p6/2p5/4K3/1P4PP/P6q/8 w - - 48 107',
        '',
        [false, 'd=3', 0],
        [],
        {a2a3: [100, 150], d7d8: [-50, 50]},
    ],
    [
        'rnb1k1nr/1p1p1p2/1qp1p3/4P1pp/p2P4/1N1B4/PPP2PPP/R2QK1NR w KQkq - 0 10',
        '',
        [false, '', 3],
        [],
        {b3c1: [-50, 50], b3c5: [-50, 50], b3d2: [-50, 50]},
    ],
    [
        '8/7R/8/4B3/P5N1/6P1/PKP3k1/7r b - - 48 96',
        '',
        [false, '', 3],
        [],
        {h1b1: [-1600, -1400], h1h7: [-550, -450]},
    ],
    [
        'rnb1k1nr/pppp1pp1/4p2p/8/2PP2q1/2PBPN2/P4PPP/R1BQK2R w KQkq - 2 8',
        '',
        [false, 'd=1', 4],
        [],
        {2: 'e1g1'},
    ],
    [
        'r1b1kbnr/p2np2p/8/5p1P/8/N7/2P2qP1/4K1NR w kq - 0 16',
        '',
        [false, 'd=1', 4],
        [],
        {1: 'e1f2'},
    ],
    [
        '4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73',
        '',
        [false, 'd=1', 4],
        [600, 700],
        {},
    ],
    [
        '4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73',
        '',
        [false, 'd=2', 4],
        [43000, 44000],
        {1: 'g5e6 h7f7'},
    ],
    [
        '4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73',
        '',
        [false, 'd=3', 4],
        [43000, 44000],
        {1: 'g5e6 h7f7'},
    ],
    [
        'rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5',
        '',
        [false, 'd=1', 4],
        [750, 900],
        {},
    ],
    [
        'rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5',
        'b8c6',
        [false, '', 1],
        [-150, -50],
        {},
    ],
    [
        'rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5',
        'b8c6',
        [false, '', 2],
        [-650, -550],
        {},
    ],
    [
        '4B2k/8/8/8/1P2N2P/2P1P1R1/P2PKPP1/R1B3N1 w - - 13 42',
        '',
        [false, '', 4],
        [],
        {e4f6: [0, 80], g3g5: [3000, 3500]},
    ],
    [
        '7k/2Q5/8/1B2P3/8/2PRKN2/8/8 w - - 1 47',
        '',
        [false, '', 4],
        [],
        {1: 'd3d8', b5c4: [0, 120], c7f7: [0, 120]},
    ],
].forEach(([fen, mask, [frc, options, depth], answer, checks], id) => {
    test(`search:${id}`, () => {
        chess.load(fen);
        chess.configure(frc, options, depth);
        let moves = chess.moves(frc, true, EMPTY),
            masks = chess.search(moves, mask);

        if (masks.size)
            masks = new Array(masks.size()).fill(0).map((_, id) => masks.get(id));
        masks.sort((a, b) => b.score - a.score);

        let best = masks[0],
            bests = masks.filter(mask => mask.score <= best.score + 0.001),
            keys = Keys(checks),
            ucis = new Set(bests.map(mask => chess.ucify(mask)));

        if (keys.length) {
            let missing = false,
                dico = Assign({}, ...masks.map(move => ({[chess.ucify(move)]: move.score})));
            keys.forEach(key => {
                let check = checks[key],
                    value = dico[key];
                if (key == 1 || key == 2) {
                    let splits = check.split(' ');
                    if (!splits.some(item => ucis.has(item))) {
                        missing = check;
                        return;
                    }
                    if (key == 1)
                        expect(splits.some(item => ucis.has(item))).toBeTruthy();
                    else
                        expect(dico).toHaveProperty(check);
                }
                else {
                    if (value == undefined) {
                        missing = key;
                        return;
                    }
                    if (value < check[0] || value > check[1])
                        LS(dico);
                    expect(value).toBeGreaterThanOrEqual(check[0]);
                    expect(value).toBeLessThanOrEqual(check[1]);
                }
            });
            if (missing) {
                LS(`id=${id} : missing=${missing}`);
                LS(dico);
            }
        }

        if (answer.length) {
            expect(best.score).toBeGreaterThanOrEqual(answer[0]);
            expect(best.score).toBeLessThanOrEqual(answer[1]);
        }
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

// turn
[
    [START_FEN, [], 0],
    [START_FEN, ['e4'], 1],
    [START_FEN, ['e4', 'd5'], 0],
    ['rnbqkbnr/pp1ppppp/8/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2', ['e6'], 0],
].forEach(([fen, moves, answer], id) => {
    test(`turn:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.moveSan(move, true, false, false);
        expect(chess.turn()).toEqual(answer);
    });
});

// ucify
[
    [
        {capture: 0, depth: 0, fen: '', flags: 4, from: 99, m: '', piece: 1, ply: 0, promote: 0, score: 0, to: 67},
        'd2d4',
    ],
    [
        {capture: 4, depth: 0, fen: '', flags: 18, from: 96, m: '', piece: 9, ply: 51, promote: 5, score: 0, to: 113},
        'a2b1q',
    ],
].forEach(([move, answer], id) => {
    test(`ucify:${id}`, () => {
        expect(chess.ucify(move)).toEqual(answer);
    });
});

// undo
[
    [START_FEN, ['e4'], false, 1, ''],
    [START_FEN, [], false, 1, ''],
    [START_FEN, ['e4', 'e5'], false, 1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, ['e4', 'e5'], false, 2, ''],
    ['r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['O-O'], false, 1, ''],
    ['r1bqk2r/ppppbppp/3n4/4R3/8/8/PPPP1PPP/RNBQ1BK1 b kq - 0 8', ['O-O'], false, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', ['O-O'], true, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', ['O-O-O'], true, 1, ''],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w Dd - 1 11', ['O-O-O'], true, 1, ''],
    [
        '4N3/4R3/1Q6/8/1k2P2P/4KP2/6P1/8 b - - 2 108',
        {capture: 0, depth: 0, fen: '', flags: 1, from: 65, m: '', piece: 14, ply: 215, promote: 0, score: 0, to: 48},
        false,
        1,
        '',
    ],
    [
        '4N3/4R3/1Q6/8/1k2P2P/4KP2/6P1/8 b - - 2 108',
        {capture: 0, depth: 0, fen: '', flags: 1, from: 65, m: '', piece: 14, ply: 215, promote: 0, score: 0, to: 80},
        false,
        1,
        '',
    ],
    [
        'r1b1kb1r/p1pp1ppp/1p2pn2/7q/1nPPP3/BP1B1N1P/P4PP1/RN1Q1RK1 b ha - 2 10',
        ['Nxd3', 'Bxf8', 'Nb2', 'Qc2', 'Rxf8', 'Qxb2', 'Nxe4'],
        false,
        7,
        '',
    ],
    [
        'bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1pP/1N6/PPP2PK1/B2R3R b h h3 0 17',
        ['gxh3+'],
        false,
        1,
        '',
    ],
].forEach(([fen, moves, frc, steps, answer], id) => {
    test(`undo:${id}`, () => {
        chess.load(fen);
        let materials = [chess.material(0), chess.material(1)];
        if (IsArray(moves)) {
            for (let move of moves)
                chess.moveSan(move, frc, false, false);
        }
        else
            chess.moveRaw(moves);
        for (let i = 0; i < steps; i ++)
            chess.undo();
        expect(chess.fen()).toEqual(answer || fen);
        if (!answer) {
            expect(chess.material(0)).toEqual(materials[0]);
            expect(chess.material(1)).toEqual(materials[1]);
        }
    });
});
});
