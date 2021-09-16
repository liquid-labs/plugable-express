'use strict';

require('express-async-handler');
var express = require('express');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var express__default = /*#__PURE__*/_interopDefaultLegacy(express);

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var defineProperty = createCommonjsModule(function (module) {
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty;
module.exports["default"] = module.exports, module.exports.__esModule = true;
});

var _defineProperty = unwrapExports(defineProperty);

var DEFAULT_PORT = 32600; // this number are the ASCII codes for 'l', 'i', and 'q' summed and multiplied by 100. :)
// option canstant

var LIQ_PORT = 'LIQ_PORT';

var defaults = _defineProperty({}, LIQ_PORT, "".concat(DEFAULT_PORT));

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var bindConfigSources = function bindConfigSources(sources) {
  // TODO: if not defined in options, look in env. Otherwise, look at defaults'
  var _getConfigurableValue = function getConfigurableValue(name) {
    var _iterator = _createForOfIteratorHelper(sources),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var source = _step.value;

        if (source[name]) {
          return source[name];
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return undefined;
  };

  return {
    getConfigurableValue: function getConfigurableValue(name) {
      return _getConfigurableValue(name);
    }
  };
};

var startLiqServer = function startLiqServer() {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var config = bindConfigSources([options, defaults]);
  var PORT = config.getConfigurableValue(LIQ_PORT);
  var app = express__default['default']();
  app.listen(PORT, function (err) {
    if (err) {
      console.error("Error while starting server.\n".concat(err));
      return;
    } // else good to go!


    console.log("liq server listening on ".concat(PORT));
    console.log('Press Ctrl+C to quit.');
  });
};

startLiqServer();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlxLXNlcnZlci5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL0BiYWJlbC9ydW50aW1lL2hlbHBlcnMvZGVmaW5lUHJvcGVydHkuanMiLCIuLi9zcmMvbGlxLXNlcnZlci9kZWZhdWx0cy5qcyIsIi4uL3NyYy9saXEtc2VydmVyL2xpYi9jb25maWd1cmFibGVzLmpzIiwiLi4vc3JjL2xpcS1zZXJ2ZXIvbGlxLXNlcnZlci5qcyIsIi4uL3NyYy9saXEtc2VydmVyL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIF9kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSBpbiBvYmopIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIG9ialtrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IF9kZWZpbmVQcm9wZXJ0eTtcbm1vZHVsZS5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IG1vZHVsZS5leHBvcnRzLCBtb2R1bGUuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTsiLCJjb25zdCBERUZBVUxUX1BPUlQ9MzI2MDAgLy8gdGhpcyBudW1iZXIgYXJlIHRoZSBBU0NJSSBjb2RlcyBmb3IgJ2wnLCAnaScsIGFuZCAncScgc3VtbWVkIGFuZCBtdWx0aXBsaWVkIGJ5IDEwMC4gOilcblxuLy8gb3B0aW9uIGNhbnN0YW50XG5jb25zdCBMSVFfUE9SVD0nTElRX1BPUlQnXG5cbmNvbnN0IGRlZmF1bHRzID0ge1xuICBbTElRX1BPUlRdOiBgJHtERUZBVUxUX1BPUlR9YFxufVxuXG5leHBvcnQgeyBkZWZhdWx0cywgTElRX1BPUlQgfVxuIiwiY29uc3QgYmluZENvbmZpZ1NvdXJjZXMgPSAoc291cmNlcykgPT4ge1xuICAvLyBUT0RPOiBpZiBub3QgZGVmaW5lZCBpbiBvcHRpb25zLCBsb29rIGluIGVudi4gT3RoZXJ3aXNlLCBsb29rIGF0IGRlZmF1bHRzJ1xuICBjb25zdCBnZXRDb25maWd1cmFibGVWYWx1ZSA9IChuYW1lKSA9PiB7XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgICAgaWYgKHNvdXJjZVtuYW1lXSkge1xuICAgICAgICByZXR1cm4gc291cmNlW25hbWVdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuICAgIFxuICByZXR1cm4ge1xuICAgIGdldENvbmZpZ3VyYWJsZVZhbHVlOiAobmFtZSkgPT4gZ2V0Q29uZmlndXJhYmxlVmFsdWUobmFtZSlcbiAgfVxufVxuICAgXG5leHBvcnQgeyBiaW5kQ29uZmlnU291cmNlcyB9XG4iLCJpbXBvcnQgYXN5bmNIYW5kbGVyIGZyb20gJ2V4cHJlc3MtYXN5bmMtaGFuZGxlcidcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnXG5cbmltcG9ydCB7IGRlZmF1bHRzLCBMSVFfUE9SVCB9IGZyb20gJy4vZGVmYXVsdHMnXG5pbXBvcnQgeyBiaW5kQ29uZmlnU291cmNlcyB9IGZyb20gJy4vbGliL2NvbmZpZ3VyYWJsZXMnXG5cbmNvbnN0IHN0YXJ0TGlxU2VydmVyID0gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBjb25zdCBjb25maWcgPSBiaW5kQ29uZmlnU291cmNlcyhbb3B0aW9ucywgZGVmYXVsdHNdKVxuICBcbiAgY29uc3QgUE9SVCA9IGNvbmZpZy5nZXRDb25maWd1cmFibGVWYWx1ZShMSVFfUE9SVClcbiAgXG4gIGNvbnN0IGFwcCA9IGV4cHJlc3MoKVxuICBcbiAgYXBwLmxpc3RlbihQT1JULCAoZXJyKSA9PiB7XG4gICAgaWYgKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd2hpbGUgc3RhcnRpbmcgc2VydmVyLlxcbiR7ZXJyfWApXG4gICAgICByZXR1cm5cbiAgICB9IC8vIGVsc2UgZ29vZCB0byBnbyFcbiAgICBcbiAgICBjb25zb2xlLmxvZyhgbGlxIHNlcnZlciBsaXN0ZW5pbmcgb24gJHtQT1JUfWApXG4gICAgY29uc29sZS5sb2coJ1ByZXNzIEN0cmwrQyB0byBxdWl0LicpXG4gIH0pXG59XG5cbmV4cG9ydCB7IHN0YXJ0TGlxU2VydmVyIH1cbiIsImltcG9ydCB7IHN0YXJ0TGlxU2VydmVyIH0gZnJvbSAnLi9saXEtc2VydmVyJ1xuXG5zdGFydExpcVNlcnZlcigpXG4iXSwibmFtZXMiOlsiREVGQVVMVF9QT1JUIiwiTElRX1BPUlQiLCJkZWZhdWx0cyIsImJpbmRDb25maWdTb3VyY2VzIiwic291cmNlcyIsImdldENvbmZpZ3VyYWJsZVZhbHVlIiwibmFtZSIsInNvdXJjZSIsInVuZGVmaW5lZCIsInN0YXJ0TGlxU2VydmVyIiwib3B0aW9ucyIsImNvbmZpZyIsIlBPUlQiLCJhcHAiLCJleHByZXNzIiwibGlzdGVuIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibG9nIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxTQUFTLGVBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUMxQyxFQUFFLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRTtBQUNsQixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUNwQyxNQUFNLEtBQUssRUFBRSxLQUFLO0FBQ2xCLE1BQU0sVUFBVSxFQUFFLElBQUk7QUFDdEIsTUFBTSxZQUFZLEVBQUUsSUFBSTtBQUN4QixNQUFNLFFBQVEsRUFBRSxJQUFJO0FBQ3BCLEtBQUssQ0FBQyxDQUFDO0FBQ1AsR0FBRyxNQUFNO0FBQ1QsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBQ0Q7QUFDQSxjQUFjLEdBQUcsZUFBZSxDQUFDO0FBQ2pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBRSx5QkFBeUIsR0FBRyxJQUFJOzs7OztBQ2hCNUUsSUFBTUEsWUFBWSxHQUFDLEtBQW5CO0FBRUE7O0FBQ0EsSUFBTUMsUUFBUSxHQUFDLFVBQWY7O0FBRUEsSUFBTUMsUUFBUSx1QkFDWEQsUUFEVyxZQUNHRCxZQURILEVBQWQ7Ozs7Ozs7O0FDTEEsSUFBTUcsaUJBQWlCLEdBQUcsU0FBcEJBLGlCQUFvQixDQUFDQyxPQUFELEVBQWE7QUFDckM7QUFDQSxNQUFNQyxxQkFBb0IsR0FBRyxTQUF2QkEsb0JBQXVCLENBQUNDLElBQUQsRUFBVTtBQUFBLCtDQUNoQkYsT0FEZ0I7QUFBQTs7QUFBQTtBQUNyQywwREFBOEI7QUFBQSxZQUFuQkcsTUFBbUI7O0FBQzVCLFlBQUlBLE1BQU0sQ0FBQ0QsSUFBRCxDQUFWLEVBQWtCO0FBQ2hCLGlCQUFPQyxNQUFNLENBQUNELElBQUQsQ0FBYjtBQUNEO0FBQ0Y7QUFMb0M7QUFBQTtBQUFBO0FBQUE7QUFBQTs7QUFNckMsV0FBT0UsU0FBUDtBQUNELEdBUEQ7O0FBU0EsU0FBTztBQUNMSCxJQUFBQSxvQkFBb0IsRUFBRSw4QkFBQ0MsSUFBRDtBQUFBLGFBQVVELHFCQUFvQixDQUFDQyxJQUFELENBQTlCO0FBQUE7QUFEakIsR0FBUDtBQUdELENBZEQ7O0FDTUEsSUFBTUcsY0FBYyxHQUFHLFNBQWpCQSxjQUFpQixHQUFrQjtBQUFBLE1BQWpCQyxPQUFpQix1RUFBUCxFQUFPO0FBQ3ZDLE1BQU1DLE1BQU0sR0FBR1IsaUJBQWlCLENBQUMsQ0FBQ08sT0FBRCxFQUFVUixRQUFWLENBQUQsQ0FBaEM7QUFFQSxNQUFNVSxJQUFJLEdBQUdELE1BQU0sQ0FBQ04sb0JBQVAsQ0FBNEJKLFFBQTVCLENBQWI7QUFFQSxNQUFNWSxHQUFHLEdBQUdDLDJCQUFPLEVBQW5CO0FBRUFELEVBQUFBLEdBQUcsQ0FBQ0UsTUFBSixDQUFXSCxJQUFYLEVBQWlCLFVBQUNJLEdBQUQsRUFBUztBQUN4QixRQUFJQSxHQUFKLEVBQVM7QUFDUEMsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLHlDQUErQ0YsR0FBL0M7QUFDQTtBQUNELEtBSnVCOzs7QUFNeEJDLElBQUFBLE9BQU8sQ0FBQ0UsR0FBUixtQ0FBdUNQLElBQXZDO0FBQ0FLLElBQUFBLE9BQU8sQ0FBQ0UsR0FBUixDQUFZLHVCQUFaO0FBQ0QsR0FSRDtBQVNELENBaEJEOztBQ0pBVixjQUFjOzsifQ==
