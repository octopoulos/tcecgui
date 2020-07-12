// chess.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-12
//
/*
globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/chess+`;

create_module(IMPORT_PATH, [
    'common',
    //
    'libs/chess-quick',
], OUTPUT_MODULE, 'Chess Keys');

let {Chess, Keys} = require(OUTPUT_MODULE);

let chess = new Chess(),
    START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// attacked
[
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
    ['8/8/8/8/8/8/8/8 w - - 0 1', [], {127: undefined}],
    ['8/8/8/8/8/8/8/4K3 w - - 0 1', [], {116: {color: 0, type: 'k'}, 127: undefined}],
].forEach(([fen, answer, dico], id) => {
    test(`board:${id}`, () => {
        chess.load(fen);
        Keys(dico).forEach(key => {
            answer[key] = dico[key];
        });
        expect(chess.board()).toEqual(answer);
    });
});

// checked
[
    ['2r3k1/7p/4pQpP/1R2Pq2/3P1P2/PR6/1K6/8 b - - 0 42', false],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/1Kq5/8 w - - 1 43', true],
    ['2r3k1/7p/4pQpP/1R2P3/3P1P2/PR6/2q5/K7 b - - 2 43', false],
].forEach(([fen, answer], id) => {
    test(`checked:${id}`, () => {
        chess.load(fen);
        expect(chess.checked()).toEqual(answer);
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

// fen
[
    [START_FEN, ['e4'], 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, ['e4', 'e5'], 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'],
    [
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w KQkq - 1 11',
        ['Rc1'],
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B1R1KBR1 b Kkq - 2 11',
    ],
    [
        'r1bqk2r/1P3ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R w KQkq - 0 14',
        ['bxa8=Q'],
        'Q1bqk2r/5ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R b KQk - 0 14',
    ],
].forEach(([fen, moves, answer], id) => {
    test(`fen:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.move(move);
        expect(chess.fen()).toEqual(answer);
    });
});

// load
[
    [START_FEN, ['d5'], START_FEN],
    [START_FEN, ['d4'], 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'],
    [START_FEN, ['d4', 'd5'], 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'],
    ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', ['O-O'], 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 b kq - 1 1'],
    ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', ['O-O-O'], 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/2KR3R b kq - 1 1'],
].forEach(([fen, moves, answer], id) => {
    test(`load:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.move(move);
        expect(chess.fen()).toEqual(answer);
    });
});

// move
[
    [START_FEN, 'd5', undefined, null],
    [START_FEN, 'd4', undefined, {color: 0, flags: 4, from: 99, piece: 'p', to: 67}],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O',
        undefined,
        {color: 0, flags: 32, frc: undefined, from: 116, piece: 'k', rook: 119, to: 118},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O-O',
        undefined,
        {color: 0, flags: 64, frc: undefined, from: 116, piece: 'k', rook: 112, to: 114},
    ],
    ['rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', 'O-O', undefined, null],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        {frc: true},
        {color: 1, flags: 32, frc: true, from: 3, piece: 'k', rook: 7, to: 6},
    ],
    [
        'brqnn1kr/ppppppbp/6p1/8/8/6P1/PPPPPPBP/BRQNN1KR w KQkq - 2 3',
        'O-O',
        {frc: true},
        {color: 0, flags: 32, frc: true, from: 118, piece: 'k', rook: 119, to: 118},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        'O-O',
        {frc: true},
        {color: 0, flags: 32, frc: true, from: 115, piece: 'k', rook: 119, to: 118},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        'O-O-O',
        {frc: true},
        {color: 0, flags: 64, frc: true, from: 115, piece: 'k', rook: 113, to: 114},
    ],
    [
        '4k1r1/p2rbpp1/1q2p1n1/2pb3p/5P1P/1PB1P1P1/2Q1BN2/R3K1R1 w Kk - 2 21',
        'O-O',
        {frc: true},
        {color: 0, flags: 32, frc: true, from: 116, piece: 'k', rook: 118, to: 118},
    ],
    [
        'rk2r3/1pp4p/p5bQ/P2q4/2R4P/1PB1p3/2P5/1K2R3 b q - 2 34',
        'O-O-O',
        {frc: true},
        {color: 1, flags: 64, frc: true, from: 1, piece: 'k', rook: 0, to: 2},
    ],
].forEach(([fen, move, options, answer], id) => {
    test(`move:${id}`, () => {
        chess.load(fen);
        expect(chess.move(move, options)).toEqual(answer);
    });
});

// moves
[
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', {}, 46, []],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        {frc: true},
        48,
        [
            {
                color: 0,
                flags: 32,
                from: 115,
                piece: 'k',
                rook: 119,
                to: 118,
            },
            {
                color: 0,
                flags: 64,
                from: 115,
                piece: 'k',
                rook: 113,
                to: 114,
            },
        ],
    ],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/5P2/1P1Np3/2QP1NPP/B1R1KBR1 w Qq - 0 12', {}, 36, []],
].forEach(([fen, options, number, answer], id) => {
    test(`moves:${id}`, () => {
        chess.load(fen);
        let moves = chess.moves(options);
        expect(moves.length).toEqual(number);
        for (let item of answer)
            expect(moves).toContainEqual(item);
    });
});

// put
[
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        {type: 'q'},
        'd8',
        false,
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        {color: 0, type: 'q'},
        'd8',
        true,
        '1r1Qkb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        {color: 0, type: 'q'},
        'e0',
        false,
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '8/8/8/8/8/8/8/8 w - - 0 1',
        {color: 0, type: 'k'},
        'e1',
        true,
        '8/8/8/8/8/8/8/4K3 w - - 0 1',
    ],
].forEach(([fen, piece, square, answer, answer_fen], id) => {
    test(`put:${id}`, () => {
        chess.load(fen);
        expect(chess.put(piece, square)).toEqual(answer);
        expect(chess.fen()).toEqual(answer_fen);
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

// undo
[
    [START_FEN, ['e4'], {}, 1, ''],
    [START_FEN, ['e4', 'e5'], {}, 1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, ['e4', 'e5'], {}, 2, ''],
    ['r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['O-O'], {}, 1, ''],
    ['r1bqk2r/ppppbppp/3n4/4R3/8/8/PPPP1PPP/RNBQ1BK1 b kq - 0 8', ['O-O'], {}, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', ['O-O'], {frc: true}, 1, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', ['O-O-O'], {frc: true}, 1, ''],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w Qq - 1 11', ['O-O-O'], {frc: true}, 1, ''],
].forEach(([fen, moves, options, steps, answer], id) => {
    test(`undo:${id}`, () => {
        chess.load(fen);
        for (let move of moves)
            chess.move(move, options);
        for (let i = 0; i < steps; i ++)
            chess.undo();
        expect(chess.fen()).toEqual(answer || fen);
    });
});
