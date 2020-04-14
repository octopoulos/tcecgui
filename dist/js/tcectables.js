/*
globals
_, $, cellformatter, Floor, formatter, getImg, Hide, LS, Resource, Round, standColumns, tourInfo
*/
'use strict';

/* Global Variables */
let crosstableData = null,
    crossTimeout = null;
/* Global Variables */

function updateCrosstable()
{
    Resource('crosstable.json', (code, data) => {
        if (code == 200)
            newUpdateStandData(data);
    });
}

/**
 * Standings
 * @param {Object} data
 */
function newUpdateStandData(data)
{
   crosstableData = data;

   if (tourInfo)
   {
      if (tourInfo.cup == 1)
      {
         Hide('#crossdiv, #standdiv');
         return;
      }
   }

   let standings = [];

    for (let engName of crosstableData.Order) {
        let engineDetails = crosstableData.Table[engName],
            eloDiff = engineDetails.Elo/3.2 * 2;
      if (engineDetails.LossAsBlack == undefined)
      {
         engineDetails.LossAsBlack = engineDetails.LossesAsBlack;
      }
      if (engineDetails.LossAsWhite == undefined)
      {
         engineDetails.LossAsWhite = engineDetails.LossesAsWhite;
      }
      let entry = {
         rank: engineDetails.Rank,
         name: getImg(engName),
         games: engineDetails.Games,
         points: engineDetails.Score.toFixed(1),
         wins: engineDetails.WinsAsBlack + engineDetails.WinsAsWhite + ' [' + engineDetails.WinsAsWhite + '/' + engineDetails.WinsAsBlack + ']',
         loss: engineDetails.LossAsWhite + engineDetails.LossAsBlack + ' [' + engineDetails.LossAsWhite + '/' + engineDetails.LossAsBlack + ']',
         crashes: engineDetails.Strikes,
         sb: parseFloat(engineDetails.Neustadtl).toFixed(2),
         elo: engineDetails.Rating,
         elo_diff: Round(eloDiff) + ' [' + Round(eloDiff + engineDetails.Rating) + ']'
      };
      standings.push(entry);
   }

   $('#crosstable').bootstrapTable('load', standings);
   newUpdateCrossData();
}

/**
 * Crosstable
 */
function newUpdateCrossData()
{
    let abbreviations = [],
        standtableData = crosstableData,
        engine_names = standtableData.Order,
        localStandColumn = [...standColumns],
        standings = [];

   for (let engName of engine_names) {
      let engineDetails = standtableData.Table[engName],
          abbEntry = {abbr: engineDetails.Abbreviation, name: engName};
      abbreviations.push(abbEntry);
   }

    for (let engName of engine_names) {
        let engineDetails = standtableData.Table[engName],
            entry = {
                rank: engineDetails.Rank,
                name: getImg(engName),
                points: engineDetails.Score.toFixed(1),
            };

        for (let abbreviation of abbreviations) {
            let engineName = abbreviation.name,
                engineAbbreviation = abbreviation.abbr,
                engineCount = engine_names.length,
                score2 = '';

            if (engineCount < 1) {
                engineCount = 1;
            }

            let rounds = Floor(engineDetails.Games / engineCount) + 1;
            if (engineDetails.Abbreviation == engineAbbreviation) {
                for (let i = 0; i < rounds; i++) {
                    score2 = '';
                }
            } else {
                let matchDetails = engineDetails.Results[engineName];
                score2 = {
                    Score: matchDetails.Scores,
                    Text: matchDetails.Text
                };
            }
            entry[engineAbbreviation] = score2;
        }
        standings.push(entry);
    }

    for (let engName of engine_names) {
        let engineDetails = standtableData.Table[engName];
        localStandColumn.push({
            field: engineDetails.Abbreviation,
            title: engineDetails.Abbreviation,
            formatter: formatter,
            cellStyle: cellformatter,
        });
    }

    $('#standtable').bootstrapTable({
        columns: localStandColumn,
        classes: 'table table-striped table-no-bordered',
        sortName: 'rank',
    });

    $('#standtable').bootstrapTable('load', standings);
}
