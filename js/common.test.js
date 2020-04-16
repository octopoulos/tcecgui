// common.test
//
/* globals
__dirname, expect, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/common+`;

create_module(IMPORT_PATH, [
    'common',
], OUTPUT_MODULE);

let {
        Clamp, DefaultFloat, FormatFloat, FormatUnit, FromSeconds, FromTimestamp, HashText, QueryString, Stringify,
    } = require(OUTPUT_MODULE);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Clamp
[
    [-1, 1, undefined, undefined, 1],
    [-1, 1, null, null, 1],
    [-1, 1, undefined, 10, 10],
    [20, 1, undefined, undefined, 20],
    [20, 1, 10, undefined, 10],
].forEach(([number, min, max, min_set, answer], id) => {
    test(`Clamp:${id}`, () => {
        expect(Clamp(number, min, max, min_set)).toEqual(answer);
    });
});

// DefaultFloat
[
    [undefined, undefined, undefined],
    [undefined, 0, 0],
    [0, 1, 0],
    ['-0.5', 1, -0.5],
    ['5 or 1', 1, 5],
    ['5', 1, 5],
    ['text 9', null, null],
].forEach(([value, def, answer], id) => {
    test(`DefaultFloat:${id}`, () => {
        expect(DefaultFloat(value, def)).toEqual(answer);
    });
});

// FormatFloat
[
    [-0.0001, undefined, '0'],
    [Math.PI, undefined, '3.142'],
].forEach(([text, align, answer], id) => {
    test(`FormatFloat:${id}`, () => {
        expect(FormatFloat(text, align)).toEqual(answer);
    });
});

// FormatUnit
[
    [7841319402, '7.8B'],
    [58335971.81109362, '58.3M'],
    [58335971, '58.3M'],
    ['58335971', '58.3M'],
    [318315, '318.3k'],
    [1259, '1.2k'],
    [725.019, '725'],
    [NaN, 'N/A'],
    [Infinity, 'InfinityB'],
].forEach(([nodes, answer], id) => {
    test(`FormatUnit:${id}`, () => {
        expect(FormatUnit(nodes)).toEqual(answer);
    });
});

// FromSeconds
[
    ['0', [0, 0, '00']],
    ['32.36', [0, 32, '36']],
].forEach(([time, answer], id) => {
    test(`FromSeconds:${id}`, () => {
        expect(FromSeconds(time)).toEqual(answer);
    });
});

// FromTimestamp
[
    [1576574884, ['19-12-17', '10:28']],
].forEach(([stamp, answer], id) => {
    test(`FromTimestamp:${id}`, () => {
        expect(FromTimestamp(stamp)).toEqual(answer);
    });
});

// HashText
[
    ['apple', 2240512858],
    ['orange', 1138632238],
].forEach(([text, answer], id) => {
    test(`HashText:${id}`, () => {
        expect(HashText(text)).toEqual(answer);
    });
});

// QueryString
[
    [
        [true, null, null, {class: "phantom", mode: "speed lap", game: "wipeout x"}, null],
        'class=phantom&game=wipeout%20x&mode=speed%20lap'
    ],
].forEach(([[stringify, keep, discard, replaces, key], answer], id) => {
    test(`QueryString:${id}`, () => {
        expect(QueryString(stringify, keep, discard, replaces, key)).toEqual(answer);
    });
});

// Stringify
[
    [{point: {x: 1, y: 5}}, undefined, undefined, '{"point":{"x":1,"y":5}}'],
].forEach(([object, depth, maxdepth, answer], id) => {
    test(`Stringify:${id}`, () => {
        expect(Stringify(object, depth, maxdepth)).toEqual(answer);
    });
});
