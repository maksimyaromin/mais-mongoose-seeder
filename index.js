"use strict";

/**
 * This module seeds the database with data that should be in the database
 * before the tests should start.
 *
 * @author Max Eremin      <eremin_my@outlook.com>
 * @since  6 May 2018
 */

// module dependencies
var vm = require("vm");

module.exports = mongoose => {

    const cloneDeep = obj => {
        return JSON.parse(JSON.stringify(obj));
    };

    const asyncSeries = tasks => {
        if(!(tasks instanceof Array) || tasks.length === 0) {
            return Promise.reject(new Error(`Please pass tasks array into this function.`));
        }
        try {
            if(tasks.length === 1) {
                return tasks[0].call(this, 1);
            }
            tasks = tasks.reduce((task, nextTask, index) => {
                if(index === 1) {
                    task = typeof task === "function"
                        ? task.call(this, index)
                        : Promise.resolve(task);
                }
                return task.then(() => typeof nextTask === "function"
                    ? nextTask.call(this, index + 1)
                    : Promise.resolve(nextTask));
            });
        } catch(err) {
            return Promise.reject(err);
        }
        return tasks;
    };

    const Seeder = function({ dropDatabase = true, dropCollections = false }) {
        if(dropCollections === true && dropDatabase === true) {
            // Only one of the two flags can be turned on. If both are true, this means the
            // user set the dropCollections itself and this should have higher priority then
            // the default values.
            dropDatabase = false;
        }
        this.dropDatabase = dropDatabase;
        this.dropCollections = dropCollections;
        this.chunks = {};
        this.sandbox = vm.createContext();
    };
    Seeder.prototype.clearChunks = function() {
        this.chunks = {};
    };
    Seeder.prototype.run = function(data) {
        if(this.dropDatabase) {
            // Make sure to drop the database first
            return mongoose.connection.dropDatabase()
                // Start seeding when the database is dropped
                .then(() => this.seed(cloneDeep(data)))
                // Stop seeding if an error occurred
                .catch(err => this.done(err));
        }
        // Do not drop the entire database, start seeding
        return this.seed(cloneDeep(data));
    };
    Seeder.prototype.done = function(err, result) {
        return err
            ? Promise.reject(err)
            : Promise.resolve(result);
    };
    /**
     * The internal method for seeding the database.
     *
     * @param  {Object}   data The data that should be seeded.
    */
    Seeder.prototype.seed = function(data) {
        const depsErr = this.requireDeps(data);
        if(depsErr) { return Promise.reject(depsErr); }
        //this.parseData(data);
        const tasks = Object.keys(data).map(key => () => {
            this.chunks[key] = {};
            const value = data[key];
            try {
                if(!value._model) {
                    // Throw an error if the model could not be found
                    throw new Error("Please provide a _model property that describes which database model should be used.");
                }
                const modelName = value._model;
                // Remove model and unique properties
                delete value._model;
                // retrieve the model depending on the name provided
                const Model = mongoose.model(modelName);
                return Promise.resolve()
                    .then(() => {
                        if(this.dropCollections) {
                            // Drop the collection
                            return mongoose.connection.db
                                .listCollections({ name: Model.collection.name }).toArray()
                                .then(collections => {
                                    const isExitst = collections.length > 0;
                                    return isExitst 
                                        ? mongoose.connection.dropCollection(Model.collection.name) 
                                        : Promise.resolve();
                                });
                        }
                        return Promise.resolve();
                    })
                    .then(() => {
                        const innerTasks = Object.keys(value).map(innerKey => () => {
                            const modelData = value[innerKey];
                            const items = this.unwind(modelData);
                            // Create the model
                            return Model.create(items)
                                .then(result => {
                                    this.chunks[key][innerKey] = result;
                                    return Promise.resolve();
                                });
                        });
                        return asyncSeries(innerTasks);
                    });
            } catch (err) {
                // If the model does not exist, stop the execution
                return Promise.reject(err);
            }
        });
        return asyncSeries(tasks)
            .then(() => {
                return this.done(null, this.chunks);
            })
            .catch(err => this.done(err));
    };
    /**
     * This method downloads all dependencies if there are any. 
     * The dependencies are defined by field _dependencies of the source 
     * object with data
     * 
     * @param {Object} data The data that should be seeded.
    */
    Seeder.prototype.requireDeps = function(data) {
        try {
            const deps = data._dependencies;
            // Remove the dependencies property
            delete data._dependencies;
            if(!deps) { return; }
            Object.entries(deps).forEach(([ key, value ]) => {
                // Do nothing if the dependency is already defined
                if(this.sandbox[key]) { return; }
                this.sandbox[key] = module.parent.require(value);
            });
            return;
        } catch(err) {
            return err;
        }
    };
    /**
     * This method unwinds an object and iterates over every property in the object.
     * It will then parse the value of the property in order to search for references
     * and make a reference to the correct object.
     *
     * @param  {Object} obj The object to parse.
     * @return {Object}     The object with the correct references.
    */
    Seeder.prototype.unwind = function(modelData) {
        return Object.keys(modelData)
            .map(key => {
                return { [key]: this.parseValue(modelData, modelData[key]) };
            })
            .reduce((items, item) => {
                return Object.assign(items, item);
            }, {});
    };
    /**
     * This method parses every value. If the value is an object it will unwind
     * that object as well. If the value is a reference (value starting with ->),
     * then it will find the reference to that object.
     *
     * @param  {Object} parent  The object for which the value should be parsed.
     * @param  {*}      value   The value that should be parsed.
     * @return {*}              The parsed value.
    */
    Seeder.prototype.parseValue = function(parent, value) {
        if(typeof value === "object" && !(value instanceof Array)) {
            // Unwind the object
            return this.unwind(value);
        } else if(value instanceof Array) {
            return value.map(val => this.parseValue(parent, val));
        } else if(typeof value === "string" && ~value.indexOf("=")) {
            // Evaluate the expression
            try {
                // Assign the object to the _this property
                // Create a new combined context
                const context = vm.createContext(Object.assign({
                    "_this": parent
                }, this.sandbox));
                // Run in the new context
                return vm.runInContext(value.substr(1).replace(/this\./g, "_this."), context);
            }
            catch(err) {
                return value;
            }
        } else if(typeof value === "string" && ~value.indexOf("->")) {
            return this.findReference(value.substr(2));
        }
        return value;
    };
    /**
     * This method searches for the _id associated with the object represented
     * by the reference provided.
     *
     * @param  {String} ref The string representation of the reference.
     * @return {String}     The reference to the object.
    */
    Seeder.prototype.findReference = function(ref) {
        const keys = ref.split(".");
        let key = keys.shift(),
            result = this.chunks[key];
        if(!result) {
            // If the result does not exist, return an empty
            throw new TypeError(`Could not read property "${key}" from undefined`);
        }    
        // Iterate over all the keys and find the property
        while((key = keys.shift())) {
            result = result[key];
        }
        if(typeof result === "object" && !(result instanceof Array)) {
            // Test if the result we have is an object. This means the user wants to reference
            // to the _id of the object.
            if(!result._id) {
                // If no _id property exists, throw a TypeError that the property could not be found
                throw new TypeError(`Could not read property "_id" of ${JSON.stringify(result)}`);
            }
            return result._id;
        }
        return result;
    };

    return {
        /**
         * Start seeding the database.
         *
         * @param  {Object}   data     The data object that should be inserted in the database.
         * @param  {Object}   options  The options object to provide extras.
         */
        seed(data, options) {
            const seeder = new Seeder(options);
            return seeder.run(data);
        }
    };
};