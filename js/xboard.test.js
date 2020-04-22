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
    'xboard',
], OUTPUT_MODULE, 'Assign XBoard'.split(' '));

let {Assign, XBoard} = require(OUTPUT_MODULE);

let xboard = new XBoard();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
        Assign(xboard.options, options);
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
