import md5 from "../common/external/md5";
import {calculateSignature} from "./index";
import {getStoreString, STORED_KEYS} from "../common/store";
import {SS_API} from "../constants/api";
import {_slice, urlSafeBase64} from "../common/utils";
import sjcl from "../common/external/sjcl";
import axios from "axios";

export const encryptAndUploadFiles = async (packageId, keyCode, serverSecret, files, uploadType, statusCb, progressCb, errored, finished) => {
  let myself = this;
  myself.uploadType = uploadType;
  myself.apiKey = await getStoreString(STORED_KEYS.SS_API_KEY);
  myself.apiSecret = await getStoreString(STORED_KEYS.SS_API_SECRET);
  myself.eventHandler = new EventHandler(myself);
  myself.request = new APIRequest(myself.apiKey, myself.apiSecret, myself.eventHandler, myself.uploadType);
  myself.uploadHandler = new EncryptAndUploadFile(myself.eventHandler, myself.request);
  myself.uploadHandler.serverWorkerURI = myself.serverWorkerURI;

  // this.run = () => {
  // try {
  //   myself.uploadHandler.start(packageId, keyCode, serverSecret, files, myself.uploadType, statusCb, finished);
  // } catch(err) {
  //   console.log(err);
  //   errored(err);
  // }
  // };

  myself.on('session.timeout', function(event) {
    console.log('session.timeout : ', event);

  });

  myself.on('UNHANDLED_EXCEPTION', function(event) {
    console.log('UNHANDLED_EXCEPTION : ', event);
  });

  myself.on('sendsafely.status', function(event) {
    console.log('sendsafely.status : ', event);
    if(event.state === 'ATTACH') {
      statusCb('FILE_ADDED', event);
    }
  });

  myself.on('sendsafely.progress', function(event) {
    console.log('sendsafely.progress : ', event);
    progressCb(event);
  });

  myself.on('sendsafely.entropy.ready', function(event) {
    console.log('sendsafely.entropy.ready : ', event);
    // myself.eventHandler.trigger("sendsafely.entropy.ready");
  });

  myself.on('sendsafely.entropy.progress', function(event) {
    console.log('sendsafely.entropy.progress : ', event);
  });

  myself.on('duplicate.file', function(event) {
    console.log('duplicate.file :', event);
  });

  myself.on('server.error', function(event) {
    console.log('server.error :', event);
  });

  myself.on('file.upload.error', function(event) {
    console.log('file.upload.error :', event);
    errored(event);
  });

  myself.on('limit.exceeded', function(event) {
    console.log('limit.exceeded : ', event);
  });

  myself.on('invalid.file.name', function(event) {
    console.log('invalid.file.name : ', event);
  });

  try {
    myself.uploadHandler.start(packageId, keyCode, serverSecret, files, myself.uploadType, statusCb, finished);
  } catch(err) {
    console.log(err);
    errored(err);
  }
};


export async function EncryptAndUploadFile (eventHandler, request) {
  const myself = this;
  this.apiKey = await getStoreString(STORED_KEYS.SS_API_KEY);
  this.apiSecret = await getStoreString(STORED_KEYS.SS_API_SECRET);
  this.timestamp = new Date().toISOString().substr(0, 19) + "+0000";
  this.ec2Proxy = false;
  this.apiPrefix = '/api/v2.0';
  this.addFileEndpoint = { "url": "/package/{packageId}/file/{fileId}/", "HTTPMethod" : "POST", "mimetype": "multipart/form-data"};
  this.encrypting = [];
  this.uploadUrls = {};
  this.uploading = [];
  this.progressTracker = {};
  this.encryptionKeyMapping = {};
  this.workerPool = [];
  this.request = request;
  this.markedAsDeleted = {};
  this.async = true;
  this.defaultFileName = 'SnapSafely';
  this.eventHandler = eventHandler;
  this.segmentsCurrentlyEncrypting = 0;
  this.MAX_CONCURRENT_ENCRYPTIONS = 2;
  this.SEGMENT_SIZE = 2621440;
  this.PROGRESS_EVENT = 'sendsafely.progress';
  this.LIMIT_EXCEEDED_EVENT = 'limit.exceeded';
  this.DUPLICATE_FILE_EVENT = 'duplicate.file';
  this.UPLOAD_ABORT_EVENT = 'file.upload.cancel';
  this.UPLOAD_ERROR_EVENT = 'file.upload.error';
  this.SERVER_ERROR_EVENT = 'server.error';
  this.INVALID_FILE_NAME_EVENT = 'invalid.file.name';
  this.INVALID_FILE_EXTENSION_EVENT = 'invalid.file.extension';


  this.start = function (packageId, keyCode, serverSecret, files, uploadType, statusCb, finished) {
    myself.addEncryptionKey(packageId, serverSecret, keyCode);
    handleResponse(1, 1, files);

    function handleResponse(index, parts, files) {
      var serverFilename = (files[index].name === undefined) ? myself.defaultFileName : files[index].name;
      myself.processAjaxDataRaw(myself.createFileId(packageId, files[index], serverFilename, parts, uploadType, myself.async), function (resp) {
        if(resp.response === "SUCCESS") {
          myself.progressTracker[resp.message] = {};
          myself.progressTracker[resp.message].totalSize = files[index].size;
          myself.progressTracker[resp.message].parts = {};

          files[index].part = 0;
          files[index].id = resp.message;

          if( files[index].url === undefined ) {
            //Add to encrypting Queue
            var filename = (files[index].name === undefined) ? myself.defaultFileName : files[index].name;
            myself.encrypting.push({"packageId": packageId, "file":files[index], "parts": parts, "part": 1, "name": filename, "fileStart": 0, "id": resp.message})
            // var event = {'fileId': files[index].id==undefined?resp.message:files[index].id, 'filePart':files[index].part, "parts":parts, 'name': filename, 'size': files[index].size, 'packageId': packageId, 'type': undefined, 'fileVersion': resp.fileVersion, 'fileUploadedStr': resp.fileUploadedStr};
            // myself.eventHandler.raise("sendsafely.files.attached", event);
            statusCb("ATTACH", files[index]);
            if(myself.encrypting.length === 1){
              myself.uploadPart(statusCb, finished);
            }
          } else {
            myself.loadBlobFromUrl(packageId, directoryId, statusCb, finished, files[index], parts);
          }
        } else if (resp.response === "LIMIT_EXCEEDED") {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          // myself.eventHandler.raise(myself.LIMIT_EXCEEDED_EVENT, {error: resp.message});
        } else if (resp.response === "DUPLICATE_FILE") {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          // myself.eventHandler.raiseError('DUPLICATE_FILE', resp.message, myself.DUPLICATE_FILE_EVENT);
        } else if (resp.response === "TIMEOUT") {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          // myself.eventHandler.raise('session.timeout', resp.message);
        } else if (resp.response === "INVALID_FILE_NAME"){
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          myself.abort();
          // myself.eventHandler.raise(myself.INVALID_FILE_NAME_EVENT, {error: resp.response, message: resp.message});
        } else if(resp.response === "INVALID_FILE_EXTENSION"){
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          myself.abort();
          // myself.eventHandler.raise(myself.INVALID_FILE_EXTENSION_EVENT, {error: resp.response, message: resp.message});
          // alert(resp.message);
        } else {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
          // myself.eventHandler.raise(myself.SERVER_ERROR_EVENT, {error: resp.response, message: resp.message});
        }
      });
    }
  };

  this.SendPart = function (requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator) {
    var fileId = messageData.fileId;
    var filePart = messageData.filePart;

    if (myself.uploadUrls[fileId] === undefined || myself.uploadUrls[fileId][filePart] === undefined) {

      myself.processAjaxDataRaw(myself.getUploadUrls(packageId, fileId, filePart, myself.ec2Proxy, a_sync), function (resp) {
        if (resp.response === "SUCCESS") {
          if (myself.uploadUrls[fileId] === undefined) {
            myself.uploadUrls[fileId] = {};
          }
          for (var i = 0; i < resp.uploadUrls.length; i++) {
            myself.uploadUrls[fileId][resp.uploadUrls[i].part] = resp.uploadUrls[i].url;
          }
          return myself.SendPartToServer(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator);
        } else if (resp.response === "TIMEOUT") {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
        } else {
          // TODO: HANDLE ERROR
          console.log(resp.response);
          console.log(resp.message);
        }
      });
    } else {
      return myself.SendPartToServer(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator);
    }
  };

  this.SendPartToServer = function (
    requestType, messageData, boundary, filesize,
    encryptedFile, filename, uploadCb, a_sync,
    packageId, done_callback, progress_callback, retryIterator
  ) {
    var fileId = messageData.fileId;
    var filePart = messageData.filePart;

    var multipart = {};
    multipart["fileId"] = fileId;
    multipart["uploadType"] = "JS_API";
    multipart["filePart"] = filePart;
    var multiPartForm = myself.createMultiPartForm(boundary, JSON.stringify(multipart), encryptedFile.file);
    var xhr = myself.getHTTPObjForFileUpload(requestType.url, JSON.stringify(messageData), boundary, a_sync);

    if (!myself.ec2Proxy) {
      xhr = new XMLHttpRequest();
      var url = myself.uploadUrls[fileId][filePart];
      xhr.open('PUT', url, a_sync);
    }

    // Add event listener so we can abort the upload if we have to.
    var eventId = myself.eventHandler.bind(myself.UPLOAD_ABORT_EVENT, function (data) {
      if (data.fileId == messageData.fileId) {
        xhr.abort();
      }
    });

    xhr.upload.onprogress = function (e) {
      uploadCb(e);
    };

    xhr.onerror = function (e) {
      //something happened...try again
      if (retryIterator == undefined) {
        retryIterator = 1;
      }
      if (retryIterator < 5) {
        setTimeout(function () {
          myself.SendPart(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator + 1);
        }, retryIterator * 1000);
      } else {
        //If we fail 5 times and are not using the proxy, flip the proxy switch and try again
        if (!myself.ec2Proxy) {
          myself.ec2Proxy = true;
          retryIterator = 0;
          setTimeout(function () {
            myself.SendPart(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator + 1);
          }, retryIterator * 1000);
        } else {
          if (confirm('We encountered a problem while uploading your file. Do you want to retry?')) {
            // Yes
            myself.ec2Proxy = false;
            retryIterator = 0;
            setTimeout(function () {
              myself.SendPart(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator + 1);
            }, retryIterator * 1000);
          } else {
            // No
            myself.removeFileFromQueue(messageData.fileId, messageData.fileId);
            myself.eventHandler.raise(myself.UPLOAD_ERROR_EVENT, {
              error: xhr.statusText,
              message: "A server error occurred - Please try again."
            });
          }
        }
      }
    }
    xhr.onload = function (e) {
      const data = e.target.response;
      let response;
      if (myself.ec2Proxy && typeof data == "string") {
        try {
          response = JSON.parse(data);
        } catch (e) {
          response = {response: "SERVER_ERROR", message: "A server error has occurred, please try again."};
        }
      }
      if (myself.ec2Proxy && response.response == "LIMIT_EXCEEDED") {
        myself.eventHandler.raise(myself.LIMIT_EXCEEDED_EVENT, {error: response.message});
      } else if (myself.ec2Proxy && response.response === "AUTHENTICATION_FAILED") {
        myself.removeFileFromQueue(messageData.fileId);
        myself.eventHandler.raise(myself.UPLOAD_ERROR_EVENT, {
          error: 'AUTHENTICATION_FAILED',
          message: response.message
        });
      } else if ((myself.ec2Proxy && response.response == "SUCCESS") || (!myself.ec2Proxy && xhr.status == 200)) {

        var S3MD5 = xhr.getResponseHeader("ETag");
        if (S3MD5 !== null) {
          var md5Digest = md5(encryptedFile.file);
          var eTag = S3MD5.replace(/['"]+/g, '');
          if (md5Digest == eTag) {
            console.log("MD5 validation succeeded.");
            if (myself.md5Counter > 1) {
              // var handler = new SendFeedback(myself.eventHandler, myself.request);
              var partName = "Package " + packageId + " File " + fileId + " Part " + filePart;
              var message = partName + " has passed md5 validation on Attempt #" + myself.md5Counter.toString();
              var systemInfo = navigator.appCodeName + "\n" + navigator.appName + "\n"
                + navigator.appVersion + "\n" + navigator.userAgent + "\n";
              handler.execute(message, "", systemInfo);
            }
            myself.md5Counter = 1;
          } else if (myself.md5Counter > 10) {
            console.log("MD5 validation failed. Moving onto the next file part & reporting mismatch to SendSafely.");
            var partName = "Package " + packageId + " File " + fileId + " Part " + filePart;
            // var handler = new SendFeedback(myself.eventHandler, myself.request);
            var message = partName + " has failed md5 validation. SendSafely calculated " + md5Digest + " and Amazon returned " + eTag;
            var systemInfo = navigator.appCodeName + "\n" + navigator.appName + "\n"
              + navigator.appVersion + "\n" + navigator.userAgent + "\n";
            handler.execute(message, "", systemInfo);
            myself.md5Counter = 1;
          } else {
            // MD5 validation failed, try again
            // var handler = new SendFeedback(myself.eventHandler, myself.request);
            var partName = "MD5 validation failed - Package - " + packageId + " File " + fileId + " Part " + filePart;
            console.log(partName);
            var message = partName + " has failed md5 validation. SendSafely calculated " + md5Digest + " and Amazon returned " + eTag;
            var systemInfo = navigator.appCodeName + "\n" + navigator.appName + "\n"
              + navigator.appVersion + "\n" + navigator.userAgent + "\n";
            handler.execute(message, "", systemInfo);
            console.log("Amazon: " + eTag);
            console.log("SendSafely: " + md5Digest);
            console.log("MD5 validation failed. Retrying " + myself.md5Counter + "/10");
            myself.eventHandler.unbind(myself.UPLOAD_ABORT_EVENT, eventId);
            myself.SendPartToServer(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator);
            myself.md5Counter++;
            return;
          }
        }
        //response.fileId = response.message;

        var discard = myself.uploading.shift();
        discard = null;

        myself.eventHandler.unbind(myself.UPLOAD_ABORT_EVENT, eventId);
        if (encryptedFile.part == encryptedFile.parts) {
          if (!myself.ec2Proxy) {
            var counter = 0;
            myself.markFileComplete(packageId, fileId, a_sync, function () {
              done_callback(packageId, fileId, filesize, filename);
            }, function () {
              myself.eventHandler.raise(myself.SERVER_ERROR_EVENT, {
                error: "FILE_INCOMPLETE",
                message: "Your file did not upload completely. Please refresh and try again."
              });
            }, counter);
          } else {
            done_callback(packageId, fileId, filesize, filename);
          }
        }
        if (myself.uploading.length != 0) {
          myself.nextUploadFile(done_callback, progress_callback);
        }
      } else {
        // Make sure the file isn't marked as deleted.
        if (myself.markedAsDeleted[messageData.fileId] == undefined) {
          if (retryIterator == undefined) {
            retryIterator = 1;
          }
          if (retryIterator < 5) {
            myself.SendPart(requestType, messageData, boundary, filesize, encryptedFile, filename, uploadCb, a_sync, packageId, done_callback, progress_callback, retryIterator + 1)

          } else {
            myself.removeFileFromQueue(messageData.fileId, messageData.fileId);
            myself.eventHandler.raise(myself.UPLOAD_ERROR_EVENT, {error: response.response, message: response.message});
          }
        }
      }
    };

    if (myself.ec2Proxy) {
      xhr.send(multiPartForm.buffer);
    } else {
      xhr.send(encryptedFile.file.buffer);
    }
    return xhr;
  }
  
  this.createFileId = (packageId, data, fileName, parts, uploadType, async) => {
    var endpoint = myself.request.extend({}, { "url": "/package/{packageId}/file/", "HTTPMethod" : "PUT", "mimetype": "application/json"});

    var postData = {};
    postData['filename'] = encodeURI(fileName);
    postData['uploadType'] = uploadType;
    postData['parts'] = parts;
    postData['filesize'] = data.size;

    endpoint.url = endpoint.url.replace("{packageId}", packageId);
    return myself.request.sendRequest(endpoint, postData, async);
  }
  
  this.uploadPart = function (statusCb, finished) {
    if(myself.encrypting.length >= 1){
      var currentFile = myself.encrypting[0];

      while(myself.segmentsCurrentlyEncrypting < myself.MAX_CONCURRENT_ENCRYPTIONS) {
        if(currentFile.part === 1){
          var fileObj = {};
          var fileSegment = _slice(currentFile.file, 0, Math.min((myself.SEGMENT_SIZE/4), currentFile.file.size));
          fileObj.fileSegment = fileSegment;
          fileObj.id = currentFile.id;
          fileObj.part = currentFile.part;
          fileObj.parts = currentFile.parts;
          fileObj.name = currentFile.name;
          fileObj.directoryId = currentFile.directoryId;

          myself.encrypting[0].fileStart = Math.min(myself.SEGMENT_SIZE/4, myself.encrypting[0].file.size);
        }
        else if(currentFile.part <= currentFile.parts){
          var fileObj = {};
          var fileSegment = _slice(currentFile.file, currentFile.fileStart, Math.min(currentFile.fileStart+(myself.SEGMENT_SIZE), currentFile.file.size));
          fileObj.fileSegment = fileSegment;
          fileObj.id = currentFile.id;
          fileObj.part = currentFile.part;
          fileObj.parts = currentFile.parts;
          fileObj.name = currentFile.name;

          myself.encrypting[0].fileStart = Math.min(myself.encrypting[0].fileStart+(myself.SEGMENT_SIZE), myself.encrypting[0].file.size);
        }
        else{
          //Finished last
          myself.encrypting.shift();
          return myself.uploadPart(statusCb, finished);
        }

        myself.encrypting[0].part++;

        myself.segmentsCurrentlyEncrypting++;

        var packageId = currentFile.packageId;
        var directoryId = currentFile.directoryId;
        myself.sendFileToWorker(fileObj, packageId, directoryId, currentFile.file.size, statusCb, finished, function(){
          myself.uploadPart(statusCb, finished);
        });
      }
    }
  };

  this.addEncryptionKey = function(packageId, serverSecret, keyCode) {
    if(myself.encryptionKeyMapping[packageId] === undefined) {
      myself.encryptionKeyMapping[packageId] = {serverSecret: serverSecret, keyCode: keyCode};
    }
  };

  this.getEncryptionKey = function (packageId) {
    return myself.encryptionKeyMapping[packageId];
  };

  this.getWorker = function(statusCb, nextCb, done) {
    for(var i = 0; i<myself.workerPool.length; i++) {
      if(myself.workerPool[i].available) {
        myself.workerPool[i].available = false;
        return myself.workerPool[i];
      }
    }
    // var worker;
    // if(typeof uploadWorkerURL !== 'undefined') {
    //   worker = new Worker(uploadWorkerURL);
    // } else {
    //   worker = new Worker(myself.serverWorkerURI);
    // }
    // myself.workerPool.push({'available': false, 'id': myself.workerPool.length, 'worker': worker});
    // myself.addWorkerEventListener(worker, statusCb, nextCb, done);
    // return myself.workerPool[myself.workerPool.length-1];
  };

  this.sendFileToWorker = function (fileObject, packageId, directoryId, fileSize, statusCb, done, nextCb) {
    function postStartMessage(worker) {
      var randomness = sjcl.codec.utf8String.fromBits(sjcl.random.randomWords(16,6));
      var key = myself.getEncryptionKey(packageId);
      worker.worker.postMessage({'cmd': 'start',
        'serverSecret': urlSafeBase64(key.serverSecret),
        'packageId': packageId,
        'fileId': fileObject.id,
        'keycode': urlSafeBase64(key.keyCode),
        'iv': randomness,
        'file': fileObject.fileSegment,
        'fileSize': fileObject.size,
        'name': fileObject.name,
        'totalFileSize': fileSize,
        'filePart': fileObject.part,
        'parts': fileObject.parts,
        'SEGMENT_SIZE': myself.SEGMENT_SIZE,
        'id': worker.id,
        'boundary': '------JSAPIFormDataBoundary' + Math.random().toString(36)
      });
    }

    function sendWorkerFile(worker) {
      if(sjcl.random.isReady(6) === 0) {
        sjcl.random.addEventListener("seeded", function () {
          myself.eventHandler.raise('sendsafely.entropy.ready');
          postStartMessage(worker);
        });
        sjcl.random.addEventListener("progress", function(evt) {
          var entropyPercent = 0;
          if(evt !== undefined && evt !== 1 && !isNaN(evt)) {
            entropyPercent = (evt*100);
            myself.eventHandler.raise('sendsafely.entropy.progress', {entropy: entropyPercent});
          } else {
            myself.eventHandler.raise('sendsafely.entropy.ready');
          }
        });
      } else {
        postStartMessage(worker);
      }
    }

    var worker = myself.getWorker(statusCb, nextCb, done);
    sendWorkerFile(worker);
  };

  this.loadBlobFromUrl = function (packageId, directoryId, statusCb, finished, file, parts) {
    var xhr = new XMLHttpRequest();
    var url = file.url;

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
      if (this.status === 200) {
        // Convert to ArrayBufferView
        var formattedResponse = new Uint8Array(this.response);

        var blob = new Blob([formattedResponse], {type: 'application/octet-stream'});
        blob.part = file.part;
        blob.id = file.id;
        blob.name = file.name;

        var filename = (file.name === undefined) ? "Unknown File" : file.name;

        //Add to encrypting Queue
        myself.encrypting.push({"packageId": packageId, "directoryId": directoryId, "file":blob, "name": filename, "parts": parts, "part": 1, "fileStart": 0, "id": blob.id});

        var event = {'fileId': file.id, 'name': file.name, 'size': file.size, 'packageId': packageId};
        myself.eventHandler.raise("sendsafely.files.attached", event);
        statusCb("ATTACH", file);

        if(myself.encrypting.length === 1){
          //Start Uploading files
          myself.uploadPart(statusCb, finished);
        }
      } else {
        myself.eventHandler.raiseError('BLOB_ERROR', 'Failed to load blob');
      }
    };

    xhr.send();
  };
  
  this.getUploadUrls = (packageId, fileId, part, forceProxy, async) => {
    var endpoint = myself.request.extend({}, { "url": "/package/{packageId}/file/{fileId}/upload-urls/", "HTTPMethod" : "POST", "mimetype": "application/json" });
    var postData = {};
    postData['part'] = part;
    postData['forceProxy'] = forceProxy;
    endpoint.url = endpoint.url.replace("{packageId}", packageId);
    endpoint.url = endpoint.url.replace("{fileId}", fileId);
    return myself.request.sendRequest(endpoint, postData, async);
  }

  this.createMultiPartForm = (boundary, messageData, file) => {
    var multiPartFormPre = '';
    multiPartFormPre += '--' + boundary + '\r\nContent-Disposition: form-data; name="requestData"';
    multiPartFormPre += '\r\n\r\n' + messageData + '\r\n';
    multiPartFormPre += '--' + boundary + '\r\nContent-Disposition: form-data; name="textFile"';
    multiPartFormPre += '; filename="file.txt"\r\n';
    multiPartFormPre += 'Content-Type: application/octet-stream\r\n\r\n';

    var end = "\r\n--" + boundary + '--\r\n';
    var length = multiPartFormPre.length + file.length + end.length;

    var arrayToSend = new Uint8Array(length);
    for (var i = 0; i < multiPartFormPre.length; i++) {
      arrayToSend.set([multiPartFormPre.charCodeAt(i) & 0xff], i);
    }
    arrayToSend.set(file, multiPartFormPre.length);

    var endIndex = 0;
    for (var i = (multiPartFormPre.length + file.length); i < length; i++) {
      arrayToSend.set([end.charCodeAt(endIndex) & 0xff], i);
      endIndex++;
    }
    return arrayToSend;
  }
  
  this.getHTTPObjForFileUpload = (uri, messageData, boundary, a_sync) => {
    var xhr = new XMLHttpRequest();
    var url = myself.apiPrefix + uri;
    xhr.open('POST', url, a_sync);
    xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
    const timestamp = new Date().toISOString().substr(0, 19) + "+0000";
    const signature = calculateSignature(myself.apiKey, myself.apiSecret, url, messageData, myself.timestamp);
    console.log(signature);
    xhr.setRequestHeader('ss-api-key', myself.apiKey);
    xhr.setRequestHeader('ss-request-signature', signature);
    xhr.setRequestHeader('ss-request-timestamp', timestamp);
    return xhr;
  };

  this.removeFileFromQueue = (fileId) => {
    // Go through the file queue
    for (let i = 0; i < myself.encrypting.length; i++) {
      if (myself.encrypting[i].id === fileId) {
        myself.encrypting.splice(i, 1);
        i--;
      }
    }
    for(let i = 0; i < this.uploading.length; i++) {
      if(myself.uploading[i].file.fileId === fileId) {
        myself.uploading.splice(i, 1);
        i--;
      }
    }
    myself.markedAsDeleted[fileId] = true;
  };

  this.nextUploadFile = (done) => {
    if (myself.uploading.length >= 1) {
      const args = myself.uploading[0];
      myself.addFile(args.packageId, args.file.filesize, args.boundary, args.messageData, args.file, args.name, args.in_progressCb, true, done);
    }
  };

  this.addFile = (packageId, filesize, boundary, messageData, file, name, in_progressCb, async, done_callback) => {
    let endpoint;
    endpoint = myself.request.extend({}, myself.addFileEndpoint);
    endpoint.url = endpoint.url.replace("{packageId}", packageId);
    endpoint.url = endpoint.url.replace("{fileId}", messageData["fileId"]);
    return myself.SendPart(endpoint, messageData, boundary, filesize, file, name, in_progressCb, async, packageId, done_callback, in_progressCb);
  };

  this.markFileComplete =  (packageId, fileId, async, finished, failed, retryCounter) => {
      let endpoint = { "url": "/package/{packageId}/file/{fileId}/upload-complete/", "HTTPMethod" : "POST", "mimetype": "application/json"};
      endpoint = myself.request.extend({}, endpoint);

      var postData = {};
      postData['complete'] = true;
      endpoint.url = endpoint.url.replace("{packageId}", packageId);
      endpoint.url = endpoint.url.replace("{fileId}", fileId);
      myself.processAjaxDataRaw(myself.request.sendRequest(endpoint, postData, async), function (resp) {
        if(resp.response === "SUCCESS" && resp.message === "true") {
          finished(resp);
        } else {
          //Keep trying every 2 seconds until the file is done
          setTimeout(function() {
            myself.markFileComplete(packageId, fileId, async, finished, failed, retryCounter);
          }, 2000);
        }
      });
    }

  this.processAjaxDataRaw = (ajax, callback) => {
    ajax.fail(function (xhr, status, error) {
      var errorMessage;
      if(typeof error == "string"){
        errorMessage = error;
      } else {
        errorMessage = error.message;
      }
      // Wrap the error to a format we recognize.
      var data = {response: "AJAX_ERROR", message: "A server error has occurred (" + errorMessage + "). Please try again."};
      callback(data);
    }).done(function (data) {
      if(typeof data == "string"){
        data = JSON.parse(data);
      }
      callback(data);
    })
  }
}

function APIRequest(apiKey, apiSecret, eventHandler, requestAPI) {

  var myself = this;
  this.apiKey = apiKey;
  this.apiSecret = apiSecret;
  this.apiPrefix = '/api/v2.0';
  this.eventHandler = eventHandler;
  this.defaultEventError = 'sendsafely.error';

  this.sendRequest = function (requestType, messageData, a_sync) {
    if (typeof a_sync === "undefined") {
      a_sync = true;
    }
    
    const messageDataSting = JSON.stringify(messageData);
    const timestamp = new Date().toISOString().substr(0, 19) + "+0000";
    const signature = calculateSignature(myself.apiKey, myself.apiSecret, requestType.url, messageDataSting, timestamp);
    
    return axios({
      url: this.apiPrefix + requestType.url,
      method: requestType.HTTPMethod,
      timeout: 25000,
      data: messageData === null || messageData === undefined ? null : messageDataSting,
      // contentType: requestType.mimetype,
      headers: {
        'Content-Type':  requestType.mimetype,
        'ss-api-key': signature,
        'ss-request-signature': requestAPI,
        'ss-request-timestamp': timestamp
      },
      crossDomain: false,
      async: a_sync,
      retryCount: 2
    })
  }
}

function EventHandler(parent) {
  var myself = this;
  this.eventlist = {};
  this.ERROR_EVENT = 'sendsafely.error';

  // Inject into the parent
  if (parent !== undefined) {
    parent.on = function (eventStr, callback) {
      return myself.bind(eventStr, callback);
    };

    parent.unbind = function (eventStr, id) {
      myself.unbind(eventStr, id);
    };

    parent.isBound = function (eventStr) {
      myself.isBound(eventStr);
    };
  }

  this.bind = function (event, callback) {
    var list = myself.getList(event);
    list.push(callback);

    myself.eventlist[event] = list;

    return list.length - 1;
  };

  this.unbind = function (event, id) {
    var list = myself.getList(event);

    if (id === undefined) { // Thrash the whole list
      list = undefined;
    } else if (list.length > id) {
      list[id] = undefined;
    }

    myself.eventlist[event] = list;
  };

  this.isBound = function (event) {
    return myself.eventlist[event] !== undefined && myself.eventlist[event].length > 0;
  };

  this.raise = function (event, data) {
    if (myself.eventlist[event] !== undefined) {
      var length = myself.eventlist[event].length;
      var i = 0;
      while (i < length && myself.eventlist[event] !== undefined) {
        var callback = myself.eventlist[event][i];
        if (callback !== undefined) {
          callback(data);
        }
        i++;
      }
    }
  };

  this.raiseError = function(code, message, customError) {
    if(customError !== undefined && myself.eventlist[customError] !== undefined) {
      myself.eventlist[customError].forEach(function(callback) {
        if(callback != undefined) {
          callback(code, message);
        }
      });
    } else {
      if(myself.eventlist[myself.ERROR_EVENT] !== undefined) {
        //var data = {'error': code, 'message': message};
        myself.eventlist[myself.ERROR_EVENT].forEach(function(callback) {
          if(callback !== undefined) {
            callback(code, message);
          }
        });
      }
    }
  };

  this.getList = function(event) {
    if(myself.eventlist[event] === undefined) {
      myself.eventlist[event] = [];
    }

    return myself.eventlist[event];
  };
}