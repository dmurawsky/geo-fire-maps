(function () {
    'use strict';

    angular
        .module('geoFireMaps', [])
        .factory('GEO', function (FBDB, $cordovaGeolocation, CU, localStorageService, $q, $timeout, $http) {
            var ref = FBDB.child('geo');
            var geoFires = {};
            
            return {
                setup:setup,
                getActiveUsers: getActiveUsers,
                location: getCoords,
                geoCode: geoCode,
                placeSearch: placeSearch
            };
            
            function setup(firebase){
                
            }

            function getActiveUsers(queryObj) {
                var userRef = ref.child('users');
                var gfUsers = new GeoFire(userRef);
                geoFires.users = gfUsers;
                var geoQuery = geoFire.query(queryObj);
            }

            function geoCancel(key) {
                if (key) {
                    geoFires[key].cancel();
                } else {
                    angular.forEach(geoFires, function (gf) {
                        gf.cancel();
                    })
                    geoFires = {};
                }
            }

            function geoCode(address) {
                return $http.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyA2nnvahRdrsXGvTujYHNsuUAJCL3DRJw0')
            }

            function getCoords() {
                //     if we change the ls prefix this will break. instead of changing prefix we should check all keys and update
                var allowed = localStorageService.get('location_allowed');
                if (allowed) {
                    var posOptions = { timeout: 10000, enableHighAccuracy: false };
                    return $cordovaGeolocation
                        .getCurrentPosition(posOptions)
                        .then(function (position) {
                            var coords = {
                                lat: position.coords.latitude,
                                long: position.coords.longitude
                            }
                            CU.set('last_location', coords);
                            return coords;
                        }, function (err) {
                            console.log(err);
                            localStorageService.get('location_allowed', false);
                            return false;
                        });
                } else {
                    var defer = $q.defer();
                    $timeout(function () { defer.resolve(false); });
                    return defer.promise;
                }
            }
        })
        .directive('gfmaps', function ($window) {

            return {
                restrict: 'E',
                replace: true,
                template: '<div class="gfmaps"></div>',
                scope: {
                    center: '=', // Center point on the map (e.g. <code>{ latitude: 10, longitude: 10 }</code>).
                    markers: '=', // Array of map markers (e.g. <code>[{ lat: 10, lon: 10, name: 'hello' }]</code>).
                    width: '@', // Map width in pixels.
                    height: '@', // Map height in pixels.
                    zoom: '=', // Zoom level (one is totally zoomed out, 25 is very much zoomed in).
                    mapTypeId: '@', // Type of tile to show on the map (roadmap, satellite, hybrid, terrain).
                    panControl: '@', // Whether to show a pan control on the map.
                    zoomControl: '@', // Whether to show a zoom control on the map.
                    scaleControl: '@' // Whether to show scale control on the map.
                },
                link: function (scope, element, attrs) {
                    var toResize, toCenter;
                    var map;
                    var infowindow;
                    var currentMarkers;
                    var callbackName = 'InitMapCb';
                    var google;

                    // callback when google maps is loaded
                    $window[callbackName] = function () {
                        google = window.google;
                        createMap();
                        updateMarkers();
                    };

                    if (!$window.google || !$window.google.maps) {
                        loadGMaps();
                    } else {
                        google = window.google;
                        createMap();
                    }

                    function loadGMaps() {
                        var script = $window.document.createElement('script');
                        script.type = 'text/javascript';
                        script.src = 'http://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true&librairies=places&callback=InitMapCb&key=AIzaSyA2nnvahRdrsXGvTujYHNsuUAJCL3DRJw0';
                        $window.document.body.appendChild(script);
                    }

                    function createMap() {
                        console.log(scope.center)
                        var c = scope.center;
                        var mapOptions = {
                            zoom: scope.zoom || 10,
                            center: new google.maps.LatLng(c.lat, c.lon),
                            mapTypeId: google.maps.MapTypeId.ROADMAP,
                            panControl: true,
                            zoomControl: true,
                            mapTypeControl: true,
                            scaleControl: false,
                            streetViewControl: false,
                            navigationControl: true,
                            disableDefaultUI: true,
                            overviewMapControl: true
                        };
                        if (!(map instanceof google.maps.Map)) {
                            map = new google.maps.Map(element[0], mapOptions);
                            map.mapTypeControl = false;
                            map.zoomControl = false;

                            // START CUSTOM MAP STYLES
                            map.set('styles', [{ "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }, { "lightness": 17 }] }, { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 20 }] }, { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }, { "lightness": 17 }] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#ffffff" }, { "lightness": 29 }, { "weight": 0.2 }] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 18 }] }, { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }, { "lightness": 16 }] }, { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }, { "lightness": 21 }] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#dedede" }, { "lightness": 21 }] }, { "elementType": "labels.text.stroke", "stylers": [{ "visibility": "on" }, { "color": "#ffffff" }, { "lightness": 16 }] }, { "elementType": "labels.text.fill", "stylers": [{ "saturation": 36 }, { "color": "#333333" }, { "lightness": 40 }] }, { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }, { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#f2f2f2" }, { "lightness": 19 }] }, { "featureType": "administrative", "elementType": "geometry.fill", "stylers": [{ "color": "#fefefe" }, { "lightness": 20 }] }, { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#fefefe" }, { "lightness": 17 }, { "weight": 1.2 }] }]);
                            // END CUSTOM MAP STYLES
                            
                            google.maps.event.addDomListener(element[0], 'mousedown', function (e) {
                                e.preventDefault();
                                return false;
                            });
                            infowindow = new google.maps.InfoWindow({
                                disableAutoPan: true
                            });
                        }
                    }

                    scope.$watch('markers', function () {
                        updateMarkers();
                    });
                    
                    function onItemClick(pin, label) {
                        var contentString = label;
                        infowindow.setContent(contentString);
                        infowindow.setPosition(pin.position);
                        infowindow.open(map);
                        google.maps.event.addListener(infowindow, 'closeclick', function () {
                            infowindow.close();
                        });
                    }

                    function markerCb(marker, member, location) {
                        return function () {
                            onItemClick(marker, member.name);
                        };
                    }
                    
                    function updateMarkers() {
                        if (map && scope.markers) {
                            currentMarkers = [];
                            var markers = scope.markers;
                            if (angular.isString(markers)) {
                                markers = scope.$eval(scope.markers);
                            }
                            for (var i = 0; i < markers.length; i++) {
                                var m = markers[i];
                                var loc = new google.maps.LatLng(m.lat, m.lon);
                                var mm = new google.maps.Marker({
                                    position: loc,
                                    map: map,
                                    title: m.name,
                                    icon: 'img/icon.png'
                                });
                                google.maps.event.addListener(mm, 'click', markerCb(mm, m, loc));
                                currentMarkers.push(mm);
                            }
                        }
                    }
                    
                    function getLocation(loc) {
                        if (loc == null) {
                            return new google.maps.LatLng(40, -73);
                        }
                        if (angular.isString(loc)) {
                            loc = scope.$eval(loc);
                        }
                        return new google.maps.LatLng(loc.lat, loc.lon);
                    }

                }
            };
        });
})(); 