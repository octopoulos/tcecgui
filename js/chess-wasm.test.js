// chess-wasm.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-11-01
//
/*
globals
beforeAll, beforeEach, describe, expect, require, test
*/
'use strict';

let Module = require('./chess-wasm.js'),
    {ArrayJS, Assign, IsArray, IsString, Keys, LS, Undefined} = require('./common'),
    {get_move_ply} = require('./global');

let chess,
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
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 0, 'a1', false],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 0, 'b4', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 0, 'e3', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 0, 'g4', false],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 0, 'h1', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'a2', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'a5', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'a8', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'b4', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'd4', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'd5', true],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'e3', false],
    ['r2q1rk1/1b1nppbp/1P1p2p1/pBpP4/PnN1P3/1QN5/1P3PPP/R1B2RK1 b - - 7 14', 1, 'h8', true],
].forEach(([fen, color, square, answer], id) => {
    test(`attacked:${id}`, () => {
        chess.load(fen, false);
        if (IsString(square))
            square = chess.anToSquare(square);
        expect(chess.attacked(color, square)).toEqual(answer);
    });
});

// attacks
[
    ['1r3b1k/2q3pP/p2pbp2/4n2P/r2BP3/2N5/1PP1BQ2/2KR1R2 b - -', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 5, 10, 0]],
    ['1r3b1k/2q3pP/p2pbp2/4n2P/3BP3/2N5/1PP1BQ2/r1KR1R2 w - -', [0, 0, 0, 14, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 0]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', [0, 0, 7, 2, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
].forEach(([fen, answer], id) => {
    test(`attacks:${id}`, () => {
        chess.load(fen, false);
        chess.moves();
        answer = new Uint8Array(answer);
        expect(chess.attacks()).toEqual(answer);
    });
});

// board
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', 128, {127: 0}],
    ['8/8/8/8/8/8/8/4K3 w - - 0 1', 128, {116: 6, 127: 0}],
].forEach(([fen, answer, dico], id) => {
    test(`board:${id}`, () => {
        chess.load(fen, false);
        answer = new Uint8Array(answer);
        Keys(dico).forEach(key => {
            answer[key] = dico[key];
        });
        expect(chess.board()).toEqual(answer);
    });
});

// boardHash
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', 0],
    ['8/8/8/8/8/8/8/8 b - - 0 2', [2096977426, 3923755811]],
    ['8/8/8/8/8/8/P7/8 w - - 0 1', [3316105773, 2820892883]],
    ['8/8/8/8/P7/8/8/8 b - a3 0 1', [3616909782, 2721577016]],
    ['8/8/8/8/P7/8/8/8 b - - 0 1', [3211176109, 418177877]],
    [START_FEN, [1449171223, 2851721280]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Qkq - 0 1', [1203750330, 3159420155]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kkq - 0 1', [1181264836, 2102473982]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kq - 0 1', [1471674217, 1761085509]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w q - 0 1', [2771708610, 1997162361]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w k - 0 1', [1134547903, 4214040372]],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', [2971454996, 3839846408]],
    ['rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', [3835669381, 3065660905]],
].forEach(([fen, answer], id) => {
    test(`boardHash:${id}`, () => {
        chess.load(fen, true);
        let result = chess.boardHash() >>> 0;
        if (IsArray(answer))
            expect(answer).toContain(result);
        else
            expect(result).toEqual(answer);
    });
});

// castling
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', [255, 255, 255, 255]],
    [START_FEN, [119, 112, 7, 0]],
    ['qnnbbrkr/pppppppp/8/8/8/8/PPPPPPPP/QNNBBRKR w HFhf - 0 1', [119, 117, 7, 5]],
    ['q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7', [119, 117, 7, 5]],
    ['rnkrnbbq/pppppppp/8/8/8/8/PPPPPPPP/RNKRNBBQ w DAda - 0 1', [115, 112, 3, 0]],
    ['bbrknqrn/pppppppp/8/8/8/8/PPPPPPPP/BBRKNQRN w GCgc - 0 1', [118, 114, 6, 2]],
].forEach(([fen, answer], id) => {
    test(`castling:${id}`, () => {
        chess.load(fen, false);
        answer = new Uint8Array(answer);
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
        {capture: 0, fen: '', flag: 0, from: 19, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 35},
        2, false,
    ],
].forEach(([fen, move, color, answer], id) => {
    test(`checked:${id}`, () => {
        chess.load(fen, false);
        if (move)
            chess.makeMove(chess.packObject(move));
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
        chess.load(fen, true);
        chess.clear();
        expect(chess.fen()).toEqual(answer);
        expect(chess.boardHash()).toEqual(0);
    });
});

// configure
[
    [false, 'd=4 t=8 q=10', 5, [5, 1, 1e9, 0, 8, 10]],
    [false, 'd=6', 0, [6, 1, 1e9, 0, 0, 0]],
    [false, 'd=6', 4, [4, 1, 1e9, 0, 0, 0]],
    [false, 'd=8 e=nn n=1000 s=ab t=30', 0, [8, 39, 1000, 2, 30, 0]],
    [true, 'e=hce q=5', 0, [4, 3, 1e9, 0, 0, 5]],
    [true, 'e=att', 0, [4, 7, 1e9, 0, 0, 0]],
].forEach(([frc, options, depth, answer], id) => {
    test(`configure:${id}`, () => {
        chess.configure(frc, options, depth);
        let params = ArrayJS(chess.params());
        expect(params).toEqual(answer);
        expect(chess.frc()).toEqual(frc);
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
        chess.load(fen, false);
        expect(chess.currentFen()).toEqual(Undefined(answer, fen));
    });
});

// decorateSan
[
    ['8/5Np1/3k4/p2p4/6P1/7P/1Pn2K2/8 b - - 6 47', 'Nf7', 'Nf7+'],
    ['3r2r1/pp3p1k/8/7P/4q2K/1P5P/P7/3R4 w - - 0 30', 'Qxe4', 'Qxe4#'],
].forEach(([fen, san, answer], id) => {
    test(`decorateSan:${id}`, () => {
        chess.load(fen, false);
        expect(chess.decorateSan(san)).toEqual(answer);
    });
});

// defenses
[
    ['1r3b1k/2q3pP/p2pbp2/4n2P/r2BP3/2N5/1PP1BQ2/2KR1R2 b - -', [0, 0, 0, 0, 0, 0, 0, 0, 0, 37, 0, 10, 9, 24, 5, 0]],
    ['1r3b1k/2q3pP/p2pbp2/4n2P/3BP3/2N5/1PP1BQ2/r1KR1R2 w - -', [0, 15, 22, 38, 54, 24, 19, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', [0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 5, 15, 24, 9, 0]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', [0, 0, 0, 9, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
].forEach(([fen, answer], id) => {
    test(`defenses:${id}`, () => {
        chess.load(fen, false);
        chess.moves();
        answer = new Uint8Array(answer);
        expect(chess.defenses()).toEqual(answer);
    });
});

// evaluate
[
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', 'e=null', [0, 0]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', 'e=mat', [-485, -485]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', 'e=mob', [212, 212]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', 'e=hce', [-273, -273]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', 'e=att', [-175, -175]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', 'e=mat', [-1509, -1509]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', 'e=mob', [114, 150]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', 'e=hce', [-1395, -1359]],
    ['3Q4/6qk/p7/4n3/2N5/r7/4B3/3bK3 w - - 0 40', 'e=att', [-1358, -1322]],
].forEach(([fen, options, answer], id) => {
    test(`evaluate:${id}`, () => {
        chess.configure(false, options, 1);
        chess.load(fen, false);
        chess.moves();
        let score = chess.evaluate();
        expect(score).toBeGreaterThanOrEqual(answer[0]);
        expect(score).toBeLessThanOrEqual(answer[1]);
    });
});

// fen
[
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1',
        '',
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O',
        'rbq2rk1/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R w KQ - 3 11',
    ],
    [START_FEN, '', undefined],
    [START_FEN, 'e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'],
    [START_FEN, 'e4 e5', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'],
    [
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w GDgd - 1 11',
        'Rc1',
        'b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B1R1KBR1 b Ggd - 2 11',
    ],
    [
        'r1bqk2r/1P3ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R w KQkq - 0 14',
        'bxa8=Q',
        'Q1bqk2r/5ppp/3b1n2/p2p4/8/P1P1P3/1B1N1PpP/R2QKB1R b KQk - 0 14',
    ],
    ['qnnbbrkr/pppppppp/8/8/8/8/PPPPPPPP/QNNBBRKR w HFhf - 0 1', '', undefined],
    ['rnkrnbbq/pppppppp/8/8/8/8/PPPPPPPP/RNKRNBBQ w DAda - 0 1', '', undefined],
    ['bbrknqrn/pppppppp/8/8/8/8/PPPPPPPP/BBRKNQRN w GCgc - 0 1', '', undefined],
    ['rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', '', undefined],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        'e4',
        'rknrbqnb/pppppppp/8/8/4P3/8/PPPP1PPP/RKNRBQNB b DAda e3 0 1',
    ],
    ['8/2pk4/p2p4/8/1P6/1KP4r/8/R7 w - - 42 80', 'Rxa6', '8/2pk4/R2p4/8/1P6/1KP4r/8/8 b - - 0 80'],
    ['8/2pk4/p2p4/8/1P6/1KP4r/8/R7 w - - 42 80', 'Rxa6 d5', '8/2pk4/R7/3p4/1P6/1KP4r/8/8 w - - 0 81'],
].forEach(([fen, moves, answer], id) => {
    test(`fen:${id}`, () => {
        chess.load(fen, false);
        for (let move of moves.split(' '))
            chess.moveSan(move, false, false);
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

// hashStats
[
    [START_FEN, 's=mm', 4, [0, 0]],
    [START_FEN, 'h=1 s=mm', 1, [1, 0]],
    [START_FEN, 'h=1 s=mm', 2, [21, 0]],
    [START_FEN, 'h=1 s=mm', 3, [421, 0]],
    [START_FEN, 'h=1 s=mm', 4, [[8158, 8181], [1144, 1165]]],
    [START_FEN, 's=ab', 4, [0, 0]],
    [START_FEN, 'h=1 s=ab', 1, [21, [18, 19]]],
    [START_FEN, 'h=1 s=ab', 2, [[3, 60], [37, 38]]],
    [START_FEN, 'h=1 s=ab', 3, [524, [425, 433]]],
    [START_FEN, 'h=1 s=ab', 4, [1341, [247, 248]]],
    [START_FEN, 'h=1 s=ab', 5, [[14776, 14790], [3024, 3030]]],
    [START_FEN, 'h=1 s=ab', 6, [[187373, 188528], [19171, 19614]]],
    [START_FEN, 'h=1 s=ab', 7, [[40169, 293153], [53562, 55154]]],
].forEach(([fen, options, depth, answer], id) => {
    test(`hashStats:${id}`, () => {
        chess.configure(false, options, depth);
        chess.load(fen, false);
        let moves = ArrayJS(chess.moves());
        chess.search(moves.join(' '), false);
        let stats = ArrayJS(chess.hashStats());
        for (let i = 0; i < 2; i ++) {
            let item = answer[i],
                stat = stats[i];
            if (IsArray(item)) {
                expect(stat).toBeGreaterThanOrEqual(item[0]);
                expect(stat).toBeLessThanOrEqual(item[1]);
            }
            else
                expect(stat).toEqual(item);
        }
    });
});

// load
[
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', false, '', undefined, START_FEN, 0],
    [START_FEN, false, '', undefined, START_FEN, 0],
    [START_FEN, true, '', undefined, START_FEN, [1449171223, 2851721280]],
    [
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        true, '',
        undefined,
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        [894541731, 2342607200],
    ],
    [START_FEN, true, 'd5', undefined, START_FEN, [1449171223, 2851721280]],
    [
        START_FEN,
        true, 'd4',
        undefined,
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        [1985588709, 2344719164],
    ],
    [
        START_FEN,
        true, 'd4 d5',
        undefined,
        'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
        [2773017983, 3259486411],
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        true, 'O-O',
        undefined,
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 b kq - 1 1',
        [4280630151, 3652287715],
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        true, 'O-O-O',
        undefined,
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/2KR3R b kq - 1 1',
        [3616831701, 1445905011],
    ],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1',
        true,  '',
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        [2722228778, 1533692916],
    ],
    [
        'rnbqkb1r/pp1ppppp/5n2/2pP4/8/8/PPP1PPPP/RNBQKBNR w KQkq c6 0 3',
        true, 'dxc6',
        undefined,
        'rnbqkb1r/pp1ppppp/2P2n2/8/8/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3',
        [2504863392, 930110334],
    ],
    [
        'rnbqk2r/ppPpppbp/5np1/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 1 5',
        true, {capture: 0, depth: 0, fen: '', flag: 0, from: 18, m: '', ply: 0, promote: 5, pv: '', score: 0, to: 3},
        undefined,
        'rnbQk2r/pp1pppbp/5np1/8/8/8/PPP1PPPP/RNBQKBNR b KQkq - 0 5',
        [3455057338, 3847915522],

    ],
    [
        'rnbqk2r/ppPpppbp/5np1/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 1 5',
        true, 'cxd8=Q+',
        undefined,
        'rnbQk2r/pp1pppbp/5np1/8/8/8/PPP1PPPP/RNBQKBNR b KQkq - 0 5',
        [3455057338, 3847915522],
    ],
].forEach(([fen, must_hash, moves, answer, new_fen, new_hash], id) => {
    test(`load:${id}`, () => {
        expect(chess.load(fen, must_hash)).toEqual(Undefined(answer, fen));
        if (IsString(moves)) {
            for (let move of moves.split(' '))
                chess.moveSan(move, false, false);
        }
        else
            chess.makeMove(chess.packObject(moves));
        expect(chess.fen()).toEqual(new_fen);
        let result = chess.boardHash() >>> 0;
        if (IsArray(new_hash))
            expect(new_hash).toContain(result);
        else
            expect(result).toEqual(new_hash);
    });
});

// makeMove
[
    [
        START_FEN,
        {capture: 0, depth: 0, fen: '', flag: 0, from: 99, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 67},
        undefined,
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    ],
    [
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 19, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 51},
        undefined,
        'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
    ],
    [
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 6, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 37},
        undefined,
        'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
    ],
    [
        'r3k3/1P6/8/8/8/8/8/4K3 w q - 0 1',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
        undefined,
        undefined,
    ],
].forEach(([fen, move, answer, new_fen], id) => {
    test(`makeMove:${id}`, () => {
        chess.load(fen, false);
        let old = {...move};
        chess.makeMove(chess.packObject(move));
        expect(move).toEqual(Undefined(answer, old));
        expect(chess.fen()).toEqual(Undefined(new_fen, fen));
    });
});

// material
[
    ['8/8/8/8/8/8/8/8 w - - 0 1', 0, 0],
    ['8/8/8/8/8/8/8/8 w - - 0 1', 1, 0],
    ['8/p7/8/8/8/8/8/Q7 w - - 0 1', 0, 2500],
    ['8/p7/8/8/8/8/8/Q7 w - - 0 1', 1, 160],
    [START_FEN, 0, 9120],
    [START_FEN, 1, 9120],
].forEach(([fen, color, answer], id) => {
    test(`material:${id}`, () => {
        chess.load(fen, false);
        expect(chess.material(color)).toEqual(answer);
    });
});

// mobilities
[
    ['7k/8/8/8/8/8/8/7K w - - 0 1', [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    [START_FEN, [0, 16, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['7k/2q3bP/p2pbp2/r3n3/3QP3/2N5/2P1B3/3RK1R1 b - - 0 33', [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 13, 7, 13, 2, 0]],
].forEach(([fen, answer], id) => {
    test(`mobilities:${id}`, () => {
        chess.load(fen, false);
        chess.moves();
        answer = new Uint8Array(answer);
        expect(chess.mobilities()).toEqual(answer);
    });
});

// moveObject
[
    [
        START_FEN,
        {capture: 0, fen: '', flag: 0, from: 97, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 65},
        false,
        {capture: 0, fen: '', flag: 0, from: 97, m: 'b4', ply: 0, promote: 0, pv: '', score: 75, to: 65},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        {capture: 0, fen: '', flag: 0, from: 6, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 5},
        false,
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O-O', ply: 13, promote: 0, pv: '', score: 100, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        {capture: 0, fen: '', flag: 0, from: 6, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 7},
        false,
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O', ply: 15, promote: 0, pv: '', score: 120, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        {capture: 0, fen: '', flag: 0, from: 54, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 21},
        false,
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        {capture: 0, fen: '', flag: 0, from: 54, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 21},
        true,
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7+', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
    [
        '3r2r1/pp3p1k/8/7P/4R2K/1P3q1P/P7/3R4 b - - 7 29',
        {capture: 0, fen: '', flag: 0, from: 85, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 68},
        true,
        {capture: 4, fen: '', flag: 0, from: 85, m: 'Qxe4#', ply: 57, promote: 0, pv: '', score: 420, to: 68},
    ],
].forEach(([fen, move, decorate, answer], id) => {
    test(`moveObject:${id}`, () => {
        chess.load(fen, false);
        expect(chess.moveObject(move, decorate)).toEqual(answer);
    });
});

// moves
[
    ['1rk5/8/4n3/5B2/1N6/8/8/1Q1K4 b - - 0 1', 9, 'b8a8 b8b4 b8b5 b8b6 b8b7 c8b7 c8c7 c8d7 c8d8'],
    ['5k2/8/8/8/6pP/8/6K1/8 b - h3 0 17', 7, 'f8e7 f8e8 f8f7 f8g7 f8g8 g4g3 g4h3'],
    ['r2k1bnr/3bpppp/p1p3q1/QN2n3/8/1P2P3/1B2BPPP/R3K2R b HA - 3 16', 2, 'd8c8 d8e8'],
    ['3r2r1/pp3p1k/8/7P/4q2K/1P5P/P7/3R4 w - - 0 30', 0, ''],
    ['4k3/8/8/4q3/8/8/8/4RK2 b - - 0 1', 11, 'e5e1 e5e2 e5e3 e5e4 e5e6 e5e7 e8d7 e8d8 e8e7 e8f7 e8f8'],
    ['5K2/P1P5/3k2P1/5P2/8/8/8/8 w - - 0 68', 14, ''],
    ['7k/8/8/8/8/8/8/K7 w - - 0 1', 3, 'a1a2 a1b1 a1b2'],
    ['8/6B1/2R5/8/8/2k5/8/K7 b - - 0 1', 4, 'c3b3 c3b4 c3d2 c3d3'],
    ['8/8/2R5/8/8/2k5/8/K7 b - - 0 1', 5, 'c3b3 c3b4 c3d2 c3d3 c3d4'],
    ['8/8/5k2/8/2K5/8/8/8 w - - 0 1', 8, 'c4b3 c4b4 c4b5 c4c3 c4c5 c4d3 c4d4 c4d5'],
    ['8/8/8/3Q4/8/2k5/8/K7 b - - 0 1', 2, 'c3b4 c3c2'],
    ['8/8/8/3Q4/8/2k5/8/K7 w - - 0 1', 29, ''],
    ['8/8/8/8/3k4/2q5/1b6/K7 w - - 0 1', 2, ''],
    ['8/8/8/8/8/2k5/1b6/K7 w - - 0 1', 2, 'a1a2 a1b1'],
    ['8/8/8/8/8/2k5/8/K7 w - - 0 1', 2, 'a1a2 a1b1'],
    ['r1b1k1n1/pp2pp2/3p2p1/3P4/2P4b/1P3P2/P1N1PNP1/1R1QK3 w q - 0 17', 23, ''],
    ['r1b1kbn1/pp2pp2/3p2p1/3P4/2P4q/1P3P2/P1N1PNP1/1R1QK3 w q - 0 17', 23, ''],
    ['r1b1kbn1/pp2pp2/3p2p1/3P4/2P4r/1P3P2/P1N1PNP1/1R1QK3 w q - 0 17', 28, ''],
    ['r1b1kbn1/pp2pp2/3p2p1/3P4/2P5/1P3Pq1/P1N1PNP1/1R1QK3 w q - 0 17', 21, ''],
    [START_FEN, 20, ''],
    ['4k2r/7p/8/8/8/8/7P/4K2R w Kk - 0 20', 10, 'e1d1 e1d2 e1e2 e1f1 e1f2 e1h1 h1f1 h1g1 h2h3 h2h4'],
    ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 25, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', 47, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', 47, ''],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/5P2/1P1Np3/2QP1NPP/B1R1KBR1 w Qq - 0 12', 36, ''],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', 48, ''],
    ['r3k3/1P6/8/8/8/8/8/4K3 w q - 0 1', 13, ''],
].forEach(([fen, number, answer], id) => {
    test(`moves:${id}`, () => {
        chess.load(fen, false);
        let moves = ArrayJS(chess.moves());
        expect(moves.length).toEqual(number);
        if (answer) {
            let text = moves.map(move => chess.ucifyMove(move)).sort().join(' ');
            expect(text).toEqual(answer);
        }
    });
});

// moveSan
[
    [
        START_FEN,
        'd5', [false, false],
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        START_FEN,
        'd4', [false, false],
        {capture: 0, fen: '', flag: 0, from: 99, m: 'd4', ply: 0, promote: 0, pv: '', score: 120, to: 67},
    ],
    [
        START_FEN,
        'b2b4', [false, false],
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O', ply: 0, promote: 0, pv: '', score: 150, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'O-O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O-O', ply: 0, promote: 0, pv: '', score: 150, to: 112},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 3, m: 'O-O', ply: 19, promote: 0, pv: '', score: 150, to: 7},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 3, m: 'O-O', ply: 19, promote: 0, pv: '', score: 150, to: 7},
    ],
    [
        'brqnn1kr/ppppppbp/6p1/8/8/6P1/PPPPPPBP/BRQNN1KR w KQkq - 2 3',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 118, m: 'O-O', ply: 4, promote: 0, pv: '', score: 120, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 115, m: 'O-O', ply: 38, promote: 0, pv: '', score: 150, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20',
        'O-O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 115, m: 'O-O-O', ply: 38, promote: 0, pv: '', score: 160, to: 113},
    ],
    [
        '4k1r1/p2rbpp1/1q2p1n1/2pb3p/5P1P/1PB1P1P1/2Q1BN2/R3K1R1 w Gg - 2 21',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O', ply: 40, promote: 0, pv: '', score: 160, to: 118},
    ],
    [
        'rk2r3/1pp4p/p5bQ/P2q4/2R4P/1PB1p3/2P5/1K2R3 b q - 2 34',
        'O-O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 1, m: 'O-O-O', ply: 67, promote: 0, pv: '', score: 120, to: 0},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=Q', [false, false],
        {capture: 0, fen: '', flag: 0, from: 19, m: 'd8=Q', ply: 50, promote: 5, pv: '', score: 810, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q', [false, false],
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'axb1=Q', [false, false],
        {capture: 4, fen: '', flag: 0, from: 96, m: 'axb1=Q', ply: 51, promote: 5, pv: '', score: 810, to: 113},
    ],
    [
        'r2r2k1/pp4pp/2pN1pb1/8/5P2/6P1/PP2P1NP/R2K3R w KQ - 0 16',
        'O-O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 115, m: 'O-O-O', ply: 30, promote: 0, pv: '', score: 150, to: 112},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'O-O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O-O', ply: 13, promote: 0, pv: '', score: 100, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'O-O', [false, false],
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O', ply: 15, promote: 0, pv: '', score: 120, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'Nf7', [false, false],
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'Nf7', [true, false],
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7+', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
].forEach(([fen, move, [decorate, sloppy], answer], id) => {
    test(`moveSan:${id}`, () => {
        chess.load(fen, false);
        let result = chess.moveSan(move, decorate, sloppy);
        expect(result).toEqual(answer);
    });
});

// moveToSan
[
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 6, m: '', ply: -1, promote: 0, pv: '', score: 0, to: 20},
        'Ne7',
    ],
].forEach(([fen, move, answer], id) => {
    test(`moveToSan:${id}`, () => {
        chess.load(fen, false);
        let moves = chess.moves();
        expect(chess.moveToSan(chess.packObject(move), moves)).toEqual(answer);
    });
});

// moveUci
[
    [
        START_FEN,
        'd2d4', false,
        {capture: 0, fen: '', flag: 0, from: 99, m: 'd4', ply: 0, promote: 0, pv: '', score: 120, to: 67},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w AHah - 0 1',
        'e1h1', false,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O', ply: 0, promote: 0, pv: '', score: 150, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'e1g1', false,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O', ply: 0, promote: 0, pv: '', score: 150, to: 119},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10',
        'd8h8', false,
        {capture: 0, fen: '', flag: 1, from: 3, m: 'O-O', ply: 19, promote: 0, pv: '', score: 150, to: 7},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26',
        'a2b1q', false,
        {capture: 4, fen: '', flag: 0, from: 96, m: 'axb1=Q', ply: 51, promote: 5, pv: '', score: 810, to: 113},
    ],
    [
        'q4rkr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/Q4RKR b HFhf - 9 7',
        'g8f8', false,
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O-O', ply: 13, promote: 0, pv: '', score: 100, to: 5},
    ],
    [
        'qr4kr/ppp1bppp/2nnp3/1b1p4/3PP3/2NN1B2/PPPB1PPP/QR4KR b Hh - 11 8',
        'g8h8', false,
        {capture: 0, fen: '', flag: 1, from: 6, m: 'O-O', ply: 15, promote: 0, pv: '', score: 120, to: 7},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'g5f7', false,
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
    [
        '8/6p1/3k4/p2p2N1/6P1/7P/1Pn2K2/8 w - - 5 47',
        'g5f7', true,
        {capture: 0, fen: '', flag: 0, from: 54, m: 'Nf7+', ply: 92, promote: 0, pv: '', score: 115, to: 21},
    ],
].forEach(([fen, move, decorate, answer], id) => {
    test(`moveUci:${id}`, () => {
        chess.load(fen, false);
        expect(chess.moveUci(move, decorate)).toEqual(answer);
    });
});

// multiSan
[
    [
        START_FEN,
        '1. d4 d5 2. c4',
        false,
        [
            {
                capture: 0, fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', flag: 0, from: 99,
                m: 'd4', ply: 0, promote: 0, pv: '', score: 0, to: 67,
            },
            {
                capture: 0, fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2', flag: 0, from: 19,
                m: 'd5', ply: 1, promote: 0, pv: '', score: 0, to: 51,
            },
            {
                capture: 0, fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2', flag: 0, from: 98,
                m: 'c4', ply: 2, promote: 0, pv: '', score: 0, to: 66,
            },
        ],
        'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    ],
    [
        START_FEN,
        '1. b4 e5 2. Bb2 d6 3. e3 Be7 4. c4 Nf6 5. Nc3 O-O 6. Qc2 c6 7. Nf3 Bg4 8. Be2 Nbd7 9. h3 Bh5 10. O-O Bg6 11. Qb3 Ne4 12. Nxe4 Bxe4 13. Bc3 Qc7 14. a4 a5 15. bxa5 Nc5 16. Qb2 Bf6 17. d4 exd4 18. exd4 Ne6 19. Nd2 Bf5 20. Rfd1 Rfe8 21. Bf1 c5 22. Nb3 h6 23. dxc5 Bxc3 24. Qxc3 Nxc5 25. Nd4 Qd7 26. Qb4 Ra6 27. Ra2 Be6 28. Nxe6 Qxe6 29. Re2 Qc8 30. Rxe8+ Qxe8 31. g3 Qe7 32. Bg2 Kf8 33. Bd5 Qd7 34. Rd4 Qxa4 35. Qb1 Rxa5 36. Kg2 Ne6 37. Bxe6 fxe6 38. Qxb7 Qe8 39. Rxd6 Qa8 40. Qxa8+ Rxa8 41. Rxe6 Kf7 42. Rc6 h5 43. Rc5 g6 44. Kf3 Ra2 45. h4 Rc2 46. Kf4 Rxf2+ 47. Kg5 Rf3 48. Rc7+ Ke6 49. Kxg6 Rxg3+ 50. Kxh5',
        false,
        undefined,
        '8/2R5/4k3/7K/2P4P/6r1/8/8 b - - 0 50',
    ],
].forEach(([fen, multi, sloppy, answer, new_fen], id) => {
    test(`multiSan:${id}`, () => {
        chess.load(fen, false);
        let moves = ArrayJS(chess.multiSan(multi, sloppy));
        if (answer) {
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
        [
            {
                capture: 0, fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', flag: 0, from: 99,
                m: 'd4', ply: 0, promote: 0, pv: '', score: 0, to: 67,
            },
            {
                capture: 0, fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2', flag: 0, from: 19,
                m: 'd5', ply: 1, promote: 0, pv: '', score: 0, to: 51,
            },
            {
                capture: 0, fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2', flag: 0, from: 98,
                m: 'c4', ply: 2, promote: 0, pv: '', score: 0, to: 66,
            },
        ],
        'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    ],
    [
        START_FEN,
        'd2d4 d7d5 c2c4 c7c6 b1c3 g8f6 e2e3 e7e6 f1d3 d5c4 d3c4 a7a6 a2a4 c6c5 g1f3 b8c6 e1g1 f8e7 d4c5 d8d1 f1d1 e7c5 h2h3 e8e7 e3e4 h8d8 d1d8 e7d8 e4e5 f6d7 c1f4 c5e7 c3e4 d7b6 c4b3 c6a5 b3a2 b6a4 f4e3 d8c7 a1c1 a5c6 c1c2 b7b6 a2b3 a4c5 e4c5 b6c5 e3c5 e7c5 c2c5 c7b6 c5c3 c8b7 f3g5 a8f8 g5h7 f8d8 h7g5 c6e5 c3e3 b7d5 f2f4 e5c4 e3c3 c4d6 f4f5 d6f5 g5f7 d8d7 f7e5 d7c7 c3d3 b6c5 b3d5 e6d5 d3c3 c5b6 c3d3 b6c5 d3c3 c5b6 c3c7 b6c7 g1f2 a6a5 g2g4 c7d6 e5f3',
        '1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. e3 e6 5. Bd3 dxc4 6. Bxc4 a6 7. a4 c5 8. Nf3 Nc6 9. O-O Be7 10. dxc5 Qxd1 11. Rxd1 Bxc5 12. h3 Ke7 13. e4 Rd8 14. Rxd8 Kxd8 15. e5 Nd7 16. Bf4 Be7 17. Ne4 Nb6 18. Bb3 Na5 19. Ba2 Nxa4 20. Be3 Kc7 21. Rc1+ Nc6 22. Rc2 b6 23. Bb3 Nc5 24. Nxc5 bxc5 25. Bxc5 Bxc5 26. Rxc5 Kb6 27. Rc3 Bb7 28. Ng5 Rf8 29. Nxh7 Rd8 30. Ng5 Nxe5 31. Re3 Bd5 32. f4 Nc4 33. Rc3 Nd6 34. f5 Nxf5 35. Nxf7 Rd7 36. Ne5 Rc7 37. Rd3 Kc5 38. Bxd5 exd5 39. Rc3+ Kb6 40. Rd3 Kc5 41. Rc3+ Kb6 42. Rxc7 Kxc7 43. Kf2 a5 44. g4 Kd6 45. Nf3',
        '8/6p1/3k4/p2p1n2/6P1/5N1P/1P3K2/8 b - - 2 45',
    ],
    [
        'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
        '1. d2d4q g8f6q 2. c1b3q c8b6q 3. e2e4q',
        '1. d4 Nf6 2. Nb3 Nb6 3. e4',
        'rk1rbq1b/pppppppp/1n3n2/8/3PP3/1N6/PPP2PPP/RK1RBQNB b DAda e3 0 3',
    ],
].forEach(([fen, multi, answer, new_fen], id) => {
    test(`multiUci:${id}`, () => {
        chess.load(fen, false);
        let moves = ArrayJS(chess.multiUci(multi));
        if (answer) {
            for (let move of moves)
                expect(get_move_ply({fen: move.fen})).toEqual(move.ply);
            if (IsString(answer))
                moves = moves.map((item, id) => `${!(id & 1)? (1 + id / 2 + '. '): ''}${item.m}`).join(' ');
            expect(moves).toEqual(answer);
        }
        expect(chess.fen()).toEqual(new_fen);
    });
});

// nodes
[
    ['8/7b/8/2k3P1/p3K3/8/1P6/8 w - - 0 1', 's=mm', 1, true, 'e4e3 e4e5 e4f3 e4f4 g5g6'],
    ['8/8/8/2k2pP1/p3K3/8/1P6/8 w - f6 0 2', 's=mm', 1, true, 'e4d3 e4e3 e4e5 e4f3 e4f4 e4f5 g5f6'],
    [START_FEN, 's=mm', 4, true, 206603],
    [START_FEN, 's=mm', 3, true, 9322],
    [START_FEN, 's=mm', 2, true, 420],
    [START_FEN, 's=mm', 1, true, 20],
    [START_FEN, 'd=0 s=mm', 0, true, 1],
    [START_FEN, 's=ab', 5, true, 74952],
    [START_FEN, 's=ab', 5, false, 25346],
    [START_FEN, 's=ab', 4, true, 11695],
    [START_FEN, 's=ab', 3, true, 1245],
    [START_FEN, 's=ab', 2, true, 420],
    [START_FEN, 's=ab', 1, true, 20],
    [START_FEN, 'd=0 s=ab', 0, true, 1],
    ['6k1/pp1R1np1/7p/5p2/3B4/1P3P1P/r5P1/7K w - - 0 33', 's=mm', 4, true, 421547],
    ['6k1/pp1R1np1/7p/5p2/3B4/1P3P1P/r5P1/7K w - - 0 33', 's=ab', 4, true, 22323],
    ['6k1/pp1R1np1/7p/5p2/3B4/1P3P1P/r5P1/7K w - - 0 33', 's=ab', 4, false, 4117],
].forEach(([fen, options, depth, scan_all, answer], id) => {
    test(`nodes:${id}`, () => {
        chess.configure(false, options, depth);
        chess.load(fen, false);
        let moves = ArrayJS(chess.moves());
        chess.search(moves.join(' '), scan_all);
        let nodes = chess.nodes();
        if (IsString(answer)) {
            let text = moves.map(move => chess.ucifyMove(move)).sort().join(' ');
            expect(text).toEqual(answer);
        }
        else
            expect(nodes).toEqual(answer);
    });
});

// order
[
    [
        START_FEN,
        ['', 1],
        'd2d4 e2e4 b1c3 g1f3 d2d3 e2e3 b1a3 g1h3 b2b3 g2g3 c2c4 f2f4 a2a3 c2c3 h2h3 a2a4 b2b4 f2f3 g2g4 h2h4',
    ],
    [
        'bn2r1rn/p2pk1p1/1p1p1pp1/1q6/1PP1P1B1/3P4/6RP/4RK1N w E - 0 18',
        ['', 4],
        'c4b5 g4d7 f1g1 f1e1 h1f2 h1g3 d3d4 g4f5 g4e6 g4h5 g4h3 g4f3 g4e2 g4d1 g2g3 g2g1 g2f2 g2e2 g2d2 g2c2 g2b2 g2a2 e1e2 e1e3 e1d1 e1c1 e1b1 e1a1 f1e2 f1f2 c4c5 e4e5 h2h3 h2h4',
    ],
    [
        'Qbk1r1b1/1p3p1p/2p1p3/5P2/6q1/B7/PPKn3P/NBR1R3 w - - 1 22',
        ['', 4],
        'c2d2 a8b8 f5e6 e1e6 a8b7 a1b3 f5f6 a8a7 a8a6 a8a5 a8a4 a3b4 a3c5 a3d6 a3e7 a3f8 c2c3 c2d3 c1d1 e1e2 e1e3 e1e4 e1e5 e1f1 e1g1 e1h1 e1d1 b2b3 h2h3 b2b4 h2h4',
    ],
    [
        '3r4/2p2k2/6p1/2p5/4N2p/PP2N3/2P2PK1/2R5 b - - 3 35',
        ['', 4],
        'f7g8 d8d2 h4h3 d8e8 d8f8 d8g8 d8h8 d8d7 d8d6 d8d5 d8d4 d8d3 d8d1 d8c8 d8b8 d8a8 f7e8 f7f8 f7g7 f7e6 f7e7 c5c4 c7c6 g6g5',
    ],
    [
        '8/1PP5/4k3/8/6Pp/4pK2/8/8 w - - 0 47',
        [ '', 4],
        'b7b8q c7c8q b7b8r c7c8r b7b8b b7b8n c7c8b c7c8n f3e3 g4g5 f3e4 f3f4 f3g2 f3e2',
    ],
].forEach(([fen, [options, depth], answer], id) => {
    test(`order:${id}`, () => {
        chess.configure(false, options, depth);
        chess.load(fen, false);
        let moves = chess.moves();
        chess.order(moves);
        moves = ArrayJS(moves).map(move => chess.ucifyMove(move)).join(' ');
        expect(moves).toEqual(answer);
    });
});

// packObject
[
    [{capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0}, 0],
    [{capture: 0, fen: '', flag: 0, from: 20, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 36}, 1208614912],
    [{capture: 0, fen: '', flag: 0, from: 99, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 67}, 2251390976],
    [{capture: 0, fen: '', flag: 0, from: 1, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 34}, 1140883456],
    [{capture: 0, fen: '', flag: 0, from: 97, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 65}, 2184216576],
    [{capture: 1, fen: '', flag: 0, from: 5, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 65}, 2181202944],
].forEach(([move, answer], id) => {
    test(`packObject:${id}`, () => {
        let number = chess.packObject(move);
        expect(number).toEqual(answer);
        expect(chess.unpackMove(number)).toEqual(move);
    });
});

// params
[
    [false, 'd=5', 0, [5, 1, 1e9, 0, 0, 0]],
    [false, 'e=mat', 0, [4, 1, 1e9, 0, 0, 0]],
    [false, 'e=mob n=1000', 0, [4, 2, 1000, 0, 0, 0]],
    [false, 'd=8 q=32', 0, [8, 1, 1e9, 0, 0, 32]],
].forEach(([frc, options, depth, answer], id) => {
    test(`params:${id}`, () => {
        chess.configure(frc, options, depth);
        let params = ArrayJS(chess.params());
        expect(params).toEqual(answer);
        expect(chess.frc()).toEqual(frc);
    });
});

// perft
// https://sites.google.com/site/numptychess/perft/position-1
// http://www.rocechess.ch/perft.html
// https://www.chessprogramming.org/Perft_Results
// https://www.chessprogramming.org/Chess960_Perft_Results
[
    // 960
    ['bbqrnnkr/1ppp1p1p/5p2/p5p1/P7/1P4P1/2PPPP1P/1BQRNNKR w HDhd - 0 9	', 5, 3588435],     // ok
    ['bbrqk1rn/pp1ppppp/8/2p5/2P1P3/5n1P/PPBP1PP1/B1RQKNRN w GCgc - 1 9', 5, 2518864],
    ['bqnb1rkr/pp3ppp/3ppn2/2p5/5P2/P2P4/NPP1P1PP/BQ1BNRKR w HFhf - 2 9', 4, 326672],   // ok
    ['brkqnnrb/1ppppppp/8/8/p3P3/5N2/PPPP1PPP/BRKQ1NRB w GBgb - 3 9', 4, 204350],
    ['brq1nkrb/ppp2ppp/8/n2pp2P/P7/4P3/1PPP1PP1/BRQNNKRB w GBgb - 1 9', 4, 235162],
    ['nrbnkrqb/pppp1p1p/4p1p1/8/7P/2P1P3/PPNP1PP1/1RBNKRQB w FBfb - 0 9', 4, 242762],
    // ['nrkbnrbq/ppppppp1/8/8/7p/PP3P2/2PPPRPP/NRKBN1BQ w Bfb - 0 9', 5, 3008668],    // ERROR
    ['r1krnnbq/pp1ppp1p/6p1/2p5/2P5/P3P3/Rb1P1PPP/1BKRNNBQ w Dda - 0 9', 5, 937188],

    // talkchess / martin sedlak
    // ['2K2r2/4P3/8/8/8/8/8/3k4 w - - 0 1', 6, 3821001],   // ok
    ['3k4/3p4/8/K1P4r/8/8/8/8 b - - 0 1', 6, 1134888],
    ['3k4/8/8/8/8/8/8/R3K3 w Q - 0 1', 6, 803711],
    ['4k3/1P6/8/8/8/8/K7/8 w - - 0 1',6, 217342],
    ['5k2/8/8/8/8/8/8/4K2R w K - 0 1', 6, 661072],
    ['8/5k2/8/5N2/5Q2/2K5/8/8 w - - 0 1', 4, 23527],
    ['8/8/1k6/2b5/2pP4/8/5K2/8 b - d3 0 1', 6, 1440467],
    ['8/8/1P2K3/8/2n5/1q6/8/5k2 b - - 0 1', 5, 1004658],
    ['8/8/2k5/5q2/5n2/8/5K2/8 b - - 0 1', 4, 23527],
    ['8/8/4k3/8/2p5/8/B2P2K1/8 w - - 0 1', 6, 1015133],
    ['8/k1P5/8/1K6/8/8/8/8 w - - 0 1', 7, 567584],
    ['8/P1k5/K7/8/8/8/8/8 w - - 0 1', 6, 92683],
    ['K1k5/8/P7/8/8/8/8/8 w - - 0 1', 6, 2217],
    ['r3k2r/1b4bq/8/8/8/8/7B/R3K2R w KQkq - 0 1', 4, 1274206],
    ['r3k2r/8/3Q4/8/8/5q2/8/R3K2R b KQkq - 0 1', 4, 1720476],

    // pin:pawn
    ['3k4/8/8/K1Pp3r/8/8/8/8 w - d6 0 2', 1, '1=6 a5a4:1 a5a6:1 a5b4:1 a5b5:1 a5b6:1 c5c6:1'],
    ['4K3/8/5k2/8/8/3p1n2/4P3/4r3 w - - 0 1', 1, '1=5 e2e3:1 e2e4:1 e8d7:1 e8d8:1 e8f8:1'],
    ['5k2/K3p3/5N2/8/1B6/8/8/8 b - d6 0 2', 1, '1=3 e7d6:1 f8f7:1 f8g7:1'],
    ['6k1/2K5/8/3pP3/8/6b1/8/8 w - d6 0 2', 1, '1=9 c7b6:1 c7b7:1 c7b8:1 c7c6:1 c7c8:1 c7d6:1 c7d7:1 c7d8:1 e5d6:1'],
    ['6k1/4K3/8/2Pp4/8/b7/8/8 w - d6 0 2', 1, '1=7 c5d6:1 e7d6:1 e7d7:1 e7d8:1 e7e6:1 e7e8:1 e7f6:1'],
    ['6k1/4K3/8/3pP3/8/8/4r3/8 w - d6 0 2', 1, '1=7 e5e6:1 e7d6:1 e7d7:1 e7d8:1 e7e6:1 e7e8:1 e7f6:1'],
    ['8/8/8/8/k7/2p1n3/K2P3r/8 w - - 0 1', 1, '1=2 a2a1:1 a2b1:1'],
    ['b2k4/8/2P5/3p4/8/5K2/8/8 w - d6 0 2', 1, '1=8 c6c7:1 f3e2:1 f3e3:1 f3f2:1 f3f4:1 f3g2:1 f3g3:1 f3g4:1'],
    ['Q7/K3pk2/3R4/8/8/1B6/8/6R1 b - d6 0 2', 1, '1=1 e7e6:1'],
    ['Q7/K4p1k/2R5/8/8/8/2B5/6R1 b - d6 0 2', 1, '1=1 f7f5:1'],
    // pin:piece
    ['r3krR1/p6p/8/B7/1pp1p3/3b4/P6P/R3K3 b Qq - 3 2', 1, '1=17 a7a6:1 a8b8:1 a8c8:1 a8d8:1 b4b3:1 c4c3:1 d3b1:1 d3c2:1 d3e2:1 d3f1:1 e4e3:1 e8d7:1 e8e7:1 e8f7:1 f8g8:1 h7h5:1 h7h6:1'],
    // special
    ['8/5p2/8/2k3P1/1P6/8/4K3/n7 b - b3 0 4', 1, '1=8 c5b4:1 c5b5:1 c5b6:1 c5c4:1 c5c6:1 c5d4:1 c5d5:1 c5d6:1'],
    ['3rk2r/p1B4p/8/8/1pp1p3/8/P1b4P/R2K3R w k - 4 3', 1, '1=4 d1c1:1 d1c2:1 d1e1:1 d1e2:1'],

    // roce:good
    // ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 6, 8031647685],     // SLOW ??
    // ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 5, 193690690],      // slow
    // ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 4, 4085603],        // ok
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 2, 2039],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 1, 48],
    // roce:promotion
    // ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 6, 71179139],    // slow
    // ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 5, 3605103],     // ok
    ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 4, 182838],
    ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 3, 9483],
    ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 2, 496],
    ['n1n5/PPPk4/8/8/8/8/4Kp1p/5NnN w - - 0 2', 1, '1=5 e2d1:1 e2d2:1 e2d3:1 e2e3:1 e2f2:1'],
    ['n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', 1, 24],

    // numpty: 1
    // [START_FEN, 7, 3195901860],  // ??
    // [START_FEN, 6, 119060324],
    [START_FEN, 5, 4865609],
    [START_FEN, 4, 197281],
    [START_FEN, 3, 8902],
    [START_FEN, 2, 400],
    [START_FEN, 1, 20],
    // numpty: 2
    // ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 8, 8103790],    // ok
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 7, 966152],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 6, 120995],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 5, 14062],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 4, 2002],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 3, 237],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 2, '1=5 2=39 a4a3:8 a4a5:7 b5b6:8 h2h3:8 h2h4:8'],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 2, 39],
    ['8/p7/8/1P6/K1k3p1/6P1/7P/8 w - - 0 1', 1, 5],
    // numpty: 3
    // ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 6, 77054993],   // slow
    // ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 5, 3186478],    // ok
    ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 4, 150072],
    ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 3, 6666],
    ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 2, 341],
    ['r3k2r/p6p/8/B7/1pp1p3/3b4/P6P/R3K2R w KQkq - 0 1', 1, 17],
    // numpty: 4
    // ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 8, 64451405],   // slow
    // ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 7, 6627106],    // ok
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 6, 703851],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 5, 72120],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 4, 7658],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 3, 795],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 2, 85],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 2, '1=9 2=85 a4a3:10 c5b4:10 c5b5:11 c5b6:11 c5c4:8 c5c6:10 c5d6:9 f7f5:7 f7f6:9'],
    ['8/5p2/8/2k3P1/p3K3/8/1P6/8 b - - 0 1', 1, 9],
    // numpty: 5
    ['r3k2r/pb3p2/5npp/n2p4/1p1PPB2/6P1/P2N1PBP/R3K2R b KQkq - 0 1', 4, 909807],
    ['r3k2r/pb3p2/5npp/n2p4/1p1PPB2/6P1/P2N1PBP/R3K2R b KQkq - 0 1', 3, 27990],
    ['r3k2r/pb3p2/5npp/n2p4/1p1PPB2/6P1/P2N1PBP/R3K2R b KQkq - 0 1', 2, 953],
    ['r3k2r/pb3p2/5npp/n2p4/1p1PPB2/6P1/P2N1PBP/R3K2R b KQkq - 0 1', 1, 29],
].forEach(([fen, depth, answer], id) => {
    test(`perft:${id}`, () => {
        let text = chess.perft(fen, depth);
        if (IsString(answer))
            expect(text).toEqual(answer);
        else {
            let pos = text.lastIndexOf('='),
                pos2 = text.indexOf(' ', pos + 1),
                count = text.slice(pos + 1, pos2) * 1;
            if (count != answer)
                LS(text);
            expect(count).toEqual(answer);
        }
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
        chess.load(fen, false);
        expect(chess.print(false)).toEqual(answer);
    });
});

// put
[
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        13, 3,
        '1r1qkb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        5, 3,      // 'd8',
        '1r1Qkb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
        5, 123,    // 'e0',
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20',
    ],
    [
        '8/8/8/8/8/8/8/8 w - - 0 1',
        6, 116,    // 'e1',
        '8/8/8/8/8/8/8/4K3 w - - 0 1',
    ],
    [
        '8/8/8/8/8/8/8/8 w - - 0 1',
        6, 116,
        '8/8/8/8/8/8/8/4K3 w - - 0 1',
    ],
].forEach(([fen, piece, square, answer], id) => {
    test(`put:${id}`, () => {
        chess.load(fen, false);
        chess.put(piece, square);
        expect(chess.fen()).toEqual(answer);
    });
});

// reset
[
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', START_FEN],
].forEach(([fen, answer], id) => {
    test(`reset:${id}`, () => {
        chess.load(fen, false);
        chess.reset();
        expect(chess.fen()).toEqual(answer);
    });
});

// sanToObject
[
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Ne7', false,
        {capture: 0, fen: '', flag: 0, from: 6, m: 'Ne7', ply: 7, promote: 0, pv: '', score: 108, to: 20},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7', false,
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        'r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4',
        'Nge7', true,
        {capture: 0, fen: '', flag: 0, from: 6, m: 'Ne7', ply: 7, promote: 0, pv: '', score: 108, to: 20},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q', false,
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'd8=q', true,
        {capture: 0, fen: '', flag: 0, from: 19, m: 'd8=Q', ply: 50, promote: 5, pv: '', score: 810, to: 3},
    ],
    [
        'r1b2r1k/p2P1p1p/3NP1p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 w - - 0 26',
        'Rd1', false,
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
].forEach(([fen, san, sloppy, answer], id) => {
    test(`sanToObject:${id}`, () => {
        chess.load(fen, false);
        let moves = chess.moves(),
            move = chess.sanToObject(san, moves, sloppy);
        expect(move).toEqual(answer);
    });
});

// search
[
    [START_FEN, '', 'd=4 e=hce p=1 s=mm', 0, {}],
    ['1rb1kbnq/1p1p4/p1nPp1p1/6Br/5Q2/P1N2N2/1P2PPPP/3RKB1R w K -', 'f4f7', 'd=5 e=att q=2 s=ab t=0', -2127, {}],
    ['r2k1bnr/3bpppp/pnp3q1/QN6/8/1P2P3/1B2BPPP/2KR3R w - - 6 18', 'a5b6', 'd=5 s=ab x=20', 30991, {}],
    ['1nb2k1r/rpbpqp1p/p4n1P/P1p1p1p1/R6R/2N3P1/1PPPPP2/2BQKBN1 w - g6 0 11', 'c3b5', 'e=hce q=2 s=ab', -1985, {}],
    ['4B2k/8/8/8/1P2N2P/2P1P1R1/P2PKPP1/R1B3N1 w - - 13 42', '', '', [], {e4f6: 40, g3g5: 7028}],
    ['4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73', '', 1, 1260, {}],
    ['4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73', '', 2, 30999, {1: 'g5e6 h7f7'}],
    ['4nk2/7Q/8/4p1N1/r3P3/q1P1NPP1/4K3/6R1 w - - 2 73', '', 3, 30999, {1: 'g5e6 h7f7'}],
    ['7k/2Q5/8/1B2P3/8/2PRKN2/8/8 w - - 1 47', '', '', [], {1: 'd3d8', b5c4: 50, c7f7: 50}],
    ['7k/3Q4/1p6/2p5/4K3/1P4PP/P6q/8 w - - 48 107', '', 3, [], {a2a3: 188, d7d8: 511, d7h7: -2345}],
    ['8/6Q1/7p/7k/4P3/P2P2K1/8/8 w - - 0 75', '', 'd=2 e=mat s=mm', [], {g3h3: 0, g7g4: 30999}],
    ['8/7R/8/4B3/P5N1/6P1/PKP3k1/7r b - - 48 96', '', 3, [], {h1b1: -3565, h1h7: -980}],
    ['bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1p1/1N6/PPP2PKP/B2R3R w h -', '', 'd=4 e=hce s=ab', [], {g5d2: -332, h2h4: -3005}],
    ['bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1p1/1N6/PPP2PKP/B2R3R w h -', '', 'd=4 e=hce s=mm', [], {g5d2: -332, h2h4: -3005}],
    ['r1b1kbnr/p2np2p/8/5p1P/8/N7/2P2qP1/4K1NR w kq - 0 16', '', 1, [], {1: 'e1f2'}],
    ['r1b5/ppppn2r/8/4P1Kp/3k1B2/6P1/P6P/4R3 w - - 8 28', '', 'd=2 e=qui q=1 s=ab', [], {e1d1: -2034, e1e4: -3488}],
    ['rn1qkbnr/pp2pppp/8/2pp4/1P5P/2PQ1P2/P3P1P1/RNB1KBNR w KQkq c6 0 7', 'd3h7', 'd=1 e=hce q=1 s=ab', -1737, {}],
    ['rn1qkbnr/pp2pppp/8/2pp4/1P5P/2PQ1P2/P3P1P1/RNB1KBNR w KQkq c6 0 7', 'd3h7', 'd=1 e=hce q=1 s=mm', 880, {}],
    ['rn1qkbnr/ppp1pppp/8/3p4/6bP/6P1/PPPPPP2/RNBQKBNR w KQkq - 1 3', 'e2e4', 'd=3 e=hce q=1 s=ab', -1880, {}],
    ['rnb1k1nr/1p1p1p2/1qp1p3/4P1pp/p2P4/1N1B4/PPP2PPP/R2QK1NR w KQkq -', '', 3, [], {b3c1: 0, b3c5: 0, b3d2: 0}],
    ['rnb1k1nr/pppp1pp1/4p2p/8/2PP2q1/2PBPN2/P4PPP/R1BQK2R w KQkq - 2 8', '', 1, [], {2: 'e1h1'}],
    ['rnbq1bnr/ppppk1pp/5p2/4p3/8/3P1N2/PPPQPPPP/RNB1KB1R w KQ - 2 4', 'd2g5', 'd=3 e=hce q=1 s=ab', -2321, {}],
    ['rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5', '', 1, 2434, {}],
    ['rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5', 'b8c6', 1, -160, {}],
    ['rnbqkbnr/p3ppQp/1p1p4/1N6/8/8/PPP1PPPP/R1B1KBNR b KQkq - 0 5', 'b8c6', 2, -1444, {}],
].forEach(([fen, mask, config, answer, checks], id) => {
    test(`search:${id}`, () => {
        let [frc, options, depth] =
            (IsString(config)? [false, config, 0]: (Number.isInteger(config)? [false, '', config]: config));
        chess.configure(frc, options, depth);
        chess.load(fen, false);

        let moves = ArrayJS(chess.moves());
        if (mask) {
            let mask_set = new Set(mask.split(' '));
            moves = moves.filter(move => mask_set.has(chess.ucifyMove(move)));
        }
        let objs = ArrayJS(chess.search(moves.join(' '), true));
        objs.sort((a, b) => b.score - a.score);

        let best = objs[0],
            bests = objs.filter(mask => mask.score <= best.score + 0.001),
            keys = Keys(checks),
            ucis = new Set(bests.map(mask => mask.m));

        if (keys.length) {
            let missing = false,
                dico = Assign({}, ...objs.map(move => ({[move.m]: move.score})));
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
                    if (Number.isInteger(check))
                        check = [check - 50, check + 50];
                    if (value < check[0] || value > check[1])
                        LS(dico);
                    expect(value).toBeGreaterThanOrEqual(check[0]);
                    expect(value).toBeLessThanOrEqual(check[1]);
                }
            });
            if (missing) {
                LS(`id=${id} : missing=${missing}`);
                LS(dico);
                expect(missing).toBeFalse();
            }
        }

        if (Number.isInteger(answer))
            answer = [answer -50, answer + 50];
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
    [START_FEN, '', 0],
    [START_FEN, 'e4', 1],
    [START_FEN, 'e4 d5', 0],
    ['rnbqkbnr/pp1ppppp/8/1Bp5/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2', 'e6', 0],
].forEach(([fen, moves, answer], id) => {
    test(`turn:${id}`, () => {
        chess.load(fen, false);
        for (let move of moves.split(' '))
            chess.moveSan(move, false, false);
        expect(chess.turn()).toEqual(answer);
    });
});

// ucifyMove
[
    [1208614912, 'e7e6'],
    [2251390976, 'd2d4'],
].forEach(([move, answer], id) => {
    test(`ucifyMove:${id}`, () => {
        expect(chess.ucifyMove(move)).toEqual(answer);
    });
});

// ucifyObject
[
    [
        {capture: 0, depth: 0, fen: '', flag: 0, from: 99, m: '', ply: 0, promote: 0, pv: '', score: 0, to: 67},
        'd2d4',
    ],
    [
        {capture: 4, depth: 0, fen: '', flag: 0, from: 96, m: '', ply: 51, promote: 5, pv: '', score: 0, to: 113},
        'a2b1q',
    ],
].forEach(([move, answer], id) => {
    test(`ucifyObject:${id}`, () => {
        expect(chess.ucifyObject(move)).toEqual(answer);
    });
});

// undo
[
    [START_FEN, 'e4', 1, '', [1449171223, 2851721280]],
    [START_FEN, '', 1, '', [1449171223, 2851721280]],
    [START_FEN, 'e4 e5', 1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', [3016215727, 2857690465]],
    [START_FEN, 'e4 e5', 2, '', [1449171223, 2851721280]],
    ['r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'O-O', 1, '', [2063398905, 2654829949]],
    ['r1bqk2r/ppppbppp/3n4/4R3/8/8/PPPP1PPP/RNBQ1BK1 b kq - 0 8', 'O-O', 1, '', [1272697903, 3887138050]],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', 'O-O', 1, '', [2030799990, 4030562210]],
    ['1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', 'O-O-O', 1, '', [2030799990, 4030562210]],
    ['b1nrk1r1/p3bppp/4p1n1/Pqp5/3p1P2/1P1NP3/2QP1NPP/B2RKBR1 w Dd - 1 11', 'O-O-O', 1, '', [4034064681, 359707402]],
    [
        '4N3/4R3/1Q6/8/1k2P2P/4KP2/6P1/8 b - - 2 108',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 65, m: '', ply: 215, promote: 0, pv: '', score: 0, to: 48},
        1, '', [2584252073, 4038902842],
    ],
    [
        '4N3/4R3/1Q6/8/1k2P2P/4KP2/6P1/8 b - - 2 108',
        {capture: 0, depth: 0, fen: '', flag: 0, from: 65, m: '', ply: 215, promote: 0, pv: '', score: 0, to: 80},
        1, '', [2584252073, 4038902842],
    ],
    [
        'r1b1kb1r/p1pp1ppp/1p2pn2/7q/1nPPP3/BP1B1N1P/P4PP1/RN1Q1RK1 b ha - 2 10',
        'Nxd3 Bxf8 Nb2 Qc2 Rxf8 Qxb2 Nxe4',
        7, '', [1484355998, 3445566561],
    ],
    ['bq1b1k1r/p1pp1r2/1p6/3Pp1Q1/4p1pP/1N6/PPP2PK1/B2R3R b h h3 0 17', 'gxh3+', 1, '', [2152484851, 3605274865]],
    ['5k2/8/8/8/6pP/8/6K1/8 b - h3 0 17', 'gxh3+', 1, '', [1514358265, 2342289575]],
].forEach(([fen, moves, steps, answer, hash], id) => {
    test(`undo:${id}`, () => {
        chess.load(fen, true);
        let materials = [chess.material(0), chess.material(1)];
        if (IsString(moves)) {
            for (let move of moves.split(' '))
                chess.moveSan(move, false, false);
        }
        else
            chess.makeMove(chess.packObject(moves));
        for (let i = 0; i < steps; i ++)
            chess.undo();
        expect(chess.fen()).toEqual(answer || fen);
        if (!answer) {
            expect(chess.material(0)).toEqual(materials[0]);
            expect(chess.material(1)).toEqual(materials[1]);
        }
        let result = chess.boardHash() >>> 0;
        if (IsArray(hash))
            expect(hash).toContain(result);
        else
            expect(result).toEqual(hash);
    });
});

// unpackMove
[
    [0, {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0}, 'a8a8'],
    [1208614912, {capture: 0, fen: '', flag: 0, from: 20, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 36}, 'e7e6'],
    [2251390976, {capture: 0, fen: '', flag: 0, from: 99, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 67}, 'd2d4'],
    [1140883456, {capture: 0, fen: '', flag: 0, from: 1, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 34}, 'b8c6'],
    [2184216576, {capture: 0, fen: '', flag: 0, from: 97, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 65}, 'b2b4'],
    [2181202944, {capture: 1, fen: '', flag: 0, from: 5, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 65}, 'f8b4'],
].forEach(([number, answer, uci], id) => {
    test(`unpackMove:${id}`, () => {
        let move = chess.unpackMove(number);
        expect(chess.ucifyObject(move)).toEqual(uci);
        expect(move).toEqual(answer);
    });
});

// version
[
    '20200926',
].forEach((answer, id) => {
    test(`version:${id}`, () => {
        expect(chess.version()).toEqual(answer);
    });
});
});
