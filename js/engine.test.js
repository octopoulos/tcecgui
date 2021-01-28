// engine.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-01-27
//
/*
globals
expect, require, test
*/
'use strict';

let {Assign, Clear, Keys} = require('./common.js'),
    {
        add_font, add_history, AUTO_ON_OFF, calculate_text_width, cannot_click, cannot_popup, create_field_value,
        create_page_array, create_svg_icon, create_url_list, DEFAULTS, DEV, DEV_NAMES, done_touch, FONTS, get_float,
        get_int, get_object, get_string, guess_types, ICONS, import_settings, KEYS, load_defaults, merge_settings,
        ON_OFF, option_number, parse_dev, reset_default, reset_settings, resize_text, restore_history, sanitise_data,
        save_default, save_option, show_settings, translate, translate_default, translate_expression,
        translates, TYPES,
        X_SETTINGS, Y, y_states,
    } = require('./engine.js');

Assign(DEFAULTS, {
    language: '',
    limit: 20,
    skip: 0,
    theme: '',
});

Assign(DEV_NAMES, {
    E: 'engine',
    S: 'no_socket',
    w: 'wasm',
});

Assign(ICONS, {
    play: 'VB="0 0 448 512"><PFC d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"/>',
});

Assign(translates, {
    Argentina: 'Argentine',
    Belgium: 'Belgique',
    Japan: 'Japon',
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add_font
// [D: 20/61 | TB: 1495 | Sp: 120Mn/s | N: 424.8M]
[
    ['', {}, {'': {'': 615}}],
    [
        'basic',
        {
            '': 615, 0: 711, 1: 515, 2: 711, 3: 711, 4: 738, 5: 711, 6: 715, 7: 687, 8: 711, 9: 715,
            ' ': 352, '.': 309, ':': 309, '/': 530, '[': 425, ']': 425, '%': 1076, '|': 357,
            B: 774, D: 919, k: 672, M: 1184, n: 747, N: 982, p: 772, s: 552, S: 697, T: 707, W: 1237,
        },
        {
            '': {'': 615},
            basic: {
                '': 615, 0: 711, 1: 515, 2: 711, 3: 711, 4: 738, 5: 711, 6: 715, 7: 687, 8: 711, 9: 715,
                ' ': 352, '.': 309, ':': 309, '/': 530, '[': 425, ']': 425, '%': 1076, '|': 357,
                B: 774, D: 919, k: 672, M: 1184, n: 747, N: 982, p: 772, s: 552, S: 697, T: 707, W: 1237,
            },
        },
    ],
].forEach(([font, sizes, answer], id) => {
    test(`add_font:${id}`, () => {
        add_font(font, sizes);
        expect(FONTS).toEqual(answer);
    });
});

// add_history
[
    {chat_height: 10, twitch_chat: 1},
].forEach((y, id) => {
    test(`add_history:${id}`, () => {
        let length = y_states.length;
        Assign(Y, y);
        add_history();
        expect(y_states.length).toBe(length + 1);
    });
});

// calculate_text_width
[
    ['', '', 0],
    ['?', '', 615],
    ['1', 'basic', 515],
    ['11', 'basic', 1030],
    ['WDB', 'basic', 2930],
    ['24.3%', 'basic', 3545],
    ['24.3% W | 75.7% D | 0.0% B', 'basic', 15930],
    ['52.1% W | 47.2% D | 0.7% B', '', 15990],
    ['52.1% W | 47.2% D | 0.7% B', 'basic', 15734],
    ['44.4% W | 44.4% D | 44.4% B', '', 16605],
    ['44.4% W | 44.4% D | 44.4% B', 'basic', 16905],
    ['[44.4% W | 44.4% D | 44.4% B]', '', 17835],
    ['[44.4% W | 44.4% D | 44.4% B]', 'basic', 17755],
    ['[D: 20/61 | TB: 1495 | Sp: 120Mn/s | N: 424.8M]', '', 28905],
    ['[D: 20/61 | TB: 1495 | Sp: 120Mn/s | N: 424.8M]', 'basic', 26730],
].forEach(([text, font, answer], id) => {
    test(`calculate_text_width:${id}`, () => {
        expect(calculate_text_width(text, font)).toEqual(answer);
    });
});

// cannot_click
[
    [0, true],
    [-0.4, true],
    [-0.6, false],
    [-1, false],
].forEach(([delta, answer], id) => {
    test(`cannot_click:${id}`, () => {
        done_touch(delta);
        expect(cannot_click()).toBe(answer);
    });
});

// cannot_popup
[
    [{popup_right_click: 0}, {17: 0}, true],
    [{popup_right_click: 0}, {17: 1}, true],
    [{popup_right_click: 1}, {17: 0}, false],
    [{popup_right_click: 1}, {17: 1}, true],
].forEach(([y, keys, answer], id) => {
    test(`cannot_popup:${id}`, () => {
        Assign(Y, y);
        Assign(KEYS, keys);
        expect(!!cannot_popup()).toBe(answer);
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
    ['{Wins} <i>[{W/B}]</i>', ['wins', '{Wins} <i>[{W/B}]</i>']],
    ['{Wins} <i class="more">[{W/B}]</i>', ['wins', '{Wins} <i class="more">[{W/B}]</i>']],
    ['rMobility', ['r_mobility', 'rMobility']],
    ['RMobilityScore', ['rmobility_score', 'RMobilityScore']],
    ['RMobilityResult', ['rmobility_result', 'RMobilityResult']],
    ['rmobility_score=rMobility', ['rmobility_score', 'rMobility']],
    ['rmobility_result=rMobility', ['rmobility_result', 'rMobility']],
    ['rmobility_score=rMobility <hsub>[{Diff}]</hsub>', ['rmobility_score', 'rMobility <hsub>[{Diff}]</hsub>']],
].forEach(([text, answer], id) => {
    test(`create_field_value:${id}`, () => {
        expect(create_field_value(text)).toEqual(answer);
    });
});

// create_page_array
[
    [1, 0, 0, [2]],
    [2, 0, 0, [2, 2]],
    [3, 0, 0, [2, 2, 2]],
    [4, 0, 0, [2, 2, 2, 2]],
    [5, 0, 0, [2, 2, 2, 2, 2]],
    [6, 0, 0, [2, 2, 2, 0, 1, 2]],
    [7, 0, 0, [2, 2, 2, 0, 0, 1, 2]],
    [8, 0, 0, [2, 2, 2, 0, 0, 0, 1, 2]],
    [9, 0, 0, [2, 2, 2, 0, 0, 0, 0, 1, 2]],
    [9, 1, 0, [2, 2, 2, 0, 0, 0, 0, 1, 2]],
    [9, 2, 0, [2, 2, 2, 0, 0, 0, 0, 1, 2]],
    [9, 3, 0, [2, 1, 0, 2, 0, 0, 0, 1, 2]],
    [9, 4, 0, [2, 1, 0, 0, 2, 0, 0, 1, 2]],
    [9, 4, 1, [2, 1, 0, 0, 2, 2, 0, 1, 2]],
    [9, 4, 2, [2, 1, 0, 2, 2, 2, 0, 1, 2]],
    [9, 5, 2, [2, 1, 0, 0, 2, 2, 2, 2, 2]],
    [9, 6, 2, [2, 1, 0, 0, 2, 2, 2, 2, 2]],
    [9, 5, 4, [2, 2, 2, 2, 2, 2, 2, 2, 2]],
].forEach(([num_page, page, extra, answer], id) => {
    test(`create_page_array:${id}`, () => {
        expect(create_page_array(num_page, page, extra)).toEqual(answer);
    });
});

// create_svg_icon
[
    ['', ''],
    ['next', ''],
    ['play', '<svg class="svg play" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"/></svg>'],
].forEach(([name, answer], id) => {
    test(`create_svg_icon:${id}`, () => {
        expect(create_svg_icon(name)).toEqual(answer);
    });
});

// create_url_list
[
    [null, ''],
    [{}, '<vert class="fastart"></vert>'],
    [{a: 1}, '<vert class="fastart"><hr></vert>'],
].forEach(([dico, answer], id) => {
    test(`create_url_list:${id}`, () => {
        expect(create_url_list(dico)).toEqual(answer);
    });
});

// get_float
[
    ['x', '', 6.1, 6.1],
    ['x', null, undefined, undefined],
    ['x', null, 'test', 'test'],
    ['x', null, 7.2, 7.2],
    ['x', 5.25, undefined, 5.25],
    ['x', 5, undefined, 5.0],
    ['x', {y: 9}, undefined, undefined],
    ['x', {y: 9}, 8.3, 8.3],
    ['x', {y: 9}, null, null],
    ['x', '3.33', undefined, 3.33],
    ['x', '3', undefined, 3.0],
    ['x', 'live', undefined, undefined],
    ['x', 'live', 9.4, 9.4],
    ['x', 'live', {error: 1}, {error: 1}],
].forEach(([name, value, def, answer], id) => {
    test(`get_float:${id}`, () => {
        save_option(name, value);
        expect(get_float(name, def)).toEqual(answer);
    });
});

// get_int
[
    ['x', '', 6, true, 6],
    ['x', null, undefined, false, 'null'],
    ['x', null, 7, false, 'null'],
    ['x', null, 7, true, 7],
    ['x', 5.25, undefined, false, 5],
    ['x', 5, undefined, false, 5],
    ['x', {y: 9}, undefined, false, '{"y":9}'],
    ['x', {y: 9}, 8, false, '{"y":9}'],
    ['x', {y: 9}, 8, true, 8],
    ['x', '3.33', undefined, false, 3],
    ['x', '3', undefined, false, 3],
    ['x', 'live', undefined, 'live'],
    ['x', 'live', 9, false, 'live'],
    ['x', 'live', 9, true, 9],
].forEach(([name, value, def, force, answer], id) => {
    test(`get_int:${id}`, () => {
        save_option(name, value);
        expect(get_int(name, def, force)).toEqual(answer);
    });
});

// get_object
[
    ['x', '', {good: true}, {good: true}],
    ['x', null, undefined, null],
    ['x', null, 'test', null],
    ['x', null, 7.1, null],
    ['x', 5.25, undefined, 5.25],
    ['x', 5, undefined, 5.0],
    ['x', {y: 9}, undefined, {y: 9}],
    ['x', {y: 9}, 8.2, {y: 9}],
    ['x', {y: 9}, null, {y: 9}],
    ['x', '3.33', undefined, 3.33],
    ['x', '3', undefined, 3],
    ['x', '"live"', undefined, 'live'],
    ['x', 'live', 9.3, 9.3],
    ['x', 'live', {error: 1}, {error: 1}],
].forEach(([name, value, def, answer], id) => {
    test(`get_object:${id}`, () => {
        save_option(name, value);
        expect(get_object(name, def)).toEqual(answer);
    });
});

// get_string
[
    ['x', 'undefined', 'good', 'good'],
    ['x', null, undefined, 'null'],
    ['x', null, 'test', 'null'],
    ['x', null, 7.1, 'null'],
    ['x', 5.25, undefined, '5.25'],
    ['x', 5, undefined, '5'],
    ['x', {y: 9}, undefined, '{"y":9}'],
    ['x', {y: 9}, 8.2, '{"y":9}'],
    ['x', {y: 9}, null, '{"y":9}'],
    ['x', '3.33', undefined, '3.33'],
    ['x', '3', undefined, '3'],
    ['x', '"live"', undefined, '"live"'],
    ['x', 'live', 9.3, 'live'],
    ['x', 'live', {error: 1}, 'live'],
].forEach(([name, value, def, answer], id) => {
    test(`get_string:${id}`, () => {
        save_option(name, value);
        expect(get_string(name, def)).toEqual(answer);
    });
});

// guess_types
[
    [
        {
            div: '',
            game: 0,
            table_tab: {
                archive: 'season',
                live: 'stand',
            },
            timeout: 0.1,
            useful: true,
        },
        {
            div: 's',
            game: 'i',
            table_tab: 'o',
            timeout: 'f',
            useful: 'b',
        },
    ],
    [
        {
            color: [{type: 'color'}],
            color2: '#ff0000',
            coord: [{x: 5, y: 8}],
            coord2: {x: 5, y: 8},
            name: [{type: 'text'}],
            name2: 'chess',
            ratio: [{step: 0.1, type: 'number'}],
            ratio2: 0.5,
            width: [{type: 'number'}],
            width2: 650,
        },
        {
            color: 's',
            color2: 's',
            coord: 'o',
            coord2: 'o',
            name: 's',
            name2: 's',
            ratio: 'f',
            ratio2: 'f',
            width: 'i',
            width2: 'i',
        },
    ],
    [
        {
            wrap: [ON_OFF, 1],
            wrap_cross: [AUTO_ON_OFF, 'auto'],
        },
        {
            wrap: 'i',
            wrap_cross: 'i',
        },
    ],
].forEach(([settings, answer], id) => {
    test(`guess_types:${id}`, () => {
        guess_types(settings);
        Keys(answer).forEach(key => {
            expect(TYPES).toHaveProperty(key, answer[key]);
        });
    });
});

// import_settings
[
    [{}, true, {}],
    [{width: 100}, undefined, {width: 100}],
    [{height: '500px'}, undefined, {height: '500px', width: 100}],
].forEach(([data, reset, answer], id) => {
    test(`import_settings:${id}`, () => {
        import_settings(data, reset);
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});

// load_defaults
[
    {language: '', limit: 20},
].forEach((answer, id) => {
    test(`load_defaults:${id}`, () => {
        Clear(Y);
        guess_types(DEFAULTS);
        load_defaults();
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});

// merge_settings
[
    [{}, {}, {}, {}],
    [{advanced: {debug: ''}}, {advanced: {debug: ''}}, {debug: undefined}, {debug: undefined}],
    [
        {audio: {volume: [{min: 0, max: 10, type: 'number'}, 5]}},
        {
            advanced: {debug: ''},
            audio: {volume: [{min: 0, max: 10, type: 'number'}, 5]},
        },
        {debug: undefined, volume: 5},
        {debug: undefined, volume: 'i'}
    ],
    [
        {
            advanced: {key_time: [{min: 0, max: 1000, type: 'number'}, 0]},
            audio: {music: [['on', 'off'], 0]},
        },
        {
            advanced: {
                debug: '',
                key_time: [{min: 0, max: 1000, type: 'number'}, 0],
            },
            audio: {
                music: [['on', 'off'], 0],
                volume: [{min: 0, max: 10, type: 'number'}, 5],
            },
        },
        {debug: undefined, key_time: 0, music: 0, volume: 5},
        {debug: undefined, key_time: 'i', music: 'i', volume: 'i'},
    ],
    [
        {
            board_pva: {
                controls_pva: [ON_OFF, 1],
                custom_white_pv: {
                    _class: 'dn',
                    _value: [{type: 'color'}, '#ffffff'],
                },
                source_color: {
                    _multi: 2,
                    source_color: [{type: 'color'}, '#ffb400'],
                    source_opacity: option_number(0.7, 0, 1, 0.01),
                },
                turn_color: {
                    _multi: 2,
                    turn_color: [{type: 'color'}, '#ff5a00'],
                    turn_opacity: option_number(0, 0, 1, 0.01),
                },
            },
        },
        {
            advanced: {
                debug: '',
                key_time: [{min: 0, max: 1000, type: 'number'}, 0],
            },
            audio: {
                music: [['on', 'off'], 0],
                volume: [{min: 0, max: 10, type: 'number'}, 5],
            },
            board_pva: {
                controls_pva: [ON_OFF, 1],
                custom_white_pv: {
                    _class: 'dn',
                    _value: [{type: 'color'}, '#ffffff'],
                },
                source_color: {
                    _multi: 2,
                    source_color: [{type: 'color'}, '#ffb400'],
                    source_opacity: option_number(0.7, 0, 1, 0.01),
                },
                turn_color: {
                    _multi: 2,
                    turn_color: [{type: 'color'}, '#ff5a00'],
                    turn_opacity: option_number(0, 0, 1, 0.01),
                },
            },
        },
        {
            controls_pva: 1, custom_white_pv: '#ffffff', source_color: '#ffb400', source_opacity: 0.7,
            turn_color: '#ff5a00', turn_opacity: 0,
        },
        {
            controls_pva: 'i', custom_white_pv: 's', source_color: 's', source_opacity: 'f', turn_color: 's',
            turn_opacity: 'f',
        },
    ],
].forEach(([x_settings, answer, answer_def, answer_type], id) => {
    test(`merge_settings:${id}`, () => {
        merge_settings(x_settings);
        expect(X_SETTINGS).toEqual(answer);
        Keys(answer_def).forEach(key => {
            expect(DEFAULTS).toHaveProperty(key, answer_def[key]);
        });
        Keys(answer_type).forEach(key => {
            expect(TYPES).toHaveProperty(key, answer_type[key]);
        });
    });
});

// option_number
[
    [150, 0, 2000, undefined, undefined, undefined, [{max: 2000, min: 0, step: 1, type: 'number'}, 150, '']],
    [-200, -1000, 1000, undefined, undefined, undefined, [{max: 1000, min: -1000, step: 1, type: 'number'}, -200, '']],
    [10, 0, 20, 0.5, undefined, undefined, [{max: 20, min: 0, step: 0.5, type: 'number'}, 10, '']],
    [0.055, 0, 0.4, 0.001, undefined, undefined, [{max: 0.4, min: 0, step: 0.001, type: 'number'}, 0.055, '']],
    [0.7, 0, 1, 0.01, {}, 'mix', [{max: 1, min: 0, step: 0.01, type: 'number'}, 0.7, 'mix']],
].forEach(([def, min, max, step, options, help, answer], id) => {
    test(`option_number:${id}`, () => {
        expect(option_number(def, min, max, step, options, help)).toEqual(answer);
    });
});


// parse_dev
[
    ['', {}],
    ['E', {engine: 1}],
    ['E0', {engine: 0}],
    ['E1', {engine: 1}],
    ['E2', {engine2: 2}],
    ['E3', {engine: 3, engine2: 3}],
    ['E3E0', {engine: 0, engine2: 3}],
    ['E15', {engine: 15, engine2: 15, engine4: 15, engine8: 15}],
    ['ES', {engine: 1, no_socket: 1}],
    ['E5S100', {engine: 5, engine4: 5, no_socket4: 100, no_socket32: 100, no_socket64: 100}],
    ['E5S100Z', {}],
    ['E5S100Zw3', {wasm: 3, wasm2: 3}],
].forEach(([dev, answer], id) => {
    test(`parse_dev:${id}`, () => {
        Y.dev = dev;
        parse_dev();
        expect(DEV).toEqual(answer);
    });
});

// reset_default
[
    ['language', undefined, ''],
    ['language', 'fra', ''],
    ['language', '', ''],
    ['limit', 500, 20],
    ['limit', undefined, 20],
].forEach(([name, value, answer], id) => {
    test(`reset_default:${id}`, () => {
        Y[name] = value;
        expect(reset_default(name)).toEqual(answer);
        expect(Y[name]).toEqual(answer);
        expect(get_string(name)).toBeUndefined();
    });
});

// reset_settings
[
    [{'language': 'fra', 'theme': 'dark'}, true, {language: '', theme: ''}],
].forEach(([data, reset, answer], id) => {
    test(`reset_settings:${id}`, () => {
        Assign(Y, data);
        reset_settings(data, reset);
        Keys(answer).forEach(key => {
            expect(Y).toHaveProperty(key, answer[key]);
        });
    });
});

// resize_text
[
    [null, 4, undefined, null],
    [12, 2, undefined, '12'],
    [123, 2, undefined, '<span class="resize">123</span>'],
    [123456, 4, undefined, '<span class="resize">123456</span>'],
    [123456, 4, '', '<span class="">123456</span>'],
    ['Qxc6', 4, undefined, 'Qxc6'],
    ['QXC6', 4, undefined, '<span class="resize">QXC6</span>'],
    ['Qxc6+', 4, undefined, '<span class="resize">Qxc6+</span>'],
    ['Qxc6+', 4, 'compress', '<span class="compress">Qxc6+</span>'],
    ['b8:Q', 4, undefined, 'b8:Q'],
    ['b8=Q', 4, undefined, '<span class="resize">b8=Q</span>'],
    ['KomodoDragonArmageddon', 0, undefined, 'KomodoDragonArmageddon'],
    ['KomodoDragonArmageddon', 15, undefined, '<span class="resize">KomodoDragonArmageddon</span>'],
].forEach(([text, resize, class_, answer], id) => {
    test(`resize_text:${id}`, () => {
        expect(resize_text(text, resize, class_)).toEqual(answer);
    });
});

// restore_history
[
    [{theme: 'light', volume: 5}, {theme: 'dark', volume: 10}],
].forEach(([y, y2], id) => {
    test(`restore_history:${id}`, () => {
        Assign(Y, y);
        add_history();
        Assign(Y, y2);
        add_history();
        Keys(y2).forEach(key => {
            expect(Y).toHaveProperty(key, y2[key]);
        });
        restore_history(-1);
        Keys(y).forEach(key => {
            expect(Y).toHaveProperty(key, y[key]);
        });
    });
});

// sanitise_data
[
    [{width: ''}, {width: 600}, {width: 'f'}, {width: 600}],
    [{width: '700.5'}, {width: 600}, {width: 'f'}, {width: 700.5}],
    [{width: '700.5'}, {width: 600}, {width: 'i'}, {width: 700}],
    [{width: 700.5}, {width: 600}, {width: 'i'}, {width: 700.5}],
    [{width: '700.5'}, {width: undefined}, {width: undefined}, {width: '700.5'}],
].forEach(([y, defaults, types, answer], id) => {
    test(`sanitise_data:${id}`, () => {
        Assign(Y, y);
        Assign(DEFAULTS, defaults);
        Assign(TYPES, types);

        sanitise_data();
        Keys(answer).forEach(key => {
            expect(Y[key]).toEqual(answer[key]);
        });
    });
});

// save_default
[
    ['language', undefined, '', undefined],
    ['language', 'eng', 'eng', 'eng'],
    ['language', 'fra', 'fra', 'fra'],
    ['language', undefined, 'fra', 'fra'],
    ['language', '', '', undefined],
    ['limit', 500, 500, '500'],
    ['limit', 30, 30, '30'],
    ['limit', 20, 20, undefined],
    ['limit', undefined, 20, undefined],
].forEach(([name, value, answer, answer_storage], id) => {
    test(`save_default:${id}`, () => {
        save_default(name, value);
        expect(Y[name]).toEqual(answer);
        expect(get_string(name)).toEqual(answer_storage);
    });
});


// save_option
[
    ['width', 100, '100'],
    ['x', 'live', 'live'],
].forEach(([name, value, answer], id) => {
    test(`save_option:${id}`, () => {
        save_option(name, value);
        expect(Y[name]).toEqual(value);
        expect(get_string(name)).toEqual(answer);
    });
});

// show_settings
[
    ['unknown', {}, '<grid class="options"><div class="item-title span" data-set="" data-n="unknown" data-t="Unknown options"></div><a class="item item-title span" data-set="-1" data-t="OK"></a></grid>'],
    ['audio', {}, '<grid class="options"><div class="item-title span" data-set="" data-n="audio" data-t="Audio options"></div><a class="item"><i data-t="Volume"></i></a><vert class="fcenter"><input name="volume" type="number" class="setting" min="0" max="10" step="1" value="5"undefined></vert><a class="item"><i data-t="Music"></i></a><vert class="fcenter"><select name="music"><option value="1" data-t="on"></option><option value="0" selected data-t="off"></option></select></vert><a class="item item-title span" data-set="-1" data-t="OK"></a></grid>'],
].forEach(([name, dico, answer], id) => {
    test(`show_settings:${id}`, () => {
        expect(show_settings(name, dico)).toEqual(answer);
    });
});

// translate
[
    [{}, null, null],
    [{}, '', ''],
    [{'language': 'fra'}, 'Italy', null],
    [{}, 'Japan', 'Japon'],
].forEach(([y, text, answer], id) => {
    test(`translate:${id}`, () => {
        Assign(Y, y);
        expect(translate(text)).toEqual(answer);
    });
});

// translate_default
[
    [{}, null, null],
    [{}, '', ''],
    [{'language': 'fra'}, 'Italy', 'Italy'],
    [{}, 'Japan', 'Japon'],
].forEach(([y, text, answer], id) => {
    test(`translate_default:${id}`, () => {
        Assign(Y, y);
        expect(translate_default(text)).toEqual(answer);
    });
});

// translate_expression
[
    [{}, null, ''],
    [{}, '', ''],
    [{'language': 'fra'}, 'Italy', 'Italy'],
    [{}, '{unknown}', 'unknown'],
    [{}, 'Argentina', 'Argentine'],
    [{}, 'Belgium', 'Belgique'],
    [{}, '{Belgium} #1', 'Belgique #1'],
    [{}, '{Japan} vs {Italy}', 'Japon vs Italy'],
].forEach(([y, text, answer], id) => {
    test(`translate_expression:${id}`, () => {
        Assign(Y, y);
        expect(translate_expression(text)).toEqual(answer);
    });
});
