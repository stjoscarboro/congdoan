const { app } = require('./resources/js/angular-app.js');

(() => {
    const controller = ($scope) => {
        /**
         * init
         */
        $scope.init = () => {
            console.log('init');
            $scope.hello = 'Hello World!';
        };
    };

    controller.$inject = ['$scope'];
    app.controller("thanhle", controller);
})();