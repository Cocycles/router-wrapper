/**
 * Created by danny on 9/29/14.
 */
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TaskSchema = new Schema({

    route: {
        type: String
    },

    inputObj: {
        type: Object
    },

    userId: {
        type: String
    },

    processId: {
        type: String
    },

    created: {
        type: Date
    },

    started: {
        type: Date
    },

    finished: {
        type: Date
    },
}, { versionKey: false });

mongoose.model('Task', TaskSchema);