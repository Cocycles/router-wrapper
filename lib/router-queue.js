/**
 * Created by danny on 9/29/14.
 */

var q = require('q'),
    routerDB = require('./router-db/router-db.js'),
    os = require('os'),
    routerCoreLibrary = require('./router-core.js');

var exports = {
    insertToQ: function(path, inputDataObject, userId){
        console.log('insertToQ');

        return routerDB.insertTask(path, inputDataObject, userId);
    },

    foreverHandleTasks: function(){
        var routerCore = routerCoreLibrary();

        var processId = os.hostname() + '/' + process.pid;

        var task = routerDB.getTaskToPerform(processId).then(function(task){
            if(!task){
                setTimeout(exports.foreverHandleTasks, 1000);
                return;
            }

            routerCore.executeQueuedTask(task.route, task.inputObj, task.userId).then(function(result){
                routerDB.setTaskFinished(task).then(function(){
                    exports.foreverHandleTasks();
                });
            });
        });

    }
};

module.exports = exports;
