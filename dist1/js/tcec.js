boardEl = $('#board');
pvBoardEl = $('#pv-board');

var squareToHighlight = '';
var pvSquareToHighlight = '';
var crossTableInitialized = false;
var standTableInitialized = false;
var gameActive = false;

var squareClass = 'square-55d63';

var whiteToPlay = true;
var whiteTimeRemaining = 0;
var blackTimeRemaining = 0;
var whiteTimeUsed = 0;
var blackTimeUsed = 0;
var whiteMoveStarted = 0;
var blackMoveStarted = 0;
var blackClockInterval = '';
var whiteClockInterval = '';

var defaultStartTime = 0;

var viewingActiveMove = true;
var loadedPlies = 0;
var activePly = 0;

var loadedPgn = '';

var activeFen = '';
var lastMove = '';
var currentPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var bookmove = 0;

var darkMode = 0;
var pageNum = 1;
var gamesDone = 0;
var timeDiff = 0;
var timeDiffRead = 0;
var prevPgnData = 0;
var playSound = 1;
var reverseBracketSet = 0;
var lastGame = 0;

var debug = 0;

var totalEvents = 34;
var manualGamesdecided = 0;
var mandataGlobal = null;
var eventCrossTableInitial = 0;

var currentMatch = 0;
var liveEngineEval = [];
var livePVHist = 0;
var gameDiff = 0;

var onMoveEnd = function() {
  boardEl.find('.square-' + squareToHighlight)
    .addClass('highlight-white');
};

var onMoveEndPv = function() {
  pvBoardEl.find('.square-' + pvSquareToHighlight)
    .addClass('highlight-white');
}

function plog(message, debugl)
{
   if (debugl == undefined)
   {
      debugl = 1;
   }

   if (debugl <= debug)
   {
      console.log (message);
   }
}

function updateAll()
{
   updatePgn(1);
   updateTables();
}

function updatePgnData(data, read)
{
   loadedPgn = data;
   timeDiffRead = read;

   if (!prevPgnData)
   {
      updateEngineInfo('#whiteenginetable', '#white-engine-info', data.WhiteEngineOptions);
      updateEngineInfo('#blackenginetable', '#black-engine-info', data.BlackEngineOptions);
   }
   else
   {
      if (data.WhiteEngineOptions != prevPgnData.WhiteEngineOptions)
      {
         updateEngineInfo('#whiteenginetable', '#white-engine-info', data.WhiteEngineOptions);
      }
      if (data.BlackEngineOptions != prevPgnData.BlackEngineOptions)
      {
         updateEngineInfo('#blackenginetable', '#black-engine-info', data.BlackEngineOptions);
      }
   }
   setPgn(data);
}

function updatePgn(resettime)
{
   if (resettime != undefined)
   {
      timeDiffRead = 0;
   }

   axios.get('live.json?no-cache' + (new Date()).getTime())
   .then(function (response)
   {
      if (timeDiffRead == 0)
      {
         var milliseconds = (new Date).getTime();
         var lastMod = new Date(response.headers["last-modified"]);
         var currTime = new Date(response.headers["date"]);
         timeDiff = currTime.getTime() - lastMod.getTime();
      }
      prevPgnData = 0;
      updatePgnData(response.data, 0);
   })
   .catch(function (error) {
     // handle error
      plog(error);
   });
}

function startClock(color, currentMove, previousMove) {
  stopClock('black');
  stopClock('white');

  previousTime = previousMove.tl;
  currentTime = currentMove.tl;

  if (color == 'white') {
    whiteTimeRemaining = Math.ceil(previousTime / 1000) * 1000;
    blackTimeRemaining = Math.ceil(currentTime / 1000) * 1000;

    if (isNaN(blackTimeRemaining))
    {
       blackTimeRemaining = defaultStartTime;
    }

    if (isNaN(whiteTimeRemaining))
    {
       whiteTimeRemaining = defaultStartTime;
    }

    setTimeRemaining('black', blackTimeRemaining);

    whiteMoveStarted = moment();
    updateClock('white');

    whiteClockInterval = setInterval(function() { updateClock('white') }, 1000);
    if (currentMove.mt != undefined)
    {
       setTimeUsed('black', currentMove.mt);
    }

    $('.white-to-move').show();
  } else {
    whiteTimeRemaining = Math.ceil(currentTime / 1000) * 1000;
    blackTimeRemaining = Math.ceil(previousTime / 1000) * 1000;

    if (isNaN(blackTimeRemaining))
    {
       blackTimeRemaining = defaultStartTime;
    }

    if (isNaN(whiteTimeRemaining))
    {
       whiteTimeRemaining = defaultStartTime;
    }

    setTimeRemaining('white', whiteTimeRemaining);

    blackMoveStarted = moment();

    updateClock('black');

    blackClockInterval = setInterval(function() { updateClock('black') }, 1000);
    if (currentMove.mt != undefined)
    {
       setTimeUsed('white', currentMove.mt);
    }

    $('.black-to-move').show();
  }
}

function stopClock(color) {
  if (color == 'white') {
    clearInterval(whiteClockInterval);
    $('.white-to-move').hide();
  } else {
    clearInterval(blackClockInterval);
    $('.black-to-move').hide();
  }
}

function updateClock(color) {
  currentTime = moment();

  if (color == 'white') {
    var diff = currentTime.diff(whiteMoveStarted-timeDiff);
    var ms = moment.duration(diff);

    whiteTimeUsed = ms;
    tempTimeRemaning = whiteTimeRemaining - whiteTimeUsed;

    setTimeUsed(color, whiteTimeUsed);
    setTimeRemaining(color, tempTimeRemaning);
  } else {
    var diff = currentTime.diff(blackMoveStarted-timeDiff);
    var ms = moment.duration(diff);

    blackTimeUsed = ms;
    tempTimeRemaning = blackTimeRemaining - blackTimeUsed;

    setTimeUsed(color, blackTimeUsed);
    setTimeRemaining(color, tempTimeRemaning);
  }
}

function secFormatNoH(timeip)
{
    var sec_num = parseInt(timeip/1000, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

function secFormat(timeip)
{
    var sec_num = parseInt(timeip/1000, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

function setTimeRemaining(color, time)
{
  if (time < 0) {
    time = 0;
  }

  if (viewingActiveMove) {
    $('.' + color + '-time-remaining').html(secFormat(time));
  }
}

function setTimeUsed(color, time) {
  if (viewingActiveMove) {
    $('.' + color + '-time-used').html(secFormatNoH(time));
  }
}

var userCount = 0;
function setUsers(data)
{
   userCount = data.count;
   lastGame = data.gamesdone;
   plog ("Setting viewers to userCount:" + userCount, 1);
   try
   {
      $('#event-overview').bootstrapTable('updateCell', {index: 0, field: 'Viewers', value: userCount});
   }
   catch(err)
   {
      plog ("Unable to update usercount");
   }
}

var newMovesCount = 0;

function setPgn(pgn)
{
   var currentPlyCount = 0;

   pgn.Headers.Roundx = 0;

   if (!viewingActiveMove)
   {
      $('#newmove').removeClass('d-none');
      newMovesCount = newMovesCount + 1;
      $('#newmove').attr('data-count', newMovesCount);
   }
   else
   {
      $('#newmove').addClass('d-none');
      newMovesCount = 0;
      $('#newmove').attr('data-count', 0);
   }

   if (pgn.gameChanged)
   {
      prevPgnData = 0;
   }
   else
   {
      if (prevPgnData)
      {
         if (prevPgnData.Moves.length < pgn.lastMoveLoaded)
         {
            plog("Calling updateAll1", 0);
            setTimeout(function() { updateAll(); }, 100);
            return;
         }
         else if (parseFloat(prevPgnData.Headers.Round) != parseFloat(pgn.Headers.Round))
         {
            plog("Calling updateAll2", 0);
            setTimeout(function() { updateAll(); }, 100);
            return;
         }
      }
   }

   if (prevPgnData)
   {
      _.each(pgn.Moves, function(move, key) {
         if (typeof move.Moveno != 'undefined' && parseInt(move.Moveno) > 0)
         {
            if (!prevPgnData.Moves[key])
            {
               prevPgnData.Moves.push(pgn.Moves[key]);
            }
         }
      });
      prevPgnData.BlackEngineOptions = pgn.BlackEngineOptions;
      prevPgnData.WhiteEngineOptions = pgn.WhiteEngineOptions;
      prevPgnData.Headers = pgn.Headers;
      pgn = prevPgnData;
      loadedPgn = prevPgnData;
   }
   else
   {
      if (typeof pgn.Moves != 'undefined')
      {
         prevPgnData = pgn;
      }
   }

   if (typeof pgn.Moves != 'undefined')
   {
      currentPlyCount = pgn.Moves.length;
   }

  if (typeof pgn.Headers != 'undefined') {
     var moveFrom = '';
     var moveTo = '';
     if (typeof pgn.Moves != 'undefined' && pgn.Moves.length > 0) {
       currentPosition = pgn.Moves[pgn.Moves.length-1].fen;
       moveFrom = pgn.Moves[pgn.Moves.length-1].from;
       moveTo = pgn.Moves[pgn.Moves.length-1].to;

       currentGameActive = (pgn.Headers.Termination == 'unterminated');
       whiteToPlay = (currentPlyCount % 2 == 0);
     }
  }

  if (!currentGameActive) {
    stopClock('white');
    stopClock('black');
  }

  if (currentGameActive) {
    if (whiteToPlay) {
      stopClock('black');
    } else {
      stopClock('white');
    }
  }

  if (loadedPlies == currentPlyCount && (currentGameActive == gameActive)) {
    return;
  }

  if (timeDiffRead > 0)
  {
     timeDiff = 0;
  }

  loadedPlies = currentPlyCount;
  gameActive = currentGameActive;

  if (activePly == 0) {
    activePly = currentPlyCount;
    viewingActiveMove = true;
  }
  if (activePly == currentPlyCount) {
    viewingActiveMove = true;
    $('#newmove').addClass('d-none');
    newMovesCount = 0;
    $('#newmove').attr('data-count', 0);
  }
   if (viewingActiveMove && activePly != currentPlyCount) {
      activePly = currentPlyCount;
      if (playSound)
      {
         $('#move_sound')[0].play();
      }
  }

  var whiteEval = {};
  var blackEval = {};

  eval = getEvalFromPly(pgn.Moves.length - 1);

  activeFen = pgn.Moves[pgn.Moves.length - 1].fen;
  if (viewingActiveMove) {
    currentMove = pgn.Moves[pgn.Moves.length - 1];
    lastMove = currentMove.to;
    setMoveMaterial(currentMove.material, 0);
  }

  if (!whiteToPlay) {
    whiteEval = eval;
  } else {
    blackEval = eval;
  }

  clockCurrentMove = currentMove;
  clockPreviousMove = '';

  if (pgn.Moves.length > 1) {
    eval = getEvalFromPly(pgn.Moves.length-2);

    selectedMove = pgn.Moves[pgn.Moves.length-2];
    clockPreviousMove = selectedMove;

    if (whiteToPlay) {
      whiteEval = eval;
    } else {
      blackEval = eval;
    }
  }

  if (viewingActiveMove) {
    updateMoveValues(whiteToPlay, whiteEval, blackEval);
    updateEnginePv('white', whiteToPlay, whiteEval.pv);
    updateEnginePv('black', whiteToPlay, blackEval.pv);
  }

  var TC = pgn.Headers.TimeControl.split("+");
  var base = Math.round(TC[0] / 60);
  TC = base + "'+" + TC[1] + '"';
  pgn.Headers.TimeControl = TC;

  defaultStartTime = (base * 60 * 1000);

  if (currentGameActive)
  {
     if (whiteToPlay)
     {
        startClock('white', clockCurrentMove, clockPreviousMove);
     }
     else
     {
        startClock('black', clockCurrentMove, clockPreviousMove);
     }
  }
  else
  {
     stopClock('white');
     stopClock('black');
  }

  if (viewingActiveMove) {
    if (pgn.Moves.length > 0) {
      boardEl.find('.' + squareClass).removeClass('highlight-white');
      boardEl.find('.square-' + moveFrom).addClass('highlight-white');
      boardEl.find('.square-' + moveTo).addClass('highlight-white');
      squareToHighlight = moveTo;
    }
    board.position(currentPosition, false);
  }

  if (typeof pgn.Headers == 'undefined') {
    return;
  }

  var title = "TCEC - Live Computer Chess Broadcast";
  if (pgn.Moves.length > 0) {
    title = pgn.Headers.White + ' vs. ' + pgn.Headers.Black + ' - ' + title;
    if (pgn.Moves.PlyCount % 2 == 0 || pgn.Headers.Termination != 'unterminated') {
      $("#favicon").attr("href", "img/favicon.ico");
    } else {
      $("#favicon").attr("href", "img/faviconb.ico");
    }
  }

  $(document).attr("title", title);

  var termination = pgn.Headers.Termination;
  if (pgn.Moves.length > 0) {
    var adjudication = pgn.Moves[pgn.Moves.length - 1].adjudication;
    if (termination == 'unterminated' && typeof adjudication != 'undefined') {
      termination = '-';
      var movesToDraw = 50;
      var movesToResignOrWin = 50;
      var movesTo50R = 50;
      if (Math.abs(adjudication.Draw) <= 10 && pgn.Moves.length > 68) {
        movesToDraw = Math.abs(adjudication.Draw);
      }
      if (Math.abs(adjudication.ResignOrWin) < 9) {
        movesToResignOrWin = Math.abs(adjudication.ResignOrWin);
      }
      if (adjudication.FiftyMoves < 51) {
        movesTo50R = adjudication.FiftyMoves;
      }

      if (movesToDraw < 50 && movesToDraw <= movesTo50R && movesToDraw <= movesToResignOrWin) {
        if (movesToDraw == 1) {
          termination = movesToDraw + ' ply draw';
        } else {
          termination = movesToDraw + ' plies draw';
        }
      }
      if (movesTo50R < 50 && movesTo50R < movesToDraw && movesTo50R < movesToResignOrWin) {
        if(movesTo50R == 1) {
          termination = movesTo50R + ' move 50mr'
        } else {
          termination = movesTo50R + ' moves 50mr'
        }
      }
      if (movesToResignOrWin < 50 && movesToResignOrWin < movesToDraw && movesToResignOrWin < movesTo50R) {
        if(movesToResignOrWin == 1) {
          termination = movesToResignOrWin + ' ply win';
        } else {
          termination = movesToResignOrWin + ' plies win';
        }
      }

      pgn.Headers.Termination = termination;
    } else {
      pgn.Headers.Termination = pgn.Headers.TerminationDetails;
    }
  }

  pgn.Headers.Roundx = gameNox;
  if (pgn.Headers.Event)
  {
     var theMatch = pgn.Headers.Event.match(/TCEC Cup 2 - Round .* - Match (.*)/);
     if (theMatch)
     {
        currentMatch = parseInt(theMatch[1]);
     }
  }
  $('#event-overview').bootstrapTable('load', [pgn.Headers]);
  $('#event-overview').bootstrapTable('updateCell', {index: 0, field: 'Viewers', value: userCount});
  $('#event-name').html(pgn.Headers.Event);

  if (viewingActiveMove) {
    setInfoFromCurrentHeaders();
  }

  updateChartData();

  $('#engine-history').html('');
  _.each(pgn.Moves, function(move, key) {
    ply = key + 1;
    if (key % 2 == 0) {
      number = (key / 2) + 1;
      var numlink = "<a class='numsmall'>" + number + ". </a>";
      $('#engine-history').append(numlink);
    }
    var linkClass = "";
    if (activePly == ply) {
      linkClass = "active-move"
    }

    if (move.book == true)
    {
       linkClass += " green";
       bookmove = ply;
    }

    var moveNotation = move.m;
    if (moveNotation.length != 2) {
      moveNotation = move.m.charAt(0) + move.m.slice(1);
    }

    from = move.to;

    var link = "<a href='#' ply='" + ply + "' fen='" + move.fen + "' from='" + move.from + "' to='" + move.to + "' class='change-move " + linkClass + "'>" + moveNotation + "</a>";
    $('#engine-history').append(link + ' ');
  });
  $('#engine-history').append(pgn.Headers.Result);
  $("#engine-history").scrollTop($("#engine-history")[0].scrollHeight);
  if (pgn.gameChanged)
  {
     plog ("Came to setpgn need to reread dataa at end");
  }
}

function copyFen()
{
   var clip = new ClipboardJS('.btn', {
      text: function(trigger) {
         return currentPosition;
      }
   });
   return false;
}

function setScoreInfoFromCurrentHeaders()
{
  var header = loadedPgn.Headers.White;
  if (engineScore.length > 0)
  {
     if (engineScore[0].name == header)
     {
        $('.white-engine-score').html(engineScore[0].score);
     }
     if (engineScore[1].name == header)
     {
        $('.white-engine-score').html(engineScore[1].score);
     }
  }
  header = loadedPgn.Headers.Black;
  if (engineScore.length > 0)
  {
     if (engineScore[0].name == header)
     {
        $('.black-engine-score').html(engineScore[0].score);
     }
     if (engineScore[1].name == header)
     {
        $('.black-engine-score').html(engineScore[1].score);
     }
  }
}

function setInfoFromCurrentHeaders()
{
  var header = loadedPgn.Headers.White;
  var name = header;
  if (header.indexOf(' ') > 0) {
    name = header.substring(0, header.indexOf(' '))
  }
  $('.white-engine-name').html(name);
  $('.white-engine-name-full').html(header);
  if (engineScore.length > 0)
  {
     if (engineScore[0].name == header)
     {
        $('.white-engine-score').html(engineScore[0].score);
     }
     if (engineScore[1].name == header)
     {
        $('.white-engine-score').html(engineScore[1].score);
     }
  }
  var imgsrc = 'img/engines/' + name + '.jpg';
  $('#white-engine').attr('src', imgsrc);
  $('#white-engine').attr('alt', header);
  $('#white-engine-chessprogramming').attr('href', 'https://www.chessprogramming.org/' + name);
  header = loadedPgn.Headers.Black;
  name = header;
  if (header.indexOf(' ') > 0) {
    name = header.substring(0, header.indexOf(' '))
  }
  $('.black-engine-name').html(name);
  $('.black-engine-name-full').html(header);
  var imgsrc = 'img/engines/' + name + '.jpg';
  $('#black-engine').attr('src', imgsrc);
  $('#black-engine').attr('alt', header);
  if (engineScore.length > 0)
  {
     if (engineScore[0].name == header)
     {
        $('.black-engine-score').html(engineScore[0].score);
     }
     if (engineScore[1].name == header)
     {
        $('.black-engine-score').html(engineScore[1].score);
     }
  }
  $('#black-engine-chessprogramming').attr('href', 'https://www.chessprogramming.org/' + name);
}

function getMoveFromPly(ply)
{
  return loadedPgn.Moves[ply];
}

function getTBHits(tbhits)
{
   var tbHits = 'N/A';

   if (!isNaN(tbhits))
   {
      if (tbhits < 1000)
      {
         tbHits = tbhits;
      }
      else if (tbhits < 1000000)
      {
         tbHits = Math.round(tbhits / 1000) + 'K';
      }
      else
      {
         tbHits = Math.round(tbhits / 1000000) + 'M';
      }
   }
   return tbHits;
}

function getEvalFromPly(ply)
{
  selectedMove = loadedPgn.Moves[ply];

  side = 'White';
  if (whiteToPlay) {
    side = 'Black';
  }

  if (ply < 0)
  {
     return {
       'side': side,
       'eval': "n/a",
       'pv': {},
       'speed': "n/a",
       'nodes': "n/a",
       'mtime': "n/a",
       'depth': "n/a",
       'tbhits': "n/a",
       'timeleft': "n/a"
     };
  }

  //arun
  if (ply < bookmove || (typeof selectedMove == 'undefined') || (typeof (selectedMove.pv) == 'undefined'))
  {
     return {
       'side': side,
       'eval': "book",
       'pv': {},
       'speed': "book",
       'nodes': "book",
       'mtime': "book",
       'depth': "book",
       'tbhits': "book",
       'timeleft': "book"
     };
  }

  if (typeof selectedMove == 'undefined') {
    return '';
  }
  clockPreviousMove = selectedMove;
  speed = selectedMove.s;
  if (speed < 1000000) {
    speed = Math.round(speed / 1000) + ' Knps';
  } else {
    speed = Math.round(speed / 1000000) + ' Mnps';
  }

  nodes = selectedMove.n;
  if (nodes < 1000000) {
    nodes = Math.round(nodes / 1000) + ' K';
  } else {
    nodes = Math.round(nodes / 1000000) + ' M';
  }

  var depth = selectedMove.d + '/' + selectedMove.sd;
  var tbHits = 0;
  tbHits = getTBHits(selectedMove.tb);

  var evalRet = '';

  if (!isNaN(selectedMove.wv))
  {
     evalRet = parseFloat(selectedMove.wv).toFixed(2);
  }
  else
  {
     evalRet = selectedMove.wv;
  }

  return {
    'side': side,
    'eval': evalRet,
    'pv': selectedMove.pv.Moves,
    'speed': speed,
    'nodes': nodes,
    'mtime': secFormatNoH(selectedMove.mt),
    'depth': depth,
    'tbhits': tbHits,
    'timeleft': secFormat(selectedMove.tl),
  };
}

function updateMoveValues(whiteToPlay, whiteEval, blackEval)
{
   /* Ben: Not sure why we need to update only if we are not viewing active move */
   if (!viewingActiveMove)
   {
      $('.white-time-used').html(whiteEval.mtime);
      $('.black-time-used').html(blackEval.mtime);
      $('.white-time-remaining').html(whiteEval.timeleft);
      $('.black-time-remaining').html(blackEval.timeleft);
   }
   else
   {
      if (whiteToPlay)
      {
         $('.black-time-remaining').html(blackEval.timeleft);
         $('.black-time-used').html(blackEval.mtime);
      }
      else
      {
         $('.white-time-used').html(whiteEval.mtime);
         $('.white-time-remaining').html(whiteEval.timeleft);
      }
   }

   $('.white-engine-eval').html(whiteEval.eval);
   $('.white-engine-speed').html(whiteEval.speed);
   $('.white-engine-nodes').html(whiteEval.nodes);
   $('.white-engine-depth').html(whiteEval.depth);
   $('.white-engine-tbhits').html(whiteEval.tbhits);
   updateEnginePv('white', whiteToPlay, whiteEval.pv);

   $('.black-engine-eval').html(blackEval.eval);
   $('.black-engine-speed').html(blackEval.speed);
   $('.black-engine-nodes').html(blackEval.nodes);
   $('.black-engine-depth').html(blackEval.depth);
   $('.black-engine-tbhits').html(blackEval.tbhits);
   updateEnginePv('black', whiteToPlay, blackEval.pv);
}

var whitePv = [];
var blackPv = [];
var livePvs = [];
var activePv = [];

function updateEnginePv(color, whiteToPlay, moves)
{
  if (typeof moves != 'undefined') {
    currentMove = Math.floor(activePly / 2);

    if (color == 'white') {
      whitePv = moves;
    } else {
      blackPv = moves;
    }

    keyOffset = 0;
    if (color == 'black' && !whiteToPlay) {
      currentMove -= 2;
      // keyOffset = 1;
    }

    if (!whiteToPlay) {
      currentMove++;
    }
    if (!whiteToPlay && color == "black") {
      currentMove++;
    }
    $('#' + color + '-engine-pv').html('');
    _.each(moves, function(move, key) {
      effectiveKey = key + keyOffset;
      pvMove = currentMove + Math.floor(effectiveKey / 2);
      if (color == "white" && effectiveKey % 2 == 0 ) {
        $('#' + color + '-engine-pv').append(pvMove + '. ');
      }

      if (color == "black" && effectiveKey % 2 != 0 ) {
        $('#' + color + '-engine-pv').append(pvMove + '. ');
      }

      if (color == "black" && key == 0 ) {
        $('#' + color + '-engine-pv').append(pvMove + '. ');
        $('#' + color + '-engine-pv').append(' .. ');
        currentMove++;
      }

      $('#' + color + '-engine-pv').append("<a href='#' class='set-pv-board' move-key='" + key + "' color='" + color + "'>" + move.m + '</a> ');
    });
  } else {
    $('#' + color + '-engine-pv').html('');
  }
}

$(document).on('click', '.change-move', function(e) {
  clickedPly = $(this).attr('ply');
  clickedFen = $(this).attr('fen');
  moveFrom = $(this).attr('from');
  moveTo = $(this).attr('to');

  viewingActiveMove = false;

  $('.active-move').removeClass('active-move');
  $(this).addClass('active-move');

  boardEl.find('.' + squareClass).removeClass('highlight-white');
  boardEl.find('.square-' + moveFrom).addClass('highlight-white');
  boardEl.find('.square-' + moveTo).addClass('highlight-white');
  squareToHighlight = moveTo;

  board.position(clickedFen, false);
  currentPosition = clickedFen;
  activePly = clickedPly;
  e.preventDefault();

  if (clickedPly == loadedPlies)
  {
    viewingActiveMove = true;
    $('#newmove').addClass('d-none');
    newMovesCount = 0;
    $('#newmove').attr('data-count', 0);
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
  if (activePly > 1) {
    activePly--;
  }
  handlePlyChange();
  e.preventDefault();

  return false;
});

var isAutoplay = false;

$(document).on('click', '#board-autoplay', function(e) {
  e.preventDefault();
  if (isAutoplay) {
    isAutoplay = false;
    $('#board-autoplay i').removeClass('fa-pause');
    $('#board-autoplay i').addClass('fa-play');
  } else {
    isAutoplay = true;
    $('#board-autoplay i').removeClass('fa-play')
    $('#board-autoplay i').addClass('fa-pause');
    boardAutoplay();
  }

  return false;
});

function boardAutoplay()
{
  if (isAutoplay && activePly >= 1 && activePly < loadedPlies) {
    activePly++;
    handlePlyChange();
    setTimeout(function() { boardAutoplay(); }, 750);
  } else {
    isAutoplay = false;
    $('#board-autoplay i').removeClass('fa-pause');
    $('#board-autoplay i').addClass('fa-play');
  }
}

$(document).on('click', '#board-next', function(e) {
  if (activePly < loadedPlies) {
    activePly++;
  } else {
    viewingActiveMove = true;
  }
  handlePlyChange();
  e.preventDefault();

  return false;
});

function onLastMove()
{
  activePly = loadedPlies;
  viewingActiveMove = true;
  handlePlyChange();
}

$(document).on('click', '#board-to-last', function(e) {
  onLastMove();
  e.preventDefault();

  return false;
});

$(document).on('click', '#board-reverse', function(e) {
  board.flip();

  newOrientation = board.orientation();

  if (board.orientation() == 'black') {
    oldOrientation = 'white';
  } else {
    oldOrientation = 'black';
  }

  $('.board-bottom-engine-eval.' + oldOrientation + '-engine-name').removeClass(oldOrientation + '-engine-name').addClass(newOrientation + '-engine-name');
  $('.board-bottom-engine-eval.' + oldOrientation + '-time-remaining').removeClass(oldOrientation + '-time-remaining').addClass(newOrientation + '-time-remaining');
  $('.board-bottom-engine-eval.' + oldOrientation + '-time-used').removeClass(oldOrientation + '-time-used').addClass(newOrientation + '-time-used');
  $('.board-bottom-engine-eval.' + oldOrientation + '-engine-eval').removeClass(oldOrientation + '-engine-eval').addClass(newOrientation + '-engine-eval');

  $('.board-top-engine-eval.' + newOrientation + '-engine-name').removeClass(newOrientation + '-engine-name').addClass(oldOrientation + '-engine-name');
  $('.board-top-engine-eval.' + newOrientation + '-time-remaining').removeClass(newOrientation + '-time-remaining').addClass(oldOrientation + '-time-remaining');
  $('.board-top-engine-eval.' + newOrientation + '-time-used').removeClass(newOrientation + '-time-used').addClass(oldOrientation + '-time-used');
  $('.board-top-engine-eval.' + newOrientation + '-engine-eval').removeClass(newOrientation + '-engine-eval').addClass(oldOrientation + '-engine-eval');

  setInfoFromCurrentHeaders();
  handlePlyChange(false);

  e.preventDefault();

  return false;
});

function handlePlyChange(handleclick)
{
   if (typeof handleclick == 'undefined')
   {
      handleclick = true;
   }

   whiteToPlay = (activePly % 2 == 0);

   whiteEval = blackEval = '';

   /* Ben: since index starts at 0, active ply should be -1 and -2 to be correct */
   if (whiteToPlay) {
      whiteEval = getEvalFromPly(activePly - 2);
      blackEval = getEvalFromPly(activePly - 1);
   } else {
      blackEval = getEvalFromPly(activePly - 2);
      whiteEval = getEvalFromPly(activePly - 1);
   }

   /* Arun: we should get move from ply - 1 as index starts at 0 */
   currentMove = getMoveFromPly(activePly - 1);
   prevMove = getMoveFromPly(activePly - 2);
   if (livePVHist)
   {
      for (var xx = 0 ; xx < livePVHist.moves.length ; xx ++)
      {
         if (parseInt(livePVHist.moves[xx].ply) == activePly)
         {
            //livePVHist.engine =
            livePVHist.moves[xx].engine = livePVHist.engine;
            updateLiveEvalData(livePVHist.moves[xx], 0, prevMove.fen);
            break;
         }
      }
   }

   /* Arun: why do we need to keep swapping the pieces captured */
   if (typeof currentMove != 'undefined') {
    setMoveMaterial(currentMove.material, 0);
   }

   updateMoveValues(whiteToPlay, whiteEval, blackEval);

   if (handleclick)
   {
      $('a[ply=' + activePly + ']').click();
   }
}

var activePvKey = 0;
var activePvColor = '';

$(document).on('click', '.set-pv-board', function(e) {
  $('#v-pills-pv-tab').click();
  moveKey = $(this).attr('move-key');
  pvColor = $(this).attr('color');

  activePvColor = pvColor;

  if (pvColor == 'white') {
    activePv = whitePv.slice();
    // pvBoard.orientation('white');
  } else if (pvColor == 'black') {
    activePv = blackPv.slice();
    // pvBoard.orientation('black');
  } else {
    liveKey = $(this).attr('live-pv-key');
    activePv = livePvs[liveKey];
    // pvBoard.orientation('white');
  }

  setPvFromKey(moveKey);

  e.preventDefault();

  return false;
});

function setPvFromKey(moveKey)
{
  if (activePv.length < 1) {
    activePvKey = 0;
    return;
  }

  if (moveKey >= activePv.length) {
     return;
     }
  activePvKey = moveKey;

  moveFrom = activePv[moveKey].from;
  moveTo = activePv[moveKey].to;
  fen = activePv[moveKey].fen;

  game.load(fen);

  $('.active-pv-move').removeClass('active-pv-move');
  $(this).addClass('active-pv-move');

  $('#pv-board-fen').html(fen);

  pvBoardEl.find('.' + squareClass).removeClass('highlight-white');
  pvBoardEl.find('.square-' + moveFrom).addClass('highlight-white');
  pvBoardEl.find('.square-' + moveTo).addClass('highlight-white');
  pvSquareToHighlight = moveTo;

  pvBoard.position(fen, false);
}

$('#pv-board-fen').click(function(e) {
  Clipboard.copy($(this).html());
  return false;
});

$('#pv-board-black').click(function(e) {
  activePv = blackPv;
  setPvFromKey(0);
  e.preventDefault();

  return false;
});

$('#pv-board-white').click(function(e) {
  activePv = whitePv;
  setPvFromKey(0);
  e.preventDefault();

  return false;
});

$('#pv-board-to-first').click(function(e) {
  setPvFromKey(0);
  e.preventDefault();

  return false;
});

$('#pv-board-previous').click(function(e) {
  if (activePvKey > 0) {
    setPvFromKey(activePvKey - 1);
  }
  e.preventDefault();

  return false;
});

var isPvAutoplay = false;

$('#pv-board-autoplay').click(function(e) {
  if (isPvAutoplay) {
    isPvAutoplay = false;
    $('#pv-board-autoplay i').removeClass('fa-pause');
    $('#pv-board-autoplay i').addClass('fa-play');
  } else {
    isPvAutoplay = true;
    $('#pv-board-autoplay i').removeClass('fa-play')
    $('#pv-board-autoplay i').addClass('fa-pause');
    pvBoardAutoplay();
  }
  e.preventDefault();

  return false;
});

function pvBoardAutoplay()
{
  if (isPvAutoplay && activePvKey >= 0 && activePvKey < activePv.length) {
    setPvFromKey(activePvKey + 1);
    setTimeout(function() { pvBoardAutoplay(); }, 750);
  } else {
    isPvAutoplay = false;
    $('#pv-board-autoplay i').removeClass('fa-pause');
    $('#pv-board-autoplay i').addClass('fa-play');
  }
}

$('#pv-board-next').click(function(e) {
  if (activePvKey < activePv.length) {
    setPvFromKey(activePvKey + 1);
  }
  e.preventDefault();

  return false;
});

$('#pv-board-to-last').click(function(e) {
  setPvFromKey(activePv.length - 1);
  e.preventDefault();

  return false;
});

$('#pv-board-reverse').click(function(e) {
  pvBoard.flip();
  e.preventDefault();

  return false;
});

function setMoveMaterial(material, whiteToPlay)
{
  _.forOwn(material, function(value, key) {
    setPieces(key, value, whiteToPlay);
  })
}

function setPieces(piece, value, whiteToPlay) {
  var target = 'black-material';
  var color = 'b';
  if ((whiteToPlay && value < 0) || (!whiteToPlay && value > 0)) {
    target = 'white-material';
    color = 'w';
  }

  value = Math.abs(value);

  $('#white-material span.' + piece).html('');
  $('#black-material span.' + piece).html('');

  for (i = 0; i < value; i++) {
    imgPath = 'img/chesspieces/wikipedia/' + color + piece.toUpperCase() + '.png';
    $('#' + target + ' span.' + piece).append('<img src="' + imgPath + '" class="engine-material" />');
  }
}

function getLinkArch(gameNumber)
{
   var retLink;

   retLink = "http://tcec.chessdom.com/archive.php";

   return (retLink);
}

function getArrayIndexRound(match)
{
   var round = 1;

   if (match > 30)
   {
      round = match%30;
   }
   else if (match > 28)
   {
      round = match%28;
   }
   else if (match > 24)
   {
      round = match%24;
   }
   else if (match > 16)
   {
      round = match%16;
   }
   else
   {
      round = match;
   }

   return (round - 1);
}

function getRound(match)
{
   var round = 1;

   if (match > 30)
   {
      round = 5;
   }
   else if (match > 28)
   {
      round = 4;
   }
   else if (match > 24)
   {
      round = 3;
   }
   else if (match > 16)
   {
      round = 2;
   }
   else
   {
      round = 1;
   }

   return (round - 1);
}

function openCrossOrig(gamen)
{
   var round = getRound(currentMatch);
   var div = round + 1;
   if (currentMatch)
   {
      gamen += getPrevGames(currentMatch);
   }
   var link = "http://legacy-tcec.chessdom.com/archive.php?se=141&di=" + div + "&ga=" + gamen;
   window.open(link,'_blank');
}

function openCross(gamen, value)
{
   var round = getRound(value);
   var div = round + 1;
   var link = "http://legacy-tcec.chessdom.com/archive.php?se=141&di=" + div + "&ga=" + gamen;
   window.open(link,'_blank');
}

var gameArrayClass = ['#39FF14', 'red', 'whitesmoke'];

function setDarkMode(value)
{
   darkMode = value;
   if (!darkMode)
   {
      gameArrayClass = ['red', 'darkgreen', '#696969'];
   }
   else
   {
      gameArrayClass = ['red', '#39FF14', 'whitesmoke'];
   }
}

function formatter(value, row, index, field) {
   if (value == undefined)
   {
      return value;
   }
   if (!value.hasOwnProperty("Score")) // true
   {
      return value;
   }

   var retStr = '';
   var valuex = _.get(value, 'Score');
   var countGames = 0;

   _.each(valuex, function(engine, key)
   {
      var gameX = parseInt(countGames/2);
      var gameXColor = parseInt(gameX%3);

      if (engine.Result == "0.5")
      {
         engine.Result = '&frac12'
         gameXColor = 2;
      }
      else
      {
         gameXColor = parseInt(engine.Result);
      }
      var gamen = key + 1;
      if (retStr == '')
      {
         retStr = '<a title="' + engine.Game + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCrossOrig(' + gamen + ')">' + engine.Result + '</a>';
      }
      else
      {
         retStr += ' ' + '<a title="' + engine.Game + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCrossOrig(' + gamen + ')">' + engine.Result + '</a>';
      }
      countGames = countGames + 1;
      if (countGames%8 == 0)
      {
         retStr += '<br />';
      }
   });
  return retStr;
}

function cellformatter(value, row, index, field) {
   if (value)
   {
      if (!value.hasOwnProperty("Score")) // true
      {
         return {classes: 'black'};
      }
   }
   return {classes: 'monofont'};
}

function cellformatterEvent(value, row, index, field)
{
   return {classes: 'monofont'};
}

var gameNox = 0;
var engineScore = [];

function updateCrosstableData(data)
{
   var crosstableData = data;

   var abbreviations = [];
   var standingsCross = [];
   engineScore = [];

   _.each(crosstableData.Table, function(engine, key) {
     abbreviations = _.union(abbreviations, [{abbr: engine.Abbreviation, name: key}]);
   });

   _.each(crosstableData.Order, function(engine, key) {
     engineDetails = _.get(crosstableData.Table, engine);

     wins = (engineDetails.WinsAsBlack + engineDetails.WinsAsWhite);
     elo = Math.round(engineDetails.Elo);
     eloDiff = engineDetails.Rating + elo;

     gamesEvent = engineDetails.Games;
     gameNox = engineDetails.Games + 1;

     var scoreEntry = {"name": engine, "score": engineDetails.Score};
     var entry = {
       rank: engineDetails.Rank,
       name: engine,
       games: engineDetails.Games,
       points: engineDetails.Score,
       wins: wins + '[' + engineDetails.WinsAsWhite + '/' + engineDetails.WinsAsBlack + ']',
       crashes: engineDetails.Strikes,
       sb: Math.round(engineDetails.Neustadtl* 100) / 100,
       elo: engineDetails.Rating,
       elo_diff: elo + ' [' + eloDiff + ']'
     };

     _.each(abbreviations, function (abbreviation) {
       var score2 = '';
       engineName = abbreviation.name;
       engineAbbreviation = abbreviation.abbr;

       engineCount = crosstableData.Order.length;
       if (engineCount < 1) {
         engineCount = 1;
       }

       rounds = Math.floor(engineDetails.Games / engineCount) + 1;

       if (engineDetails.Abbreviation == engineAbbreviation) {
         for (i = 0; i < rounds; i++) {
           score2 = '';
         }
       } else {
         resultDetails = _.get(engineDetails, 'Results');
         matchDetails = _.get(resultDetails, engineName);
         score2 =
            {
               Score: matchDetails.Scores,
               Text: matchDetails.Text
            }
       }
       _.set(entry, engineAbbreviation, score2);
     });

     standingsCross = _.union(standingsCross, [entry]);
     engineScore = _.union(engineScore, [scoreEntry]);
   });

   if (!crossTableInitialized) {

     columns = [
       {
         field: 'rank',
         title: 'Rank'
        ,sortable: true
        ,width: '4%'
       },
       {
         field: 'name',
         title: 'Engine'
        ,sortable: true
        ,width: '24%'
       },
       {
         field: 'games',
         title: '# Games'
        ,sortable: true
        ,width: '5%'
       },
       {
         field: 'points',
         title: 'Points'
        ,sortable: true
        ,width: '7%'
       },
       {
         field: 'wins',
         title: 'Wins [W/B]'
        ,width: '10%'
       },
       {
         field: 'crashes',
         title: 'Crashes'
        ,sortable: true
        ,width: '7%'
       },
       {
         field: 'sb',
         title: 'SB'
        ,sortable: true
        ,width: '7%'
       },
       {
         field: 'elo',
         title: 'Elo'
        ,sortable: true
        ,width: '5%'
       },
       {
         field: 'elo_diff',
         title: 'Diff [Live]'
        ,width: '7%'
       }
     ];

     _.each(crosstableData.Order, function(engine, key) {
       engineDetails = _.get(crosstableData.Table, engine);
       columns = _.union(columns, [{field: engineDetails.Abbreviation, title: engineDetails.Abbreviation,
                                    formatter: formatter, cellStyle: cellformatter}]);
     });

     $('#crosstable').bootstrapTable({
       classes: 'table table-striped table-no-bordered',
       columns: columns
     });
     crossTableInitialized = true;
   }
   $('#crosstable').bootstrapTable('load', standingsCross);
   if (gameNox > 8)
   {
      if (gameNox%2 != 0)
      {
         gameNox = gameNox + "/" + (gameNox + 1);
      }
      else
      {
         gameNox = gameNox + "/" + gameNox;
      }
   }
   else
   {
      gameNox = gameNox + "/8";
   }
   $('#event-overview').bootstrapTable('updateCell', {index: 0, field: 'Roundx', value: gameNox});
   setScoreInfoFromCurrentHeaders();
}

function updateCrosstable()
{
   axios.get('crosstable.json?no-cache' + (new Date()).getTime())
   .then(function (response)
   {
      updateCrosstableData(response.data);
   })
   .catch(function (error)
   {
      // handle error
      plog(error);
   });
}

function getStartTimeData(data)
{
   var prevDate = 0;
   var momentDate = 0;
   var diff = 0;
   var timezoneDiff = moment().utcOffset() * 60 * 1000 - 3600 * 1000;
   plog ("Came to updateScheduleData:", 0);

   _.each(data, function(engine, key)
   {
      engine.Gamesort = engine.Game;
      if (engine.Start)
      {
         momentDate = moment(engine.Start, 'HH:mm:ss on YYYY.MM.DD');
         if (prevDate)
         {
            diff = diff + momentDate.diff(prevDate);
            gameDiff = diff/(engine.Game-1);
         }
         prevDate = momentDate;
      }
   });
   plog ("Time diff is :" + gameDiff, 0);
}

function updateScheduleData(data)
{
   var prevDate = 0;
   var momentDate = 0;
   var diff = 0;
   var gameDiff = 0;
   var timezoneDiff = moment().utcOffset() * 60 * 1000 - 3600 * 1000;
   plog ("Came to updateScheduleData:", 0);

   _.each(data, function(engine, key)
   {
      engine.Gamesort = engine.Game;
      if (engine.Start)
      {
         momentDate = moment(engine.Start, 'HH:mm:ss on YYYY.MM.DD');
         if (prevDate)
         {
            diff = diff + momentDate.diff(prevDate);
            gameDiff = diff/(engine.Game-1);
         }
         momentDate.add(timezoneDiff);
         engine.Start = momentDate.format('HH:mm:ss on YYYY.MM.DD');
         prevDate = momentDate;
      }
      else
      {
         plog ("gameDiff: " + gameDiff, 0);
         if (gameDiff)
         {
            prevDate.add(gameDiff + timezoneDiff);
            engine.Start = "Estd: " + prevDate.format('HH:mm:ss on YYYY.MM.DD');
         }
      }
      if (typeof engine.Moves != 'undefined')
      {
         gamesDone = engine.Game;
         engine.Game = '<a title="TBD" style="cursor:pointer; color: red;"onclick="openCross(' + engine.Game + ')">' + engine.Game + '</a>';
      }
   });

   $('#schedule').bootstrapTable('load', data);
   var options = $('#schedule').bootstrapTable('getOptions');
   pageNum = parseInt(gamesDone/options.pageSize) + 1;
   $('#schedule').bootstrapTable('selectPage', pageNum);
}

function getStartTime()
{
   axios.get('schedule.json?no-cache' + (new Date()).getTime())
    .then(function (response) {
      getStartTimeData(response.data);
    })
    .catch(function (error) {
      // handle error
      plog(error);
    });
}

function updateSchedule()
{
   axios.get('schedule.json?no-cache' + (new Date()).getTime())
    .then(function (response) {
      updateScheduleData(response.data);
    })
    .catch(function (error) {
      // handle error
      plog(error);
    });
}

function pad(pad, str) {
  if (typeof str === 'undefined')
    return pad;
  return (pad + str).slice(-pad.length);
}

var btheme = "chess24";
var ptheme = "chess24";
var game = new Chess();

function setBoardInit()
{
   var boardTheme = localStorage.getItem('tcec-board-theme');
   var pieceTheme = localStorage.getItem('tcec-piece-theme');

   if (boardTheme != undefined)
   {
      btheme = boardTheme;
      ptheme = pieceTheme;
   }

   var board =  ChessBoard('board', {
         pieceTheme: window[ptheme + "_piece_theme"],
         position: 'start',
         onMoveEnd: onMoveEnd,
         moveSpeed: 1,
         appearSpeed: 1,
         boardTheme: window[btheme + "_board_theme"]
   });

   $('input[value='+ptheme+']').prop('checked', true);
   $('input[value='+btheme+'b]').prop('checked', true);

   var onDragStart = function(source, piece, position, orientation) {
     plog ("game.turn() is " + game.turn());
     plog ("game.turn() is " + game.fen());
     if (game.game_over() === true ||
         (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
         (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
       plog ("returning false");
       return false;
     }
   };

   var onDragMove = function(newLocation, oldLocation, source,
                             piece, position, orientation) {
    var move = game.move({
       from: newLocation,
       to: oldLocation,
       promotion: 'q' // NOTE: always promote to a queen for example simplicity
       });

     // illegal move
     if (move === null) return 'snapback';

     var pvLen = activePvKey + 1;
     var fen = ChessBoard.objToFen(position);
     if (activePvKey == 0)
     {
         activePv[0] = {};
         activePv[0].fen = fen;
     }
     var moveFrom = oldLocation;
     var moveTo = newLocation;
     if (newLocation == oldLocation)
     {
        return;
     }

     var str = newLocation + '-' + oldLocation;+ '-' + newLocation;
     pvBoard.move(str);
     fen = pvBoard.fen();
     activePv[pvLen] = {};
     activePv[pvLen].fen = fen;
     activePv[pvLen].from = oldLocation;
     activePv[pvLen].to = newLocation;
     $('.active-pv-move').removeClass('active-pv-move');
     $(this).addClass('active-pv-move');
     pvBoardEl.find('.' + squareClass).removeClass('highlight-white');
     pvBoardEl.find('.square-' + moveFrom).addClass('highlight-white');
     pvBoardEl.find('.square-' + moveTo).addClass('highlight-white');
     pvSquareToHighlight = moveTo;
     activePvKey = pvLen;
     $('#pv-board-fen').html(fen);
   };

   var pvBoard =  ChessBoard('pv-board', {
      pieceTheme: window[ptheme + "_piece_theme"],
      position: 'start',
      onMoveEnd: onMoveEnd,
      moveSpeed: 1,
      appearSpeed: 1,
      draggable: true,
      onDragStart: onDragStart,
      onDrop: onDragMove,
      boardTheme: window[btheme + "_board_theme"]
   });
   localStorage.setItem('tcec-board-theme', btheme);
   localStorage.setItem('tcec-piece-theme', ptheme);

   return {board,pvBoard};

}

function setBoard()
{
   var fen = board.fen();
   board =  ChessBoard('board', {
      pieceTheme: window[ptheme + "_piece_theme"],
      position: 'start',
      onMoveEnd: onMoveEnd,
      moveSpeed: 1,
      appearSpeed: 1,
      boardTheme: window[btheme + "_board_theme"]
   });
   board.position(fen, false);
   localStorage.setItem('tcec-board-theme', btheme);
   localStorage.setItem('tcec-piece-theme', ptheme);
   $('input[value='+ptheme+']').prop('checked', true);
   $('input[value='+btheme+'b]').prop('checked', true);

   var fen = pvBoard.fen();
   pvBoard =  ChessBoard('pv-board', {
      pieceTheme: window[ptheme + "_piece_theme"],
      position: 'start',
      onMoveEnd: onMoveEnd,
      moveSpeed: 1,
      appearSpeed: 1,
      boardTheme: window[btheme + "_board_theme"]
   });
   pvBoard.position(fen, false);
   localStorage.setItem('tcec-board-theme', btheme);
   localStorage.setItem('tcec-piece-theme', ptheme);
}

function eventCrosstableWrap()
{
   plog ("eventCrossTableInitial: " + eventCrossTableInitial, 0);
   if (eventCrossTableInitial)
   {
      return -1;
   }
   eventCrossTableInitial = 1;
   axios.get('manual.json?no-cache' + (new Date()).getTime())
   .then(function (response)
   {
      eventCrosstable(response.data);
      response.data.readallfiles = 0;
      eventCrossTableInitial = 0;
   })
   .catch(function (error) {
      // handle error
      plog(error);
      eventCrossTableInitial = 0;
   });
}

function updateTablesData(data)
{
   plog("Came to updateTablesdata", 0);
   getStartTime();
   try
   {
      updateCrosstableData(data);
   }
   catch(err)
   {
      plog("Unable to update crosstable from data", 0);
   }
   try
   {
      updateStandtableData(data);
   }
   catch(err)
   {
      plog("Unable to update standtable from data", 0);
   }
   try
   {
      setTimeout(function() { eventCrosstableWrap(); }, 10000);
   }
   catch(err)
   {
      plog("Unable to update brackets from data", 0);
   }
   plog("Exiting updateTablesData", 0);
}

function updateTables()
{
   plog("Came to updateTables", 0);
   getStartTime();
   try
   {
      updateCrosstable();
   }
   catch(err)
   {
      plog("Unable to update crosstable", 0);
   }
   try
   {
      updateStandtable();
   }
   catch(err)
   {
      plog("Unable to update standtable", 0);
   }
   try
   {
      updateLiveEval();
   }
   catch(err)
   {
      plog("Unable to update updateLiveEval", 0);
   }
   try
   {
      updateLiveChart();
   }
   catch(err)
   {
      plog("Unable to update brackets", 0);
   }
   try
   {
      eventCrosstableWrap();
   }
   catch(err)
   {
      plog("Unable to update brackets", 0);
   }
   plog("Exiting updateTables", 0);
}

function setTwitchBackgroundInit(backg)
{
   var setValue = 0;
   if (backg == 1)
   {
      $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat');
      setValue = 1;
   }
   else if (backg == 2)
   {
      $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
      setValue = 2;
   }
   else
   {
      var darkMode = localStorage.getItem('tcec-dark-mode');
      if (darkMode == 20)
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
         setValue = 2;
      }
      else
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat');
         setValue = 1;
      }
   }
   localStorage.setItem('tcec-twitch-back-mode', setValue);
}

function setTwitchBackground(backg)
{
   var setValue = 0;
   var darkMode = localStorage.getItem('tcec-twitch-back-mode');
   if (darkMode != undefined)
   {
      if (darkMode == 1)
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat');
         setValue = 1;
      }
      else if (darkMode == 2)
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
         setValue = 2;
      }
      else if (darkMode == 0)
      {
         if (backg == 1)
         {
            $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat');
         }
         else
         {
            $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
         }
      }
   }
   else
   {
      if (backg == 1)
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat');
      }
      else
      {
         $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
      }
   }
   localStorage.setItem('tcec-twitch-back-mode', setValue);
   $('input[value='+setValue+']').prop('checked', true);
}

function setDark()
{
  $('.toggleDark').find('i').removeClass('fa-moon-o');
  $('.toggleDark').find('i').addClass('fa-sun-o');
  $('body').addClass('dark');
  setTwitchBackground(2);
  $('#chatright').attr('src', 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat?darkpopout');
  $('#info-frame').attr('src', 'info.html?body=dark');
  $('#crosstable').addClass('table-dark');
  $('#schedule').addClass('table-dark');
  $('#standtable').addClass('table-dark');
  $('#crosstableevent').addClass('table-dark');
  $('#infotable').addClass('table-dark');
  setDarkMode(1);
}

function setLight()
{
  $('body').removeClass('dark');
  $('.toggleDark').find('i').addClass('fa-moon-o');
  $('.toggleDark').find('i').removeClass('fa-sun-o');
  $('input.toggleDark').prop('checked', false);
  $('#crosstable').removeClass('table-dark');
  $('#schedule').removeClass('table-dark');
  setTwitchBackground(1);
  $('#info-frame').attr('src', 'info.html?body=light');
  $('#standtable').removeClass('table-dark');
  $('#infotable').removeClass('table-dark');
  $('#crosstableevent').removeClass('table-dark');
  setDarkMode(0);
}

function setDefaultThemes()
{
   var darkMode = localStorage.getItem('tcec-dark-mode');

   if (darkMode == 20)
   {
      setDark();
   }
   else
   {
      setLight();
   }
}

function drawBoards()
{
   var boardTheme = localStorage.getItem('tcec-board-theme');
   var pieceTheme = localStorage.getItem('tcec-piece-theme');

   if (boardTheme != undefined)
   {
      btheme = boardTheme;
      ptheme = pieceTheme;
   }
   setBoard();
}

function setBoardDefault(boardTheme)
{
   if (boardTheme != undefined)
   {
      btheme = boardTheme;
   }
   setBoard();
}

function setPieceDefault(pTheme)
{
   if (pTheme != undefined)
   {
      ptheme = pTheme;
   }
   setBoard();
}

function updateLiveEvalInit()
{
      $('#live-eval').bootstrapTable({
          classes: 'table table-striped table-no-bordered',
          columns: [
          {
              field: 'engine',
              title: 'Eng',
              width: '30'
          },
          {
              field: 'eval',
              title: 'Eval',
              width: '20'
          },
          {
              field: 'pv',
              title: 'PV',
              width: '290'
          },
          {
              field: 'depth',
              title: 'Depth',
              width: '20'
          },
          {
              field: 'speed',
              title: 'Speed',
              width: '20'
          },
          {
              field: 'nodes',
              title: 'Nodes',
              width: '20'
          },
          {
              field: 'tbhits',
              title: 'TB',
              width: '20'
          }
        ]
      });
}

function updateLiveEvalDataHistory(engineDatum, fen)
{
   var engineData = [];
   livePvs = [];
   var score = 0;
   datum = engineDatum;
   var tbhits = datum.tbhits;

   if (!isNaN(datum.eval))
   {
      score = parseFloat(datum.eval);
   }
   else
   {
      score = datum.eval;
   }

   if (datum.pv.search(/.*\.\.\..*/i) == 0)
   {
      if (!isNaN(score))
      {
         score = parseFloat(score) * -1;
         if (score === 0)
         {
            score = 0;
         }
      }
   }

   pvs = [];

   if (datum.pv.length > 0 && datum.pv.trim() != "no info")
   {
    var chess = new Chess(fen);
    var currentFen = fen;

    datum.pv = datum.pv.replace("...", ". .. ");
    _.each(datum.pv.split(' '), function(move) {
        if (isNaN(move.charAt(0)) && move != '..') {
          moveResponse = chess.move(move);

          if (!moveResponse || typeof moveResponse == 'undefined') {
               plog("undefine move" + move);
          } else {
            newPv = {
              'from': moveResponse.from,
              'to': moveResponse.to,
              'm': moveResponse.san,
              'fen': currentFen
            };

            currentFen = chess.fen();
            currentLastMove = move.slice(-2);

            pvs = _.union(pvs, [newPv]);
          }
        }
    });
   }

   if (pvs.length > 0) {
    livePvs = _.union(livePvs, [pvs]);
   }

   if (score > 0) {
    score = '+' + score;
   }

   datum.eval = score;
   datum.tbhits = getTBHits(datum.tbhits);

   if (datum.pv.length > 0 && datum.pv != "no info") {
    engineData = _.union(engineData, [datum]);
   }

  $('#live-eval-cont').html('');
  _.each(engineData, function(engineDatum) {
    if (engineDatum.engine == '')
    {
       engineDatum.engine = datum.engine;
    }
    $('#live-eval-cont').append('<h5>' + engineDatum.engine + ' PV ' + engineDatum.eval + '</h5><small>[Depth: ' + engineDatum.depth + ' | TB: ' + engineDatum.tbhits + ' | Speed: ' + engineDatum.speed + ' | Nodes: ' + engineDatum.nodes +']</small>');
    var moveContainer = [];
    if (livePvs.length > 0) {
      _.each(livePvs, function(livePv, pvKey) {
        var moveCount = 0;
        _.each(engineDatum.pv.split(' '), function(move) {
          if (isNaN(move.charAt(0)) && move != '..') {
            pvLocation = livePvs[pvKey][moveCount];
            if (pvLocation) {
               moveContainer = _.union(moveContainer, ["<a href='#' class='set-pv-board' live-pv-key='" + pvKey + "' move-key='" + moveCount + "' color='live'>" + pvLocation.m + '</a>']);
               }
            else
            {
               plog ("pvlocation not defined");
            }
            moveCount++;
          } else {
            moveContainer = _.union(moveContainer, [move]);
          }
        });
      });
    }
    $('#live-eval-cont').append('<div class="engine-pv alert alert-dark">' + moveContainer.join(' ') + '</div>');
  });

   // $('#live-eval').bootstrapTable('load', engineData);
   // handle success
}

function updateLiveEvalData(datum, update, fen)
{
   var engineData = [];
   livePvs = [];
   var score = 0;
   var tbhits = datum.tbhits;

   if (update && !viewingActiveMove)
   {
      return;
   }

   if (!update)
   {
      updateLiveEvalDataHistory(datum, fen);
      return;
   }

   if (!isNaN(datum.eval))
   {
      score = parseFloat(datum.eval);
   }
   else
   {
      score = datum.eval;
   }

   if (datum.pv.search(/.*\.\.\..*/i) == 0)
   {
      if (!isNaN(score))
      {
         score = parseFloat(score) * -1;
         if (score === 0)
         {
            score = 0;
         }
      }
   }

   pvs = [];

   if (datum.pv.length > 0 && datum.pv.trim() != "no info")
   {
    var chess = new Chess(activeFen);

    var currentFen = activeFen;

    datum.pv = datum.pv.replace("...", ". .. ");
    _.each(datum.pv.split(' '), function(move) {
        if (isNaN(move.charAt(0)) && move != '..') {
          moveResponse = chess.move(move);

          if (!moveResponse || typeof moveResponse == 'undefined') {
               plog("undefine move" + move);
          } else {
            newPv = {
              'from': moveResponse.from,
              'to': moveResponse.to,
              'm': moveResponse.san,
              'fen': currentFen
            };

            currentFen = chess.fen();
            currentLastMove = move.slice(-2);

            pvs = _.union(pvs, [newPv]);
          }
        }
    });
   }

   if (pvs.length > 0) {
    livePvs = _.union(livePvs, [pvs]);
   }

   if (score > 0) {
    score = '+' + score;
   }

   datum.eval = score;
   datum.tbhits = getTBHits(datum.tbhits);

   if (datum.pv.length > 0 && datum.pv != "no info") {
    engineData = _.union(engineData, [datum]);
   }

  $('#live-eval-cont').html('');
  _.each(engineData, function(engineDatum) {
    if (engineDatum.engine == '')
    {
       engineDatum.engine = datum.engine;
    }
    $('#live-eval-cont').append('<h5>' + engineDatum.engine + ' PV ' + engineDatum.eval + '</h5><small>[Depth: ' + engineDatum.depth + ' | TB: ' + engineDatum.tbhits + ' | Speed: ' + engineDatum.speed + ' | Nodes: ' + engineDatum.nodes +']</small>');
    var moveContainer = [];
    if (livePvs.length > 0) {
      _.each(livePvs, function(livePv, pvKey) {
        var moveCount = 0;
        _.each(engineDatum.pv.split(' '), function(move) {
          if (isNaN(move.charAt(0)) && move != '..') {
            pvLocation = livePvs[pvKey][moveCount];
            if (pvLocation) {
               moveContainer = _.union(moveContainer, ["<a href='#' class='set-pv-board' live-pv-key='" + pvKey + "' move-key='" + moveCount + "' color='live'>" + pvLocation.m + '</a>']);
               }
            else
            {
               plog ("pvlocation not defined");
            }
            moveCount++;
          } else {
            moveContainer = _.union(moveContainer, [move]);
          }
        });
      });
    }
    $('#live-eval-cont').append('<div class="engine-pv alert alert-dark">' + moveContainer.join(' ') + '</div>');
  });


   // $('#live-eval').bootstrapTable('load', engineData);
   // handle success
}

function updateLiveEval() {
   axios.get('data.json?no-cache' + (new Date()).getTime())
   .then(function (response)
   {
      updateLiveEvalData(response.data, 1);
   })
   .catch(function (error) {
      // handle error
      plog(error);
   });
}

function updateLiveChartData(data)
{
   if (typeof data.moves != 'undefined')
   {
      liveEngineEval = data.moves;
      updateChartData();
      livePVHist = data;
   } else {
      liveEngineEval = [];
   }
}

function updateLiveChart()
{
   axios.get('liveeval.json?no-cache' + (new Date()).getTime())
   .then(function (response) {
      updateLiveChartData(response.data);
   })
   .catch(function (error) {
      // handle error
      plog(error);
   });
}

function updateStandtableData(data)
{
   var standtableData = data;

   var abbreviations = [];
   var standingsStand = [];

   _.each(standtableData.Table, function(engine, key) {
     abbreviations = _.union(abbreviations, [{abbr: engine.Abbreviation, name: key}]);
   });

   _.each(standtableData.Order, function(engine, key) {
     engineDetails = _.get(standtableData.Table, engine);

     wins = (engineDetails.WinsAsBlack + engineDetails.WinsAsWhite);
     elo = Math.round(engineDetails.Elo);
     eloDiff = engineDetails.Rating + elo;

     var entry = {
       rank: engineDetails.Rank,
       name: engine,
       points: engineDetails.Score
     };

     _.each(abbreviations, function (abbreviation) {
       var score2 = '';
       engineName = abbreviation.name;
       engineAbbreviation = abbreviation.abbr;

       engineCount = standtableData.Order.length;
       if (engineCount < 1) {
         engineCount = 1;
       }

       rounds = Math.floor(engineDetails.Games / engineCount) + 1;

       if (engineDetails.Abbreviation == engineAbbreviation) {
         for (i = 0; i < rounds; i++) {
           score2 = '';
         }
       } else {
         resultDetails = _.get(engineDetails, 'Results');
         matchDetails = _.get(resultDetails, engineName);
         score2 =
            {
               Score: matchDetails.Scores,
               Text: matchDetails.Text
            }
       }
       _.set(entry, engineAbbreviation, score2);
     });

     standingsStand = _.union(standingsStand, [entry]);
   });

   if (!standTableInitialized) {

     columns = [
       {
         field: 'rank',
         title: 'Rank'
        ,sortable: true
        ,width: '4%'
       },
       {
         field: 'name',
         title: 'Engine'
        ,sortable: true
        ,width: '14%'
       },
       {
         field: 'points',
         title: 'Points'
        ,sortable: true
        ,width: '7%'
       }
     ];
     _.each(standtableData.Order, function(engine, key) {
       engineDetails = _.get(standtableData.Table, engine);
       columns = _.union(columns, [{field: engineDetails.Abbreviation, title: engineDetails.Abbreviation,
                                    formatter: formatter, cellStyle: cellformatter}]);
     });

     $('#standtable').bootstrapTable({
       columns: columns,
       classes: 'table table-striped table-no-bordered',
     });
     standTableInitialized = true;
   }
   $('#standtable').bootstrapTable('load', standingsStand);
}

function updateStandtable()
{
   axios.get('crosstable.json?no-cache' + (new Date()).getTime())
   .then(function (response)
   {
      updateStandtableData(response.data);
   })
   .catch(function (error)
   {
      // handle error
      plog(error);
   });
}

function setLastMoveTime(data)
{
   plog ("Setting last move time:" + data);
}

function checkTwitch(checkbox)
{
   if (checkbox.checked)
   {
      $('iframe#twitchvid').hide();
      localStorage.setItem('tcec-twitch-video', 1);
   }
   else
   {
      $('iframe#twitchvid').attr('src', 'https://player.twitch.tv/?channel=TCEC_Chess_TV');
      $('iframe#twitchvid').show();
      localStorage.setItem('tcec-twitch-video', 0);
   }
}

function setTwitch()
{
   var getVideoCheck = localStorage.getItem('tcec-twitch-video');
   if (getVideoCheck == undefined || getVideoCheck == 0)
   {
      $('iframe#twitchvid').attr('src', 'https://player.twitch.tv/?channel=TCEC_Chess_TV');
      $('iframe#twitchvid').show();
      $('#twitchcheck').prop('checked', false);
   }
   else
   {
      $('iframe#twitchvid').hide();
      $('#twitchcheck').prop('checked', true);
   }
}

function checkSound(checkbox)
{
   if (checkbox.checked)
   {
      localStorage.setItem('tcec-sound-video', 1);
      playSound = 0;
   }
   else
   {
      localStorage.setItem('tcec-sound-video', 0);
      playSound = 1;
   }
}

function reverseBracket(checkbox)
{
   if (checkbox.checked)
   {
      localStorage.setItem('tcec-bracket-reverse', 1);
      reverseBracketSet = 1;
      $('#reverstable').show();
      $('#normaltable').hide();
   }
   else
   {
      localStorage.setItem('tcec-bracket-reverse', 0);
      reverseBracketSet = 0;
      $('#reverstable').hide();
      $('#normaltable').show();
   }
   drawBracket1();
}

function setBracket()
{
   var getBrack = localStorage.getItem('tcec-bracket-reverse');
   if (getBrack == undefined || getBrack == 0)
   {
      reverseBracketSet = 0;
      $('#brackcheck').prop('checked', false);
      $('#reverstable').hide();
      $('#normaltable').show();
   }
   else
   {
      reverseBracketSet = 1;
      $('#brackcheck').prop('checked', true);
      $('#reverstable').show();
      $('#normaltable').hide();
   }
}

function setSound()
{
   var getSound = localStorage.getItem('tcec-sound-video');
   if (getSound == undefined || getSound == 0)
   {
      playSound = 1;
      $('#soundcheck').prop('checked', false);
   }
   else
   {
      playSound = 0;
      $('#soundchcheck').prop('checked', false);
   }
}

function goMoveFromChart(chartx, evt)
{
   var activePoints = chartx.getElementAtEvent(evt);
   var firstPoint = activePoints[0];
   var plyNum = chartx.data.datasets[firstPoint._datasetIndex].data[firstPoint._index].ply;
   if (plyNum != undefined)
   {
      $('a[ply=' + plyNum + ']').click();
   }
}

document.getElementById("eval-graph").onclick = function(evt)
{
   goMoveFromChart(evalChart, evt);
};

document.getElementById("time-graph").onclick = function(evt)
{
   goMoveFromChart(timeChart, evt);
};

document.getElementById("speed-graph").onclick = function(evt)
{
   goMoveFromChart(speedChart, evt);
};

document.getElementById("tbhits-graph").onclick = function(evt)
{
   goMoveFromChart(tbHitsChart, evt);
};

document.getElementById("depth-graph").onclick = function(evt)
{
   goMoveFromChart(depthChart, evt);
};

function addToolTip(divx, divimg)
{
   var htmlx = '<table class="table table-dark table-striped table-dark">' + $(divx).html() + '</table>';
   $(divimg).tooltipster('content', htmlx);
}

var columnsEng = [
{
   field: 'Name'
},
{
   field: 'Value'
}
];

function updateEngineInfo(divx, divimg, data)
{
   $(divx).bootstrapTable('load', data);
   addToolTip(divx, divimg);
}

function addToolTipInit(divx, divimg, direction)
{
   $(divimg).tooltipster({
      contentAsHTML: true,
      interactive: true,
      side: [direction],
      theme: 'tooltipster-shadow',
      trigger: 'hover',
      delay: [500, 200],
      contentCloning: true,
      delayTouch: [10, 2000],
      trigger: 'custom',
         triggerOpen: {
            mouseenter: true,
            click: true,
            touchstart: true,
            tap: true
         },
         triggerClose: {
            mouseleave: true,
            click: true,
            touchleave: true,
            tap: true,
            originClick: true
         }
   });
}

function initToolTip()
{
   $('#whiteenginetable').bootstrapTable({
      columns: columnsEng,
      showHeader: false
   });
   $('#blackenginetable').bootstrapTable({
      columns: columnsEng,
      showHeader: false
   });
   addToolTipInit('#whiteenginetable', '#white-engine-info', 'right');
   addToolTipInit('#blackenginetable', '#black-engine-info', 'left');
}

function stopEvProp(e) {
    e.cancelBubble = !0;
    if (e.stopPropagation) {
        e.stopPropagation()
    }
    if (e.preventDefault) {
        e.preventDefault()
    }
    return !1
}

function firstButton()
{
  activePly = 1;
  handlePlyChange();
};

function backButton()
{
  if (activePly > 1) {
    activePly--;
  }
  handlePlyChange();

  return false;
};

function forwardButton()
{
  if (activePly < loadedPlies) {
    activePly++;
  } else {
    viewingActiveMove = true;
  }
  handlePlyChange();

  return false;
}

function endButton()
{
  onLastMove();
}

function tcecHandleKey(e)
{
    var keycode, oldPly, oldVar, colRow, colRowList;
    if (!e)
    {
        e = window.event
    }
    keycode = e.keyCode;
    if (e.altKey || e.ctrlKey || e.metaKey) {
        return !0
    }

    switch (keycode)
    {
        case 37:
        case 74:
            backButton();
            break;
        case 38:
        case 72:
            firstButton();
            break;
        case 39:
        case 75:
            forwardButton();
            break;
        case 40:
        case 76:
            endButton();
            break;
        default:
            return !0
    }
    return stopEvProp(e)
}

function simpleAddEvent(obj, evt, cbk)
{
   if (obj.addEventListener)
   {
      obj.addEventListener(evt, cbk, !1)
   }
   else if (obj.attachEvent)
   {
      obj.attachEvent("on" + evt, cbk)
   }
}
simpleAddEvent(document, "keydown", tcecHandleKey);

function schedSorted(a,b)
{
   if (a < b) return -1;
   if (a > b) return 1;
   return 0;
}

var filenames = [];
var tablesLoaded = [];

function getFileNames()
{
   for (var i = 1 ; i <= 34 ; i++)
   {
      var round = getRound (i) + 1;
      filenames [i] = "json/TCEC_Cup_2_-_Round_" + round + "_-_Match_" + i + "_crosstable.json";
   }
}

getFileNames();

var standings = [];
var gamesEachMatch = [];
var columnsEvent = [
     {
       field: 'rank',
       title: 'Round',
       width: '4%'
       ,sortable: true
       ,sorter: schedSorted
     },
     {
       field: 'name',
       title: 'Engine'
      ,width: '24%'
     },
     {
       field: 'games',
       title: '# Games'
      ,width: '5%'
       ,sortable: true
       ,sorter: schedSorted
       ,sortOrder: 'desc'
     },
     {
       field: 'points',
       title: 'Points'
      ,width: '7%'
     },
     {
       field: 'crashes',
       title: 'Crashes'
      ,width: '7%'
     },
     {
       field: 'score',
       title: 'Score'
      ,width: '7%'
      ,formatter: 'formatterEvent'
      ,cellStyle: 'cellformatterEvent'
     }
   ];

function sleep(ms)
{
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSeededName(name)
{
   var engineName = '';
   _.each(teamsx, function(engine, key) {
      if (getShortName(engine[0][0]).toUpperCase() == getShortName(name).toUpperCase())
      {
         //engineName = "S#" + engine[0][1] + " " + engine[0][0];
         engineName = engine[0][0];
         engineName = "#" + engine[0][1] + " " + engine[0][0];
         if (engineName.length > 24)
         {
            engineName = engineName.substring(0,22) + "..";
         }
         return false;
      }
      else if (getShortName(engine[1][0]).toUpperCase() == getShortName(name).toUpperCase())
      {
         //engineName = "S#" + engine[1][1] + " " + engine[1][0];
         engineName = engine[1][0];
         engineName = "#" + engine[1][1] + " " + engine[1][0];
         if (engineName.length > 24)
         {
            engineName = engineName.substring(0,22) + "..";
         }
         return false;
      }
   });
   return engineName;
}

function getShortName(name)
{
   var retName = '';

   if (name.indexOf(' ') > 0)
   {
       retName = name.substring(0, name.indexOf(' '));
   }
   return retName;
}

function getCurrDate(currdate, mins)
{
   var timezoneDiff = moment().utcOffset() * 60 * 1000 + mins * 60 * 1000;
   momentDate = moment(currdate, 'HH:mm:ss on YYYY.MM.DD');
   momentDate.add(timezoneDiff);
   return momentDate.format('MMM DD YYYY, HH:mm');
}

function getDateRound()
{
   roundDate = [];
   var diffData = 0;

   for (var x = 0 ; x <= totalEvents; x++)
   {
      if (roundDateMan[x])
      {
         roundDate[x] = getCurrDate(roundDateMan[x], 0);
      }
      else
      {
         var y = x + 1;
         if (diffData)
         {
            if (y%2 == 1)
            {
               roundDate[x] = getCurrDate(startDateR1, 1440 * (parseInt(y/2)));
            }
            else
            {
               roundDate[x] = getCurrDate(startDateR2, 1440 * (parseInt((y-1)/2)));
            }
         }
         else
         {
            var gameDiffL = gameDiff * 8 / (60 * 1000);
            //gameDiffL = gameDiffL/1.5;
            roundDate[x] = getCurrDate(startDateR1, gameDiffL * (x/2));
         }
      }
   }
}

async function eventCrosstable(mandata)
{
   var divname = '#crosstableevent';
   var startVar = 1;

   plog ("Ca,e tp eventCrosstable");

   if (mandata != undefined)
   {
      mandataGlobal = mandata;
      if (mandata.readallfiles == 1)
      {
         plog ("We have games decided:" + mandata.manual.decided);
         manualGamesdecided = 1;
      }
      if (mandata.manual.decided)
      {
         plog ("We have games decided:" + mandata.manual.decided);
         manualGamesdecided = 1;
      }
   }

   gamesEachMatch = [];

   $(divname).bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        columns: columnsEvent,
        sortName: 'rank',
        sortOrder: 'desc'
      });

   if (manualGamesdecided)
   {
      var slength = standings.length;
      for (var i = slength ; i >= 1 ; i --)
      {
         standings.splice(i-1, 1);
         tablesLoaded[i] = -1;
      }
      standings = [];
      standings.lastLoaded = 1;
   }

   if (standings.lastLoaded != undefined)
   {
      var standingsnew = standings.reverse();
      startVar = standings.lastLoaded;
      //standings.splice(0, 1);
      var slength = standingsnew.length;
      for (var i = slength ; i >= startVar ; i --)
      {
         standingsnew.splice(i-1, 1);
         tablesLoaded[i] = -1;
      }
      plog ("lenght of standings is " + standingsnew.length);
      standings=standingsnew.reverse();
   }

   for (var i = 0; i <= totalEvents; i++)
   {
      roundResults[i] = [{lead:-1, score: -1, manual: 0}, {lead:-1, score: -1, manual: 0}];
   }

   for (var i = startVar ; i <= 16; i++)
   {
      tablesLoaded[i] = -1;
      roundResults[i-1] = [{lead:-1, score: -1}, {lead:-1, score: -1}];
      bigData.teams[i-1] = [{name: getSeededName(teamsx[i-1][0][0]), flag: getShortName(teamsx[i-1][0][0]),
                             score: -1, rank: '1', date: '', lead: 0},
                            {name: getSeededName(teamsx[i-1][1][0]), flag: getShortName(teamsx[i-1][1][0]),
                             score: -1, rank: '2', date: '', lead: 0}];
      //plog ("Score is :" + i + ", name:" + getSeededName(teamsx[i-1][0][0]), 0);
   }

   _.each(mandata.skip, function(matchdum, key) {
      plog ("matchdum, " + JSON.stringify(matchdum) + ",key:" + key, 1);
      if (matchdum.skip)
      {
         eventCrosstableMainCooked(matchdum);
      }
      });

   for (var i = startVar ; i <= totalEvents; i++)
   {
      tablesLoaded[i] = -1;
      eventCrosstableMain(i, filenames[i]);
   }

   var loaded = 0;
   var timeWaited = 0;
   while (loaded == 0)
   {
      for (var i = 1 ; i <= totalEvents; i++)
      {
         loaded = 1;
         if (tablesLoaded[i] == -1)
         {
            loaded = 0;
            break;
         }
      }
      await sleep(100);
      timeWaited += 100;
      if (timeWaited > 50000)
      {
         plog("Waited long time to load, bailing out");
      }
   }
   plog("time taken: " + timeWaited);
   for (var i = 0 ; i < totalEvents; i++)
   {
      if (tablesLoaded[i] == 1)
      {
         standings.lastLoaded = i;
      }
   }

   plog ("drawing standings", 0);
   $(divname).bootstrapTable('load', standings);
   plog ("drawing bracket", 0);
   drawBracket();
   drawBracket1();
}

function eventCrosstableMainCooked(data)
{
   var myLocalData = dummyCross;
   var myLocalDataStr = JSON.stringify(myLocalData);
   plog("JSON is " + myLocalDataStr, 1);
   myLocalData.skipDecide = 1;
   updateCrosstableDataNew(data.match, myLocalData);
   tablesLoaded[data.match] = 1;
}

function eventCrosstableMain(ii, filename)
{
   //filename = filename + '?no-cache' + (new Date()).getTime();
   plog ("trying to read file " + filename);
   axios.get(filename)
   .then(function (r)
   {
      updateCrosstableDataNew(ii, r.data);
      tablesLoaded[ii] = 1;
      //plog ("after trying to read file " + filename, 0);
   })
   .catch(function (error)
   {
      plog(error);
      plog ("failed trying to read file " + filename + ", error: " + error);
      tablesLoaded[ii] = 0;
   });
}

function checkMatchDone(firstEntry, currEntry, matchNum)
{
   var isMatchLost = 1;
   var totalGames = 8;
   var manualDecide = 0;

   /* Check if 2nd rank can still catch up */
   if (mandataGlobal != null)
   {
      if (mandataGlobal.manual.decided)
      {
         _.each(mandataGlobal.matches, function(matchdum, key) {
            plog ("match is " + matchdum.match + ", matchNum :" + matchdum.finished);
            if (matchNum == matchdum.match)
            {
               if (matchdum.finished == 0)
               {
                  isMatchLost = 0;
                  manualDecide = 1;
                  if (matchdum.e1)
                  {
                     roundResults[ii-1][0].score = mandataGlobal.matches[0].e1;
                     roundResults[ii-1][1].score = mandataGlobal.matches[0].e2;
                  }
                  return false;
               }
               else if (matchdum.finished > 0)
               {
                  manualDecide = 1;
                  plog ("matchdum.winner: " + matchdum.winner + ",firstEntry.name:" + firstEntry.name + ",currEntry.name:" + currEntry.name);
                  if (matchdum.winner == firstEntry.name)
                  {
                     isMatchLost = 1;
                  }
                  else if (matchdum.winner == currEntry.name)
                  {
                     isMatchLost = -1;
                  }
                  return false;
               }
            }
         });
      }
   }
   if (manualDecide)
   {
      currEntry.manualDecide = 1;
      return isMatchLost;
   }
   currEntry.manualDecide = 0;
   if (currEntry.Games <= 8)
   {
      totalGames = 8;
   }
   else
   {
      if (currEntry.Games%2 == 0)
      {
         totalGames = currEntry.Games;
      }
      else
      {
         totalGames = currEntry.Games + 1;
      }
   }
   if ((totalGames - currEntry.Games) + currEntry.Score >= firstEntry.point)
   {
      isMatchLost = 0;
   }

   if (currEntry.Strikes > 3)
   {
      isMatchLost = 1;
   }
   plog ("checkMatchDone: currEntry : " + currEntry.Abbreviation + " result:" + isMatchLost + ", totalgames" + totalGames + " ,matchNum:" + matchNum);
   return isMatchLost;
}

function updateCrosstableDataNew(ii, data)
{
   var crosstableData = data;

   var totalGamesSingle = 0;
   var abbreviations = [];
   var crashes2 = 0;
   var entry = {};
   var round = 0;
   var roundM = ii;

   round = getRound(ii);
   roundM = getArrayIndexRound(ii);
   plog ("round is " + round + ", ii is " + ii + ", roundM is : " + roundM, 1);

   _.each(crosstableData.Table, function(engine, key) {
     abbreviations = _.union(abbreviations, [{abbr: engine.Abbreviation, name: key}]);
   });

   _.each(crosstableData.Order, function(engine, key) {
     engineDetails = _.get(crosstableData.Table, engine);

     wins = (engineDetails.WinsAsBlack + engineDetails.WinsAsWhite);
     elo = Math.round(engineDetails.Elo);
     eloDiff = engineDetails.Rating + elo;

     gamesEvent = engineDetails.Games;
     var rank = 1;
     if (totalGamesSingle)
     {
        crashes2 = engineDetails.Strikes;
        engineDetails.name = engine;
        entry.crashes = entry.crashes + "/" + crashes2;

        var isMatchLost = checkMatchDone(entry, engineDetails, ii);
        plog ("For match " + ii + ", result is " + isMatchLost + ", white: " + entry.name + ", black:" + engine, 1);
        var lead = 0;

        roundResults[ii-1][0].manual = 0;
        roundResults[ii-1][1].manual = 0;
        roundResults[ii-1][0].name = entry.name;
        roundResults[ii-1][1].name = engine;

        if (ii < 17)
        {
            if (crosstableData.skipDecide)
            {
               engine = teamsx[ii-1][1][0];
            }
            bigData.teams[ii-1][1] = {name: getSeededName(engine), flag: getShortName(engine), score: -1, rank: '2', date: '', lead: 0};
            plog ("bigData.teams[ii-1][1]: " + JSON.stringify(bigData.teams[ii-1][1]), 1);
        }

        if (isMatchLost == 1)
        {
           entry.name = '<a style="color: ' + gameArrayClass[1] + '"> ' + entry.name + '</a> vs ' +
                        '<a style="color: ' + gameArrayClass[0] + '"> ' + engine + '</a>';
        }
        else if (isMatchLost == -1)
        {
           entry.name = '<a style="color: ' + gameArrayClass[0] + '"> ' + engine + '</a> vs ' +
                        '<a style="color: ' + gameArrayClass[1] + '"> ' + entry.name + '</a>';
        }
        else
        {
           entry.name =  entry.name + ' vs ' + engine;
        }

        roundResults[ii-1][1].origscore = engineDetails.Score;
        roundResults[ii-1][0].origscore = entry.point;

        if (crosstableData.skipDecide || engineDetails.manualDecide)
        {
           roundResults[ii-1][0].manual = 1;
           roundResults[ii-1][1].manual = 1;
        }

        if (isMatchLost == 1)
        {
           bigData.results[0][round][roundM][1] = engineDetails.Score;
           bigData.results[0][round][roundM][0] = entry.point;
           roundResults[ii-1][0].lead = 1;
           roundResults[ii-1][1].lead = 0;
           roundResults[ii-1][1].score = -1;
           roundResults[ii-1][0].score = -1;
        }
        else if (isMatchLost == -1)
        {
           bigData.results[0][round][roundM][1] = 1;
           bigData.results[0][round][roundM][0] = 0;

           roundResults[ii-1][1].score = engineDetails.Score;
           roundResults[ii-1][0].score = entry.point;

           roundResults[ii-1][1].lead = 1;
           roundResults[ii-1][0].lead = 0;

        }
        else
        {
           bigData.results[0][round][roundM][1] = 0;
           bigData.results[0][round][roundM][0] = 0;

           roundResults[ii-1][1].score = engineDetails.Score;
           roundResults[ii-1][0].score = entry.point;
           if (entry.point > engineDetails.Score)
           {
              roundResults[ii-1][0].lead = 1;
              roundResults[ii-1][1].lead = 0;
           }
        }
        return 1;
     }

     if (ii < 17)
     {
        bigData.teams[ii-1] = [{name: "", flag: "", score: -1, rank: '1', date: '', lead: 0},
                               {name: "", flag: "", score: -1, rank: '2', date: '', lead: 0}];
        if (crosstableData.skipDecide)
        {
           engine = teamsx[ii-1][0][0];
        }
        bigData.teams[ii-1][1] = {name: getSeededName(engine), flag: getShortName(engine), score: -1, rank: '2', date: '', lead: 0};
        bigData.teams[ii-1][0] = {name: getSeededName(engine), flag: getShortName(engine), score: '', rank: 1, lead:0};
     }

     entry = {
       Gamesort: ii,
       rank: ii,
       name: engine,
       games: engineDetails.Games,
       points: engineDetails.Score,
       crashes: engineDetails.Strikes
     };

     plog ("Entry is " + ii + " : " + JSON.stringify(entry), 1);

     if (!totalGamesSingle)
     {
        totalGamesSingle = engineDetails.Games;
        totalGamesSingle = 1;
        gamesEachMatch[ii] = parseInt(engineDetails.Games);
     }

     _.each(abbreviations, function (abbreviation) {
       var score2 = '';
       engineName = abbreviation.name;
       engineAbbreviation = abbreviation.abbr;

       engineCount = crosstableData.Order.length;

       if (engineCount < 1)
       {
          engineCount = 1;
       }

       rounds = Math.floor(engineDetails.Games / engineCount) + 1;

       if (engineDetails.Abbreviation == engineAbbreviation) {
         for (i = 0; i < rounds; i++) {
           score2 = '';
         }
       } else {
         resultDetails = _.get(engineDetails, 'Results');
         matchDetails = _.get(resultDetails, engineName);
         entry.points = engineDetails.Score + " - " + (engineDetails.Games - engineDetails.Score);
         entry.point = engineDetails.Score;
       if (matchDetails)
       {
          entry.score = matchDetails.Text;
       }
       }
     });

     standings = _.union(standings, [entry]);
   });

   totalGamesSingle = 0;
}

function getPrevGames(ii)
{
   var total = 0;
   var start = 0;
   var end = 0;

   if (ii > 30)
   {
      start = 31;
      end = ii;
   }
   else if (ii > 28)
   {
      start = 29;
      end = ii;
   }
   else if (ii > 24)
   {
      start = 25;
      end = ii;
   }
   else if (ii > 16)
   {
      start = 17;
      end = ii;
   }
   else
   {
      start = 1;
      end = ii;
   }

   for (var i = start; i < end; i ++)
   {
      if (gamesEachMatch[i] != undefined)
      {
         total = gamesEachMatch[i] + total;
      }
   }

   return total;
}

function formatterEvent(value, row, index, field) {
   var retStr = '';
   var countGames = 0;
   var prevGameTota = getPrevGames(row.rank);

   _.each(value, function(engine, key)
   {
      var gameX = parseInt(countGames/2);
      var gameXColor = parseInt(gameX%3);

      if (engine == "=")
      {
         engine = '&frac12'
         gameXColor = 2;
      }
      else
      {
         gameXColor = parseInt(engine);
      }
      var gameNum = key + prevGameTota + 1;
      if (retStr == '')
      {
         retStr = '<a title="' + gameNum + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCross(' + gameNum + ',' + row.rank + ')">' + engine + '</a>';
      }
      else
      {
         retStr += ' ' + '<a title="' + gameNum + '" style="cursor:pointer; color: ' + gameArrayClass[gameXColor] + ';"onclick="openCross(' +  gameNum + ',' + row.rank + ')">' + engine + '</a>';
      }
      countGames = countGames + 1;
      if (countGames%8 == 0)
      {
         retStr += '<br />';
      }
   });
  return retStr;
}

function getNoSeedName(name)
{
   if (name)
   {
      var theMatch = name.match(/#(.*?) (.*)/)
      if (theMatch)
      {
         return (getShortName(theMatch[2]).toUpperCase());
      }
   }
}

function drawBracket()
{
   roundNo = 2;
   var isChanged = 0;
   var startRound = -1;

   function onClick(data)
   {
      //alert(data);
   }

   function save_fn(data, userData) {
      return;
   }

   function edit_fn(container, data, doneCb) {
      return;
   }

   function render_fn(container, data, score, state) {
        var origRoundNo = roundNo;
        var ii = parseInt(origRoundNo/2);
        var round = getRound(ii);
        var localRound = parseInt(roundNo/2) - 1;
        var isFirst = roundNo%2;
        roundNo ++;
        if (round != startRound)
        {
           return;
        }

        switch(state) {
          case "entry-no-score":
          case "entry-default-win":
          case "entry-complete":
            var roundM = getArrayIndexRound(ii);
            var index = -1;
            if (roundResults[localRound][0].name)
            {
               if (getShortName(roundResults[localRound][0].name).toUpperCase() == getNoSeedName(data.name))
               {
                  index = 0;
               }
            }
            if (roundResults[localRound][1].name)
            {
               if (getShortName(roundResults[localRound][1].name).toUpperCase() == getNoSeedName(data.name))
               {
                  index = 1;
               }
            }
            plog ("Round is " + round + ",localround:" + localRound + ",data.name:" + data.name + ", match#:" + ii + ",index:" + index, 1);
            plog ("RoundM is " + roundM + ",score:" + bigData.results[0][round][roundM][index] + ", name:" + roundResults[localRound][0].name, 1);
            plog ("RoundM is " + roundM + ",score:" + bigData.results[0][round][roundM][index] + ", name:" + roundResults[localRound][1].name, 1);

            if (index > -1)
            {
               if (isFirst && (index != isFirst))
               {
                  var temp = bigData.results[0][round][roundM][0];
                  bigData.results[0][round][roundM][0] = bigData.results[0][round][roundM][1];
                  bigData.results[0][round][roundM][1] = temp;
                  temp = roundResults[localRound][0];
                  roundResults[localRound][0] = roundResults[localRound][1];
                  roundResults[localRound][1] = temp;
                  isChanged = round;
                  plog ("Swappting for Round is " + round + ",data.name:" + data.name + ", match#:" + ii, 0);
               }
            }
            return;
        }
        return;
   }

   for (var i = 0 ; i < 4 ; i ++)
   {
      roundNo = 2;
      startRound = i;
      $('#bracket').bracket({
         centerConnectors: true,
         init: bigData,
         skipConsolationRound: true,
         decorator: {edit: edit_fn,
                     render: render_fn}
      });
   }
}

function drawBracket1()
{
   plog ("Came to drawBracket");
   var roundNox = 2;
   getDateRound();

   function onClick(data)
   {
      //alert(data);
   }
   /* Edit function is called when team label is clicked */
   function edit_fn1(container, data, doneCb) {
     var input = $('<input type="text">')
     input.val(data ? data.flag + ':' + data.name : '')
     container.html(input)
     input.focus()
     input.blur(function() {
       var inputValue = input.val()
       if (inputValue.length === 0) {
         doneCb(null); // Drop the team and replace with BYE
       } else {
         var flagAndName = inputValue.split(':') // Expects correct input
         doneCb({flag: flagAndName[0], name: flagAndName[1]})
       }
     })
   }
   function edit_fn(container, data, doneCb) {
      return;
   }

   function render_fn2(container, data, score, state) {
        var localRound = parseInt(roundNox/2) - 1;
        var isFirst = roundNox%2;

        //plog ("Came to round: " + roundNox + " data.name is: " + data.name, 1);
        roundNox ++;

        switch(state) {
          case "empty-bye":
            container.append("No team")
            return;
          case "empty-tbd":
            if (roundNox%2 == 1)
            {
               var befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRound + 1) + '</a> ';
               if (roundDate[localRound] != undefined)
               {
                  //befStr = befStr + '<a class="dateright"> (' + roundDate[localRound] + ')</a> </div>';
                  befStr = befStr + '</div>';
               }
               else
               {
                  befStr = befStr + '</div>';
               }
               $(befStr).insertBefore(container);
            }
            container.append("TBD")
            return;

          case "entry-no-score":
          case "entry-default-win":
          case "entry-complete":
            plog ("localRound is " + (localRound) + ", isfirst: " + isFirst, 1);
            plog ("localRound enginename:" + data.name + ", 0 engine:" + roundResults[localRound][0].name+ ", 1 engine: " + roundResults[localRound][1].name, 1);
            var scoreL = roundResults[localRound][isFirst].score;

            if (1)
            {
               if (scoreL >= 0)
               {
                  var appendStr = '';
                  var lead = roundResults[localRound][isFirst].lead;
                  var manual = roundResults[localRound][isFirst].manual;
                  if (manual == 1)
                  {
                     appendStr = '<div class="bracket-name"> <a> ' + data.name + '</a> </div>' +
                                 '<div class="bracket-score orange"> <a> (' + scoreL + ')</a> </div>'
                     $(container).parent().addClass('bracket-name-orange');
                  }
                  else if (lead == 0)
                  {
                     appendStr = '<div class="bracket-name"> <a> ' + data.name + '</a> </div>' +
                                 '<div class="bracket-score red "> <a> (' + scoreL + ')</a> </div>'
                     $(container).parent().addClass('bracket-name-red');
                  }
                  else if (lead == 1)
                  {
                     appendStr = '<div class="bracket-name"> <a> ' + data.name + '</a> </div>' +
                                 '<div class="bracket-score green"> <a> (' + scoreL + ')</a> </div>'
                     $(container).parent().addClass('bracket-name-green');
                  }
                  else
                  {
                     appendStr = '<div class="bracket-name"> <a> ' + data.name + '</a> </div>' +
                                 '<div class="bracket-score"> <a> (' + scoreL + ')</a> </div>'
                     $(container).parent().addClass('bracket-name-current');
                  }
                  if (roundNox%2 == 1)
                  {
                     var befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRound + 1) + '</a> ';
                     if (roundDate[localRound] != undefined)
                     {
                        //befStr = befStr + '<a> ' + roundDate[localRound] + '</a> </div>';
                        befStr = befStr + '</div>';
                     }
                     else
                     {
                        befStr = befStr + '</div>';
                     }
                     $(befStr).insertBefore(container);
                  }
                  container.append('<img class="bracket-material" src="img/engines/'+ data.flag +'.jpg" />').append(appendStr);
               }
               else
               {
                  if (roundNox%2 == 1)
                  {
                     var befStr = '<div class="labelbracket"> <a class="roundleft"> #' + (localRound + 1) + '</a> ';
                     if (roundDate[localRound] != undefined)
                     {
                        //befStr = befStr + '<a class="dateright"> ' + roundDate[localRound] + '</a> </div>';
                        //befStr = befStr + '<a> ' + roundDate[localRound] + '</a> </div>';
                        befStr = befStr + '</div>';
                     }
                     else
                     {
                        befStr = befStr + '</div>';
                     }
                     $(befStr).insertBefore(container);
                  }
                  container.append('<img class="bracket-material" src="img/engines/'+data.flag+'.jpg" />').append('<div class="bracket-name"> <a> ' + data.name + '</a> </div>')
               }
            }
            if (roundNox > 64)
            {
               $(container).parent().append('<div class="bubblex third">3rd</div>');
               //container.append('<div class="bubble third">3rd</div>');
            }
            return;
        }
   }

   var direction = 'lr';
   if (reverseBracketSet)
   {
      direction = 'rl';
   }
   $(function () {
      $('#bracket').bracket({
         centerConnectors: true,
         dir: direction,
         teamWidth: 220,
         scoreWidth: 25,
         matchMargin: 45,
         roundMargin: 18,
         init: bigData,
         //skipConsolationRound: true,
         decorator: {edit: edit_fn,
                     render: render_fn2}
   });
   });
}

