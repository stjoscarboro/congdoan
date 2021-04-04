const { app } = require('./angular-app.js');
const { airtable } = require('./app-secret.js');

require('./airtable-service.js');

(() => {
    const factory = ($q, $http, AirtableService, AppUtil) => {

        let service = {},
            config = {
                url: atob(airtable.url.parish),
                key: atob(airtable.key),

                tables: {
                    mass: {
                        fields: ['date', 'active', 'data', 'liturgy']
                    }
                }
            };

        /**
         * loadSignups
         */
        service.loadSignups = () => {
            const deferred = $q.defer();
            const today = new Date();
            const cutoff = 3 * 60 * 60 * 1000;

            AirtableService.getData('mass', config)
                .then(signups => {
                    let result = [], signup;

                    signups.sort((s1, s2) => {
                        let d1 = s1.date, d2 = s2.date;
                        return d1.getTime() < d2.getTime() ? -1 : d1.getTime() > d2.getTime() ? 1 : 0;
                    });

                    for(let i=0; i<signups.length; i++) {
                        signup = signups[i];

                        if(signup.active) {
                            signup.allow = signup.date.getTime() - today.getTime() > cutoff;
                            signup.list = signup.date.getTime() > today.getTime();
                            signup.data = signup.data ? JSON.parse(signup.data) : [];
                            result.push(signup);
                        }
                    }

                    deferred.resolve(result);
                });

            return deferred.promise;
        };

        service.updateSignup = (signup) => {
            const payload = getPayload(signup);
            return AirtableService.updateData('mass', config, signup.refId, payload)
        };

        const getPayload = (signup) => {
            signup.data = signup.data.map(item => {
                return AppUtil.pick(item, 'name', 'email', 'phone', 'count', 'order');
            });

            return {
                fields: {
                    data: JSON.stringify(signup.data)
                }
            }
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'AppUtil'];
    app.factory('ParishService', factory);
})();