// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-05
/*
globals
Buffer, console, process, require
*/
'use strict';

let fs = require('fs'),
    glob = require('glob'),
    unzipper = require('unzipper'),
    {Assign, DefaultInt, Floor, FormatUnit, Keys, LS, Max, Now, Pad, SetDefault} = require('./js/common'),
    {fix_move_format} = require('./js/global'),
    {extract_threads, parse_pgn} = require('./js/game');

let OPTIONS = {},
    REPLACES = {
        bonus: 'Bonus',
        cup: 'Cup ',
        s: 'Season ',
    },
    skipped_keys = {},
    synonyms = {};

// ANALYSE STATS
////////////////

/**
 * Create spaces
 * @param {number} size
 * @param {string} fill
 * @returns {string}
 */
function create_spaces(size, fill=' ') {
    return new Array(size).fill(fill).join('');
}

/**
 * Get Multi PGN stats
 * - accumulate all individual speeds
 * @param {string} data
 * @param {Object} result
 * @param {string=} origin
 */
function get_multi_pgn_stats(data, result, origin) {
    data.split(/\r?\n\r?\n(?=\[)/).forEach((split, id) => {
        let dico = get_pgn_stats(split, `${origin}:${id}`);
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
 * @param {string=} origin
 * @returns {Object}
 */
function get_pgn_stats(data, origin) {
    let dico = parse_pgn('', data, 7, origin);
    if (!dico || !dico.Headers || !dico.Moves)
        return {};

    // s18, cup5, ...
    let event = '',
        left = origin.split(' / ')[0],
        pos = left.indexOf('Season_'),
        pos2 = left.indexOf('Cup_'),
        pos3 = left.indexOf('Bonus_');
    if (pos > 0)
        event = `s${Pad(DefaultInt(left.slice(pos + 7), 0))}`;
    else if (pos2 > 0)
        event = `cup${DefaultInt(left.slice(pos2 + 4), 0)}`;
    else if (pos3 > 0)
        event = `bonus${DefaultInt(left.slice(pos3 + 6), '')}`;
    else
        LS(`unknown event: ${left}`);

    // collect all speeds
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
        if (!move || isNaN(move.n) || move.n < 2 || isNaN(move.s))
            return;
        let time = move.n / move.s;
        sum_moves[ply & 1] += move.n * 1.0;
        sum_times[ply & 1] += time;
        all_values[ply & 1].push([move.s, move.n, time]);
    });
    average = [
        sum_times[0]? Floor(sum_moves[0] / sum_times[0]): 0,
        sum_times[1]? Floor(sum_moves[1] / sum_times[1]): 0,
    ];

    all_values.forEach((values, id) => {
        let color = ['White', 'Black'][id],
            half = sum_moves[id] / 2,
            name = headers[color],
            num_value = values.length,
            interval = Floor(num_value / 4) + 1,
            number = 0;

        if (!name)
            return;

        // collect hardware info
        let options = dico[`${color}EngineOptions`] || {},
            gpus = options.GPUCores,
            threads = extract_threads(options);

        if (OPTIONS.discover && !threads && !gpus) {
            let keys = Keys(options).filter(key => !skipped_keys[key]);
            if (keys.length) {
                LS([
                    name,
                    keys.map(key => {
                        skipped_keys[key] = 1;
                        return `${key}=${options[key]}`;
                    }).join(', '),
                ].join(' : '));
            }
        }

        // interquartile range
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

        // add synonym
        let name2 = [name, event, threads, gpus].map(item => item || '').join('|');
        if (threads)
            synonyms[`${name}|${event}`] = name2;

        if (OPTIONS.discover && !median[id]) {
            LS(`${origin} : ${headers.Round} : ${headers.GameStartTime} : ${name2} : ${median[id]} : ${average[id]}`);
            LS(headers);
            LS(moves.slice(0, Floor(num_move * 0.8)).map(move => move.mt));
            LS(sum_moves[0]);
            LS(sum_times[0]);
        }
        result[name2] = [median[id], average[id], 1];
    });

    return result;
}

/**
 * Merge stats
 * @param {Object} result
 * @returns {string}
 */
function merge_stats(result) {
    let headers = 'Engine|Speed|nps|Event|Threads|GPUs|Games'.split('|'),
        maxs = headers.map(item => item.length),
        names = Keys(result);

    // 1) resolve synonyms
    names.forEach(key => {
        let splits = key.split('|'),
            stats = result[key];

        // no threads => resolve synonym
        if (!splits[2]) {
            let name_key = splits.slice(0, 2).join('|'),
                synonym = synonyms[name_key];
            if (synonym) {
                if (OPTIONS.verbose)
                    LS(`no threads for ${splits} => ${synonym}`);
                delete result[key];
                result[synonym] = [...result[synonym], ...stats];
            }
        }
    });

    // 2) merge data
    names.forEach(key => {
        let stats = result[key];
        if (!stats)
            return;

        let reduce = stats.reduce((a, b) => [a[0] + b[0], 0, a[2] + b[2]]),
            median = Floor(reduce[0] / stats.length + 0.5),
            splits = key.split('|');

        result[key] = [median, reduce[2]];
        maxs[0] = Max(maxs[0], splits[0].length);
        maxs[1] = Max(maxs[1], `${median}`.length);
        maxs[2] = Max(maxs[2], FormatUnit(median).length);

        for (let i = 3; i < 6; i ++)
            maxs[i] = Max(maxs[i], (splits[i] || '').length);

        maxs[6] = Max(maxs[6], `${reduce[2]}`.length);
    });

    // 3) sort results
    let keys = Keys(result),
        sort_alpha = OPTIONS.alpha,
        sort_engine = OPTIONS.engine,
        sort_event = OPTIONS.event,
        spaces = maxs.map(max => create_spaces(max));

    keys.sort((a, b) => {
        let sa = a.split('|'),
            sb = b.split('|');
        if (sort_engine && sa[0] != sb[0])
            return sa[0].localeCompare(sb[0]);
        if (sort_event && sa[1] != sb[1])
            return sb[1].localeCompare(sa[1]);
        if (sort_alpha && sa[0] != sb[0])
            return sa[0].localeCompare(sb[0]);
        return result[b][0] - result[a][0];
    });

    // 4) output
    let prev_items,
        header = headers.map((item, id) => (item + spaces[id]).slice(0, maxs[id])),
        underline = headers.map((item, id) => create_spaces(maxs[id], '-')).join('-:-'),
        text = keys.map(key => {
            let prefix = '',
                splits = key.split('|'),
                [median, games] = result[key],
                items = [
                    (splits[0] + spaces[0]).slice(0, maxs[0]),
                    Pad(median, maxs[1], spaces[1]),
                    Pad(FormatUnit(median, undefined, true), maxs[2], spaces[2]),
                ];

            for (let i = 1; i < 4; i ++)
                items.push(((splits[i] || '') + spaces[i + 2]).slice(0, maxs[i + 2]));
            items.push(games);

            let line = items.join(' : ');
            if (!prev_items || (sort_event && items[3] != prev_items[3])) {
                if (sort_event)
                    header[0] = (items[3].replace(/^(\D+)/, (_match, v1) => REPLACES[v1]) + spaces[0]).slice(0, maxs[0]);

                prefix = [
                    '',
                    header.join(' : '),
                    underline,
                    '',
                ].join('\n');
            }

            prev_items = [...items];
            return prefix + line;
        }).join('\n');

    return text;
}

/**
 * Open a file and process it
 * @param {string} filename
 * @param {Object} result
 * @param {function} callback
 */
function open_file(filename, result, callback) {
    let ext = filename.split('.').slice(-1)[0],
        verbose = OPTIONS.verbose;

    // zip
    if (ext == 'zip') {
        let number = 0;

        fs.createReadStream(filename)
            .pipe(unzipper.Parse())
            .on('entry', function (entry) {
                // only process .pgn
                let name = entry.path,
                    ext2 = name.split('.').slice(-1)[0];
                if (ext2 != 'pgn') {
                    entry.autodrain();
                    return;
                }

                if (verbose && !number)
                    LS(filename);
                number ++;
                if (verbose)
                    LS(`  ${number} : ${name}`);
                entry.buffer().then(content => {
                    let data = content.toString();
                    get_multi_pgn_stats(data, result, `${filename} / ${name}`);
                });
            })
            .on('error', () => {
                callback(true);
            })
            .on('finish', () => {
                callback();
            });
    }
    // pgn
    else if (ext == 'pgn') {
        if (verbose)
            LS(filename);
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err || !data)
                return;
            get_multi_pgn_stats(data, result, filename);
            callback();
        });
    }
    else {
        LS(`unknown file ext: ${ext} : ${filename}`);
        callback();
    }
}

// STARTUP
//////////

/**
 * Show the results
 * @param {Object} result
 * @param {string[]} filenames
 */
function done(result, filenames) {
    let text = merge_stats(result),
        lines = [
            '```',
            filenames.map(name => name.split(/[/\\]/).slice(-1)[0]).sort().join(', '),
            text,
            '```',
        ].join('\n');

    LS(lines);
    fs.writeFile('analyse_pgn.txt', text, () => {
        LS(`elapsed: ${(Now(true) - OPTIONS.start).toFixed(3)} sec`);
    });
}

/**
 * Main function
 */
function main() {
    // extract args
    let args = process.argv,
        filenames = [],
        num_arg = args.length,
        options = {
            start: Now(true),
        };

    for (let i = 2; i < num_arg; i ++) {
        let arg = args[i];
        if (arg.slice(0, 2) == '--')
            options[arg.slice(2)] = true;
        else
            filenames.push(arg);
    }
    Assign(OPTIONS, options);

    // show help?
    if (OPTIONS.help) {
        LS([
            `Usage: node ${args[1]} [options] [files]`,
            '',
            'Options:',
            '  --alpha     sort results alphabetically',
            '  --discover  try to discover problems',
            '  --engine    group results by engine',
            '  --event     group results by event',
            '  --help      show this help',
            '  --verbose   show all file names',
        ].join('\n'));
        return;
    }

    // open files
    let left = filenames.length,
        result = {};
    for (let filename of filenames) {
        if (filename.includes('*')) {
            glob(filename, (err, files) => {
                if (err)
                    return;

                let left2 = files.length;
                for (let file of files) {
                    open_file(file, result, () => {
                        left2 --;
                        LS(`${left2} : ${filename} / ${file}`);
                        if (!left2) {
                            left --;
                            LS(`left=${left} : ${filename} / ${file}`);
                            if (!left)
                                done(result, filenames);
                        }
                    });
                }
            });
        }
        else {
            open_file(filename, result, () => {
                left --;
                LS(`A:left=${left} : ${filename}`);
                if (!left)
                    done(result, filenames);
            });
        }
    }
}

main();
