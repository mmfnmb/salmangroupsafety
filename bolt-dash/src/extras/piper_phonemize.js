// Piper's phonemizer (trimmed to the Arabic and English dictionaries) (espeak-ng compiled to WebAssembly), from @mintplex-labs/piper-tts-web 1.0.5 (MIT; espeak-ng is GPL-3.0).
var createPiperPhonemize = (() => {
  var _scriptDir = typeof document !== "undefined" && document.currentScript ? document.currentScript.src : void 0;
  if (typeof __filename !== "undefined") _scriptDir = _scriptDir || __filename;
  return function(moduleArg = {}) {
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    Module["ready"] = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    if (!Module.expectedDataFileDownloads) {
      Module.expectedDataFileDownloads = 0;
    }
    Module.expectedDataFileDownloads++;
    (function() {
      if (Module["ENVIRONMENT_IS_PTHREAD"] || Module["$ww"]) return;
      var loadPackage = function(metadata) {
        if (typeof window === "object") {
          window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/");
        } else if (typeof process === "undefined" && typeof location !== "undefined") {
          encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/");
        }
        var PACKAGE_NAME = "piper_phonemize.data";
        var REMOTE_PACKAGE_BASE = "piper_phonemize.data";
        if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
          Module["locateFile"] = Module["locateFilePackage"];
          err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)");
        }
        var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
        function fetchRemotePackage(packageName, packageSize, callback, errback) {
          if (typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string") {
            require("fs").readFile(packageName, function(err2, contents) {
              if (err2) {
                errback(err2);
              } else {
                callback(contents.buffer);
              }
            });
            return;
          }
          var xhr = new XMLHttpRequest();
          xhr.open("GET", packageName, true);
          xhr.responseType = "arraybuffer";
          xhr.onprogress = function(event) {
            var url = packageName;
            var size = packageSize;
            if (event.total) size = event.total;
            if (event.loaded) {
              if (!xhr.addedTotal) {
                xhr.addedTotal = true;
                if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
                Module.dataFileDownloads[url] = { loaded: event.loaded, total: size };
              } else {
                Module.dataFileDownloads[url].loaded = event.loaded;
              }
              var total = 0;
              var loaded = 0;
              var num = 0;
              for (var download in Module.dataFileDownloads) {
                var data = Module.dataFileDownloads[download];
                total += data.total;
                loaded += data.loaded;
                num++;
              }
              total = Math.ceil(total * Module.expectedDataFileDownloads / num);
              if (Module["setStatus"]) Module["setStatus"](`Downloading data... (${loaded}/${total})`);
            } else if (!Module.dataFileDownloads) {
              if (Module["setStatus"]) Module["setStatus"]("Downloading data...");
            }
          };
          xhr.onerror = function(event) {
            throw new Error("NetworkError for: " + packageName);
          };
          xhr.onload = function(event) {
            if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || xhr.status == 0 && xhr.response) {
              var packageData = xhr.response;
              callback(packageData);
            } else {
              throw new Error(xhr.statusText + " : " + xhr.responseURL);
            }
          };
          xhr.send(null);
        }
        function handleError(error) {
          console.error("package error:", error);
        }
        var fetchedCallback = null;
        var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
        if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
          if (fetchedCallback) {
            fetchedCallback(data);
            fetchedCallback = null;
          } else {
            fetched = data;
          }
        }, handleError);
        function runWithFS() {
          function assert2(check, msg) {
            if (!check) throw msg + new Error().stack;
          }
          Module["FS_createPath"]("/", "espeak-ng-data", true, true);
          Module["FS_createPath"]("/espeak-ng-data", "lang", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "aav", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "art", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "azc", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "bat", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "bnt", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "ccs", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "cel", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "cus", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "dra", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "esx", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "gmq", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "gmw", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "grk", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "inc", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "ine", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "ira", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "iro", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "itc", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "jpx", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "map", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "miz", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "myn", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "poz", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "roa", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "sai", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "sem", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "sit", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "tai", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "trk", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "urj", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "zle", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "zls", true, true);
          Module["FS_createPath"]("/espeak-ng-data/lang", "zlw", true, true);
          Module["FS_createPath"]("/espeak-ng-data", "mbrola_ph", true, true);
          Module["FS_createPath"]("/espeak-ng-data", "voices", true, true);
          Module["FS_createPath"]("/espeak-ng-data/voices", "!v", true, true);
          Module["FS_createPath"]("/espeak-ng-data/voices", "mb", true, true);
          function DataRequest(start, end, audio) {
            this.start = start;
            this.end = end;
            this.audio = audio;
          }
          DataRequest.prototype = { requests: {}, open: function(mode, name) {
            this.name = name;
            this.requests[name] = this;
            Module["addRunDependency"](`fp ${this.name}`);
          }, send: function() {
          }, onload: function() {
            var byteArray = this.byteArray.subarray(this.start, this.end);
            this.finish(byteArray);
          }, finish: function(byteArray) {
            var that = this;
            Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
            Module["removeRunDependency"](`fp ${that.name}`);
            this.requests[this.name] = null;
          } };
          var files = metadata["files"];
          for (var i = 0; i < files.length; ++i) {
            new DataRequest(files[i]["start"], files[i]["end"], files[i]["audio"] || 0).open("GET", files[i]["filename"]);
          }
          function processPackageData(arrayBuffer) {
            assert2(arrayBuffer, "Loading data file failed.");
            assert2(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData");
            var byteArray = new Uint8Array(arrayBuffer);
            DataRequest.prototype.byteArray = byteArray;
            var files2 = metadata["files"];
            for (var i2 = 0; i2 < files2.length; ++i2) {
              DataRequest.prototype.requests[files2[i2].filename].onload();
            }
            Module["removeRunDependency"]("datafile_piper_phonemize.data");
          }
          Module["addRunDependency"]("datafile_piper_phonemize.data");
          if (!Module.preloadResults) Module.preloadResults = {};
          Module.preloadResults[PACKAGE_NAME] = { fromCache: false };
          if (fetched) {
            processPackageData(fetched);
            fetched = null;
          } else {
            fetchedCallback = processPackageData;
          }
        }
        if (Module["calledRun"]) {
          runWithFS();
        } else {
          if (!Module["preRun"]) Module["preRun"] = [];
          Module["preRun"].push(runWithFS);
        }
      };
      loadPackage({"files": [{"filename": "/espeak-ng-data/ar_dict", "start": 0, "end": 478165}, {"filename": "/espeak-ng-data/en_dict", "start": 478165, "end": 645109}, {"filename": "/espeak-ng-data/intonations", "start": 645109, "end": 647149}, {"filename": "/espeak-ng-data/lang/aav/vi", "start": 647149, "end": 647260}, {"filename": "/espeak-ng-data/lang/aav/vi-VN-x-central", "start": 647260, "end": 647403}, {"filename": "/espeak-ng-data/lang/aav/vi-VN-x-south", "start": 647403, "end": 647545}, {"filename": "/espeak-ng-data/lang/art/eo", "start": 647545, "end": 647586}, {"filename": "/espeak-ng-data/lang/art/ia", "start": 647586, "end": 647615}, {"filename": "/espeak-ng-data/lang/art/io", "start": 647615, "end": 647665}, {"filename": "/espeak-ng-data/lang/art/jbo", "start": 647665, "end": 647734}, {"filename": "/espeak-ng-data/lang/art/lfn", "start": 647734, "end": 647869}, {"filename": "/espeak-ng-data/lang/art/piqd", "start": 647869, "end": 647925}, {"filename": "/espeak-ng-data/lang/art/py", "start": 647925, "end": 648065}, {"filename": "/espeak-ng-data/lang/art/qdb", "start": 648065, "end": 648122}, {"filename": "/espeak-ng-data/lang/art/qya", "start": 648122, "end": 648295}, {"filename": "/espeak-ng-data/lang/art/sjn", "start": 648295, "end": 648470}, {"filename": "/espeak-ng-data/lang/azc/nci", "start": 648470, "end": 648584}, {"filename": "/espeak-ng-data/lang/bat/lt", "start": 648584, "end": 648612}, {"filename": "/espeak-ng-data/lang/bat/ltg", "start": 648612, "end": 648924}, {"filename": "/espeak-ng-data/lang/bat/lv", "start": 648924, "end": 649153}, {"filename": "/espeak-ng-data/lang/bnt/sw", "start": 649153, "end": 649194}, {"filename": "/espeak-ng-data/lang/bnt/tn", "start": 649194, "end": 649236}, {"filename": "/espeak-ng-data/lang/ccs/ka", "start": 649236, "end": 649360}, {"filename": "/espeak-ng-data/lang/cel/cy", "start": 649360, "end": 649397}, {"filename": "/espeak-ng-data/lang/cel/ga", "start": 649397, "end": 649463}, {"filename": "/espeak-ng-data/lang/cel/gd", "start": 649463, "end": 649514}, {"filename": "/espeak-ng-data/lang/cus/om", "start": 649514, "end": 649553}, {"filename": "/espeak-ng-data/lang/dra/kn", "start": 649553, "end": 649608}, {"filename": "/espeak-ng-data/lang/dra/ml", "start": 649608, "end": 649665}, {"filename": "/espeak-ng-data/lang/dra/ta", "start": 649665, "end": 649716}, {"filename": "/espeak-ng-data/lang/dra/te", "start": 649716, "end": 649786}, {"filename": "/espeak-ng-data/lang/esx/kl", "start": 649786, "end": 649816}, {"filename": "/espeak-ng-data/lang/eu", "start": 649816, "end": 649870}, {"filename": "/espeak-ng-data/lang/gmq/da", "start": 649870, "end": 649913}, {"filename": "/espeak-ng-data/lang/gmq/is", "start": 649913, "end": 649940}, {"filename": "/espeak-ng-data/lang/gmq/nb", "start": 649940, "end": 650027}, {"filename": "/espeak-ng-data/lang/gmq/sv", "start": 650027, "end": 650052}, {"filename": "/espeak-ng-data/lang/gmw/af", "start": 650052, "end": 650175}, {"filename": "/espeak-ng-data/lang/gmw/de", "start": 650175, "end": 650217}, {"filename": "/espeak-ng-data/lang/gmw/en", "start": 650217, "end": 650357}, {"filename": "/espeak-ng-data/lang/gmw/en-029", "start": 650357, "end": 650692}, {"filename": "/espeak-ng-data/lang/gmw/en-GB-scotland", "start": 650692, "end": 650987}, {"filename": "/espeak-ng-data/lang/gmw/en-GB-x-gbclan", "start": 650987, "end": 651225}, {"filename": "/espeak-ng-data/lang/gmw/en-GB-x-gbcwmd", "start": 651225, "end": 651413}, {"filename": "/espeak-ng-data/lang/gmw/en-GB-x-rp", "start": 651413, "end": 651662}, {"filename": "/espeak-ng-data/lang/gmw/en-US", "start": 651662, "end": 651919}, {"filename": "/espeak-ng-data/lang/gmw/en-US-nyc", "start": 651919, "end": 652190}, {"filename": "/espeak-ng-data/lang/gmw/lb", "start": 652190, "end": 652221}, {"filename": "/espeak-ng-data/lang/gmw/nl", "start": 652221, "end": 652244}, {"filename": "/espeak-ng-data/lang/grk/el", "start": 652244, "end": 652267}, {"filename": "/espeak-ng-data/lang/grk/grc", "start": 652267, "end": 652366}, {"filename": "/espeak-ng-data/lang/inc/as", "start": 652366, "end": 652408}, {"filename": "/espeak-ng-data/lang/inc/bn", "start": 652408, "end": 652433}, {"filename": "/espeak-ng-data/lang/inc/bpy", "start": 652433, "end": 652472}, {"filename": "/espeak-ng-data/lang/inc/gu", "start": 652472, "end": 652514}, {"filename": "/espeak-ng-data/lang/inc/hi", "start": 652514, "end": 652537}, {"filename": "/espeak-ng-data/lang/inc/kok", "start": 652537, "end": 652563}, {"filename": "/espeak-ng-data/lang/inc/mr", "start": 652563, "end": 652604}, {"filename": "/espeak-ng-data/lang/inc/ne", "start": 652604, "end": 652641}, {"filename": "/espeak-ng-data/lang/inc/or", "start": 652641, "end": 652680}, {"filename": "/espeak-ng-data/lang/inc/pa", "start": 652680, "end": 652705}, {"filename": "/espeak-ng-data/lang/inc/sd", "start": 652705, "end": 652771}, {"filename": "/espeak-ng-data/lang/inc/si", "start": 652771, "end": 652826}, {"filename": "/espeak-ng-data/lang/inc/ur", "start": 652826, "end": 652920}, {"filename": "/espeak-ng-data/lang/ine/hy", "start": 652920, "end": 652981}, {"filename": "/espeak-ng-data/lang/ine/hyw", "start": 652981, "end": 653346}, {"filename": "/espeak-ng-data/lang/ine/sq", "start": 653346, "end": 653449}, {"filename": "/espeak-ng-data/lang/ira/fa", "start": 653449, "end": 653539}, {"filename": "/espeak-ng-data/lang/ira/fa-Latn", "start": 653539, "end": 653808}, {"filename": "/espeak-ng-data/lang/ira/ku", "start": 653808, "end": 653848}, {"filename": "/espeak-ng-data/lang/iro/chr", "start": 653848, "end": 654417}, {"filename": "/espeak-ng-data/lang/itc/la", "start": 654417, "end": 654714}, {"filename": "/espeak-ng-data/lang/jpx/ja", "start": 654714, "end": 654766}, {"filename": "/espeak-ng-data/lang/ko", "start": 654766, "end": 654817}, {"filename": "/espeak-ng-data/lang/map/haw", "start": 654817, "end": 654859}, {"filename": "/espeak-ng-data/lang/miz/mto", "start": 654859, "end": 655042}, {"filename": "/espeak-ng-data/lang/myn/quc", "start": 655042, "end": 655252}, {"filename": "/espeak-ng-data/lang/poz/id", "start": 655252, "end": 655386}, {"filename": "/espeak-ng-data/lang/poz/mi", "start": 655386, "end": 655753}, {"filename": "/espeak-ng-data/lang/poz/ms", "start": 655753, "end": 656183}, {"filename": "/espeak-ng-data/lang/qu", "start": 656183, "end": 656271}, {"filename": "/espeak-ng-data/lang/roa/an", "start": 656271, "end": 656298}, {"filename": "/espeak-ng-data/lang/roa/ca", "start": 656298, "end": 656323}, {"filename": "/espeak-ng-data/lang/roa/es", "start": 656323, "end": 656386}, {"filename": "/espeak-ng-data/lang/roa/es-419", "start": 656386, "end": 656553}, {"filename": "/espeak-ng-data/lang/roa/fr", "start": 656553, "end": 656632}, {"filename": "/espeak-ng-data/lang/roa/fr-BE", "start": 656632, "end": 656716}, {"filename": "/espeak-ng-data/lang/roa/fr-CH", "start": 656716, "end": 656802}, {"filename": "/espeak-ng-data/lang/roa/ht", "start": 656802, "end": 656942}, {"filename": "/espeak-ng-data/lang/roa/it", "start": 656942, "end": 657051}, {"filename": "/espeak-ng-data/lang/roa/pap", "start": 657051, "end": 657113}, {"filename": "/espeak-ng-data/lang/roa/pt", "start": 657113, "end": 657208}, {"filename": "/espeak-ng-data/lang/roa/pt-BR", "start": 657208, "end": 657317}, {"filename": "/espeak-ng-data/lang/roa/ro", "start": 657317, "end": 657343}, {"filename": "/espeak-ng-data/lang/sai/gn", "start": 657343, "end": 657390}, {"filename": "/espeak-ng-data/lang/sem/am", "start": 657390, "end": 657431}, {"filename": "/espeak-ng-data/lang/sem/ar", "start": 657431, "end": 657481}, {"filename": "/espeak-ng-data/lang/sem/he", "start": 657481, "end": 657521}, {"filename": "/espeak-ng-data/lang/sem/mt", "start": 657521, "end": 657562}, {"filename": "/espeak-ng-data/lang/sit/cmn", "start": 657562, "end": 658248}, {"filename": "/espeak-ng-data/lang/sit/cmn-Latn-pinyin", "start": 658248, "end": 658409}, {"filename": "/espeak-ng-data/lang/sit/hak", "start": 658409, "end": 658537}, {"filename": "/espeak-ng-data/lang/sit/my", "start": 658537, "end": 658593}, {"filename": "/espeak-ng-data/lang/sit/yue", "start": 658593, "end": 658787}, {"filename": "/espeak-ng-data/lang/sit/yue-Latn-jyutping", "start": 658787, "end": 659000}, {"filename": "/espeak-ng-data/lang/tai/shn", "start": 659000, "end": 659092}, {"filename": "/espeak-ng-data/lang/tai/th", "start": 659092, "end": 659129}, {"filename": "/espeak-ng-data/lang/trk/az", "start": 659129, "end": 659174}, {"filename": "/espeak-ng-data/lang/trk/ba", "start": 659174, "end": 659199}, {"filename": "/espeak-ng-data/lang/trk/cv", "start": 659199, "end": 659239}, {"filename": "/espeak-ng-data/lang/trk/kk", "start": 659239, "end": 659279}, {"filename": "/espeak-ng-data/lang/trk/ky", "start": 659279, "end": 659322}, {"filename": "/espeak-ng-data/lang/trk/nog", "start": 659322, "end": 659361}, {"filename": "/espeak-ng-data/lang/trk/tk", "start": 659361, "end": 659386}, {"filename": "/espeak-ng-data/lang/trk/tr", "start": 659386, "end": 659411}, {"filename": "/espeak-ng-data/lang/trk/tt", "start": 659411, "end": 659434}, {"filename": "/espeak-ng-data/lang/trk/ug", "start": 659434, "end": 659458}, {"filename": "/espeak-ng-data/lang/trk/uz", "start": 659458, "end": 659497}, {"filename": "/espeak-ng-data/lang/urj/et", "start": 659497, "end": 659734}, {"filename": "/espeak-ng-data/lang/urj/fi", "start": 659734, "end": 659971}, {"filename": "/espeak-ng-data/lang/urj/hu", "start": 659971, "end": 660044}, {"filename": "/espeak-ng-data/lang/urj/smj", "start": 660044, "end": 660089}, {"filename": "/espeak-ng-data/lang/zle/be", "start": 660089, "end": 660141}, {"filename": "/espeak-ng-data/lang/zle/ru", "start": 660141, "end": 660198}, {"filename": "/espeak-ng-data/lang/zle/ru-LV", "start": 660198, "end": 660478}, {"filename": "/espeak-ng-data/lang/zle/ru-cl", "start": 660478, "end": 660569}, {"filename": "/espeak-ng-data/lang/zle/uk", "start": 660569, "end": 660666}, {"filename": "/espeak-ng-data/lang/zls/bg", "start": 660666, "end": 660777}, {"filename": "/espeak-ng-data/lang/zls/bs", "start": 660777, "end": 661007}, {"filename": "/espeak-ng-data/lang/zls/hr", "start": 661007, "end": 661269}, {"filename": "/espeak-ng-data/lang/zls/mk", "start": 661269, "end": 661297}, {"filename": "/espeak-ng-data/lang/zls/sl", "start": 661297, "end": 661340}, {"filename": "/espeak-ng-data/lang/zls/sr", "start": 661340, "end": 661590}, {"filename": "/espeak-ng-data/lang/zlw/cs", "start": 661590, "end": 661613}, {"filename": "/espeak-ng-data/lang/zlw/pl", "start": 661613, "end": 661651}, {"filename": "/espeak-ng-data/lang/zlw/sk", "start": 661651, "end": 661675}, {"filename": "/espeak-ng-data/mbrola_ph/af1_phtrans", "start": 661675, "end": 663311}, {"filename": "/espeak-ng-data/mbrola_ph/ar1_phtrans", "start": 663311, "end": 664923}, {"filename": "/espeak-ng-data/mbrola_ph/ar2_phtrans", "start": 664923, "end": 666535}, {"filename": "/espeak-ng-data/mbrola_ph/ca_phtrans", "start": 666535, "end": 668531}, {"filename": "/espeak-ng-data/mbrola_ph/cmn_phtrans", "start": 668531, "end": 670023}, {"filename": "/espeak-ng-data/mbrola_ph/cr1_phtrans", "start": 670023, "end": 672187}, {"filename": "/espeak-ng-data/mbrola_ph/cs_phtrans", "start": 672187, "end": 672767}, {"filename": "/espeak-ng-data/mbrola_ph/de2_phtrans", "start": 672767, "end": 674499}, {"filename": "/espeak-ng-data/mbrola_ph/de4_phtrans", "start": 674499, "end": 676303}, {"filename": "/espeak-ng-data/mbrola_ph/de6_phtrans", "start": 676303, "end": 677699}, {"filename": "/espeak-ng-data/mbrola_ph/de8_phtrans", "start": 677699, "end": 678855}, {"filename": "/espeak-ng-data/mbrola_ph/ee1_phtrans", "start": 678855, "end": 680299}, {"filename": "/espeak-ng-data/mbrola_ph/en1_phtrans", "start": 680299, "end": 681095}, {"filename": "/espeak-ng-data/mbrola_ph/es3_phtrans", "start": 681095, "end": 682155}, {"filename": "/espeak-ng-data/mbrola_ph/es4_phtrans", "start": 682155, "end": 683263}, {"filename": "/espeak-ng-data/mbrola_ph/es_phtrans", "start": 683263, "end": 684995}, {"filename": "/espeak-ng-data/mbrola_ph/fr_phtrans", "start": 684995, "end": 686967}, {"filename": "/espeak-ng-data/mbrola_ph/gr1_phtrans", "start": 686967, "end": 689179}, {"filename": "/espeak-ng-data/mbrola_ph/gr2_phtrans", "start": 689179, "end": 691391}, {"filename": "/espeak-ng-data/mbrola_ph/grc-de6_phtrans", "start": 691391, "end": 691875}, {"filename": "/espeak-ng-data/mbrola_ph/he_phtrans", "start": 691875, "end": 692623}, {"filename": "/espeak-ng-data/mbrola_ph/hn1_phtrans", "start": 692623, "end": 693155}, {"filename": "/espeak-ng-data/mbrola_ph/hu1_phtrans", "start": 693155, "end": 694599}, {"filename": "/espeak-ng-data/mbrola_ph/ic1_phtrans", "start": 694599, "end": 695731}, {"filename": "/espeak-ng-data/mbrola_ph/id1_phtrans", "start": 695731, "end": 697439}, {"filename": "/espeak-ng-data/mbrola_ph/in_phtrans", "start": 697439, "end": 698883}, {"filename": "/espeak-ng-data/mbrola_ph/ir1_phtrans", "start": 698883, "end": 704695}, {"filename": "/espeak-ng-data/mbrola_ph/it1_phtrans", "start": 704695, "end": 706019}, {"filename": "/espeak-ng-data/mbrola_ph/it3_phtrans", "start": 706019, "end": 706911}, {"filename": "/espeak-ng-data/mbrola_ph/jp_phtrans", "start": 706911, "end": 707947}, {"filename": "/espeak-ng-data/mbrola_ph/la1_phtrans", "start": 707947, "end": 708695}, {"filename": "/espeak-ng-data/mbrola_ph/lt_phtrans", "start": 708695, "end": 709755}, {"filename": "/espeak-ng-data/mbrola_ph/ma1_phtrans", "start": 709755, "end": 710695}, {"filename": "/espeak-ng-data/mbrola_ph/mx1_phtrans", "start": 710695, "end": 712499}, {"filename": "/espeak-ng-data/mbrola_ph/mx2_phtrans", "start": 712499, "end": 714327}, {"filename": "/espeak-ng-data/mbrola_ph/nl_phtrans", "start": 714327, "end": 716011}, {"filename": "/espeak-ng-data/mbrola_ph/nz1_phtrans", "start": 716011, "end": 716735}, {"filename": "/espeak-ng-data/mbrola_ph/pl1_phtrans", "start": 716735, "end": 718323}, {"filename": "/espeak-ng-data/mbrola_ph/pt1_phtrans", "start": 718323, "end": 720415}, {"filename": "/espeak-ng-data/mbrola_ph/ptbr4_phtrans", "start": 720415, "end": 722771}, {"filename": "/espeak-ng-data/mbrola_ph/ptbr_phtrans", "start": 722771, "end": 725295}, {"filename": "/espeak-ng-data/mbrola_ph/ro1_phtrans", "start": 725295, "end": 727459}, {"filename": "/espeak-ng-data/mbrola_ph/sv2_phtrans", "start": 727459, "end": 729047}, {"filename": "/espeak-ng-data/mbrola_ph/sv_phtrans", "start": 729047, "end": 730635}, {"filename": "/espeak-ng-data/mbrola_ph/tl1_phtrans", "start": 730635, "end": 731407}, {"filename": "/espeak-ng-data/mbrola_ph/tr1_phtrans", "start": 731407, "end": 731771}, {"filename": "/espeak-ng-data/mbrola_ph/us3_phtrans", "start": 731771, "end": 732927}, {"filename": "/espeak-ng-data/mbrola_ph/us_phtrans", "start": 732927, "end": 734155}, {"filename": "/espeak-ng-data/mbrola_ph/vz_phtrans", "start": 734155, "end": 736439}, {"filename": "/espeak-ng-data/phondata", "start": 736439, "end": 1286863}, {"filename": "/espeak-ng-data/phondata-manifest", "start": 1286863, "end": 1308684}, {"filename": "/espeak-ng-data/phonindex", "start": 1308684, "end": 1347758}, {"filename": "/espeak-ng-data/phontab", "start": 1347758, "end": 1403554}, {"filename": "/espeak-ng-data/voices/!v/Alex", "start": 1403554, "end": 1403682}, {"filename": "/espeak-ng-data/voices/!v/Alicia", "start": 1403682, "end": 1404156}, {"filename": "/espeak-ng-data/voices/!v/Andrea", "start": 1404156, "end": 1404513}, {"filename": "/espeak-ng-data/voices/!v/Andy", "start": 1404513, "end": 1404833}, {"filename": "/espeak-ng-data/voices/!v/Annie", "start": 1404833, "end": 1405148}, {"filename": "/espeak-ng-data/voices/!v/AnxiousAndy", "start": 1405148, "end": 1405509}, {"filename": "/espeak-ng-data/voices/!v/Demonic", "start": 1405509, "end": 1409367}, {"filename": "/espeak-ng-data/voices/!v/Denis", "start": 1409367, "end": 1409672}, {"filename": "/espeak-ng-data/voices/!v/Diogo", "start": 1409672, "end": 1410051}, {"filename": "/espeak-ng-data/voices/!v/Gene", "start": 1410051, "end": 1410332}, {"filename": "/espeak-ng-data/voices/!v/Gene2", "start": 1410332, "end": 1410615}, {"filename": "/espeak-ng-data/voices/!v/Henrique", "start": 1410615, "end": 1410996}, {"filename": "/espeak-ng-data/voices/!v/Hugo", "start": 1410996, "end": 1411374}, {"filename": "/espeak-ng-data/voices/!v/Jacky", "start": 1411374, "end": 1411641}, {"filename": "/espeak-ng-data/voices/!v/Lee", "start": 1411641, "end": 1411979}, {"filename": "/espeak-ng-data/voices/!v/Marco", "start": 1411979, "end": 1412446}, {"filename": "/espeak-ng-data/voices/!v/Mario", "start": 1412446, "end": 1412716}, {"filename": "/espeak-ng-data/voices/!v/Michael", "start": 1412716, "end": 1412986}, {"filename": "/espeak-ng-data/voices/!v/Mike", "start": 1412986, "end": 1413098}, {"filename": "/espeak-ng-data/voices/!v/Mr serious", "start": 1413098, "end": 1416291}, {"filename": "/espeak-ng-data/voices/!v/Nguyen", "start": 1416291, "end": 1416571}, {"filename": "/espeak-ng-data/voices/!v/Reed", "start": 1416571, "end": 1416773}, {"filename": "/espeak-ng-data/voices/!v/RicishayMax", "start": 1416773, "end": 1417006}, {"filename": "/espeak-ng-data/voices/!v/RicishayMax2", "start": 1417006, "end": 1417441}, {"filename": "/espeak-ng-data/voices/!v/RicishayMax3", "start": 1417441, "end": 1417876}, {"filename": "/espeak-ng-data/voices/!v/Storm", "start": 1417876, "end": 1418296}, {"filename": "/espeak-ng-data/voices/!v/Tweaky", "start": 1418296, "end": 1421485}, {"filename": "/espeak-ng-data/voices/!v/UniRobot", "start": 1421485, "end": 1421902}, {"filename": "/espeak-ng-data/voices/!v/adam", "start": 1421902, "end": 1421977}, {"filename": "/espeak-ng-data/voices/!v/anika", "start": 1421977, "end": 1422470}, {"filename": "/espeak-ng-data/voices/!v/anikaRobot", "start": 1422470, "end": 1422982}, {"filename": "/espeak-ng-data/voices/!v/announcer", "start": 1422982, "end": 1423282}, {"filename": "/espeak-ng-data/voices/!v/antonio", "start": 1423282, "end": 1423663}, {"filename": "/espeak-ng-data/voices/!v/aunty", "start": 1423663, "end": 1424021}, {"filename": "/espeak-ng-data/voices/!v/belinda", "start": 1424021, "end": 1424361}, {"filename": "/espeak-ng-data/voices/!v/benjamin", "start": 1424361, "end": 1424562}, {"filename": "/espeak-ng-data/voices/!v/boris", "start": 1424562, "end": 1424786}, {"filename": "/espeak-ng-data/voices/!v/caleb", "start": 1424786, "end": 1424843}, {"filename": "/espeak-ng-data/voices/!v/croak", "start": 1424843, "end": 1424936}, {"filename": "/espeak-ng-data/voices/!v/david", "start": 1424936, "end": 1425048}, {"filename": "/espeak-ng-data/voices/!v/ed", "start": 1425048, "end": 1425335}, {"filename": "/espeak-ng-data/voices/!v/edward", "start": 1425335, "end": 1425486}, {"filename": "/espeak-ng-data/voices/!v/edward2", "start": 1425486, "end": 1425638}, {"filename": "/espeak-ng-data/voices/!v/f1", "start": 1425638, "end": 1425962}, {"filename": "/espeak-ng-data/voices/!v/f2", "start": 1425962, "end": 1426319}, {"filename": "/espeak-ng-data/voices/!v/f3", "start": 1426319, "end": 1426694}, {"filename": "/espeak-ng-data/voices/!v/f4", "start": 1426694, "end": 1427044}, {"filename": "/espeak-ng-data/voices/!v/f5", "start": 1427044, "end": 1427476}, {"filename": "/espeak-ng-data/voices/!v/fast", "start": 1427476, "end": 1427625}, {"filename": "/espeak-ng-data/voices/!v/grandma", "start": 1427625, "end": 1427888}, {"filename": "/espeak-ng-data/voices/!v/grandpa", "start": 1427888, "end": 1428144}, {"filename": "/espeak-ng-data/voices/!v/gustave", "start": 1428144, "end": 1428397}, {"filename": "/espeak-ng-data/voices/!v/ian", "start": 1428397, "end": 1431565}, {"filename": "/espeak-ng-data/voices/!v/iven", "start": 1431565, "end": 1431826}, {"filename": "/espeak-ng-data/voices/!v/iven2", "start": 1431826, "end": 1432105}, {"filename": "/espeak-ng-data/voices/!v/iven3", "start": 1432105, "end": 1432367}, {"filename": "/espeak-ng-data/voices/!v/iven4", "start": 1432367, "end": 1432628}, {"filename": "/espeak-ng-data/voices/!v/john", "start": 1432628, "end": 1435814}, {"filename": "/espeak-ng-data/voices/!v/kaukovalta", "start": 1435814, "end": 1436175}, {"filename": "/espeak-ng-data/voices/!v/klatt", "start": 1436175, "end": 1436213}, {"filename": "/espeak-ng-data/voices/!v/klatt2", "start": 1436213, "end": 1436251}, {"filename": "/espeak-ng-data/voices/!v/klatt3", "start": 1436251, "end": 1436290}, {"filename": "/espeak-ng-data/voices/!v/klatt4", "start": 1436290, "end": 1436329}, {"filename": "/espeak-ng-data/voices/!v/klatt5", "start": 1436329, "end": 1436368}, {"filename": "/espeak-ng-data/voices/!v/klatt6", "start": 1436368, "end": 1436407}, {"filename": "/espeak-ng-data/voices/!v/linda", "start": 1436407, "end": 1436757}, {"filename": "/espeak-ng-data/voices/!v/m1", "start": 1436757, "end": 1437092}, {"filename": "/espeak-ng-data/voices/!v/m2", "start": 1437092, "end": 1437356}, {"filename": "/espeak-ng-data/voices/!v/m3", "start": 1437356, "end": 1437656}, {"filename": "/espeak-ng-data/voices/!v/m4", "start": 1437656, "end": 1437946}, {"filename": "/espeak-ng-data/voices/!v/m5", "start": 1437946, "end": 1438208}, {"filename": "/espeak-ng-data/voices/!v/m6", "start": 1438208, "end": 1438396}, {"filename": "/espeak-ng-data/voices/!v/m7", "start": 1438396, "end": 1438650}, {"filename": "/espeak-ng-data/voices/!v/m8", "start": 1438650, "end": 1438934}, {"filename": "/espeak-ng-data/voices/!v/marcelo", "start": 1438934, "end": 1439185}, {"filename": "/espeak-ng-data/voices/!v/max", "start": 1439185, "end": 1439410}, {"filename": "/espeak-ng-data/voices/!v/michel", "start": 1439410, "end": 1439814}, {"filename": "/espeak-ng-data/voices/!v/miguel", "start": 1439814, "end": 1440196}, {"filename": "/espeak-ng-data/voices/!v/mike2", "start": 1440196, "end": 1440384}, {"filename": "/espeak-ng-data/voices/!v/norbert", "start": 1440384, "end": 1443573}, {"filename": "/espeak-ng-data/voices/!v/pablo", "start": 1443573, "end": 1446715}, {"filename": "/espeak-ng-data/voices/!v/paul", "start": 1446715, "end": 1446999}, {"filename": "/espeak-ng-data/voices/!v/pedro", "start": 1446999, "end": 1447351}, {"filename": "/espeak-ng-data/voices/!v/quincy", "start": 1447351, "end": 1447705}, {"filename": "/espeak-ng-data/voices/!v/rob", "start": 1447705, "end": 1447970}, {"filename": "/espeak-ng-data/voices/!v/robert", "start": 1447970, "end": 1448244}, {"filename": "/espeak-ng-data/voices/!v/robosoft", "start": 1448244, "end": 1448695}, {"filename": "/espeak-ng-data/voices/!v/robosoft2", "start": 1448695, "end": 1449149}, {"filename": "/espeak-ng-data/voices/!v/robosoft3", "start": 1449149, "end": 1449604}, {"filename": "/espeak-ng-data/voices/!v/robosoft4", "start": 1449604, "end": 1450051}, {"filename": "/espeak-ng-data/voices/!v/robosoft5", "start": 1450051, "end": 1450496}, {"filename": "/espeak-ng-data/voices/!v/robosoft6", "start": 1450496, "end": 1450783}, {"filename": "/espeak-ng-data/voices/!v/robosoft7", "start": 1450783, "end": 1451193}, {"filename": "/espeak-ng-data/voices/!v/robosoft8", "start": 1451193, "end": 1451436}, {"filename": "/espeak-ng-data/voices/!v/sandro", "start": 1451436, "end": 1451966}, {"filename": "/espeak-ng-data/voices/!v/shelby", "start": 1451966, "end": 1452246}, {"filename": "/espeak-ng-data/voices/!v/steph", "start": 1452246, "end": 1452610}, {"filename": "/espeak-ng-data/voices/!v/steph2", "start": 1452610, "end": 1452977}, {"filename": "/espeak-ng-data/voices/!v/steph3", "start": 1452977, "end": 1453354}, {"filename": "/espeak-ng-data/voices/!v/travis", "start": 1453354, "end": 1453737}, {"filename": "/espeak-ng-data/voices/!v/victor", "start": 1453737, "end": 1453990}, {"filename": "/espeak-ng-data/voices/!v/whisper", "start": 1453990, "end": 1454176}, {"filename": "/espeak-ng-data/voices/!v/whisperf", "start": 1454176, "end": 1454568}, {"filename": "/espeak-ng-data/voices/!v/zac", "start": 1454568, "end": 1454843}, {"filename": "/espeak-ng-data/voices/mb/mb-af1", "start": 1454843, "end": 1454931}, {"filename": "/espeak-ng-data/voices/mb/mb-af1-en", "start": 1454931, "end": 1455014}, {"filename": "/espeak-ng-data/voices/mb/mb-ar1", "start": 1455014, "end": 1455098}, {"filename": "/espeak-ng-data/voices/mb/mb-ar2", "start": 1455098, "end": 1455182}, {"filename": "/espeak-ng-data/voices/mb/mb-br1", "start": 1455182, "end": 1455314}, {"filename": "/espeak-ng-data/voices/mb/mb-br2", "start": 1455314, "end": 1455450}, {"filename": "/espeak-ng-data/voices/mb/mb-br3", "start": 1455450, "end": 1455582}, {"filename": "/espeak-ng-data/voices/mb/mb-br4", "start": 1455582, "end": 1455718}, {"filename": "/espeak-ng-data/voices/mb/mb-ca1", "start": 1455718, "end": 1455823}, {"filename": "/espeak-ng-data/voices/mb/mb-ca2", "start": 1455823, "end": 1455928}, {"filename": "/espeak-ng-data/voices/mb/mb-cn1", "start": 1455928, "end": 1456020}, {"filename": "/espeak-ng-data/voices/mb/mb-cr1", "start": 1456020, "end": 1456131}, {"filename": "/espeak-ng-data/voices/mb/mb-cz1", "start": 1456131, "end": 1456201}, {"filename": "/espeak-ng-data/voices/mb/mb-cz2", "start": 1456201, "end": 1456283}, {"filename": "/espeak-ng-data/voices/mb/mb-de1", "start": 1456283, "end": 1456427}, {"filename": "/espeak-ng-data/voices/mb/mb-de1-en", "start": 1456427, "end": 1456523}, {"filename": "/espeak-ng-data/voices/mb/mb-de2", "start": 1456523, "end": 1456651}, {"filename": "/espeak-ng-data/voices/mb/mb-de2-en", "start": 1456651, "end": 1456731}, {"filename": "/espeak-ng-data/voices/mb/mb-de3", "start": 1456731, "end": 1456830}, {"filename": "/espeak-ng-data/voices/mb/mb-de3-en", "start": 1456830, "end": 1456926}, {"filename": "/espeak-ng-data/voices/mb/mb-de4", "start": 1456926, "end": 1457055}, {"filename": "/espeak-ng-data/voices/mb/mb-de4-en", "start": 1457055, "end": 1457136}, {"filename": "/espeak-ng-data/voices/mb/mb-de5", "start": 1457136, "end": 1457372}, {"filename": "/espeak-ng-data/voices/mb/mb-de5-en", "start": 1457372, "end": 1457462}, {"filename": "/espeak-ng-data/voices/mb/mb-de6", "start": 1457462, "end": 1457584}, {"filename": "/espeak-ng-data/voices/mb/mb-de6-en", "start": 1457584, "end": 1457658}, {"filename": "/espeak-ng-data/voices/mb/mb-de6-grc", "start": 1457658, "end": 1457741}, {"filename": "/espeak-ng-data/voices/mb/mb-de7", "start": 1457741, "end": 1457891}, {"filename": "/espeak-ng-data/voices/mb/mb-de8", "start": 1457891, "end": 1457962}, {"filename": "/espeak-ng-data/voices/mb/mb-ee1", "start": 1457962, "end": 1458059}, {"filename": "/espeak-ng-data/voices/mb/mb-en1", "start": 1458059, "end": 1458190}, {"filename": "/espeak-ng-data/voices/mb/mb-es1", "start": 1458190, "end": 1458304}, {"filename": "/espeak-ng-data/voices/mb/mb-es2", "start": 1458304, "end": 1458412}, {"filename": "/espeak-ng-data/voices/mb/mb-es3", "start": 1458412, "end": 1458516}, {"filename": "/espeak-ng-data/voices/mb/mb-es4", "start": 1458516, "end": 1458604}, {"filename": "/espeak-ng-data/voices/mb/mb-fr1", "start": 1458604, "end": 1458770}, {"filename": "/espeak-ng-data/voices/mb/mb-fr1-en", "start": 1458770, "end": 1458874}, {"filename": "/espeak-ng-data/voices/mb/mb-fr2", "start": 1458874, "end": 1458977}, {"filename": "/espeak-ng-data/voices/mb/mb-fr3", "start": 1458977, "end": 1459077}, {"filename": "/espeak-ng-data/voices/mb/mb-fr4", "start": 1459077, "end": 1459204}, {"filename": "/espeak-ng-data/voices/mb/mb-fr4-en", "start": 1459204, "end": 1459311}, {"filename": "/espeak-ng-data/voices/mb/mb-fr5", "start": 1459311, "end": 1459411}, {"filename": "/espeak-ng-data/voices/mb/mb-fr6", "start": 1459411, "end": 1459511}, {"filename": "/espeak-ng-data/voices/mb/mb-fr7", "start": 1459511, "end": 1459594}, {"filename": "/espeak-ng-data/voices/mb/mb-gr1", "start": 1459594, "end": 1459688}, {"filename": "/espeak-ng-data/voices/mb/mb-gr2", "start": 1459688, "end": 1459782}, {"filename": "/espeak-ng-data/voices/mb/mb-gr2-en", "start": 1459782, "end": 1459870}, {"filename": "/espeak-ng-data/voices/mb/mb-hb1", "start": 1459870, "end": 1459938}, {"filename": "/espeak-ng-data/voices/mb/mb-hb2", "start": 1459938, "end": 1460021}, {"filename": "/espeak-ng-data/voices/mb/mb-hu1", "start": 1460021, "end": 1460123}, {"filename": "/espeak-ng-data/voices/mb/mb-hu1-en", "start": 1460123, "end": 1460220}, {"filename": "/espeak-ng-data/voices/mb/mb-ic1", "start": 1460220, "end": 1460308}, {"filename": "/espeak-ng-data/voices/mb/mb-id1", "start": 1460308, "end": 1460409}, {"filename": "/espeak-ng-data/voices/mb/mb-in1", "start": 1460409, "end": 1460478}, {"filename": "/espeak-ng-data/voices/mb/mb-in2", "start": 1460478, "end": 1460563}, {"filename": "/espeak-ng-data/voices/mb/mb-ir1", "start": 1460563, "end": 1461316}, {"filename": "/espeak-ng-data/voices/mb/mb-it1", "start": 1461316, "end": 1461400}, {"filename": "/espeak-ng-data/voices/mb/mb-it2", "start": 1461400, "end": 1461487}, {"filename": "/espeak-ng-data/voices/mb/mb-it3", "start": 1461487, "end": 1461629}, {"filename": "/espeak-ng-data/voices/mb/mb-it4", "start": 1461629, "end": 1461774}, {"filename": "/espeak-ng-data/voices/mb/mb-jp1", "start": 1461774, "end": 1461845}, {"filename": "/espeak-ng-data/voices/mb/mb-jp2", "start": 1461845, "end": 1461946}, {"filename": "/espeak-ng-data/voices/mb/mb-jp3", "start": 1461946, "end": 1462033}, {"filename": "/espeak-ng-data/voices/mb/mb-la1", "start": 1462033, "end": 1462116}, {"filename": "/espeak-ng-data/voices/mb/mb-lt1", "start": 1462116, "end": 1462203}, {"filename": "/espeak-ng-data/voices/mb/mb-lt2", "start": 1462203, "end": 1462290}, {"filename": "/espeak-ng-data/voices/mb/mb-ma1", "start": 1462290, "end": 1462388}, {"filename": "/espeak-ng-data/voices/mb/mb-mx1", "start": 1462388, "end": 1462508}, {"filename": "/espeak-ng-data/voices/mb/mb-mx2", "start": 1462508, "end": 1462628}, {"filename": "/espeak-ng-data/voices/mb/mb-nl1", "start": 1462628, "end": 1462697}, {"filename": "/espeak-ng-data/voices/mb/mb-nl2", "start": 1462697, "end": 1462793}, {"filename": "/espeak-ng-data/voices/mb/mb-nl2-en", "start": 1462793, "end": 1462884}, {"filename": "/espeak-ng-data/voices/mb/mb-nl3", "start": 1462884, "end": 1462969}, {"filename": "/espeak-ng-data/voices/mb/mb-nz1", "start": 1462969, "end": 1463037}, {"filename": "/espeak-ng-data/voices/mb/mb-pl1", "start": 1463037, "end": 1463136}, {"filename": "/espeak-ng-data/voices/mb/mb-pl1-en", "start": 1463136, "end": 1463218}, {"filename": "/espeak-ng-data/voices/mb/mb-pt1", "start": 1463218, "end": 1463349}, {"filename": "/espeak-ng-data/voices/mb/mb-ro1", "start": 1463349, "end": 1463436}, {"filename": "/espeak-ng-data/voices/mb/mb-ro1-en", "start": 1463436, "end": 1463517}, {"filename": "/espeak-ng-data/voices/mb/mb-sw1", "start": 1463517, "end": 1463615}, {"filename": "/espeak-ng-data/voices/mb/mb-sw1-en", "start": 1463615, "end": 1463708}, {"filename": "/espeak-ng-data/voices/mb/mb-sw2", "start": 1463708, "end": 1463810}, {"filename": "/espeak-ng-data/voices/mb/mb-sw2-en", "start": 1463810, "end": 1463909}, {"filename": "/espeak-ng-data/voices/mb/mb-tl1", "start": 1463909, "end": 1463994}, {"filename": "/espeak-ng-data/voices/mb/mb-tr1", "start": 1463994, "end": 1464079}, {"filename": "/espeak-ng-data/voices/mb/mb-tr2", "start": 1464079, "end": 1464193}, {"filename": "/espeak-ng-data/voices/mb/mb-us1", "start": 1464193, "end": 1464363}, {"filename": "/espeak-ng-data/voices/mb/mb-us2", "start": 1464363, "end": 1464541}, {"filename": "/espeak-ng-data/voices/mb/mb-us3", "start": 1464541, "end": 1464721}, {"filename": "/espeak-ng-data/voices/mb/mb-vz1", "start": 1464721, "end": 1464865}], "remote_package_size": 1464865});
    })();
    var moduleOverrides = Object.assign({}, Module);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require("fs");
      var nodePath = require("path");
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = nodePath.dirname(scriptDirectory) + "/";
      } else {
        scriptDirectory = __dirname + "/";
      }
      read_ = (filename, binary) => {
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        return fs.readFileSync(filename, binary ? void 0 : "utf8");
      };
      readBinary = (filename) => {
        var ret = read_(filename, true);
        if (!ret.buffer) {
          ret = new Uint8Array(ret);
        }
        return ret;
      };
      readAsync = (filename, onload, onerror, binary = true) => {
        filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
        fs.readFile(filename, binary ? void 0 : "utf8", (err2, data) => {
          if (err2) onerror(err2);
          else onload(binary ? data.buffer : data);
        });
      };
      if (!Module["thisProgram"] && process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      arguments_ = process.argv.slice(2);
      quit_ = (status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      };
      Module["inspect"] = () => "[Emscripten Module object]";
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
    } else ;
    var out = Module["print"] || console.log.bind(console);
    var err = Module["printErr"] || console.error.bind(console);
    Object.assign(Module, moduleOverrides);
    moduleOverrides = null;
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    if (Module["quit"]) quit_ = Module["quit"];
    var wasmBinary;
    if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    var HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module["HEAP8"] = HEAP8 = new Int8Array(b);
      Module["HEAP16"] = HEAP16 = new Int16Array(b);
      Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module["HEAPU16"] = new Uint16Array(b);
      Module["HEAP32"] = HEAP32 = new Int32Array(b);
      Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module["HEAPF32"] = new Float32Array(b);
      Module["HEAPF64"] = new Float64Array(b);
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
      FS.ignorePermissions = false;
      callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    function addRunDependency(id) {
      runDependencies++;
      if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      if (Module["onAbort"]) {
        Module["onAbort"](what);
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    var isDataURI = (filename) => filename.startsWith(dataURIPrefix);
    var isFileURI = (filename) => filename.startsWith("file://");
    var wasmBinaryFile;
    wasmBinaryFile = "piper_phonemize.wasm";
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile);
    }
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    function getBinaryPromise(binaryFile) {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function" && !isFileURI(binaryFile)) {
          return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + binaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(() => getBinarySync(binaryFile));
        } else if (readAsync) {
          return new Promise((resolve, reject) => {
            readAsync(binaryFile, (response) => resolve(new Uint8Array(response)), reject);
          });
        }
      }
      return Promise.resolve().then(() => getBinarySync(binaryFile));
    }
    function instantiateArrayBuffer(binaryFile, imports, receiver) {
      return getBinaryPromise(binaryFile).then((binary) => WebAssembly.instantiate(binary, imports)).then((instance) => instance).then(receiver, (reason) => {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      });
    }
    function instantiateAsync(binary, binaryFile, imports, callback) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
        return fetch(binaryFile, { credentials: "same-origin" }).then((response) => {
          var result = WebAssembly.instantiateStreaming(response, imports);
          return result.then(callback, function(reason) {
            err(`wasm streaming compile failed: ${reason}`);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(binaryFile, imports, callback);
          });
        });
      }
      return instantiateArrayBuffer(binaryFile, imports, callback);
    }
    function createWasm() {
      var info = { "a": wasmImports };
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        wasmMemory = wasmExports["w"];
        updateMemoryViews();
        addOnInit(wasmExports["x"]);
        removeRunDependency();
        return wasmExports;
      }
      addRunDependency();
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      if (Module["instantiateWasm"]) {
        try {
          return Module["instantiateWasm"](info, receiveInstance);
        } catch (e) {
          err(`Module.instantiateWasm callback failed with error: ${e}`);
          readyPromiseReject(e);
        }
      }
      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
      return {};
    }
    var tempDouble;
    var tempI64;
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    };
    var noExitRuntime = Module["noExitRuntime"] || true;
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    var ___assert_fail = (condition, filename, line, func) => {
      abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
    };
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
      this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2];
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      };
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      };
      this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2];
      };
      this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
    var exceptionLast = 0;
    var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      exceptionLast = ptr;
      throw exceptionLast;
    };
    var setErrNo = (value) => {
      HEAP32[___errno_location() >> 2] = value;
      return value;
    };
    var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1);
    }, normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1);
        } else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts.unshift("..");
        }
      }
      return parts;
    }, normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = ".";
      }
      if (path && trailingSlash) {
        path += "/";
      }
      return (isAbsolute ? "/" : "") + path;
    }, dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) {
        return ".";
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1);
      }
      return root + dir;
    }, basename: (path) => {
      if (path === "/") return "/";
      path = PATH.normalize(path);
      path = path.replace(/\/$/, "");
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1) return path;
      return path.substr(lastSlash + 1);
    }, join: function() {
      var paths = Array.prototype.slice.call(arguments);
      return PATH.normalize(paths.join("/"));
    }, join2: (l, r) => PATH.normalize(l + "/" + r) };
    var initRandomFill = () => {
      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        return (view) => crypto.getRandomValues(view);
      } else if (ENVIRONMENT_IS_NODE) {
        try {
          var crypto_module = require("crypto");
          var randomFillSync = crypto_module["randomFillSync"];
          if (randomFillSync) {
            return (view) => crypto_module["randomFillSync"](view);
          }
          var randomBytes = crypto_module["randomBytes"];
          return (view) => (view.set(randomBytes(view.byteLength)), view);
        } catch (e) {
        }
      }
      abort("initRandomDevice");
    };
    var randomFill = (view) => (randomFill = initRandomFill())(view);
    var PATH_FS = { resolve: function() {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : FS.cwd();
        if (typeof path != "string") {
          throw new TypeError("Arguments to path.resolve must be strings");
        } else if (!path) {
          return "";
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    }, relative: (from, to) => {
      from = PATH_FS.resolve(from).substr(1);
      to = PATH_FS.resolve(to).substr(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push("..");
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    } };
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
          var fd = process.stdin.fd;
          try {
            bytesRead = fs.readSync(fd, buf);
          } catch (e) {
            if (e.toString().includes("EOF")) bytesRead = 0;
            else throw e;
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString("utf-8");
          } else {
            result = null;
          }
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else if (typeof readline == "function") {
          result = readline();
          if (result !== null) {
            result += "\n";
          }
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
    var TTY = { ttys: [], init() {
    }, shutdown() {
    }, register(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops };
      FS.registerDevice(dev, TTY.stream_ops);
    }, stream_ops: { open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    }, close(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, read(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.timestamp = Date.now();
      }
      return i;
    } }, default_tty_ops: { get_char(tty) {
      return FS_stdin_getChar();
    }, put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    }, ioctl_tcgets(tty) {
      return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    }, ioctl_tcsets(tty, optional_actions, data) {
      return 0;
    }, ioctl_tiocgwinsz(tty) {
      return [24, 80];
    } }, default_tty1_ops: { put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    } } };
    var mmapAlloc = (size) => {
      abort();
    };
    var MEMFS = { ops_table: null, mount(mount) {
      return MEMFS.createNode(null, "/", 16384 | 511, 0);
    }, createNode(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(63);
      }
      if (!MEMFS.ops_table) {
        MEMFS.ops_table = { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, allocate: MEMFS.stream_ops.allocate, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } };
      }
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null;
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.timestamp = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.timestamp = node.timestamp;
      }
      return node;
    }, getFileDataAsTypedArray(node) {
      if (!node.contents) return new Uint8Array(0);
      if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents);
    }, expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity) return;
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
      if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
      var oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity);
      if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    }, resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize) return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
      } else {
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize);
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
        }
        node.usedBytes = newSize;
      }
    }, node_ops: { getattr(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    }, setattr(node, attr) {
      if (attr.mode !== void 0) {
        node.mode = attr.mode;
      }
      if (attr.timestamp !== void 0) {
        node.timestamp = attr.timestamp;
      }
      if (attr.size !== void 0) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    }, lookup(parent, name) {
      throw FS.genericErrors[44];
    }, mknod(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    }, rename(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
      }
      delete old_node.parent.contents[old_node.name];
      old_node.parent.timestamp = Date.now();
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      new_dir.timestamp = old_node.parent.timestamp;
      old_node.parent = new_dir;
    }, unlink(parent, name) {
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, rmdir(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, readdir(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue;
        }
        entries.push(key);
      }
      return entries;
    }, symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    }, readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    } }, stream_ops: { read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) {
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    }, llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, allocate(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    }, mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        allocated = true;
        ptr = mmapAlloc();
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        HEAP8.set(contents, ptr);
      }
      return { ptr, allocated };
    }, msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0;
    } } };
    var asyncLoad = (url, onload, onerror, noRunDep) => {
      var dep = getUniqueRunDependency(`al ${url}`);
      readAsync(url, (arrayBuffer) => {
        assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency();
      }, (event) => {
        if (onerror) {
          onerror();
        } else {
          throw `Loading data file "${url}" failed.`;
        }
      });
      if (dep) addRunDependency();
    };
    var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
    var preloadPlugins = Module["preloadPlugins"] || [];
    var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
      if (typeof Browser != "undefined") Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled) return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    };
    var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      function processData(byteArray) {
        function finish(byteArray2) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
          }
          if (onload) onload();
          removeRunDependency();
        }
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          if (onerror) onerror();
          removeRunDependency();
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency();
      if (typeof url == "string") {
        asyncLoad(url, (byteArray) => processData(byteArray), onerror);
      } else {
        processData(url);
      }
    };
    var FS_modeStringToFlags = (str) => {
      var flagModes = { "r": 0, "r+": 2, "w": 512 | 64 | 1, "w+": 512 | 64 | 2, "a": 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
      var flags = flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
    var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
    var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, ErrnoError: null, genericErrors: {}, filesystems: null, syncFSRequests: 0, lookupPath(path, opts = {}) {
      path = PATH_FS.resolve(path);
      if (!path) return { path: "", node: null };
      var defaults = { follow_mount: true, recurse_count: 0 };
      opts = Object.assign(defaults, opts);
      if (opts.recurse_count > 8) {
        throw new FS.ErrnoError(32);
      }
      var parts = path.split("/").filter((p) => !!p);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        current = FS.lookupNode(current, parts[i]);
        current_path = PATH.join2(current_path, parts[i]);
        if (FS.isMountpoint(current)) {
          if (!islast || islast && opts.follow_mount) {
            current = current.mounted.root;
          }
        }
        if (!islast || opts.follow) {
          var count = 0;
          while (FS.isLink(current.mode)) {
            var link = FS.readlink(current_path);
            current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
            var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
            current = lookup.node;
            if (count++ > 40) {
              throw new FS.ErrnoError(32);
            }
          }
        }
      }
      return { path: current_path, node: current };
    }, getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    }, hashName(parentid, name) {
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
      }
      return (parentid + hash >>> 0) % FS.nameTable.length;
    }, hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    }, hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next;
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    }, lookupNode(parent, name) {
      var errCode = FS.mayLookup(parent);
      if (errCode) {
        throw new FS.ErrnoError(errCode, parent);
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node;
        }
      }
      return FS.lookup(parent, name);
    }, createNode(parent, name, mode, rdev) {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    }, destroyNode(node) {
      FS.hashRemoveNode(node);
    }, isRoot(node) {
      return node === node.parent;
    }, isMountpoint(node) {
      return !!node.mounted;
    }, isFile(mode) {
      return (mode & 61440) === 32768;
    }, isDir(mode) {
      return (mode & 61440) === 16384;
    }, isLink(mode) {
      return (mode & 61440) === 40960;
    }, isChrdev(mode) {
      return (mode & 61440) === 8192;
    }, isBlkdev(mode) {
      return (mode & 61440) === 24576;
    }, isFIFO(mode) {
      return (mode & 61440) === 4096;
    }, isSocket(mode) {
      return (mode & 49152) === 49152;
    }, flagsToPermissionString(flag) {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w";
      }
      return perms;
    }, nodePermissions(node, perms) {
      if (FS.ignorePermissions) {
        return 0;
      }
      if (perms.includes("r") && !(node.mode & 292)) {
        return 2;
      } else if (perms.includes("w") && !(node.mode & 146)) {
        return 2;
      } else if (perms.includes("x") && !(node.mode & 73)) {
        return 2;
      }
      return 0;
    }, mayLookup(dir) {
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    }, mayCreate(dir, name) {
      try {
        var node = FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    }, mayDelete(dir, name, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) {
        return errCode;
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return 54;
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return 10;
        }
      } else {
        if (FS.isDir(node.mode)) {
          return 31;
        }
      }
      return 0;
    }, mayOpen(node, flags) {
      if (!node) {
        return 44;
      }
      if (FS.isLink(node.mode)) {
        return 32;
      } else if (FS.isDir(node.mode)) {
        if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
          return 31;
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
    }, MAX_OPEN_FDS: 4096, nextfd() {
      for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
        if (!FS.streams[fd]) {
          return fd;
        }
      }
      throw new FS.ErrnoError(33);
    }, getStreamChecked(fd) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      return stream;
    }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
      if (!FS.FSStream) {
        FS.FSStream = function() {
          this.shared = {};
        };
        FS.FSStream.prototype = {};
        Object.defineProperties(FS.FSStream.prototype, { object: { get() {
          return this.node;
        }, set(val) {
          this.node = val;
        } }, isRead: { get() {
          return (this.flags & 2097155) !== 1;
        } }, isWrite: { get() {
          return (this.flags & 2097155) !== 0;
        } }, isAppend: { get() {
          return this.flags & 1024;
        } }, flags: { get() {
          return this.shared.flags;
        }, set(val) {
          this.shared.flags = val;
        } }, position: { get() {
          return this.shared.position;
        }, set(val) {
          this.shared.position = val;
        } } });
      }
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd == -1) {
        fd = FS.nextfd();
      }
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    }, closeStream(fd) {
      FS.streams[fd] = null;
    }, chrdev_stream_ops: { open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
    }, llseek() {
      throw new FS.ErrnoError(70);
    } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push.apply(check, m.mounts);
      }
      return mounts;
    }, syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) {
          doCallback(null);
        }
      }
      mounts.forEach((mount) => {
        if (!mount.type.syncfs) {
          return done(null);
        }
        mount.type.syncfs(mount, populate, done);
      });
    }, mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(10);
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
      }
      var mount = { type, opts, mountpoint, mounts: [] };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot;
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount);
        }
      }
      return mountRoot;
    }, unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(28);
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((hash) => {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.includes(current.mount)) {
            FS.destroyNode(current);
          }
          current = next;
        }
      });
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    }, lookup(parent, name) {
      return parent.node_ops.lookup(parent, name);
    }, mknod(path, mode, dev) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name || name === "." || name === "..") {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.mayCreate(parent, name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.mknod(parent, name, mode, dev);
    }, create(path, mode) {
      mode = mode !== void 0 ? mode : 438;
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    }, mkdir(path, mode) {
      mode = mode !== void 0 ? mode : 511;
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    }, mkdirTree(path, mode) {
      var dirs = path.split("/");
      var d = "";
      for (var i = 0; i < dirs.length; ++i) {
        if (!dirs[i]) continue;
        d += "/" + dirs[i];
        try {
          FS.mkdir(d, mode);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    }, mkdev(path, mode, dev) {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    }, symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) {
        throw new FS.ErrnoError(44);
      }
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.symlink(parent, newname, oldpath);
    }, rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      lookup = FS.lookupPath(old_path, { parent: true });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(75);
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(28);
      }
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(55);
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) {
        return;
      }
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(10);
      }
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    }, rmdir(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    }, readdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(54);
      }
      return node.node_ops.readdir(node);
    }, unlink(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    }, readlink(path) {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(44);
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(28);
      }
      return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
    }, stat(path, dontFollow) {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(63);
      }
      return node.node_ops.getattr(node);
    }, lstat(path) {
      return FS.stat(path, true);
    }, chmod(path, mode, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { mode: mode & 4095 | node.mode & ~4095, timestamp: Date.now() });
    }, lchmod(path, mode) {
      FS.chmod(path, mode, true);
    }, fchmod(fd, mode) {
      var stream = FS.getStreamChecked(fd);
      FS.chmod(stream.node, mode);
    }, chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { timestamp: Date.now() });
    }, lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    }, fchown(fd, uid, gid) {
      var stream = FS.getStreamChecked(fd);
      FS.chown(stream.node, uid, gid);
    }, truncate(path, len) {
      if (len < 0) {
        throw new FS.ErrnoError(28);
      }
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
    }, ftruncate(fd, len) {
      var stream = FS.getStreamChecked(fd);
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(28);
      }
      FS.truncate(stream.node, len);
    }, utime(path, atime, mtime) {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
    }, open(path, flags, mode) {
      if (path === "") {
        throw new FS.ErrnoError(44);
      }
      flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
      mode = typeof mode == "undefined" ? 438 : mode;
      if (flags & 64) {
        mode = mode & 4095 | 32768;
      } else {
        mode = 0;
      }
      var node;
      if (typeof path == "object") {
        node = path;
      } else {
        path = PATH.normalize(path);
        try {
          var lookup = FS.lookupPath(path, { follow: !(flags & 131072) });
          node = lookup.node;
        } catch (e) {
        }
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(20);
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true;
        }
      }
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512;
      }
      if (flags & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      if (flags & 512 && !created) {
        FS.truncate(node, 0);
      }
      flags &= ~(128 | 512 | 131072);
      var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
      if (Module["logReadFiles"] && !(flags & 1)) {
        if (!FS.readFiles) FS.readFiles = {};
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
        }
      }
      return stream;
    }, close(stream) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream);
        }
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    }, isClosed(stream) {
      return stream.fd === null;
    }, llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(70);
      }
      if (whence != 0 && whence != 1 && whence != 2) {
        throw new FS.ErrnoError(28);
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    }, read(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(28);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(28);
      }
      if (stream.seekable && stream.flags & 1024) {
        FS.llseek(stream, 0, 2);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    }, allocate(stream, offset, length) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(28);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(138);
      }
      stream.stream_ops.allocate(stream, offset, length);
    }, mmap(stream, length, position, prot, flags) {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
        throw new FS.ErrnoError(2);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(2);
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(43);
      }
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    }, msync(stream, buffer, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) {
        return 0;
      }
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
    }, munmap: (stream) => 0, ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(59);
      }
      return stream.stream_ops.ioctl(stream, cmd, arg);
    }, readFile(path, opts = {}) {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error(`Invalid encoding type "${opts.encoding}"`);
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf, 0);
      } else if (opts.encoding === "binary") {
        ret = buf;
      }
      FS.close(stream);
      return ret;
    }, writeFile(path, data, opts = {}) {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      if (typeof data == "string") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
      } else if (ArrayBuffer.isView(data)) {
        FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      } else {
        throw new Error("Unsupported data type");
      }
      FS.close(stream);
    }, cwd: () => FS.currentPath, chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) {
        throw new FS.ErrnoError(44);
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(54);
      }
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.currentPath = lookup.path;
    }, createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    }, createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = new Uint8Array(1024), randomLeft = 0;
      var randomByte = () => {
        if (randomLeft === 0) {
          randomLeft = randomFill(randomBuffer).byteLength;
        }
        return randomBuffer[--randomLeft];
      };
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
        node.node_ops = { lookup(parent, name) {
          var fd = +name;
          var stream = FS.getStreamChecked(fd);
          var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path } };
          ret.parent = ret;
          return ret;
        } };
        return node;
      } }, {}, "/proc/self/fd");
    }, createStandardStreams() {
      if (Module["stdin"]) {
        FS.createDevice("/dev", "stdin", Module["stdin"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdin");
      }
      if (Module["stdout"]) {
        FS.createDevice("/dev", "stdout", null, Module["stdout"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdout");
      }
      if (Module["stderr"]) {
        FS.createDevice("/dev", "stderr", null, Module["stderr"]);
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr");
      }
      FS.open("/dev/stdin", 0);
      FS.open("/dev/stdout", 1);
      FS.open("/dev/stderr", 1);
    }, ensureErrnoError() {
      if (FS.ErrnoError) return;
      FS.ErrnoError = function ErrnoError(errno, node) {
        this.name = "ErrnoError";
        this.node = node;
        this.setErrno = function(errno2) {
          this.errno = errno2;
        };
        this.setErrno(errno);
        this.message = "FS error";
      };
      FS.ErrnoError.prototype = new Error();
      FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      [44].forEach((code) => {
        FS.genericErrors[code] = new FS.ErrnoError(code);
        FS.genericErrors[code].stack = "<generic error, no stack>";
      });
    }, staticInit() {
      FS.ensureErrnoError();
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { "MEMFS": MEMFS };
    }, init(input, output, error) {
      FS.init.initialized = true;
      FS.ensureErrnoError();
      Module["stdin"] = input || Module["stdin"];
      Module["stdout"] = output || Module["stdout"];
      Module["stderr"] = error || Module["stderr"];
      FS.createStandardStreams();
    }, quit() {
      FS.init.initialized = false;
      for (var i = 0; i < FS.streams.length; i++) {
        var stream = FS.streams[i];
        if (!stream) {
          continue;
        }
        FS.close(stream);
      }
    }, findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) {
        return null;
      }
      return ret.object;
    }, analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    }, createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
        }
        parent = current;
      }
      return current;
    }, createFile(parent, name, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(canRead, canWrite);
      return FS.create(path, mode);
    }, createDataFile(parent, name, data, canRead, canWrite, canOwn) {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data == "string") {
          var arr = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
          data = arr;
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
      return node;
    }, createDevice(parent, name, input, output) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS_getMode(!!input, !!output);
      if (!FS.createDevice.major) FS.createDevice.major = 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, { open(stream) {
        stream.seekable = false;
      }, close(stream) {
        if (output && output.buffer && output.buffer.length) {
          output(10);
        }
      }, read(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now();
        }
        return bytesRead;
      }, write(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.timestamp = Date.now();
        }
        return i;
      } });
      return FS.mkdev(path, mode, dev);
    }, forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (typeof XMLHttpRequest != "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      } else if (read_) {
        try {
          obj.contents = intArrayFromString(read_(obj.url), true);
          obj.usedBytes = obj.contents.length;
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.");
      }
    }, createLazyFile(parent, name, url, canRead, canWrite) {
      function LazyUint8Array() {
        this.lengthKnown = false;
        this.chunks = [];
      }
      LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      };
      LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
        this.getter = getter;
      };
      LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
          if (xhr2.response !== void 0) {
            return new Uint8Array(xhr2.response || []);
          }
          return intArrayFromString(xhr2.responseText || "", true);
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      };
      if (typeof XMLHttpRequest != "undefined") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array();
        Object.defineProperties(lazyArray, { length: { get: function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        } }, chunkSize: { get: function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        } } });
        var properties = { isDevice: false, contents: lazyArray };
      } else {
        var properties = { isDevice: false, url };
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
          FS.forceLoadFile(node);
          return fn.apply(null, arguments);
        };
      });
      function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents[position + i];
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer[offset + i] = contents.get(position + i);
          }
        }
        return size;
      }
      stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc();
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      node.stream_ops = stream_ops;
      return node;
    } };
    var SYSCALLS = { DEFAULT_POLLMASK: 5, calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) {
        return path;
      }
      var dir;
      if (dirfd === -100) {
        dir = FS.cwd();
      } else {
        var dirstream = SYSCALLS.getStreamFromFD(dirfd);
        dir = dirstream.path;
      }
      if (path.length == 0) {
        if (!allowEmpty) {
          throw new FS.ErrnoError(44);
        }
        return dir;
      }
      return PATH.join2(dir, path);
    }, doStat(func, path, buf) {
      try {
        var stat = func(path);
      } catch (e) {
        if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
          return -54;
        }
        throw e;
      }
      HEAP32[buf >> 2] = stat.dev;
      HEAP32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAP32[buf + 12 >> 2] = stat.uid;
      HEAP32[buf + 16 >> 2] = stat.gid;
      HEAP32[buf + 20 >> 2] = stat.rdev;
      tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 24 >> 2] = tempI64[0], HEAP32[buf + 28 >> 2] = tempI64[1];
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      tempI64 = [Math.floor(atime / 1e3) >>> 0, (tempDouble = Math.floor(atime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3;
      tempI64 = [Math.floor(mtime / 1e3) >>> 0, (tempDouble = Math.floor(mtime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 56 >> 2] = tempI64[0], HEAP32[buf + 60 >> 2] = tempI64[1];
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3;
      tempI64 = [Math.floor(ctime / 1e3) >>> 0, (tempDouble = Math.floor(ctime / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 72 >> 2] = tempI64[0], HEAP32[buf + 76 >> 2] = tempI64[1];
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3;
      tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 88 >> 2] = tempI64[0], HEAP32[buf + 92 >> 2] = tempI64[1];
      return 0;
    }, doMsync(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (flags & 2) {
        return 0;
      }
      var buffer = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer, offset, len, flags);
    }, varargs: void 0, get() {
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    }, getp() {
      return SYSCALLS.get();
    }, getStr(ptr) {
      var ret = UTF8ToString(ptr);
      return ret;
    }, getStreamFromFD(fd) {
      var stream = FS.getStreamChecked(fd);
      return stream;
    } };
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = SYSCALLS.get();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.createStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = SYSCALLS.get();
            stream.flags |= arg;
            return 0;
          }
          case 5: {
            var arg = SYSCALLS.getp();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 6:
          case 7:
            return 0;
          case 16:
          case 8:
            return -28;
          case 9:
            setErrNo(28);
            return -1;
          default: {
            return -28;
          }
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    function ___syscall_getdents64(fd, dirp, count) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (!stream.getdents) {
          stream.getdents = FS.readdir(stream.path);
        }
        var struct_size = 280;
        var pos = 0;
        var off = FS.llseek(stream, 0, 1);
        var idx = Math.floor(off / struct_size);
        while (idx < stream.getdents.length && pos + struct_size <= count) {
          var id;
          var type;
          var name = stream.getdents[idx];
          if (name === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child = FS.lookupNode(stream.node, name);
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          tempI64 = [id >>> 0, (tempDouble = id, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos >> 2] = tempI64[0], HEAP32[dirp + pos + 4 >> 2] = tempI64[1];
          tempI64 = [(idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[dirp + pos + 8 >> 2] = tempI64[0], HEAP32[dirp + pos + 12 >> 2] = tempI64[1];
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18 >> 0] = type;
          stringToUTF8(name, dirp + pos + 19, 256);
          pos += struct_size;
          idx += 1;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = SYSCALLS.getp();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i = 0; i < 32; i++) {
                HEAP8[argp + i + 17 >> 0] = termios.c_cc[i] || 0;
              }
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = SYSCALLS.getp();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i = 0; i < 32; i++) {
                c_cc.push(HEAP8[argp + i + 17 >> 0]);
              }
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = SYSCALLS.getp();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21531: {
            var argp = SYSCALLS.getp();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = SYSCALLS.getp();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? SYSCALLS.get() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.stat, path, buf);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    function ___syscall_unlinkat(dirfd, path, flags) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (flags === 0) {
          FS.unlink(path);
        } else if (flags === 512) {
          FS.rmdir(path);
        } else {
          abort("Invalid flags passed to unlinkat");
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return -e.errno;
      }
    }
    var nowIsMonotonic = true;
    var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
    var _abort = () => {
      abort("");
    };
    var _emscripten_date_now = () => Date.now();
    var _emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);
    var abortOnCannotGrowMemory = (requestedSize) => {
      abort("OOM");
    };
    var _emscripten_resize_heap = (requestedSize) => {
      HEAPU8.length;
      abortOnCannotGrowMemory();
    };
    var ENV = {};
    var getExecutableName = () => thisProgram || "./this.program";
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = { "USER": "web_user", "LOGNAME": "web_user", "PATH": "/", "PWD": "/", "HOME": "/home/web_user", "LANG": lang, "_": getExecutableName() };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var stringToAscii = (str, buffer) => {
      for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i);
      }
      HEAP8[buffer >> 0] = 0;
    };
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      getEnvStrings().forEach((string, i) => {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i * 4 >> 2] = ptr;
        stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach((string) => bufSize += string.length + 1);
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    var runtimeKeepaliveCounter = 0;
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module["onExit"]) Module["onExit"](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    };
    var _exit = exitJS;
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
      }
      return ret;
    };
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var convertI32PairToI53Checked = (lo, hi) => hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      var offset = convertI32PairToI53Checked(offset_low, offset_high);
      try {
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? +Math.floor(tempDouble / 4294967296) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
      }
      return ret;
    };
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
        return e.errno;
      }
    }
    var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var arraySum = (array, index) => {
      var sum = 0;
      for (var i = 0; i <= index; sum += array[i++]) {
      }
      return sum;
    };
    var MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var addDays = (date, days) => {
      var newDate = new Date(date.getTime());
      while (days > 0) {
        var leap = isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
          days -= daysInCurrentMonth - newDate.getDate() + 1;
          newDate.setDate(1);
          if (currentMonth < 11) {
            newDate.setMonth(currentMonth + 1);
          } else {
            newDate.setMonth(0);
            newDate.setFullYear(newDate.getFullYear() + 1);
          }
        } else {
          newDate.setDate(newDate.getDate() + days);
          return newDate;
        }
      }
      return newDate;
    };
    var writeArrayToMemory = (array, buffer) => {
      HEAP8.set(array, buffer);
    };
    var _strftime = (s, maxsize, format, tm) => {
      var tm_zone = HEAPU32[tm + 40 >> 2];
      var date = { tm_sec: HEAP32[tm >> 2], tm_min: HEAP32[tm + 4 >> 2], tm_hour: HEAP32[tm + 8 >> 2], tm_mday: HEAP32[tm + 12 >> 2], tm_mon: HEAP32[tm + 16 >> 2], tm_year: HEAP32[tm + 20 >> 2], tm_wday: HEAP32[tm + 24 >> 2], tm_yday: HEAP32[tm + 28 >> 2], tm_isdst: HEAP32[tm + 32 >> 2], tm_gmtoff: HEAP32[tm + 36 >> 2], tm_zone: tm_zone ? UTF8ToString(tm_zone) : "" };
      var pattern = UTF8ToString(format);
      var EXPANSION_RULES_1 = { "%c": "%a %b %d %H:%M:%S %Y", "%D": "%m/%d/%y", "%F": "%Y-%m-%d", "%h": "%b", "%r": "%I:%M:%S %p", "%R": "%H:%M", "%T": "%H:%M:%S", "%x": "%m/%d/%y", "%X": "%H:%M:%S", "%Ec": "%c", "%EC": "%C", "%Ex": "%m/%d/%y", "%EX": "%H:%M:%S", "%Ey": "%y", "%EY": "%Y", "%Od": "%d", "%Oe": "%e", "%OH": "%H", "%OI": "%I", "%Om": "%m", "%OM": "%M", "%OS": "%S", "%Ou": "%u", "%OU": "%U", "%OV": "%V", "%Ow": "%w", "%OW": "%W", "%Oy": "%y" };
      for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
      }
      var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || "";
        while (str.length < digits) {
          str = character[0] + str;
        }
        return str;
      }
      function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0");
      }
      function compareByDay(date1, date2) {
        function sgn(value) {
          return value < 0 ? -1 : value > 0 ? 1 : 0;
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
          if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
            compare = sgn(date1.getDate() - date2.getDate());
          }
        }
        return compare;
      }
      function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
          case 0:
            return new Date(janFourth.getFullYear() - 1, 11, 29);
          case 1:
            return janFourth;
          case 2:
            return new Date(janFourth.getFullYear(), 0, 3);
          case 3:
            return new Date(janFourth.getFullYear(), 0, 2);
          case 4:
            return new Date(janFourth.getFullYear(), 0, 1);
          case 5:
            return new Date(janFourth.getFullYear() - 1, 11, 31);
          case 6:
            return new Date(janFourth.getFullYear() - 1, 11, 30);
        }
      }
      function getWeekBasedYear(date2) {
        var thisDate = addDays(new Date(date2.tm_year + 1900, 0, 1), date2.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
          if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
            return thisDate.getFullYear() + 1;
          }
          return thisDate.getFullYear();
        }
        return thisDate.getFullYear() - 1;
      }
      var EXPANSION_RULES_2 = { "%a": (date2) => WEEKDAYS[date2.tm_wday].substring(0, 3), "%A": (date2) => WEEKDAYS[date2.tm_wday], "%b": (date2) => MONTHS[date2.tm_mon].substring(0, 3), "%B": (date2) => MONTHS[date2.tm_mon], "%C": (date2) => {
        var year = date2.tm_year + 1900;
        return leadingNulls(year / 100 | 0, 2);
      }, "%d": (date2) => leadingNulls(date2.tm_mday, 2), "%e": (date2) => leadingSomething(date2.tm_mday, 2, " "), "%g": (date2) => getWeekBasedYear(date2).toString().substring(2), "%G": (date2) => getWeekBasedYear(date2), "%H": (date2) => leadingNulls(date2.tm_hour, 2), "%I": (date2) => {
        var twelveHour = date2.tm_hour;
        if (twelveHour == 0) twelveHour = 12;
        else if (twelveHour > 12) twelveHour -= 12;
        return leadingNulls(twelveHour, 2);
      }, "%j": (date2) => leadingNulls(date2.tm_mday + arraySum(isLeapYear(date2.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date2.tm_mon - 1), 3), "%m": (date2) => leadingNulls(date2.tm_mon + 1, 2), "%M": (date2) => leadingNulls(date2.tm_min, 2), "%n": () => "\n", "%p": (date2) => {
        if (date2.tm_hour >= 0 && date2.tm_hour < 12) {
          return "AM";
        }
        return "PM";
      }, "%S": (date2) => leadingNulls(date2.tm_sec, 2), "%t": () => "	", "%u": (date2) => date2.tm_wday || 7, "%U": (date2) => {
        var days = date2.tm_yday + 7 - date2.tm_wday;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%V": (date2) => {
        var val = Math.floor((date2.tm_yday + 7 - (date2.tm_wday + 6) % 7) / 7);
        if ((date2.tm_wday + 371 - date2.tm_yday - 2) % 7 <= 2) {
          val++;
        }
        if (!val) {
          val = 52;
          var dec31 = (date2.tm_wday + 7 - date2.tm_yday - 1) % 7;
          if (dec31 == 4 || dec31 == 5 && isLeapYear(date2.tm_year % 400 - 1)) {
            val++;
          }
        } else if (val == 53) {
          var jan1 = (date2.tm_wday + 371 - date2.tm_yday) % 7;
          if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date2.tm_year))) val = 1;
        }
        return leadingNulls(val, 2);
      }, "%w": (date2) => date2.tm_wday, "%W": (date2) => {
        var days = date2.tm_yday + 7 - (date2.tm_wday + 6) % 7;
        return leadingNulls(Math.floor(days / 7), 2);
      }, "%y": (date2) => (date2.tm_year + 1900).toString().substring(2), "%Y": (date2) => date2.tm_year + 1900, "%z": (date2) => {
        var off = date2.tm_gmtoff;
        var ahead = off >= 0;
        off = Math.abs(off) / 60;
        off = off / 60 * 100 + off % 60;
        return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
      }, "%Z": (date2) => date2.tm_zone, "%%": () => "%" };
      pattern = pattern.replace(/%%/g, "\0\0");
      for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
          pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
        }
      }
      pattern = pattern.replace(/\0\0/g, "%");
      var bytes = intArrayFromString(pattern, false);
      if (bytes.length > maxsize) {
        return 0;
      }
      writeArrayToMemory(bytes, s);
      return bytes.length - 1;
    };
    var _strftime_l = (s, maxsize, format, tm, loc) => _strftime(s, maxsize, format, tm);
    var handleException = (e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    };
    var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
    var FSNode = function(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.mounted = null;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.node_ops = {};
      this.stream_ops = {};
      this.rdev = rdev;
    };
    var readMode = 292 | 73;
    var writeMode = 146;
    Object.defineProperties(FSNode.prototype, { read: { get: function() {
      return (this.mode & readMode) === readMode;
    }, set: function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
    } }, write: { get: function() {
      return (this.mode & writeMode) === writeMode;
    }, set: function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
    } }, isFolder: { get: function() {
      return FS.isDir(this.mode);
    } }, isDevice: { get: function() {
      return FS.isChrdev(this.mode);
    } } });
    FS.FSNode = FSNode;
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    Module["FS_createPath"] = FS.createPath;
    Module["FS_createDataFile"] = FS.createDataFile;
    Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
    Module["FS_unlink"] = FS.unlink;
    Module["FS_createLazyFile"] = FS.createLazyFile;
    Module["FS_createDevice"] = FS.createDevice;
    var wasmImports = { a: ___assert_fail, b: ___cxa_throw, e: ___syscall_fcntl64, r: ___syscall_getdents64, v: ___syscall_ioctl, f: ___syscall_openat, p: ___syscall_rmdir, o: ___syscall_stat64, q: ___syscall_unlinkat, j: __emscripten_get_now_is_monotonic, h: _abort, g: _emscripten_date_now, k: _emscripten_memcpy_js, n: _emscripten_resize_heap, s: _environ_get, t: _environ_sizes_get, d: _exit, c: _fd_close, u: _fd_read, l: _fd_seek, i: _fd_write, m: _strftime_l };
    var wasmExports = createWasm();
    var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["y"])(a0, a1);
    var ___errno_location = () => (___errno_location = wasmExports["z"])();
    var stackAlloc = (a0) => (stackAlloc = wasmExports["B"])(a0);
    var ___cxa_is_pointer_type = (a0) => (___cxa_is_pointer_type = wasmExports["C"])(a0);
    Module["addRunDependency"] = addRunDependency;
    Module["removeRunDependency"] = removeRunDependency;
    Module["FS_createPath"] = FS.createPath;
    Module["FS_createLazyFile"] = FS.createLazyFile;
    Module["FS_createDevice"] = FS.createDevice;
    Module["callMain"] = callMain;
    Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
    Module["FS"] = FS;
    Module["FS_createDataFile"] = FS.createDataFile;
    Module["FS_unlink"] = FS.unlink;
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function callMain(args = []) {
      var entryFunction = _main;
      args.unshift(thisProgram);
      var argc = args.length;
      var argv = stackAlloc((argc + 1) * 4);
      var argv_ptr = argv;
      args.forEach((arg) => {
        HEAPU32[argv_ptr >> 2] = stringToUTF8OnStack(arg);
        argv_ptr += 4;
      });
      HEAPU32[argv_ptr >> 2] = 0;
      try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    function run(args = arguments_) {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        readyPromiseResolve(Module);
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        if (shouldRunNow) callMain(args);
        postRun();
      }
      if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
      while (Module["preInit"].length > 0) {
        Module["preInit"].pop()();
      }
    }
    var shouldRunNow = false;
    if (Module["noInitialRun"]) shouldRunNow = false;
    run();
    return moduleArg.ready;
  };
})();
export {
  createPiperPhonemize
};
