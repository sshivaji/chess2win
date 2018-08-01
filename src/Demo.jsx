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

class Demo extends React.Component {

    constructor(props) {
        super(props);
        this.chess = new Chess();


        this.state = {
            currentFen: '',
            moves: [],
            cachedMoves: [null],
            positions: ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
            currentMove: 0,
        };
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
                            </tbody>
                        </table>

                </div>
            </div>
        );
    }
}

export default withStyles(styles)(Demo);