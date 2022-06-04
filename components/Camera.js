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
import { Camera } from 'expo-camera';
import * as MediaLibrary from "expo-media-library";
import {Block} from "galio-framework";
import {Button, Icon, Input} from "./index";
import {argonTheme} from "../constants";
import {isSuccessResponse} from "../common/utils";
import {useFocusEffect} from "@react-navigation/native";
import {createPackage, addFile, addRecipient} from "../service/package";
// import { packageService} from "../service";
// import { Video } from "expo-av";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const closeButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const saveButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const actionButton = Math.floor(WINDOW_HEIGHT * 0.05);
const addRecipientButtonSize = Math.floor(WINDOW_HEIGHT * 0.032);
const sendButtonSize = Math.floor(WINDOW_HEIGHT * 0.05);
const captureSize = Math.floor(WINDOW_HEIGHT * 0.09);

export default function CameraComponent() {
    const [hasCameraPermission, setHasCameraPermission] = useState(null);
    const [hasSavePermission, setHasSavePermission] = useState(null);
    const [type, setType] = useState(Camera.Constants.Type.back);
    const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
    const [isPreview, setIsPreview] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [source, setSource] = useState(null);
    const [addRecipientModalVisible, setAddRecipientModalVisible] = useState(false);
    const [deleteRecipientModalVisible, setDeleteRecipientModalVisible] = useState(false);
    const [ssPackage, setSSPackage] = useState(null);
    const [file, setFile] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState(null);
    const [recipients, setRecipients] = useState([]);
    const [notification, setNotification] = useState({});
    // const [isVideoRecording, setIsVideoRecording] = useState(false);
    // const [videoSource, setVideoSource] = useState(null);
    const cameraRef = useRef();

    const notify = (message, type) => {
        setNotification(prevState => ({notification: {...prevState.notification, message: message, type: type}}));
        setTimeout(() =>
            setNotification(prevState => ({notification: {...prevState.notification, message: message, type: type}})),
          2000);
    }

    useEffect(() => {
        (async () => {
            console.log("*** Mounting Camera Component ***");
            const camera = await Camera.requestCameraPermissionsAsync();
            console.log("*** Camera Permission ***");
            console.log(camera);
            setHasCameraPermission(camera.status === 'granted');
            const save = await MediaLibrary.requestPermissionsAsync();
            console.log("*** Save Permission ***");
            console.log(save);
            setHasSavePermission(save.status === 'granted');
        })();
    }, []);

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

    const onCameraReady = () => {
        setIsCameraReady(true);
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            const options = { quality: 0.5, base64: true, skipProcessing: true };
            const data = await cameraRef.current.takePictureAsync(options);
            const source = data.uri;
            if (source) {
                await cameraRef.current.pausePreview();
                setIsPreview(true);
                setSource(source);
                console.log("picture source", source);
            }
        }
    };

    // const recordVideo = async () => {
    //     if (cameraRef.current) {
    //         try {
    //             const videoRecordPromise = cameraRef.current.recordAsync();
    //             if (videoRecordPromise) {
    //                 setIsVideoRecording(true);
    //                 const data = await videoRecordPromise;
    //                 const source = data.uri;
    //                 if (source) {
    //                     setIsPreview(true);
    //                     console.log("video source", source);
    //                     setVideoSource(source);
    //                 }
    //             }
    //         } catch (error) {
    //             console.warn(error);
    //         }
    //     }
    // };
    // const stopVideoRecording = () => {
    //     if (cameraRef.current) {
    //         setIsPreview(false);
    //         setIsVideoRecording(false);
    //         cameraRef.current.stopRecording();
    //     }
    // };

    const switchCamera = () => {
        if (isPreview) {
            return;
        }
        setCameraType((prevCameraType) =>
          prevCameraType === Camera.Constants.Type.back
            ? Camera.Constants.Type.front
            : Camera.Constants.Type.back
        );
    };

    const cancelPreview = async () => {
        await cameraRef.current.resumePreview();
        setIsPreview(false);
        // setVideoSource(null);
    };

    const renderCancelPreviewButton = () => (
      <TouchableOpacity onPress={cancelPreview} style={styles.closeButton}>
          <View style={[styles.closeCross, { transform: [{ rotate: "45deg" }] }]} />
          <View style={[styles.closeCross, { transform: [{ rotate: "-45deg" }] }]}/>
      </TouchableOpacity>
    );
    
    const savePreview = async () => {
        if (source) {
            console.log("*** savePreview ***")
            console.log(source)
            const asset = await MediaLibrary.createAssetAsync(source);
            console.log(asset)
        }
    }
    
    const renderSavePreviewButton = () => (
        <TouchableOpacity onPress={savePreview} style={styles.saveButton}>
            <Text>{"Save"}</Text>
        </TouchableOpacity>
    );
    
    const createFileAction = (packageId, uri) => {
        addFile(packageId, uri).then(res => {
            let file = res.data;
            if (isSuccessResponse(file)) {
                console.log(file);
                setFile(file);
                notify("Successfully Added File", 'success');
            } else {
                notify(file.message, 'error');
            }
        }).catch(err => {
            console.log("createFileAction Error", err);
            notify("Error occurred while trying to add file", 'error');
        });
    }
    
    const createPackageAction = () => {
        console.log("*** createPackageAction ***");
        createPackage().then(res => {
            let pkg = res.data;
            if (isSuccessResponse(pkg)) {
                console.log(pkg);
                setSSPackage(pkg);
                notify("Successfully Created Package", 'success');
                createFileAction(pkg.packageId, source)
            } else {
                notify(pkg.message, 'error');
            }
        }).catch(err => {
            console.log("createPackageAction Error", err);
            notify("Error occurred while trying to create the package", 'error');
        })
    }

    const deletePackageAction = () => {
        if (ssPackage) {
            
        }
    }
    
    const renderPackageButtons = () => (
        <View style={styles.control}>
            {/*{(ssPackage && recipients.length > 0) &&*/}
            {/*<TouchableOpacity style={styles.actionButton} disabled={!isCameraReady} onPress={deletePackageAction}>*/}
            {/*    <Text style={styles.text}>{"Delete"}</Text>*/}
            {/*</TouchableOpacity>}*/}
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!isCameraReady}
              onPress={createPackageAction()}
              style={styles.createButton}>
                <Text style={styles.text}>{"Create"}</Text>
            </TouchableOpacity>
        </View>
    )

    const showAddRecipientModal = async () => {
        console.log("*** showAddRecipient ***");
        setAddRecipientModalVisible(true);
    }

    const showDeleteRecipientModal = async () => {
        console.log("*** showDeleteRecipient ***");
        setDeleteRecipientModalVisible(true);
    }
    
    const addRecipientAction = async () => {
        console.log("*** addRecipient ***");
        addRecipient(recipientEmail, ssPackage.packageId).then(res => {
            const recipient = res.data;
            if (isSuccessResponse(recipient)) {
                console.log(recipient);
                setAddRecipientModalVisible(false);
                notify("Successfully Added Recipient", 'success');
            } else {
                notify(recipient.message, 'error');
            }
        }).catch(err => {
            console.log("addRecipientAction Error", err);
            notify("Please enter a valid email", 'error');
        })
    }
    
    const deleteRecipientAction = async () => {
        console.log("*** deleteRecipient ***");
        deleteRecipient().then(res => {
            const recipient = res.data; 
            if (isSuccessResponse(recipient)) {
                console.log(recipient);
                notify("Successfully Removed Recipient", 'success');
            } else {
                notify(recipient.message, 'success');
            }
        }).catch(err => {
            console.log("deleteRecipientAction Error", err);
            notify("Error occurred while trying to delete recipient", 'error');
        })
    }
    
    const renderRecipientButtons = () => (
      <View style={styles.control}>
          {(ssPackage && recipients.length > 0) &&
          <TouchableOpacity style={styles.actionButton} disabled={!isCameraReady} onPress={deleteRecipientAction}>
              <Text style={styles.text}>{"Delete"}</Text>
          </TouchableOpacity>}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!isCameraReady}
            onPress={showAddRecipientModal} 
            style={styles.addRecipientButton}>
              <Text style={styles.text}>{"Add"}</Text>
          </TouchableOpacity>
      </View>
    );

    const finalizePackageAction = async () => {
        
    }
    
    const renderSendPreviewButton = () => (
      <TouchableOpacity onPress={finalizePackageAction} style={styles.sendButton}>
          <Text>{"Send"}</Text>
      </TouchableOpacity>
    );

    // const renderVideoPlayer = () => (
    //   <Video
    //     source={{ uri: videoSource }}
    //     shouldPlay={true}
    //     style={styles.media}
    //   />
    // );
    // const renderVideoRecordIndicator = () => (
    //   <View style={styles.recordIndicatorContainer}>
    //       <View style={styles.recordDot} />
    //       <Text style={styles.recordTitle}>{"Recording..."}</Text>
    //   </View>
    // );

    const renderCaptureControl = () => (
      <View style={styles.control}>
          <TouchableOpacity style={styles.actionButton} disabled={!isCameraReady} onPress={switchCamera}>
              <Text style={styles.text}>{"Flip"}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            activeOpacity={0.7}
            disabled={!isCameraReady}
            // onLongPress={recordVideo}
            // onPressOut={stopVideoRecording}
            onPress={takePicture}
            style={styles.capture}
          />
      </View>
    );

    if (hasCameraPermission === null) {
        return <View />;
    }
    
    if (hasCameraPermission === false) {
        return <Text>No access to camera</Text>;
    }
    
    return (
      <SafeAreaView style={styles.container}>
          <Camera ref={cameraRef} style={styles.container} type={cameraType} flashMode={Camera.Constants.FlashMode.on}
            onCameraReady={onCameraReady}
            onMountError={(error) => {
                console.log("cammera error", error) }}/>
          <View style={styles.container}>
              {/*{isVideoRecording && renderVideoRecordIndicator()}*/}
              {/*{videoSource && renderVideoPlayer()}*/}
              {isPreview && renderCancelPreviewButton()}
              {isPreview && hasSavePermission && renderSavePreviewButton()}
              {isPreview && !ssPackage && renderPackageButtons()}
              {isPreview && ssPackage && renderRecipientButtons()}
              {isPreview && renderSendPreviewButton()}
              {/*{!videoSource && !isPreview && renderCaptureControl()}*/}
              {!isPreview && renderCaptureControl()}
          </View>
          <Modal animationType="slide" transparent={true} visible={addRecipientModalVisible}
            onRequestClose={() => {Alert.alert("Modal has been closed."); setAddRecipientModalVisible(!addRecipientModalVisible);}}>
              <View style={styles.modalCenteredView}>
                  <View style={styles.modalView}>
                      <TouchableOpacity onPress={() => setAddRecipientModalVisible(false)} style={styles.closeModalButton}>
                          <View style={[styles.closeCross, { transform: [{ rotate: "45deg" }] }]} />
                          <View style={[styles.closeCross, { transform: [{ rotate: "-45deg" }] }]} />
                      </TouchableOpacity>
                      <Text style={styles.modalText}>Add Recipient</Text>
                      <Block center>
                          <Block middle style={{marginLeft: 15, marginRight: 15}}>
                              <Input placeholder="Email" onChangeText={(val) => setRecipientEmail(val)} value={recipientEmail}/>
                          </Block>
                          <Block middle>
                              <Button color="primary" onPress={addRecipientAction} style={styles.createButton}>
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