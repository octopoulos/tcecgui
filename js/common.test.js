// common.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-02-19
//
/*
globals
expect, require, test
*/
'use strict';

let {
    _, A, Attrs, CACHE_IDS, CacheId, Clamp, Class, Clear, Contain, CreateNode, DefaultFloat, DefaultInt, E, Format,
    FormatFloat, FormatUnit, From, FromSeconds, FromTimestamp, HashText, Hex2RGB, Hide, HTML, Id, Index, InsertNodes,
    InvalidEmail, InvalidPhone, IsDigit, IsFloat, IsObject, IsString, Keys, Merge, Pad, Parent, ParseJSON, PI, Prop,
    QueryString, S, SetDefault, Show, Split, Style, TEXT, TextHTML, Title, Toggle, Undefined, Visible, VisibleHeight,
    VisibleWidth,
} = require('./common.js');

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// _
[
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '', null],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '#link', null],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '#name', '<div id="name">N</div>'],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', 'a', '<a href="#">L1</a>'],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '.link', '<a class="link">L2</a>'],
].forEach(([html, sel, answer], id) => {
    test(`_:${id}`, () => {
        let soup = CreateNode('div', html),
            node = _(sel, soup);
        expect(node? node.outerHTML: node).toEqual(answer);
    });
});

// A
[
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '', []],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '#link', []],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '#name', ['<div id="name">N</div>']],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>',
        'a',
        ['<a href="#">L1</a>', '<a class="link">L2</a>'],
    ],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '.link', ['<a class="link">L2</a>']],
].forEach(([html, sel, answer], id) => {
    test(`A:${id}`, () => {
        let soup = CreateNode('div', html),
            nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// Attrs
[
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>',
        '*',
        {id: 'new'},
        ['<div id="new">N</div>', '<a href="#" id="new">L1</a>', '<a class="link" id="new">L2</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>',
        'a',
        {href: 'www'},
        ['<a href="www">L1</a>', '<a class="link" href="www">L2</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>',
        '#name',
        {'data-t': 'Welcome!', href: 'www'},
        ['<div id="name" data-t="Welcome!" href="www">N</div>'],
    ],
].forEach(([html, sel, attrs, answer], id) => {
    test(`Attrs:${id}`, () => {
        let soup = CreateNode('div', html);
        Attrs(sel, attrs, soup);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// CacheId
[
    ['<a id="one">one</a><i id="two">2</i>', 'zero', [], null],
    ['<a id="one">one</a><i id="two">2</i>', 'one', ['one'], '<a id="one">one</a>'],
    ['<a id="one">one</a><i id="two">2</i>', 'one', ['one'], '<a id="one">one</a>'],
    ['<a id="one">one</a><i id="two">2</i>', 'two', ['one', 'two'], '<i id="two">2</i>'],
    ['<a id="one">one</a><i id="two">2</i>', 'zero', ['one', 'two'], null],
].forEach(([html, sel, answer, answer_nodes], id) => {
    test(`CacheId:${id}`, () => {
        let soup = CreateNode('div', html),
            node = CacheId(sel, soup);
        expect(Keys(CACHE_IDS)).toEqual(answer);
        expect(node? node.outerHTML: node).toEqual(answer_nodes);
    });
});

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

// Class
[
    // string
    ['<i class="book">N</i>', 'i', '', undefined, 'book'],
    ['<i class="book">N</i>', 'i', '-book', undefined, ''],
    ['<i class="book">N</i>', 'i', '^book', undefined, ''],
    ['<i class="book">N</i>', 'i', '^book', true, ''],
    ['<i class="book">N</i>', 'i', '^book', false, ''],
    ['<i class="book">N</i>', 'i', 'book -fail', true, 'book'],
    ['<i class="book">N</i>', 'i', 'book -fail', false, 'fail'],
    ['<i class="book">N</i>', 'i', 'real +turn', undefined, 'book real turn'],
    ['<i class="book">N</i>', 'i', 'real ^turn ^book', undefined, 'real turn'],
    // array
    ['<i class="book">N</i>', 'i', [], undefined, 'book'],
    ['<i class="book">N</i>', 'i', [['book', 1]], undefined, ''],
    ['<i class="book">N</i>', 'i', [['book', 2]], undefined, ''],
    ['<i class="book">N</i>', 'i', [['book', 2]], true, ''],
    ['<i class="book">N</i>', 'i', [['book', 2]], false, ''],
    ['<i class="book">N</i>', 'i', [['book'], ['fail', 1]], true, 'book'],
    ['<i class="book">N</i>', 'i', [['book'], ['fail', 1]], false, 'fail'],
    ['<i class="book">N</i>', 'i', [['real'], ['turn', 0]], undefined, 'book real turn'],
    ['<i class="book">N</i>', 'i', [['real'], ['turn', 2], ['book', 2]], undefined, 'real turn'],
].forEach(([html, sel, classes, add, answer], id) => {
    test(`Class:${id}`, () => {
        let soup = CreateNode('div', html);
        Class(sel, classes, add, soup);
        expect(From(_(sel, soup).classList).join(' ')).toEqual(answer);
    });
});

// Clear
[
    {},
    {session: 'xxx', x: 'home'},
].forEach((dico, id) => {
    test(`Clear:${id}`, () => {
        expect(Clear(dico)).toEqual({});
    });
});

// Contain
[
    [['dn', 'mode'], 'mode', true],
    [['dn', 'mode'], 'mod', false],
    [['dn', 'mode'], '^mod', true],
    [['dn', 'mode'], '*od', true],
    [['dn', 'mode'], '$de', true],
].forEach(([list, pattern, answer], id) => {
    test(`Contain:${id}`, () => {
        expect(Contain(list, pattern)).toEqual(answer);
    });
});

// CreateNode
[
    ['i', null, {}, '<i></i>'],
    ['i', 'hello', {}, '<i>hello</i>'],
    ['a', 'Bxc3', {class: 'real dn', 'data-i': 46}, '<a class="real dn" data-i="46">Bxc3</a>'],
].forEach(([tag, html, attrs, answer], id) => {
    test(`CreateNode:${id}`, () => {
        let node = CreateNode(tag, html, attrs);
        expect(node.outerHTML).toEqual(answer);
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

// DefaultInt
[
    [undefined, undefined, undefined],
    [undefined, 0, 0],
    [0, 1, 0],
    ['-0.5', 1, -0],
    ['5 or 1', 1, 5],
    ['5', 1, 5],
    ['text 9', null, null],
].forEach(([value, def, answer], id) => {
    test(`DefaultInt:${id}`, () => {
        expect(DefaultInt(value, def)).toEqual(answer);
    });
});

// E
[
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '*', 'NL1L2'],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', 'a', 'L1L2'],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '#name', 'N'],
].forEach(([html, sel, answer], id) => {
    test(`E:${id}`, () => {
        let soup = CreateNode('div', html),
            text = '';
        E(sel, node => {
            text += TEXT(node);
        }, soup);
        expect(text).toEqual(answer);
    });
});

// Format
[
    [[-1, 1, PI], undefined, undefined, '-1, 1, 3.142'],
    [[-1, 1, PI], ' : ', undefined, '-1 : 1 : 3.142'],
    [PI, undefined, undefined, '3.142'],
    [{x: 1, y: 9, z: 2, w: -0.0004}, undefined, undefined, '1, 9, 2, 0'],
].forEach(([vector, sep, align, answer], id) => {
    test(`Format:${id}`, () => {
        expect(Format(vector, sep, align)).toEqual(answer);
    });
});

// FormatFloat
[
    [-0.0001, undefined, '0'],
    [PI, undefined, '3.142'],
].forEach(([text, align, answer], id) => {
    test(`FormatFloat:${id}`, () => {
        expect(FormatFloat(text, align)).toEqual(answer);
    });
});

// FormatUnit
[
    [1000000000, undefined, undefined, undefined, '1G'],
    [1000000000, undefined, undefined, false, '1B'],
    [1000000000, undefined, true, false, '1.0B'],
    [1000000, undefined, undefined, undefined, '1M'],
    [10000, undefined, undefined, undefined, '10k'],
    [1000, undefined, undefined, undefined, '1000'],
    [100, undefined, undefined, undefined, '100'],
    [100, undefined, true, undefined, '100.0'],
    [7841319402, undefined, undefined, true, '7.8G'],
    [7841319402, undefined, undefined, false, '7.8B'],
    [58335971.81109362, undefined, undefined, undefined, '58.3M'],
    [58335971, undefined, undefined, undefined, '58.3M'],
    ['58335971', undefined, undefined, undefined, '58.3M'],
    [318315, undefined, undefined, undefined, '318.3k'],
    [1259, undefined, undefined, undefined, '1.2k'],
    [1000, undefined, undefined, undefined, '1000'],
    [1000, undefined, true, undefined, '1000.0'],
    [725.019, undefined, undefined, undefined, '725'],
    [NaN, undefined, undefined, undefined, 'N/A'],
    [NaN, undefined, true, undefined, 'N/A'],
    [Infinity, undefined, undefined, undefined, 'Infinity'],
    [Infinity, undefined, true, undefined, 'Infinity'],
    [undefined, undefined, undefined, undefined, 'undefined'],
    [undefined, '-', undefined, undefined, '-'],
    // check if we can feed the result back => stability
    ['7.8B', undefined, undefined, false, '7.8B'],
    ['58.3M', undefined, undefined, undefined, '58.3M'],
    ['725', undefined, undefined, undefined, '725'],
    ['N/A', undefined, undefined, undefined, 'N/A'],
    ['Infinity', undefined, undefined, undefined, 'Infinity'],
    ['null', undefined, undefined, undefined, 'null'],
    ['null', '-', undefined, undefined, '-'],
    ['null', null, undefined, undefined, null],
    ['-', undefined, undefined, undefined, '-'],
].forEach(([number, def, keep_decimal, is_si, answer], id) => {
    test(`FormatUnit:${id}`, () => {
        expect(FormatUnit(number, def, keep_decimal, is_si)).toEqual(answer);
    });
});

// FromSeconds
[
    ['0', [0, 0, 0, '00']],
    ['32.36', [0, 0, 32, '36']],
    ['4892.737', [1, 21, 32, '73']],
    [208.963, [0, 3, 28, '96']],
].forEach(([time, answer], id) => {
    test(`FromSeconds:${id}`, () => {
        expect(FromSeconds(time)).toEqual(answer);
    });
});

// FromTimestamp
[
    [1576574884, [['2019-12-17'], ['09:28:04', '10:28:04']]],
].forEach(([stamp, answer], id) => {
    test(`FromTimestamp:${id}`, () => {
        let [date, time] = FromTimestamp(stamp);
        expect(answer[0]).toContain(date);
        expect(answer[1]).toContain(time);
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

// Hex2RGB
[
    ['000000', undefined, undefined, [0, 0, 0]],
    ['#000000', undefined, undefined, [0, 0, 0]],
    ['#87ceeb', undefined, undefined, [135, 206, 235]],
    ['#87ceeb', true, undefined, 'rgb(135,206,235)'],
    ['#87ceeb', undefined, 1, [135, 206, 235]],
    ['#87ceeb', true, 1, 'rgba(135,206,235,1)'],
    ['#87ceeb', true, 0.5, 'rgba(135,206,235,0.5)'],
].forEach(([color, get_string, alpha, answer], id) => {
    test(`Hex2RGB:${id}`, () => {
        expect(Hex2RGB(color, get_string, alpha)).toEqual(answer);
    });
});

// Hide
[
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        [
            '<div id="name" style="display: none;">N</div>',
            '<a href="#" style="display: none;">L1</a>',
            '<a class="link" style="display: none;"><i style="display: none;">L2</i></a>',
            '<i style="display: none;">L2</i>',
        ],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        [
            '<a href="#" style="display: none;">L1</a>',
            '<a class="link" style="display: none;"><i>L2</i></a>',
        ]
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '#name',
        ['<div id="name" style="display: none;">N</div>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'i',
        ['<i style="display: none;">L2</i>'],
    ],
].forEach(([html, sel, answer], id) => {
    test(`Hide:${id}`, () => {
        let soup = CreateNode('div', html);
        Hide(sel, soup);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// HTML
[
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        undefined,
        'N',
        ['<div id="name">N</div>', '<a href="#">L1</a>', '<a class="link"><i>L2</i></a>', '<i>L2</i>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a.link',
        undefined,
        '<i>L2</i>',
        ['<a class="link"><i>L2</i></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        '',
        '',
        ['<div id="name"></div>', '<a href="#"></a>', '<a class="link"></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        'text',
        'text',
        ['<a href="#">text</a>', '<a class="link">text</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        '<span>link</span>',
        '<span>link</span>',
        ['<a href="#"><span>link</span></a>', '<a class="link"><span>link</span></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '#name',
        '<svg>SVG</svg><div><i data-t="complex">complex</i></div>',
        '<svg>SVG</svg><div><i data-t="complex">complex</i></div>',
        ['<div id="name"><svg>SVG</svg><div><i data-t="complex">complex</i></div></div>'],
    ],
].forEach(([shtml, sel, html, answer, answer_nodes], id) => {
    test(`HTML:${id}`, () => {
        let soup = CreateNode('div', shtml);
        expect(HTML(sel, html, soup)).toEqual(answer);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer_nodes);
    });
});

// Id
[
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', '', null],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', 'link', null],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', 'name', '<div id="name">N</div>'],
    ['<div id="name">N</div><a href="#">L1</a><a class="link">L2</a>', 'a', null],
].forEach(([html, sel, answer], id) => {
    test(`Id:${id}`, () => {
        let soup = CreateNode('div', html),
            node = Id(sel, soup);
        expect(node? node.outerHTML: node).toEqual(answer);
    });
});

// Index
[
    ['<table><tr><td id="first"></td><td id="second"></td></tr></table>', '#first', 1],
    ['<table><tr><td id="first"></td><td id="second"></td></tr></table>', '#second', 2],
    ['<table><tr><td id="first"></td><td id="second"></td></tr></table>', '#third', -1],
    ['<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>', '#box', 1],
    ['<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>', '#i0', 1],
    ['<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>', '#i1', 2],
    ['<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>', '#i2', 3],
    ['<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>', 'span', 1],
].forEach(([html, sel, answer], id) => {
    test(`Index:${id}`, () => {
        let soup = CreateNode('div', html),
            node = _(sel, soup);
        expect(Index(node)).toEqual(answer);
    });
});

// InsertNodes
[
    [
        '<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>',
        'div',
        '#box',
        false,
        '<hori id="box"><a id="i0"></a><div id="i1"></div><div id="i2"><span>big</span></div></hori>',
    ],
    [
        '<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>',
        'div',
        '#box',
        true,
        '<hori id="box"><div id="i1"></div><div id="i2"><span>big</span></div><a id="i0"></a></hori>',
    ],
    [
        '<hori id="box"><a id="i0"></a></hori><div id="i1"></div><div id="i2"><span>big</span></div>',
        'span',
        '#box',
        true,
        '<hori id="box"><span>big</span><a id="i0"></a></hori><div id="i1"></div><div id="i2"></div>',
    ],
].forEach(([html, sel, parent, prepend, answer], id) => {
    test(`InsertNodes:${id}`, () => {
        let soup = CreateNode('div', html),
            nodes = A(sel, soup);

        InsertNodes(_(parent, soup), nodes, prepend, soup);
        expect(soup.innerHTML).toEqual(answer);
    });
});

// InvalidEmail
[
    ['hello@mail.com', false],
    ['hello@mail', true],
    ['hello', true],
].forEach(([email, answer], id) => {
    test(`InvalidEmail:${id}`, () => {
        expect(InvalidEmail(email)).toEqual(answer);
    });
});

// InvalidPhone
[
    ['911', true],
    ['+32 460-885 567', false],
    ['380(632345599', true],
    ['380(63)2345599', false],
].forEach(([phone, answer], id) => {
    test(`InvalidPhone:${id}`, () => {
        expect(InvalidPhone(phone)).toEqual(answer);
    });
});

// IsDigit
[
    [undefined, false],
    [0, true],
    ['0', true],
    ['', false],
    [NaN, false],
    [{x: 5}, false],
    [5.5, false],
    ['5', true],
].forEach(([text, answer], id) => {
    test(`IsDigit:${id}`, () => {
        expect(IsDigit(text)).toEqual(answer);
    });
});

// IsFloat
[
    [undefined, false],
    [0, false],
    ['', false],
    [NaN, false],
    [{x: 5}, false],
    [5.5, true],
    ['5', false],
    ['5.5', false],
    [Infinity, false],
    [PI, true],
].forEach(([text, answer], id) => {
    test(`IsFloat:${id}`, () => {
        expect(IsFloat(text)).toEqual(answer);
    });
});

// IsObject
[
    [undefined, false],
    [null, false],
    [0, false],
    ['', false],
    [{}, true],
    [[1, 2], true],
].forEach(([text, answer], id) => {
    test(`IsObject:${id}`, () => {
        expect(IsObject(text)).toEqual(answer);
    });
});

// IsString
[
    [undefined, false],
    [0, false],
    [NaN, false],
    ['', true],
    ['hello', true],
    [{x: 5}, false],
].forEach(([text, answer], id) => {
    test(`IsString:${id}`, () => {
        expect(IsString(text)).toEqual(answer);
    });
});

// Merge
[
    [{x: {y: 5}}, {x: {y: 6}}, undefined, {x: {y: 6}}],
    [{x: {y: 5}}, {x: {y: 6}}, 1, {x: {y: 6}}],
    [{x: {y: 5}}, {x: {y: 6}}, 5, {x: {y: 6}}],
    [{x: {y: 5}}, {x: {y: 6}}, 0, {x: {y: 5}}],
    [{x: {y: 5}}, {x: {z: 6}}, 1, {x: {y: 5, z: 6}}],
    [{x: {y: 5}}, {x: {y: {hello: 'there'}, z: 6}}, 1, {x: {y: {hello: 'there'}, z: 6}}],
    [{x: {y: 5}}, {x: {y: {hello: 'there'}, z: 6}}, 0, {x: {y: 5, z: 6}}],
    [{x: {y: 5}}, {x: 0}, 0, {x: {y: 5}}],
    [{x: {y: 5}}, {x: 0}, 1, {x: 0}],
    [{x: {y: 5}}, {x: undefined}, 0, {x: {y: 5}}],
    [{x: {y: 5}}, {x: undefined}, 1, {x: {y: 5}}],
    [{x: {y: 5}}, {x: undefined}, 2, {}],
    [{x: {y: 5}}, {y: undefined}, 2, {x: {y: 5}}],
    [{x: {y: 5}}, {x: {y: undefined}}, 2, {x: {}}],
    [{x: {y: 5, z: 6}}, {x: {y: undefined}}, 2, {x: {z: 6}}],
].forEach(([dico, extras, replace, answer], id) => {
    test(`Merge:${id}`, () => {
        expect(Merge(dico, extras, replace)).toEqual(answer);
        expect(dico).toEqual(answer);
    });
});

// Pad
[
    [1, undefined, undefined, '01'],
    [1, 3, undefined, '001'],
    [1, 4, undefined, '001'],
    [1, 4, '000', '0001'],
    ['', undefined, undefined, '00'],
    ['hello', undefined, undefined, 'lo'],
    ['hello', 10, undefined, '00hello'],
    ['hello', 10, '  ', '  hello'],
    ['hello', 10, '               ', '     hello'],
].forEach(([value, size, pad, answer], id) => {
    test(`Pad:${id}`, () => {
        expect(Pad(value, size, pad)).toEqual(answer);
    });
});

// Parent
[
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        'i',
        {tag: 'a'},
        'A',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        'i',
        {tag: 'i'},
        null,
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        'i',
        {self: true, tag: 'i'},
        'I',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        'i',
        {class_: 'box'},
        'DIV',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        'i',
        {class_: 'top'},
        'A',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        '#label',
        {attrs: 'id=x'},
        'A',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        '#label',
        {attrs: 'id=label'},
        null,
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        '#label',
        {attrs: 'id=label', self: true},
        'SPAN',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        '#label',
        {attrs: 'data-i=2'},
        'DIV',
    ],
    [
        '<a class="top" id="x"><div class="box" data-i="2"><span id="label">A</span><i id="click">B</i></div></a>',
        '#label',
        {attrs: 'data-i=3'},
        null,
    ],
].forEach(([html, sel, dico, answer], id) => {
    test(`Parent:${id}`, () => {
        let soup = CreateNode('div', html),
            parent = Parent(_(sel, soup), dico);
        if (!parent)
            expect(parent).toEqual(answer);
        else
            expect(parent.tagName).toEqual(answer);
    });
});

// ParseJSON
[
    ['', undefined, undefined],
    ['', 0, 0],
    ['[]', undefined, []],
    ['{"key":"record_get"}', undefined, {key: 'record_get'}],
].forEach(([text, def, answer], id) => {
    test(`ParseJSON:${id}`, () => {
        expect(ParseJSON(text, def)).toEqual(answer);
    });
});

// Prop
[
    [
        '<input name="accept" type="checkbox">',
        'input',
        'checked',
        true,
        [true],
        ['<input name="accept" type="checkbox">'],
    ],
    [
        '<input name="accept" type="checkbox"><input name="name" type="hidden">',
        '*',
        'type',
        'text',
        ['text', 'text'],
        ['<input name="accept" type="text">', '<input name="name" type="text">'],
    ],
].forEach(([html, sel, prop, value, answer, answer_nodes], id) => {
    test(`Prop:${id}`, () => {
        let soup = CreateNode('div', html);
        Prop(sel, prop, value, soup);
        let nodes = From(A(sel, soup));
        expect(nodes.map(node => node[prop])).toEqual(answer);
        expect(nodes.map(node => node.outerHTML)).toEqual(answer_nodes);
    });
});

// QueryString
[
    [{query: 'q=query&lan=eng'}, {lan: 'eng', q: 'query'}],
    [{query: 'q=query&lan=eng', string: true}, 'lan=eng&q=query'],
    [{keep: {lan: 1}, query: 'q=query&lan=eng'}, {lan: 'eng'}],
    [{discard: {lan: 1}, query: 'q=query&lan=eng'}, {q: 'query'}],
    [{query: 'q=query&lan=eng', replace: {lan: 'fra'}}, {lan: 'fra', q: 'query'}],
    [
        {key: null, replace: {class: "phantom", mode: "speed lap", game: "wipeout x"}, string: true},
        'class=phantom&game=wipeout%20x&mode=speed%20lap',
    ],
    [{query: 'season=18&div=l3&game=1', string: true}, 'div=l3&game=1&season=18'],
    [
        {
            key: null,
            replace: {
                class: 'flash', game: 'wipeout x', mode: 'speed lap', name: 'Connavar', physics: '2197',
                section: 'play', session: '85994ad8-a86d-408d-aeea-df1975ef2e34', time: 5265, track: 'korodera',
                user: 'Connavar',
            },
            string: true,
        },
        'class=flash&game=wipeout%20x&mode=speed%20lap&name=Connavar&physics=2197&section=play'
        + '&session=85994ad8-a86d-408d-aeea-df1975ef2e34&time=5265&track=korodera&user=Connavar',
    ],
].forEach(([dico, answer], id) => {
    test(`QueryString:${id}`, () => {
        expect(QueryString(dico)).toEqual(answer);
    });
});

// S
[
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '*',
        true,
        undefined,
        [
            '<div id="name" style="">N</div>',
            '<a href="#">L1</a>',
            '<a class="link"><i>L2</i></a>',
            '<i>L2</i>',
        ],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'a',
        true,
        'block',
        [
            '<a href="#" style="display: block;">L1</a>',
            '<a class="link" style="display: block;"><i>L2</i></a>',
        ]
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'a',
        true,
        'none',
        [
            '<a href="#" style="display: none;">L1</a>',
            '<a class="link" style="display: none;"><i>L2</i></a>',
        ]
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '#name',
        true,
        undefined,
        ['<div id="name" style="">N</div>'],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '#name',
        true,
        'flex',
        ['<div id="name" style="display: flex;">N</div>'],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'i',
        false,
        undefined,
        ['<i style="display: none;">L2</i>'],
    ],
].forEach(([html, sel, show, mode, answer], id) => {
    test(`S:${id}`, () => {
        let soup = CreateNode('div', html);
        S(sel, show, soup, mode);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// SetDefault
[
    [{}, 'new', ['a', 'b'], {new: ['a', 'b']}],
    [{lan: 'fra'}, 'new', ['a', 'b'], {lan: 'fra', new: ['a', 'b']}],
    [{}, 'areas', {}, {areas: {}}],
    [{areas: [1, 2, 3]}, 'areas', {}, {areas: [1, 2, 3]}],
    [[1, 2, 3], 3, 'FOUR', [1, 2, 3, 'FOUR']],
    [[1, 2, 3], 3, [5, 6], [1, 2, 3, [5, 6]]],
    [[1, 2, 3], 3, {lan: 'fra', options: {x: 1}}, [1, 2, 3, {lan: 'fra', options: {x: 1}}]],
].forEach(([dico, key, def, answer], id) => {
    test(`SetDefault:${id}`, () => {
        SetDefault(dico, key, def);
        expect(dico).toEqual(answer);
    });
});

// Show
[
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '*',
        [
            '<div id="name" style="">N</div>',
            '<a href="#">L1</a>',
            '<a class="link"><i>L2</i></a>',
            '<i>L2</i>',
        ],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'a',
        [
            '<a href="#">L1</a>',
            '<a class="link"><i>L2</i></a>',
        ]
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '#name',
        ['<div id="name" style="">N</div>'],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'i',
        ['<i>L2</i>'],
    ],
].forEach(([html, sel, answer], id) => {
    test(`Show:${id}`, () => {
        let soup = CreateNode('div', html);
        Show(sel, soup);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// Split
[
    [null, undefined, []],
    ['', undefined, []],
    ['abcd', '', ['a', 'b', 'c', 'd']],
    ['Rank|Engine|Points', undefined, ['Rank', 'Engine', 'Points']],
    ['Rank Engine Points', undefined, ['Rank', 'Engine', 'Points']],
    ['Rank|Engine Points', undefined, ['Rank', 'Engine Points']],
].forEach(([text, char, answer], id) => {
    test(`Split:${id}`, () => {
        expect(Split(text, char)).toEqual(answer);
    });
});

// Style
[
    // string
    ['<a></a>', 'a', 'opacity:0.5', undefined, '<a style="opacity: 0.5;"></a>'],
    ['<a></a>', 'a', 'color:red;opacity:0.5', true, '<a style="color: red; opacity: 0.5;"></a>'],
    ['<a style="opacity:0.1"></a>', 'a', 'opacity', false, '<a style=""></a>'],
    ['<a style="opacity:0.1"></a>', 'a', 'opacity:0.5', false, '<a style=""></a>'],
    ['<a style="color:red;opacity:0.1"></a>', 'a', 'opacity:0.5', false, '<a style="color: red;"></a>'],
    ['<a style="color:red;opacity:0.1"></a>', 'a', 'color:blue;opacity:0.5', false, '<a style=""></a>'],
    ['<a></a>', 'a', 'font-size:2em;z-index:5', true, '<a style="font-size: 2em; z-index: 5;"></a>'],
    // array
    ['<a></a>', 'a', [['opacity', '0.5']], undefined, '<a style="opacity: 0.5;"></a>'],
    ['<a></a>', 'a', [['color', 'red'], ['opacity', '0.5']], true, '<a style="color: red; opacity: 0.5;"></a>'],
    ['<a style="opacity:0.1"></a>', 'a', [['opacity']], false, '<a style=""></a>'],
    ['<a style="opacity:0.1"></a>', 'a', [['opacity', '0.5']], false, '<a style=""></a>'],
    ['<a style="color:red;opacity:0.1"></a>', 'a', [['opacity' ,'0.5']], false, '<a style="color: red;"></a>'],
    ['<a style="color:red;opacity:0.1"></a>', 'a', [['color', 'blue'], ['opacity', '0.5']], false, '<a style=""></a>'],
    ['<a></a>', 'a', [['font-size', '2em'], ['z-index', '5']], true, '<a style="font-size: 2em; z-index: 5;"></a>'],
].forEach(([html, sel, styles, add, answer], id) => {
    test(`Style:${id}`, () => {
        let soup = CreateNode('div', html);
        Style(sel, styles, add, soup);
        expect(soup.innerHTML).toEqual(answer);
    });
});

// TEXT
[
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        undefined,
        'N',
        ['<div id="name">N</div>', '<a href="#">L1</a>', '<a class="link"><i>L2</i></a>', '<i>L2</i>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a.link',
        undefined,
        'L2',
        ['<a class="link"><i>L2</i></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        '',
        '',
        ['<div id="name"></div>', '<a href="#"></a>', '<a class="link"></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        'text',
        'text',
        ['<a href="#">text</a>', '<a class="link">text</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a.link',
        '<span>test</span>',
        '<span>test</span>',
        ['<a class="link">&lt;span&gt;test&lt;/span&gt;</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        '<span>link</span>',
        '<span>link</span>',
        ['<a href="#">&lt;span&gt;link&lt;/span&gt;</a>', '<a class="link">&lt;span&gt;link&lt;/span&gt;</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '#name',
        'engine<br>version',
        'engine<br>version',
        ['<div id="name">engine&lt;br&gt;version</div>'],
    ],
].forEach(([shtml, sel, html, answer, answer_nodes], id) => {
    test(`TEXT:${id}`, () => {
        let soup = CreateNode('div', shtml);
        expect(TEXT(sel, html, soup)).toEqual(answer);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer_nodes);
    });
});

// TextHTML
[
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        undefined,
        'N',
        ['<div id="name">N</div>', '<a href="#">L1</a>', '<a class="link"><i>L2</i></a>', '<i>L2</i>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a.link',
        undefined,
        'L2',
        ['<a class="link"><i>L2</i></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '*',
        '',
        '',
        ['<div id="name"></div>', '<a href="#"></a>', '<a class="link"></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        'text',
        'text',
        ['<a href="#">text</a>', '<a class="link">text</a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        'a',
        '<span>link</span>',
        '<span>link</span>',
        ['<a href="#"><span>link</span></a>', '<a class="link"><span>link</span></a>'],
    ],
    [
        '<div id="name">N</div><a href="#">L1</a><a class="link"><i>L2</i></a>',
        '#name',
        'engine<br>version',
        'engine<br>version',
        ['<div id="name">engine<br>version</div>'],
    ],
].forEach(([shtml, sel, html, answer, answer_nodes], id) => {
    test(`TextHTML:${id}`, () => {
        let soup = CreateNode('div', shtml);
        expect(TextHTML(sel, html, soup)).toEqual(answer);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer_nodes);
    });
});

// Title
[
    ['', ''],
    ['white', 'White'],
    [123, '123'],
    [null, 'Null'],
    ['forEach', 'ForEach'],
].forEach(([text, answer], id) => {
    test(`Title:${id}`, () => {
        expect(Title(text)).toEqual(answer);
    });
});

// Toggle
[
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '*',
        [
            '<div id="name" style="">N</div>',
            '<a href="#" style="display: none;">L1</a>',
            '<a class="link"><i style="display: none;">L2</i></a>',
            '<i style="display: none;">L2</i>',
        ],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'a',
        [
            '<a href="#" style="display: none;">L1</a>',
            '<a class="link"><i>L2</i></a>',
        ]
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        '#name',
        ['<div id="name" style="">N</div>'],
    ],
    [
        '<div id="name" style="display:none">N</div><a href="#">L1</a><a class="link dn"><i>L2</i></a>',
        'i',
        ['<i style="display: none;">L2</i>'],
    ],
].forEach(([html, sel, answer], id) => {
    test(`Toggle:${id}`, () => {
        let soup = CreateNode('div', html);
        Toggle(sel, soup);
        let nodes = A(sel, soup);
        expect(From(nodes).map(node => node.outerHTML)).toEqual(answer);
    });
});

// Undefined
[
    [undefined, undefined, undefined],
    [undefined, null, null],
    [undefined, 0, 0],
    [undefined, 5, 5],
    [undefined, 'ok', 'ok'],
    [null, 'ok', null],
    ['', 'ok', ''],
    [0, 'ok', 0],
    [NaN, undefined, undefined],
    [NaN, 1, 1],
    [NaN, 1.5, 1.5],
    [NaN, 'ok', 'ok'],
].forEach(([value, def, answer], id) => {
    test(`Undefined:${id}`, () => {
        expect(Undefined(value, def)).toEqual(answer);
    });
});

// Visible
[
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', '*', false],
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', 'a', false],
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', 'a:first-of-type', true],
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', 'a.link', false],
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', '#x', false],
    ['<div id="x" style="display:none">N</div><a>L1</a><a class="link dn"><i>L2</i></a>', 'i', true],
].forEach(([html, sel, answer], id) => {
    test(`Visible:${id}`, () => {
        let soup = CreateNode('div', html);
        expect(Visible(sel, soup)).toEqual(answer);
    });
});

// VisibleHeight
[
    0,
].forEach((answer, id) => {
    test(`VisibleHeight:${id}`, () => {
        expect(VisibleHeight()).toBeGreaterThan(answer);
    });
});

// VisibleWidth
[
    0,
].forEach((answer, id) => {
    test(`VisibleWidth:${id}`, () => {
        expect(VisibleWidth()).toBeGreaterThan(answer);
    });
});
