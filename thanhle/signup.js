const { app } = require('../resources/js/angular-app.js');

require('../resources/js/parish-service.js');
require('./signup.scss');

(() => {
    const controller = ($scope, $q, $window, service, apputil) => {
        /**
         * init
         */
        $scope.init = () => {
            $scope.total = 120;
            $scope.formData = {};
            $scope.listIndex = 0;
            $scope.signups = [];
            $scope.nav = {};

            //handle browser refresh
            refresh();
        };

        /**
         * submit
         */
        $scope.submit = () => {
            let promises = [];
            $scope.signupData = [];

            $scope.signups.forEach(signup => {
                let date = signup.date,
                    data = $scope.formData[date],
                    item = signup.data.find(item => item.email === data.email);

                if(!item) {
                    item = apputil.pick(data, 'name', 'email', 'phone', 'count');
                    item.order = signup.data.length + 1;
                    signup.data.push(item);
                } else {
                    item.name = data.name;
                    item.phone = data.phone;
                    item.count = data.count;
                }

                promises.push(
                    service.updateSignup(signup)
                        .then(() => {
                            if(item.count > 0) {
                                Object.assign(item, apputil.pick(signup, 'date', 'liturgy'));
                                $scope.signupData.push(item);
                            }
                        })
                );
            });

            $q.all(promises)
                .then(() => {
                    $scope.signupData.sort((o1, o2) => {
                        let d1 = o1.date, d2 = o2.date;
                        return d1.getTime() < d2.getTime() ? -1 : 1;
                    });

                    location.hash = '/summary';
                });
        };

        $scope.formatDate = (date, liturgy) => {
            let time = date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            date = $.datepicker.formatDate('DD dd/mm/yy', date);

            // return `${date} @${time} ${liturgy ? `- ${liturgy.name}` : ''}`;
            return `${date} @${time}`;
        };

        $scope.formatPhone = (phone) => {
            return (phone || '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
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
            let data = $scope.formData[date];

            if(data) {
                //assign this formData
                $scope.signups.forEach(signup => {
                    $scope.formData[signup.date] = {};
                    Object.assign($scope.formData[signup.date], apputil.pick(data, 'name', 'email', 'phone'));

                    signup.data.forEach(item => {
                        if(data.email && item.email === data.email || data.name && item.name === data.name || data.phone && item.phone === data.phone) {
                            Object.assign(data, apputil.pick(item, 'email', 'count'));
                            data.name !== '' && Object.assign(data, apputil.pick(item, 'name'));
                            data.phone !== '' && Object.assign(data, apputil.pick(item, 'phone'));
                        }
                    });
                });

                //assign all formData for this email
                $scope.signups.forEach(signup => {
                    Object.assign($scope.formData[signup.date], apputil.pick(data, 'name', 'email', 'phone'));

                    signup.data.forEach(item => {
                        if(item.email === $scope.formData[signup.date].email) {
                            Object.assign($scope.formData[signup.date], apputil.pick(item, 'count'));
                        }
                    });
                });

                //trigger input events
                $('.content .name').trigger('oninput');
                $('.content .email').trigger('oninput');
                $('.content .count').trigger('oninput');
            }
        };

        $scope.prevList = () => {
            $('html').scrollTop(0, 0);
            $scope.listIndex > 0 && ($scope.listIndex -= 1);
            renderNav();
        };

        $scope.nextList = () => {
            $scope.listIndex < $scope.signups.length - 1 && ($scope.listIndex += 1);
            $('html').scrollTop(0, 0);
            renderNav();
        };

        /*****************/
        /**** private ****/
        /*****************/

        const loadSignups = () => {
            service.loadSignups()
                .then(values => {
                    $scope.signups = values;

                    //render nav bar
                    renderNav();

                    //handle default page
                    if(!(/\/(signup|list)$/).test(location.hash)) {
                        location.hash = '/signup';
                    }
                });
        };

        const refresh = () => {
            //handle browser refresh
            if(!$scope.signups || $scope.signups.length === 0) {
                loadSignups();
            }

            //handle back button refresh
            $window.addEventListener('hashchange', (e) => {
                if(!$scope.signups) {
                    loadSignups();
                } else {
                    if((/\/signup$/).test(e.newURL)) {
                        $scope.$apply(() => {
                            if($scope.signupData && $scope.signupData.length > 0) {
                                $scope.checkSignup($scope.signupData[0].date);
                            }
                        });
                    }

                    if((/\/summary$/).test(e.newURL) && !$scope.signupData) {
                        location.hash = '/signup';
                    }
                }
            });
        };

        const renderNav = () => {
            $scope.nav.prev = $scope.listIndex === 0 ? 'disabled' : '';
            $scope.nav.next = $scope.listIndex === $scope.signups.length - 1 ? 'disabled' : '';
        };
    };

    controller.$inject = ['$scope', '$q', '$window', 'ParishService', 'AppUtil'];
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
