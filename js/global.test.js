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
    //
    'global',
], OUTPUT_MODULE);

let {extract_fen_ply, get_move_ply, split_move_string} = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// get_move_ply
[
    [null, -2],
    [{}, -2],
    [{ply: null}, -2],
    [{ply: -3}, -3],
    [{ply: -1}, -1],
    [{ply: 0}, 0],
    [{fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}, -1],
    [{fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1'}, 0],
    [{fen: 'rnbqkbnr/pppppp1p/6p1/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2'}, 1],
    [{fen: 'rnbqkbnr/pppppp1p/6p1/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 0 2'}, 2],
    [{fen: '2r2rk1/ppqbppbp/6p1/nPPp4/Q7/3BPNP1/P2N1PP1/2R2RK1 b - - 2 18'}, 34],
    [{fen: '8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35'}, 68],
].forEach(([move, answer], id) => {
    test(`get_move_ply:${id}`, () => {
        expect(get_move_ply(move)).toEqual(answer);
        if (answer >= -1)
            expect(move.ply).toEqual(answer);
    });
});

// split_move_string
[
    ['9...d5 10. O-O-O dxe4 11. g5 Nd5', [17, ['9', '...', 'd5', '10.', 'O-O-O', 'dxe4', '11.', 'g5', 'Nd5']]],
    ['23. Qd2 Nf6 24. f3 Ra6', [44, ['23.', 'Qd2', 'Nf6', '24.', 'f3', 'Ra6']]],
    ['22...Ra6 23. Qg3 Nf6 24. Bd3 Bc4', [43, ['22', '...', 'Ra6', '23.', 'Qg3', 'Nf6', '24.', 'Bd3', 'Bc4']]],
    ['22...f5 23. Qd2', [43, ['22', '...', 'f5', '23.', 'Qd2']]],
    ['22. Kh1 Ra6 23. Qg3 Nf6', [42, ['22.', 'Kh1', 'Ra6', '23.', 'Qg3', 'Nf6']]],
].forEach(([text, answer], id) => {
    test(`split_move_string:${id}`, () => {
        expect(split_move_string(text)).toEqual(answer);
    });
});
