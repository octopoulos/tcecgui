// global.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-08
//
/*
globals
__dirname, expect, require, test,
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/global+`;

create_module(IMPORT_PATH, [
    'common',
    'global',
], OUTPUT_MODULE);

let {extract_fen_ply} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// extract_fen_ply
[
    [undefined, undefined],
    [null, undefined],
    ['', undefined],
    ['test', NaN],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -1],
    ['rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', 0],
    ['rnbqkbnr/pppppp1p/6p1/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2', 1],
    ['rnbqkbnr/pppppp1p/6p1/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 0 2', 2],
    ['2r2rk1/ppqbppbp/6p1/nPPp4/Q7/3BPNP1/P2N1PP1/2R2RK1 b - - 2 18', 34],
    ['8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35', 68],
].forEach(([fen, answer], id) => {
    test(`extract_fen_ply:${id}`, () => {
        expect(extract_fen_ply(fen)).toEqual(answer);
    });
});
