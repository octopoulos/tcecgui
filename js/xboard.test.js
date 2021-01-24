// xboard.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-01-23
//
/*
globals
expect, global, require, test
*/
'use strict';

let {Assign, Keys} = require('./common.js'),
    {load_defaults, Y} = require('./engine.js'),
    {create_boards} = require('./game.js'),
    {xboards} = require('./global.js'),
    {prepare_settings} = require('./startup.js'),
    {START_FEN} = require('./xboard.js');

global.T = null;

prepare_settings();
load_defaults();
Y.volume = 0;
create_boards('text');

let archive = xboards.archive,
    live = xboards.live;

live.initialise();
live.dual = archive;
live.id = 'null';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add_moves_string
[
    [
        '1. d4 Nf6 2. c4 c5 3. d5',
        0,
        [
            0,
            {
                agree: 0, fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
                from: 99, m: 'd4', ply: 0, san: 'd4', score: 120, to: 67,
            },
            {agree: 0, m: 'Nf6'}, {agree: 0, m: 'c4'}, {agree: 0, m: 'c5'}, {agree: 0, m: 'd5'},
        ],
    ],
    [
        '38...Qg7 39. Rf2 Qh6 40. Nxg6',
        75,
        [
            75,
            {agree: 0, m: 'Qg7', ply: 75}, {agree: 0, m: 'Rf2'}, {agree: 0, m: 'Qh6'}, {agree: 0, m: 'Nxg6'},
        ],
    ],
    [
        '41...Kxg8 42. a8=Q+ Kg7',
        81,
        [
            81,
            {agree: 0, m: 'Kxg8', ply: 81}, {agree: 0, m: 'a8=Q+'}, {agree: 0, m: 'Kg7'},
        ],
    ],
].forEach(([text, cur_ply, answer], id) => {
    test(`add_moves_string:${id}`, () => {
        live.reset(Y.x);
        live.add_moves_string(text, cur_ply);

        let offset = answer[0],
            array = new Array(offset);
        for (let i = 1; i < answer.length; i ++)
            array[offset + i - 1] = answer[i];

        expect(live.moves).toEqual(array);
    });
});

// analyse_fen
[
    ['invalid fen', false],
    [START_FEN, true],
    ['1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 Nc6', false],
    ['1. e4 c5 2. Nf3 d6', false],
    ['4k3/1q5p/8/8/8/7K/8/7B w - - 0 31', true],
    ['4k3/1B5p/8/8/8/7K/8/8 b - - 0 31', true],
    ['4k3/1B5p/8/8/8/7K/8/8 b - -', true],
].forEach(([fen, answer], id) => {
    test(`analyse_fen:${id}`, () => {
        expect(live.analyse_fen(fen)).toEqual(answer);
    });
});

// chess_fen
[
    [START_FEN, ['d5'], START_FEN],
    [START_FEN, ['d4'], 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'],
    [START_FEN, ['d4', 'd5'], 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'],
    ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', ['O-O'], 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 b ha - 1 1'],
    ['r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', ['O-O-O'], 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/2KR3R b ha - 1 1'],
].forEach(([fen, moves, answer], id) => {
    test(`chess_fen:${id}`, () => {
        live.chess_load(fen);
        for (let move of moves)
            live.chess_move(move, false);
        expect(live.chess_fen()).toEqual(answer);
    });
});

// chess_load
[
    START_FEN,
].forEach((fen, id) => {
    test(`chess_load:${id}`, () => {
        live.chess_load(fen);
        expect(live.chess_fen()).toEqual(fen);
    });
});

// chess_mobility
[
    [{fen: '5k2/5Q2/5K2/8/8/8/8/8 b - - 0 1'}, 0],
    [{fen: '8/8/8/8/8/5k2/5p2/5K2 w - - 0 1'}, -0.5],
    [{fen: '8/8/7k/5B2/6K1/8/8/8 b - - 0 1'}, 1.5],
    [{fen: '8/8/4k3/5q2/6K1/8/8/8 w - - 0 1'}, -2],
    [{fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}, -20.5],
    [{fen: 'b1nrk1r1/p3bppp/4p1n1/Pqp5/5P2/1P1Np3/2QP1NPP/B1R1KBR1 w Qq - 0 12', frc: true}, -36.5],
].forEach(([move, answer], id) => {
    test(`chess_mobility:${id}`, () => {
        expect(live.chess_mobility(move)).toEqual(answer);
    });
});

// chess_move
[
    [
        START_FEN, 'd5', undefined,
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        START_FEN, 'd4', undefined,
        {capture: 0, fen: '', flag: 0, from: 99, m: 'd4', ply: 0, promote: 0, san: 'd4', pv: '', score: 120, to: 67},
    ],
    [
        START_FEN, 'd2d4', undefined,
        {capture: 0, fen: '', flag: 0, from: 99, m: 'd2d4', ply: 0, promote: 0, san: 'd4', pv: '', score: 120, to: 67},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'e1h1', undefined,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'e1h1', ply: 0, promote: 0, san: 'O-O', pv: '', score: 150, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'e1g1', undefined,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'e1g1', ply: 0, promote: 0, san: 'O-O', pv: '', score: 150, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'O-O', undefined,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O', ply: 0, promote: 0, san: 'O-O', pv: '', score: 150, to: 119},
    ],
    [
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'O-O-O', undefined,
        {capture: 0, fen: '', flag: 1, from: 116, m: 'O-O-O', ply: 0, promote: 0, san: 'O-O-O', pv: '', score: 150, to: 112},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', 'O-O', undefined,
        {capture: 0, fen: '', flag: 1, from: 3, m: 'O-O', ply: 19, promote: 0, san: 'O-O', pv: '', score: 150, to: 7},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', 'd8h8', {frc: true},
        {capture: 0, fen: '', flag: 1, from: 3, m: 'd8h8', ply: 19, promote: 0, san: 'O-O', pv: '', score: 150, to: 7},
    ],
    [
        'rbqk3r/pp1p1bpp/3n1pn1/2B5/5P2/4N1P1/PP2P1NP/RBQK3R b KQkq - 2 10', 'O-O', {frc: true},
        {capture: 0, fen: '', flag: 1, from: 3, m: 'O-O', ply: 19, promote: 0, san: 'O-O', pv: '', score: 150, to: 7},
    ],
    [
        'brqnn1kr/ppppppbp/6p1/8/8/6P1/PPPPPPBP/BRQNN1KR w KQkq - 2 3', 'O-O', {frc: true},
        {capture: 0, fen: '', flag: 1, from: 118, m: 'O-O', ply: 4, promote: 0, san: 'O-O', pv: '', score: 120, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', 'O-O', {frc: true},
        {capture: 0, fen: '', flag: 1, from: 115, m: 'O-O', ply: 38, promote: 0, san: 'O-O', pv: '', score: 150, to: 119},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w KQ - 0 20', 'O-O-O', {frc: false},
        {capture: 0, fen: '', flag: 0, from: 0, m: '', ply: -2, promote: 0, pv: '', score: 0, to: 0},
    ],
    [
        '1r2kb1r/pb1p1p2/1p1q2pn/7p/1PB1P3/3NQ2P/P2N1PP1/1R1K3R w HB - 0 20', 'O-O-O', {frc: true},
        {capture: 0, fen: '', flag: 1, from: 115, m: 'O-O-O', ply: 38, promote: 0, san: 'O-O-O', pv: '', score: 160, to: 113},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26', 'axb1=Q', false,
        {capture: 4, fen: '', flag: 0, from: 96, m: 'axb1=Q', ply: 51, promote: 5, san: 'axb1=Q', pv: '', score: 810, to: 113},
    ],
    [
        'r1b2r1k/p2PPp1p/3N2p1/2p3b1/5Pn1/2q3P1/p2Q3P/1R3RK1 b - - 0 26', 'a2b1q', false,
        {capture: 4, fen: '', flag: 0, from: 96, m: 'a2b1q', san: 'axb1=Q', ply: 51, promote: 5, pv: '', score: 810, to: 113},
    ],
].forEach(([fen, move, options, answer], id) => {
    test(`chess_move:${id}`, () => {
        live.chess_load(fen);
        expect(live.chess_move(move, options)).toEqual(answer);
    });
});

// frc_index
[
    ['rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', -1],
    ['bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1', 0],
    ['qnnrbbkr/pppppppp/8/8/8/8/PPPPPPPP/QNNRBBKR w HDhd - 0 1', 10],
    ['nqnbbrkr/pppppppp/8/8/8/8/PPPPPPPP/NQNBBRKR w HFhf - 0 1', 25],
    ['nbnqbrkr/pppppppp/8/8/8/8/PPPPPPPP/NBNQBRKR w HFhf - 0 1', 40],
    ['nrbnqbkr/pppppppp/8/8/8/8/PPPPPPPP/NRBNQBKR w HBhb - 0 1', 150],
    ['bbrnkrqn/pppppppp/8/8/8/8/PPPPPPPP/BBRNKRQN w FCfc - 0 1', 640],
    ['rkrnnqbb/pppppppp/8/8/8/8/PPPPPPPP/RKRNNQBB w CAca - 0 1', 959],
].forEach(([fen, answer], id) => {
    test(`frc_index:${id}`, () => {
        expect(live.frc_index(fen)).toEqual(answer);
    });
});

// render_text
[
    [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        {notation: 1 + 4},
        [
            '+ a b c d e f g h',
            '8 r n b q k b n r',
            '7 p p p p p p p p',
            '6 . . . . . . . .',
            '5 . . . . . . . .',
            '4 . . . . . . . .',
            '3 . . . . . . . .',
            '2 P P P P P P P P',
            '1 R N B Q K B N R',
        ].join('\n'),
    ],
    [
        '6k1/pr3p1p/4p1p1/3pB1N1/bp1P2Rq/1nr4B/7K/1R1Q4 w KQkq - 0 1',
        {notation: 0},
        [
            '. . . . . . k .',
            'p r . . . p . p',
            '. . . . p . p .',
            '. . . p B . N .',
            'b p . P . . R q',
            '. n r . . . . B',
            '. . . . . . . K',
            '. R . Q . . . .',
        ].join('\n'),
    ],
].forEach(([fen, options, answer], id) => {
    test(`render_text:${id}`, () => {
        Assign(live, options);
        live.set_fen(fen);
        expect(live.render_text()).toEqual(answer);
    });
});

// reset
[
    [{exploded: 5.5}, {exploded: 0}],
].forEach(([states, answer], id) => {
    test(`reset:${id}`, () => {
        Assign(live, states);
        live.reset(Y.x);
        Keys(answer).forEach(key => {
            expect(live[key]).toEqual(answer[key]);
        });
    });
});

// set_fen
[
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1', null],
    ['4rrk1/1pq1bppp/p1np1n2/P4R2/4P3/2N1B3/1PPQB1PP/R6K w - - 3 21', null],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', null],
    ['6k1/pr3p1p/4p1p1/3pB1N1/bp1P2Rq/1nr4B/7K/1R1Q4', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
].forEach(([fen, answer], id) => {
    test(`set_fen:${id}`, () => {
        live.set_fen(fen);
        expect(live.fen).toEqual(answer || fen);
    });
});

// set_locked
[
    [0, 0],
    [1, 1],
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 0],
    [3, 3],
    [0, 3],
    [1, 3],
    [2, 0],
    [1, 1],
    [0, 0],
].forEach(([locked, answer], id) => {
    test(`set_locked:${id}`, () => {
        live.set_locked(locked);
        expect(live.locked).toEqual(answer);
    });
});

// show_pv
[
    [
        {
            fen0: 'rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1',
            pv: 'c7c5 d2d3 b8c6 c1e3 e7e5 c3e4 d7d6',
        },
        '<i class="turn">1.</i><i>...</i><i class="real">c5</i>'
        + '<i class="turn">2.</i><i class="real">d3</i><i class="real">Nc6</i>'
        + '<i class="turn">3.</i><i class="real">Be3</i><i class="real">e5</i>'
        + '<i class="turn">4.</i><i class="real">Ne4</i><i class="real">d6</i>',
    ],
].forEach(([move, answer], id) => {
    test(`show_pv:${id}`, () => {
        expect(live.show_pv(move)).toEqual(answer);
    });
});
