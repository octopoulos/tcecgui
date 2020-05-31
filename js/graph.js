// graph.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-05-24
//
/*
globals
_, Abs, Assign, C, Chart, Clamp, DEV, Floor, FormatUnit, FromSeconds, get_move_ply, Keys, load_library, LS, Pad, Round,
Visible, window, xboards, Y
*/
'use strict';

// modify those values in config.js
let CHART_JS = 'js/libs/chart-quick.js',
    ENGINE_NAMES = ['White', 'Black', '7Blue', '7Red'],
    LIVE_ENGINES = [];

let all_evals = [],
    chart_data = {},
    CHART_LEGEND = {
        display: true,
        fontSize: 5,
        position: 'bottom',
        labels: {
            boxWidth: 1
        },
    },
    CHART_OPTIONS = {
        hoverMode: 'index',
        legend: {
            display: false
        },
        maintainAspectRatio: false,
        responsive: true,
        spanGaps: true,
        title: {
            display: false,
        },
        tooltips: {
            mode: 'index',
        },
    },
    CHART_X_AXES = {
        ticks: {
            callback: (value, _index, values) => (values.length <= 20)? value: Floor(value),
            maxTicksLimit: 19,
        },
    },
    charts = {},
    first_num = -1,
    queued_charts = [];

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Check if the first_num should be modified
 * - unshift the dataset & labels if needed
 * @param {number} num
 */
function check_first_num(num) {
    if (first_num >= 0 && first_num <= num)
        return;
    if (DEV.chart)
        LS(`first_num: ${first_num} => ${num}`);

    if (first_num >= 0) {
        Keys(chart_data).forEach(key => {
            let data = chart_data[key];

            // labels
            for (let ply = first_num - 1 ; ply >= num; ply --)
                data.labels.unshift(ply / 2 + 1);

            // datasets
            for (let dataset of data.datasets) {
                for (let ply = first_num - 1 ; ply >= num; ply --)
                    dataset.data.unshift(undefined);
            }
        });
    }

    first_num = num;
}

/**
 * Clamp an eval
 * @param {number} eval_
 * @returns {number}
 */
function clamp_eval(eval_)
{
    let eval_clamp = Y.eval_clamp;
    if (!isNaN(eval_))
        return Clamp(eval_ * 1, -eval_clamp, eval_clamp);

    if (eval_ && eval_.includes('-'))
        eval_ = -eval_clamp;
    else if (eval_ != undefined)
        eval_ = eval_clamp;
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
            datasets: [
                new_dataset('W. Depth', Y.graph_color_0),
                new_dataset('B. Depth', '#1a1a1a', '', {borderDash: [10, 5]}),
                new_dataset('W. Sel depth', '#b1b1b1'),
                new_dataset('B. Sel depth', '#7e7e7e', '', {borderDash: [10, 5]}),
            ],
            labels: [],
        },
        eval: {
            datasets: ENGINE_NAMES.map((name, id) => new_dataset(name, Y[`graph_color_${id}`])),
            labels: [],
        },
        mobil: {
            datasets: [
                new_dataset('W. Mobility', Y.graph_color_0),
                new_dataset('B. Mobility', Y.graph_color_1),
                new_dataset('r-mobility', '#7e7eff', '', {borderDash: [10, 5]}),
            ],
            labels: [],
        },
        node: {
            datasets: [
                new_dataset('White Speeds', Y.graph_color_0, 'y-axis-1'),
                new_dataset('Black Speed', Y.graph_color_1, 'y-axis-2'),
            ],
            labels: [],
        },
        speed: {
            datasets: [
                new_dataset('White Speeds',Y.graph_color_0, 'y-axis-1'),
                new_dataset('Black Speed', Y.graph_color_1, 'y-axis-2'),
            ],
            labels: [],
        },
        tb: {
            datasets: [
                new_dataset('White TB Hits', Y.graph_color_0, 'y-axis-1'),
                new_dataset('Black TB Hits', Y.graph_color_1, 'y-axis-2'),
            ],
            labels: [],
        },
        time: {
            datasets: [
                new_dataset('White Time', Y.graph_color_0),
                new_dataset('Black Time', Y.graph_color_1),
            ],
            labels: [],
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
    // 1) create all charts
    new_chart('depth', true, [1]);
    new_chart('eval', true, [1]);
    new_chart('mobil', true, [1]);
    new_chart('node', false, [1, 2], FormatUnit, (tooltipItem, data) => {
        let nodes = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes);
        return nodes;
    });
    new_chart('speed', false, [1, 2], FormatUnit, (tooltipItem, data) => {
        let nodes = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes),
            speed = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
        return `${speed}nps (${nodes} nodes)`;
    });
    new_chart('tb', false, [1, 2], FormatUnit, (tooltipItem, data) => {
        let hits = FormatUnit(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
        return hits;
    });
    new_chart('time', false, [1], undefined, (tooltipItem, data) => {
        let [_, min, sec] = FromSeconds(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
        return `${min}:${Pad(sec)}`;
    }, {backgroundColor: 'rgb(10, 10, 10)'});

    // 2) click events
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
                xboards[Y.x].set_ply(dico.ply, {manual: true});
        });
    });

    update_chart_options(null, 3);
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
 * @returns {string|number}
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
 * Create a new chart
 * - an element with id="chart-{name}" must exist
 * @param {string} name
 * @param {boolean} has_legend
 * @param {number[]} y_axes [1] or [1, 2]
 * @param {function=} scale_callback FormatUnit
 * @param {function=} tooltip_callback
 * @param {Object=} dico
 */
function new_chart(name, has_legend, y_axes, scale_callback, tooltip_callback, dico) {
    let options = Assign(Assign({}, CHART_OPTIONS), {
        scales: {
            xAxes: [CHART_X_AXES],
            yAxes: y_axes.map(id => new_y_axis(id, scale_callback)),
        },
    });

    if (has_legend)
        options.legend = Assign({}, CHART_LEGEND);

    if (tooltip_callback)
        options.tooltips = {
            callbacks: {
                label: tooltip_callback,
            },
            mode: 'index',
        };

    if (dico)
        Assign(options, dico);

    charts[name] = charts[name] || new Chart(`chart-${name}`, {
        data: chart_data[name],
        options: options,
        type: 'line',
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
        lineTension: Y.graph_tension,
        pointHitRadius: 4,
        yAxisID: yaxis,
    };

    if (dico)
        Assign(dataset, dico);
    return dataset;
}

/**
 * Create a Y axis
 * @param {number} id 1 for left, 2 for right
 * @param {function=} callback
 * @param {Object=} dico
 * @returns {Object}
 */
function new_y_axis(id, callback, dico) {
    let y_axis = {
        display: true,
        id: `y-axis-${id}`,
        position: (id == 1)? 'left': 'right',
        type: 'linear',
    };

    if (id == 2)
        y_axis.gridLines = {drawOnChartArea: false};

    if (callback)
        y_axis.ticks = {callback: callback};

    if (dico)
        Assign(y_axis, dico);
    return y_axis;
}

/**
 * Reset a chart
 * @param {Object} chart
 */
function reset_chart(chart) {
    if (!chart)
        return;

    let data_c = chart.data;
    data_c.labels.length = 0;
    for (let dataset of data_c.datasets)
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
 * Slice charts from a specific index (ply - first_num)
 * @param {number} last_ply
 */
function slice_charts(last_ply) {
    if (isNaN(last_ply))
        return;

    let from = 0,
        to = last_ply - first_num + 2;
    if (DEV.chart)
        LS(`SC: ${last_ply} - ${first_num} + 2 = ${to}`);

    Keys(charts).forEach(key => {
        let chart = charts[key],
            data_c = chart_data[key];

        if (DEV.chart && data_c.labels.length > to)
            LS(`SC:${chart.name} : ${data_c.labels.length} > ${to}`);

        data_c.labels = data_c.labels.slice(from, to);
        for (let dataset of data_c.datasets)
            dataset.data = dataset.data.slice(from, to);

        chart.update();
    });
}

/**
 * Update chart options
 * @param {string} name null for all charts
 * @param {number} mode &1:colors, &2:line + font size
 */
function update_chart_options(name, mode) {
    // eval colors
    if (mode & 1) {
        if (!name || name == 'eval') {
            let data = chart_data.eval;
            if (!data)
                return;
            let datasets = data.datasets;

            for (let id = 0; id < 4; id ++) {
                let color = Y[`graph_color_${id}`];
                Assign(datasets[id], {
                    backgroundColor: color,
                    borderColor: color,
                });
            }
        }
    }

    // line width + update
    Keys(charts).forEach(key => {
        if (name && name != key)
            return;

        let chart = charts[key];
        if (!chart)
            return;

        if (mode & 2) {
            let datasets = chart.data.datasets,
                options = chart.options,
                ratio = chart.canvas.parentNode.clientWidth / 300,
                line_width = Y.graph_line * ratio,
                point_radius = Y.graph_radius * ratio,
                text_size = Y.graph_text * ratio;

            for (let dataset of datasets)
                Assign(dataset, {
                    borderWidth: line_width,
                    lineTension: Y.graph_tension,
                    pointRadius: point_radius,
                    showLine: line_width > 0,
                });

            // axes
            let scales = options.scales;
            scales.xAxes[0].ticks.fontSize = text_size;
            for (let yaxis of scales.yAxes)
                yaxis.ticks.fontSize = text_size;

            options.legend.labels.fontSize = text_size;
            options.legend.labels.padding = text_size * 0.8;
        }

        chart.update();
    });
}

/**
 * Update the eval chart from a Live source
 * @param {Move[]} moves
 * @param {id} id can be: 0=white, 1=black, 2=live0, 3=live1, ...
 * @param {boolean=} invert_black invert black evals
 */
function update_live_chart(moves, id, invert_black) {
    // library hasn't loaded yet => queue
    let data_c = chart_data.eval;
    if (!data_c) {
        queued_charts.push([moves, id, invert_black]);
        return;
    }

    let dataset = data_c.datasets[id],
        data = dataset.data,
        labels = data_c.labels;

    for (let move of moves) {
        let eval_ = move.eval,
            ply = get_move_ply(move),
            num = ply;
        if (ply < -1)
            continue;

        check_first_num(num);
        let num2 = num - first_num;
        labels[num2] = num / 2 + 1;

        if (invert_black && ply % 2 == 0) {
            eval_ = invert_eval(eval_);
            if (DEV.eval2)
                LS(`inverting black @${ply}: ${move.eval} => ${eval_}`);
        }

        // check update_player_chart to understand
        data[num2] = {
            eval: eval_,
            ply: ply,
            x: num / 2 + 1,
            y: clamp_eval(eval_),
        };
    }

    fix_labels(labels);
    charts.eval.update();
}

/**
 * Update a player chart using new moves
 * - designed for white & black, not live
 * @param {string} name
 * @param {Move[]} moves
 */
function update_player_chart(name, moves) {
    if (!Visible(`#table-${name}`))
        return;

    let data = chart_data[name];
    if (!data)
        return;

    let datasets = data.datasets,
        invert_wb = (name == 'mobil') * 1,
        labels = data.labels,
        num_move = moves.length,
        offset = 0;

    // 1) skip all book moves
    while (offset < num_move && (!moves[offset] || moves[offset].book))
        offset ++;

    // 2) add data
    for (let i = offset; i < num_move ; i ++) {
        let move = moves[i],
            ply = get_move_ply(move),
            num = ply;
        if (ply < -1)
            continue;

        check_first_num(num);
        let num2 = num - first_num;
        labels[num2] = num / 2 + 1;

        let dico = {
            x: num / 2 + 1,     // move number
            ply: ply,           // used for jumping to the position
        };

        switch (name) {
        case 'depth':
            datasets[ply % 2 + 2].data[num2] = Assign(Assign({}, dico), {y: move.sd});
            dico.y = move.d;
            break;
        case 'eval':
            dico.eval = move.wv;
            dico.y = clamp_eval(move.wv);
            break;
        case 'mobil':
            datasets[2].data[num2] = Assign(Assign({}, dico), {y: Abs(move.goal[0])});
            dico.mobil = move.mobil;
            dico.y = Abs(move.mobil);
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

        datasets[(ply + invert_wb) % 2].data[num2] = dico;
    }

    fix_labels(labels);
    charts[name].update();
}

/**
 * Update a player charts using new moves
 * - designed for white & black, not live
 * @param {string} name empty => update all charts
 * @param {Move[]} moves
 */
function update_player_charts(name, moves) {
    if (!name) {
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
        update_player_charts(null, xboards[Y.x].moves);

        for (let [moves, id, invert_black] of queued_charts)
            update_live_chart(moves, id, invert_black);
        queued_charts = [];

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
