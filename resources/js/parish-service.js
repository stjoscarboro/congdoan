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

                            //set signup items
                            signups.forEach(record => {
                                let item = {refId: record.refId},
                                    matched = false;

                                Object.keys(record.fields).forEach(key => {
                                    switch(true) {
                                        case key === date.toISOString().slice(0,10):
                                            const value = record.fields[key] || '{}';
                                            Object.assign(item, {date: date});
                                            Object.assign(item, AppUtil.pick(JSON.parse(value), 'count', 'confirm'));
                                            matched = true;
                                            break;

                                        default:
                                            item[key] = record.fields[key];
                                    }
                                });

                                matched && signup.items.push(item);
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

        service.createSignup = (signup) => {
            const deferred = $q.defer();
            const data = getPayload(signup);

            AirtableService.createData('signup', config, data)
                .then(data => {
                    signup.refId = data.id;
                    deferred.resolve();
                });

            return deferred.promise;
        };

        service.updateSignup = (refId, signup) => {
            const deferred = $q.defer();
            const data = getPayload(signup);

            AirtableService.updateData('signup', config, refId, data)
                .then(data => {
                    deferred.resolve(data);
                });

            return deferred.promise;
        };

        const getPayload = (signup) => {
            const date = signup.date.toISOString().slice(0,10);

            return {
                fields: {
                    email: signup.email,
                    [date]: JSON.stringify({
                        count: signup.count
                    })
                }
            };
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'LiturgyService', 'AppUtil'];
    app.factory('ParishService', factory);
})();