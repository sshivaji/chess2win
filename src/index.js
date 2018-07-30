import React from 'react'
import ReactDOM from 'react-dom'
import Chess from 'chess.js'
import Chessground from 'react-chessground'
import 'react-chessground/dist/styles/chessground.css'
// import './board.css'

class Demo extends React.Component {

  chess = new Chess();

  state = {
    fen: '',
    lastMove: null
  };

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
      showDests: false

        // color: this.myColor()
    }
  }

  myColor() {
    return 'white'
  }

  onMove = (from, to) => {
    const chess = this.chess;
    if (chess.move({ from, to, promotion: 'q' })) {
      this.setState({ fen: chess.fen(), lastMove: [from, to] })
      // setTimeout(this.randomMove, 500)
      // this.turnColor()
    }
  };

  randomMove = () => {
    const chess = this.chess;
    const moves = chess.moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];
    chess.move(move.san);
    this.setState({ fen: chess.fen(), lastMove: [move.from, move.to] })
  };

  render() {
    return <Chessground
      width={512}
      height={512}
      orientation={this.myColor()}
      turnColor={this.turnColor()}
      movable={this.calcMovable()}
      lastMove={this.state.lastMove}
      fen={this.state.fen}
      onMove={this.onMove}
      style={{ margin: 'auto'}}
      coordinates={false}
      resizable={true}

  />
  }
}

ReactDOM.render(<Demo />, document.getElementById('root'));
