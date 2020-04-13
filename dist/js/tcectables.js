/*
globals
_, $, axios, cellformatter, formatter, getImg, plog, standColumns, tourInfo
*/
'use strict';

/* Global Variables */
var crosstableData = null;
var crossTimeout = null;
/* Global Variables */

function updateCrosstable()
{
   axios.get('crosstable.json')
   .then(function (response)
   {
      newUpdateStandData(response.data);
   })
   .catch(function (error)
   {
      // handle error
      plog(error, 0);
   });
}

/**
 * Standings
 * @param {Object} data
 */
function newUpdateStandData(data)
{
   plog ("Updating standtable:", 0);
   crosstableData = data;

   if (tourInfo)
   {
      if (tourInfo.cup == 1)
      {
         $('#crossdiv').hide();
         $('#standdiv').hide();
         return;
      }
   }

   var standings = [];

   for (let engName of crosstableData.Order) {
      let engineDetails = crosstableData.Table[engName];
      var eloDiff = engineDetails.Elo/3.2 * 2;
      if (engineDetails.LossAsBlack == undefined)
      {
         engineDetails.LossAsBlack = engineDetails.LossesAsBlack;
      }
      if (engineDetails.LossAsWhite == undefined)
      {
         engineDetails.LossAsWhite = engineDetails.LossesAsWhite;
      }
      var entry = {
         rank: engineDetails.Rank,
         name: getImg(engName),
         games: engineDetails.Games,
         points: engineDetails.Score.toFixed(1),
         wins: engineDetails.WinsAsBlack + engineDetails.WinsAsWhite + ' [' + engineDetails.WinsAsWhite + '/' + engineDetails.WinsAsBlack + ']',
         loss: engineDetails.LossAsWhite + engineDetails.LossAsBlack + ' [' + engineDetails.LossAsWhite + '/' + engineDetails.LossAsBlack + ']',
         crashes: engineDetails.Strikes,
         sb: parseFloat(engineDetails.Neustadtl).toFixed(2),
         elo: engineDetails.Rating,
         elo_diff: Math.round(eloDiff) + ' [' + Math.round(eloDiff + engineDetails.Rating) + ']'
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
   plog ("Updating crossdata:", 0);
   let standtableData = crosstableData,
      engine_names = standtableData.Order,
      localStandColumn = [...standColumns];

   var abbreviations = [];
   var standings = [];

   for (let engName of engine_names) {
      let engineDetails = standtableData.Table[engName];
      let abbEntry = {abbr: engineDetails.Abbreviation, name: engName};
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
            var score2 = '';
            let engineName = abbreviation.name,
            engineAbbreviation = abbreviation.abbr,
            engineCount = engine_names.length;

            if (engineCount < 1) {
                engineCount = 1;
            }

            let rounds = Math.floor(engineDetails.Games / engineCount) + 1;
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
