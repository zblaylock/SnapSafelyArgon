import React from "react";
import {
  StyleSheet,
  ImageBackground,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView, Linking
} from "react-native";
import {Block, Text, theme} from "galio-framework";

import {Button, Icon, Input} from "../components";
import {Images, argonTheme} from "../constants";
import {addStoredKeys, isAuthorized} from "../common/store";
import {SS_API} from "../constants/api";
import {authenticate} from "../service/auth";
import {isSuccessResponse} from "../common/utils";

const {width, height} = Dimensions.get("screen");

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state= {
      domain: null,
      email: null,
      password: null,
      apiKey: null,
      apiSecret: null,
      notification: {}
    }
  }
  
  async componentDidMount() {
    const {navigation} = this.props;
    console.log("*** Register ***");
    console.log(this.props);
    if (await isAuthorized()) {
      navigation.navigate('Snap');
    } else {
      this.setState(prevState => ({notification: null}));
    }
  }
  
  componentWillUnmount() {
    this.setState(prevState => ({notification: null}));
  }

  async openCreateAccountBrowser() {
    await Linking.openURL(SS_API.DEFAULT_WEB_DOMAIN);
  }

  async login(navigation) {
    if (SS_API.DEBUG.MODE) {
      await addStoredKeys(SS_API.DEBUG.LOCAL_NGROK, SS_API.DEBUG.API_KEY, SS_API.DEBUG.API_SECRET, SS_API.DEBUG.EMAIL);
      navigation.navigate('Snap');
    } else {
      if (this.state.domain, this.state.email, this.state.password) {
        authenticate(this.state.domain, this.state.email, this.state.password).then(auth => {
          console.log(auth.data);
          if (isSuccessResponse(auth.data)) {
            this.setState(prevState => ({notification:
                {...prevState.notification, message: "Success!", type: 'success'}}))
            console.log("*** Authenticate Response ***");
            addStoredKeys(this.state.domain, auth.data.apiKey, auth.data.apiSecret, this.state.email);
            setTimeout(() => navigation.navigate('Snap'), 2000);
          } if (auth.data.response === 'TWO_FA_REQUIRED'){
            this.setState(prevState => ({notification:
                {...prevState.notification, message: "You must disable two fa authentication", type: 'error'}}))
          } else {
            this.setState(prevState => ({notification:
                {...prevState.notification, message: auth.data.message, type: 'error'}}))
          }
        }).catch(err => {
          console.log(err);
          this.setState(prevState => ({notification:
              {...prevState.notification, message: "Please enter a valid domain", type: 'error'}}));
        })
      } else {
        this.setState(prevState => ({notification:
            {...prevState.notification, message: "Please enter a valid credentials", type: 'error'}}));
      }
    }
  }

  render() {
    const { navigation } = this.props;
    const {  } = this.state;
    return (
      <Block flex middle>
        <StatusBar hidden/>
        <ImageBackground source={Images.RegisterBackground} style={{width, height, zIndex: 1}}>
          <Block safe flex middle>
            <Block style={styles.registerContainer}>
              <Block flex={0.25} middle style={styles.socialConnect}>
                <Text color="#8898AA" size={12}>
                  Sign up with
                </Text>
                <Block row style={{marginTop: theme.SIZES.BASE}}>
                  <Button style={styles.socialButtons}>
                    <Block row>
                      <Icon name="logo-google" family="Ionicon" size={14} color={"black"} style={{marginTop: 2, marginRight: 5}}/>
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
                <Block middle style={{marginLeft: 15, marginRight: 15}}>
                  {this.state.notification &&
                  <Button style={styles.notification} disabled color={this.state.notification.type}>
                    {this.state.notification.message}
                  </Button>}
                </Block>
                <Block flex center>
                  <KeyboardAvoidingView style={{flex: 1}} behavior="padding" enabled>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input borderless placeholder="www.sendsafely.com" 
                             onChangeText={(val) => this.setState({domain: val})} 
                             value={this.state.domain}
                             iconContent={<Icon size={16} color={argonTheme.COLORS.ICON} name="hat-3" family="ArgonExtra" style={styles.inputIcons}/>}/>
                    </Block>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input borderless placeholder="Email" 
                             onChangeText={(val) => this.setState({email: val})} 
                             value={this.state.email}
                             iconContent={<Icon size={16} color={argonTheme.COLORS.ICON} name="ic_mail_24px" family="ArgonExtra" style={styles.inputIcons}/>}/>
                    </Block>
                    <Block middle style={{marginLeft: 15, marginRight: 15}}>
                      <Input password borderless placeholder="Password" 
                             onChangeText={(val) => this.setState({password: val})} 
                             value={this.state.password} 
                             iconContent={<Icon size={16} color={argonTheme.COLORS.ICON} name="padlock-unlocked" family="ArgonExtra" style={styles.inputIcons}/>}/>
                    </Block>
                    <Block middle>
                      <Button color="primary" onPress={() => this.login(navigation)} style={styles.createButton}>
                        <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                          Login
                        </Text>
                      </Button>
                    </Block>
                    <Block middle style={styles.passwordCheck}>
                      <Text size={12} color={argonTheme.COLORS.MUTED}>
                        If you have not registered an account, please
                        follow the link below to create and account.
                      </Text>
                      <Button color="primary" onPress={this.openCreateAccountBrowser} style={styles.createButton}>
                        <Text bold size={14} color={argonTheme.COLORS.WHITE}>
                          CREATE ACCOUNT
                        </Text>
                      </Button>
                    </Block>
                    {/*<Block middle>*/}
                    {/*  <Button color="primary" onPress={this.openCreateAccountBrowser} style={styles.createButton}>*/}
                    {/*    <Text bold size={14} color={argonTheme.COLORS.WHITE}>*/}
                    {/*      CREATE ACCOUNT*/}
                    {/*    </Text>*/}
                    {/*  </Button>*/}
                    {/*</Block>*/}
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
  notification: {
    // marginBottom: theme.SIZES.BASE,
    width: width - theme.SIZES.BASE * 2,
  },
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
