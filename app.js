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
            system_name: "Sol",
            system_name_wrong: false,
            target_limit: 160.0,
        }
        $scope.current_sort = function (el){
            if ($scope.trading.bought_list.length > 0){
                // return "min_distance_of_influence";
                return el.min_distance_of_influence;
            }else{
                return el.distance;
                // return "distance";
            }
        };

        $scope.$watch("me", function (oldVal, newVal){
            if (oldVal == newVal){
                $scope._init_systems();
                return;
            }

            $scope.update_distances();
        }, true);

        $scope.$watch("search", function (oldVal, newVal){
            if (oldVal == newVal)
                return;
            $scope.update_distances();
        }, true);

        $scope.search_system_name = function (){
            $scope.list_systems($scope.search.system_name);
        }

        $scope._init_systems = function (){
            systems.get_rare_systems($scope.me).then(function (obj){
                $scope.rare_systems = obj;
            });
        }

        $scope.update_distances = function (){
            systems.get_rare_systems($scope.me).then(function (obj){
                $scope.rare_systems = obj;

                var any_bought = $scope.trading.bought_list.length > 0 ? true: false;

                for (var i=0;i<$scope.rare_systems.length;i++){
                    var item = $scope.rare_systems[i];
                    if (!item.bought){
                        for (var j=0;j<$scope.trading.bought_list.length;j++)
                        {
                            var bought_item = $scope.trading.bought_list[j];
                            item.distance_of_influence.push(
                               Math.sqrt(Math.pow(item.x-bought_item.x, 2)+Math.pow(item.y-bought_item.y, 2)+Math.pow(item.z-bought_item.z, 2)) 
                            )

                        }
                        item.min_distance_of_influence =  Math.min.apply(Math, item.distance_of_influence);
                    }

                    var color = 255;
                    if (any_bought){
                        var color_tmp = item.min_distance_of_influence - parseFloat($scope.search.target_limit);
                        if (color_tmp > 0){
                            color = 150-parseInt(color_tmp);
                        }
                    }

                    item.row_color[0] = 255;
                    item.row_color[1] = color;
                    item.row_color[2] = color
                    
                }
            })
        };

        $scope.select_current = function (obj){
            $scope.me = {
                x: parseFloat(obj.x),
                y: parseFloat(obj.y),
                z: parseFloat(obj.z)
            }
            $scope.update_distances();
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
        $scope.convert_to_color = function (list){
            var out = "rgb("+list[0]+", "+list[1]+", "+list[2]+")";
            return out;
        }
        $scope.trading = {
            bought_list: [],

            bought_button: function (system){
                $scope.select_current(system);
                
                system.bought = true;
                $scope.trading.bought_list.push(system);
                $scope.trading._update_smth();
            },
            remove_button: function (system){
                console.log($scope.trading.bought_list.length);

                $scope.trading.bought_list = $scope.trading.bought_list.filter(function (el){
                    return el != system;
                })                
                system.bought = false;
                $scope.trading._update_smth();
            },
            _update_smth: function (){
                $scope.update_distances();
                // if ($scope.trading.bought_list.length > 0){
                //     $scope.current_sort = "min_distance_of_influence";
                // }else{
                //     $scope.current_sort = "distance";
                // }
            }
        }
    }
]);

app.service("rest_data", [
    "$http",
    function ($http){
        var self = this;
        self.get_rare_systems = function (){
            return $http.get("/rare_data.csv");
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
                    if (i==0){
                        // skip header row
                        continue
                    }
                    // MAX CAP,SUPPLY RATE,PRICE,ITEM,DIST(Ls),STATION,SYSTEM,x,y,z,SUPPLY RATE MIN,SUPPLY RATE MAX
                    line = lines[i].split(",");

                    obj.push({
                        max_cap:         line[0],
                        supply_rate:     line[1],
                        price:           line[2],
                        item:            line[3],
                        dist_ls:         line[4],
                        station_name:    line[5],
                        system_name:     line[6],
                        x:               parseFloat(line[7]),
                        y:               parseFloat(line[8]),
                        z:               parseFloat(line[9]),
                        supply_rate_min: line[10],
                        supply_rate_max: line[11],

                        // private values for better visual effect
                        distance: 0.0,
                        bought: false,
                        distance_of_influence: new Array(),
                        min_distance_of_influence: 0.0,
                        row_color: [255, 255, 255],





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