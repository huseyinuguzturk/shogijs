# @huguzturk/shogijs ♟️

A modern, zero-dependency Shogi (Japanese Chess) logic and move validation engine for JavaScript, inspired by `chess.js`.

🌍 **Powered by [Şogi Türkiye](https://sogiturkiye.com) - The Turkish Shogi Community**

---

## Features
- **Move Generation & Validation:** Calculates all legal moves for any given board state.
- **Drop Rules Implemented:** Fully supports Shogi drop mechanics, including complex rules like *Nifu* (Double Pawn) and *Uchifuzume* (Pawn Drop Checkmate).
- **Check & Checkmate Detection:** Automatically detects check, checkmate, and game-over states.
- **SFEN Support:** Load and extract board states using standard SFEN (Shogi Forsyth-Edwards Notation).
- **Environment Agnostic:** Works seamlessly in Node.js, React, Vue, or plain HTML files.

## Installation

Install via NPM:

```bash
npm install @huguzturk/shogijs