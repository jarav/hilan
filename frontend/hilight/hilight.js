/*hilight.js, rj*/
function cmp(val1, val2)
{
    var p1 = val1.node_parent, p2 = val2.node_parent;
    if ( p2.has(p1.get(0)).length > 0 )
        return -1;
    else if ( p1.has(p2.get(0)).length > 0 )
        return 1;
    else
        return 0;
}

$.fn.textNodes = function() {
    var ret = [];

    (function(el){
        if ((el.nodeType === 3))
            ret.push(el);
        else
            for (var i=0, sz = el.childNodes.length; i < sz; ++i)
                arguments.callee(el.childNodes[i]);
    })(this[0]);
    return ret;
}

function getSelNodes(txt_nodes, strt_indx, end_indx)
{
    var cum_len = 0,
        nd_array = [],
        txt_node, txt_node_txt, cur_len, offset,
        i = 0,
        sz = txt_nodes.length, txt;
    for ( ; i < sz; ++i )
    {
        txt_node = txt_nodes[i];
        txt_node_txt = $(txt_node).text();
        cur_len = txt_node_txt.length;
        cum_len += cur_len;
        if ( end_indx < cum_len - cur_len )
            break;
        if ( strt_indx < cum_len )
        {
            offset = Math.max(0, strt_indx - (cum_len - cur_len));
            if ( end_indx < cum_len )
                txt = txt_node_txt.substring(offset, end_indx - (cum_len - cur_len) + 1);
            else
                txt = txt_node_txt.substring(offset);
            nd_array.push({node_parent:$(txt_node).parent(), txt:txt});
        }
    }
    return nd_array;
}

function hiLight(str, col, title)
{
    var txt_nodes = $('body').textNodes(),
        txt_nds_str = txt_nodes.map(function(val){ return $(val).text();}).join(""),
        strt_indx, pat, r_exp, end_indx, sel_nds;

    pat = str.replace(/([()\[\]*+-.|\/?^${}\\])/g,"\\$1");
    pat = pat.replace(/\s+/g, "\\s\*");
    r_exp = new RegExp(pat);
    strt_indx = txt_nds_str.search(pat);
    if ( strt_indx !==  -1 )
    {
        end_indx = strt_indx + RegExp.lastMatch.length - 1;

        sel_nds = getSelNodes(txt_nodes, strt_indx, end_indx);
        sel_nds.sort(cmp);

        sel_nds.forEach(function(val) {
            var nd_parent = val.node_parent,
                orig_html = nd_parent.html(),
                replacements = [],
                pat, key, r_exp;

            orig_html = orig_html.replace(/&nbsp;/g, "\u00a0");
            orig_html = removeHtml(orig_html,replacements);

            pat = val.txt.replace(/([()\[\]*+-.|\/?^${}\\])/g,"\\$1");
            for ( key in g_replace_dict )
            {
                r_exp = new RegExp("(^|\\s\*)(" + key + ")(,|\\s\*|$)", "g");
                pat = pat.replace(r_exp, "$1($2|" + g_replace_dict[key] + ")$3");
            }
            pat = pat.replace(/ /g,"\\s\+");
            pat = new RegExp(pat);
            if ( orig_html.search(pat) === -1 )
                return false;
            orig_html = orig_html.replace(pat, '<span class="simple_hilite" ' +
                        (col ?('style="background-color:' + col + ';"'):'') +
                        (title ?(' title="' + title + '"'):'') +
                        '>$&</span>');

            orig_html = replaceHtml(orig_html, replacements);
            nd_parent.html(orig_html);

            g_txt_hil[val.txt] = str;
        });
        return true;
    }
    return false;
}


function removeHtml(html_str, rep_array)
{
    var pat = /<\s*([^\s]+).*?>.*?<\s*\/\s*\1\s*>/;
    while ( html_str.search(pat) != -1 )
    {
        html_str = html_str.replace(pat, "~~replaced_item~~");
        rep_array.push(RegExp.lastMatch);
    }
    return html_str;
}

function replaceHtml(html_str, rep_array)
{
    var pat = /~~replaced_item~~/;
    while ( html_str.search(pat) != -1 )
    {
        html_str = html_str.replace(pat, rep_array.shift());
    }
    return html_str;
}

function hilightSel()
{
    var cur_str = localStorage[g_key] || "",
        sel_str = window.getSelection().toString(),
        ann_obj;

    if ( hiLight(sel_str) )
    {
        if ( g_save_option === 'web' )
        {
            ann_obj = {annotator : g_creds.un, annotation : ""};

            if ( g_anns[sel_str] )
                g_anns[sel_str].push(ann_obj);
            else
                g_anns[sel_str] = [ann_obj];
            //saveToWeb({ hstr: sel_str, annotation: "", cmnd: 'add'});
            saveToWeb(sel_str,"");
        }
        else
        {
            cur_str = cur_str.concat(cur_str ? "~^~" : "" , sel_str);
            localStorage[g_key] = cur_str;
        }
    }
}

function Data()
{
    this.url = g_url;
    this.un = g_creds.un;
    this.pw = g_creds.pw;
}

function saveToWeb(str, ann)
{
    var data_obj = new Data();
    data_obj['hstr'] = str;
    data_obj['ann'] = ann;
    g_pending_cmnds.push({cmnd : 'save_ann', data : data_obj});
    sendCmnd();
}

function delFromWeb(str)
{
    var data_obj = new Data();
    data_obj['hstr'] = str;
    g_pending_cmnds.push({cmnd : 'del_ann', data : data_obj});
    sendCmnd();
}

function delAll()
{
    var data_obj = new Data();
    g_pending_cmnds.push({cmnd : 'del_all', data : data_obj});
    sendCmnd();
}

function sendCmnd()
{
    if (g_ready_to_send)
    {
        g_ready_to_send = false;
        sendData();
    }
}

function sendData()
{
    var cmnd_obj;
    if ( cmnd_obj = g_pending_cmnds.shift() )
    {
        chrome.extension.sendRequest(cmnd_obj, sendData);
    }
    else
        g_ready_to_send = true;
}

function unhiLightAll()
{
    var i, sz, ls_key;
    if ( g_save_option === 'web' )
    {
        delAll();
    }
    else
    {
        for ( i = 0, sz = localStorage.length ; i < sz; ++i )
        {
            ls_key = localStorage.key(i);
            if ( ls_key.indexOf(g_url) !== -1 )
                localStorage.removeItem(ls_key);
        }
    }
}

function createAnnDiv()
{
    var elements = [ '<div id="annotn">', '<textarea rows="3" cols="20"></textarea>',
                        '<br/>', '<button type="button" id="edit">Add/Edit</button>',
                        '<button type="button" id="del">Unhilight</button>',
                        '<button type="button" id="close">Close( and save)</button>', '</div>' ];
    $('body').delegate("#annotn #edit", "click", editAnnot).
        delegate("#annotn #del", "click", delAnnot).
        delegate("#annotn #close", "click", closeAnnot);
    return $(elements.join(""));
}

function closeAnnot()
{
    var ta_txt, my_anns;
    if ( $('#annotn textarea:visible').length )
    {
        ta_txt = $('#annotn textarea').val()||"";
        if ( ta_txt != g_cur_ann )
        {
            if ( g_save_option === 'web' )
            {
                my_anns = g_anns[g_cur_parent].filter(function (val){ return val.annotator === g_creds.un;});
                if ( my_anns.length )
                    my_anns[0].annotation = ta_txt;
                else
                    g_anns[g_cur_parent].push({ annotator : g_creds.un, annotation : ta_txt});
                //saveToWeb({ hstr: g_cur_parent, annotation: ta_txt, cmnd: 'add'});
                saveToWeb(g_cur_parent, ta_txt);
            }
            else
            {
                if ( ta_txt )
                    localStorage[ g_url + "_" + g_cur_parent ] = ta_txt;
                else
                    localStorage.removeItem(g_url + "_" + g_cur_parent);
            }
        }
    }
    $('body').delegate("span.simple_hilite", "mouseenter", showAnnForm).
        delegate("span.simple_hilite", "click", pinAnnForm).
        delegate("span.simple_hilite", "mouseleave", hideAnnForm);

    $('#annotn').unbind('mousedown');
    if ( $('#annotn').has('p').length )
        $('#annotn p').remove();
    $g_ann_div.detach();
}

function editAnnot()
{
    var my_anns;
    if ( g_save_option === 'web' )
    {
        my_anns = g_anns[g_cur_parent].filter(function (val){ return val.annotator === g_creds.un;});
        g_cur_ann = (my_anns.length ? (my_anns[0].annotation):"");
    }
    else
    {
        g_cur_ann = localStorage[g_url + "_" + g_cur_parent] || "";
    }
    if ( $('#annotn').has('p').length )
        $('#annotn p').remove();
    $('#annotn textarea').show();
    $('#del').hide();
    $('#edit').hide();

    $('#annotn textarea').val(g_cur_ann);
}

function delAnnot()
{
    var h_str_all, h_strs, indx;
    if ( g_save_option === 'web' )
    {
        g_anns = g_anns[g_cur_parent].filter(function (val) { return val.annotator != g_creds.un;});
        //saveToWeb({ hstr : g_cur_parent, annotation : "", cmnd : 'del'});
        delFromWeb(g_cur_parent);
    }
    else
    {
        h_str_all = localStorage[g_key];
        h_strs = h_str_all.split("~^~");
        indx = h_strs.indexOf(g_cur_parent);
        h_strs.splice(indx, 1);
        h_str_all = h_strs.join("~^~");
        localStorage[g_key] = h_str_all;
        localStorage.removeItem(g_url + "_" + g_cur_parent);
    }
}

function showAnnForm()
{
    var hilit_txt = $(this).text(),
        parent_str = g_txt_hil[hilit_txt],
        para_list = annParas(parent_str);
    if ( para_list.length )
    {
        $g_ann_div = $g_ann_div || createAnnDiv();
        $g_ann_div.prepend(para_list.join(''));
        $('body').append($g_ann_div);
        $('#annotn p').show();
        $('#annotn textarea, button').hide();
    }
}

function annParas(hil_str)
{
    var ann_txt = localStorage[g_url + "_" + hil_str], para_list = [];
    if ( ann_txt )
        para_list.push('<p>' + ann_txt + '</p>');
    if ( g_anns[hil_str] )
    {
        g_anns[hil_str].forEach( function (val)
                {
                    if ( val.annotation )
                    {
                        para_list.push('<p>' + val.annotator + ': ' + '<br/>' + val.annotation + '</p>');
                    }
                });
    }
    return para_list;
}

function hideAnnForm()
{
    if ( $g_ann_div && $('body').has($g_ann_div).length )
    {
        if ( $('#annotn').has('p').length )
            $('#annotn p').remove();
        $g_ann_div.detach();
    }
}

function onAnnDrag(e)
{
    var dx = e.pageX - g_start_x;
    var dy = e.pageY - g_start_y;
    $(this).css({'left' : g_old_pos.left + dx - document.body.scrollLeft + 'px' , 'top' : g_old_pos.top - document.body.scrollTop + dy + 'px' });
}

function onMouseUpOnAnn(e)
{
    $(this).unbind('mousemove');
    $(this).unbind('mouseup');
}

function onMousedownOnAnn(e)
{
    var $this = $(this);
    g_old_pos = $this.position();
    g_start_x = e.pageX;
    g_start_y = e.pageY;
    $this.mousemove(onAnnDrag);
    $this.mouseup(onMouseUpOnAnn);
}

function pinAnnForm()
{
    var hilit_txt = $(this).text();
    g_cur_parent = g_txt_hil[hilit_txt];
    $g_ann_div = $g_ann_div || createAnnDiv();
    if ( $('body').has($g_ann_div).length === 0 )
    {
        $g_ann_div.prepend('<p>' + 'No annotations' + '</p>');
        $('body').append($g_ann_div);
    }
    $('#annotn p').show();
    $('#annotn textarea').hide();
    $('#annotn button').show();
    $('body').undelegate("span.simple_hilite", "mouseenter", showAnnForm).
        undelegate("span.simple_hilite", "click", pinAnnForm).
        undelegate("span.simple_hilite", "mouseleave", hideAnnForm);
    $('#annotn').mousedown(onMousedownOnAnn);
}

function onSaveOption(response)
{
    g_save_option = response;
    if ( g_save_option === "web" )
        chrome.extension.sendRequest({cmnd: 'creds'}, onCreds);
}

function onCreds(response)
{
    g_creds = response;
    var data_obj = { url : g_url, un : g_creds.un, pw : g_creds.pw };
    chrome.extension.sendRequest({cmnd : 'get_anns', 'data' : data_obj}, onGetAnns);
}

function onGetAnns(json)
{
    var col_indx = 0, strs, i = 0, sz, str, annotator;
    g_anns = json;
    strs = Object.keys(g_anns);
    for ( sz = strs.length; i < sz; ++i )
    {
        str = strs[i];
        annotator = g_anns[str][0].annotator;
        if ( ! g_ann_cols[annotator] )
        {
            g_ann_cols[annotator] = g_colors[col_indx];
            col_indx = ( col_indx + 1) % g_colors.length;
        }
        (annotator === g_creds.un)?hiLight(str):hiLight(str, g_ann_cols[annotator], annotator);
    }
}

var $g_ann_div = null,
    g_url = null, g_key = null,
    g_replace_dict = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'},
    g_colors = ["#8AC2F2", "#F27999", "#CAD4AC", "#A5FF42", "#ECF8FF", "#E5A4E8", "#C9D069", "#BEB6C0", "#D59C65", "#879756",
                "#ACFF93", "#FFDF9D", "#BCCACD", "#AEA683", "#F5CFBE", "#FAF5A8", "#9898CC"],
    g_save_option = null, g_creds = null,
    g_txt_hil = {}, g_anns = {}, g_ann_cols = {},
    g_ready_to_send = true, g_pending_cmnds = [], g_cur_parent, g_cur_ann,
    g_old_pos, g_start_x, g_start_y, g_mouse_count;

(function init()
{
    var hilight_str_all = null,
        i = 0,
        sz, hilight_strs;
    g_url = document.location.href;
    g_key = g_url + "_h_str";
    if ( hilight_str_all = localStorage[g_key] )
    {
        hilight_strs = hilight_str_all.split("~^~");
        for ( sz = hilight_strs.length; i < sz; ++i )
        {
            hiLight(hilight_strs[i]);
        }
    }
    $('body').delegate("span.simple_hilite", "mouseenter", showAnnForm).
        delegate("span.simple_hilite", "click", pinAnnForm).
        delegate("span.simple_hilite", "mouseleave", hideAnnForm);

    chrome.extension.onRequest.addListener(
        function(request)
        {
            if ( request.cmnd === "h" )
                hilightSel();
            else if ( request.cmnd === "uh" )
                unhiLightAll();
        });

    chrome.extension.sendRequest({'cmnd': 'save_option'}, onSaveOption);
}
)();

