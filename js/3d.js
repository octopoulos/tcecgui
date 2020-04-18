// 3d.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// general 3d rendering code
//
// included after: common, engine, global
/*
globals
_, Abs, add_timeout, Assign, Attrs, Audio, C, Class, clear_timeout, DEFAULTS, DEV, Events, Exp, Format, HTML, KEY_TIMES,
Keys, KEYS, merge_settings, navigator, Now, S, save_option, translate_node, Visible, window, X_SETTINGS, Y
*/
'use strict';

let audiobox = {
        sounds: {},
    },
    axes = [0, 0, 0, 0],
    AXIS_DEAD_ZONE = 0.2,
    AXIS_MAPPING = [
        [37, 39],
        [38, 40],
        [37, 39],
        [38, 40],
    ],
    BUTTON_MAPPING = {
        0: 83,          // X
        1: 69,          // O
        2: 32,          // square
        3: 67,          // triangle
        4: 65,          // L1
        5: 68,          // R1
        6: 192,         // L2
        7: 82,          // R2
        8: 27,          // share
        9: 27,          // options
        // 10,          // L3
        // 11,          // R3
        12: 38,         // up
        13: 40,         // down
        14: 37,         // left
        15: 39,         // right
        16: 27,         // home
        17: 27,         // touch bar
    },
    button_repeat,
    button_repeat_time,
    buttons = {},
    debugs = {},
    frame = 0,
    gamepad_id,
    gamepads = {},
    is_paused,
    modal_name,
    now,
    ON_OFF = ['on', 'off'],
    SHADOW_QUALITIES = {
        off: [0, 0, 0],
        'very low': [1, 33, 512],       // 15.52
        low: [1, 53, 1024],             // 19.32
        medium: [2, 80, 2048],          // 25.6
        high: [2, 106, 4096],           // 38.64
        'very high': [2, 166, 8192],    // 49.35
    },
    vibration,
    virtual_change_setting_special,
    virtual_game_action_key,
    virtual_game_action_keyup,
    virtual_set_modal_events_special,
    virtual_show_modal_special,
    virtual_update_debug_special;

// INPUT / OUTPUT
/////////////////

/**
 * Check gamepad inputs
 */
function gamepad_update() {
    let gamepads = navigator.getGamepads(),
        time = is_paused? Now(true): now;

    for (let pad of gamepads) {
        if (!pad || pad.index != gamepad_id)
            continue;

        if (vibration) {
            pad.vibrationActuator.playEffect("dual-rumble", {
                startDelay: 0,
                duration: 100,
                weakMagnitude: 0.1,
                strongMagnitude: 1.0
            });
            vibration = false;
        }

        // convert buttons to binary KEYS
        pad.buttons.forEach((button, id) => {
            let code = BUTTON_MAPPING[id];
            if (button.pressed) {
                if (!buttons[id]) {
                    if (virtual_game_action_key)
                        virtual_game_action_key(code);
                    buttons[id] = time;
                    KEYS[code] = 1;
                    KEY_TIMES[code] = Now(true);
                }
            }
            else if (buttons[id]) {
                if (virtual_game_action_keyup)
                    virtual_game_action_keyup(code);
                buttons[id] = 0;
                KEYS[code] = 0;
            }
        });

        // convert axes to analog KEYS
        pad.axes.forEach((axis, id) => {
            let absolute = Abs(axis),
                codes = AXIS_MAPPING[id],
                index = (axis < 0)? 0: 1;

            if (absolute > AXIS_DEAD_ZONE) {
                if (Abs(axes[id]) < AXIS_DEAD_ZONE)
                    if (virtual_game_action_key)
                        virtual_game_action_key(codes[index]);
                KEYS[codes[index]] = absolute;
                KEYS[codes[1 - index]] = 0;
            }
            else {
                if (Abs(axes[id]) >= AXIS_DEAD_ZONE) {
                    if (virtual_game_action_keyup)
                        virtual_game_action_keyup(codes[index]);
                    KEYS[codes[0]] = 0;
                    KEYS[codes[1]] = 0;
                }
            }
        });
        axes = pad.axes;
    }
}

/**
 * Play a sound
 * @param {Cube} cube
 * @param {string} name
 * @param {string=} _ filename
 * @param {string=} ext
 * @param {number=} cycle end of the cycle
 * @param {boolean=} inside
 * @param {boolean=} interrupt play the sound again even if it's being played
 * @param {number=} start start of the 2nd cycle
 * @param {boolean=} voice
 * @param {number=} volume
 */
function play_sound(cube, name, {_, cycle, ext='ogg', inside, interrupt, start=0, voice, volume=1}={}) {
    if (!cube || !cube.sounds)
        return;
    let audio = cube.sounds[name];
    // already played the same sound this frame => skip
    if (audio && frame && audio.frame == frame)
        return;

    if (voice)
        volume *= Y.voice_volume / 10;
    else
        volume *= Y.sfx_volume / 10;

    // play sounds weaker depending on the distance
    // - distance between 2 segments is ~1500 units
    // http://fooplot.com/#W3sidHlwZSI6MCwiZXEiOiJleHAoLXgqMC4xOCkqMC42IiwiY29sb3IiOiIjMDAwMDAwIn0seyJ0eXBlIjoxMDAwLCJ3aW5kb3ciOlsiMCIsIjMwIiwiMCIsIjEiXSwiZ3JpZCI6WyIxIiwiMC4xIl19XQ--
    if (!voice || !cube.see)
        if (!isNaN(cube.camera))
            volume *= Exp(-cube.camera * 0.0072);

    volume *= Y.volume / 10;
    if ((inside || voice) && !cube.see)
        volume *= 0.05;

    // negative volume to stop
    if (volume < 0.001) {
        if (audio)
            audio.pause();
        return;
    }

    // load & seek
    if (!audio) {
        audio = new Audio(`sound/${_ || name}.${ext}`);
        audio.promise = Promise.resolve();
        cube.sounds[name] = audio;
    }
    else if (interrupt || (!audio.ended && cycle && audio.currentTime > cycle * audio.duration)) {
        audio.pause();
        audio.currentTime = start;
    }

    // play
    audio.frame = frame;
    if (volume >= 0 && volume < 1)
        audio.volume = volume;

    audio.promise = audio.promise.then(() => {
        return Promise.resolve(audio.play());
    })
    .catch(() => {
        audio.pause();
    });
}

// UI
////////

/**
 * Change a setting
 * @param {string} name
 * @param {string|number} value
 */
function change_setting(name, value) {
    if (value != undefined) {
        if (!isNaN(value))
            value *= 1;
        save_option(name, value);
    }

    if (virtual_change_setting_special && virtual_change_setting_special(name, value))
        return;
}

/**
 * Check gamepad inputs at regular intervals when the menu is visible
 */
function gamepad_modal() {
    if (!Visible('#overlay')) {
        [37, 38, 39, 40].forEach(code => {
            KEYS[code] = 0;
        });
        return;
    }

    // forget old buttons
    let time = Now(true);
    Keys(buttons).forEach(key => {
        let button = buttons[key];
        if (!button)
            return;

        let code = BUTTON_MAPPING[key];
        if (code < 37 || code > 40)
            return;

        let repeat = (key == button_repeat && time < button_repeat_time)? 0: 0.5;
        if (time > button + repeat) {
            buttons[key] = 0;
            button_repeat = key;
            button_repeat_time = time + 0.1;
        }
    });

    gamepad_update();
    add_timeout('pad', gamepad_modal, 50);
}

/**
 * Close the modal and resume the game
 */
function resume_game() {
    is_paused = false;
    if (Visible('#overlay'))
        show_modal();
}

/**
 * Show the menu
 * + pause the game unless the session has ended
 */
function show_menu() {
    show_modal(true);
}

/**
 * Show / hide the modal
 * @param {boolean=} show
 * @param {string=} text show modal2 instead of modal, and use this text
 * @param {string=} title set the modal2 title
 * @param {string=} name
 */
function show_modal(show, text, title, name) {
    S('#overlay', show);
    if (typeof(text) == 'string') {
        Attrs('#modal-title', 'data-t', title? title: '');
        HTML('#dynamic', text);
        translate_node('#modal2');
    }
    S('#modal', !text);
    S('#modal2', !!text);

    if (show) {
        add_timeout('pad', gamepad_modal, 300);
        set_modal_events();
        if (virtual_game_action_key)
            virtual_game_action_key();
        if (virtual_show_modal_special)
            virtual_show_modal_special(false);
    }
    else {
        clear_timeout('pad');
        if (virtual_show_modal_special)
            virtual_show_modal_special();
    }

    modal_name = name;
}

/**
 * Show a settings page
 * @param {string} name
 */
function show_settings(name) {
    let html = '<vert class="grid t24">',
        settings = X_SETTINGS[name];

    Keys(settings).forEach(key => {
        let setting = settings[key][0],
            more = setting? '': ` name="${key}"`;
        html += `<div${more} class="item" data-t="${key.replace(/_/g, ' ')}"></div>`;
        if (Array.isArray(setting)) {
            html
                += `<select name="${key}">`
                    + settings[key][0].map(option => {
                        let value = {off: 0, on: 1}[option];
                        if (value == undefined)
                            value = option;
                        return `<option value="${value}"${Y[key] == value? ' selected': ''} data-t="${option}"></option>`;
                    }).join('')
                + '</select>';
        }
        else if (!setting)
            html += '<div></div>';
        else
            html += `<input name="${key}" type="${setting.type}" class="setting" min="${setting.min}" max="${setting.max}" step="${setting.step || 1}" value="${Y[key]}">`;
    });
    html += '</vert>';
    show_modal(true, html, `${name} settings`);

    // events
    let parent = _('#modal2');
    Events('select, input', 'change', function() {
        change_setting(this.name, this.value);
    }, {}, parent);
    C('div[name]', function() {
        change_setting(this.getAttribute('name'));
    }, parent);
}

/**
 * Update debug information
 */
function update_debug() {
    // general
    let lines = [],
        sep = ' : ';

    // gamepad
    if (DEV.input & 1) {
        lines.push('&nbsp;');
        lines.push(`id=${gamepad_id}`);
        lines.push(`axes=${Format(axes, sep)}`);
        let text = Keys(buttons).map(key => `${buttons[key]? `${key} `: ''}`).join('');
        lines.push(`buttons=${text}`);
        text = [37, 38, 39, 40].map(code => KEYS[code]);
        lines.push(`KEYS=${Format(text, sep)}`);
    }

    // debugs
    if (DEV.debug & 1) {
        let debug_keys = Keys(debugs).sort();
        if (debug_keys.length) {
            lines.push('&nbsp;');
            debug_keys.forEach(key => {
                lines.push(`${key}=${Format(debugs[key], sep)}`);
            });
        }
    }

    if (virtual_update_debug_special)
        lines = [...lines, ...virtual_update_debug_special()];

    HTML('#debug', `<div>${lines.join('</div><div>')}</div>`);
    add_timeout('pad', gamepad_modal, 300);
}

// STARTUP
//////////

/**
 * 3d UI events
 */
function set_3d_events() {
    // controller
    Events(window, 'gamepadconnected', e => {
        let pad = e.gamepad;
        if (pad.buttons.length) {
            gamepads[pad.index] = pad;
            gamepad_id = pad.index;
        }
    });
    Events(window, 'gamepaddisconnected', e => {
        let pad = e.gamepad;
        delete gamepads[pad.index];
    });

    // game menu
    C('#menu', () => {
        if (Visible('#overlay'))
            resume_game();
        else
            show_menu();
    });

    // modal
    C('#back', () => {
        show_modal(true);
    });
    C('#play-audio', () => {
        show_settings('audio');
    });
    C('#play-game', () => {
        show_settings('game');
    });
    C('#play-video', () => {
        show_settings('video');
    });
}

/**
 * Used when showing a modal
 */
function set_modal_events() {
    Events('#overlay .item', '!mouseenter mouseleave', function(e) {
        Class('#overlay .item.selected', '-selected');
        if (e.type == 'mouseenter')
            Class(this, 'selected');
    });

    if (virtual_set_modal_events_special)
        virtual_set_modal_events_special();
}

/**
 * Initialise structures
 */
function startup_3d() {
    merge_settings({
        audio: {
            sfx_volume: [{min: 0, max: 10, type: 'number'}, 5],
            sound: [ON_OFF, 1],
            voice_volume: [{min: 0, max: 10, type: 'number'}, 5],
            volume: [{min: 0, max: 10, type: 'number'}, 5],
        },
        video: {
            encoding: [['Gamma', 'Linear', 'sRGB'], 'sRGB'],
            exposure: [{min: 0.1, max: 10, step: 0.1, type: 'number'}, 1],
            gamma: [{min: 0, max: 10, step: 0.1, type: 'number'}, 1.5],
            lighting: [['low', 'medium', 'high'], 'high'],
            resolution: [['1:4', '1:3', '1:2', '1:1'], '1:2'],
            shadow: [Keys(SHADOW_QUALITIES), 'high'],
            texture: [['auto', 'on', 'off'], 'auto'],
        },
    });
}
