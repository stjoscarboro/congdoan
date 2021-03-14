const { app } = require('./angular-app.js');
const { __url, __key } = require('./airtable-secret.js');

require('./airtable-service.js');
require('./liturgy-service.js');

(() => {
    const factory = ($q, $http, AirtableService, LiturgyService, AppUtil) => {

        let service = {},
            config = {
                url: __url.parish,
                key: __key,
                tables: {
                    mass: {
                        fields: [ 'date', 'active' ]
                    },

                    signup: {
                        fields: 'all'
                    }
                }
            };

        /**
         * loadSignups
         */
        service.loadSignups = () => {
            const deferred = $q.defer();

            $q.all([
                LiturgyService.loadLiturgies(),
                AirtableService.getData('mass', config),
                AirtableService.getData('signup', config)
            ])
                .then(values => {
                    const liturgies = values[0];
                    const dates = values[1].reduce((p, v) => { v.active && p.push(v); return p; }, []);
                    const signups = values[2];

                    const signupDates = [];
                    const today = new Date();

                    dates.forEach(date => {
                        date = date.date;

                        if(date > today) {
                            //add signup date
                            let signup = {date: date, items: []};
                            signupDates.push(signup);

                            //set liturgy
                            const liturgy = liturgies.find(item => {
                                return item.date.getTime() === date.getTime();
                            });
                            liturgy && (signup.liturgy = liturgy.name);

                            //parse signup items
                            signups.forEach(record => {
                                parseSignup(signup, record);
                            });
                        }
                    });

                    signupDates.sort((o1, o2) => {
                        return o1.date < o2.date ? -1 : 1;
                    });

                    deferred.resolve(signupDates);
                });

            return deferred.promise;
        };

        service.createSignup = (data) => {
            const deferred = $q.defer();

            getPayload(null, data)
                .then(payload => {
                    AirtableService.createData('signup', config, payload)
                        .then(record => {
                            data.refId = record.id;
                            deferred.resolve();
                        });
                });

            return deferred.promise;
        };

        service.updateSignup = (signup, data) => {
            const deferred = $q.defer();

            getPayload(signup, data)
                .then(payload => {
                    AirtableService.updateData('signup', config, signup.refId, payload)
                        .then(data => {
                            deferred.resolve(data);
                        });
                });

            return deferred.promise;
        };

        const parseSignup = (signup, record) => {
            let item = {refId: record.refId},
                matched = false;

            Object.keys(record.fields).forEach(key => {
                switch(true) {
                    case key === 'email':
                        item[key] = record.fields[key];
                        break;

                    case key === signup.date.toISOString().slice(0,10):
                        const value = record.fields[key] || '{}';
                        Object.assign(item, {date: signup.date});
                        Object.assign(item, AppUtil.pick(JSON.parse(value), 'count', 'confirm'));
                        matched = true;
                        break;
                }
            });

            matched && signup.items.push(item);
        };

        const getPayload = (signup, data) => {
            const deferred = $q.defer();

            if(signup) {
                AirtableService.getData('signup', config, signup.refId)
                    .then(record => {
                        const date = data.date.toISOString().slice(0, 10);
                        const fields = record[0].fields;

                        Object.assign(fields, {
                            [date]: JSON.stringify({
                                count: data.count
                            })
                        });

                        deferred.resolve({
                            fields: fields
                        });
                    });
            } else {
                const date = data.date.toISOString().slice(0, 10);
                const fields = {
                        email: data.email,
                        [date]: JSON.stringify({
                            count: data.count
                        })
                    };

                deferred.resolve({
                    fields: fields
                });
            }

            return deferred.promise;
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'LiturgyService', 'AppUtil'];
    app.factory('ParishService', factory);
})();