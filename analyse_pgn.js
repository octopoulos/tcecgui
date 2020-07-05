// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-05
/*
globals
Buffer, console, process, require
*/
'use strict';

let fs = require('fs'),
    unzipper = require('unzipper'),
    {Floor, FormatUnit, Keys, LS, Max, Pad, SetDefault} = require('./js/common'),
    {fix_move_format} = require('./js/global'),
    {parse_pgn} = require('./js/game');

// ANALYSE STATS
////////////////

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
 * - accumulate all individual speeds
 * @param {string} data
 * @param {Object} result
 */
function get_multi_pgn_stats(data, result) {
    data.split(/\r?\n\r?\n\[/).forEach(split => {
        let dico = get_pgn_stats(split);
        Keys(dico).forEach(key => {
            let entry = SetDefault(result, key, []),
                value = dico[key];
            entry.push(value);
        });
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

/**
 * Merge stats
 * @param {Object} result
 * @param {Object} options
 * @returns {string}
 */
function merge_stats(result, options) {
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

    let keys = Keys(result),
        space_name = create_spaces(max_name),
        space_speed = create_spaces(max_speed),
        space_unit = create_spaces(max_unit);

    if (options.alpha)
        keys.sort((a, b) => a.localeCompare(b));
    else
        keys.sort((a, b) => result[b] - result[a]);

    return keys.map(key => {
        let value = result[key];
        return [
            (key + space_name).slice(0, max_name),
            Pad(value, max_speed, space_speed),
            Pad(FormatUnit(value, undefined, true) + ' (nps)', max_unit, space_unit),
        ].join(' : ');
    }).join('\n');
}

/**
 * Open a file and process it
 * @param {string} filename
 * @param {Object} result
 * @param {function} callback
 */
function open_file(filename, result, callback) {
    let ext = filename.split('.').slice(-1)[0];
    if (ext == 'zip') {
        fs.createReadStream(filename)
            .pipe(unzipper.Parse())
            .on('entry', function (entry) {
                LS(entry.path);
                entry.buffer().then(content => {
                    let data = content.toString();
                    get_multi_pgn_stats(data, result);
                });
            })
            .on('error', () => {
                callback(true);
            })
            .on('finish', () => {
                callback();
            });
    }
    else {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err || !data)
                return;
            get_multi_pgn_stats(data, result);
            callback();
        });
    }
}

// STARTUP
//////////

/**
 * Show the results
 * @param {Object} result
 * @param {string[]} filenames
 * @param {Object} options
 */
function done(result, filenames, options) {
    let text = merge_stats(result, options);
    LS('```');
    LS(filenames.map(name => name.split(/[/\\]/).slice(-1)[0]).sort().join(', '));
    LS(text);
    LS('```');
}

/**
 * Main function
 * @argument --alpha: sort results alphabetically
 */
function main() {
    // extract args
    let args = process.argv,
        filenames = [],
        num_arg = args.length,
        options = {};

    for (let i = 2; i < num_arg; i ++) {
        let arg = args[i];
        if (arg.slice(0, 2) == '--')
            options[arg.slice(2)] = true;
        else
            filenames.push(arg);
    }

    // show help?
    if (options.help) {
        LS([
            `Usage: node ${args[1]} [options] [files]`,
            '',
            'Options:',
            '  --alpha  sort results alphabetically',
            '  --help   show this help',
        ].join('\n'));
        return;
    }

    // open files
    let left = filenames.length,
        result = {};
    for (let filename of filenames)
        open_file(filename, result, err => {
            left --;
            if (!left)
                done(result, filenames, options);
        });
}

main();
