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
import * as MediaLibrary from "expo-media-library";
import {Block} from "galio-framework";
import {Button, Icon, Input} from "./index";
import {argonTheme} from "../constants";
import {isSuccessResponse} from "../common/utils";
import {useFocusEffect} from "@react-navigation/native";
import {createFile, addRecipient, createPackage, deleteRecipient} from "../service/index";
import * as FileSystem from "expo-file-system";
import {Video} from "expo-av";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const closeButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const saveButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const actionButton = Math.floor(WINDOW_HEIGHT * 0.05);
const addRecipientButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const sendButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const captureSize = Math.floor(WINDOW_HEIGHT * 0.09);

export default class CameraComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
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
      deleteRecipientModalVisible: false,
      ssPackage: null,
      file: null,
      recipientEmail: null,
      recipients: [],
      notification: {},
      cameraRef: React.createRef()
    }
  }

  notify = (message, type) => {
    this.setState(prevState => ({notification: {...prevState.notification, message: message, type: type}}));
    setTimeout(() =>
        this.setState(prevState => ({notification: {...prevState.notification, message: message, type: type}})),
      2000);
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
        // Do something when the screen is focused/mount
        console.log("*** Camera Component Focused ***");

        return () => {
          console.log("*** Camera Component Unfocused ***");
          // Do something when the screen is unfocused/unmount
          // Useful for cleanup functions
          // TODO: if package is not finalized/sent 
          //  -> delete the temp package
          //  -> delete state vaiables
        };
      }, [])
    );
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
      this.setState({file: file});
      this.notify("Successfully Added File", 'success');
    } else {
      this.notify(file.message, 'error');
    }
  }

  createPackageAction = async () => {
    console.log("*** createPackageAction ***");
    const res = await createPackage().catch(err => console.log(err));
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

  deletePackageAction = () => {
    console.log("*** deletePackageAction ***");
    if (this.state.ssPackage) {

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

  showDeleteRecipientModal = () => {
    console.log("*** showDeleteRecipient ***");
    this.setState({deleteRecipientModalVisible: true});
  }

  addRecipientAction = async () => {
    console.log("*** addRecipient ***");
    const res = await addRecipient(this.state.recipientEmail, this.state.ssPackage.packageId).catch(err => console.log(err));
    const recipient = res.data;
    console.log(recipient);
    if (isSuccessResponse(recipient)) {
      this.setState({addRecipientModalVisible: false});
      this.notify("Successfully Added Recipient", 'success');
    } else {
      this.notify(recipient.message, 'error');
    }
  }

  deleteRecipientAction = async () => {
    console.log("*** deleteRecipient ***");
    const res = await deleteRecipient().catch(err => console.log(err))
    const recipient = res.data;
    console.log(recipient);
    if (isSuccessResponse(recipient)) {
      this.notify("Successfully Removed Recipient", 'success');
    } else {
      this.notify(recipient.message, 'success');
    }
  }

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

  }

  renderSendPreviewButton = () => (
    <TouchableOpacity onPress={this.finalizePackageAction} style={styles.sendButton}>
      <Text>{"Send"}</Text>
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
      hasCameraPermission, hasSavePermission, cameraType, addRecipientModalVisible,
      deleteRecipientModalVisible, isCameraReady, recipientEmail, source, cameraRef,
      file, isPreview, notification, recipients, ssPackage, isVideoRecording, videoSource
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
          {isVideoRecording && this.renderVideoRecordIndicator()}
          {videoSource && this.renderVideoPlayer()}
          {isPreview && this.renderCancelPreviewButton()}
          {(isPreview && hasSavePermission) && this.renderSavePreviewButton()}
          {(isPreview && !ssPackage) && this.renderPackageButtons()}
          {(isPreview && ssPackage) && this.renderRecipientButtons()}
          {isPreview && this.renderSendPreviewButton()}
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
  sendButton: {
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