import json
import logging
import os
import time
import tornado
import chess

from external import scoutfish
from external import chess_db
from handlers.basic_handler import BasicHandler
from tornado.escape import json_encode
from tornado.ioloop import IOLoop
from tornado.web import asynchronous

SCOUTFISH_EXEC = './external/scoutfish'
CHESSDB_EXEC = './external/parser'
MILLIONBASE_PGN = './bases/millionbase.pgn'


class ChessBoardHandler(BasicHandler):
    def initialize(self, shared=None):
        self.shared = shared

    def get(self):
        self.render('../web/templates/board2.html')


class ChessQueryHandler(BasicHandler):
    def initialize(self, shared=None):
        self.shared = shared

    def process_results(self, results, callback):
        if callback:
            jsonp = "{jsfunc}({json});".format(jsfunc=callback,
                                               json=json_encode(results))
            self.set_header('Content-Type', 'application/javascript')
            self.write(jsonp)
        else:
            self.write(results)
        # self.finish()

    def get(self):
        ## This is created on server init
        if 'chessDB' not in self.shared:
            self.chessDB = chess_db.Parser(CHESSDB_EXEC)
            self.shared['chessDB'] = self.chessDB
            # print("Creating chessDB in shared")
        else:
            self.chessDB = self.shared['chessDB']

        ## This is created on server init
        if 'scoutfish' not in self.shared:
            self.scoutfish = scoutfish.Scoutfish(SCOUTFISH_EXEC)
            self.shared['scoutfish'] = self.scoutfish
        else:
            self.scoutfish = self.shared['scoutfish']

        # moves = self.get_arguments("moves")
        # print self.get_argument("sorts")
        action = self.get_argument("action", default=None)
        requested_db = self.get_argument("db", default=None)
        if not action:
            logging.info("No action sent")
            return
            # self.finish()

        logging.info("requested_db: {0}".format(requested_db))

        # Assign fen to self as the self object is recreated every request anyway and it simplifies the callback mechanism
        fen = self.get_argument("fen", default=None)
        logging.info("fen : {0}".format(fen))
        callback = self.get_argument('callback', default='')

        # Use thread pool to process slower queries
        results = self.process_request(action, fen)
        self.process_results(results, callback)

    def process_request(self, action, fen):
        records = []
        results = {}
        if action == "get_book_moves":
            # logging.info("get book moves :: ")
            records = self.query_db(fen)

            # Reverse sort by the number of games and select the top 5, otherwise all odd moves will show up..
            records.sort(key=lambda x: x['games'], reverse=True)
            results = {"records": records[:5]}

        elif action == "get_games":

            # perPage = 20 & page = 2 & offset = 20
            perPage = self.get_argument("perPage", default=10)
            perPage = int(perPage)
            # page = self.get_argument("page", default=1)
            offset = self.get_argument("offset", default=0)
            offset = int(offset)

            print("perPage: {0}, offset: {1}".format(perPage, offset))

            # convert to skip and limit logic
            # offset = skip
            # limit = perPage

            records = self.query_db(fen, skip=offset, limit=perPage)
            # Reverse sort by the number of games and select the top 5, for a balanced representation of the games
            records.sort(key=lambda x: x['games'], reverse=True)
            # For reporting purposes
            total_result_count = sum(r['games'] for r in records)

            filtered_records = records[:5]
            filtered_game_offsets = []
            # Limit number of games to 10 for now

            # for r in records:
            #     total_result_count += r['games']

            for r in filtered_records:
                for offset in r['pgn offsets']:
                    # print("offset: {0}".format(offset))
                    if len(filtered_game_offsets) >= perPage:
                        break
                    filtered_game_offsets.append(offset)
                    # else:
                    #     break
                    # total_result_count += 1


            print("filtered_game_offset count : {0}".format(len(filtered_game_offsets)))
            headers = self.chessDB.get_game_headers(self.chessDB.get_games(filtered_game_offsets))

            print("offsets: ")
            print(filtered_game_offsets)

            # print("headers: ")
            # for h in headers:
            #     print(h)
            # print("headers: {0}".format(headers))

            # tag the offset to each header
            for offset, h in zip(filtered_game_offsets, headers):
                # Should be sent as ID for front end accounting purposes, in an odd way, the offset is the game id,
                # as its the unique way to access the game
                h["id"] = offset

            results = {"records": headers, "queryRecordCount": total_result_count,
                       "totalRecordCount": total_result_count}

        elif action == "get_game_content":
            game_offset = self.get_argument("game_offset", default=0)
            game_offset = int(game_offset)
            if game_offset:
                # Get first result as its just one game
                pgn = self.chessDB.get_games([game_offset])[0]
                # Split it up again as we need one line at a time for the frontend to parse it correctly
                results = {"pgn": pgn.split(os.linesep)}
        return results

    def query_db(self, fen, limit = 100, skip = 0):
        records = []
        # selecting DB happens now
        self.chessDB.open(MILLIONBASE_PGN)
        results = self.chessDB.find(fen, limit = limit, skip = skip)
        board = chess.Board(fen)
        for m in results['moves']:
            # print(m)
            m['san'] = board.san(chess.Move.from_uci(m['move']))
            record = {'move': m['san'], 'pct': "{0:.2f}".format(
                (m['wins'] + m['draws'] * 0.5) * 100.0 / (m['wins'] + m['draws'] + m['losses'])), 'freq': m['games'],
                      'wins': m['wins'],
                      'draws': m['draws'], 'losses': m['losses'], 'games': int(m['games']), 'pgn offsets': m['pgn offsets']}
            records.append(record)
        return records