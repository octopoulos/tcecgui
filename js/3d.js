// 3d.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// general 3d rendering code
//
// included after: common, engine, global
/*
globals
Abs, Assign, Audio, BOARD_THEMES, DEFAULTS, Exp, KEY_TIMES, Keys, KEYS, navigator, Now, PIECE_THEMES, Y
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
    buttons = {},
    frame = 0,
    gamepad_id,
    gamepads = {},
    is_paused,
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
    virtual_game_action_key,
    virtual_game_action_keyup,
    X_SETTINGS = {
        audio: {
            sfx_volume: [{min: 0, max: 10, type: 'number'}, 5],
            sound: [ON_OFF, 1],
            voice_volume: [{min: 0, max: 10, type: 'number'}, 5],
            volume: [{min: 0, max: 10, type: 'number'}, 5],
        },
        board: {
            arrows: [ON_OFF, 1],
            board_middle: [ON_OFF, 0],
            board_theme: [Keys(BOARD_THEMES), 'chess24'],
            highlight: [['off', 'thin', 'standard', 'big'], 'standard'],
            notation: [ON_OFF, 1],
            piece_theme: [Keys(PIECE_THEMES), 'chess24'],
        },
        board_pv: {
            highlight_pv: [['off', 'thin', 'standard', 'big'], 'standard'],
            live_pv: [ON_OFF, 1],
            notation_pv: [ON_OFF, 1],
            ply_diff: [['first', 'diverging', 'last'], 'first'],
        },
        extra: {
            cross_crash: [ON_OFF, 0],
            live_log: [[5, 10, 'all'], 10],
        },
        twitch: {
            twitch_back_mode: [ON_OFF, 1],
            twitch_video: [ON_OFF, 1],
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
    };

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

/**
 * Initialise structures
 */
function startup_3d() {
    Keys(X_SETTINGS).forEach(name => {
        let settings = X_SETTINGS[name];
        Assign(DEFAULTS, Assign({}, ...Keys(settings).map(key => ({[key]: settings[key][1]}))));
    });
}
