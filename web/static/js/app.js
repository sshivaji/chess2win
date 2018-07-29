NAG_NULL = 0;
var NAG_GOOD_MOVE = 1;
//"""A good move. Can also be indicated by ``!`` in PGN notation."""
var NAG_MISTAKE = 2;
//"""A mistake. Can also be indicated by ``?`` in PGN notation."""
var NAG_BRILLIANT_MOVE = 3;
//"""A brilliant move. Can also be indicated by ``!!`` in PGN notation."""
var NAG_BLUNDER = 4;
//"""A blunder. Can also be indicated by ``??`` in PGN notation."""
var NAG_SPECULATIVE_MOVE = 5;
//"""A speculative move. Can also be indicated by ``!?`` in PGN notation."""
var NAG_DUBIOUS_MOVE = 6;
//"""A dubious move. Can also be indicated by ``?!`` in PGN notation."""

simple_nags = {'1': '!', '2': '?', '3': '!!', '4': '??', '5': '!?', '6': '?!', '7': '&#9633', '8': '&#9632','11' : '=', '13': '&infin;', '14': '&#10866', '15': '&#10865', '16': '&plusmn;', '17': '&#8723', '18': '&#43; &minus;', '19': '&minus; &#43;', '36': '&rarr;','142': '&#8979','146': 'N'};


NAG_FORCED_MOVE = 7;
NAG_SINGULAR_MOVE = 8;
NAG_WORST_MOVE = 9;
NAG_DRAWISH_POSITION = 10;
NAG_QUIET_POSITION = 11;
NAG_ACTIVE_POSITION = 12;
NAG_UNCLEAR_POSITION = 13;
NAG_WHITE_SLIGHT_ADVANTAGE = 14;
NAG_BLACK_SLIGHT_ADVANTAGE = 15;

//# TODO: Add more constants for example from
//# https://en.wikipedia.org/wiki/Numeric_Annotation_Glyphs

NAG_WHITE_MODERATE_COUNTERPLAY = 132;
NAG_BLACK_MODERATE_COUNTERPLAY = 133;
NAG_WHITE_DECISIVE_COUNTERPLAY = 134;
NAG_BLACK_DECISIVE_COUNTERPLAY = 135;
NAG_WHITE_MODERATE_TIME_PRESSURE = 136;
NAG_BLACK_MODERATE_TIME_PRESSURE = 137;
NAG_WHITE_SEVERE_TIME_PRESSURE = 138;
NAG_BLACK_SEVERE_TIME_PRESSURE = 139;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

var board,
    boardStatusEl = $('#BoardStatus'),
    dgtClockStatusEl = $('#DGTClockStatus'),
    pgnEl = $('#pgn');
var gameHistory, fenHash, currentPosition;
var backend_server_prefix = 'http://drshivaji.com:3334';
var backend_server_prefix = '/backend';

fenHash = {};

currentPosition = {};
// JP!
currentPosition.fen = START_FEN;

gameHistory = currentPosition;
gameHistory.gameHeader = '';
gameHistory.result = '';
gameHistory.variations = [];

var setupBoardFen = START_FEN;

function updateDGTPosition(data) {
    if (!goToPosition(data.fen)) {
        loadGame(data['pgn'].split("\n"));
        goToPosition(data.fen);
    }
}

function load_nacl_stockfish() {
    var listener = document.getElementById('listener');
    listener.addEventListener('load', stockfishPNACLModuleDidLoad, true);
    listener.addEventListener('message', handleMessage, true);
    listener.addEventListener('crash', handleCrash, true);
}

function getSystemInfo() {
    $.get('/info', {action: 'get_system_info'}, function(data) {
        window.system_info = data;
        var ip = '';
        if (window.system_info.ip) {
            ip = ' - IP: ' + window.system_info.ip;
        }
        document.title = 'Webserver Picochess ' + window.system_info.version + ip;
    }).fail(function(jqXHR, textStatus) {
        dgtClockStatusEl.html(textStatus);
    });
    $.get('/info', {action: 'get_headers'}, function(data) {
        setHeaders(data);
    }).fail(function(jqXHR, textStatus) {
        dgtClockStatusEl.html(textStatus);
    });
}

// copied from loadGame()
function setHeaders(data) {
    gameHistory.gameHeader = getGameHeader(data, false);
    gameHistory.result = data.Result;
    gameHistory.originalHeader = data;
    var exporter = new WebExporter();
    export_game(gameHistory, exporter, true, true, undefined, false);
    writeVariationTree(pgnEl, exporter.toString(), gameHistory);
}

function goToDGTFen() {
    $.get('/dgt', {action: 'get_last_move'}, function(data) {
        if (data) {
            updateDGTPosition(data);
            if (data['msg']) {
                dgtClockStatusEl.html(data['msg']);
            }
        }
    }).fail(function(jqXHR, textStatus) {
        dgtClockStatusEl.html(textStatus);
    });
}

$(function() {
//    getSystemInfo();
    // JP! is this really needed?!?
    $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
        window.activedb = e.target.hash;
        updateStatus();
    });
    window.engine_lines = {};
    window.activedb = "#ref";
    window.multipv = 1;
    window.BookStatsTable = $('#BookStatsTable').dynatable({
        dataset: {
            ajax: true,
            ajaxDataType: 'jsonp',
            ajaxUrl: backend_server_prefix + '/query?callback=js_callback',
            ajaxOnLoad: true,
            ajaxData: {
                action: 'get_book_moves',
                fen: START_FEN
            },
            records: []
        },
        inputs: {
            processingText: '<img width="col-xs-3" src="/static/img/ajax-loader.gif" />'
        },
        features: {
            paginate: false,
            search: false,
            recordCount: false
        },
        writers: {
            _rowWriter: clickRowBookWriter
        },
        readers: {
            _rowReader: clickRowBookReader
        }
    }).data('dynatable');

    $("#GameStatsTable").delegate('tr', 'click', function() {
        $.ajax({
            dataType: 'jsonp',
            url: backend_server_prefix + '/query?callback=game_callback',
            data: {
                action: 'get_game_content',
                game_offset: $(this).attr('data-game-id'),
                db: window.activedb
            }
        }).done(function(data) {
            loadGame(data['pgn']);
            updateStatus();
        });
    });

    $("#BookStatsTable").delegate('tr', 'click', function() {
        stop_analysis();
        var tmp_game = create_game_pointer();
        var move = tmp_game.move($(this).attr('data-move'));
        updateCurrentPosition(move, tmp_game);
        board.position(currentPosition.fen);
        updateStatus();
    });

    window.GameStatsTable = $('#GameStatsTable').dynatable({
        dataset: {
            ajax: true,
            ajaxUrl: backend_server_prefix + '/query?callback=game_callback',
            ajaxDataType: 'jsonp',
            ajaxOnLoad: true,
            ajaxData: {
                action: 'get_games',
                fen: START_FEN
            },
            records: []
        },
        inputs: {
            processingText: '<img width="col-xs-3" src="/static/img/ajax-loader.gif" />',
            paginationClass: 'pagination',
            paginationActiveClass: 'active',
            paginationDisabledClass: 'disabled'
        },
        features: {
            paginate: true,
            search: true,
            recordCount: true,
            perPageSelect: true
        },
        writers: {
            _rowWriter: clickRowGameWriter
        },
        readers: {
            _rowReader: clickRowGameReader
        }
    }).data('dynatable');

    $(document).keydown(function(e) {
        if (e.keyCode == 39) { //right arrow
            if (e.ctrlKey) {
                $('#endBtn').click();
            } else {
                $('#fwdBtn').click();
            }
            return true;
        }
    });

    $(document).keydown(function(e) {
        if (e.keyCode == 37) { //left arrow
            if (e.ctrlKey) {
                $('#startBtn').click();
            } else {
                $('#backBtn').click();
            }
        }
        return true;
    });
    updateStatus();

// Shiv: ChessUI does not need websocket support, we can uncomment and reuse if needed!

//    window.WebSocket = window.WebSocket || window.MozWebSocket || false;
//    if (!window.WebSocket) {
//        alert('No WebSocket Support');
//    }
//    else {
//        var ws = new WebSocket('ws://' + location.host + '/event');
//        // Process messages from picochess
//        ws.onmessage = function(e) {
//            var data = JSON.parse(e.data);
//            if ('msg' in data) {
//                dgtClockStatusEl.html(data.msg);
//            }
//            switch (data.event) {
//                case 'newFEN':
//                    updateDGTPosition(data);
//                    updateStatus();
//                    break;
//                case 'NewGame':
//                    newBoard(data.fen);
//                    break;
//                case 'Message':
//                    dgtClockStatusEl.html(data.msg);
//                    break;
//                case 'header':
//                    setHeaders(data['headers']);
//                    break;
//                default:
//                    console.warn(data);
//            }
//        };
//        ws.onclose = function() {
//            dgtClockStatusEl.html('closed');
//        };
//    }

    if (navigator.mimeTypes['application/x-pnacl'] !== undefined) {
        $('#analyzeBtn').prop('disabled', true);
        load_nacl_stockfish();
    }
});

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
function create_game_pointer() {
    var tmp_game;

    if (currentPosition && currentPosition.fen) {
        tmp_game = new Chess(currentPosition.fen);
    }
    else {
        tmp_game = new Chess(setupBoardFen);
    }
    return tmp_game;
}

var onDragStart = function(source, piece, position, orientation) {
    var tmp_game = create_game_pointer();
    if ((tmp_game.turn() === 'w' && piece.search(/^b/) !== -1) || (tmp_game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
};

function strip_fen(fen) {
    var stripped_fen = fen.replace(/\//g, "");
    stripped_fen = stripped_fen.replace(/ /g, "");
    return stripped_fen;
}

function figurinize_move(move) {
    if (!move) return;
    move = move.replace("N", "&#9816;");
    move = move.replace("B", "&#9815;");
    move = move.replace("R", "&#9814;");
    move = move.replace("K", "&#9812;");
    move = move.replace("Q", "&#9813;");
    move = move.replace("X", "&#9888;"); // error code
    return move;
}

String.prototype.trim = function() {
    return this.replace(/\s*$/g, '');
};

function WebExporter(columns) {
    this.lines = [];
    this.columns = columns;
    this.current_line = '';
    this.flush_current_line = function() {
        if (this.current_line) {
            this.lines.append(this.current_line.trim());
            this.current_line = '';
        }
    };

    this.write_token = function(token) {
        if (this.columns && this.columns - this.current_line.length < token.length) {
            this.flush_current_line();
        }
        this.current_line += token;
    };

    this.write_line = function(line) {
        this.flush_current_line();
        this.lines.push(line.trim());
    };

    this.start_game = function() {
    };

    this.end_game = function() {
        this.write_line();
    };

    this.start_headers = function() {
    };

    this.end_headers = function() {
        this.write_line();
    };

    this.start_variation = function() {
        this.write_token("<span class='gameVariation'> [ ");
    };

    this.end_variation = function() {
        this.write_token(" ] </span>");
    };

    this.put_starting_comment = function(comment) {
        this.put_comment(comment);
    };

    this.put_comment = function(comment) {
        this.write_token('<span class="gameComment"><a href="#" class="comment"> ' + comment + ' </a></span>');
    };

    this.put_nags = function(nags) {
        if (nags) {
            nags = nags.sort();

            for (var i = 0; i < nags.length; i++) {
                this.put_nag(nags[i]);
            }
        }
    };

    this.put_nag = function(nag) {
        var int_nag = parseInt(nag);
        if (simple_nags[int_nag]) {
            this.write_token(" " + simple_nags[int_nag] + " ");
        }
        else {
            this.write_token("$" + String(nag) + " ");
        }
    };

    this.put_fullmove_number = function(turn, fullmove_number, variation_start) {
        if (turn == 'w') {
            this.write_token(String(fullmove_number) + ". ");
        }
        else if (variation_start) {
            this.write_token(String(fullmove_number) + "... ");
        }
    };

    this.put_move = function(board, m) {
        var old_fen = board.fen();
        var tmp_board = new Chess(old_fen);
        var out_move = tmp_board.move(m);
        var fen = tmp_board.fen();
        var stripped_fen = strip_fen(fen);
        if (!out_move) {
            console.warn('put_move error');
            console.log(tmp_board.ascii());
            console.log(m);
            out_move = {'san': 'X' + move.from + move.to};
        }
        this.write_token('<span class="gameMove' + (board.fullmove_number) + '"><a href="#" class="fen" data-fen="' + fen + '" id="' + stripped_fen + '"> ' + figurinize_move(out_move.san) + ' </a></span>');
    };

    this.put_result = function(result) {
        this.write_token(result + " ");
    };

    // toString override added to prototype of Foo class
    this.toString = function() {
        if (this.current_line) {
            var tmp_lines = this.lines.slice(0);
            tmp_lines.push(this.current_line.trim());

            return tmp_lines.join("\n").trim();
        }
        else {
            return this.lines.join("\n").trim();
        }
    };
}

function PGNExporter(columns) {
    this.lines = [];
    this.columns = columns;
    this.current_line = "";
    this.flush_current_line = function() {
        if (this.current_line) {
            this.lines.append(this.current_line.trim());
            this.current_line = "";
        }
    };

    this.write_token = function(token) {
        if (this.columns && this.columns - this.current_line.length < token.length) {
            this.flush_current_line();
        }
        this.current_line += token;
    };

    this.write_line = function(line) {
        this.flush_current_line();
        this.lines.push(line.trim());
    };

    this.start_game = function() {
    };

    this.end_game = function() {
        this.write_line();
    };

    this.start_headers = function() {
    };

    this.put_header = function(tagname, tagvalue) {
        this.write_line("[{0} \"{1}\"]".format(tagname, tagvalue));
    };

    this.end_headers = function() {
        this.write_line();
    };

    this.start_variation = function() {
        this.write_token("( ");
    };

    this.end_variation = function() {
        this.write_token(") ");
    };

    this.put_starting_comment = function(comment) {
        this.put_comment(comment);
    };

    this.put_comment = function(comment) {
        this.write_token("{ " + comment.replace("}", "").trim() + " } ");
    };

    this.put_nags = function(nags) {
        if (nags) {
            nags = nags.sort();

            for (var i = 0; i < nags.length; i++) {
                this.put_nag(nags[i]);
            }
        }
    };

    this.put_nag = function(nag) {
        this.write_token("$" + String(nag) + " ");
    };

    this.put_fullmove_number = function(turn, fullmove_number, variation_start) {
        if (turn == 'w') {
            this.write_token(String(fullmove_number) + ". ");
        }
        else if (variation_start) {
            this.write_token(String(fullmove_number) + "... ");
        }
    };

    this.put_move = function(board, m) {
        var tmp_board = new Chess(board.fen());
        var out_move = tmp_board.move(m);
        this.write_token(out_move.san + " ");
    };

    this.put_result = function(result) {
        this.write_token(result + " ");
    };

    // toString override added to prototype of Foo class
    this.toString = function() {
        if (this.current_line) {
            var tmp_lines = this.lines.slice(0);
            tmp_lines.push(this.current_line.trim());

            return tmp_lines.join("\n").trim();
        }
        else {
            return this.lines.join("\n").trim();
        }
    };
}

function export_game(root_node, exporter, include_comments, include_variations, _board, _after_variation) {
    if (_board == undefined) {
        _board = new Chess(root_node.fen);
    }

    // append fullmove number
    if (root_node.variations && root_node.variations.length > 0) {
        _board.fullmove_number = Math.ceil(root_node.variations[0].half_move_num / 2);

        var main_variation = root_node.variations[0];
        exporter.put_fullmove_number(_board.turn(), _board.fullmove_number, _after_variation);
        exporter.put_move(_board, main_variation.move);
        if (include_comments) {
            exporter.put_nags(main_variation.nags);
            // append comment
            if (main_variation.comment) {
                exporter.put_comment(main_variation.comment);
            }
        }
    }

    // Then export sidelines.
    if (include_variations && root_node.variations) {
        for (var j = 1; j < root_node.variations.length; j++) {
            var variation = root_node.variations[j];
            exporter.start_variation();
            // q.push([variations[j]]);#

            if (include_comments && variation.starting_comment) {
                exporter.put_starting_comment(variation.starting_comment);
            }
            exporter.put_fullmove_number(_board.turn(), _board.fullmove_number, true);

            exporter.put_move(_board, variation.move);

            if (include_comments) {
                // Append NAGs.
                exporter.put_nags(variation.nags);

                // Append the comment.
                if (variation.comment) {
                    exporter.put_comment(variation.comment);
                }
            }
            // Recursively append the next moves.
            _board.move(variation.move);
            export_game(variation, exporter, include_comments, include_variations, _board, false);
            _board.undo();

            // End variation.
            exporter.end_variation();
        }
    }

    // The mainline is continued last.
    if (root_node.variations && root_node.variations.length > 0) {
        main_variation = root_node.variations[0];

        // Recursively append the next moves.
        _board.move(main_variation.move);
        _after_variation = (include_variations && (root_node.variations.length > 1));
        export_game(main_variation, exporter, include_comments, include_variations, _board, _after_variation);
        _board.undo();
    }
}

var onDrop = function(source, target) {
    var tmp_game = create_game_pointer();

    var move = tmp_game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a pawn for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function updateCurrentPosition(move, tmp_game) {
    var found_move = false;
    if (currentPosition && currentPosition.variations) {
        for (var i = 0; i < currentPosition.variations.length; i++) {
            if (move.san == currentPosition.variations[i].move.san) {
                currentPosition = currentPosition.variations[i];
                found_move = true;
            }
        }
    }
    if (!found_move) {
        var __ret = addNewMove({'move': move}, currentPosition, tmp_game.fen());
        currentPosition = __ret.node;
        var exporter = new WebExporter();
        export_game(gameHistory, exporter, true, true, undefined, false);
        writeVariationTree(pgnEl, exporter.toString(), gameHistory);
    }
}

var onSnapEnd = function(source, target) {
    stop_analysis();
    var tmp_game = create_game_pointer();

    if(!currentPosition) {
        currentPosition = {};
        currentPosition.fen = tmp_game.fen();
        gameHistory = currentPosition;
        gameHistory.gameHeader = '<h4>Player (-) vs Player (-)</h4><h5>Board game</h5>';
        gameHistory.result = '*';
    }

    var move = tmp_game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a pawn for example simplicity
    });

    // illegal move
    // if (move === null) return 'snapback';
    updateCurrentPosition(move, tmp_game);
    board.position(currentPosition.fen);
    updateStatus();
//    $.post('/channel', {action: 'move', fen: currentPosition.fen, source: source, target: target}, function(data) {
//    });
};

var updateStatus = function() {
    var status = '';
    $('.fen').unbind('click', goToGameFen).one('click', goToGameFen);

    var moveColor = 'White';
    var tmp_game = create_game_pointer();
    var fen = tmp_game.fen();

    var stripped_fen = strip_fen(fen);

    if (tmp_game.turn() === 'b') {
        moveColor = 'Black';
        $('#sidetomove').html("<i class=\"fa fa-square fa-lg \"></i>");
    }
    else {
        $('#sidetomove').html("<i class=\"fa fa-square-o fa-lg \"></i>");
    }

    // checkmate?
    if (tmp_game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    }
    // draw?
    else if (tmp_game.in_draw() === true) {
        status = 'Game over, drawn position';
    }
    // game still on
    else {
        status = moveColor + ' to move';
        // check?
        if (tmp_game.in_check() === true) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    boardStatusEl.html(status);
    if (window.analysis) {
        analyze(true);
    }
//    window.BookStatsTable.processingIndicator.show();
    window.BookStatsTable.settings.dataset.ajaxData = {
        action: 'get_book_moves',
        fen: fen,
        db: window.activedb
    };
    window.BookStatsTable.process();

    window.GameStatsTable.settings.dataset.ajaxData = {
        action: 'get_games',
        fen: fen,
        db: window.activedb
    };
    window.GameStatsTable.process();

    $(".highlight").removeClass('highlight');

    if ($('#' + stripped_fen).position()) {
        pgnEl.scrollTop(0);
        var y_position = $('#' + stripped_fen).position().top;
        pgnEl.scrollTop(y_position);
    }
    $('#' + stripped_fen).addClass('highlight');
};


var cfg = {
    showNotation: false,
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
};
board = new ChessBoard('board', cfg);
$(window).resize(board.resize);

$('#flipOrientationBtn').on('click', board.flip);
$('#backBtn').on('click', goBack);
$('#fwdBtn').on('click', goForward);
$('#startBtn').on('click', goToStart);
$('#endBtn').on('click', goToEnd);

$('#DgtSyncBtn').on('click', goToDGTFen);
$('#downloadBtn').on('click', download);
$('#broadcastBtn').on('click', broadcastPosition);

$('#analyzeBtn').on('click', analyze_pressed);

$('#analyzePlus').on('click', multipv_increase);
$('#analyzeMinus').on('click', multipv_decrease);


function clickRowGameWriter(rowIndex, record, columns, cellWriter) {
    var tr = '';
    // grab the record's attribute for each column
    for (var i = 0, len = columns.length; i < len; i++) {
        tr += cellWriter(columns[i], record);
    }
    return '<tr data-game-id=' + record.id + '>' + tr + '</tr>';
}

function clickRowGameReader(rowIndex, rowElement, record) {
    record.customData = $(rowElement).data('id');
}

function clickRowBookWriter(rowIndex, record, columns, cellWriter) {
    var tr = '';
    var original_move = record.move;
    record.move = figurinize_move(record.move);
    // grab the record's attribute for each column
    for (var i = 0, len = columns.length; i < len; i++) {
        tr += cellWriter(columns[i], record);
    }
    return '<tr data-move=' + original_move + '>' + tr + '</tr>';
}

function clickRowBookReader(rowIndex, rowElement, record) {
    record.customData = $(rowElement).data('move');
}

function addNewMove(m, current_position, fen, props) {
    var node = {};
    node.variations = [];

    node.move = m.move;
    node.previous = current_position;
    node.nags = [];
    if (props) {
        if (props.comment) {
            node.comment = props.comment;
        }
        if (props.starting_comment) {
            node.starting_comment = props.starting_comment;
        }
    }

    if (current_position && current_position.previous) {
        node.half_move_num = node.previous.half_move_num + 1;
    }
    else {
        node.half_move_num = 1;
    }
    node.fen = fen;
    if ($.isEmptyObject(fenHash)) {
        fenHash['first'] = node.previous;
        node.previous.fen = setupBoardFen;
    }
    fenHash[node.fen] = node;
    if (current_position) {
        if (!current_position.variations) {
            current_position.variations = [];
        }
        current_position.variations.push(node);
    }
    return {node: node, position: current_position};
}

function loadGame(pgn_lines) {
    fenHash = {};

    var curr_fen;
    if (currentPosition) {
        curr_fen = currentPosition.fen;
    }
    else {
        curr_fen = START_FEN;
    }

    gameHistory.previous = null;
    currentPosition = {};
    var current_position = currentPosition;
    gameHistory = current_position;

    var game_body_regex = /(%.*?[\n\r])|(\{[\s\S]*?\})|(\$[0-9]+)|(\()|(\))|(\*|1-0|0-1|1\/2-1\/2)|([NBKRQ]?[a-h]?[1-8]?[\-x]?[a-h][1-8](?:=?[nbrqNBRQ])?[\+]?|--|O-O(?:-O)?|0-0(?:-0)?)|([\?!]{1,2})/g;
    var game_header_regex = /\[([A-Za-z0-9]+)\s+\"(.*)\"\]/;

    var line;
    var parsed_headers = false;
    var game_headers = {};
    var game_body = '';
    for (var j = 0; j < pgn_lines.length; j++) {
        line = pgn_lines[j];
        // Parse headers first, then game body
        if (!parsed_headers) {
            if ((result = game_header_regex.exec(line)) !== null) {
                game_headers[result[1]] = result[2];
            }
            else {
                parsed_headers = true;
            }
        }
        if (parsed_headers) {
            game_body += line + "\n";
        }
    }

    var tmp_game;
    if ('FEN' in game_headers && 'SetUp' in game_headers) {
        tmp_game = new Chess(game_headers['FEN']);
        setupBoardFen = game_headers['FEN'];
    }
    else {
        tmp_game = new Chess();
        setupBoardFen = START_FEN;
    }

    var board_stack = [tmp_game];
    var variation_stack = [current_position];
    var last_board_stack_index;
    var last_variation_stack_index;

    var in_variation = false;
    var starting_comment = '';

    var result;
    while ((result = game_body_regex.exec(game_body)) !== null) {

        var token = result[0];
        var comment;

        if (token == '1-0' || token == '0-1' || token == '1/2-1/2' || token == '*') {
            game_headers['Result'] = token;
        }
        else if (token[0] == '{') {
            last_variation_stack_index = variation_stack.length - 1;

            comment = token.substring(1, token.length - 1);
            comment = comment.replace(/\n|\r/g, " ");

            if (in_variation || !variation_stack[last_variation_stack_index].previous) {
                if (variation_stack[last_variation_stack_index].comment) {
                    variation_stack[last_variation_stack_index].comment = variation_stack[last_variation_stack_index].comment + " " + comment;
                }
                else {
                    variation_stack[last_variation_stack_index].comment = comment;
                }
                comment = undefined;
            }
            else {
                if (starting_comment.length > 0) {
                    comment = starting_comment + " " + comment;
                }
                starting_comment = comment;
                comment = undefined;
            }
        }
        else if (token == '(') {
            last_board_stack_index = board_stack.length - 1;
            last_variation_stack_index = variation_stack.length - 1;

            if (variation_stack[last_variation_stack_index].previous) {
                variation_stack.push(variation_stack[last_variation_stack_index].previous);
                last_variation_stack_index += 1;
                board_stack.push(Chess(variation_stack[last_variation_stack_index].fen));
                in_variation = false;
            }
        }
        else if (token == ')') {
            if (variation_stack.length > 1) {
                variation_stack.pop();
                board_stack.pop();
            }
        }
        else if (token[0] == '$') {
            variation_stack[variation_stack.length - 1].nags.push(token.slice(1));
        }
        else if (token == '?') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_MISTAKE);
        }
        else if (token == '??') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_BLUNDER);
        }
        else if (token == '!') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_GOOD_MOVE);
        }
        else if (token == '!!') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_BRILLIANT_MOVE);
        }
        else if (token == '!?') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_SPECULATIVE_MOVE);
        }
        else if (token == '?!') {
            variation_stack[variation_stack.length - 1].nags.push(NAG_DUBIOUS_MOVE);
        }
        else {
            last_board_stack_index = board_stack.length - 1;
            last_variation_stack_index = variation_stack.length - 1;

            var preparsed_move = token;
            var move = board_stack[last_board_stack_index].move(preparsed_move, {sloppy: true});
            in_variation = true;
            if (move == null) {
                console.log('Unparsed move:');
                console.log(preparsed_move);
                console.log('Fen: ' + board_stack[last_board_stack_index].fen());
                console.log('faulty line: ' + line);
            }

            var props = {};
            if (comment) {
                props.comment = comment;
                comment = undefined;
            }
            if (starting_comment) {
                props.starting_comment = starting_comment;
                starting_comment = '';
            }

            var __ret = addNewMove({'move': move}, variation_stack[last_variation_stack_index], board_stack[last_board_stack_index].fen(), props);
            variation_stack[last_variation_stack_index] = __ret.node;
        }
    }
    fenHash['last'] = fenHash[tmp_game.fen()];

    if (curr_fen === undefined) {
        currentPosition = fenHash['first'];
    }
    else {
        currentPosition = fenHash[curr_fen];
    }

    setHeaders(game_headers);
    $('.fen').unbind('click', goToGameFen).one('click', goToGameFen);
}

function get_full_game() {
    var game_header = getGameHeader(gameHistory.originalHeader, true);
    if (game_header.length <= 1) {
        gameHistory.originalHeader = {
            'White': '*',
            'Black': '*',
            'Event': '?',
            'Site': '?',
            'Date': '?',
            'Round': '?',
            'Result': '*',
            'BlackElo' : '-',
            'WhiteElo' : '-'
        };
        game_header = getGameHeader(gameHistory.originalHeader, true);
    }

    var exporter = new PGNExporter();
    export_game(gameHistory, exporter, true, true, undefined, false);
    var exporter_content = exporter.toString();
    return game_header + exporter_content;
}

function writeVariationTree(dom, gameMoves, gameHistoryEl) {
    $(dom).html(gameHistoryEl.gameHeader + '<div class="gameMoves">' + gameMoves + ' <span class="gameResult">' + gameHistoryEl.result + '</span></div>');
}

function getGameHeader(h, pgn_output) {
    var gameHeaderText = '';

    if (true == pgn_output) {
        for (var key in h) {
            // hasOwnProperty ensures that inherited properties are not included
            if (h.hasOwnProperty(key)) {
                var value = h[key];
                gameHeaderText += "[" + key + " \"" + value + "\"]\n";
            }
        }
        gameHeaderText += "\n";
    }
    else {
        gameHeaderText = '<h4>' + h.White + ' (' + h.WhiteElo + ') vs ' + h.Black + ' (' + h.BlackElo + ')</h4>';
        gameHeaderText += '<h5>' + h.Event + ', ' + h.Site + ' ' + h.Date + '</h5>';
    }
    return gameHeaderText;
}

function download() {
    var content = get_full_game();
    var dl = document.createElement('a');
    dl.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    dl.setAttribute('download', 'game.pgn');
    document.body.appendChild(dl);
    dl.click();
}

function newBoard(fen) {
    stop_analysis();

    board.destroy();
    board = new ChessBoard('board', cfg);

    board.position(fen);
    currentPosition = {};
    currentPosition.fen = fen;

    setupBoardFen = fen;
    gameHistory = currentPosition;
    gameHistory.gameHeader = '';
    gameHistory.result = '';
    gameHistory.variations = [];
    updateStatus();
}

function broadcastPosition() {
    if (currentPosition) {
        var content = get_full_game();
        $.post('/channel', {action: 'broadcast', fen: currentPosition.fen, pgn: content}, function (data) {
        });
    }
}

function goToGameFen() {
    var fen = $(this).attr('data-fen');
    goToPosition(fen);
}

function goToPosition(fen) {
    stop_analysis();
    currentPosition = fenHash[fen];
    if (!currentPosition) {
        return false;
    }
    board.position(currentPosition.fen);
    updateStatus();
    return true;
}

function goToStart() {
    stop_analysis();
    currentPosition = gameHistory;
    board.position(currentPosition.fen);
    updateStatus();
}

function goToEnd() {
    stop_analysis();
    if (fenHash.last) {
        currentPosition = fenHash.last;
        board.position(currentPosition.fen);
    }
    updateStatus();
}

function goForward() {
    stop_analysis();
    if (currentPosition && currentPosition.variations[0]) {
        currentPosition = currentPosition.variations[0];
        if (currentPosition) {
            board.position(currentPosition.fen);
        }
    }
    updateStatus();
}

function goBack() {
    stop_analysis();
    if (currentPosition && currentPosition.previous) {
        currentPosition = currentPosition.previous;
        board.position(currentPosition.fen);
    }
    updateStatus();
}

function formatEngineOutput(line) {
    if (line.search('depth') > 0 && line.search('currmove') < 0) {
        var analysis_game = new Chess();
        var start_move_num = 1;
        if (currentPosition && currentPosition.fen) {
            analysis_game.load(currentPosition.fen);
            start_move_num = getCountPrevMoves(currentPosition) + 1;
        }

        var output = '';
        var tokens = line.split(" ");
        var depth_index = tokens.indexOf('depth') + 1;
        var depth = tokens[depth_index];
        var score_index = tokens.indexOf('score') + 1;

        var multipv_index = tokens.indexOf('multipv');
        var multipv = 0;
        if (multipv_index > -1) {
            multipv = Number(tokens[multipv_index + 1]);
        }

        var score = tokens[score_index];
        if (score == 'cp') {
            score = (tokens[score_index + 1] / 100.0).toFixed(2);
            if (analysis_game.turn() == 'b') {
                score *= -1;
            }
        }
        else if (score == 'mate') {
            score = '#' + score;
        }
        var pv_index = tokens.indexOf('pv') + 1;

        var pv_out = tokens.slice(pv_index);
        var first_move = pv_out[0];
        for (var i = 0; i < pv_out.length; i++) {
            var from = pv_out[i].slice(0, 2);
            var to = pv_out[i].slice(2, 4);
            var promotion = '';
            if (pv_out[i].length == 5) {
                promotion = pv_out[i][4];
            }
            if (promotion) {
                var mv = analysis_game.move(({from: from, to: to, promotion: promotion}));
            } else {
                analysis_game.move(({from: from, to: to}));
            }
        }

        var history = analysis_game.history();
        window.engine_lines['import_pv_' + multipv] = {score: score, depth: depth, line: history};

        var turn_sep = '';
        if (start_move_num % 2 == 0) {
            turn_sep = '..';
        }

        output = '<div class="list-group-item"><div class="row-picture"><i class="fa fa-paste"></i></div><div class="row-content">';

        if (score !== null) {
            output += '<div class="least-content">' +
                '<button id="import_pv_' + multipv + '" class="importPVBtn btn btn-xs btn-default">' +
                '<i class="fa fa-paste"></i></button></div>';
            output += '<h4 class="list-group-item-heading" id="pv_' + multipv + '_score">' +
                '<span style="color:blue">' + score + '/' + depth + ' ' + '</span></h4>';
        }
        output += '<p class="list-group-item-text">' + turn_sep;
        for (i = 0; i < history.length; ++i) {
            if ((start_move_num + i) % 2 == 1) {
                output += Math.floor((start_move_num + i + 1) / 2) + ". ";
            }
            if (history[i]) {
                output += figurinize_move(history[i]) + " ";
            }
        }
        output += '</p></div></div><div class="list-group-separator"></div>';

        analysis_game = null;
        return {line: output, pv_index: multipv};
    }
    else if (line.search('currmove') < 0 && line.search('time') < 0) {
        return line;
    }
}

function multipv_increase() {
    if (window.stockfish) {
        window.multipv += 1;

        if (window.stockfish) {
            window.stockfish.postMessage('setoption name multipv value ' + window.multipv);
            if (window.analysis) {
                window.stockfish.postMessage('stop');
                window.stockfish.postMessage('go infinite');
            }
            else {
                $('#engineMultiPVStatus').html(window.multipv + " line(s)");
            }
        }

        var new_div_str = "<div id=\"pv_" + window.multipv + "\"></div>";
        $("#pv_output").append(new_div_str);

        if (!window.StockfishModule) {
            // Need to restart web worker as its not Chrome
            stop_analysis();
            analyze(true);
        }
    }
}

function multipv_decrease() {
    if (window.multipv > 1) {
        $('#pv_' + window.multipv).remove();

        window.multipv -= 1;
        if (window.stockfish) {
            window.stockfish.postMessage('setoption name multipv value ' + window.multipv);
            if (window.analysis) {
                window.stockfish.postMessage('stop');
                window.stockfish.postMessage('go infinite');
            }
            else {
                $('#engineMultiPVStatus').html(window.multipv + " line(s)");
            }
        }

        if (!window.StockfishModule) {
            // Need to restart web worker as its not Chrome
            stop_analysis();
            analyze(true);
        }
    }
}

function import_pv(e) {
    stop_analysis();
    var tmp_game = create_game_pointer();
    for (var i = 0; i < window.engine_lines[$(this).context.id].line.length; ++i) {
        var text_move = window.engine_lines[$(this).context.id].line[i];
        var move = tmp_game.move(text_move);
        updateCurrentPosition(move, tmp_game);
    }
    board.position(currentPosition.fen);
    updateStatus();
}

function analyze_pressed() {
    analyze(false);
}

function stockfishPNACLModuleDidLoad() {
    window.StockfishModule = document.getElementById('stockfish_module');
    window.StockfishModule.postMessage('uci');
    $('#analyzeBtn').prop('disabled', false);
}

function handleCrash(event) {
    console.warn('Nacl Module crash handler method..');
    load_nacl_stockfish();
}

function handleMessage(event) {
    var output = formatEngineOutput(event.data);
    if (output && output.pv_index && output.pv_index > 0) {
        $('#pv_' + output.pv_index).html(output.line);
    }
    $('#engineMultiPVStatus').html(window.multipv + " line(s)");
    $('.importPVBtn').on('click', import_pv);
}

function stop_analysis() {
    if (!window.StockfishModule) {
        if (window.stockfish) {
            window.stockfish.terminate();
        }
    } else {
        try {
            window.StockfishModule.postMessage('stop');
        }
        catch (err) {
            console.warn(err);
        }
    }
}

function getCountPrevMoves(node) {
    if (node.previous) {
        return getCountPrevMoves(node.previous) + 1;
    } else {
        return 0;
    }
}

function getPreviousMoves(node, format) {
    format = format || 'raw';

    if (node.previous) {
        if (format == 'san') {
            var san = '';
            if (node.half_move_num % 2 == 1) {
                san += Math.floor((node.half_move_num + 1) / 2) + ". "
            }
            san += node.move.san;
            return getPreviousMoves(node.previous, format) + ' ' + san;
        }
        else {
            return getPreviousMoves(node.previous, format) + ' ' + node.move.from + node.move.to + (node.move.promotion ? node.move.promotion : '');
        }
    } else {
        return '';
    }
}

function analyze(position_update) {
    if (!position_update) {
        if ($('#AnalyzeText').text() == 'Analyze') {
            window.analysis = true;
            $('#AnalyzeText').text('Stop');
        }
        else {
            $('#AnalyzeText').text('Analyze');
            stop_analysis();
            window.analysis = false;
            $('#engineStatus').html('');
            return;
        }
    }
    var moves;
    if (currentPosition === undefined) {
        moves = '';
    }
    else {
        moves = getPreviousMoves(currentPosition);
    }
    if (!window.StockfishModule) {
        window.stockfish = new Worker('/static/js/stockfish.js');
        window.stockfish.onmessage = function(event) {
            handleMessage(event);
        };
    }
    else {
        if (!window.stockfish) {
            window.stockfish = StockfishModule;
        }
    }

    var startpos = 'startpos';
    if (setupBoardFen !== START_FEN) {
        startpos = 'fen ' + setupBoardFen;
    }
    window.stockfish.postMessage('position ' + startpos + ' moves ' + moves);
    window.stockfish.postMessage('setoption name multipv value ' + window.multipv);
    window.stockfish.postMessage('go infinite');
}
