/**
 *
 * The stellar.txt service looks up and caches stellar.txt files.
 *
 * These files are used to do DNS-based verifications autonomously on the
 * client-side. Quite neat when you think about it and a decent solution until
 * we have a network-internal nickname system.
 * 
 * @namespace rpStellarTxt
 */

var sc = angular.module('stellarClient');

sc.factory('rpStellarTxt', ['$q', '$rootScope',
    function ($q, $scope) {
        var txts = {};

        function get(domain) {
            if (txts[domain]) {
                return txts[domain];
            } else {
                var txtPromise = $q.defer();

                txts[domain] = txtPromise.promise;

                var urls = [
                        'https://www.'+domain+'/stellar.txt',
                        'https://'+domain+'/stellar.txt',
                        'https://stellar.'+domain+'/stellar.txt'
                ];
                var next = function (xhr, status) {
                    if (!urls.length) {
                        txtPromise.reject(new Error("No stellar.txt found"));
                        return;
                    }
                    var url = urls.pop();
                    $.ajax({
                        url: url,
                        dataType: 'text',
                        timeout: Options.DEFAULT_AJAX_TIMEOUT || 10000,
                        success: function (data) {
                            $scope.$apply(function() {
                                var sections = parse(data);
                                txtPromise.resolve(sections);
                            });
                        },
                        error: function (xhr, status) {
                            setImmediate(function () {
                                $scope.$apply(function () {
                                    next(xhr, status);
                                });
                            });
                        }
                    });
                };
                next();

                return txtPromise.promise;
            }
        }

        // TODO: Consider using JSON.
        function parse(txt) {
            txt = txt.replace('\r\n', '\n');
            txt = txt.replace('\r', '\n');
            txt = txt.split('\n');

            var currentSection = "", sections = {};
            for (var i = 0, l = txt.length; i < l; i++) {
                var line = txt[i];
                if (!line.length || line[0] === '#') {
                    continue;
                } else if (line[0] === '[' && line[line.length-1] === ']') {
                    currentSection = line.slice(1, line.length-1);
                    sections[currentSection] = [];
                } else {
                    line = line.replace(/^\s+|\s+$/g, '');
                    if (sections[currentSection]) {
                        sections[currentSection].push(line);
                    }
                }
            }

            return sections;
        }

        return {
            get: get,
            parse: parse
        };
    }]);
