import { QrScannerScreen } from '@/components/qr/qr-scanner-screen';
import { View } from 'react-native';

export default function QrScanRoute() {
  return (
    <View style={{ flex: 1 }}>
      <QrScannerScreen />
    </View>
  );
}
