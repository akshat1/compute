"use strict";!function(r){r("Compute",function(r,e){function n(){var r=Array.prototype.slice.apply(arguments),e=r.pop();if(u._isValid(r,e)){for(var n=!1,t=function(){n||e.apply(null,u._gather(r))},o=0,a=r.length;a>o;o++)r[o].subscribe(t);return{$fire:t,$stop:function(){n=!0},$resume:function(){n=!1}}}throw new Error(l)}function t(){function r(){return t(n.apply(null,arguments)),t}var e=Array.prototype.slice.apply(arguments),n=e.pop();if(u._isValid(e,n)){var t=u.Observable(),a=o.on.apply(this,e.concat([r]));return t._internalChangeHandler=r,t.$fire=a.$fire,t.$stop=a.$stop,t.$resume=a.$resume,t}throw new Error(c)}var o,u=o=e;u.version="0.0.9";var a,i="The argument passed when initializing an observable array must be an array, or null, or undefined.",s="fn must be a function",l="Invalid arguments to OnChange",c="Invalid arguments to From",b="function"==typeof Array.isArray?Array.isArray.bind(Array):function(r){return r instanceof Array||"[object Array]"===Object.prototype.toString.call(r)};u._knockoutFound=function(r){u.Observable=r.observable,u.ObservableArray=r.observableArray,u.isObservable=r.isObservable,u.unwrap=r.unwrap},u._noKnockoutFound=function(){u.isObservable=function(r){return r._isObservable||!1},u.unwrap=function(r){return r.state.value},u._computeSubscribe=function(r,e){if("function"!=typeof e)throw new Error(s);r.subscriptions.push(e)},u._computeCallSubscribers=function(r){for(var e=r.subscriptions,n=r.value,t=0,o=e.length;o>t;t++)e[t](n)},u._computeObservableCall=function(r,e){if("undefined"==typeof e)return r.value;if(r.isArray&&!b(e))throw new Error(i);var n=e!==r.value;r.value=e,n&&u._computeCallSubscribers(r)},u._computeObservable=function(r,e){if(e&&null!==r&&"undefined"!=typeof r&&!b(r))throw new Error(i);var n={value:e?r||[]:r,subscriptions:[],isArray:e},t=function(r){return u._computeObservableCall(n,r)};return t.state=n,t.subscribe=function(r){u._computeSubscribe(n,r)},t._isObservable=!0,e&&(t.push=function(){for(var r=Array.prototype.slice.apply(arguments),e=0,t=r.length;t>e;e++)n.value.push(r[e]);return u._computeCallSubscribers(n),n.value.length},t.pop=function(){var r=n.value;if(0!==r.length){var e=n.value.pop();return e&&u._computeCallSubscribers(n),e}}),t},u.Observable=u._computeObservable,u.ObservableArray=function(r){return u._computeObservable(r,!0)}};try{a=r("knockout")||r("ko"),a?u._knockoutFound(a):u._noKnockoutFound(a)}catch(f){u._noKnockoutFound()}u._isValid=function(r,e){if(u.isObservable(e))return!1;if("function"!=typeof e)return!1;for(var n=0,t=r.length;t>n;n++)if(!u.isObservable(r[n]))return!1;return!0},u._gather=function(r){for(var e=[],n=0,t=r.length;t>n;n++)e.push(u.unwrap(r[n]));return e},u._unwrap=u.unwrap,e.o=u.Observable,e.oa=u.ObservableArray,e.on=n,e.from=t,e[c]=c,e[s]=s,e[l]=l,e[i]=i})}("function"==typeof define&&define.amd?define:function(r,e){"undefined"!=typeof exports?e(require,exports):e(function(r){return window[r]},window[r]={})});