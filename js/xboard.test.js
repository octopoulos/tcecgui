// xboard.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
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
], OUTPUT_MODULE, 'Assign XBoard'.split(' '));

let {Assign, XBoard} = require(OUTPUT_MODULE);

let xboard = new XBoard({id: 'console'});
xboard.initialise();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add_moves_string
[
    [
        '1. d4 Nf6 2. c4 c5 3. d5',
        [{m: 'd4', ply: 0}, {m: 'Nf6', ply: 1}, {m: 'c4', ply: 2}, {m: 'c5', ply: 3}, {m: 'd5', ply: 4}],
    ],
    [
        '38...Qg7 39. Rf2 Qh6 40. Nxg6',
        [{m: 'Qg7', ply: 75}, {m: 'Rf2', ply: 76}, {m: 'Qh6', ply: 77}, {m: 'Nxg6', ply: 78}],
    ],
    [
        '41...Kxg8 42. a8=Q+ Kg7',
        [{m: 'Kxg8', ply: 81}, {m: 'a8=Q+', ply: 82}, {m: 'Kg7', ply: 83}],
    ],
].forEach(([text, answer], id) => {
    test(`add_moves_string:${id}`, () => {
        xboard.add_moves_string(text);
        expect(xboard.moves).toEqual(answer);
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
