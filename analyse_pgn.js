// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-04
/*
globals
console, process, require
*/
'use strict';

let fs = require('fs'),
    {Floor, FormatUnit, Keys, LS, Max, Pad, SetDefault} = require('./js/common'),
    {fix_move_format} = require('./js/global'),
    {parse_pgn} = require('./js/game');

/**
 * Create spaces
 * @param {number} size
 * @returns {string}
 */
function create_spaces(size) {
    return new Array(size).fill(' ').join('');
}

/**
 * Get Multi PGN stats
 * @param {string} name
 * @param {function} callback
 */
function get_multi_pgn_stats(name, callback) {
    fs.readFile(name, 'utf8', (err, data) => {
        if (err) {
            callback(null);
            return;
        }

        let result = {},
            splits = data.split(/\r?\n\r?\n\[/);

        // accumulate all individual speeds
        for (let split of splits) {
            let dico = get_pgn_stats(split);
            Keys(dico).forEach(key => {
                let entry = SetDefault(result, key, []),
                    value = dico[key];
                entry.push(value);
            });
        }

        // merge
        let max_name = 0,
            max_speed = 0,
            max_unit = 0;
        Keys(result).forEach(key => {
            let stats = result[key],
                medians = stats.map(value => value[0]),
                median = Floor(medians.reduce((a, b) => a + b) / medians.length + 0.5);

            result[key] = median;
            max_name = Max(max_name, key.length);
            max_speed = Max(max_speed, `${median}`.length);
            max_unit = Max(max_unit, FormatUnit(median).length + 6);
        });

        let space_name = create_spaces(max_name),
            space_speed = create_spaces(max_speed),
            space_unit = create_spaces(max_unit),
            text = Keys(result).sort((a, b) => a.localeCompare(b)).map(key => {
                return [
                    (key + space_name).slice(0, max_name),
                    Pad(result[key], max_speed, space_speed),
                    Pad(FormatUnit(result[key], undefined, true) + ' (nps)', max_unit, space_unit),
                ].join(' : ');
            }).join('\n');
        callback(text);
    });
}

/**
 * Get PGN stats
 * @param {string} name
 * @returns {Object}
 */
function get_pgn_stats(data) {
    let dico = parse_pgn(data);
    if (!dico || !dico.Headers || !dico.Moves)
        return {};

    let all_values = [[], []],
        average = [0, 0],
        headers = dico.Headers,
        median = [0, 0],
        moves = dico.Moves,
        num_move = moves.length,
        result = {},
        sum_moves = [0, 0],
        sum_times = [0, 0];

    moves.slice(0, Floor(num_move * 0.8)).forEach((move, ply) => {
        fix_move_format(move);
        if (!move || move.n < 2 || isNaN(move.s))
            return;
        let time = move.n / move.s;
        sum_moves[ply % 2] += move.n * 1.0;
        sum_times[ply % 2] += time;
        all_values[ply % 2].push([move.s, move.n, time]);
    });
    average = [
        Floor(sum_moves[0] / sum_times[0]),
        Floor(sum_moves[1] / sum_times[1]),
    ];

    all_values.forEach((values, id) => {
        let half = sum_moves[id] / 2,
            name = headers[['White', 'Black'][id]],
            num_value = values.length,
            interval = Floor(num_value / 4) + 1,
            number = 0;

        if (!name)
            return;

        values.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < num_value; i ++) {
            let value = values[i];
            number += value[1];
            if (number >= half) {
                let sum_move = 0,
                    sum_time = 0;
                for (let j = i - interval; j <= i + interval; j ++) {
                    let value2 = values[j];
                    if (!value2)
                        continue;
                    sum_move += value2[1];
                    sum_time += value2[2];
                }
                median[id] = Floor(sum_move / sum_time + 0.5);
                break;
            }
        }

        result[name] = [median[id], average[id]];
    });

    return result;
}

// main
for (let name of process.argv.slice(2)) {
    get_multi_pgn_stats(name, result => {
        LS('```');
        LS(name);
        LS(result);
        LS('```');
    });
}
