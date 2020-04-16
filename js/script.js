// script
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-13
//
// startup
//
// included after: common, engine, global, 3d, board
/*
globals
_, __PREFIX:true, $, add_timeout, api_times:true, api_translate_get, C, check_hash, DEV, document, Events,
fill_languages, get_object, getUserS, hideBanner, init_sockets, initTables, initToolTip, LANGUAGES:true, load_defaults,
localStorage, LS, Max, parse_dev, resize, Round, S, save_option, set_ui_events, setDefaults, setTwitch, start_tcec,
startup_3d, startup_graphs, startup_tcec, Style, toggleTheme, translate_node, translates:true, unlistenLogMain,
updateLiveChart, updateLiveEval, updatePgn, updateRefresh, updateTables, updateWinners, window
*/
'use strict';

/**
 * First initialisation
 */
function init_globals() {
    let sliderVale = localStorage.getItem('tcec-chat-slider');
    if (sliderVale == undefined)
        sliderVale = 100;

    initToolTip();
    updatePgn(0);
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

    // $('#chatsize').bootstrapSlider({
    //     min: 40,
    //     max: 150,
    //     value: sliderVale,
    //     handle: 'round',
    //     formatter: function(value) {
    //         // $('#chatright').height(parseInt(value/100 * chatHeight));
    //         localStorage.setItem('tcec-chat-slider', value);
    //     }
    // });
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

    // $(document).click(function (event) {
    //     var clickover = $(event.target);
    //     var _opened = $(".navbar-collapse").hasClass("navbar-collapse in");
    //     if (_opened === true && !clickover.hasClass("navbar-toggle")) {
    //         $("button.navbar-toggle").click();
    //     }
    // });
    // $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    //     var target = $(e.target).attr("href"); // activated tab
    //     $(target).show();
    // });

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
    set_global_events();
    set_ui_events();
    startup_tcec();
    startup_graphs();
    load_settings();
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
