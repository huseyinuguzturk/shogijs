const DEFAULT_POSITION = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';

const PIECE_RULES = {
  'P': { steps: [[1, 0]], slides: [] },
  'K': { steps: [[1, 0], [1, 1], [1, -1], [0, 1], [0, -1], [-1, 0], [-1, 1], [-1, -1]], slides: [] },
  'G': { steps: [[1, 0], [1, 1], [1, -1], [0, 1], [0, -1], [-1, 0]], slides: [] },
  'S': { steps: [[1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]], slides: [] },
  'N': { steps: [[2, 1], [2, -1]], slides: [] },
  'L': { steps: [], slides: [[1, 0]] },
  'R': { steps: [], slides: [[1, 0], [-1, 0], [0, 1], [0, -1]] },
  'B': { steps: [], slides: [[1, 1], [1, -1], [-1, 1], [-1, -1]] },
  '+P': 'G', '+L': 'G', '+N': 'G', '+S': 'G',
  '+R': { steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]], slides: [[1, 0], [-1, 0], [0, 1], [0, -1]] },
  '+B': { steps: [[1, 0], [-1, 0], [0, 1], [0, -1]], slides: [[1, 1], [1, -1], [-1, 1], [-1, -1]] }
};

export class Shogi {
  constructor(sfen = DEFAULT_POSITION) {
    this.board = new Array(9).fill(null).map(() => new Array(9).fill(null));
    this.turn = 'b'; // 'b' = Siyah (Sente), 'w' = Beyaz (Gote)
    this.hands = { b: {}, w: {} };
    this.moveNumber = 1;
    this.load(sfen);
  }

  load(sfen) {
    const [position, turn, hands, moveNum] = sfen.split(' ');
    this.turn = turn;
    this.moveNumber = parseInt(moveNum, 10) || 1;

    let rows = position.split('/');
    for (let r = 0; r < 9; r++) {
      let c = 0;
      let i = 0;
      while (i < rows[r].length) {
        let char = rows[r][i];
        if (char === '+') {
          this.board[r][c] = '+' + rows[r][i + 1];
          i += 2;
          c++;
        } else if (isNaN(char)) {
          this.board[r][c] = char;
          i++;
          c++;
        } else {
          let emptyCount = parseInt(char, 10);
          c += emptyCount;
          i++;
        }
      }
    }

    this.hands = { b: {}, w: {} };
    if (hands !== '-') {
      let count = 1;
      for (let i = 0; i < hands.length; i++) {
        let char = hands[i];
        if (!isNaN(char)) {
          count = parseInt(char, 10);
        } else {
          let color = char === char.toUpperCase() ? 'b' : 'w';
          this.hands[color][char.toUpperCase()] = count;
          count = 1;
        }
      }
    }
  }

  sqToPos(square) {
    return {
      row: square.charCodeAt(1) - 97,
      col: 9 - parseInt(square[0], 10)
    };
  }

  posToSq(row, col) {
    return `${9 - col}${String.fromCharCode(97 + row)}`;
  }

  isPromotionZone(row, color) {
    return color === 'b' ? row <= 2 : row >= 6;
  }

  getPieceRule(pieceName) {
    let rule = PIECE_RULES[pieceName];
    if (typeof rule === 'string') return PIECE_RULES[rule];
    return rule;
  }

  movesForSquare(square) {
    const pos = this.sqToPos(square);
    const pieceStr = this.board[pos.row][pos.col];
    if (!pieceStr) return [];

    const isBlack = pieceStr === pieceStr.toUpperCase();
    const dir = isBlack ? -1 : 1;
    const pieceName = pieceStr.toUpperCase();
    const rule = this.getPieceRule(pieceName);
    let validMoves = [];

    const addMove = (targetRow, targetCol) => {
      if (targetRow < 0 || targetRow > 8 || targetCol < 0 || targetCol > 8) return false;
      const targetPiece = this.board[targetRow][targetCol];
      const isTargetEmpty = !targetPiece;
      const isTargetEnemy = targetPiece && (targetPiece === targetPiece.toUpperCase()) !== isBlack;

      if (isTargetEmpty || isTargetEnemy) {
        const moveSq = this.posToSq(targetRow, targetCol);
        let canPromote = false;

        if (!pieceName.startsWith('+') && !['K', 'G'].includes(pieceName)) {
          if (this.isPromotionZone(targetRow, isBlack ? 'b' : 'w') || this.isPromotionZone(pos.row, isBlack ? 'b' : 'w')) {
            canPromote = true;
          }
        }

        let isMandatory = false;
        if (['P', 'L'].includes(pieceName) && (targetRow === (isBlack ? 0 : 8))) isMandatory = true;
        if (pieceName === 'N' && (isBlack ? targetRow <= 1 : targetRow >= 7)) isMandatory = true;

        if (isMandatory) {
          validMoves.push({ from: square, to: moveSq, promote: true });
        } else {
          validMoves.push({ from: square, to: moveSq });
          if (canPromote) validMoves.push({ from: square, to: moveSq, promote: true });
        }
        return isTargetEmpty;
      }
      return false;
    };

    if (rule.steps) {
      for (let [dRow, dCol] of rule.steps) addMove(pos.row + (dRow * dir), pos.col + dCol);
    }
    if (rule.slides) {
      for (let [dRow, dCol] of rule.slides) {
        let currentRow = pos.row + (dRow * dir);
        let currentCol = pos.col + dCol;
        while (addMove(currentRow, currentCol)) {
          currentRow += (dRow * dir);
          currentCol += dCol;
        }
      }
    }
    return validMoves;
  }

  getDrops(color = this.turn) {
    const validDrops = [];
    const hand = this.hands[color];
    for (const piece in hand) {
      if (hand[piece] > 0) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (this.board[r][c] === null) {
              if (['P', 'L'].includes(piece) && r === (color === 'b' ? 0 : 8)) continue;
              if (piece === 'N' && (color === 'b' ? r <= 1 : r >= 7)) continue;

              if (piece === 'P') {
                let hasUnpromotedPawn = false;
                for (let checkRow = 0; checkRow < 9; checkRow++) {
                  if (this.board[checkRow][c] === (color === 'b' ? 'P' : 'p')) {
                    hasUnpromotedPawn = true;
                    break;
                  }
                }
                if (hasUnpromotedPawn) continue;
              }
              validDrops.push({ piece: piece, to: this.posToSq(r, c) });
            }
          }
        }
      }
    }
    return validDrops;
  }

  findKing(color) {
    const kingStr = color === 'b' ? 'K' : 'k';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] === kingStr) return { row: r, col: c };
      }
    }
    return null;
  }

  isSquareAttacked(row, col, attackerColor) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && (attackerColor === 'b') === (piece === piece.toUpperCase())) {
          const moves = this.movesForSquare(this.posToSq(r, c));
          if (moves.some(m => m.to === this.posToSq(row, col))) return true;
        }
      }
    }
    return false;
  }

  inCheck(color = this.turn) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, color === 'b' ? 'w' : 'b');
  }

  _cloneState() {
    return {
      board: this.board.map(row => [...row]),
      hands: { b: { ...this.hands.b }, w: { ...this.hands.w } },
      turn: this.turn
    };
  }

  _restoreState(state) {
    this.board = state.board;
    this.hands = state.hands;
    this.turn = state.turn;
  }

  _makeInternalMove(move) {
    const turnColor = this.turn;
    if (move.piece) {
      const { row, col } = this.sqToPos(move.to);
      this.board[row][col] = turnColor === 'b' ? move.piece : move.piece.toLowerCase();
      this.hands[turnColor][move.piece]--;
    } else {
      const fromPos = this.sqToPos(move.from);
      const toPos = this.sqToPos(move.to);
      const pieceStr = this.board[fromPos.row][fromPos.col];
      const targetStr = this.board[toPos.row][toPos.col];

      if (targetStr) {
        const captured = targetStr.replace('+', '').toUpperCase();
        this.hands[turnColor][captured] = (this.hands[turnColor][captured] || 0) + 1;
      }
      this.board[toPos.row][toPos.col] = move.promote ? '+' + pieceStr.replace('+', '') : pieceStr;
      this.board[fromPos.row][fromPos.col] = null;
    }
  }

  moves(options = { verbose: false }) {
    const color = this.turn;
    const opponentColor = color === 'b' ? 'w' : 'b';
    let pseudoMoves = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && (piece === piece.toUpperCase() === (color === 'b'))) {
          pseudoMoves.push(...this.movesForSquare(this.posToSq(r, c)));
        }
      }
    }
    pseudoMoves.push(...this.getDrops(color));

    const legalMoves = [];
    for (const move of pseudoMoves) {
      const savedState = this._cloneState();
      this._makeInternalMove(move);
      const isKingExposed = this.inCheck(color);
      let isUchifuzume = false;

      if (!isKingExposed && move.piece === 'P') {
        if (this.inCheck(opponentColor)) {
          this.turn = opponentColor;
          if (!this.hasAnyLegalMove(opponentColor)) isUchifuzume = true;
        }
      }
      this._restoreState(savedState);

      if (!isKingExposed && !isUchifuzume) {
        legalMoves.push(move);
      }
    }

    if (options.verbose) return legalMoves;
    return legalMoves.map(m => m.piece ? `${m.piece}*${m.to}` : `${m.from}-${m.to}${m.promote ? '+' : ''}`);
  }

  hasAnyLegalMove(color) {
    const savedTurn = this.turn;
    this.turn = color;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && (piece === piece.toUpperCase() === (color === 'b'))) {
          const pseudo = this.movesForSquare(this.posToSq(r, c));
          for (let m of pseudo) {
            const state = this._cloneState();
            this._makeInternalMove(m);
            if (!this.inCheck(color)) {
              this._restoreState(state);
              this.turn = savedTurn;
              return true;
            }
            this._restoreState(state);
          }
        }
      }
    }
    this.turn = savedTurn;
    return false;
  }

  move(moveObj) {
    const legalMoves = this.moves({ verbose: true });
    const isLegal = legalMoves.find(m =>
      (m.piece && m.piece === moveObj.piece && m.to === moveObj.to) ||
      (m.from === moveObj.from && m.to === moveObj.to && !!m.promote === !!moveObj.promote)
    );

    if (isLegal) {
      this._makeInternalMove(isLegal);
      this.turn = this.turn === 'b' ? 'w' : 'b';
      if (this.turn === 'b') this.moveNumber++;
      return true;
    }
    return false;
  }

  inCheckmate() {
    return this.inCheck(this.turn) && !this.hasAnyLegalMove(this.turn);
  }

  isGameOver() {
    return this.inCheckmate();
  }
}