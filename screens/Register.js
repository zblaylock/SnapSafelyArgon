import React from "react";
import {
  StyleSheet,
  ImageBackground,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView, Linking
} from "react-native";
import {Block, Checkbox, Text, theme} from "galio-framework";

import {Button, Icon, Input} from "../components";
import {Images, argonTheme} from "../constants";
import {removeStore, STORED_KEYS, storeString} from "../service/store";
import {SS_API} from "../constants/api";

const {width, height} = Dimensions.get("screen");

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      domain: null,
      apiKey: null,
      apiSecret: null
    }
  }
  
  async componentDidMount() {
    console.log('register ' + this.props.isLogOut);
    if (this.props.isLogOut) {
      console.log("SUCCESS LOGOUT");
      await removeStore(STORED_KEYS.SS_DOMAIN);
      await removeStore(STORED_KEYS.SS_API_KEY);
      await removeStore(STORED_KEYS.SS_API_SECRET);
    }
  }

  async openCreateAccountBrowser() {
    await Linking.openURL(SS_API.DEFAULT_WEB_DOMAIN);
  }

  async saveConfig(navigation) {
    console.log(this.state.domain);
    console.log(this.state.apiKey);
    console.log(this.state.apiSecret);
    await storeString(STORED_KEYS.SS_DOMAIN, this.state.domain);
    await storeString(STORED_KEYS.SS_API_KEY, this.state.apiKey);
    await storeString(STORED_KEYS.SS_API_SECRET, this.state.apiSecret);
    
    //TODO Validate sendsafely authentication and redirect
    if (this.state.domain && this.state.apiKey && this.state.apiSecret) {
      navigation.navigate('App');
    }
  }

  render() {
    const { navigation } = this.props;
    return (
      <Block flex middle>
        <StatusBar hidden/>
        <ImageBackground
          source={Images.RegisterBackground}
          style={{width, height, zIndex: 1}}
        >
          <Block safe flex middle>
            <Block style={styles.registerContainer}>
              <Block flex={0.25} middle style={styles.socialConnect}>
                <Text color="#8898AA" size={12}>
                  Sign up with
                </Text>
                <Block row style={{marginTop: theme.SIZES.BASE}}>
                  <Button style={styles.socialButtons}>
                    <Block row>
                      <Icon
                        name="logo-google"
                        family="Ionicon"
                        size={14}
                        color={"black"}
                        style={{marginTop: 2, marginRight: 5}}
                      />
                      <Text style={styles.socialTextButtons}>GOOGLE</Text>
                    </Block>
                  </Button>
                </Block>
              </Block>
              <Block flex>
                <Block flex={0.17} middle>
                  <Text color="#8898AA" size={12}>
                    Or sign up the classic way
                  </Text>
                </Block>
                <Block flex center>
                  <KeyboardAvoidingView style={{flex: 1}} behavior="padding" enabled>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input
                        borderless
                        placeholder="www.sendsafely.com"
                        onChangeText={(val) => this.setState({domain: val})}
                        value={this.state.domain}
                        iconContent={
                          <Icon
                            size={16}
                            color={argonTheme.COLORS.ICON}
                            name="ic_mail_24px"
                            family="ArgonExtra"
                            style={styles.inputIcons}
                          />
                        }
                      />
                    </Block>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input
                        borderless
                        placeholder="Api Key"
                        onChangeText={(val) => this.setState({apiKey: val})}
                        value={this.state.apiKey}
                        iconContent={
                          <Icon
                            size={16}
                            color={argonTheme.COLORS.ICON}
                            name="hat-3"
                            family="ArgonExtra"
                            style={styles.inputIcons}
                          />
                        }
                      />
                    </Block>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input
                        password
                        borderless
                        placeholder="Secret"
                        onChangeText={(val) => this.setState({apiSecret: val})}
                        value={this.state.apiSecret}
                        iconContent={
                          <Icon
                            size={16}
                            color={argonTheme.COLORS.ICON}
                            name="padlock-unlocked"
                            family="ArgonExtra"
                            style={styles.inputIcons}
                          />
                        }
                      />
                    </Block>
                    <Block middle>
                      <Button color="primary" onPress={() => this.saveConfig(navigation)} style={styles.createButton}>
                        <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                          SAVE
                        </Text>
                      </Button>
                    </Block>
                    <Block middle style={styles.passwordCheck}>
                      <Text size={12} color={argonTheme.COLORS.MUTED}>
                        If you need to generate a new api key and secret or have not registered an account, please
                        follow the link below to create or access an account.
                      </Text>
                    </Block>
                    <Block middle>
                      <Button color="primary" onPress={this.openCreateAccountBrowser} style={styles.createButton}>
                        <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                          ACCESS ACCOUNT
                        </Text>
                      </Button>
                    </Block>
                  </KeyboardAvoidingView>
                </Block>
              </Block>
            </Block>
          </Block>
        </ImageBackground>
      </Block>
    );
  }
}

const styles = StyleSheet.create({
  input: {},
  registerContainer: {
    width: width * 0.9,
    height: height * 0.875,
    backgroundColor: "#F4F5F7",
    borderRadius: 4,
    shadowColor: argonTheme.COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 1,
    overflow: "hidden"
  },
  socialConnect: {
    backgroundColor: argonTheme.COLORS.WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#8898AA"
  },
  socialButtons: {
    width: 120,
    height: 40,
    backgroundColor: "#fff",
    shadowColor: argonTheme.COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 1
  },
  socialTextButtons: {
    color: argonTheme.COLORS.PRIMARY,
    fontWeight: "800",
    fontSize: 14
  },
  inputIcons: {
    marginRight: 12
  },
  passwordCheck: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 13,
    paddingBottom: 30
  },
  createButton: {
    width: width * 0.5,
    marginTop: 25
  }
});

export default Register;
