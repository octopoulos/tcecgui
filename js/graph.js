// graph.js
/*
globals
_, $, Assign, Chart, Clamp, console, DEV, document, FormatUnit, FromSeconds, Keys, LoadLibrary, LS,
Max, Min, Pad, prevPgnData, Round, Y
*/
'use strict';

// you can modify these
let COLOR_BLACK = '#000000',
    COLOR_WHITE = '#efefef',
    engine_colors = [COLOR_WHITE, COLOR_BLACK, '#007bff', 'darkred', 'green', 'yellow', 'purple', 'orange'],
    engine_names = ['White', 'Black', 'Blueleela', '7Fish'];

let all_evals = [],
    chart_data = {},
    charts = {},
    liveEngineEvals = [[], [], []];     // 0 is not used

//
let blackEval = [],
    blackEvalL = 0,
    blackStarted = 0,
    evalconstant = 10.0,
    firstPly = 0,
    whiteEval = [],
    whiteEvalL = 0;

/**
 * Create a dataset
 * - prevents excessive copy/pasting => makes the code a lot shorter!
 * @param {string} label
 * @param {string} color
 * @param {string=} yaxis
 * @param {Object=} dico
 * @returns {Object}
 */
function new_dataset(label, color, yaxis, dico) {
    let dataset = {
        backgroundColor: color,
        borderColor: color,
        data: [],
        fill: false,
        label: label,
        lineTension: 0,
        yAxisID: yaxis,
    };

    if (dico)
        Assign(dataset, dico);
    return dataset;
}

/**
 * Create all chart data
 */
function create_chart_data() {
    Assign(chart_data, {
        depth: {
            labels: [],
            datasets: [
                new_dataset('White Depth', COLOR_WHITE),
                new_dataset('Black Depth', '#1a1a1a', '', {borderDash: [10, 5]}),
                new_dataset('W. Sel Depth', '#b1b1b1'),
                new_dataset('B. Sel Depth', '#7e7e7e', '', {borderDash: [10, 5]}),
            ],
        },
        eval: {
            labels: [],
            datasets: engine_names.map((name, id) => new_dataset(name, engine_colors[id])),
        },
        node: {
            labels: [],
            datasets: [
                new_dataset('White Speeds', COLOR_WHITE, 'y-axis-1'),
                new_dataset('Black Speed', COLOR_BLACK, 'y-axis-2'),
            ],
        },
        speed: {
            labels: [],
            datasets: [
                new_dataset('White Speeds',COLOR_WHITE, 'y-axis-1'),
                new_dataset('Black Speed', COLOR_BLACK, 'y-axis-2'),
            ],
        },
        tb: {
            labels: [],
            datasets: [
                new_dataset('White TB Hits', COLOR_WHITE, 'tb-y-axis-1'),
                new_dataset('Black TB Hits', COLOR_BLACK, 'tb-y-axis-2'),
            ],
        },
        time: {
            labels: [],
            datasets: [
                new_dataset('White Time', COLOR_WHITE),
                new_dataset('Black Time', COLOR_BLACK),
            ],
        },
    });
}

// format axes scale
function formatScale(value) {
    if (value >= 1000000)
        value = `${Round(value / 100000) / 10}M`;
    else
        value = `${Round(value / 100) / 10}k`;
    return value;
}

/**
 * Create all charts
 * - only linear but allow scale type registration.
 * - This allows extensions to exist solely for log scale for instance
 */
function create_charts()
{
    charts.depth = charts.depth || new Chart('table-depth', {
        type: 'line',
        data: chart_data.depth,
        options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
                display: true,
                position: 'bottom',
                fontSize: 5,
                labels: {
                    boxWidth: 1,
                },
            },
            title: {
                display: false,
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'd-y-axis-1',
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
            tooltips: {
                mode: 'index',
            },
        },
    });

    charts.eval = charts.eval || new Chart('table-eval', {
        type: 'line',
        data: chart_data.eval,
        options: {
            responsive: true,
            bezierCurve: false,
            hoverMode: 'index',
            spanGaps: true,
            stacked: false,
            legend: {
                display: true,
                position: 'bottom',
                fontSize: 5,
                labels: {
                    boxWidth: 1
                },
            },
            title: {
                display: false
            },
            tooltips: {
                mode: 'index',
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'e-y-axis-1',
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
        },
    });

    charts.node = charts.node || new Chart('table-node', {
        type: 'line',
        data: chart_data.node,
        options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'y-axis-1',
                    ticks: {
                        callback: FormatUnit,
                    },
                }, {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    id: 'y-axis-2',
                    gridLines: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: FormatUnit,
                    },
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
            tooltips: {
                mode: 'index',
                callbacks: {
                    label: (tooltipItem, data) => {
                        let nodes = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes);
                        return nodes;
                    },
                },
            },
        },
    });

    charts.speed = charts.speed || new Chart('table-speed', {
        type: 'line',
        data: chart_data.speed,
        options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
                display: false
            },
            title: {
                display: false
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'y-axis-1',
                    ticks: {
                        callback: formatScale,
                    }
                }, {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    id: 'y-axis-2',
                    gridLines: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: formatScale,
                    },
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
            tooltips: {
                mode: 'index',
                callbacks: {
                    label: (tooltipItem, data) => {
                        let nodes = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes),
                            speed = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
                        return `${speed}nps (${nodes} nodes)`;
                    },
                },
            },
        },
    });

    charts.tb = charts.tb || new Chart('table-tb', {
        type: 'line',
        data: chart_data.tb,
        options: {
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 'tb-y-axis-1',
                    ticks: {
                        callback: formatScale,
                    }
                }, {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    id: 'tb-y-axis-2',
                    gridLines: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: formatScale,
                    },
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
            tooltips: {
                mode: 'index',
                callbacks: {
                    label: (tooltipItem, data) => {
                        let hits = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
                        return hits;
                    },
                },
            },
        },
    });

    charts.time = charts.time || new Chart('table-time', {
        type: 'line',
        data: chart_data.time,
        options: {
            backgroundColor: 'rgb(10,10,10)',
            responsive: true,
            hoverMode: 'index',
            stacked: false,
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    display: true,
                    position: 'left',
                    id: 't-y-axis-1',
                }],
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 25,
                    },
                }],
            },
            tooltips: {
                mode: 'index',
                callbacks: {
                    label: (tooltipItem, data) => {
                        let [_, min, sec] = FromSeconds(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
                        return `${min}:${Pad(sec)}`;
                    },
                },
            },
        },
    });
}

function addDataLive(chart, data, black, contno)
{
    if (!whiteEvalL)
        return;

    let chart_data = chart.data;
    if (chart_data.datasets[contno + 1].data.length == 0)
    {
        if (DEV.graph & 1)
            LS("YYY: Chart not yet updated, so exiting");
        return;
    }

    data.y = getEval(data.eval);
    let length = Max(whiteEvalL, blackEvalL);

    if (length == 0)
    {
        if (DEV.graph & 1)
            LS("XXX: Chart not yet updated, so exiting");
        return;
    }

    if (!black)
        chart_data.labels[length] = data.x;

    chart_data.datasets[contno + 1].data[black? (whiteEvalL - 1): length] = data;
    chart.update();
}

function addData(chart, data, black)
{
    data.y = getEval(data.eval);

    if (!whiteEvalL)
        return;

    let length = Max(whiteEvalL, blackEvalL);
    if (length == 0)
    {
        if (DEV.graph & 1)
            LS("XXX: Chart not yet updated, so exiting");
        return;
    }

    if (black)
    {
        chart.data.datasets[1].data[blackEvalL] = data;
        length = blackEvalL;
    }
    else
    {
        chart.data.labels[length] = data.x;
        chart.data.datasets[0].data[length] = data;
    }

    chart.update();
}

function removeData(chart, data, black)
{
    addData(chart, data, black);
}

function getLiveEval(key, moveNumber, isBlack, contno)
{
    // CHECK THIS
    let engineEval = liveEngineEvals[contno],
        evalObject = engineEval.find(ev => ev.ply == key);

    if (typeof(evalObject) == 'object') {
        let evall = evalObject.eval;
        if (isBlack)
            evall *= -1;

        evalObject.eval = getEval(evall);
        return {
            x: moveNumber,
            y: evalObject.eval,
            eval: evall,
        };
    }

    return {x: moveNumber, y: null, eval: null};
}

/**
 * Reset a chart
 * @param {Object} chart
 */
function reset_chart(chart) {
    if (!chart)
        return;

    let data = chart.data;
    data.labels.length = 0;
    for (let dataset of data.datasets)
        dataset.data.length = 0;

    chart.update();
}

/**
 * Reset all charts
 */
function reset_charts()
{
    blackEval = [];
    firstPly = 0;
    whiteEval = [];

    Keys(charts).forEach(key => {
        reset_chart(charts[key]);
    });
}

/**
 * Normalise an eval
 * @param {number} eval_
 * @returns {number}
 */
function getEval(eval_)
{
    if (!isNaN(eval_))
        return Clamp(eval_, -evalconstant, evalconstant);

    if (eval_ && eval_[0] == '-')
        eval_ = -evalconstant;
    else if (eval_ != undefined)
        eval_ = evalconstant;
    else
        eval_ = 0;

    return eval_;
}

function arrayPush(chart, number, datax, index, movenum)
{
    if (chart) {
        chart.data.labels[index] = movenum;
        chart.data.datasets[number].data[index] = datax;
    }
}

function updateChartDataLive(id)
{
    if (!Y[`live_engine${id}`])
        return;

    let done = `didliveEval${id}`,
        eval_data = charts.eval.data,
        needtoUpdate = 0,
        startEval = whiteEvalL;

    if (!startEval)
        return;

    if (prevPgnData.Moves[0][done] == undefined)
        prevPgnData.Moves[0][done] = 0;

    let endVal = Min(startEval - 2, prevPgnData.Moves[0][done]);
    prevPgnData.Moves[0][done] = 0;

    for (let ctr = startEval; ctr >= endVal; ctr --)
    {
        let dataToUse = eval_data.datasets[0].data[ctr],
            key = 0,
            isBlack = 0;

        if (dataToUse)
            key = dataToUse.ply;

        // LS("RRR: Doing for ctrl:" + ctr + " ,startEval:" + startEval);

        if (eval_data.datasets[1].data[ctr] != undefined)
        {
            dataToUse = eval_data.datasets[1].data[ctr];
            key = dataToUse.ply;
            isBlack = 1;
        }

        if (dataToUse != undefined)
        {
            needtoUpdate = 1;
            let moveNumber = dataToUse.x,
                evalObject = getLiveEval(key, moveNumber, isBlack, id);
            /*LS("RRR: cont2 Doing for ctrl:" + ctr + ", key:" + key + " ,startEval:" + startEval + ", evalObject:" + evalObject.y + " ,isblack:" + isBlack);*/
            if (!prevPgnData.Moves[0][done])
            {
                prevPgnData.Moves[0][done] = ctr;
                /*LS("RRR:X setting cont2 Doing for ctrl:" + ctr + ", key:" + key + " ,startEval:" + startEval + ", evalObject:" + evalObject.y + " ,isblack:" + isBlack);*/
            }
            if (evalObject.y == null)
                prevPgnData.Moves[0][done] = ctr;
            else
                eval_data.datasets[1 + id].data[ctr] = evalObject;
        }
    }

    if (needtoUpdate)
        charts.eval.update();
}

function updateChartData()
{
    if (DEV.graph & 1)
        LS(`GRAPH: updateChartData : whiteEvalL=${whiteEvalL}`);

    if (prevPgnData.Moves)
    {
        if (DEV.graph & 1)
            LS(`GRAPH: prevPgnData.Moves.length=${prevPgnData.Moves.length} : whiteEvalL=${whiteEvalL} : charts.eval.data.labels.length=${charts.eval.data.labels.length}`);
        if (prevPgnData.Moves[0].completed == undefined || charts.eval.data.labels.length == 0)
        {
            reset_charts();
            prevPgnData.Moves[0].completed = 0;
            prevPgnData.Moves[0].arrayStartW = 0;
            prevPgnData.Moves[0].arrayStartB = 0;
        }
    }
    else
    {
        reset_charts();
        return;
    }

    let needtoUpdate = 0,
        arrayCtrW = prevPgnData.Moves[0].arrayStartW,
        arrayCtrB = prevPgnData.Moves[0].arrayStartB;

    if (0 && (arrayCtrW - 2) > 0)
    {
        arrayCtrW -= 2;
        arrayCtrB -= 2;
        prevPgnData.Moves[0].completed -= 4;
        if (DEV.graph & 1)
            LS(`GRAPH: prevPgnData.Moves.length=$prevPgnData.Moves.length} : whiteEvalL=${whiteEvalL} : charts.eval.data.labels.length=${charts.eval.data.labels.length}`);
    }

    whiteEvalL = 0;
    blackEvalL = 0;

    for (let moveCtr = prevPgnData.Moves[0].completed; moveCtr < prevPgnData.Moves.length ; moveCtr++)
    {
        let key = moveCtr,
            move = prevPgnData.Moves[moveCtr];

        if (move.book)
        {
            prevPgnData.Moves[moveCtr].done = 1;
            continue;
        }

        let moveNumber = Round(moveCtr / 2) + 1,
            plyNum = 0;

        if (moveCtr % 2 != 0) {
            plyNum = moveCtr + 1;
            moveNumber--;
        }
        else
            plyNum = moveCtr + 1;

        if (plyNum < prevPgnData.Moves[0].completed)
            continue;

        if (!move.book) {
            needtoUpdate = 1;
            prevPgnData.Moves[0].completed = moveCtr + 1;
            let ydepth = move.d;

            move.cwv = getEval(move.wv);

            let evall =
            {
                'x': moveNumber,
                'y': move.cwv,
                'ply': plyNum,
                'eval': move.wv
            },
            time =
            {
                'x': moveNumber,
                'y': Round(move.mt / 1000),
                'ply': plyNum
            },
            speed =
            {
                'x': moveNumber,
                'y': move.s,
                'nodes': move.n,
                'ply': plyNum
            },
            depth =
            {
                'x': moveNumber,
                'y': ydepth,
                'ply': plyNum
            },
            seldepth =
            {
                'x': moveNumber,
                'y': move.sd,
                'ply': plyNum,
            },
            tbHits =
            {
                'x': moveNumber,
                'y': move.tb,
                'ply': plyNum,
            },
            nodes =
            {
                'x': moveNumber,
                'y': move.n,
                'nodes': move.n,
                'ply': plyNum,
            };

            if (!firstPly)
            {
                firstPly = plyNum;
                if (firstPly % 2 == 0)
                {
                    blackStarted = 1;
                    charts.eval.data.labels[arrayCtrW] = moveNumber;
                    arrayCtrW ++;
                }
            }

            if (DEV.graph & 1)
                LS(`LLL: doing for key=${key} : prevPgnData.Moves[0].arrayStartW=${prevPgnData.Moves[0].arrayStartW}`
                    + ` : prevPgnData.Moves[0].arrayStartB=${prevPgnData.Moves[0].arrayStartB} : blackStarted=${blackStarted}`);

            if (key % 2 == 0) {
                charts.eval.data.labels[arrayCtrW] = moveNumber;
                charts.eval.data.datasets[0].data[arrayCtrW] = evall;
                arrayPush(charts.node, 0, nodes, arrayCtrW, moveNumber);
                arrayPush(charts.time, 0, time, arrayCtrW, moveNumber);
                arrayPush(charts.speed, 0, speed, arrayCtrW, moveNumber);
                arrayPush(charts.depth, 0, depth, arrayCtrW, moveNumber);
                arrayPush(charts.depth, 2, seldepth, arrayCtrW, moveNumber);
                arrayPush(charts.tb, 0, tbHits, arrayCtrW, moveNumber);
                arrayCtrW ++;
                prevPgnData.Moves[0].arrayStartW = arrayCtrW;
            }
            else
            {
                charts.eval.data.datasets[1].data[arrayCtrB] = evall;
                arrayPush(charts.node, 1, nodes, arrayCtrB, moveNumber);
                arrayPush(charts.time, 1, time, arrayCtrB, moveNumber);
                arrayPush(charts.speed, 1, speed, arrayCtrB, moveNumber);
                arrayPush(charts.depth, 1, depth, arrayCtrB, moveNumber);
                arrayPush(charts.depth, 3, seldepth, arrayCtrB, moveNumber);
                arrayPush(charts.tb, 1, tbHits, arrayCtrB, moveNumber);
                arrayCtrB ++;
                prevPgnData.Moves[0].arrayStartB = arrayCtrB;
            }
        }
    }

    // update all charts
    Keys(charts).forEach(key => {
        charts[key].update();
    });

    if (arrayCtrW)
        whiteEvalL = arrayCtrW;
    if (arrayCtrB)
        blackEvalL = arrayCtrB;

    if (DEV.graph & 1)
        LS(`GRAPH: ~updateChartData : needtoUpdate=${needtoUpdate} : arrayCtrW=${arrayCtrW} : arrayCtrB=${arrayCtrB}`
            + `prevPgnData.Moves[0].completed=${prevPgnData.Moves[0].completed} : charts.eval.data.labels.length=${charts.eval.data.labels.length}`);
}

/**
 * Startup graphs
 * - load the library and then create the charts =>
 */
function startup_graphs() {
    LoadLibrary('js/libs/chart.js', () => {
        LS('CHART LIBRARY LOADED!');
        create_chart_data();
        create_charts();
    });
}
