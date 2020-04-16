// network
//
// moved all socket functions here
//
// included after: common, engine, global, 3d, xboard, game
/*
globals
_, bracketDataMain, DEV, get_string, io, LS, newUpdateStandData, Prop, save_option, setLastMoveTime, setTwitchChange,
setUsers, setUsersMain, showBanner, updateCrashData, updateEngRatingData, updateH2hData, updateLiveChartData,
updateLiveEvalData, updateLiveEvalDataNew, updatePgnData, updateScheduleData, Y
*/
'use strict';

let globalRoom = 0,
    socket;

/**
 * Initialise sockets
 */
function init_sockets() {
    socket = io.connect('https://tcec-chess.com/');
    unlistenLogMain();

    socket.on('htmlread', datal => {
        let data = datal.data,
            date = new Date().toLocaleTimeString(),
            div = _('#log-wrapper'),
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

function setDefaultLiveLog()
{
    globalRoom = Y.engine_livelog;
    Prop(`input[value="${globalRoom}"]`, 'checked', true);
}

function setLiveLog(livelog)
{
    save_option('engine_livelog', livelog.value);
    unlistenLogMain(0);
    if (livelog.value)
        globalRoom = livelog.value;

    listenLog();
}

function listenLogMain(room)
{
    if (socket)
        socket.emit('room', room);
}

function unlistenLogMain(room)
{
    globalRoom = 0;
    if (socket)
        socket.emit('noroom', room);
}

function listenLog()
{
    if (globalRoom == 0)
        globalRoom = 'room10';
    listenLogMain(globalRoom);
}

function unlistenLog()
{
    unlistenLogMain('livelog');
}
