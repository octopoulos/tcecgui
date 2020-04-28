// tcec.js
// included after: common, engine
/*
globals
_, $, Abs, add_timeout, addDataLive, Assign, Attrs, audiobox, bigData, board:true, BOARD_THEMES,
C, calculate_probability, calculate_score, Ceil, charts, Chess, ChessBoard, Clamp, Class, clear_timeout,
clearInterval, ClipboardJS, columnsEvent, console, create_charts, crosstableData, Date, DefaultFloat, DEFAULTS, DEV,
document, dummyCross, engine_colors, Events, Exp, Floor, FormatUnit, get_short_name, Hide, HTML, Keys,
LS, Max, Min, moment, Now, Pad, Parent, PIECE_THEMES, play_sound, Pow, Prop, removeData, reset_charts, Resource, Round,
roundDate, roundDateMan, roundResults:true,
S, save_option, screen, setDefaultLiveLog, setInterval, setTimeout, Show, show_info, Sign, socket, START_FEN,
startDateR1, startDateR2, Style, teamsx, Title, touch_handle, turn:true, updateChartData, updateChartDataLive,
updateCrosstable, WHITE_BLACK, window, xboards, XBoard, Y
*/
'use strict';

/***************************** CUP ***************************************************/

let eventCross = [],
    gameDiff = 0,
    totalEvents = 32;

/***************************** CUP ***************************************************/

let _BLACK = 'black',
    _WHITE = 'white',
    activePly = 0,
    activePvKey = [],
    all_engines = ['w', 'b'],          // w,b full engine names
    all_pvs = [[], []],
    ARCHIVE_LINK = '',  // https://www.tcec-chess.com/archive.html',
    isAutoplay,
    BL = 1,
    board,
    clock_intervals = ['', ''],
    COLORS = {
        black: 1,
        Black: 1,
        live: 2,
        white: 0,
        White: 0,
    },
    currentGameActive,
    currentLastMove,                    // used for debugging
    currentMove,
    current_positions = [],
    defaultStartTime = 0,
    engine2LiveData,
    game,
    LIVE = 2,
    liveEngineEvals = [[], [], []],     // 0 is not used
    moveFrom,
    moveFromPvs = [],
    moveTo,
    moveToPvs = [],
    newMovesCount = 0,
    pvBoarda,
    pvBoardb,
    pvBoardbc,
    pvBoardw,
    pvBoardwc,
    remain_times = [0, 0],
    started_moves = [0, 0],
    used_times = [0, 0],
    virtual_init_tables,
    WH = 0;

// CHECK THOSE VARS
let activeFen = '',
    activePv = [],
    activePvH = [],
    analysFen = START_FEN,
    bookmove = 0,
    choosePv,
    clearedAnnotation = 0,
    // All possible valid terminations (hopefully)
    crash_re = /^(?:TCEC|Syzygy|TB pos|.*to be resumed|in progress|(?:White|Black) (?:mates|resigns)|Manual|Stale|Insuff|Fifty|3-[fF]old)/,
    crossTableInitialized = false,
    currentPosition = START_FEN,
    debug = 0,
    engineRatingGlobalData = 0,
    eventNameHeader = 0,
    gameActive = false,
    gameArrayClass = ['#39FF14', 'red', 'whitesmoke', 'orange'],
    gamesDone = 0,
    globalGameno = 1,
    h2hRetryCount = 0,
    h2hScoreRetryCount = 0,
    hideDownPv = 0,
    highlightpv = 0,
    isPvAutoplay = [false, false],
    lastMove = '',
    lastRefreshTime = 0,
    livePVHist = [],
    livePvs = [],
    loadedPlies = 0,
    numberEngines = 0,
    oldSchedData = null,
    pageNum = 1,
    prevevalData = {},
    prevPgnData = 0,
    pvSquareToHighlight = '',
    regexBlackMove = /^[0-9]{1,3}\.\.\./,
    selectedId = 0,
    squareToHighlight = '',
    standColumns = [],
    tcecElo = 1,
    timeDiff = 0,
    timeDiffRead = 0,
    timezoneDiffH = -8,
    tourInfo = {},
    twitchChatUrl = 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat',
    twitchSRCIframe = 'https://player.twitch.tv/?channel=TCEC_Chess_TV',
    userCount = 0,
    viewingActiveMove = true;

function updateRefresh()
{
    if (lastRefreshTime)
        return;

    socket.emit('refreshdata', 'data is emitted');
    lastRefreshTime = moment();
    eventCrosstableWrap();
    if (prevPgnData && prevPgnData.Moves) {
        //prevPgnData.Moves[0].completed = 0;
    }
    Class('#board-to-sync i', '-fa-retweet fa-ban');
    Class('#board-to-sync', 'disabled');

    add_timeout('update_refresh', () => {
        Class('#board-to-sync i', '-fa-ban fa-retweet');
        Class('#board-to-sync', '-disabled');
        lastRefreshTime = 0;
    }, 30000);
}

function updateAll()
{
    eventNameHeader = 0;
    updatePgn(true);
    add_timeout('update_all', () => {updateTables();}, 5000);
}

/**
 * Update the PGN
 * @param {boolean=} reset_time
 */
// TODO: REMOVE
function updatePgn(reset_time)
{
    eventNameHeader = 0;
    Resource(`live.json?no-cache${Now()}`, (code, data, xhr) => {
        if (code != 200)
            return;
        if (!reset_time)
        {
            let curr_time = new Date(xhr.getResponseHeader('date')),
                last_mod = new Date(xhr.getResponseHeader('last-modified'));
            timeDiff = curr_time.getTime() - last_mod.getTime();
        }
        prevPgnData = 0;
        data.gameChanged = 1;
        setPgn(data);
    });
}

/**
 * Start the clock
 * @param {number} color
 * @param {Object} currentMove
 * @param {Object} previousMove
 */
function startClock(color, currentMove, previousMove) {
    stopClock(BL);
    stopClock(WH);

    let other = 1 - color,
        previousTime = previousMove.tl,
        currentTime = currentMove.tl;

    remain_times[color] = DefaultFloat(Ceil(previousTime / 1000) * 1000 + 1000, defaultStartTime);
    remain_times[other] = DefaultFloat(Ceil(currentTime / 1000) * 1000, defaultStartTime);

    setTimeRemaining(other, remain_times[other]);

    started_moves[color] = moment();
    updateClock(color);

    clock_intervals[color] = setInterval(function() {updateClock(color);}, 1000);
    if (currentMove.mt != undefined)
        setTimeUsed(other, currentMove.mt);

    Show(`.${WHITE_BLACK[color]}-to-move`);
}

/**
 * Stop the clock
 * @param {number} color
 */
function stopClock(color) {
    clearInterval(clock_intervals[color]);
    Hide(`.${WHITE_BLACK[color]}-to-move`);
}

/**
 * Update the clock
 * @param {number} color
 */
function updateClock(color) {
    let currentTime = moment(),
        diff = currentTime.diff(started_moves[color] - timeDiff),
        ms = moment.duration(diff);

    used_times[color] = ms;
    setTimeUsed(color, ms);
    setTimeRemaining(color, remain_times[color] - ms + 3000);
}

function secFormatNoH(timeip)
{
    let sec_num = parseInt(timeip/1000, 10), // don't forget the second param
        hours   = Floor(sec_num / 3600),
        minutes = Floor((sec_num - (hours * 3600)) / 60),
        seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

function secFormat(timeip)
{
    let sec_num = parseInt(timeip/1000, 10), // don't forget the second param
        hours   = Floor(sec_num / 3600),
        minutes = Floor((sec_num - (hours * 3600)) / 60),
        seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

function setTimeRemaining(color, time)
{
    if (viewingActiveMove)
        HTML(`.${WHITE_BLACK[color]}-time-remaining`, secFormat(Max(0, time)));
}

function setTimeUsed(color, time) {
    if (viewingActiveMove)
        HTML(`.${WHITE_BLACK[color]}-time-used`, secFormatNoH(time));
}

// TODO: remove
function setUsers(data)
{
    if (data.count != undefined)
        userCount = data.count;

    setUsersMain(userCount);
}

// TODO: remove
function setUsersMain(count)
{
    if (count != undefined)
        userCount = count;

    $('#event-overview').bootstrapTable('updateCell', {index: 0, field: 'Viewers', value: userCount});
}

function listPosition()
{
    if (board)
    {
        let getPos = board.position();
        if (getPos)
            return Keys(getPos).length - 6;
    }
    return '-';
}

/**
 * Show a chess move
 * @param {string} sel node selector, ex: #board
 * @param {number} moveFrom
 * @param {number} moveTo
 * @param {boolean=} is_pv
 */
function show_move(sel, moveFrom, moveTo, is_pv) {
    let class_ = get_highlight(is_pv);
    Class(`${sel} .square-55d63`, class_, false);
    Class(`${sel} .square-${moveFrom}`, class_);
    Class(`${sel} .square-${moveTo}`, class_);
}

function setPgn(pgn)
{
    let num_ply = 0;

    if (!viewingActiveMove)
    {
        Class('#newmove', '-d-none');
        newMovesCount ++;
        Attrs('#newmove', 'data-count', newMovesCount);
    }
    else
    {
        Class('#newmove', 'd-none');
        newMovesCount = 0;
        Attrs('#newmove', 'data-count', 0);
    }

    if (pgn.Moves && (DEV.ply & 1))
        LS("XXX: Entered for pgn.Moves.length:" + pgn.Moves.length + " , round is :" + pgn.Headers.Round);

    if (pgn.gameChanged) {
        eventNameHeader = 0;
        prevPgnData = pgn;
        prevPgnData.gameChanged = 0;
        setInfoFromCurrentHeaders();
        updateH2hData();
        updateScoreHeadersData();
        if (DEV.ply & 1)
            LS("New game, round is :" + parseFloat(pgn.Headers.Round));
    }
    else {
        if (DEV.ply & 1)
            LS("prevPgnData.Moves.length:" + prevPgnData.Moves.length + " ,pgn.lastMoveLoaded:" + pgn.lastMoveLoaded);
        if (parseFloat(prevPgnData.Headers.Round) != parseFloat(pgn.Headers.Round))
        {
            eventNameHeader = 0;
            add_timeout('update_pgn', () => {updatePgn(true);}, 100);
            return;
        }
        if (prevPgnData.Moves.length < pgn.lastMoveLoaded)
        {
            eventNameHeader = 0;
            add_timeout('update_all', () => {updateAll();}, 100);
            return;
        }
        updateH2hData();
        updateScoreHeadersData();
    }

    if (prevPgnData) {
        for (let i = 0 ; i < pgn.totalSent ; i++)
            prevPgnData.Moves[i + pgn.lastMoveLoaded] = pgn.Moves[i];

        prevPgnData.BlackEngineOptions = pgn.BlackEngineOptions;
        prevPgnData.WhiteEngineOptions = pgn.WhiteEngineOptions;
        prevPgnData.Headers = pgn.Headers;
        prevPgnData.Users = pgn.Users;
        pgn = prevPgnData;
    }
    else if (pgn.Moves)
        prevPgnData = pgn;

    if (pgn.Moves)
        num_ply = pgn.Moves.length;

    if (pgn.Headers) {
        if (pgn.Moves && pgn.Moves.length > 0) {
            currentPosition = pgn.Moves[pgn.Moves.length-1].fen;
            moveFrom = pgn.Moves[pgn.Moves.length-1].from;
            moveTo = pgn.Moves[pgn.Moves.length-1].to;

            currentGameActive = (pgn.Headers.Termination == 'unterminated');
            turn = num_ply % 2;
        }
    }

    if (!currentGameActive) {
        stopClock(WH);
        stopClock(BL);
    }
    else
        stopClock(turn);

    if (DEV.ply & 1)
        LS(`XXX: loadedPlies=${loadedPlies} : num_ply=${num_ply} : currentGameActive=${currentGameActive}`
            + `gameActive=${gameActive} : gameChanged=${pgn.gameChanged}`);
    if (loadedPlies == num_ply && (currentGameActive == gameActive))
        return;

    if (timeDiffRead > 0)
        timeDiff = 0;

    let previousPlies = loadedPlies;

    loadedPlies = num_ply;
    gameActive = currentGameActive;

    if (activePly == 0) {
        activePly = num_ply;
        viewingActiveMove = true;
    }
    if (activePly == num_ply) {
        viewingActiveMove = true;
        Class('#newmove', 'd-none');
        newMovesCount = 0;
        Attrs('#newmove', 'data-count', 0);
        board.clearAnnotation();
    }
    if (viewingActiveMove && activePly != num_ply) {
        activePly = num_ply;
        if (Y.sound)
            play_sound(audiobox, 'move', {ext: 'mp3', interrupt: true});
    }

    // new game has started?
    if (previousPlies > num_ply) {
        create_charts();
        reset_charts();
    }

    let whiteEval = {},
        blackEval = {};

    activeFen = pgn.Moves[pgn.Moves.length - 1].fen;
    if (viewingActiveMove) {
        currentMove = pgn.Moves[pgn.Moves.length - 1];
        lastMove = currentMove.to;
        setMoveMaterial(currentMove.material, 0);
    }

    let eval_ = getEvalFromPly(pgn.Moves.length - 1);
    if (turn)
        whiteEval = eval_;
    else
        blackEval = eval_;

    let clockCurrentMove = currentMove,
        clockPreviousMove = '';

    if (pgn.Moves.length > 1) {
        let eval_ = getEvalFromPly(pgn.Moves.length-2),
            selectedMove = pgn.Moves[pgn.Moves.length-2];
        clockPreviousMove = selectedMove;

        if (!turn)
            whiteEval = eval_;
        else
            blackEval = eval_;
    }

    if (viewingActiveMove) {
        updateMoveValues(whiteEval, blackEval);
        findDiffPv(whiteEval.pv, blackEval.pv);
        updateEnginePv(WH, whiteEval.pv);
        updateEnginePv(BL, blackEval.pv);
    }

    if (!turn)
    {
        if (pgn.Headers.WhiteTimeControl)
            pgn.Headers.TimeControl = pgn.Headers.WhiteTimeControl;
    }
    else if (pgn.Headers.BlackTimeControl)
        pgn.Headers.TimeControl = pgn.Headers.BlackTimeControl;

    let TC = pgn.Headers.TimeControl.split("+"),
        base = Round(TC[0] / 60);

    TC = base + "'+" + TC[1] + '"';
    pgn.Headers.TimeControl = TC;
    defaultStartTime = (base * 60 * 1000);

    if (currentGameActive)
        startClock(turn, clockCurrentMove, clockPreviousMove);
    else
    {
        stopClock(WH);
        stopClock(BL);
    }

    if (viewingActiveMove) {
        if (pgn.Moves.length > 0) {
            show_move('#board', moveFrom, moveTo);
            squareToHighlight = moveTo;
        }
        board.position(currentPosition, false);
        // xboards.board.set_fen(currentPosition);
    }

    if (pgn.Headers == undefined) {
        if (DEV.ply & 1)
            LS("XXX: Returning here because headers not defined");
        return;
    }

    listPosition();

    // title + favicon
    let title = "TCEC - Live Computer Chess Broadcast";
    if (pgn.Moves.length > 0) {
        title = pgn.Headers.White + ' vs. ' + pgn.Headers.Black + ' - ' + title;
        let is_black = (pgn.Moves.PlyCount % 2 == 0 || pgn.Headers.Termination != 'unterminated');
        Attrs('#favicon', 'href', `image/favicon${is_black? 'b': ''}.ico`);
    }
    document.title = title;

    let termination = pgn.Headers.Termination;
    if (pgn.Moves.length > 0) {
        let adjudication = pgn.Moves[pgn.Moves.length - 1].adjudication,
            piecesleft = listPosition();
        pgn.Headers.piecesleft = piecesleft;

        if (eventNameHeader == 0)
        {
            // all this can be replaced with 1 line, and it would execute faster too ...
            eventNameHeader = pgn.Headers.Event;
            let eventTmp = eventNameHeader.match(/TCEC Season (.*)/);
            if (eventTmp)
            {
                if (DEV.ply & 1)
                    LS(eventTmp[1]);
                pgn.Headers.Event = "S" + eventTmp[1];
                eventNameHeader = pgn.Headers.Event;
            }
        }
        else
            pgn.Headers.Event = eventNameHeader;

        let finished;

        if (termination == 'unterminated' && adjudication) {
            termination = '-';
            let movesToDraw = 50,
                movesToResignOrWin = 50,
                movesTo50R = 50;

            if (Abs(adjudication.Draw) <= 10 && pgn.Moves.length > 58)
                movesToDraw = Max(Abs(adjudication.Draw), 69 - pgn.Moves.length);

            if (Abs(adjudication.ResignOrWin) < 11)
                movesToResignOrWin = Abs(adjudication.ResignOrWin);

            if (adjudication.FiftyMoves < 51)
                movesTo50R = adjudication.FiftyMoves;

            if (movesTo50R < 50 && movesTo50R < movesToResignOrWin)
            {
                termination = `${movesTo50R} move${(movesTo50R > 1)? 's': ''} 50mr`;
                pgn.Headers.movesTo50R = movesTo50R;
            }

            if (movesToResignOrWin < 50 && movesToResignOrWin < movesToDraw && movesToResignOrWin < movesTo50R)
            {
                termination = `${movesToResignOrWin} pl${(movesToDraw > 1)? 'ies': 'y'} win`;
                pgn.Headers.movesToResignOrWin = movesToResignOrWin;
            }

            if (movesToDraw < 50 && movesToDraw <= movesTo50R && movesToDraw <= movesToResignOrWin)
            {
                termination = `${movesToDraw} pl${(movesToDraw > 1)? 'ies': 'y'} draw`;
                pgn.Headers.movesToDraw = movesToDraw + 'p';
            }
        }
        else {
            pgn.Headers.Termination = pgn.Headers.TerminationDetails;
            if (DEV.ply & 1)
                LS("pgn.Headers.Termination: yes" + pgn.Headers.Termination);

            if (pgn.Headers.Termination && pgn.Headers.Termination != 'undefined')
                finished = true;
        }

        // show/hide
        let class1 = finished? 'show': 'hide',
            class2 = finished? 'hide': 'show';
        $('#event-overview').bootstrapTable(`${class1}Column`, 'Termination');
        $('#event-overview').bootstrapTable(`${class2}Column`, 'movesToDraw');
        $('#event-overview').bootstrapTable(`${class2}Column`, 'movesToResignOrWin');
        $('#event-overview').bootstrapTable(`${class2}Column`, 'movesTo50R');
    }

    $('#event-overview').bootstrapTable('load', [pgn.Headers]);
    setUsersMain(pgn.Users);
    HTML('#event-name', pgn.Headers.Event);

    if (viewingActiveMove)
        setInfoFromCurrentHeaders();

    updateChartData();

    // this is VERY slow code ...
    HTML('#engine-history', '');
    Keys(pgn.Moves).forEach(key => {
        key *= 1;
        let move = pgn.Moves[key],
            ply = key + 1;
        if (key % 2 == 0) {
            let number = (key / 2) + 1,
                numlink = "<a class='numsmall'>" + number + ". </a>";
            $('#engine-history').append(numlink);
        }

        let linkClass = "";
        if (activePly == ply)
            linkClass = "active-move";

        if (move.book == true)
        {
            linkClass += " green";
            bookmove = ply;
        }

        let link = "<a href='#' ply='" + ply + "' fen='" + move.fen + "' from='" + move.from + "' to='" + move.to + "' class='change-move " + linkClass + "'>" + move.m + "</a>";
        $('#engine-history').append(link + ' ');
    });
    $('#engine-history').append(pgn.Headers.Result);
    $("#engine-history").scrollTop($("#engine-history")[0].scrollHeight);

    if (pgn.gameChanged && (DEV.ply & 1))
        LS("Came to setpgn need to reread data at end");
}

// TODO: 1 function for all
function copyFenAnalysis()
{
    LS('copy fen a');
    new ClipboardJS('.btn', {
        text: () => {
            return analysFen;
        }
    });
    return false;
}

function copyFenWhite()
{
    LS('copy white');
    let clip = new ClipboardJS('.btn', {
        text: function(trigger) {
            return current_positions[WH];
        }
    });
    return false;
}

function copyFenBlack()
{
    LS('copy black');
    let clip = new ClipboardJS('.btn', {
        text: function(trigger) {
            return current_positions[BL];
        }
    });
    return false;
}

function copyFen()
{
    LS('copy fen');
    let clip = new ClipboardJS('.btn', {
        text: function(trigger) {
            return currentPosition;
        }
    });
    return false;
}

function setInfoFromCurrentHeaders()
{
    ['White', 'Black'].forEach((key, id) => {
        let color = WHITE_BLACK[id],
            header = prevPgnData.Headers[key],
            name = get_short_name(header);
        all_engines[id] = header;

        HTML(`.${color}-engine-name`, name);
        HTML(`.${color}-engine-name-full`, header);
        Attrs(`#${color}-engine`, 'src', `image/engine/${name}.jpg`);
        Attrs(`#${color}-engine`, 'alt', header);
        Attrs(`#${color}-engine-chessprogramming`, 'href', `https://www.chessprogramming.org/${name}`);
    });
}

function getMoveFromPly(ply)
{
    return prevPgnData.Moves[ply];
}

/**
 * Make a book or n/a eval
 * - used by getEvalFromPly
 * @param {string} value
 * @param {string} side
 * @param {Object=} extra override some values
 * @returns {Object}
 */
function make_non_eval(side, value, extra) {
    let dico = {
        depth: value,
        eval: value,
        mtime: value,
        nodes: value,
        pv: {},
        side: side,
        speed: value,
        tbhits: value,
        timeleft: value,
    };

    if (extra)
        Assign(dico, extra);
    return dico;
}

function getEvalFromPly(ply)
{
    let selectedMove = prevPgnData.Moves[ply],
        side = turn? 'White': 'Black';

    if (ply < 0)
        return make_non_eval(side, 'n/a');

    // arun
    if (ply < bookmove)
        return make_non_eval(side, 'book');

    //arun
    if (selectedMove == undefined || selectedMove.pv == undefined)
        return make_non_eval(side, 'n/a', {eval: 0});

    let speed = selectedMove.s;
    if (speed < 1000000)
        speed = Round(speed / 1000) + ' knps';
    else
        speed = Round(speed / 1000000) + ' Mnps';

    let nodes = FormatUnit(selectedMove.n),
        depth = selectedMove.d + '/' + selectedMove.sd,
        tbHits = FormatUnit(selectedMove.tb),
        evalRet = DefaultFloat(selectedMove.wv, 'N/A');

    if (Number.isFinite(evalRet))
        evalRet = evalRet.toFixed(2);

    return {
        depth: depth,
        eval: evalRet,
        mtime: secFormatNoH(selectedMove.mt),
        nodes: nodes,
        pv: selectedMove.pv.Moves,
        side: side,
        speed: speed,
        tbhits: tbHits,
        timeleft: secFormat(selectedMove.tl),
    };
}

function getPct(engine, eval_) {
    let short = get_short_name(engine),
        extra = calculate_probability(short, eval_),
        text = `${short} ${eval_}`;

    if (extra)
        text = `${text} [${extra}]`;
    return text;
}

function updateMoveValues(whiteEval, blackEval)
{
    /* Ben: Not sure why we need to update only if we are not viewing active move */
    if (!viewingActiveMove)
    {
        HTML('.white-time-used', whiteEval.mtime);
        HTML('.black-time-used', blackEval.mtime);
        HTML('.white-time-remaining', whiteEval.timeleft);
        HTML('.black-time-remaining', blackEval.timeleft);
    }
    else
    {
        if (!turn)
        {
            HTML('.black-time-remaining', blackEval.timeleft);
            HTML('.black-time-used', blackEval.mtime);
        }
        else
        {
            HTML('.white-time-used', whiteEval.mtime);
            HTML('.white-time-remaining', whiteEval.timeleft);
        }
    }

    HTML('.white-engine-eval', whiteEval.eval);

    let blackEvalPt = getPct(prevPgnData.Headers.Black, blackEval.eval),
        whiteEvalPt = getPct(prevPgnData.Headers.White, whiteEval.eval);
    HTML('.black-engine-name-full-new', blackEvalPt);
    HTML('.white-engine-name-full-new', whiteEvalPt);
    //$(eval a=(((((Math.atan(($(query)100)/290.680623072))/3.096181612)+0.5)100)-50);
    //lose=Max(0,a-2); draw=(100-Max(win,lose)).toFixed(2); win=win.toFixed(2); lose=lose.toFixed(2);
    HTML('.white-engine-speed', whiteEval.speed);
    HTML('.white-engine-nodes', whiteEval.nodes);
    HTML('.white-engine-depth', whiteEval.depth);
    HTML('.white-engine-tbhits', whiteEval.tbhits);
    findDiffPv(whiteEval.pv, blackEval.pv);
    updateEnginePv(WH, whiteEval.pv);

    HTML('.black-engine-eval', blackEval.eval);
    HTML('.black-engine-speed', blackEval.speed);
    HTML('.black-engine-nodes', blackEval.nodes);
    HTML('.black-engine-depth', blackEval.depth);
    HTML('.black-engine-tbhits', blackEval.tbhits);
    updateEnginePv(BL, blackEval.pv);
}

/**
 * Update engine PV
 * @param {number} color
 * @param {Object} moves
 */
function updateEnginePv(color, moves)
{
    // 0) skip
    let scolor = WHITE_BLACK[color];
    if (!moves) {
        HTML(`#${scolor}-engine-pv`, '');
        HTML(`.${scolor}-engine-pv`, '');
        return;
    }

    // 1)
    let classhigh = '',
        current = Floor(activePly / 2),
        other = 1 - turn;

    all_pvs[color] = moves;

    let keyOffset = 0;
    if (color == BL && turn)
        current -= 2;

    if (turn)
        current ++;
    if (turn && color == BL)
        current ++;

    let setpvmove = -1;
    HTML(`#${scolor}-engine-pv`, '');
    HTML(`.${scolor}-engine-pv`, '');

    // 2)
    Keys(moves).forEach(key => {
        key *= 1;
        let move = moves[key];

        classhigh = "";
        let effectiveKey = key + keyOffset,
            pvMove = current + Floor(effectiveKey / 2);
            // pvMoveNofloor = current + effectiveKey;

        if (color == turn && highlightpv == key)
        {
            if (DEV.pv &  1)
                LS(`Need to highlight: ${pvMove} : move=${move.m}`);
            classhigh = "active-pv-move";
            setpvmove = effectiveKey;
        }
        if (color == other && highlightpv == key + 1)
        {
            if (DEV.pv & 1)
                LS(`Need to highlight: ${pvMove} : move=${move.m}`);
            classhigh = "active-pv-move";
            setpvmove = effectiveKey;
        }

        let atsymbol = '';
        if (setpvmove > -1 && effectiveKey == setpvmove)
        {
            pvMove = ' @ ' + pvMove;
            // LS("pvMove is : " + pvMove + " setpvmove:" + setpvmove + ", effectiveKey:" + effectiveKey);
            atsymbol = ' @ ';
        }
        if (color == WH)
        {
            if (effectiveKey % 2 == 0 )
            {
                $('#' + scolor + '-engine-pv').append(pvMove + '. ');
                $('#' + scolor + '-engine-pv2').append(pvMove + '. ');
                $('#' + scolor + '-engine-pv3').append(pvMove + '. ');
            }
            else if (effectiveKey % 2 != 0 )
            {
                $('#' + scolor + '-engine-pv').append(atsymbol);
                $('#' + scolor + '-engine-pv2').append(atsymbol);
                $('#' + scolor + '-engine-pv3').append(atsymbol);
            }
        }

        if (color == BL && effectiveKey % 2 != 0 ) {
            $('#' + scolor + '-engine-pv3').append(pvMove + '. ');
            $('#' + scolor + '-engine-pv').append(pvMove + '. ');
            $('#' + scolor + '-engine-pv2').append(pvMove + '. ');
        }

        if (color == BL)
        {
            if (color == BL && key == 0 )
            {
                $('#' + scolor + '-engine-pv').append(pvMove + '. ');
                $('#' + scolor + '-engine-pv2').append(pvMove + '. ');
                $('#' + scolor + '-engine-pv3').append(pvMove + '. ');
                $('#' + scolor + '-engine-pv').append(' .. ');
                $('#' + scolor + '-engine-pv2').append(' .. ');
                $('#' + scolor + '-engine-pv3').append(' .. ');
                current ++;
            }
            else if (effectiveKey % 2 == 0 )
            {
                $('#' + scolor + '-engine-pv3').append(atsymbol);
                $('#' + scolor + '-engine-pv').append(atsymbol);
                $('#' + scolor + '-engine-pv2').append(atsymbol);
            }
        }
        if (color == BL)
            classhigh += ' blue';

        $('#' + scolor + '-engine-pv').append("<a href='#' id='" + scolor + '-' + key + "' class='set-pv-board " + classhigh + "' move-key='" + key + "' color='" + scolor + "'>" + move.m + '</a> ');
        $('#' + scolor + '-engine-pv2').append("<a href='#' id='" + scolor + '-' + key + "' class='set-pv-board " + classhigh + "' move-key='" + key + "' color='" + scolor + "'>" + move.m + '</a> ');
        $('#' + scolor + '-engine-pv3').append("<a href='#' id='c" + scolor + '-' + key + "' class='set-pv-board " + classhigh + "' move-key='" + key + "' color='" + scolor + "'>" + move.m + '</a> ');
    });

    if (DEV.pv & 1)
        LS(`highlightpv=${highlightpv}`);
    if (highlightpv == 0)
        setpvmove = 0;

    // 3)
    Class(`#${scolor}-engine-pv3`, `${scolor}-engine-pv`);
    Class(`#${scolor}-engine-pv3`, 'alert');
    Class(`#${scolor}-engine-pv3`, 'alert-dark');
    Show(`#${scolor}-name-dynamic`);
    all_pvs[color] = moves;
    if (all_pvs[color].length > 0)
    {
        if (Y.ply_diff == 'last')
        {
            setpvmove = all_pvs[color].length - 1;
            if (DEV.pv & 1)
                LS(`ply_diff in white: ${all_pvs[color].length}`);
        }
        activePv = all_pvs[color].slice();
        setPvFromKey(setpvmove, color);
    }
}

function setPlyDiv(ply_diff)
{
    save_option('ply_diff', ply_diff);
    findDiffPv(all_pvs[WH], all_pvs[BL]);
    updateEnginePv(WH, all_pvs[WH]);
    updateEnginePv(BL, all_pvs[BL]);
    Prop(`input[value="ply${ply_diff}"]`, 'checked', true);
}

function findDiffPv(whitemoves, blackmoves)
{
    highlightpv = 0;
    if (Y.ply_diff == 'first')
        return;

    if (!whitemoves)
        return;

    Keys(whitemoves).forEach(key => {
        // let pvMove = current + key;
        if (!turn)
        {
            if (!highlightpv && blackmoves && blackmoves[key - 1] && (blackmoves[key - 1].m != whitemoves[key].m))
            {
                if (DEV.pv & 1)
                    LS("Need to color this pvmove is :" + key + ", pv:" + whitemoves[key].m + ", black: " + blackmoves[key - 1].m);
                highlightpv = key;
            }
        }
        else
        {
            if (!highlightpv && blackmoves && blackmoves[key + 1] && (blackmoves[key + 1].m != whitemoves[key].m))
            {
                if (DEV.pv & 1)
                    LS("Need to color this pvmove is :" + key + ", pv:" + whitemoves[key].m + ", black: " + blackmoves[key + 1].m);
                highlightpv = key + 1;
            }
        }
    });
}

function boardAutoplay()
{
    if (isAutoplay && activePly >= 1 && activePly < loadedPlies) {
        activePly++;
        handlePlyChange();
        add_timeout('autoplay', () => {boardAutoplay();}, 750);
    }
    else {
        isAutoplay = false;
        Class('#board-autoplay i', '-fa-pause fa-play');
    }
}

function onLastMove()
{
    activePly = loadedPlies;
    viewingActiveMove = true;
    handlePlyChange();
}

function handlePlyChange(handleclick=true)
{
    selectedId = 0;
    turn = activePly % 2;

    let blackEval = '',
        whiteEval = '';

    /* Ben: since index starts at 0, active ply should be -1 and -2 to be correct */
    if (!turn) {
        whiteEval = getEvalFromPly(activePly - 2);
        blackEval = getEvalFromPly(activePly - 1);
    } else {
        blackEval = getEvalFromPly(activePly - 2);
        whiteEval = getEvalFromPly(activePly - 1);
    }

    /* Arun: we should get move from ply - 1 as index starts at 0 */
    currentMove = getMoveFromPly(activePly - 1);

    if (activePly > 1)
    {
        let prevMove = getMoveFromPly(activePly - 2);
        for (let yy = 1 ; yy <= livePVHist.length ; yy ++)
        {
            if (!livePVHist[yy])
                continue;
            for (let xx = 0 ; xx < livePVHist[yy].moves.length ; xx ++)
            {
                if (parseInt(livePVHist[yy].moves[xx].ply) == activePly)
                {
                    livePVHist[yy].moves[xx].engine = livePVHist[yy].engine;
                    updateLiveEvalData(livePVHist[yy].moves[xx], 0, prevMove.fen, yy, 0);
                    break;
                }
            }
        }
    }

    /* Arun: why do we need to keep swappging the pieces captured */
    if (currentMove)
        setMoveMaterial(currentMove.material, 0);

    updateMoveValues(whiteEval, blackEval);

    // TODO: skip the click
    if (handleclick)
        _(`a[ply="${activePly}"]`).click();
}

function scrollDiv(container, element)
{
    try {
        $(container).scrollTop(
            $(element).offset().top - $(container).offset().top + $(container).scrollTop()
        );
    }
    catch (e) {
    }
}

/**
 * Set PV from a move key
 * @param {number} moveKey
 * @param {number} color
 * @param {Object} choosePvx
 */
function setPvFromKey(moveKey, color, choosePvx)
{
    let activePv;
    if (color == LIVE) {
        if (choosePvx)
        {
            activePv = choosePvx;
            // LS("choosePvx is :" + JSON.stringify(choosePvx));
            choosePv = choosePvx;
        }
        else
        {
            activePv = choosePv;
            LS('live choseny:' + activePv.length + " ,moveKey:" + moveKey);
        }
    }
    else
        activePv = all_pvs[color].slice();

    if (activePv.length < 1) {
        activePvKey[color] = 0;
        return;
    }
    if (moveKey >= activePv.length)
        return;

    activePvKey[color] = moveKey;

    let moveFromPv = activePv[moveKey].from,
        moveToPv = activePv[moveKey].to,
        fen = activePv[moveKey].fen;

    // could this be slow?
    game.load(fen);

    Class('.active-pv-move', '-active-pv-move');

    let pvBoardElbL, pvBoardL;

    if (color == LIVE) {
        pvBoardL = pvBoarda;
        pvBoardElbL = '#pv-boarda';
    }
    else {
        pvBoardL = (color == WH)? pvBoardw: pvBoardb;
        pvBoardElbL = (color == WH)? '#pv-boardw': '#pv-boardb';

        let scolor = WHITE_BLACK[color],
            sother = WHITE_BLACK[1 - color];

        Class(`#${scolor}-engine-pv #${scolor}-${moveKey}`, 'active-pv-move');
        Class(`#${scolor}-engine-pv2 #${scolor}-${moveKey}`, 'active-pv-move');
        Class(`#${scolor}-engine-pv3 #c${scolor}-${moveKey}`, 'active-pv-move');
        Class(`#${sother}-engine-pv #${sother}-${activePvKey[1]}`, 'active-pv-move');
        Class(`#${sother}-engine-pv2 #${sother}-${activePvKey[1]}`, 'active-pv-move');
        Class(`#${sother}-engine-pv3 #c${sother}-${activePvKey[1]}`, 'active-pv-move');
        scrollDiv(`#${scolor}-engine-pv`, `#${scolor}-${moveKey}`);
        scrollDiv(`#${scolor}-engine-pv2`, `#${scolor}-${moveKey}`);
        scrollDiv(`#${scolor}-engine-pv3`, `#c${scolor}-${moveKey}`);

        current_positions[color] = fen;
    }
    moveFromPvs[color] = moveFromPv;
    moveToPvs[color] = moveToPv;

    if (!pvBoardElbL)
        return;
    analysFen = fen;

    // show moves
    show_move(pvBoardElbL, moveFromPv, moveToPv, true);
    pvSquareToHighlight = moveToPv;

    pvBoardL.position(fen, false);
    if (color == WH) {
        show_move('#pv-boardwc', moveFromPv, moveToPv, true);
        pvBoardwc.position(fen, false);
    }
    else if (color == BL) {
        show_move('#pv-boardbc', moveFromPv, moveToPv, true);
        pvBoardbc.position(fen, false);
    }
}

//hack
function pvBoardautoplay(value, color, activePv)
{
    if (isPvAutoplay[value] && activePvKey[value] >= 0 && activePvKey[value] < activePv.length - 1) {
        setPvFromKey(activePvKey[value] + 1, color);
        add_timeout('pv_autoplay', () => {pvBoardautoplay(value, color, activePv);}, 750);
    }
    else {
        isPvAutoplay[value] = false;
        if (value == 0)
        {
            Class('.pv-board-autoplay1 i', '-fa-pause fa-play');
        }
        else
        {
            Class('.pv-board-autoplay2 i', '-fa-pause fa-play');
        }
    }
}

// CHECK THIS
function setMoveMaterial(material, whiteToPlay)
{
    Keys(material).forEach(key => {
        let value = material[key];
        setPieces(key, value, whiteToPlay);
    });
}

// CHECK THIS
function setPieces(piece, value, whiteToPlay) {
    let target = 'black-material',
        color = 'b';
    if ((whiteToPlay && value < 0) || (!whiteToPlay && value > 0)) {
        target = 'white-material';
        color = 'w';
    }

    HTML('#white-material span.' + piece, '');
    HTML('#black-material span.' + piece, '');

    for (let i = 0; i < Abs(value); i++) {
        let imgPath = 'theme/wikipedia/' + color + piece.toUpperCase() + '.svg';
        $('#' + target + ' span.' + piece).append('<img src="' + imgPath + '" class="engine-material" />');
    }
}

function openCrossCup(index, gamen)
{
    index ++;
    LS("XXX: Index is :" + index + ",:::" + eventCross[index]);
    let link = ARCHIVE_LINK,
        tourLink = '',
        localGame = gamen,
        cupname = tourInfo.season,
        selindex = 0;

    if (index < 17)
    {
        tourLink = 'season=' + cupname + '&round=round32';
        selindex = 0;
    }
    else if (index < 25)
    {
        tourLink = 'season=' + cupname + '&round=round16';
        selindex = 16;
    }
    else if (index < 29)
    {
        tourLink = 'season=' + cupname + '&round=qf';
        selindex = 24;
    }
    else if (index < 31)
    {
        tourLink = 'season=' + cupname + '&round=sf';
        selindex = 28;
    }
    else if (index == 31)
    {
        tourLink = 'season=' + cupname + '&round=bz';
        selindex = 30;
    }
    else if (index == 32)
    {
        tourLink = 'season=' + cupname + '&round=fl';
        selindex = 31;
    }

    globalGameno = gamen;
    localGame -= eventCross[selindex];

    link = link + "?" + tourLink + "&game=" + localGame;
    window.open(link,'_blank');
    scheduleHighlight();
}

function openCross(index, gamen)
{
    if (tourInfo.cup && index)
    {
        openCrossCup(index, gamen);
        return;
    }
    let link = ARCHIVE_LINK;
        // season = 1,
        // div = "di",
        // divno = 1;
    globalGameno = gamen;

    if (tourInfo.startgame)
        gamen += tourInfo.startgame;

    link = `${link}?${tourInfo.link}&game=${gamen}`;
    window.open(link,'_blank');
    scheduleHighlight();
}

function openLinks(link)
{
    window.open(link,'_blank');
}

function crossFormatter(value, row, index, field) {
    if (!value.hasOwnProperty("Score")) // true
        return value;

    let retStr = '',
        valuex = value.Score,
        countGames = 0;

    Keys(valuex).forEach(key => {
        let engine = valuex[key],
            gameX = parseInt(countGames / 2),
            gameXColor = parseInt(gameX % 3);

        if (engine.Result == "0.5")
        {
            engine.Result = '&frac12';
            gameXColor = 2;
        }
        else
            gameXColor = parseInt(engine.Result);

        if (retStr)
            retStr += ' ';
        retStr += '<a title="' + engine.Game + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCross(' + index + ',' + engine.Game + ')">' + engine.Result + '</a>';

        countGames ++;
        if (countGames % 10 == 0)
            retStr += '<br />';
    });

    return retStr;
}

function formatter(value, _row, index, _field) {
    if (!value.hasOwnProperty("Score")) // true
        return value;

    let retStr = '',
        valuex = value.Score,
        countGames = 0,
        rowcountGames = 0,
        splitcount = 10;

    Keys(valuex).forEach(key => {
        let engine = valuex[key],
            gameX = parseInt(countGames / 2),
            gameXColor = parseInt(gameX % 3);

        if (engine.Result == "0.5")
        {
            engine.Result = '&frac12';
            gameXColor = 2;
        }
        else
            gameXColor = parseInt(engine.Result);

        if (rowcountGames && (rowcountGames%2 == 0))
            retStr += '&nbsp';

        if (retStr)
            retStr += ' ';
        retStr += '<a title="' + engine.Game + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCross(' + index + ',' + engine.Game + ')">' + engine.Result + '</a>';

        countGames ++;
        rowcountGames ++;
        if (countGames % splitcount == 0)
        {
            rowcountGames = 0;
            retStr += '<br />';
        }
    });

    return retStr;
}

function crossCellformatter(value, row, index, field)
{
    return {classes: (row.crashes >= 3)? 'strike': 'normal'};
}

function cellformatter(value, row, index, field) {
    return {classes: (value.Score != undefined)? 'monofont': _BLACK};
}

function updateScoreHeadersData()
{
    if (!crosstableData)
    {
        if (h2hScoreRetryCount < 10)
        {
            add_timeout('update_h2hscore', () => {updateScoreHeadersData();}, 5000);
            LS("H2h score did not get updated:" + h2hScoreRetryCount);
            h2hScoreRetryCount ++;
        }
        return;
    }

    if (crosstableData.whiteCurrent === all_engines[WH] && crosstableData.blackCurrent === all_engines[BL])
        return;

    let scores = {},
        whiteRes = crosstableData.Table[all_engines[WH]],
        blackRes = crosstableData.Table[all_engines[BL]];

    if (whiteRes.Rating)
    {
        HTML('#white-engine-elo', whiteRes.Rating);
        scores = calculate_score(crosstableData.Table[all_engines[WH]].Results[all_engines[BL]].Text);
        HTML('.white-engine-score', scores.w.toFixed(1));
        HTML('.black-engine-score', scores.b.toFixed(1));
    }

    if (blackRes.Rating)
        HTML('#black-engine-elo', blackRes.Rating);

    crosstableData.whiteCurrent = all_engines[WH];
    crosstableData.blackCurrent = all_engines[BL];
    return 0;
}

function updateEngRatingData(data)
{
    engineRatingGlobalData = data;
    clear_timeout('cross');
}

function updateTourInfo(data)
{
    tourInfo = data;
}

function readTourInfo()
{
    Resource('tournament.json', (code, data) => {
        if (code == 200)
            updateTourInfo(data);
    });
}

function updateEngRating()
{
    Resource('enginerating.json', (code, data) => {
        if (code == 200)
            updateEngRatingData(data);
    });
}

function shallowCopy(data)
{
    return JSON.parse(JSON.stringify(data));
}

function updateH2hData()
{
    if (tourInfo && tourInfo.cup == 1)
    {
        Hide('#h2hdiv');
        return;
    }

    if (!oldSchedData)
    {
        if (h2hRetryCount < 10)
        {
            add_timeout('update_h2h', () => {updateH2hData();}, 5000);
            LS("H2h did not get updated:" + h2hRetryCount);
            h2hRetryCount ++;
            return;
        }
    }


    if (!oldSchedData)
        return;
    if (oldSchedData.WhiteEngCurrent === all_engines[WH] && oldSchedData.BlackEngCurrent === all_engines[BL])
        return;

    h2hRetryCount = 0;

    let h2hdata = [],
        prevDate = 0,
        momentDate = 0,
        diff = 0,
        gameDiff = 0,
        timezoneDiff = moment().utcOffset() * 60 * 1000 + timezoneDiffH * 3600 * 1000,
        h2hrank = 0,
        data = shallowCopy(oldSchedData);

    Keys(data).forEach(key => {
        let engine = data[key];
        engine.Gamesort = engine.Game;
        if (engine.Start)
        {
            momentDate = moment(engine.Start, 'HH:mm:ss on YYYY.MM.DD');
            if (prevDate)
            {
                diff += momentDate.diff(prevDate);
                gameDiff = diff/(engine.Game-1);
            }
            momentDate.add(timezoneDiff);
            engine.Start = getLocalDate(engine.Start);
            prevDate = momentDate;
            //LS("diff is :" + (CurrentDate2 - CurrentDate1));
        }
        else if (gameDiff)
        {
            prevDate.add(gameDiff + timezoneDiff);
            engine.Start = "Estd: " + prevDate.format('HH:mm:ss on YYYY.MM.DD');
        }

        if (engine.Moves)
        {
            gamesDone = engine.Game;
            engine.Game = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass[3] + ';"onclick="openCross(' + 0 + ',' + engine.Game + ')">' + engine.Game + '</a>';
        }
        engine.FixWhite = engine.White;
        engine.FixBlack = engine.Black;

        if (engine.Result == "1/2-1/2") {
            // do nothing
        }
        else if (engine.Result == "1-0")
        {
            engine.FixWhite = '<div style="color:' + gameArrayClass[1] + '">' + engine.White + '</div>';
            engine.FixBlack = '<div style="color:' + gameArrayClass[0] + '">' + engine.Black + '</div>';
        }
        else if (engine.Result == "0-1")
        {
            engine.FixWhite = '<div style="color:' + gameArrayClass[0] + '">' + engine.White + '</div>';
            engine.FixBlack = '<div style="color:' + gameArrayClass[1] + '">' + engine.Black + '</div>';
        }

        if ((engine.Black == all_engines[BL] && engine.White == all_engines[WH]) ||
            (engine.Black == all_engines[WH] && engine.White == all_engines[BL]))
        {
            engine.h2hrank = engine.Game;
            if (engine.Result != undefined)
            {
                h2hrank ++;
                if (h2hrank%2 == 0)
                    engine.h2hrank = engine.Game + ' (R)';
            }
            h2hdata.push(engine);
        }
    });

    oldSchedData.WhiteEngCurrent = all_engines[WH];
    oldSchedData.BlackEngCurrent = all_engines[BL];
    $('#h2h').bootstrapTable('load', h2hdata);
}

function updateGame(game)
{
    openCross(0, game);
}

function updateTourStat(data)
{
    let scdatainput = shallowCopy(data),
        tinfo = [],
        tinfoData = scheduleToTournamentInfo(scdatainput),
        gameNox = tinfoData.minMoves[1];

    tinfoData.minMoves = tinfoData.minMoves[0] + ' [' + '<a title="' + gameNox + '" style="cursor:pointer; color: ' +
    gameArrayClass[1] + ';"onclick="updateGame(' + gameNox + ')">' + gameNox + '</a>' + ']';
    gameNox = tinfoData.maxMoves[1];
    tinfoData.maxMoves = tinfoData.maxMoves[0] + ' [' + '<a title="' + gameNox + '" style="cursor:pointer; color: ' +
    gameArrayClass[1] + ';"onclick="updateGame(' + gameNox + ')">' + gameNox + '</a>' + ']';
    gameNox = tinfoData.minTime[1];
    tinfoData.minTime = tinfoData.minTime[0] + ' [' + '<a title="' + gameNox + '" style="cursor:pointer; color: ' +
    gameArrayClass[1] + ';"onclick="updateGame(' + gameNox + ')">' + gameNox + '</a>' + ']';
    gameNox = tinfoData.maxTime[1];
    tinfoData.maxTime = tinfoData.maxTime[0] + ' [' + '<a title="' + gameNox + '" style="cursor:pointer; color: ' +
    gameArrayClass[1] + ';"onclick="updateGame(' + gameNox + ')">' + gameNox + '</a>' + ']';

    let crashes = tinfoData.crashes[1];
    // CHECK THIS
    if (crashes.length)
    {
        tinfoData.crashes = tinfoData.crashes[0] + ' [';
        let lines = crashes.map(crash => `<a title="${crash}" style="cursor:pointer; color:${gameArrayClass[0]};"onclick="updateGame(${gameNox})">${gameNox}</a>`);
        tinfoData.crashes += lines.join(',') + ']';
    }
    else
        tinfoData.crashes = 0;

    tinfo.push(tinfoData);
    $('#tf').bootstrapTable('load', tinfo);
}

// TODO: REMOVE
function updateScheduleData(scdatainput)
{
    let scdata = [],
        prevDate = 0,
        momentDate = 0,
        diff = 0,
        gameDiff = 0,
        timezoneDiff = moment().utcOffset() * 60 * 1000 + timezoneDiffH * 3600 * 1000;

    oldSchedData = shallowCopy(scdatainput);
    let data = shallowCopy(scdatainput),
        gameLocalno = 1;
    updateTourStat(scdatainput);

    Keys(data).forEach(key => {
        let engine = data[key];
        engine.Game = gameLocalno;
        gameLocalno ++;
        engine.Gamesort = engine.Game;
        if (engine.Start)
        {
            momentDate = moment(engine.Start, 'HH:mm:ss on YYYY.MM.DD');
            if (prevDate)
            {
                diff += momentDate.diff(prevDate);
                gameDiff = diff/(engine.Game-1);
            }
            momentDate.add(timezoneDiff);
            engine.Start = getLocalDate(engine.Start);
            prevDate = momentDate;
        }
        else if (gameDiff)
        {
            prevDate.add(gameDiff + timezoneDiff);
            engine.Start = "Estd: " + prevDate.format('HH:mm:ss on YYYY.MM.DD');
        }
        if (engine.Moves)
        {
            gamesDone = engine.Game;
            globalGameno = gamesDone;
            engine.agame = engine.Game;
            engine.Game = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass[3] + ';"onclick="openCross(' + 0 + ',' + engine.Game + ')">' + engine.Game + '</a>';
        }
        engine.FixWhite = engine.White;
        engine.FixBlack = engine.Black;


        if (engine.Result == "1/2-1/2") {
            // do nothing
        }
        else if (engine.Result == "1-0")
        {
            engine.FixWhite = '<div style="color:' + gameArrayClass[1] + '">' + engine.White + '</div>';
            engine.FixBlack = '<div style="color:' + gameArrayClass[0] + '">' + engine.Black + '</div>';
        }
        else if (engine.Result == "0-1")
        {
            engine.FixWhite = '<div style="color:' + gameArrayClass[0] + '">' + engine.White + '</div>';
            engine.FixBlack = '<div style="color:' + gameArrayClass[1] + '">' + engine.Black + '</div>';
        }

        scdata.push(engine);
    });

    $('#schedule').bootstrapTable('load', scdata);
    scheduleHighlight();
}

function scheduleHighlight(_noscroll)
{
    let options = $('#schedule').bootstrapTable('getOptions'),
        classSet = 'blacktds';

    pageNum = parseInt(globalGameno / options.pageSize) + 1;
    $('#schedule').bootstrapTable('selectPage', pageNum);

    let index = globalGameno - (pageNum - 1) * options.pageSize;
    if (isNaN(index))
        return;

    // let top = 0;
    // $('#schedule').find('tbody tr').each(function (i) {
    //     if (i < index)
    //         top += $(this).height();
    // });

    if (Y.dark_mode != 20)
        classSet = 'whitetds';

    Class('#schedule tr', classSet, false);
    Class(`#schedule tr:nth-child(${index})`, classSet);
}

function updateWinnersData(winnerData)
{
    let scdata = [],
        data = shallowCopy(winnerData);

    Keys(data).forEach(key => {
        let engine = data[key],
            // redColor = 'darkred',
            link = "\'" + engine.link + "\'";
        engine.name = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass [0] + ';"onclick="openLinks(' + link + ')">' + engine.name + '</a>';
        scdata.push(engine);
    });

    $('#winner').bootstrapTable('load', scdata);
}

function updateWinners()
{
    Resource('winners.json', (code, data) => {
        if (code == 200)
            updateWinnersData(data);
    });
}

function updateSchedule()
{
    Resource('schedule.json', (code, data) => {
        if (code == 200)
            updateScheduleData(data);
    });
}

function onDragStart(_source, piece, _position, _orientation)
{
    if (game.game_over() === true
        || (game.turn() === 'w' && piece.search(/^b/) !== -1)
        || (game.turn() === 'b' && piece.search(/^w/) !== -1))
    {
        return false;
    }
}

function onDragMove(newLocation, oldLocation, _source, _piece, position, _orientation)
{
    let move = game.move({
        from: newLocation,
        to: oldLocation,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null)
        return 'snapback';

    let pvLen = activePvKey[2] + 1,
        fen = ChessBoard.objToFen(position);
    if (activePvKey[2] == 0)
    {
        activePv[0] = {};
        activePv[0].fen = fen;
    }
    moveFrom = oldLocation;
    moveTo = newLocation;
    if (newLocation == oldLocation)
        return;

    let str = newLocation + '-' + oldLocation;   // + '-' + newLocation;
    pvBoarda.move(str);
    fen = pvBoarda.fen();
    activePv[pvLen] = {};
    activePv[pvLen].fen = fen;
    activePv[pvLen].from = oldLocation;
    activePv[pvLen].to = newLocation;
    // Class(this, 'active-pv-move');

    show_move('#pv-boarda', moveFrom, moveTo, true);
    pvSquareToHighlight = moveTo;

    activePvKey[2] = pvLen;
    analysFen = fen;
}

/**
 * Create a new board, with or without drag
 * @param {string} cont
 * @param {boolean} notation
 * @param {boolean=} drag
 */
function createBoard(cont, notation, drag)
{
    let options = {
        appearSpeed: 1,
        boardTheme: BOARD_THEMES[Y.board_theme],
        moveSpeed: 1,
        onMoveEnd: () => {
            Class(`#board .square-${squareToHighlight}`, get_highlight());
        },
        overlay: true,
        pieceTheme: piece => PIECE_THEMES[Y.piece_theme][piece],
        position: 'start',
        showNotation: notation,
    };

    if (drag)
        Assign(options, {
            draggable: true,
            onDragStart: onDragStart,
            onDrop: onDragMove,
        });

    return ChessBoard(cont, options);
}

/**
 * Create all the boards
 */
function create_boards()
{
    pvBoarda = createBoard('pv-boarda', Y.notation_pv, true);
    board = createBoard('board', Y.notation);

    if (!Y.arrows)
        board.clearAnnotation();

    pvBoardw = createBoard('pv-boardw', Y.notation_pv);
    pvBoardb = createBoard('pv-boardb', Y.notation_pv);
    pvBoardwc = createBoard('pv-boardwc', Y.notation_pv);
    pvBoardbc = createBoard('pv-boardbc', Y.notation_pv);

    save_option('board_theme', Y.board_theme);
    save_option('piece_theme', Y.piece_theme);
    Prop(`input[value="${Y.board_theme}b"]`, 'checked', true);
    Prop(`input[value="${Y.piece_theme}p"]`, 'checked', true);
}

function setBoard()
{
    let fen = board.fen();
    board = createBoard('board', Y.notation);
    board.position(fen, false);
    // xboards.board.set_fen(fen);

    fen = pvBoardb.fen();
    pvBoardb = createBoard('pv-boardb', Y.notation_pv);
    pvBoardb.position(fen, false);

    fen = pvBoardw.fen();
    pvBoardw = createBoard('pv-boardw', Y.notation_pv);
    pvBoardw.position(fen, false);

    fen = pvBoarda.fen();
    pvBoarda = createBoard('pv-boarda', Y.notation_pv, true);
    pvBoarda.position(fen, false);

    fen = pvBoardwc.fen();
    pvBoardwc = createBoard('pv-boardwc', Y.notation_pv, true);
    pvBoardwc.position(fen, false);

    fen = pvBoardbc.fen();
    pvBoardbc = createBoard('pv-boardbc', Y.notation_pv, true);
    pvBoardbc.position(fen, false);

    save_option('board_theme', Y.board_theme);
    save_option('piece_theme', Y.piece_theme);

    Prop(`input[value="${Y.board_theme}b"]`, 'checked', true);
    Prop(`input[value="${Y.piece_theme}p"]`, 'checked', true);

    if (prevPgnData && prevPgnData.Moves.length > 0)
    {
        show_move('#board', moveFrom, moveTo);
        if (moveFromPvs[1])
            show_move('#pv-boardb', moveFromPvs[1], moveToPvs[1], true);
        if (moveFromPvs[0])
            show_move('#pv-boardw', moveFromPvs[0], moveToPvs[0], true);
        if (moveFromPvs[2])
            show_move('#pv-boarda', moveFromPvs[2], moveToPvs[2], true);
    }
}

function updateTables()
{
    readTourInfo();
    updateEngRating();
    updateSchedule();
    updateCrash();

    add_timeout('update_tables', () => {
        updateCrosstable();
        eventCrosstableWrap();
    }, 1000);
}

function setTwitchChatUrl(darkmode)
{
    Attrs('#chatright', 'src', twitchChatUrl + (darkmode? '?darkpopout': ''));
}

function setTwitchBackgroundInit(backg)
{
    let value = backg;
    if (![1, 2].includes(value))
        value = (Y.dark_mode == 20)? 2: 1;

    setTwitchChatUrl(value == 2);
    save_option('twitch_dark', backg);
}

function setTwitchBackground(backg)
{
    // not set to auto => don't change the background
    let value = Y.twitch_dark;
    if (value)
        return;

    // auto => twitch background will match the main theme
    setTwitchChatUrl(backg != 1);
    Prop(`input[value="${value}"]`, 'checked', true);
}

function setDarkLight()
{
    let is_dark = (Y.dark_mode == 20);

    Class('.toggleDark i', '-fa-moon fa-sun', is_dark);
    Class('body', 'dark', is_dark);
    setTwitchBackground(is_dark? 2: 1);
    setTwitchChatUrl(Y.twitch_dark || is_dark);
    Attrs('#info-frame', 'src', `info.html?body=${is_dark? 'dark': 'light'}`);
    Class('#crosstable, #gamelist, #h2h, #infotable, #schedule, #standtable, #winner', 'table-dark', is_dark);
    Class('#seasondiv', 'collapse-dark', is_dark);
    Prop('#themecheck', 'checked', !is_dark);
    Class('.graphs', 'blackcanvas -whitecanvas', is_dark);
    Prop('input.toggleDark', 'checked', is_dark);

    if (is_dark)
        gameArrayClass = ['red', '#39FF14', 'whitesmoke', 'orange'];
    else
        gameArrayClass = ['red', 'green', '#696969', 'darkblue'];
}

function setDefaults()
{
    setLiveEngine();
    setBoard();
    setDefaultLiveLog();

    if (Y.top_tab == 1)
        _('#v-pills-gameinfo-tab').click();
    else
        _('#v-pills-pv-top-tab').click();

    // checkboxes
    Prop('#notacheck', 'checked', !Y.arrows);
    Prop('#crosscheck', 'checked', !Y.cross_crash);
    Prop(`input[value="highlightRadio${Y.highlight}"]`, 'checked', true);
    Prop(`input[value="highlightPvRadio${Y.highlight_pv}"]`, 'checked', true);
    Prop('#livepvcheck', 'checked', !Y.live_pv);
    Prop('#nottcheck', 'checked', !Y.notation);
    Prop('#nottcheckpv', 'checked', !Y.notation_pv);
    Prop(`input[value="ply${Y.ply_diff}"]`, 'checked', true);
    Prop('#soundcheck', 'checked', !Y.sound);

    setCheckBoardMiddle(Y.board_middle? 1: 0, '#middlecheck');
    setDarkLight();
}

function setBoardUser(board_theme)
{
    if (board_theme)
        Y.board_theme = board_theme;
    setBoard();
}

function setPieceUser(piece_theme)
{
    if (piece_theme)
        Y.piece_theme = piece_theme;
    setBoard();
}

/**
 * Update live data - utility function
 * @param {Object} datum
 * @param {string} fen
 * @param {string} container
 * @param {number} id
 * @param {string|number} score
 * @returns {[string, Object[]]}
 */
function updateLiveData(datum, fen, container, id, score) {
    datum.tbhits = FormatUnit(datum.tbhits);
    datum.nodes = FormatUnit(datum.nodes);
    datum.eval = score;

    if (!datum.pv.length || datum.pv.trim() == 'no info')
        return [];

    let chess = new Chess(fen),
        currentFen = fen,
        moves = [],
        pvs = [],
        split = datum.pv.replace('...', '... ').split(' '),
        length = split.length;

    for (let i=0, moveCount=0; i<length; i++) {
        let text = split[i];
        if (!isNaN(text[0])) {
            moves.push(text);
            continue;
        }

        let move = chess.move(text);
        if (!move) {
            if (DEV.eval & 1)
                LS(`undefined move: ${text}`);
            return [];
        }

        currentFen = chess.fen();
        let newPv = {
            from: move.from,
            to: move.to,
            m: move.san,
            fen: currentFen,
        };

        // we can build the html and the PV in the same loop. no need to do it three times
        moves.push(`<a href="#" class="set-pv-board" live-pv-key="0" move-key="${moveCount}" engine="${id}" color="live">${move.san}</a>`);

        currentLastMove = text.slice(-2);
        pvs.push(newPv);
        moveCount ++;
    }

    HTML(container, '');
    return [moves.join(' '), pvs];
}

function updateLiveEvalDataHistory(datum, fen, container, id)
{
    let score = DefaultFloat(datum.eval, `${datum.eval}`);

    // Check if black
    if (datum.pv.search(/.*\.\.\..*/i) == 0)
    {
        if (!isNaN(score))
        {
            // Invert the score
            score = -parseFloat(score);
        }
    }

    let [html, pvs] = updateLiveData(datum, fen, container, id, score);
    if (!pvs)
        return;

    livePvs[id] = [];
    board.clearAnnotation();

    let evalStr = getPct(datum.engine, score);
    $(container).append('<h6>' + evalStr + ' PV(A) ' + '</h6><small>[D: ' + datum.depth + ' | TB: ' + datum.tbhits + ' | Sp: ' + datum.speed + ' | N: ' + datum.nodes +']</small>');

    if (Y.arrows) {
        let color = (id == 2)? 'reds': 'blues';
        if (pvs[0])
            board.addArrowAnnotation(pvs[0].from, pvs[0].to, color, board.orientation());
    }

    $(container).append(`<div class="engine-pv engine-pv-live alert alert-dark">${html}</div>`);
    livePvs[id] = pvs;
    activePvH[id] =pvs;
    datum.eval = datum.origeval;
}

/**
 * Updates the Kibitzings' engine PV and arrow if enabled.
 * Called by the socket when new PV info comes in.
 * @param {Object} datum object: {engine: String, pv:String, tbHits:String, Nodes:String/Integer, eval:String/Integer, speed:String/Integer, depth:String}
 * @param {boolean} update has to do with updating
 * @param {string} fen fen of current position
 * @param {number} id index of kibitzing engine
 * @param {boolean} initial Unknown behavior
 */
function updateLiveEvalData(datum, update, fen, id, initial) {
    if (!datum)
        return;
    let container = `#live-eval-cont${id}`;

    if (!Y[`live_engine${id}`]) {
        HTML(container, '');
        return;
    }
    if (!initial && id == 1) {
        board.clearAnnotation();
        clearedAnnotation = 1;
    }

    if (clearedAnnotation < 1 && id == 2)
        board.clearAnnotation();

    if (id == 2)
        clearedAnnotation = 0;

    if (update && !viewingActiveMove)
        return;
    else if (!update) {
        datum.origeval = datum.eval;
        updateLiveEvalDataHistory(datum, fen, container, id);
        return;
    }

    let score = (parseFloat(datum.eval || 0)).toFixed(2),
        [html, pvs] = updateLiveData(datum, fen || activeFen, container, id, score);
    if (!pvs)
        return;

    livePvs[id] = [];

    let evalStr = getPct(datum.engine, datum.eval);
    $(container).append('<h6>' + evalStr + ' PV(A) ' + '</h6><small>[D: ' + datum.depth + ' | TB: ' + datum.tbhits + ' | Sp: ' + datum.speed + ' | N: ' + datum.nodes +']</small>');

    if (Y.arrows) {
        let color = (id == 2)? 'reds': 'blues';
        if (pvs[0])
            board.addArrowAnnotation(pvs[0].from, pvs[0].to, color, board.orientation());
    }

    $(container).append(`<div class="engine-pv engine-pv-live alert alert-dark">${html}</div>`);
    livePvs[id] = pvs;
    let colorx = 0,
        x = 0;
    datum.plynum = datum.ply + 1;
    if (datum.plynum % 2 == 0)
    {
        x = datum.plynum/2;
        colorx = 1;
    }
    else
    {
        x = (datum.plynum + 1)/2;
        colorx = 0;
    }
    datum.x = x;
    if (Y.live_pv)
        addDataLive(charts.eval, datum, colorx, id);
}

// TODO: merge the functions
function updateLiveEvalDataNew(datum, _update, fen, id, _initial) {
    if (!datum || !Y.live_pv || !viewingActiveMove)
        return;

    let classhigh = '',
        container = '#white-engine-pv3',
        scolor = _WHITE;

    if (datum.color == 1)
    {
        scolor = _BLACK;
        container = '#black-engine-pv3';
        classhigh += ' lightblue';
    }

    for (let key of ['eval', 'speed', 'nodes', 'depth', 'tbhits'])
        HTML(`.${scolor}-engine-${key}`, datum[key]);

    if (DEV.eval & 1)
        LS("updateLiveEvalDataNew::: Entered for color:" + datum.color);

    let score = (parseFloat(datum.eval || 0)).toFixed(2),
        [html, pvs] = updateLiveData(datum, fen || activeFen, container, id, score);
    if (!pvs)
        return;

    let evalStr = getPct(datum.engine, datum.eval),
        addClass = 'white-engine-pv';
    if (datum.color == 0)
    {
        Class(container, '-white-engine-pv');
        Hide('#white-name-dynamic');
    }
    else
    {
        Class(container, '-black-engine-pv');
        Hide('#black-name-dynamic');
        addClass = 'black-engine-pv';
    }
    Class(container, '-alert -alert-dark');
    $(container).append('<h6>' + evalStr + ' PV(A) ' + '</h6>');
    $(container).append(`<div class="${addClass} ${classhigh} alert alert-dark">${html}</div>`);
    //updateChartData();

    datum.plynum ++;
    let x = Floor((datum.plynum + 1) / 2),
        evalData = {
            x: x,
            y: score,
            ply: datum.plynum,
            eval: score
        };

    if (prevevalData.ply != datum.plynum)
        prevevalData = {};

    if (prevevalData.eval != evalData.eval)
    {
        // LS("XXX: movecount:" + x + "datum.plynum," + datum.plynum + " ,prevevalData.eval:" + prevevalData.eval + " ,evalData.eval:" + evalData.eval);
        if (Y.live_pv)
            removeData(charts.eval, evalData, datum.color);
    }
    else if (DEV.eval & 1)
        LS(`XXX: not updating movecount=${x} : datum.plynum=${datum.plynum}`);

    prevevalData = evalData;
}

function updateLiveEval() {
    Resource(`data.json?no-cache${Now()}`, (code, data) => {
        if (code == 200) {
            updateLiveEvalData(data, 1, null, 1, 1);
            updateLiveEvalData(engine2LiveData, 1, null, 2, 1);
        }
    });

    Resource(`data1.json?no-cache${Now()}`, (code, data) => {
        engine2LiveData = data;
    });
}

function updateLiveChartData(data, contno)
{
    if (data.moves)
    {
        liveEngineEvals[contno] = data.moves;
        livePVHist[contno] = data;
        updateChartDataLive(contno);

    }
    else
        liveEngineEvals[contno] = [];
}

function updateLiveChart()
{
    Resource('liveeval.json', (code, data) => {
        if (code == 200)
            updateLiveChartData(data, 1);
    });
    Resource('liveeval1.json', (code, data) => {
        if (code == 200)
            updateLiveChartData(data, 2);
    });
}

function setLastMoveTime(data)
{
    LS("Setting last move time:" + data);
}

function checkTwitch(checkbox)
{
    let checked = checkbox.checked;
    if (!checked)
        Attrs('#twitchvid', 'src', twitchSRCIframe);

    S('#twitchvid', !checked);
    save_option('twitch_video', checked? 1: 0);
}

/**
 * Resize the window
 */
function resize() {
    board.resize();
    let height = Max(350, Round(Min(screen.availHeight, window.innerHeight) - 80));
    Style('#chatright', `height:${height}px;width:100%`);
}

function setTwitch()
{
    if (!Y.twitch_video)
        Attrs('iframe#twitchvid', 'src', twitchSRCIframe);

    S('iframe#twitchvid', !Y.twitch_video);
    Prop('#twitchcheck', 'checked', !!Y.twitch_video);
    resize();
}

function showEvalCont()
{
    S('#evalcont', Y.live_engine1 || Y.live_engine2);
    if (Y.live_engine1)
    {
        Class('#pills-eval-tab1, #pills-eval1', 'active show');
        Class('#pills-eval-tab2, #pills-eval2', '-active');
    }
    else if (Y.live_engine2)
    {
        Class('#pills-eval-tab2, #pills-eval2', 'active show');
        Class('#pills-eval-tab1, #pills-eval1', '-active');
    }
}

function liveEngine(checkbox, checknum)
{
    let ichecked = checkbox.checked? 1: 0,
        config = `live_engine${checknum}`;

    save_option(config, ichecked);
    showEvalCont();
    updateLiveEval();
    updateChartData();
}

function setLiveEngineInit(id)
{
    let getlive = Y[`live_engine${id}`],
        cont = `#liveenginecheck${id}`;

    if (getlive)
    {
        if (id == 1 || !Y.live_engine1)
            $(`#pills-tab a[href="#pills-eval${id}"]`).tab('show');
        Prop(cont, 'checked', true);
    }
    else
        Prop(cont, 'checked', false);
}

function setLiveEngine()
{
    setLiveEngineInit(1);
    setLiveEngineInit(2);
    showEvalCont();
}

function checkSort(checkbox)
{
    save_option('cross_crash', checkbox.checked? 1: 0);
    updateTables();
}

function checkLivePv(checkbox)
{
    save_option('live_pv', checkbox.checked? 0: 1);
}

function checkSound(checkbox)
{
    let checked = checkbox.checked;
    save_option('sound', checked? 1: 0);
}

function setNotationPv(checkbox)
{
    let is_check = checkbox.checked;
    save_option('notation_pv', is_check? 0: 1);
    Y.notation_pv = !is_check;
    setBoard();
}

function setNotation(checkbox)
{
    let is_check = checkbox.checked;
    save_option('notation', is_check? 1: 0);
    Y.notation = !is_check;
    setBoard();
}

/**
 * Get a highlight class
 * @param {boolean} is_pv
 */
function get_highlight(is_pv) {
    return `highlight-white highlight-${(is_pv? Y.highlight_pv: Y.highlight) || 'none'}`;
}

function setHighlightPv(value)
{
    save_option('highlight_pv', value);
    setBoard();
}

function setHighlight(value)
{
    save_option('highlight', value);
    setBoard();
}

function setMoveArrows(checkbox)
{
    save_option('arrows', checkbox.checked? 0: 1);
    setBoard();
}

function goMoveFromChart(chartx, evt)
{
    let activePoints = chartx.getElementAtEvent(evt),
        firstPoint = activePoints[0];
    if (!firstPoint)
        return;

    let plyNum = chartx.data.datasets[firstPoint._datasetIndex].data[firstPoint._index].ply;
    if (plyNum)
        $('a[ply=' + plyNum + ']').click();
}

function firstButtonMain()
{
    activePly = 1;
    handlePlyChange();
}

function firstButton()
{
    if (selectedId == 0)
        firstButtonMain();
    else if (selectedId == 'white-engine-pv')
        $('.pv-board-to-first1').click();
    else if (selectedId == 'black-engine-pv')
        $('.pv-board-to-first2').click();
}

function backButtonMain()
{
    if (activePly > 1)
        activePly--;
    handlePlyChange();
    return false;
}

function backButton()
{
    if (selectedId == 0)
        backButtonMain();
    else if (selectedId == 'white-engine-pv')
        $('.pv-board-previous1').click();
    else if (selectedId == 'black-engine-pv')
        $('.pv-board-previous2').click();
}

function forwardButtonMain()
{
    if (activePly < loadedPlies)
        activePly++;
    else
        viewingActiveMove = true;

    handlePlyChange();
    return false;
}

function forwardButton()
{
    if (selectedId == 0)
        forwardButtonMain();
    else if (selectedId == 'white-engine-pv')
        $('.pv-board-next1').click();
    else if (selectedId == 'black-engine-pv')
        $('.pv-board-next2').click();
}

function endButtonMain()
{
    onLastMove();
}

function endButton()
{
    if (selectedId == 0)
        endButtonMain();
    else if (selectedId == 'white-engine-pv')
        $('.pv-board-to-last1').click();
    else if (selectedId == 'black-engine-pv')
        $('.pv-board-to-last2').click();
}

// TODO: remove this
function tcecHandleKey(e)
{
    let keycode;
    if (!e)
        e = window.event;
    if (!e)
        return;

    keycode = e.keyCode;
    if (e.altKey || e.ctrlKey || e.metaKey)
        return !0;

    switch (keycode)
    {
    case 37:
        backButton();
        break;
    case 38:
        firstButton();
        break;
    case 39:
        forwardButton();
        break;
    case 40:
        endButton();
        break;
    default:
        return !0;
    }

    e.preventDefault();
}

function initTables()
{
    $('#event-overview').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        columns: [
        {
            field: 'TimeControl',
            title: 'TC'
        },
        {
            field: 'Termination',
            title: 'Adj Rule'
        },
        {
            field: 'movesTo50R',
            title: '50'
        },
        {
            field: 'movesToDraw',
            title: 'Draw'
        },
        {
            field: 'movesToResignOrWin',
            title: 'Win'
        },
        {
            field: 'piecesleft',
            title: 'TB'
        },
        {
            field: 'Result',
            title: 'Result'
        },
        {
            field: 'Round',
            title: 'Round'
        },
        {
            field: 'Opening',
            title: 'Opening'
        },
        {
            field: 'ECO',
            title: 'ECO'
        },
        {
            field: 'Event',
            title: 'Event'
        },
        {
            field: 'Viewers',
            title: 'Viewers'
        }],
    });

    $('#h2h').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        pagination: true,
        paginationLoop: true,
        striped: true,
        smartDisplay: true,
        sortable: true,
        pageList: [10,20,50,100],
        pageSize:10,
        rememberOrder: true,
        columns: [
        {
            field: 'Gamesort',
            title: 'sortnumber',
            visible: false,
        },
        {
            field: 'h2hrank',
            title: 'Game#',
            sortable: true,
            sorter: (a, b) => (a<b? -1: (a>b? 1: 0)),
            sortName: 'Gamesort',
            align: 'left',
        },
        {
            field: 'FixWhite',
            title: 'White',
            sortable: true,
        },
        {
            field: 'WhiteEv',
            title: 'W.Ev',
            sortable: true,
        },
        {
            field: 'BlackEv',
            title: 'B.Ev',
            sortable: true,
        },
        {
            field: 'FixBlack',
            title: 'Black',
            sortable: true,
        },
        {
            field: 'Result',
            title: 'Result',
            sortable: true,
        },
        {
            field: 'Moves',
            title: 'Moves',
            sortable: true,
        },
        {
            field: 'Duration',
            title: 'Duration',
            sortable: true,
        },
        {
            field: 'Opening',
            title: 'Opening',
            sortable: true,
            align: 'left',
        },
        {
            field: 'Termination',
            title: 'Termination',
            sortable: true,
        },
        {
            field: 'ECO',
            title: 'ECO',
            sortable: true,
        },
        {
            field: 'FinalFen',
            title: 'Final Fen',
            align: 'left',
        },
        {
            field: 'Start',
            title: 'Start',
        }]
    });

    $('#schedule').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        pagination: true,
        paginationLoop: true,
        striped: true,
        smartDisplay: true,
        sortable: true,
        pageList: [10,20,50,100],
        pageSize:10,
        rememberOrder: true,
        search: true,
        columns: [
        {
            field: 'Gamesort',
            title: 'sortnumber',
            visible: false
        },
        {
            field: 'Game',
            title: 'Game#',
            sortable: true,
            sorter: (a, b) => (a<b? -1: (a>b? 1: 0)),
            sortName: 'Gamesort',
        },
        {
            field: 'FixWhite',
            title: 'White',
            sortable: true,
        },
        {
            field: 'WhiteEv',
            title: 'Ev',
            sortable: true,
        },
        {
            field: 'FixBlack',
            title: 'Black',
            sortable: true,
        },
        {
            field: 'BlackEv',
            title: 'Ev',
            sortable: true,
        },
        {
            field: 'Result',
            title: 'Result',
            sortable: true,
        },
        {
            field: 'Moves',
            title: 'Moves',
            sortable: true,
        },
        {
            field: 'Duration',
            title: 'Duration',
            sortable: true,
        },
        {
            field: 'Opening',
            title: 'Opening',
            sortable: true,
            align: 'left',
        },
        {
            field: 'Termination',
            title: 'Termination',
            sortable: true,
        },
        {
            field: 'ECO',
            title: 'ECO',
            sortable: true,
        },
        {
            field: 'FinalFen',
            title: 'Final Fen',
            align: 'left',
        },
        {
            field: 'Start',
            title: 'Start',
        }]
    });

    $('#tf').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        striped: true,
        smartDisplay: true,
        sortable: true,
        rememberOrder: true,
        columns: [
        {
            field: 'startTime',
            title: 'Start time'
        },
        {
            field: 'endTime',
            title: 'End time'
        },
        {
            field: 'totalTime',
            title: 'Duration',
        },
        {
            field: 'avgMoves',
            title: 'Avg Moves'
        },
        {
            field: 'avgTime',
            title: 'Avg Time'
        },
        {
            field: 'whiteWins',
            title: 'White wins'
        },
        {
            field: 'blackWins',
            title: 'Black wins'
        },
        {
            field: 'drawRate',
            title: 'Draw Rate'
        },
        {
            field: 'crashes',
            title: 'Crashes'
        },
        {
            field: 'minMoves',
            title: 'Min Moves'
        },
        {
            field: 'maxMoves',
            title: 'Max Moves'
        },
        {
            field: 'minTime',
            title: 'Min Time'
        },
        {
            field: 'maxTime',
            title: 'Max Time'
        }]
    });

    $('#winner').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        pagination: true,
        paginationLoop: true,
        striped: true,
        smartDisplay: true,
        sortable: true,
        pageList: [10,20,50,100],
        pageSize:10,
        rememberOrder: true,
        search: true,
        columns: [
        {
            field: 'name',
            title: 'S#',
            visible: true
        },
        {
            field: 'winner',
            title: 'Champion',
            sortable: true
        },
        {
            field: 'runner',
            title: 'Runner-up',
            sortable: true
        },
        {
            field: 'score',
            title: 'Score',
            sortable: true
        },
        {
            field: 'date',
            title: 'Date',
            sortable: false
        }]
    });

    standColumns = [
    {
        field: 'rank',
        title: 'Rank',
        sortable: true,
        width: '4%',
    },
    {
        field: 'name',
        title: 'Engine',
        sortable: true,
        width: '18%',
    },
    {
        field: 'points',
        title: 'Points',
        sortable: true,
        width: '7%',
    }];

    $('#crash').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        striped: true,
        smartDisplay: true,
        sortable: true,
        rememberOrder: true,
        columns: [
        {
            field: 'gameno',
            title: 'G#',
        },
        {
            field: _WHITE,
            title: 'White',
        },
        {
            field: _BLACK,
            title: 'Black',
        },
        {
            field: 'reason',
            title: 'Reason',
            width: '55%'
        },
        {
            field: 'decision',
            title: 'Final decision',
            width: '15%'
        },
        {
            field: 'action',
            title: 'Action taken',
        },
        {
            field: 'result',
            title: 'Result',
        },
        {
            field: 'log',
            title: 'Log',
        }]
    });

    let crossColumns = [
    {
        field: 'rank',
        title: 'Rank',
        sortable: true,
        width: '4%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'name',
        title: 'Engine',
        sortable: true,
        width: '28%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'games',
        title: '# Games',
        sortable: true,
        width: '4%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'points',
        title: 'Points',
        sortable: true,
        width: '7%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'crashes',
        title: 'Crashes',
        sortable: true,
        width: '4%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'wins',
        title: 'Wins [W/B]',
        width: '10%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'loss',
        title: 'Loss [W/B]',
        width: '10%',
        cellStyle: crossCellformatter,
    },
    {
        field: 'sb',
        title: 'SB',
        sortable: true,
        cellStyle: crossCellformatter,
        width: '4%',
    },
    {
        field: 'elo',
        title: 'Elo',
        cellStyle: crossCellformatter,
        sortable: true,
        width: '5%',
    },
    {
        field: 'elo_diff',
        title: 'Diff [Live]',
        width: '7%',
        cellStyle: crossCellformatter,
    }];

    $('#crosstable').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        columns: crossColumns,
        sortName: 'rank'
    });

    if (virtual_init_tables)
        virtual_init_tables();

    // add diagonal scrolling
    Class('.fixed-table-body', 'scroller');
    Events('.scroller', '!touchstart touchmove touchend', () => {});
    Events('.scroller', 'mousedown mouseenter mouseleave mousemove mouseup touchstart touchmove touchend', e => {
        touch_handle(e);
    }, {passive: false});

    // hack
    _('#pills-stand-tab').click();
}

function removeClassEngineInfo(cont)
{
    Class(cont, '-d-sm-none -d-md-none -d-lg-none -d-xl-none');
}

function addClassEngineInfo(cont)
{
    Class(cont, 'd-sm-none d-md-none d-lg-none d-xl-none');
}

function showEngInfo()
{
    hideDownPv = 1;
    for (let i = 1 ; i < 5 ; i++)
    {
        removeClassEngineInfo('#boardinfod2' + i);
        removeClassEngineInfo('#boardinfod1' + i);
    }
    save_option('top_tab', 2);
}

function hideEngInfo()
{
    hideDownPv = 0;
    for (let i = 1 ; i < 5 ; i++)
    {
        addClassEngineInfo('#boardinfod2' + i);
        addClassEngineInfo('#boardinfod1' + i);
    }
    save_option('top_tab', 1);
}

function toggleTheme()
{
    save_option('dark_mode', (Y.dark_mode == 20)? 10: 20);
    setDarkLight();
    updateTables();
    $(".navbar-toggle").click();
}

/**
 * Hide the banner
 * @param {number} timeout in seconds
 */
function hideBanner(timeout=30)
{
    add_timeout('banner', () => {Hide('#note');}, timeout * 1000);
}

function showBanner(data)
{
    Show('#note');
    _("#notetext").textContent = data.message;
    hideBanner(data.timeout);
}

function setCheckBoardMiddle(value, id)
{
    Class('#middle-data-column', 'order-first', value);
    Prop(id, 'checked', !!value);
    save_option('board_middle', value? 1: 0);
}

function checkBoardMiddle(checkbox)
{
    setCheckBoardMiddle(checkbox.checked? 1: 0, '#middlecheck');
}

function scheduleToTournamentInfo(schedJson)
{
    let end, start;
    if (schedJson.length > 0)
    {
        let first = schedJson[0],
            last = schedJson[schedJson.length - 1];
        start = first.Start;
        if (last.Start)
            end = last.Start;
    }

    let data = {
        avgMoves: 0,
        avgTime: new Date(0),
        blackWins: 0,
        crashes: [0, []],
        drawRate: 0,
        endTime: 0,
        maxMoves: [0,-1],
        maxTime: ["00:00:00", -1],
        minMoves: [9999999, -1],
        minTime: ["99:59:59", -1],
        startTime: getLocalDate(start),
        totalTime: -1,
        whiteWins: 0,
        winRate: 0,
    };

    let length = schedJson.length,
        avgTime = 0,
        compGames = 0;

    for (let i = 0; i < length; i++)
    {
        let cur = schedJson[i];
        cur.Game = i + 1;
        if (cur.Moves && !crash_re.test(cur.Termination)) {
            data.crashes[0] ++;
            data.crashes[1].push(cur.Game);
        }
        if (cur.Moves != null) {
            compGames ++;
            if (cur.Moves < data.minMoves[0])  {
                data.minMoves = [cur.Moves, cur.Game];
            }
            if (cur.Moves > data.maxMoves[0])  {
                data.maxMoves = [cur.Moves, cur.Game];
            }
            data.avgMoves += cur.Moves;
        }

        if (cur.Duration != null) {
            if (cur.Duration < data.minTime[0])  {
                data.minTime = [cur.Duration, cur.Game];
            }
            if (cur.Duration > data.maxTime[0])  {
                data.maxTime = [cur.Duration, cur.Game];
            }
            avgTime += hmsToSecondsOnly(cur.Duration);
        }

        if (cur.Result == '1-0')
            data.whiteWins ++;
        else if (cur.Result == '0-1')
            data.blackWins ++;
    }

    let draws = compGames - data.whiteWins - data.blackWins;

    Assign(data, {
        avgMoves: Round(data.avgMoves / compGames),
        avgTime: hhmm(avgTime / compGames),
        blackWins: data.blackWins + ' [ ' + data.winRateB + ' ]',
        drawRate: divide2Decimals(draws * 100, compGames) + "%",
        endTime: getLocalDate(start, avgTime / compGames * length / 60),
        totalTime: hhmmss(avgTime / compGames * length),
        whiteWins: data.whiteWins + ' [ ' + data.winRateW + ' ]',
        winRateB: parseFloat(divide2Decimals(data.blackWins *100, compGames)).toFixed(1) + "%",
        winRateW: divide2Decimals(data.whiteWins * 100, compGames) + "%",
    });
    return data;
}

function divide2Decimals(num,div)
{
    return Round((num +0.000001) / div * 100) / 100;
}

function hmsToSecondsOnly(str) {
    let p = str.split(':'),
        s = 0,
        m = 1;

    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }
    return s;
}

function hhmm(secs)
{
    let minutes = Floor(secs / 60);
    secs = secs % 60;
    let hours = Floor(minutes / 60);
    minutes = minutes % 60;
    return `${Pad(hours)}:${Pad(minutes)}`;
}

function hhmmss(secs)
{
    let minutes = Floor(secs / 60);
    secs = secs % 60;
    let hours = Floor(minutes / 60);
    minutes = minutes % 60;
    let days = Floor(hours / 24);
    hours = hours % 24;
    if (days > 0)
        return `${Pad(days)}d, ${Pad(hours)}:${Pad(minutes)}:${Pad(secs)}`;
    return `${Pad(hours)}:${Pad(minutes)}:${Pad(secs)}`;
}

function getLocalDate(startDate, minutes)
{
    let momentDate = moment(startDate, 'HH:mm:ss on YYYY.MM.DD'),
        timezoneDiff = moment().utcOffset() * 60 * 1000 + timezoneDiffH * 3600 * 1000;
    if (minutes)
        momentDate.add(minutes * 60 * 1000);

    momentDate.add(timezoneDiff);
    return momentDate.format('HH:mm:ss on YYYY.MM.DD');
}

function setTwitchChange(data)
{
    updateTourInfo(data);
    let newtwitchChatUrl = 'https://www.twitch.tv/embed/' + data.twitchaccount + '/chat';
    if (newtwitchChatUrl == twitchChatUrl)
        return;

    twitchChatUrl = newtwitchChatUrl;
    setTwitchChatUrl(Y.dark_mode == 20);
}

function getImg(engine)
{
    return '<div class="right-align"><img class="right-align-pic" src="image/engine/'+ get_short_name(engine) +'.jpg" />' + '<a class="right-align-name">' + engine + '</a></div>';
}

function updateCrashData(data)
{
    let scdata = [];

    Keys(data).forEach(key => {
        let engine = data[key];

        engine.gameno = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass[3] + ';"onclick="openCross(' + 0 + ',' + engine.gameno + ')">' + engine.gameno + '</a>';
        let link = "\'" + engine.log + "\'";
        engine.log = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass[1] + ';"onclick="openLinks(' + link + ')">' + engine.log + '</a>';
        if (engine.gpulog != undefined)
        {
            link = "\'" + engine.gpulog + "\'";
            engine.gpulog = '<a title="TBD" style="cursor:pointer; color: ' + gameArrayClass[1] + ';"onclick="openLinks(' + link + ')">' + engine.gpulog + '</a>';
        }
        scdata.push(engine);
    });

    $('#crash').bootstrapTable('load', scdata);
}

function updateCrash()
{
    Resource('crash.json', (code, data) => {
        if (code == 200)
            updateCrashData(data);
    });
}

function eventCrosstableWrap()
{
    if (tourInfo)
    {
        if (tourInfo.cup != 1)
        {
            Hide('#bracketdiv, #eventdiv');
            Show('.nav-pills a[href="#pills-stand"]');
            return;
        }
    }

    Resource('crash.json', (_code, data) => {
        // handle success + error
        bracketDataMain(data);
    });
}

function bracketDataMain(data)
{
    if (data)
    {
        bigData.teams = data.teams;
        roundResults = data.matchresults;
        bigData.results = data.results;
    }
    if (!roundResults)
        return;
    for (let i = roundResults.length + 1; i <= 32; i++)
    {
        roundResults[i-1] = [
            {lead:-1, score: -1},
            {lead:-1, score: -1},
        ];
    }

    if (!bigData.teams)
        return;
    for (let i = bigData.teams.length + 1; i <= 16; i++)
    {
        bigData.teams[i-1] = [
            {name: getSeededName(teamsx[i-1][0][0]), flag: get_short_name(teamsx[i-1][0][0]), score: -1, rank: '1', date: '', lead: 0},
            {name: getSeededName(teamsx[i-1][1][0]), flag: get_short_name(teamsx[i-1][1][0]), score: -1, rank: '2', date: '', lead: 0},
        ];
    }

    drawBracket1();
    eventCrosstable(data.EventTable);
}

function drawBracket1()
{
    let roundNox = 2;
    getDateRound();

    function edit_fn(_container, _data, _doneCb) {
        return;
    }

    function render_fn2(container, data, _score, state) {
        let localRound = parseInt(roundNox / 2) - 1,
            isFirst = roundNox % 2,
            dataName = 0;

        //LS("Came to round: " + roundNox + " data.name is: " + data.name);
        roundNox ++;
        if (data && data.name)
        {
            data.origname = data.name;
            dataName = getSeededName(data.name);
        }

        switch(state) {
        case "empty-bye":
            container.append("No team");
            return;
        case "empty-tbd":
            if (roundNox%2 == 1)
            {
               let befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRound + 1) + '</a> ';
               befStr += '</div>';
               $(befStr).insertBefore(container);
            }
            container.append("TBD");
            return;

        case "entry-no-score":
        case "entry-default-win":
        case "entry-complete":
            if (roundResults[localRound][isFirst].name != undefined)
            {
                if (get_short_name(roundResults[localRound][isFirst].name) != get_short_name(data.origname))
                    isFirst = isFirst? 0: 1;
            }
            let scoreL = roundResults[localRound][isFirst].score;
            if (scoreL >= 0)
            {
                let appendStr = '',
                    lead = roundResults[localRound][isFirst].lead,
                    manual = roundResults[localRound][isFirst].manual;
                if (manual == 1)
                {
                    appendStr = '<div class="bracket-name"> <a> ' + dataName + '</a> </div>'
                        + '<div class="bracket-score orange"> <a> (' + scoreL + ')</a> </div>';
                    $(container).parent().addClass('bracket-name-orange');
                }
                else if (lead == 0)
                {
                    appendStr = '<div class="bracket-name"> <a> ' + dataName + '</a> </div>'
                        + '<div class="bracket-score redb "> <a> (' + scoreL + ')</a> </div>';
                    $(container).parent().addClass('bracket-name-red');
                }
                else if (lead == 1)
                {
                    appendStr = '<div class="bracket-name"> <a> ' + dataName + '</a> </div>'
                        + '<div class="bracket-score green"> <a> (' + scoreL + ')</a> </div>';
                    $(container).parent().addClass('bracket-name-green');
                }
                else
                {
                    if (scoreL == undefined)
                        scoreL = 0;
                    appendStr = '<div class="bracket-name"> <a> ' + dataName + '</a> </div>'
                        + '<div class="bracket-score"> <a> (' + scoreL + ')</a> </div>';
                    $(container).parent().addClass('bracket-name-current');
                }
                if (roundNox%2 == 1)
                {
                    let localRoundL = localRound + 1;
                    if (localRoundL == 31)
                    {
                        localRoundL = 32;
                    }
                    else if (localRoundL == 32)
                    {
                        localRoundL = 31;
                    }
                    let befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRoundL) + '</a> ';
                    if (roundDate[localRound] != undefined)
                    {
                        //befStr += '<a> ' + roundDate[localRound] + '</a> </div>';
                        befStr += '</div>';
                    }
                    else
                    {
                        befStr += '</div>';
                    }
                    $(befStr).insertBefore(container);
                }
                container.append('<img class="bracket-material" src="image/engine/'+ data.flag +'.jpg" />').append(appendStr);
            }
            else
            {
                let localRoundL = localRound + 1;
                if (localRoundL == 31)
                {
                    localRoundL = 32;
                }
                else if (localRoundL == 32)
                {
                    localRoundL = 31;
                }
                if (roundNox % 2 == 1)
                {
                    let befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRoundL) + '</a> ';
                    befStr += '</div>';
                    $(befStr).insertBefore(container);
                }
                container
                    .append('<img class="bracket-material" src="image/engine/'+data.flag+'.jpg" />')
                    .append('<div class="bracket-name"> <a> ' + dataName + '</a> </div>');
            }

            if (roundNox > 64)
                $(container).parent().append('<div class="bubblex third">3rd</div>');
            return;
        }
    }

    let direction = 'lr';
    try {
        $(function () {
            $('#bracket').bracket({
                centerConnectors: true,
                dir: direction,
                teamWidth: 220,
                scoreWidth: 35,
                matchMargin: 45,
                roundMargin: 18,
                init: bigData,
                // skipConsolationRound: true,
                decorator: {edit: edit_fn, render: render_fn2}
            });
        });
    }
    catch (err)
    {
        LS(`Error in bracket`);
        LS(err);
    }
}

function getSeededName(name)
{
    let engineName;

    Keys(teamsx).forEach(key => {
        let engine = teamsx[key];

        if (get_short_name(engine[0][0]).toUpperCase() == get_short_name(name).toUpperCase())
        {
            //engineName = "S#" + engine[0][1] + " " + engine[0][0];
            engineName = engine[0][0];
            engineName = "#" + engine[0][1] + " " + engine[0][0];
            if (engineName.length > 24)
                engineName = engineName.slice(0, 22) + "..";
            return false;
        }
        else if (get_short_name(engine[1][0]).toUpperCase() == get_short_name(name).toUpperCase())
        {
            //engineName = "S#" + engine[1][1] + " " + engine[1][0];
            engineName = engine[1][0];
            engineName = "#" + engine[1][1] + " " + engine[1][0];
            if (engineName.length > 24)
                engineName = engineName.slice(0, 22) + "..";
            return false;
        }
    });

    return engineName || name;
}

function getDateRound()
{
    let roundDate = [],
        diffData = 0;

    for (let x = 0 ; x <= totalEvents; x++)
    {
        if (roundDateMan[x])
            roundDate[x] = getCurrDate(roundDateMan[x], 0);
        else
        {
            let y = x + 1;
            if (diffData)
            {
                if (y % 2 == 1)
                    roundDate[x] = getCurrDate(startDateR1, 1440 * (parseInt(y/2)));
                else
                    roundDate[x] = getCurrDate(startDateR2, 1440 * (parseInt((y-1)/2)));
            }
            else
            {
                let gameDiffL = gameDiff * 8 / (60 * 1000);
                // gameDiffL = gameDiffL/1.5;
                roundDate[x] = getCurrDate(startDateR1, gameDiffL * x / 2);
            }
        }
    }
}

function getCurrDate(currdate, mins)
{
    let timezoneDiff = moment().utcOffset() * 60 * 1000 + mins * 60 * 1000,
        momentDate = moment(currdate, 'HH:mm:ss on YYYY.MM.DD');
    momentDate.add(timezoneDiff);
    return momentDate.format('MMM DD YYYY, HH:mm');
}

async function eventCrosstable(data)
{
    if (!data)
        return;

    let divname = '#crosstableevent',
        standings = [];

    $(divname).bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        columns: columnsEvent,
        sortName: 'rank',
        sortOrder: 'desc'
    });

    eventCross[0] = 0;

    // CHECK THIS
    Keys(data).forEach((key, id) => {
        let matchdum = data[key];
        Assign(matchdum, {
            match: id + 1,
            Runner: getImg(matchdum.Runner),
            Winner: getImg(matchdum.Winner),
        });
        standings.push(matchdum);
        eventCross[id + 1] = eventCross[id] + parseInt(matchdum.Games);
    });

    $(divname).bootstrapTable('load', standings);
}

function formatterEvent(value, row, index, _field) {
    let retStr = '',
        countGames = 0,
        gameArray =  row.Gamesno.split(",");

    Keys(value).forEach(key => {
        let engine = value[key],
            gameX = parseInt(countGames / 2),
            gameXColor = parseInt(gameX % 3);

        if (engine == "=")
        {
            engine = '&frac12';
            gameXColor = 2;
        }
        else
            gameXColor = parseInt(engine);

        let gameNum = gameArray[key];
        if (retStr)
            retStr += ' ';
        retStr += '<a title="' + gameNum + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCross(' + index + ',' + gameNum + ')">' + engine + '</a>';

        countGames ++;
        if (countGames % 8 == 0)
            retStr += '<br />';
    });

    return retStr;
}

/**
 * Show a popup with the engine info
 * @param {string} scolor white, black
 * @param {Event} e
 */
function popup_engine_info(scolor, e) {
    let show,
        popup = _('#popup'),
        type = e.type;

    if (type == 'mouseleave')
        show = false;
    else if (scolor == 'popup')
        show = true;
    else {
        let title = Title(scolor),
            engine = prevPgnData.Headers[title].split(' '),
            options = prevPgnData[`${title}EngineOptions`],
            lines = options.map(option => [option.Name, option.Value]);

        // add engine + version
        lines.splice(0, 0, ['Engine', engine[0]], ['Version', engine.slice(1).join(' ')]);
        lines = lines.flat().map(item => `<div>${item}</div>`);

        HTML(popup, `<grid class="grid2">${lines.join('')}</grid>`);

        // place the popup in a visible area on the screen
        let x = e.clientX + 10,
            y = e.clientY + 10,
            x2 = 0,
            y2 = 0;
        if (x >= window.innerWidth / 2) {
            x -= 20;
            x2 = -100;
        }
        if (y >= window.innerHeight / 2) {
            y -= 20;
            y2 = -100;
        }

        Style(popup, `transform:translate(${x}px,${y}px) translate(${x2}%, ${y2}%)`);
        show = true;
    }

    Class(popup, 'popup-show', show);
    // trick to be able to put the mouse on the popup and copy text
    if (show) {
        clear_timeout('popup-engine');
        Class(popup, 'popup-enable');
    }
    else
        add_timeout('popup-engine', () => {Class(popup, '-popup-enable');}, 500);
}

/**
 * Set UI events
 */
function set_ui_events() {
    $(document).on('click', '.set-pv-board', function(e) {
        let moveKey = $(this).attr('move-key') * 1,
            pvColor = $(this).attr('color'),
            color = COLORS[pvColor],
            hist = $(this).attr('hist');

        if (color == LIVE)
        {
            $('#v-pills-pv-analys-tab').click();

            let liveKey = $(this).attr('engine');
            LS("liveKey is :" + liveKey);
            activePv = livePvs[liveKey];
            if (hist)
            {
                if (activePvH && activePvH[liveKey] && (activePvH[liveKey].length > 0))
                    setPvFromKey(moveKey, color, activePvH[liveKey]);
            }
            else
                setPvFromKey(moveKey, color, activePv);
        }
        else
        {
            if (hideDownPv == 0)
                $('#v-pills-pv-tab').click();

            activePv = all_pvs[color].slice();
            setPvFromKey(moveKey, color);
        }

        e.preventDefault();
        return false;
    });

    $(document).on('click', '.change-move', function(e) {
        let clickedPly = $(this).attr('ply'),
            clickedFen = $(this).attr('fen');
        LS(`clickedPly=${clickedPly} : clickedFen=${clickedFen}`);
        moveFrom = $(this).attr('from');
        moveTo = $(this).attr('to');

        viewingActiveMove = false;

        Class('.active-move', '-active-move');
        Class(this, 'active-move');

        show_move('#board', moveFrom, moveTo);
        squareToHighlight = moveTo;

        board.position(clickedFen, false);
        // xboards.board.set_fen(clickedFen);

        currentPosition = clickedFen;
        activePly = clickedPly;
        e.preventDefault();
        listPosition();

        if (clickedPly == loadedPlies)
        {
            viewingActiveMove = true;
            Class('#newmove', 'd-none');
            newMovesCount = 0;
            Attrs('#newmove', 'data-count', 0);
        }

        handlePlyChange(false);
        return false;
    });

    $(document).on('click', '#board-to-first', function(e) {
        activePly = 1;
        handlePlyChange();
        e.preventDefault();
    });

    $(document).on('click', '#board-previous', function(e) {
        if (activePly > 1)
            activePly--;
        handlePlyChange();
        e.preventDefault();
        return false;
    });

    $(document).on('click', '#board-autoplay', function(e) {
        e.preventDefault();
        Class('#board-autoplay i', '-fa-pause fa-play', isAutoplay);
        if (isAutoplay) {
            isAutoplay = false;
        } else {
            isAutoplay = true;
            boardAutoplay();
        }
        return false;
    });

    $(document).on('click', '#board-next', function(e) {
        if (activePly < loadedPlies) {
            activePly ++;
        } else {
            viewingActiveMove = true;
        }
        handlePlyChange();
        e.preventDefault();
        return false;
    });

    $(document).on('click', '#board-to-last', function(e) {
        onLastMove();
        e.preventDefault();
        return false;
    });

    $(document).on('click', '#board-reverse', function(e) {
        board.flip();

        let oldOrientation = (board.orientation() == _BLACK)? _WHITE: _BLACK,
            newOrientation = board.orientation();

        $('.board-bottom-engine-eval.' + oldOrientation + '-engine-name').removeClass(oldOrientation + '-engine-name').addClass(newOrientation + '-engine-name');
        $('.board-bottom-engine-eval.' + oldOrientation + '-time-remaining').removeClass(oldOrientation + '-time-remaining').addClass(newOrientation + '-time-remaining');
        $('.board-bottom-engine-eval.' + oldOrientation + '-time-used').removeClass(oldOrientation + '-time-used').addClass(newOrientation + '-time-used');
        $('.board-bottom-engine-eval.' + oldOrientation + '-engine-eval').removeClass(oldOrientation + '-engine-eval').addClass(newOrientation + '-engine-eval');

        $('.board-top-engine-eval.' + newOrientation + '-engine-name').removeClass(newOrientation + '-engine-name').addClass(oldOrientation + '-engine-name');
        $('.board-top-engine-eval.' + newOrientation + '-time-remaining').removeClass(newOrientation + '-time-remaining').addClass(oldOrientation + '-time-remaining');
        $('.board-top-engine-eval.' + newOrientation + '-time-used').removeClass(newOrientation + '-time-used').addClass(oldOrientation + '-time-used');
        $('.board-top-engine-eval.' + newOrientation + '-engine-eval').removeClass(newOrientation + '-engine-eval').addClass(oldOrientation + '-engine-eval');
        Class('#board-top-engine-eval', `${oldOrientation}Fill -${newOrientation}Fill`);
        Class('#board-bottom-engine-eval', `${newOrientation}Fill -${oldOrientation}Fill`);

        setInfoFromCurrentHeaders();
        handlePlyChange(false);
        e.preventDefault();
        return false;
    });

    $("#schedule").on("click-cell.bs.table", function (field, value, row, $el) {
        if ($el.agame <= gamesDone)
           openCross(0, $el.agame);
    });

    //
    $('#pv-board-black').click(function(e) {
        activePv = all_pvs[BL];
        setPvFromKey(0, LIVE, all_pvs[BL]);
        e.preventDefault();
        return false;
    });

    $('#pv-board-white').click(function(e) {
        activePv = all_pvs[WH];
        setPvFromKey(0, LIVE, all_pvs[WH]);
        e.preventDefault();
        return false;
    });

    $('#pv-board-live1').click(function(e) {
        setPvFromKey(0, LIVE, livePvs[1]);
        e.preventDefault();
        return false;
    });

    $('#pv-board-live2').click(function(e) {
        setPvFromKey(0, LIVE, livePvs[2]);
        e.preventDefault();
        return false;
    });

    $('#pv-board-to-first').click(function(e) {
        setPvFromKey(0, LIVE);
        e.preventDefault();
        return false;
    });

    $('#pv-board-previous').click(function(e) {
        if (activePvKey[2] > 0)
            setPvFromKey(activePvKey[2] - 1, LIVE);
        e.preventDefault();
        return false;
    });

    $('#pv-board-next').click(function(e) {
        if (activePvKey[2] < choosePv.length)
            setPvFromKey(activePvKey[2] + 1, LIVE);
        e.preventDefault();
        return false;
    });

    $('.pv-board-to-first1').click(function(e) {
        setPvFromKey(0, WH);
        e.preventDefault();
        return false;
    });

    $('.pv-board-to-first2').click(function(e) {
        setPvFromKey(0, BL);
        e.preventDefault();
        return false;
    });

    $('.pv-board-previous1').click(function(e) {
        if (activePvKey[0] > 0)
            setPvFromKey(activePvKey[0] - 1, WH);
        e.preventDefault();
        return false;
    });

    $('.pv-board-previous2').click(function(e) {
        if (activePvKey[1] > 0)
            setPvFromKey(activePvKey[1] - 1, BL);
        e.preventDefault();
        return false;
    });

    $('.pv-board-autoplay1').click(function(e) {
        Class('.pv-board-autoplay1 i', '-fa-pause fa-play', isPvAutoplay[0]);
        if (isPvAutoplay[0])
            isPvAutoplay[0] = false;
        else {
            isPvAutoplay[0] = true;
            pvBoardautoplay(0, WH, all_pvs[WH]);
        }
        e.preventDefault();
        return false;
    });

    $('.pv-board-autoplay2').click(function(e) {
        Class('.pv-board-autoplay1 i', '-fa-pause fa-play', isPvAutoplay[1]);
        if (isPvAutoplay[1])
            isPvAutoplay[1] = false;
        else {
            isPvAutoplay[1] = true;
            pvBoardautoplay(1, BL, all_pvs[BL]);
        }
        e.preventDefault();
        return false;
    });

    //
    $('.pv-board-next1').click(function(e) {
        if (activePvKey[0] < all_pvs[WH].length)
            setPvFromKey(activePvKey[0] + 1, WH);
        e.preventDefault();
        return false;
    });

    $('.pv-board-next2').click(function(e) {
        if (activePvKey[1] < all_pvs[BL].length) {
            setPvFromKey(activePvKey[1] + 1, BL);
        }
        e.preventDefault();
        return false;
    });

    $('.pv-board-to-last1').click(function(e) {
        setPvFromKey(all_pvs[WH].length - 1, WH);
        e.preventDefault();
        return false;
    });

    $('.pv-board-to-last2').click(function(e) {
        setPvFromKey(all_pvs[BL].length - 1, BL);
        e.preventDefault();
        return false;
    });

    $('.pv-board-reverse1').click(function(e) {
        pvBoardw.flip();
        pvBoardwc.flip();
        e.preventDefault();
        return false;
    });

    $('.pv-board-reverse2').click(function(e) {
        pvBoardb.flip();
        pvBoardbc.flip();
        e.preventDefault();
        return false;
    });

    $('#pv-board-reverse').click(function(e) {
        pvBoarda.flip();
        e.preventDefault();
        return false;
    });

    // charts
    Keys(charts).forEach(key => {
        C(`#chart-${key}`, e => {
            goMoveFromChart(charts[key], e);
        });
    });

    // popups
    Events('#black-engine-info, #popup, #white-engine-info', 'click mouseenter mousemove mouseleave', function(e) {
        popup_engine_info(this.id.split('-')[0], e);
    });
    C('.popup-close', function() {
        show_info(false);
        let parent = Parent(this, 'div|vert', 'popup');
        if (parent)
            Class(parent, '-popup-enable -popup-show');
    });
    C('#info', () => {
        show_info(true);
    });
    C('#overlay', () => {
        show_info(false);
    });
}

/**
 * Start TCEC
 */
function start_tcec() {
    game = new Chess();
    create_boards();
}

/**
 * Init structures
 */
function startup_tcec() {
    //
    Assign(DEFAULTS, {
        dark_mode: 10,
        top_tab: 1,
    });
}
