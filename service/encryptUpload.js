import {SS_API} from "../constants/api";
import {call} from "./index";
import {_slice} from "../common/utils";



export async function createFile(packageId, fileUri, fileInfo) {
  console.log("*** createFile ***");
  const path = SS_API.PATH.CREATE_FILE
    .replace("{packageId}", packageId);
  // const fileInfo = await FileSystem.getInfoAsync(fileUri);
  console.log(fileInfo);
  let index = fileInfo.uri.lastIndexOf('.');
  let codex = fileInfo.uri.substring(index, fileInfo.uri.length);
  return call(
    'PUT',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      filename: encodeURI(`SnapSafely${codex}`),
      uploadType: "JS_API",
      parts: 1,
      filesize: fileInfo.size
    })
  );
}

const uploadPart = (statusCb, finished) => {
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

