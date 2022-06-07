import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Modal,
  KeyboardAvoidingView
} from 'react-native';
import {Camera} from 'expo-camera';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';
import * as MediaLibrary from "expo-media-library";
import {Block} from "galio-framework";
import {Button, Icon, Input} from "./index";
import {argonTheme} from "../constants";
import {_slice, createKeycode, isEmptyObject, isSuccessResponse, urlSafeBase64} from "../common/utils";
import {useFocusEffect} from "@react-navigation/native";
import {
  createFile,
  addRecipient,
  createPackage,
  deleteRecipient,
  deletePackage,
  uploadUrls,
  finalizePackage, addMessage
} from "../service/index";
import * as FileSystem from "expo-file-system";
import {Video} from "expo-av";
import {encryptAndUploadFiles} from "../service/ssEncyptUpload";
import sjcl from "../common/external/sjcl";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const closeButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const saveButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const actionButton = Math.floor(WINDOW_HEIGHT * 0.05);
const addRecipientButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const sendButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const captureSize = Math.floor(WINDOW_HEIGHT * 0.09);
const SEGMENT_SIZE = 2621440;
const MAX_CONCURRENT_ENCRYPTIONS = 2;
const SERVER_WORKER_URI = '../common/external/sjcl';

const initialState = {
  hasCameraPermission: null,
  hasSavePermission: null,
  cameraType: Camera.Constants.Type.back,
  isPreview: false,
  isCameraReady: false,
  isVideoRecording: false,
  source: null,
  videoSource: null,
  fileInfo: null,
  addRecipientModalVisible: false,
  addMessageModalVisible: false,
  deleteRecipientModalVisible: false,
  ssPackage: null,
  isFinalized: false,
  ssFile: null,
  recipientEmail: null,
  message: null,
  recipients: [],
  notification: {},
  // Upload
  progressTracker: {},
  encrypting: [],
  segmentsCurrentlyEncrypting: 0,
  workerPool: [],
  entropyState: null,
  entropyPercent: 0,
  keyCode: null
};

export default class CameraComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...initialState,
      cameraRef: React.createRef(),
    }
  }

  clearState = () => {
    this.setState(prevState => ({ ...initialState, cameraRef: this.state.cameraRef}));
  };

  notify = (message, type) => {
    this.setState(prevState => ({notification: {...prevState.notification, message: message, type: type}}));
    setTimeout(() =>
        this.setState({notification: {}}),
      3000);
  }

  async componentDidMount() {
    console.log("*** Mounting Camera Component ***");
    const camera = await Camera.requestCameraPermissionsAsync();
    console.log("*** Camera Permission ***");
    console.log(camera);
    this.setState({hasCameraPermission: camera.status === 'granted'});
    const save = await MediaLibrary.requestPermissionsAsync();
    console.log("*** Save Permission ***");
    console.log(save);
    this.setState({hasSavePermission: save.status === 'granted'});

    useFocusEffect(
      useCallback(() => {
        console.log("*** Camera Component Focused ***");
        return () => {
          console.log("*** Camera Component Unfocused ***");
          if (this.state.ssPackage && !this.state.isFinalized) {
            console.log("Deleting temp package");
            this.deleteRecipientAction(this.state.ssPackage.packageId);
          }
          this.clearState();
        };
      }, [])
    );
  }
  
  componentWillUnmount() {
    console.log("*** componentWillUnmount  ***")
    if (this.state.ssPackage && !this.state.isFinalized) {
      console.log("Deleting temp package");
      this.deleteRecipientAction(this.state.ssPackage.packageId);
    }
    this.clearState();
  }

  getKeyCodeAction = () => {
    console.log("*** getKeyCodeAction ***");
    createKeycode((keyCode) => {
      console.log("*** createKeycode ***");
      console.log(keyCode);
      this.setState({keyCode: keyCode});
    })
  }

  onCameraReady = () => {
    console.log("*** onCameraReady ***")
    this.setState({isCameraReady: true});
  };

  takePicture = async () => {
    console.log("*** takePicture ***")
    const {cameraRef} = this.state;
    if (cameraRef.current) {
      const options = {quality: 0.5, base64: true, skipProcessing: true};
      const data = await cameraRef.current.takePictureAsync(options);
      const source = data.uri;
      if (source) {
        await cameraRef.current.pausePreview();
        const fileInfo = await FileSystem.getInfoAsync(source);
        this.setState({isPreview: true, source, fileInfo});
        console.log("picture source", source);
      }
    }
  };

  recordVideo = async () => {
    if (this.state.cameraRef.current) {
      try {
        const videoRecordPromise = this.state.cameraRef.current.recordAsync();
        if (videoRecordPromise) {
          this.setState({isVideoRecording: true})
          const data = await videoRecordPromise;
          const source = data.uri;
          if (source) {
            this.setState({isPreview: true})
            console.log("video source", source);
            this.setState({videoSource: source});
          }
        }
      } catch (error) {
        console.warn(error);
      }
    }
  };

  stopVideoRecording = () => {
    if (this.state.cameraRef.current) {
      this.setState({isPreview: false});
      this.setState({isVideoRecording: false});
      this.state.cameraRef.current.stopRecording();
    }
  };

  switchCamera = () => {
    if (this.state.isPreview) {
      return;
    }
    this.setState({cameraType: this.state.cameraType === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back});
  };

  cancelPreview = async () => {
    console.log("*** cancelPreview ***");
    await this.state.cameraRef.current.resumePreview();
    this.setState({isPreview: false});
    this.setState({videoSource: null});
    if (this.state.ssPackage && !this.state.isFinalized) {
      return this.deletePackageAction(this.state.ssPackage.packageId);
    }
    this.clearState();
  };

  renderCancelPreviewButton = () => (
    <TouchableOpacity onPress={this.cancelPreview} style={styles.closeButton}>
      <View style={[styles.closeCross, {transform: [{rotate: "45deg"}]}]}/>
      <View style={[styles.closeCross, {transform: [{rotate: "-45deg"}]}]}/>
    </TouchableOpacity>
  );

  savePreview = async () => {
    if (this.state.source) {
      console.log("*** savePreview ***");
      const asset = await MediaLibrary.createAssetAsync(this.state.source);
      console.log(asset)
    }
  }

  renderSavePreviewButton = () => (
    <TouchableOpacity onPress={this.savePreview} style={styles.saveButton}>
      <Text>{"Save"}</Text>
    </TouchableOpacity>
  );

  createFileAction = async (packageId, uri) => {
    console.log("*** createFileAction ***");
    const res = await createFile(packageId, uri, this.state.fileInfo).catch(err => console.log(err));
    let file = res.data;
    console.log(file);
    if (isSuccessResponse(file)) {
      // this.uploadEncryptedFileAction(file);
      this.setState({ssFile: file});
      // this.notify("Successfully created package and added file", 'success');
    } else {
      console.log(file.response);
      console.log(file.message);
      this.notify(file.message, 'error');
    }
  }
  
  /*** Upload S3 methods ***/
  uploadEncryptedFileAction = (file) => {
    this.state.progressTracker[file.message] = {};
    this.state.progressTracker[file.message].totalSize = file.size;
    this.state.progressTracker[file.message].parts = {};
    file.part = 0;
    file.id = file.message;
    if(file.url === undefined ) {
      //Add to encrypting Queue
      let filename = (file.name === undefined) ? "SnapSafely" : file.name;
      this.state.encrypting.push({
        "packageId": packageId,
        "file": file,
        "parts": 1,
        "part": 1,
        "name": filename,
        "fileStart": 0,
        "id": file.message
      })
      if (this.state.encrypting.length === 1) {
        this.uploadPart();
      }
    } else {
      this.loadBlobFromUrl(packageId, file, 1, () => {
        this.uploadPart();
      });
    }
  }

  uploadPart = (finished) => {
    console.log("*** uploadPart ***");
    if(this.state.encrypting.length >= 1){
      let currentFile = this.state.encrypting[0];
      while(this.state.segmentsCurrentlyEncrypting < MAX_CONCURRENT_ENCRYPTIONS) {
        const fileObj = {};
        if(currentFile.part === 1){
          fileObj.fileSegment = _slice(currentFile.file, 0, Math.min((this.state.SEGMENT_SIZE/4), currentFile.file.size));;
          fileObj.id = currentFile.id;
          fileObj.part = currentFile.part;
          fileObj.parts = currentFile.parts;
          fileObj.name = currentFile.name;
          this.state.encrypting[0].fileStart = Math.min(this.state.SEGMENT_SIZE/4, this.state.encrypting[0].file.size);
        } else if(currentFile.part <= currentFile.parts){
          fileObj.fileSegment = _slice(currentFile.file, currentFile.fileStart, Math.min(currentFile.fileStart+(this.state.SEGMENT_SIZE), currentFile.file.size));;
          fileObj.id = currentFile.id;
          fileObj.part = currentFile.part;
          fileObj.parts = currentFile.parts;
          fileObj.name = currentFile.name;
          this.state.encrypting[0].fileStart = Math.min(this.state.encrypting[0].fileStart+(this.state.SEGMENT_SIZE), this.state.encrypting[0].file.size);
        } else{
          //Finished last
          this.state.encrypting.shift();
          return this.uploadPart();
        }
        this.state.encrypting[0].part++;
        this.setState({segmentsCurrentlyEncrypting: this.state.segmentsCurrentlyEncrypting+=1})
        let packageId = currentFile.packageId;
        this.sendFileToWorker(fileObj, packageId, currentFile.file.size, 
          (event) => {
          console.log(event);
          this.uploadPart();
          }, (event) => {
            console.log(event);
          }, (event) => {
            console.log(event);
          });
      }
    }
  };

  loadBlobFromUrl = (packageId, file, parts, uploadCb) => {
    const xhr = new XMLHttpRequest();
    let url = file.url;
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (this.status === 200) {
        // Convert to ArrayBufferView
        let formattedResponse = new Uint8Array(this.response);
        let blob = new Blob([formattedResponse], {type: 'application/octet-stream'});
        blob.part = file.part;
        blob.id = file.id;
        blob.name = file.name;
        let filename = (file.name === undefined) ? "Unknown File" : file.name;
        //Add to encrypting Queue
        this.state.encrypting.push({"packageId": packageId, "file":blob, "name": filename, "parts": parts, "part": 1, "fileStart": 0, "id": blob.id});
        if(this.state.encrypting.length === 1){
          //Start Uploading files
          uploadCb();
        }
      } else {
        this.state.eventHandler.raiseError('BLOB_ERROR', 'Failed to load blob');
      }
    };
    xhr.send();
  };

  sendFileToWorker = (fileObject, packageId, fileSize, nextCb, statusCb, finished) => {
    var key = this.state.ssPackage;
    function postStartMessage(worker) {
      var randomness = sjcl.codec.utf8String.fromBits(sjcl.random.randomWords(16,6));
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
        'SEGMENT_SIZE': SEGMENT_SIZE,
        'id': worker.id,
        'boundary': '------JSAPIFormDataBoundary' + Math.random().toString(36)
      });
    }

    function sendWorkerFile(worker, progressCb) {
      if(sjcl.random.isReady(6) === 0) {
        sjcl.random.addEventListener("seeded", function () {
          postStartMessage(worker);
        });
        sjcl.random.addEventListener("progress", function(evt) {
          progressCb(evt)
        });
      } else {
        postStartMessage(worker);
      }
    }

    function moveToNextWhenReady(uploading) {
      if (uploading.length > 5) {
        window.setTimeout(function() {moveToNextWhenReady()}, 3000);
      } else {
        nextCb();
      }
    }

    const worker = this.getWorker(statusCb, 
      (state, data) => {
      switch (state) {
        case 'FILE_UPLOADING':
          this.setState({segmentsCurrentlyEncrypting: this.state.segmentsCurrentlyEncrypting-=1})
          this.markWorkerAsAvailable(data.id);
          moveToNextWhenReady(this.state.uploading);
          let messageData = {};
          messageData["fileId"] = data.fileId;
          messageData["uploadType"] = "JS_API";
          messageData["filePart"] = data.part;
          // Check if the part is marked for deletion before actually pushing it.
          if(this.state.markedAsDeleted[data.fileId] !== undefined) {
            // Marked as deleted, do nothing
          } else {
            this.state.uploading.push({"packageId": data.packageId, "boundary": data.boundary, "name": data.name, "messageData": messageData, "file":data, "in_progressCb": function(jqXHR) {
              statusCb({data, jqXHR}); // console.log({progress: { id: data.fileId, percent: calculateProgress(data.fileId, data.part, jqXHR.loaded)}});
              }});
          }
          break;
        default:
          console.log(state);
          console.log(data);
      }
      });
    sendWorkerFile(worker, (evt) => {
      let entropyPercent = 0;
      if(evt !== undefined && evt !== 1 && !isNaN(evt)) {
        entropyPercent = (evt*100);
        this.setState({entropyState: "PROGRESS", entropyPercent})
      } else {
        this.setState({entropyState: "READY", entropyPercent: 0})
      }
    });
  };

  calculateProgress = (fileId, currentPart, uploadedBytes) => {
    let partArray = this.state.progressTracker[fileId].parts;
    partArray[currentPart] = uploadedBytes;
    let totalSize = this.state.progressTracker[fileId].totalSize;
    let uploadedSoFar = 0;
    for (let part in partArray) {
      uploadedSoFar += partArray[part];
    }
    return Math.min(100, (uploadedSoFar/totalSize) * 100);
  }

  markWorkerAsAvailable = (id) => {
    for(let i = 0; i<this.state.workerPool.length; i++) {
      if(this.state.workerPool[i].id === id) {
        this.state.workerPool[i].available = true;
        return;
      }
    }
  };

  getWorker = (nextCb, stateUpdate) => {
    for (let i = 0; i < this.state.workerPool.length; i++) {
      if (this.state.workerPool[i].available) {
        this.state.workerPool[i].available = false;
        return this.state.workerPool[i];
      }
    }
    
    let worker = new Worker(SERVER_WORKER_URI);
    this.state.workerPool.push({'available': false, 'id': this.state.workerPool.length, 'worker': worker});
    worker.addEventListener('message', function(e) {
      const data = e.data;
      switch (data.cmd) {
        case 'state':
          console.log(data.state, {id: data.fileId, part:data.part, size: data.filesize});
          break;
        case 'fatal':
          console.log({error: data.msg, message: data.debug});
          break;
        case 'randBuff':
          worker.postMessage({'cmd': 'randBuff', 'iv': sjcl.codec.utf8String.fromBits(sjcl.random.randomWords(64,6))});
          break;
        case 'upload':
          stateUpdate("FILE_UPLOADING", {id: data.fileId, part:data.part});
          break;
      }
    }, false);
    return this.state.workerPool[this.state.workerPool.length-1];
  }
  /*** Upload S3 methods ***/

  createPackageAction = async () => {
    console.log("*** createPackageAction ***");
    const res = await createPackage().catch(err => console.log(err));
    console.log(res)
    let pkg = res.data;
    console.log(pkg);
    if (isSuccessResponse(pkg)) {
      this.setState({ssPackage: pkg});
      this.notify("Successfully Created Package", 'success');
      return this.createFileAction(pkg.packageId, this.state.source);
    } else {
      this.notify(pkg.message, 'error');
    }
  }

  deletePackageAction = async () => {
    console.log("*** deletePackageAction ***");
    if (this.state.ssPackage) {
      const res = await deletePackage(this.state.ssPackage.packageId).catch(err => console.log(err));
      let pkg = res.data;
      console.log(pkg);
      if (isSuccessResponse(pkg)) {
        this.setState({ssPackage: null});
        this.notify("Successfully deleted package", 'success');
      } else {
        this.notify(pkg.message, 'error');
      }
    }
  }

  renderPackageButtons = () => (
    <View style={styles.control}>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!this.state.isCameraReady}
        onPress={this.createPackageAction}
        style={styles.createButton}>
        <Text style={styles.text}>{"Create"}</Text>
      </TouchableOpacity>
    </View>
  )

  showAddRecipientModal = () => {
    console.log("*** showAddRecipient ***");
    this.setState({addRecipientModalVisible: true});
  }

  addRecipientAction = async () => {
    if (this.state.recipientEmail) {
      console.log("*** addRecipient ***");
      const res = await addRecipient(this.state.recipientEmail, this.state.ssPackage.packageId).catch(err => console.log(err));
      const recipient = res.data;
      console.log(recipient);
      if (isSuccessResponse(recipient)) {
        this.state.recipients.push(recipient);
        console.log(this.state.recipients);
        this.notify("Successfully Added Recipient", 'success');
      } else {
        this.notify(recipient.message, 'error');
      }
      this.setState({addRecipientModalVisible: false, recipientEmail: null});
    } else {
      this.notify("Please enter a valid email", 'error');
    }
  }

  deleteRecipientAction = async () => {
    console.log("*** deleteRecipient ***");
    const {ssPackage, recipients } = this.state;
    const r = recipients.pop();
    const res = await deleteRecipient(ssPackage.packageId, r).catch(err => console.log(err))
    const recipient = res.data;
    console.log(recipient);
    if (isSuccessResponse(recipient)) {
      this.notify(`Successfully removed recipient ${r.email}`, 'success');
    } else {
      recipients.push(r);
      this.notify(recipient.message, 'success');
    }
  }
  
  addMessageAction = async () => {
    if (this.state.message) {
      console.log("*** addMessageAction ***");
      const res = await addMessage(this.state.ssPackage.packageId, this.state.message).catch(err => console.log(err));
      const message = res.data;
      console.log(message);
      if (isSuccessResponse(message)) {
        this.setState({message: message});
        console.log(this.state.message);
        this.notify("Successfully Added Message", 'success');
      } else {
        this.notify(message.message, 'error');
      }
      this.setState({addMessageModalVisible: false, message: null});
    } else {
      this.notify("Please enter a message", 'error');
    }
  }

  showAddMessageModal = () => {
    console.log("*** showAddMessageModal ***");
    this.setState({addMessageModalVisible: true});
  }
  
  renderMessageButton = () => (
    <TouchableOpacity onPress={this.showAddMessageModal} style={styles.addMessageButton}>
      <Text>{"T"}</Text>
    </TouchableOpacity>
  )
  

  renderRecipientButtons = () => (
    <View style={styles.control}>
      {(this.state.ssPackage && this.state.recipients.length > 0) &&
      <TouchableOpacity style={styles.actionButton} disabled={!this.state.isCameraReady}
                        onPress={this.deleteRecipientAction}>
        <Text style={styles.text}>{"Delete"}</Text>
      </TouchableOpacity>}
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!this.state.isCameraReady}
        onPress={this.showAddRecipientModal}
        style={styles.addRecipientButton}>
        <Text style={styles.text}>{"Add"}</Text>
      </TouchableOpacity>
    </View>
  );

  finalizePackageAction = async () => {
    console.log("*** finalizePackageSend ***");
    const {ssPackage, keyCode} = this.state;
    console.log(ssPackage);
    const res = await finalizePackage(ssPackage, keyCode).catch(err => console.log(err));
    const finalize = res.data;
    console.log(finalize);
    if (isSuccessResponse(finalize)) {
      this.notify(`Encryption applied`, 'success');
      this.setState({isFinalized: true});
      return finalize;
    } else {
      this.parent.notify(finalize.message, 'success');
      return finalize;
    }
  }
  
  handlerSmsSend = async () => {
    if (await SMS.isAvailableAsync()) {
      console.log("*** SMS Available ***");
      let finalize;
      if (!this.state.isFinalized) {
        finalize = await this.finalizePackageAction();
        this.setState({finalize: finalize});
        console.log(finalize);
      } else {
        finalize = this.state.finalize;
      }
      const { result } = await SMS.sendSMSAsync(
        [],
        `SnapSafely Package! ${finalize.message}#keyCode=${this.state.keyCode}`
      );
      console.log(result);
    } else {
      console.log("*** SMS Not Available ***");
    }
  }

  handlerEmailSend = async () => {
    if (await MailComposer.isAvailableAsync()) {
      console.log("*** Email Available ***");
      let finalize;
      if (!this.state.isFinalized) {
        finalize = await this.finalizePackageAction();
        this.setState({finalize: finalize});
        console.log(finalize);
      } else {
        finalize = this.state.finalize;
      }
      let recipientArr = this.state.recipients.map(i => i.email);
      const { result } = await MailComposer.composeAsync(
        {
          subject: "SnapSafely Package!",
          recipients: recipientArr,
          body: `${finalize.message}#keyCode=${this.state.keyCode}`
        }
      );
      console.log(result);
    } else {
      console.log("*** Email Not Available ***");
    }
  }

  renderSendEmailButton = () => (
    <TouchableOpacity onPress={this.handlerEmailSend} style={styles.sendEmailButton}>
      <Text>{"Email"}</Text>
    </TouchableOpacity>
  );

  renderSendSMSButton = () => (
    <TouchableOpacity onPress={this.handlerSmsSend} style={styles.sendSmsButton}>
      <Text>{"Text"}</Text>
    </TouchableOpacity>
  );

  renderVideoPlayer = () => (
    <Video source={{uri: this.state.videoSource}} shouldPlay={true} style={styles.media}/>
  );
  renderVideoRecordIndicator = () => (
    <View style={styles.recordIndicatorContainer}>
      <View style={styles.recordDot}/>
      <Text style={styles.recordTitle}>{"Recording..."}</Text>
    </View>
  );

  renderCaptureControl = () => (
    <View style={styles.control}>
      <TouchableOpacity style={styles.actionButton} disabled={!this.state.isCameraReady} onPress={this.switchCamera}>
        <Text style={styles.text}>{"Flip"}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!this.state.isCameraReady}
        onLongPress={this.recordVideo}
        onPressOut={this.stopVideoRecording}
        onPress={this.takePicture}
        style={styles.capture}
      />
    </View>
  );

  render() {
    const {
      hasCameraPermission, hasSavePermission, cameraType, addRecipientModalVisible, addMessageModalVisible, message,
      deleteRecipientModalVisible, isCameraReady, recipientEmail, source, cameraRef,
      ssFile, isPreview, notification, recipients, ssPackage, isVideoRecording, videoSource
    } = this.state;

    if (hasCameraPermission === null) {
      return (<View/>);
    }

    if (hasCameraPermission === false) {
      return (<Text>No access to camera</Text>);
    }

    return (
      <SafeAreaView style={styles.container}>
        <Camera ref={cameraRef} style={styles.container} type={cameraType} flashMode={Camera.Constants.FlashMode.on}
                onCameraReady={this.onCameraReady}
                onMountError={(error) => {
                  console.log("cammera error", error)
                }}/>
        <View style={styles.container}>
          {!isEmptyObject(notification) && <Block center>
            <Button disabled color={notification.type} style={styles.button}>
              {notification.message}
            </Button>
          </Block>}
          {isVideoRecording && this.renderVideoRecordIndicator()}
          {videoSource && this.renderVideoPlayer()}
          {isPreview && this.renderCancelPreviewButton()}
          {(isPreview && hasSavePermission) && this.renderSavePreviewButton()}
          {(isPreview && !ssPackage) && this.renderPackageButtons()}
          {(isPreview && ssPackage) && this.renderRecipientButtons()}
          {(isPreview && ssPackage) && this.renderMessageButton()}
          {(isPreview && recipients.length > 0) && this.renderSendSMSButton()}
          {(isPreview && recipients.length > 0) && this.renderSendEmailButton()}
          {(!videoSource && !isPreview) && this.renderCaptureControl()}
          {!isPreview && this.renderCaptureControl()}
        </View>
        <Modal animationType="slide" transparent={true} visible={addRecipientModalVisible}
               onRequestClose={() => {
                 Alert.alert("Modal has been closed.");
                 this.setState({addRecipientModalVisible: !addRecipientModalVisible});
               }}>
          <View style={styles.modalCenteredView}>
            <View style={styles.modalView}>
              <TouchableOpacity onPress={() => this.setState({addRecipientModalVisible: false})}
                                style={styles.closeModalButton}>
                <View style={[styles.closeCross, {transform: [{rotate: "45deg"}]}]}/>
                <View style={[styles.closeCross, {transform: [{rotate: "-45deg"}]}]}/>
              </TouchableOpacity>
              <Text style={styles.modalText}>Add Recipient</Text>
              <Block center>
                <Block middle style={{marginLeft: 15, marginRight: 15}}>
                  <Input placeholder="Email" onChangeText={(val) => this.setState({recipientEmail: val})}
                         value={recipientEmail}/>
                </Block>
                <Block middle>
                  <Button color="primary" onPress={this.addRecipientAction} style={styles.createButton}>
                    <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                      ADD
                    </Text>
                  </Button>
                </Block>
              </Block>
            </View>
          </View>
        </Modal>
        <Modal animationType="slide" transparent={true} visible={addMessageModalVisible}
               onRequestClose={() => {
                 Alert.alert("Modal has been closed.");
                 this.setState({addMessageModalVisible: !addMessageModalVisible});
               }}>
          <View style={styles.modalCenteredView}>
            <View style={styles.modalView}>
              <TouchableOpacity onPress={() => this.setState({addMessageModalVisible: false})}
                                style={styles.closeModalButton}>
                <View style={[styles.closeCross, {transform: [{rotate: "45deg"}]}]}/>
                <View style={[styles.closeCross, {transform: [{rotate: "-45deg"}]}]}/>
              </TouchableOpacity>
              <Text style={styles.modalText}>Add Message</Text>
              <Block center>
                <Block middle style={{marginLeft: 15, marginRight: 15}}>
                  <Input placeholder="Email" onChangeText={(val) => this.setState({message: val})}
                         value={message}/>
                </Block>
                <Block middle>
                  <Button color="primary" onPress={this.addMessageAction} style={styles.createButton}>
                    <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                      ADD
                    </Text>
                  </Button>
                </Block>
              </Block>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: "absolute",
    top: 15,
    left: 15,
    height: closeButtonSize,
    width: closeButtonSize,
    borderRadius: Math.floor(closeButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    opacity: 0.7,
    zIndex: 2,
  },
  addMessageButton: {
    position: "absolute",
    top: 15,
    right: 15,
    height: closeButtonSize,
    width: closeButtonSize,
    borderRadius: Math.floor(closeButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    opacity: 0.7,
    zIndex: 2,
  },
  saveButton: {
    position: "absolute",
    bottom: 15,
    left: 15,
    height: saveButtonSize,
    width: saveButtonSize,
    borderRadius: Math.floor(saveButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  closeModalButton: {
    position: "absolute",
    top: 15,
    right: 15,
    height: addRecipientButtonSize,
    width: addRecipientButtonSize,
    borderRadius: Math.floor(addRecipientButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  createButton: {
    // borderRadius: 5,
    height: captureSize,
    width: captureSize,
    borderRadius: Math.floor(captureSize / 2),
    marginHorizontal: 31,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  deleteButton: {
    position: "absolute",
    flexDirection: "row",
    bottom: 38,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c4c5c4",
    borderRadius: Math.floor(captureSize / 2),
  },
  addRecipientButton: {
    height: captureSize,
    width: captureSize,
    borderRadius: Math.floor(captureSize / 2),
    marginHorizontal: 31,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  sendSmsButton: {
    position: "absolute",
    bottom: 15,
    right: 15,
    height: sendButtonSize,
    width: sendButtonSize,
    borderRadius: Math.floor(sendButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  sendEmailButton: {
    position: "absolute",
    bottom: 70,
    right: 15,
    height: sendButtonSize,
    width: sendButtonSize,
    borderRadius: Math.floor(sendButtonSize / 2),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c4c5c4",
    color: "black",
    opacity: 0.7,
    zIndex: 2,
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
  closeCross: {
    width: "68%",
    height: 1,
    backgroundColor: "black",
  },
  actionButton: {
    backgroundColor: "#c4c5c4",
    borderRadius: Math.floor(actionButton / 2),
    height: actionButton,
    width: actionButton,
    justifyContent: "center",
    alignItems: "center",
  },
  control: {
    position: "absolute",
    flexDirection: "row",
    bottom: 38,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  capture: {
    backgroundColor: "#f5f6f5",
    // borderRadius: 5,
    height: captureSize,
    width: captureSize,
    borderRadius: Math.floor(captureSize / 2),
    marginHorizontal: 31,
  },
  recordIndicatorContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 25,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    opacity: 0.7,
  },
  recordTitle: {
    fontSize: 14,
    color: "#ffffff",
    textAlign: "center",
  },
  recordDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
    backgroundColor: "#ff0000",
    marginHorizontal: 5,
  },
  text: {
    color: "black",
  },
  modalCenteredView: {
    position: 'relative',
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalButton: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  modalButtonClose: {
    backgroundColor: "#2196F3",
  },
  modalTextStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center"
  }
});