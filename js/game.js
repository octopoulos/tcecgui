// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-18
//
// included after: common, engine, global, 3d, xboard
/*
globals
_, A, Assign, change_setting, Class, Keys, LS, merge_settings, ON_OFF, resume_game, set_3d_events, show_info,
show_menu, show_modal, Visible, XBoard
*/
'use strict';

let BOARD_KEYS = 'blue brown chess24 dark dilena green leipzig metro red symbol uscf wikipedia'.split(' '),
    BOARDS = {
        board: {
            size: 48,
        },
        pv1: {
            target: 'text',
        },
        pv2: {},
        pva: {},
    },
    PIECE_KEYS  = 'alpha chess24 dilena leipzig metro symbol uscf wikipedia'.split(' '),
    xboards = {};

// INPUT / OUTPUT
/////////////////

/**
 * Handle keys, even when an input is active
 * @param {number} code hardware keycode
 */
function action_key(code) {
    switch(code) {
    // escape
    case 27:
        show_info(false);
        break;
    }
}

/**
 * Handle keys, when input is not active
 * @param {number} code hardware keycode
 * @param {Object=} active active input element, if any
 */
function action_key_no_input(code, active) {
}

/**
 * Same as action_key_no_input, but when the key is up
 * @param {number} code hardware keycode
 */
function action_keyup_no_input(code) {
}

/**
 * Create 4 boards
 */
function create_boards() {
    Keys(BOARDS).forEach(key => {
        let options = Assign({
            element: `#${key}`,
            notation: 15,
            size: 16,
            target: 'html',
        }, BOARDS[key]);

        xboards[key] = new XBoard(options);
        xboards[key].render();
    });
}

/**
 * Handle keys, when input is not active
 * @param {number} code hardware keycode
 */
function game_action_key(code) {
    if (Visible('#overlay')) {
        let changes = 0,
            parent = Visible('#modal')? _('#modal'): _('#modal2'),
            items = Array.from(A('.item', parent)).filter(item => Visible(item)),
            length = items.length,
            index = (items.findIndex(item => item.classList.contains('selected')) + length) % length,
            node = items[index],
            tag = node.tagName,
            is_grid = node.parentNode.classList.contains('grid');

        switch (code) {
        // escape, e
        case 27:
        case 69:
            if (Visible('#modal2'))
                show_modal(true);
            else
                resume_game();
            break;
        // enter, space, x
        case 13:
        case 32:
        case 83:
            node.click();
            break;
        // left
        case 37:
            if (tag == 'DIV' && is_grid) {
                node = node.nextElementSibling;
                tag = node.tagName;
            }
            if (tag == 'SELECT') {
                node.selectedIndex = (node.selectedIndex - 1 + node.options.length) % node.options.length;
                changes ++;
            }
            else if (tag == 'INPUT') {
                let min = parseInt(node.min);
                if (isNaN(min) || node.value > min) {
                    node.value --;
                    changes ++;
                }
            }
            break;
        // up
        case 38:
            index = (index - 1 + length) % length;
            break;
        // right
        case 39:
            if (tag == 'DIV' && is_grid) {
                node = node.nextElementSibling;
                tag = node.tagName;
            }
            if (tag == 'SELECT') {
                node.selectedIndex = (node.selectedIndex + 1) % node.options.length;
                changes ++;
            }
            else if (tag == 'INPUT') {
                let max = parseInt(node.max);
                if (isNaN(max) || node.value < max) {
                    node.value ++;
                    changes ++;
                }
            }
            break;
        // down
        case 40:
            index = (index + 1) % length;
            break;
        }

        // changed a setting?
        if (changes && node.name)
            change_setting(node.name, node.value);

        // moved?
        Class('.selected', '-selected', true, parent);
        Class(items[index], 'selected');
    }
    else {
        switch (code) {
        // enter, space
        case 13:
        case 32:
            break;
        // escape
        case 27:
            show_menu();
            break;
        }
    }
}

/**
 * Handle a keyup
 * @param {number} code
 */
function game_action_keyup(code) {
    LS(code);
}

// STARTUP
//////////

/**
 * Game events
 */
function set_game_events() {
    set_3d_events();
}

/**
 * Initialise structures with game specific data
 */
function startup_game() {
    merge_settings({
        board: {
            arrows: [ON_OFF, 1],
            board_middle: [ON_OFF, 0],
            board_theme: [BOARD_KEYS, 'chess24'],
            highlight: [['off', 'thin', 'standard', 'big'], 'standard'],
            notation: [ON_OFF, 1],
            piece_theme: [PIECE_KEYS, 'chess24'],
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
    });

    create_boards();
}
