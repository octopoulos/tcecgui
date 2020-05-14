// game.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-11
//
/*
globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/game+`;

create_module(IMPORT_PATH, [
    'common',
    'engine',
    'xboard',
    //
    'game',
], OUTPUT_MODULE, 'Assign players tour_info Y');

let {
        Assign, calculate_h2h, calculate_probability, calculate_seeds, calculate_score, create_field_value,
        create_game_link, format_eval, format_hhmmss, format_percent, get_short_name, players, tour_info, Y,
    } = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// calculate_h2h
[
    [
        ['Counter', 'Marvin'],
        [
            {black: 'Stockfish', result: '0-1', white: 'Counter'},
            {black: 'Marvin', result: '1/2-1/2', white: 'Counter'},
            {black: 'Counter', result: '1-0', white: 'Marvin'},
            {black: 'Counter', result: '1-0', white: 'Stockfish'},
            {black: 'Marvin', result: '*', white: 'Counter'},
        ],
        [
            {black: 'Marvin', result: '1/2-1/2', white: 'Counter'},
            {black: 'Counter', result: '1-0', white: 'Marvin'},
            {black: 'Marvin', result: '*', white: 'Counter'},
        ],
        ['0.5', '1.5'],
    ],
]
 .forEach(([names, rows, answer, answer2], id) => {
    test(`calculate_h2h:${id}`, () => {
        for (let i = 0; i < names.length; i ++)
            players[i].name = names[i];

        expect(calculate_h2h(rows)).toEqual(answer);

        for (let i = 0; i < answer2.length; i ++)
            expect(players[i].score).toEqual(answer2[i]);
    });
});

// calculate_probability
[
    ['Stockfish', 0.27, '7.8% W | 92.2% D'],
    ['LCZero', 0.27, '9.2% W | 90.8% D'],
    // ['LCZeroCPU', 0.27, '9.2% W | 90.8% D'],
    ['AllieStein', 0.27, '6.0% W | 94.0% D'],
]
 .forEach(([short_engine, eval_, answer], id) => {
    test(`calculate_probability:${id}`, () => {
        expect(calculate_probability(short_engine, eval_)).toEqual(answer);
    });
});

// calculate_seeds
[
    [2, [1, 2]],
    [4, [1, 4, 2, 3]],
    [8, [1, 8, 4, 5, 2, 7, 3, 6]],
    [16, [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    [32, [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]],
    // non power of 2
    [3, [1, 0, 2, 3]],
    [6, [1, 0, 4, 5, 2, 0, 3, 6]],
    [13, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 0, 6, 11]],
    [14, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 14, 6, 11]],
    [15, [1, 0, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    //
    [0, [1, 2]],
    [1, [1, 2]],
].forEach(([num_team, answer], id) => {
    test(`calculate_seeds:${id}`, () => {
        expect(calculate_seeds(num_team)).toEqual(answer);
    });
});

// calculate_score
[
    ['0', {w: 0, b: 1}],
    ['01', {w: 1, b: 1}],
    ['011===', {w: 3.5, b: 2.5}],
    ['011===11111', {w: 8.5, b: 2.5}],
].forEach(([text, answer], id) => {
    test(`calculate_score:${id}`, () => {
        expect(calculate_score(text)).toEqual(answer);
    });
});

// create_field_value
[
    ['G#', ['g', 'G#']],
    ['wev=Ev', ['wev', 'Ev']],
    ['White', ['white', 'White']],
    ['Final decision', ['final_decision', 'Final decision']],
    ['W.ev', ['w_ev', 'W.ev']],
    ['Wins [W/B]', ['wins', 'Wins [W/B]']],
    ['Diff [Live]', ['diff', 'Diff [Live]']],
    ['a_b=A=B', ['a_b', 'A=B']],
    ['startTime', ['start_time', 'startTime']],
    ['BlackEv', ['black_ev', 'BlackEv']],
    ['# Games', ['games', '# Games']],
    ['{Game}#', ['game', '{Game}#']],
].forEach(([text, answer], id) => {
    test(`create_field_value:${id}`, () => {
        expect(create_field_value(text)).toEqual(answer);
    });
});

// create_game_link
[
    [{}, 'live', 1, '', '<a class="game" href="#game=1&x=archive">1</a>'],
    [{link: 'season=18&div=l3'}, 'live', 1, '', '<a class="game" href="#div=l3&game=1&season=18&x=archive">1</a>'],
]
 .forEach(([info, section, game, text, answer], id) => {
    test(`create_game_link:${id}`, () => {
        Assign(tour_info[section], info);
        expect(create_game_link(section, game, text)).toEqual(answer);
    });
});

// format_eval
[
    ['', null, undefined, null],
    ['', NaN, undefined, NaN],
    ['', Infinity, undefined, 'Infinity'],
    ['', '', undefined, ''],
    ['', 0, undefined, '0.00'],
    ['always', 0, true, '<i>0.</i><i class="smaller">00</i>'],
    ['always', 0, false, '0.00'],
    ['>= 10', 0, true, '0.00'],
    ['always', 0, true, '<i>0.</i><i class="smaller">00</i>'],
    ['always', 0.98, true, '<i>0.</i><i class="smaller">98</i>'],
    ['always', 0.987654321, false, '0.99'],
    ['always', 0.987654321, true, '<i>0.</i><i class="smaller">99</i>'],
    ['always', '150.142', true, '<i>150.</i><i class="smaller">14</i>'],
    ['always', 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    ['>= 10', 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    ['>= 100', 10.15535, true, '10.16'],
    ['always', -198.42, true, '<i>-198.</i><i class="smaller">42</i>'],
    ['always', '-198.42', true, '<i>-198.</i><i class="smaller">42</i>'],
    ['never', '-198.42', true, '-198.42'],
    ['always', 'M#43', true, 'M#43'],
]
 .forEach(([small_decimal, value, process, answer], id) => {
    test(`format_eval:${id}`, () => {
        Y.small_decimal = small_decimal;
        expect(format_eval(value, process)).toEqual(answer);
    });
});

// format_hhmmss
[
    [null, '00:00:00'],
    [NaN, 'aN:aN:aN'],
    [Infinity, 'Infinityd, aN:aN:aN'],
    ['', '00:00:00'],
    [0, '00:00:00'],
    [31, '00:00:31'],
    [314, '00:05:14'],
    [3141, '00:52:21'],
    [31415, '08:43:35'],
    [314159, '3d, 15:15:59'],
]
 .forEach(([seconds, answer], id) => {
    test(`format_hhmmss:${id}`, () => {
        expect(format_hhmmss(seconds)).toEqual(answer);
    });
});

// format_percent
[
    [null, '0%'],
    [NaN, 'NaN%'],
    [Infinity, 'Infinity%'],
    ['', '0%'],
    [0, '0%'],
    [0.98, '98%'],
    [0.987654321, '98.77%'],
    ['150', '15000%'],
]
 .forEach(([value, answer], id) => {
    test(`format_percent:${id}`, () => {
        expect(format_percent(value)).toEqual(answer);
    });
});

// get_short_name
[
    ['', ''],
    [undefined, ''],
    ['LCZero v0.24-sv-t60-3010', 'LCZero'],
    ['Stockfish 20200407DC', 'Stockfish'],
    ['SuperBaronizer', 'Baron'],
].forEach(([text, answer], id) => {
    test(`get_short_name:${id}`, () => {
        expect(get_short_name(text)).toEqual(answer);
    });
});
