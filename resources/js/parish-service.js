const { app } = require('./angular-app.js');
const { airtable } = require('./app-secret.js');

require('./airtable-service.js');
require('./liturgy-service.js');

(() => {
    const factory = ($q, $http, AirtableService, LiturgyService, AppUtil) => {

        let service = {},
            config = {
                url: atob(airtable.url.parish),
                key: atob(airtable.key),

                tables: {
                    mass: {
                        fields: ['date', 'active', 'data']
                    }
                }
            };

        /**
         * loadSignups
         */
        service.loadSignups = () => {
            const deferred = $q.defer();
            const today = new Date();

            $q.all([
                LiturgyService.loadLiturgies(),
                AirtableService.getData('mass', config)
            ])
                .then(values => {
                    const liturgies = values[0];
                    const signups = values[1];

                    signups.sort((s1, s2) => {
                        let d1 = s1.date, d2 = s2.date;
                        return d1.getTime() < d2.getTime() ? -1 : d1.getTime() > d2.getTime() ? 1 : 0;
                    });

                    let result = [];
                    signups.forEach(signup => {
                        if(signup.active && signup.date.getTime() > today.getTime()) {
                            signup.data = signup.data ? JSON.parse(signup.data) : [];
                            result.push(signup);

                            //set liturgy
                            const liturgy = liturgies.find(item => {
                                return item.date.toLocaleDateString() === signup.date.toLocaleDateString();
                            });
                            liturgy && (signup.liturgy = liturgy);
                        }
                    });

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

            // console.log(`data length: ${JSON.stringify(signup.data).length}`);
            return {
                fields: {
                    date: signup.date,
                    active: Boolean(signup.active),
                    data: JSON.stringify(signup.data)
                }
            }
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'LiturgyService', 'AppUtil'];
    app.factory('ParishService', factory);
})();