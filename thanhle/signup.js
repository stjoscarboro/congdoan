const { app } = require('../resources/js/angular-app.js');

require('../resources/js/parish-service.js');
require('./signup.scss');

(() => {
    const controller = ($scope, service) => {
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
            const data = $scope.formData[date];

            let signupDate = $scope.signups.find(item => item.date.getTime() === date.getTime());
            if(signupDate) {
                const signupItem = signupDate.items.find(item => item.email === data.email);
                const promise = !signupItem ? service.createSignup(data) : service.updateSignup(signupItem.refId, data);

                promise.then(() => {
                    if(!signupItem) {
                        signupDate.items.push(data);
                    } else {
                        signupItem.count = data.count;
                    }

                    $scope.signupData = data;
                    location.hash = '#!/summary';
                });
            } else {
                //error
            }
        };

        $scope.formatDate = (date, liturgy) => {
            date = $.datepicker.formatDate('dd/mm/yy', date);
            return `${date}${liturgy ? ' - ' + liturgy : ''}`;
        };

        $scope.getRemaining = (date) => {
            const signupDate = $scope.signups.find(item => item.date.getTime() === date.getTime());

            let remaining = $scope.total;
            signupDate.items.forEach(item => {
                remaining -= item.count;
            });

            return remaining;
        };

        const loadSignups = () => {
            service.loadSignups()
                .then(values => {
                    $scope.signups = values;
                });
        };

        const refresh = () => {
            //handle browser refresh
            if(!$scope.signups) {
                location.hash = '#!/signup';
                history.pushState(null,  document.title, location.href);
            }

            //handle back button refresh
            window.onhashchange = (e) => {
                if($scope.signups && (/\/signup$/).test(e.newURL)) {
                    $scope.$apply(() => {
                        $scope.signups.forEach(signup => {
                            $scope.formData[signup.date] = {};
                        });
                    });
                }
            };
        };
    };

    controller.$inject = ['$scope', 'ParishService'];
    app.controller("thanhle", controller);
})();

(() => {
    const config = ($routeProvider) => {
        const context = location.pathname.split('/')[1];

        $routeProvider.
        when('/summary', {
            templateUrl: `/${context}/thanhle/summary.html`
        }).
        otherwise({
            templateUrl: `/${context}/thanhle/signup.html`
        });
    };

    config.$inject = ['$routeProvider'];
    app.config(config);
})();