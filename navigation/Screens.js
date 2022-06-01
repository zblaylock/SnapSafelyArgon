import { Animated, Dimensions, Easing } from "react-native";
// header for screens
import {DrawerItem as DrawerCustomItem, Header, Icon} from "../components";

import Articles from "../screens/Articles";// drawer
import CustomDrawerContent from "./Menu";
import Elements from "../screens/Elements";
// screens
import Home from "../screens/Home";
import Onboarding from "../screens/Onboarding";
import Profile from "../screens/Profile";
import React from "react";
import Register from "../screens/Register";
import Snap from "../screens/Snap";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import History from "../screens/History";
import Settings from "../screens/Settings";

const { width } = Dimensions.get("screen");

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function SnapStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: false}}>
      <Stack.Screen name="SnapStack" component={Snap}
        options={{
          header: ({ navigation, scene }) => (
            <Header title="Snap" navigation={navigation} scene={scene} />),
          cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function HistoryStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: false}}>
      <Stack.Screen name="HistoryStack" component={History}
                    options={{
                      header: ({ navigation, scene }) => (
                        <Header title="History" navigation={navigation} scene={scene} />),
                      cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function SettingsStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: false}}>
      <Stack.Screen name="SettingsStack" component={Settings}
                    options={{
                      header: ({ navigation, scene }) => (
                        <Header title="Settings" navigation={navigation} scene={scene} />),
                      cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function ElementsStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: false,}}>
      <Stack.Screen name="ElementsStack" component={Elements} options={{
          header: ({ navigation, scene }) => (
            <Header title="Elements" navigation={navigation} scene={scene} />),
          cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function ArticlesStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: "screen",}}>
      <Stack.Screen name="ArticlesStack" component={Articles} options={{
          header: ({ navigation, scene }) => (
            <Header title="Articles" navigation={navigation} scene={scene} />),
          cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function ProfileStack(props) {
  return (
    <Stack.Navigator initialRouteName="ProfileStack" screenOptions={{mode: "card", headerShown: "screen",}}>
      <Stack.Screen name="ProfileStack" component={Profile} options={{
          header: ({ navigation, scene }) => (
            <Header transparent white title="Profile" navigation={navigation} scene={scene}/>),
          cardStyle: { backgroundColor: "#FFFFFF" },
          headerTransparent: true}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function HomeStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: "screen",}}>
      <Stack.Screen name="HomeStack" component={Home} options={{
          header: ({ navigation, scene }) => (
            <Header title="Home" search options navigation={navigation} scene={scene}/>),
          cardStyle: { backgroundColor: "#F8F9FE" }}}/>
      <Stack.Screen name="Onboarding" component={OnboardingStack} />
    </Stack.Navigator>
  );
}

function RegisterStack(props) {
  return (
    <Stack.Navigator screenOptions={{mode: "card", headerShown: false}}>
      <Stack.Screen name="Account" component={Register} option={{headerTransparent: true}} />
      <Stack.Screen name="App" component={AppStack}/>
    </Stack.Navigator>
  );
}

export default function OnboardingStack(props) {
  const {route} = props;
  console.log("OnboardingStack props");
  console.log(props);
  return (
      <Stack.Navigator screenOptions={{mode: "card", headerShown: false,}}>
        <Stack.Screen name="Onboarding" component={Onboarding} />
        <Stack.Screen name="App" component={AppStack}/>
        <Stack.Screen name="Account" component={RegisterStack}/>
      </Stack.Navigator>
    );
}

function AppStack(props) {
  console.log("*** AppStack props ***");
  console.log(props)
  return (
    <Drawer.Navigator 
      style={{ flex: 1 }} 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      drawerStyle={{backgroundColor: "white", width: width * 0.8}}
      drawerContentOptions={{
        activeTintcolor: "white", 
        inactiveTintColor: "#000", 
        activeBackgroundColor: "transparent", 
        itemStyle: {width: width * 0.75, backgroundColor: "transparent", paddingVertical: 16, paddingHorizonal: 12, 
          justifyContent: "center", alignContent: "center", alignItems: "center", overflow: "hidden"},
        labelStyle: {fontSize: 18, marginLeft: 12, fontWeight: "normal"}}}
      initialRouteName="Snap"
    >
      {/* MAIN ROUTES */}
      <Drawer.Screen name="Snap" component={SnapStack} />
      <Drawer.Screen name="History" component={HistoryStack} />
      <Drawer.Screen name="Settings" component={SettingsStack} />
      <Drawer.Screen name="Account" component={RegisterStack} />
      {/*<Drawer.Navigator name="Log out" initialParams={{isLogout: true}} >*/}
      {/* MAIN ROUTES */}
      {/* DEV ROUTES */}
      <Drawer.Screen name="Home" component={HomeStack} />
      <Drawer.Screen name="Profile" component={ProfileStack} />
      <Drawer.Screen name="Elements" component={ElementsStack} />
      <Drawer.Screen name="Articles" component={ArticlesStack} />
      {/* DEV ROUTES */}
    </Drawer.Navigator>
  );
} 
