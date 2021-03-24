const { app } = require('../resources/js/angular-app.js');

require('../resources/js/parish-service.js');
require('./signup.scss');

(() => {
    const controller = ($scope, service, apputil) => {
        /**
         * init
         */
        $scope.init = () => {
            $scope.total = 120;
            $scope.formData = {};

            //handle browser refresh
            refresh();

            //load schedules
            loadSignups();
        };

        $scope.submit = (date) => {
            $scope.signupData = null;
            $scope.formData[date].date = date;

            let data = $scope.formData[date],
                signup = $scope.signups.find(item => item.date.getTime() === date.getTime());

            if(signup) {
                let item = signup.data.find(item => item.email === data.email);
                if(!item) {
                    item = apputil.pick(data, 'name', 'email', 'count');
                    item.order = signup.data.length + 1;
                    signup.data.push(item);
                } else {
                    Object.assign(item, apputil.pick(data, 'name', 'count'));
                }

                service.updateSignup(signup)
                    .then(() => {
                        $scope.signupData = data;
                        location.hash = '/summary';
                    });
            } else {
                //error
            }
        };

        $scope.formatDate = (date, liturgy) => {
            let time = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            date = $.datepicker.formatDate('dd/mm/yy', date);

            return `${date} @${time} ${liturgy ? `- ${liturgy.name}` : ''}`;
        };

        $scope.getRemaining = (date) => {
            const signupDate = $scope.signups.find(item => item.date.getTime() === date.getTime());

            let remaining = $scope.total;
            signupDate.data.forEach(item => {
                remaining -= item.count || 0;
            });

            return remaining;
        };

        $scope.checkSignup = (date) => {
            let formData = $scope.formData[date];

            if(formData) {
                //assign this formData
                $scope.signups.forEach(signup => {
                    $scope.formData[signup.date] = {};
                    Object.assign($scope.formData[signup.date], apputil.pick(formData, 'name', 'email'));

                    signup.data.forEach(item => {
                        if(item.name === formData.name || item.email === formData.email) {
                            Object.assign(formData, apputil.pick(item, 'name', 'email', 'count'));
                        }
                    });
                });

                //assign all formData for this email
                $scope.signups.forEach(signup => {
                    Object.assign($scope.formData[signup.date], apputil.pick(formData, 'name', 'email'));

                    signup.data.forEach(item => {
                        if(item.email === $scope.formData[signup.date].email) {
                            Object.assign($scope.formData[signup.date], apputil.pick(item, 'count'));
                        }
                    });
                });
            }
        };

        const loadSignups = () => {
            service.loadSignups()
                .then(values => {
                    $scope.signups = values;
                    location.hash = location.hash || '/signup';
                });
        };

        const refresh = () => {
            //handle browser refresh
            if(!$scope.signups) {
                loadSignups();
            }

            //handle back button refresh
            window.onhashchange = (e) => {
                if($scope.signups && (/\/signup$/).test(e.newURL)) {
                    $scope.$apply(() => {
                        if($scope.signupData) {
                            $scope.checkSignup($scope.signupData.date);
                        }
                    });
                }
            };
        };
    };

    controller.$inject = ['$scope', 'ParishService', 'AppUtil'];
    app.controller("thanhle", controller);
})();

(() => {
    const config = ($routeProvider, $locationProvider) => {
        const context = location.pathname.split('/')[1];

        $routeProvider.
        when('/summary', {
            templateUrl: `/${context}/thanhle/summary.html`
        }).
        when('/list', {
            templateUrl: `/${context}/thanhle/list.html`
        }).
        otherwise({
            templateUrl: `/${context}/thanhle/signup.html`
        });

        $locationProvider.hashPrefix('');
    };

    config.$inject = ['$routeProvider', '$locationProvider'];
    app.config(config);
})();