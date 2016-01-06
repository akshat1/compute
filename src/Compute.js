/**
* @namespace Compute
*/

'use strict';

// UMD pattern copied from https://addyosmani.com/writing-modular-js/
(function(define) {
  define('Compute', function(require, exports) {
    // BEGIN DEFINITION
    var C = Compute = exports;
    var MSGInvalidArgumentsToObservableArray = 'The argument passed when initializing an observable array must be an array, or null, or undefined.';
    var MSGInvalidArgumentToSubscribe        = 'fn must be a function';
    var MSGInvalidArgumentToOnChange         = 'Invalid arguments to OnChange';
    var MSGInvalidArgumentToFrom             = 'Invalid arguments to From';
    var ko,
        on,
        from;

    /**
     * Determine whether or not the object is an Array. Uses Array.isArray if available, failing
     * which uses Object.toString.
     * @see http://web.mit.edu/jwalden/www/isArray.html
     * @param {Object} obj - The object to be tested
     * @returns {boolean} - whether or not the object is an Array
     */
    var isArray = (typeof Array.isArray === 'function') ? Array.isArray.bind(Array) : function isArray(obj) {
      return (obj instanceof Array || (Object.prototype.toString.call(obj) === '[object Array]'))
    }


    /* ****************************************************************************
     * Implement observables unless knockout is present; In which case we create
     * proxies around knockout's observables (for use within our module).
     * ****************************************************************************/
    C._knockoutFound = function _knockoutFound(ko) {
      C.Observable      = ko.observable;
      C.ObservableArray = ko.observableArray;
      C.isObservable    = ko.isObservable;
      C.unwrap          = ko.unwrap;
    }

    C._noKnockoutFound = function _noKnockoutFound() {
      // No knockout. Use our own observables.
      C.isObservable = function computeIsObservable(obj) {
        return obj._isObservable || false;
      }

      C.unwrap = function computeUnwrap(obj) {
        return obj.state.value;
      }

      C._computeSubscribe = function _computeSubscribe(state, fn) {
        if (typeof fn !== 'function')
          throw new Error(MSGInvalidArgumentToSubscribe);
        state.subscriptions.push(fn);
      }

      C._computeCallSubscribers = function _computeCallSubscribers(state) {
        var subscriptions = state.subscriptions;
        var value = state.value;
        for (var i = 0, len = subscriptions.length; i < len; i++) {
          subscriptions[i](value);
        }
      }

      C._computeObservableCall = function _computeObservableCall(state, newValue) {
        if(typeof newValue === 'undefined')
          return state.value;

        if (state.isArray && !isArray(newValue))
          throw new Error(MSGInvalidArgumentsToObservableArray);

        var valueChanged = newValue !== state.value;
        state.value = newValue;
        if (valueChanged)
          C._computeCallSubscribers(state);
      }

      C._computeObservable = function _computeObservable(value, thisIsAnArray) {
        if (thisIsAnArray && value !== null && (typeof value !== 'undefined') && !isArray(value))
          throw new Error(MSGInvalidArgumentsToObservableArray);

        var state = {
          value         : thisIsAnArray ? (value || []) : value,
          subscriptions : [],
          isArray       : thisIsAnArray
        };

        var result = function (newValue) {
          return C._computeObservableCall(state, newValue);
        }

        result.state = state;
        result.subscribe = function (fn) {
          C._computeSubscribe(state, fn);
        }

        result._isObservable = true;
        if (thisIsAnArray) {
          result.push = function computeObservableArrayPush() {
            var newItems = Array.prototype.slice.apply(arguments);
            for (var i = 0, len = newItems.length; i < len; i++) {
              state.value.push(newItems[i]);
            }
            C._computeCallSubscribers(state);
            return state.value.length;
          };

          result.pop = function computeObservableArrayPop() {
            var value = state.value;
            if (value.length === 0)
              return;

            var item = state.value.pop();
            if (item)
              C._computeCallSubscribers(state);
            return item;
          }
        }

        return result;
      };

      C.Observable = C._computeObservable;
      C.ObservableArray = function computeObservableProxyForArray(value) {
        return C._computeObservable(value, true);
      }
    }


    try {
      // We have knockout. Use KO's observables and utilities
      // in node, require('knockout') works while in browser, require('ko')
      ko = require('knockout') || require('ko');
      if (ko)
        C._knockoutFound(ko);
      else
        C._noKnockoutFound(ko);

    } catch (err) {
      C._noKnockoutFound();
    }


    /* ****************************************************************************
     * Implement Compute.on and Compute.from
     * ****************************************************************************/


    /**
     * Ensure that all observables areally are observables and that func is a function.
     * @param {Array} observables
     * @param {function} func
     * @returns {boolean}
     */
    C._isValid = function _isValid(observables, func) {
      if (C.isObservable(func))
        return false;

      if (typeof func !== 'function')
        return false;

      for (var i = 0, len = observables.length; i < len; i++) {
        if (!C.isObservable(observables[i]))
          return false;
      }

      return true;
    }

    /**
     * given an array of observables, return their values as an array
     * @param {Array} observables - The observables to be evaluated
     * @returns {Array} - Values of observables in observables array
     */
    C._gather = function _gather(observables) {
      var values = [];
      for (var i = 0, len = observables.length; i < len; i++) {
        values.push(C.unwrap(observables[i]));
      }
      return values;
    }

    /**
     * call a function whenever the value of specified observables is changed
     * @param {... n - 1} observables - The observables to be monitored
     * @param {function} handler - The function to be called
     */
    function computeOnChange() {
      var observables = Array.prototype.slice.apply(arguments);
      var handler = observables.pop();
      if (C._isValid(observables, handler)) {
        var stopped = false;
        var internalOnChangeHandler = function internalOnChangeHandler() {
          if (!stopped)
            handler.apply(null, C._gather(observables));
        }

        for (var i = 0, len = observables.length; i < len; i++)
          observables[i].subscribe(internalOnChangeHandler);

        return {
          $fire: internalOnChangeHandler,
          $stop: function() {
            stopped = true;
          },
          $resume: function() {
            stopped = false;
          }
        };
      } else {
        throw new Error(MSGInvalidArgumentToOnChange);
      }
    }

    /**
     * Given a set of observables, and a compute function, return a new observable
     * which gets its value from the compute function and the value of each source
     * observable. Update the value of this observable every time one of the
     * observables changes.
     * @param {... n - 1} observables - The observables to be monitored
     * @param {function} handler - The function to be called
     */
    function computeFrom() {
      var observables = Array.prototype.slice.apply(arguments);
      var handler = observables.pop();
      if (C._isValid(observables, handler)) {
        var newObservable = C.Observable();
        function internalOnChangeHandlerForFrom() {
          newObservable(handler.apply(null, arguments));
          return newObservable;
        }

        var thunk = Compute.on.apply(this, observables.concat([internalOnChangeHandlerForFrom]));
        newObservable._internalChangeHandler = internalOnChangeHandlerForFrom;
        newObservable.$fire = thunk.$fire;
        newObservable.$stop = thunk.$stop;
        newObservable.$resume = thunk.$resume;
        return newObservable;
      } else {
        throw new Error(MSGInvalidArgumentToFrom);
      }
    }

    /* ****************************************************************************
     * API
     * Export as much as possible to facilitate testing.
     * ****************************************************************************/
     // deprecated exports
     C._unwrap = C.unwrap;

     // current
     exports['o']    = C.Observable;
     exports['oa']   = C.ObservableArray;
     exports['on']   = computeOnChange;
     exports['from'] = computeFrom;

     // Error messages for consuming in tests
     exports[MSGInvalidArgumentToFrom]             = MSGInvalidArgumentToFrom
     exports[MSGInvalidArgumentToSubscribe]        = MSGInvalidArgumentToSubscribe
     exports[MSGInvalidArgumentToOnChange]         = MSGInvalidArgumentToOnChange
     exports[MSGInvalidArgumentsToObservableArray] = MSGInvalidArgumentsToObservableArray
    // END DEFINITION
  });
  // UMD wrapper taken from https://addyosmani.com/writing-modular-js/
}(typeof define === 'function' && define.amd ? define : function (id, factory) {
  // Not in AMD. create a fake define
  if (typeof exports!== 'undefined') {
    // CommonJS
    factory(require, exports);
  } else {
    // Bare browser? Create a global function
    factory(function(value) {
      return window[value];
    }, (window[id] = {}));
  }
}));