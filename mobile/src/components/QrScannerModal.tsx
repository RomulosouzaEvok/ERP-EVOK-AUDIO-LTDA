/**
 * Modal de leitura de QR Code / código de barras do produto, usando a API
 * atual do Expo Camera (SDK 57): `CameraView` + `barcodeScannerSettings`.
 *
 * Suporta QR Code e os formatos de barras mais comuns usados em etiquetas de
 * produto industrial (EAN-13/EAN-8/Code128/Code39), já que nem toda etiqueta
 * de estoque é necessariamente um QR Code.
 */

import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type CameraMountError,
} from 'expo-camera';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

const SCANNED_BARCODE_TYPES = ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] as const;

export default function QrScannerModal({ visible, onClose, onScanned }: QrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  // Evita disparar `onScanned` várias vezes seguidas para o mesmo código
  // enquanto a câmera continua enviando frames antes do modal fechar.
  const hasScannedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      onScanned(result.data);
    },
    [onScanned]
  );

  const [permissionRequested, setPermissionRequested] = useState(false);
  // Câmera pode falhar ao montar mesmo com permissão concedida — caso comum
  // em chão de fábrica: outro app (ex.: leitor de câmera dedicado) já está
  // usando o hardware da câmera. Sem esse tratamento a tela fica preta.
  const [mountError, setMountError] = useState<string | null>(null);

  const handleMountError = useCallback((error: CameraMountError) => {
    setMountError(error?.message ?? 'Falha desconhecida ao acessar a câmera.');
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onShow={() => {
        hasScannedRef.current = false;
        setMountError(null);
        if (!permission?.granted && !permissionRequested) {
          setPermissionRequested(true);
          requestPermission();
        }
      }}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {mountError ? (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Não foi possível acessar a câmera — feche outros apps que estejam usando-a e tente
              novamente.
            </Text>
            <Pressable style={styles.permissionButton} onPress={() => setMountError(null)}>
              <Text style={styles.permissionButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : permission?.granted ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...SCANNED_BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcodeScanned}
            onMountError={handleMountError}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Aponte a câmera para o QR Code ou código de barras do produto</Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? 'Permissão de câmera negada. Ative o acesso à câmera nas configurações do app para escanear produtos.'
                : 'Precisamos da sua permissão para usar a câmera e ler o código do produto.'}
            </Text>
            {permission?.canAskAgain !== false && (
              <Pressable style={styles.permissionButton} onPress={() => requestPermission()}>
                <Text style={styles.permissionButtonText}>Permitir acesso à câmera</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: '#22D3EE',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 24,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#22D3EE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
