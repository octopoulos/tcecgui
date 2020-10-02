// graph.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-10-01
//
/*
globals
_, A, Abs, Assign, C, calculate_feature_q, Chart, Clamp, CreateNode,
DEV, fix_move_format, Floor, FormatUnit, FromSeconds, get_move_ply, Id, Keys,
Log10, LS, Max, Min, Pad, Pow, Round, S, SetDefault, Sign, Style, translate_expression, Visible, xboards, Y
*/
'use strict';

// modify those values in config.js
let CHART_JS = 'js/libs/chart-quick.js',
    ENGINE_NAMES = ['White', 'Black', '7{Blue}', '7{Red}'];

let cached_percents = {},
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
    EVAL_CLAMP = 128,
    first_num = -1,
    FormatAxis = value => FormatUnit(value),
    FormatEval = value => value? value.toFixed(2): 0,
    queued_charts = [];

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Calculate white win %
 * @param {number} id 0, 1, 2, 3
 * @param {string|number} eval_
 * @param {number} ply
 * @returns {number}
 */
function calculate_win(id, eval_, ply) {
    if (eval_ == undefined)
        return eval_;

    let main = xboards[Y.s],
        feature = main.players[id].feature,
        cache_features = SetDefault(cached_percents, feature, {}),
        key = `${eval_}:${ply}`,
        cache = cache_features[key];

    if (cache != undefined)
        return cache;

    let score;
    if (!isNaN(eval_)) {
        score = calculate_feature_q(feature, eval_, ply) * 2;
        score = Sign(score) * Round(Abs(score) * 10) / 10;
    }
    else if (eval_ && eval_.includes('-'))
        score = -100;
    else if (eval_ != undefined)
        score = 100;
    else
        score = 0;

    cache_features[key] = score;
    return score;
}

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
    if (!isNaN(eval_)) {
        eval_ *= 1;
        if (!Number.isFinite(eval_))
            return Clamp(eval_, -EVAL_CLAMP, EVAL_CLAMP);
        return eval_;
    }

    if (eval_ && eval_.includes('-'))
        eval_ = -EVAL_CLAMP;
    else if (eval_ != undefined)
        eval_ = EVAL_CLAMP;
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
                new_dataset('depth', Y.graph_color_0),
                new_dataset('depth', Y.graph_color_1),
                new_dataset('selective', Y.graph_color_0, '', {borderDash: [5, 5]}),
                new_dataset('selective', Y.graph_color_1, '', {borderDash: [5, 5]}),
            ],
            labels: [],
        },
        eval: {
            datasets: ENGINE_NAMES.map((name, id) => new_dataset(name, Y[`graph_color_${id}`])),
            labels: [],
        },
        mobil: {
            datasets: [
                new_dataset('mobility', Y.graph_color_0),
                new_dataset('mobility', Y.graph_color_1),
                new_dataset('r-mobility', '#007f7f', '', {borderDash: [10, 5]}),
            ],
            labels: [],
        },
        node: {
            datasets: [
                new_dataset('w', Y.graph_color_0),
                new_dataset('b', Y.graph_color_1),
            ],
            labels: [],
        },
        speed: {
            datasets: [
                new_dataset('w',Y.graph_color_0),
                new_dataset('b', Y.graph_color_1),
            ],
            labels: [],
        },
        tb: {
            datasets: [
                new_dataset('w', Y.graph_color_0),
                new_dataset('b', Y.graph_color_1),
            ],
            labels: [],
        },
        time: {
            datasets: [
                new_dataset('w', Y.graph_color_0),
                new_dataset('b', Y.graph_color_1),
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
    new_chart('depth', true, FormatAxis, 1);
    new_chart('eval', true, FormatEval, 4, (item, data) => {
        let dico = get_tooltip_data(item, data),
            eval_ = dico.eval;
        return (Y.graph_eval_mode == 'percent')? calculate_win(item.datasetIndex, eval_, dico.ply): eval_;
    });
    new_chart('mobil', true, FormatAxis, 0);
    new_chart('node', false, FormatAxis, 2, (item, data) => {
        let nodes = FormatUnit(get_tooltip_data(item, data).nodes);
        return nodes;
    });
    new_chart('speed', false, FormatAxis, 2, (item, data) => {
        let point = get_tooltip_data(item, data),
            nodes = FormatUnit(point.nodes),
            speed = FormatUnit(point.y);
        return `${speed}nps (${nodes} nodes)`;
    });
    new_chart('tb', false, FormatAxis, 1, (item, data) => {
        let hits = FormatUnit(get_tooltip_data(item, data).y);
        return hits;
    });
    new_chart('time', false, FormatAxis, 0, (item, data) => {
        let [_, min, sec] = FromSeconds(get_tooltip_data(item, data).y);
        return `${min}:${Pad(sec)}`;
    }, {backgroundColor: 'rgb(10, 10, 10)'});

    // 2) click events
    Keys(charts).forEach(name => {
        C(Id(`chart-${name}`), e => {
            let chart = charts[name],
                point = chart.getElementAtEvent(e)[0];
            if (!point)
                return;

            let ds_index = point._datasetIndex,
                index = point._index,
                dico = chart.data.datasets[ds_index].data[index];

            if (dico)
                xboards[Y.s].set_ply(dico.ply, {manual: true});
        });

        // add markers
        let node = _(`#table-${name} > .chart`),
            markers = A('cmarker', node);
        if (!markers.length)
            for (let i = 0; i < 2; i ++)
                node.appendChild(CreateNode('div', null, {class: 'cmarker'}));
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
 * Get tooltip data
 * @param {Object} item tooltip item
 * @param {Object} data
 * @returns {Object}
 */
function get_tooltip_data(item, data) {
    return data.datasets[item.datasetIndex].data[item.index];
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
 * Mark a ply on a chart
 * @param {string} name
 * @param {number} ply
 * @param {number} max_ply
 */
function mark_ply_chart(name, ply, max_ply) {
    if (!Visible(Id(`table-${name}`)))
        return;

    let data, offset,
        chart = charts[name],
        markers = A(`#table-${name} .cmarker`);

    if (ply < max_ply) {
        let invert_wb = (name == 'mobil') * 1,
            dataset = chart.data.datasets[(ply + invert_wb) & 1].data;
        for (let i = 0; i < 2; i ++) {
            let first = dataset[i];
            if (first) {
                offset = first.ply - i;
                data = dataset[ply - offset];
                break;
            }
        }
    }

    if (data) {
        let rect = chart.canvas.getBoundingClientRect(),
            scales = chart.scales,
            x = scales['x-axis-0'].getPixelForValue(data.x),
            y = scales['y-axis-0'].getPixelForValue(data.y);
        Style(markers[0], `height:${rect.height}px;left:${x - 0.5}px;top:0;width:1px`);
        Style(markers[1], `height:1px;left:0;top:${y - 0.5}px;width:${rect.width}px`);
    }
    for (let marker of markers)
        S(marker, data);
}

/**
 * Mark a ply on all charts
 * @param {number} ply
 * @param {number} max_ply
 */
function mark_ply_charts(ply, max_ply) {
    Keys(charts).forEach(key => {
        mark_ply_chart(key, ply, max_ply);
    });
}

/**
 * Create a new chart
 * - an element with id="chart-{name}" must exist
 * @param {string} name
 * @param {boolean} has_legend
 * @param {function|Object=} y_ticks FormatUnit, {...}
 * @param {number=} mode 1:custom, 2:variable, 4:tanh
 * @param {function=} tooltip_callback
 * @param {Object=} dico
 */
function new_chart(name, has_legend, y_ticks, mode, tooltip_callback, dico) {
    let ticks_dico = {};
    if (y_ticks)
        ticks_dico.callback = y_ticks;

    let axis_dico = {
        funcs: [x => x, y => y],
    };
    // logarithmic
    if (mode & 1)
        axis_dico.funcs = [
            x => x > 0? Log10(x + 1): 0,
            y => y > 0? Pow(10, y) - 1: 0,
        ];
    // linear custom
    if (mode & 2)
        axis_dico.beforeBuildTicks = update_scale_custom;

    // eval
    if (mode & 4) {
        axis_dico.beforeBuildTicks = update_scale_eval;
        ticks_dico.beginAtZero = true;
    }

    let options = Assign({}, CHART_OPTIONS, {
        scales: {
            xAxes: [CHART_X_AXES],
            yAxes: [0].map(id => new_y_axis(id, ticks_dico, axis_dico)),
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
        label: translate_expression(label),
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
 * @param {number} id 0 for left, 1 for right
 * @param {Object=} y_ticks
 * @param {Object=} dico
 * @returns {Object}
 */
function new_y_axis(id, y_ticks, dico) {
    let y_axis = {
        display: true,
        id: `y-axis-${id}`,
        position: (id == 0)? 'left': 'right',
    };

    if (id == 1)
        y_axis.gridLines = {drawOnChartArea: false};

    if (y_ticks)
        y_axis.ticks = y_ticks;

    if (dico)
        Assign(y_axis, dico);
    return y_axis;
}

/**
 * Redraw eval charts when eval mode has changed
 * @param {string} section
 */
function redraw_eval_charts(section) {
    if (DEV.chart)
        LS(`REC: ${section}`);
    let board = xboards[section];
    if (!board)
        return;

    let moves = board.moves,
        num_move = moves.length;

    // update existing moves + kibitzer evals (including next move)
    update_player_charts('eval', moves);
    update_live_chart(xboards.live0.evals, 2);
    update_live_chart(xboards.live1.evals, 3);

    // update last received player eval, for the next move
    for (let id = 0; id < 2; id ++) {
        let move = xboards[`pv${id}`].evals[num_move];
        if (move)
            update_live_chart([move], id);
    }
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
 * @param {boolean} all reset (live + pv) evals as well
 */
function reset_charts(all)
{
    first_num = -1;
    Keys(charts).forEach(key => {
        reset_chart(charts[key]);
    });

    if (all)
        for (let key of ['live0', 'live1', 'pv0', 'pv1'])
            xboards[key].evals = [];
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
                text_size = Min(Y.graph_text * ratio, 16);

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
 */
function update_live_chart(moves, id) {
    if (DEV.chart)
        LS('ULC');
    // library hasn't loaded yet => queue
    let data_c = chart_data.eval;
    if (!data_c) {
        queued_charts.push([moves, id]);
        return;
    }

    let dataset = data_c.datasets[id],
        data = dataset.data,
        is_percent = (Y.graph_eval_mode == 'percent'),
        labels = data_c.labels;

    for (let move of moves) {
        if (!move)
            continue;

        let eval_ = move.eval,
            ply = get_move_ply(move),
            num = ply;
        if (ply < -1)
            continue;

        check_first_num(num);
        let num2 = num - first_num;
        labels[num2] = num / 2 + 1;

        if (move.invert && !(ply & 1)) {
            eval_ = invert_eval(eval_);
            if (DEV.eval2)
                LS(`inverting black @${ply}: ${move.eval} => ${eval_}`);
        }

        // check update_player_chart to understand
        data[num2] = {
            eval: eval_,
            ply: ply,
            x: num / 2 + 1,
            y: is_percent? calculate_win(id, eval_, ply): clamp_eval(eval_),
        };
    }

    fix_labels(labels);
    if (charts.eval)
        charts.eval.update();
}

/**
 * Update the marker color+opacity
 */
function update_markers() {
    Style('.cmarker', `background:${Y.graph_marker_color};opacity:${Y.graph_marker_opacity}`);
}

/**
 * Update a player chart using new moves
 * - designed for white & black, not live
 * @param {string} name
 * @param {Move[]} moves
 */
function update_player_chart(name, moves) {
    if (DEV.chart)
        LS(`UPC: ${name}`);
    if (!Visible(Id(`table-${name}`)))
        return;

    let data = chart_data[name];
    if (!data)
        return;

    let datasets = data.datasets,
        invert_wb = (name == 'mobil') * 1,
        is_percent = (Y.graph_eval_mode == 'percent'),
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

        fix_move_format(move);

        check_first_num(num);
        let num2 = num - first_num;
        labels[num2] = num / 2 + 1;

        let dico = {
                x: num / 2 + 1,     // move number
                ply: ply,           // used for jumping to the position
            },
            id = (ply + invert_wb) & 1;
        if (id < 0)
            continue;

        switch (name) {
        case 'depth':
            if (!isNaN(move.sd))
               datasets[2 + (ply & 1)].data[num2] = Assign({y: move.sd}, dico);
            dico.y = move.d;
            break;
        case 'eval':
            if (move.wv == '-')
                continue;
            dico.eval = move.wv;
            dico.y = is_percent? calculate_win(id, move.wv, ply): clamp_eval(move.wv);
            break;
        case 'mobil':
            if (isNaN(move.mobil))
                continue;
            datasets[2].data[num2] = Assign({y: move.goal? Abs(move.goal[0]): -1}, dico);
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
            dico.y = move.mt / 1000;
            break;
        }

        if (isNaN(dico.y))
            continue;
        datasets[id].data[num2] = dico;
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
    if (DEV.chart)
        LS('UPC+');
    if (!name) {
        Keys(charts).forEach(key => {
            update_player_chart(key, moves);
        });
    }
    else
        update_player_chart(name, moves);
}

/**
 * Update the custom scale
 * @param {Object} scale
 */
function update_scale_custom(scale) {
    // 1) calculate the 2 regions + center
    let datasets = scale.chart.data.datasets,
        data0 = datasets[0].data.filter(item => item != null).map(item => item.y),
        data1 = datasets[1].data.filter(item => item != null).map(item => item.y),
        max0 = Max(...data0),
        max1 = Max(...data1),
        min0 = Min(...data0),
        min1 = Min(...data1),
        range = [0, 0];

    if (max0 < min1)
        range = [min0, max0 * 1.1, min1 * 0.9, max1];
    else if (max1 < min0)
        range = [min1, max1 * 1.1, min0 * 0.9, max0];

    // no center?
    if (range[1] >= range[2]) {
        scale.options.funcs = [x => x, y => y];
        return;
    }

    // 2) adjust the regions
    // AA ===== BBBBBBBBBBBBBBBBBB
    // => AAAAAAAA ==== BBBBBBBBBB
    let center = (range[0] + range[3]) / 2,
        dest_size = center / 2,
        mult0 = dest_size / (range[1] - range[0]),
        mult1 = dest_size / (range[3] - range[2]),
        offset0 = 0,
        offset1 = range[1] * mult0 - range[2] * mult1,
        range2 = [
            range[0] * mult0 + offset0,
            range[1] * mult0 + offset0,
            range[2] * mult1 + offset1,
            range[3] * mult1 + offset1,
        ],
        middle = (range[1] + range[2]) / 2,
        middle2 = (range2[1] + range2[2]) / 2;

    if (!isNaN(middle)) {
        let div0 = 1 / mult0,
            div1 = 1 / mult1;

        scale.options.funcs = [
            x => !x? 0: (x <= middle)? x * mult0 + offset0: x * mult1 + offset1,
            y => !y? 0: (y <= middle2)? (y - offset0) * div0: (y - offset1) * div1,
        ];
    }
}

/**
 * Update the eval scale
 * - 12 - 84/(x+7)
 * @param {Object} scale
 */
function update_scale_eval(scale) {
    scale.options.funcs = (Y.graph_eval_mode == 'percent') ? [
        x => x,
        y => y,
    ]:[
        x => (x >= 0)? 12 - 84/(x + 7): -12 - 84/(x - 7),
        y => (y >= 0)? (7 * y)/(-y + 12): (7 * y)/(y + 12),
    ];
}

// STARTUP
//////////

/**
 * Load the chart.js library
 * - it might be bundled already => skip loading in that case
 */
function init_graph() {
    if (DEV.chart)
        LS('IG');
    create_chart_data();
    create_charts();
    update_player_charts(null, xboards[Y.x].moves);

    for (let [moves, id] of queued_charts)
        update_live_chart(moves, id);
    queued_charts = [];
    update_markers();
}

/**
 * Startup graphs
 * - initialise global variables
 */
function startup_graph() {
}
