'use strict';

/**
 * module dependencies
 */

global.Promise = require('bluebird');
const request = require('superagent');
const cheerio = require('cheerio');
const debug = require('debug')('pm25:app');
const _ = require('lodash');
const co = require('co');

/**
 * Promise patch
 */

const Request = request.Request;
Request.prototype.endAsync = Promise.promisify(Request.prototype.end);

/**
 * consts
 */

const pm25ComUrl = 'http://www.pm25.com/city/beijing.html';

const getHtml = co.wrap(function*(url) {
  return yield request
    .get(url)
    .endAsync()
    .then(res => res.text);
});

const queryPm25China = co.wrap(function*() {
  const html = yield getHtml(pm25ComUrl);
  const $ = cheerio.load(html, {
    normalizeWhitespace: true
  });
  const ret = {};

  // 概览
  ret.overview = {
    station: $('.city_name').text(),
    aqi: $('.citydata_banner_opacity > .cbo_left > .cbol_aqi > .cbol_aqi_num').text(),
    pm25: $('div.citydata_banner_opacity > div.cbo_left > div.cbol_nongdu > a.cbol_nongdu_num > span.cbol_nongdu_num_1').text(),
    status: $('div.citydata_banner_opacity > div.cbo_right > div.cbor_gauge > span').text()
  };

  // 详细
  ret.detail = $('.pj_area_data_details').eq(0).children('li')
    .map(function() {
      return {
        station: $(this).find('.pjadt_location').text(),
        aqi: $(this).find('.pjadt_aqi').text(),
        pm25: $(this).find('.pjadt_pm25').text().replace(/^(\d+)[\s\S]*?$/, '$1'),
        status: $(this).find('.pjadt_quality').text()
      };
    })
    .get();

  return ret;
});

co(function* run() {
  const res = yield queryPm25China();
  debug('API query done');

  const overview = res.overview;
  const detail = res.detail;

  // overview
  console.log(`${ overview.station } - ${ overview.status }`);
  console.log('---');

  console.log(`${ overview.station } - ${ overview.status } - AQI:${ overview.aqi } - PM2.5:${ overview.pm25 }`);
  console.log('---');

  // log
  for (let item of detail) {
    console.log(`${ item.station } - ${ item.status } - AQI:${ item.aqi } - PM2.5:${ item.pm25 }`);
  }
}).catch(e => console.error(e.stack || e));