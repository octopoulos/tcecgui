// archive
// specific code to the archive
//
// included after: common, tcec
/*
globals
$, ARCHIVE_LINK, Assign, eventNameHeader:true, globalGameno:true, Keys, location, LS, Now, pageNum:true, prevPgnData,
Resource, scheduleHighlight, updateGame, updateH2hData, updateLiveChart, updatePgnDataMain, updateTables, URL,
virtual_init_tables:true, window, Y
*/
'use strict';

/***************************** CUP ***************************************************/

let globalEventCross = 0,
    globalCup = 0,
    globalCupName = 0;

/***************************** CUP ***************************************************/

let _HOST = 'https://www.tcec-chess.com',
    abbSeason,
    globalCross = "json/crosstable.json",
    globalCrash = '',
    globalCurr  = "pgn/live.pgn",
    globalEngR = "json/enginerating.json",
    globalLiveEval = "json/liveeval.json",
    globalLiveEval1 = "json/liveeval1.json",
    globalPgn = "pgn/event.pgn",
    globalSched = "json/schedule.json",
    globalUrl = "season=1&div=3",
    iduse = '',
    menuData,
    oldSchedDataCopy,
    prevlink,
    season = 17;

function downloadFile(name)
{
    let link = `${_HOST}/json/${name}`;
    window.open(link);
}

function gameListHighlight(noscroll)
{
    let options = $('#gamelist').bootstrapTable('getOptions'),
        classSet = 'blacktd';
    pageNum = parseInt(globalGameno/options.pageSize) + 1;
    $('#gamelist').bootstrapTable('selectPage', pageNum);
    let index = globalGameno - (pageNum - 1) * options.pageSize,
        top = 0;
    $('#gamelist').find('tbody tr').each(function (i) {
        if (i < index) {
            top += $(this).height();
            }
        });
    if (!noscroll)
    {
        $('#game-wrapper').scrollTop(top - 5);
    }

    if (Y.dark_mode != 20)
        classSet = 'whitetd';

    $('#gamelist tr').removeClass(classSet);
    $('#gamelist tr:eq('+index+')').addClass(classSet);
    $('#pills-info-tab').click();
}

function getPGN(id)
{
    let found = 0,
        retPgn = {},
        data = menuData;

    Keys(data.Seasons).forEach(key => {
        let value = data.Seasons[key];
        if (found)
            return false;

        Keys(value.sub).forEach(subkey => {
            let subvalue = value.sub[subkey];
            if (subvalue.id == id || subvalue.idf == id)
            {
                season = key;
                Assign(retPgn, {
                    abb: subvalue.abb,
                    pgnfile: subvalue.abb + ".pgn",
                    scjson: subvalue.abb + "_Schedule.sjson",
                    ctjson: subvalue.abb + "_Crosstable.cjson",
                    xjson: subvalue.abb + "_crash.xjson",
                    download: value.download,
                    enjson: subvalue.abb + "_Enginerating.egjson",
                    url: subvalue.url,
                    event: value.eventtag,
                    cup: value.cup,
                    seasonname: "TCEC " + value.seasonName,
                    teams:value.teams,
                });
                found = 1;
                return false;
            }
            else if (subvalue.idf == 'previous')
            {
                season = key;
                Assign(retPgn, {
                    abb: subvalue.abb,
                    pgnfile: subvalue.abb + ".pgn",
                    scjson: subvalue.abb + "_Schedule.sjson",
                    ctjson: subvalue.abb + "_Crosstable.cjson",
                    xjson: subvalue.abb + "_crash.xjson",
                    download: value.download,
                    url: subvalue.url,
                    event: value.eventtag,
                    cup: value.cup,
                    teams: value.teams,
                });
            }
        });
    });

    return retPgn;
}

function initTablesArchive() {
    $('#gamelist').bootstrapTable({
        classes: 'table table-striped table-no-bordered',
        pagination: true,
        paginationLoop: true,
        paginationVAlign: 'both',
        striped: true,
        smartDisplay: true,
        sortable: true,
        pageList: [10,20,50,100,150,200,250,300,400,500,600,1000],
        pageSize:250,
        rememberOrder: true,
        search: true,
        columns: [
        {
            field: 'Gamesort',
            title: 'sortnumber',
            visible: false,
        },
        {
            field: 'Game',
            title: 'G#',
            sortable: true,
            sorter: (a, b) => (a<b? -1: (a>b? 1: 0)),
            sortName: 'Gamesort',
        },
        {
            field: 'pgn',
            title: 'PGN',
            visible: true
        },
        {
            field: 'FixWhite',
            title: 'White',
            sortable: true,
        },
        {
            field: 'FixBlack',
            title: 'Black',
            sortable: true,
        },
        {
            field: 'Moves',
            title: 'Moves',
            sortable: true,
        },
        {
            field: 'Result',
            title: 'Result',
            sortable: true,
        }]
    });

    $("#gamelist").on("click-cell.bs.table", function(field, value, row, $el) {
        if (value == 'pgn')
        {
            let link = "/json/" + abbSeason + "_" + $el.Game + ".pgn";
            openPGNlink(link);
        }
        else
            updateGameArchive($el.Game, true);
    });
}

function loadPGN(id)
{
    globalGameno = 1;
    LS(`XXX: loadPGN id=${id}`);
    loadPGNMain(id);
}

function loadPGNMain(id)
{
    let retPgn = getPGN(id);
    updateArchive(retPgn);
}

function openPGNlink(linkpgn)
{
    let link = `${_HOST}/${linkpgn}`;
    window.open(link,'_blank');
}

function setUrl()
{
    LS('setUrl');
    let parsedUrl = new URL(location.href);
    if (parsedUrl.searchParams.get("game"))
    {
        globalGameno = parseInt(parsedUrl.searchParams.get("game"));
    }
    if (parsedUrl.searchParams.get("season"))
    {
	  season = parsedUrl.searchParams.get("season");
      iduse = 's' + season;
    }
    if (parsedUrl.searchParams.get("round"))
    {
        iduse += parsedUrl.searchParams.get("round");
    }
    if (parsedUrl.searchParams.get("div"))
    {
        iduse += "division" + parsedUrl.searchParams.get("div");
    }
    if (parsedUrl.searchParams.get("stage"))
    {
        iduse += "stage" + parsedUrl.searchParams.get("stage");
    }
    if (parsedUrl.searchParams.get("final"))
    {
        iduse += "f";
    }

    iduse = iduse.toLowerCase() || 'current';
    loadPGNMain(iduse);
}

function updateArchive(pgnarch)
{
    abbSeason = pgnarch.abb;
    globalPgn = 'archive/' + abbSeason + '.pgn.zip';
    globalUrl = pgnarch.url;
    let jsonFile = pgnarch.scjson,
        jsonFileCross = pgnarch.ctjson;

    $('#cuptext').html(pgnarch.seasonname);

    if (pgnarch.cup != undefined)
    {
        globalEventCross = "archive/" + pgnarch.event + "_Eventcrosstable.cjson";
        globalCup = "archive/" + pgnarch.teams;
        globalCupName = pgnarch.cup;
    }
    else
    {
        globalEventCross = 0;
        globalCup = 0;
    }

    eventNameHeader = 0;
    jsonFile = "archive/" + jsonFile;
    jsonFileCross = "archive/" + jsonFileCross;

    globalCross = jsonFileCross;
    globalSched = jsonFile;
    globalEngR = "archive/" + pgnarch.enjson;
    globalCrash = "archive/" + pgnarch.xjson;
    updateGameArchive(globalGameno);
    updateTables();
}

function updateGameArchive(gameno, noscroll)
{
    let jsonFile = 'json/' + abbSeason + '_' + gameno + '.pgjson';
    globalCurr = 'json/' + abbSeason + '_' + gameno + '.pgn';

    Resource(`${jsonFile}?no-cache${Now()}`, (code, data) => {
        if (code != 200) {
            LS(`cannot load ${jsonFile}`);
            return;
        }

        globalGameno = gameno;
        let navMain = $(".navbar-collapse");
        navMain.collapse('hide');
        updatePgnDataMain(data);
        $('html, body').animate({
              scrollTop: $("#event-overview").offset().top
         }, 5);
        updateH2hData(oldSchedDataCopy);
        gameListHighlight(noscroll);
        scheduleHighlight(noscroll);
        let urlupdate = "/archive.html?" + globalUrl + "&game=" + globalGameno,
            link = ARCHIVE_LINK;
        prevlink = link + "?" + globalUrl;
        LS(`globalUrl=${globalUrl}`);
        window.history.pushState("arun", "TCEC - Live Computer Chess Broadcast", urlupdate);
        if (prevPgnData)
        {
            globalLiveEval1 = "archive/" + abbSeason.toLowerCase() + "_liveeval1_" + prevPgnData.Headers.OrigRound + ".json";
            globalLiveEval = "archive/" + abbSeason.toLowerCase() + "_liveeval_" + prevPgnData.Headers.OrigRound + ".json";
            updateLiveChart();
        }
    });
}

function updateJustNavMenu()
{
    Resource('gamelist.json', (code, data) => {
        if (code == 200) {
            menuData = data;
            updateSeasonSelector(data);
        }
    });
}

function updateNavMenu()
{
    Resource('gamelist.json', (code, data) => {
        if (code == 200) {
            menuData = data;
            // setUrl();
            updateSeasonSelector(data);
        }
    });
}

function updateSeasonSelector(data)
{
    // let season2;
    let seasonmenu = $("#seasondiv");

    seasonmenu.empty();

    Keys(data.Seasons).reverse().forEach(key => {
        let value = data.Seasons[key];
        if (value.proceed == 0)
            return;

        let seasonName;
        if (!Number.isInteger(parseInt(key)))
            seasonName = key;
        else
            seasonName = 'Season ' + key;

        let seasonId = seasonName.replace(" ","");

        let season = seasonmenu.append(`
            <div id="col-12">
            <button type="button" class="text-left col-9 btn monofont" data-toggle="collapse" data-target="#${seasonId}" aria-expanded="false"  aria-controls="${seasonId}">${seasonName}<span class="caret"></span></button>
            <button type="button" class="downloadPGN col-2 btn" onclick="downloadFile('${value.download}')"><i class="fa fa-download"></i></a></button>
            <div id="${seasonId}" class="col-12 collapse"></div>
            </div>
            `);

        let innerseason = season.find("#" + seasonId);
        value.sub.sort((a,b) => (a.dno > b.dno) ? -1 : ((b.dno> a.dno) ? 1 : 0));

        Keys(value.sub).forEach(subkey => {
            let subvalue = value.sub[subkey];
            if (subvalue.proceed == 0)
                return;

            let realid = iduse !== "current" && (subvalue.id === "current" || subvalue.idf === "previous") ? subvalue.idf : subvalue.id;
            innerseason.append(`
                <div id="col-12">
                <button id="${realid}2" type="button" class="text-left col-9 btn monofontmed" onclick="loadPGN('${subvalue.id}')">${subvalue.menu}</button>
                <button type="button" class="downloadPGN col-2 btn" onclick="downloadFile('${subvalue.abb}.pgn.zip')"><i class="fa fa-download"></i></a></button>
                </div>`);
        });
    });

    $('#seasondiv > div >div >div> button:not(.downloadPGN)' ).on('click', function (e) {
        $('#seasondiv > div >div >div').removeClass('active');
        $(this).parent().addClass('active');
        $("#pills-game-tab").click();
    });

    selectSpeficicSeason(season);
}

function selectSpeficicSeason(season)
{
    // handles bugs if season is a number or undefined
    season = (season || '');
    season += '';

    let season2;
    if (!Number.isInteger(parseInt(season)))
        season2 = $("#" + season.substring(0,1).toUpperCase() + season.replace(" ","").substring(1));
    else
        season2 = $("#Season" + season.replace(" ",""));

    if (season2 && season2[0])
    {
        season2.parent().children(':first').click();
        let seasonEvent = $('#' + iduse + '2');
        if (seasonEvent != null && seasonEvent[0] != null)
        {
            $('#seasondiv > div >div >div').removeClass('active');
            seasonEvent.parent().addClass('active');
            $("#pills-game-tab").click();
        }
    }
}

function startup_archive() {
    // virtuals
    virtual_init_tables = initTablesArchive();
}
