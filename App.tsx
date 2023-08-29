import './shim';
import { CKTapCard } from 'cktap-protocol-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import wif from 'wif';
import * as Clipboard from 'expo-clipboard';

export default function App() {
  const card = useRef(new CKTapCard()).current;
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    const endSession = async () => {
      try {
        await card.endNfcSession();
      } catch (e) {
        console.error(e);
      }
    };
    void endSession();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Place your phone atop your SatsCard while using this app.</Text>
      <Text>Enter your CVC below:</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={(text) => setCvc(text)}
        style={styles.textInput}
      />
      <TouchableOpacity
        onPress={async () => {
          const address = await card.nfcWrapper(async () => {
            // interact with the card here
            try {
              await card.first_look();
              const privateKey = await card.get_privkey(cvc, 0); // scans the card for basic details and initialises with it
              const wifKey = wif.encode(128, privateKey, true);
              await Clipboard.setStringAsync(`p2wpkh:${wifKey}`);
              ToastAndroid.show('Freewallet import string copied to clipboard', ToastAndroid.SHORT);
              return wifKey;
            } catch (e) {
              if (e instanceof Error) {
                ToastAndroid.show(e.message, ToastAndroid.SHORT);
              }

              console.error(e, typeof e);
            }
          });
        }}
      >
        <Text>Copy Freewallet import string to clipboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: { borderWidth: 1, width: '100%', height: 50 },
});
