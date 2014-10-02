var q = require('q');

var options = {};

var routerCoreLibrary = require('./lib/router-core.js');

var routerQ= require('./lib/router-queue.js');

var routerCore = {};

var router = {};

module.exports = {
    initRouter: function (authenticateUserIdByCookieString, io, dbStr, app) {

        options = {
            //the routing map is a union of all routers' routing maps
            routingMap: {},
            authenticateUserIdByCookieString: authenticateUserIdByCookieString,
            io: io,
            dbStr: dbStr,
            app: app
            };

        app.get('/console', function (req, res) {
            options.authenticateUserIdByCookieString(req.headers.cookie).then(
                function (userId) {
                    res.sendfile(__dirname + '/html/console.html');
                },
                function () {
                    res.redirect('login');
                }
            );
        });

        routerCore = routerCoreLibrary(options);

        router = {
            middleware: function (req, res, next) {

                if(req.method == 'queue'){
                    console.log('queued routes are not allowed through http');
                    next();
                    return;
                }

                var method = req.method.toLowerCase();

                if (!options.routingMap[method] || !options.routingMap[method][req._parsedUrl.pathname]) {
                    console.log('explicitTestMiddleware NOT RELEVANT');
                    next();
                    return;
                }

                var route = options.routingMap[method][req._parsedUrl.pathname];

                console.log('router: executing middleware route: ' + method + "|" + req._parsedUrl.pathname);

                var inputDataObject = method == 'get' ? req.query : req.body;

                routerCore.executeRoute(route, inputDataObject, routerCore.getCallbackHttp(res), req.headers.cookie);
            },

            socketHandler: function (cookie, inputData, clientCallback) {
                if (!inputData['method']) {
                    console.log("no method on socket data");
                    return;
                }

                if(req.method == 'queue'){
                    console.log('queued routes are not allowed through socket');
                    return;
                }

                var method = inputData['method'].toLowerCase();

                if (!options.routingMap[method] || !options.routingMap[method][inputData['url']]) {
                    console.log('socketHandler NOT RELEVANT');
                    return;
                }

                var route = options.routingMap[method][inputData['url']];

                console.log('router: executing socketHandler route: ' + method + "|" + inputData['url']);

                routerCore.executeRoute(route, inputData, routerCore.getCallbackSocket(clientCallback), cookie);
            }
        };

        io.on('connection', function (socket) {
            authenticateUserIdByCookieString(socket.handshake.headers.cookie).then(function (userId) {
                if (userId) {
                    console.log('socket join ' + userId);
                    socket.join(userId.toString());
                }
            });
            socket.on('http', function (inputData, clientCallback) {
                // todo: cookie is not always updated on logout
                router.socketHandler(socket.handshake.headers.cookie, inputData, clientCallback);
            });
        });

        app.use(router.middleware);

//        return router;
    },

    registerRoutes: function(routesArray){
      routesArray.map(function(route){
          routerCore.registerRoute(route);

          return route;
      });
    },

    directCall: function (method, path, inputDataObject, userId, sendMessageToUserByUserIdAndJson) {
        function directCallCallback(deferred) {
            return function (code, data) {
                var result = {
                    code: code,
                    data: data
                };
                deferred.resolve(result);
            };
        }

        if(method === 'queue') {
            return routerQ.insertToQ(path, inputDataObject, userId);
        }

        var deferred = q.defer();

        var controller = options.routingMap[method][path].controller;

        controller(inputDataObject, directCallCallback(deferred), userId, sendMessageToUserByUserIdAndJson);

        return deferred.promise;
    },

    foreverHandleTasks: function(){
        routerQ.foreverHandleTasks();
    }
};