const { app } = require('./angular-app.js');
const { airtable } = require('./app-secret.js');

require('./airtable-service.js');
require('./liturgy-service.js');

(() => {
    const factory = ($q, $http, AirtableService, LiturgyService) => {

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

                    let result = [];
                    signups.forEach(signup => {
                        if(signup.active && signup.date.getTime() > today.getTime()) {
                            signup.data = signup.data ? JSON.parse(signup.data) : [];
                            result.push(signup);

                            //set liturgy
                            const liturgy = liturgies.find(item => {
                                return item.date.getTime() === signup.date.getTime();
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
            return {
                fields: {
                    date: signup.date.toISOString().slice(0, 10),
                    active: Boolean(signup.active),
                    data: JSON.stringify(signup.data)
                }
            }
        };

        return service;

    };

    factory.$inject = ['$q', '$http', 'AirtableService', 'LiturgyService'];
    app.factory('ParishService', factory);
})();