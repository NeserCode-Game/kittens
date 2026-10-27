import declareSource from "../upstream/compat/dojo-declare.js?raw";
import jquerySource from "../upstream/compat/jquery.js?raw";
import lzStringSource from "../upstream/compat/lz-string.js?raw";
import configSource from "../upstream/config.js?raw";
import coreSource from "../upstream/core.js?raw";
import gameSource from "../upstream/game.js?raw";
import achievementsSource from "../upstream/js/achievements.js?raw";
import buildingsSource from "../upstream/js/buildings.js?raw";
import calendarSource from "../upstream/js/calendar.js?raw";
import challengesSource from "../upstream/js/challenges.js?raw";
import diplomacySource from "../upstream/js/diplomacy.js?raw";
import mathSource from "../upstream/js/math.js?raw";
import prestigeSource from "../upstream/js/prestige.js?raw";
import previewSource from "../upstream/js/preview.js?raw";
import religionSource from "../upstream/js/religion.js?raw";
import resourcesSource from "../upstream/js/resources.js?raw";
import scienceSource from "../upstream/js/science.js?raw";
import settingsSource from "../upstream/js/settings.js?raw";
import spaceSource from "../upstream/js/space.js?raw";
import statsSource from "../upstream/js/stats.js?raw";
import timeSource from "../upstream/js/time.js?raw";
import villageSource from "../upstream/js/village.js?raw";
import voidSource from "../upstream/js/void.js?raw";
import workshopSource from "../upstream/js/workshop.js?raw";
import en from "../upstream/res/i18n/crowdin/en.json";
import zh from "../upstream/res/i18n/crowdin/zh.json";
import versionJson from "../upstream/version.json?raw";
import { zhOverrides } from "./zh-overrides";

const LOGIC_SOURCES = [
  resourcesSource,
  calendarSource,
  buildingsSource,
  villageSource,
  scienceSource,
  workshopSource,
  diplomacySource,
  religionSource,
  achievementsSource,
  settingsSource,
  spaceSource,
  prestigeSource,
  timeSource,
  statsSource,
  challengesSource,
  voidSource,
  mathSource,
  previewSource,
  gameSource,
];

const ENGINE_CODE = `
var engineProps = {
  document: sandbox.document,
  localStorage: sandbox.storage,
  location: sandbox.window.location,
  navigator: sandbox.window.navigator,
  performance: sandbox.window.performance,
  setTimeout: sandbox.window.setTimeout.bind(sandbox.window),
  clearTimeout: sandbox.window.clearTimeout.bind(sandbox.window),
  setInterval: sandbox.window.setInterval.bind(sandbox.window),
  clearInterval: sandbox.window.clearInterval.bind(sandbox.window),
  requestAnimationFrame: sandbox.window.requestAnimationFrame.bind(sandbox.window),
  cancelAnimationFrame: sandbox.window.cancelAnimationFrame.bind(sandbox.window),
  addEventListener: sandbox.window.addEventListener.bind(sandbox.window),
  removeEventListener: sandbox.window.removeEventListener.bind(sandbox.window),
  dispatchEvent: sandbox.window.dispatchEvent.bind(sandbox.window),
  URL: sandbox.window.URL,
  Blob: sandbox.window.Blob,
  Worker: sandbox.window.Worker
};
var engineWindow = new Proxy(engineProps, {
  get: function(target, property) {
    if (property in target) return target[property];
    var value = sandbox.window[property];
    return typeof value === "function"
      ? value.bind(sandbox.window)
      : value;
  },
  set: function(target, property, value) {
    target[property] = value;
    return true;
  }
});
engineProps.window = engineWindow;
engineProps.self = engineWindow;
engineProps.top = engineWindow;
engineProps.parent = engineWindow;
var window = engineWindow;
var document = sandbox.document;
var navigator = sandbox.window.navigator;
var location = sandbox.window.location;
var LCstorage = sandbox.storage;
var module = { exports: {} };
var exports = module.exports;

${jquerySource}
var $ = module.exports;
var jQuery = $;
window.jQuery = $;
window.$ = $;

module = { exports: {} };
exports = module.exports;
${lzStringSource}
var LZString = module.exports;
window.LZString = LZString;

module = { exports: {} };
exports = module.exports;
${declareSource}
var createDojo = module.exports;

var namespace = { com: {}, classes: {}, mixin: {} };
var dojo = createDojo(namespace);
var com = namespace.com;
var classes = namespace.classes;
var mixin = namespace.mixin;

dojo.version = { minor: 6 };
dojo.isIE = false;
dojo.byId = function() { return null; };
dojo.destroy = function() {};
dojo.empty = function() {};
dojo.create = function() { return null; };
dojo.style = function() {};
dojo.place = function() {};
dojo.attr = function() {};
dojo.forEach = function(items, callback) {
  for (var index in items) {
    callback(items[index], index, items);
  }
};
dojo.some = function(items, callback) {
  for (var index in items) {
    if (callback(items[index], index, items)) return true;
  }
  return false;
};
dojo.map = function(items, callback) {
  var result = [];
  for (var index in items) {
    result.push(callback(items[index], index, items));
  }
  return result;
};
dojo.clone = function(value) {
  if (Array.isArray(value)) return value.map(dojo.clone);
  if (value && typeof value === "object") return Object.assign({}, value);
  return value;
};
dojo.hitch = function(context, method) {
  return function() {
    return method.apply(context, arguments);
  };
};
dojo.partial = function(method) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    return method.apply(this, args.concat(Array.prototype.slice.call(arguments)));
  };
};
dojo.connect = function() { return {}; };
dojo.disconnect = function() {};
dojo.publish = function() {};
dojo.subscribe = function() { return {}; };
dojo.unsubscribe = function() {};
dojo.mixin = function(target) {
  for (var index = 1; index < arguments.length; index++) {
    Object.assign(target, arguments[index]);
  }
  return target;
};
dojo.Deferred = function() {
  var state = "pending";
  var result;
  var handlers = [];

  function settle(nextState, value) {
    if (state !== "pending") return;
    state = nextState;
    result = value;
    var pending = handlers.splice(0);
    for (var index = 0; index < pending.length; index++) {
      pending[index]();
    }
  }

  function attach(callback, errback) {
    function run() {
      var handler = state === "resolved" ? callback : errback;
      if (typeof handler === "function") handler(result);
    }
    if (state === "pending") handlers.push(run);
    else run();
  }

  this.callback = function(value) {
    settle("resolved", value);
    return this;
  };
  this.errback = function(value) {
    settle("rejected", value);
    return this;
  };
  this.resolve = this.callback;
  this.reject = this.errback;
  this.addCallback = function(callback) {
    attach(callback, null);
    return this;
  };
  this.addErrback = function(errback) {
    attach(null, errback);
    return this;
  };
  this.addBoth = function(callback) {
    attach(callback, callback);
    return this;
  };
  this.addCallbacks = function(callback, errback) {
    attach(callback, errback);
    return this;
  };
  this.then = function(callback, errback) {
    var next = new dojo.Deferred();
    attach(
      function(value) {
        try {
          var nextValue = typeof callback === "function" ? callback(value) : value;
          if (nextValue && typeof nextValue.then === "function") {
            nextValue.then(
              function(chainedValue) { next.callback(chainedValue); },
              function(error) { next.errback(error); }
            );
          } else {
            next.callback(nextValue);
          }
        } catch (error) {
          next.errback(error);
        }
      },
      function(error) {
        if (typeof errback !== "function") {
          next.errback(error);
          return;
        }
        try {
          next.callback(errback(error));
        } catch (nextError) {
          next.errback(nextError);
        }
      }
    );
    return next;
  };
  this.cancel = function() {
    this.errback(new Error("Deferred cancelled"));
    return this;
  };
};

window.classes = classes;
window.com = com;
window.mixin = mixin;
window.dojo = dojo;
window.LCstorage = LCstorage;
window.KGVersion = JSON.parse(sandbox.versionJson);

var dictionaries = sandbox.dictionaries;
var locale = sandbox.locale === "zh" ? "zh" : "en";
var activeDictionary = dictionaries[locale] || dictionaries.en;
var fallbackDictionary = dictionaries.en || {};
var i18nLang = {
  lang: locale,
  getLanguage: function() { return locale; },
  setLanguage: function(nextLocale) { locale = nextLocale; activeDictionary = dictionaries[nextLocale] || fallbackDictionary; i18nLang.lang = nextLocale; }
};
var interpolate = function(template, args) {
  if (!args) return template;
  return template.replace(/\\{(\\d+)\\}/g, function(match, index) {
    return String(args[Number(index)] ?? match);
  });
};
var $I = function(key, args) {
  var template = activeDictionary[key] ?? fallbackDictionary[key] ?? key;
  return interpolate(String(template), args);
};
window.$I = $I;
window.i18nLang = i18nLang;

${configSource}
${coreSource}
${LOGIC_SOURCES.join("\n")}

dojo.declare("classes.ui.UISystem", null, {
  game: null,
  defaultSchemes: ["default"],
  allSchemes: ["default"],
  setGame: function(game) { this.game = game; },
  render: function() {},
  update: function() {},
  updateOptions: function() {},
  unlockScheme: function() {},
  relockSchemes: function() {},
  notifyLogEvent: function() {},
  confirm: function(title, message, callbackOk) { if (callbackOk) callbackOk(); },
  openPopupPage: function() {},
  pulse: function() {},
  displayAutosave: function() {},
  resetConsole: function() {},
  renderFilters: function() {},
  renderConsoleLog: function() {},
  saveExport: function() {},
  observeCallback: function() {},
  observeClear: function() {},
  updateCalendar: function() {},
  updateLanguage: function() {},
  updateNotation: function() {},
  load: function() {},
  save: function() {},
  isEffectMultiplierEnabled: function() { return false; },
  formatStackRow: function(label, value) { return label + " " + value; },
  checkForUpdates: function() {}
});

return {
  namespace: namespace,
  gameClass: classes.ui === undefined ? null : com.nuclearunicorn.game.ui.GamePage,
  i18nLang: i18nLang,
  translate: $I
};
`;

interface Namespace {
  [key: string]: unknown;
  com: Record<string, unknown>;
  classes: Record<string, unknown>;
}

interface EngineContext {
  namespace: Namespace;
  gameClass: new (...args: unknown[]) => Record<string, unknown>;
  translate: (key: string, args?: Array<string | number>) => string;
}

const engineContexts = new Map<string, EngineContext>();

export function getEngineContext(locale = "zh"): EngineContext {
  const normalizedLocale = locale === "en" ? "en" : "zh";
  const existing = engineContexts.get(normalizedLocale);
  if (existing) return existing;

  const createEngine = new Function("sandbox", ENGINE_CODE) as (sandbox: {
    window: Window;
    document: Document;
    storage: Storage;
    versionJson: string;
    dictionaries: Record<string, Record<string, string>>;
    locale: string;
  }) => EngineContext;

  const engineContext = createEngine({
    window,
    document,
    storage: window.localStorage,
    versionJson,
    dictionaries: { en, zh: { ...zh, ...zhOverrides } },
    locale: normalizedLocale,
  });

  engineContexts.set(normalizedLocale, engineContext);
  return engineContext;
}
