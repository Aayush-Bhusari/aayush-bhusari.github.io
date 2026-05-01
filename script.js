// ─────────────────────────────────────────────────────────────
// CAT EASTER EGG (original, unchanged)
// ─────────────────────────────────────────────────────────────

const catBtn       = document.getElementById('cat-btn');
const catContainer = document.getElementById('cat-container');
const catImage     = document.getElementById('cat-image');
const cats = [
    'assets/cat1.jpeg',
    'assets/cat2.jpeg',
    'assets/cat3.jpeg',
    'assets/cat4.jpeg',
    'assets/cat5.jpeg'
];
let lastCatIndex = -1;

catBtn.addEventListener('click', () => {
    let randomIndex;
    do { randomIndex = Math.floor(Math.random() * cats.length); }
    while (randomIndex === lastCatIndex);
    lastCatIndex = randomIndex;

    catContainer.style.opacity = '0';
    setTimeout(() => {
        catImage.src = cats[randomIndex];
        catImage.onload = () => {
            catContainer.classList.remove('hidden');
            catContainer.style.opacity = '1';
        };
        if (catImage.complete) {
            catContainer.classList.remove('hidden');
            catContainer.style.opacity = '1';
        }
    }, 200);
});


// ─────────────────────────────────────────────────────────────
// CHESS ENGINE — built from scratch
//
// Architecture:
//   1. Piece values + Piece-Square Tables  → position scoring
//   2. evaluate(game)                      → static board score
//   3. orderMoves()                        → captures first (better pruning)
//   4. minimax() + alpha-beta pruning      → search tree
//   5. getBestMove()                       → root move picker
//   6. UI layer                            → board rendering + input
//
// chess.js is used ONLY for legal move generation and game rules.
// All search and evaluation logic is written from scratch here.
// ─────────────────────────────────────────────────────────────


// ── 1. MATERIAL VALUES (centipawns; 100 cp = 1 pawn) ─────────
const CHESS_PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
};

// ── 2. PIECE-SQUARE TABLES ────────────────────────────────────
const CHESS_PST = {
    p: [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0,
    ],
    n: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50,
    ],
    b: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20,
    ],
    r: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0,
    ],
    q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20,
    ],
    k: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20,
    ],
};

function chessSqIdx(sq, color) {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1]) - 1;
    return color === 'w' ? rank * 8 + file : (7 - rank) * 8 + file;
}

// ── 3. STATIC EVALUATION ──────────────────────────────────────
function chessEvaluate(game) {
    if (game.in_stalemate() || game.insufficient_material()) return 0;

    let score = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const p = board[r][f];
            if (!p) continue;
            const sq  = String.fromCharCode(97 + f) + (r + 1);
            const val = CHESS_PIECE_VALUES[p.type];
            const pst = CHESS_PST[p.type][chessSqIdx(sq, p.color)];
            if (p.color === 'w') score += val + pst;
            else                 score -= val + pst;
        }
    }
    return score;
}

// ── 4. MOVE ORDERING ──────────────────────────────────────────
function chessOrderMoves(moves) {
    return moves.slice().sort((a, b) => {
        let sa = 0, sb = 0;
        if (a.flags.includes('c') || a.flags.includes('e')) sa += 200;
        if (b.flags.includes('c') || b.flags.includes('e')) sb += 200;
        if (a.promotion) sa += 180;
        if (b.promotion) sb += 180;
        return sb - sa;
    });
}

// ── 5. MINIMAX + ALPHA-BETA PRUNING ───────────────────────────
function chessMinimax(game, depth, alpha, beta, maximizing) {
    if (game.game_over()) {
        if (game.in_checkmate()) {
            const mateScore = 90000 + depth * 100;
            return game.turn() === 'w' ? -mateScore : mateScore;
        }
        return 0;
    }

    if (depth === 0) return chessEvaluate(game);

    const moves = chessOrderMoves(game.moves({ verbose: true }));

    if (maximizing) {
        let best = -Infinity;
        for (const m of moves) {
            game.move(m);
            best = Math.max(best, chessMinimax(game, depth - 1, alpha, beta, false));
            game.undo();
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            game.move(m);
            best = Math.min(best, chessMinimax(game, depth - 1, alpha, beta, true));
            game.undo();
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

// ── 6. ROOT MOVE PICKER ───────────────────────────────────────
const CHESS_NOISE = 8;

function chessGetBestMove(game, depth = 3) {
    const moves    = chessOrderMoves(game.moves({ verbose: true }));
    const maxing   = game.turn() === 'w';
    let bestMove   = null;
    let bestScore  = maxing ? -Infinity : Infinity;

    for (const m of moves) {
        game.move(m);
        let score = chessMinimax(game, depth - 1, -Infinity, Infinity, !maxing);
        game.undo();

        score += (Math.random() * 2 - 1) * CHESS_NOISE;

        if (maxing ? score > bestScore : score < bestScore) {
            bestScore = score;
            bestMove  = m;
        }
    }
    return bestMove;
}


// ─────────────────────────────────────────────────────────────
// UI LAYER
// ─────────────────────────────────────────────────────────────

// Lichess cburnett piece SVG URLs — proper rendered piece images
// Format: https://lichess1.org/assets/piece/cburnett/{color}{Type}.svg
function chessPieceImg(color, type) {
    const letter = type.toUpperCase(); // p→P, n→N, etc.
    return `https://lichess1.org/assets/piece/cburnett/${color}${letter}.svg`;
}

// Game state
let chessGame;
let chessPlayerColor  = 'w';
let chessSelected     = null;
let chessLegalTargets = [];
let chessLastMove     = null;
let chessMoveHistory  = [];

// ── Called when player clicks White or Black button ───────────
function chessStartGame(color) {
    chessPlayerColor  = color;
    chessGame         = new Chess();
    chessSelected     = null;
    chessLegalTargets = [];
    chessLastMove     = null;
    chessMoveHistory  = [];

    document.getElementById('chessPickerOverlay').classList.remove('show');
    document.getElementById('chessOverlay').classList.remove('show');
    document.getElementById('chessThinking').classList.remove('show');
    document.getElementById('chessHistory').textContent = '';
    chessSetStatus('Your turn');
    chessRenderBoard();

    if (color === 'b') chessEngineMove();
}

// ── Show the color picker again ───────────────────────────────
function chessPickSide() {
    document.getElementById('chessOverlay').classList.remove('show');
    document.getElementById('chessPickerOverlay').classList.add('show');
    document.getElementById('chessThinking').classList.remove('show');
    chessSetStatus('');
}

// ── Rematch: same color, new game ─────────────────────────────
function chessRematch() {
    chessStartGame(chessPlayerColor);
}

// ── Render the board ──────────────────────────────────────────
function chessRenderBoard() {
    const grid = document.getElementById('chessBoard');
    grid.innerHTML = '';

    const ranks = chessPlayerColor === 'w'
        ? [7, 6, 5, 4, 3, 2, 1, 0]
        : [0, 1, 2, 3, 4, 5, 6, 7];
    const files = chessPlayerColor === 'w'
        ? [0, 1, 2, 3, 4, 5, 6, 7]
        : [7, 6, 5, 4, 3, 2, 1, 0];

    for (const r of ranks) {
        for (const f of files) {
            const sq      = String.fromCharCode(97 + f) + (r + 1);
            const isLight = (r + f) % 2 !== 0;
            const cell    = document.createElement('div');
            cell.className = `chess-sq ${isLight ? 'light' : 'dark'}`;
            cell.dataset.sq = sq;

            if (chessLastMove && (sq === chessLastMove.from || sq === chessLastMove.to)) {
                cell.classList.add('lastmove-sq');
            }
            if (chessSelected === sq) cell.classList.add('selected');

            if (chessLegalTargets.includes(sq)) {
                cell.classList.add(chessGame.get(sq) ? 'legal-capture' : 'legal-dot');
            }

            if (f === (chessPlayerColor === 'w' ? 0 : 7)) {
                const lbl = document.createElement('span');
                lbl.className = 'chess-coord-rank';
                lbl.textContent = r + 1;
                cell.appendChild(lbl);
            }
            if (r === (chessPlayerColor === 'w' ? 0 : 7)) {
                const lbl = document.createElement('span');
                lbl.className = 'chess-coord-file';
                lbl.textContent = String.fromCharCode(97 + f);
                cell.appendChild(lbl);
            }

            // Render piece as an <img> using Lichess SVGs
            const piece = chessGame.get(sq);
            if (piece) {
                const img = document.createElement('img');
                img.className = 'chess-piece';
                img.src = chessPieceImg(piece.color, piece.type);
                img.alt = `${piece.color}${piece.type}`;
                img.draggable = false;
                cell.appendChild(img);
            }

            cell.addEventListener('click', () => chessOnSquareClick(sq));
            grid.appendChild(cell);
        }
    }
}

// ── Handle square click ───────────────────────────────────────
function chessOnSquareClick(sq) {
    if (chessGame.turn() !== chessPlayerColor || chessGame.game_over()) return;

    if (chessSelected && chessLegalTargets.includes(sq)) {
        const movingPiece = chessGame.get(chessSelected);

        const promotionRank = chessPlayerColor === 'w' ? '8' : '1';
        const isPromotion   = movingPiece.type === 'p' && sq[1] === promotionRank;

        const move = chessGame.move({
            from: chessSelected,
            to: sq,
            promotion: isPromotion ? 'q' : undefined,
        });

        if (move) {
            chessLastMove     = move;
            chessSelected     = null;
            chessLegalTargets = [];
            chessMoveHistory.push(move.san);
            chessUpdateHistory();
            chessRenderBoard();
            if (chessGame.game_over()) { setTimeout(chessShowOverlay, 1500); return; }
            chessEngineMove();
        }
        return;
    }

    const piece = chessGame.get(sq);
    if (piece && piece.color === chessPlayerColor) {
        chessSelected     = sq;
        chessLegalTargets = chessGame
            .moves({ square: sq, verbose: true })
            .map(m => m.to);
    } else {
        chessSelected     = null;
        chessLegalTargets = [];
    }
    chessRenderBoard();
}

// ── Engine makes its move ─────────────────────────────────────
function chessEngineMove() {
    chessSetStatus('');
    document.getElementById('chessThinking').classList.add('show');

    setTimeout(() => {
        const move = chessGetBestMove(chessGame, 3);
        if (move) {
            chessGame.move(move);
            chessLastMove = move;
            chessMoveHistory.push(move.san);
            chessUpdateHistory();
        }
        document.getElementById('chessThinking').classList.remove('show');
        chessRenderBoard();
        if (chessGame.game_over()) { setTimeout(chessShowOverlay, 1500); return; }
        chessSetStatus('Your turn');
    }, 80);
}

// ── Game over overlay ─────────────────────────────────────────
function chessShowOverlay() {
    const emoji = document.getElementById('chessOverlayEmoji');
    const title = document.getElementById('chessOverlayTitle');
    const sub   = document.getElementById('chessOverlaySub');

    if (chessGame.in_checkmate()) {
        const playerMated = chessGame.turn() === chessPlayerColor;
        emoji.textContent = playerMated ? '😔' : '🏆';
        title.textContent = playerMated ? 'You lose' : 'You win!';
        sub.textContent   = 'Checkmate';
    } else if (chessGame.in_stalemate()) {
        emoji.textContent = '🤝';
        title.textContent = 'Draw';
        sub.textContent   = 'Stalemate';
    } else if (chessGame.insufficient_material()) {
        emoji.textContent = '🤝';
        title.textContent = 'Draw';
        sub.textContent   = 'Insufficient material';
    } else if (chessGame.in_threefold_repetition()) {
        emoji.textContent = '🤝';
        title.textContent = 'Draw';
        sub.textContent   = 'Threefold repetition';
    } else {
        emoji.textContent = '🤝';
        title.textContent = 'Draw';
        sub.textContent   = '';
    }
    document.getElementById('chessOverlay').classList.add('show');
}

function chessSetStatus(msg) {
    document.getElementById('chessStatus').textContent = msg;
}

function chessUpdateHistory() {
    const el = document.getElementById('chessHistory');
    el.textContent = chessMoveHistory
        .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m))
        .join('  ');
    el.scrollLeft = el.scrollWidth;
}
