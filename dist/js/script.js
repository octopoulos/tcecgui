// startup script
/*
globals
_, $, board, bracketDataMain, C, document, Events, getUserS, hideBanner, initTables, initToolTip, io, localStorage, LS,
Max, Min, newUpdateStandData, Round, S, screen, set_ui_events, setBoardInit, setDefaults, setLastMoveTime, setTimeout,
setTwitch, setTwitchChange, setUsers, setUsersMain, showBanner, Style, toggleTheme, unlistenLogMain, updateCrashData,
updateEngRatingData, updateH2hData,  updateLiveChart, updateLiveChartData, updateLiveEval, updateLiveEvalData,
updateLiveEvalDataNew, updatePgn, updatePgnData, updateRefresh, updateScheduleData, updateTables, updateWinners, window
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

        LS("XXX: recieving data from log:" + datal.room);
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
        LS("Got move:" + data.lastMoveLoaded + " ,users:" + data.Users);
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
    setBoardInit();

    let sliderVale = localStorage.getItem('tcec-chat-slider');
    if (sliderVale == undefined)
        sliderVale = 100;

    initToolTip();
    updatePgn(0);

    setDefaults();
    setTimeout(() => {setTwitch();}, 10000);
    setTimeout(() => {getUserS();}, 5000);
    setTimeout(() => {updateWinners();}, 12000);
    hideBanner();
    setTimeout(() => {
        updateLiveChart();
        updateLiveEval();
    }, 2000);
    setTimeout(() => {updateTables();}, 3000);
    setTimeout(() => {
        S('.encouragement', ((_('#google_adverts') || {}).height || 0) <= 0);
    }, 15000);

    $('#chatsize').bootstrapSlider({
        min:40,
        max:150,
        value: sliderVale,
        handle: 'round',
        formatter: function(value) {
            // $('#chatright').height(parseInt(value/100 * chatHeight));
            localStorage.setItem('tcec-chat-slider', value);
        }
    });
}

/**
 * Resize the window
 */
function resize() {
    board.resize();
    let height = Max(350, Round(Min(screen.availHeight, window.innerHeight) - 80));
    Style('#chatright', `height:${height}px;width:100%`);
}

/**
 * Global events
 */
function set_global_events() {
    Events(window, 'resize', () => {
        resize();
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
}

window.onload = function() {
    set_global_events();
    set_ui_events();
    init_sockets();
    init_globals();
    resize();
    initTables();
};
