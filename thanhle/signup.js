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
                    for(let i=0; i<$scope.signups.length; i++) {
                        let signup = $scope.signups[i],
                            date = signup.date,
                            data = $scope.formData[date],
                            item, order = 0;

                        if(signup.allow) {
                            //find item
                            item = signup.data.find(item => {
                                return data.name && item.name === data.name
                                    || data.email && item.email === data.email
                                    || data.phone && item.phone === data.phone
                            });

                            //find last order number
                            for(let j=0; j<signup.data.length; j++) {
                                const item = signup.data[j];
                                item.order > order && (order = item.order);
                            }

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
                                        if(item.count > 0) {
                                            Object.assign(item, apputil.pick(signup, 'date', 'liturgy'));
                                            $scope.signupData.push(item);
                                        }
                                    })
                            );
                        }
                    }

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

                        for(let j=0; j<signup.data.length; j++) {
                            let item = signup.data[j];

                            if(item.name === entry.name && item.email === entry.email && item.phone === entry.phone) {
                                signup.data.splice(j, 1);
                            }
                        }

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
            let signup = $scope.signups.find(item => item.date.getTime() === date.getTime()),
                remaining = $scope.total;

            for(let j=0; j<signup.data.length; j++) {
                remaining -= signup.data[j].count || 0;
            }

            return remaining;
        };

        $scope.checkSignup = () => {
            let formData = $scope.formData;

            if(formData) {
                let matchedName = null, matchedEmail = null, matchedPhone = null,
                    signup, item;

                //assign this formData
                for(let i=$scope.signups.length-1; i>=0; i--) {
                    signup = $scope.signups[i];
                    $scope.formData[signup.date] = $scope.formData[signup.date] || {};

                    if(matchedName === null && matchedEmail === null && matchedPhone === null) {
                        for(let j=0; j<signup.data.length; j++) {
                            item = signup.data[j];
                            const itemName = apputil.neutralize(item.name, true);
                            const formName = formData.name && apputil.neutralize(formData.name, true) || null;

                            matchedName = formData.name && itemName.match(new RegExp(`${formName}$`, 'i'));
                            matchedEmail = formData.email && item.email === formData.email || null;
                            matchedPhone = formData.phone && item.phone === formData.phone || null;

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
                                if(formData.name === undefined) {
                                    formData.email === '' && (formData.email = undefined);
                                    formData.phone === '' && (formData.phone = undefined);
                                }
                            }
                        }
                    }
                }

                //assign all formData
                for(let i=$scope.signups.length-1; i>=0; i--) {
                    signup = $scope.signups[i];

                    if(signup.allow) {
                        //no match then reset counts
                        if(matchedName === null && matchedEmail === null && matchedPhone === null) {
                            for(let i=$scope.signups.length-1; i>=0; i--) {
                                $scope.formData[signup.date].count = null;
                            }
                        }

                        for(let j=0; j<signup.data.length; j++) {
                            item = signup.data[j];
                            const matchedName = item.name && item.name === formData.name;
                            const matchedEmail = item.email && item.email === formData.email;
                            const matchedPhone = item.phone && item.phone === formData.phone;

                            if(matchedName || matchedEmail || matchedPhone) {
                                $scope.formData[signup.date].name = formData.name;
                                $scope.formData[signup.date].email = formData.email;
                                $scope.formData[signup.date].phone = formData.phone;
                                $scope.formData[signup.date].count = item.count;
                            }
                        }
                    }
                }

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

                for(let i=$scope.signups.length-1; i>=0; i--) {
                    let signup = $scope.signups[i];

                    if(signup.allow) {
                        let date = signup.date,
                            data = $scope.formData[date],
                            remaining = $scope.getRemaining(date),
                            item;

                        if(data) {
                            //find item
                            item = signup.data.find(item => {
                                return data.name && item.name === data.name
                                    || data.email && item.email === data.email
                                    || data.phone && item.phone === data.phone
                            });

                            data.error = null;
                            if(data.count > remaining + (item && item.count || 0)) {
                                data.error = `Không còn đủ chỗ cho ${data.count} người`;
                                $scope.disableSave = 'disabled';
                            }
                        }
                    }
                }
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
                    //check allowed signups
                    let allows = $scope.signups.reduce((p, v) => { v.allow && p.push(v); return p}, []);
                    $scope.allows = allows.length > 0;

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
