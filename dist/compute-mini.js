(function(){var n,r,e,t,u,o,i,a,s,f,l=[].slice;if(n={},r="The argument passed when initializing an observable array must be an array, or null, or undefined.","undefined"!=typeof window)window.Compute=n;else if(module){module.exports=n;try{o=require("knockout")}catch(c){u=c}}e=function(n){var r,e,t,u;return u=n,t=[],r=function(){var n,r,e,o;for(o=[],r=0,e=t.length;e>r;r++)n=t[r],o.push(n(u));return o},e=function(n){var e;return arguments.length>0?(e=u!==n,u=n,e?r():void 0):u},e.subscribe=function(n){return t.push(n)},e._isObservable=!0,e},t=function(n){var e,t,u,o;if(o=n||[],!(o instanceof Array))throw new Error(r);return u=[],e=function(){var n,r,e,t;for(t=[],r=0,e=u.length;e>r;r++)n=u[r],t.push(n(o));return t},t=function(n){return arguments.length>0?(o=n,e()):o},t.subscribe=function(n){return u.push(n)},t.push=function(n){return o.push(n),e()},t.pop=function(){var n;return n=o.pop(),e(),n},t._isObservable=!0,t},a=function(n){return"undefined"!=typeof o?o.isObservable(n):n._isObservable||!1},f=function(n){return a(n)?n():n},s=function(n,r){var e,t,u;for(t=0,u=n.length;u>t;t++)if(e=n[t],!a(e))return!1;return a(r)?!1:"function"!=typeof r?!1:!0},i=function(n){var r,e,t,u;for(e=[],t=0,u=n.length;u>t;t++)r=n[t],e.push(f(r));return e},n.o=function(n){return"undefined"!=typeof o?o.observable(n):e(n)},n.oa=function(n){return"undefined"!=typeof o?o.observableArray(n):t(n)},n.on=function(){var n,r,e,t,u,o,a,f;if(u=2<=arguments.length?l.call(arguments,0,o=arguments.length-1):(o=0,[]),n=arguments[o++],!s(u,n))throw new Error("Invalid arguments to C.on");for(e=!1,r=function(){return e?void 0:n.apply(null,i(u))},a=0,f=u.length;f>a;a++)t=u[a],t.subscribe(r);return{$fire:r,$stop:function(){return e=!0},$resume:function(){return e=!1}}},n.from=function(){var r,e,t,u,o,a,f,c,b;if(a=2<=arguments.length?l.call(arguments,0,f=arguments.length-1):(f=0,[]),r=arguments[f++],!s(a,r))throw new Error("Invalid arguments to C.from");for(u=n.o(),t=!1,e=function(){var n;if(!t)return n=r.apply(null,i(a)),u(n),u},c=0,b=a.length;b>c;c++)o=a[c],o.subscribe(e);return u.$fire=e,u.$stop=function(){return t=!0},u.$resume=function(){return t=!1},u},n._gather=i,n._isValid=s,n._isObservable=a,n._unwrap=f,n.Observable=e,n.ObservableArray=t}).call(this);