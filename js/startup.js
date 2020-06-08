// startup.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-06-05
//
// Startup
// - start everything: 3d, game, ...
// - global window events
// - resize window and elements
// - handle most events / settings
//
// included after: common, engine, global, 3d, xboard, game, network
/*
globals
_, __PREFIX:true, A, action_key, action_key_no_input, action_keyup_no_input, add_history, add_timeout,
ANCHORS:true, api_times:true, api_translate_get, Assign, Attrs, AUTO_ON_OFF, BOARD_THEMES,
C, cannot_click, change_page, change_setting_game, change_theme, changed_hash, changed_section, check_hash, Clamp,
Class, clear_timeout, context_areas, context_target:true, create_field_value, CreateNode, DEFAULTS, DEV, document,
download_live, download_tables, DownloadObject, E, Events, From, full_scroll, game_action_key, game_action_keyup,
get_active_tab, get_area, get_drop_id, get_object, HasClass, HasClasses, Hide, HOST, HTML, ICONS:true, Id, Index,
init_graph, init_sockets, is_fullscreen, KEY_TIMES, Keys, KEYS,
LANGUAGES:true, LINKS, listen_log, LIVE_ENGINES, load_defaults, load_library, localStorage, location, LS, Max,
merge_settings, Min, NO_IMPORTS, Now, ON_OFF, ONLY_POPUPS, open_table, option_number, order_boards, Parent, parse_dev,
PIECE_THEMES, popup_custom, redraw_eval_charts, reset_old_settings, resize_game, Resource, resume_sleep,
S, save_option, scroll_adjust, ScrollDocument, set_engine_events, set_game_events, set_modal_events, SetDefault, Show,
show_banner, show_popup, show_settings, Split, start_3d, start_game, startup_3d, startup_config, startup_game,
startup_graph, Style, TABLES, THEMES, TIMEOUT_adjust, TIMEOUTS, Title, TITLES, toggle_fullscreen, touch_handle,
translate_node, TRANSLATE_SPECIALS, translates:true, update_board_theme, update_chart_options, update_debug,
update_theme, update_twitch, VERSION, virtual_change_setting_special:true, virtual_check_hash_special:true,
virtual_import_settings:true, virtual_opened_table_special:true, virtual_resize:true, Visible, wheel_event, window,
X_SETTINGS, xboards, Y
*/
'use strict';

let AD_STYLES = {},
    CHAMPIONS = [],
    CONTEXT_MENUS = {
        '#engine': 'engine',
        '#eval0, #eval1, #quick-search, #table-search': 'extra',
        '.moves': 'copy_copy',
        '.pagin, #table-tabs': 'extra',
        '.status': 'hide',
        '#table-chat': 'quick',
        '#table-depth, #table-eval, #table-mobil, #table-node, #table-speed, #table-tb, #table-time': 'graph',
        '.swaps': 'panel',
    },
    drag_source,
    HIDES = {
        archive: {
            live: 1,
            'moves-live': 1,
        },
        live: {
            archive: 1,
            'moves-archive': 1,
        },
    },
    old_font_height,
    old_stream = 0,
    old_window_height,
    old_x,
    PRESETS = [
        'custom',
        'default settings',
        'jerehmia',
        'kanchess',
        'minimal',
        'octopoulo',
        'terjeweiss',
    ],
    resume_time = Now(),
    STREAM_SETTINGS = {},
    TAB_NAMES = {
        depth: 'D/SD',
        mobil: 'Mob',
        node: 'Nodes',
        pv: 'PV',
        pv0: 'White',
        pv1: 'Black',
        pva: 'PV(A)',
        tb: 'TB',
    },
    TIMEOUT_font = 200,
    TIMEOUT_graph = 500,
    TIMEOUT_popup = 600,
    TIMEOUT_resume = 3000,
    TIMEOUT_size = 1000;

/**
 * Same as action_key_no_input, but when the key is up
 * @param {number} code hardware keycode
 */
function action_keyup_no_input(code) {
}

/**
 * Handle keys, even when an input is active
 * @param {number} code hardware keycode
 */
function action_key(code) {
    switch (code) {
    // escape
    case 27:
        close_popups();
        break;
    }
}

/**
 * Adjust popup position
 */
function adjust_popups() {
    show_popup('', null, {adjust: true});
    show_popup('about', null, {adjust: true});
}

/**
 * Use an audio set
 * @param {string} set custom, grand bamboo
 */
function audio_set(set) {
    let audio_settings = X_SETTINGS.audio,
        prefix = `${set} - `;

    Keys(audio_settings).forEach(key => {
        if (key.slice(0, 6) != 'sound_')
            return;
        let choice = audio_settings[key][0].filter(value => value.slice(0, prefix.length) == prefix)[0];
        if (choice != undefined) {
            save_option(key, choice);
            _(`select[name="${key}"]`).value = choice;
        }
    });
}

/**
 * Handler for change settings
 * @param {string} name
 * @param {string|number} value
 * @param {boolean=} no_close don't close the popup
 * @returns {boolean} true if we've handled the setting
 */
function change_setting_special(name, value, no_close) {
    clear_timeout('close_popup');
    if (!name)
        return false;

    // close contextual popup if we used a SELECT
    if (!no_close) {
        let modal = _('#modal');
        if (modal && modal.dataset.xy)
            add_timeout('close_popup', close_popups, (value == undefined)? 0: TIMEOUT_popup);
    }

    if (name != 'preset')
        Y.preset = 'custom';

    let result = true;

    add_history();

    switch (name) {
    case 'animate':
    case 'board_theme':
    case 'highlight_color':
    case 'highlight_size':
    case 'notation':
    case 'piece_theme':
        update_board_theme(1);
        break;
    case 'animate_pv':
    case 'board_theme_pv':
    case 'highlight_color_pv':
    case 'highlight_size_pv':
    case 'notation_pv':
    case 'piece_theme_pv':
        update_board_theme(2);
        break;
    case 'animate_pva':
    case 'board_theme_pva':
    case 'highlight_color_pva':
    case 'highlight_size_pva':
    case 'notation_pva':
    case 'piece_theme_pva':
        update_board_theme(4);
        break;
    case 'audio_set':
        audio_set(value);
        break;
    case 'chat_height':
    case 'column_bottom':
    case 'column_top':
    case 'graph_min_width':
    case 'max_center':
    case 'max_left':
    case 'max_right':
    case 'min_center':
    case 'min_left':
    case 'min_right':
    case 'max_window':
    case 'panel_gap':
        resize();
        break;
    case 'click_here_to_RESET_everything':
        reset_settings(true);
        break;
    case 'custom_black':
    case 'custom_black_pv':
    case 'custom_black_pva':
    case 'custom_white':
    case 'custom_white_pv':
    case 'custom_white_pva':
        let is_pv = (name.slice(-2) == 'pv'),
            is_pva = (name.slice(-3) == 'pva'),
            field = `board_theme${is_pva? '_pva': (is_pv? '_pv': '')}`;
        save_option(field, 'custom');
        (_(`select[name="${field}"]`) || {}).value = Y[field];
        update_board_theme(is_pva? 4: (is_pv? 2: 1));
        break;
    case 'default_positions':
        Y.areas = Assign({}, DEFAULTS.areas);
        populate_areas();
        break;
    case 'drag_and_drop':
        set_draggable();
        break;
    case 'eval':
    case 'eval_left':
    case 'graph_aspect_ratio':
    case 'hardware':
    case 'moves':
    case 'moves_live':
    case 'moves_pv':
    case 'moves_pva':
    case 'panel_adjust':
    case 'percent':
    case 'single_line':
    case 'status_pv':
        resize_panels();
        break;
    case 'export_settings':
        let object = Assign(
            {}, ...Keys(Y).filter(key => !NO_IMPORTS[key] && key[0] != '_').sort().map(key => ({[key]: Y[key]}))
        );
        DownloadObject(object, 'tcec-settings.json', false, '  ');
        break;
    case 'graph_color_0':
    case 'graph_color_1':
    case 'graph_color_2':
    case 'graph_color_3':
    case 'graph_line':
    case 'graph_radius':
    case 'graph_tension':
    case 'graph_text':
        update_chart_options(null, 3);
        break;
    case 'graph_eval_clamp':
    case 'graph_eval_mode':
        redraw_eval_charts();
        break;
    case 'grid':
    case 'grid_copy':
    case 'grid_live':
    case 'grid_pv':
    case 'grid_pva':
    case 'move_height':
    case 'move_height_copy':
    case 'move_height_live':
    case 'move_height_pv':
    case 'move_height_pva':
        resize_move_lists();
        break;
    case 'hide':
        hide_element(context_target);
        break;
    case 'import_settings':
        try {
            import_settings(JSON.parse(value), true);
        }
        catch (err) {
        }
        break;
    case 'import_settings':
        try {
            let data = JSON.parse(value);
            import_settings(data);
            reset_settings();
        }
        catch (err) {
        }
        break;
    case 'join_next':
        tab_element(context_target);
        break;
    case 'live_log':
        if (Visible('#table-log'))
            listen_log();
        break;
    case 'mobility':
        update_visible();
        break;
    case 'moves_copy':
        populate_areas();
        break;
    case 'preset':
        if (value == 'custom')
            break;
        else if (value == 'default settings')
            reset_settings(true);
        else {
            Resource(`preset/${value}.json`, (code, data) => {
                if (code != 200)
                    return;
                import_settings(data, true);
            });
        }
        break;
    case 'shortcut_1':
    case 'shortcut_2':
        update_shortcuts();
        break;
    case 'theme':
        change_theme(value);
        break;
    case 'unhide':
        Keys(context_areas).forEach(key => {
            context_areas[key][2] |= 1;
        });
        populate_areas();
        break;
    case 'use_for_arrow':
        for (let id = 2; id < 4; id ++)
            save_option(`arrow_color_${id}`, Y[`graph_color_${id}`]);
        break;
    default:
        result = change_setting_game(name, value);
    }

    add_history();
    return result;
}

/**
 * Update the theme
 * - if we're in the archive, then also add the [theme]-archive.css
 * @param {string=} theme
 */
function change_theme(theme) {
    let def = THEMES[0];
    if (theme != undefined)
        save_option('theme', theme || def);

    theme = Y.theme;
    let themes = [theme];
    // TODO: make sure every theme is included in THEMES
    if (Y.x == 'archive')
        themes.push(`${theme}-archive`);

    _('link[rel="shortcut icon"]').href = `image/favicon${theme.includes('dark')? 'b': ''}.ico`;

    S('#theme0', theme != def);
    S('#theme1', theme == def);
    update_theme(themes);
}

/**
 * Called whenever the page loads and whenever the hash changes
 */
function check_hash_special() {
    check_stream();

    if (!['archive', 'live'].includes(Y.x))
        Y.x = 'live';

    let is_live = (Y.x == 'live'),
        parent = Id('tables');
    Class('#nav-archive', 'yellow', !is_live);
    Class('#nav-live', 'red', is_live);
    change_theme();

    populate_areas();
    S('[data-x="season"]', !is_live, parent);
    S('[data-x="log"]', is_live, parent);

    Attrs('[data-x="sched"] i[data-t]', {'data-t': is_live? 'Schedule': 'Games'});
    translate_node('#table-tabs');

    // changed section
    if (Y.x != old_x) {
        changed_section();
        old_x = Y.x;
        close_popups();
    }
    changed_hash();
}

/**
 * Check stream settings
 */
function check_stream() {
    // stream.html => also activates stream=1
    if (location.pathname.includes('stream.html')) {
        Y.stream = 1;
        Y.x = 'live';
    }

    let stream = Y.stream;
    if (stream == old_stream)
        return;

    __PREFIX = stream? 'ts_': 'tc_';
    load_defaults();
    check_hash(true);

    if (stream) {
        Assign(Y, STREAM_SETTINGS);
        Y.stream = 1;
    }

    change_theme(Y.theme);
    resize();

    if (stream)
        scroll_adjust('#overview');

    // maybe the board has not been loaded yet
    if (!xboards.live)
        return;
    update_board_theme(7);
    old_stream = stream;
}

/**
 * Close all popups
 */
function close_popups() {
    show_popup();
    show_popup('about');
    popup_custom('popup-fen', 'fen', {type: 'mouseleave'});

    // empty the content to prevent controls for still interacting with the popup (ex: SELECT)
    HTML('#modal', '');
}

/**
 * Create an URL list
 * @param {Object} dico {key:value, ...}
 * - value is string => URL is created unless empty string
 * - otherwise insert separator
 * @returns {string}
 */
function create_url_list(dico) {
    if (!dico)
        return '';

    let html = Keys(dico).map(key => {
        let value = dico[key];
        if (typeof(value) != 'string')
            return '<hr>';

        if (!value)
            return `<a class="item" data-id="${create_field_value(key)[0]}" data-t="${key}"></a>`;

        if (!'./'.includes(value[0]) && value.slice(0, 4) != 'http')
            value = `${HOST}/${value}`;
        return `<a class="item" href="${value}" target="_blank" data-t="${key}"></a>`;
    }).join('');

    return `<vert class="fastart">${html}</vert>`;
}

/**
 * Draw a rectangle around the node
 * @param {Node} node
 */
function draw_rectangle(node) {
    if (!node)
        return;
    let rect = node.getBoundingClientRect(),
        y1 = Max(rect.top, 0),
        y2 = Min(rect.top + rect.height, window.innerHeight);

    Style('#rect', `left:${rect.left}px;height:${y2 - y1}px;top:${y1}px;width:${rect.width}px`);
    Show('#rect');
}

/**
 * Handle a drop event
 * @param {Event} e
 */
function handle_drop(e) {
    if (!Y.drag_and_drop)
        return;
    add_history();

    let [child] = get_drop_id(e.target),
        in_tab = 0,
        parent = Parent(e.target, {class_: 'area', self: true}),
        rect = child? child.getBoundingClientRect(): null;

    // 1) resolve tab => nodes
    if (HasClass(drag_source, 'drop')) {
        drag_source = Id(drag_source.dataset.x);
        in_tab |= 1;
    }
    if (HasClass(child, 'drop')) {
        child = Id(child.dataset.x);
        in_tab |= 2;
    }

    if (parent && drag_source != child) {
        let next,
            parent_areas = new Set([
                get_area(drag_source).id,
                parent.id,
            ]),
            prev_source = drag_source.previousElementSibling,
            prev_tabbed = (context_areas[drag_source.id] || [])[1];

        // 2) insert before or after
        if (child) {
            // same tabs parent => if source is before: insert after, otherwise insert before
            if (in_tab == 3 || (!in_tab && parent_areas.size == 1))
                next = (Index(drag_source) < Index(child));
            else {
                // this part can be improved
                if (parent.tagName == 'HORIS' || (in_tab & 2)) {
                    if (e.clientX >= rect.left + rect.width / 2)
                        next = true;
                }
                else if (e.clientY >= rect.top + rect.height / 2)
                    next = true;
            }
        }
        parent.insertBefore(drag_source, next? child.nextElementSibling: child);

        // 3) from/to tabs
        let context_area = SetDefault(context_areas, drag_source.id, [drag_source.id, 0, 1]);
        if (in_tab & 2) {
            if (next) {
                let prev_context = context_areas[child.id] || [];
                context_area[1] = prev_context[1] || 0;
                prev_context[1] = 1;
            }
            else
                context_area[1] = 1;
        }
        else
            context_area[1] = 0;

        // zero the last tab
        if ((in_tab & 1) && prev_source && prev_tabbed == 0) {
            let prev_context = context_areas[prev_source.id || prev_source.dataset.x] || [];
            prev_context[1] = 0;
        }

        // 4) update areas
        for (let parent of parent_areas)
            Y.areas[parent] = From(Id(parent).children).filter(child => child.id).map(child => {
                let context_area = context_areas[child.id] || [];
                return [child.id, context_area[1] || 0, context_area[2] || 1];
            });

        populate_areas();
    }

    Hide('#rect');
    Class('.area', '-dragging');

    e.stopPropagation();
    e.preventDefault();
    add_history();
}

/**
 * Hide a drag element
 * @param {Node} target
 */
function hide_element(target) {
    let [node, id] = get_drop_id(target),
        areas = Y.areas;
    if (!node)
        return;

    Keys(areas).forEach(key => {
        for (let vector of areas[key])
            if (vector[0] == id) {
                vector[2] &= ~1;
                break;
            }
    });

    Hide(node);
    populate_areas();
}

/**
 * Import settings from an object
 * @param {Object} data
 * @param {boolean=} reset
 */
function import_settings(data, reset) {
    Keys(data).forEach(key => {
        if (!NO_IMPORTS[key])
            save_option(key, data[key]);
    });

    if (reset)
        reset_settings();
}

/**
 * Init custom settings
 * @param {boolean} initial
 */
function init_customs(initial) {
    add_timeout('twitch', update_twitch, initial? TIMEOUTS.twitch: 0);
    change_theme();
    move_pane();
    resize_move_lists();
    show_live_engines();
    set_draggable();
    populate_areas();
    update_board_theme(7);
}

/**
 * Ran once at the last initialisation step
 */
function init_globals() {
    HTML('#version', VERSION);
    HTML('#champions', CHAMPIONS.map(text => {
        let [season, winner] = text.split('|');
        return `<i data-t="Season"></i> ${season}: ${winner}`;
    }).join(' | '));

    // load local data directly, and later online data
    download_tables(true);
    add_timeout('tables', download_tables, TIMEOUTS.tables);

    // delayed loading
    show_banner();
    update_twitch(null, null, true);
    add_timeout('graph', () => {
        init_graph(() => {
            download_live();
            resize();
        });
    }, TIMEOUTS.graph);
    add_timeout('three', set_3d_scene, TIMEOUTS.three);

    // google ads
    if (!Y.no_ad && !DEV.ad && location.port != 8080) {
        add_timeout('adblock', () => {
            if (_('.google-ad').clientHeight <= 0) {
                HTML('.adblock', HTML('#adblock'));
                Show('.adblock');
            }
        }, TIMEOUTS.adblock);

        add_timeout('ad', insert_google_ads, TIMEOUTS.google_ad);
    }
    load_google_analytics();

    if (Visible('#table-log'))
        listen_log();

    // font size detector
    add_timeout('font', () => {
        let font_height = Id('text').offsetHeight;
        if (font_height != old_font_height || window.innerHeight != old_window_height) {
            resize();
            old_font_height = font_height;
            old_window_height = window.innerHeight;
        }

        if (Y.stream)
            ScrollDocument('#overview');
    }, TIMEOUT_font, true);

    // suspend/resume
    add_timeout('resume', () => {
        let now = Now(),
            diff = now - resume_time;
        if (diff * 1000 > TIMEOUT_resume * 3)
            resume_sleep();
        resume_time = now;
    }, TIMEOUT_resume, true);
}

/**
 * Insert one google ad
 * @param {number} id
 */
function insert_google_ad(id) {
    let html =
    `<ins class="adsbygoogle"
        style="display:block;${AD_STYLES[id] || ''}"
        data-ad-client="ca-pub-6544406400639567"
        data-ad-slot="4926769371"
        data-ad-format="auto"
        data-full-width-responsive="true">
    </ins>`;

    HTML(`#ad${id} > hori`, html);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
}

/**
 * Insert google ads after some time
 */
function insert_google_ads() {
    insert_google_ad(0);
    insert_google_ad(1);

    load_library('//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', null, {async: ''});
}

/**
 * Load Google Analytics library
 */
function load_google_analytics() {
    window._gaq = window._gaq || [];
    window._gaq.push(
        ['_setAccount', 'UA-37458566-1'],
        ['_trackPageview'],
        ['b._setAccount', 'UA-1679851-1'],
        ['b._trackPageview'],
    );

    load_library(('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js');
}

/**
 * Move a pane left or right, swapping it with another
 * - call without arguments to initialise the panes at startup
 * @param {Node=} node
 * @param {number=} dir -1, 1
 */
function move_pane(node, dir) {
    let names = Split(Y.order);

    if (node) {
        let id = node.id,
            curr = names.indexOf(id),
            target = (curr + dir + 3) % 3;
        names[curr] = names[target];
        names[target] = id;
    }

    names.forEach((name, id) => {
        Style(Id(name), `order:${id}`);
    });

    if (node)
        save_option('order', names.join('|'));
}

/**
 * A table was opened => extra handling
 * @param {Node} node
 * @param {string} name
 * @param {Node} tab
 */
function opened_table_special(node, name, tab) {
    if (['chat', 'information', 'winner'].includes(name))
        update_twitch(null, null, true);
}

/**
 * Populate areas
 */
function populate_areas() {
    let areas = Y.areas,
        default_areas = DEFAULTS.areas,
        section = Y.x,
        hides = Assign({}, HIDES[section]);

    if (!Y.moves_copy)
        hides[`moves-${section}`] = 1;

    // 1) count existing
    Keys(areas).forEach(key => {
        for (let vector of areas[key])
            context_areas[vector[0]] = vector;
    });

    // 2) process all areas
    Keys(areas).forEach(key => {
        let parent = Id(key);
        if (!parent)
            return;

        // a) add missing defaults
        for (let vector of default_areas[key]) {
            if (!context_areas[vector[0]]) {
                areas[key].push(vector);
            }
        }

        // b) check if we already have the correct order, if yes then skip
        let prev_tab, tabs,
            children = parent.children,
            child = children[0],
            child_id = 0,
            error = '';

        for (let [id, tab, show] of areas[key]) {
            let node = Id(id);
            if (!node)
                continue;

            let is_tab;
            if (tab || prev_tab) {
                if (!prev_tab) {
                    tabs = child;
                    if (!HasClass(child, 'tabs')) {
                        error = 'tabs';
                        break;
                    }

                    child_id ++;
                    child = children[child_id];
                }

                if (show & 1)
                    is_tab = true;
                show = show & 2;
            }
            else
                tabs = null;

            if (!child || child.id != id) {
                error = `id=${id}`;
                break;
            }
            else if (!is_tab) {
                let is_show = ((show & 1) && !hides[id])? true: false,
                    visible = Visible(child);

                if (is_show != visible) {
                    error = `vis=${id}`;
                    break;
                }
            }

            prev_tab = tab;
            child_id ++;
            child = children[child_id];
        }

        if (!error) {
            if (child)
                error = `last=${child.id}`;
            else
                return;
        }
        if (DEV.ui) {
            LS(`populate ${key} : ${error}`);
            LS(child);
        }

        // c) restructure the panel => this will cause the chat to reload too
        // remove tabs
        E('.tabs', node => {
            node.remove();
        }, parent);

        // add children + create tabs
        let exist = 0;
        prev_tab = null;
        tabs = null;
        for (let vector of areas[key]) {
            let [id, tab, show] = vector,
                node = Id(id);
            if (!node)
                continue;

            if (tab || prev_tab) {
                if (show & 1) {
                    if (!prev_tab) {
                        tabs = CreateNode('horis', '', {class: 'tabs', style: exist? 'margin-top:1em': ''});
                        parent.appendChild(tabs);
                    }

                    let text = id.split('-');
                    text = text.slice(-text.length + 1).join('-');
                    text = TAB_NAMES[text] || Title(text);

                    let dico = {
                            class: `tab drop${(show & 2)? ' active': ''}`,
                            'data-abbr': text,
                            'data-label': HTML('.label', undefined, node) || '',
                            'data-x': id,
                        },
                        title = TITLES[text];

                    if (title)
                        Assign(dico, {
                            'data-t': title,
                            'data-t2': 'title',
                        });

                    tabs.appendChild(CreateNode('div', `<i data-t="${text}"></i>`, dico));
                }
                show = show & 2;
            }
            else
                tabs = null;

            parent.appendChild(node);
            S(node, show & 1);
            S('.label', !tab && !prev_tab, node);

            context_areas[id] = vector;
            prev_tab = tab;
            exist ++;
        }
    });

    // 3) activate tabs
    E('.tabs', node => {
        let tabs = From(A('.tab', node)),
            actives = tabs.filter(node => HasClass(node, 'active'));

        // few tabs => show full label
        if (tabs.length < 4)
            for (let tab of tabs) {
                let dataset = tab.dataset;
                dataset.t = dataset.label || dataset.abbr;
            }

        open_table(actives.length? actives[0]: tabs[0]);
    });

    save_option('areas');
    translate_node('body');
    set_draggable();
    show_archive_live();
    update_shortcuts();
    resize();
}

/**
 * Reset to the default/other settings
 * @param {boolean} is_default
 */
function reset_settings(is_default) {
    if (is_default) {
        localStorage.clear();
        Assign(Y, DEFAULTS);
        load_settings();
        init_globals();
    }

    init_customs();
    close_popups();
    resize();
}

/**
 * Resize the window => resize some other elements
 */
function resize() {
    Style(
        '#banners, #bottom, #main, .pagin, .scroller, #sub-header, #table-log, #table-search, #table-status, #table-tabs, #top',
        `max-width:${Y.max_window}px`
    );
    Style('#chat', `height:${Clamp(Y.chat_height, 350, window.height)}px;width:100%`);

    resize_panels();

    // resize charts
    E('.chart', node => {
        let parent = node.parentNode,
            width = parent.clientWidth - 2,
            height = width / Max(0.5, Y.graph_aspect_ratio);
        Style(node, `height:${height}px;width:${width}px`);
    });

    adjust_popups();
    resize_game();

    add_timeout('graph_resize', () => {update_chart_options(null, 2);}, TIMEOUT_graph);
}

/**
 * Resize the move lists
 */
function resize_move_lists() {
    let styles = [
        ['#archive .xmoves, #live .xmoves', Y.move_height, Y.grid],
        ['#live0 .xmoves, #live1 .xmoves, #pv0 .xmoves, #pv1 .xmoves', Y.move_height_pv, Y.grid_pv],
        ['#pva .xmoves', Y.move_height_pva, Y.grid_pva],
        ['.live-pv', Y.move_height_live, Y.grid_live],
        ['#moves-archive, #moves-live', Y.move_height_copy, Y.grid_copy],
    ];

    for (let [sel, height, grid] of styles) {
        let extra = grid? `grid-template-columns: repeat(${grid}, 2em 1fr 1fr)`: '';
        Style(sel, `min-height:${height}em;${extra}`);
        Class(sel, 'grid', grid);
    }
}

/**
 * Resize the left & right panels
 */
function resize_panels() {
    update_visible();

    // panel full + width
    let panel_gap = Y.panel_gap,
        panels = From(A('.panel')).sort((a, b) => a.style.order - b.style.order),
        window_width = window.innerWidth;
    for (let panel of panels) {
        let name = panel.id,
            max_width = Y[`max_${name}`],
            min_width = Y[`min_${name}`],
            styles = [`margin:0 ${panel_gap}px`];

        if (max_width <= 0 && min_width <= 0)
            Hide(panel);
        else {
            if (max_width > -1)
                styles.push(`max-width:${max_width}px`);
            if (min_width > -1)
                styles.push(`min-width:${min_width}px`);

            Class(panel, 'full', panel.style.order == 2 && window_width <= 866);
            Style(panel, styles.join(';'));
            Show(panel);
        }
    }

    // swaps
    S('.swap', Y.panel_adjust);
    Style('.swaps', 'min-height:0.6em', !Y.panel_adjust);

    Style('.area > *', 'max-width:100%');
    Style('#bottom > *', `max-width:calc(${(100 / Y.column_bottom)}% - ${Y.column_bottom * 2}px)`);
    Style('#top > *', `max-width:calc(${(100 / Y.column_top)}% - ${Y.column_top * 2}px)`);

    // special cases
    Attrs('#eval', {'data-t': (Id('engine').clientWidth > 330)? 'Evaluation': 'Eval'});
    translate_node('#engine');

    // column/row mode
    E('.status', node => {
        let area = get_area(node);
        Style(node, `margin-bottom:1em;margin-top:-0.5em`, area.clientWidth < 390);
    });
    Keys(xboards).forEach(key => {
        let board = xboards[key];
        if (!board.sub || board.manual)
            return;
        let node = board.node,
            area_width = get_area(node).clientWidth;
        Class(board.xmoves, 'column', area_width < 390);
        Class(node, 'fcol', area_width >= 390);
    });
    E('#table-kibitz, #table-pv', node => {
        let area = get_area(node);
        Class(node, 'frow fastart', area.clientWidth >= 390);
    });

    order_boards();

    // resize all charts
    E('.chart', node => {
        let area = get_area(node);
        if (area && !['bottom', 'top'].includes(area.id)) {
            let width = area.clientWidth;
            Style(node, `height:${width / Max(0.5, Y.graph_aspect_ratio)}px;width:${width}px`);
        }
    });
}

/**
 * Enable/disable 3d scene rendering
 * + start the 3d engine if on
 * @param {boolean} three
 */
function set_3d_scene(three) {
    if (three != undefined)
        save_option('three', three);
    three = Y.three;

    Style('#three', `color:${three? '#fff': '#555'}`);
    S('#canvas', three);
    if (three)
        start_3d();
}

/**
 * Set some elements to be draggable or not
 */
function set_draggable() {
    let drag = !!Y.drag_and_drop;
    Attrs('.drag, .drop', {draggable: drag});
}

/**
 * Show / hide the archive/live boards
 */
function show_archive_live() {
    let section = Y.x,
        is_live = (section == 'live');

    Hide(is_live? '#archive': '#live');
    Hide(`#moves-${is_live? 'archive': 'live'}`);
    if (!Y.moves_copy)
        Hide(Id(`moves-${section}`));
}

/**
 * Show live engines
 */
function show_live_engines() {
    let single_line = Y.single_line;

    LIVE_ENGINES.forEach((live, id) => {
        HTML(`[data-x="live${id}"]`, live);
        if (!single_line) {
            let items = live.split(/ (?=\dMen)/);
            live = items.join('<br>');
        }
        let sel = `[data-x="live+${id}"]`;
        HTML(sel, live);
        Style(sel, `top:${single_line? 0.35: 0.6}em`);
    });
}

/**
 * Show/hide popup
 * @param {string=} name
 * @param {boolean=} show
 * @param {boolean=} adjust only change its position
 * @param {boolean=} instant popup appears instantly
 * @param {boolean=} overlay dark overlay is used behind the popup
 * @param {string=} setting
 * @param {number[]]=} xy
 */
function show_popup(name, show, {adjust, instant=true, overlay, setting, xy}={}) {
    S('#overlay', show && overlay);

    let node = (name == 'about')? Id('popup-about'): Id('modal');
    if (!node)
        return;

    if (show || adjust) {
        let html = '',
            px = 0,
            py = 0,
            win_x = window.innerWidth,
            win_y = window.innerHeight,
            x = 0,
            x2 = 0,
            y = 0,
            y2 = 0;

        // create the html
        switch (name) {
        case 'about':
            html = HTML('#desc');
            px = -50;
            py = -50;
            x = win_x / 2;
            y = win_y / 2;
            break;
        case 'options':
            if (!xy)
                context_target = null;
            html = show_settings(setting, xy);
            break;
        default:
            if (name)
                html = create_url_list(LINKS[name]);
            break;
        }

        if (show)
            HTML(name == 'about'? '#popup-desc': '#modal', html);
        else
            name = node.dataset.id;

        Class(node, 'settings', !!(name == 'options' && (adjust || setting)));
        translate_node(node);

        // align the popup with the target, if any
        if (adjust && !xy) {
            let item = node.dataset.xy;
            if (item)
                xy = item.split(',').map(item => item * 1);
        }
        if (xy) {
            x = xy[0];
            y = xy[1];
            x2 = x;
            y2 = y;
        }
        else if (name && !px) {
            let target = Id(name);
            if (target) {
                let rect = target.getBoundingClientRect();
                [x, y, x2, y2] = [rect.left, rect.bottom, rect.right, rect.top];
            }
        }

        // make sure the popup remains inside the window
        let height = node.clientHeight,
            width = node.clientWidth;

        // align left doesn't work => try align right, and if not then center
        if (x + width > win_x - 20) {
            if (x2 < win_x - 20 && x2 - width > 0) {
                px = -100;
                x = x2;
            }
            else {
                px = -50;
                x = win_x / 2;
            }
        }
        // same for y
        if (y + height > win_y) {
            if (y2 < win_y && y2 - height > 0) {
                py = -100;
                y = y2;
            }
            else {
                py = -50;
                y = win_y / 2;
            }
        }

        node.dataset.xy = xy || '';
        x += full_scroll.x;
        y += full_scroll.y;
        Style(node, `transform:translate(${px}%, ${py}%) translate(${x}px, ${y}px)`);
    }

    if (!adjust) {
        if (instant != undefined)
            Class(node, 'instant', instant);
        Class(node, 'popup-show popup-enable', !!show);

        // remember which popup it is, so if we click again on the same id => it closes it
        node.dataset.id = show? name: '';

        set_modal_events(node);
        Show(node);
    }
}

/**
 * Add a drag element to a tab group
 * @param {Node} target
 */
function tab_element(target) {
    let [node, id] = get_drop_id(target),
        areas = Y.areas;
    if (!node)
        return;

    Keys(areas).forEach(key => {
        for (let vector of areas[key])
            if (vector[0] == id) {
                vector[1] = vector[1]? 0: 1;
                break;
            }
    });

    populate_areas();
}

/**
 * Update the shortcuts on the top right
 * - copy the tab text
 * - copy the table html
 * TODO: delete this
 */
function update_shortcuts() {
    for (let id = 1; id <= 2 ; id ++) {
        let tab = _(`.tab[data-x="shortcut_${id}"]`),
            shortcut = Y[`shortcut_${id}`];
        if (!tab)
            continue;

        if (shortcut) {
            let target = _(`.tab[data-x="${shortcut}"]`);
            if (target && !target.dataset.t)
                target = _('[data-t]', target);
            if (target) {
                tab.dataset.t = target.dataset.t;
                translate_node(tab.parentNode);
                HTML(Id(`shortcut_${id}`), HTML(Id(`table-${shortcut}`)));
            }
        }
        S(tab, shortcut);
    }
}

/**
 * Show/hide stuff
 */
function update_visible() {
    let eval_left = Y.eval_left,
        hardware = Y.hardware,
        templates = [eval_left? '3em': 'auto', 'auto', hardware? 'auto': '1fr'];

    S('.status', Y.status_pv);
    S('.eval', Y.eval);
    Class('.eval', 'eval-left', eval_left);
    S('.hardware', hardware);
    Class('.live-basic', 'w100', !hardware);
    Style('.live-basic', `grid-template-columns:${templates.join(' ')}`);
    S('.live-more', !Y.single_line);
    S('.percent', Y.percent);
    Class('.percent', 'tar', !hardware);
    S('#archive .xmoves, #live .xmoves', Y.moves);
    S('#live0 .xmoves, #live1 .xmoves, #pv0 .xmoves, #pv1 .xmoves', Y.moves_pv);
    S('#pva .xmoves', Y.moves_pva);
    S('#moves-pv0 .live-pv, #moves-pv1 .live-pv, #table-live0 .live-pv, #table-live1 .live-pv', Y.moves_live);
    S('#mobil_, #mobil0, #mobil1', Y.mobility);

    show_live_engines();
}

/**
 * Handle a general window click
 * @param {Event} e
 */
function window_click(e) {
    if (cannot_click())
        return;

    let in_modal,
        target = e.target,
        dataset = target.dataset;

    // special cases
    if (dataset) {
        let id = dataset.id;
        if (id == 'about') {
            show_popup('');
            show_popup(id, true, {overlay: true});
            return;
        }
    }

    while (target) {
        let id = target.id;
        if (id) {
            if (['archive', 'live'].includes(id))
                break;
            if (id.includes('modal') || id.includes('popup')) {
                in_modal = id;
                return;
            }
        }
        if (HasClasses(target, 'fen|nav'))
            return;
        if (HasClasses(target, 'live-pv|xmoves'))
            context_target = target;
        if (HasClass(target, 'page')) {
            let parent = Parent(target, {class_: 'pagin'});
            change_page(parent.id.split('-')[0], target.dataset.p);
            break;
        }
        if (HasClass(target, 'tab')) {
            open_table(target);
            break;
        }

        // sub settings
        let dataset = target.dataset;
        if (dataset) {
            let set = target.dataset.set;
            if (set != undefined) {
                let parent = Parent(target, {class_: 'popup'}),
                    xy = '';
                if (parent && parent.dataset) {
                    let item = parent.dataset.xy;
                    if (item)
                        xy = item.split(',').map(item => item * 1);
                }
                show_popup('options', set != -1, {setting: set, xy: xy});
                return;
            }
        }

        target = target.parentNode;
    }

    if (!in_modal)
        close_popups();
}

// MAIN
///////

/**
 * Global events
 */
function set_global_events() {
    // general
    Events(window, 'resize', resize);
    Events(window, 'scroll', adjust_popups);
    // it won't be triggered by pushState and replaceState
    Events(window, 'hashchange', () => {
        check_hash();
        parse_dev();
    });
    Events(window, 'popstate', e => {
        let state = e.state;
        if (!state)
            return;
        Assign(Y, state);
        check_hash_special();
    });

    // keys
    Events(window, 'keydown keyup', e => {
        // LS(`key=${e.key} : code=${e.code} : keycode=${e.keyCode}`);
        let active = document.activeElement,
            code = e.keyCode,
            is_game = true,
            type = e.type;

        if (!code)
            return;
        if (type == 'keydown')
            action_key(code);

        // ignore keys when on inputs, except ENTER & TAB
        if (active && {INPUT: 1, TEXTAREA: 1}[active.tagName])
            return;

        if (type == 'keydown') {
            if (is_game)
                game_action_key(code);
            else
                action_key_no_input(code, active);
            if (!KEYS[code])
                KEY_TIMES[code] = Now(true);
            KEYS[code] = 1;
        }
        else {
            if (is_game)
                game_action_keyup(code);
            else
                action_keyup_no_input(code);
            KEYS[code] = 0;
        }

        // prevent some default actions
        if ([9, 112].includes(code))
            e.preventDefault();

        update_debug();
    });

    // popups
    C('#banner', function() {
        Hide(this);
    });
    C('.popup-close', function() {
        close_popups();
        let parent = Parent(this, {class_: 'popup', tag: 'div vert'});
        if (parent)
            Class(parent, '-popup-enable -popup-show');
    });
    C('#articles, #download, #info, #navigate, #options', function() {
        show_popup('about');
        if (Id('modal').dataset.id == this.id)
            show_popup('');
        else
            show_popup(this.id, true);
    });
    C('#overlay', () => {
        close_popups();
    });

    // click somewhere => close the popups
    Events(window, 'click', window_click);

    // swap panes
    Events('#center, #left, #right', 'mouseenter mouseleave', function(e) {
        if (Y.panel_adjust)
            Style('.swap', `opacity:${(e.type == 'mouseenter')? 1: 0}`, true, this);
    });
    C('.swap', function() {
        let index = Index(this),
            node = this.parentNode.parentNode;
        // 1, 2 => < >
        if (index <= 2)
            move_pane(node, index * 2 - 3);
        // 3, 4 => - +
        else if (index <= 4) {
            let add = index * 2 - 7,
                name = `max_${node.id}`,
                sizer = _('.size', node),
                value = Y[name];

            if (add > 0)
                value += (value < 0)? 1: add * 10;
            else if (value > 0 && value < 10)
                value = 0;
            else
                value += add * 10;

            save_option(name, Clamp(value, -1, 1200));
            HTML(sizer, Y[name]);
            Show(sizer);
            add_timeout('size', () => {Hide('.size');}, TIMEOUT_size);
            resize();
        }
    });

    // theme + twitch
    C('#theme0, #theme1', function() {
        change_theme((this.id.slice(-1) == '1')? 'dark': 'light');
    });
    C('#twitch0, #twitch1', function() {
        update_twitch((this.id.slice(-1) == '1') * 1);
    });
    C('#hide-chat, #hide-video, #show-chat, #show-video', function() {
        let [left, right] = this.id.split('-');
        save_option(`twitch_${right}`, (left == 'show') * 1);
        update_twitch();
    });
    C('#three', () => {
        set_3d_scene(!Y.three);
    });
    C('#full0, #full1', () => {
        toggle_fullscreen(full => {
            S('#full0', full);
            S('#full1', !full);
            resize();
        });
    });

    C('#nav-archive', () => {
        // TODO: should scroll if there's no archive game loaded only??
        if (Y.archive_scroll) {
            scroll_adjust('#tables');
            if (!['cross', 'h2h', 'sched', 'season'].includes(get_active_tab('table')[0]))
                open_table('season');
        }
    });

    // context menus
    if (!DEV.popup) {
        Keys(CONTEXT_MENUS).forEach(key => {
            Events(key, 'contextmenu', function(e) {
                context_target = e.target;

                // skip some elements
                let tag = context_target.tagName;
                if (['INPUT', 'SELECT'].includes(tag))
                    return;
                if (tag == 'A' && context_target.href)
                    return;

                show_popup('options', true, {setting: CONTEXT_MENUS[key], xy: [e.clientX, e.clientY]});
                e.preventDefault();
            });
        });
        Events(
            '#archive, #live, #live0, #live1, #moves-archive, #moves-live, #moves-pv0, #moves-pv1, #pv0, #pv1, #pva,'
            + '#table-live0, #table-live1', 'contextmenu', function(e) {
            let is_pv = '01'.includes(this.id.slice(-1)),
                is_pva = (this.id == 'pva'),
                target = e.target;

            while (target) {
                let dataset = target.dataset,
                    name;
                if (dataset && ['next', 'prev'].includes(dataset.x))
                    return;
                else if (HasClasses(target, 'hardware|live-basic|live-more'))
                    name = 'eval';
                else if (HasClass(target, 'live-pv'))
                    name = 'live';
                else if (HasClass(target, 'xbottom'))
                    return;
                else if (HasClass(target, 'xcontain'))
                    name = is_pva? 'board_pva': (is_pv? 'board_pv': 'board');
                else if (HasClass(target, 'xcontrol'))
                    name = 'control';
                else if (HasClass(target, 'xmoves'))
                    name = `copy${is_pva? '_pva': (is_pv? '_pv': '')}`;

                if (name) {
                    context_target = target;
                    show_popup('options', true, {setting: name, xy: [e.clientX, e.clientY]});
                    e.preventDefault();
                    return;
                }
                target = target.parentNode;
            }
        });
        Events(window, 'contextmenu', e => {
            let target = e.target;
            if (HasClasses(target, 'tab drop')) {
                let id = target.dataset.x,
                    name = (id.includes('shortcut') || id.includes('chat'))? 'quick': 'tab';
                context_target = target;
                show_popup('options', true, {setting: name, xy: [e.clientX, e.clientY]});
                e.preventDefault();
            }
        });
    }

    // fullscreen scrolling
    Events(window, 'mousedown mouseenter mouseleave mousemove mouseup touchstart touchmove touchend', e => {
        if (!is_fullscreen())
            return;
        touch_handle(e, true);
    });
    Events(window, 'wheel', e => {
        if (!is_fullscreen()) {
            if (Y.wheel_adjust)
                add_timeout('adjust', scroll_adjust, TIMEOUT_adjust);
            return;
        }
        wheel_event(e, true);
    }, {passive: true});

    // drag and drop
    Events(window, 'dragstart', e => {
        if (!Y.drag_and_drop)
            return;
        let parent = Parent(e.target, {attrs: 'draggable=true', self: true});
        if (parent)
            drag_source = parent;
    });
    Events(window, 'dragenter dragover', e => {
        if (!Y.drag_and_drop)
            return;
        let [child] = get_drop_id(e.target),
            parent = Parent(e.target, {class_: 'area', self: true});

        draw_rectangle(child || parent);
        Class('.area', 'dragging');
        e.stopPropagation();
        e.preventDefault();
    });
    Events(window, 'dragexit dragleave', e => {
        if (!Y.drag_and_drop)
            return;
        if (e.target.tagName == 'HTML') {
            Class('.area', '-dragging');
            Hide('#rect');
        }
    });
    Events(window, 'drop', handle_drop);
}

/**
 * Load settings from Local Storage
 */
function load_settings() {
    load_defaults();
    reset_old_settings();

    api_times = get_object('times') || {};
    translates = get_object('trans') || {};

    check_hash();
    parse_dev();
    api_translate_get(Y.new_version);
}

/**
 * Startup
 */
function startup() {
    // engine overrides
    __PREFIX = 'tc_';

    // 1:align_top, 2:align_bottom, + gap, priority
    ANCHORS = {
        '#bottom': [2, 0, 4],
        '#center0': [1, 4, 1],
        '#left0': [1, 4, 1],
        '#main': [2, 4, 3],
        '#overview tbody': [1, 0, 1],
        '#overview': [1, 0, 2],
        '#right0': [1, 4, 1],
        '#table-brak': [1, 2, 1],
        '#table-pagin': [1, 2, 1],
        '#table-search': [2, -2, 1],
        '#tables .scroller': [1, 2, 1],
        '#tables': [1, 2, 1],
    };

    // VB=viewBox=; PFC=path fill="currentColor"
    ICONS = {
        calendar: 'VB="0 0 448 512"><PFC d="M0 464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V192H0v272zm320-196c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM192 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM64 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zM400 64h-48V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H160V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H48C21.5 64 0 85.5 0 112v48h448v-48c0-26.5-21.5-48-48-48z"/>',
        cog: 'VB="0 0 512 512"><PFC d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"/>',
        compress: 'VB="0 0 448 512"><PFC d="M436 192H312c-13.3 0-24-10.7-24-24V44c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v84h84c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12zm-276-24V44c0-6.6-5.4-12-12-12h-40c-6.6 0-12 5.4-12 12v84H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24zm0 300V344c0-13.3-10.7-24-24-24H12c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12zm192 0v-84h84c6.6 0 12-5.4 12-12v-40c0-6.6-5.4-12-12-12H312c-13.3 0-24 10.7-24 24v124c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12z"/>',
        copy: 'VB="0 0 448 512"><PFC d="M320 448v40c0 13.255-10.745 24-24 24H24c-13.255 0-24-10.745-24-24V120c0-13.255 10.745-24 24-24h72v296c0 30.879 25.121 56 56 56h168zm0-344V0H152c-13.255 0-24 10.745-24 24v368c0 13.255 10.745 24 24 24h272c13.255 0 24-10.745 24-24V128H344c-13.2 0-24-10.8-24-24zm120.971-31.029L375.029 7.029A24 24 0 0 0 358.059 0H352v96h96v-6.059a24 24 0 0 0-7.029-16.97z"/>',
        crash: 'VB="0 0 640 512"><PFC d="M143.25 220.81l-12.42 46.37c-3.01 11.25-3.63 22.89-2.41 34.39l-35.2 28.98c-6.57 5.41-16.31-.43-14.62-8.77l15.44-76.68c1.06-5.26-2.66-10.28-8-10.79l-77.86-7.55c-8.47-.82-11.23-11.83-4.14-16.54l65.15-43.3c4.46-2.97 5.38-9.15 1.98-13.29L21.46 93.22c-5.41-6.57.43-16.3 8.78-14.62l76.68 15.44c5.26 1.06 10.28-2.66 10.8-8l7.55-77.86c.82-8.48 11.83-11.23 16.55-4.14l43.3 65.14c2.97 4.46 9.15 5.38 13.29 1.98l60.4-49.71c6.57-5.41 16.3.43 14.62 8.77L262.1 86.38c-2.71 3.05-5.43 6.09-7.91 9.4l-32.15 42.97-10.71 14.32c-32.73 8.76-59.18 34.53-68.08 67.74zm494.57 132.51l-12.42 46.36c-3.13 11.68-9.38 21.61-17.55 29.36a66.876 66.876 0 0 1-8.76 7l-13.99 52.23c-1.14 4.27-3.1 8.1-5.65 11.38-7.67 9.84-20.74 14.68-33.54 11.25L515 502.62c-17.07-4.57-27.2-22.12-22.63-39.19l8.28-30.91-247.28-66.26-8.28 30.91c-4.57 17.07-22.12 27.2-39.19 22.63l-30.91-8.28c-12.8-3.43-21.7-14.16-23.42-26.51-.57-4.12-.35-8.42.79-12.68l13.99-52.23a66.62 66.62 0 0 1-4.09-10.45c-3.2-10.79-3.65-22.52-.52-34.2l12.42-46.37c5.31-19.8 19.36-34.83 36.89-42.21a64.336 64.336 0 0 1 18.49-4.72l18.13-24.23 32.15-42.97c3.45-4.61 7.19-8.9 11.2-12.84 8-7.89 17.03-14.44 26.74-19.51 4.86-2.54 9.89-4.71 15.05-6.49 10.33-3.58 21.19-5.63 32.24-6.04 11.05-.41 22.31.82 33.43 3.8l122.68 32.87c11.12 2.98 21.48 7.54 30.85 13.43a111.11 111.11 0 0 1 34.69 34.5c8.82 13.88 14.64 29.84 16.68 46.99l6.36 53.29 3.59 30.05a64.49 64.49 0 0 1 22.74 29.93c4.39 11.88 5.29 25.19 1.75 38.39zM255.58 234.34c-18.55-4.97-34.21 4.04-39.17 22.53-4.96 18.49 4.11 34.12 22.65 39.09 18.55 4.97 45.54 15.51 50.49-2.98 4.96-18.49-15.43-53.67-33.97-58.64zm290.61 28.17l-6.36-53.29c-.58-4.87-1.89-9.53-3.82-13.86-5.8-12.99-17.2-23.01-31.42-26.82l-122.68-32.87a48.008 48.008 0 0 0-50.86 17.61l-32.15 42.97 172 46.08 75.29 20.18zm18.49 54.65c-18.55-4.97-53.8 15.31-58.75 33.79-4.95 18.49 23.69 22.86 42.24 27.83 18.55 4.97 34.21-4.04 39.17-22.53 4.95-18.48-4.11-34.12-22.66-39.09z"/>',
        cube: 'VB="0 0 576 512"><PFC d="M498.11,206.4,445.31,14.72,248.2,66.08,219,116.14l-59.2-.43L15.54,256,159.82,396.32l59.17-.43,29.24,50,197.08,51.36,52.8-191.62-30-49.63ZM223.77,124.2,374.55,86.51,288,232.33H114.87Zm0,263.63L114.87,279.71H288l86.55,145.81Zm193,14L330.17,256l86.58-145.84L458.56,256Z"/>',
        down: 'VB="0 0 320 512"><PFC d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"/>',
        download: 'VB="0 0 512 512"><PFC d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"/>',
        end: 'VB="0 0 448 512"><PFC d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34zm192-34l-136-136c-9.4-9.4-24.6-9.4-33.9 0l-22.6 22.6c-9.4 9.4-9.4 24.6 0 33.9l96.4 96.4-96.4 96.4c-9.4 9.4-9.4 24.6 0 33.9l22.6 22.6c9.4 9.4 24.6 9.4 33.9 0l136-136c9.4-9.2 9.4-24.4 0-33.8z"/>',
        expand: 'VB="0 0 448 512"><PFC d="M0 180V56c0-13.3 10.7-24 24-24h124c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H64v84c0 6.6-5.4 12-12 12H12c-6.6 0-12-5.4-12-12zM288 44v40c0 6.6 5.4 12 12 12h84v84c0 6.6 5.4 12 12 12h40c6.6 0 12-5.4 12-12V56c0-13.3-10.7-24-24-24H300c-6.6 0-12 5.4-12 12zm148 276h-40c-6.6 0-12 5.4-12 12v84h-84c-6.6 0-12 5.4-12 12v40c0 6.6 5.4 12 12 12h124c13.3 0 24-10.7 24-24V332c0-6.6-5.4-12-12-12zM160 468v-40c0-6.6-5.4-12-12-12H64v-84c0-6.6-5.4-12-12-12H12c-6.6 0-12 5.4-12 12v124c0 13.3 10.7 24 24 24h124c6.6 0 12-5.4 12-12z"/>',
        info: 'VB="0 0 512 512"><PFC d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/>',
        lock: 'VB="0 0 576 512"><PFC d="M423.5 0C339.5.3 272 69.5 272 153.5V224H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48h-48v-71.1c0-39.6 31.7-72.5 71.3-72.9 40-.4 72.7 32.1 72.7 72v80c0 13.3 10.7 24 24 24h32c13.3 0 24-10.7 24-24v-80C576 68 507.5-.3 423.5 0z"/>',
        log: 'VB="0 0 448 512"><PFC d="M448 360V24c0-13.3-10.7-24-24-24H96C43 0 0 43 0 96v320c0 53 43 96 96 96h328c13.3 0 24-10.7 24-24v-16c0-7.5-3.5-14.3-8.9-18.7-4.2-15.4-4.2-59.3 0-74.7 5.4-4.3 8.9-11.1 8.9-18.6zM128 134c0-3.3 2.7-6 6-6h212c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H134c-3.3 0-6-2.7-6-6v-20zm0 64c0-3.3 2.7-6 6-6h212c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6H134c-3.3 0-6-2.7-6-6v-20zm253.4 250H96c-17.7 0-32-14.3-32-32 0-17.6 14.4-32 32-32h285.4c-1.9 17.1-1.9 46.9 0 64z"/>',
        medal: 'VB="0 0 512 512"><PFC d="M223.75 130.75L154.62 15.54A31.997 31.997 0 0 0 127.18 0H16.03C3.08 0-4.5 14.57 2.92 25.18l111.27 158.96c29.72-27.77 67.52-46.83 109.56-53.39zM495.97 0H384.82c-11.24 0-21.66 5.9-27.44 15.54l-69.13 115.21c42.04 6.56 79.84 25.62 109.56 53.38L509.08 25.18C516.5 14.57 508.92 0 495.97 0zM256 160c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm92.52 157.26l-37.93 36.96 8.97 52.22c1.6 9.36-8.26 16.51-16.65 12.09L256 393.88l-46.9 24.65c-8.4 4.45-18.25-2.74-16.65-12.09l8.97-52.22-37.93-36.96c-6.82-6.64-3.05-18.23 6.35-19.59l52.43-7.64 23.43-47.52c2.11-4.28 6.19-6.39 10.28-6.39 4.11 0 8.22 2.14 10.33 6.39l23.43 47.52 52.43 7.64c9.4 1.36 13.17 12.95 6.35 19.59z"/>',
        minus: 'VB="0 0 448 512"><PFC d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"/>',
        moon: 'VB="0 0 512 512"><PFC d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/>',
        next: 'VB="0 0 256 512"><PFC d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z"/>',
        pause: 'VB="0 0 448 512"><PFC d="M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z"/>',
        play: 'VB="0 0 448 512"><PFC d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"/>',
        plus: 'VB="0 0 448 512"><PFC d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"/>',
        rotate: 'VB="0 0 512 512"><PFC d="M504.971 359.029c9.373 9.373 9.373 24.569 0 33.941l-80 79.984c-15.01 15.01-40.971 4.49-40.971-16.971V416h-58.785a12.004 12.004 0 0 1-8.773-3.812l-70.556-75.596 53.333-57.143L352 336h32v-39.981c0-21.438 25.943-31.998 40.971-16.971l80 79.981zM12 176h84l52.781 56.551 53.333-57.143-70.556-75.596A11.999 11.999 0 0 0 122.785 96H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12zm372 0v39.984c0 21.46 25.961 31.98 40.971 16.971l80-79.984c9.373-9.373 9.373-24.569 0-33.941l-80-79.981C409.943 24.021 384 34.582 384 56.019V96h-58.785a12.004 12.004 0 0 0-8.773 3.812L96 336H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h110.785c3.326 0 6.503-1.381 8.773-3.812L352 176h32z"/>',
        sun: 'VB="0 0 512 512"><PFC d="M256 160c-52.9 0-96 43.1-96 96s43.1 96 96 96 96-43.1 96-96-43.1-96-96-96zm246.4 80.5l-94.7-47.3 33.5-100.4c4.5-13.6-8.4-26.5-21.9-21.9l-100.4 33.5-47.4-94.8c-6.4-12.8-24.6-12.8-31 0l-47.3 94.7L92.7 70.8c-13.6-4.5-26.5 8.4-21.9 21.9l33.5 100.4-94.7 47.4c-12.8 6.4-12.8 24.6 0 31l94.7 47.3-33.5 100.5c-4.5 13.6 8.4 26.5 21.9 21.9l100.4-33.5 47.3 94.7c6.4 12.8 24.6 12.8 31 0l47.3-94.7 100.4 33.5c13.6 4.5 26.5-8.4 21.9-21.9l-33.5-100.4 94.7-47.3c13-6.5 13-24.7.2-31.1zm-155.9 106c-49.9 49.9-131.1 49.9-181 0-49.9-49.9-49.9-131.1 0-181 49.9-49.9 131.1-49.9 181 0 49.9 49.9 49.9 131.1 0 181z"/>',
        theater: 'VB="0 0 640 512"><PFC d="M206.86 245.15c-35.88 10.45-59.95 41.2-57.53 74.1 11.4-12.72 28.81-23.7 49.9-30.92l7.63-43.18zM95.81 295L64.08 115.49c-.29-1.62.28-2.62.24-2.65 57.76-32.06 123.12-49.01 189.01-49.01 1.61 0 3.23.17 4.85.19 13.95-13.47 31.73-22.83 51.59-26 18.89-3.02 38.05-4.55 57.18-5.32-9.99-13.95-24.48-24.23-41.77-27C301.27 1.89 277.24 0 253.32 0 176.66 0 101.02 19.42 33.2 57.06 9.03 70.48-3.92 98.48 1.05 126.58l31.73 179.51c14.23 80.52 136.33 142.08 204.45 142.08 3.59 0 6.75-.46 10.01-.8-13.52-17.08-28.94-40.48-39.5-67.58-47.61-12.98-106.06-51.62-111.93-84.79zm97.55-137.46c-.73-4.12-2.23-7.87-4.07-11.4-8.25 8.91-20.67 15.75-35.32 18.32-14.65 2.58-28.67.4-39.48-5.17-.52 3.94-.64 7.98.09 12.1 3.84 21.7 24.58 36.19 46.34 32.37 21.75-3.82 36.28-24.52 32.44-46.22zM606.8 120.9c-88.98-49.38-191.43-67.41-291.98-51.35-27.31 4.36-49.08 26.26-54.04 54.36l-31.73 179.51c-15.39 87.05 95.28 196.27 158.31 207.35 63.03 11.09 204.47-53.79 219.86-140.84l31.73-179.51c4.97-28.11-7.98-56.11-32.15-69.52zm-273.24 96.8c3.84-21.7 24.58-36.19 46.34-32.36 21.76 3.83 36.28 24.52 32.45 46.22-.73 4.12-2.23 7.87-4.07 11.4-8.25-8.91-20.67-15.75-35.32-18.32-14.65-2.58-28.67-.4-39.48 5.17-.53-3.95-.65-7.99.08-12.11zm70.47 198.76c-55.68-9.79-93.52-59.27-89.04-112.9 20.6 25.54 56.21 46.17 99.49 53.78 43.28 7.61 83.82.37 111.93-16.6-14.18 51.94-66.71 85.51-122.38 75.72zm130.3-151.34c-8.25-8.91-20.68-15.75-35.33-18.32-14.65-2.58-28.67-.4-39.48 5.17-.52-3.94-.64-7.98.09-12.1 3.84-21.7 24.58-36.19 46.34-32.37 21.75 3.83 36.28 24.52 32.45 46.22-.73 4.13-2.23 7.88-4.07 11.4z"/>',
        trophy: 'VB="0 0 576 512"><PFC d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z"/>',
        unlock: 'VB="0 0 448 512"><PFC d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/>',
        x: 'VB="0 0 352 512"><PFC d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"/>',
    };
    LANGUAGES = {
        bul: 'български',
        eng: 'English',
        spa: 'español',
        fra: 'français',
        jpn: '日本語',
        pol: 'polski',
        rus: 'русский',
        ukr: 'українська',
    };

    virtual_change_setting_special = change_setting_special;
    virtual_check_hash_special = check_hash_special;
    virtual_import_settings = import_settings;
    virtual_opened_table_special = opened_table_special;
    virtual_resize = resize;

    // pre-process
    startup_config();
    startup_3d();
    startup_game();

    Assign(DEFAULTS, {
        areas: {
            bottom: [],
            center0: [
                ['moves-archive', 0, 1],
                ['moves-live', 0, 1],
                ['engine', 1, 3],
                ['table-pv', 1, 1],
                ['table-pva', 0, 1],
                ['table-eval', 1, 1],
                ['table-mobil', 1, 1],
                ['table-time', 1, 1],
                ['table-depth', 1, 1],
                ['table-speed', 1, 1],
                ['table-node', 1, 1],
                ['table-tb', 1, 1],
                ['table-kibitz', 0, 1],
            ],
            left0: [
                ['archive', 0, 1],
                ['live', 0, 1],
                ['moves-pv0', 0, 1],
                ['moves-pv1', 0, 1],
                ['table-live0', 0, 1],
                ['table-live1', 0, 1],
            ],
            right0: [
                ['quick-pagin', 0, 1],
                ['table-chat', 1, 3],
                ['table-winner', 1, 1],
                ['table-info', 1, 1],
                ['shortcut_1', 1, 1],
                ['shortcut_2', 0, 1],
                ['quick-search', 0, 1],
            ],
            top: [],
        },
        div: '',
        game: 0,
        link: '',                           // live link
        live_log: 'all',
        order: 'left|center|right',         // main panes order
        round: '',                          // live round
        season: '',
        stream: 0,
        table_tab: {
            archive: 'season',
            live: 'stand',
        },
        three: 0,                           // 3d scene
        twitch_chat: 1,
        twitch_dark: 0,
        twitch_video: 1,
        version: VERSION,
        x: 'live',
    });

    Assign(NO_IMPORTS, {
        dev: 1,
        div: 1,
        game: 1,
        import_settings: 2,
        language: 1,
        link: 1,
        preset: 1,
        round: 1,
        season: 1,
        stream: 1,
        twitch_video: 1,
        version: 1,
        x: 1,
    });

    Assign(ONLY_POPUPS, {
        analysis_chessdb: 1,
        analysis_evalguide: 1,
        analysis_lichess: 1,
    });

    Assign(TITLES, {
        'D/SD': '{Depth} / {Selective depth}',
        'Mob': 'Mobility',
        'PV': 'Principal variation',
        'PV(A)': '{PV}: {analysis}',
    });

    let bamboo = 'grand bamboo',
        bamboo2 = `${bamboo} - `,
        old = 'old - move.mp3',
        shortcuts = [...['off'], ...Keys(TABLES)];

    merge_settings({
        // new column after 10 items
        _split: 10,
        general: {
            preset: [PRESETS, 'custom'],
        },
        audio: {
            audio_book: [ON_OFF, 1],
            audio_delay: option_number(150, 0, 2000),
            audio_live_archive: [ON_OFF, 1],
            audio_moves: [['none', 'all', 'last'], 'last'],
            audio_pva: [ON_OFF, 1],
            audio_set: [['custom', bamboo, 'kan', 'old'], 'custom'],
            capture_delay: option_number(-200, -1000, 1000),
            sound_capture: [['off', `${bamboo2}capture`, 'kan - capture', old], `${bamboo2}capture`],
            sound_check: [['off', `${bamboo2}check`, old], `${bamboo2}check`],
            sound_checkmate: [['off', `${bamboo2}checkmate`, old], `${bamboo2}checkmate`],
            sound_draw: [['off', 'draw', 'win'], 'draw'],
            sound_move: [['off', `${bamboo2}move`, 'kan - move', old], `${bamboo2}move`],
            sound_move_pawn: [['off', `${bamboo2}move pawn`, 'kan - move', old], `${bamboo2}move pawn`],
            sound_win: [['off', 'draw', 'win'], 'win'],
        },
        // separator
        _1: {},
        arrow: {
            _prefix: 'arrow_',
            arrow_base_border: option_number(0, 0, 5, 0.01),
            arrow_base_color: [{type: 'color'}, '#a5a5a5'],
            arrow_base_mix: option_number(0.7, 0, 1, 0.01),
            arrow_base_size: option_number(2.05, 0, 5, 0.05),
            arrow_color_0: [{type: 'color'}, '#cdcdbe'],
            arrow_color_1: [{type: 'color'}, '#666666'],
            arrow_color_2: [{type: 'color'}, '#236ad6'],
            arrow_color_3: [{type: 'color'}, '#eb282d'],
            arrow_combine_23: [{type: 'color'}, '#007700'],
            arrow_from: [['none', 'all', 'kibitzer', 'player'], 'all'],
            arrow_head_border: option_number(0.5, 0, 5, 0.01),
            arrow_head_color: [{type: 'color'}, '#a5a5a5'],
            arrow_head_mix: option_number(0.7, 0, 1, 0.01),
            arrow_head_size: option_number(2.05, 0, 5, 0.05),
            arrow_history_lag: option_number(1300, 0, 5000),
            arrow_moves: [['all', 'last'], 'all'],
            arrow_opacity: option_number(0.7, 0, 1, 0.01),
            arrow_width: option_number(1.6, 0, 5, 0.01),
        },
        board: {
            analysis_chessdb: '1',
            analysis_evalguide: '1',
            analysis_lichess: '1',
            animate: [ON_OFF, 1],
            arrow: '',
            board_theme: [Keys(BOARD_THEMES), 'chess24'],
            custom_black: [{type: 'color'}, '#000000'],
            custom_white: [{type: 'color'}, '#ffffff'],
            highlight_color: [{type: 'color'}, '#ffff00'],
            // 1100 looks good too
            highlight_delay: option_number(0, -100, 1500, 100),
            highlight_size: option_number(0.055, 0, 0.4, 0.001),
            notation: [ON_OFF, 1],
            piece_theme: [Keys(PIECE_THEMES), 'chess24'],
            status: [AUTO_ON_OFF, 'auto'],
        },
        board_pv: {
            _suffix: '_pv',
            analysis_chessdb: '1',
            analysis_evalguide: '1',
            analysis_lichess: '1',
            animate_pv: [ON_OFF, 1],
            board_theme_pv: [Keys(BOARD_THEMES), 'uscf'],
            custom_black_pv: [{type: 'color'}, '#000000'],
            custom_white_pv: [{type: 'color'}, '#ffffff'],
            highlight_color_pv: [{type: 'color'}, '#ffff00'],
            highlight_size_pv: option_number(0.088, 0, 0.4, 0.001),
            notation_pv: [ON_OFF, 1],
            piece_theme_pv: [Keys(PIECE_THEMES), 'chess24'],
            show_delay: option_number(500, 0, 2000, 10),
            show_ply: [['first', 'diverging', 'last'], 'diverging'],
            status_pv: [ON_OFF, 1],
        },
        board_pva: {
            _suffix: '_pva',
            analysis_chessdb: '1',
            analysis_evalguide: '1',
            analysis_lichess: '1',
            animate_pva: [ON_OFF, 1],
            auto_paste: [ON_OFF, 1],
            board_theme_pva: [Keys(BOARD_THEMES), 'uscf'],
            custom_black_pva: [{type: 'color'}, '#000000'],
            custom_white_pva: [{type: 'color'}, '#ffffff'],
            notation_pva: [ON_OFF, 1],
            piece_theme_pva: [Keys(PIECE_THEMES), 'chess24'],
            source_color: [{type: 'color'}, '#ffb400'],
            source_opacity: option_number(0.7, 0, 1, 0.01),
            target_color: [{type: 'color'}, '#ff5a00'],
            target_opacity: option_number(0.7, 0, 1, 0.01),
            turn_color: [{type: 'color'}, '#ff5a00'],
            turn_opacity: option_number(0.25, 0, 1, 0.01),
        },
        control: {
            book_every: option_number(600, 100, 5000, 100),
            key_repeat: option_number(70, 10, 2000, 10),
            key_repeat_initial: option_number(500, 10, 2000, 10),
            play_every: option_number(1200, 100, 5000, 100),
        },
        engine: {
            mobility: [ON_OFF, 1],
            small_decimal: [['always', 'never', '>= 10', '>= 100'], '>= 100'],
        },
        extra: {
            archive_scroll: [ON_OFF, 1],
            drag_and_drop: [ON_OFF, 0],
            reload_missing: [ON_OFF, 1],
            rows_per_page: [[10, 20, 50, 100], 10],
            scroll_inertia: option_number(0.95, 0, 0.99, 0.01),
            wheel_adjust: option_number(63, 0, 240),
            wrap: [ON_OFF, 1],
            wrap_cross: [AUTO_ON_OFF, 'auto'],
            wrap_h2h: [AUTO_ON_OFF, 'auto'],
            wrap_sched: [AUTO_ON_OFF, 'auto'],
            wrap_stand: [AUTO_ON_OFF, 'auto'],
        },
        graph: {
            _prefix: 'graph_',
            graph_aspect_ratio: option_number(1.5, 0.5, 5, 0.005),
            graph_color_0: [{type: 'color'}, '#fefdde'],
            graph_color_1: [{type: 'color'}, '#02031e'],
            graph_color_2: [{type: 'color'}, '#236ad6'],
            graph_color_3: [{type: 'color'}, '#eb282d'],
            graph_eval_clamp: option_number(10, 1, 100),
            graph_eval_mode: [['percent', 'score'], 'score'],
            graph_line: option_number(2.2, 0, 10, 0.1),
            graph_min_width: option_number(240, 40, 640),
            graph_radius: option_number(2.2, 0, 10, 0.1),
            graph_tension: option_number(0.1, 0, 0.5, 0.01),
            graph_text: option_number(10, 1, 30),
            use_for_arrow: '1',
        },
        info: {
            eval: [ON_OFF, 1],
            eval_left: [ON_OFF, 0],
            hardware: [ON_OFF, 1],
            more: [ON_OFF, 1],
            moves: [ON_OFF, 1],
            moves_copy: [ON_OFF, 0],
            moves_live: [ON_OFF, 1],
            moves_pv: [ON_OFF, 1],
            moves_pva: [ON_OFF, 1],
            percent: [ON_OFF, 1],
            single_line: [ON_OFF, 0],
        },
        live: {
            copy_moves: '1',
            grid_live: option_number(0, 0, 10),
            live_engine_1: [ON_OFF, 1],
            live_engine_2: [ON_OFF, 1],
            live_pv: [ON_OFF, 1],
            move_height_live: option_number(3, 3, 100, 0.1),
            moves_live: [ON_OFF, 1],
        },
        moves: {
            grid: option_number(0, 0, 10),
            grid_copy: option_number(2, 0, 10),
            grid_live: option_number(0, 0, 10),
            grid_pv: option_number(1, 0, 10),
            grid_pva: option_number(1, 0, 10),
            move_height: option_number(5, 3, 100, 0.1),
            move_height_copy: option_number(20, 3, 100, 0.1),
            move_height_live: option_number(3.6, 3, 100, 0.1),
            move_height_pv: option_number(5, 5, 100, 0.1),
            move_height_pva: option_number(5, 5, 100, 0.1),
        },
        panel: {
            column_bottom: option_number(4, 1, 8),
            column_top: option_number(2, 1, 8),
            default_positions: '1',
            max_center: option_number(500, -1, 1200),
            max_left: option_number(500, -1, 1200),
            max_right: option_number(500, -1, 1200),
            min_center: option_number(300, -1, 1200),
            min_left: option_number(300, -1, 1200),
            min_right: option_number(300, -1, 1200),
            max_window: option_number(1920, 256, 32000),
            panel_adjust: [ON_OFF, 1],
            panel_gap: option_number(16, 0, 100),
            unhide: '1',
        },
        quick: {
            chat_height: option_number(600, 100, 1600),
            shortcut_1: [shortcuts, 'stand'],
            shortcut_2: [shortcuts, 'sched'],
        },
        reset: {
            _cancel: true,
            _color: '#f00',
            click_here_to_RESET_everything: '2',
        },
        // popup only
        copy: {
            _pop: true,
            copy_moves: '1',
            grid: option_number(0, 0, 10),
            move_height: option_number(5, 3, 100, 0.1),
            moves: [ON_OFF, 1],
            moves_copy: [ON_OFF, 0],
        },
        copy_copy: {
            _pop: true,
            copy_moves: '1',
            grid_copy: option_number(2, 0, 10),
            move_height_copy: option_number(20, 3, 100, 0.1),
            moves: [ON_OFF, 1],
            moves_copy: [ON_OFF, 0],
        },
        copy_pv: {
            _pop: true,
            copy_moves: '1',
            grid_pv: option_number(1, 0, 10),
            move_height_pv: option_number(5, 3, 100, 0.1),
            moves_pv: [ON_OFF, 1],
        },
        copy_pva: {
            _pop: true,
            copy_moves: '1',
            grid_pva: option_number(1, 0, 10),
            move_height_pva: option_number(5, 3, 100, 0.1),
            moves_pva: [ON_OFF, 1],
        },
        eval: {
            _pop: true,
            eval: [ON_OFF, 1],
            eval_left: [ON_OFF, 0],
            hardware: [ON_OFF, 1],
            moves_live: [ON_OFF, 1],
            percent: [ON_OFF, 1],
            single_line: [ON_OFF, 0],
        },
    });

    Assign(TRANSLATE_SPECIALS, {
        'CODER': 'octopoulo',
        'SPONSOR': 'Noobpwnftw',
        'TCEC': '<b>TCEC</b> (Top Chess Engine Championship)',
        'TCEC_URL': '<i class="nowrap">https://tcec-chess.com</i>',
        'UI': '<a href="https://github.com/TCEC-Chess/tcecgui" target="_blank">UI</a>',
    });

    load_settings();
    set_global_events();
    set_engine_events();
    set_game_events();
    startup_graph();
    add_history();

    // start
    start_game();

    init_sockets();
    init_globals();
    init_customs(true);
    resize(true);
}
