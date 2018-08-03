import React from 'react';
import Chess from 'chess.js';
import Button from '@material-ui/core/Button';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import Chessground from 'react-chessground';
import { withStyles } from '@material-ui/core/styles';
import 'react-chessground/dist/styles/chessground.css';
import ChevronRight from "@material-ui/icons/ChevronRight";
import FirstPage from "@material-ui/icons/es/FirstPage";
import LastPage from "@material-ui/icons/es/LastPage";

const styles = (theme) => ({
    notation: {
        padding: theme.spacing.unit * 3,
        fontFamily: 'sans-serif',
        fontSize: 20,
        fontWeight: 'bold',
    },
    pagination: {
        fontSize: 40,
    }
});

const NAG_NULL = 0;
const  NAG_GOOD_MOVE = 1;
//"""A good move. Can also be indicated by ``!`` in PGN notation."""
const  NAG_MISTAKE = 2;
//"""A mistake. Can also be indicated by ``?`` in PGN notation."""
const  NAG_BRILLIANT_MOVE = 3;
//"""A brilliant move. Can also be indicated by ``!!`` in PGN notation."""
const  NAG_BLUNDER = 4;
//"""A blunder. Can also be indicated by ``??`` in PGN notation."""
const  NAG_SPECULATIVE_MOVE = 5;
//"""A speculative move. Can also be indicated by ``!?`` in PGN notation."""
const  NAG_DUBIOUS_MOVE = 6;
//"""A dubious move. Can also be indicated by ``?!`` in PGN notation."""

const simple_nags = {'1': '!', '2': '?', '3': '!!', '4': '??', '5': '!?', '6': '?!', '7': '&#9633', '8': '&#9632','11' : '=', '13': '&infin;', '14': '&#10866', '15': '&#10865', '16': '&plusmn;', '17': '&#8723', '18': '&#43; &minus;', '19': '&minus; &#43;', '36': '&rarr;','142': '&#8979','146': 'N'};


const NAG_FORCED_MOVE = 7;
const NAG_SINGULAR_MOVE = 8;
const NAG_WORST_MOVE = 9;
const NAG_DRAWISH_POSITION = 10;
const NAG_QUIET_POSITION = 11;
const NAG_ACTIVE_POSITION = 12;
const NAG_UNCLEAR_POSITION = 13;
const NAG_WHITE_SLIGHT_ADVANTAGE = 14;
const NAG_BLACK_SLIGHT_ADVANTAGE = 15;

//# TODO: Add more constants for example from
//# https://en.wikipedia.org/wiki/Numeric_Annotation_Glyphs

const NAG_WHITE_MODERATE_COUNTERPLAY = 132;
const NAG_BLACK_MODERATE_COUNTERPLAY = 133;
const NAG_WHITE_DECISIVE_COUNTERPLAY = 134;
const NAG_BLACK_DECISIVE_COUNTERPLAY = 135;
const NAG_WHITE_MODERATE_TIME_PRESSURE = 136;
const NAG_BLACK_MODERATE_TIME_PRESSURE = 137;
const NAG_WHITE_SEVERE_TIME_PRESSURE = 138;
const NAG_BLACK_SEVERE_TIME_PRESSURE = 139;


const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';


class Demo extends React.Component {

    constructor(props) {
        super(props);
        this.chess = new Chess();

        this.state = {
            currentFen: '',
            moves: [],
            cachedMoves: [null],
            positions: [START_FEN],
            currentMove: 0,
        };
        this.currentPosition = {};
        this.currentPosition.fen = START_FEN;
        this.setupBoardFen = START_FEN;
        this.backOne = this.backOne.bind(this);
        this.forwardOne = this.forwardOne.bind(this);
        this.beginning = this.beginning.bind(this);
        this.end = this.end.bind(this);
        this.undo = this.undo.bind(this);
        this.handleArrowKeys = this.handleArrowKeys.bind(this);
        this.settings = {
            showLegalMoves: false
        };
        this.onMove = this.onMove.bind(this);
    }

    static strip_fen(fen) {
        let stripped_fen = fen.replace(/\//g, "");
        stripped_fen = stripped_fen.replace(/ /g, "");
        return stripped_fen;
    }

    static figurinize_move(move) {
        if (!move) return;
        move = move.replace("N", "&#9816;");
        move = move.replace("B", "&#9815;");
        move = move.replace("R", "&#9814;");
        move = move.replace("K", "&#9812;");
        move = move.replace("Q", "&#9813;");
        move = move.replace("X", "&#9888;"); // error code
        return move;
    }


     WebExporter(columns) {
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
            let int_nag = parseInt(nag);
            if (simple_nags[int_nag]) {
                this.write_token(" " + simple_nags[int_nag] + " ");
            }
            else {
                this.write_token("$" + String(nag) + " ");
            }
        };

        this.put_fullmove_number = function(turn, fullmove_number, variation_start) {
            if (turn === 'w') {
                this.write_token(String(fullmove_number) + ". ");
            }
            else if (variation_start) {
                this.write_token(String(fullmove_number) + "... ");
            }
        };

        this.put_move = function(board, m) {
            let old_fen = board.fen();
            let tmp_board = new Chess(old_fen);
            let out_move = tmp_board.move(m);
            let fen = tmp_board.fen();
            let stripped_fen = this.strip_fen(fen);
            if (!out_move) {
                console.warn('put_move error');
                console.log(tmp_board.ascii());
                console.log(m);
                out_move = {'san': 'X' + m.from + m.to};
            }
            this.write_token('<span class="gameMove' + (board.fullmove_number) + '"><a href="#" class="fen" data-fen="' + fen + '" id="' + stripped_fen + '"> ' + this.figurinize_move(out_move.san) + ' </a></span>');
        };

        this.put_result = function(result) {
            this.write_token(result + " ");
        };

        // toString override added to prototype of Foo class
        this.toString = function() {
            if (this.current_line) {
                let tmp_lines = this.lines.slice(0);
                tmp_lines.push(this.current_line.trim());

                return tmp_lines.join("\n").trim();
            }
            else {
                return this.lines.join("\n").trim();
            }
        };
    }

     create_game_pointer() {
        if (this.currentPosition && this.currentPosition.fen) {
            this.chess = new Chess(this.currentPosition.fen);
        }
        else {
            this.chess = new Chess(this.setupBoardFen);
        }
    }

    static getNotationRows(moves) {
        const rows = [];
        // console.log(moves);
        // console.log("move num");
        // console.log(0/2+1);
        for (let i = 0; i < moves.length; i += 2) {

            const row = <tr style={{width: '70%'}}>
                <td>{i / 2 + 1}.</td>
                <td>{moves[i]}</td>
                <td>{(moves[i + 1]) ? moves[i + 1] : ''}</td>
            </tr>;
            rows.push(row);

        }
        // console.log("notation");
        // console.log(<table><tbody>rows</tbody></table>);
        return rows
    }

    getEmptyRows(len) {
        const emptyRows = [];
        for (let i = 0; i < 20 - len; i++) {
            emptyRows.push('');
        }
        return emptyRows;
    }

    turnColor() {
        return (this.chess.turn() === 'w') ? 'white' : 'black'
    }

    calcMovable() {
        const dests = {};
        this.chess.SQUARES.forEach(s => {
            const ms = this.chess.moves({square: s, verbose: true});
            if (ms.length) dests[s] = ms.map(m => m.to)
        });
        return {
            free: false,
            dests,
            // Legal moves turned off by default
            showDests: this.settings.showLegalMoves
            // color: this.myColor()
        }
    }

    myColor() {
        return 'white'
    }

    backOne() {
        if (this.state.currentMove > 0) {
            this.setState({
                currentMove: this.state.currentMove - 1,
            }, () => {
                console.log('Cached moves is', this.state.cachedMoves, this.state.currentMove);
            })
        }
    }

    forwardOne() {
        if (this.state.currentMove < this.state.positions.length - 1) {
            this.setState({
                currentMove: this.state.currentMove + 1,
            }, () => {
                console.log('Cached moves is', this.state.cachedMoves, this.state.currentMove);
            })
        }
    }

    beginning() {
        this.setState({
            currentMove: 0,
        })
    }

    end() {
        this.setState({
            currentMove: this.state.positions.length - 1,
        })
    }

    undo() {
        if (this.state.positions.length === 1) {
            return;
        }
        this.setState({
            currentMove: this.state.currentMove - 1,
            positions: this.state.positions.slice(0, this.state.positions.length - 1),
        })
    }

    handleArrowKeys(e) {
        console.log('received key, key is', e.key);
        switch (e.key) {
            case 'ArrowLeft': this.backOne(); break;
            case 'ArrowRight': this.forwardOne(); break;
        }
    }

    onMove = (from, to) => {
        if (this.state.currentMove !== this.state.positions.length - 1) {
            return;
        }
        const chess = this.chess;
        console.log('Received on move:', from, to);
        const move = chess.move({ from, to, promotion: 'q' });
        if (move) {
            console.log('Move is:', move);
            this.setState({
                currentFen: chess.fen(),
                moves: [...this.state.moves, move.san],
                cachedMoves: [...this.state.cachedMoves, [move.from, move.to]],
                positions: [...this.state.positions, chess.fen()],
                currentMove: this.state.currentMove + 1,
            }, () => {
                console.log('Just made move and cached moves are', this.state.cachedMoves);
            })
            // setTimeout(this.randomMove, 500)
            // this.turnColor()
        }
    };

    onSelect = (square) => {
        console.log('Received onSelect:', square);
        console.log(this.chess.moves({verbose: true}));
        const movesToSquare = this.chess.moves({verbose: true})
            .filter((move) => move.from.includes(square) || move.to.includes(square));
        console.log(movesToSquare);
        if (movesToSquare.length === 1) {
            const move = movesToSquare[0];
            this.onMove(move.from, move.to);
        }
    };

    randomMove = () => {
        // const chess = this.chess;
        // const moves = chess.moves({ verbose: true });
        // const move = moves[Math.floor(Math.random() * moves.length)];
        // chess.move(move.san);
        // this.setState({
        //     currentFen: chess.fen(),
        //     lastMove: [move.from, move.to],
        //     // moves: [...this.state.moves, [move.from, move.to]]
        // })
    };

    render() {

        const { classes } = this.props;
        const focusMainApp = input => input && input.focus();

        return (
            <div style={{display: 'flex'}} onKeyUp={this.handleArrowKeys} ref={focusMainApp}>
                <div style={{textAlign: 'center',}}>
                    <Chessground
                        orientation={this.myColor()}
                        // width={'50%'}
                        turnColor={this.turnColor()}
                        movable={this.calcMovable()}
                        highlight={{
                            lastMove: false,
                        }}
                        fen={this.state.positions[this.state.currentMove]}
                        onMove={this.onMove}
                        onSelect={this.onSelect}
                        // style={{ margin: 'auto', flex: 1, }}
                        coordinates={false}
                        addPieceZIndex={true}
                    />
                    <div style={{margin: 'auto',}}>
                        <Button>
                            <FirstPage className={classes.pagination} onClick={this.beginning}/>
                        </Button>
                        <Button>
                            <ChevronLeft className={classes.pagination} onClick={this.backOne}/>
                        </Button>
                        <Button>
                            <ChevronRight className={classes.pagination} onClick={this.forwardOne}/>
                        </Button>
                        <Button>
                            <LastPage className={classes.pagination} onClick={this.end}/>
                        </Button>
                    </div>
                </div>
                <div className={classes.notation}>

                        <table>
                            <tbody>
                            {Demo.getNotationRows(this.state.moves)}

                            {/*{this.WebExporter('')}*/}
                            </tbody>
                        </table>

                </div>
            </div>
        );
    }
}

export default withStyles(styles)(Demo);