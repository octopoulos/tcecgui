// script.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// startup
//
// included after: common, engine, global, 3d, board
/*
globals
_, __PREFIX:true, $, action_key, action_key_no_input, action_keyup_no_input, add_timeout, api_times:true,
api_translate_get, C, check_hash, DEV, document, Events, fill_languages, game_action_key, game_action_keyup,
get_object, getUserS, hideBanner, init_sockets, initTables, KEY_TIMES, KEYS,
LANGUAGES:true, load_defaults, localStorage, LS, Max, Now, parse_dev, resize, Round,
S, save_option, set_game_events, set_ui_events, setDefaults, setTwitch, start_game, start_tcec, startup_3d,
startup_archive, startup_game, startup_graphs, startup_tcec, Style, tcecHandleKey, toggleTheme, translate_node,
translates:true, unlistenLogMain, update_debug, updateLiveChart, updateLiveEval, updatePgn, updateRefresh,
updateTables, updateWinners, window, Y
*/
'use strict';

/**
 * First initialisation
 */
function init_globals() {
    updatePgn();
    setDefaults();

    // timeouts
    add_timeout('twitch', () => {setTwitch();}, 10000);
    add_timeout('get_users', () => {getUserS();}, 5000);
    add_timeout('update_winners', () => {updateWinners();}, 12000);
    hideBanner();
    add_timeout('update_live', () => {
        updateLiveChart();
        updateLiveEval();
    }, 2000);
    add_timeout('update_tables', () => {updateTables();}, 3000);
    add_timeout('adblock', () => {
        S('.encouragement', ((_('#google_adverts') || {}).height || 0) <= 0);
    }, 15000);
}

/**
 * Global events
 */
function set_global_events() {
    // general
    Events(window, 'resize', () => {
        resize();
    });
    // it won't be triggered by pushState and replaceState
    Events(window, 'hashchange', () => {
        LS('hash change');
        check_hash();
        parse_dev();
    });

    // keys
    Events(window, 'keydown', e => {
        tcecHandleKey(e);
    });

    C('.toggleDark', () => {
        toggleTheme();
    });
    C('.refreshBoard', () => {
        updateRefresh();
    });

    // language
    Events('#language', 'change', function() {
        let lan = this.value;
        save_option('lan', lan);
        if (lan == 'eng' || translates._lan == lan)
            translate_node('body');
        else if (lan != 'eng')
            add_timeout('lan', api_translate_get, 100);
    });

    // keys
    Events(window, 'keydown keyup', e => {
        let active = document.activeElement,
            code = e.keyCode,
            is_game = true,
            type = e.type;

        if (!code)
            return;
        if (type == 'keydown')
            action_key(code);

        // ignore keys when on inputs, except ENTER & TAB
        if (active && {INPUT: 1, TEXTAREA: 1}[active.tagName])
            return;

        if (type == 'keydown') {
            if (is_game)
                game_action_key(code);
            else
                action_key_no_input(code, active);
            if (!KEYS[code])
                KEY_TIMES[code] = Now(true);
            KEYS[code] = 1;
        }
        else {
            if (is_game)
                game_action_keyup(code);
            else
                action_keyup_no_input(code);
            KEYS[code] = 0;
        }

        // prevent some default actions
        if ([9, 112].includes(code))
            e.preventDefault();

        update_debug();
    });
}

/**
 * Load settings from Local Storage
 */
function load_settings() {
    load_defaults();

    api_times = get_object('times') || {};
    translates = get_object('trans') || {};

    check_hash();
    parse_dev();
    // update_theme();
    api_translate_get();
}

/**
 * Startup
 */
function startup() {
    // engine overrides
    __PREFIX = 'tc_';
    LANGUAGES = {
        eng: 'English',
        fra: 'français',
        jpn: '日本語',
        rus: 'русский',
        ukr: 'українська',
    };

    startup_3d();
    startup_game();
    set_global_events();
    set_ui_events();
    set_game_events();
    startup_archive();
    startup_tcec();
    startup_graphs();
    load_settings();
    start_game();
    start_tcec();

    init_sockets();
    init_globals();
    fill_languages('#language');
    resize();
    initTables();
}

window.onload = function() {
    startup();
};
