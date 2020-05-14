# coding: utf-8
# modified from this code:

"""
CSS Minifier
__version__ = '1.2.2'
__license__ = 'GPLv3+ LGPLv3+'
__author__ = 'Juan Carlos'
__email__ = 'juancarlospaco@gmail.com'
__url__ = 'https://github.com/juancarlospaco/css-html-js-minify'
__source__ = ('https://raw.githubusercontent.com/juancarlospaco/'
              'css-html-js-minify/master/css-html-js-minify.py')
"""

from itertools import groupby
import re
from typing import Any, List, Pattern, Tuple


RE_COLON = None                     # type: Pattern or None
RE_COLOR_HEX = None                 # type: Pattern or None
RE_COLOR_RGB = None                 # type: Pattern or None
RE_PATTERNS = None                  # type: Pattern or None
RE_PROPERTIES = None                # type: Pattern or None


# 'Color Name String': (R, G, B)
# TODO: put the hex value directly
EXTENDED_NAMED_COLORS = {
    'azure': (240, 255, 255),
    'beige': (245, 245, 220),
    'bisque': (255, 228, 196),
    'blanchedalmond': (255, 235, 205),
    'brown': (165, 42, 42),
    'burlywood': (222, 184, 135),
    'chartreuse': (127, 255, 0),
    'chocolate': (210, 105, 30),
    'coral': (255, 127, 80),
    'cornsilk': (255, 248, 220),
    'crimson': (220, 20, 60),
    'cyan': (0, 255, 255),
    'darkcyan': (0, 139, 139),
    'darkgoldenrod': (184, 134, 11),
    'darkgray': (169, 169, 169),
    'darkgreen': (0, 100, 0),
    'darkgrey': (169, 169, 169),
    'darkkhaki': (189, 183, 107),
    'darkmagenta': (139, 0, 139),
    'darkolivegreen': (85, 107, 47),
    'darkorange': (255, 140, 0),
    'darkorchid': (153, 50, 204),
    'darkred': (139, 0, 0),
    'darksalmon': (233, 150, 122),
    'darkseagreen': (143, 188, 143),
    'darkslategray': (47, 79, 79),
    'darkslategrey': (47, 79, 79),
    'darkturquoise': (0, 206, 209),
    'darkviolet': (148, 0, 211),
    'deeppink': (255, 20, 147),
    'dimgray': (105, 105, 105),
    'dimgrey': (105, 105, 105),
    'firebrick': (178, 34, 34),
    'forestgreen': (34, 139, 34),
    'gainsboro': (220, 220, 220),
    'gold': (255, 215, 0),
    'goldenrod': (218, 165, 32),
    'gray': (128, 128, 128),
    'green': (0, 128, 0),
    'grey': (128, 128, 128),
    'honeydew': (240, 255, 240),
    'hotpink': (255, 105, 180),
    'indianred': (205, 92, 92),
    'indigo': (75, 0, 130),
    'ivory': (255, 255, 240),
    'khaki': (240, 230, 140),
    'lavender': (230, 230, 250),
    'lavenderblush': (255, 240, 245),
    'lawngreen': (124, 252, 0),
    'lemonchiffon': (255, 250, 205),
    'lightcoral': (240, 128, 128),
    'lightcyan': (224, 255, 255),
    'lightgray': (211, 211, 211),
    'lightgreen': (144, 238, 144),
    'lightgrey': (211, 211, 211),
    'lightpink': (255, 182, 193),
    'lightsalmon': (255, 160, 122),
    'lightseagreen': (32, 178, 170),
    'lightslategray': (119, 136, 153),
    'lightslategrey': (119, 136, 153),
    'lime': (0, 255, 0),
    'limegreen': (50, 205, 50),
    'linen': (250, 240, 230),
    'magenta': (255, 0, 255),
    'maroon': (128, 0, 0),
    'mediumorchid': (186, 85, 211),
    'mediumpurple': (147, 112, 219),
    'mediumseagreen': (60, 179, 113),
    'mediumspringgreen': (0, 250, 154),
    'mediumturquoise': (72, 209, 204),
    'mediumvioletred': (199, 21, 133),
    'mintcream': (245, 255, 250),
    'mistyrose': (255, 228, 225),
    'moccasin': (255, 228, 181),
    'navy': (0, 0, 128),
    'oldlace': (253, 245, 230),
    'olive': (128, 128, 0),
    'olivedrab': (107, 142, 35),
    'orange': (255, 165, 0),
    'orangered': (255, 69, 0),
    'orchid': (218, 112, 214),
    'palegoldenrod': (238, 232, 170),
    'palegreen': (152, 251, 152),
    'paleturquoise': (175, 238, 238),
    'palevioletred': (219, 112, 147),
    'papayawhip': (255, 239, 213),
    'peachpuff': (255, 218, 185),
    'peru': (205, 133, 63),
    'pink': (255, 192, 203),
    'plum': (221, 160, 221),
    'purple': (128, 0, 128),
    'rosybrown': (188, 143, 143),
    'saddlebrown': (139, 69, 19),
    'salmon': (250, 128, 114),
    'sandybrown': (244, 164, 96),
    'seagreen': (46, 139, 87),
    'seashell': (255, 245, 238),
    'sienna': (160, 82, 45),
    'silver': (192, 192, 192),
    'slategray': (112, 128, 144),
    'slategrey': (112, 128, 144),
    'snow': (255, 250, 250),
    'springgreen': (0, 255, 127),
    'teal': (0, 128, 128),
    'thistle': (216, 191, 216),
    'tomato': (255, 99, 71),
    'turquoise': (64, 224, 208),
    'violet': (238, 130, 238),
    'wheat': (245, 222, 179)
}

#
CSS_PROPS_TEXT = '''

alignment-adjust alignment-baseline animation animation-delay
animation-direction animation-duration animation-iteration-count
animation-name animation-play-state animation-timing-function appearance
azimuth

backface-visibility background background-blend-mode background-attachment
background-clip background-color background-image background-origin
background-position background-position-block background-position-inline
background-position-x background-position-y background-repeat background-size
baseline-shift bikeshedding bookmark-label bookmark-level bookmark-state
bookmark-target border border-bottom border-bottom-color
border-bottom-left-radius border-bottom-parts border-bottom-right-radius
border-bottom-style border-bottom-width border-clip border-clip-top
border-clip-right border-clip-bottom border-clip-left border-collapse
border-color border-corner-shape border-image border-image-outset
border-image-repeat border-image-slice border-image-source border-image-width
border-left border-left-color border-left-style border-left-parts
border-left-width border-limit border-parts border-radius border-right
border-right-color border-right-style border-right-width border-right-parts
border-spacing border-style border-top border-top-color border-top-left-radius
border-top-parts border-top-right-radius border-top-style border-top-width
border-width bottom box-decoration-break box-shadow box-sizing

caption-side clear clip color column-count column-fill column-gap column-rule
column-rule-color column-rule-style column-rule-width column-span column-width
columns content counter-increment counter-reset corners corner-shape
cue cue-after cue-before cursor

direction display drop-initial-after-adjust drop-initial-after-align
drop-initial-before-adjust drop-initial-before-align drop-initial-size
drop-initial-value

elevation empty-cells

flex flex-basis flex-direction flex-flow flex-grow flex-shrink flex-wrap fit
fit-position float font font-family font-size font-size-adjust font-stretch
font-style font-variant font-weight

grid-columns grid-rows

justify-content

hanging-punctuation height hyphenate-character hyphenate-resource hyphens

icon image-orientation image-resolution inline-box-align

left letter-spacing line-height line-stacking line-stacking-ruby
line-stacking-shift line-stacking-strategy linear-gradient list-style
list-style-image list-style-position list-style-type

margin margin-bottom margin-left margin-right margin-top marquee-direction
marquee-loop marquee-speed marquee-style max-height max-width min-height
min-width

nav-index

opacity orphans outline outline-color outline-offset outline-style
outline-width overflow overflow-style overflow-x overflow-y

padding padding-bottom padding-left padding-right padding-top page
page-break-after page-break-before page-break-inside pause pause-after
pause-before perspective perspective-origin pitch pitch-range play-during
position presentation-level

quotes

resize rest rest-after rest-before richness right rotation rotation-point
ruby-align ruby-overhang ruby-position ruby-span

size speak speak-header speak-numeral speak-punctuation speech-rate src
stress string-set

table-layout target target-name target-new target-position text-align
text-align-last text-decoration text-emphasis text-indent text-justify
text-outline text-shadow text-transform text-wrap top transform
transform-origin transition transition-delay transition-duration
transition-property transition-timing-function

unicode-bidi unicode-range

vertical-align visibility voice-balance voice-duration voice-family
voice-pitch voice-range voice-rate voice-stress voice-volume volume

white-space widows width word-break word-spacing word-wrap

z-index

'''


def compile_props(props_text: str, grouped: bool=False) -> Tuple[List[str], List[int]]:
    """Take a list of props and prepare them.
    """
    props = []
    prefixes = ['-webkit-', '-khtml-', '-epub-', '-moz-', '-ms-', '-o-', '']
    for propline in props_text.strip().lower().splitlines():
        props += [pre + pro for pro in propline.split(' ') for pre in prefixes]
    props = [prop for prop in props if not prop.startswith('#')]
    if not grouped:
        props = list(filter(None, props))
        return props, [0] * len(props)

    final_props = []
    groups = []
    g_id = 0
    for prop in props:
        if prop.strip():
            final_props.append(prop)
            groups.append(g_id)
        else:
            g_id += 1

    return final_props, groups


def _prioritify(line_of_css: str, css_props_text_as_list: Tuple[Any, Any]) -> Tuple[int, int]:
    """Return args priority, priority is integer and smaller means higher.
    """
    sorted_css_properties, groups_by_alphabetic_order = css_props_text_as_list
    priority_integer = 9999
    group_integer = 0
    for css_property in sorted_css_properties:
        if css_property.lower() == line_of_css.split(':')[0].lower().strip():
            priority_integer = sorted_css_properties.index(css_property)
            group_integer = groups_by_alphabetic_order[priority_integer]
            break
    return priority_integer, group_integer


def props_grouper(props: List[str], pgs: Tuple[Any, Any]) -> List[str]:
    """Return groups for properties.
    """
    if not props:
        return props
    props_pg = zip(map(lambda prop: _prioritify(prop, pgs), props), props)
    props_pg = sorted(props_pg, key=lambda item: item[0][1])
    props_by_groups = map(lambda item: list(item[1]), groupby(props_pg, key=lambda item: item[0][1]))
    props_by_groups = map(lambda item: sorted(item, key=lambda x: x[0][0]), props_by_groups)
    props = []
    for group in props_by_groups:
        group = map(lambda item: item[1], group)
        props += group
        props += ['\n']
    props.pop()
    return props


def sort_properties(css_unsorted_string: str) -> str:
    """CSS Property Sorter Function.
    This function will read buffer argument, split it to a list by lines,
    sort it by defined rule, and return sorted buffer if it's CSS property.
    This function depends on '_prioritify' function.
    """
    css_pgs = compile_props(CSS_PROPS_TEXT, grouped=False)

    global RE_PATTERNS
    if not RE_PATTERNS:
        RE_PATTERNS = re.compile('(.*?{\r?\n?)(.*?)(}.*?)|(.*)', re.S | re.M)

    matched_patterns = RE_PATTERNS.findall(css_unsorted_string)
    # if not matched_patterns:
    #     return css_unsorted_string

    global RE_PROPERTIES
    if not RE_PROPERTIES:
        RE_PROPERTIES = re.compile(r'((?:.*?)(?:;)(?:.*?\n)|(?:.*))', re.S | re.M)

    sorted_patterns = []
    for matched_groups in matched_patterns:
        sorted_patterns += matched_groups[0].splitlines(True)
        props = map(lambda line: line.lstrip('\n'), RE_PROPERTIES.findall(matched_groups[1]))
        props = [prop.strip('\n ') for prop in props]
        props = props_grouper(props, css_pgs)
        sorted_patterns += props
        sorted_patterns += matched_groups[2].splitlines(True)
        sorted_patterns += matched_groups[3].splitlines(True)
    return ''.join(sorted_patterns)


def remove_comments(css: str) -> str:
    """Remove all CSS comment blocks.
    """
    iemac = False
    comment_start = css.find('/*')
    while comment_start >= 0:
        # Preserve comments that look like `/*!!...*/`
        preserve = css[comment_start+2: comment_start+4] == '!!'
        comment_end = css.find('*/', comment_start + 2)
        if comment_end < 0:
            if not preserve:
                css = css[:comment_start]
            break
        elif comment_end >= comment_start + 2:
            """https://perishablepress.com/new-clearfix-hack/
            /* Hides from IE-mac \*/
            * html .clearfix { height: 1%; }
            .clearfix { display: block; }
            /* End hide from IE-mac */
            """
            if css[comment_end - 1] == '\\':
                comment_start = comment_end + 2
                iemac = True
            elif iemac:
                comment_start = comment_end + 2
                iemac = False
            elif not preserve:
                css = css[:comment_start] + css[comment_end + 2:]
            else:
                comment_start = comment_end + 2
        comment_start = css.find('/*', comment_start)
    return css


def remove_unnecessary_whitespace(css: str, quick: bool=False) -> str:
    """Remove unnecessary whitespace characters.
    """
    if quick:
        css = re.sub(r'[ \t]+', ' ', css)
        css = re.sub(r'\n\s', '\n', css)
        css = re.sub(r'\s\n', '\n', css)
        css = css.strip()
        return css

    def pseudoclasscolon(css_: str):
        """Prevent 'p :link' from becoming 'p:link'.
        Translates 'p :link' into 'p ___PSEUDOCLASSCOLON___link'.
        This is translated back again later.
        """
        global RE_COLON
        if not RE_COLON:
            RE_COLON = re.compile(r'(^|\})(([^{:])+:)+([^{]*{)')
        match = RE_COLON.search(css_)
        while match:
            css_ = ''.join([
                css_[:match.start()],
                match.group().replace(':', '___PSEUDOCLASSCOLON___'),
                css_[match.end():]
            ])
            match = RE_COLON.search(css_)
        return css_

    css = pseudoclasscolon(css)
    # Remove spaces from before things.
    css = re.sub(r"\s+([!{};:>()\],])", r"\1", css)
    # If there is a `@charset`, then only allow one, and move to beginning.
    css = re.sub(r'^(.*)(@charset "[^"]*\";)', r"\2\1", css)
    css = re.sub(r"^(\s*@charset [^;]+;\s*)+", r"\1", css)
    # Put the space back in for a few cases, such as `@media screen` and `(-webkit-min-device-pixel-ratio:0)`.
    css = re.sub(r"\band\(", "and (", css)
    # Put the colons back.
    css = css.replace('___PSEUDOCLASSCOLON___', ':')
    # Remove spaces from after things.
    css = re.sub(r"([!{}:;>(\[,])\s+", r"\1", css)
    return css


def remove_unnecessary_semicolons(css: str) -> str:
    """Remove unnecessary semicolons.
    """
    return re.sub(r';+\}', '}', css)


def remove_empty_rules(css: str) -> str:
    """Remove empty rules.
    """
    return re.sub(r'[^\}{]+{\}', '', css)


def normalise_rgb_colors_to_hex(css: str) -> str:
    """Convert `rgb(51,102,153)` to `#336699`.
    """
    global RE_COLOR_RGB
    if not RE_COLOR_RGB:
        RE_COLOR_RGB = re.compile(r'rgb\s*\(\s*([0-9,\s]+)\s*\)')

    match = RE_COLOR_RGB.search(css)
    while match:
        colors = map(lambda s: s.strip(), match.group(1).split(","))
        hexcolor = '#%.2x%.2x%.2x' % tuple(map(int, colors))
        css = css.replace(match.group(), hexcolor)
        match = RE_COLOR_RGB.search(css)
    return css


def condense_zero_units(css: str) -> str:
    """Replace `0(px, em, %, etc)` with `0`.
    """
    return re.sub(
        r'([\s:])(0)(px|em|%|in|q|ch|cm|mm|pc|pt|ex|rem|s|ms|deg|grad|rad|turn|vw|vh|vmin|vmax|fr)', r'\1\2', css)


def condense_multidimensional_zeros(css: str) -> str:
    """Replace `:0 0 0 0;`, `:0 0 0;` etc. with `:0;`.
    """
    return css\
        .replace(':0 0 0 0;', ':0;')\
        .replace(':0 0 0;', ':0;')\
        .replace(':0 0;', ':0;')\
        .replace('background-position:0;', 'background-position:0 0;')\
        .replace('transform-origin:0;', 'transform-origin:0 0;')


def condense_floating_points(css: str) -> str:
    """Replace `0.6` with `.6` where possible.
    """
    return re.sub(r"(:|\s)0+\.(\d+)", r"\1.\2", css)


def condense_hex_colors(css: str) -> str:
    """Shorten colors from #AABBCC to #ABC where possible.
    """
    global RE_COLOR_HEX
    if not RE_COLOR_HEX:
        RE_COLOR_HEX = re.compile(
            r"""([^\"'=\s])(\s*)#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])""", re.I | re.S)

    match = RE_COLOR_HEX.search(css)
    while match:
        first = match.group(3) + match.group(5) + match.group(7)
        second = match.group(4) + match.group(6) + match.group(8)
        if first.lower() == second.lower():
            css = css.replace(match.group(), match.group(1) + match.group(2) + '#' + first)
            match = RE_COLOR_HEX.search(css, match.end() - 3)
        else:
            match = RE_COLOR_HEX.search(css, match.end())
    return css


def condense_whitespace(css: str) -> str:
    """Condense multiple adjacent whitespace characters into one.
    """
    return re.sub(r'\s+', ' ', css)


def condense_semicolons(css: str) -> str:
    """Condense multiple adjacent semicolon characters into one.
    """
    return re.sub(';;+', ';', css)


def condense_font_weight(css: str) -> str:
    """Condense multiple font weights into shorter integer equals.
    """
    return css.replace('font-weight:normal;', 'font-weight:400;').replace('font-weight:bold;', 'font-weight:700;')


def condense_std_named_colors(css: str) -> str:
    """Condense named color values to shorter replacement using HEX.
    """
    for color_name, color_hexa in iter(tuple({
            ':aqua;': ':#0ff;', ':blue;': ':#00f;', ':fuchsia;': ':#f0f;', ':yellow;': ':#ff0;'}.items())):
        css = css.replace(color_name, color_hexa)
    return css


def condense_xtra_named_colors(css: str) -> str:
    """Condense named color values to shorter replacement using HEX.
    """
    for k, v in iter(tuple(EXTENDED_NAMED_COLORS.items())):
        same_color_but_rgb = f'rgb({v[0]},{v[1]},{v[2]})'
        if len(k) > len(same_color_but_rgb):
            css = css.replace(k, same_color_but_rgb)
    return css


def remove_url_quotes(css: str) -> str:
    """Fix for url() does not need quotes.
    New: except if it contains special characters like space, quote
    """
    return re.sub(r'url\((["\'])([^) "\']*)\1\)', r'url(\2)', css)


def condense_border_none(css: str) -> str:
    """Condense border:none; to border:0;.
    """
    return css.replace('border:none;', 'border:0;')


def add_encoding(css: str) -> str:
    """Add @charset 'UTF-8'; if missing.
    """
    return '@charset utf-8;' + css if '@charset' not in css.lower() else css


def restore_needed_space(css: str) -> str:
    """Fix CSS for some specific cases where a white space is needed.
    """
    return css\
        .replace('!important', ' !important')\
        .replace('@media(', '@media (')\
        .replace('data:image/jpeg;base64,', 'data:image/jpg;base64,')\
        .rstrip('\n;')


def unquote_selectors(css: str) -> str:
    """Fix CSS for some specific selectors where Quotes is not needed.
    """
    return re.compile('([a-zA-Z]+)="([a-zA-Z0-9-_.]+)"]').sub(r'\1=\2]', css)


def css_minify(css: str, comments: bool=False, encoding: bool=False, quick: bool=False, sort: bool=False) -> str:
    """Minify CSS main function.
    """
    if not comments:
        css = remove_comments(css)
    if sort:
        css = sort_properties(css)
    css = unquote_selectors(css)
    css = condense_whitespace(css)
    css = remove_url_quotes(css)
    css = condense_xtra_named_colors(css)
    css = condense_font_weight(css)
    css = remove_unnecessary_whitespace(css, quick=quick)
    css = condense_std_named_colors(css)
    css = remove_unnecessary_semicolons(css)
    css = condense_zero_units(css)
    css = condense_multidimensional_zeros(css)
    css = condense_floating_points(css)
    css = normalise_rgb_colors_to_hex(css)
    css = condense_hex_colors(css)
    css = condense_border_none(css)
    css = condense_semicolons(css)
    if encoding:
        css = add_encoding(css)
    css = restore_needed_space(css)
    return css.strip()
