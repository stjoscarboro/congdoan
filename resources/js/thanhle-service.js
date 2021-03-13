const { app } = require('./angular-app.js');

(() => {
    const factory = ($q, $http, AirtableService, AppUtil) => {

        let service = {},
            config = {
                tables: {
                    mass: {
                        fields: [ 'date', active ]
                    },

                    signup: {
                        fields: [ 'email', 'sent', '2021-03-21' ]
                    }
                }
            };

        /**
         * loadMasses
         */
        service.loadMasses = () => {
            let deferred = $q.defer();

            AirtableService.getData('mass', config)
                .then(values => {
                    let records = values.reduce((p, v) => { v.active && p.push(v); return p; }, []);
                    deferred.resolve(records);
                });

            return deferred.promise;
        };

        /**
         * loadSignups
         */
        service.loadSignups = (dates) => {
            let deferred = $q.defer();

            AirtableService.getData('signup', config)
                .then(values => {
                    let records = values.reduce((p, v) => { v.active && v.lang === lang && p.push(v); return p; }, []);
                    deferred.resolve(records);
                });

            return deferred.promise;
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'AppUtil'];
    app.factory('ThanhLeService', factory);
})();