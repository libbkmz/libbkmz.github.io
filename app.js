app = angular.module("rare_helper_app", [
    "ui.bootstrap",
])

app.controller("main", [
    "$scope",
    "systems",
    "$timeout",


    function ($scope, systems, $timeout){
        $scope.me = {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
        $scope.search = {
            system_name: "",
            system_name_wrong: false
        }

        // systems.get_rare_systems($scope.me).then(function (obj){
        //  $scope.rare_systems = obj;
        // });

        $scope.$watch("me", function (oldVal, newVal){
            // if (oldVal == newVal)
            //  return;

            $scope.recalculate_distances();
        }, true);
        $scope.$watch("search", function (oldVal, newVal){
            if (oldVal == newVal)
                return;

            $scope.list_systems($scope.search.system_name);
        }, true);

        $scope.recalculate_distances = function (){
            systems.get_rare_systems($scope.me).then(function (obj){
                $scope.rare_systems = obj;
            });
        };

        $scope.select_current = function (obj){
            $scope.me = {
                x: parseFloat(obj.x),
                y: parseFloat(obj.y),
                z: parseFloat(obj.z)
            }
        };

        $scope.list_systems = function (name) {
            systems.get_coords_by_name(name).then(function (response){
                if (response.data == "-1"){
                    $scope.search.system_name_wrong = 1;
                }else{
                    $scope.search.system_name_wrong = 0;
                    $scope.me = response.data.coords;
                }
            });
        }
    }
]);

app.service("rest_data", [
    "$http",
    function ($http){
        var self = this;
        self.get_rare_systems = function (){
            return $http.get("/rare_systems.csv");
        }
        self.get_coords_by_name = function (name){
            return $http.get("http://www.edsm.net/api-v1/system?coords=1&systemName="+name);
        }
        //https://eddb.io/system/search?system%5Bmultiname%5D=uszaa
    }
]);

app.service("systems", [
    "rest_data",
    "$q",

    function (rest_data, $q){
        var self = this;

        self.get_rare_systems = function (me){
            // debugger;
            if (typeof self.rare_systems == 'undefined'){
                return self._load_rare_systems().then(function (obj){
                    self.rare_systems = obj;
                    self.rare_systems = self.calculate_euclidean_distance(me, self.rare_systems);
                    console.log(obj);
                    return self.rare_systems;
                })
            }else {
                return $q(function (resolve, reject){
                    self.rare_systems = self.calculate_euclidean_distance(me, self.rare_systems);
                    resolve(self.rare_systems);
                })
            }
        };
        // This function will calcualte distance
        // distance = sqrt((x1-x2)**2 + (y1-y2)**2 + (z1-z2)**2)
        self.calculate_euclidean_distance = function (me, obj){
            _x2 = parseFloat(me.x);
            _y2 = parseFloat(me.y);
            _z2 = parseFloat(me.z);

            for (var i=0;i<obj.length;i++){
                _x1 = parseFloat(obj[i].x);
                _y1 = parseFloat(obj[i].y);
                _z1 = parseFloat(obj[i].z);
                obj[i].distance = Math.sqrt(Math.pow(_x1-_x2, 2)+Math.pow(_y1-_y2, 2)+Math.pow(_z1-_z2, 2))
            }
            return obj;
        };
        self.get_coords_by_name = function (name){
            return rest_data.get_coords_by_name(name);
        }

        self._load_rare_systems = function (){
            return rest_data.get_rare_systems().then(function (response){
                // parse csv
                var obj = [];
                var lines = response.data.split("\n");

                for (var i=0;i<lines.length;i++) {
                    line = lines[i].split(",");

                    obj.push({
                        x: line[0],
                        y: line[1],
                        z: line[2],
                        name: line[3],
                    })
                }
                return obj;
            });
        };

        self.init = function (){
            
        };

        self.init();
    }
]);