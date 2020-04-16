// xboard.test
//
/* globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/xboard+`;

create_module(IMPORT_PATH, [
    'common',
    'xboard',
], OUTPUT_MODULE, ['XBoard']);

let {XBoard} = require(OUTPUT_MODULE),
    xboard = new XBoard();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// render_text
[
    [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w AHah - 0 1',
        [
            'r n b q k b n r',
            'p p p p p p p p',
            '. . . . . . . .',
            '. . . . . . . .',
            '. . . . . . . .',
            '. . . . . . . .',
            'P P P P P P P P',
            'R N B Q K B N R',
        ].join('\n'),
    ],
    [
        '6k1/pr3p1p/4p1p1/3pB1N1/bp1P2Rq/1nr4B/7K/1R1Q4',
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
].forEach(([fen, answer], id) => {
    test(`formatUnit:${id}`, () => {
        xboard.set_fen(fen);
        expect(xboard.render_text()).toEqual(answer);
    });
});
