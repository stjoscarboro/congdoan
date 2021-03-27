const { app } = require('./angular-app.js');
const { airtable } = require('./app-secret.js');

require('./airtable-service.js');

(() => {
    const factory = ($q, $http, AirtableService) => {

        let service = {},
            config = {
                url: atob(airtable.url.liturgy),
                key: atob(airtable.key),

                tables: {
                    years: {
                        fields: [ 'id', 'name', 'date' ]
                    },

                    liturgies: {
                        fields: [ 'id', 'name', 'date_a', 'date_b', 'date_c' ]
                    },

                    intentions: {
                        fields: [ 'id', 'name', 'date_a', 'date_b', 'date_c' ]
                    },

                    cached: {
                        fields: [ 'date', 'data1', 'data2' ]
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
         * @param cached
         * @returns {f}
         */
        service.loadLiturgies = (cached) => {
            let deferred = $q.defer();
            cached = cached === false ? cached : true;

            loadCachedData()
                .then(data => {
                    if(cached && data && data.records.length > 0) {
                        deferred.resolve(data.records);
                    } else {
                        loadSourceData()
                            .then(records => {
                                saveCachedData(data, records);
                                deferred.resolve(records);
                            });
                    }
            });

            return deferred.promise;
        };


        /*****************/
        /**** private ****/
        /*****************/

        const loadSourceData = () => {
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

        const loadCachedData = () => {
            let deferred = $q.defer(),
                date = new Date(),
                time = 43200000, //12h
                result = { records: [] };

            AirtableService.getData('cached', config)
                .then(data => {
                    if(data && data.length > 0) {
                        data = data[0];
                        result.refId = data.refId;
                        result.date = data['date'];

                        if(date.getTime() - data.date.getTime() < time) {
                            result.records = JSON.parse(data['data1'] + data['data2']);
                            result.records.forEach(record => {
                                record.date = new Date(Date.parse(record['date']));
                            });
                        }
                    }

                    deferred.resolve(result);
                });

            return deferred.promise;
        };

        const saveCachedData = (cachedData, records) => {
            let payload = getPayload(records);
            AirtableService.updateData('cached', config, cachedData.refId, payload);
        };

        const getPayload = (records) => {
            let data = JSON.stringify(records),
                split = 80000;

            return {
                fields: {
                    date: new Date(),
                    data1: data.substring(0, split),
                    data2: data.substring(split)
                }
            }
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService'];
    app.factory('LiturgyService', factory);
})();