// xboard.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-06
//
/*
globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/xboard+`;

create_module(IMPORT_PATH, [
    'common',
    'engine',
    'libs/chess-quick',
    //
    'xboard',
], OUTPUT_MODULE, 'Assign START_FEN XBoard'.split(' '));

let {Assign, START_FEN, XBoard} = require(OUTPUT_MODULE);

let xboard = new XBoard({id: 'console'});
xboard.initialise();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add_moves_string
[
    [
        '1. d4 Nf6 2. c4 c5 3. d5',
        [0, {m: 'd4'}, {m: 'Nf6'}, {m: 'c4'}, {m: 'c5'}, {m: 'd5'}],
    ],
    [
        '38...Qg7 39. Rf2 Qh6 40. Nxg6',
        [75, {m: 'Qg7'}, {m: 'Rf2'}, {m: 'Qh6'}, {m: 'Nxg6'}],
    ],
    [
        '41...Kxg8 42. a8=Q+ Kg7',
        [81, {m: 'Kxg8'}, {m: 'a8=Q+'}, {m: 'Kg7'}],
    ],
].forEach(([text, answer], id) => {
    test(`add_moves_string:${id}`, () => {
        xboard.add_moves_string(text);

        let offset = answer[0],
            array = new Array(offset);
        for (let i = 1; i < answer.length ; i ++)
            array[offset + i - 1] = answer[i];

        expect(xboard.moves).toEqual(array);
    });
});

// chess_fen
[
    [START_FEN, ['d5'], START_FEN],
    [START_FEN, ['d4'], 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'],
    [START_FEN, ['d4', 'd5'], 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2'],
].forEach(([fen, moves, answer], id) => {
    test(`chess_fen:${id}`, () => {
        xboard.chess_load(fen);
        for (let move of moves)
            xboard.chess_move(move);
        expect(xboard.chess_fen()).toEqual(answer);
    });
});

// chess_load
[
    START_FEN,
].forEach((fen, id) => {
    test(`chess_load:${id}`, () => {
        xboard.chess_load(fen);
        expect(xboard.chess_fen()).toEqual(fen);
    });
});

// chess_move
[
    [START_FEN, 'd5', null],
    [START_FEN, 'd4', {color: 'w', flags: 4, from: 99, piece: 'p', to: 67}],
].forEach(([fen, move, answer], id) => {
    test(`chess_move:${id}`, () => {
        xboard.chess_load(fen);
        expect(xboard.chess_move(move)).toEqual(answer);
    });
});

// render_text
[
    [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1',
        {notation: 1 + 4},
        [
            '  a b c d e f g h',
            '8 r n b q k b n r',
            '7 p p p p p p p p',
            '6   ·   ·   ·   ·',
            '5 ·   ·   ·   ·  ',
            '4   ·   ·   ·   ·',
            '3 ·   ·   ·   ·  ',
            '2 P P P P P P P P',
            '1 R N B Q K B N R',
        ].join('\n'),
    ],
    [
        '6k1/pr3p1p/4p1p1/3pB1N1/bp1P2Rq/1nr4B/7K/1R1Q4',
        {notation: 0},
        [
            '  ·   ·   · k ·',
            'p r ·   · p · p',
            '  ·   · p · p ·',
            '·   · p B   N  ',
            'b p   P   · R q',
            '· n r   ·   · B',
            '  ·   ·   ·   K',
            '· R · Q ·   ·  ',
        ].join('\n'),
    ],
].forEach(([fen, options, answer], id) => {
    test(`render_text:${id}`, () => {
        Assign(xboard, options);
        xboard.set_fen(fen);
        expect(xboard.render_text()).toEqual(answer);
    });
});

// set_fen
[
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1',
    '6k1/pr3p1p/4p1p1/3pB1N1/bp1P2Rq/1nr4B/7K/1R1Q4',
].forEach((fen, id) => {
    test(`set_fen:${id}`, () => {
        xboard.set_fen(fen);
        expect(xboard.fen).toEqual(fen);
    });
});
