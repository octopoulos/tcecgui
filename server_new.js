/*
    Notes:

    Replay
    -------
    1. When a game is replayed use the following option

        node cluster.js --port 8080 --crossgames 31  --resume

    Fix jsons
    ---------
    1. After game is replayed to fix the json use

        node cluster.js --port 8080

    Fix onge game pgn
    --------------------
    1. to fix a given game or set of games use

        node server.js --port 0 --games x,y

    Fix till game x
    -----------------
        node server.js --port 0 --crossgames 29
*/
/*
globals
__dirname, console, process, require, setInterval, setTimeout, Undefined
*/
'use strict';

let argv = require('yargs').argv,
    chokidar = require('chokidar'),
    deepEqual = require('deep-equal'),
    exec = require('child_process').exec,
    express = require('express'),
    fs = require('fs'),
    http = require("http"),
    io = require('socket.io')(),
    shlib = require("./lib.js"),
    Tail = require('nodejs-tail');

let LS = console.log;

let app = express(),
    archroot = '/var/www/archive.tcec-chess.com/',
    ctable = 'crosstable.json',
    delta = {},
    gameJson = 'gamelist.json',
    globalid = 0,
    inprogress = 0,
    json = '/var/www/json/archive/',
    jsonMenuData = 0,
    lastPgnTime = Date.now(),
    lineArray = [],
    lineChanged = 0,
    live_pgn = 'live.pgn',
    liveeval = 'data.json',
    localCount = 0,
    numMovesToSend = 2,
    pgnDir = '/var/www/json/archive/',
    prevData = 0,
    prevevalData = 0,
    prevevalData1 = 0,
    prevliveData = 0,
    prevliveData1 = 0,
    prevSchedData = 0,
    retPgn = {},
    singlePerl = `${archroot}single.pl`,
    totalCount = 0,
    userCountFactor = 1,
    watcherFast = 0,
    watcherSlow;

let _TEST = true,
    portnum;

function setArgs() {
    portnum = Undefined(argv.port, 8000);

    if (argv.finish || argv.addentry)
        portnum = 0;

    if (argv.finish) {
        jsonMenuData = JSON.parse(fs.readFileSync(gameJson, "utf-8"));
        let upJson = updateJSON();
        LS(`upJson is: ${upJson.newaddedid}`);
        globalid = upJson.newaddedid;
    }
    else
        globalid = 'current';

    if (argv.id)
        globalid = argv.id;

    retPgn = checkLatestArchive();
    LS(`~setArgs: portnum=${portnum}`);
}

function startServer() {
    if (!portnum)
        return;

    // Encryption keys
    // let options = {
    //     key: fs.readFileSync('/etc/letsencrypt/live/tcec-chess.com/privkey.pem'),
    //     cert: fs.readFileSync('/etc/letsencrypt/live/tcec-chess.com/fullchain.pem')
    // };
    // let server = https.createServer(options, app).listen(parseInt(portnum), () => {
    //    LS(`Express server listening on port ${portnum}`);
    //});
    let server = http.createServer(app).listen(parseInt(portnum), () => {
        LS(`Express server listening on port ${portnum}`);
    });

    io.attach(server, {
        pingInterval: 25000,
        pingTimeout: 5000
    });

    app.get('/api/gameState', (req, res) => {
        LS('api gameState request');
        let currentFen = '',
            liveData = fs.readFileSync('live.json'),
            liveJsonData = JSON.parse(liveData);

        if (liveJsonData.Moves.length > 0)
            currentFen = liveJsonData.Moves[(liveJsonData.Moves.length - 1)].fen;

        let response = {
            Black: liveJsonData.Headers.Black,
            CurrentPosition: currentFen,
            Event: liveJsonData.Headers.Event,
            Result: liveJsonData.Headers.Result,
            White: liveJsonData.Headers.White,
        };
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify(response));
    });

    app.get('/api/currentPosition', (req, res) => {
        LS('api currentPosition request');
        let currentFen = 'No game in progress',
            liveData = fs.readFileSync('live.json'),
            liveJsonData = JSON.parse(liveData);

        if (liveJsonData.Moves.length > 0)
            currentFen = liveJsonData.Moves[(liveJsonData.Moves.length - 1)].fen;

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(currentFen);
    });
}

function startWatcherSlow() {
    watcherSlow = chokidar.watch(ctable, {
        alwaysStat: false,
        binaryInterval: 1000,
        depth: 3,
        disableGlobbing: false,
        followSymlinks: true,
        ignoreInitial: false,
        interval: 1000,
        persistent: true,
        usePolling: true,
    });
    watcherSlow.add([
        'banner.txt',
        'enginerating.json',
        'gamelist.json',
        'liveengineeval.json',
        'schedule.json',
        'tournament.json',
    ]);

    if (!retPgn.bonus)
        watcherSlow.add('crash.json');
}

function startWatcherFast() {
    watcherFast = chokidar.watch(live_pgn, {
        alwaysStat: false,
        atomic: 100,
        binaryInterval: 100,
        depth: 3,
        disableGlobbing: false,
        followSymlinks: true,
        ignoreInitial: false,
        interval: 10,
        persistent: true,
        usePolling: true,
    });

    if (!retPgn.bonus)
        watcherFast.add([
            'data1.json',
            'liveeval.json',
            'liveeval1.json',
            liveeval,
        ]);

    if (retPgn.cup)
        watcherFast.add('Eventcrosstable.json');
}

function userCount() {
    let userCountFinal = userCountActual();
    if (userCountFinal < totalCount)
        userCountFinal = totalCount;
    else if (totalCount)
        userCountFinal = totalCount;
    return parseInt(userCountFinal * userCountFactor);
}

function userCountActual() {
    return localCount;
}

function checkLatestArchive() {
    if (_TEST)
        return {};
    if (!globalid)
        return {};

    if (retPgn)
        return retPgn;

    jsonMenuData = JSON.parse(fs.readFileSync(gameJson, "utf-8"));
    retPgn = shlib.getPGN(globalid, jsonMenuData);
    LS(`retPgn: ${JSON.stringify(retPgn, null, '\t')}`);

    if (retPgn.found == 0)
        return {};

    retPgn.pgnFile = pgnDir + retPgn.pgnfile;
    return retPgn;
}

function touchFile(fileName) {
    if (_TEST)
        return;
    fs.appendFileSync(fileName, '');
}

function addLatestArch() {
    if (!globalid)
        return;

    watcherSlow.unwatch(retPgn.pgnFile);
    retPgn = checkLatestArchive();
    if (retPgn) {
        touchFile(retPgn.pgnFile);
        LS(`Monitor pgn file: ${retPgn.pgnFile}`);
        watcherSlow.add(retPgn.pgnFile);
    }
    else
        LS("No current file to monitor");
}

function broadCastUsers() {
    io.local.emit('users', {'count': userCount()});
}

function broadCastData(message, file, currData, prevData) {
    if (deepEqual(currData, prevData))
        return;
    io.local.emit(message, currData);
}

function getDeltaPgn(pgnX) {
    let maxKey = pgnX.Moves.length;
    pgnX.Users = userCount();
    pgnX.Round = pgnX.Headers.Round * 100;
    pgnX.numMovesToSend = numMovesToSend;

    if (prevData && !deepEqual(prevData.Headers, pgnX.Headers)) {
        pgnX.gameChanged = 1;
        if (pgnX.Moves)
            pgnX.lastMoveLoaded = pgnX.Moves.length;
        else
            pgnX.lastMoveLoaded = 0;
        return pgnX;
    }
    pgnX.gameChanged = 0;

    if (pgnX && pgnX.Moves && (pgnX.Moves.length - numMovesToSend) > 0) {
        pgnX.Moves.splice(0, pgnX.Moves.length - numMovesToSend);
        pgnX.lastMoveLoaded = maxKey - numMovesToSend;
    }
    else
        pgnX.lastMoveLoaded = maxKey;
    pgnX.totalSent = numMovesToSend > maxKey ? maxKey : numMovesToSend;

    LS(`Setting pgn.lastMoveLoaded to ${pgnX.lastMoveLoaded} : maxKey=${maxKey} : totalSent=${pgnX.totalSent}`);
    return pgnX;
}

function sendArrayRoom(array, room, count) {
    let localArray = array;
    if (!localArray.length)
        return;

    if (localArray.length - count > 0)
        localArray.splice(0, localArray.length - count);
    if (localArray.length)
        io.sockets.in(room).emit('htmlread', {'room': room, 'data': localArray.join('\n')});
}

function sendlines() {
    if (!lineChanged)
        return;

    sendArrayRoom(lineArray, 'room5', 5);
    sendArrayRoom(lineArray, 'livelog', 5);
    sendArrayRoom(lineArray, 'room10', 10);
    sendArrayRoom(lineArray, 'roomall', 1000);

    lineArray = [];
    lineChanged = 0;
}

function exitNode() {
    if (!portnum)
        process.exit();
}

function runPerlArchive() {
    if (_TEST)
        return;

    if (inprogress) {
        LS("Already another in progress");
        return;
    }

    inprogress = 1;
    let perlrun = `perl ${singlePerl}`;

    if (retPgn.eventtag != undefined)
        perlrun += ` --eve ${retPgn.eventtag}`;
    if (retPgn.cup)
        perlrun += ` --cup ${retPgn.cup}`;

    perlrun += ` --ful ${retPgn.download} --tag ${retPgn.abb} --loc ${json}${retPgn.abb}`;

    if (retPgn.prevpgnlist)
        perlrun += ` --prevpgn ${retPgn.prevpgnlist}`;
    if (argv.games)
        perlrun += ` --games ${argv.games}`;

    perlrun += ` --pwd ${__dirname}`;
    if (argv.crossgames)
        perlrun += ` --crossgames ${argv.crossgames}`;
    if (argv.resume)
        perlrun += " --resume 1";
    if (argv.frc)
        perlrun += " --frc";

    LS(`Running perl file: ${perlrun}`);
    exec(perlrun, (err, stdout, stderr) => {
        inprogress = 0;
        setTimeout(() => {io.emit('refreshsched', {'count': 1});}, 15000);
        setTimeout(exitNode, 15000);
        LS(stderr);
        LS(stdout);
    });
}

function makeLink() {
    if (_TEST)
        return;
    if (!retPgn.bonus) {
        let makeLink = '/scratch/tcec/Commonscripts/Divlink/makelnk.sh';
        exec(`${makeLink} ${retPgn.abb}`, (error, stdout, stderr) => {
            LS(`Error is: ${stderr}`);
            LS(`Output is: ${stdout}`);
        });
    }
}

function addLiveTail() {
    const tail = new Tail('live.log', {
        alwaysStat: false,
        atomic: 60000,
        binaryInterval: 5000,
        depth: 1,
        disableGlobbing: false,
        followSymlinks: true,
        ignoreInitial: false,
        interval: 1000,
        persistent: true,
        usePolling: true,
        // atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
    });

    tail.on('line', line => {
        // line = line.replace(/[<>]/g, '');
        lineArray.push(line);
        lineChanged = 1;
        // LS(`line: ${lineArray}`);
    });

    tail.watch();

    // exec('./live_parse_cutechess_cli_log.py live.log', (err, stdout, stderr) => {
    //     LS(stderr);
    //     LS(stdout);
    // });
}

function Misc() {
    io.sockets.on('connection', socket => {
        localCount ++;
        socket.on('room', room => {
            if (room == 'room5')
                socket.join('room5');
            if (room == 'room10')
                socket.join('room10');
            if (room == 'roomall')
                socket.join('roomall');
        });

        socket.on('noroom', () => {
            socket.leave('room5');
            socket.leave('room10');
            socket.leave('roomall');
        });

        socket.on('disconnect', () => {
	        localCount --;
        });

        socket.on('getusers', () => {
            socket.emit('users', {'count': userCount()});
        });

        socket.on('refreshdata', () => {
            if (delta) {
                delta.refresh = 1;
                delta.Users = userCount();
                socket.emit('pgn', delta);
                delta.refresh = 0;
                // LS("Sent delta pgn data to connected socket: ${JSON.stringify(delta).length}, changed ${clientIp}, from serverXXXX: ${pid}`);
            }
            else if (prevData) {
                prevData.refresh = 1;
                prevData.Users = userCount();
                socket.emit('pgn', prevData);
                prevData.refresh = 0;
                // LS(`Sent full pgn data to connected socket: ${JSON.stringify(delta).length}, changed ${clientIp}, from serverXXXX: ${pid}`);
            }
            LS(`XXXXXX: req came ${lastPgnTime}`);
        });
    });

    watcherFast.on('change', path => {
        let content = fs.readFileSync(path, "utf8");
        try {
            let data = JSON.parse(content);
            if (path.match(/data.json/)) {
                broadCastData('liveeval', path, data, prevliveData);
                prevliveData = data;
            }
            if (path.match(/data1.json/)) {
                broadCastData('liveeval1', path, data, prevliveData1);
                prevliveData1 = data;
            }
            // TODO: remove the charts or send only the new data
            if (path.match(/liveeval.json/)) {
                broadCastData('livechart', path, data, prevevalData);
                LS("Sending /liveeval.json/");
                prevevalData = data;
            }
            if (path.match(/liveeval1.json/)) {
                broadCastData('livechart1', path, data, prevevalData1);
                prevevalData1 = data;
            }
            if (path.match(/Eventcrosstable.json/)) {
                LS("Event table changed");
                io.local.emit('bracket', data);
            }
            if (path.match(/live.pgn/)) {
                delta = getDeltaPgn(data, prevData);
                LS(`pgn changed, ply=${Math.round((delta.numMovesToSend + delta.lastMoveLoaded)/2)}`);
                broadCastData('pgn', path, data, prevData);
                lastPgnTime = Date.now();
                prevData = data;
            }
        }
        catch (error) {
            LS(`error: ${error}`);
            return;
        }
    });

    watcherFast
    .on('add', path => {
        LS(`File ${path} has been added`);
    })
    .on('unlink', path => {
        LS(`File ${path} has been removed`) ;
        if (path.match(/liveeval.*/)) {
            LS(`Trying to add path: ${path}`);
            for (let timer of [30, 60, 90, 130])
                setTimeout(() => {watcherFast.add(path);}, timer * 1000);
            watcherFast.add(path);
        }
    })
    .on('error', error => {
        LS(`Watcher error: ${error}`);
    });

    watcherSlow.on('change', path => {
        LS(`slow path changed: ${path}`);
        if (globalid && (path == retPgn.pgnFile))
            runPerlArchive();

        if (globalid && path.match(/gamelist/)) {
            retPgn = {};
            addLatestArch();
            runPerlArchive();
            if (!retPgn.bonus)
                makeLink();
        }
        if ((path != retPgn.pgnFile) && (!path.match(/gamelist/))) {
            let content = fs.readFileSync(path, "utf8");
            try {
                let data = JSON.parse(content);
                if (path.match(/crosstable/)) {
                    LS("Sending crosstable data:");
                    io.local.emit('crosstable', data);
                }
                if (path.match(/schedule/)) {
                    broadCastData('schedule', path, data, prevSchedData);
                    prevSchedData = data;
                }
                if (path.match(/tournament/))
                    io.local.emit('tournament', data);
                if (path.match(/enginerating/)) {
                    if (!_TEST) {
                        io.local.emit('enginerating', data);
                        exec(`cp /var/www/json/shared/enginerating.json /var/www/json/archive/${retPgn.abb}_Enginerating.egjson`, (err, stdout, stderr) => {
                            LS(`Doing it: ${stdout} ${stderr}`);
                        });
                    }
                }
                if (path.match(/banner/))
                    io.local.emit('banner', data);
                if (path.match(/crash/))
                    io.local.emit('crash', data);
                if (path.match(/liveengineeval/)) {
                    io.local.emit('updeng', data);
                    LS(`Sending liveengineeval for ply: ${data.plynum}`);
                }
            }
            catch (error) {
                LS(`error: ${error}`);
                return;
            }
        }
    });

    process.on('message', msg => {
        LS(`Worker ${process.pid} received message from master: ${JSON.stringify(msg)}`);
        totalCount = parseInt(msg.count);
        broadCastUsers();
    });
}

function updateJSON() {
    let filename = '',
        localJSON = jsonMenuData;

    if (argv.addentry)
        filename = argv.addentry;
    else if (argv.finish)
        filename = argv.finish;
    else {
        LS("Neither --addentry nor --finish was provided");
        process.exit(1);
    }

    let updJSON = shlib.getNewIdStruc(filename, localJSON),
        getUniq = shlib.getRandomSalt(gameJson);
    if (argv.addentry) {
        updJSON.newaddedid = undefined;
        LS(`Please verify file ${getUniq} and run without --addentry option`);
        fs.writeFileSync(getUniq, JSON.stringify(jsonMenuData, null, "    "));
        process.exit(1);
    }
    return updJSON;
}

function Main() {
    setArgs();
    if (!portnum && argv.addentry)
        updateJSON();
    if (portnum) {
        startServer();
        startWatcherFast();
        startWatcherSlow();
        addLatestArch();
    }
    runPerlArchive();
    if (portnum) {
        makeLink();
        addLiveTail();
        Misc();
    }
    else if (!inprogress)
        process.exit();

    setInterval(sendlines, 3000);
}

Main();
