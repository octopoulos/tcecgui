// graph.js
//
/*
globals
_, $, add_timeout, Assign, Chart, Clamp, console, DEV, document, Floor, FormatUnit, FromSeconds, Keys, load_library,
LS, Max, Min, Pad, prevPgnData, Round, TIMEOUTS, xboards, Y
*/
'use strict';

// modify those values in config.js
let CHART_JS = 'js/libs/chart.js',
    COLOR_BLACK = '#000000',
    COLOR_WHITE = '#efefef',
    ENGINE_COLORS = [COLOR_WHITE, COLOR_BLACK, '#007bff', 'darkred'],
    ENGINE_NAMES = ['White', 'Black', 'Blueleela', '7Fish'];

let all_evals = [],
    chart_data = {},
    chart_id = 'eval',                  // currently selected chart: eval, node, ...
    CHART_NAMES = {
        eval: 1,
        time: 1,
        speed: 1,
        node: 1,
        depth: 1,
        tb: 1,
    },
    charts = {},
    EVAL_CONSTANT = 10,
    liveEngineEvals = [[], [], []];     // 0 is not used

//
let blackEvalL = 0,
    firstPly = 0,
    whiteEvalL = 0;

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
            datasets: ENGINE_NAMES.map((name, id) => new_dataset(name, ENGINE_COLORS[id])),
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
                        callback: FormatUnit,
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
                        callback: FormatUnit,
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
 * Normalise an eval
 * @param {number} eval_
 * @returns {number}
 */
function normalize_eval(eval_)
{
    if (!isNaN(eval_))
        return Clamp(eval_ * 1, -EVAL_CONSTANT, EVAL_CONSTANT);

    if (eval_ && eval_[0] == '-')
        eval_ = -EVAL_CONSTANT;
    else if (eval_ != undefined)
        eval_ = EVAL_CONSTANT;
    else
        eval_ = 0;

    return eval_;
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
    Keys(charts).forEach(key => {
        reset_chart(charts[key]);
    });
}

/**
 * Update a player chart using new moves
 * - designed for white & black, not live
 * @param {string} name if empty then will use the current chart_id
 * @param {Move[]} moves
 * @param {number} start starting ply for the moves
 */
function update_player_chart(name, moves, start) {
    // 1) update ID
    if (name)
        chart_id = name;

    let data = chart_data[chart_id];
    if (!data)
        return;

    // 2) add missing labels from the start
    // TODO: compare with data[0].x to start at another move?
    let datasets = data.datasets,
        first_ply = Floor((start + 1) / 2),
        labels = data.labels,
        num_label = labels.length,
        num_move = moves.length;

    if (num_label < first_ply)
        for (let i = num_label; i < first_ply; i ++)
            labels[i] = i + 1;

    // 3) add data
    // TODO: skip existing data except if at the very end?
    for (let i = 0; i < num_move ; i ++) {
        let move = moves[i],
            ply = start + i,
            id = Floor(ply / 2);

        labels[id] = id + 1;
        if (!move || move.book)
            continue;

        let dico = {
            x: id + 1,      // move number
            ply: ply,       // used for jumping to the position
        };

        switch (chart_id) {
        case 'depth':
            datasets[ply % 2 + 2].data[id] = {...dico, ...{y: move.sd}};
            dico.y = move.d;
            break;
        case 'eval':
            dico.eval = move.wv;
            dico.y = normalize_eval(move.wv);
            break;
        case 'node':
            dico.nodes = move.n;
            dico.y = move.n;
            break;
        case 'speed':
            dico.nodes = move.n;
            dico.y = move.s;
            break;
        case 'tb':
            dico.y = move.tb;
            break;
        case 'time':
            dico.y = Round(move.mt / 1000);
            break;
        }

        datasets[ply % 2].data[id] = dico;
    }

    charts[chart_id].update();
}

// REMOVE
/////////

function addDataLive(chart, data, black, contno)
{
    if (!whiteEvalL)
        return;

    let chart_data = chart.data;
    if (chart_data.datasets[contno + 1].data.length == 0)
        return;

    data.y = normalize_eval(data.eval);
    let length = Max(whiteEvalL, blackEvalL);

    if (length == 0)
        return;

    if (!black)
        chart_data.labels[length] = data.x;

    chart_data.datasets[contno + 1].data[black? (whiteEvalL - 1): length] = data;
    chart.update();
}

function addData(chart, data, black)
{
    data.y = normalize_eval(data.eval);

    if (!whiteEvalL)
        return;

    let length = Max(whiteEvalL, blackEvalL);
    if (length == 0)
        return;

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

        evalObject.eval = normalize_eval(evall);
        return {
            x: moveNumber,
            y: evalObject.eval,
            eval: evall,
        };
    }

    return {x: moveNumber, y: null, eval: null};
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

// STARTUP
//////////

/**
 * Load the chart.js library
 */
function init_graph() {
    load_library(CHART_JS, () => {
        create_chart_data();
        create_charts();
        update_player_chart(null, xboards.board.moves, 0);
    });
}

/**
 * Startup graphs
 * - initialise global variables
 */
function startup_graph() {
}
