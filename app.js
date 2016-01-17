'use strict';

/**
 * module dependencies
 */

global.Promise = require('bluebird');
const request = require('superagent');
const Request = request.Request;
Request.prototype.endAsync = Promise.promisify(Request.prototype.end);
const cheerio = require('cheerio');
const debug = require('debug')('pm25:app');
const _ = require('lodash');

/**
 * consts
 */

const apiToken = '5j1znBVAsnSf5xQyNQyq';
const pm25ChinaUrl = 'http://www.pm25.com/city/beijing.html';

const queryPm25In = async function() {
  const list = await request
    .get('http://www.pm25.in/api/querys/pm2_5.json')
    .query({
      city: 'beijing',
      token: apiToken
    })
    .timeout(5000)
    .endAsync()
    .then(res => res.body);

  // error
  if (list.error) throw new Error(list.error);
  if (!list || !list.length) throw new Error('获取数据失败!');

  return {
    overview: list.slice(-1), // 城市平均
    detail: list.slice(0, -1) // 监测点详细
  };
};

const getHtml = async function(url) {
  return await request
    .get(url)
    .endAsync()
    .then(res => res.text);
};

const queryPm25China = async function() {
  const html = await getHtml(pm25ChinaUrl);
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
};

(async function run() {
  const res = await queryPm25China();
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
})().catch(e => console.error(e.stack || e));