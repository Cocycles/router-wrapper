require('./models/task.js');

var mongoose = require('mongoose'),
    TaskModel = mongoose.model('Task'),
    q = require('q');

module.exports = {
    insertTask: function(route, inputObj, userId){
        var deferred = q.defer();

        var task = new TaskModel({
            route: route,
            inputObj: {stringified: JSON.stringify(inputObj)},
            userId: userId,
            created: Date.now()
        });

        task.save(function(err){
            if(err){
                deferred.resolve(err);
            }
            deferred.resolve(null);
        });

        return deferred.promise;
    },

    getTaskToPerform: function(processId){
        console.log('getTaskToPerform');
        var deferred = q.defer();

        TaskModel.findOneAndUpdate({"started": null}, {started: Date.now(), processId: processId}, {sort: {created: 1}}, function(err,task){
            if(task){
                task.inputObj = JSON.parse(task.inputObj.stringified);
                console.log('getTaskToPerform RETURNS TASK:');
                console.log(task);
            }
            deferred.resolve(task);
        })

        return deferred.promise;
    },

    setTaskFinished: function(task){
        var deferred = q.defer();

        task.finished = Date.now();

        task.inputObj = {stringified: JSON.stringify(task.inputObj)},

        task.save(function(err){
            if(err){
                deferred.resolve(err);
            }
            deferred.resolve(null);
        });

        return deferred.promise;
    }
}