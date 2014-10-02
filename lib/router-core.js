var _ = require('lodash-node'),
    extend = require('node.extend'),
    mongoose = require('mongoose');

var lib = {};

var Message = mongoose.model('Message', { messageId:String, userId: String, data: Object});

var options = {};

module.exports = function(_options) {
    if(!_options){
        return lib;
    }

    options = _options;

    lib = {
        authenticateAndExecute: function (route, inputDataObject, callbackCodeAndData, cookie) {
            options.authenticateUserIdByCookieString(cookie).then(
                function (userId) {
                    lib.execute(route, inputDataObject, callbackCodeAndData, userId);
                },
                function () {
                    callbackCodeAndData(401);
                }
            );
        },

        execute: function (route, inputDataObject, callbackCodeAndData, userId) {
            route.controller(inputDataObject, callbackCodeAndData, userId, this.sendMessageToUserByUserIdAndJson);
        },

        executeQueuedTask: function (routePath, inputDataObject, userId) {
            return options.routingMap['queue'][routePath].controller(inputDataObject, userId, this.sendMessageToUserByUserIdAndJson);
        },

        getCallbackHttp: function (res) {
            return function (code, data) {
                res.send(code, data);
            };
        },

        getCallbackSocket: function (clientCallback) {
            return function (code, data) {
                clientCallback(code, data);
            };
        },

        executeRoute: function (route, inputDataObject, callbackCodeAndData, cookie) {
            if (route.authenticate) {
                this.authenticateAndExecute(route, inputDataObject, callbackCodeAndData, cookie);
                return;
            }

            this.execute(route, inputDataObject, callbackCodeAndData);
        },

        sendMessageToUserByUserIdAndJson: function(userId, Json){
            if(!userId) {
                return;
            }
            var messageUniqueId = userId + '_' + Date.now();

            var message = new Message({ messageId:messageUniqueId, userId: userId, data: {stringified: JSON.stringify(Json) }});
            message.save(function (err) {
                if(err){
                    console.log('error saving message');
                    console.log(err);
                    return;
                }
            });

            _.forEach(
                options.io.to(userId.toString()).sockets,
                function(socket){
                    socket.emit('implicitReply', Json, lib.approvalCallback(messageUniqueId));
                }
            );
        },

        approvalCallback: function(messageUniqueId){
            return function(){
//                console.log('approved: ' + messageUniqueId);
                Message.find({messageId: messageUniqueId}).remove().exec();
            };
        },

        routerGetMessages: function(inputDataObject, callbackCodeAndData, userId){
          //todo: handle many messages
            var query = Message.find({userId: userId}).limit(10);

            query.exec(function(err, data){

                var dataParsed = data.map(function(message){
                    message.data = JSON.parse(message.data.stringified);
                    return message;
                });

                callbackCodeAndData(200,dataParsed);

                Message.find({userId: userId}).remove().exec();
            });
        },

        registerRoute: function(route){
            extend(true, options.routingMap, route.routingMap);
        },

        routerSendMessage: function(inputDataObject, callbackCodeAndData, userId){
            lib.sendMessageToUserByUserIdAndJson(userId, {msg: inputDataObject.msg});
            callbackCodeAndData(200,{msg: 'message sent'});
        }
    };

    lib.registerRoute({
        routingMap:{
            get:
            {
                '/router/messages':{
                    authenticate: true,
                    controller: lib.routerGetMessages
                },
                '/router/message':{
                    authenticate: true,
                    controller: lib.routerSendMessage
                }
            }
        }
    });

    return lib;
};