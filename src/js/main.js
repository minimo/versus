/*
 *  main.js
 */

phina.globalize();

const FULL_WIDTH = 750;
const FULL_HEIGHT = 1334;
const FULL_WIDTH_HALF = FULL_WIDTH * 0.5;
const FULL_HEIGHT_HALF = FULL_HEIGHT * 0.5;

const LAYOUT_WIDTH = 375 * 2;
const LAYOUT_HEIGHT = 667 * 2;

const SCREEN_WIDTH = LAYOUT_WIDTH;
const SCREEN_HEIGHT = LAYOUT_HEIGHT;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

const API_MOCK_FORSE = false;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });
