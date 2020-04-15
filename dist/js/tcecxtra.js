/*
globals
_, $, activeFen, add_timeout, board, Chess, clearedAnnotation:true, crash_re, crosstableData:true,
currentLastMove:true, engineRatingGlobalData, getNodes, getPct, getShortEngineName, Keys, livePvs, LS,
newUpdateStandData, Pow, showLivEng1, showLivEng2, updateLiveEvalDataHistory, viewingActiveMove, Y
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
        count ++;
        engine.Rank = 0;
    });

    let sorted = arr.slice().sort((a, b) => (b - a)),
        ranks = arr.slice().map(function(v) {return sorted.indexOf(v) + 1;});
   LS("Ranks is :" + ranks);
   count = 0;
    let tiePoints = 0;

    Keys(engines).forEach(key => {
        let engine = engines[key];
        engine.Rank = ranks[count];
        count ++;
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
            let sbCount = 0;
            for (let i = 0; i < engine.Results[ikey].Text.length ; i++)
            {
               if (engine.Results[ikey].Text[i] == '=')
               {
                  sbCount += 0.5;
               }
               else if (engine.Results[ikey].Text[i] == '0')
               {
               }
               else
               {
                  sbCount ++;
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
                  tiePoints -= engine.Strikes;
               }
               else
               {
                  LS("engine.Strikes: " + engine.Results[ikey].Text);
                  if (sbCount > engine.Results[ikey].Text.length/2)
                  {
                     LS("key won:" + key);
                     tiePoints += 1/100;
                  }
                  else if (sbCount < engine.Results[ikey].Text.length/2)
                  {
                     LS("key lost:" + key);
                     tiePoints += 0/100;
                  }
                  else
                  {
                     LS("key drew:" + key);
                     tiePoints += 0.5/100;
                  }
               }
            }
         }
      });
      tiePoints += (engine.WinsAsBlack + engine.WinsAsWhite)/(100 * 100);
      LS("tiePoints is :" + tiePoints + ", count is :" + arr[count] + " , name is :" + key + ", score:" + engine.Score);
      //tiePoints += engine.WinAsBlack/(100 * 100 * 100);
      tiePoints += engine.Neustadtl/(100 * 100 * 1000);
      tiePoints += engine.Rating/(100 * 100 * 1000 * 1000);
      tiePoints += count/(100 * 100 * 1000 * 1000 * 1000);
      arr[count] = parseFloat(parseFloat(engine.Score) + parseFloat(tiePoints/10));
      count ++;
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
        count ++;
        crosstableData.Order[engine.Rank-1] = key;
    });
}

function getEngRecSched(data, engineName)
{
    let resultData = {
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
      let dQ = engineDisqualified(engineName);
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

function findEloDiffOld(whiteEngine, blackEngine, whiteEngName, blackEngName, score)
{
    let k = 10,
        b_rating = blackEngine.Rating,
        w_rating = whiteEngine.Rating,
        expected_score = 1 / (1 + Pow(10, (b_rating - w_rating) / 400 ));

    return k * (score - expected_score);
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
    let k = 10,
        r1 = Pow(10, (whiteEngine.Rating / 400)),
        r2 = Pow(10, (blackEngine.Rating / 400)),
        e1 = r1/(r1+r2),
        e2 = r2/(r1+r2),
        w_rating = whiteEngine.Rating + k * (score1 - e1),
        b_rating = blackEngine.Rating + k * (score2 - e2);

   whiteEngine.Rating = w_rating;
   blackEngine.Rating = b_rating;
}

function getOverallElo()
{
    let engines = crosstableData.Table;

    Keys(engines).forEach(key => {
        let engine = engines[key],
            eloDiff = 0;

        engine.OrigRating = engine.Rating;
        Keys(engine.Results).forEach(oppkey => {
            let oppEngine = engine.Results[oppkey];
            LS("Opp engine is " + oppkey + " ,oppEngine is " + engines[oppkey].Rating);
            let blackEngine = engines[oppkey],
                text = oppEngine.Text,
                blackRating = blackEngine.Rating;
            for (let i = 0; i < text.length; i++)
            {
                let letter = text[i];
                if (letter == '0')
                    findEloDiff(engine, blackEngine, key, oppkey, 0, 1, i);
                else if (letter == '1')
                    findEloDiff(engine, blackEngine, key, oppkey, 1, 0, i);
                else if (letter == '=')
                    findEloDiff(engine, blackEngine, key, oppkey, 0.5, 0.5, i);
            }
            eloDiff = engine.Rating - engine.OrigRating;
            blackEngine.Rating = blackRating;
        });

        engine.Rating = engine.OrigRating;
        engine.elo = eloDiff;
        LS(`Final eloDiff=${eloDiff} : fscore=${parseInt(engine.Rating + eloDiff)}`);
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
        LS("engineName crashed:" + engineName + ":" + crashed);

    if (!Y.cross_crash)
        crashed = 0;

    return crashed;
}

function newUpdateStandNoData()
{
    newUpdateStandData(crosstableData);
}

function newUpdateStandDataTimeout(data)
{
    crosstableData = data;
    add_timeout('cross', () => {newUpdateStandData(data);}, 7000);
}
/********************************* End Extra functions *****************************/
