const { app } = require('./angular-app.js');
const { __url, __key } = require('./airtable-secret.js');

require('./airtable-service.js');

(() => {
    const factory = ($q, $http, AirtableService) => {

        let service = {},
            config = {
                url: __url.liturgy,
                key: __key,
                tables: {
                    years: {
                        fields: [ 'id', 'name', 'date' ]
                    },

                    liturgies: {
                        fields: [ 'id', 'name', 'date_a', 'date_b', 'date_c' ]
                    },

                    intentions: {
                        fields: [ 'id', 'name', 'date_a', 'date_b', 'date_c' ]
                    }
                }
            };

        /**
         * loadYears
         *
         * @returns {f}
         */
        service.loadYears = () => {
            let deferred = $q.defer();

            AirtableService.getData('years', config)
                .then(records => {
                    deferred.resolve(records);
                });

            return deferred.promise;
        };

        /**
         * loadLiturgies
         *
         * @returns {f}
         */
        service.loadLiturgies = () => {
            let deferred = $q.defer(),
                years = { a: '1', b: '2', c: '3' };

            let getIntention = (intentions, date) => {
                let intention = null;

                intentions.find(i => {
                    for(let y of Object.keys(years)) {
                        if(i[`date_${ y }`].getTime() === date.getTime()) {
                            intention = i;
                        }
                    }
                });

                return intention;
            };

            $q.all([
                AirtableService.getData('liturgies', config),
                AirtableService.getData('intentions', config)
            ])
                .then(values => {
                    let liturgies = values[0],
                        intentions = values[1],
                        records = liturgies.reduce((p, v) => {
                            for(let y of Object.keys(years)) {
                                let date = v[`date_${y}`],
                                    record = date && p.find(r => { return r.date.getTime() === date.getTime(); });

                                if(record) {
                                    record.intention = {name: v.name}
                                } else {
                                    if(date) {
                                        record = {
                                            id: v.id,
                                            name: v.name,
                                            year: years[y],
                                            date: date,
                                            intention: getIntention(intentions, date)
                                        };

                                        p.push(record);
                                    }
                                }
                            }

                            return p;
                        }, []);

                    deferred.resolve(records);
                });

            return deferred.promise;
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService'];
    app.factory('LiturgyService', factory);
})();