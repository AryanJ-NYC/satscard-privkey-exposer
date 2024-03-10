import './shim';
import { CKTapCard } from 'cktap-protocol-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import wif from 'wif';
import * as Clipboard from 'expo-clipboard';

export default function App() {
  const card = useRef(new CKTapCard()).current;
  const [cvc, setCvc] = useState('');
  const [authDelay, setAuthDelay] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

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
      <View style={styles.instructionsContainer}>
        <Text>1. Enter your CVC then press the button below.</Text>
        <Text>2. Place your phone atop your SatsCard.</Text>
        <Text>3. Copy the import string into freewallet.io</Text>
      </View>
      {authDelay > 0 && (
        <>
          <Text>
            You are locked out for {authDelay} seconds. Keep phone on card and press "Wait" button
            below to unlock.
          </Text>
          <TouchableOpacity
            disabled={isBusy}
            onPress={async () => {
              setIsBusy(true);
              try {
                await card.nfcWrapper(async () => {
                  while (authDelay > 0) {
                    await card.wait();
                    const status = await card.get_status();
                    setAuthDelay(status.auth_delay ?? 0);
                  }
                });
              } catch (e) {
                if (e && e instanceof Error) {
                  ToastAndroid.showWithGravity(e.message, ToastAndroid.SHORT, ToastAndroid.TOP);
                }
              } finally {
                setIsBusy(false);
              }
            }}
            style={[styles.button, isBusy && { opacity: 0.5 }]}
          >
            <Text>Wait</Text>
          </TouchableOpacity>
        </>
      )}
      <Text>Enter your CVC below:</Text>
      <TextInput
        keyboardType="number-pad"
        onChangeText={(text) => setCvc(text)}
        style={styles.textInput}
      />
      <TouchableOpacity
        disabled={isBusy}
        onPress={async () => {
          setIsBusy(true);
          try {
            await card.nfcWrapper(async () => {
              const status = await card.first_look();
              if (status.auth_delay) {
                setAuthDelay(status.auth_delay ?? 0);
                return status;
              }
              if (card.active_slot === 0) {
                const slot0 = await card.get_slot_usage(0);
                if (slot0.status === 'SEALED') {
                  await card.unseal_slot(cvc);
                }
              }
              const privateKey = await card.get_privkey(cvc, 0);
              const wifKey = wif.encode(128, privateKey, true);
              await Clipboard.setStringAsync(`p2wpkh:${wifKey}`);
              ToastAndroid.show('Freewallet import string copied to clipboard', ToastAndroid.SHORT);
            });
          } catch (e) {
            if (e) {
              if (e instanceof Error && typeof e.message === 'string') {
                ToastAndroid.showWithGravity(e.message, ToastAndroid.SHORT, ToastAndroid.TOP);
              }
              if (typeof e === 'string') {
                ToastAndroid.showWithGravity(e, ToastAndroid.SHORT, ToastAndroid.TOP);
              }
            }
          } finally {
            setIsBusy(false);
          }
        }}
        style={[styles.button, isBusy && { opacity: 0.5 }]}
      >
        <Text>Copy Freewallet import string to clipboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  button: {
    backgroundColor: '#ddd5f3',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 24,
  },
  instructionsContainer: { marginBottom: 32, rowGap: 8 },
  textInput: { borderWidth: 1, paddingHorizontal: 16, height: 50, width: '100%' },
});
