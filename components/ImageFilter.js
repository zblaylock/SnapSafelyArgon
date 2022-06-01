import React, {useRef, useState} from "react";
import ImageFilters, { Constants, Presets } from 'react-native-gl-image-filters';
import {
    Button, Dimensions,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity, View,
} from 'react-native';
import {Surface} from "gl-react-expo";

const width = Dimensions.get('window').width - 40;
const height = Dimensions.get('window').height - 40;

export default class ImageFilter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hue: 0,
            blur: 0,
            sepia: 0,
            sharpen: 0,
            negative: 0,
            contrast: 1,
            saturation: 1,
            brightness: 1,
            temperature: 6500,
            exposure: 0,
        };
    }

    saveImage = async () => {
        if (!this.image) return;
        const result = await this.image.glView.capture();
        console.warn(result);
    };
    
    render() {
        return (
          <View>
              {Constants.DefaultPresets.map(item =>
                <View>
                    <Text>{item.name}</Text>
                    <Text>{item.description}</Text>
                    <Surface ref={ref => (this.image = ref)}>
                        <ImageFilters {...item.preset}  width={width} height={width}>
                            {{ uri: 'https://i.imgur.com/5EOyTDQ.jpg' }}
                        </ImageFilters>
                    </Surface>
                </View>
              )}
          </View>
          
          
          // <Surface style={{ width, height: width }}>
          //     {Constants.DefaultPresets.map((item, i) =>
          //       <Surface style={{ width, height: width }}>
          //       <ImageFilters key={i} {...item.preset} width={width} height={width}>
          //           {{uri: 'https://i.imgur.com/5EOyTDQ.jpg'}}
          //       </ImageFilters>
          //       </Surface>
          //     )}
          // </Surface>
        );
    }
};

const styles = StyleSheet.create({
    content: { marginTop: 20, marginHorizontal: 20 },
    button: { marginVertical: 20, borderRadius: 0 },
});
