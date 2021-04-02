const { app } = require('../resources/js/angular-app.js');

require('../resources/js/parish-service.js');
require('./signup.scss');

(() => {
    const controller = ($scope, $q, $window, service, apputil) => {
        /**
         * init
         */
        $scope.init = () => {
            $scope.total = 90;
            $scope.formData = {};
            $scope.listIndex = 0;
            $scope.signups = [];
            $scope.nav = {};

            initForm();
        };

        /**
         * submit
         */
        $scope.submit = () => {
            let promises = [],
                formData = $scope.formData;

            $scope.signupData = [];

            loadSignups()
                .then(() => {
                    $scope.signups.forEach(signup => {
                        let date = signup.date,
                            data = $scope.formData[date],
                            item = signup.data.find(item => data.name && item.name === data.name),
                            order = 0;

                        //find last order number
                        signup.data.forEach(item => {
                            item.order > order && (order = item.order);
                        });

                        //apply data
                        if(!item) {
                            item = apputil.pick(formData, 'name', 'email', 'phone');
                            item.count = data.count;
                            item.order = order + 1;
                            signup.data.push(item);
                        } else {
                            item.name = formData.name;
                            item.email = formData.email;
                            item.phone = formData.phone;
                            item.count = data.count;
                            !item.order && (item.order = order + 1);
                        }

                        promises.push(
                            service.updateSignup(signup)
                                .then(() => {
                                    if(signup.allow && item.count > 0) {
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
                });
        };

        $scope.delete = (date, entry) => {
            if(confirm(`Are you sure to delete name: ${entry.name} and email: ${entry.email}?`)) {
                loadSignups()
                    .then(() => {
                        let signup = $scope.signups.find(item => item.date.getTime() === date.getTime());
                        signup.data.forEach((item, index) => {
                            if(item.name === entry.name && item.email === entry.email) {
                                signup.data.splice(index, 1);
                            }
                        });

                        service.updateSignup(signup);
                    });
            }
        };

        $scope.formatDate = (date, liturgy) => {
            let time = date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
            date = $.datepicker.formatDate('dd/mm/yy', date);

            return `${date} @${time} - ${liturgy}`;
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

        $scope.checkSignup = () => {
            let formData = $scope.formData;

            if(formData) {
                //assign this formData
                $scope.signups.forEach(signup => {
                    $scope.formData[signup.date] = $scope.formData[signup.date] || {};

                    signup.data.forEach(item => {
                        const matchedName = formData.name && apputil.neutralize(item.name, true).match(new RegExp(`${apputil.neutralize(formData.name, true)}$`, 'i'));
                        const matchedEmail = formData.email && item.email === formData.email;
                        const matchedPhone = formData.phone && item.phone === formData.phone;

                        if(matchedName || matchedEmail || matchedPhone) {
                            //only fill name when both email and phone are empty
                            if(!matchedEmail && !matchedPhone) {
                                formData.name = item.name;
                            }

                            //only fill when not populated
                            formData.name  === undefined && (formData.name = item.name);
                            formData.email === undefined && (formData.email = item.email);
                            formData.phone === undefined && (formData.phone = item.phone);
                        } else {
                            //reset fields when name is not defined
                            if(formData.name === undefined && (formData.email === '' || formData.phone === '')) {
                                formData.email = undefined;
                                formData.phone = undefined;
                            }
                        }
                    });
                });

                //assign all formData for this person
                $scope.signups.forEach(signup => {
                    $scope.formData[signup.date].name = formData.name;
                    $scope.formData[signup.date].email = formData.email;
                    $scope.formData[signup.date].phone = formData.phone;

                    signup.data.forEach(item => {
                        let name = $scope.formData[signup.date].name,
                            email = $scope.formData[signup.date].email,
                            phone = $scope.formData[signup.date].phone;

                        if(item.name && item.name === name || item.email && item.email === email || item.phone && item.phone === phone) {
                            Object.assign($scope.formData[signup.date], apputil.pick(item, 'name', 'email', 'phone', 'count'));
                        }
                    });
                });

                //trigger input events
                $('.content .name').trigger('oninput');
                $('.content .email').trigger('oninput');
                $('.content .count').trigger('oninput');
            }
        };

        $scope.checkLimit = () => {
            const checkLimit = true;

            if(checkLimit) {
                $scope.disableSave = '';

                $scope.signups.forEach(signup => {
                    let date = signup.date,
                        data = $scope.formData[date],
                        item = signup.data.find(item => data.name && item.name === data.name),
                        count = item && item.count || 0,
                        remaining = $scope.getRemaining(date);

                    if(data) {
                        data.error = null;
                        if(data.count > remaining + count) {
                            data.error = `Không còn đủ chỗ cho ${data.count} người`;
                            $scope.disableSave = 'disabled';
                        }
                    }
                });
            }
        };

        $scope.prevList = () => {
            $('html').scrollTop(0, 0);
            $scope.listIndex = $scope.listIndex -= 1;
            renderNav();
        };

        $scope.nextList = () => {
            $('html').scrollTop(0, 0);
            $scope.listIndex = $scope.listIndex += 1;
            renderNav();
        };

        /*****************/
        /**** private ****/
        /*****************/

        const initForm = () => {
            //handle browser refresh
            if(!$scope.signups || $scope.signups.length === 0) {
                initSignups();
            }

            //handle back button refresh
            $window.addEventListener('hashchange', (e) => {
                if(!$scope.signups) {
                    initSignups();
                } else {
                    if((/\/signup$/).test(e.newURL)) {
                        $scope.$apply(() => {
                            $scope.formData = {};
                        });
                    }

                    if((/\/summary$/).test(e.newURL) && !$scope.signupData) {
                        location.hash = '/signup';
                    }
                }
            });
        };

        const initSignups = () => {
            loadSignups()
                .then(() => {
                    //render nav bar
                    renderNav();

                    //handle default page
                    if(!(/\/(signup|list)$/).test(location.hash)) {
                        location.hash = '/signup';
                    }
                });
        };

        const loadSignups = () => {
            const deferred = $q.defer();

            service.loadSignups()
                .then(values => {
                    $scope.signups = values;

                    $scope.signuplist = values.reduce((p, v) => {
                        v.list && p.push(v);
                        return p;
                    }, []);

                    deferred.resolve();
                });

            return deferred.promise;
        };

        const renderNav = () => {
            $scope.nav.prev = $scope.listIndex === 0 ? 'disabled' : '';
            $scope.nav.next = $scope.listIndex === $scope.signuplist.length - 1 ? 'disabled' : '';
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
            when('/fulllist', {
                templateUrl: `/${context}/thanhle/fulllist.html`
            }).
            otherwise({
                templateUrl: `/${context}/thanhle/signup.html`
            });

        $locationProvider.hashPrefix('');
    };

    config.$inject = ['$routeProvider', '$locationProvider'];
    app.config(config);
})();
