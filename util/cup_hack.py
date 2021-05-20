#!/usr/bin/env python3
import json, sys, time, os

cup_no = int(sys.argv[1])
team_js = f"TCEC_Cup_{cup_no}_teams.js"
table_filename_original = f"TCEC_Cup_{cup_no}_event_Eventcrosstable.cjson"
table_filename_copy = "Eventcrosstable.json"

# open teams + strip spaces
teams = json.loads(open(team_js).read())
teams = [[[team[0][0].strip(), team[0][1]], [team[1][0].strip(), team[1][1]]] for team in teams]

old_table_s = ""
prev_size = 0

while True:
    time.sleep(1)

    table_s = open(table_filename_original).read()
    if table_s == old_table_s:
        continue

    event_table = json.loads(table_s)
    others = event_table.get("teams")
    if not others:
        continue

    # calculate indices
    forwards = {f"{other[0]['name']}|{other[1]['name']}": other for other in others}
    reverses = {f"{other[1]['name']}|{other[0]['name']}": other for other in others}

    # update the file
    change = 0
    result = []

    for team_a, team_b in teams:
        key = f"{team_a[0]}|{team_b[0]}"

        exist = forwards.get(key)
        if exist:
            a, b = exist
        else:
            exist = reverses.get(key)
            if exist:
                b, a = exist
                print(f'reversed {key}')
                change += 1
            else:
                a = {'name': team_a[0]}
                b = {'name': team_b[0]}
                print(f'added {key}')
                change += 1

        if a.get('flag'):
            a.pop('flag', None)
            change += 1
        if b.get('flag'):
            b.pop('flag', None)
            change += 1
        if not a.get('seed'):
            a['seed'] = team_a[1]
            change += 1
        if not b.get('seed'):
            b['seed'] = team_b[1]
            change += 1

        result.append([a, b])

    # if not change:
    #     continue

    event_table['teams'] = result

    # save file
    data = json.dumps(event_table, indent=4) + "\n"
    size = len(data)
    if size == prev_size:
        data += ' '
        size += 1
    print(f'{change} changes => {table_filename_copy} : {size}')

    with open(table_filename_copy, "w") as fp_out:
        fp_out.write(data)

    old_table_s = table_s
    prev_size = size
