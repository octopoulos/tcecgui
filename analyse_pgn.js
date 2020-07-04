// analyse_pgn.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-04
/*
globals
console, process, require
*/
'use strict';

let fs = require('fs'),
    {Floor, LS} = require('./js/common'),
    {parse_pgn} = require('./js/game');

/**
 * Get PGN stats
 * @param {string} name
 * @returns {[]*}
 */
function get_pgn_stats(name, callback) {
    fs.readFile(name, 'utf8', (err, data) => {
        if (err) {
            callback(null);
            return;
        }
        let dico = parse_pgn(data);
        if (!dico) {
            callback(null);
            return;
        }

        let all_values = [[], []],
            average = [0, 0],
            median = [0, 0],
            sum_moves = [0, 0],
            sum_times = [0, 0];

        dico.Moves.forEach((move, ply) => {
            if (!move.n)
                return;
            sum_moves[ply % 2] += move.n * 1.0;
            sum_times[ply % 2] += move.mt * 0.001;
            all_values[ply % 2].push([move.n * 1000 / move.mt, move.n]);
        });
        average = [Floor(sum_moves[0] / sum_times[0]), Floor(sum_moves[1] / sum_times[1])];

        all_values.forEach((values, id) => {
            let half = sum_moves[id] / 2,
                num_value = values.length,
                interval = Floor(num_value / 4) + 1,
                number = 0;

            values.sort((a, b) => a[0] - b[0]);
            for (let i = 0; i < num_value; i ++) {
                let value = values[i];
                number += value[1];
                if (number >= half) {
                    let num = 0,
                        sum = 0;
                    for (let j = i - interval; j <= i + interval; j ++) {
                        if (!values[j])
                            continue;
                        sum += values[j][0];
                        num ++;
                    }
                    median[id] = Floor(sum / num + 0.5);
                    break;
                }
            }
        });

        callback(median, average);
    });
}

for (let name of process.argv.slice(2)) {
    get_pgn_stats(name, (median, average) => {
        LS(`${name} : ${median? median.join(' '): median} : ${average? average.join(' '): average}`);
    });
}
