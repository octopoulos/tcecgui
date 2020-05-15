// graph.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-14
//
/*
globals
_, $, add_timeout, Assign, C, Chart, Clamp, console, DEV, document, Floor, FormatUnit, FromSeconds, get_move_ply,
Keys, load_library, LS, Max, Min, Pad, prevPgnData, Round, TIMEOUTS, xboards, window, Y
*/
'use strict';

// modify those values in config.js
let CHART_JS = 'js/libs/chart-quick.js',
    COLOR_BLACK = '#000000',
    COLOR_WHITE = '#efefef',
    ENGINE_COLORS = [COLOR_WHITE, COLOR_BLACK, '#007bff', '#8b0000'],
    ENGINE_NAMES = ['White', 'Black', '7Blue', '7Red'],
    LIVE_ENGINES = [];

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
    first_num = -1,
    MAX_EVAL = 10;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Clamp an eval
 * @param {number} eval_
 * @returns {number}
 */
function clamp_eval(eval_)
{
    if (!isNaN(eval_))
        return Clamp(eval_ * 1, -MAX_EVAL, MAX_EVAL);

    if (eval_ && eval_.includes('-'))
        eval_ = -MAX_EVAL;
    else if (eval_ != undefined)
        eval_ = MAX_EVAL;
    else
        eval_ = 0;

    return eval_;
}

/**
 * Create all chart data
 */
function create_chart_data() {
    Assign(chart_data, {
        depth: {
            labels: [],
            datasets: [
                new_dataset('W. Depth', COLOR_WHITE),
                new_dataset('B. Depth', '#1a1a1a', '', {borderDash: [10, 5]}),
                new_dataset('W. Sel depth', '#b1b1b1'),
                new_dataset('B. Sel depth', '#7e7e7e', '', {borderDash: [10, 5]}),
            ],
        },
        eval: {
            labels: [],
            datasets: ENGINE_NAMES.map((name, id) => new_dataset(name, Y[`graph_color_${id}`])),
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
    // 1) common options
    let options = {
        hoverMode: 'index',
        legend: {
            display: false
        },
        maintainAspectRatio: false,
        responsive: true,
        title: {
            display: false,
        },
        tooltips: {
            mode: 'index',
        },
    };

    // 2) create all charts
    charts.depth = charts.depth || new Chart('chart-depth', {
        type: 'line',
        data: chart_data.depth,
        options: Assign(Assign({}, options), {
            legend: {
                display: true,
                position: 'bottom',
                fontSize: 5,
                labels: {
                    boxWidth: 1,
                },
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
        }),
    });

    charts.eval = charts.eval || new Chart('chart-eval', {
        type: 'line',
        data: chart_data.eval,
        options: Assign(Assign({}, options), {
            bezierCurve: false,
            legend: {
                display: true,
                position: 'bottom',
                fontSize: 5,
                labels: {
                    boxWidth: 1
                },
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
            spanGaps: true,
        }),
    });

    charts.node = charts.node || new Chart('chart-node', {
        type: 'line',
        data: chart_data.node,
        options: Assign(Assign({}, options), {
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
        }),
    });

    charts.speed = charts.speed || new Chart('chart-speed', {
        type: 'line',
        data: chart_data.speed,
        options: Assign(Assign({}, options), {
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
        }),
    });

    charts.tb = charts.tb || new Chart('chart-tb', {
        type: 'line',
        data: chart_data.tb,
        options: Assign(Assign({}, options), {
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
        }),
    });

    charts.time = charts.time || new Chart('chart-time', {
        type: 'line',
        data: chart_data.time,
        options: Assign(Assign({}, options), {
            backgroundColor: 'rgb(10,10,10)',
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
        }),
    });

    // 3) click events
    Keys(charts).forEach(name => {
        C(`#chart-${name}`, e => {
            let chart = charts[name],
                point = chart.getElementAtEvent(e)[0];
            if (!point)
                return;

            let ds_index = point._datasetIndex,
                index = point._index,
                dico = chart.data.datasets[ds_index].data[index];

            if (dico)
                xboards[Y.x].set_ply(dico.ply);
        });
    });

    update_chart_options(3);
}

/**
 * Fix labels that are undefined
 * - the last label needs to be set, otherwise there won't be any change
 * @param {string[]} labels
 */
function fix_labels(labels) {
    let num_label = labels.length;
    if (!num_label)
        return;

    let offset = labels[num_label - 1] - num_label + 1;
    if (isNaN(offset))
        return;

    for (let i = 0; i < num_label; i ++)
        if (labels[i] == undefined)
            labels[i] = i + offset;
}

/**
 * Invert an eval:
 * - 9 => -9
 * - #M33 => -M#33, and -#M40 => #M40
 * @param {string|number} eval_
 */
function invert_eval(eval_) {
    if (!isNaN(eval_))
        return -eval_;

    if (!eval_)
        return eval_;

    // here, we have a string
    return (eval_[0] == '-')? eval_.slice(1): `-${eval_}`;
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
    first_num = -1;
    Keys(charts).forEach(key => {
        reset_chart(charts[key]);
    });
}

/**
 * Update chart options
 * @param {number} mode &1:colors, &2:line + font size
 */
function update_chart_options(mode) {
    // eval colors
    if (mode & 1) {
        let data = chart_data.eval;
        if (!data)
            return;
        let datasets = data.datasets;

        for (let id = 0; id < 4; id ++) {
            let color = Y[`graph_color_${id}`],
                dataset = datasets[id];
            dataset.backgroundColor = color;
            dataset.borderColor = color;
        }
    }

    // line width + update
    Keys(charts).forEach(key => {
        let chart = charts[key];
        if (!chart)
            return;

        if (mode & 2) {
            let datasets = chart.data.datasets,
                options = chart.options,
                ratio = chart.canvas.parentNode.clientWidth / 300,
                line_width = Y.graph_line * ratio,
                text_size = Y.graph_text * ratio;

            for (let dataset of datasets)
                Assign(dataset, {
                    borderWidth: line_width,
                    pointRadius: line_width,
                });

            // 316 px => 10
            options.scales.xAxes[0].ticks.fontSize = text_size;
            options.scales.yAxes[0].ticks.fontSize = text_size;
            options.legend.labels.fontSize = text_size;
        }

        chart.update();
    });
}

/**
 * Update the eval chart from a Live source
 * @param {Move[]} moves
 * @param {number} start
 * @param {id} id can be: 0=white, 1=black, 2=live0, 3=live1, ...
 * @param {boolean=} invert_black invert black evals
 */
function update_live_chart(moves, id, invert_black) {
    let data = chart_data.eval;
    if (!data)
        return;

    let dataset = data.datasets[id],
        labels = data.labels;

    for (let move of moves) {
        let eval_ = move.eval,
            ply = get_move_ply(move),
            num = Floor(ply / 2);
        if (ply < -1)
            continue;

        if (first_num < 0 || num < first_num)
            first_num = num;
        let num2 = num - first_num;
        labels[num2] = num + 1;

        if (invert_black && ply % 2 == 0) {
            eval_ = invert_eval(eval_);
            if (DEV.eval)
                LS(`inverting black @${ply}: ${move.eval} => ${eval_}`);
        }

        // check update_player_chart to understand
        dataset.data[num2] = {
            eval: eval_,
            x: num + 1,
            ply: ply,
            y: clamp_eval(eval_),
        };
    }

    fix_labels(labels);
    charts.eval.update();
}

/**
 * Update a player chart using new moves
 * - designed for white & black, not live
 * @param {string} name if empty then will use the current chart_id
 * @param {Move[]} moves
 */
function update_player_chart(name, moves) {
    // 1) update ID
    if (name)
        chart_id = name;

    let data = chart_data[chart_id];
    if (!data)
        return;

    let datasets = data.datasets,
        labels = data.labels,
        num_move = moves.length,
        offset = 0;

    // 2) skip all book moves
    while (offset < num_move && (!moves[offset] || moves[offset].book))
        offset ++;

    // 3) add data
    for (let i = offset; i < num_move ; i ++) {
        let move = moves[i],
            ply = get_move_ply(move),
            num = Floor(ply / 2);
        if (ply < -1)
            continue;

        if (first_num < 0 || num < first_num)
            first_num = num;
        let num2 = num - first_num;
        labels[num2] = num + 1;

        let dico = {
            x: num + 1,     // move number
            ply: ply,       // used for jumping to the position
        };

        switch (chart_id) {
        case 'depth':
            datasets[ply % 2 + 2].data[num2] = Assign(Assign({}, dico), {y: move.sd});
            dico.y = move.d;
            break;
        case 'eval':
            dico.eval = move.wv;
            dico.y = clamp_eval(move.wv);
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

        datasets[ply % 2].data[num2] = dico;
    }

    fix_labels(labels);
    charts[chart_id].update();
}

/**
 * Update a player charts using new moves
 * - designed for white & black, not live
 * @param {string} name if empty then will use the current chart_id or update all charts
 * @param {Move[]} moves
 */
function update_player_charts(name, moves) {
    if (!name && Y.graph_all) {
        Keys(charts).forEach(key => {
            update_player_chart(key, moves);
        });
    }
    else
        update_player_chart(name, moves);
}

// STARTUP
//////////

/**
 * Load the chart.js library
 * - it might be bundled already => skip loading in that case
 * @param {function} callback
 */
function init_graph(callback) {
    function _done() {
        create_chart_data();
        create_charts();
        update_player_chart(null, xboards[Y.x].moves);
        callback();
    }

    if (window.Chart)
        _done();
    else
        load_library(CHART_JS, () => {_done();});
}

/**
 * Startup graphs
 * - initialise global variables
 */
function startup_graph() {
}
