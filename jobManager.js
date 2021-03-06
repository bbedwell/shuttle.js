var fs = require('fs')
    , logger = require('./logger')
    , path = require('path')
    , settings = require('./config')
    , jobsFolder = path.join(__dirname, 'jobs')
    , _ = require('lodash')
    , registry = {}
;

function registerJobs(){
    logger.debug('registering jobs');

    var jobs = fs.readdirSync(jobsFolder);

    jobs.forEach(function(key){

        var stats = fs.statSync(path.join(jobsFolder, key));
        if(!stats.isDirectory()) return;

        var module = require(path.join(jobsFolder,key));

        registry[key] = {
            name:module.name,
            job: module,
            children: [],
            spawn: function(){
                logger.debug('spawning child: ' + this.name);
                var child = this.job.spawn();
                child.started = new Date();
                this.children.push(child);

                //bind child to handlers
                process.on('exit', function() {
                    child.kill();
                });
            },
            methods:module.methods
        };

    })

    return registry;
}

var load = function(){
    var eagerSpawn = settings.eagerSpawn;

    registerJobs();

    Object.keys(registry)
        .forEach(function(registrationName){
            var registration = registry[registrationName];

            logger.debug('checking eager spawn for ' + registration.name);
            if(eagerSpawn === true || eagerSpawn == '*' || eagerSpawn.indexOf('*') > -1 || eagerSpawn.indexOf(registration.name) > -1)
                registration.spawn();

        })
}

module.exports = {
    load:load,
    registry:registry
}
