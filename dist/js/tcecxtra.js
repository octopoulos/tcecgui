/*
globals
_, $, activeFen, board, boardArrows, Chess, clearedAnnotation:true, crash_re, crossCrash, crosstableData:true,
crossTimeout:true, currentLastMove:true, engineRatingGlobalData, getNodes, getPct, getShortEngineName, getTBHits,
Keys, livePvs, LS, newUpdateStandData, plog, Pow, setTimeout, showLivEng1, showLivEng2, updateLiveEvalDataHistory,
viewingActiveMove
*/
'use strict';

/**************** Extra functions *****************/
function fixOrder()
{
    let arr = [],
        count = 0,
        engines = crosstableData.Table;

    Keys(engines).forEach(key => {
        let engine = engines[key];
        arr[count] = engine.Score;
        count = count + 1;
        engine.Rank = 0;
    });

    let sorted = arr.slice().sort((a, b) => (b - a)),
        ranks = arr.slice().map(function(v) {return sorted.indexOf(v) + 1;});
   LS("Ranks is :" + ranks);
   count = 0;
   var tiePoints = 0;

    Keys(engines).forEach(key => {
        let engine = engines[key];
        engine.Rank = ranks[count];
        count = count + 1;
    });

   count = 0;
    Keys(engines).forEach(key => {
        let engine = engines[key];
      engine.Neustadtl = 0;
      tiePoints = 0;

        Keys(engines).forEach(ikey => {
            let iengine = engines[ikey];
         if (ikey != key)
         {
            var sbCount = 0;
            for (let i = 0; i < engine.Results[ikey].Text.length ; i++)
            {
               if (engine.Results[ikey].Text[i] == '=')
               {
                  sbCount = sbCount + 0.5;
               }
               else if (engine.Results[ikey].Text[i] == '0')
               {
                  sbCount = sbCount + 0;
               }
               else
               {
                  sbCount = sbCount + 1;
               }
            }
            if (!engineDisqualified(key))
            {
               engine.Neustadtl = engine.Neustadtl + sbCount * iengine.Score;
            }
            else
            {
               engine.Neustadtl = 0;
            }

            LS("iengine.Rank:" + iengine.Rank + ikey + ",engine.Rank:" + engine.Rank + key);
            if (parseInt(iengine.Rank) && parseInt(engine.Rank) == parseInt(iengine.Rank))
            {
               if (engine.Strikes)
               {
                  tiePoints = tiePoints + -engine.Strikes;
               }
               else
               {
                  LS("engine.Strikes: " + engine.Results[ikey].Text);
                  if (sbCount > engine.Results[ikey].Text.length/2)
                  {
                     LS("key won:" + key);
                     tiePoints = tiePoints + 1/100;
                  }
                  else if (sbCount < engine.Results[ikey].Text.length/2)
                  {
                     LS("key lost:" + key);
                     tiePoints = tiePoints + 0/100;
                  }
                  else
                  {
                     LS("key drew:" + key);
                     tiePoints = tiePoints + 0.5/100;
                  }
               }
            }
         }
      });
      tiePoints = tiePoints + (engine.WinsAsBlack + engine.WinsAsWhite)/(100 * 100);
      LS("tiePoints is :" + tiePoints + ", count is :" + arr[count] + " , name is :" + key + ", score:" + engine.Score);
      //tiePoints = tiePoints + engine.WinAsBlack/(100 * 100 * 100);
      tiePoints = tiePoints + engine.Neustadtl/(100 * 100 * 1000);
      tiePoints = tiePoints + engine.Rating/(100 * 100 * 1000 * 1000);
      tiePoints = tiePoints + count/(100 * 100 * 1000 * 1000 * 1000);
      arr[count] = parseFloat(parseFloat(engine.Score) + parseFloat(tiePoints/10));
      count = count + 1;
   });

   sorted = arr.slice().sort((b, a) => (a - b));
   ranks = arr.slice().map(function(v) {return sorted.indexOf(v) + 1;});
   count = 0;
   LS("rank kenght us :" + ranks.length);
   LS("Ranks is :" + ranks);
   //crosstableData.Order = ranks;

    Keys(engines).forEach(key => {
        let engine = engines[key];
        engine.Rank = ranks[count];
        LS("engine.Rank-1 is :" + ranks[count] + " ,count:" + count);
        count = count + 1;
        crosstableData.Order[engine.Rank-1] = key;
    });
}

function getEngRecSched(data, engineName)
{
   var resultData = {
      name: engineName,
      LossAsBlack: 0,
      WinAsBlack: 0,
      LossAsWhite: 0,
      LossAsStrike: 0,
      WinAsWhite: 0,
      Games: 0,
      Score: 0
   };

   Keys(data).forEach(key => {
       let engine = data[key];
      if (typeof engine.Moves == 'undefined')
      {
         return false;
      }
      var dQ = engineDisqualified(engineName);
      if (dQ)
      {
         resultData.LossAsStrike = dQ;
      }
      else if (getShortEngineName(engineName) == getShortEngineName(engine.Black))
      {
         if (!engineDisqualified(engine.White))
         {
            if (engine.Result == "1-0")
            {
               if (!crash_re.test(engine.Termination))
               {
                  resultData.LossAsStrike = parseInt(resultData.LossAsStrike) + 1;
               }
               resultData.LossAsBlack = parseInt(resultData.LossAsBlack) + 1;
            }
            else if (engine.Result == "0-1")
            {
               resultData.WinAsBlack = parseInt(resultData.WinAsBlack) + 1;
               resultData.Score = resultData.Score + 1;
            }
            else
            {
               resultData.Score = resultData.Score + 0.5;
            }
            resultData.Games = resultData.Games + 1;
         }
      }
      else if (getShortEngineName(engineName) == getShortEngineName(engine.White))
      {
         if (!engineDisqualified(engine.Black))
         {
            if (engine.Result == "0-1")
            {
               if (!crash_re.test(engine.Termination))
               {
                  resultData.LossAsStrike = parseInt(resultData.LossAsStrike) + 1;
                  engine.LossAsStrike = engine.LossAsStrike + 1;
               }
               resultData.LossAsWhite = parseInt(resultData.LossAsWhite) + 1;
            }
            else if (engine.Result == "1-0")
            {
               resultData.WinAsWhite = parseInt(resultData.WinAsWhite) + 1;
               resultData.Score = resultData.Score + 1;
            }
            else
            {
               resultData.Score = resultData.Score + 0.5;
            }
            resultData.Games = resultData.Games + 1;
         }
      }
   });
   return resultData;
}

function findEloDiffOld (whiteEngine, blackEngine, whiteEngName, blackEngName, score)
{
   var k = 10;
   var b_rating = blackEngine.Rating;
   var w_rating = whiteEngine.Rating;
   var expected_score = 1 / (1 + Pow(10, (b_rating - w_rating) / 400 ));
   var rating_diff = k * (score - expected_score);
   return rating_diff;
}

function getRating(engine, engName)
{
   if (engineRatingGlobalData)
   {
      return engineRatingGlobalData[engName].elo;
   }

   return engine.elo;
}

function findEloDiff(whiteEngine, blackEngine, whiteEngName, blackEngName, score1, score2, gameno)
{
   var k = 10;
   var r1 = Pow(10, (whiteEngine.Rating/400));
   var r2 = Pow(10, (blackEngine.Rating/400));
   var e1 = r1/(r1+r2);
   var e2 = r2/(r1+r2);
   var w_rating = whiteEngine.Rating + k * (score1 - e1);
   var b_rating = blackEngine.Rating + k * (score2 - e2);

   whiteEngine.Rating = w_rating;
   blackEngine.Rating = b_rating;
}

function getOverallElo(data)
{
    let engines = crosstableData.Table;
    for (let engName of crosstableData.Order) {
        let engDetails = engines[engName];
        // engines[engName].Rating = getRating(engDetails, engName);
    }

    Keys(engines).forEach(key => {
        let engine = engines[key],
            eloDiff = 0;
      engine.OrigRating = engine.Rating;
      Keys(engine.Results).forEach(oppkey => {
          let oppEngine = engine.Results[oppkey];
         LS("Opp engine is " + oppkey + " ,oppEngine is " + engines[oppkey].Rating);
         var blackEngine = engines[oppkey];
         var strText = oppEngine.Text;
         var blackRating = blackEngine.Rating;
         for (let i = 0; i < strText.length; i++)
         {
            LS("strText.charAt(i): " + strText.charAt(i));
            if (strText.charAt(i) == '0')
            {
               findEloDiff (engine, blackEngine, key, oppkey, 0, 1, i);
            }
            else if (strText.charAt(i) == '1')
            {
               findEloDiff (engine, blackEngine, key, oppkey, 1, 0, i);
            }
            else if (strText.charAt(i) == '=')
            {
               findEloDiff (engine, blackEngine, key, oppkey, 0.5, 0.5, i);
            }
         }
         eloDiff = engine.Rating - engine.OrigRating;
         blackEngine.Rating = blackRating;
      });
      engine.Rating = engine.OrigRating;
      engine.elo = eloDiff;
      LS("Final eloDiff: " + eloDiff + " ,fscore: " + parseInt(engine.Rating + eloDiff));
   });
}

function eliminateCrash(data)
{
   Keys(data).forEach(key => {
       let engine = data[key];
      if (typeof engine.Moves == 'undefined')
      {
         return false;
      }

      if (!crash_re.test(engine.Termination))
      {
         if (engine.Result == "0-1")
         {
            LS("Calling updateResData for " + engine.Black + "white:" + engine.White + " , engine.Result:" + engine.Result + ":term:" + engine.Termination);
            updateResData(engine.White);
         }
         if (engine.Result == "1-0")
         {
            LS("Calling updateResData for " + engine.Black + "white:" + engine.White + " , engine.Result:" + engine.Result + ":term:" + engine.Termination);
            updateResData(engine.Black);
         }
      }
   });
}

function updateResData(engineName)
{
    Keys(crosstableData.Table).forEach(key => {
        let value = crosstableData.Table[key];
      if (value.OrigStrikes == undefined || value.OrigStrikes == 'undefined')
      {
         value.OrigStrikes = value.Strikes;
      }
      if (key == engineName)
      {
         value.Strikes = parseInt(value.Strikes) + 1;
         LS("value is " + engineName + ",key is :" + key);
      }
      if (value.Strikes > 2)
      {
         value.Score = 0;
      }
   });
}

function engineDisqualified(engineName)
{
    let engine = crosstableData.Table[engineName],
        crashed = (engine && engine.Strikes > 2)? engine.Strikes: 0;

   if (crashed)
   {
      LS("engineName crashed:" + engineName + ":" + crashed);
   }
   if (!crossCrash)
   {
      crashed = 0;
   }
   return crashed;
}

function newUpdateStandNoData()
{
   newUpdateStandData(crosstableData);
}

function newUpdateStandDataTimeout(data)
{
   crosstableData = data;
   crossTimeout = setTimeout(function(){ newUpdateStandData(data); }, 7000);
}
/********************************* End Extra functions *****************************/
