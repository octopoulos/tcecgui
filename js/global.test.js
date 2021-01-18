// global.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-01-18
//
/*
globals
expect, global, require, test
*/
'use strict';

let {Assign, Keys} = require('./common.js'),
    {Y} = require('./engine.js'),
    {
        allie_cp_to_score, assign_move, calculate_feature_q, fix_move_format, format_eval, format_unit, get_fen_ply,
        get_move_ply, leela_cp_to_score, mix_hex_colors, reset_defaults, split_move_string, stockfish_wdl,
        stockfish_win_rate_model, stoof_cp_to_score
    } = require('./global.js');

global.DEFAULTS = {
    background_color: '#000000',
    background_image: '',
    background_opacity: 0,
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// allie_cp_to_score
// https://github.com/manyoso/allie/blob/be656ec3042e0422c8275d6362ca4f69b2e43f0d/tests/testbasics.cpp#L120
[
    [0, 0],
    [100, 0.42144403114],
    [-100, -0.42144403114],
    [400, 0.747188146311],
    [-400, -0.747188146311],
    [1000, 0.8392234846],
    [-1000, -0.8392234846],
    [10000, 0.898044],
    [-10000, -0.898044],
    [12800, 0.9163436966936154],
    [-12800, -0.9163436966936154],
    [25600, 1.0],
    [-25600, -1.0],
].forEach(([cp, answer], id) => {
    test(`allie_cp_to_score:${id}`, () => {
        expect(allie_cp_to_score(cp)).toBeCloseTo(answer, 5);
    });
});

// assign_move
[
    [{}, {}, {}],
    [{}, {text: ''}, {}],
    [{}, {text: 'hello'}, {text: 'hello'}],
    [{fen: '8/8/8'}, {fen: ''}, {fen: '8/8/8'}],
    [{pv: 'd7d5 c2c4'}, {pv: ''}, {pv: 'd7d5 c2c4'}],
    [{ply: 55}, {ply: 5}, {ply: 5}],
    [{ply: 55}, {ply: -1}, {ply: -1}],
    [{ply: 55}, {ply: -2}, {ply: 55}],
    [{ply: 55}, {ply: -3}, {ply: 55}],
].forEach(([move, dico, answer], id) => {
    test(`assign_move:${id}`, () => {
        assign_move(move, dico);
        expect(move).toEqual(answer);
    });
});

// calculate_feature_q
[
    [0, 0, -1, 0],
    [0, 0, 0, 0],
    [0, 0.27, -1, 3.877809205717149],
    [0, 0.27, 0, 3.6],
    [0, 0.27, 20, 4.05],
    [0, 0.27, 40, 4.2],
    [0, 0.27, 90, 2.9],
    [0, 0.27, 180, 1.5],
    [0, 128, -1, 50],
    [0, 128, 0, 50],
    [1, 0.27, -1, 2.9914166820729227],
    [1, 128, -1, 50],
    [3, 0.27, -1, 9.319137125182761],
    [3, 128, -1, 50],
    [5, 0.27, -1, 6.8565897272471545],
    [5, 128, -1, 45.817184834680766],
    [5, 256, -1, 50],
    [9, 0.27, -1, 4.4446967802372015],
].forEach(([feature, eval_, ply, answer], id) => {
    test(`calculate_feature_q:${id}`, () => {
        expect(calculate_feature_q(feature, eval_, ply)).toBeCloseTo(answer, 3);
    });
});

// fix_move_format
[
    [
        {
            ev: '5.52',
        },
        {
            _fixed: 1,
            ev: '5.52',
            wv: '5.52',
        },
    ],
    [
        {
            mt: '00:01:05',
            s: 3488811,
            tl: '00:25:22',
            wv: '3.21',
        },
        {
            _fixed: 1,
            mt: 65000,
            n: 53674,
            s: 3488811,
            tl: 1522000,
            wv: '3.21',
        },
    ],
    [
        {
            s: '129 knps',
            wv: '3.21',
        },
        {
            _fixed: 1,
            s: 129000,
            wv: '3.21',
        },
    ],
    [
        {
            s: '350.55 Mnps',
            wv: '3.21',
        },
        {
            _fixed: 1,
            s: 350550000,
            wv: '3.21',
        },
    ],
    [
        {
            d: 30,
            h: '0.0',
            m: 'f4',
            mb: '+0+0+0+0+0',
            mt: 52874,
            n: '18446744071599323000',
            ph: '0.0',
            ply: 20,
            pv: '11. f4 Nxe5 12. fxe5 Nd7 13. e3 Qc7 14. a4 a5 15. Rf2 Nb6 16. Raf1 Qd7 17. b3 Rad8 18. Rb1 Bg4 19. Rbf1 Be6 20. Rb1 Bg4 21. Rbf1 Be6',
            R50: 50,
            Rd: -11,
            Rr: -11,
            s: '348881190596499650',
            sd: 30,
            tb: 'null',
            tl: 1306068,
            wv: '0.00',
        },
        {
            _fixed: 1,
            d: 30,
            h: '0.0',
            m: 'f4',
            mb: '+0+0+0+0+0',
            mt: 52874,
            n: '-',
            ph: '0.0',
            ply: 20,
            pv: '11. f4 Nxe5 12. fxe5 Nd7 13. e3 Qc7 14. a4 a5 15. Rf2 Nb6 16. Raf1 Qd7 17. b3 Rad8 18. Rb1 Bg4 19. Rbf1 Be6 20. Rb1 Bg4 21. Rbf1 Be6',
            R50: 50,
            Rd: -11,
            Rr: -11,
            s: '-',
            sd: 30,
            tb: 'null',
            tl: 1306068,
            wv: '0.00',
        },
    ],
    [
        {
            d: 29,
            ev: '-2.99',
            m: 'Rb3',
            mt: '00:01:59',
            pd: 'Bg3',
            ply: 81,
            pv: '41...b1b3 42. e1g3 f7e6 43. g3h4 d4g1 44. e2f1 g1e3 45. h4g3 e3c5',
            R50: 46,
            s: '21403 kN/s',
            tb: 13142,
            tl: '01:27:00',
        },
        {
            _fixed: 1,
            d: 29,
            ev: '-2.99',
            m: 'Rb3',
            mt: 119000,
            n: 179857,
            pd: 'Bg3',
            ply: 81,
            pv: '41...b1b3 42. e1g3 f7e6 43. g3h4 d4g1 44. e2f1 g1e3 45. h4g3 e3c5',
            R50: 46,
            s: 21403000,
            tb: 13142,
            tl: 5220000,
            wv: '-2.99',
        },
    ],
    [
        {
            d: 14,
            mt: '00:03:15',
            n: 444481608,
            pv: 'Re8',
            R50: 49,
            s: '0 kN/s',
            tb: 0,
            tl: '01:47:37',
            wv: '0.36',
        },
        {
            _fixed: 1,
            d: 14,
            mt: 195000,
            n: 444481608,
            pv: 'Re8',
            R50: 49,
            s: 2279392,
            tb: 0,
            tl: 6457000,
            wv: '0.36',
        },
    ],
    [
        {
            mt: 1900,
            n: 10000,
            s: 0,
        },
        {
            _fixed: 1,
            mt: 1900,
            n: 10000,
            s: '-',
            wv: undefined,
        },
    ],
    [
        {
            mt: 2000,
            n: 10000,
            s: 0,
        },
        {
            _fixed: 1,
            mt: 2000,
            n: 10000,
            s: 5000,
            wv: undefined,
        },
    ],
].forEach(([move, answer], id) => {
    test(`fix_move_format:${id}`, () => {
        fix_move_format(move);
        expect(move).toEqual(answer);
    });
});

// format_eval
[
    [0, null, undefined, null],
    [0, NaN, undefined, NaN],
    [0, Infinity, undefined, 'Infinity'],
    [0, '', undefined, ''],
    [0, 0, undefined, '0.00'],
    [1, 0, true, '<i>0.</i><i class="smaller">00</i>'],
    [1, 0, false, '0.00'],
    [10, 0, true, '0.00'],
    [1, 0, true, '<i>0.</i><i class="smaller">00</i>'],
    [1, 0.98, true, '<i>0.</i><i class="smaller">98</i>'],
    [1, 0.987654321, false, '0.99'],
    [1, 0.987654321, true, '<i>0.</i><i class="smaller">99</i>'],
    [1, '150.142', true, '<i>150.</i><i class="smaller">14</i>'],
    [1, 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    [10, 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    [100, 10.15535, true, '10.16'],
    [1, -198.42, true, '<i>-198.</i><i class="smaller">42</i>'],
    [1, '-198.42', true, '<i>-198.</i><i class="smaller">42</i>'],
    [0, '-198.42', true, '-198.42'],
    [1, 'M#43', true, 'M#43'],
].forEach(([small_decimal, value, process, answer], id) => {
    test(`format_eval:${id}`, () => {
        Y.small_decimal = small_decimal;
        expect(format_eval(value, process)).toEqual(answer);
    });
});

// format_unit
[
    [true, 1000000000, undefined, undefined, '1G'],
    [false, 1000000000, undefined, undefined, '1B'],
    [false, 1000000000, undefined, true, '1.0B'],
    [false, '58335971', undefined, undefined, '58.3M'],
    [false, 318315, undefined, undefined, '318.3k'],
    [true, NaN, undefined, undefined, 'N/A'],
    [true, undefined, '-', undefined, '-'],
].forEach(([is_si, number, def, keep_decimal, answer], id) => {
    test(`format_unit:${id}`, () => {
        Y.SI_units = is_si;
        expect(format_unit(number, def, keep_decimal)).toEqual(answer);
    });
});

// get_fen_ply
[
    [null, -2],
    ['', -2],
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -1],
    ['rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1', 0],
    ['rnbqkbnr/pppppp1p/6p1/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2', 1],
    ['rnbqkbnr/pppppp1p/6p1/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 0 2', 2],
    ['2r2rk1/ppqbppbp/6p1/nPPp4/Q7/3BPNP1/P2N1PP1/2R2RK1 b - - 2 18', 34],
    ['8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35', 68],
    ['8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - -', 0],
].forEach(([fen, answer], id) => {
    test(`get_fen_ply:${id}`, () => {
        expect(get_fen_ply(fen)).toEqual(answer);
    });
});

// get_move_ply
[
    [null, -2],
    [{}, -2],
    [{ply: null}, -2],
    [{ply: -3}, -2],
    [{ply: -1}, -1],
    [{ply: 0}, 0],
    [{fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}, -1],
    [{fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1'}, 0],
    [{fen: 'rnbqkbnr/pppppp1p/6p1/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2'}, 1],
    [{fen: 'rnbqkbnr/pppppp1p/6p1/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 0 2'}, 2],
    [{fen: '2r2rk1/ppqbppbp/6p1/nPPp4/Q7/3BPNP1/P2N1PP1/2R2RK1 b - - 2 18'}, 34],
    [{fen: '8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35'}, 68],
    [{fen: '8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35', ply: 40}, 40],
    [{fen: '8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35', ply: -2}, 68],
    [{fen: '8/1p2Bp2/p4pkp/4b3/P7/1P1R2PP/2r2PK1/8 b - - 0 35', ply: -3}, 68],
].forEach(([move, answer], id) => {
    test(`get_move_ply:${id}`, () => {
        expect(get_move_ply(move)).toEqual(answer);
        if (answer >= -1)
            expect(move.ply).toEqual(answer);
    });
});

// leela_cp_to_score
[
    [0, 0],
    [100, 0.5358778448223716],
    [-100, -0.5358778448223716],
    [400, 0.8629757114869812],
    [-400, -0.8629757114869812],
    [1000, 0.94710419473861],
    [-1000, -0.94710419473861],
    [10000, 0.9987481281074694],
    [-10000, -0.9987481281074694],
    [12800, 1.0],
    [-12800, -1.0],
].forEach(([cp, answer], id) => {
    test(`leela_cp_to_score:${id}`, () => {
        expect(leela_cp_to_score(cp)).toBeCloseTo(answer, 4);
    });
});

// mix_hex_colors
[
    ['#ffffff', '#000000', 0.5, '#808080'],
    ['#000000', '#ffffff', 0.5, '#808080'],
    ['#ffffff', '#000000', 0.3, '#b3b3b3'],
    ['#ff0000', '#0000ff', 0.2, '#cc0033'],
    ['#ff0000', '#0000ff', 0, '#ff0000'],
    ['#ff0000', '#0000ff', 1, '#0000ff'],
    ['#ff0000', '#0000ff', 2, '#0000ff'],
].forEach(([color1, color2, mix, answer], id) => {
    test(`mix_hex_colors:${id}`, () => {
        expect(mix_hex_colors(color1, color2, mix)).toEqual(answer);
    });
});

// reset_defaults
[
    [
        {background_color: '#ff0000', background_image: 'xxyy', background_opacity: 0.5},
        /^background_/,
        {background_color: '#000000', background_image: '', background_opacity: 0},
    ],
].forEach(([y, pattern, answer], id) => {
    test(`reset_defaults:${id}`, () => {
        Assign(Y, y);
        reset_defaults(pattern);
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});

// split_move_string
[
    ['9...d5 10. O-O-O dxe4 11. g5 Nd5', 0, [17, ['9', '...', 'd5', '10.', 'O-O-O', 'dxe4', '11.', 'g5', 'Nd5']]],
    ['9...d5 10. O-O-O dxe4 11. g5 Nd5', 1, [17, ['d5', 'O-O-O', 'dxe4', 'g5', 'Nd5']]],
    ['23. Qd2 Nf6 24. f3 Ra6', 0, [44, ['23.', 'Qd2', 'Nf6', '24.', 'f3', 'Ra6']]],
    ['22...Ra6 23. Qg3 Nf6 24. Bd3 Bc4', 0, [43, ['22', '...', 'Ra6', '23.', 'Qg3', 'Nf6', '24.', 'Bd3', 'Bc4']]],
    ['22...f5 23. Qd2', 0, [43, ['22', '...', 'f5', '23.', 'Qd2']]],
    ['22. Kh1 Ra6 23. Qg3 Nf6', 0, [42, ['22.', 'Kh1', 'Ra6', '23.', 'Qg3', 'Nf6']]],
    ['2. Nf3 d6 3. d4 Nf6 4. Nc3 cxd4', 0, [2, ['2.', 'Nf3', 'd6', '3.', 'd4', 'Nf6', '4.', 'Nc3', 'cxd4']]],
    ['2. Nf3 d6 3. d4 Nf6 4. Nc3 cxd4', 1, [2, ['Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'cxd4']]],
    ['2...Nc6 3. Bb5', 0, [3, ['2', '...', 'Nc6', '3.', 'Bb5']]],
    ['2...Nc6 3. Bb5', 1, [3, ['Nc6', 'Bb5']]],
    ['2...d6 3. d4 Nf6 4. Nc3 cxd4', 0, [3, ['2', '...', 'd6', '3.', 'd4', 'Nf6', '4.', 'Nc3', 'cxd4']]],
    ['2...d6 3. d4 Nf6 4. Nc3 cxd4', 1, [3, ['d6', 'd4', 'Nf6', 'Nc3', 'cxd4']]],
    ['2...Nc6 3. Bb5', 0, [3, ['2', '...', 'Nc6', '3.', 'Bb5']]],
    ['2...Nc6 3. Bb5', 1, [3, ['Nc6', 'Bb5']]],
].forEach(([text, no_number, answer], id) => {
    test(`split_move_string:${id}`, () => {
        expect(split_move_string(text, no_number)).toEqual(answer);
    });
});

// stockfish_wdl
[
    [0, 0, [106, 788, 106]],
    [0, 90, [41, 918, 41]],
    [0, 180, [34, 932, 34]],
    [100, 0, [321, 650, 29]],
    [100, 20, [372, 611, 17]],
    [100, 40, [410, 580, 10]],
    [100, 60, [417, 577, 6]],
    [100, 90, [355, 642, 3]],
    [100, 120, [259, 737, 4]],
    [100, 180, [149, 844, 7]],
    [-100, 90, [3, 642, 355]],
    [1280, 90, [1000, 0, 0]],
    [-1280, 90, [0, 0, 1000]],
    [12800, 90, [1000, 0, 0]],
    [-12800, 90, [0, 0, 1000]],
].forEach(([cp, ply, answer], id) => {
    test(`stockfish_wdl:${id}`, () => {
        expect(stockfish_wdl(cp, ply)).toEqual(answer);
    });
});

// stockfish_win_rate_model
[
    [398, 239, 840],
    [507, 178, 992],
    [322, 25, 974],
    [472, 102, 1000],
    [137, 129, 406],
    [-891, 35, 0],
    [411, 293, 859],
    [950, 53, 1000],
    [-292, 84, 0],
    [358, 142, 979],
    [594, 173, 999],
    [-636, 136, 0],
    [-578, 198, 0],
    [-712, 180, 0],
    [167, 249, 235],
    [673, 8, 1000],
    [659, 15, 1000],
    [654, 188, 999],
    [-489, 55, 0],
    [-366, 277, 0],
].forEach(([cp, ply, answer], id) => {
    test(`stockfish_win_rate_model:${id}`, () => {
        expect(stockfish_win_rate_model(cp, ply)).toBe(answer);
    });
});

// stoof_cp_to_score
[
    [0, 0],
    [100, 0.30594615173109363],
    [-100, -0.30594615173109363],
    [400, 0.7194598788661556],
    [-400, -0.7194598788661556],
    [1000, 0.8865653994370497],
    [-1000, -0.8865653994370497],
    [10000, 0.9972736365998054],
    [-10000, -0.9972736365998054],
    [12800, 1.0],
    [-12800, -1.0],
].forEach(([cp, answer], id) => {
    test(`stoof_cp_to_score:${id}`, () => {
        expect(stoof_cp_to_score(cp)).toBeCloseTo(answer, 4);
    });
});
