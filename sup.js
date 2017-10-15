
'use strict';

const request = require('request');
const cheerio = require('cheerio');
const _ = require('lodash');
const opn = require('opn');
const async = require('async');
const player = require('play-sound')({});

const REQUEST_INTERVAL = 100;
const SUPREME = 'http://www.supremenewyork.com';
const SUPREME_ALL = SUPREME + '/shop/all';
const SUPREME_SHOP = 'http://www.supremenewyork.com/shop/';

let map = {};
let count = 0;

console.log('**************STARTED***************');
alert();

poll();

function poll() {
  // const startDate = Date.now();
  async.auto({
    request: cb => request(SUPREME_ALL, (err, response, body) => cb(err, body)),
    process: ['request', (results, cb) => process(results.request, cb)]
  }, (err, results) => {
    if(err) { console.log(count, err); }
    const newShit = results.process;
    // console.log('' + count + ': ' + (Date.now() - startDate) + ' ms');
    if(count++ > 0 && !_.isEmpty(newShit)) {
      console.log('New Shit\'s Dropped');
      console.log(newShit);
      alert();
      open(newShit);
    }
    return setTimeout(poll, REQUEST_INTERVAL);
  });
}

function alert() {
  player.play('./alert.mp3', (err) => {if(err) {console.log('Error playing sound', err);}});
}

function open(styles) {
  _.each(styles, (s) => {
    opn(s.url, 'chrome');
  });
}

function process(body, callback) {
  const $ = cheerio.load(body);
  const articles = $('#container article');
  const inStock = getInStocks($, articles);

  getStatus(inStock, (err, newMap) => {
    if(err) { return callback(err); }
    callback(err, update(newMap));
  });
}

function update(newMap) {
  const newShit = [];
  _.each(newMap, (v, k) => {
    if(!_.has(map, k)) {
      newShit.push(v);
    }
  });
  map = newMap;
  return newShit;
}

function getStatus(inStock, callback) {
  const newMap = {};
  async.each(inStock, (article, cb) => {
    request(article.url, (err, response, body) => {
      if(err) { return cb(err); }
      const $ = cheerio.load(body);
      const status = getArticleStatus($);
      _.each(status, (s) => {
        newMap[s.styleId] = s;
      });
      return cb();
    });
  }, (err) => callback(err, newMap));
}

function getArticleStatus($) {
  const styles = $('#details ul li');
  return getStylesInStock($, styles);
}

function getInStocks($, articles) {
  const inStock = [];

  articles.each((i, article) => {
    if(isInStock($, article)) {
      inStock.push({
        url: SUPREME + $('a', article).attr('href')
      });
    }
  });

  return inStock;
}

function isInStock($, article) {
  return _.isEmpty($('.sold_out_tag', article));
}

function getStylesInStock($, styles) {
  const inStockStyles = [];
  styles.each((i, style) => {
    const styleInfo = $($('a', style).get(0));
    if(styleInfo.attr('data-sold-out') === 'false') {
      inStockStyles.push({
        styleId: styleInfo.attr('data-style-id'),
        styleName: styleInfo.attr('data-style-name'),
        url: SUPREME + styleInfo.attr('href')
      });
    }
  });
  return inStockStyles;
}