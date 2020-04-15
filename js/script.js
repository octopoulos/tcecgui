// startup script
/*
globals
_, __PREFIX:true, $, add_timeout, api_times:true, api_translate_get, bracketDataMain,
C, check_hash, DEV, document, Events, fill_languages, get_object, getUserS, hideBanner, initTables, initToolTip, io,
LANGUAGES:true, load_defaults, localStorage, LS, Max, newUpdateStandData, parse_dev, resize, Round,
S, save_option, set_ui_events, setDefaults, setLastMoveTime, setTwitch, setTwitchChange,
setUsers, setUsersMain, showBanner, startup_3d, startup_graphs, startup_tcec, Style, toggleTheme, translate_node,
translates:true,
unlistenLogMain, updateCrashData, updateEngRatingData, updateH2hData,  updateLiveChart, updateLiveChartData,
updateLiveEval, updateLiveEvalData, updateLiveEvalDataNew, updatePgn, updatePgnData, updateRefresh, updateScheduleData,
updateTables, updateWinners, window
*/
'use strict';

let socket;

/**
 * Initialise sockets
 */
function init_sockets() {
    socket = io.connect('https://tcec-chess.com/');
    unlistenLogMain();

    socket.on('htmlread', datal => {
        let data = datal.data,
            date = new Date().toLocaleTimeString(),
            div = document.getElementById('log-wrapper'),
            text = data.split(/\n|\s\n/).join("<br>");

        if (DEV.socket & 1)
            LS(`XXX: recieving data from log: ${datal.room}`);
        div.innerHTML += `<h5><b><i><u>${date}</u></i></b></h5><p align=left>${text}</p>`;
        div.scrollTop = div.scrollHeight;
    });
    socket.on('crosstable', data => {
        newUpdateStandData(data);
    });
    socket.on('liveeval', data => {
        updateLiveEvalData(data, 1, null, 1);
    });
    socket.on('liveeval1', data => {
        updateLiveEvalData(data, 1, null, 2);
    });
    socket.on('updeng', data => {
        updateLiveEvalDataNew(data, 1, null, 2);
    });
    socket.on('pgn', data => {
        if (DEV.socket & 1)
            LS(`Got move: ${data.lastMoveLoaded} : users=${data.Users}`);
        setUsersMain(data.Users);
        updatePgnData(data, 0);
    });
    socket.on('schedule', data => {
        updateScheduleData(data);
        updateH2hData(data);
    });
    socket.on('livechart', data => {
        updateLiveChartData(data, 1);
    });
    socket.on('livechart1', data => {
        updateLiveChartData(data, 2);
    });
    socket.on('lastpgntime', data => {
        setLastMoveTime(data);
    });
    socket.on('users', data => {
        setUsers(data);
    });
    socket.on('banner', data => {
        showBanner(data);
    });
    socket.on('tournament', data => {
        setTwitchChange(data);
    });
    socket.on('enginerating', data => {
        updateEngRatingData(data);
    });
    socket.on('crash', data => {
        updateCrashData(data);
    });
    socket.on('bracket', data => {
        bracketDataMain(data);
    });
}

/**
 * First initialisation
 */
function init_globals() {
    startup_tcec();
    startup_graphs();

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

    $('#chatsize').bootstrapSlider({
        min: 40,
        max: 150,
        value: sliderVale,
        handle: 'round',
        formatter: function(value) {
            // $('#chatright').height(parseInt(value/100 * chatHeight));
            localStorage.setItem('tcec-chat-slider', value);
        }
    });
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

    $(document).click(function (event) {
        var clickover = $(event.target);
        var _opened = $(".navbar-collapse").hasClass("navbar-collapse in");
        if (_opened === true && !clickover.hasClass("navbar-toggle")) {
            $("button.navbar-toggle").click();
        }
    });
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href"); // activated tab
        $(target).show();
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
    init_sockets();
    init_globals();
    load_settings();
    fill_languages('#language');
    resize();
    initTables();
}

window.onload = function() {
    startup();
};
